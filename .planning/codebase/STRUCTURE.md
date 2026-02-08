# Codebase Structure

**Analysis Date:** 2026-02-08

## Directory Layout

```
AEGIS/
├── .planning/                # GSD workflow documentation
│   ├── codebase/            # Codebase analysis docs (this file)
│   ├── phases/              # Phase implementation plans
│   ├── quick/               # Quick task documentation
│   └── milestones/          # Milestone tracking
├── Project Doc/             # Business requirements, RBI blueprints
├── messages/                # i18n translation JSON files (en, hi, mr, gu)
├── public/                  # Static assets
│   └── logos/               # AEGIS logo assets
├── scripts/                 # Build/deployment scripts
├── src/
│   ├── app/                 # Next.js App Router pages and layouts
│   │   ├── (auth)/          # Auth route group (login)
│   │   ├── (dashboard)/     # Dashboard route group (all sidebar pages)
│   │   ├── globals.css      # Global styles with Tailwind v4
│   │   ├── layout.tsx       # Root layout (fonts, i18n provider)
│   │   └── page.tsx         # Root redirect to /login
│   ├── components/          # React components
│   │   ├── ui/              # shadcn/ui primitives (23 components)
│   │   ├── layout/          # AppSidebar, TopBar
│   │   ├── dashboard/       # Dashboard widgets (8 components)
│   │   ├── compliance/      # Compliance table, filters, charts (6 components)
│   │   ├── audit/           # Audit calendar, cards, detail (5 components)
│   │   ├── findings/        # Findings table, filters, detail (5 components)
│   │   ├── reports/         # Board report sections (7 components)
│   │   └── auth/            # Login form components
│   ├── data/                # Demo data and RBI regulations
│   │   ├── demo/            # JSON files for Apex Sahakari Bank
│   │   │   ├── en/          # (future: English locale data)
│   │   │   ├── hi/          # (future: Hindi locale data)
│   │   │   ├── mr/          # (future: Marathi locale data)
│   │   │   └── gu/          # (future: Gujarati locale data)
│   │   ├── rbi-regulations/ # RBI regulation knowledge base
│   │   └── index.ts         # Barrel export for all data
│   ├── hooks/               # Custom React hooks
│   ├── i18n/                # Internationalization config
│   ├── lib/                 # Utility functions and constants
│   └── types/               # TypeScript type definitions
├── .prettierrc              # Code formatting config
├── CLAUDE.md                # Project instructions for Claude
├── components.json          # shadcn/ui configuration
├── eslint.config.mjs        # ESLint configuration
├── next.config.ts           # Next.js configuration
├── package.json             # Dependencies and scripts
├── pnpm-lock.yaml           # pnpm lockfile
├── postcss.config.js        # PostCSS config for Tailwind
├── tailwind.config.ts       # Tailwind CSS v4 configuration
└── tsconfig.json            # TypeScript configuration
```

## Directory Purposes

**`.planning/`:**

- Purpose: GSD workflow state and planning documents
- Contains: PROJECT.md, ROADMAP.md, STATE.md, REQUIREMENTS.md, phase plans, quick tasks, milestone tracking
- Key files: `.planning/STATE.md` (current progress), `.planning/ROADMAP.md` (4-phase roadmap)
- Note: Checked into git for team coordination

**`Project Doc/`:**

- Purpose: Business documentation and regulatory reference materials
- Contains: AEGIS blueprint PDFs, RBI circular PDFs, UCB guidelines
- Key files: `AEGIS_Internal_Audit_Software_Blueprint.pdf`, `UCB Guidelines by RBI.pdf`
- Note: Not for code, reference only

**`messages/`:**

- Purpose: i18n translation files for multi-language support
- Contains: `en.json`, `hi.json`, `mr.json`, `gu.json`
- Structure: Nested JSON with translation keys organized by feature (Dashboard, Compliance, Findings, etc.)
- Usage: Loaded dynamically by `src/i18n/request.ts` based on locale cookie

**`public/`:**

- Purpose: Static assets served at root URL
- Contains: Logo images (`aegis-mark.png`, `aegis-wordmark.png`)
- Structure: `logos/` subdirectory for brand assets

**`src/app/`:**

- Purpose: Next.js App Router file-based routing
- Contains: Route groups, page components, layout components, global CSS
- Structure: Route groups use parentheses `(auth)`, `(dashboard)` to organize without affecting URLs
- Pattern: Each route has `page.tsx`, optional `layout.tsx`, optional `[param]/` for dynamic routes

**`src/app/(auth)/`:**

- Purpose: Authentication pages (login)
- Contains: `login/page.tsx`, `layout.tsx`
- Layout: Simple centered card, no sidebar

