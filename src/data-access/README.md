# Data Access Layer (DAL)

Server-only modules that enforce multi-tenant data isolation via a 5-step security pattern.

## Table of Contents

- [5-Step Security Pattern](#5-step-security-pattern)
- [Security Invariants](#security-invariants)
- [Common Mistakes to Avoid](#common-mistakes-to-avoid)
- [Modules](#modules)
- [Migration Checklist (JSON to PostgreSQL)](#migration-checklist-json-to-postgresql)
- [Examples](#examples)

---

## 5-Step Security Pattern

Every DAL function MUST follow this pattern:

```typescript
import "server-only"; // Step 0: Prevent client import
import { getRequiredSession } from "./session";
import { prismaForTenant } from "./prisma";

export async function getSomething() {
  // Step 1: Get session — tenantId from session ONLY (S2)
  const session = await getRequiredSession();
  const tenantId = (session.user as any).tenantId as string;

  // Step 2: Tenant-scoped Prisma client — RLS isolation
  const db = prismaForTenant(tenantId);

  // Step 3: Explicit WHERE tenantId — belt-and-suspenders (S1)
  const result = await db.someModel.findFirst({
    where: { tenantId },
  });

  // Step 4: Runtime assertion — verify data matches
  if (result && result.tenantId !== tenantId) {
    console.error("CRITICAL: Tenant ID mismatch", {
      expected: tenantId,
      received: result.tenantId,
    });
    throw new Error("Data isolation violation detected");
  }

  return result;
}
```

---

## Security Invariants

1. **server-only** — DAL modules cannot be imported in client components
2. **tenantId from session ONLY** — NEVER accept tenantId from URL, query params, or request body
3. **RLS via prismaForTenant()** — database-level row isolation per tenant
4. **Explicit WHERE** — every query includes `WHERE tenantId` (belt-and-suspenders with RLS)
5. **Runtime assertion** — verify returned data matches to expected tenantId

---

## Common Mistakes to Avoid

- Importing DAL in a `"use client"` component (use `import type` for types only)
- Using `$queryRaw` / `$executeRaw` without explicit tenantId parameter
- Accepting tenantId from function arguments instead of session
- Forgetting to runtime assertion on returned data
- Using `prisma` directly instead of `prismaForTenant(tenantId)`

---

## Modules

| Module             | Description                                            |
| ------------------ | ------------------------------------------------------ |
| `session.ts`       | Session management, tenantId source of truth           |
| `prisma.ts`        | Tenant-scoped Prisma client with RLS                   |
| `settings.ts`      | Tenant settings (bank profile) — canonical DAL example |
| `users.ts`         | User management (RBAC)                                 |
| `audit-context.ts` | Audit trail context for database triggers              |
| `index.ts`         | Barrel export for all DAL modules                      |

---

## Migration Checklist (JSON to PostgreSQL)

For each page being migrated from demo JSON to database:

### 1. Create or Update DAL Module

- [ ] Follow 5-step pattern (server-only → session → prismaForTenant → WHERE → assertion)
- [ ] Add `server-only` import at top
- [ ] Use `getRequiredSession()` for tenantId
- [ ] Use `prismaForTenant(tenantId)` for queries
- [ ] Add explicit `WHERE tenantId` clause
- [ ] Add runtime assertion after query

### 2. Update Server Component

- [ ] Import DAL function from `@/data-access`
- [ ] Call DAL function in server component (no async in client)
- [ ] Pass data as props to client component
- [ ] Add permission check with `requirePermission()`

### 3. Create or Update Client Component

- [ ] `"use client"` directive
- [ ] Receive data as props (no async fetch in client)
- [ ] Handle form state with useState
- [ ] Call server action for mutations
- [ ] Show loading state during save
- [ ] Show success/error toasts

### 4. Create Server Action (if mutations needed)

- [ ] `"use server"` directive
- [ ] Import from DAL (session, prismaForTenant)
- [ ] Add Zod validation schema
- [ ] Check permissions with `hasPermission()`
- [ ] Set audit context if applicable
- [ ] Use transaction for atomic updates
- [ ] Revalidate path after successful update

### 5. Verification

- [ ] Build passes (`pnpm build`)
- [ ] No TypeScript errors
- [ ] Page loads from PostgreSQL (not JSON)
- [ ] Editable fields can be updated
- [ ] Read-only fields are disabled
- [ ] Non-admin users get redirected

### 6. Update Barrel Export

- [ ] Add new DAL exports to `src/data-access/index.ts`
- [ ] Export types as needed

---

## Examples

### Example 1: Single Entity Query (settings.ts)

```typescript
import "server-only";
import { getRequiredSession } from "./session";
import { prismaForTenant } from "./prisma";

export async function getTenantSettings() {
  const session = await getRequiredSession();
  const tenantId = session.user.tenantId as string;
  const db = prismaForTenant(tenantId);

  const tenant = await db.tenant.findFirst({
    where: { id: tenantId }, // Explicit WHERE
    select: {
      id: true,
      name: true,
      // ... other fields
    },
  });

  // Runtime assertion
  if (tenant && tenant.id !== tenantId) {
    console.error("CRITICAL: Tenant ID mismatch");
    throw new Error("Data isolation violation detected");
  }

  return tenant;
}
```

### Example 2: Multi-Entity Query (users.ts)

```typescript
export async function getUsers(filters?: { role?: string }) {
  const session = await getRequiredSession();
  const tenantId = session.user.tenantId as string;
  const db = prismaForTenant(tenantId);

  const users = await db.user.findMany({
    where: {
      tenantId,
      ...(filters?.role && { roles: { has: filters.role } }),
    },
    select: {
      id: true,
      email: true,
      name: true,
      roles: true,
      // ... other fields
    },
  });

  // Batch assertion
  const mismatch = users.find((u) => u.tenantId !== tenantId);
  if (mismatch) {
    console.error("CRITICAL: Tenant ID mismatch");
    throw new Error("Data isolation violation detected");
  }

  return users;
}
```

### Example 3: Server Action for Mutation

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";

const schema = z.object({
  name: z.string().min(1),
  // ... other fields
});

export async function updateEntity(data: z.infer<typeof schema>) {
  const session = await getRequiredSession();
  const tenantId = session.user.tenantId as string;
  const db = prismaForTenant(tenantId);

  const validated = schema.parse(data);

  await db.$transaction(async (tx) => {
    // Set audit context
    await setAuditContext(tx, {
      actionType: "entity.updated",
      userId: session.user.id,
      tenantId,
      ipAddress: (await headers()).get("x-forwarded-for") ?? "",
      sessionId: session.session.id,
    });

    // Update with explicit WHERE
    await tx.entity.update({
      where: { id: data.id, tenantId },
      data: validated,
    });
  });

  revalidatePath("/path");
}
```
