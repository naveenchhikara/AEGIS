# AEGIS - UCB Internal Audit & Compliance Platform

## What This Is

A multi-tenant SaaS platform for Urban Cooperative Banks (UCBs) to manage internal audits and track compliance with RBI regulations. Auditors conduct branch/unit/process audits and record observations that flow through a structured 7-state lifecycle (Draft → Submitted → Reviewed → Issued → Response → Compliance → Closed). These observations aggregate automatically into macro-level views — compliance status for the CCO, risk picture for the CEO, and board reports for the Audit Committee.

v1.0 shipped as a clickable prototype. v2.0 added real PostgreSQL backend, Better Auth, multi-tenancy, and observation-to-board-report workflow. v3.0 completed all 104 RBIAS requirements across 18 modules with production hardening. v4.0 added platform hardening (backups, monitoring, security). v5.0 delivered pilot readiness with dashboard polish and navigation improvements. v6.0 implements the full RBIA audit workflow — hierarchical examination trees, 4-point weighted scoring, dual findings (ActionPoints + Observations), 8-state engagement lifecycle, and enhanced reporting. Phase 18 (Foundation) is fully planned with 5 plans across scoring engine, state machine, DB guards, terminology rename, and data encryption audit.

## Core Value

**Individual audit observations flow upward through a structured lifecycle to form the complete risk and compliance picture — from a single branch finding to the board report.**

If nothing else works, the platform must let auditors record observations, track them to closure, and let management see the consolidated picture without manual aggregation.

## Current State

**Shipped:** v7.0 Sample-Based Account Examination (2026-03-01) — 5 phases, 13 plans, 20 requirements
**Status:** v7.0 complete. No active milestone.
**Tech Stack:** Next.js 16 (App Router), TypeScript 5.9, shadcn/ui, Tailwind CSS v4, PostgreSQL 16, Better Auth, Prisma 7, AWS S3, AWS SES, React-PDF, ExcelJS, pg-boss, pino
**Codebase:** 639 source files, 2,320-line Prisma schema (71 models, 20 enums)
**Deployment:** VPS (Docker) with Nginx reverse proxy, SSL via Let's Encrypt, PostgreSQL 16
**Live:** https://aegis.nexlyadvisory.com
**Outstanding:** AWS SES domain verification pending.

## Requirements

### Validated

**v1.0 Clickable Prototype:**

- ✓ AUTH-01, AUTH-02, AUTH-03 — v1.0 (login screen with language selector and demo auth)
- ✓ NAV-01 through NAV-04 — v1.0 (sidebar, top bar, responsive, client-side routing)
- ✓ DASH-01 through DASH-06 — v1.0 (CEO dashboard with all widgets)
- ✓ COMP-01 through COMP-06 — v1.0 (compliance registry with table, filters, dialog, trend chart)
- ✓ AUDT-01 through AUDT-06 — v1.0 (audit planning with calendar, cards, filters, detail sheet)
- ✓ FIND-01 through FIND-06 — v1.0 (finding management with table, filters, detail page, timeline)
- ✓ RPT-01 through RPT-06 — v1.0 (board report with all sections and print mode)
- ✓ RBI-01, RBI-02, RBI-03 — v1.0 (RBI circulars, common observations, realistic findings)
- ✓ I18N-01, I18N-02, I18N-03 — v1.0 (multi-language UI with cookie-based switching)
- ✓ DATA-01 through DATA-05 — v1.0 (Apex Sahakari Bank demo data)

**v2.0 Working Core MVP (59 requirements):**

- ✓ FNDN-01 through FNDN-08 — v2.0 (multi-tenant PostgreSQL, Better Auth, RBAC, audit logging)
- ✓ OBS-01 through OBS-11 — v2.0 (7-state lifecycle, maker-checker, tagging, repeat detection)
- ✓ AUD-01 through AUD-07 — v2.0 (auditee portal, responses, deadlines)
- ✓ EVID-01 through EVID-05 — v2.0 (S3 evidence upload, file validation, timeline)
- ✓ NOTF-01 through NOTF-06 — v2.0 (email notifications, reminders, escalation, digest)
- ✓ RPT-01 through RPT-05 — v2.0 (PDF board reports, 5 sections, embedded charts)
- ✓ EXP-01 through EXP-05 — v2.0 (XLSX exports with formatting)
- ✓ DASH-01 through DASH-06 — v2.0 (5 role-based dashboards with real data)
- ✓ ONBD-01 through ONBD-06 — v2.0 (onboarding wizard, Excel upload, server persistence)
- ✓ CMPL-01 through CMPL-04 — v2.0 (RBI checklists, circular links, N/A marking)

**v3.0 RBIAS Full Platform (104 requirements):**

