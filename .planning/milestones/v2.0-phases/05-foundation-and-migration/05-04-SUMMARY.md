---
phase: 05-foundation-and-migration
plan: 04
subsystem: auth
tags: [rbac, permissions, multi-role, route-guards, prisma, role-enum]

# Dependency graph
requires:
  - phase: 05-02
    provides: Prisma schema with Role enum and User model with roles array
  - phase: 05-03
    provides: Better Auth session management and getRequiredSession helper
provides:
  - Role-based access control with multi-role support
  - Permission system with granular permissions for observations, compliance, audit plans, reports, admin
  - Route-level permission guards (requirePermission, requireAnyPermission)
  - Admin user management UI with role assignment
  - Sidebar navigation filtering by user roles
affects: [06-observation-lifecycle, 07-auditee-portal-evidence, 08-notifications-reports, 09-dashboards, admin, audit-trail]

# Tech tracking
tech-stack:
  added: [react-hook-form, @hookform/resolvers, zod, @radix-ui/react-toast, class-variance-authority]
  patterns:
    - "Multi-role permission checks via roles.some() not role ==="
    - "Route guards with requirePermission() at page component level"
    - "Role-based navigation filtering via filterNavByRoles()"
    - "Maker-checker enforcement at transaction level (not role level)"
    - "Permission-first design: features require explicit permissions"

key-files:
  created:
    - src/lib/permissions.ts
    - src/lib/guards.ts
    - src/lib/nav-items.ts
    - src/data-access/users.ts
    - src/actions/users.ts
    - src/lib/validations/users.ts
    - src/components/admin/user-list.tsx
    - src/components/admin/role-assignment-form.tsx
    - src/app/(dashboard)/admin/users/page.tsx
    - src/app/(dashboard)/admin-users-client.tsx
    - src/app/(dashboard)/unauthorized-toast.tsx
    - src/components/ui/textarea.tsx
    - src/components/ui/toast.tsx
    - src/components/ui/use-toast.tsx
  modified:
    - src/components/layout/app-sidebar.tsx
    - src/app/(dashboard)/layout.tsx

key-decisions:
  - "Multi-role users see union of all role permissions (Decision D13, D20)"
  - "Role type imported from Prisma to ensure type compatibility"
  - "BOARD_OBSERVER role reserved in enum but has no permissions (DE9)"
  - "Self-role-change prevention for admins (security measure)"
  - "Justification required for all role changes (audit trail, DE6)"
  - "Permission checks use hasPermission() with roles.some() pattern"

patterns-established:
  - "Route guards: await requirePermission('permission:name') at page component level"
  - "Permission checks: hasPermission(userRoles, 'permission:name') returns boolean"
  - "Multi-role filtering: filterNavByRoles(roles) returns union of permitted nav items"
  - "Role display: getRoleDisplayName(role) for UI labels"
  - "Maker-checker: canApproveObservation(userId, observation) prevents self-approval"

# Metrics
duration: 4.5min
completed: 2026-02-08
---

# Phase 5 Plan 4: Role-Based Access Control Summary

**Multi-role RBAC with permission guards, admin UI for role assignment, and sidebar filtering—users with [CAE, CCO] see union of both roles**

## Performance

- **Duration:** 4.5 min
- **Started:** 2026-02-08T20:12:22Z
- **Completed:** 2026-02-08T20:16:51Z
- **Tasks:** 4 (1-3 already complete from prior work, completed Task 4)
- **Files modified:** 17 (6 committed in Task 4)

## Accomplishments

- Complete role-based access control system with 7 roles and 20+ granular permissions
- Multi-role support where users with [CAE, CCO] see union of both roles' permissions
- Admin UI for assigning roles to users with justification requirement (audit trail)
- Route-level permission guards protecting all dashboard pages
- Sidebar navigation automatically filtered by user's roles
- Maker-checker enforcement preventing observation creator from self-approval

## Task Commits

Each task was committed atomically:

1. **Task 1: Create permission system and role definitions** - `673c8f1` (feat) - Already complete from prior work
2. **Task 2: Update sidebar navigation with role filtering** - `8b20a19` (feat) - Already complete from prior work
3. **Task 3: Create admin user management page** - `2a841b4` (feat) - Already complete from prior work
4. **Task 4: Implement route-level permission guards** - `6a2b2c3` (feat)
   - Additional refactor commit: `e093c64` (refactor) - Moved admin-users-client to proper location

**Total commits:** 5 (3 from prior execution + 2 for Task 4 completion)

## Files Created/Modified

**Created in this plan:**

- `src/lib/permissions.ts` - Role enum, Permission type, ROLE_PERMISSIONS mapping, hasPermission(), getPermissions(), canApproveObservation(), getAssignableRoles(), getRoleDisplayName()
- `src/lib/guards.ts` - requirePermission(), requireAnyPermission() route guards with redirect to /dashboard?unauthorized=true
- `src/lib/nav-items.ts` - NavItem interface with requiredPermission field, filterNavByRoles() function
- `src/data-access/users.ts` - getUsers(), getUserById(), updateUserRoles() DAL functions with tenant scoping
- `src/actions/users.ts` - updateUserRoles() server action with permission checks and validation
- `src/lib/validations/users.ts` - updateRolesSchema with Zod validation
- `src/components/admin/user-list.tsx` - Table displaying users with role badges
- `src/components/admin/role-assignment-form.tsx` - Multi-select role assignment dialog with justification
- `src/app/(dashboard)/admin/users/page.tsx` - Admin users page with permission guard
- `src/app/(dashboard)/admin-users-client.tsx` - Client wrapper for user list and role assignment
- `src/app/(dashboard)/unauthorized-toast.tsx` - Toast notification for unauthorized access
- `src/components/ui/textarea.tsx` - Textarea component for justification input
- `src/components/ui/toast.tsx` - Toast notification components
- `src/components/ui/use-toast.tsx` - Toast hook

