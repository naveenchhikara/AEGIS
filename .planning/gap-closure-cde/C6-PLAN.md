---
module: C
plan: C6
phase: 04-regulatory
type: execute
wave: 1
depends_on: [C3]
files_modified:
  - src/app/(dashboard)/regulatory/page.tsx
  - src/components/regulatory/regulatory-table.tsx
  - src/components/regulatory/atr-form.tsx
  - src/components/regulatory/atr-workflow-panel.tsx
  - src/components/regulatory/para-issue-mapping.tsx
  - src/data-access/regulatory.ts
autonomous: true
gap_closure: true

must_haves:
  truths:
    - "Regulatory page displays real RegulatoryObservation records from database"
    - "ATR workflow UI supports draft → submitted → accepted/further_info transitions"
    - "Para-to-issue mapping links regulatory paras to internal Issue tracking"
    - "Regulatory observations filterable by source, ATR status, severity"
  artifacts:
    - path: "src/app/(dashboard)/regulatory/page.tsx"
      provides: "Server component fetching real regulatory data via DAL"
      min_lines: 40
      pattern: "getRegulatoryObservations|getPendingAtrObservations"
    - path: "src/components/regulatory/atr-workflow-panel.tsx"
      provides: "ATR workflow with state transition buttons"
      min_lines: 60
      pattern: "submitAtr|DRAFT|SUBMITTED|ACCEPTED|FURTHER_INFO"
    - path: "src/components/regulatory/para-issue-mapping.tsx"
      provides: "Para-to-issue mapping dialog for linking regulatory paras to Issues"
      min_lines: 50
      pattern: "manageRegulatoryObservation|issueId"
  key_links:
    - from: "src/app/(dashboard)/regulatory/page.tsx"
      to: "src/data-access/regulatory.ts"
      via: "getRegulatoryObservations, getPendingAtrObservations"
      pattern: "await getRegulatoryObservations\\(session"
    - from: "src/components/regulatory/atr-workflow-panel.tsx"
      to: "src/actions/regulatory/submit-atr.ts"
      via: "submitAtr action with SUBMIT/MARK_ACCEPTED/REQUEST_INFO"
      pattern: "submitAtr"
    - from: "src/components/regulatory/para-issue-mapping.tsx"
      to: "src/actions/regulatory/manage-observation.ts"
      via: "manageRegulatoryObservation with issueId linkage"
      pattern: "manageRegulatoryObservation"
---

<objective>
Wire the `/regulatory` page to real database and build ATR workflow UI with para-to-issue mapping.

**Purpose:** Close R77-R79 gaps by replacing mock arrays with real RegulatoryObservation data, building ATR workflow with state transitions, and enabling para-to-issue mapping for internal tracking.

**Output:** Functional regulatory observations module with filterable table, ATR workflow (draft→submitted→accepted/further_info), and para-to-issue mapping.
</objective>

<execution_context>
@.planning/gap-closure-cde/C6-PLAN.md
</execution_context>

<context>
@.planning/VALIDATION-REPORT.md
@.planning/codebase/CONVENTIONS.md
@src/data-access/regulatory.ts
@src/actions/regulatory/manage-observation.ts
@src/actions/regulatory/submit-atr.ts
</context>

<tasks>

<task type="auto">
  <name>Wire regulatory page to real DAL</name>
  <files>
    src/app/(dashboard)/regulatory/page.tsx
  </files>
  <action>
Replace mock data with real DAL calls:

1. Import DAL functions:
   ```typescript
   import { getRegulatoryObservations, getPendingAtrObservations } from "@/data-access/regulatory";
   ```

2. Replace `const observations: any[] = [];` with:
   ```typescript
   const observations = await getRegulatoryObservations(session);
   const pendingAtr = await getPendingAtrObservations(session);
   ```

3. Fetch Issues for para-to-issue mapping:
   ```typescript
   import { getIssues } from "@/data-access/issues";
   const issues = await getIssues(session);
   ```

4. Add Tabs layout: "All Observations", "Pending ATR", "Mapped to Issues"

5. Pass data to components:
   ```typescript
   <Tabs defaultValue="all" className="space-y-4">
     <TabsList>
       <TabsTrigger value="all">All Observations ({observations.length})</TabsTrigger>
       <TabsTrigger value="pending">Pending ATR ({pendingAtr.length})</TabsTrigger>
       <TabsTrigger value="mapped">Issue Mapping</TabsTrigger>
     </TabsList>
     <TabsContent value="all">
       <RegulatoryTable observations={observations} canManage={canManage} issues={issues} />
     </TabsContent>
     <TabsContent value="pending">
       <AtrWorkflowPanel observations={pendingAtr} canManage={canManage} />
     </TabsContent>
     <TabsContent value="mapped">
       <ParaIssueMapping observations={observations.filter(o => o.issueId)} issues={issues} canManage={canManage} />
     </TabsContent>
   </Tabs>
   ```

6. Add permission check for `regulatory:manage` and `regulatory:atr_submit`
  </action>
  <verify>
```bash
cd /root/.openclaw/workspace/AEGIS
pnpm exec tsc --noEmit --pretty false 2>&1 | grep -c "error TS"
```
  </verify>
  <done>
- `/regulatory` page fetches real RegulatoryObservation data
- Tabs layout with All / Pending ATR / Issue Mapping
- No mock arrays remain
  </done>
</task>

<task type="auto">
  <name>Update RegulatoryTable for real data</name>
  <files>
    src/components/regulatory/regulatory-table.tsx
  </files>
  <action>
Update the RegulatoryTable component to handle real data:

