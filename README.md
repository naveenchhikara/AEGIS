# AEGIS

Internal Audit & Compliance Management Platform for Urban Cooperative Banks (UCBs) in India.

AEGIS helps UCB audit teams track RBI compliance requirements, plan and execute audits, manage findings from observation to closure, and generate board-ready reports — all with multi-language support (English, Hindi, Marathi, Gujarati).

> **Status:** Clickable prototype with demo data for Apex Sahakari Bank. No backend or real authentication yet.

## Screenshots

<!-- TODO: Add screenshots after Phase 2 execution -->

## Quick Start

```bash
# Prerequisites: Node.js 20+ and pnpm 9+
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Any email/password combination works for demo login.

## Tech Stack

| Layer           | Technology                                                                                   |
| --------------- | -------------------------------------------------------------------------------------------- |
| Framework       | [Next.js 16](https://nextjs.org/) (App Router + Turbopack)                                   |
| UI Components   | [shadcn/ui](https://ui.shadcn.com/) (new-york style) + [Radix UI](https://www.radix-ui.com/) |
| Styling         | [Tailwind CSS v4](https://tailwindcss.com/) with CSS variable theming                        |
| Language        | TypeScript (strict mode)                                                                     |
| Data            | JSON files in `src/data/` (demo data, no database)                                           |
| Charts          | Recharts via shadcn/ui `ChartContainer`                                                      |
| Tables          | TanStack Table v8 via shadcn/ui Data Table pattern                                           |
| Icons           | [Lucide React](https://lucide.dev/)                                                          |
| Package Manager | pnpm                                                                                         |

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login page with language selector
│   │   └── login/
│   ├── (dashboard)/         # All authenticated screens
│   │   ├── dashboard/       # CEO dashboard with widgets
│   │   ├── compliance/      # RBI compliance registry
│   │   ├── audit-plans/     # Annual audit planning
│   │   ├── findings/        # Audit findings management
│   │   ├── reports/         # Board report preview
│   │   ├── auditee/         # Auditee management
│   │   ├── settings/        # Bank profile & config
│   │   └── layout.tsx       # Sidebar + top bar layout
│   ├── globals.css          # Tailwind v4 theme + shadcn vars
│   └── layout.tsx           # Root layout (Inter font, hydration fix)
├── components/
│   ├── auth/                # Login form
│   ├── dashboard/           # Dashboard widget components
│   ├── compliance/          # Compliance table, filters, dialog, chart
│   ├── audit/               # Calendar, engagement cards, filter, sheet
│   ├── layout/              # App sidebar + top bar
│   └── ui/                  # shadcn/ui primitives (14 components)
├── data/
│   ├── demo/                # Demo JSON files (Apex Sahakari Bank)
│   ├── rbi-regulations/     # RBI regulatory knowledge base
│   └── index.ts             # Barrel export for all demo data
├── lib/
│   ├── constants.ts         # Colors, status maps, branding
│   ├── icons.ts             # Lucide icon barrel export
│   ├── nav-items.ts         # Sidebar navigation config
│   ├── current-user.ts      # Mock user context
│   └── utils.ts             # Shared utilities (cn, formatDate)
├── hooks/                   # Custom React hooks
└── types/
    └── index.ts             # Domain type definitions
```

## Screens

| Screen              | Route          | Description                                                                                                   |
| ------------------- | -------------- | ------------------------------------------------------------------------------------------------------------- |
| Login               | `/login`       | Email/password + MFA prompt UI, language selector                                                             |
| Dashboard           | `/dashboard`   | Compliance health score, audit coverage chart, findings count, risk panel, regulatory calendar, quick actions |
| Compliance Registry | `/compliance`  | Sortable/filterable table of RBI requirements, status badges, detail modal, trend chart                       |
| Audit Planning      | `/audit-plans` | FY calendar view, engagement cards, type filter, progress bars, detail workspace                              |
| Findings            | `/findings`    | Findings list with severity badges, status distribution                                                       |
| Board Reports       | `/reports`     | Executive summary, audit coverage, compliance scorecard                                                       |
| Auditee Management  | `/auditee`     | Department/branch auditee list                                                                                |
| Settings            | `/settings`    | Bank profile, staff directory                                                                                 |

