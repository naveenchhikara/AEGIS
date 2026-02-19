---
module: C
plan: C5
phase: 04-regulatory
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/(dashboard)/concurrent-audit/page.tsx
  - src/app/(dashboard)/concurrent-audit/templates/page.tsx
  - src/app/(dashboard)/concurrent-audit/rapid-entry/page.tsx
  - src/components/concurrent-audit/template-manager.tsx
  - src/components/concurrent-audit/rapid-entry-workbench.tsx
  - src/components/concurrent-audit/irregularity-escalation-dialog.tsx
  - src/components/concurrent-audit/dedup-findings-panel.tsx
  - src/data-access/concurrent-audit.ts
autonomous: true
gap_closure: true

must_haves:
  truths:
    - "Concurrent audit scope templates are managed via CRUD UI"
    - "Rapid observation entry workbench allows batch creation"
    - "Serious irregularity escalation creates notifications to CAE/CEO/ACB"
    - "Concurrent findings surface in a de-duplication panel for RBIA planning"
  artifacts:
    - path: "src/app/(dashboard)/concurrent-audit/page.tsx"
      provides: "Concurrent audit hub with tabs for templates, rapid entry, escalation"
      min_lines: 40
      pattern: "getConcurrentAuditTemplates"
    - path: "src/components/concurrent-audit/template-manager.tsx"
      provides: "CRUD interface for scope templates (7 areas)"
      min_lines: 80
      pattern: "manageTemplate|deleteTemplate"
    - path: "src/components/concurrent-audit/rapid-entry-workbench.tsx"
      provides: "Batch observation entry form for concurrent auditors"
      min_lines: 100
      pattern: "rapidEntryObservations"
    - path: "src/components/concurrent-audit/irregularity-escalation-dialog.tsx"
      provides: "Escalation dialog with auto-routing to CAE/CEO/ACB"
      min_lines: 60
      pattern: "escalateIrregularity"
    - path: "src/components/concurrent-audit/dedup-findings-panel.tsx"
      provides: "Panel showing concurrent findings with potential RBIA duplicates"
      min_lines: 50
      pattern: "concurrentFindings|rbiaDuplicates"
  key_links:
    - from: "src/app/(dashboard)/concurrent-audit/page.tsx"
      to: "src/data-access/concurrent-audit.ts"
      via: "getConcurrentAuditTemplates function call"
      pattern: "await getConcurrentAuditTemplates\\(session"
    - from: "src/components/concurrent-audit/rapid-entry-workbench.tsx"
      to: "src/actions/concurrent-audit/rapid-entry.ts"
      via: "rapidEntryObservations action call"
      pattern: "rapidEntryObservations"
    - from: "src/components/concurrent-audit/irregularity-escalation-dialog.tsx"
      to: "src/actions/concurrent-audit/escalate-irregularity.ts"
      via: "escalateIrregularity action call"
      pattern: "escalateIrregularity"
---

<objective>
Create routes and UI for concurrent audit module including scope template management, rapid observation entry workbench, serious irregularity escalation, and findings de-duplication.

**Purpose:** Close R72-R76 gaps by creating the missing routes/UI for concurrent audit features. Server actions and DAL already exist — this plan wires them to a usable frontend.

**Output:** Functional concurrent audit module with template CRUD, rapid entry workbench, escalation workflow, and de-duplication panel.
</objective>

<execution_context>
@.planning/gap-closure-cde/C5-PLAN.md
</execution_context>

<context>
@.planning/VALIDATION-REPORT.md
@.planning/codebase/CONVENTIONS.md
@src/data-access/concurrent-audit.ts
@src/actions/concurrent-audit/manage-template.ts
@src/actions/concurrent-audit/rapid-entry.ts
@src/actions/concurrent-audit/escalate-irregularity.ts
</context>

<tasks>

<task type="auto">
  <name>Create concurrent audit hub page with routes</name>
  <files>
    src/app/(dashboard)/concurrent-audit/page.tsx
    src/app/(dashboard)/concurrent-audit/templates/page.tsx
    src/app/(dashboard)/concurrent-audit/rapid-entry/page.tsx
  </files>
  <action>
Create new route structure for concurrent audit:

**1. Hub page (`/concurrent-audit/page.tsx`):**