1. Props interface:
   ```typescript
   interface RegulatoryTableProps {
     observations: Array<{
       id: string;
       source: string;
       referenceNo: string;
       paraNo: string | null;
       description: string;
       severity: string;
       atrStatus: string;
       atrText: string | null;
       submittedAt: Date | null;
       acceptedAt: Date | null;
       issueId: string | null;
       issue: { id: string; title: string; status: string } | null;
       createdAt: Date;
     }>;
     canManage: boolean;
     issues: Array<{ id: string; title: string; status: string }>;
   }
   ```

2. Data table with columns:
   - Source (badge: RBI/NABARD/Statutory/External)
   - Reference No
   - Para No
   - Description (truncated with tooltip)
   - Severity (color-coded badge)
   - ATR Status (workflow badge with colors)
   - Linked Issue (link if mapped)
   - Actions (edit, ATR, map to issue)

3. Filters:
   - Source dropdown filter
   - Severity filter
   - ATR Status filter
   - Search by reference/description

4. "Add Observation" dialog wired to `manageRegulatoryObservation()`:
   - Source, Reference No, Para No, Description, Severity
   - Optional: link to existing Issue

5. Edit observation dialog (pre-filled)

6. "Map to Issue" action (opens ParaIssueMappingDialog)
  </action>
  <verify>
Table renders real data with filters and CRUD operations.
  </verify>
  <done>
- Regulatory table displays real observations with filters
- CRUD operations wired to manageRegulatoryObservation
- Source/severity/ATR status badges rendered
  </done>
</task>

<task type="auto">
  <name>Build ATR Workflow Panel</name>
  <files>
    src/components/regulatory/atr-workflow-panel.tsx
  </files>
  <action>
Create ATR (Action Taken Report) workflow panel (R78):

1. Display pending ATR observations in workflow-oriented layout

2. Per observation card:
   - Reference No, Para No, Description, Severity
   - Current ATR status with visual workflow indicator:
     ```
     DRAFT → SUBMITTED → ACCEPTED
                       → FURTHER_INFO → SUBMITTED (resubmit)
     ```
   - ATR text editor (rich textarea)
   - Action buttons based on current status:
     - DRAFT: "Submit ATR" button
     - SUBMITTED: "Accept" and "Request Further Info" buttons (for CAE/CEO)
     - FURTHER_INFO: "Resubmit ATR" button
     - ACCEPTED: show accepted badge with date

3. Submit handler:
   ```typescript
   import { submitAtr } from "@/actions/regulatory/submit-atr";
   
   const handleSubmit = async (observationId: string, atrText: string, action: string) => {
     const result = await submitAtr({ observationId, atrText, action, remarks: "" });
     if (result.success) toast.success(`ATR ${action.toLowerCase()} successfully`);
     else toast.error(result.error);
   };
   ```

4. Visual workflow stepper showing current state

5. History panel showing ATR status changes (timestamps: submittedAt, acceptedAt)
  </action>
  <verify>
ATR workflow transitions work: draft→submitted, submitted→accepted, submitted→further_info.
  </verify>
  <done>
- ATR workflow panel with state transition buttons
- ATR text editor with submit/accept/request-info actions
- Visual workflow stepper showing current state
- Permission-based button visibility
  </done>
</task>

<task type="auto">
  <name>Build Para-to-Issue Mapping</name>
  <files>
    src/components/regulatory/para-issue-mapping.tsx
  </files>
  <action>
Create para-to-issue mapping component (R79):

1. Purpose: Link regulatory observation paras to internal Issue tracking

2. Display mapped observations:
   - Table showing: Reference No, Para No, Description → Linked Issue (title, status)
   - "Unlink" button to remove mapping

3. "Map to Issue" dialog:
   - Select existing Issue from dropdown (searchable)
   - OR "Create New Issue" form:
     - Title (pre-filled: "Regulatory: {referenceNo} Para {paraNo}")
     - Description (pre-filled from regulatory observation)
     - Source: "REGULATORY" (auto-set)
     - Severity (inherited from regulatory observation)
   - On submit: updates RegulatoryObservation.issueId via `manageRegulatoryObservation()`

4. If creating new Issue:
   - First create Issue via issue actions
   - Then link to regulatory observation

5. Unmapped observations section:
   - List observations without issueId
   - Prominent "Map to Issue" CTA per row

```typescript
import { manageRegulatoryObservation } from "@/actions/regulatory/manage-observation";
```
  </action>
  <verify>
Para-to-issue mapping creates/links Issues to regulatory observations.
  </verify>
  <done>
- Para-to-issue mapping dialog for linking observations to Issues
- Create new Issue or link to existing
- Unmapped observations highlighted
- Unlink capability
  </done>
</task>

</tasks>

<verification>
**Overall checks:**

1. TypeScript compilation clean
2. `/regulatory` page loads with real data
3. ATR workflow: draft → submitted → accepted transitions work
4. ATR workflow: submitted → further_info → resubmit works
5. Para-to-issue mapping creates linkages
6. Filters work (source, severity, ATR status)
7. Tenant isolation maintained
</verification>

<success_criteria>
- ✅ `/regulatory` page uses real DAL instead of mock data
- ✅ RegulatoryObservation CRUD with source/severity/ATR status
- ✅ ATR workflow UI with draft → submitted → accepted/further_info transitions
- ✅ Para-to-issue mapping for internal tracking
- ✅ Filterable table with search
- ✅ TypeScript compilation clean
- ✅ R77-R79 requirements closed
</success_criteria>

<output>
After completion, update VALIDATION-REPORT.md:
- R77: ✅ (Regulatory observations wired to real DAL with CRUD)
- R78: ✅ (ATR workflow UI with state transitions)
- R79: ✅ (Para-to-issue mapping for internal tracking)
</output>
