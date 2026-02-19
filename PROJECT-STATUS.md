# AEGIS / RBIAS v3.0 — Project Status

> **Date:** 2026-02-19  
> **Repo:** github.com/naveenchhikara/AEGIS (private)  
> **Live:** https://aegis.nexlyadvisory.com  
> **Stack:** Next.js 16 · TypeScript · PostgreSQL 16 · Prisma 7 · Better Auth · AWS S3/SES

---

## Project Overview

AEGIS is a **Risk-Based Internal Audit System (RBIAS)** for Urban Cooperative Banks under RBI supervision. It covers the full audit lifecycle — from RAM-based risk assessment and audit planning through execution, reporting, compliance tracking, and board governance.

**Scale:** 559 source files · 1,999-line Prisma schema · 63 DB models · 16 enums · 381 commits · 104 requirements across 18 modules

---

## What's Done ✅ (86/104 requirements)

### Phase 1 — Core Audit Domain (27/28)

- RAM engine with 19 configurable parameters, weighted scoring, risk categories
- Annual audit plan generation from RAM scores + frequency rules
- Audit engagement management with team assignment and section allocation
- Section-based examination across 39 functional areas with 568 value statements
- Cash verification, loan review, SMA/NPA entry forms
- BH Certificate digital sign-off workflow
- Evidence upload pipeline (S3)
- Pre-audit branch profiling with prior findings

### Phase 2 — Reporting & Compliance (18/20)

- XLSX multi-tab report generation + PDF summary with BH Certificate
- Risk rating computation with 1.5× repeat finding multiplier
- Report routing workflow (draft → reviewed → approved → issued)
- Compliance lifecycle: Branch Response → ZAC Review → ACE → ACB
- Escalation engine (L1-L4 with role-based routing)
- NPA movement waterfall analytics
- Template management admin

### Phase 3 — GRC & Issue Management (16/20)

- Enterprise risk register with inherent/residual scoring and KRI tracking
- Control library with test procedures and effectiveness analytics
- Auto-generated work programs on engagement creation
- Unified issue management across sources (internal/regulatory/external)
- Action plans with evidence, partial closure, safe tenant isolation
- What-if simulation for audit planning
- Risk-audit linkage mapping

### Phase 4 — UCB Regulatory & Governance (18/24)

- Audit universe entity registry
- Unified calendar with RBIA + concurrent + IS/EDP + statutory
- Concurrent audit scope templates and rapid entry workbench
- Finding de-duplication panel
- Regulatory observation hub with ATR workflow
- ACB workspace with auto-generated agenda builder
- Policy library, committee governance with member management
- Risk MIS dashboards
- Surprise audit scheduling

### Phase 6 — Specialized Regulatory (7/12)

- SGL/CSGL reconciliation tracking
- Broker compliance analytics
- Investment classification audit checklist
- Application inventory management
- IS audit checklists (CBS, channels, access, BCP/DR)
- Cyber security checklist framework
- Technology control evidence collection

### Infrastructure & Deployment

- **Live at** https://aegis.nexlyadvisory.com
- Docker Compose (PostgreSQL 16 + Next.js app)
- Nginx reverse proxy with security headers
- SSL certificate (valid till 2026-05-18)
- 4 user accounts (CEO, Auditor, CAE, CCO) with RBAC
- Tenant isolation via application-level WHERE clauses
- AWS S3 bucket for evidence storage (Mumbai region)
- AWS SES configured with DKIM verification

---

## What's Pending ⏳ (18/104 requirements)

### Phase 1 (1 item)

| ID  | Gap                                             | Impact                                                                |
| --- | ----------------------------------------------- | --------------------------------------------------------------------- |
| R2  | Zone management — schema exists, no UI/DAL/seed | Branches can't be assigned to zones; ZAC workflow lacks zone grouping |

### Phase 2 (2 items)

| ID  | Gap                                                                            | Impact                              |
| --- | ------------------------------------------------------------------------------ | ----------------------------------- |
| R29 | XLSX report — no `GeneratedReport` tracking model, can't re-download           | No audit trail of generated reports |
| R47 | Calendar — create/delete works but no drag-and-drop or periodicity enforcement | Manual calendar management only     |

### Phase 3 (4 items)

| ID  | Gap                                                                 | Impact                                     |
| --- | ------------------------------------------------------------------- | ------------------------------------------ |
| R56 | WorkProgramItem execution — status/result fields not editable in UI | Auditors can't record test results         |
| R62 | Accepted risk tracking — no formal management sign-off workflow     | Risk acceptance not auditable              |
| R63 | Board consolidated view — page exists but queries incomplete        | Board can't see cross-source issue summary |
| R64 | QA self-assessment — no IIA Standards questionnaires seeded         | Quality assessment can't be run            |

### Phase 4 (6 items)

