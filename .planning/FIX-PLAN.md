# Fix Plan — 14 Failures + 30 Partials

## Categorized by Fix Type

### Category A: Missing Zod Validation (Quick fixes — add Zod schema to existing actions)
- R20: deleteLoanReview lacks Zod
- R49: deleteAuditUniverseEntity lacks Zod
- R56: assignWorkProgramItem lacks Zod
- R61: updateActionPlanProgress/completeActionPlan lack Zod
- R73: deleteTemplate lacks Zod
- R84: deletePolicy lacks Zod
- R86: generateInspectionPack year input not Zod-validated
- R93: markReconciled lacks Zod

### Category B: Missing UI Wiring (Backend exists, UI not connected)
- R51: KRI CRUD UI missing (action exists, no form)
- R52: Risk-to-audit linkage UI missing (DAL exists)
- R55: Test procedure UI missing (action + DAL exist)
- R57: Work program generator not wired from UI
- R82: ACB agenda builder not rendered in governance route

### Category C: Stub/TODO Code (Needs real implementation)
- R13: Team assignment UI is a stub + no section allocation
- R76: Dedup findings panel uses mocked empty array
- R96: Classification checklist save is TODO stub

### Category D: Incomplete CRUD (Create works, edit/delete missing)
- R11: Engagement creation form missing required fields
- R54: Control library missing frameworkMapping + detail route
- R56: Work program missing create/generate UI + detail route
- R60: Issue-to-control/compliance linking not surfaced
- R61: Evidence upload/verification not in UI
- R85: Committee member CRUD + minutes upload missing

### Category E: Data/Config Issues
- R2: Zone management — no UI/DAL/seed
- R8: RAM frequency thresholds hardcoded (need settings-based)
- R14/R15/R22/R28: Seed counts (39/568) exceed spec (25/239) — validator flagged as fail but actually exceeds requirements
- R87/R88: Housekeeping metric type restriction (only 4 types in capture UI)
- R95: Non-SLR cap deposit source not wired

### Category F: Security (tenantId in WHERE clauses)
- R70: analytics DAL uses global prisma
- R73: template update/delete not tenant-filtered in WHERE
- R77/R78: regulatory update WHERE missing tenantId
- R84: policy update/delete WHERE missing tenantId

### Category G: Missing Features (Need new implementation)
- R32: Report templates not applied to generation
- R53: What-if simulation for audit planning
- R58: Control effectiveness trend/heatmap analytics
- R71: Surprise audit scheduling support
- R86: PDF/XLSX export for inspection pack
- R89/R90: Regulatory reporting templates
- R92: Branch compliance dashboard

### Category H: Minor Issues (Hardcoded values, placeholder IDs)
- R29: Draft report not persisted to DB
- R34/R35: Report status transitions incomplete
- R38: ACB PDF not wired from UI
- R39: Escalation automation partial
- R44: Compliance lifecycle gaps
- R45-R47: Calendar using global prisma + missing Zod
- R48: Template library partial
- R83: Board review calendar hardcoded RBI items
- R99/R101/R103: "current-user-id" placeholder breaks Zod UUID
- R100: Vendor risk applicationId set to name not UUID
- R104: Gap analysis not persisted + crash on non-array items

## Execution Plan

### Wave 3a — Security Fixes (Category F) — IMMEDIATE
Fix tenant isolation gaps. ~30 min, do directly.

### Wave 3b — Zod Validation (Category A) — Quick wins
Add Zod to 8 actions. ~20 min, do directly.

### Wave 3c — Placeholder/Bug Fixes (Category H subset) — Quick wins  
Fix current-user-id placeholders, applicationId bug, crash fixes. ~20 min, do directly.

### Wave 3d — UI Wiring (Category B) — Sub-agents
5 plans, each wiring existing backend to UI. Sonnet executors.

### Wave 3e — Stub Completion (Category C) — Sub-agents
3 plans for real implementations. Sonnet executors.

### Wave 3f — Incomplete CRUD (Category D) — Sub-agents
6 plans for CRUD completion. Sonnet executors.

### Wave 3g — New Features (Category G) — Sub-agents
7 plans for new features. These are the heaviest.

### Data Issues (Category E)
- R14/R15/R22/R28: NOT actual failures — our seed EXCEEDS spec (39>25, 568>239). Reclassify as PASS.
- R2/R8/R87/R88/R95: Config/settings issues, lower priority.
