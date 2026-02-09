# AEGIS Browser Testing - Bug Report

**Date:** 2026-02-09
**Tester:** Claude (automated browser testing)
**Server:** localhost:3001 (Turbopack, FS cache disabled)
**User:** testadmin@aegis.test (CAE role, Apex Sahakari Bank tenant)

## Bugs Found — All Fixed

### BUG-001: Sidebar shows "No permissions assigned" but dashboard still loads — FIXED

- **Page:** Dashboard
- **Severity:** Low
- **Description:** New user without roles sees "No permissions assigned. Please contact administrator." in sidebar, but can still access dashboard and see all data. Sidebar navigation items are hidden.
- **Fix:** Added `needsSetup` check in dashboard layout (`src/app/(dashboard)/layout.tsx`). Users without `tenantId` or `roles` now see an "Account Setup Required" message instead of broken dashboard content.

---

### BUG-002: Finding detail page crashes - "tenantId not found in session" — FIXED

- **Page:** `/findings/[id]` (any tenant-scoped page)
- **Severity:** High
- **Description:** `extractTenantId()` threw a runtime error when `session.user.tenantId` was null, crashing the page with an unhandled exception.
- **Fix:** Replaced `throw new Error("tenantId not found in session")` with `redirect("/dashboard?setup=required")` in all 6 DAL files: `observations.ts`, `auditee.ts`, `exports.ts`, `dashboard.ts`, `reports.ts`, `notifications.ts`. Also added `user.additionalFields` in `auth.ts` to expose `tenantId`/`roles` in session.

---

### BUG-003: Finding detail page uses display ID (FND-001) instead of UUID — FIXED

- **Page:** `/findings/FND-001`
- **Severity:** Medium
- **Description:** JSON fallback in findings page used display IDs (FND-001) which are not valid UUIDs for the database lookup.
- **Fix:** Removed the JSON fallback entirely from `src/app/(dashboard)/findings/page.tsx`. The page now always reads from PostgreSQL via the DAL, which returns proper UUIDs. Also added `requirePermission("observation:read")` guard.

---

### BUG-004: Missing i18n translation keys for sidebar navigation — FIXED

- **Page:** All dashboard pages (sidebar renders on every page)
- **Severity:** Medium
- **Description:** Console errors for missing translation keys: `Navigation.auditTrail` and `Navigation.admin`.
- **Fix:** Added `"auditTrail": "Audit Trail"` and `"admin": "Admin"` keys to `messages/en.json` under the `Navigation` section.

---

### BUG-005: CAE role missing `admin:manage_settings` permission — FIXED

- **Page:** `/settings`
- **Severity:** Medium
- **Description:** No role had `admin:manage_settings` permission, making the settings page inaccessible to everyone.
- **Fix:** Added `admin:manage_settings` to the CAE role permissions in both `src/lib/permissions.ts` (ROLE_PERMISSIONS) and `src/lib/nav-items.ts` (getPermissionsForRole). Settings page now loads for CAE users.

---

### BUG-006: `findings/new` page has no permission guard — FIXED

- **Page:** `/findings/new`
- **Severity:** Low
- **Description:** Any authenticated user could access the Create Observation form. Only AUDITOR role has `observation:create` permission.
- **Fix:** Replaced `getRequiredSession()` with `requirePermission("observation:create")` in `src/app/(dashboard)/findings/new/page.tsx`. Users without the permission are now redirected to dashboard.

---

## Testing Summary

### Pages Tested (All returned HTTP 200 with valid auth)

| Page               | Route                     | Status | Notes                                    |
| ------------------ | ------------------------- | ------ | ---------------------------------------- |
| Login              | `/login`                  | PASS   | Sign in works correctly                  |
| Dashboard          | `/dashboard`              | PASS   | All widgets render                       |
| Compliance         | `/compliance`             | PASS   | 55 requirements, filters, trend chart    |
| Audit Plans        | `/audit-plans`            | PASS   | Calendar view, 8 audits                  |
| Findings List      | `/findings`               | PASS   | Severity cards, table with DB data       |
| Finding Detail     | `/findings/[uuid]`        | PASS   | Works with UUID from DB                  |
| Create Observation | `/findings/new`           | PASS   | Form loads with branch/area dropdowns    |
| Reports            | `/reports`                | PASS   | Board report generator, preview sections |
| Settings           | `/settings`               | PASS   | Bank profile form loads for CAE          |
| Notification Prefs | `/settings/notifications` | PASS   | Creates default prefs on first load      |
| Audit Trail        | `/audit-trail`            | PASS   | Table + filters render                   |
| Auditee Portal     | `/auditee`                | PASS   | Summary cards, observation list          |
| Auditee Detail     | `/auditee/[uuid]`         | PASS   | Loads observation detail                 |
| Admin Users        | `/admin/users`            | PASS   | User management table                    |
| Findings Export    | `/api/exports/findings`   | PASS   | CSV/JSON export endpoint                 |

### Known Issues (Not Bugs)

- Turbopack persistent FS cache causes corruption — disabled via `turbopackFileSystemCacheForDev: false`
- Missing database views (`v_compliance_summary`, `v_observation_severity`, etc.) — dashboard widgets gracefully degrade