| ID  | Gap                                                           | Impact                           |
| --- | ------------------------------------------------------------- | -------------------------------- |
| R75 | Serious irregularity escalation — no auto-routing workflow    | Manual escalation only           |
| R83 | Board review calendar — no RBI-mandated items seeded          | Calendar exists but empty        |
| R86 | RBI inspection support pack — no one-click report generation  | Manual pack assembly             |
| R89 | IS_AUDITOR role — schema exists, no scoped access enforcement | IS auditors use generic access   |
| R90 | RISK_HEAD role — schema exists, not wired to risk MIS         | Role has no specific permissions |
| R92 | SYSTEM_ADMIN role — exists but no dedicated admin workflows   | Admin uses CAE permissions       |

### Phase 6 (5 items)

| ID   | Gap                                                             | Impact                          |
| ---- | --------------------------------------------------------------- | ------------------------------- |
| R95  | Non-SLR cap monitoring — deposit source not wired in UI         | Manual deposit entry            |
| R99  | IS audit checklists — create works, can't fill/complete items   | Incomplete audit workflow       |
| R100 | Vendor risk tracking — edit path buggy, applicationId incorrect | Can't update vendor assessments |
| R101 | CBS parameter items — save creates records but no load/complete | Incomplete CBS audit            |
| R103 | Cyber checklist — 107 questions (spec: 122), completion bug     | Incomplete coverage             |

---

## Problems Being Faced 🔴

### 1. Prisma Transaction Timeouts (RESOLVED)

- **Problem:** `prismaForTenant()` wrapped every query in `$transaction` with `SET LOCAL` for RLS. Under SSR load (10+ parallel queries), transactions competed for pool connections → P2028 timeouts → 500 errors on every page.
- **Resolution:** Switched to application-level tenant isolation (WHERE clauses in every DAL function). No RLS policies exist in DB anyway, so transaction wrapping was a no-op.
- **Impact:** 78 source files were importing the broken version. Fixed by redirecting `@/data-access/prisma` to re-export from `@/lib/prisma`.

### 2. Database Views Not in Migrations

- **Problem:** Dashboard relies on 4 PostgreSQL views/functions (`v_compliance_summary`, `v_observation_severity`, `v_audit_coverage_branch`, `fn_dashboard_health_score`) that were created via standalone SQL files, not tracked in Prisma migrations. Every fresh deploy requires manual SQL application.
- **Workaround:** Manual application after `docker compose up`.
- **Needed:** Add views to a migration or a post-deploy script.

### 3. CEO Role Had Minimal Permissions

- **Problem:** CEO role only had 6 permissions (dashboard, reports, observations, compliance). All new RBIAS modules (risk management, controls, governance, etc.) redirect to dashboard when accessed.
- **Resolution:** Expanded CEO to 30+ permissions covering all modules with read access.
- **Needed:** Proper role matrix review — other roles (CCO, BOARD_OBSERVER) likely need expansion too.

### 4. SES Sandbox Mode

- **Problem:** AWS SES is in sandbox mode — can only send emails to verified addresses. Escalation engine, report routing, and compliance notifications can't send to real users.
- **Status:** Production access requested, awaiting AWS approval.
- **Impact:** All email-dependent workflows are non-functional in production.

### 5. Seed Data Mismatch Between Local and Deployed

- **Problem:** Local codebase has comprehensive seed data (10 users, 2 tenants, 39 exam areas, 568 items, RAM parameters). Deployed DB has old minimal seed (4 users, 1 tenant). Most module pages show empty states.
- **Needed:** Re-run seed on production DB or create a dedicated data migration.

### 6. Missing Index Pages

- **Problem:** `/audit-execution` and `/admin` return 404 because they only have nested routes (e.g., `/audit-execution/[id]`, `/admin/users`). No landing/index pages exist for these paths.
- **Impact:** Navigation to these sections fails unless using exact sub-routes.

### 7. Dashboard NaN Values

- **Problem:** Dashboard Risk Indicators show "NaN" for Critical Findings and Overdue Items when observation data has null values in aggregation queries.
- **Needed:** Null-safe aggregation in dashboard data access layer.

---

## Architecture Notes

- **Multi-tenant:** Application-level isolation via `prismaForTenant()` + explicit WHERE clauses
- **Auth:** Better Auth with bcrypt password hashing, session cookies (`__Secure-better-auth.session_token`)
- **Security:** Rate limiting (10 logins/15min), account lockout (5 failures → 30min), max 2 concurrent sessions
- **RBAC:** 17 roles, 60+ permissions, role-to-permission mapping in `src/lib/permissions.ts`
- **Schema:** 63 models, 16 enums, Prisma 7 with PostgreSQL adapter (`@prisma/adapter-pg`)
- **Data Access Layer:** 39 DAL files in `src/data-access/`, 78 server actions in `src/actions/`
- **i18n:** next-intl with 4 locales (en, hi, mr, gu) — `messages/` directory
- **Testing:** Playwright E2E + Vitest unit tests
- **Infrastructure:** AWS CDK in `infra/`, Docker Compose, systemd service
- **Deployment:** Docker Compose, Nginx reverse proxy, Certbot SSL auto-renewal
- **CI:** Pre-commit hooks enforce validation reports before commits
