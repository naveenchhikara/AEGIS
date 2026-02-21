# Coding Conventions

**Analysis Date:** 2025-02-21

## Naming Patterns

**Files:**

- Server actions: kebab-case (e.g., `create-observation.ts`, `transition.ts`, `resolve-fieldwork.ts`)
- Components: PascalCase (e.g., `ObservationForm.tsx`, `RepeatFindingBanner.tsx`)
- DAL functions: kebab-case (e.g., `session.ts`, `observations.ts`, `audit-plans.ts`)
- Utilities and libraries: kebab-case (e.g., `state-machine.ts`, `auth.ts`, `permissions.ts`)
- Schemas: suffix `-schema.ts` (e.g., `schemas.ts` in action directories)

**Functions:**

- camelCase universally
- Async operations: prefix with action or verb (e.g., `createObservation`, `transitionObservation`, `getRequiredSession`)
- Type guards: prefix with `has` or `require` (e.g., `hasPermission`, `requirePermission`)
- Factories and creators: prefix with `create` (e.g., `createRequestLogger`)

**Variables:**

- camelCase for locals and parameters
- UPPER_SNAKE_CASE for constants (e.g., `TEST_PASSWORD`, `TRANSITIONS`)
- Boolean variables prefix with `is` or `has` (e.g., `isDevelopment`, `hasPermission`)

**Types:**

- PascalCase for type/interface names (e.g., `CreateObservationInput`, `TransitionResult`, `TransitionDef`)
- Type suffixes: `Input`, `Output`, `Props`, `Schema` (e.g., `ObservationFormProps`, `CreateObservationSchema`)
- Exported enum names: PascalCase from Prisma enums (e.g., `Role`, `Permission`, `ObservationStatus`)

## Code Style

**Formatting:**

- Tool: Prettier with Tailwind CSS plugin
- Semicolons: enabled
- Quotes: double quotes (not single)
- Tailwind classes: automatically sorted by prettier-plugin-tailwindcss

**Linting:**

- Tool: ESLint with Next.js core-web-vitals + TypeScript config
- Ignored directories: `.claude/`, `infra/`, `.next/`, `playwright-report/`
- Warnings (not errors) for: `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-unused-vars`, `prefer-const`
- Unused vars pattern: Prefix unused parameters with `_` (e.g., `_prev: FormState`)
- Error-level rules: `react-hooks/rules-of-hooks` (React 19 compiler)

**Configuration files:**

- `.prettierrc`: Enables semicolons, double quotes, Tailwind sorting
- `eslint.config.mjs`: ESM format using Next.js config patterns

## Import Organization

**Order:**

1. External dependencies (React, Next.js, third-party packages)
2. Relative imports from `@/` alias (own application code)
3. Type imports at end of section or grouped with `import type`

**Pattern:**

```typescript
// External deps first
import { test, expect } from "@playwright/test";
import { z } from "zod";
import React from "react";

// Then relative imports
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { hasPermission } from "@/lib/permissions";
import { CreateObservationSchema } from "./schemas";

// Type imports
import type { CreateObservationInput } from "./schemas";
import type { Session } from "@/lib/auth";
```

**Path Aliases:**

- `@/*` maps to `./src/*` (configured in `tsconfig.json`)
- Always use `@/` prefix, never relative paths like `../../../lib`
- Icons: import from `@/lib/icons` (barrel export), never directly from `lucide-react`

## Error Handling

**Patterns:**

- Server actions use discriminated union return: `{ success: true; data: T } | { success: false; error: string }`
- Never throw in server actions — always catch and return error state
- Use `logger.error()` to log errors with context before returning error state
- Validation failures: return first issue message from Zod, never the full issues array

**Example:**

```typescript
try {
  const result = await db.$transaction(async (tx) => {
    // ... business logic
  });
  return { success: true as const, data: { id: result.id } };
} catch (error) {
  logger.error(
    { error, action: "create_observation", tenantId },
    "Failed to create observation",
  );
  return {
    success: false as const,
    error: "Failed to create observation. Please try again.",
  };
}
```

**Auth/Permission errors:**

- Use `redirect()` in server components when unauthorized (not return error)
- Example: `if (!hasPermission(roles, perm)) { redirect("/dashboard?unauthorized=true"); }`

**Validation errors:**

- Use Zod's `safeParse()` to avoid throwing
- Extract first issue message: `parsed.error.issues[0].message`
- Return user-friendly error message in response object

## Logging

**Framework:** pino with pino-pretty in development

