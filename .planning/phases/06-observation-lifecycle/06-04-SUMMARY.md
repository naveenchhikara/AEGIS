# Plan 06-04 Summary: Repeat Finding Detection

## Status: COMPLETE

## What was built

### 1. schemas.ts — Zod validation schemas

- `DetectRepeatSchema` — input for detection query (branchId, auditAreaId, optional riskCategory, title)
- `ConfirmRepeatSchema` — confirm a specific repeat match (observationId, repeatOfId, version for optimistic lock)
- `DismissRepeatSchema` — dismiss a repeat suggestion (observationId, repeatOfId)
- All export corresponding TypeScript input types

### 2. detect.ts — Repeat finding detection server action

- `detectRepeatFindings` — queries PostgreSQL with pg_trgm similarity function
- Uses raw SQL via `prisma.$queryRaw` with tagged template literals (parameterized, SQL-injection safe)
- Searches CLOSED observations in same branch + audit area with similarity > 0.5 threshold
- Optional riskCategory filter when provided
- For each match, counts total CLOSED observations to get occurrence count
- Returns `RepeatCandidate[]` with id, title, similarity score, occurrence count, severity, closedAt
- Belt-and-suspenders: tenantId in WHERE clause despite RLS

### 3. confirm.ts — Confirm/dismiss server actions

**confirmRepeatFinding (OBS-10, OBS-11):**

- Validates AUDITOR or AUDIT_MANAGER role
- Fetches both new and old observations with tenant isolation
- Counts CLOSED observations for occurrence count
- Calls `escalateSeverity(currentSeverity, occurrenceCount)` from state-machine.ts
- Atomic transaction with optimistic locking:
  - Updates severity if escalated (using `updateMany` with version check)
  - Creates timeline entry for repeat confirmation
  - Creates second timeline entry for severity escalation (if severity changed)
- Revalidates `/findings` and `/findings/[id]` paths

**dismissRepeatFinding (OBS-11):**

- Validates AUDITOR or AUDIT_MANAGER role
- Verifies observation exists with tenant isolation
- Creates timeline entry recording dismissal decision
- No severity change — audit trail only

## Key patterns

- All actions use return-as-data pattern (no throws at top level)
- Zod safeParse for input validation
- Session auth via getRequiredSession()
- prismaForTenant for RLS + explicit tenantId WHERE clauses
- Only throw inside $transaction for Prisma rollback (caught by surrounding try/catch)

## Deviations

None — implemented exactly as specified in the plan.

## Commits

1. `feat(06-04): implement repeat finding detection with pg_trgm similarity` — all 3 files

## Verification

- `pnpm build` — PASS (0 errors, 48 pages)
- detect.ts uses `$queryRaw` (not `$executeRaw`)
- Similarity threshold is 0.5
- confirm.ts imports `escalateSeverity` from state-machine.ts
- Both confirm and dismiss create timeline entries
- Severity escalation is atomic with timeline entry in `$transaction`
- No top-level throw statements (errors returned as data)