```typescript
import { getRequiredSession } from "@/data-access/session";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { getConcurrentAuditTemplates } from "@/data-access/concurrent-audit";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TemplateManager } from "@/components/concurrent-audit/template-manager";
import { RapidEntryWorkbench } from "@/components/concurrent-audit/rapid-entry-workbench";
import { DedupFindingsPanel } from "@/components/concurrent-audit/dedup-findings-panel";

export default async function ConcurrentAuditPage() {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  if (!hasPermission(userRoles, "concurrent_audit:read")) redirect("/dashboard");
  const canExecute = hasPermission(userRoles, "concurrent_audit:execute");

  const templates = await getConcurrentAuditTemplates(session, { isActive: true });
  // Fetch branches for rapid entry
  const tenantId = (session.user as any).tenantId as string;
  const db = (await import("@/data-access/prisma")).prismaForTenant(tenantId);
  const branches = await db.branch.findMany({
    where: { tenantId },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
  // Fetch concurrent observations for dedup
  const concurrentObs = await db.observation.findMany({
    where: { tenantId, criteria: { startsWith: "Concurrent Audit" } },
    select: { id: true, title: true, condition: true, severity: true, createdAt: true, branch: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Concurrent Audit</h1>
        <p className="text-muted-foreground">Scope templates, rapid observations, and irregularity escalation</p>
      </div>
      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="templates">Scope Templates</TabsTrigger>
          <TabsTrigger value="rapid-entry">Rapid Entry</TabsTrigger>
          <TabsTrigger value="dedup">Findings De-dup</TabsTrigger>
        </TabsList>
        <TabsContent value="templates">
          <TemplateManager templates={templates} canExecute={canExecute} />
        </TabsContent>
        <TabsContent value="rapid-entry">
          <RapidEntryWorkbench templates={templates} branches={branches} canExecute={canExecute} />
        </TabsContent>
        <TabsContent value="dedup">
          <DedupFindingsPanel findings={concurrentObs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**2. Templates sub-page (optional direct route)** — redirect to hub:

```typescript
import { redirect } from "next/navigation";
export default function TemplatesPage() {
  redirect("/concurrent-audit");
}
```

**3. Rapid entry sub-page (optional direct route)** — redirect to hub:

```typescript
import { redirect } from "next/navigation";
export default function RapidEntryPage() {
  redirect("/concurrent-audit");
}
```

  </action>
  <verify>
```bash
cd /root/.openclaw/workspace/AEGIS
pnpm exec tsc --noEmit --pretty false 2>&1 | grep -c "error TS"
```
  </verify>
  <done>
- `/concurrent-audit` route exists with 3-tab layout
- Real data fetched from DAL
- Sub-routes redirect to hub
  </done>
</task>

<task type="auto">
  <name>Build Template Manager component</name>
  <files>
    src/components/concurrent-audit/template-manager.tsx
  </files>
  <action>
Create client component for concurrent audit scope template CRUD (R73):

1. Props: `templates` array, `canExecute` boolean

2. Display templates in a table/card grid grouped by scopeArea:
   - CASH, INVESTMENTS, ADVANCES, OFF_BS, DEPOSITS, KYC, EDP
   - Each card shows: name, description, checklist items count, active status

3. "Create Template" dialog with form:
   - Scope area dropdown (7 options)
   - Template name
   - Description
   - Dynamic checklist items (add/remove rows): particulars, riskCategory, regulatoryRef
   - Calls `manageTemplate()` action

4. Edit template dialog (pre-filled form)

5. Delete template with confirmation dialog calling `deleteTemplate()` action

6. Toggle active/inactive status

7. Empty state per scope area with "Create Template" CTA

Wire all actions from `@/actions/concurrent-audit/manage-template`:

```typescript
import {
  manageTemplate,
  deleteTemplate,
} from "@/actions/concurrent-audit/manage-template";
```

  </action>
  <verify>
Template CRUD operations work end-to-end.
  </verify>
  <done>
- Template manager displays existing templates by scope area
- Create/edit/delete operations wired to server actions
- Dynamic checklist item builder in create/edit forms
  </done>
</task>

<task type="auto">
  <name>Build Rapid Entry Workbench</name>
  <files>
    src/components/concurrent-audit/rapid-entry-workbench.tsx
  </files>
  <action>
Create rapid observation entry workbench for concurrent auditors (R74):

1. Props: `templates`, `branches`, `canExecute`

2. Header section:
   - Branch selector (dropdown from branches prop)
   - Scope area selector (auto-loads template checklist)

3. Observation entry form with dynamic rows:
   - Each row: Particulars (text), Finding (text), Severity (dropdown), Recommendation (optional)
   - "Add Row" button to add more observations
   - "Remove Row" button per row
   - Pre-fill rows from selected template checklist items

4. Submit batch:
   - Calls `rapidEntryObservations()` action with all rows
   - Shows success toast with count of created observations
   - Resets form after success

5. Template-based quick entry:
   - When template selected, populate rows from template checklistItems
   - User fills in findings/severity for each checklist item

6. Validation:
   - At least 1 observation required
   - Branch must be selected
   - Each observation needs particulars + finding + severity

```typescript
import { rapidEntryObservations } from "@/actions/concurrent-audit/rapid-entry";
```

  </action>
  <verify>
Batch creation of observations works. Template pre-population works.
  </verify>
  <done>
- Rapid entry workbench allows batch observation creation
- Template-based pre-population of checklist items
- Form validates and submits to rapidEntryObservations action
  </done>
</task>

<task type="auto">
  <name>Build Irregularity Escalation Dialog</name>
  <files>
    src/components/concurrent-audit/irregularity-escalation-dialog.tsx
  </files>
  <action>
Create serious irregularity escalation dialog (R75):

1. Trigger: "Escalate" button on observation rows (in rapid entry results or dedup panel)

2. Dialog form fields:
   - Observation ID (hidden, passed as prop)
   - Irregularity Type: FRAUD, MAJOR_DEVIATION, REGULATORY_BREACH, CRITICAL_RISK
   - Urgency: IMMEDIATE, URGENT, HIGH
   - Escalate To: multi-select checkboxes for CAE, CEO, ACB_MEMBER
   - Remarks: textarea (min 10 chars)

3. Auto-routing:
   - FRAUD → auto-select CAE + CEO + ACB_MEMBER
   - REGULATORY_BREACH → auto-select CAE + CEO
   - MAJOR_DEVIATION → auto-select CAE
   - User can modify auto-selections

4. Submit: calls `escalateIrregularity()` action

5. Result display: "Escalated to {N} recipients" toast

```typescript
import { escalateIrregularity } from "@/actions/concurrent-audit/escalate-irregularity";
```

  </action>
  <verify>
Escalation creates notifications for correct recipients.
  </verify>
  <done>
- Escalation dialog with auto-routing logic
- Form validates and submits to escalateIrregularity action
- Notifications created for selected recipients
  </done>
</task>

<task type="auto">
  <name>Build De-duplication Findings Panel</name>
  <files>
    src/components/concurrent-audit/dedup-findings-panel.tsx
    src/data-access/concurrent-audit.ts
  </files>
  <action>
Create de-duplication panel for concurrent findings surfacing in RBIA (R76):

1. Add DAL function to `src/data-access/concurrent-audit.ts`:

   ```typescript
   export async function getConcurrentFindingsForDedup(session: Session) {
     const tenantId = (session.user as any).tenantId as string;
     const db = prismaForTenant(tenantId);

     // Get concurrent audit observations
     const concurrentObs = await db.observation.findMany({
       where: { tenantId, criteria: { startsWith: "Concurrent Audit" } },
       select: {
         id: true,
         title: true,
         condition: true,
         severity: true,
         branch: { select: { id: true, name: true } },
         createdAt: true,
         status: true,
       },
       orderBy: { createdAt: "desc" },
     });

     // Get RBIA observations for comparison
     const rbiaObs = await db.observation.findMany({
       where: {
         tenantId,
         criteria: { not: { startsWith: "Concurrent Audit" } },
       },
       select: {
         id: true,
         title: true,
         condition: true,
         branch: { select: { id: true } },
       },
     });

     // Simple title-based duplicate detection
     const potentialDuplicates = concurrentObs.map((co) => {
       const matches = rbiaObs.filter(
         (ro) =>
           ro.branch?.id === co.branch?.id &&
           (ro.title
             .toLowerCase()
             .includes(co.title.toLowerCase().substring(0, 20)) ||
             co.title
               .toLowerCase()
               .includes(ro.title.toLowerCase().substring(0, 20))),
       );
       return { ...co, potentialRbiaDuplicates: matches };
     });

     return potentialDuplicates;
   }
   ```

2. Create `dedup-findings-panel.tsx` component:
   - Display concurrent findings in a table
   - Flag rows with potential RBIA duplicates (yellow highlight)
   - Expandable row showing matched RBIA observations
   - "Link to RBIA" button to associate findings
   - "Mark Unique" button to clear duplicate flag
   - Summary stats: total concurrent findings, potential duplicates count
     </action>
     <verify>
     De-dup panel identifies potential duplicates between concurrent and RBIA findings.
     </verify>
     <done>

- De-dup panel displays concurrent findings with duplicate indicators
- Potential RBIA matches shown per finding
- DAL function for cross-referencing added
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

2. Routes exist and load:
   - `/concurrent-audit` → hub with 3 tabs
   - Templates tab shows template cards by scope area
   - Rapid Entry tab has batch form with template pre-fill
   - De-dup tab shows concurrent findings with duplicate detection

3. Data flows:
   - Templates CRUD → manageTemplate/deleteTemplate actions
   - Rapid entry → rapidEntryObservations action → creates Observations
   - Escalation → escalateIrregularity action → creates notifications
   - Tenant isolation via prismaForTenant
     </verification>

<success_criteria>

- ✅ `/concurrent-audit` route created with scope template management
- ✅ Template CRUD for 7 scope areas (CASH, INVESTMENTS, etc.)
- ✅ Rapid observation entry workbench with batch creation
- ✅ Serious irregularity escalation with auto-routing to CAE/CEO/ACB
- ✅ De-duplication panel for concurrent findings in RBIA planning
- ✅ TypeScript compilation clean
- ✅ R72-R76 requirements closed
  </success_criteria>

<output>
After completion, update VALIDATION-REPORT.md:
- R72: ✅ (CONCURRENT_AUDITOR role already exists, UI now available)
- R73: ✅ (Concurrent audit scope templates with CRUD)
- R74: ✅ (Rapid observation entry workbench)
- R75: ✅ (Serious irregularity escalation with auto-routing)
- R76: ✅ (De-duplication panel for concurrent findings)
</output>
