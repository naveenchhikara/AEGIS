---
module: C
plan: C4
phase: 03-grc
type: execute
wave: 1
depends_on: [C3]
files_modified:
  - src/app/(dashboard)/qa-assessment/page.tsx
  - src/components/qa-assessment/assessment-form.tsx
  - src/components/qa-assessment/gap-conversion-panel.tsx
  - src/components/qa-assessment/effectiveness-kpis.tsx
  - src/components/qa-assessment/audit-health-dashboard.tsx
  - src/data-access/qa-assessment.ts
autonomous: true
gap_closure: true

must_haves:
  truths:
    - "QA Assessment page displays real QaSelfAssessment records from database"
    - "Gap-to-issue conversion UI allows selecting gaps and creating Issues"
    - "10 Internal Audit effectiveness KPIs computed and displayed"
    - "Audit Function Health dashboard aggregates quality metrics"
  artifacts:
    - path: "src/app/(dashboard)/qa-assessment/page.tsx"
      provides: "Server component fetching real QA data via DAL"
      min_lines: 50
      pattern: "getQaSelfAssessments|getQaAssessmentsByYear"
    - path: "src/components/qa-assessment/gap-conversion-panel.tsx"
      provides: "Client component for converting QA gaps to Issues"
      min_lines: 60
      pattern: "convertGapToIssue|bulkConvertGapsToIssues"
    - path: "src/components/qa-assessment/effectiveness-kpis.tsx"
      provides: "10 IA effectiveness KPI metrics display"
      min_lines: 80
      pattern: "auditCoverage|findingClosureRate|repeatFindingRate"
    - path: "src/components/qa-assessment/audit-health-dashboard.tsx"
      provides: "Audit Function Health dashboard with aggregate metrics"
      min_lines: 60
      pattern: "healthScore|conformanceRate"
  key_links:
    - from: "src/app/(dashboard)/qa-assessment/page.tsx"
      to: "src/data-access/qa-assessment.ts"
      via: "getQaSelfAssessments, getQaAssessmentsByYear, getUnconvertedGaps"
      pattern: "await getQaSelfAssessments\\(session"
    - from: "src/components/qa-assessment/gap-conversion-panel.tsx"
      to: "src/actions/qa-assessment/gap-to-issue.ts"
      via: "convertGapToIssue, bulkConvertGapsToIssues action calls"
      pattern: "convertGapToIssue"
---

<objective>
Wire the `/qa-assessment` page to real database and build QA assessment workflow UI including gap-to-issue conversion, IA effectiveness KPIs, and Audit Function Health dashboard.

**Purpose:** Close R64-R67 gaps by replacing mock data with real QaSelfAssessment records, enabling gap-to-issue conversion workflow, computing 10 IA effectiveness KPIs, and building an Audit Function Health dashboard.

**Output:** Fully functional QA assessment module with self-assessment questionnaires, gap conversion, KPI tracking, and health dashboard.
</objective>

<execution_context>
@.planning/gap-closure-cde/C4-PLAN.md
</execution_context>

<context>
@.planning/VALIDATION-REPORT.md
@.planning/codebase/CONVENTIONS.md
@src/data-access/qa-assessment.ts
@src/actions/qa-assessment/manage-assessment.ts
@src/actions/qa-assessment/gap-to-issue.ts
</context>

<tasks>

<task type="auto">
  <name>Wire QA Assessment page to real DAL</name>
  <files>
    src/app/(dashboard)/qa-assessment/page.tsx
  </files>
  <action>
Replace mock data with real DAL calls:

1. Import DAL functions from `@/data-access/qa-assessment`:
   - `getQaSelfAssessments()`
   - `getQaAssessmentsByYear()`
   - `getUnconvertedGaps()`
   - `getQaAssessmentProgress()`
   - `getQaSummaryByStandard()`

2. Replace `const currentAssessment = null;` with actual data fetching:
   ```typescript
   const currentYear = new Date().getFullYear();
   const { assessments, summary } = await getQaAssessmentsByYear(session, currentYear);
   const unconvertedGaps = await getUnconvertedGaps(session);
   const progress = await getQaAssessmentProgress(session);
   const standardSummary = await getQaSummaryByStandard(session, currentYear);
   ```

3. Add Tabs layout with 4 tabs: "Assessment", "Gap Conversion", "KPIs", "Health Dashboard"

