# RBIAS v3.0 — Master Expansion Plan

> Expanding AEGIS v2.0 into a full Risk-Based Internal Audit System for UCBs.
> Stack: Next.js 16 + PostgreSQL + Prisma 7 + Better Auth + AWS S3/SES (existing AEGIS stack).
> **NOT** the SDD's React+Express — we build on what's already working and live.

---

## Current State (AEGIS v2.0)

### Existing Prisma Models (27)

Tenant, User, Session, Account, Verification, Observation, ObservationTimeline, ObservationRbiCircular, Evidence, ComplianceRequirement, RbiCircular, Branch, AuditArea, AuditPlan, AuditEngagement, UserBranchAssignment, AuditeeResponse, AuditLog, NotificationQueue, EmailLog, NotificationPreference, BoardReport, DashboardSnapshot, RbiMasterDirection, RbiChecklistItem, OnboardingProgress, FailedLoginAttempt

### Existing Roles (7)

AUDITOR, AUDIT_MANAGER, CAE, CCO, CEO, AUDITEE, BOARD_OBSERVER

### Existing Routes

- `/login` — auth
- `/dashboard` — role-based widgets (health score, findings, compliance, regulatory calendar, heatmap, KPIs)
- `/admin/users` — user management
- `/audit-plans` — plan CRUD
- `/audit-trail` — immutable log viewer
- `/auditee/[observationId]` — auditee response portal
- `/compliance` — compliance tracking
- `/findings` / `/findings/new` / `/findings/[id]` — observation CRUD
- `/reports` — board reports, PDF/Excel export
- `/settings` — bank profile, notifications, compliance

### Existing Server Actions (10 files)

observations/{create,transition,resolve-fieldwork,schemas}, compliance-management, users, user-invitations, auditee, onboarding, onboarding-excel-upload, repeat-findings/{detect,confirm,schemas}, notification-preferences, settings

### Existing Components

Dashboard widgets, PDF report generator, Excel exports/parsers, email templates (6), UI components (25+ radix-based)

---

## Target: RBIAS v3.0 — 20 Modules

### Module-to-Existing Mapping

| Module | Name                        | Exists? | Gap                                                                                                                                 |
| ------ | --------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| M1     | Audit Planning & RAM        | Partial | AuditPlan/Engagement exist. **Missing: RAM engine (19 params), auto-scheduling, risk scoring**                                      |
| M2     | Pre-Audit                   | No      | **New: branch profiling, team assignment, document pack**                                                                           |
| M3     | Execution / Value Statement | Partial | Observations/Evidence exist. **Missing: section framework, 12 functional areas, 220+ examination items, cash checks, loan reviews** |
| M4     | Reports                     | Partial | Board report + Excel exist. **Missing: BH Certificate, summary reports, regulatory report templates**                               |
| M5     | Compliance                  | Partial | ComplianceRequirement exists. **Missing: escalation engine, ZAC/ACE/ACB workflow levels**                                           |
| M6     | Analytics                   | Partial | Dashboard widgets exist. **Missing: trend analysis, branch scorecards, heatmap data**                                               |
| M7     | Administration              | Partial | User CRUD exists. **Missing: skills matrix, audit calendar, template management**                                                   |
| M8     | Enterprise Risk Register    | No      | **New: risk_register, risk_statements, KRIs, risk-plan linkage**                                                                    |
| M9     | Control Library             | No      | **New: control_library, test_procedures, work_program_items**                                                                       |
| M10    | Continuous Auditing         | No      | **DEFERRED (Wave 5)**                                                                                                               |
| M11    | AI Analytics                | No      | **DEFERRED (Wave 5)**                                                                                                               |
| M12    | Issue Management            | No      | **New: unified issues, action_plans, multi-source**                                                                                 |
| M13    | Quality Management          | No      | **New: self-assessments, KPIs, QA framework**                                                                                       |
| M14    | Unified Audit Universe      | No      | **New: audit_universe_entities, calendar, periodicity**                                                                             |
| M15    | Concurrent Audit            | No      | **New: scope templates, rapid entry, escalation**                                                                                   |
| M16    | IRAC / Provisioning         | No      | **DEFERRED**                                                                                                                        |
| M17    | Investment / Treasury       | No      | New: SGL/CSGL, broker controls, non-SLR monitoring                                                                                  |
| M18    | EDP / IS Audit              | No      | New: app inventory, IS checklists, vendor tracking                                                                                  |
| M19    | Regulatory Hub / Follow-up  | No      | **New: RBI observation tracker, ATR workflow**                                                                                      |
| M20    | Governance / Board          | No      | **New: ACB workspace, policy library, committee tracking**                                                                          |