**`src/app/(dashboard)/`:**

- Purpose: All authenticated application pages
- Contains: `dashboard/`, `compliance/`, `audit-plans/`, `findings/`, `reports/`, `settings/`, `auditee/`
- Layout: Shared `layout.tsx` with `SidebarProvider > AppSidebar + TopBar + main`
- Dynamic routes: `findings/[id]/page.tsx`

**`src/components/ui/`:**

- Purpose: shadcn/ui primitive components
- Contains: 23 components (badge, button, card, table, sidebar, dialog, dropdown-menu, etc.)
- Pattern: Radix UI wrappers with Tailwind styling, composable sub-components
- Files: All named in kebab-case (e.g., `dropdown-menu.tsx`, `sidebar.tsx`)

**`src/components/layout/`:**

- Purpose: Global layout components
- Contains: `app-sidebar.tsx` (collapsible navigation), `top-bar.tsx` (breadcrumbs, notifications, user menu)
- Usage: Imported by `src/app/(dashboard)/layout.tsx`

**`src/components/dashboard/`:**

- Purpose: Dashboard page widgets
- Contains: `health-score-card.tsx`, `audit-coverage-chart.tsx`, `findings-count-cards.tsx`, `risk-indicator-panel.tsx`, `regulatory-calendar.tsx`, `quick-actions.tsx`
- Pattern: Each component is self-contained, imports data from `@/data`, renders card/chart

**`src/components/compliance/`:**

- Purpose: Compliance registry page components
- Contains: `compliance-table.tsx`, `compliance-filters.tsx`, `compliance-detail-dialog.tsx`, `compliance-trend-chart.tsx`
- Pattern: TanStack Table for data grid, Recharts for visualization

**`src/components/audit/`:**

- Purpose: Audit planning page components
- Contains: `audit-calendar.tsx`, `audit-engagement-cards.tsx`, `audit-detail-sheet.tsx`, `audit-filters.tsx`
- Pattern: Calendar view + card list, Sheet component for details

**`src/components/findings/`:**

- Purpose: Findings page components
- Contains: `findings-table.tsx`, `findings-filters.tsx`, `finding-detail.tsx`, `finding-timeline.tsx`
- Pattern: TanStack Table, detail page with timeline visualization

**`src/components/reports/`:**

- Purpose: Board report page components
- Contains: `executive-summary.tsx`, `compliance-scorecard.tsx`, `audit-highlights.tsx`, `findings-summary.tsx`, `risk-analysis.tsx`, `recommendations.tsx`
- Pattern: Read-only display components for PDF-ready report sections

**`src/data/demo/`:**

- Purpose: Demo data for Apex Sahakari Bank prototype
- Contains: `bank-profile.json`, `staff.json`, `branches.json`, `compliance-requirements.json`, `audit-plans.json`, `findings.json`, `rbi-circulars.json`
- Pattern: Each JSON file has a `summary` object with aggregates plus array of records
- Locale subdirectories: `en/`, `hi/`, `mr/`, `gu/` (prepared for future localized data)

**`src/data/rbi-regulations/`:**

- Purpose: RBI regulation knowledge base
- Contains: TypeScript modules exporting regulation data (`index.ts`, `chapters.ts`, `definitions.ts`, `capital-structure.ts`, `compliance-requirements.ts`)
- Pattern: Structured data objects with chapter hierarchy, definitions, requirements

**`src/hooks/`:**

- Purpose: Custom React hooks
- Contains: `use-mobile.tsx` (responsive breakpoint detection)
- Pattern: Export hook function, used throughout components for responsive behavior

**`src/i18n/`:**

- Purpose: Internationalization configuration
- Contains: `request.ts` (next-intl config, locale detection from cookie)
- Pattern: Server-side locale detection, dynamic message loading from `messages/`

**`src/lib/`:**

- Purpose: Shared utilities, constants, helpers
- Contains: `utils.ts`, `constants.ts`, `nav-items.ts`, `icons.ts`, `report-utils.ts`, `current-user.ts`, `get-locale-data.ts`
- Pattern: Pure functions, configuration objects, barrel exports

**`src/types/`:**

- Purpose: TypeScript type definitions
- Contains: `index.ts` (all application types)
- Pattern: Single file with all interfaces, exported for use throughout app

## Key File Locations

**Entry Points:**

- `src/app/layout.tsx`: Root layout (fonts, i18n provider, HTML setup)
- `src/app/page.tsx`: Root redirect to `/login`
- `src/app/(auth)/login/page.tsx`: Login page
- `src/app/(dashboard)/layout.tsx`: Dashboard layout (sidebar, topbar)

**Configuration:**

