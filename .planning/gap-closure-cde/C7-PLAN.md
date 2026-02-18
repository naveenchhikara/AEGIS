---
module: C
plan: C7
phase: 04-regulatory
type: execute
wave: 2
depends_on: [C3, C4]
files_modified:
  - src/app/(dashboard)/governance/page.tsx
  - src/components/governance/policy-table.tsx
  - src/components/governance/committee-panel.tsx
  - src/components/governance/acb-workspace.tsx
  - src/components/governance/acb-agenda-builder.tsx
  - src/components/governance/board-review-calendar.tsx
  - src/components/governance/rbi-inspection-pack.tsx
  - src/data-access/governance.ts
autonomous: true
gap_closure: true

must_haves:
  truths:
    - "Governance page displays real PolicyDocument and Committee records from database"
    - "ACB workspace shows consolidated dashboards for board members"
    - "ACB agenda builder auto-generates quarterly packs from live data"
    - "Board review calendar shows RBI-mandated items"
    - "RBI inspection support pack generates one-click 9-component report"
  artifacts:
    - path: "src/app/(dashboard)/governance/page.tsx"
      provides: "Server component fetching real governance data via DAL"
      min_lines: 60
      pattern: "getPolicyDocuments|getCommittees|getCommitteeMeetings"
    - path: "src/components/governance/acb-workspace.tsx"
      provides: "ACB consolidated dashboard with key metrics"
      min_lines: 80
      pattern: "criticalObservations|complianceOverdue|auditProgress"
    - path: "src/components/governance/acb-agenda-builder.tsx"
      provides: "Quarterly ACB pack generation UI"
      min_lines: 60
      pattern: "buildAcbAgenda"
    - path: "src/components/governance/board-review-calendar.tsx"
      provides: "Board review calendar with RBI-mandated items"
      min_lines: 50
      pattern: "mandatedItems|reviewSchedule"
    - path: "src/components/governance/rbi-inspection-pack.tsx"
      provides: "One-click 9-component RBI inspection support pack"
      min_lines: 80
      pattern: "generateInspectionPack|rbiComponents"
  key_links:
    - from: "src/app/(dashboard)/governance/page.tsx"
      to: "src/data-access/governance.ts"
      via: "getPolicyDocuments, getCommittees, getCommitteeMeetings"
      pattern: "await getPolicyDocuments\\(session"
    - from: "src/components/governance/acb-agenda-builder.tsx"
      to: "src/actions/governance/build-acb-agenda.ts"
      via: "buildAcbAgenda action call"
      pattern: "buildAcbAgenda"
---

<objective>
Wire the `/governance` page to real database and build ACB workspace, agenda builder, board review calendar, and RBI inspection support pack.

**Purpose:** Close R81-R86 gaps by replacing mock data with real PolicyDocument/Committee/Meeting data, building ACB workspace with consolidated dashboards, auto-generated quarterly packs, board review calendar, and one-click RBI inspection support pack.

**Output:** Fully functional governance hub with policies, committees, ACB workspace, agenda builder, board calendar, and inspection pack generator.
</objective>

<execution_context>
@.planning/gap-closure-cde/C7-PLAN.md
</execution_context>

<context>
@.planning/VALIDATION-REPORT.md
@.planning/codebase/CONVENTIONS.md
@src/data-access/governance.ts
@src/actions/governance/manage-policy.ts
@src/actions/governance/manage-committee.ts
@src/actions/governance/build-acb-agenda.ts
</context>

<tasks>

<task type="auto">
  <name>Wire governance page to real DAL</name>
  <files>
    src/app/(dashboard)/governance/page.tsx
  </files>
  <action>
Replace mock data with real DAL calls and expand to 5 tabs:

1. Import DAL functions:
   ```typescript
   import {
     getPolicyDocuments, getPoliciesDueForReview,
     getCommittees, getCommitteeMeetings,
     getHousekeepingMetrics,
   } from "@/data-access/governance";
   ```

2. Replace `const policies: any[] = [];` and `const committees: any[] = [];`:
   ```typescript
   const policies = await getPolicyDocuments(session);
   const policiesDueReview = await getPoliciesDueForReview(session, 30);
   const committees = await getCommittees(session, { isActive: true });
   const meetings = await getCommitteeMeetings(session);
   ```