## Demo Data

All data represents **Apex Sahakari Bank Ltd**, a Tier 2 UCB in Pune, Maharashtra:

| File                           | Content                                               |
| ------------------------------ | ----------------------------------------------------- |
| `bank-profile.json`            | Bank details, license, business mix (~825 crore)      |
| `staff.json`                   | 12 staff members (CEO, CAE, auditors, compliance)     |
| `branches.json`                | 12 branches across Pune district                      |
| `compliance-requirements.json` | 15 RBI requirements with mixed status                 |
| `audit-plans.json`             | 8 audits (branch, IS, credit, compliance, revenue)    |
| `findings.json`                | 10 findings with timelines (CRAR, ALM, cyber, credit) |
| `rbi-circulars.json`           | 6 RBI circular references                             |

## Available Scripts

```bash
pnpm dev          # Start dev server with Turbopack (http://localhost:3000)
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # Run ESLint
```

## Domain Context

**Target users:** Urban Cooperative Banks (UCBs) in India — Tier III/IV banks with limited IT resources.

**Regulator:** Reserve Bank of India (RBI). UCBs must comply with RBI circulars covering capital adequacy (CRAR), asset quality (NPA norms), governance, cyber security, and more.

**Key concepts:**

- **CRAR** — Capital to Risk-weighted Assets Ratio (minimum 9% for UCBs)
- **DAKSH** — RBI's supervisory scoring system for UCBs
- **PCA** — Prompt Corrective Action framework for weak banks
- **ALM** — Asset Liability Management
- **NPA** — Non-Performing Assets classification and provisioning
- **DICGC** — Deposit Insurance and Credit Guarantee Corporation

## Architecture Decisions

| Decision                            | Rationale                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| Next.js App Router                  | File-based routing, React Server Components, Turbopack for fast dev            |
| shadcn/ui (copy-paste)              | Full customization control, consistent design system, accessible primitives    |
| Tailwind CSS v4                     | Native CSS variables, faster builds, `@theme inline` for theming               |
| JSON demo data                      | No backend needed for prototype; data shape matches future PostgreSQL schema   |
| `@/*` path alias                    | Clean imports: `@/components/ui/card` instead of `../../../components/ui/card` |
| Lucide icons via barrel             | Single import source (`@/lib/icons`) for tree-shaking and consistency          |
| Route groups `(auth)`/`(dashboard)` | Separate layouts without affecting URL paths                                   |

## Configuration

### Tailwind v4 Theme

Colors are defined as CSS variables in `src/app/globals.css` inside a `@theme inline` block. shadcn/ui components reference these variables for consistent theming.

**Known gotcha:** Tailwind v4 does NOT auto-wrap bare CSS variables in `var()`. Use `w-[var(--sidebar-width)]` not `w-[--sidebar-width]`.

### shadcn/ui

Configuration in `components.json`:

- Style: `new-york`
- Base color: `zinc`
- CSS variables: enabled
- Path alias: `@/components/ui`

### Prettier

```json
{
  "semi": true,
  "singleQuote": false,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

## Deployment

- **Target:** AWS Mumbai (ap-south-1) for RBI data localization compliance
- **Current:** Local development only (prototype phase)
- **Plan:** AWS Lightsail with PM2, Nginx, and SSL

## Roadmap

| Phase | Name                                             | Status  |
| ----- | ------------------------------------------------ | ------- |
| 1     | Project Setup & Demo Data                        | 30%     |
| 2     | Core Screens (Dashboard, Compliance, Audit Plan) | Planned |
| 3     | Finding Management & Board Reports               | Planned |
| 4     | Multi-language, Responsive Polish & Deploy       | Planned |

See `.planning/ROADMAP.md` for detailed phase breakdowns.

## License

Proprietary. All rights reserved.
