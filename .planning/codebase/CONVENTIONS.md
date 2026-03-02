# Coding Conventions

**Analysis Date:** 2026-03-02

## Naming Patterns

**Files:**

- **Data Access (DAL):** Snake case, domain-scoped — `src/data-access/audit-execution.ts`, `src/data-access/observations.ts`, `src/data-access/rbia-scoring.ts`
- **Server Actions:** Snake case, domain-scoped — `src/actions/users.ts`, `src/actions/compliance-management.ts`, `src/actions/user-invitations.ts`
- **Libraries/Utilities:** Snake case, descriptive — `src/lib/rbia-scoring-engine.ts`, `src/lib/escalation-engine.ts`, `src/lib/auth-lockout-plugin.ts`, `src/lib/permissions.ts`
- **Services (Business Logic):** Snake case, domain-scoped — `src/services/risk-rating/compute.ts`
- **Components:** PascalCase, domain-scoped — `src/components/auth/login-form.tsx`, `src/components/dashboard/kpi-card.tsx`
- **Types:** PascalCase — `src/types/audit.ts` (re-exported from Prisma schema where possible)
- **Test Files:** Use `.test.ts` suffix in `__tests__` directory — `src/lib/__tests__/rbia-scoring-engine.test.ts`, `src/services/risk-rating/__tests__/compute.test.ts`

**Functions:**

- **camelCase for all function names** — `computeNodeScore()`, `getEngagements()`, `updateUserRoles()`, `hasPermission()`, `getRatingBand()`
- **Async functions use async/await pattern** — `async function getEngagements(session: Session) { ... }`
- **Helper functions prefixed with get/set/compute/is/has** — `getCurrentTenantId()`, `getSessionRoles()`, `hasPermission()`, `isLeaf()`
- **Event handlers prefixed with handle** — `handleLogin()`, `handleSubmit()`

**Variables:**

- **camelCase for all variables** — `const tenantId = session.user.tenantId`, `let isLoading = false`
- **Constants in UPPER_SNAKE_CASE** — `const MAX_ATTEMPTS = 5`, `const SCORE_VALUES = { ... }`, `const CRITICAL_ITEM_CAP = 0.5`
- **Type variables (generics) in PascalCase** — `function call<T extends Record>(...)`, `type Maybe<T> = T | null`
- **Destructured session prefixed with session** — `const session = await getRequiredSession(); const { tenantId } = session.user`
- **Boolean variables/props prefixed with is/has/can** — `isLoading`, `hasPermission()`, `canApproveObservation()`

**Types:**

- **Interfaces in PascalCase** — `interface AuthSession`, `interface Permission`
- **Union types prefixed with capitalized domain** — `type Role`, `type ObservationStatus`
- **Enums use PascalCase values** — Prisma enums: `Role.AUDITOR`, `ObservationStatus.DRAFT`
- **Type imports use `type` keyword** — `import type { AuthSession } from "@/lib/auth"`

## Code Style

**Formatting:**

- **Prettier configured** with settings: `semi: true`, `singleQuote: false`, `plugins: ["prettier-plugin-tailwindcss"]`
- **Line length:** No hard limit (Prettier default ~80 wraps, but context-aware)
- **Trailing semicolons:** Required (Prettier enforces)
- **Quotes:** Double quotes for strings (`"string"`, not `'string'`)
- **Tailwind CSS:** Applied via Prettier plugin — automatically ordered, separated after other Tailwind utilities
- **Indentation:** 2 spaces

**Linting:**

- **ESLint:** Configuration in `eslint.config.mjs` using Next.js config (core-web-vitals + typescript)
- **Key rules:**
  - `@typescript-eslint/no-explicit-any`: **warn** (codebase uses `any` extensively with Prisma types — fix incrementally)
  - `@typescript-eslint/no-unused-vars`: **warn** with pattern `argsIgnorePattern: "^_"` (prefix unused params with `_`)
  - `@typescript-eslint/no-empty-object-type`: **warn**
  - `@typescript-eslint/no-require-imports`: **warn**
  - `react/no-unescaped-entities`: **warn**
  - `prefer-const`: **warn**
  - `@next/next/no-html-link-for-pages`: **warn**
  - `react-hooks/*`: Error for rules-of-hooks, warn for purity/set-state-in-effect/refs (React 19 compiler gradual adoption)
- **Ignored directories:** `.claude/`, `infra/`, `.next/`, `playwright-report/`

