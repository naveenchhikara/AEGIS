---
module: C
plan: C2
phase: 03-grc
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/(dashboard)/controls/page.tsx
  - src/app/(dashboard)/work-program/page.tsx
  - src/components/controls/control-library-table.tsx
autonomous: true
gap_closure: true

must_haves:
  truths:
    - "Controls page displays real control library entries from database"
    - "Users can view control effectiveness scores and test procedures"
    - "Work program page shows audit engagement work items with execution status"
    - "Users can execute work program items and record results"
  artifacts:
    - path: "src/app/(dashboard)/controls/page.tsx"
      provides: "Server component fetching control library data"
      min_lines: 30
      pattern: "getControls"
    - path: "src/app/(dashboard)/work-program/page.tsx"
      provides: "Server component fetching work program items"
      pattern: "getWorkProgramItems"
    - path: "src/components/controls/control-library-table.tsx"
      provides: "Table rendering controls with effectiveness analytics"
      pattern: "manageControl"
  key_links:
    - from: "src/app/(dashboard)/controls/page.tsx"
      to: "src/data-access/control-library.ts"
      via: "getControls function call"
      pattern: "await getControls\\(session"
    - from: "src/app/(dashboard)/work-program/page.tsx"
      to: "src/data-access/work-program.ts"
      via: "getWorkProgramItems function call"
      pattern: "await getWorkProgramItems"
    - from: "components"
      to: "src/actions/control-library/manage-control.ts"
      via: "Form submission to manageControl action"
      pattern: "manageControl"
---

<objective>
Wire `/controls` and `/work-program` pages to real database via existing DAL functions and server actions.

**Purpose:** Close R54-R57 gaps by replacing mock data with actual control library entries, test procedures, and work program execution tracking.

**Output:** Working control library and work program pages with functional CRUD and execution workflows.
</objective>

<execution_context>
@/Users/admin/.claude/get-shit-done/workflows/execute-plan.md
@/Users/admin/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/VALIDATION-REPORT.md
@.planning/codebase/CONVENTIONS.md
@src/data-access/control-library.ts
@src/data-access/work-program.ts
@src/actions/control-library/manage-control.ts
@src/actions/work-program/execute-item.ts
@src/actions/work-program/generate-program.ts
</context>

<tasks>

<task type="auto">
  <name>Wire controls page to real DAL</name>
  <files>
    src/app/(dashboard)/controls/page.tsx
    src/components/controls/control-library-table.tsx
  </files>
  <action>
**In controls/page.tsx:**

1. Import DAL functions:

   ```typescript
   import { getControls } from "@/data-access/control-library";
   ```

2. Replace mock data with real fetch:

   ```typescript
   const controls = await getControls(session);
   ```

3. Pass `controls` prop to `ControlLibraryTable` component

4. Add error handling wrapper

**In control-library-table.tsx:**

1. Import server action:

   ```typescript
   import { manageControl } from "@/actions/control-library/manage-control";
   ```

2. Wire create/edit control dialog:
   - Use `useActionState` for form submission
   - Submit to `manageControl()` action
   - Display toast on success/error

3. Render control effectiveness scores (if available in data)

4. Show linked test procedures count per control

**Pattern:** Follow standard server component → DAL → client component → action flow from CONVENTIONS.md.
</action>
<verify>

```bash
cd /root/.openclaw/workspace/AEGIS
pnpm exec tsc --noEmit --pretty false | grep -E "controls/page.tsx|control-library-table.tsx|error TS"
```

Manual checks:

- Navigate to `/controls`
- Page loads without 500 error
- Control library table displays real entries (or empty state)
- Create control dialog submits successfully
- Toast notification appears after submission
  </verify>
  <done>
- Controls page calls `getControls()` from DAL
- Control library table receives real data as props
- Create/edit forms call `manageControl()` action
- TypeScript compilation clean
- Page renders without errors
  </done>
  </task>

<task type="auto">
  <name>Wire work-program page to real DAL and actions</name>
  <files>
    src/app/(dashboard)/work-program/page.tsx
  </files>
  <action>
**In work-program/page.tsx:**

1. Import DAL and actions:

   ```typescript
   import { getWorkProgramItems } from "@/data-access/work-program";
   import { getActiveEngagements } from "@/data-access/audit-execution";
   ```

2. Replace mock data:

   ```typescript
   // Get current/active engagements for filter dropdown
   const engagements = await getActiveEngagements(session);

   // Get work program items (optionally filter by engagement)
   const workItems = await getWorkProgramItems(session, {
     engagementId: searchParams.engagementId,
   });
   ```

3. Render work program items table with:
   - Test procedure name
   - Assigned auditor
   - Status (NOT_STARTED, IN_PROGRESS, COMPLETED)
   - Result (PASSED, FAILED, NA)
   - Execute button (opens dialog)

4. Wire execute dialog:
   - Import `executeWorkProgramItem` action
   - Form fields: result, actualSampleSize, observations, evidenceRefs
   - Submit via `useActionState` in client component
   - Revalidate on success

**Note:** Per VALIDATION-REPORT.md, `generateWorkProgram` action exists but is not auto-triggered on engagement initiation. This plan focuses on UI wiring; auto-trigger will be addressed in audit-execution flow separately.

**Pattern:** Use server/client split per CONVENTIONS.md:

- Server component fetches data
- Client components handle interactive mutations
  </action>
  <verify>

```bash
cd /root/.openclaw/workspace/AEGIS
pnpm exec tsc --noEmit --pretty false | grep -E "work-program/page.tsx|error TS"
```

Manual checks:

- Navigate to `/work-program`
- Page loads without errors
- Work program items table displays (empty if no items generated yet)
- Execute item dialog opens
- Submitting execution result updates item status
- Toast feedback on success
  </verify>
  <done>
- Work program page calls `getWorkProgramItems()` from DAL
- Work items table renders with real data
- Execute item dialog wired to `executeWorkProgramItem()` action
- TypeScript clean
- Page functional end-to-end
  </done>
  </task>

</tasks>

<verification>
**Overall checks:**

1. TypeScript:

```bash
cd /root/.openclaw/workspace/AEGIS
pnpm exec tsc --noEmit
```

2. Navigation tests:
   - `/controls` loads with real control library data
   - `/work-program` loads with work items (if any exist)
   - Both pages show empty states gracefully if no data

3. Mutation flows:
   - Create control → persists to database
   - Execute work program item → updates status and result
   - Revalidation refreshes page data

4. Data integrity:
   - Controls display effectiveness scores
   - Work program items link to test procedures
   - Tenant isolation maintained
     </verification>

<success_criteria>

- ✅ `/controls` page wired to `getControls()` DAL function
- ✅ Control library table displays real entries with effectiveness data
- ✅ Create/edit control forms call `manageControl()` action
- ✅ `/work-program` page wired to `getWorkProgramItems()` DAL function
- ✅ Work program execution dialog wired to `executeWorkProgramItem()` action
- ✅ TypeScript compilation clean
- ✅ Both pages load without errors
- ✅ Toast notifications for user feedback
- ✅ R54-R56 requirements marked as implemented
  </success_criteria>

<output>
After completion, update VALIDATION-REPORT.md:
- R54: ✅ (Control library with real process area, type, owner data)
- R55: ✅ (Test procedures linked to controls, visible in work program)
- R56: ✅ (Work program items with execution status and results)
- R57: ⚠️ → Note: Manual generation via action exists; auto-trigger on engagement initiation deferred to audit-execution workflow enhancement
</output>
