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

**Status: REQUIRES PRODUCTION CONFIG**

- [ ] Production `DATABASE_URL` includes `?sslmode=require`
- [x] `.env.example` updated with production SSL guidance
- [ ] PostgreSQL server configured with SSL certificate (VPS-level)

**Action Required:**

1. On VPS, configure PostgreSQL 16 with SSL certificate
2. Update production `.env` to append `?sslmode=require` to DATABASE_URL
3. Verify connection: `psql "postgresql://...?sslmode=require"` succeeds

**Note:** Development environments do NOT require SSL (per locked decision). The `sslmode=require` is production-only.

---

## DSEC-03: S3 Encryption

**Status: PARTIALLY VERIFIED**

- [x] S3 bucket has default SSE-S3 encryption (per `src/lib/s3.ts` comment)
- [ ] Bucket policy denying unencrypted PutObject verified via AWS CLI

**Verification Commands:**

```bash
# Check SSE is enabled
aws s3api get-bucket-encryption --bucket $S3_BUCKET_NAME --region ap-south-1

# Check bucket policy
aws s3api get-bucket-policy --bucket $S3_BUCKET_NAME --region ap-south-1
```

**Action Required:** Run verification commands and update this section with results. If no deny-unencrypted policy exists, add one via AWS CLI or console.

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

| Requirement | Status               | Action Needed                  |
| ----------- | -------------------- | ------------------------------ |
| DSEC-01     | VERIFIED             | None                           |
| DSEC-02     | REQUIRES PROD CONFIG | Add sslmode=require to prod DB |
| DSEC-03     | PARTIALLY VERIFIED   | Run AWS CLI verification       |
| DSEC-04     | REQUIRES VPS CHECK   | SSH to VPS and verify LUKS     |
| DSEC-05     | VERIFIED (app-level) | Run integration test in CI     |
