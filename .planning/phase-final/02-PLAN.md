---
phase: final
plan: 2
type: standard
wave: 1
depends_on: []
files_modified:
  - src/data/seed/risk-registers.json
  - src/data/seed/controls.json
  - src/data/seed/audit-universe.json
  - src/data/seed/concurrent-templates.json
  - src/data/seed/policies.json
  - src/data/seed/committees.json
  - src/data/seed/is-checklists.json
  - prisma/seed.ts
autonomous: true
must_haves:
  truths:
    - "Seed data exists for all Phase 2-6 models"
    - "Risk registers have at least 10 entries across credit/operational/compliance risk categories"
    - "Control library has at least 15 controls mapped to process areas"
    - "Audit universe has at least 8 entities (branches + departments + processes)"
    - "Concurrent audit templates cover all 7 scope areas"
    - "Policy documents cover at least 6 categories"
    - "Committee seed includes ACB with at least 3 members"
    - "IS audit checklists cover CBS, BCP/DR, and Cyber Security"
  artifacts:
    - path: "src/data/seed/"
      provides: "JSON seed data files for all new modules"
    - path: "prisma/seed.ts"
      provides: "Updated seed script with all new module seeders"
---

## Objective

Create comprehensive seed data for all new RBIAS v3.0 modules so that every page has meaningful data when accessed. The existing seed covers Phase 1 (branches, audit plans, findings, RAM parameters, examination items). This plan adds seed data for Phases 2-6.

## Context

@AEGIS/src/data/seed/ — existing seed JSONs (8 files)
@AEGIS/prisma/seed.ts — current seed script
@AEGIS/prisma/schema.prisma — 63 models, 17 roles
Tenant ID: `a0000000-0000-0000-0000-000000000001`
Existing branch codes: HO, BR-PUNE, BR-NASHIK

## Tasks

<task type="auto">
  <name>Task 1: Create seed JSON files for Phase 2 modules</name>
  <files>
    src/data/seed/compliance-items-seed.json
    src/data/seed/report-templates.json
    src/data/seed/calendar-events.json
  </files>
  <action>
  **compliance-items-seed.json**: 5 compliance items across different statuses:
  - 1 OPEN (0 days, L0)
  - 1 BRANCH_RESPONSE_SUBMITTED (20 days, L1)
  - 1 ZAC_REVIEW (35 days, L2)
  - 1 OVERDUE (100 days, L3)
  - 1 CLOSED (resolved)

These link to existing observations from `findings.json`. Use placeholder observation IDs — the seed script will resolve them at runtime.

**report-templates.json**: 3 templates:

- "Standard Audit Report" (REPORT_HEADER)
- "Cash Verification Checklist" (CHECKLIST)
- "Examination Section Template" (AUDIT_SECTION)

Each with `templateData` containing section headers, field definitions, and formatting rules as JSONB.

**calendar-events.json**: 6 events:

- 2 RBIA audits (Q1, Q2 2026)
- 1 CONCURRENT audit
- 1 IS_EDP audit
- 1 STATUTORY audit
- 1 MEETING (ACB quarterly)
  </action>
  <verify>

```bash
node -e "const d = require('./src/data/seed/compliance-items-seed.json'); console.log(d.length + ' compliance items')"
node -e "const d = require('./src/data/seed/report-templates.json'); console.log(d.length + ' templates')"
node -e "const d = require('./src/data/seed/calendar-events.json'); console.log(d.length + ' events')"
```

  </verify>
  <done>
  - 5 compliance items across lifecycle stages
  - 3 report templates with meaningful templateData
  - 6 calendar events covering all event types
  </done>
</task>

