-- Harden Better Auth account lookup keys by preventing duplicate
-- (providerId, accountId) pairs.
--
-- This migration is idempotent and can be hand-applied with `pnpm db:apply`.

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "providerId", "accountId"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, id DESC
    ) AS row_number
  FROM "Account"
)
DELETE FROM "Account" AS account
USING ranked
WHERE account.id = ranked.id
  AND ranked.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "Account_providerId_accountId_key"
  ON "Account"("providerId", "accountId");