- `next.config.ts`: Next.js config with next-intl plugin
- `tsconfig.json`: TypeScript config with `@/*` path alias
- `tailwind.config.ts`: Tailwind v4 config with custom variables
- `eslint.config.mjs`: ESLint flat config
- `.prettierrc`: Prettier formatting rules
- `components.json`: shadcn/ui CLI config (new-york style)

**Core Logic:**

- `src/data/index.ts`: Barrel export for all demo data and RBI regulations
- `src/types/index.ts`: All TypeScript interfaces
- `src/lib/utils.ts`: `cn()` utility, `formatDate()` for Indian locale
- `src/lib/constants.ts`: Color mappings, language configs, app metadata
- `src/lib/nav-items.ts`: Sidebar navigation configuration
- `src/lib/report-utils.ts`: Report calculation functions

**Testing:**

- None (no test files in current prototype phase)

## Naming Conventions

**Files:**

- Pages: `page.tsx` (Next.js convention)
- Layouts: `layout.tsx` (Next.js convention)
- Components: `kebab-case.tsx` (e.g., `health-score-card.tsx`, `compliance-table.tsx`)
- Utilities: `kebab-case.ts` (e.g., `nav-items.ts`, `report-utils.ts`)
- JSON data: `kebab-case.json` (e.g., `bank-profile.json`, `compliance-requirements.json`)

**Directories:**

- Route groups: `(kebab-case)` (e.g., `(auth)`, `(dashboard)`)
- Component groups: `kebab-case` (e.g., `dashboard`, `compliance`, `findings`)
- Special dirs: `ui` (shadcn primitives), `layout` (global layout components)

**Components:**

- React components: `PascalCase` (e.g., `HealthScoreCard`, `ComplianceTable`)
- shadcn/ui composables: `PascalCase` with nesting (e.g., `Card`, `CardHeader`, `CardContent`)

**Variables:**

- Camel case for local variables: `compData`, `chartConfig`, `navItems`
- Constants: `UPPER_SNAKE_CASE` (e.g., `STATUS_COLORS`, `DEFAULT_LANGUAGE`)
- Types/Interfaces: `PascalCase` (e.g., `BankProfile`, `ComplianceRequirement`)

## Where to Add New Code

**New Dashboard Widget:**

- Primary code: `src/components/dashboard/{widget-name}.tsx`
- Import in: `src/app/(dashboard)/dashboard/page.tsx`
- Data source: `src/data/` (import via `@/data`)
- Types: Add interface to `src/types/index.ts` if needed

**New Page:**

- Primary code: `src/app/(dashboard)/{page-name}/page.tsx`
- Components: `src/components/{page-name}/` directory
- Add to sidebar: Update `src/lib/nav-items.ts`
- Add translations: Update `messages/en.json`, `messages/hi.json`, etc.

**New Component/Module:**

- Feature component: `src/components/{feature-name}/{component-name}.tsx`
- Shared UI primitive: `src/components/ui/{component-name}.tsx` (use shadcn CLI)
- Layout component: `src/components/layout/{component-name}.tsx`

**New Data:**

- Demo JSON: `src/data/demo/{data-name}.json`
- Export from: `src/data/index.ts`
- Type definition: `src/types/index.ts`
- Pattern: Include `summary` object at top of JSON for aggregates

**Utilities:**

- Shared helpers: `src/lib/utils.ts` (general) or `src/lib/{feature}-utils.ts` (specific)
- Constants: `src/lib/constants.ts`
- Hooks: `src/hooks/use-{hook-name}.tsx`

**i18n:**

- Translation keys: `messages/{locale}.json`
- Pattern: Organize by feature (Dashboard, Compliance, Findings, etc.)
- Add new locale: Create `messages/{locale}.json`, update `src/i18n/request.ts` and `src/lib/constants.ts`

## Special Directories

**`node_modules/`:**

- Purpose: Package dependencies
- Generated: Yes (pnpm install)
- Committed: No (.gitignore)

**`.next/`:**

- Purpose: Next.js build output and cache
- Generated: Yes (pnpm dev, pnpm build)
- Committed: No (.gitignore)
- Note: Delete if encountering Turbopack cache corruption

**`.git/`:**

- Purpose: Git version control
- Generated: Yes (git init)
- Committed: No (special dir)

**`.planning/codebase/`:**

- Purpose: Codebase analysis documents for GSD agents
- Generated: Yes (by `/gsd:map-codebase` command)
- Committed: Yes (for team coordination)

**`public/`:**

- Purpose: Static assets served at root
- Generated: No (manually created)
- Committed: Yes

**`scripts/`:**

- Purpose: Build and deployment automation
- Generated: No (manually created)
- Committed: Yes

---

_Structure analysis: 2026-02-08_
