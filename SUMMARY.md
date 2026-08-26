# AEGIS — Project Summary

## What is AEGIS?

AEGIS (Audit, Enterprise Governance & Internal Systems) is a **Risk-Based Internal Audit System (RBIAS)** built as a multi-tenant SaaS platform for Urban Cooperative Banks (UCBs) in India. It covers the complete internal audit lifecycle under RBI supervision — from risk assessment and audit planning through execution, reporting, compliance tracking, and board governance.

## Live Instance

- **URL:** https://aegis.nexlyadvisory.com
- **Hosting:** Coolify (self-hosted PaaS) · managed PostgreSQL 16 · Traefik + Let's Encrypt TLS
- **Demo tenants:** Apex Sahakari Bank (5 users, 12 branches, 35 observations) + a second isolation-test tenant, reseeded fresh 2026-08-26

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
| Email        | AWS SES (optional; disabled when unconfigured)|
| Reports      | ExcelJS (XLSX) + @react-pdf/renderer (PDF)    |
| Jobs         | pg-boss                                       |
| Testing      | Playwright (E2E) + Vitest (unit)              |
| Deployment   | Coolify (Dockerfile build) + Traefik          |
| IaC          | AWS CDK (in `infra/`)                         |
| CI/CD        | GitHub Actions                                |

## Scale

| Metric                | Count            |
| --------------------- | ---------------- |
| Source files (src/)   | 536              |
| Prisma schema         | 2,320 lines      |
| Database models       | 71               |
| Database enums        | 20               |
| Page routes           | 54               |
| Component files       | 214              |
| Server actions        | 82               |
| Data access files     | 39               |
| Library/utility files | 36               |
| Job files             | 7                |
| Email templates       | 11               |
| RBAC roles            | 17               |
| Permissions           | 60+              |
| Git commits           | 473              |
| v5.0 Requirements     | 104/104 ✅       |
| v6.0 Requirements     | 41 (in progress) |

## Milestones

### v5.0 — Complete ✅

- **Phase 1:** Core Audit Domain (28/28)
- **Phase 2:** Reporting & Compliance (20/20)
- **Phase 3:** GRC & Issue Management (20/20)
- **Phase 4:** UCB Regulatory & Governance (24/24)
- **Phase 6:** Specialized Regulatory (12/12)
- 18 modules delivered, all gaps closed, production deployed

### v6.0 — RBIA Implementation (In Progress)

- 41 new requirements across 6 phases
- Hierarchical examination trees, 4-point scoring, 8-state engagement lifecycle
- Dual findings system (ActionPoints + Observations)
- Branch RBIA scoring with immutable snapshots
- Phase 18 (Foundation) planned and ready for execution