### New Roles Needed (4 additions)

- FIELD_AUDITOR (maps from AUDITOR with restricted scope)
- LEAD_AUDITOR (new — team lead per engagement)
- BRANCH_HEAD (maps from AUDITEE with sign-off capability)
- CONCURRENT_AUDITOR (new — external CA firm role)
- ZONAL_AUDITOR (maps to existing but needs explicit role)
- IS_AUDITOR (new — EDP/IS specific)
- RISK_HEAD (new — risk committee)
- ACB_MEMBER (maps from BOARD_OBSERVER with write access)

**Decision**: Extend Role enum incrementally per wave. Don't add all 11 roles day one — add them when the module that needs them lands.

---

## Deferred

| Item               | Reason                                                    | Dependency           |
| ------------------ | --------------------------------------------------------- | -------------------- |
| Wave 5 (M10 + M11) | Continuous auditing + AI — needs CBS data feeds, ML infra | M1-M9 complete first |
| M16 IRAC Engine    | Complex computation engine — needs loan data pipeline     | CBS integration      |

---

## Wave Execution Plan

### Wave 1: Schema Foundation & RAM Engine ⚡

**Goal**: Extend Prisma schema for M1-M3 core, implement RAM engine, new roles.
**Duration**: 2 sprints (conceptual)
**Priority**: CRITICAL — everything depends on this

#### Sprint 1A: Schema & Migrations

- Extend `Role` enum: add LEAD_AUDITOR, BRANCH_HEAD, FIELD_AUDITOR
- New models:
  - `RamAssessment` — branch risk assessment (links to Branch + AuditPlan)
  - `RamParameter` — 19 individual parameter scores per assessment
  - `ExaminationArea` — 12 functional areas (seed data)
  - `ExaminationItem` — 220+ value statements per area (seed data)
  - `AuditSection` — sections within an engagement (maps to examination areas)
  - `AuditExaminationResponse` — auditor responses per item per engagement
  - `LoanReview` — individual loan account reviews during audit
  - `SmaNpaEntry` — SMA/NPA tracking per loan
  - `CashCheck` — cash verification records
- Extend `AuditEngagement`: add `lead_auditor_id`, `pre_audit_complete`, `bh_certificate_status`
- Extend `Branch`: add `last_ram_score`, `risk_category`, `last_audit_rating`
- Seed data: 12 examination areas + 220+ items from SDD

#### Sprint 1B: RAM Engine

- RAM computation service (`src/lib/ram-engine.ts`)
- 19 parameters with configurable weights (stored in `RamParameter`)
- Risk categorization: High / Medium-High / Medium / Low
- Auto-scheduling logic: frequency = f(risk_category)
- RAM dashboard component
- Server actions: `actions/ram/compute.ts`, `actions/ram/assess.ts`
- Tests: RAM computation accuracy, edge cases

**Sub-agents**:

1. **Schema Architect** (Opus) — Prisma migration + seed data
2. **Backend Dev** (Sonnet) — RAM engine + server actions
3. **Validator** (GPT-4.2) — Review schema, typecheck, test edge cases

---

### Wave 2: Audit Execution Framework (M2 + M3)

**Goal**: Pre-audit workflow, section-based execution, value statement framework
**Priority**: CRITICAL
**Depends on**: Wave 1

#### Sprint 2A: Pre-Audit Module (M2)

- Branch profiling page: last audit, RAM score, key metrics, prior findings
- Team assignment: lead auditor + team members with skill matching
- Document pack generation: pre-populated checklists per branch risk profile
- Pre-audit checklist workflow
- New route: `/engagements/[id]/pre-audit`

#### Sprint 2B: Execution Module (M3)

- Section-based audit execution UI
- 12 functional area tabs (Deposits, Remittances, Cash, etc.)
- Per-item examination response (satisfactory / observation / NA)
- Auto-save with offline support
- Cash verification form (denomination-level)
- Loan review form with SMA/NPA tracking
- Branch Head Certificate workflow
- Evidence attachment per section/item
- New routes:
  - `/engagements/[id]/execute`
  - `/engagements/[id]/sections/[sectionId]`
  - `/engagements/[id]/loans`
  - `/engagements/[id]/cash-check`
  - `/engagements/[id]/bh-certificate`

**Sub-agents**:

1. **Backend Dev** (Sonnet) — Server actions, data layer
2. **Frontend Dev** (Sonnet) — Execution UI, forms, section tabs
3. **Validator** (GPT-4.2) — Review, UX audit, type safety

---

### Wave 3: Reporting, Compliance & Analytics (M4 + M5 + M6 + M7)

