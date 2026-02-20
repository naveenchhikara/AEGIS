# Coding Conventions

**Analysis Date:** 2026-02-20

## Naming Patterns

**Files:**

- React components: PascalCase (`ObservationForm.tsx`, `FindingDetail.tsx`, `AppSidebar.tsx`)
- Server actions: kebab-case in subdirectories (`src/actions/observations/create.ts`, `src/actions/observations/transition.ts`)
- DAL functions: kebab-case filenames (`src/data-access/observations.ts`, `src/data-access/audit-plans.ts`)
- Hooks: kebab-case with `use-` prefix (`use-auto-save.ts`, `use-mobile.tsx`)
- Schemas: colocated in action subdirectory (`schemas.ts` alongside `create.ts`, `transition.ts`)
- Pages: `page.tsx` following Next.js App Router convention

**Functions:**

- Server actions: camelCase verb-noun (`createObservation`, `transitionObservation`, `resolveFieldwork`)
- DAL functions: camelCase verb-noun (`getObservations`, `getObservationById`, `getRequiredSession`)
- Component functions: PascalCase matching filename (`ObservationForm`, `FindingsTable`, `FindingDetail`)
- Utility functions: camelCase (`formatDate`, `cn`, `createRequestLogger`)
- Guard helpers: camelCase verb-noun (`requirePermission`, `requireAnyPermission`, `hasPermission`)

**Variables:**

- camelCase throughout (`tenantId`, `userRoles`, `isPending`, `observationUrl`)
- Constants in SCREAMING_SNAKE_CASE when domain enums (`"DRAFT"`, `"SUBMITTED"`, `"CRITICAL"`)
- Prefix unused params/vars with `_` to satisfy ESLint (`_prev: FormState`)

**Types and Interfaces:**

- PascalCase for interfaces and types (`TenantSettings`, `AuditLogEntry`, `ObservationFormProps`, `FormState`)
- Zod schemas: PascalCase with `Schema` suffix (`CreateObservationSchema`, `TransitionObservationSchema`)
- Inferred Zod types: PascalCase with `Input` suffix (`CreateObservationInput`, `TransitionObservationInput`)
- Prisma-generated enums re-exported from `@/lib/permissions` as value+type dual (`export type Role = PrismaRole; export const Role = PrismaRole;`)

## Code Style

**Formatting:**

- Prettier with default settings: double quotes, semicolons enabled
- Config: `.prettierrc` — `{ "semi": true, "singleQuote": false, "plugins": ["prettier-plugin-tailwindcss"] }`
- Tailwind class sorting via `prettier-plugin-tailwindcss`

**Linting:**

- ESLint with `eslint-config-next/core-web-vitals` + TypeScript rules
- Config: `eslint.config.mjs`
- `@typescript-eslint/no-explicit-any` — downgraded to **warn** (Prisma types use `any` extensively; use `zodResolver(Schema as any)` for react-hook-form compatibility)
- `@typescript-eslint/no-unused-vars` — **warn**, ignores `^_` prefix pattern
- `react-hooks/rules-of-hooks` — **error** (enforced strictly)
- `prefer-const` — **warn**

## Import Organization

**Order (no enforced tooling, observed pattern):**

1. React/Next.js framework imports (`"use server"`, `"use client"`, `import * as React from "react"`, `useRouter`, `revalidatePath`)
2. Internal path aliases from `@/data-access/` (DAL layer)
3. Internal path aliases from `@/lib/` (utilities, permissions, logger)
4. Internal path aliases from `@/components/` (UI components)
5. Internal path aliases from `@/actions/` (server actions in client components)
6. Relative imports (`./schemas`, `../something`)

**Path Aliases:**

- `@/*` maps to `./src/*` (configured in `tsconfig.json` and `vitest.config.ts`)
- Always use `@/` prefix; no relative `../` traversal across domains

**Icon imports:**

- Always import from `@/lib/icons` barrel export (`src/lib/icons.ts`), NEVER directly from `lucide-react`

## Error Handling

**Server Actions Pattern:**

