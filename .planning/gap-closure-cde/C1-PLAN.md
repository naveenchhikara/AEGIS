---
module: C
plan: C1
phase: 03-grc
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/(dashboard)/risk-management/page.tsx
  - src/components/risk-management/risk-register-table.tsx
  - src/components/risk-management/kri-dashboard.tsx
autonomous: true
gap_closure: true

must_haves:
  truths:
    - "Risk Management page displays real audit universe entities from database"
    - "Risk Register table shows actual risk entries with severity scores"
    - "KRI Dashboard displays current breach status for monitored indicators"
    - "Users can view linked controls and audit engagements per risk"
  artifacts:
    - path: "src/app/(dashboard)/risk-management/page.tsx"
      provides: "Server component fetching real risk data via DAL"
      min_lines: 40
      pattern: "getRiskRegisters|getBreachedKRIs"
    - path: "src/components/risk-management/risk-register-table.tsx"
      provides: "Table component rendering real risk register entries"
      pattern: "manageRisk|acceptRisk"
    - path: "src/components/risk-management/kri-dashboard.tsx"
      provides: "KRI monitoring dashboard with breach alerts"
      pattern: "breachStatus"
  key_links:
    - from: "src/app/(dashboard)/risk-management/page.tsx"
      to: "src/data-access/risk-management.ts"
      via: "getRiskRegisters, getBreachedKRIs function calls"
      pattern: "await getRiskRegisters\\(session"
    - from: "src/components/risk-management/risk-register-table.tsx"
      to: "src/actions/risk-management/manage-risk.ts"
      via: "Client form submitting to manageRisk action"
      pattern: "manageRisk"
---

<objective>
Wire the `/risk-management` page to real database via existing DAL functions and server actions.

**Purpose:** Close R49-R53 gaps by replacing mock arrays with actual risk register, audit universe entities, and KRI data from the database.

**Output:** Working risk management dashboard showing real tenant data with functional create/update/delete flows.
</objective>

<execution_context>
@/Users/admin/.claude/get-shit-done/workflows/execute-plan.md
@/Users/admin/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/VALIDATION-REPORT.md
@.planning/codebase/CONVENTIONS.md
@src/data-access/risk-management.ts
@src/actions/risk-management/manage-entity.ts
@src/actions/risk-management/manage-risk.ts
</context>

<tasks>

<task type="auto">
  <name>Wire risk-management page to real DAL</name>
  <files>
    src/app/(dashboard)/risk-management/page.tsx
  </files>
  <action>
Replace mock data arrays with real DAL calls:

1. Import DAL functions from `@/data-access/risk-management`:
   - `getRiskRegisters()`
   - `getBreachedKRIs()`

2. Replace `const risks: any[] = [];` with:

   ```typescript
   const risks = await getRiskRegisters(session);
   ```

3. Replace `const kriData: any[] = [];` with:

   ```typescript
   const kriData = await getBreachedKRIs(session);
   ```

4. Add proper error handling (try-catch with user-friendly error display)

5. Ensure types match DAL return types (no `any[]`)

**Pattern:** Follow server component pattern from CONVENTIONS.md:

- Direct async data fetching in server component
- Pass data as props to client components
- Use `getRequiredSession()` for tenant context
  </action>
  <verify>

```bash
cd /root/.openclaw/workspace/AEGIS
pnpm exec tsc --noEmit --pretty false | grep -E "risk-management/page.tsx|error TS"
```

Exit code 0 = TypeScript clean.

Navigate to http://localhost:3000/risk-management and verify:

- Page loads without 500 error
- No mock data placeholders visible
- Empty state shows if no risk entries exist
- If risk data exists, table renders with real rows
  </verify>
  <done>
- `/risk-management` page calls `getRiskRegisters()` and `getBreachedKRIs()`
- TypeScript compilation passes with no errors
- Page renders without runtime errors
- Real database data displayed (or empty state if no data)
  </done>
  </task>

<task type="auto">
  <name>Wire client components to server actions</name>
  <files>
    src/components/risk-management/risk-register-table.tsx
    src/components/risk-management/kri-dashboard.tsx
  </files>
  <action>
Wire interactive features to existing server actions:

**In risk-register-table.tsx:**

1. Import actions:

   ```typescript
   import { manageRisk } from "@/actions/risk-management/manage-risk";
   import { acceptRisk } from "@/actions/issues/accept-risk";
   ```

2. Replace placeholder form handlers with real action calls:
   - Create/edit risk dialog → submit to `manageRisk()`
   - Accept risk button → call `acceptRisk()`

3. Use `useActionState` hook for form submission (per CONVENTIONS.md)

4. Add toast notifications for success/error feedback

5. Ensure proper revalidation after mutations (actions already call `revalidatePath`)

**In kri-dashboard.tsx:**

- Display `breachStatus` field from KRI records
- Color-code breach levels (WARNING=yellow, BREACH=red)
- Show currentValue vs threshold with visual indicator
- No mutations needed (read-only dashboard)

**Pattern:** Follow client component + server action pattern from CONVENTIONS.md.
</action>
<verify>

```bash
# TypeScript check
cd /root/.openclaw/workspace/AEGIS
pnpm exec tsc --noEmit --pretty false | grep -E "risk-register-table.tsx|kri-dashboard.tsx|error TS"
```

Manual testing:

1. Create a new risk entry via form
2. Verify toast notification appears
3. Refresh page → new risk appears in table
4. Edit a risk → changes persist
5. KRI dashboard shows breach status with correct color coding
   </verify>
   <done>

- Risk register table has working create/edit forms calling `manageRisk()`
- Accept risk button calls `acceptRisk()` action
- Toast notifications display success/error feedback
- KRI dashboard renders breach status with color indicators
- All TypeScript errors resolved
  </done>
  </task>

</tasks>

<verification>
**Overall checks:**

1. TypeScript compilation:

```bash
cd /root/.openclaw/workspace/AEGIS
pnpm exec tsc --noEmit
```

2. Page loads without errors:
   - Navigate to `/risk-management`
   - Verify no console errors
   - Verify no 500 server errors

3. Data flows end-to-end:
   - Page fetches real data from DAL
   - Empty state shows if no data
   - Real data renders in tables
   - Form submissions call server actions
   - Mutations persist to database
   - Revalidation refreshes page data

4. Tenant isolation:
   - DAL calls use `prismaForTenant(tenantId)`
   - No cross-tenant data leakage
     </verification>

<success_criteria>

- ✅ `/risk-management` page replaced mock arrays with DAL calls
- ✅ Risk register displays real database entries
- ✅ KRI dashboard shows actual breach monitoring data
- ✅ Create/edit forms submit to `manageRisk()` action
- ✅ Accept risk button wired to `acceptRisk()` action
- ✅ TypeScript compilation clean
- ✅ Page loads without errors
- ✅ Toast notifications for user feedback
- ✅ R49-R51 requirements marked as implemented
  </success_criteria>

<output>
After completion, update VALIDATION-REPORT.md:
- R49: ✅ (Audit universe entities displayed from real data)
- R50: ✅ (Risk register with real entity linkage, risk scores, owners)
- R51: ✅ (KRI dashboard with breach status monitoring)
</output>