4. Pass real data to child components:
   ```typescript
   <Tabs defaultValue="assessment" className="space-y-4">
     <TabsList>
       <TabsTrigger value="assessment">Self-Assessment</TabsTrigger>
       <TabsTrigger value="gaps">Gap Conversion ({unconvertedGaps.length})</TabsTrigger>
       <TabsTrigger value="kpis">Effectiveness KPIs</TabsTrigger>
       <TabsTrigger value="health">Audit Health</TabsTrigger>
     </TabsList>
     <TabsContent value="assessment">
       <AssessmentForm assessments={assessments} summary={summary} canManage={canManage} />
     </TabsContent>
     <TabsContent value="gaps">
       <GapConversionPanel gaps={unconvertedGaps} canManage={canManage} />
     </TabsContent>
     <TabsContent value="kpis">
       <EffectivenessKpis session={session} />
     </TabsContent>
     <TabsContent value="health">
       <AuditHealthDashboard progress={progress} standardSummary={standardSummary} />
     </TabsContent>
   </Tabs>
   ```

5. Add proper error handling with try-catch

**Pattern:** Server component with Tabs, direct async DAL calls, pass data as props.
  </action>
  <verify>
```bash
cd /root/.openclaw/workspace/AEGIS
pnpm exec tsc --noEmit --pretty false 2>&1 | grep -c "error TS"
```
Should output 0.
  </verify>
  <done>
- `/qa-assessment` page fetches real QaSelfAssessment data
- Tabs layout with 4 sections
- Real data passed to all child components
  </done>
</task>

<task type="auto">
  <name>Update AssessmentForm to handle real data</name>
  <files>
    src/components/qa-assessment/assessment-form.tsx
  </files>
  <action>
Update the existing AssessmentForm component to work with real QaSelfAssessment data:

1. Define proper props interface:
   ```typescript
   interface AssessmentFormProps {
     assessments: Array<{
       id: string;
       assessmentYear: number;
       iiaStandard: string;
       question: string;
       response: string | null;
       evidence: string | null;
       gapIdentified: boolean;
       issueCreated: boolean;
     }>;
     summary: {
       total: number;
       conforms: number;
       partiallyConforms: number;
       doesNotConform: number;
       notApplicable: number;
       gapsIdentified: number;
       issuesCreated: number;
     };
     canManage: boolean;
   }
   ```

2. Render summary stats cards at top (total, conforming %, gaps found)

3. Render assessments as a data table grouped by IIA standard category:
   - Columns: Standard, Question, Response (dropdown), Evidence, Gap?, Issue?
   - Editable response/evidence fields if canManage=true

4. Wire form submission to `manageQaAssessment()` action

5. Add "Initialize from Template" button calling `createQaAssessmentsFromTemplate()`

6. Use `useActionState` for form submissions with toast feedback
  </action>
  <verify>
TypeScript clean, component renders assessment table with real data.
  </verify>
  <done>
- AssessmentForm renders real QaSelfAssessment records in table
- Response/evidence fields editable via manageQaAssessment action
- Summary stats cards displayed
- Template initialization button working
  </done>
</task>

<task type="auto">
  <name>Build Gap-to-Issue conversion panel</name>
  <files>
    src/components/qa-assessment/gap-conversion-panel.tsx
  </files>
  <action>
Create new client component for gap-to-issue conversion (R65):

1. Props: `gaps` array (QaSelfAssessment records with gapIdentified=true, issueCreated=false)

2. Display gaps in a selectable table:
   - Checkbox column for multi-select
   - Columns: IIA Standard, Question, Response, Evidence
   - Badge showing "DOES_NOT_CONFORM" vs "PARTIALLY_CONFORMS"

3. Single conversion dialog:
   - Issue title (pre-filled: "QA Gap: {iiaStandard}")
   - Description (pre-filled from assessment)
   - Severity dropdown (auto: DOES_NOT_CONFORM→HIGH, PARTIALLY→MEDIUM)
   - Owner select
   - Calls `convertGapToIssue()` action

4. Bulk conversion button:
   - Select severity for all
   - Calls `bulkConvertGapsToIssues()` action
   - Shows count of created issues

5. Empty state: "No unconverted gaps found" with link to assessment tab

```typescript
"use client";
import { convertGapToIssue, bulkConvertGapsToIssues } from "@/actions/qa-assessment/gap-to-issue";
// ... implementation
```
  </action>
  <verify>
Component renders gap list, single/bulk conversion actions work.
  </verify>
  <done>
- Gap conversion panel displays unconverted gaps
- Single gap → issue conversion via dialog
- Bulk conversion with severity selection
- Toast notifications for success/error
  </done>