3. Expand Tabs from 3 to 5:
   ```typescript
   <Tabs defaultValue="policies" className="space-y-4">
     <TabsList className="grid w-full grid-cols-5 lg:w-auto">
       <TabsTrigger value="policies">Policies ({policies.length})</TabsTrigger>
       <TabsTrigger value="committees">Committees</TabsTrigger>
       <TabsTrigger value="acb">ACB Workspace</TabsTrigger>
       <TabsTrigger value="calendar">Board Calendar</TabsTrigger>
       <TabsTrigger value="inspection">RBI Pack</TabsTrigger>
     </TabsList>
     <TabsContent value="policies">
       <PolicyTable policies={policies} policiesDueReview={policiesDueReview} canManage={canManagePolicy} />
     </TabsContent>
     <TabsContent value="committees">
       <CommitteePanel committees={committees} meetings={meetings} canManage={canManageCommittee} />
     </TabsContent>
     <TabsContent value="acb">
       <AcbWorkspace />
     </TabsContent>
     <TabsContent value="calendar">
       <BoardReviewCalendar meetings={meetings} />
     </TabsContent>
     <TabsContent value="inspection">
       <RbiInspectionPack />
     </TabsContent>
   </Tabs>
   ```

4. Add permission checks for `board:agenda` and `board:reporting`
  </action>
  <verify>
TypeScript clean, governance page loads with 5 tabs and real data.
  </verify>
  <done>
- Governance page fetches real PolicyDocument, Committee, Meeting data
- 5-tab layout: Policies, Committees, ACB Workspace, Board Calendar, RBI Pack
  </done>
</task>

<task type="auto">
  <name>Wire PolicyTable and CommitteePanel to real actions</name>
  <files>
    src/components/governance/policy-table.tsx
    src/components/governance/committee-panel.tsx
  </files>
  <action>
**PolicyTable updates:**
1. Update props to accept real PolicyDocument data + policiesDueReview array
2. Display table: Name, Category (badge), Status, Approval Date, Review Due, Version
3. "Due for Review" alert banner showing count of policies due within 30 days
4. CRUD dialogs:
   - Create/edit policy → `managePolicy()` action (from `@/actions/governance/manage-policy`)
   - Category options: LENDING, INVESTMENT, KYC_AML, IT_SECURITY, HR, AUDIT, RISK_MANAGEMENT
   - Status transitions: DRAFT → APPROVED → UNDER_REVIEW → SUPERSEDED
5. Version history display per policy

**CommitteePanel updates:**
1. Update props to accept real Committee data with members and meetings
2. Display committees as cards: name, description, member count, meeting count
3. Expand card to show: members list (name, email, role), recent meetings
4. CRUD:
   - Create/edit committee → `manageCommittee()` action
   - Add/remove members → `addCommitteeMember()`, `removeCommitteeMember()`
   - Schedule meeting → `createCommitteeMeeting()` (from governance DAL)
5. Meeting details: date, agenda items, status, attendees, minutes ref
  </action>
  <verify>
Policy CRUD and committee management work end-to-end.
  </verify>
  <done>
- PolicyTable with real data, CRUD, due-for-review alerts
- CommitteePanel with members, meetings, CRUD operations
  </done>
</task>

<task type="auto">
  <name>Build ACB Workspace with consolidated dashboards</name>
  <files>
    src/components/governance/acb-workspace.tsx
    src/data-access/governance.ts
  </files>
  <action>
Create ACB workspace dashboard (R81):

1. Add DAL function to `governance.ts`:
   ```typescript
   export async function getAcbDashboardData(session: Session) {
     const tenantId = (session.user as any).tenantId as string;
     const db = prismaForTenant(tenantId);

     const [criticalObs, complianceStats, overdueItems, recentAudits, riskMetrics] = await Promise.all([
       db.observation.count({ where: { tenantId, severity: { in: ["HIGH", "CRITICAL"] }, status: { not: "CLOSED" } } }),
       db.complianceItem.groupBy({ by: ["status"], where: { tenantId }, _count: true }),
       db.complianceItem.count({ where: { tenantId, dueDate: { lt: new Date() }, status: { notIn: ["CLOSED", "ZAC_APPROVED"] } } }),
       db.auditEngagement.count({ where: { tenantId, status: "COMPLETED" } }),
       db.housekeepingMetric.findMany({ where: { tenantId, agingDays: { gte: 90 } }, take: 5, orderBy: { agingDays: "desc" }, include: { branch: { select: { name: true } } } }),
     ]);

     return { criticalObs, complianceStats, overdueItems, recentAudits, riskMetrics };
   }
   ```

