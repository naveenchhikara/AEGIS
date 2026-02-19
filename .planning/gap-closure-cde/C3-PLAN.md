---
module: C
plan: C3
phase: 03-grc
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/(dashboard)/issues/page.tsx
  - src/app/(dashboard)/issues/board/page.tsx
  - src/components/issues/issues-table.tsx
  - src/components/issues/action-plan-panel.tsx
  - src/components/issues/board-view.tsx
autonomous: true
gap_closure: true

must_haves:
  truths:
    - "Issues page displays real issues from all sources (internal/regulatory/external/self-assessment)"
    - "Users can filter issues by source, severity, status, risk theme"
    - "Users can manage action plans with milestones and evidence"
    - "Board consolidated view aggregates open issues across all sources with drill-down"
  artifacts:
    - path: "src/app/(dashboard)/issues/page.tsx"
      provides: "Server component fetching issues with filters"
      min_lines: 40
      pattern: "getIssues"
    - path: "src/app/(dashboard)/issues/board/page.tsx"
      provides: "Board-level consolidated view (R63)"
      min_lines: 30
      pattern: "getIssues.*status.*OPEN"
    - path: "src/components/issues/issues-table.tsx"
      provides: "Table rendering issues with action plan links"
      pattern: "manageIssue"
    - path: "src/components/issues/action-plan-panel.tsx"
      provides: "Action plan management with milestones"
      pattern: "manageActionPlan"
    - path: "src/components/issues/board-view.tsx"
      provides: "Board dashboard with issue summary cards"
      creates: true
  key_links:
    - from: "src/app/(dashboard)/issues/page.tsx"
      to: "src/data-access/issues.ts"
      via: "getIssues function call with filter options"
      pattern: "await getIssues\\(session"
    - from: "src/components/issues/issues-table.tsx"
      to: "src/actions/issues/manage-issue.ts"
      via: "Form submission to manageIssue action"
      pattern: "manageIssue"
    - from: "src/components/issues/action-plan-panel.tsx"
      to: "src/actions/issues/manage-action-plan.ts"
      via: "Action plan CRUD via manageActionPlan"
      pattern: "manageActionPlan"
---

<objective>
Wire `/issues` page to real database and create board-level consolidated view (R63).

**Purpose:** Close R59-R63 gaps by replacing mock data with actual unified issue tracking across all sources, enabling action plan management and board reporting.

**Output:**

- Working issues list page with source filtering
- Action plan management with milestone tracking
- New `/issues/board` page for consolidated board view

</objective>

<execution_context>
@/Users/admin/.claude/get-shit-done/workflows/execute-plan.md
@/Users/admin/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/VALIDATION-REPORT.md
@.planning/codebase/CONVENTIONS.md
@src/data-access/issues.ts
@src/actions/issues/manage-issue.ts
@src/actions/issues/manage-action-plan.ts
@src/actions/issues/accept-risk.ts
</context>

<tasks>

<task type="auto">
  <name>Wire issues page to real DAL with filtering</name>
  <files>
    src/app/(dashboard)/issues/page.tsx
    src/components/issues/issues-table.tsx
    src/components/issues/action-plan-panel.tsx
  </files>
  <action>
**In issues/page.tsx:**

1. Import DAL:

   ```typescript
   import { getIssues } from "@/data-access/issues";
   ```

2. Extract filter params from searchParams:

   ```typescript
   const issues = await getIssues(session, {
     source: searchParams.source, // internal, regulatory, external, self_assessment
     severity: searchParams.severity,
     status: searchParams.status,
     riskTheme: searchParams.riskTheme,
   });
   ```

3. Add filter UI (select dropdowns) for source/severity/status/risk theme

4. Pass filtered issues to IssuesTable component

**In issues-table.tsx:**

1. Import actions:

   ```typescript
   import { manageIssue } from "@/actions/issues/manage-issue";
   import { acceptRisk } from "@/actions/issues/accept-risk";
   ```

2. Wire create/edit issue dialog:
   - Form fields: title, description, source, type, severity, rootCause, riskTheme
   - Submit to `manageIssue()` via `useActionState`
   - Toast on success/error

3. Add action plan column/button → opens ActionPlanPanel

4. Add accept risk button for issues that can be accepted

**In action-plan-panel.tsx:**

1. Import action:

   ```typescript
   import { manageActionPlan } from "@/actions/issues/manage-action-plan";
   ```

2. Wire action plan form:
   - Fields: issueId, milestone, dueDate, assignedTo, evidence (optional), status
   - Submit to `manageActionPlan()`
   - Allow partial closure (status: IN_PROGRESS, VERIFIED, CLOSED)

3. Display existing action plans with milestone progress

**Pattern:** Follow server component + client interaction pattern from CONVENTIONS.md.
</action>
<verify>

```bash
cd /root/.openclaw/workspace/AEGIS
pnpm exec tsc --noEmit --pretty false | grep -E "issues/page.tsx|issues-table.tsx|action-plan-panel.tsx|error TS"
```

