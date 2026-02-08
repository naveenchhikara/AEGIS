# AEGIS - UCB Internal Audit & Compliance Platform

## What This Is

A multi-tenant SaaS platform for Urban Cooperative Banks (UCBs) to manage internal audits and track compliance with RBI regulations. Auditors conduct branch/unit/process audits and record observations that flow through a structured lifecycle (draft → auditee discussion → final report → compliance → review → closure). These observations aggregate automatically into macro-level views — compliance status for the CCO, risk picture for the CEO, and board reports for the Audit Committee.

v1.0 shipped as a **clickable prototype** with demo data. v2.0 replaces hardcoded data with a real PostgreSQL backend, authentication, multi-tenancy, and the full observation-to-board-report workflow.

## Core Value

**Individual audit observations flow upward through a structured lifecycle to form the complete risk and compliance picture — from a single branch finding to the board report.**

If nothing else works, the platform must let auditors record observations, track them to closure, and let management see the consolidated picture without manual aggregation.

## Current Milestone: v2.0 Working Core MVP

**Goal:** Replace the clickable prototype with a real, working product — real auth, real database, real workflows — that a UCB audit team can use for an actual audit cycle.

**Target features:**

- PostgreSQL multi-tenant backend with Row-Level Security
- Email/password authentication with role-based access (Auditor → Audit Manager → CAE → CCO → CEO)
- Guided onboarding wizard (select UCB tier → applicable RBI Master Directions → auto-populated compliance registry)
- Org structure setup via Excel template upload + manual forms
- Full observation lifecycle with maker-checker (draft → auditee clarification → final → compliance → review → closure)
- Multi-dimensional observation tagging (risk category, RBI requirement, audit area, severity, branch/unit)
- Auditee self-service portal (view findings, submit clarification/compliance, upload evidence)
- Role-based dashboards (real-time aggregation from observations: CAE, CCO, CEO views)
- Board report generation via React-PDF (periodic, for ACB meetings)
- Email notifications via AWS SES (assignment, deadlines, escalation)
- Excel exports (compliance data, findings, audit data)
- Immutable audit trail (append-only log)
- Pre-built RBI compliance checklists with select-applicable + add-custom capability
- Repeat finding detection (new observation tagged as repeat, severity auto-escalated)

## Current State

**Shipped:** v1.0 Clickable Prototype (2026-02-08)
**Building:** v2.0 Working Core MVP
**Tech Stack:** Next.js 16 (App Router), TypeScript, shadcn/ui, Tailwind CSS v4, next-intl, PostgreSQL (RDS), NextAuth.js, AWS S3, AWS SES
**Codebase:** 22,873 LOC across 196 files (v1.0 baseline)
**Deployment:** AWS Lightsail Mumbai (ap-south-1)

## Requirements

### Validated

- AUTH-01, AUTH-02, AUTH-03 — v1.0 (login screen with language selector and demo auth)
- NAV-01, NAV-02, NAV-03, NAV-04 — v1.0 (sidebar, top bar, responsive, client-side routing)
- DASH-01 through DASH-06 — v1.0 (CEO dashboard with all widgets)
- COMP-01 through COMP-06 — v1.0 (compliance registry with table, filters, dialog, trend chart)
- AUDT-01 through AUDT-06 — v1.0 (audit planning with calendar, cards, filters, detail sheet)
- FIND-01 through FIND-06 — v1.0 (finding management with table, filters, detail page, timeline)
- RPT-01 through RPT-06 — v1.0 (board report with all sections and print mode)
- RBI-01, RBI-02, RBI-03 — v1.0 (RBI circulars, common observations, realistic findings)
- I18N-01, I18N-02, I18N-03 — v1.0 (multi-language UI with cookie-based switching)
- DATA-01 through DATA-05 — v1.0 (Apex Sahakari Bank demo data)

### Active

(Defined in REQUIREMENTS.md for v2.0 Working Core MVP)

### Out of Scope

- **TOTP/MFA** — Email/password first; MFA added before Pilot B
- **CBS integration (Finacle/Flexcube)** — Requires CBS vendor cooperation; defer to Phase 2+
- **DAKSH API integration** — Start with formatted export for manual upload
- **Real-time continuous monitoring** — Requires CBS data feed; batch-based for now
- **Additional languages (6+)** — Start with EN/HI/MR/GU; add based on client geography
- **Mobile offline mode** — Responsive web sufficient; PWA offline deferred
- **AD/LDAP integration** — NextAuth email auth sufficient for pilot UCBs
- **On-premise deployment** — SaaS-only; consider managed private cloud later
- **Mobile app** — Web-first responsive design; native app not planned

