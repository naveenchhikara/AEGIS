# AEGIS

Internal Audit & Compliance Management Platform for Urban Cooperative Banks (UCBs) in India.

AEGIS helps UCB audit teams track RBI compliance requirements, plan and execute audits, manage findings from observation to closure, and generate board-ready reports — all with multi-language support (English, Hindi, Marathi, Gujarati) and multi-tenant data isolation.

> **Status:** Working Core MVP (v2.0) — full authentication, PostgreSQL database, multi-tenant RLS, RBAC, email notifications, and PDF/Excel exports. Gap closure phases (11-14) in progress.

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+ (with `pgcrypto` and `pg_trgm` extensions)

### Setup

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Seed demo data (Apex Sahakari Bank)
pnpm db:seed

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/aegis"

# Better Auth
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:3000"

# AWS (optional — for S3 uploads & SES email)
AWS_REGION="ap-south-1"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_S3_BUCKET="..."
AWS_SES_FROM_EMAIL="..."
```

## Tech Stack

| Layer           | Technology                                                   |
| --------------- | ------------------------------------------------------------ |
| Framework       | Next.js 16 (App Router + Turbopack)                          |
| UI Components   | shadcn/ui (new-york style) + Radix UI                        |
| Styling         | Tailwind CSS v4 with CSS variable theming                    |
| Language        | TypeScript (strict mode)                                     |
| Database        | PostgreSQL 15+ with Prisma 7 ORM                             |
| Auth            | Better Auth (email/password, multi-session, account lockout) |
| State           | TanStack Query (server), Zustand (client), react-hook-form   |
| Tables          | TanStack Table v8                                            |
| Charts          | Recharts 3                                                   |
| PDF Generation  | @react-pdf/renderer                                          |
| Excel Export    | ExcelJS                                                      |
| Email           | React Email + AWS SES v2                                     |
| Job Queue       | pg-boss (PostgreSQL-backed)                                  |
| i18n            | next-intl (en, hi, mr, gu)                                   |
| File Storage    | AWS S3 (presigned URLs)                                      |
| Icons           | Lucide React                                                 |
| Package Manager | pnpm                                                         |

## Project Structure

```
src/
├── app/
│   ├── (auth)/                 # Login page with language selector
│   ├── (dashboard)/            # All authenticated screens
│   │   ├── dashboard/          # CEO/CAE dashboard with widgets
│   │   ├── compliance/         # RBI compliance registry
│   │   ├── audit-plans/        # Annual audit planning (FY calendar)
│   │   ├── findings/           # Audit findings management
│   │   ├── reports/            # Board report preview & PDF generation
│   │   ├── auditee/            # Auditee portal (responses, evidence)
│   │   ├── settings/           # Bank profile, notifications, compliance
│   │   ├── admin/users/        # User management & role assignment
│   │   ├── audit-trail/        # Audit log (CAE only)
│   │   └── layout.tsx          # Sidebar + top bar layout
│   ├── (onboarding)/           # 5-step bank onboarding wizard
│   ├── accept-invite/          # Invitation acceptance flow
│   ├── api/                    # API routes (auth, dashboard, exports, reports)
│   ├── globals.css             # Tailwind v4 theme + shadcn vars
│   └── layout.tsx              # Root layout (Inter font)
├── actions/                    # Server actions (observations, auditee, compliance, etc.)
├── components/
│   ├── ui/                     # shadcn/ui primitives (30+)
│   ├── dashboard/              # Dashboard widgets & sections
│   ├── compliance/             # Compliance table, filters, charts
│   ├── audit/                  # Calendar, engagement cards, detail sheet
│   ├── findings/               # Findings table, detail panel, timeline
│   ├── auditee/                # Evidence uploader, response form
│   ├── layout/                 # AppSidebar, TopBar
│   ├── auth/                   # Login/signup forms, session warning
│   ├── admin/                  # User list, role assignment
│   ├── reports/                # Board report sections
│   ├── pdf-report/             # React-PDF report components
│   └── audit-trail/            # Audit log table & filters
├── data/
│   ├── demo/                   # Demo JSON (Apex Sahakari Bank + i18n variants)
│   ├── rbi-regulations/        # RBI regulatory knowledge base
│   └── index.ts                # Barrel export
├── data-access/                # Server-only DAL with 5-step security pattern
├── emails/                     # React Email templates
├── hooks/                      # useFormAutoSave, useIsMobile
├── i18n/                       # next-intl locale resolution
├── jobs/                       # Background job handlers (pg-boss)
├── lib/                        # Auth, permissions, prisma, utils, AWS clients
├── providers/                  # TanStack Query provider
├── stores/                     # Zustand stores (onboarding wizard)
└── types/                      # Domain type definitions
prisma/
├── schema.prisma               # Multi-tenant PostgreSQL schema (30+ models)
├── migrations/                 # Prisma migrations
├── seed.ts                     # Database seeding
└── seed-master-directions.ts   # RBI master direction seeding
```

## Screens

| Screen              | Route          | Description                                                  |
| ------------------- | -------------- | ------------------------------------------------------------ |
| Login               | `/login`       | Email/password authentication with language selector         |
| Dashboard           | `/dashboard`   | Health score, audit coverage, findings, risk panel, calendar |
| Compliance Registry | `/compliance`  | Sortable/filterable RBI requirements table with trend chart  |
| Audit Planning      | `/audit-plans` | FY calendar, engagement cards, progress tracking             |
| Findings            | `/findings`    | Full observation lifecycle with timeline & status machine    |
| Board Reports       | `/reports`     | Executive summary, scorecard, PDF generation                 |
| Auditee Portal      | `/auditee`     | Observation responses, evidence upload, deadline tracking    |
| Settings            | `/settings`    | Bank profile, notification preferences, custom compliance    |
| User Management     | `/admin/users` | RBAC role assignment, invitations                            |
| Audit Trail         | `/audit-trail` | Immutable audit log (10-year PMLA retention)                 |
| Onboarding          | `/onboarding`  | 5-step wizard (registration, tier, RBI, org, invites)        |

## Architecture

### Multi-Tenancy

All data is tenant-isolated using a defense-in-depth approach:

1. **PostgreSQL RLS** — Row-Level Security policies enforce tenant isolation at the database level
2. **Prisma middleware** — `prismaForTenant(tenantId)` wraps every query in a `SET LOCAL app.current_tenant_id` transaction
3. **Explicit WHERE** — Every query includes a `WHERE tenantId` clause (belt-and-suspenders)
4. **Session-only tenantId** — Tenant ID is extracted exclusively from authenticated sessions, never from URLs or request bodies
5. **Runtime assertions** — Query results are verified against expected tenantId

See [`src/data-access/README.md`](src/data-access/README.md) for the full 5-step DAL security pattern.

### Authentication & Authorization

- **Better Auth** — Email/password with multi-session support (max 2 concurrent)
- **Rate limiting** — 10 login attempts per 15 minutes per IP
- **Account lockout** — 5 failed attempts triggers 30-minute lockout
- **Cookie security** — httpOnly, secure (production), sameSite=lax

### RBAC

7 roles: `AUDITOR`, `AUDIT_MANAGER`, `CAE`, `CCO`, `CEO`, `AUDITEE`, `BOARD_OBSERVER`

- Users can hold multiple roles simultaneously
- 58 granular permissions across observations, compliance, audit plans, reports, and admin functions
- Maker-checker enforcement (creator cannot approve own observations)

### Background Jobs

pg-boss processes scheduled jobs:

| Job                     | Schedule         | Purpose                            |
| ----------------------- | ---------------- | ---------------------------------- |
| `process-notifications` | On demand        | Dequeue & send email notifications |
| `deadline-check`        | Daily 06:00 IST  | 7/3/1 day advance reminders        |
| `send-weekly-digest`    | Monday 10:00 IST | Aggregated weekly email            |

## Available Scripts

```bash
# Development
pnpm dev              # Start dev server with Turbopack
pnpm build            # Production build
pnpm start            # Start production server
pnpm lint             # Run ESLint

