# Data Access Layer (DAL)

Server-only modules holding the tenant-scoped queries. Tenant isolation is
enforced **here, in application code** — see the warning below.

For how this layer fits the rest of the system, see
[`docs/architecture.md`](../../docs/architecture.md).

---

## There is no row-level security

`prismaForTenant(tenantId)` reads like an RLS helper. It is not one.

- **No RLS policies are active in the database.**
  `prisma/migrations/add_rls_policies.sql` exists in the repository but is not
  applied.
- `prismaForTenant()` validates that the tenant id is a well-formed UUID and
  returns the shared singleton client. **It adds no filtering.**

It once wrapped every query in a transaction with `SET LOCAL`. That was a no-op
without policies, and it caused P2028 timeouts under parallel SSR load — a
dashboard fires 10–15 queries at once and they competed for pool connections.
The wrapping was removed; see the architecture note in `src/lib/prisma.ts`.

**Every `WHERE tenantId` in this directory is load-bearing.** Removing one does
not fall back to a database guarantee, because there isn't one.

---

## The pattern

Every DAL function follows these five steps:

```typescript
import "server-only"; // 0. cannot be imported client-side
import { getRequiredSession } from "./session";
import { prismaForTenant } from "./prisma";

export async function getSomething() {
  // 1. tenantId from the session, and nowhere else
  const session = await getRequiredSession();
  const tenantId = session.user.tenantId;

  // 2. tenant-scoped client (validates the UUID)
  const db = prismaForTenant(tenantId);

  // 3. explicit WHERE — this is the actual isolation control
  const result = await db.someModel.findFirst({ where: { tenantId } });

  // 4. assert on the way out
  if (result && result.tenantId !== tenantId) {
    throw new Error("Data isolation violation detected");
  }

  return result;
}
```

For a list, assert across the batch:

```typescript
const mismatch = rows.find((r) => r.tenantId !== tenantId);
if (mismatch) throw new Error("Data isolation violation detected");
```

`getRequiredSession()` performs the single boundary cast to `AuthSession`, so
`session.user.tenantId` is typed `string` and `session.user.roles` is typed
`Role[]`. Downstream code needs no casts — if you find yourself writing
`as any`, something upstream is wrong.

---

## Invariants

1. **`server-only`** — DAL modules cannot be imported from a client component.
2. **`tenantId` from the session only** — never from a URL parameter, request
   body or query string.
3. **Explicit `WHERE tenantId` on every query** — the sole isolation control.
4. **Runtime assertion** on returned data.
5. **Raw SQL passes `tenantId` explicitly** — `$queryRaw` / `$executeRaw` are
   invisible to steps 3 and 4, so they must carry the predicate themselves.

`__tests__/tenant-isolation.test.ts` reads this directory statically and fails
the build when a function skips the pattern.

---

## Writes

Reads follow the pattern above. **Writes to an audited table must additionally
run inside `withAuditedMutation`**, which opens the transaction and sets the
PostgreSQL session context that the audit trigger reads:

```typescript
import { withAuditedMutation, userActor } from "@/data-access/audited-mutation";

await withAuditedMutation(userActor(session), "observation.created", async (tx) => {
  return tx.observation.create({ data: { tenantId, ... } });
});
```

- Four actions require a justification argument, enforced by the compiler:
  `finding.closed`, `user.role_changed`, `compliance.marked_na`,
  `observation.status_changed`.
- Scheduled work uses `systemActor(tenantId)` — the platform acting under
  policy, never attributed to a person who did not act.
- One transaction carries one tenant. Cross-tenant work groups by tenant and
  calls the wrapper once per group.

A hand-rolled `prisma.$transaction` that mutates an audited table writes an
`AuditLog` row with no attribution. `__tests__/audited-mutation-discipline.test.ts`
fails the build when one appears.

**Legacy:** ~63 files in `src/actions/` predate the wrapper and set the context
by hand with `setAuditContext` from `audit-context.ts`. They work and are
allowlisted with a ceiling that may only be lowered. Do not copy them into new
code; migrating one while you are in the file is welcome.

---

## Common mistakes

- Importing a DAL function into a `"use client"` component — use `import type`
  for types only.
- `$queryRaw` / `$executeRaw` without an explicit tenant predicate.
- Taking `tenantId` as a function argument from a caller that got it from a URL.
- Using `prisma` directly instead of `prismaForTenant(tenantId)`.
- Skipping the runtime assertion because "the `WHERE` already covers it" — the
  assertion is what catches a `WHERE` that was edited away.
- Adding a `NODE_ENV`-conditional cache to the Prisma singleton. That was a
  connection leak in production; see `src/lib/prisma.ts`.

---

## Modules

| Module                | Role                                                                  |
| --------------------- | --------------------------------------------------------------------- |
| `session.ts`          | `getRequiredSession()` — the source of truth for `tenantId` and roles |
| `prisma.ts`           | Re-exports the client and `prismaForTenant()` from `@/lib/prisma`     |
| `audited-mutation.ts` | `withAuditedMutation()`, `userActor()`, `systemActor()`               |
| `audit-context.ts`    | Legacy `setAuditContext()` — allowlisted call sites only              |
| `settings.ts`         | Tenant settings — the canonical example of the read pattern           |
| `index.ts`            | Barrel export                                                         |

The remaining 46 modules are per-domain query collections named after their
domain (`observations.ts`, `rbia-scoring.ts`, `compliance.ts`, …).

---

## Note on scope

Most server actions call `prismaForTenant()` directly rather than routing
through a function here, so this layer is a **shared-query library, not a strict
gateway**. The tenant pattern is enforced by the discipline test either way. When
a query is used by more than one caller, it belongs here.
