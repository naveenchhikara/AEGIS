# Preflight Check

Run a comprehensive environment validation before tests or deployments. Catches the configuration issues that cause cascading debugging spirals.

## Checks to Perform

Run ALL checks below and report pass/fail for each with a summary table at the end.

### 1. Database URL Validation

- Read `.env` and extract `DATABASE_URL`
- Verify the password segment does NOT contain unescaped special characters (`/`, `@`, `#`, `%`, `?`, `=`)
- Verify `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT` are all set
- Verify `DATABASE_URL` matches the individual POSTGRES\_\* values (user, password, host, port, db)
- Test actual database connectivity via docker: `docker exec aegis-postgres psql -U aegis -d aegis -t -c "SELECT 1;"` (if Docker is running)

### 2. Auth Configuration

- Verify `BETTER_AUTH_SECRET` is set and at least 32 characters
- Verify `BETTER_AUTH_URL` is set and its port matches `NEXT_PUBLIC_APP_URL` port
- Verify `BETTER_AUTH_URL` origin would match the running dev server port (default 3000)

### 3. Database Schema State

- Run `npx prisma migrate status` to check for pending migrations
- Verify critical tables exist (Prisma uses PascalCase): `User`, `Session`, `Account`, `Verification`
- Check if the `FailedLoginAttempt` table exists (Phase 11 lockout plugin — NOT `account_lockout`)
- Note: Better Auth rate limiting uses `FailedLoginAttempt`, there is no separate `rate_limit` table

### 4. Seed Data Integrity

- Check if users exist in the database: `docker exec aegis-postgres psql -U aegis -d aegis -t -c 'SELECT id, email, name FROM "User" LIMIT 5;'`
- Verify seeded users have password hashes in the `Account` table: `docker exec aegis-postgres psql -U aegis -d aegis -t -c 'SELECT a."userId", a."providerId", LENGTH(a.password) as hash_len FROM "Account" a WHERE a."providerId" = '"'"'credential'"'"' LIMIT 5;'`
- Flag any credential accounts with NULL or empty password hashes

### 5. Account Lockout Check

- Query for locked accounts: `docker exec aegis-postgres psql -U aegis -d aegis -t -c 'SELECT email, "lockedUntil" FROM "FailedLoginAttempt" WHERE "lockedUntil" > NOW();'`
- If any accounts are locked, report them and offer to clear lockouts
- To clear all lockouts: `docker exec aegis-postgres psql -U aegis -d aegis -c 'DELETE FROM "FailedLoginAttempt";'`

### 6. Port Conflicts

- Check if port 3000 (or configured port) is already in use: `lsof -i :3000 -t 2>/dev/null`
- Check if PostgreSQL port (from POSTGRES_PORT) is reachable

### 7. Node/pnpm Environment

- Verify `node --version` is 18+
- Verify `pnpm --version` is available
- Check `node_modules` exists (suggest `pnpm install` if missing)
- Check `.next` directory freshness — if it exists and is older than the latest source change, suggest clearing it

## Output Format

```
AEGIS Preflight Check
=====================

[PASS] Database URL - no special characters in password
[PASS] Database URL - matches POSTGRES_* variables
[FAIL] Database connectivity - connection refused (is Docker running?)
[PASS] Auth config - BETTER_AUTH_SECRET set (44 chars)
[PASS] Auth config - ports match (3000)
[PASS] Schema - no pending migrations
[WARN] Seed data - 2 users missing password hashes
[PASS] No locked accounts
[PASS] Port 3000 available
[PASS] Node v22.x, pnpm v10.x

Summary: 8 passed, 1 failed, 1 warning
Action needed: Start Docker with `docker compose up -d`
```

If ANY check fails, provide the exact fix command. Do not just report the failure — give the one-liner to resolve it.
