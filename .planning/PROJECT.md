# AEGIS - UCB Internal Audit & Compliance Platform

## What This Is

A multi-tenant SaaS platform for Urban Cooperative Banks (UCBs) to manage internal audits and track compliance with RBI regulations. Auditors conduct branch/unit/process audits and record observations that flow through a structured 7-state lifecycle (Draft → Submitted → Reviewed → Issued → Response → Compliance → Closed). These observations aggregate automatically into macro-level views — compliance status for the CCO, risk picture for the CEO, and board reports for the Audit Committee.

v1.0 shipped as a clickable prototype with demo data. v2.0 replaced hardcoded data with a real PostgreSQL backend, Better Auth authentication, multi-tenancy with RLS, and the full observation-to-board-report workflow.

## Core Value

**Individual audit observations flow upward through a structured lifecycle to form the complete risk and compliance picture — from a single branch finding to the board report.**

If nothing else works, the platform must let auditors record observations, track them to closure, and let management see the consolidated picture without manual aggregation.

## Current State

**Shipped:** v2.0 Working Core MVP (2026-02-10)
**Status:** All 59 v2.0 requirements satisfied. Ready for pilot deployment.
**Tech Stack:** Next.js 16 (App Router), TypeScript, shadcn/ui, Tailwind CSS v4, PostgreSQL (RLS), Better Auth, Prisma, AWS S3, AWS SES, React-PDF, ExcelJS, pg-boss
**Codebase:** 96,315 TypeScript LOC across 454 files
**Deployment:** AWS Lightsail Mumbai (ap-south-1)
**Outstanding:** AWS SES domain verification (DNS CNAME records pending)

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

### Active

(None — next milestone requirements TBD via `/gsd:new-milestone`)

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

**Bootstrap Plan:** 16-week execution plan. Phase 0 (prototype) complete. Phase 1 (Working Core MVP) complete. Next: pilot deployment with real UCBs.

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

---

_Last updated: 2026-02-10 after v2.0 milestone completion_
