-- Add unique constraint on Account(accountId, providerId).
--
-- WHY: A credential Account row is uniquely identified by its (accountId,
-- providerId) pair.  Without this constraint two concurrent acceptInvitation
-- calls (or a re-run of scripts/create-accounts.ts) could insert duplicate
-- credential rows for the same user.  The application now uses account.upsert
-- keyed on this pair, which requires the constraint to exist in PostgreSQL.
--
-- IDEMPOTENT: The DO block skips the ALTER if the constraint already exists,
-- so re-running the file on a database that already has it is safe.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Account_accountId_providerId_key'
      AND conrelid = '"Account"'::regclass
  ) THEN
    ALTER TABLE "Account"
      ADD CONSTRAINT "Account_accountId_providerId_key"
      UNIQUE ("accountId", "providerId");
  END IF;
END;
$$;
