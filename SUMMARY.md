# AEGIS — Project Summary

## What is AEGIS?

AEGIS (Audit, Enterprise Governance & Internal Systems) is a **Risk-Based Internal Audit System (RBIAS)** built as a multi-tenant SaaS platform for Urban Cooperative Banks (UCBs) in India. It covers the complete internal audit lifecycle under RBI supervision — from risk assessment and audit planning through execution, reporting, compliance tracking, and board governance.

## Live Instance

- **URL:** https://aegis.nexlyadvisory.com
- **Users:** 4 accounts (CEO, Auditor, CAE, CCO) with role-based access
- **Infrastructure:** VPS (4 vCPU, 16GB RAM) · PostgreSQL 16 · Nginx + SSL · systemd

## Tech Stack

| Layer        | Technology                                    |
| ------------ | --------------------------------------------- |
| Framework    | Next.js 16 (App Router, Turbopack)            |
| Language     | TypeScript 5.9                                |
| UI           | shadcn/ui + Radix UI + Tailwind CSS v4        |
| Database     | PostgreSQL 16 + Prisma 7 ORM                  |
| Auth         | Better Auth (bcrypt, RBAC, session cookies)   |
| i18n         | next-intl (English, Hindi, Marathi, Gujarati) |
| File Storage | AWS S3 (Mumbai region)                        |
| Email        | AWS SES (DKIM verified)                       |
| Reports      | ExcelJS (XLSX) + @react-pdf/renderer (PDF)    |
| Testing      | Playwright (E2E) + Vitest (unit)              |
| Deployment   | Docker Compose, Nginx, Certbot SSL, systemd   |
| IaC          | AWS CDK (in `infra/`)                         |
| CI/CD        | GitHub Actions                                |

## Scale

| Metric                | Count       |
| --------------------- | ----------- |
| Source files          | 559         |
| Prisma schema         | 1,999 lines |
| Database models       | 63          |
| Database enums        | 16          |
| Page routes           | 52          |
| Component files       | 212         |
| Server actions        | 78          |
| Data access files     | 39          |
| Library/utility files | 34          |
| RBAC roles            | 17          |
| Permissions           | 60+         |
| Git commits           | 381         |
| Requirements (total)  | 104         |
| Requirements (done)   | 86          |

## Modules

### Core Audit (Phase 1 — 27/28 done)

- RAM engine: 19 configurable parameters, weighted scoring, risk categories
- Annual audit plan generation from RAM scores + frequency rules
- Audit engagement management with team assignment and section allocation
- Section-based examination across 39 functional areas with 568 value statements
- Cash verification, loan review, SMA/NPA entry forms
- BH Certificate digital sign-off workflow
- Evidence upload pipeline (AWS S3)
- Pre-audit branch profiling with prior findings

### Reporting & Compliance (Phase 2 — 18/20 done)

- XLSX multi-tab report generation + PDF summary with BH Certificate
- Risk rating computation with 1.5x repeat finding multiplier
- Report routing workflow (draft -> reviewed -> approved -> issued)
- Compliance lifecycle: Branch Response -> ZAC Review -> ACE -> ACB
- Escalation engine (L1-L4 with role-based routing)
- NPA movement waterfall analytics
- Template management admin

### GRC & Issue Management (Phase 3 — 16/20 done)

- Enterprise risk register with inherent/residual scoring and KRI tracking
- Control library with test procedures and effectiveness analytics
- Auto-generated work programs on engagement creation
- Unified issue management across sources (internal/regulatory/external)
- Action plans with evidence, partial closure, safe tenant isolation
- What-if simulation for audit planning
- Risk-audit linkage mapping

### UCB Regulatory & Governance (Phase 4 — 18/24 done)

- Audit universe entity registry
- Unified calendar with RBIA + concurrent + IS/EDP + statutory
- Concurrent audit scope templates and rapid entry workbench
- Finding de-duplication panel
- Regulatory observation hub with ATR workflow
- ACB workspace with auto-generated agenda builder
- Policy library, committee governance with member management
- Risk MIS dashboards
- Surprise audit scheduling

### Specialized Regulatory (Phase 6 — 7/12 done)

- SGL/CSGL reconciliation tracking
- Broker compliance analytics
- Investment classification audit checklist
- Application inventory management
- IS audit checklists (CBS, channels, access, BCP/DR)
- Cyber security checklist framework
- Technology control evidence collection

## Architecture Highlights

- **Multi-tenant isolation:** Application-level WHERE clauses (no PostgreSQL RLS); tenantId from authenticated session only
- **Two-layer auth:** Edge middleware (cookie check) + server-side session validation in dashboard layout
- **Data access pattern:** Page -> getRequiredSession() -> DAL function (with tenantId WHERE) -> Prisma -> PostgreSQL
- **RBAC:** 17 roles with multi-role support; permission = union of all role permissions
- **Security:** Rate limiting, account lockout, CSRF protection, secure cookies, max 2 concurrent sessions
- **State management:** Zustand (client), React Query (server), react-hook-form + Zod (forms)

## Remaining Gaps (18 items)

See `PROJECT-STATUS.md` for detailed breakdown of pending requirements across Phase 1 (1), Phase 2 (2), Phase 3 (4), Phase 4 (6), and Phase 6 (5).

Key gaps: zone management UI, report download tracking, work program execution, board consolidated view, IS/risk role enforcement, IS audit checklist completion flows.

## Known Issues

1. Dashboard NaN values in risk indicators (null aggregation)
2. AWS SES in sandbox mode (email to verified addresses only)
3. Missing index pages for `/audit-execution` and `/admin`
4. Dashboard PostgreSQL views not tracked in Prisma migrations
5. Seed data mismatch between local and production
