# Coding Conventions

**Analysis Date:** 2026-02-22

## Naming Patterns

**Files:**

- **Components:** PascalCase with dashes: `BankProfileForm`, `SettingsPage`, `UserInvitations`
- **Actions:** kebab-case descriptive: `update-control.ts`, `manage-control.ts`, `gap-to-issue.ts`
- **Pages:** `page.tsx` for route files (Next.js convention)
- **Utils:** camelCase: `permissions.ts`, `state-machine.ts`, `utils.ts`
- **Schemas:** kebab-case with descriptive suffix: `users.ts` in `src/lib/validations/`
- **Data Access:** kebab-case descriptive: `users.ts`, `settings.ts`, `session.ts` in `src/data-access/`

**Functions:**

- **Server Actions:** camelCase, descriptive verbs: `updateUserRoles()`, `updateTenantSettings()`, `getRequiredSession()`
- **Utility Functions:** camelCase: `hasPermission()`, `canTransition()`, `getRatingBand()`, `formatDate()`
- **React Hooks:** `use` prefix: `useToast()`, from `@/components/ui/use-toast`
- **Components:** PascalCase: `BankProfileForm`, `Card`, `CardHeader`, `CardContent`
- **DAL Functions:** camelCase, descriptive action: `updateUserRolesDAL()`, `getTenantSettings()`, `getRequiredSession()`

**Variables:**

- **booleans:** `isPending`, `isRepeatFinding`, `isVisible`, `allowed`
- **state:** camelCase: `shortName`, `address`, `currentMonth`, `observationUrl`
- **constants:** UPPER_SNAKE_CASE: `TEST_PASSWORD`, `DEFAULT_RISK_RATING_CONFIG`, `TRANSITIONS`
- **types/interfaces:** PascalCase: `BankProfileFormProps`, `UpdateRolesInput`, `ObservationInput`

**Types:**

- **Interfaces:** PascalCase ending with descriptive noun: `BankProfileFormProps`, `TenantSettings`
- **Union types:** Use `|` separator, exported as `export type Permission = "..." | "..."`
- **Enums:** Re-exported from Prisma: `Role`, `Severity`, `ObservationStatus`
- **Inferred types:** `z.infer<typeof schema>` pattern: `type UpdateRolesInput = z.infer<typeof updateRolesSchema>`

## Code Style

**Formatting:**

- **Tool:** Prettier with `prettier-plugin-tailwindcss`
- **Semi-colons:** Enabled (`semi: true`)
- **Quotes:** Double quotes for strings (`singleQuote: false`)
- **Tailwind CSS:** v4 with CSS variables; plugin auto-sorts classes (e.g., `bg-card text-card-foreground rounded-xl border shadow`)
- **Line length:** Prettier default 80 chars; wrapped imports and long strings

**Linting:**

