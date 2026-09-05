# AEGIS

**Audit, Enterprise Governance & Internal Systems**

Multi-tenant audit and compliance platform for Urban Cooperative Banks (UCBs) in India. Implements Risk-Based Internal Audit (RBIA) per RBI guidelines with sample-based examination, dual findings, escalation workflows, and board governance.

**Status:** not deployed. AEGIS runs locally only — there is no hosted instance,
no staging, and no production database. `aegis.nexlyadvisory.com` resolves to a
host running an unrelated application; it does not serve AEGIS.

## Recent Progress (September 2026)

- **Deployment retired.** The Coolify application was taken down deliberately on
  2026-09-04 and its deploy assets deleted
  ([#105](https://github.com/nc-sapiex/AEGIS/pull/105)). Nothing releases on
  merge; CI on the pull request is the only gate. See [Deployment](#deployment).
- **Audit trail extended to the regulated scoring tables**
  ([#121](https://github.com/nc-sapiex/AEGIS/pull/121),
  [#122](https://github.com/nc-sapiex/AEGIS/pull/122)). The eight RBIA/GRC
  tables an examiner would ask for a change history on — RAM assessments and
  scores, examination responses, action points, branch RBIA scores, loan samples
  and their examination responses — now carry the audit trigger, bringing
  coverage to 24 tables. Every write path to them sets the audit session context,
  and a shrink-only coverage test fails the build if a regulated table ever
  leaves the list. A related fix stopped duplicate audit rows being written
  outside the transaction ([#119](https://github.com/nc-sapiex/AEGIS/pull/119)).
- **Onboarding works end to end**
  ([#116](https://github.com/nc-sapiex/AEGIS/pull/116),
  [#117](https://github.com/nc-sapiex/AEGIS/pull/117)). The wizard is reachable,
  a tenant admin can invite users from the UI, and an invitee can accept and sign
  in — covered by an integration test that drives the whole flow
  ([#125](https://github.com/nc-sapiex/AEGIS/pull/125)). `Account` rows are
  unique on `(accountId, providerId)` at the database level
  ([#120](https://github.com/nc-sapiex/AEGIS/pull/120)), and every script that
  creates a credential account shares a single hashing helper
  ([#124](https://github.com/nc-sapiex/AEGIS/pull/124)).
- **Security remediation**, tracked as a shared map on the issue tracker
  ([#45](https://github.com/nc-sapiex/AEGIS/issues/45)). Merged: the identity and
  authorization findings F01–F06 ([#90](https://github.com/nc-sapiex/AEGIS/pull/90)),
  authorization on the onboarding actions
  ([#103](https://github.com/nc-sapiex/AEGIS/pull/103)), a tenant-scoped
  `ExaminationNode` lookup ([#104](https://github.com/nc-sapiex/AEGIS/pull/104)),
  the earlier fix for a cross-tenant IDOR in `/api/download`
  ([#57](https://github.com/nc-sapiex/AEGIS/pull/57)) — now pinned by a
  route-level regression test proving a presigned URL is only ever minted for the
  session tenant's key ([#127](https://github.com/nc-sapiex/AEGIS/pull/127)) —
  and a dependency sweep clearing every high/critical production advisory
  ([#59](https://github.com/nc-sapiex/AEGIS/pull/59)). The `security-audit` CI
  job fails on any such advisory instead of merely warning. Open items remain on
  #45.
- **Integrity and operations hardening (F07–F15)**
  ([#87](https://github.com/nc-sapiex/AEGIS/pull/87)): atomic notification
  claiming, server-issued upload intents, an ordered and verifiable database
  bootstrap (`pnpm db:bootstrap` / `db:verify`), and a not-applicable path for
  RBIA examination leaves.
- **The test suite grew a second tier.** `pnpm test:integration` runs Vitest
  against a live PostgreSQL (`src/**/__integration__/`); a source-grep test that
  pinned implementation details was replaced by behavioural coverage
  ([#114](https://github.com/nc-sapiex/AEGIS/pull/114)) and the F06
  save-response suite was migrated onto the shared harness
  ([#118](https://github.com/nc-sapiex/AEGIS/pull/118)). The deterministic
  `e2e-smoke` subset gates merges; the full `e2e` suite stays advisory because it
  is slow and has known flaky scenarios. Quarantine a flake with `test.skip` and
  a reason — do not put `continue-on-error` back on `e2e-smoke`.
- **A claims-vs-implementation audit**
  ([docs/claims-vs-implementation.md](docs/claims-vs-implementation.md)) records
  where marketing/spec claims diverged from the code as of August 2026. It is
  kept as a dated record, with addenda where the code has since moved.

## Documentation

Start with **[`docs/architecture.md`](docs/architecture.md)**;
[`docs/`](docs/README.md) indexes the rest.

## Tech Stack

| Layer     | Technology                                                                                                     |
| --------- | -------------------------------------------------------------------------------------------------------------- |
| Framework | Next.js 16, TypeScript 5.9, React 19                                                                           |
| Database  | PostgreSQL 16, Prisma 7 (76 models, 22 enums)                                                                  |
| Auth      | Better Auth (17 roles, 78 permissions, maker-checker RBAC)                                                     |
| UI        | shadcn/ui + Radix UI, Tailwind CSS 4, Recharts                                                                 |
| Cloud     | AWS S3 (evidence storage), AWS SES (email)                                                                     |
| Jobs      | pg-boss (notifications, reminders)                                                                             |
| i18n      | next-intl (English, Hindi, Marathi, Gujarati)                                                                  |
| Export    | ExcelJS (XLSX), @react-pdf/renderer (PDF)                                                                      |
| Testing   | Vitest (unit, static discipline suites, integration against live PostgreSQL), Playwright E2E (5 role projects) |
| Deploy    | None — local development only (`Dockerfile` is built in CI, not released)                                      |

## Features

### Core Audit (v5.0)

- **RAM Engine** — 19 configurable risk parameters with weighted scoring and frequency rules (12/18/24 months)
- **Annual Audit Plans** — Generated from RAM scores with engagement creation
- **Audit Execution** — 25 examination areas, 239 items across 39 functional areas
- **Evidence Pipeline** — S3 presigned uploads with per-observation attachments
- **Cash Verification** — Denomination tracking with retention limits
- **Loan Review** — Manual entry + CSV bulk import, SMA/NPA tracking

### Findings & Compliance (v5.0)

- **Observation Lifecycle** — DRAFT > SUBMITTED > REVIEWED > ISSUED > RESPONSE > COMPLIANCE > CLOSED
- **5C Framework** — Condition, Criteria, Cause, Effect, Recommendation
- **Repeat Detection** — pg_trgm similarity matching with 1.5x risk uplift
- **Escalation Engine** — L1 (+15d), L2 (+30d), L3 (+90d), L4 (+180d)
- **Compliance Routing** — Branch Response > ZAC Review > ACE > ACB (30-day SLA)

### RBIA (v6.0)

- **Hierarchical Examination Trees** — Variable depth (0-5) with materialized paths
- **4-Point Scoring** — Fully/Largely/Partially/Non-Compliant with weighted roll-up
- **8-State Engagement Lifecycle** — Planned through Completed
- **Dual Findings** — ActionPoints (15-40/audit) + Observations (formal 5C, 3-10/audit)
- **Branch Scoring** — Frozen immutable snapshots with DB-level trigger protection

### Sample-Based Examination (v7.0)

- **Configurable Sampling** — 20% rate with 4 criteria buckets (lockable config)
- **Instance-Based Scoring** — Weighted roll-up per examination node
- **Full Lifecycle** — RAM > Engagement > Execution > Score Freeze > Observations > Compliance > Board Report > GRC

### GRC & Governance

- **Risk Register** — Inherent/residual scoring, KRI tracking with thresholds
- **Control Library** — Test procedures, effectiveness analytics
- **Board Workspace** — ACB dashboards, agenda builder, RBI pack export
- **Policy Versioning** — Committee member management, governance workflows
- **IS/EDP Audit** — Application inventory, 6 checklists, 122 cyber security questionnaires

### Dashboards

- 7 analytics tabs: Branch Risk (heatmap), Audit Plans, Compliance (aging), Findings (trend), NPA (waterfall), Controls (effectiveness), Risk MIS
- Role-scoped views: Auditor, Auditee, CAE, CEO

## Quick Start

### Prerequisites

Node.js 22+, pnpm, PostgreSQL 16, Docker (optional)

### Development

```bash
pnpm install
pnpm db:generate          # Generate Prisma client
pnpm db:push              # Push schema to DB
pnpm db:bootstrap         # Audit triggers, views, functions, composite FKs
pnpm db:verify            # Assert they all landed
pnpm db:seed              # Seed reference data
pnpm dev                  # Next.js with Turbopack on :3000
```

### Docker

Local PostgreSQL only; the app runs from `pnpm dev`:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://aegis:PASSWORD@localhost:5433/aegis?sslmode=require

# Auth
BETTER_AUTH_SECRET=          # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000

# AWS (evidence storage + email)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=aegis-evidence-dev
SES_FROM_EMAIL=noreply@aegis.in

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

See `.env.example` for the full list.

## Testing

```bash
pnpm test:unit             # Vitest unit tests (no database)
pnpm test:integration      # Vitest against a live PostgreSQL — resets the DATABASE_URL database
pnpm test:coverage         # With coverage report
pnpm test:e2e:smoke        # Deterministic Playwright subset; the one that gates merges
pnpm test:e2e              # Full Playwright E2E (5 role projects); advisory in CI
pnpm test:e2e:ui           # Playwright UI mode
```

Unit tests live beside the code in `src/**/__tests__/`; integration tests in
`src/**/__integration__/`, with their harness in `tests/integration/`. The
integration global setup runs `prisma db push --force-reset` against whatever
`DATABASE_URL` points at, so never aim it at a database you want to keep.

E2E tests authenticate as 5 roles: Auditor, Manager, CAE, CCO, Auditee.

## Deployment

**There is no deployment target.** The Coolify application that previously served
AEGIS was taken down on 2026-09-04, and nothing has replaced it. Merging to `main`
is ordinary integration, not a release.

CI (lint, typecheck, unit tests, integration, build, dependency audit, E2E, and a
`docker-build` job that still builds the production image) runs on every pull
request. Because `main` has no branch protection, that CI run is the only gate
there is.

SQL is never applied automatically — not by a build, not by starting the app. On
any database, local included, the release's schema file and then `pnpm db:bootstrap`
are applied by hand, in that order. See
[`docs/ops/release-checklist.md`](docs/ops/release-checklist.md).

A record of the retired Coolify layout is kept in
[`CLAUDE.md`](CLAUDE.md#deployment) for restoration only. Do not treat it as live.

## Project Structure

```
├── src/
│   ├── actions/        Server actions by domain (105 files)
│   ├── app/            Next.js App Router (auth, dashboard, onboarding, API)
│   ├── components/     UI components (252 files, 32 domain folders)
│   ├── data-access/    Tenant-aware DAL (53 files)
│   ├── data/           RBI reference data & seed assets
│   ├── emails/         React Email templates
│   ├── jobs/           pg-boss background workers
│   └── lib/            Utilities (auth, permissions, scoring engines, S3, export)
├── prisma/             Schema (76 models), migrations, seed scripts
├── scripts/            Database bootstrap/verify, seeds, doc generation
├── tests/              E2E specs, integration harness, auth setup, 226-case test plan
└── messages/           i18n translations (en, hi, mr, gu)
```

## Scale

- 644 source files (excl. generated), 2,545-line Prisma schema
- 78 RBAC permissions across 17 roles, 18 functional modules
- Exact model, page, endpoint and server-action inventories live in the
  generated [reference docs](docs/reference/) (`pnpm docs:reference`)

## License

Private — Nexly Advisory. All rights reserved.
