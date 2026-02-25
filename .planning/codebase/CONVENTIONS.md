# Coding Conventions

**Analysis Date:** 2026-02-25

## Naming Patterns

**Files:**

- React components: PascalCase (`ObservationCard.tsx`, `AuditPlanTable.tsx`)
- Server actions: kebab-case, domain-prefixed (`src/actions/observations.ts`, `src/actions/audit-engagement.ts`)
- DAL files: kebab-case, domain-prefixed (`src/data-access/observations.ts`, `src/data-access/session.ts`)
- Hooks: `use` prefix, camelCase (`src/hooks/usePermissions.ts`)
- Utility libs: kebab-case (`src/lib/utils.ts`, `src/lib/icons.ts`, `src/lib/permissions.ts`)
- Config/env: camelCase for variables, SCREAMING_SNAKE_CASE for env var names

**Functions:**

- Server actions: verb-noun camelCase (`createObservation`, `updateAuditEngagement`, `deleteUser`)
- DAL functions: `get`/`list`/`create`/`update`/`delete` prefix + domain noun (`getObservationById`, `listAuditEngagements`)
- React components: PascalCase function declarations
- Hooks: `use` prefix + PascalCase noun (`useAuditStore`, `usePermissions`)
- Event handlers: `handle` prefix (`handleSubmit`, `handleStatusChange`)

**Variables:**

- camelCase for all local variables and function parameters
- Boolean variables: `is`/`has`/`can` prefix (`isLoading`, `hasPermission`, `canEdit`)
- Destructured props: camelCase matching the prop name

**Types:**

- Interfaces: PascalCase, no `I` prefix (`ObservationFormData`, `AuditEngagementWithRelations`)
- Type aliases: PascalCase (`SessionUser`, `TenantId`)
- Zod schemas: PascalCase + `Schema` suffix (`CreateObservationSchema`, `UpdateUserSchema`)
- Prisma-inferred types: imported from `@/generated/prisma` and used directly
- Enums: SCREAMING_SNAKE_CASE values, PascalCase name (matches Prisma: `ObservationStatus.OPEN`)

## Code Style

**Formatting:**

- Tool: Prettier (`.prettierrc`)
- Double quotes for strings (`"singleQuote": false`)
- Semicolons required (`"semi": true`)
- Tailwind class sorting via `prettier-plugin-tailwindcss`

**Linting:**

- Tool: ESLint with `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`
- Config: `eslint.config.mjs`
- `@typescript-eslint/no-explicit-any` is a **warn** (not error) — `any` used extensively with Prisma types, use `zodResolver(Schema as any)` for react-hook-form
- Unused vars with `_` prefix are ignored: `_unused`, `_req`
- `react-hooks/rules-of-hooks` is the only **error**-level rule; most others are warnings
- Ignored dirs: `.claude/`, `infra/`, `.next/`, `playwright-report/`

## Import Organization

**Order (by convention):**

1. React and Next.js framework imports (`"react"`, `"next/*"`)
2. Third-party packages (`"zod"`, `"@tanstack/react-query"`)
3. Internal path aliases (`"@/lib/..."`, `"@/components/..."`, `"@/actions/..."`)
4. Relative imports (`"./MyComponent"`, `"../utils"`)

**Path Aliases:**

- `@/*` maps to `./src/*` (configured in `tsconfig.json` and `vitest.config.ts`)
- Always use `@/` for internal imports — no `../../` chains

**Critical import rule:**

- Icons: always import from `@/lib/icons` (barrel export), NEVER directly from `lucide-react`

## Error Handling

**Server Actions pattern:**

```typescript
// src/actions/observations.ts — standard pattern
export async function createObservation(data: CreateObservationInput) {
  const session = await getRequiredSession(); // throws redirect on missing auth
  if (!hasPermission(session.user, "observations:create")) {
    throw new Error("Unauthorized");
  }
  // ... business logic
}
```

**DAL functions:** Pure DB queries, no auth checks. Auth is enforced at the server action layer.

**Form errors:** react-hook-form captures field errors via Zod resolver; server errors returned as thrown exceptions and caught in `onSubmit` handlers with `toast.error(...)`.

**API routes:** Return JSON `{ error: string }` with appropriate HTTP status codes on failure.

**No global error boundary pattern** — errors surface per-page via Next.js error boundaries (`error.tsx` files).

## Logging

**Framework:** pino + pino-pretty

**Patterns:**

- Server-side structured logging via pino (`src/lib/logger.ts` or similar)
- Console.log acceptable in development; pino used in production code paths
- Background jobs (pg-boss) log via pino

## Comments

**When to Comment:**

- Complex business logic (RBI calculations, RBIA scoring formulas)
- Non-obvious workarounds (e.g., `suppressHydrationWarning` on `<html>` — Radix UI issue)
- TODO/FIXME for known gaps (searched via `grep -rn "TODO\|FIXME"`)

**TSDoc/JSDoc:**

- Not used systematically; inline comments preferred for complex logic
- Zod schemas are self-documenting via field names and `.describe()` calls

## Function Design

**Size:** Server actions and DAL functions kept focused (single responsibility)

**Parameters:**

- Server actions accept typed input objects matching Zod schema inferred types
- DAL functions accept `tenantId: string` as first or explicit parameter for isolation
- Components receive typed props interfaces defined above the component

**Return Values:**

- DAL functions return Prisma model types or `null` (not throwing on not-found)
- Server actions return data directly or throw
- Components return JSX

## Module Design

**Exports:**

- Server actions: named exports per action function
- Components: default export for the component, named exports for sub-components/types
- DAL: named exports per function
- `src/lib/icons.ts`: barrel export re-exporting all used lucide-react icons — always use this

**Barrel Files:**

- `src/lib/icons.ts` — icon barrel (mandatory)
- `src/generated/prisma/` — Prisma client barrel (auto-generated)
- Domain-level barrel files not used systematically

## Component Patterns

**UI Library:** shadcn/ui "new-york" style variant (`components.json`)

**Forms:**

```typescript
// Standard form pattern
const form = useForm<z.infer<typeof MySchema>>({
  resolver: zodResolver(MySchema as any), // `as any` required for Zod v4 + react-hook-form
  defaultValues: { ... },
});
```

**Server Components vs Client Components:**

- Pages are server components by default (data fetching at top level)
- Interactive components: `"use client"` directive at top of file
- Data flows down: server component fetches → passes to client component as props

**Tenant Isolation (critical):**

```typescript
// Always get tenantId from session — NEVER from URL/body
const session = await getRequiredSession();
const data = await listObservations(session.user.tenantId);
```

**State Management:**

- Server state: React Query (`@tanstack/react-query`) for client-side data fetching
- UI state: Zustand stores in `src/stores/`
- Form state: react-hook-form

**Date Formatting:**

- Use `formatDate()` from `src/lib/utils.ts` — formats in Indian locale (en-IN)
- Never use raw ISO strings or `toLocaleDateString()` directly

**Tailwind CSS v4:**

- Use `w-[var(--sidebar-width)]` NOT `w-[--sidebar-width]` (v4 change)
- `@theme inline` block required to register CSS variable colors
- `@custom-variant dark (&:is(.dark *));` for dark mode

---

_Convention analysis: 2026-02-25_