- Never throw — always return `{ success, data?, error? }` discriminated union
- On validation failure: `{ success: false as const, error: parsed.error.issues[0].message }`
- On permission failure: `{ success: false as const, error: "You do not have permission to ..." }`
- On DB/runtime error: catch block calls `logger.error(...)`, returns `{ success: false as const, error: "Failed to ... Please try again." }`
- Success: `{ success: true as const, data: { id: result.id } }`
- Use `success: true as const` / `success: false as const` for TypeScript discriminated union narrowing

**Page-level:**

- Use `notFound()` from `next/navigation` when DAL returns null for a requested entity
- Use `requirePermission()` from `@/lib/guards` at page top — redirects to `/dashboard?unauthorized=true` if unauthorized

**DAL functions:**

- Do NOT catch errors in DAL — let them bubble to server actions or page handlers
- Add `tenantId` to every `where` clause even when using `prismaForTenant()` ("belt-and-suspenders")

## Logging

**Framework:** pino via `@/lib/logger`

**Patterns:**

- Import singleton: `import { logger } from "@/lib/logger"`
- Structured log: `logger.error({ error, action: "action_name", tenantId }, "Human message")`
- Request-scoped child: `createRequestLogger({ userId, tenantId, requestId, method, path })`
- Development: colorized pino-pretty output
- Production: JSON to stdout for CloudWatch Logs Insights
- Automatic redaction of `password`, `token`, `authorization`, `cookie`, `secret`, `apiKey`

**When to log:**

- All server action catch blocks with `logger.error({ error, ...context }, "description")`
- NOT in DAL functions (let caller handle)
- NOT for expected business errors (validation, permission failures) — only runtime/DB errors

## Security Conventions

**Tenant Isolation (critical):**

- `tenantId` MUST come from session only (`getRequiredSession()`) — never from URL params, request body, or query string
- Every DAL query must include `WHERE tenantId = ?`
- Use `prismaForTenant(tenantId)` — returns singleton Prisma client scoped to tenant
- DAL file must start with `import "server-only";`

**Authentication:**

- Server action entry point: `const session = await getRequiredSession();`
- Permission check: `if (!hasPermission(userRoles, "permission:action")) { return error }`
- Page entry point: `const session = await requirePermission("permission:action");`

**Transactions:**

- Use `db.$transaction(async (tx) => { ... })` for multi-step writes
- Call `setAuditContext(tx, { actionType, userId, tenantId, sessionId })` inside each transaction

## Comments

**When to Comment:**

- Function-level JSDoc on all exported DAL functions and server actions
- Security context blocks in server actions (document tenantId source, permission required)
- Step-numbered comments for multi-step procedures (`// Step 1: Auth`, `// Step 2: Permission check`)
- Section dividers using `─── Name ──────` pattern for large files

**JSDoc pattern:**

```typescript
/**
 * Short description of what the function does.
 *
 * Security:
 * - Permission check: permission:name (ROLE)
 * - tenantId from session only (S2)
 *
 * @param param - Description
 * @returns { success, data?, error? } — never throws
 */
```

## Form Design

**Pattern:**

- Complex forms: `react-hook-form` + `zodResolver(Schema as any)` + shadcn/ui `Form` components
- Simple action forms: `useActionState` + `FormData` + server action (no react-hook-form)
- Always colocate Zod schema in `schemas.ts` next to actions in same directory
- Client component forms use `"use client"` directive at top of file

## Module Design

**Exports:**

- Server actions: named exports only (`export async function createObservation(...)`)
- DAL files: named exports (`export async function getObservations(...)`)
- Components: named exports (`export function ObservationForm(...)`)
- Utility singletons: named exports (`export const logger = pino(...)`)
- Types: `export type`, `export interface` — colocated with relevant code or in `src/types/index.ts`

**Barrel Files:**

- `src/lib/icons.ts` — barrel for all lucide-react icons
- `src/data-access/index.ts` — partial barrel
- Avoid barrel files for actions (import specific files: `@/actions/observations/create`)

## i18n Conventions

- Use `getTranslations("Namespace")` in server components (`import { getTranslations } from "next-intl/server"`)
- Namespace matches page domain (`"Findings"`, `"Dashboard"`, etc.)
- Message files: `messages/{en,hi,mr,gu}.json`
- Do NOT hardcode user-visible strings in components — always use translation keys

---

_Convention analysis: 2026-02-20_
