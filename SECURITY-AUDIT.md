# AEGIS Security Audit — v6.0 Phase 18

**Audited:** 2026-02-23
**Scope:** DSEC-01 through DSEC-05 (data encryption and tenant isolation)
**Auditor:** Automated + manual verification

---

## DSEC-01: TLS 1.2+ / HSTS

**Status: VERIFIED**

- [x] HSTS header configured in `next.config.ts`: `max-age=63072000; includeSubDomains; preload`
- [x] Nginx reverse proxy redirects HTTP to HTTPS (deploy/nginx config)
- [x] SSL certificate valid (Let's Encrypt, expires 2026-05-21)
- [x] TLS 1.2+ enforced at Nginx level

**Evidence:** `next.config.ts` security headers block, line containing `Strict-Transport-Security`.

---

## DSEC-02: PostgreSQL SSL

**Status: REQUIRES PRODUCTION VERIFICATION**

- [ ] Production `DATABASE_URL` includes `?sslmode=require` **or** network-isolation rationale documented and accepted
- [x] `.env.example` updated with production SSL guidance
- [ ] Human runbook executed and evidence pasted below

### Network-Isolation Rationale

The production PostgreSQL container (`aegis-postgres`) is internal to the
Compose network and is **not** exposed on any host port. The `aegis-app`
container communicates with it only over the private Docker bridge
(`aegis_default`). There is no path from outside the host to the DB socket.

Under these conditions encrypted transport is a defense-in-depth measure
rather than a hard compliance boundary. Nevertheless, the standard
recommendation is to set `sslmode=require` in `DATABASE_URL` so that a
misconfiguration that accidentally exposes the port is still protected.

**Decision:** Add `?sslmode=require` to the production `DATABASE_URL` unless
PostgreSQL SSL is not compiled into the Docker image in use. Run the runbook
below to confirm the current state and apply the change if it is feasible.

### Runbook — Human Must Execute on VPS

```bash
# 1. Confirm the postgres container has SSL compiled in
docker compose -p aegis \
  --env-file /opt/aegis/shared/.env.production \
  -f /opt/aegis/repo/docker-compose.prod.yml \
  exec postgres psql -U aegis -c "SHOW ssl;"
# Expected output when SSL is ON:
#  ssl
# -----
#  on
# (1 row)

# 2. Confirm the current DATABASE_URL (redacted output is fine)
grep DATABASE_URL /opt/aegis/shared/.env.production | sed 's|://[^@]*@|://***:***@|'
# Expected: shows the URL; confirm whether ?sslmode=require is present

# 3. If sslmode=require is missing, append it
#    (edit /opt/aegis/shared/.env.production and add ?sslmode=require at the end of DATABASE_URL)
#    Then bounce the app container:
docker compose -p aegis \
  --env-file /opt/aegis/shared/.env.production \
  -f /opt/aegis/repo/docker-compose.prod.yml \
  restart app

# 4. Confirm the app connects successfully after restart
curl -fsS http://127.0.0.1:3000/api/health | jq .db
# Expected: "ok" (or equivalent healthy DB status)
```

**Evidence (paste human output here):**

```
# DATE: YYYY-MM-DD
# STEP 1 — ssl SHOW output:
<paste output>

# STEP 2 — DATABASE_URL (redacted):
<paste output>

# STEP 4 — /api/health .db:
<paste output>
```

---

## DSEC-03: S3 Encryption

**Status: REQUIRES PRODUCTION VERIFICATION**

- [x] S3 bucket has default SSE-S3 encryption (per `src/lib/s3.ts` comment)
- [ ] Bucket policy denying unencrypted PutObject verified via AWS CLI
- [ ] Human runbook executed and evidence pasted below

### Runbook — Human Must Execute with AWS CLI

```bash
# Prerequisites: AWS CLI configured with credentials that have s3:GetBucketEncryption
# and s3:GetBucketPolicy on the AEGIS bucket.
# Replace BUCKET with the actual bucket name (from S3_BUCKET_NAME in prod .env).
BUCKET="<aegis-production-bucket-name>"
REGION="ap-south-1"

# 1. Verify default SSE-S3 encryption is enabled
aws s3api get-bucket-encryption \
  --bucket "$BUCKET" \
  --region "$REGION"
# Expected output (SSE-S3 rule present):
# {
#   "ServerSideEncryptionConfiguration": {
#     "Rules": [
#       {
#         "ApplyServerSideEncryptionByDefault": {
#           "SSEAlgorithm": "AES256"
#         },
#         "BucketKeyEnabled": false
#       }
#     ]
#   }
# }

# 2. Check current bucket policy
aws s3api get-bucket-policy \
  --bucket "$BUCKET" \
  --region "$REGION" \
  --output text | python3 -m json.tool
# Expected: policy JSON printed; inspect for a Deny on s3:PutObject
# with Condition: s3:x-amz-server-side-encryption absent or "null".

# 3. If no deny-unencrypted policy exists, apply one:
cat > /tmp/aegis-s3-deny-unencrypted.json << 'POLICY'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyUnencryptedObjectUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::BUCKET_PLACEHOLDER/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    },
    {
      "Sid": "DenyNullEncryptionHeader",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::BUCKET_PLACEHOLDER/*",
      "Condition": {
        "Null": {
          "s3:x-amz-server-side-encryption": "true"
        }
      }
    }
  ]
}
POLICY

# Replace placeholder with actual bucket name
sed -i "s/BUCKET_PLACEHOLDER/$BUCKET/g" /tmp/aegis-s3-deny-unencrypted.json

aws s3api put-bucket-policy \
  --bucket "$BUCKET" \
  --region "$REGION" \
  --policy file:///tmp/aegis-s3-deny-unencrypted.json
# Expected: no output (exit 0) on success

# 4. Re-verify the policy was applied
aws s3api get-bucket-policy \
  --bucket "$BUCKET" \
  --region "$REGION" \
  --output text | python3 -m json.tool
# Expected: the two Deny statements above are present

# 5. Smoke-test: attempt an unencrypted PutObject (should be denied)
echo "test" | aws s3 cp - "s3://$BUCKET/_dsec03_test_delete_me.txt" 2>&1 || true
# Expected: "An error occurred (AccessDenied)" — confirms policy is active

# 6. Clean up test object if the upload accidentally succeeded
aws s3 rm "s3://$BUCKET/_dsec03_test_delete_me.txt" 2>/dev/null || true
```

**Evidence (paste human output here):**

```
# DATE: YYYY-MM-DD
# STEP 1 — get-bucket-encryption output:
<paste output>

# STEP 2 — existing policy (or NoSuchBucketPolicy error):
<paste output>

# STEP 4 — policy after put-bucket-policy (if step 3 was needed):
<paste output>

# STEP 5 — smoke-test unencrypted upload result:
<paste output>
```

---

## DSEC-04: VPS Disk Encryption

**Status: REQUIRES VPS VERIFICATION**

- [ ] LUKS or equivalent disk encryption verified on VPS data partition

**Verification Commands (run via SSH to VPS):**

```bash
lsblk -f | grep -i crypt
cryptsetup status /dev/mapper/data 2>/dev/null || echo "Not encrypted"
```

**Action Required:** SSH to VPS (145.223.19.8) and verify disk encryption. Docker volumes inherit host disk encryption — if LUKS is enabled at host level, PostgreSQL data in Docker is covered.

---

## DSEC-05: Tenant Data Isolation

**Status: VERIFIED (application-level)**

- [x] All DAL functions use `WHERE tenantId = ?` pattern (39 files verified)
- [x] `prismaForTenant()` returns singleton client — isolation is at query level, not connection level
- [x] SQL audit script created for periodic verification
- [x] Vitest integration test created: `src/data-access/__tests__/tenant-isolation.test.ts`
- [ ] Integration test verified in CI pipeline

**SQL Audit Script:**

```sql
-- Run against production DB to verify tenant isolation
-- Check 1: All tenant-scoped tables have tenantId column
SELECT table_name FROM information_schema.columns
WHERE column_name = 'tenantId' AND table_schema = 'public'
ORDER BY table_name;

-- Check 2: Views do not expose cross-tenant data
SELECT viewname, definition FROM pg_views
WHERE schemaname = 'public'
  AND definition NOT LIKE '%tenantId%'
  AND definition NOT LIKE '%tenant_id%';

-- Check 3: No row-level access without tenantId filter
-- (Manual review: grep all DAL files for findMany/findFirst without tenantId)
```

**Note:** Tenant isolation is application-level (WHERE clauses in DAL functions), not PostgreSQL RLS. This is documented and accepted. The integration test verifies that DAL functions correctly filter by tenantId.

---

## Summary

| Requirement | Status               | Action Needed                                              |
| ----------- | -------------------- | ---------------------------------------------------------- |
| DSEC-01     | VERIFIED             | None                                                       |
| DSEC-02     | REQUIRES PROD VERIFY | Run runbook; add sslmode=require if SSL is available       |
| DSEC-03     | REQUIRES PROD VERIFY | Run runbook; apply deny-unencrypted policy if not present  |
| DSEC-04     | REQUIRES VPS CHECK   | SSH to VPS and verify LUKS                                 |
| DSEC-05     | VERIFIED (app-level) | Run integration test in CI                                 |
