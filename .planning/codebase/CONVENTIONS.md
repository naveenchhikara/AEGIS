# AEGIS Code Conventions

## TypeScript Patterns

### Types vs Interfaces

**Use `type` for:**
- Union types
- Intersection types
- Mapped types
- Type aliases for primitives
- Function signatures

```typescript
// Union
type Status = "DRAFT" | "SUBMITTED" | "REVIEWED" | "CLOSED";

// Intersection
type AuditRecord = BaseRecord & { auditedBy: string };

// Function signature
type Handler = (input: string) => Promise<void>;

// Discriminated union (server action return)
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

**Use `interface` for:**
- Object shapes (especially for props)
- Extending other interfaces
- Declaration merging (rare)

```typescript
// Object shape
interface TenantSettings {
  id: string;
  name: string;
  tier: string;
}

// Props interface
interface ObservationFormProps {
  branches: { id: string; name: string }[];
  auditAreas: { id: string; name: string }[];
}
```

### Enum Usage

**ALWAYS use Prisma enums, NEVER TypeScript enums:**

```typescript
// ❌ WRONG: TypeScript enum
enum Role {
  AUDITOR = "AUDITOR",
  CAE = "CAE",
}

// ✅ CORRECT: Import from Prisma
import { Role } from "@/generated/prisma/enums";

// Usage
const userRoles: Role[] = ["AUDITOR", "AUDIT_MANAGER"];
```

**Why?** Prisma enums are database-backed and type-safe. TypeScript enums create runtime objects and can cause bundle bloat.

**Re-export pattern for convenience:**

```typescript
// src/lib/permissions.ts
import { Role as PrismaRole } from "@/generated/prisma/enums";

export type Role = PrismaRole;
export const Role = PrismaRole; // Re-export for enum-like access
```

---

## Server Action Pattern

### Standard Server Action Boilerplate

**File: `src/actions/{feature}/{action}.ts`**

```typescript
"use server"; // ⚠️ MUST be first line in file

import { revalidatePath } from "next/cache";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import { ActionSchema } from "./schemas";
import type { ActionInput } from "./schemas";

/**
 * JSDoc comment explaining:
 * - What the action does
 * - Security: permission requirements, tenantId source
 * - Atomicity: what happens in the transaction
 * - Returns: { success, data?, error? }
 */
export async function myAction(input: ActionInput) {
  // ─── Step 1: Authentication ────────────────────────────────────
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  // ─── Step 2: Permission Check ──────────────────────────────────
  if (!hasPermission(userRoles, "resource:action")) {
    return {
      success: false as const,
      error: "You do not have permission to perform this action.",
    };
  }

  // ─── Step 3: Input Validation ──────────────────────────────────
  const parsed = ActionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }
  const validated = parsed.data;

  // ─── Step 4: Tenant-Scoped Database ────────────────────────────
  const db = prismaForTenant(tenantId);

  // ─── Step 5: Transaction (Atomic Operation) ────────────────────
  try {
    const result = await db.$transaction(async (tx: any) => {
      // Set audit context for AuditLog trigger
      await setAuditContext(tx, {
        actionType: "resource.action", // e.g., "observation.created"
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Perform database operations
      const record = await tx.model.create({
        data: {
          tenantId, // ⚠️ ALWAYS include tenantId
          ...validated,
          createdById: session.user.id,
        },
      });

      // Additional operations (e.g., create timeline entry)
      await tx.relatedModel.create({ ... });

      return record;
    });

    // ─── Step 6: Cache Revalidation ────────────────────────────
    revalidatePath("/resource"); // Invalidate Next.js cache

    // ─── Step 7: Success Response ──────────────────────────────
    return {
      success: true as const,
      data: { id: result.id },
    };
  } catch (error) {
    // ─── Step 8: Error Handling ────────────────────────────────
    logger.error(
      { error, action: "my_action", tenantId },
      "Failed to perform action"
    );

    return {
      success: false as const,
      error: "Failed to perform action. Please try again.",
    };
  }
}
```

### Server Action Schemas

**File: `src/actions/{feature}/schemas.ts`**

```typescript
import { z } from "zod";

/**
 * Zod schema for action input validation.
 * Co-locate with actions for easy maintenance.
 */
export const CreateObservationSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  condition: z.string().min(10, "Condition must be at least 10 characters"),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  branchId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
});

export type CreateObservationInput = z.infer<typeof CreateObservationSchema>;
```

### Server Action Return Type Convention

**ALWAYS use discriminated union:**

```typescript
// ✅ CORRECT: Discriminated union
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Usage in action
return { success: true as const, data: { id: "..." } };
return { success: false as const, error: "Invalid input" };

