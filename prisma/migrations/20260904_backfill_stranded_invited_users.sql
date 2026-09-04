-- Backfill users stranded by pre-#86 invitation acceptance.
--
-- Problem:
-- Users invited before #86 could become ACTIVE without a Better Auth
-- credential Account row. Their invite token was already consumed, so they
-- could neither sign in nor be re-invited (resend action only matched INVITED).
--
-- Scope guard:
-- Remediate only invite-derived users (invitedAt present) in the known incident
-- window (2026-02-10 until the #86 fix date), who are ACTIVE, missing the
-- Better Auth credential Account row required by email/password sign-in, and
-- have no alternate non-credential auth account.

-- Build the target set once so pre-check, update, and post-check stay in sync.
CREATE TEMP VIEW "_stranded_invited_users_20260904" AS
SELECT u.id, u.email, u."tenantId"
FROM "User" u
WHERE u.status = 'ACTIVE'
  AND u."invitedAt" IS NOT NULL
  AND u."invitedAt" >= TIMESTAMP '2026-02-10 00:00:00'
  AND u."invitedAt" < TIMESTAMP '2026-09-05 00:00:00'
  AND NOT EXISTS (
    SELECT 1
    FROM "Account" a
    WHERE a."userId" = u.id
      AND a."providerId" = 'credential'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "Account" a
    WHERE a."userId" = u.id
      AND a."providerId" <> 'credential'
  );

-- 1) Count affected users per tenant before applying update.
SELECT "tenantId", COUNT(*) AS affected_count
FROM "_stranded_invited_users_20260904"
GROUP BY "tenantId"
ORDER BY affected_count DESC;

-- 2) Apply remediation.
UPDATE "User" u
SET status = 'INVITED',
    "emailVerified" = false,
    "updatedAt" = NOW()
WHERE u.id IN (SELECT id FROM "_stranded_invited_users_20260904");

-- 3) Post-check (should return zero rows).
SELECT u.id, u.email, u."tenantId"
FROM "User" u
JOIN "_stranded_invited_users_20260904" s ON s.id = u.id
WHERE u.status = 'ACTIVE';

DROP VIEW "_stranded_invited_users_20260904";

-- After this update, tenant admins should use "Resend Invitation" for each
-- affected user. The fixed invite acceptance flow will create the credential
-- account and restore sign-in access.