**Patterns:**

- `logger.info({ context }, "message")` for informational events
- `logger.error({ error, context }, "message")` for errors
- Use `createRequestLogger()` in server actions to include userId, tenantId, requestId
- Automatic redaction of: password, token, authorization, cookie, secret, apiKey
- Development: colorized human-readable output
- Production: JSON format for CloudWatch Logs Insights

**Example:**

```typescript
import { logger, createRequestLogger } from "@/lib/logger";

// In server action
const reqLogger = createRequestLogger({
  userId: session.user.id,
  tenantId: session.user.tenantId,
  requestId: "req-123",
});
reqLogger.error({ error }, "failed to create observation");
```

## Comments

**When to Comment:**

- Multi-step algorithms or complex business logic — add header comments per logical section
- Non-obvious state transitions or guards — explain the "why"
- Security-critical code — reference requirement (e.g., "Phase 11 SC-1: Rate limiting")
- Workarounds or temporary code — use `// TODO:` or `// FIXME:`

**JSDoc/TSDoc:**

- Document all server action functions with purpose, security notes, return type, and example
- Document guard functions with @param, @returns, and @example
- Document exported types with /\*\* descriptions for public APIs

**Example:**

```typescript
/**
 * Create a new observation in DRAFT state with 5C fields (OBS-01).
 *
 * Security:
 * - Permission check: observation:create (AUDITOR role)
 * - tenantId from session only (S2)
 * - Zod validation for all inputs
 * - Audit context for tracking
 *
 * @returns { success, data?, error? } — never throws
 */
export async function createObservation(input: CreateObservationInput) {
  // ...
}
```

## Function Design

**Size:** Target < 50 lines per function (break large functions into steps)

**Parameters:**

- Single input object for > 2 parameters: `function createObservation(input: CreateObservationInput)`
- Discriminated unions for conditional inputs: `targetStatus: "DRAFT" | "SUBMITTED" | ...`
- Optional fields use `?` in Zod schemas, not function overloads

**Return Values:**

- Server actions: discriminated union `{ success: boolean; data?: T; error?: string }`
- DAL functions: direct data (already error-checked by caller)
- Guards/checkers: `boolean` or `{ allowed: boolean; reason?: string }`
- Async operations: always return Promise, never use callbacks

**Async boundaries:**

- Mark all async functions with `async` keyword
- Use `await` at call site, not `.then()` chains
- Wrap async operations in try-catch in entry points (server actions)

## Module Design

**Exports:**

- Export types alongside implementations: `export type CreateObservationInput = z.infer<...>`
- Use named exports, not default exports (except pages)
- Group related exports together at end of file or in barrel files

**Barrel Files:**

- `index.ts` in `src/lib/` for utilities
- Not used in `src/actions/` (each domain has own files)
- Simplify imports: `import { getRequiredSession } from "@/data-access"` instead of full path

**Server Actions:**

- Prefix with `"use server"` at top of file
- Always use `getRequiredSession()` for auth, never accept tenantId from parameters
- Use `prismaForTenant(tenantId)` for database access
- Use `revalidatePath()` to invalidate Next.js cache on mutation

## React/Component Conventions

**Client Components:**

- Prefix with `"use client"` at top of file
- Use `useActionState()` for form submissions with server actions
- Use `useTransition()` for non-form async operations
- Import shadcn/ui components from `@/components/ui/`

**Server Components:**

- Default export async functions for pages
- Fetch data directly in component (no separate loaders)
- Use `await getRequiredSession()` for auth checks
- Never use hooks in server components

**Forms:**

- Use `react-hook-form` with Zod resolver: `useForm({ resolver: zodResolver(schema) })`
- Import from `@/components/ui/` for inputs, buttons, etc.
- Fallback pattern: check control visibility before filling (Playwright E2E)

## Type Safety

**Zod Schemas:**

- Define in dedicated `schemas.ts` file per domain
- Export inferred types: `export type CreateObservationInput = z.infer<typeof CreateObservationSchema>`
- Use `z.safeParse()` in server actions, never `.parse()`

**Prisma Types:**

- Import enums from `@/generated/prisma/enums` (not inferred from types)
- Use strong typing for roles: `Role[]` not `string[]`
- Cast session to `AuthSession` once in `getRequiredSession()`, not throughout codebase

**Any Types:**

- Avoid `any` where possible
- ESLint allows as warning (not error) for Prisma compatibility
- Single cast at boundary is acceptable (e.g., session type cast)

---

_Convention analysis: 2025-02-21_