**TypeScript:**

- **Strict mode:** Enabled (`"strict": true` in tsconfig.json)
- **Target:** ES2017
- **Module resolution:** bundler
- **JSX:** react-jsx (React 19)
- **Path aliases:** `@/*` maps to `./src/*` — **always use for imports** (never `../../../`)
- **Type narrowing:** Use type guards and exhaustive checks
  ```typescript
  if (error instanceof Error) {
    /* ... */
  }
  if (result.success) {
    const data = result.data; /* ... */
  }
  ```

## Import Organization

**Order:**

1. **External libraries** — React, Next.js, third-party packages

   ```typescript
   import { useState } from "react";
   import { useRouter } from "next/navigation";
   import { useTranslations } from "next-intl";
   import { betterAuth } from "better-auth";
   ```

2. **Server-only markers** (when required)

   ```typescript
   import "server-only";
   ```

3. **Aliased imports from `@/`** — organized by layer

   ```typescript
   import { auth } from "@/lib/auth";
   import { getRequiredSession } from "@/data-access/session";
   import { hasPermission } from "@/lib/permissions";
   import { Button } from "@/components/ui/button";
   ```

4. **Type imports** — at end with `type` keyword
   ```typescript
   import type { AuthSession } from "@/lib/auth";
   import type { Role } from "@/generated/prisma/enums";
   ```

**Path Aliases:**

- **Always use `@/`** for imports — no relative paths (`../../../`, `./..`)
- **Layer imports:** Prefer explicit paths (`@/lib/auth`, `@/data-access/session`) over barrel imports for clarity
- **Icons:** Always import from `@/lib/icons` (barrel export), not directly from `lucide-react`
  ```typescript
  import { Lock, Mail, Shield } from "@/lib/icons";
  ```

## Error Handling

**Patterns:**

- **Server actions use try-catch with error type narrowing:**

  ```typescript
  try {
    const result = updateRolesSchema.safeParse(input);
    if (!result.success) throw new Error(result.error.issues[0].message);
    await updateUserRolesDAL(userId, roles, justification, session);
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Failed to update roles. Please try again.");
  }
  ```

- **Zod validation with safeParse, then check success:**

  ```typescript
  const result = updateRolesSchema.safeParse(input);
  if (!result.success) {
    throw new Error(result.error.issues[0].message);
  }
  const { userId, roles } = result.data;
  ```

- **API responses use result/error pattern (Better Auth):**

  ```typescript
  const response = await signIn.email({ email, password });
  if (response.error) {
    const errorCode = response.error.code || response.error.message;
    switch (errorCode) {
      case "INVALID_EMAIL_OR_PASSWORD":
        setError(t("invalidCredentials"));
        break;
      case "TOO_MANY_ATTEMPTS":
        setError(t("rateLimited"));
        break;
      case "ACCOUNT_LOCKED":
        setError(t("accountLocked"));
        break;
      default:
        setError(t("loginFailed"));
    }
  } else if (response.data) {
    /* success */
  }
  ```

- **Permission checks before DB operations:**

  ```typescript
  const session = await getRequiredSession();
  if (!hasPermission(session.user.roles, "admin:manage_roles")) {
    throw new Error("You do not have permission to manage roles.");
  }
  ```

- **Tenant isolation always enforced in DAL:**

  ```typescript
  export async function getEngagements(session: Session) {
    const tenantId = session.user.tenantId;
    const db = prismaForTenant(tenantId);
    return db.auditEngagement.findMany({
      where: { tenantId }, // CRITICAL: always filter by tenantId
      // ...
    });
  }
  ```

- **Error messages are user-facing, use translations:**
  ```typescript
  const t = useTranslations("Login");
  setError(t("invalidCredentials")); // Not "Invalid email or password"
  ```

## Logging

**Framework:** pino with pino-pretty for development

**Patterns:**

```typescript
import { logger, createRequestLogger } from "@/lib/logger";

// Basic logging
logger.info({ userId: "123" }, "user logged in");

// Request-scoped logging with context
const reqLogger = createRequestLogger({
  userId: session.user.id,
  tenantId: session.user.tenantId,
  requestId: "req-123",
  method: "POST",
  path: "/api/findings",
});
reqLogger.info({ findingId }, "finding created");
```

**Features:**