<task type="auto">
  <name>Task 2: Create seed JSON files for Phase 3 modules</name>
  <files>
    src/data/seed/audit-universe.json
    src/data/seed/risk-registers.json
    src/data/seed/controls.json
    src/data/seed/issues-seed.json
    src/data/seed/qa-assessment-seed.json
  </files>
  <action>
  **audit-universe.json**: 8 entities:
  - 3 BRANCH entities (HO, Pune, Nashik)
  - 2 DEPARTMENT entities (Treasury, Credit)
  - 2 PROCESS entities (Lending, KYC/AML)
  - 1 CHANNEL entity (Internet Banking)

Each with riskScore (1.0-5.0), lastAuditDate, requiredFrequency.

**risk-registers.json**: 12 risk entries:

- 3 CREDIT risks (loan concentration, NPA, collateral)
- 3 OPERATIONAL risks (fraud, IT failure, staff)
- 2 COMPLIANCE risks (KYC, RBI reporting)
- 2 MARKET risks (interest rate, liquidity)
- 2 IT risks (cyber, data loss)

Each with inherentScore, controlScore, residualScore (1.0-5.0), riskOwner, status.

Include 2 KRIs per risk: e.g., NPA ratio (threshold 5%), loan concentration (threshold 15%).

**controls.json**: 15 controls across process areas:

- 4 LENDING (loan sanction, disbursement, review, NPA classification)
- 3 KYC_AML (customer verification, transaction monitoring, STR filing)
- 3 IT_OPERATIONS (access control, backup, change management)
- 3 TREASURY (investment approval, SGL reconciliation, broker limits)
- 2 DEPOSITS (interest computation, premature withdrawal)

Each with controlCode, controlType, frequency, isKeyControl, frameworkMapping.

Include 1-2 test procedures per control.

**issues-seed.json**: 8 issues:

- 2 INTERNAL_AUDIT source
- 2 REGULATORY source
- 2 SELF_ASSESSMENT source
- 1 EXTERNAL_AUDIT source
- 1 CONCURRENT source

Mix of severities and statuses. Include 1-2 action plans per issue.

**qa-assessment-seed.json**: 10 IIA Standard questions:

- Standards 1000 (Purpose/Authority), 1100 (Independence), 2100 (Nature of Work)
- Mix of CONFORMS, PARTIALLY_CONFORMS, DOES_NOT_CONFORM responses
- 3 with gapIdentified: true
  </action>
  <verify>

```bash
for f in audit-universe risk-registers controls issues-seed qa-assessment-seed; do
  node -e "const d = require('./src/data/seed/${f}.json'); console.log('${f}: ' + (Array.isArray(d) ? d.length : Object.keys(d).length) + ' entries')"
done
```

  </verify>
  <done>
  - 8 audit universe entities across 4 types
  - 12 risk register entries with KRIs
  - 15 controls with test procedures
  - 8 issues across all sources
  - 10 QA assessment questions
  </done>
</task>

<task type="auto">
  <name>Task 3: Create seed JSON files for Phase 4+6 modules</name>
  <files>
    src/data/seed/concurrent-templates.json
    src/data/seed/regulatory-observations.json
    src/data/seed/policies.json
    src/data/seed/committees.json
    src/data/seed/housekeeping-metrics.json
    src/data/seed/investments.json
    src/data/seed/app-inventory.json
    src/data/seed/is-checklists.json
  </files>
  <action>
  **concurrent-templates.json**: 7 templates (one per scope area):
  - CASH, INVESTMENTS, ADVANCES, OFF_BS, DEPOSITS, KYC, EDP
  Each with 5-8 checklist items in the `checklistItems` JSON array.

**regulatory-observations.json**: 4 entries:

- 2 RBI_INSPECTION (1 SUBMITTED, 1 DRAFT ATR)
- 1 NABARD (ACCEPTED)
- 1 STATUTORY_AUDITOR (FURTHER_INFO)

**policies.json**: 8 policy documents:

- LENDING, INVESTMENT, KYC_AML, IT_SECURITY, HR, AUDIT, RISK_MANAGEMENT + 1 more
  Mix of APPROVED/UNDER_REVIEW. Include reviewDueDate for some.