**Goal**: Enhanced reports, multi-level compliance, analytics dashboards, admin tools
**Priority**: HIGH
**Depends on**: Wave 2

#### Sprint 3A: Enhanced Reports (M4)

- Report templates matching SDD specs:
  - Detailed Branch Audit Report (Excel — matching existing bank format)
  - Summary Audit Report (PDF)
  - BH Certificate with digital sign-off
  - Regulatory submission packs
- Report routing workflow (draft → review → approved → issued)
- Cross-engagement comparison reports

#### Sprint 3B: Compliance Workflow (M5)

- Multi-level compliance tracking: Branch → ZAC → ACE → ACB
- Escalation engine with configurable SLAs
- Response portal enhancement (extension requests, partial compliance)
- Compliance dashboard with SLA breach alerts
- New roles in workflow: ZONAL_AUDITOR

#### Sprint 3C: Analytics & Admin (M6 + M7)

- Branch scorecards with trend analysis
- Risk heatmap with real data from RAM assessments
- Finding aging analysis
- Compliance closure rates
- Repeat finding analysis (enhance existing)
- Admin: audit calendar, template management, notification rules

**Sub-agents**:

1. **Backend Dev** (Sonnet) — Report generation, compliance engine, escalation
2. **Frontend Dev** (Sonnet) — Dashboard widgets, analytics charts
3. **Domain Expert** (Opus) — Regulatory accuracy, report format validation
4. **Validator** (GPT-4.2) — Integration testing, data consistency

---

### Wave 4: GRC, Issue Management & Governance (M8 + M9 + M12 + M13 + M14 + M15 + M19 + M20)

**Goal**: Enterprise risk register, control library, unified issue management, governance
**Priority**: HIGH
**Depends on**: Wave 3

#### Sprint 4A: Risk Register & Control Library (M8 + M9)

- New models: `RiskRegister`, `RiskStatement`, `KeyRiskIndicator`, `ControlLibrary`, `TestProcedure`, `WorkProgramItem`
- Risk register CRUD with risk-audit linkage
- Control library with effectiveness tracking
- Work program auto-generation per engagement
- New routes: `/risk-register`, `/controls`, `/work-programs`

#### Sprint 4B: Issue Management & Quality (M12 + M13)

- Unified `Issue` model (extends beyond observations)
- `ActionPlan` model with milestone tracking
- Multi-source issue ingestion (internal, regulatory, external audit)
- Quality assessment framework
- Internal audit effectiveness KPIs
- New routes: `/issues`, `/issues/[id]`, `/quality`

#### Sprint 4C: Audit Universe, Concurrent Audit & Governance (M14 + M15 + M19 + M20)

- `AuditUniverseEntity` model (branches, departments, processes, vendors)
- Unified audit calendar with all audit types
- Concurrent audit workbench (rapid entry, scope templates)
- Role: CONCURRENT_AUDITOR
- Regulatory observation hub (RBI, statutory, concurrent)
- ATR workflow
- ACB workspace & agenda builder
- Policy library with review tracking
- Board committee governance
- New routes: `/audit-universe`, `/concurrent`, `/regulatory`, `/governance`, `/policies`

**Sub-agents**:

1. **Schema Architect** (Opus) — Complex schema design (15+ new models)
2. **Backend Dev** (Sonnet) — Business logic, workflows
3. **Frontend Dev** (Sonnet) — Multiple new pages + dashboards
4. **Security Reviewer** (GLM-5) — RBAC, data isolation, RLS policies
5. **Validator** (GPT-4.2) — Integration, consistency, regression

---

### Wave 5: DEFERRED ⏸️

M10 (Continuous Auditing), M11 (AI Analytics)
_Requires CBS data feeds, ML infrastructure. Park for later._

---

### Wave 6: Regulatory Modules (M17 + M18)

**Goal**: Investment/treasury controls, EDP/IS audit
**Priority**: MEDIUM
**Depends on**: Wave 4

#### Sprint 6A: Investment & Treasury (M17)

- SGL/CSGL reconciliation tracking
- Broker compliance analytics (5% cap)
- Non-SLR investment monitoring
- Quarterly certification workflow
- Treasury as auditable entity

#### Sprint 6B: EDP / IS Audit (M18)

- Application inventory model
- IS audit checklists (CBS, channels, access, BCP/DR, vendor)
- Vendor risk tracking
- IS-specific role: IS_AUDITOR
- Technology control evidence collection

**Sub-agents**:

1. **Backend Dev** (Sonnet) — Domain-specific logic
2. **Domain Expert** (Opus) — RBI regulatory accuracy
3. **Validator** (GPT-4.2) — Compliance verification

