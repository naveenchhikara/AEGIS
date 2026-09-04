-- Backfill users stranded by pre-#86 invitation acceptance.
--
-- Problem:
-- Users invited before #86 could become ACTIVE without a Better Auth
-- credential Account row. Their invite token was already consumed, so they
-- could neither sign in nor be re-invited (resend action only matched INVITED).
--
-- Scope guard:
-- Remediate only invite-derived users (invitedAt present) who are ACTIVE and
-- still missing a credential account. This intentionally excludes seeded users
-- and future non-credential (e.g. SSO-only) users that were never invited.
--
-- 1) Count affected users per tenant before applying update:
--
-- SELECT u."tenantId", COUNT(*) AS affected_count
-- FROM "User" u
-- WHERE u.status = 'ACTIVE'
--   AND u."invitedAt" IS NOT NULL
--   AND NOT EXISTS (
--     SELECT 1
--     FROM "Account" a
--     WHERE a."userId" = u.id
--       AND a."providerId" = 'credential'
--   )
-- GROUP BY u."tenantId"
-- ORDER BY affected_count DESC;
--
-- 2) Apply remediation:
UPDATE "User" u
SET status = 'INVITED',
    "emailVerified" = false,
    "updatedAt" = NOW()
WHERE u.status = 'ACTIVE'
  AND u."invitedAt" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "Account" a
    WHERE a."userId" = u.id
      AND a."providerId" = 'credential'
  );
--
-- 3) Post-check (should return zero rows):
--
-- SELECT u.id, u.email, u."tenantId"
-- FROM "User" u
-- WHERE u.status = 'ACTIVE'
--   AND u."invitedAt" IS NOT NULL
--   AND NOT EXISTS (
--     SELECT 1
--     FROM "Account" a
--     WHERE a."userId" = u.id
--       AND a."providerId" = 'credential'
--   );
--
-- After this update, tenant admins should use "Resend Invitation" for each
-- affected user. The fixed invite acceptance flow will create the credential
-- account and restore sign-in access.
