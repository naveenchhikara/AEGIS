# CLAUDE.md

## Project Overview

AEGIS is a multi-tenant SaaS platform for Urban Cooperative Banks (UCBs) in India to manage internal audits and track compliance with RBI regulations. Built for the Indian banking sector with multi-language support (English, Hindi, Marathi, Gujarati).

**Current Phase:** Clickable prototype with demo data for Apex Sahakari Bank. No backend/auth yet — all data from JSON files.

**Current State:** Phases 1-3 complete (project setup, core screens, finding management & reports). Phase 4 (i18n, responsive polish, AWS deploy) is next.

## Tech Stack

- **Framework:** Next.js 16 with App Router + Turbopack
- **UI:** shadcn/ui + Radix UI + Tailwind CSS v4
- **Language:** TypeScript
- **Data:** JSON files in `src/data/` (demo data for prototype)
- **Package Manager:** pnpm

## Quick Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server (http://localhost:3000)
pnpm build            # Production build
pnpm start            # Start production server
pnpm lint             # Run ESLint
```

## Architecture

```
.planning/                  # GSD workflow docs (PROJECT, ROADMAP, STATE, REQUIREMENTS)
Project Doc/                # Business docs, blueprints, RBI circulars reference
src/
├── data/
│   ├── demo/              # Demo data JSON files (Apex Sahakari Bank)
│   ├── rbi-regulations/   # RBI regulation knowledge base (JSON + TS modules)
│   └── index.ts           # Barrel export for all demo data
├── app/
│   ├── (auth)/login/      # Login page
│   └── (dashboard)/       # All sidebar pages (dashboard, compliance, audit-plans, findings, reports, settings, auditee)
├── components/
│   ├── ui/                # shadcn/ui primitives
│   ├── layout/            # AppSidebar, TopBar
│   ├── dashboard/         # Dashboard widget components
│   ├── compliance/        # Compliance table, filters, dialog, trend chart
│   ├── audit/             # Audit calendar, engagement cards, detail sheet
│   ├── findings/          # Findings table, filters, detail, timeline
│   └── reports/           # Board report sections (executive summary, scorecard, etc.)
├── lib/                   # Utilities (utils.ts, constants.ts, icons.ts, report-utils.ts, nav-items.ts)
├── hooks/                 # Custom hooks (use-mobile.tsx)
└── types/                 # TypeScript type definitions (index.ts)
```

## Key Demo Data Files

| File                                         | Purpose                                       |
| -------------------------------------------- | --------------------------------------------- |
| `src/data/demo/bank-profile.json`            | Apex Sahakari Bank details                    |
| `src/data/demo/staff.json`                   | Bank staff/auditors                           |
| `src/data/demo/branches.json`                | Branch network                                |
| `src/data/demo/compliance-requirements.json` | 55 RBI requirements with status               |
| `src/data/demo/audit-plans.json`             | Annual audit plan                             |
| `src/data/demo/findings.json`                | 35 audit findings with RBI-style observations |
| `src/data/demo/rbi-circulars.json`           | RBI circular references                       |

## Domain Context

- **Target:** Urban Cooperative Banks (UCBs) in India — Tier III/IV banks with limited IT
- **Regulator:** Reserve Bank of India (RBI)
- **Key Requirements:**
  - Data must remain in India (AWS Mumbai region ap-south-1)
  - Multi-language UI (English, Hindi, Marathi, Gujarati)
  - DAKSH score visualization (RBI supervisory score)
  - PCA status (Prompt Corrective Action)

## Deployment

- Target: AWS Mumbai (ap-south-1) for RBI data localization
- Current: Prototype/demo phase — no production deployment yet

## Code Style

- Prettier configured (`.prettierrc`) with Tailwind plugin
- shadcn/ui "new-york" style variant (see `components.json`)
- Path alias: `@/*` maps to `./src/*`
- Tailwind CSS v4 with native CSS variables

## Planning & Workflow

- GSD (Get Stuff Done) workflow — see `.planning/STATE.md` for current progress
- Roadmap in `.planning/ROADMAP.md` (4 phases)
- Requirements in `.planning/REQUIREMENTS.md` (49 v1 requirements)

## Gotchas

- Demo data is hardcoded — no real authentication or database
- Radix UI causes hydration warnings in Next.js — use `suppressHydrationWarning` on `<html>` tag
- Dev server uses Turbopack (`pnpm dev` runs `next dev --turbopack`)
- Turbopack cache corruption: if pages show stale content, delete `.next/` and restart dev server
- Recharts center overlays (e.g., "2/8 Audits" text on donut charts) need `pointer-events-none` or they block chart tooltips
- `formatDate()` in `src/lib/utils.ts` formats dates in Indian locale (en-IN) — use it instead of raw ISO strings
- Demo data counts: 55 compliance requirements, 35 findings, 8 audit plans — JSON imports need `as unknown as Type` casting
- Icons: always import from `@/lib/icons` (barrel export), not directly from `lucide-react`