---

## Sub-Agent Architecture

### Agent Roles & Models

| Role               | Model      | Skill Set                                               | Purpose                                     |
| ------------------ | ---------- | ------------------------------------------------------- | ------------------------------------------- |
| Schema Architect   | Opus 4.6   | prisma, architecture-patterns, sql-toolkit              | Prisma schema design, migrations, seed data |
| Backend Developer  | Sonnet 4.5 | senior-backend, nodejs-patterns, api-dev                | Server actions, business logic, services    |
| Frontend Developer | Sonnet 4.5 | nextjs-expert, anthropic-frontend-design, ui-ux-pro-max | React components, pages, forms              |
| Domain Expert      | Opus 4.6   | architecture-patterns                                   | RBI regulatory compliance, business rules   |
| Security Reviewer  | GPT-4.2    | security-audit                                          | RBAC, RLS, data isolation review            |
| Validator          | GPT-4.2    | test-patterns, typescript-pro                           | Typecheck, review, test, catch regressions  |

### Execution Pattern (per Sprint)

```
1. Orchestrator (main session) creates sprint spec
2. Schema Architect → Prisma migration + seed data (if needed)
3. Backend Dev → Server actions + lib services (parallel with Frontend if no deps)
4. Frontend Dev → Pages + components
5. Validator → typecheck + review + test all changes
6. Orchestrator → merge, verify, commit
```

### Context Per Sub-Agent

Each sub-agent receives:

- Sprint spec (what to build, acceptance criteria)
- Relevant existing files (schema, related actions, related components)
- Coding standards (AEGIS conventions: server actions pattern, prisma tenant isolation, etc.)
- **NO full codebase dump** — targeted context only

---

## Conventions (AEGIS Codebase)

### Patterns to Follow

- **Server Actions**: `src/actions/{module}/{action}.ts` with `"use server"` + Zod validation
- **Prisma**: `prismaForTenant(tenantId)` for all queries (RLS via $transaction)
- **Auth**: Better Auth, cookie-based session check in middleware
- **Components**: Radix UI primitives via shadcn, TanStack Table for data grids
- **Forms**: React Hook Form + Zod resolvers
- **State**: TanStack Query for server state, Zustand for client state
- **Routes**: Next.js App Router, `(dashboard)/` layout group
- **Exports**: Excel via ExcelJS, PDF via @react-pdf/renderer
- **Emails**: React Email templates + AWS SES

### File Structure for New Modules

```
src/
  actions/{module}/          # Server actions
  app/(dashboard)/{module}/  # Pages
  components/{module}/       # Module-specific components
  lib/{module}.ts           # Business logic / services
prisma/
  migrations/               # Prisma migrations
  seed-{module}.ts         # Seed data
```

---

## Seed Data Requirements

### Wave 1 Seed Data

1. **19 RAM Parameters** with default weights:
   - Capital Adequacy, Asset Quality (NPA), Profitability, Compliance History, Internal Controls, Previous Audit Rating, Management Quality, Operational Risk, Fraud History, IT/Cyber Risk, Housekeeping, Staff Matters, Business Growth, Deposit Concentration, Credit Concentration, Market Risk, Liquidity Risk, Regulatory Penalties, Special Observations

2. **12 Examination Areas**:
   - Deposits, Remittances, Cash & Currency Chest, Government Business, Bills, Clearing, Customer Service, KYC/AML, IT & Cyber Security, Human Resources, General Administration, Credit/Advances

3. **220+ Examination Items**: Value statements per area (from SDD & IA Format reference)

---

## Risk Mitigation

| Risk                               | Mitigation                                                    |
| ---------------------------------- | ------------------------------------------------------------- |
| Schema migration breaks production | Feature branches, test migrations on staging before deploy    |
| Sub-agent context rot              | Fresh context per task, targeted file inclusion               |
| Role proliferation complexity      | Add roles incrementally, test RBAC per wave                   |
| Scope creep                        | Strict wave boundaries, defer non-critical features           |
| Performance with 15+ new models    | Index strategy per wave, query optimization in validator step |

---

## Definition of Done (per Sprint)

- [ ] Prisma migration applies cleanly
- [ ] TypeScript compiles with zero errors
- [ ] Server actions have Zod input validation
- [ ] RBAC enforced on all new routes/actions
- [ ] Tenant isolation maintained (prismaForTenant)
- [ ] Seed data loads without errors
- [ ] New pages accessible from sidebar navigation
- [ ] Validator sub-agent passes review
- [ ] Committed to feature branch, squash-merged to main
- [ ] Docker build succeeds