// Client-side type narrowing
if (result.success) {
  console.log(result.data.id); // TypeScript knows data exists
} else {
  console.error(result.error); // TypeScript knows error exists
}
```

**❌ NEVER throw errors from server actions:**

```typescript
// ❌ WRONG: Throws error (breaks progressive enhancement)
export async function myAction(input: Input) {
  if (!valid) {
    throw new Error("Invalid input"); // DON'T DO THIS
  }
}

// ✅ CORRECT: Return error object
export async function myAction(input: Input) {
  if (!valid) {
    return { success: false, error: "Invalid input" };
  }
}
```

---

## Prisma Query Patterns

### `prismaForTenant()` Pattern

**ALWAYS use tenant-scoped Prisma client:**

```typescript
import { prismaForTenant } from "@/data-access/prisma";

export async function getObservations(session: Session) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId); // ⚠️ Wraps queries with RLS

  const observations = await db.observation.findMany({
    where: {
      tenantId, // ⚠️ Belt-and-suspenders: explicit WHERE clause
    },
  });

  return observations;
}
```

**❌ NEVER use raw `prisma` client directly in DAL/actions:**

```typescript
import { prisma } from "@/lib/prisma"; // ❌ WRONG: No tenant isolation

export async function getObservations(tenantId: string) {
  // ❌ WRONG: No RLS, no transaction-scoped isolation
  return prisma.observation.findMany({ where: { tenantId } });
}
```

### Transaction Pattern

**Use `$transaction` for multi-step mutations:**

```typescript
const result = await db.$transaction(async (tx: any) => {
  // ⚠️ tx is typed as `any` to allow dynamic model access
  // In practice, you know the model names at compile time

  // Set audit context (for AuditLog trigger)
  await setAuditContext(tx, {
    actionType: "observation.created",
    userId: session.user.id,
    tenantId,
    sessionId: session.session.id,
  });

  // Create primary record
  const observation = await tx.observation.create({ data: { ... } });

  // Create related record
  await tx.observationTimeline.create({
    data: {
      observationId: observation.id,
      tenantId,
      event: "created",
      createdById: session.user.id,
    },
  });

  return observation;
});
```

### Optimistic Locking Pattern

**For concurrent updates, use version field:**

```typescript
// Schema
model Observation {
  id      String @id
  version Int    @default(1) // ⚠️ Optimistic lock version
  // ...
}

// Update action
export async function updateObservation(input: UpdateInput) {
  // ... auth, validation ...

  const result = await db.$transaction(async (tx) => {
    // Check current version
    const current = await tx.observation.findUnique({
      where: { id: input.id },
      select: { version: true },
    });

    if (!current || current.version !== input.version) {
      throw new Error("Version conflict"); // Will be caught and returned
    }

    // Update with version increment
    return tx.observation.update({
      where: { id: input.id },
      data: {
        ...input.data,
        version: { increment: 1 }, // ⚠️ Atomic increment
      },
    });
  });

  return { success: true, data: result };
}
```

---

## Component Patterns

### Server Component (Default)

**No `"use client"` directive:**

```tsx
// src/app/(dashboard)/findings/page.tsx
import { getRequiredSession } from "@/data-access/session";
import { getObservations } from "@/data-access/observations";
import { FindingsTable } from "@/components/findings/findings-table";

export default async function FindingsPage() {
  // ✅ Direct async data fetching
  const session = await getRequiredSession();
  const observations = await getObservations(session);

  return (
    <div>
      <h1>Findings</h1>
      {/* Pass data as props */}
      <FindingsTable observations={observations} />
    </div>
  );
}
```

### Client Component (Interactive)

**With `"use client"` directive:**

```tsx
"use client"; // ⚠️ MUST be first line

import { useActionState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createObservation } from "@/actions/observations/create";

type FormState = {
  success?: boolean;
  error?: string;
  data?: { id: string };
};

async function submitAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const input = {
    title: formData.get("title") as string,
    // ... extract form data
  };

  return createObservation(input);
}