Manual checks:

- Navigate to `/issues`
- Page loads with real issue data
- Filter by source/severity/status → updates table
- Create issue dialog → saves to database
- Action plan panel opens for an issue
- Add milestone → persists
- Accept risk button → marks issue as accepted
  </verify>
  <done>
- Issues page calls `getIssues()` with filter options
- Issues table displays real data with filtering
- Create/edit issue forms call `manageIssue()` action
- Action plan panel wired to `manageActionPlan()` action
- Accept risk button calls `acceptRisk()` action
- TypeScript clean
- Page functional end-to-end
  </done>
  </task>

<task type="auto">
  <name>Create board consolidated view (R63)</name>
  <files>
    src/app/(dashboard)/issues/board/page.tsx
    src/components/issues/board-view.tsx
  </files>
  <action>
**Create new route: src/app/(dashboard)/issues/board/page.tsx**

Server component that:

1. Imports DAL:

   ```typescript
   import { getIssues } from "@/data-access/issues";
   import { getRequiredSession } from "@/data-access/session";
   import { hasPermission, type Role } from "@/lib/permissions";
   ```

2. Fetches all open issues across all sources:

   ```typescript
   const openIssues = await getIssues(session, {
     status: "OPEN",
   });
   ```

3. Aggregates by source:

   ```typescript
   const bySource = {
     internal: openIssues.filter((i) => i.source === "internal"),
     regulatory: openIssues.filter((i) => i.source === "regulatory"),
     external: openIssues.filter((i) => i.source === "external"),
     self_assessment: openIssues.filter((i) => i.source === "self_assessment"),
   };

   const bySeverity = {
     critical: openIssues.filter((i) => i.severity === "CRITICAL").length,
     high: openIssues.filter((i) => i.severity === "HIGH").length,
     medium: openIssues.filter((i) => i.severity === "MEDIUM").length,
     low: openIssues.filter((i) => i.severity === "LOW").length,
   };
   ```

4. Pass aggregated data to BoardView component

**Create component: src/components/issues/board-view.tsx**

Client component that:

1. Displays summary cards:
   - Total open issues
   - Critical/high severity count
   - Count by source (internal, regulatory, external, self-assessment)

2. Drill-down table:
   - Shows all open issues
   - Groupable by source or severity
   - Link to individual issue details

3. Visual indicators:
   - Red badge for critical severity
   - Orange for high
   - Risk theme tags

**Permission check:** Require `ACB_MEMBER` or higher role to access board view.

**Pattern:** Dashboard page with aggregated metrics + drill-down table.
</action>
<verify>

```bash
cd /root/.openclaw/workspace/AEGIS
pnpm exec tsc --noEmit --pretty false | grep -E "issues/board/page.tsx|board-view.tsx|error TS"
```

Manual checks:

- Navigate to `/issues/board` as ACB_MEMBER or admin
- Page loads without errors
- Summary cards display counts by source and severity
- Drill-down table shows all open issues
- Clicking an issue navigates to detail/edit view
  </verify>
  <done>
- Board view route created at `/issues/board`
- Server component fetches open issues with aggregation
- BoardView component displays summary cards and drill-down table
- Permission gating for ACB_MEMBER/admin roles
- TypeScript clean
- Page functional
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
   - `/issues` loads with real issue data
   - Filtering works (source, severity, status)
   - `/issues/board` loads with consolidated view
   - Board view shows aggregated counts

3. Mutation flows:
   - Create issue → persists
   - Edit issue → updates
   - Add action plan → milestone saved
   - Accept risk → issue marked accepted
   - All mutations revalidate page data

4. R63 specific:
   - Board view accessible to ACB_MEMBER/admin
   - Aggregates issues from all sources
   - Displays critical/high severity prominently
   - Drill-down to individual issues works
     </verification>

<success_criteria>

- ✅ `/issues` page wired to `getIssues()` with filtering
- ✅ Issues table displays real unified issue data
- ✅ Create/edit issue forms call `manageIssue()` action
- ✅ Action plan management wired to `manageActionPlan()` action
- ✅ Accept risk button wired to `acceptRisk()` action
- ✅ `/issues/board` page created with consolidated view
- ✅ Board view aggregates open issues by source and severity
- ✅ TypeScript compilation clean
- ✅ Both pages load without errors
- ✅ R59-R63 requirements marked as implemented
  </success_criteria>

<output>
After completion, update VALIDATION-REPORT.md:
- R59: ✅ (Unified issue tracking across all sources)
- R60: ✅ (Issue fields include source, severity, root cause, risk theme, linked controls/compliance)
- R61: ✅ (Action plan with milestones, partial closure, evidence tracking)
- R62: ✅ (Accepted risk tracking with formal sign-off via acceptRisk action)
- R63: ✅ (Consolidated Board view of all open issues)
</output>
