# Coding Conventions

**Analysis Date:** 2026-02-08
**Updated:** 2026-02-11 (post v2.0 MVP)

## Naming Patterns

**Files:**

- React components: kebab-case with `.tsx` extension (e.g., `health-score-card.tsx`, `compliance-table.tsx`)
- Server actions: kebab-case with `.ts` extension (e.g., `compliance-management.ts`, `onboarding-excel-upload.ts`)
- Utilities/libraries: kebab-case with `.ts` extension (e.g., `utils.ts`, `auth.ts`, `s3.ts`, `ses-client.ts`)
- Email templates: kebab-case with `.tsx` extension (e.g., `assignment-email.tsx`, `reminder-email.tsx`)
- Data files: kebab-case JSON (e.g., `bank-profile.json`, `compliance-requirements.json`)
- Configuration: kebab-case or conventional names (e.g., `components.json`, `next.config.ts`)

**Functions:**

- Exported utilities: camelCase (e.g., `formatDate`, `calculateAge`, `ageColorClass`)
- Server actions: camelCase (e.g., `createObservation`, `transitionObservation`, `detectRepeatFindings`)
- React components: PascalCase (e.g., `HealthScoreCard`, `ComplianceTable`, `ObservationForm`)
- Hooks: camelCase with `use` prefix (e.g., `useReactTable`, `useSidebar`)

**Variables:**

- Constants: SCREAMING_SNAKE_CASE (e.g., `APP_NAME`, `SEVERITY_COLORS`, `STATUS_COLORS`)
- React state: camelCase (e.g., `sorting`, `columnFilters`, `selectedRequirement`)
- Component props: camelCase (e.g., `categoryFilter`, `statusFilter`, `onCategoryChange`)
- Objects/data: camelCase (e.g., `chartData`, `compData`, `currentUser`)

**Types:**

- Interfaces and types: PascalCase (e.g., `ComplianceRequirement`, `Finding`, `BankProfile`)
- Prisma-generated types: PascalCase (auto-generated from schema model names)
- Enums: PascalCase values (e.g., `Role.AUDITOR`, `Severity.HIGH`, `ObservationStatus.DRAFT`)
- Type exports from `@/types/index.ts` and Prisma client

## Code Style

**Formatting:**

- Tool: Prettier 3.8.1
- Configuration: `.prettierrc`
- Key settings:
  - Semicolons: Required (`"semi": true`)
  - Quotes: Double quotes (`"singleQuote": false`)
  - Plugins: `prettier-plugin-tailwindcss` (auto-sorts Tailwind classes)

**Linting:**

- Tool: ESLint 10.0.0 with Next.js flat config
- Configuration: `eslint.config.mjs`
- Key rules: Extends `next/core-web-vitals` and `next/typescript`

**TypeScript:**

- Strict mode enabled (`"strict": true`)
- Module resolution: `bundler` (Next.js 16 App Router)
- JSON imports supported (`"resolveJsonModule": true`)
- Path alias: `@/*` maps to `./src/*`
- Prisma-generated types preferred for database entities

## Import Organization

**Order:**

1. React and Next.js core imports
2. Third-party libraries (UI components, utilities)
3. Local UI components (`@/components/ui/*`)
4. Feature components (`@/components/dashboard/*`, `@/components/compliance/*`)
5. Libraries and utilities (`@/lib/*`)
6. Server actions (`@/actions/*`)
7. Data imports (`@/data`) — legacy, used sparingly
8. Type imports (`@/types`, Prisma types)

**Path Aliases:**

- `@/*` for all `src/*` imports
- Always use absolute imports, never relative paths like `../../../`

**Icon Imports:**

- ALWAYS import from `@/lib/icons` (barrel export), never directly from `lucide-react`

## Server Action Patterns

**Structure:**

```typescript
"use server";

import { z } from "zod";
import { getRequiredSession } from "@/lib/auth";
import { prismaForTenant } from "@/lib/prisma";

const schema = z.object({
  // Zod validation schema
});

export async function actionName(input: z.infer<typeof schema>) {
  const session = await getRequiredSession();
  const prisma = prismaForTenant(session.tenantId);

  // Validate input
  const validated = schema.parse(input);

  // Execute tenant-scoped query
  const result = await prisma.model.create({ data: validated });

  // Record audit log
  await prisma.auditLog.create({
    data: { entity: "Model", action: "CREATE", userId: session.user.id },
  });

  return result;
}
```