- Production: JSON logs to stdout (CloudWatch-compatible)
- Development: Colorized, human-readable via pino-pretty
- Automatic redaction of sensitive fields: password, token, authorization, cookie
- Base metadata: `{ service: "aegis" }`
- ISO 8601 timestamps
- Severity level formatting for CloudWatch Logs Insights

**When to log:**

- Auth events: login, logout, session create/destroy
- Permission checks: denied access attempts
- Data mutations: create, update, delete operations (with IDs, not sensitive data)
- Errors: exceptions with context
- Never log passwords, API keys, or sensitive user data

## Comments

**When to Comment:**

- Document **why**, not what (code shows what)
- Public/exported functions: JSDoc comments required
- Non-obvious business logic: explain intent
- Workarounds/temporary fixes: mark with `// FIXME:` or `// TODO:`
- Complex algorithms: step-by-step explanation

**JSDoc/TSDoc:**

- Used consistently on server actions and DAL functions
- Format:
  ```typescript
  /**
   * Update a user's roles.
   *
   * This action:
   * - Validates the current user has admin:manage_roles permission
   * - Prevents self-role-change (security)
   * - Requires justification text for audit trail
   * - Updates the user's roles in the database
   *
   * @param input - User ID, new roles array, and justification
   * @throws Error if permission check fails or validation errors
   */
  export async function updateUserRoles(input: UpdateRolesInput) { ... }
  ```

**Comment markers:**

- `// CRITICAL:` — Security-critical comment (tenant isolation, auth checks)
- `// FIXME:` — Known issue that needs fixing
- `// TODO:` — Future enhancement
- `// NOTE:` — Important note for future readers
- `// HACK:` — Workaround (avoid when possible)
- `// XXX:` — Something questionable (review needed)

**Visual separators for complex sections:**

```typescript
// ─── Test Fixtures ───────────────────────────────────────────────────────────
// ─── SCORE_VALUES constant ───────────────────────────────────────────────────
```

## Function Design

**Size:** Keep under 50 lines (split if longer)

**Parameters:**

- **Session always first parameter in DAL functions:** `function getEngagements(session: Session, ...otherParams)`
- **Input objects for multiple parameters:** Avoid >3 positional params

  ```typescript
  // Good
  export async function updateUserRoles(input: UpdateRolesInput) { ... }

  // Avoid
  export async function updateUserRoles(userId, roles, justification, session) { ... }
  ```

**Return Values:**

- **Include type annotations** — always explicit
  ```typescript
  async function getEngagements(session: Session): Promise<AuditEngagement[]> { ... }
  ```
- **Use `Promise<T>` for async functions** (not implicit)
- **Void return only when side-effect-only** — prefer returning result object

## Module Design

**Exports:**

- **Default exports: Only for page/layout components** (Next.js convention)
- **Named exports for all utilities, hooks, components** — enables tree-shaking
  ```typescript
  export function cn(...inputs: ClassValue[]) { ... }
  export { Button };
  export type { ButtonProps };
  ```

**Barrel Files:**

- **Use only for UI components** (`src/components/ui/index.ts`)
- **Avoid for business logic** — prefer explicit imports for clarity
- **`src/lib/icons.ts` is a barrel export** — all lucide icons imported here and re-exported

**Organization:**

- **Co-locate related code:** DAL functions grouped by domain, tests in `__tests__` subdirectory
- **Single responsibility:** Each file has one primary export (or related group in case of utils)
- **Directories:** Organized by feature/domain, not by file type
  ```
  src/
  ├── actions/         # Server actions by domain
  ├── data-access/     # DAL queries by domain
  ├── components/      # Components by domain + ui/
  ├── lib/             # Shared utilities and engines
  └── services/        # Business logic engines
  ```

## Validation

**Library:** Zod v4

**Pattern:**

```typescript
import { z } from "zod";

export const updateRolesSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  roles: z.array(z.enum(getAssignableRoles() as [Role, ...Role[]])),
  justification: z
    .string()
    .min(10, "Justification must be at least 10 characters"),
});

export type UpdateRolesInput = z.infer<typeof updateRolesSchema>;
```

**Usage in forms:**

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const form = useForm({
  resolver: zodResolver(updateRolesSchema),
  defaultValues: { userId: "", roles: [], justification: "" },
});
```

**Usage in server actions:**

```typescript
const result = updateRolesSchema.safeParse(input);
if (!result.success) {
  throw new Error(result.error.issues[0].message);
}
const { userId, roles, justification } = result.data;
```

---

_Convention analysis: 2026-03-02_
