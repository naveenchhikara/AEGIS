# CLAUDE.md

## Project Overview

AEGIS is a multi-tenant SaaS platform for Urban Cooperative Banks (UCBs) in India to manage internal audits and track compliance with RBI regulations. Built for the Indian banking sector with multi-language support (English, Hindi, Marathi, Gujarati).

**Current Phase:** Clickable prototype with demo data for Sahyadri UCB. No backend/auth yet — all data from JSON files.

## Tech Stack

- **Framework:** Next.js 16 with App Router (`src/app/`)
- **UI:** shadcn/ui + Radix UI + Tailwind CSS (`src/components/ui/`, `src/components/layout/`)
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
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth routes (login)
│   └── (dashboard)/       # Protected routes (dashboard, etc.)
├── components/
│   ├── ui/                # shadcn/ui base components
│   ├── layout/            # Layout components (Header, Sidebar, etc.)
│   └── auth/              # Auth-specific components
├── data/
│   ├── demo/              # Demo data JSON files (Sahyadri UCB)
│   └── rbi-regulations/   # RBI regulation knowledge base
├── lib/                   # Utilities, helpers
├── hooks/                 # React hooks
└── types/                 # TypeScript types
```

## Key Demo Data Files

| File | Purpose |
|------|---------|
| `src/data/demo/bank-profile.json` | Sahyadri UCB bank details |
| `src/data/demo/staff.json` | Bank staff/auditors |
| `src/data/demo/branches.json` | Branch network |
| `src/data/demo/compliance-requirements.json` | 50 RBI requirements with status |
| `src/data/demo/audit-plans.json` | Annual audit plan |
| `src/data/demo/findings.json` | Audit findings with observations |

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

## Gotchas

- Demo data is hardcoded — no real authentication or database
- All charts/visualizations use demo numbers
- Language toggle UI exists but translations are placeholder