**DAL Pattern:**

- `server-only` → `getRequiredSession` → `prismaForTenant` → `WHERE tenantId` → runtime assertion
- Every server action must verify session before database access
- Tenant scoping is mandatory — no unscoped queries allowed

## Error Handling

**Server Actions:**

- Zod validation: fail-fast with descriptive errors on invalid input
- Session check: redirect to login if no valid session
- Prisma errors: caught and returned as structured error responses
- Audit log: recorded for all successful mutations

**Client Components:**

- Fallback rendering for empty states in tables
- Optional chaining for nested data access
- React Query error boundaries for async data

## Logging

**Production:**

- Append-only AuditLog table for all data-modifying actions
- AuditLog entries: entity, action, userId, tenantId, timestamp, metadata (JSON)
- Immutable: no UPDATE or DELETE on AuditLog

**Development:**

- Console logging for debugging
- No structured logging framework yet

## Comments

**When to Comment:**

- Complex business logic (regulatory thresholds, state machine transitions)
- Workarounds (Tailwind v4 CSS variable issues, Radix hydration)
- File-level docblocks for barrel exports and utility modules

**JSDoc/TSDoc:**

- Not consistently used
- Prisma schema comments serve as model documentation
- Component props documented via TypeScript interfaces

## Function Design

**Size:**

- React components: 50-400 lines (median ~150 lines)
- Server actions: 20-80 lines
- Utility functions: 5-20 lines
- Complex table components (with filters/sorting): 300-400 lines

**Parameters:**

- Server actions: Single object parameter with Zod schema
- Component props: Destructured with TypeScript interface
- Event handlers: `on` prefix (e.g., `onCategoryChange`, `onReset`)

## Module Design

**Exports:**

- Named exports for components (e.g., `export function ComplianceTable()`)
- Default exports for Next.js pages (e.g., `export default function DashboardPage()`)
- Named exports for server actions, utilities, and constants

**Barrel Files:**

- `src/lib/icons.ts`: Re-exports all icons from `lucide-react`
- `src/data/index.ts`: Re-exports legacy demo data (used for seeding)

## React Patterns

**Client Components:**

- Use `"use client"` directive for interactive components
- All tables, forms, and stateful widgets are client components
- React Query for server state management

**Server Components:**

- Next.js pages are async server components by default
- Fetch data via Prisma in server components, pass as props to client components

**State Management:**

- Server state: React Query (TanStack Query v5.90) for client-side caching
- Local state: React useState for tables, dialogs, filters
- Auth state: Better Auth session cookie
- No Redux/Zustand needed

## shadcn/ui Conventions

(Unchanged from v1.0)

- `class-variance-authority` (cva) for variant management
- `cn()` utility for class merging
- Forward refs for primitive components
- Radix UI primitives for accessibility

## Data Handling

**Database Queries (v2.0):**

- All queries via Prisma client, tenant-scoped
- Prisma-generated types for type safety
- No raw SQL in application code

**Legacy JSON Imports (v1.0 — deprecated):**

- `as unknown as Type` casting pattern still in seed scripts
- Not used in runtime application code

**Date Formatting:**

- Use `formatDate()` from `@/lib/utils.ts` (Indian locale: `en-IN`)

## Accessibility

(Unchanged from v1.0)

- `tabIndex={0}` on clickable rows, Enter/Space key handlers
- `aria-label` on charts
- Radix UI ARIA attributes by default
- `prefers-reduced-motion` check for animations

## Internationalization

(Unchanged from v1.0)

- `next-intl` 4.8.2 with `useTranslations()` hook
- Cookie-based locale storage (`NEXT_LOCALE`)
- 4 locales: en, hi, mr, gu

---

_Convention analysis: 2026-02-08_
_Updated: 2026-02-11 — reflects v2.0 Working Core MVP (shipped 2026-02-10)_
