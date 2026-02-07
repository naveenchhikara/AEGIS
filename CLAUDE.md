# CLAUDE.md

## Project Overview

AEGIS is a multi-tenant SaaS platform for Urban Cooperative Banks (UCBs) in India to manage internal audits and track compliance with RBI regulations. Built for the Indian banking sector with multi-language support (English, Hindi, Marathi, Gujarati).

**Current Phase:** Clickable prototype with demo data for Sahyadri UCB. No backend/auth yet — all data from JSON files.

**Current State:** App scaffolding (components, layouts, pages) was reset in commit `e735e42`. Only the data layer and project config exist. The UI needs to be rebuilt from scratch.

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
│   ├── demo/              # Demo data JSON files (Sahyadri UCB)
│   ├── rbi-regulations/   # RBI regulation knowledge base (JSON + TS modules)
│   └── index.ts           # Barrel export for all demo data
```

> **Note:** `src/app/`, `src/components/`, `src/lib/`, `src/hooks/`, `src/types/` do not exist yet — they were removed in a scaffolding reset and need to be rebuilt.

## Key Demo Data Files

| File | Purpose |
|------|---------|
| `src/data/demo/bank-profile.json` | Sahyadri UCB bank details |
| `src/data/demo/staff.json` | Bank staff/auditors |
| `src/data/demo/branches.json` | Branch network |
| `src/data/demo/compliance-requirements.json` | 50 RBI requirements with status |
| `src/data/demo/audit-plans.json` | Annual audit plan |
| `src/data/demo/findings.json` | Audit findings with observations |
| `src/data/demo/rbi-circulars.json` | RBI circular references |

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

- App scaffolding was reset — only data layer exists, UI must be rebuilt
- Demo data is hardcoded — no real authentication or database
- Radix UI causes hydration warnings in Next.js — use `suppressHydrationWarning` on `<html>` tag
- Dev server uses Turbopack (`pnpm dev` runs `next dev --turbopack`)
