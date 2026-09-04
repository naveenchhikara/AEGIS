# AEGIS — Project Summary

## What is AEGIS?

AEGIS (Audit, Enterprise Governance & Internal Systems) is a **Risk-Based Internal Audit System (RBIAS)** built as a multi-tenant SaaS platform for Urban Cooperative Banks (UCBs) in India. It covers the complete internal audit lifecycle under RBI supervision — from risk assessment and audit planning through execution, reporting, compliance tracking, and board governance.

## Deployment Status

**Not deployed.** AEGIS runs on local development machines only, as of 2026-09-04.
There is no hosted instance, no staging environment, and no production database.
`aegis.nexlyadvisory.com` serves an unrelated application.

Demo data is seeded locally — Apex Sahakari Bank (5 users, 12 branches,
35 observations) plus a second isolation-test tenant — via `pnpm db:seed` and the
`pnpm seed:*` scripts.

## Tech Stack

| Layer        | Technology                                     |
| ------------ | ---------------------------------------------- |
| Framework    | Next.js 16 (App Router, Turbopack)             |
| Language     | TypeScript 5.9                                 |
| UI           | shadcn/ui + Radix UI + Tailwind CSS v4         |
| Database     | PostgreSQL 16 + Prisma 7 ORM                   |
| Auth         | Better Auth (bcrypt, RBAC, session cookies)    |
| i18n         | next-intl (English, Hindi, Marathi, Gujarati)  |
| File Storage | AWS S3 (Mumbai region)                         |
| Email        | AWS SES (optional; disabled when unconfigured) |
| Reports      | ExcelJS (XLSX) + @react-pdf/renderer (PDF)     |
| Jobs         | pg-boss                                        |
| Testing      | Playwright (E2E) + Vitest (unit)               |
| Deployment   | None — local only                              |
| CI/CD        | GitHub Actions                                 |

## Scale

Counted on `main` at 2026-09-05. The generated
[reference docs](docs/reference/) are authoritative and always more current.

| Metric              | Count       |
| ------------------- | ----------- |
| Source files (src/) | 644         |
| Prisma schema       | 2,545 lines |
| Database models     | 76          |
| Database enums      | 22          |
| Page routes         | 65          |
| Component files     | 252         |
| Server actions      | 105         |
| Data access files   | 53          |
| Job files           | 10          |
| Email templates     | 12          |
| RBAC roles          | 17          |
| Permissions         | 78          |
| Git commits         | 773         |

## Milestones

### v5.0 — Complete ✅

- **Phase 1:** Core Audit Domain (28/28)
- **Phase 2:** Reporting & Compliance (20/20)
- **Phase 3:** GRC & Issue Management (20/20)
- **Phase 4:** UCB Regulatory & Governance (24/24)
- **Phase 6:** Specialized Regulatory (12/12)
- 18 modules delivered

> The "complete" figures above predate an independent verification pass and cite a
> requirement register that is not in this repository — treat them as claimed, not
> verified. See [`docs/claims-vs-implementation.md`](docs/claims-vs-implementation.md).

### v6.0 — RBIA Implementation (In Progress)

- 41 new requirements across 6 phases
- Hierarchical examination trees, 4-point scoring, 8-state engagement lifecycle
- Dual findings system (ActionPoints + Observations)
- Branch RBIA scoring with immutable snapshots
- Phase 18 (Foundation) planned and ready for execution