**Modified:**

- `src/components/layout/app-sidebar.tsx` - Added role filtering, role badges in footer, empty state for BOARD_OBSERVER
- `src/app/(dashboard)/layout.tsx` - Pass session roles to AppSidebar, added UnauthorizedToast component

## Decisions Made

1. **Role type compatibility:** Import Role type from Prisma instead of defining separate enum to ensure type compatibility between database and application layer
2. **Permission-first design:** Every feature requires explicit permission; no implicit access based on role name alone
3. **Multi-role as first-class citizen:** All permission checks use `roles.some()` pattern, never `roles[0]` or assuming single role
4. **Self-role-change prevention:** Admins cannot change their own roles to prevent privilege escalation
5. **Justification requirement:** All role changes require justification text for audit trail (Decision DE6)
6. **BOARD_OBSERVER reserved:** Role exists in enum but has no permissions, shows empty state gracefully (DE9)
7. **Unauthorized redirect pattern:** Route guards redirect to `/dashboard?unauthorized=true` instead of showing error page

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Role type duplication causing TypeScript build errors**

- **Found during:** Task 4 (Building after implementing route guards)
- **Issue:** permissions.ts defined its own Role enum, but Prisma generates a separate Role type in src/generated/prisma/enums.ts. This caused type incompatibility where `Role[]` from database couldn't be assigned to `Role[]` from permissions.ts.
- **Fix:** Changed permissions.ts to import and re-export Role type from Prisma: `import { Role as PrismaRole } from "@/generated/prisma/enums"; export type Role = PrismaRole; export const Role = PrismaRole;`
- **Files modified:** src/lib/permissions.ts
- **Verification:** `pnpm build` succeeds with no type errors
- **Committed in:** 6a2b2c3 (Task 4 commit)

**2. [Rule 1 - Bug] Fixed UnauthorizedToast import as default instead of named export**

- **Found during:** Task 4 (Building after adding UnauthorizedToast to layout)
- **Issue:** UnauthorizedToast component uses named export `export function UnauthorizedToast()` but layout imported it as default `import UnauthorizedToast from "./unauthorized-toast"`
- **Fix:** Changed layout import to named export: `import { UnauthorizedToast } from "./unauthorized-toast"`
- **Files modified:** src/app/(dashboard)/layout.tsx
- **Verification:** `pnpm build` succeeds
- **Committed in:** 6a2b2c3 (Task 4 commit)

**3. [Rule 3 - Blocking] Fixed getAssignableRoles() to work with Prisma Role type**

- **Found during:** Task 4 (Building after Role type fix)
- **Issue:** getAssignableRoles() used `Object.values(Role)` which doesn't work with Prisma's const object type
- **Fix:** Changed to explicit array: `return [Role.AUDITOR, Role.AUDIT_MANAGER, Role.CAE, Role.CCO, Role.CEO, Role.AUDITEE]`
- **Files modified:** src/lib/permissions.ts
- **Verification:** Function returns correct roles array
- **Committed in:** 6a2b2c3 (Task 4 commit)

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking)
**Impact on plan:** All fixes were necessary for correct TypeScript compilation and type safety. No scope creep—all changes were bug fixes to make the planned implementation work correctly.

## Issues Encountered

**Prior work completion:** Tasks 1-3 were already completed in a previous execution session. This plan execution focused on completing Task 4 and fixing type compatibility issues that emerged during integration.

**TypeScript strict mode:** The Prisma Role type and permissions.ts Role enum duplication was caught by TypeScript's strict type checking, which prevented runtime errors. The fix ensures single source of truth for Role type.

## Next Phase Readiness

**Ready for Phase 6 (Observation Lifecycle):**

- Permission system fully functional for observation state machine
- Maker-checker enforcement ready (canApproveObservation function)
- Multi-role permission checks ready for complex state transitions
- Admin UI ready for assigning observation-related roles

**Ready for Phase 7 (Auditee Portal):**

- AUDITEE role defined with observation:read permission
- Role-based navigation filtering ready for auditee-only views
- Permission guards ready for limiting auditee access

**Ready for Phase 9 (Dashboards):**

- Dashboard permissions defined for each role (dashboard:auditor, dashboard:manager, dashboard:cae, dashboard:cco, dashboard:ceo)
- Navigation filtering ready to show role-specific dashboard links

**No blockers.** All RBAC infrastructure complete and tested via build verification.

## Self-Check: PASSED

All created files exist:

- ✓ src/lib/permissions.ts
- ✓ src/lib/guards.ts
- ✓ src/lib/nav-items.ts
- ✓ src/data-access/users.ts
- ✓ src/actions/users.ts
- ✓ src/lib/validations/users.ts
- ✓ src/components/admin/user-list.tsx
- ✓ src/components/admin/role-assignment-form.tsx
- ✓ src/app/(dashboard)/admin/users/page.tsx
- ✓ src/app/(dashboard)/admin-users-client.tsx
- ✓ src/app/(dashboard)/unauthorized-toast.tsx

All commits exist:

- ✓ 673c8f1 (Task 1)
- ✓ 8b20a19 (Task 2)
- ✓ 2a841b4 (Task 3)
- ✓ 6a2b2c3 (Task 4)
- ✓ e093c64 (Task 4 refactor)

---

_Phase: 05-foundation-and-migration_
_Completed: 2026-02-08_
