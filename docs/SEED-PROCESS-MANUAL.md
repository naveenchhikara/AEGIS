# AEGIS — Seed Process Manual

> How to populate the VPS production database with realistic demo data covering the full RBIA audit lifecycle.

## Overview

The seed pipeline runs **3 scripts in sequence**, each building on the previous. The final result is a complete audit lifecycle for Kothrud Branch (BR002) — from RAM assessment through board reporting — with 50 loan accounts, 250 exam responses, 6 formal observations, compliance tracking, and GRC linkages.

## Prerequisites

- SSH access to VPS (`ssh vps` — key at `~/.ssh/vps_key`)
- PostgreSQL running (`postgres-postgres-1` container)
- Prisma client generated (`npx prisma generate`)
- `DATABASE_URL` set to `postgresql://aegis:AegisDb2026Secure@127.0.0.1:5432/aegis` (use `127.0.0.1` on host, not Docker DNS)

## Seed Pipeline

### Step 1: Base Seed (tenants, users, branches, exam areas)

```bash
ssh vps
cd /root/.openclaw/workspace/projects/aegis/repo
export DATABASE_URL='postgresql://aegis:AegisDb2026Secure@127.0.0.1:5432/aegis'
npx tsx prisma/seed.ts
```

**Creates:** 2 tenants, 10 users, 12 branches, 39 examination areas, 568 examination items, RAM parameters, RBI circulars, audit plans.

### Step 2: RBIA Housing Module (examination nodes)

```bash
npx tsx scripts/seed-rbia-housing.ts
```

**Creates:** 30 ExaminationNode records for the CRD-HLN (Housing Loan) module with hierarchical tree structure.

### Step 3: Examination Questions

```bash
npx tsx scripts/seed-exam-questions.ts
```

**Creates:** 25 ExaminationQuestion records covering 7 audit areas (PSL classification, CERSAI, income verification, LTV, insurance, NPA/IRAC, documentation).

### Step 4: Full Audit Lifecycle

```bash
npx tsx scripts/seed-full-audit-lifecycle.ts
```

**Creates (9 phases):**

| Phase               | What                                         | Records                                                                                                  |
| ------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1. RAM Assessment   | Risk scoring for Kothrud branch              | 1 assessment, 19 scores                                                                                  |
| 2. Engagement Setup | Completed RBIA engagement                    | 1 engagement (COMPLETED)                                                                                 |
| 3. Audit Execution  | Exam responses, loan sampling, action points | 23 exam responses, 50 loans (10 sampled), 250 account responses, 12 action points, 6 SMA/NPA, 2 meetings |
| 4. Score Freeze     | Frozen RBIA score snapshot                   | 1 BranchRbiaScore (0.78 = GOOD)                                                                          |
| 5. Observations     | Formal 5C findings with timeline             | 6 observations, 15 timeline entries, RBI circular linkages                                               |
| 6. Compliance       | Full compliance lifecycle stages             | 6 items (ACB_REVIEW → CLOSED)                                                                            |
| 7. Board Report     | Quarterly board report                       | 1 report (Q4 FY2025-26)                                                                                  |
| 8. Supporting Data  | Dashboards, assignments, audit trail         | 4 snapshots, 3 assignments, 10 log entries, 1 second engagement (IN_PROGRESS)                            |
| 9. GRC Linkages     | Risk register, controls, work program        | 2 risks, 1 control, 2 test procedures, 6 work items                                                      |

## Quick Run (All Steps)

```bash
ssh vps
cd /root/.openclaw/workspace/projects/aegis/repo
export DATABASE_URL='postgresql://aegis:AegisDb2026Secure@127.0.0.1:5432/aegis'

npx tsx prisma/seed.ts && \
npx tsx scripts/seed-rbia-housing.ts && \
npx tsx scripts/seed-exam-questions.ts && \
npx tsx scripts/seed-full-audit-lifecycle.ts
```

## Re-running (Idempotency)

The lifecycle seed script (Step 4) is **idempotent** — it deletes previous lifecycle data before re-creating. It uses deterministic UUIDs (SHA-256 hashed labels) so the same IDs are generated every run.

To re-run just the lifecycle seed:

```bash
npx tsx scripts/seed-full-audit-lifecycle.ts
```

If you get **unique constraint errors** on `RamAssessmentScore`, clean orphan records first:

```bash
docker exec postgres-postgres-1 psql -U aegis -d aegis -c \
  "DELETE FROM \"RamAssessmentScore\" WHERE \"assessmentId\" NOT IN (SELECT id FROM \"RamAssessment\");"
```

## Troubleshooting

### "client password must be a string"

`DATABASE_URL` is not set. Export it before running scripts.

### "getaddrinfo EAI_AGAIN postgres-postgres-1"

You're using the Docker DNS hostname on the host. Use `127.0.0.1` instead.

### "column createdat of relation AuditLog does not exist"

The `audit_trigger_function()` has unquoted `createdat`. Fix:

```sql
docker exec postgres-postgres-1 psql -U aegis -d aegis -c "
CREATE OR REPLACE FUNCTION audit_trigger_function() ...
-- Ensure all column names are quoted: \"createdAt\" not createdat
"
```

The seed script works around this by setting `session_replication_role = 'replica'` to disable triggers during execution.

### "Unique constraint failed on (assessmentId, paramConfigId)"

Orphan `RamAssessmentScore` records from a previous failed run. Clean them with the SQL above.

### Prisma version mismatch

All three Prisma packages must be the same version:

```bash
pnpm add prisma@7.4.2 @prisma/client@7.4.2 @prisma/adapter-pg@7.4.2
npx prisma generate
```

## Verification

After seeding, verify record counts:

```sql
docker exec postgres-postgres-1 psql -U aegis -d aegis -c "
SELECT 'RamAssessment' as tbl, COUNT(*) FROM \"RamAssessment\"
UNION ALL SELECT 'AuditEngagement', COUNT(*) FROM \"AuditEngagement\"
UNION ALL SELECT 'LoanAccount', COUNT(*) FROM \"LoanAccount\"
UNION ALL SELECT 'AccountExamResponse', COUNT(*) FROM \"AccountExamResponse\"
UNION ALL SELECT 'Observation', COUNT(*) FROM \"Observation\"
UNION ALL SELECT 'ComplianceItem', COUNT(*) FROM \"ComplianceItem\"
UNION ALL SELECT 'BoardReport', COUNT(*) FROM \"BoardReport\"
UNION ALL SELECT 'BranchRbiaScore', COUNT(*) FROM \"BranchRbiaScore\"
ORDER BY 1;
"
```

**Expected minimums:** RamAssessment ≥1, AuditEngagement ≥10, LoanAccount ≥50, AccountExamResponse ≥250, Observation ≥6, ComplianceItem ≥6, BoardReport ≥1, BranchRbiaScore ≥1.

## Test Login

After seeding, verify the app at https://aegis.nexlyadvisory.com:

- **Email:** `rajesh.deshmukh@apexbank.example`
- **Password:** `TestPassword123!`
- **Role:** CEO (full dashboard access)