- ✓ R1-R28 — v3.0 (RAM risk assessment, audit planning, section-based execution, cash/loan/SMA-NPA forms, BH certificate)
- ✓ R29-R48 — v3.0 (XLSX/PDF reports, risk rating, compliance lifecycle Branch→ZAC→ACE→ACB, escalation, analytics)
- ✓ R49-R68 — v3.0 (risk register, control library, work programs, issue management, QA assessment, audit KPIs)
- ✓ R69-R92 — v3.0 (audit universe, concurrent audit, regulatory hub, governance, ACB, policy library, 7 new roles)
- ✓ R93-R104 — v3.0 (investment/treasury audit, IS/EDP audit, cyber security checklists, vendor risk)
- ✓ Production hardening — v3.0 (IDOR, XSS, typed sessions, N+1 fixes, env validation, structured logging)
- ✓ CI/CD pipeline — v3.0 (GitHub Actions with lint, typecheck, build, E2E)

### Active

(Defined in REQUIREMENTS.md — v7.0 Sample-Based Account Examination)

### Out of Scope

- **TOTP/MFA** — Email/password sufficient for pilot; MFA added before Pilot B
- **CBS integration (Finacle/Flexcube)** — Requires CBS vendor cooperation; defer to post-pilot
- **DAKSH API integration** — Start with formatted export for manual upload
- **Real-time continuous monitoring** — Requires CBS data feed; batch-based for now
- **Additional languages (6+)** — Start with EN/HI/MR/GU; add based on client geography
- **Mobile offline mode** — Responsive web sufficient; PWA offline deferred
- **AD/LDAP integration** — Better Auth email auth sufficient for pilot UCBs
- **On-premise deployment** — SaaS-only; consider managed private cloud later
- **Mobile app** — Web-first responsive design; native app not planned
- **Generic configurable workflow engine** — UCB audit lifecycle standardized by RBI; hardcoded state machine
- **Real-time chat / discussion threads** — Undermines structured lifecycle; use formal responses
- **Document versioning / collaborative editing** — Point-in-time PDF; no real-time collaboration
- **Custom report builder** — RBI RBIA format standardized; pre-built templates sufficient
- **AI-powered risk scoring** — Requires large training datasets; rule-based instead

## Context

**Regulatory Driver:** RBI circular RBI/2023-24/117 mandates that UCBs implement compliance monitoring technology. The deadline has passed, creating urgency for UCBs to find a solution.

**Target Market:** Tier III and IV Urban Cooperative Banks with limited IT resources and budget. These banks cannot afford enterprise audit software (Rs 50L+/year) but need something better than spreadsheets.

**Team:** 2-3 domain experts (banking/audit background) using AI-assisted development (Claude Code) rather than dedicated developers.

**Competition:** Enterprise solutions (TeamMate, AuditBoard) are too expensive and complex. Generic tools lack banking-specific compliance content. Our moat is domain expertise.

**Reference Customer:** Apex Sahakari Bank — profile, org structure, and compliance requirements form the basis for demo data.

**Bootstrap Plan:** v1.0 prototype (2 days), v2.0 MVP (2 days), v3.0 full platform (11 days). Total: 15 days from start to full 104-requirement platform. Next: pilot deployment with real UCBs.

**Pilot Strategy:** Pilot A (sandbox with demo data, free) → Pilot B (real data, LOI + Rs 50,000 deposit) → Paid subscription (Rs 3-4 Lakh/year Starter tier).

## Constraints

- **Budget:** Self-funded AWS infrastructure; target Rs 4,000-6,000/month during MVP phase
- **Data Localization:** All data must remain in India (AWS Mumbai region ap-south-1)
- **Tech Stack:** Next.js 16, TypeScript, shadcn/ui, Tailwind CSS v4, PostgreSQL, Better Auth, Prisma — decision locked
- **Team Capacity:** 2-3 people part-time; AI-assisted development must offset lack of dedicated devs
- **Security Baseline:** Minimum security controls must be in place before any UCB loads real data (rate limiting, account lockout, session limits — implemented in v2.0)

## Key Decisions