- **Tool:** ESLint with Next.js flat config (`eslint.config.mjs`)
- **Extends:** `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- **Key Rules (Warn Level):**
  - `@typescript-eslint/no-explicit-any`: Warn (codebase uses `any` extensively with Prisma types)
  - `@typescript-eslint/no-unused-vars`: Warn, ignores `_` prefix (e.g., `_error`, `_count`)
  - `react/no-unescaped-entities`: Warn
  - `prefer-const`: Warn
  - `@next/next/no-html-link-for-pages`: Warn
- **Error Level:**
  - `react-hooks/rules-of-hooks`: Error

## Import Organization

**Order:**

1. **External packages:** `import { useState } from "react"`; `import { z } from "zod"`; `import { clsx } from "clsx"`
2. **Aliased paths:** `import { ... } from "@/lib/..."`; `import { ... } from "@/components/..."`; `import { ... } from "@/actions/..."`
3. **Relative imports (rare):** `./../sibling` — avoid, use aliases instead

**Path Aliases:**

- `@/*` maps to `./src/*` (defined in `tsconfig.json`)
- Standard locations:
  - `@/lib/` — utilities, permissions, state machines, validations
  - `@/components/` — React components (UI and domain-specific)
  - `@/data-access/` — Database queries with tenant isolation
  - `@/actions/` — Server actions with auth checks
  - `@/generated/prisma/` — Prisma client (auto-generated)
  - `@/types/` — Type definitions
  - `@/hooks/` — Custom React hooks
  - `@/services/` — Business logic

**Icon Imports:**

- **Always import from barrel:** `import { Building2, Shield, Save } from "@/lib/icons"`
- **Never direct from `lucide-react`:** This ensures tree-shaking and consistency

## Error Handling

**Patterns:**

- **Server Actions:** Throw `Error` with message; catch `instanceof Error` to access `.message`:

  ```typescript
  if (!hasPermission(userRoles, "admin:manage_roles")) {
    throw new Error("You do not have permission to manage roles.");
  }
  try {
    await updateUserRolesDAL(userId, roles, justification, session);
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Failed to update roles. Please try again.");
  }
  ```

- **Client Components:** Use `useToast()` for user feedback:

  ```typescript
  const { toast } = useToast();
  if (result.success) {
    toast({ title: "Settings saved", description: "..." });
  } else {
    toast({
      title: "Error",
      description: result.error,
      variant: "destructive",
    });
  }
  ```

- **DAL Functions:** Query failures should propagate as errors; include `WHERE tenantId = ?` for isolation

- **Validation:** Use Zod `safeParse()` and extract first issue:

  ```typescript
  const result = updateRolesSchema.safeParse(input);
  if (!result.success) {
    throw new Error(result.error.issues[0].message);
  }
  ```

- **Permission Guards:** Use `getRequiredSession()` for auth check; `requirePermission(permission)` for routes:
  ```typescript
  export default async function SettingsPage() {
    await requirePermission("admin:manage_settings");
    const settings = await getTenantSettings();
  }
  ```

## Logging

**Framework:** No dedicated logger configured; patterns use standard approaches:

- **Console (dev):** `console.log()` for debug output (not in production code)
- **Server Actions:** Log via try-catch; errors thrown to client
- **Instrumentation:** `src/instrumentation.ts` hooks for server startup (pg-boss job registration)

**Patterns:**

- Log errors before throwing: `console.error("Context", error)` → throw
- Use descriptive messages: "Permission denied: observation:approve" not "Access denied"
- Include context: user ID, tenant ID, resource ID where relevant

## Comments

**When to Comment:**

- **JSDoc blocks:** For public functions and components (see patterns below)
- **Inline comments:** For non-obvious business logic only (e.g., why a condition exists, not what it does)
- **TODOs/FIXMEs:** Use sparingly; prefer issues in project management
- **Decision references:** `(DE3)`, `(D20)` link to REQUIREMENTS.md for architectural decisions

**JSDoc/TSDoc:**

- **Functions:** Document purpose, parameters, return value, throws:

  ```typescript
  /**
   * Server action to update a user's roles.
   *
   * This action:
   * - Validates the current user has admin:manage_roles permission
   * - Prevents self-role-change (security)
   * - Updates the user's roles in the database
   *
   * @param input - User ID, new roles array, and justification
   * @throws Error if permission check fails or validation errors
   */
  export async function updateUserRoles(input: UpdateRolesInput) { ... }
  ```

- **Components:** Document props interface and behavior:

  ```typescript
  interface BankProfileFormProps {
    settings: TenantSettings;
  }

  /**
   * Bank profile form with read-only and editable sections.
   *
   * Sections:
   * 1. Bank Identity — read-only after onboarding
   * 2. Contact Information — editable
   */
  export function BankProfileForm({ settings }: BankProfileFormProps) { ... }
  ```

- **Inline:** Only for complex business rules:
  ```typescript
  // Escalate LOW to MEDIUM on 2nd occurrence; any severity becomes CRITICAL on 3rd+
  if (occurrenceCount === 2) { ... }
  else if (occurrenceCount >= 3) { ... }
  ```

## Function Design

**Size:**

- **Server Actions:** 30-60 lines; split session check → permission check → validation → DAL call → revalidate
- **DAL Functions:** 10-30 lines; focus on single query with WHERE tenantId clause
- **Utility Functions:** 5-20 lines; pure functions preferred
- **React Components:** 50-150 lines; extract subcomponents if > 200 lines

**Parameters:**

- **Objects over tuples:** Use Zod-validated input objects, not positional parameters
- **Type inference:** Accept Prisma types and inferred Zod schemas
- **Session:** Always extract from `getRequiredSession()`, never as parameter

**Return Values:**

- **Server Actions:** Return `{ success: true }` or throw `Error`; client catches via `try-catch`
- **DAL Functions:** Return typed Prisma result (or `null`); throw on DB error
- **Utility Functions:** Return typed value or `boolean`; throw for exceptional cases

## Module Design

**Exports:**

- **Default export:** Prefer named exports for functions/components
- **Barrel files:** Use for component groups: `src/components/ui/` exports all UI primitives
- **Type exports:** `export type` for TypeScript-only exports; separate from value exports

**Barrel Files:**

- Location: `src/lib/icons.ts` re-exports all Lucide icons
- Purpose: Tree-shaking and consistent import paths
- Pattern: `export { Icon1, Icon2, Icon3 } from "lucide-react"`

**Example Structure:**

```
src/actions/users.ts (default: server action)
src/data-access/users.ts (named exports: queries)
src/lib/permissions.ts (named + type exports: utilities + types)
src/components/settings/bank-profile-form.tsx (default: component)
src/lib/validations/users.ts (named exports: Zod schema + inferred type)
```

---

_Convention analysis: 2026-02-22_