# Database
pnpm db:generate      # Regenerate Prisma client
pnpm db:migrate       # Run pending migrations
pnpm db:push          # Push schema changes (dev only)
pnpm db:seed          # Seed demo data
pnpm db:studio        # Open Prisma Studio GUI

# Seeding
pnpm seed:master-directions   # Seed RBI master directions
```

## Domain Context

**Target users:** Urban Cooperative Banks (UCBs) in India — Tier I-IV banks regulated by RBI.

**Key concepts:**

| Term         | Description                                                               |
| ------------ | ------------------------------------------------------------------------- |
| **CRAR**     | Capital to Risk-weighted Assets Ratio (min 9% for UCBs)                   |
| **DAKSH**    | RBI's supervisory scoring system for UCBs                                 |
| **PCA**      | Prompt Corrective Action framework for weak banks                         |
| **ALM**      | Asset Liability Management                                                |
| **NPA**      | Non-Performing Assets classification and provisioning                     |
| **DICGC**    | Deposit Insurance and Credit Guarantee Corporation                        |
| **UCB Tier** | Classification by deposit size (Tier 1-4), affects applicable regulations |

## Configuration

### Tailwind v4 Theme

Colors are defined as CSS variables in `src/app/globals.css` inside a `@theme inline` block. shadcn/ui components reference these for consistent theming.

**Known gotcha:** Tailwind v4 does NOT auto-wrap bare CSS variables in `var()`. Use `w-[var(--sidebar-width)]` not `w-[--sidebar-width]`.

### shadcn/ui

- Style: `new-york`
- Base color: `zinc`
- CSS variables: enabled
- Icons: always import from `@/lib/icons` (barrel export), not directly from `lucide-react`

## Deployment

- **Target:** AWS Mumbai (ap-south-1) for RBI data localization compliance
- **Output:** Standalone build (Docker-ready, no node_modules needed)
- **Architecture:** Next.js standalone + PostgreSQL + pg-boss

## Roadmap

| Milestone                | Phases | Status   |
| ------------------------ | ------ | -------- |
| v1.0 Clickable Prototype | 1-4    | Shipped  |
| v2.0 Working Core MVP    | 5-10   | Complete |
| v2.0 Gap Closure         | 11-14  | Active   |

See [`.planning/ROADMAP.md`](.planning/ROADMAP.md) for detailed phase breakdowns and [`.planning/STATE.md`](.planning/STATE.md) for current progress.

## License

Proprietary. All rights reserved.