| Decision                               | Rationale                                                                               | Outcome                                      |
| -------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------- |
| **SaaS multi-tenant architecture**     | Single codebase serves all clients; zero client-side IT dependency                      | ✓ Good                                       |
| **Clickable prototype first**          | Sell first, build incrementally; demo with dummy data builds confidence                 | ✓ Good                                       |
| **English + 3 Indian languages**       | UCBs operate in regional languages; staff more comfortable in HI/MR/GU                  | ✓ Good                                       |
| **AWS Mumbai region**                  | RBI data localization requirements; latency for Indian users                            | ✓ Good                                       |
| **AI-assisted development**            | Lean budget cannot support dedicated dev team; domain expertise is differentiator       | ✓ Good                                       |
| **Tailwind CSS v4**                    | Native CSS variables for theming, modern approach                                       | ✓ Good (required @theme inline workarounds)  |
| **Cookie-based i18n**                  | Simpler than URL prefixes; no middleware needed                                         | ✓ Good                                       |
| **Server components by default**       | Better performance, smaller bundles; client only when interactivity needed              | ✓ Good                                       |
| **PostgreSQL RLS for multi-tenancy**   | Tenant isolation enforced at database level; even app bugs can't leak data              | ✓ Good                                       |
| **Better Auth (not NextAuth.js)**      | Better Next.js 16 support, plugin ecosystem, session management                         | ✓ Good (D24: accountLockout plugin hook gap) |
| **React-PDF for board reports**        | Pure React, no headless browser; works client-side and server-side                      | ✓ Good                                       |
| **AWS SES for email**                  | Mumbai region; reliable for banking clients; Rs 70/1000 emails                          | ⚠️ Revisit (DNS verification pending)        |
| **Guided wizard for onboarding**       | Better UX for small UCBs than CSV import; pre-built RBI checklists show domain depth    | ✓ Good                                       |
| **Bottom-up observation architecture** | Individual observations are atoms; all macro views derived by aggregation               | ✓ Good                                       |
| **Severity-based review authority**    | Low/Medium: Audit Manager closes. High/Critical: CAE closes                             | ✓ Good                                       |
| **Repeat finding auto-escalation**     | New observation tagged as repeat with reference; severity auto-escalated                | ✓ Good                                       |
| **DAL pattern (D21)**                  | server-only → getRequiredSession → prismaForTenant → WHERE tenantId → runtime assertion | ✓ Good                                       |
| **Account lockout by email (D22)**     | Track by email not userId to prevent user enumeration                                   | ✓ Good                                       |
| **System-level security table (D23)**  | FailedLoginAttempt has no tenantId — cross-tenant by design                             | ✓ Good                                       |
| **SetNull FK deletion (D25)**          | Prevents deletion cascades; preserves observation history                               | ✓ Good                                       |
| **No backfill (D26)**                  | Existing observations keep NULL engagementId/repeatOfId — tracking starts from Phase 12 | ✓ Good                                       |
| **Daily snapshots at 01:00 IST (D27)** | Off-peak hours before business day; pg-boss cron                                        | ✓ Good                                       |
| **Batch processing 10 tenants (D28)**  | Prevents connection pool exhaustion; scalable to hundreds                               | ✓ Good                                       |
| **Server-wins merge (D30)**            | Onboarding state — server wins if server updatedAt > local lastSavedAt                  | ✓ Good                                       |
| **Fire-and-forget sync (D31)**         | Onboarding saves non-blocking; errors logged but don't interrupt UX                     | ✓ Good                                       |
| **IDOR: tenantId in every WHERE**      | Belt-and-suspenders on every Prisma UPDATE/DELETE mutation                              | ✓ Good                                       |
| **Defense-in-depth URL validation**    | Server Zod + client Zod + render guard for documentUrl XSS prevention                   | ✓ Good                                       |
| **AuthSession boundary cast**          | Single cast in getRequiredSession(); all downstream gets typed tenantId + roles         | ✓ Good                                       |
| **groupBy over findMany + JS**         | Analytics/dashboard use Prisma groupBy instead of loading full tables into memory       | ✓ Good                                       |
| **take: N safety limits**              | All findMany on large/growing tables have safety limits to prevent unbounded memory     | ✓ Good                                       |
| **VPS + Docker deployment**            | Simpler than AWS Lightsail for single-tenant pilot; Nginx Proxy Manager for SSL         | ✓ Good                                       |
| **Application-level tenant isolation** | WHERE clauses via prismaForTenant instead of PostgreSQL RLS policies                    | ✓ Good (simpler debugging, explicit control) |

| **Hierarchical ExaminationNode tree** | Variable depth (0-5) with materialized paths replaces flat 2-level ExaminationArea/Item | — Pending |
| **4-point scoring with weighted roll-up** | FULLY/LARGELY/PARTIALLY/NON_COMPLIANT maps to 1.0/0.75/0.5/0.0; weighted per module | — Pending |
| **Dual findings (ActionPoint + Observation)** | ActionPoints for operational issues (simple lifecycle), Observations for formal 5C findings | — Pending |
| **8-state engagement lifecycle** | PLANNED→TEAM_ASSIGNED→OPENING_MEETING→IN_PROGRESS→EXIT_MEETING→REPORT_DRAFT→COMPLETED | — Pending |
| **BranchRbiaScore frozen snapshots** | Immutable JSONB scoring record per engagement for historical audit trail | — Pending |

---

| **Sample-based account examination** | Static checklists don't reflect actual loan portfolio quality; sampling provides evidence-based compliance scoring | ✓ Good |
| **Manual loan data upload (CSV/Excel)** | CBS integration deferred; manual upload gives immediate value without vendor cooperation | ✓ Good |
| **HIA-controlled sampling criteria** | Audit quality requires consistent sampling methodology controlled by HIA, not individual auditors | ✓ Good |
| **Instance-based compliance scoring** | Violation % across sampled accounts is more objective than subjective checklist scoring | ✓ Good |

---

_Last updated: 2026-03-01 after v7.0 milestone complete_
