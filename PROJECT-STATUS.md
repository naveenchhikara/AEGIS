# AEGIS / RBIAS — Project Status

> **Date:** 2026-02-22 (updated by Neu)
> **Repo:** github.com/naveenchhikara/AEGIS (private)
> **Live:** https://aegis.nexlyadvisory.com
> **Stack:** Next.js 16 · TypeScript 5.9 · PostgreSQL 16 · Prisma 7 · Better Auth · AWS S3/SES

---

## Project Overview

AEGIS is a **Risk-Based Internal Audit System (RBIAS)** for Urban Cooperative Banks under RBI supervision. It covers the full audit lifecycle — from RAM-based risk assessment and audit planning through execution, reporting, compliance tracking, and board governance.

**Scale:** 536 source files · 2,320-line Prisma schema · 71 DB models · 20 enums · 473 commits · 104 v5.0 requirements complete + 41 v6.0 requirements in progress

---

## Milestone Status

### v5.0 — COMPLETE ✅ (104/104 requirements)

All 18 modules delivered. All 18 gaps closed via 3-wave parallel implementation. Production deployed.

#### Phase 1 — Core Audit Domain (28/28) ✅
- RAM engine with 19 configurable parameters, weighted scoring, risk categories
- Annual audit plan generation from RAM scores + frequency rules
- Audit engagement management with team assignment and section allocation
- Section-based examination across 39 functional areas with 568 value statements
- Cash verification, loan review, SMA/NPA entry forms
- BH Certificate digital sign-off workflow
- Evidence upload pipeline (S3)
- Pre-audit branch profiling with prior findings

#### Phase 2 — Reporting & Compliance (20/20) ✅
- XLSX multi-tab report generation + PDF summary with BH Certificate
- Risk rating computation with 1.5× repeat finding multiplier
- Report routing workflow (draft → reviewed → approved → issued)
- Compliance lifecycle: Branch Response → ZAC Review → ACE → ACB
- Escalation engine (L1-L4 with role-based routing)
- NPA movement waterfall analytics
- Template management admin
- S3 download route with presigned URLs

#### Phase 3 — GRC & Issue Management (20/20) ✅
- Enterprise risk register with inherent/residual scoring and KRI tracking
- Control library with test procedures and effectiveness analytics
- Auto-generated work programs on engagement creation
- Unified issue management across sources (internal/regulatory/external)
- Action plans with evidence, partial closure, safe tenant isolation
- What-if simulation for audit planning
- Risk-audit linkage mapping
- Work program task assignment
- Risk acceptance with management sign-off
- QA self-assessment expanded to ~50 IIA IPPF standards

#### Phase 4 — UCB Regulatory & Governance (24/24) ✅
- Audit universe entity registry with zone CRUD
- Unified calendar with RBIA + concurrent + IS/EDP + statutory (edit-in-place + recurrence)
- Concurrent audit scope templates and rapid entry workbench
- Finding de-duplication panel
- Regulatory observation hub with ATR workflow
- ACB workspace with auto-generated agenda builder
- Policy library, committee governance with member management
- Risk MIS dashboards
- Surprise audit scheduling
- Board consolidated view (issues + plans + QA + KRI)
- RBI inspection support pack (XLSX export)
- Serious irregularity escalation with auto-routing
- Board review calendar seeded with RBI-mandated items

#### Phase 6 — Specialized Regulatory (12/12) ✅
- SGL/CSGL reconciliation tracking
- Broker compliance analytics
- Investment classification audit checklist
- Non-SLR cap monitoring with deposit source
- Application inventory management
- IS audit checklists with save/load (CBS, channels, access, BCP/DR)
- Cyber security checklist (122 questions per RBI framework)
- Technology control evidence collection
- IS_AUDITOR role with scoped `is_audit:*` permissions
- RISK_HEAD role with dedicated dashboard and risk MIS access
- SYSTEM_ADMIN role with admin workflows

### v6.0 — RBIA Implementation (IN PROGRESS)

41 new requirements across 6 phases. Phase 18 (Foundation) planned and ready for execution.

**Key v6.0 features:**
- Hierarchical Examination Tree — variable depth (0-5) with materialized path
- 4-Point Scoring — FULLY/LARGELY/PARTIALLY/NON_COMPLIANT with weighted roll-up
- 8-State Engagement Lifecycle — PLANNED → TEAM_ASSIGNED → OPENING_MEETING → IN_PROGRESS → EXIT_MEETING → REPORT_DRAFT → COMPLETED
- Dual Findings — ActionPoints (operational, ~15-40/audit) + Observations (formal 5C, ~3-10/audit)
- Branch RBIA Scoring — frozen immutable snapshots with DB-level trigger protection
- Branch Manager Response — batch response workflow with 15-day deadline tracking

**Schema extended:** 8 new models added (ExaminationNode, ExaminationResponse, BranchRbiaScore, EngagementModuleSelection, EngagementMeeting, ActionPoint, BmBatchStatus, ResponseType)

---

## Architecture

- **Multi-tenant:** Application-level isolation via `prismaForTenant()` + explicit WHERE clauses
- **Auth:** Better Auth with bcrypt password hashing, session cookies
- **Security:** Rate limiting (10 logins/15min), account lockout (5 failures → 30min), max 2 concurrent sessions
- **RBAC:** 17 roles, 60+ permissions, role-to-permission mapping in `src/lib/permissions.ts`
- **Schema:** 71 models, 20 enums, Prisma 7 with PostgreSQL adapter
- **Data Access Layer:** 39 DAL files in `src/data-access/`, 82 server actions in `src/actions/`
- **Components:** 214 component files in `src/components/`
- **Pages:** 54 page routes
- **i18n:** next-intl with 4 locales (en, hi, mr, gu)
- **Testing:** Playwright E2E + Vitest unit tests
- **Jobs:** pg-boss (7 job files)
- **Emails:** 11 email templates via react-email + AWS SES
- **Infrastructure:** AWS CDK in `infra/`, Docker Compose, systemd service
- **Deployment:** Docker Compose, Nginx reverse proxy, Certbot SSL auto-renewal
- **CI:** GitHub Actions

---

## Known Issues (Active)

1. **SES Sandbox Mode** — AWS SES in sandbox, can only send to verified addresses. Production access pending.
2. **DB Views Not in Migrations** — 4 PostgreSQL views/functions created via standalone SQL, not tracked in Prisma migrations. Requires manual SQL application on fresh deploy.
3. **Seed Data Mismatch** — Production DB has older seed vs local comprehensive seed (10 users, 2 tenants, 39 exam areas, 568 items).
