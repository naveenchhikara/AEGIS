# Plan 03: Typed Session Helpers — Eliminate ~417 `as any` Casts

---

wave: 1
depends_on: []
files_modified:

- src/data-access/session.ts
- src/lib/auth.ts
- src/actions/\*_/_.ts (108 occurrences across 70 files)
- src/data-access/\*_/_.ts (137 occurrences across 29 files)
- src/app/\*_/_.ts (20 occurrences across 36 files)
- src/app/api/exports/compliance/route.ts
- src/app/api/exports/findings/route.ts
- src/app/api/exports/audit-plans/route.ts
  autonomous: true
  requirements: []

---

## Objective

Eliminate ~417 `as any` casts related to session user properties (`tenantId`, `roles`, `tenantName`) by creating a properly typed session interface. This improves type safety, IDE autocomplete, and makes `tenantId` access compile-time checked rather than runtime-only.

## Context

`getRequiredSession()` returns Better Auth's inferred `Session` type where `user.tenantId` is `string | null | undefined` and `user.roles` is `string[] | null | undefined`. Every call site uses `(session.user as any).tenantId as string` to bypass this — 269 occurrences for tenantId, 138 for roles. Additionally, 3 files access `tenantName` which doesn't exist on the session at all (always returns `undefined`).

The fix: define a `TypedSession` type at the boundary in `session.ts`, cast once there, and update all call sites to use the clean type.

## Tasks

<task id="3.1">
**Define TypedSession type in src/lib/auth.ts**

Export a narrowed session type from `src/lib/auth.ts`:

```typescript
import type { Role } from "@/generated/prisma";

// After the existing Session export
export type SessionUser = Session["user"] & {
  tenantId: string;
  roles: Role[];
};

export type AuthSession = Omit<Session, "user"> & {
  user: SessionUser;
};
```

This declares that for authenticated, onboarded users, `tenantId` is always `string` and `roles` is always `Role[]`.
</task>

<task id="3.2">
**Update getRequiredSession() return type in session.ts**

In `src/data-access/session.ts`, change the return type of `getRequiredSession()`:

```typescript
import type { AuthSession } from "@/lib/auth";

export async function getRequiredSession(): Promise<AuthSession> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  // Single cast at the boundary — all downstream code gets clean types
  return session as unknown as AuthSession;
}
```

Also update `getCurrentTenantId()` and `getSessionRoles()` to use the typed session:

```typescript
export async function getCurrentTenantId(): Promise<string> {
  const session = await getRequiredSession();
  return session.user.tenantId; // No cast needed
}

export async function getSessionRoles(): Promise<Role[]> {
  const session = await getRequiredSession();
  return session.user.roles; // No cast needed
}
```

</task>

<task id="3.3">
**Bulk replace `(session.user as any).tenantId as string` across src/data-access/**

In all 29 files under `src/data-access/`, replace:

```typescript
const tenantId = (session.user as any).tenantId as string;
```

with:

```typescript
const tenantId = session.user.tenantId;
```

This is a mechanical find-and-replace. The 137 occurrences should all follow this exact pattern.

Also handle the variant where `{ tenantId }` is destructured:

```typescript
// Before:
const { tenantId } = session.user as any;
// After:
const { tenantId } = session.user;
```

</task>

<task id="3.4">
**Bulk replace `(session.user as any).tenantId as string` across src/actions/**

In all 70 files under `src/actions/`, replace the same pattern (108 occurrences):

```typescript
const tenantId = (session.user as any).tenantId as string;
```

with:

```typescript
const tenantId = session.user.tenantId;
```

</task>

<task id="3.5">
**Bulk replace `((session.user as any).roles ?? []) as Role[]` across all files**

In all 99 files with roles access (138 occurrences), replace:

```typescript
const userRoles = ((session.user as any).roles ?? []) as Role[];
```

with:

```typescript
const userRoles = session.user.roles;
```

Also handle variants:

```typescript
// Before:
const roles = (session.user as any).roles || [];
// After:
const roles = session.user.roles;

// Before:
if (!((session.user as any).roles as Role[]).some(...))
// After:
if (!session.user.roles.some(...))
```

Note: since `roles` is typed as `Role[]` (non-nullable) in `SessionUser`, the `?? []` fallback is no longer needed.
</task>

<task id="3.6">
**Fix `const user = session.user as any` pattern (5 occurrences)**

In `src/actions/admin/manage-templates.ts` and `src/actions/admin/manage-calendar.ts`, replace:

```typescript
const user = session.user as any;
const tenantId = user.tenantId;
const roles = user.roles;
```

with:

```typescript
const { tenantId, roles } = session.user;
```

</task>

<task id="3.7">
**Fix tenantName bug in 3 export routes**

In these files, `tenantName` is accessed via `as any` but doesn't exist on the session:

- `src/app/api/exports/compliance/route.ts`
- `src/app/api/exports/findings/route.ts`
- `src/app/api/exports/audit-plans/route.ts`

Replace:

```typescript
const tenantName = (session.user as any).tenantName ?? "AEGIS Audit Platform";
```

with a proper tenant lookup:

```typescript
const tenant = await prismaForTenant(tenantId).tenant.findUnique({
  where: { id: tenantId },
  select: { name: true },
});
const tenantName = tenant?.name ?? "AEGIS Audit Platform";
```

Or, if tenant data is already loaded in the page context, use that instead.
</task>

<task id="3.8">
**Update src/app/ page/route files (20 occurrences)**

In ~36 files under `src/app/` (server components and API routes), apply the same replacement patterns from tasks 3.3-3.5.
</task>

<task id="3.9">
**Verify: Zero `as any` session casts remain, TypeScript compiles**

1. Run `pnpm tsc --noEmit` — must pass
2. Run: `grep -r "session.user as any" src/ --include="*.ts" --include="*.tsx" -l` — must return 0 files
3. Run: `grep -r "as any).tenantId" src/ --include="*.ts" --include="*.tsx" -l` — must return 0 files
4. Run: `grep -r "as any).roles" src/ --include="*.ts" --include="*.tsx" -l` — must return 0 files
   </task>

## Verification Criteria

- [ ] `AuthSession` type defined with `tenantId: string` and `roles: Role[]`
- [ ] `getRequiredSession()` returns `AuthSession` type
- [ ] Zero `(session.user as any)` patterns remain in codebase
- [ ] `tenantName` bug fixed in 3 export routes (no longer accessing non-existent property)
- [ ] `pnpm tsc --noEmit` passes
- [ ] No runtime regressions (session data still flows correctly)

## must_haves

- Single boundary cast in getRequiredSession(), zero casts downstream
- All 417 `as any` session casts eliminated
- TypeScript compiles clean
- tenantName bug fixed (3 files)