## Context

**Regulatory Driver:** RBI circular RBI/2023-24/117 mandates that UCBs implement compliance monitoring technology. The deadline has passed, creating urgency for UCBs to find a solution.

**Target Market:** Tier III and IV Urban Cooperative Banks with limited IT resources and budget. These banks cannot afford enterprise audit software (Rs 50L+/year) but need something better than spreadsheets.

**Team:** 2-3 domain experts (banking/audit background) using AI-assisted development (Claude Code, Cursor, GitHub Copilot) rather than dedicated developers.

**Competition:** Enterprise solutions (TeamMate, AuditBoard) are too expensive and complex. Generic tools lack banking-specific compliance content. Our moat is domain expertise.

**Reference Customer:** Apex Sahakari Bank — profile, org structure, and compliance requirements form the basis for demo data.

**Bootstrap Plan:** 16-week execution plan (Bootstrap_Execution_Plan_UCB_Platform.docx) defines the path from prototype to paying clients. Phase 0 (prototype) complete. Building Phase 1 (Working Core MVP).

**Pilot Strategy:** Pilot A (sandbox with demo data, free) → Pilot B (real data, LOI + Rs 50,000 deposit) → Paid subscription (Rs 3-4 Lakh/year Starter tier).

## Constraints

- **Budget:** Self-funded AWS infrastructure; target Rs 4,000-6,000/month during MVP phase
- **Data Localization:** All data must remain in India (AWS Mumbai region ap-south-1)
- **Tech Stack:** Next.js 16 (App Router), TypeScript, shadcn/ui, Tailwind CSS v4, PostgreSQL, NextAuth.js — decision locked
- **Team Capacity:** 2-3 people part-time; AI-assisted development must offset lack of dedicated devs
- **Security Baseline:** Minimum security controls (Section 2.4 of Bootstrap Plan) must be in place before any UCB loads real data

## Key Decisions

| Decision                               | Rationale                                                                             | Outcome                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------- |
| **SaaS multi-tenant architecture**     | Single codebase serves all clients; zero client-side IT dependency                    | Good                                      |
| **Clickable prototype first**          | Sell first, build incrementally; demo with dummy data builds confidence               | Good                                      |
| **English + 3 Indian languages**       | UCBs operate in regional languages; staff more comfortable in HI/MR/GU                | Good                                      |
| **AWS Mumbai region**                  | RBI data localization requirements; latency for Indian users                          | Good                                      |
| **AI-assisted development**            | Lean budget cannot support dedicated dev team; domain expertise is the differentiator | Good                                      |
| **Tailwind CSS v4**                    | Native CSS variables for theming, modern approach                                     | Good (required @theme inline workarounds) |
| **Cookie-based i18n (no URL routing)** | Simpler than URL prefixes; no middleware needed                                       | Good                                      |
| **Noto Sans font family**              | Multi-script support (Latin + Devanagari + Gujarati) in one font family               | Good                                      |
| **Server components by default**       | Better performance, smaller bundles; client only when interactivity needed            | Good                                      |
| **PostgreSQL RLS for multi-tenancy**   | Tenant isolation enforced at database level; even app bugs can't leak data            | — Pending                                 |
| **NextAuth.js (Auth.js)**              | Open-source, self-hosted; no vendor dependency; supports email + future MFA           | — Pending                                 |
| **React-PDF for board reports**        | Pure React, no headless browser; works client-side and server-side                    | — Pending                                 |
| **AWS SES for email**                  | Mumbai region; reliable for banking clients; Rs 70/1000 emails                        | — Pending                                 |
| **Guided wizard for onboarding**       | Better UX for small UCBs than CSV import; pre-built RBI checklists show domain depth  | — Pending                                 |
| **Bottom-up observation architecture** | Individual observations are atoms; all macro views derived by aggregation             | — Pending                                 |
| **Severity-based review authority**    | Low/Medium: Audit Manager closes. High/Critical: CAE closes.                          | — Pending                                 |
| **Repeat finding auto-escalation**     | New observation tagged as repeat with reference; severity auto-escalated              | — Pending                                 |

---

_Last updated: 2026-02-08 after v2.0 milestone initialization_