2. ACB Workspace component (server component):
   - Executive summary cards: Critical Findings, Overdue Items, Audits Completed, Risk Alerts
   - Compliance status breakdown (pie/bar chart data)
   - Top 5 high-risk housekeeping metrics
   - Quick links: View full compliance report, View observations, Generate quarterly pack
   - "Generate Quarterly Pack" CTA button (links to agenda builder)

3. Use shadcn Card, Badge, Progress components
  </action>
  <verify>
ACB workspace renders dashboard with real metrics.
  </verify>
  <done>
- ACB workspace dashboard with executive summary cards
- Compliance status breakdown
- Risk alerts for high-aging housekeeping metrics
  </done>
</task>

<task type="auto">
  <name>Build ACB Agenda Builder</name>
  <files>
    src/components/governance/acb-agenda-builder.tsx
  </files>
  <action>
Create ACB agenda builder for quarterly pack generation (R82):

1. Client component with form:
   - Year selector (current year ± 1)
   - Quarter selector: Q1_APR_JUN, Q2_JUL_SEP, Q3_OCT_DEC, Q4_JAN_MAR
   - Optional committee selector (defaults to ACB)
   - "Generate Quarterly Pack" button

2. Wire to `buildAcbAgenda()` action:
   ```typescript
   import { buildAcbAgenda } from "@/actions/governance/build-acb-agenda";
   ```

3. Result display after generation:
   - Meeting created confirmation with date
   - Agenda items summary (5 auto-generated sections):
     1. High & Critical Observations Review
     2. Compliance Status Dashboard
     3. Overdue Observations
     4. Housekeeping Risk Review
     5. Quarterly Audit Completion Report
   - "View Meeting Details" link

4. Previous quarterly packs list:
   - Show past meetings generated by agenda builder
   - Status: SCHEDULED / COMPLETED / CANCELLED
  </action>
  <verify>
Agenda builder generates quarterly pack and creates meeting record.
  </verify>
  <done>
- ACB agenda builder generates quarterly packs
- 5 auto-generated agenda sections from live data
- Meeting record created in CommitteeMeeting table
  </done>
</task>

<task type="auto">
  <name>Build Board Review Calendar</name>
  <files>
    src/components/governance/board-review-calendar.tsx
  </files>
  <action>
Create board review calendar with RBI-mandated items (R83):

1. Props: `meetings` array of CommitteeMeeting records

2. Calendar view (month view) showing:
   - Scheduled committee meetings (dots on dates)
   - Click date → show meeting details

3. RBI-mandated items list (hardcoded schedule per regulations):
   ```typescript
   const RBI_MANDATED_ITEMS = [
     { title: "ACB Meeting — Quarterly Review", frequency: "QUARTERLY", months: [3, 6, 9, 12] },
     { title: "IS Audit Report to Board", frequency: "ANNUAL", months: [3] },
     { title: "Concurrent Audit Report", frequency: "QUARTERLY", months: [3, 6, 9, 12] },
     { title: "RBIA Plan Approval", frequency: "ANNUAL", months: [3] },
     { title: "Risk Management Policy Review", frequency: "ANNUAL", months: [6] },
     { title: "KYC/AML Policy Review", frequency: "ANNUAL", months: [9] },
     { title: "Cyber Security Review", frequency: "HALF_YEARLY", months: [3, 9] },
     { title: "Investment Policy Review", frequency: "ANNUAL", months: [6] },
     { title: "Statutory Audit Report Discussion", frequency: "ANNUAL", months: [6] },
     { title: "RBI Inspection Report Discussion", frequency: "AS_NEEDED", months: [] },
   ];
   ```

4. Status indicators per mandated item:
   - ✅ Completed (meeting exists with status=COMPLETED)
   - ⏳ Scheduled (meeting exists with status=SCHEDULED)
   - ❌ Missing (no meeting scheduled for required period)