</task>

<task type="auto">
  <name>Build Internal Audit Effectiveness KPIs (10 metrics)</name>
  <files>
    src/components/qa-assessment/effectiveness-kpis.tsx
    src/data-access/qa-assessment.ts
  </files>
  <action>
Create IA Effectiveness KPIs component (R66) with 10 metrics per SDD:

1. Add new DAL function `getAuditEffectivenessKpis(session)` to `src/data-access/qa-assessment.ts`:
   ```typescript
   export async function getAuditEffectivenessKpis(session: Session) {
     const tenantId = (session.user as any).tenantId as string;
     const db = prismaForTenant(tenantId);
     const currentYear = new Date().getFullYear();

     // KPI 1: Audit Plan Coverage (planned vs universe)
     const totalEntities = await db.auditUniverseEntity.count({ where: { tenantId } });
     const plannedAudits = await db.auditEngagement.count({ where: { tenantId, status: { not: "CANCELLED" } } });
     const auditCoverage = totalEntities > 0 ? (plannedAudits / totalEntities) * 100 : 0;

     // KPI 2: Audit Plan Completion Rate
     const completedAudits = await db.auditEngagement.count({ where: { tenantId, status: "COMPLETED" } });
     const planCompletionRate = plannedAudits > 0 ? (completedAudits / plannedAudits) * 100 : 0;

     // KPI 3: Finding Closure Rate (within SLA)
     const totalFindings = await db.observation.count({ where: { tenantId } });
     const closedFindings = await db.observation.count({ where: { tenantId, status: "CLOSED" } });
     const findingClosureRate = totalFindings > 0 ? (closedFindings / totalFindings) * 100 : 0;

     // KPI 4: Repeat Finding Rate
     // (observations with isRepeat flag or similar)
     const repeatFindings = await db.observation.count({ where: { tenantId, isRepeat: true } });
     const repeatFindingRate = totalFindings > 0 ? (repeatFindings / totalFindings) * 100 : 0;

     // KPI 5: Average Days to Close Findings
     // (avg of closedAt - createdAt for closed observations)
     const closedObs = await db.observation.findMany({
       where: { tenantId, status: "CLOSED", closedAt: { not: null } },
       select: { createdAt: true, closedAt: true },
     });
     const avgDaysToClose = closedObs.length > 0
       ? closedObs.reduce((sum, o) => sum + Math.ceil((o.closedAt!.getTime() - o.createdAt.getTime()) / 86400000), 0) / closedObs.length
       : 0;

     // KPI 6: High/Critical Finding Ratio
     const highCritical = await db.observation.count({ where: { tenantId, severity: { in: ["HIGH", "CRITICAL"] } } });
     const highCriticalRatio = totalFindings > 0 ? (highCritical / totalFindings) * 100 : 0;

     // KPI 7: QA Conformance Rate
     const qaAssessments = await db.qaSelfAssessment.findMany({
       where: { tenantId, assessmentYear: currentYear },
       select: { response: true },
     });
     const conforming = qaAssessments.filter(a => a.response === "CONFORMS").length;
     const qaConformanceRate = qaAssessments.length > 0 ? (conforming / qaAssessments.length) * 100 : 0;

     // KPI 8: Compliance Item Overdue Rate
     const totalCompliance = await db.complianceItem.count({ where: { tenantId } });
     const overdueCompliance = await db.complianceItem.count({
       where: { tenantId, status: { in: ["OPEN", "BRANCH_RESPONSE_DUE"] }, dueDate: { lt: new Date() } },
     });
     const overdueRate = totalCompliance > 0 ? (overdueCompliance / totalCompliance) * 100 : 0;

     // KPI 9: Staff Utilization (audits per auditor)
     const auditors = await db.user.count({ where: { tenantId, roles: { hasSome: ["AUDITOR", "LEAD_AUDITOR", "FIELD_AUDITOR"] } } });
     const staffUtilization = auditors > 0 ? completedAudits / auditors : 0;

     // KPI 10: Stakeholder Satisfaction (% accepted at first ZAC review)
     const zacReviewed = await db.complianceItem.count({ where: { tenantId, status: { in: ["ZAC_APPROVED", "ACE_PROCESSING", "ACB_REPORTING", "CLOSED"] } } });
     const firstPassRate = totalCompliance > 0 ? (zacReviewed / totalCompliance) * 100 : 0;

     return {
       auditCoverage: Math.round(auditCoverage * 10) / 10,
       planCompletionRate: Math.round(planCompletionRate * 10) / 10,
       findingClosureRate: Math.round(findingClosureRate * 10) / 10,
       repeatFindingRate: Math.round(repeatFindingRate * 10) / 10,
       avgDaysToClose: Math.round(avgDaysToClose),
       highCriticalRatio: Math.round(highCriticalRatio * 10) / 10,
       qaConformanceRate: Math.round(qaConformanceRate * 10) / 10,
       overdueRate: Math.round(overdueRate * 10) / 10,
       staffUtilization: Math.round(staffUtilization * 10) / 10,
       firstPassRate: Math.round(firstPassRate * 10) / 10,
     };
   }
   ```