export function ObservationForm() {
  const [state, formAction, isPending] = useActionState(submitAction, {});

  // Side effect on success
  React.useEffect(() => {
    if (state.success) {
      toast.success("Observation created");
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form action={formAction}>
      <input name="title" required />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create"}
      </Button>
    </form>
  );
}
```

### Component Props Pattern

**Props interface with explicit types:**

```tsx
interface ObservationCardProps {
  observation: {
    id: string;
    title: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  };
  onSelect?: (id: string) => void; // Optional callback
  className?: string; // Optional styling
}

export function ObservationCard({
  observation,
  onSelect,
  className,
}: ObservationCardProps) {
  return (
    <div className={cn("rounded-lg border p-4", className)}>
      <h3>{observation.title}</h3>
      {onSelect && (
        <button onClick={() => onSelect(observation.id)}>Select</button>
      )}
    </div>
  );
}
```

---

## Form Patterns (React Hook Form + Zod)

### Standard Form Pattern

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
});

type FormValues = z.infer<typeof formSchema>;

export function ObservationForm({ onSubmit }: { onSubmit: (data: FormValues) => void }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      severity: "MEDIUM",
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          {...form.register("title")}
        />
        {form.formState.errors.title && (
          <p className="text-sm text-destructive">
            {form.formState.errors.title.message}
          </p>
        )}
      </div>

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Submitting..." : "Submit"}
      </Button>
    </form>
  );
}
```

### Progressive Enhancement Pattern (with useActionState)

```tsx
"use client";

import { useActionState, useTransition } from "react";
import { createObservation } from "@/actions/observations/create";

type FormState = {
  success?: boolean;
  error?: string;
};

async function submitAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const input = {
    title: formData.get("title") as string,
    severity: formData.get("severity") as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  };

  return createObservation(input);
}

export function ObservationForm() {
  const [state, formAction, isPending] = useActionState(submitAction, {});

  return (
    <form action={formAction}>
      {state.error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <input name="title" required />
      <select name="severity" required>
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
        <option value="CRITICAL">Critical</option>
      </select>

      <button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create"}
      </button>
    </form>
  );
}
```

---

## Error Handling Patterns

### Server Action Error Handling

**ALWAYS return error objects, NEVER throw:**

```typescript
export async function myAction(input: Input) {
  try {
    // ... operation
    return { success: true, data: result };
  } catch (error) {
    // Log error with context
    logger.error(
      { error, action: "my_action", tenantId },
      "Action failed"
    );

    // Return user-friendly error message
    return {
      success: false,
      error: "Failed to perform action. Please try again.",
    };
  }
}
```

### DAL Function Error Handling

**Return `null` for not found, throw for unexpected errors:**

```typescript
export async function getObservation(session: Session, id: string) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  try {
    const observation = await db.observation.findFirst({
      where: { id, tenantId },
    });

    return observation; // null if not found (expected)
  } catch (error) {
    // Unexpected database error
    logger.error({ error, observationId: id }, "Failed to fetch observation");
    throw error; // Re-throw for caller to handle
  }
}
```

### Client Component Error Handling

**Use toast for user feedback:**

```tsx
"use client";

import { toast } from "sonner";

export function MyComponent() {
  const handleAction = async () => {
    const result = await myAction(input);

    if (result.success) {
      toast.success("Action completed successfully");
    } else {
      toast.error(result.error);
    }
  };

  return <button onClick={handleAction}>Do Action</button>;
}
```

---

## Import Organization

### Import Order

```typescript
// 1. React imports
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// 2. External libraries
import { toast } from "sonner";
import { z } from "zod";

// 3. Internal: actions/data-access
import { createObservation } from "@/actions/observations/create";
import { getObservations } from "@/data-access/observations";

// 4. Internal: lib utilities
import { hasPermission } from "@/lib/permissions";
import { logger } from "@/lib/logger";

// 5. Internal: components
import { Button } from "@/components/ui/button";
import { ObservationCard } from "@/components/findings/observation-card";

// 6. Internal: types
import type { Session } from "@/lib/auth";
import type { Role } from "@/lib/permissions";

// 7. Styles (if any)
import "./styles.css";
```

### Path Alias Usage

**ALWAYS use `@/*` alias, NEVER relative imports for src/ files:**

```typescript
// ✅ CORRECT
import { getObservations } from "@/data-access/observations";
import { Button } from "@/components/ui/button";
import type { Session } from "@/lib/auth";

// ❌ WRONG
import { getObservations } from "../../data-access/observations";
import { Button } from "../ui/button";
```

---

## Naming Conventions

### Files

- **Components:** `kebab-case.tsx` (e.g., `observation-form.tsx`)
- **Actions:** `kebab-case.ts` (e.g., `create.ts`, `transition.ts`)
- **DAL functions:** `kebab-case.ts` (e.g., `observations.ts`)
- **Lib utilities:** `kebab-case.ts` (e.g., `permissions.ts`)
- **Types:** `kebab-case.ts` (e.g., `index.ts`, `onboarding.ts`)

### Functions

- **Server actions:** `camelCase` (e.g., `createObservation`, `transitionObservation`)
- **DAL functions:** `camelCase` (e.g., `getObservations`, `updateTenantSettings`)
- **Utility functions:** `camelCase` (e.g., `hasPermission`, `cn`)
- **React components:** `PascalCase` (e.g., `ObservationForm`, `Button`)

### Variables

- **Constants:** `SCREAMING_SNAKE_CASE` (e.g., `RISK_CATEGORIES`, `ROLE_PERMISSIONS`)
- **Enums (Prisma):** `PascalCase` (e.g., `Role`, `Severity`, `ObservationStatus`)
- **Local variables:** `camelCase` (e.g., `session`, `tenantId`, `observations`)
- **React state:** `camelCase` (e.g., `isOpen`, `selectedId`, `formData`)

### Types/Interfaces

- **Interfaces:** `PascalCase` (e.g., `TenantSettings`, `ObservationFormProps`)
- **Types:** `PascalCase` (e.g., `ActionResult`, `Permission`, `Role`)
- **Type parameters:** `T`, `K`, `V` (single uppercase letter)

---

## Special Patterns

### Session User Casting

**Better Auth session user requires type casting:**

```typescript
const session = await getRequiredSession();

// ⚠️ Better Auth doesn't include custom fields in type
// Cast to access tenantId and roles
const tenantId = (session.user as any).tenantId as string;
const userRoles = ((session.user as any).roles ?? []) as Role[];
```

**Why?** Better Auth's TypeScript types don't include custom user fields. This is a known limitation.

### Multi-Role Permission Checks

**ALWAYS use `hasPermission()` with roles array:**

```typescript
const userRoles = ((session.user as any).roles ?? []) as Role[];

// ✅ CORRECT: Multi-role aware
if (hasPermission(userRoles, "observation:create")) {
  // User has permission via any of their roles
}

// ❌ WRONG: Single role assumption
if (session.user.role === "AUDITOR") {
  // Breaks for users with multiple roles
}
```

### Tailwind Class Merging

**Use `cn()` helper for class merging:**

```tsx
import { cn } from "@/lib/utils";

export function Button({ className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "rounded-md bg-primary px-4 py-2 text-white", // Base classes
        className // Override classes
      )}
      {...props}
    />
  );
}
```

### Date Handling

**Use `date-fns` for formatting:**

```typescript
import { format } from "date-fns";

const formatted = format(new Date(), "PPP"); // "Jan 1, 2024"
```

### Fiscal Year Helpers

**Indian FY quarters (Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec, Q4=Jan-Mar):**

```typescript
import { getCurrentFiscalYear, getCurrentQuarter } from "@/lib/fiscal-year";

const fy = getCurrentFiscalYear(); // "2024-25"
const quarter = getCurrentQuarter(); // "Q1_APR_JUN"
```

---

## Testing Conventions

### Playwright Test Structure

**File: `tests/e2e/{feature}.spec.ts`**

```typescript
import { test, expect } from "@playwright/test";

test.describe("Observation Lifecycle", () => {
  test("should create observation as auditor", async ({ page }) => {
    // Navigate to form
    await page.goto("/findings/new");

    // Fill form
    await page.fill('input#title', "Test Observation");
    await page.selectOption('select#severity', "HIGH");

    // Submit
    await page.click('button[type="submit"]');

    // Assert redirect to detail page
    await page.waitForURL(/\/findings\/[a-f0-9-]+$/);

    // Assert success toast
    await expect(page.locator('text=created successfully')).toBeVisible();
  });
});
```

### Auth Setup Pattern

**File: `tests/auth.setup.ts`**

```typescript
import { test as setup } from "@playwright/test";

const users = [
  { role: "auditor", email: "auditor@test.com", password: "...", file: "playwright/.auth/auditor.json" },
];

for (const user of users) {
  setup(`authenticate as ${user.role}`, async ({ page }) => {
    await page.goto("/login");
    await page.fill('input#email', user.email);
    await page.fill('input#password', user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard**");
    await page.context().storageState({ path: user.file });
  });
}
```

---

## Anti-Patterns (DON'T DO THIS)

### ❌ Direct Prisma Client in Actions

```typescript
// ❌ WRONG
import { prisma } from "@/lib/prisma";

export async function myAction(input: Input) {
  const result = await prisma.observation.create({ data: input });
}
```

### ❌ tenantId from URL/Body

```typescript
// ❌ WRONG
export async function updateObservation(tenantId: string, data: any) {
  const db = prismaForTenant(tenantId); // Attacker can pass any tenantId!
}
```

### ❌ Throwing Errors from Server Actions

```typescript
// ❌ WRONG
export async function myAction(input: Input) {
  if (!valid) {
    throw new Error("Invalid"); // Breaks progressive enhancement
  }
}
```

### ❌ Client Component for Static Data

```tsx
// ❌ WRONG: Fetching in client component
"use client";

export default function FindingsPage() {
  const [observations, setObservations] = useState([]);

  useEffect(() => {
    fetch("/api/observations").then(/* ... */);
  }, []);

  return <div>{/* ... */}</div>;
}

// ✅ CORRECT: Server component
export default async function FindingsPage() {
  const session = await getRequiredSession();
  const observations = await getObservations(session);

  return <div>{/* ... */}</div>;
}
```

### ❌ Single Role Assumption

```typescript
// ❌ WRONG
if (user.role === "AUDITOR") {
  // Breaks for multi-role users
}

// ✅ CORRECT
if (hasPermission(user.roles, "observation:create")) {
  // Works for all role combinations
}
```
