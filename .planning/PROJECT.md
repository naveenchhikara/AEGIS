# AEGIS - UCB Internal Audit & Compliance Platform

## What This Is

A multi-tenant SaaS platform for Urban Cooperative Banks (UCBs) to manage internal audits and track compliance with RBI regulations. Banks can plan audits, track compliance requirements, manage findings from audit to closure, view executive dashboards, and generate board reports — all in a web application with multi-language support (English, Hindi, Marathi, Gujarati).

The initial milestone is a **clickable prototype** — a fully navigable demo with realistic Sahyadri UCB data that can be shown to prospective clients to validate the product and secure pilot commitments.

## Core Value

**UCB audit teams can demonstrate complete compliance coverage to RBI and their board with clear evidence, while CEOs get real-time visibility into audit status and risk exposure.**

If nothing else works, the platform must let a bank prove they are tracking all required compliance items and addressing audit findings systematically.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] **Clickable Prototype** — Fully navigable demo with 7 screens using Sahyadri UCB dummy data, deployed to AWS Mumbai
- [ ] **Login Screen** — Demo login with MFA prompt UI, language selector (EN/HI/MR/GU), logo placeholder
- [ ] **CEO Dashboard** — Compliance health score, donut charts, finding counts, DAKSH indicator, PCA status, regulatory calendar
- [ ] **Compliance Registry** — Filterable/sortable table of 50 RBI requirements with status badges and evidence counts
- [ ] **Audit Plan View** — Annual plan table, engagement cards, status indicators, team assignments
- [ ] **Finding Detail** — Full finding view with observation, root cause, auditee response, action plan, evidence list, timeline
- [ ] **Board Report Preview** — Executive summary, audit coverage, findings, compliance scorecard
- [ ] **DAKSH Submission Screen** — Formatted data display with status indicators for RBI submission
- [ ] **Multi-language UI** — Language toggle with translated labels for EN/HI/MR/GU
- [ ] **Responsive Design** — Mobile-friendly layouts for all screens

### Out of Scope

- **Real authentication** — Demo uses hardcoded login, no real user database or MFA implementation
- **Backend/database** — All data stored in JSON files, no PostgreSQL or API layer
- **Email notifications** — No SES integration or email sending
- **Maker-checker workflows** — No approval flows or multi-stage reviews
- **PDF generation** — Board report is preview only, no actual PDF export
- **Audit trail** — No logging or change tracking

## Context

**Regulatory Driver:** RBI circular RBI/2023-24/117 mandates that UCBs implement compliance monitoring technology. The deadline has passed, creating urgency for UCBs to find a solution.

**Target Market:** Tier III and IV Urban Cooperative Banks with limited IT resources and budget. These banks cannot afford enterprise audit software (Rs 50L+/year) but need something better than spreadsheets.

**Team:** 2-3 domain experts (banking/audit background) using AI-assisted development (Claude Code, Cursor, GitHub Copilot) rather than dedicated developers.

**Competition:** Enterprise solutions (TeamMate, AuditBoard) are too expensive and complex. Generic tools lack banking-specific compliance content. Our moat is domain expertise.

**Reference Customer:** Sahyadri UCB — profile, org structure, and compliance requirements form the basis for demo data.

## Constraints

- **Timeline:** Clickable prototype must be complete by Feb 27, 2026 (3 weeks) to schedule client demos
- **Budget:** Self-funded AWS infrastructure; target Rs 3,000-4,000/month during prototype phase
- **Data Localization:** All data must remain in India (AWS Mumbai region ap-south-1)
- **Tech Stack:** Next.js 14 (App Router), TypeScript, shadcn/ui, Tailwind CSS — decision already made
- **Team Capacity:** 2-3 people part-time; AI-assisted development must offset lack of dedicated devs
- **Demo Readiness:** Must be presentable to both UCB leadership (CEO/MD level) and audit teams (CAE level)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| **SaaS multi-tenant architecture** | Single codebase serves all clients; zero client-side IT dependency; rapid iteration | — Pending |
| **Clickable prototype first** | Sell first, build incrementally; demo with dummy data builds confidence before real data pilot | — Pending |
| **English + 3 Indian languages** | UCBs operate in regional languages; staff more comfortable in Hindi/Marathi/Gujarati | — Pending |
| **AWS Mumbai region** | RBI data localization requirements; latency for Indian users | — Pending |
| **AI-assisted development** | Lean budget cannot support dedicated dev team; domain expertise is the differentiator, not coding | — Pending |

---
*Last updated: Feb 7, 2026 after initialization*