**committees.json**: 4 committees:

- ACB (Audit Committee of Board), RISK_MANAGEMENT, ALCO, IT_STRATEGY
  Each with 3-4 members (roles: CHAIRMAN, MEMBER, SECRETARY).

**housekeeping-metrics.json**: 6 metrics:

- 2 INTER_BRANCH (HO, Pune)
- 2 SUSPENSE (HO, Nashik)
- 2 CLEARING (Pune, Nashik)
  With opening/closing balances and aging.

**investments.json**: 8 records:

- 3 SLR (HTM classification)
- 3 NON_SLR (AFS classification)
- 2 with broker data (for 5% cap monitoring)

**app-inventory.json**: 6 applications:

- CBS (CRITICAL, ON_PREMISE)
- Internet Banking (HIGH, CLOUD)
- Mobile Banking (HIGH, CLOUD)
- HRMS (MEDIUM, ON_PREMISE)
- Email (MEDIUM, CLOUD)
- ATM Switch (CRITICAL, ON_PREMISE)
  With DR test dates and vendor info.

**is-checklists.json**: 3 checklists:

- CBS (10 items: interest rate params, product masters, user privileges)
- BCP_DR (8 items: backup, recovery plan, DR testing, RPO/RTO)
- CYBER_SECURITY (10 items: firewall, IDS, vulnerability scanning, access review)
  </action>
  <verify>

```bash
for f in concurrent-templates regulatory-observations policies committees housekeeping-metrics investments app-inventory is-checklists; do
  node -e "const d = require('./src/data/seed/${f}.json'); console.log('${f}: ' + (Array.isArray(d) ? d.length : Object.keys(d).length) + ' entries')"
done
```

  </verify>
  <done>
  - 7 concurrent audit templates covering all scope areas
  - 4 regulatory observations across sources
  - 8 policy documents
  - 4 committees with members
  - 6 housekeeping metrics
  - 8 investment records
  - 6 application inventory entries
  - 3 IS audit checklists
  </done>
</task>

<task type="auto">
  <name>Task 4: Update seed.ts to load all new seed data</name>
  <files>prisma/seed.ts</files>
  <action>
  Read the existing `prisma/seed.ts` to understand the pattern (dynamic imports, upsert, tenant-scoped).

Add seeder functions for each new JSON file. Order matters — respect foreign key dependencies:

1. First: audit-universe entities (no FK deps)
2. Then: risk-registers (depends on audit-universe)
3. Then: controls (depends on risk-registers optionally)
4. Then: issues (depends on observations, controls optionally)
5. Then: compliance-items (depends on observations)
6. Then: everything else (templates, calendar, policies, committees, etc.)

Each seeder should:

- Import JSON via dynamic import
- Use `prisma.model.upsert()` with a unique key where possible, or `createMany({ skipDuplicates: true })`
- Set `tenantId` to the seed tenant
- Log count of created records

Add a `seedPhase2to6()` function that calls all new seeders in order, then call it from the main `seed()` function after existing seeders.
</action>
<verify>

```bash
cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit 2>&1 | grep -c "error TS"
```

Must be 0.
Then run the actual seed:

```bash
DATABASE_URL="postgresql://aegis:aegisdev2026@172.18.0.2:5432/aegis" pnpm prisma db seed 2>&1 | tail -20
```

Must complete without errors.
</verify>
<done>

- seed.ts compiles without errors
- All new seed data loads into production DB
- Every new page has data to display
- Seed is idempotent (can run multiple times safely)
  </done>
  </task>

## Success Criteria

1. All JSON seed files are valid and parseable
2. seed.ts loads all data without errors
3. Every dashboard page (ram, audit-execution, compliance, analytics, risk-management, controls, work-program, issues, qa-assessment, regulatory, governance, investments, is-audit, calendar, reports) has at least some data to display
4. Seed is idempotent — running twice doesn't create duplicates
5. TypeScript compiles with zero errors
