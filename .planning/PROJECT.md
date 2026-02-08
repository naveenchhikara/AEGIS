# AEGIS - UCB Internal Audit & Compliance Platform

## What This Is

A multi-tenant SaaS platform for Urban Cooperative Banks (UCBs) to manage internal audits and track compliance with RBI regulations. Banks can plan audits, track compliance requirements, manage findings from audit to closure, view executive dashboards, and generate board reports — all in a web application with multi-language support (English, Hindi, Marathi, Gujarati).

v1.0 shipped as a **clickable prototype** — a fully navigable demo with realistic Apex Sahakari Bank data deployed to AWS Mumbai for client presentations.

## Core Value

**UCB audit teams can demonstrate complete compliance coverage to RBI and their board with clear evidence, while CEOs get real-time visibility into audit status and risk exposure.**

If nothing else works, the platform must let a bank prove they are tracking all required compliance items and addressing audit findings systematically.

## Current State

**Shipped:** v1.0 Clickable Prototype (2026-02-08)
**Tech Stack:** Next.js 16 (App Router), TypeScript, shadcn/ui, Tailwind CSS v4, next-intl
**Codebase:** 22,873 LOC across 196 files
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

(None — next milestone requirements to be defined via `/gsd:new-milestone`)

### Out of Scope

- **Real authentication** — Demo uses hardcoded login, no real user database or MFA implementation
- **Backend/database** — All data stored in JSON files, no PostgreSQL or API layer
- **Email notifications** — No SES integration or email sending
- **Maker-checker workflows** — No approval flows or multi-stage reviews
- **PDF generation** — Board report is preview only, no actual PDF export
- **Audit trail** — No logging or change tracking
- **On-premise deployment** — SaaS-only architecture
- **Mobile app** — Web-first responsive design; native app not planned

## Context

**Regulatory Driver:** RBI circular RBI/2023-24/117 mandates that UCBs implement compliance monitoring technology. The deadline has passed, creating urgency for UCBs to find a solution.

**Target Market:** Tier III and IV Urban Cooperative Banks with limited IT resources and budget. These banks cannot afford enterprise audit software (Rs 50L+/year) but need something better than spreadsheets.

**Team:** 2-3 domain experts (banking/audit background) using AI-assisted development (Claude Code, Cursor, GitHub Copilot) rather than dedicated developers.

**Competition:** Enterprise solutions (TeamMate, AuditBoard) are too expensive and complex. Generic tools lack banking-specific compliance content. Our moat is domain expertise.

**Reference Customer:** Apex Sahakari Bank — profile, org structure, and compliance requirements form the basis for demo data.

## Constraints

- **Budget:** Self-funded AWS infrastructure; target Rs 3,000-4,000/month during prototype phase
- **Data Localization:** All data must remain in India (AWS Mumbai region ap-south-1)
- **Tech Stack:** Next.js 16 (App Router), TypeScript, shadcn/ui, Tailwind CSS v4 — decision locked
- **Team Capacity:** 2-3 people part-time; AI-assisted development must offset lack of dedicated devs

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

---

_Last updated: 2026-02-08 after v1.0 milestone_