5. "Schedule Meeting" action for missing mandated items
  </action>
  <verify>
Board calendar shows meetings and highlights missing mandated items.
  </verify>
  <done>
- Board review calendar with month view
- RBI-mandated items schedule with compliance indicators
- Missing items highlighted for action
  </done>
</task>

<task type="auto">
  <name>Build RBI Inspection Support Pack</name>
  <files>
    src/components/governance/rbi-inspection-pack.tsx
    src/actions/governance/generate-inspection-pack.ts
  </files>
  <action>
Create one-click RBI inspection support pack generator (R86):

1. Create server action `generate-inspection-pack.ts`:
   ```typescript
   "use server";
   // Aggregates 9 components for RBI inspection pack:
   export async function generateInspectionPack(year: number) {
     const session = await getRequiredSession();
     const tenantId = (session.user as any).tenantId as string;
     const db = prismaForTenant(tenantId);

     // Component 1: Branch Audit Coverage Report
     const auditCoverage = await db.auditEngagement.findMany({...});
     // Component 2: RAM Assessment Summary
     const ramSummary = await db.ramAssessment.findMany({...});
     // Component 3: Open Observations Summary
     const openObs = await db.observation.findMany({...});
     // Component 4: Compliance Status Report
     const compliance = await db.complianceItem.findMany({...});
     // Component 5: Regulatory Observation ATR Status
     const regObs = await db.regulatoryObservation.findMany({...});
     // Component 6: Risk Register Summary
     const risks = await db.riskRegister.findMany({...});
     // Component 7: KRI Breach Report
     const kris = await db.keyRiskIndicator.findMany({...});
     // Component 8: Policy Review Status
     const policies = await db.policyDocument.findMany({...});
     // Component 9: IS Audit Status
     const isAudits = await db.isAuditChecklist.findMany({...});

     return { success: true, data: { auditCoverage, ramSummary, openObs, compliance, regObs, risks, kris, policies, isAudits } };
   }
   ```

2. Create `rbi-inspection-pack.tsx` component:
   - "Generate RBI Inspection Pack" button with year selector
   - 9-component accordion showing each section:
     1. Branch Audit Coverage
     2. RAM Assessment Summary
     3. Open Observations
     4. Compliance Tracking Status
     5. Regulatory ATR Status
     6. Risk Register
     7. KRI Breach Report
     8. Policy Review Status
     9. IS Audit Status
   - Each section: expandable with summary stats + data table
   - "Export as PDF" button (future enhancement placeholder)
   - "Export as XLSX" button (future enhancement placeholder)
  </action>
  <verify>
Inspection pack aggregates 9 components from real data.
  </verify>
  <done>
- One-click RBI inspection pack with 9 components
- Data aggregated from multiple models
- Accordion display with summary stats
  </done>
</task>

</tasks>

<verification>
**Overall checks:**

1. TypeScript compilation clean
2. `/governance` loads with 5 tabs (Policies, Committees, ACB, Calendar, RBI Pack)
3. Policies CRUD and due-for-review alerts work
4. Committee management with members/meetings works
5. ACB workspace shows consolidated metrics
6. Agenda builder generates quarterly packs
7. Board calendar shows mandated items
8. RBI inspection pack aggregates 9 components
</verification>

<success_criteria>
- ✅ `/governance` page uses real DAL (PolicyDocument, Committee, Meeting)
- ✅ ACB workspace with consolidated dashboards
- ✅ ACB agenda builder auto-generates quarterly packs
- ✅ Board review calendar with RBI-mandated items
- ✅ RBI inspection support pack (one-click 9-component report)
- ✅ TypeScript compilation clean
- ✅ R81-R86 requirements closed
</success_criteria>

<output>
After completion, update VALIDATION-REPORT.md:
- R81: ✅ (ACB workspace with consolidated dashboards)
- R82: ✅ (ACB agenda builder with quarterly packs)
- R83: ✅ (Board review calendar with RBI-mandated items)
- R84: ✅ (PolicyDocument CRUD wired to real DAL)
- R85: ✅ (Committee governance with members/meetings)
- R86: ✅ (RBI inspection support pack — 9 components)
</output>