2. Create `effectiveness-kpis.tsx` as a **server component** that:
   - Calls `getAuditEffectivenessKpis(session)` (session passed as prop)
   - Renders 10 KPI cards in a grid (2×5 or 3×4 layout)
   - Each card shows: metric name, value, trend indicator, target threshold
   - Color-coding: green (>80%), yellow (50-80%), red (<50%) for rate metrics
   - Use Card components from shadcn/ui
  </action>
  <verify>
DAL function returns 10 KPI values. Component renders all 10 KPIs.
  </verify>
  <done>
- 10 IA effectiveness KPIs computed from real data
- KPI grid rendered with color-coded thresholds
- DAL function added to qa-assessment.ts
  </done>
</task>

<task type="auto">
  <name>Build Audit Function Health dashboard</name>
  <files>
    src/components/qa-assessment/audit-health-dashboard.tsx
  </files>
  <action>
Create Audit Function Health dashboard (R67):

1. Props interface:
   ```typescript
   interface AuditHealthDashboardProps {
     progress: {
       year: number;
       total: number;
       completed: number;
       pending: number;
       completionPct: number;
     };
     standardSummary: Array<{
       standard: string;
       total: number;
       conforms: number;
       partiallyConforms: number;
       doesNotConform: number;
       notApplicable: number;
       gaps: number;
     }>;
   }
   ```

2. Health Score card: overall score = weighted average of QA conformance
   - Full conformance = 100, Partial = 50, Non-conform = 0
   - Display as circular progress or large number

3. Assessment Progress bar: completed/total with percentage

4. IIA Standard breakdown table:
   - Rows per standard category (1000, 2000, etc.)
   - Columns: Total, Conforms, Partial, Non-Conform, N/A, Gaps
   - Row-level color coding

5. Gap Summary section:
   - Total gaps identified
   - Gaps converted to issues vs pending
   - Action items

6. Recommendations section based on scores:
   - If conformance < 70%: "Consider external quality review"
   - If gaps > 5: "Prioritize gap remediation"
   - If completion < 50%: "Assessment is incomplete"

Use shadcn Card, Progress, Table, Badge components.
  </action>
  <verify>
Health dashboard renders with real conformance data and recommendations.
  </verify>
  <done>
- Audit Function Health dashboard displays health score
- IIA standard breakdown table with color coding
- Gap summary with conversion status
- Contextual recommendations based on scores
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

2. Page functionality:
   - Navigate to `/qa-assessment` → loads without errors
   - Assessment tab shows real QaSelfAssessment records
   - Gap Conversion tab shows unconverted gaps with conversion UI
   - KPIs tab shows 10 effectiveness metrics
   - Health tab shows health dashboard with conformance data

3. Data flow:
   - Page fetches from DAL (no mock arrays)
   - Gap conversion creates real Issue records
   - KPIs computed from live data across multiple models
   - Tenant isolation maintained via prismaForTenant
</verification>

<success_criteria>
- ✅ `/qa-assessment` page uses real DAL instead of mock data
- ✅ QA self-assessment questionnaires rendered from QaSelfAssessment model
- ✅ Gap-to-issue conversion UI with single + bulk operations
- ✅ 10 Internal Audit effectiveness KPIs computed and displayed
- ✅ Audit Function Health dashboard with conformance metrics
- ✅ TypeScript compilation clean
- ✅ R64-R67 requirements closed
</success_criteria>

<output>
After completion, update VALIDATION-REPORT.md:
- R64: ✅ (QA self-assessment wired to real DAL)
- R65: ✅ (Gap-to-issue conversion UI with bulk support)
- R66: ✅ (10 IA effectiveness KPIs implemented)
- R67: ✅ (Audit Function Health dashboard)
</output>
