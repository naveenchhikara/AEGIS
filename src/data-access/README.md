# Data Access Layer (DAL)

Server-only modules that enforce multi-tenant data isolation via a 5-step security pattern.

## 5-Step Security Pattern

Every DAL function MUST follow this pattern:

```typescript
import "server-only"; // Step 0: Prevent client import
import { getRequiredSession } from "./session";
import { prismaForTenant } from "@/lib/prisma";

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

## Security Invariants

1. **server-only** — DAL modules cannot be imported in client components
2. **tenantId from session ONLY** — NEVER accept tenantId from URL, query params, or request body
3. **RLS via prismaForTenant()** — database-level row isolation per tenant
4. **Explicit WHERE** — every query includes `WHERE tenantId` (belt-and-suspenders with RLS)
5. **Runtime assertion** — verify returned data matches the expected tenantId

## Common Mistakes to Avoid

- Importing DAL in a `"use client"` component (use `import type` for types only)
- Using `$queryRaw` / `$executeRaw` without explicit tenantId parameter
- Accepting tenantId from function arguments instead of session
- Forgetting the runtime assertion on returned data
- Using `prisma` directly instead of `prismaForTenant(tenantId)`

## Modules

| Module             | Description                                            |
| ------------------ | ------------------------------------------------------ |
| `session.ts`       | Session management, tenantId source of truth           |
| `settings.ts`      | Tenant settings (bank profile) — canonical DAL example |
| `users.ts`         | User management (RBAC)                                 |
| `audit-context.ts` | Audit trail context for database triggers              |
| `index.ts`         | Barrel export for all DAL modules                      |

## Migration Checklist (JSON to PostgreSQL)

For each page being migrated from demo JSON to database:

1. Create DAL module in `src/data-access/<module>.ts`
2. Follow the 5-step pattern above
3. Create server action in `src/actions/<module>.ts` for mutations
4. Update page to server component calling DAL function
5. Extract client interactivity into `src/components/<feature>/<component>.tsx`
6. Add `import type` for shared types from `@/types`
7. Run `pnpm build` to verify no TypeScript errors
8. Test that existing JSON-based pages still work
