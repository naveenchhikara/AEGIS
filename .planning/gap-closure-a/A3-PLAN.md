---
phase: gap-closure-a
plan: A3
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/(dashboard)/pre-audit-profiling/[branchId]/page.tsx
  - src/components/pre-audit/branch-profile.tsx
  - src/data-access/pre-audit-profiling.ts
autonomous: true
gap_closure: true
must_haves:
  truths:
    - "Pre-audit profiling page displays branch's last audit data (date, rating, engagement details)"
    - "Page shows current RAM score with breakdown by category (BUSINESS_RISK vs CONTROL_RISK)"
    - "Page displays prior findings summary (count by severity, top observations)"
    - "Page shows compliance status summary (open/closed counts)"
    - "All data comes from database aggregations, not mock arrays"
  artifacts:
    - path: "src/data-access/pre-audit-profiling.ts"
      provides: "DAL with aggregation queries for branch profiling"
      exports: ["getBranchProfileData"]
      min_lines: 60
    - path: "src/app/(dashboard)/pre-audit-profiling/[branchId]/page.tsx"
      provides: "Server component rendering branch profile"
      contains: "getBranchProfileData"
    - path: "src/components/pre-audit/branch-profile.tsx"
      provides: "Presentational component for profile sections"
      min_lines: 40
  key_links:
    - from: "src/app/(dashboard)/pre-audit-profiling/[branchId]/page.tsx"
      to: "src/data-access/pre-audit-profiling.ts"
      via: "Server component calls getBranchProfileData(session, branchId)"
      pattern: "getBranchProfileData"
    - from: "src/data-access/pre-audit-profiling.ts"
      to: "Branch, AuditEngagement, Observation, RamAssessment, ComplianceItem"
      via: "Aggregation queries across multiple models"
      pattern: "findFirst|findMany|groupBy"
---

## Objective

Implement R12: Pre-audit branch profiling page showing last audit data, current RAM score with breakdown, prior findings summary, and compliance status — all from real database aggregations per SDD p.9.

**Purpose:** Enable auditors to review branch context before starting an engagement, replacing any placeholder/mock data with real aggregations.

**Output:**

- DAL function to aggregate branch profile data (last audit, RAM, findings, compliance)
- Server component page at `/pre-audit-profiling/[branchId]`
- Presentational components for displaying profile sections
- Real data from Branch, AuditEngagement, Observation, RamAssessment, ComplianceItem models

## Execution Context

@/root/.openclaw/workspace/.claude/agents/gsd-planner.md
@/root/.openclaw/workspace/.claude/workflows/execute-plan.md

## Context

@AEGIS/.planning/REQUIREMENTS.md — R12 specification
@AEGIS/.planning/VALIDATION-REPORT.md — R12 gap description
@AEGIS/prisma/schema.prisma — Branch, AuditEngagement, Observation, RamAssessment, ComplianceItem
@AEGIS/.planning/codebase/CONVENTIONS.md — DAL pattern, server component pattern
@AEGIS/src/data-access/analytics.ts — existing aggregation patterns for reference
@AEGIS/src/data-access/ram.ts — existing RAM DAL for reference

## Tasks

<task type="auto">
  <name>Task 1: DAL — Pre-audit profiling aggregations</name>
  <files>src/data-access/pre-audit-profiling.ts</files>
  <action>
  Create `src/data-access/pre-audit-profiling.ts` with `getBranchProfileData(session: Session, branchId: string)` function:

**1a. Fetch branch details:**

```typescript
const branch = await db.branch.findFirst({
  where: { id: branchId, tenantId },
  select: {
    id: true,
    code: true,
    name: true,
    city: true,
    state: true,
    category: true,
    businessSize: true,
    staffStrength: true,
    ramScore: true,
    auditFrequency: true,
    lastAuditDate: true,
    lastAuditRating: true,
  },
});
```

**1b. Fetch last audit engagement:**

```typescript
const lastAudit = await db.auditEngagement.findFirst({
  where: { branchId, tenantId },
  orderBy: { actualEndDate: "desc" },
  select: {
    id: true,
    auditNumber: true,
    auditType: true,
    actualStartDate: true,
    actualEndDate: true,
    overallRiskRating: true,
  },
});
```

**1c. Fetch latest RAM assessment with breakdown:**

```typescript
const ramAssessment = await db.ramAssessment.findFirst({
  where: { branchId, tenantId, status: "APPROVED" },
  orderBy: { approvedAt: "desc" },
  include: {
    scores: {
      include: {
        paramConfig: {
          select: { code: true, name: true, category: true, weight: true },
        },
      },
    },
  },
});
```

**Compute RAM breakdown:**

```typescript
const businessRiskScore =
  ramAssessment?.scores
    .filter((s) => s.paramConfig.category === "BUSINESS_RISK")
    .reduce((sum, s) => sum + s.score * s.paramConfig.weight, 0) ?? 0;

const controlRiskScore =
  ramAssessment?.scores
    .filter((s) => s.paramConfig.category === "CONTROL_RISK")
    .reduce((sum, s) => sum + s.score * s.paramConfig.weight, 0) ?? 0;
```

**1d. Fetch prior findings summary:**

```typescript
const findingsSummary = await db.observation.groupBy({
  by: ["severity"],
  where: {
    branchId,
    tenantId,
    status: { in: ["ISSUED", "RESPONSE", "COMPLIANCE", "CLOSED"] },
  },
  _count: { id: true },
});

const topFindings = await db.observation.findMany({
  where: { branchId, tenantId, severity: { in: ["CRITICAL", "HIGH"] } },
  orderBy: { createdAt: "desc" },
  take: 5,
  select: {
    id: true,
    title: true,
    severity: true,
    status: true,
    createdAt: true,
  },
});
```

**1e. Fetch compliance status summary:**

```typescript
const complianceSummary = await db.complianceItem.groupBy({
  by: ["status"],
  where: { branchId, tenantId },
  _count: { id: true },
});
```

**Return type:**

```typescript
export type BranchProfileData = {
  branch: {
    id: string;
    code: string;
    name: string;
    city: string;
    state: string;
    category: string | null;
    businessSize: number | null;
    staffStrength: number | null;
    ramScore: number | null;
    auditFrequency: number | null;
    lastAuditDate: Date | null;
    lastAuditRating: string | null;
  } | null;
  lastAudit: {
    id: string;
    auditNumber: string | null;
    auditType: string | null;
    actualStartDate: Date | null;
    actualEndDate: Date | null;
    overallRiskRating: string | null;
  } | null;
  ramBreakdown: {
    compositeScore: number;
    businessRiskScore: number;
    controlRiskScore: number;
    assessmentYear: string | null;
    riskCategory: string | null;
  };
  findingsSummary: {
    bySeverity: Array<{ severity: string; count: number }>;
    topFindings: Array<{
      id: string;
      title: string;
      severity: string;
      status: string;
      createdAt: Date;
    }>;
  };
  complianceSummary: Array<{ status: string; count: number }>;
};
```

**IMPORTANT:** Use `prismaForTenant(tenantId)`, follow existing DAL patterns, handle null cases gracefully (branch may not have RAM assessment yet).
</action>
<verify>

```bash
cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/data-access/pre-audit-profiling.ts 2>&1 | head -20
```

Must compile without errors. Must export getBranchProfileData and BranchProfileData type.
</verify>
<done>

- `src/data-access/pre-audit-profiling.ts` exists with ≥60 lines
- `getBranchProfileData()` aggregates data from 5 sources: Branch, AuditEngagement, RamAssessment, Observation, ComplianceItem
- Function computes RAM breakdown (businessRiskScore vs controlRiskScore)
- Function uses groupBy for findings summary and compliance summary
- Return type BranchProfileData is exported
- All queries use tenantId filtering
- TypeScript compiles successfully
  </done>
  </task>

<task type="auto">
  <name>Task 2: Presentational Component — Branch profile sections</name>
  <files>src/components/pre-audit/branch-profile.tsx</files>
  <action>
  Create `src/components/pre-audit/branch-profile.tsx` as a **server component** (NO "use client"):

**Props:**

```typescript
type BranchProfileProps = {
  data: BranchProfileData;
};
```

**Component structure (4 sections in a grid):**

**Section 1: Branch Details Card**

- Display: code, name, city, state, category, businessSize, staffStrength
- Use Card component from shadcn/ui
- Format businessSize with Indian lakhs formatting (if non-null)

**Section 2: Last Audit Card**

- Display: auditNumber, auditType, dates (actualStartDate, actualEndDate), overallRiskRating
- If lastAudit is null, show "No prior audit found"
- Use Badge component for risk rating with color coding

**Section 3: RAM Score Card**

- Display composite score (large text)
- Show risk category badge
- Display breakdown:
  - Business Risk Score: X.XX
  - Control Risk Score: X.XX
- Show assessment year
- If ramBreakdown.compositeScore is 0 or null, show "RAM assessment pending"
- Use Progress bar component to visualize breakdown

**Section 4A: Prior Findings Card**

- Display findings count by severity (table or stat cards)
- List top 5 findings (title, severity badge, status, date)
- If no findings, show "No prior findings"

**Section 4B: Compliance Status Card**

- Display compliance summary by status (table or stat cards)
- Use color coding for statuses (OPEN=red, CLOSED=green, etc.)
- If no compliance items, show "No compliance items"

**Layout:**

```tsx
<div className="grid gap-6 md:grid-cols-2">
  <Card>
    <CardHeader>
      <CardTitle>Branch Details</CardTitle>
    </CardHeader>
    <CardContent>{/* branch info */}</CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Last Audit</CardTitle>
    </CardHeader>
    <CardContent>{/* last audit info */}</CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>RAM Score</CardTitle>
    </CardHeader>
    <CardContent>{/* RAM breakdown */}</CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Prior Findings</CardTitle>
    </CardHeader>
    <CardContent>{/* findings summary */}</CardContent>
  </Card>

  <Card className="md:col-span-2">
    <CardHeader>
      <CardTitle>Compliance Status</CardTitle>
    </CardHeader>
    <CardContent>{/* compliance summary */}</CardContent>
  </Card>
</div>
```

**IMPORTANT:** This is a **server component** for rendering only. Use shadcn/ui components (Card, Badge, Progress, Table). Use `format` from `date-fns` for date formatting.
</action>
<verify>

```bash
cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/components/pre-audit/branch-profile.tsx 2>&1 | head -20
```

Must compile without errors. Check that it does NOT have "use client" directive:

```bash
grep -L '"use client"' src/components/pre-audit/branch-profile.tsx && echo "PASS: Server component" || echo "FAIL: Should be server component"
```

  </verify>
  <done>
  - branch-profile.tsx exists as server component (no "use client" directive)
  - Component displays 5 sections: Branch Details, Last Audit, RAM Score, Prior Findings, Compliance Status
  - RAM section shows breakdown (businessRiskScore vs controlRiskScore)
  - Findings section displays top 5 observations
  - All null/empty cases are handled gracefully with fallback messages
  - Uses shadcn/ui components (Card, Badge, Progress, Table)
  - TypeScript compiles successfully
  </done>
</task>

<task type="auto">
  <name>Task 3: Page — Pre-audit profiling route</name>
  <files>src/app/(dashboard)/pre-audit-profiling/[branchId]/page.tsx</files>
  <action>
  Create `src/app/(dashboard)/pre-audit-profiling/[branchId]/page.tsx` as a **server component**:

**Implementation:**

```typescript
import { notFound } from "next/navigation";
import { getRequiredSession } from "@/data-access/session";
import { getBranchProfileData } from "@/data-access/pre-audit-profiling";
import { BranchProfile } from "@/components/pre-audit/branch-profile";

type PageProps = {
  params: Promise<{ branchId: string }>;
};

export default async function PreAuditProfilingPage({ params }: PageProps) {
  const resolvedParams = await params;
  const session = await getRequiredSession();

  const data = await getBranchProfileData(session, resolvedParams.branchId);

  if (!data.branch) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Pre-Audit Branch Profiling</h1>
        <p className="text-muted-foreground">
          Review branch context before starting engagement
        </p>
      </div>

      <BranchProfile data={data} />
    </div>
  );
}
```

**Metadata export:**

```typescript
export async function generateMetadata({ params }: PageProps) {
  const resolvedParams = await params;
  return {
    title: `Pre-Audit Profiling - Branch ${resolvedParams.branchId}`,
  };
}
```

**IMPORTANT:** This is a server component. Use notFound() for invalid branchId. Follow Next.js 15 App Router conventions (params is a Promise).
</action>
<verify>

```bash
cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/app/(dashboard)/pre-audit-profiling/[branchId]/page.tsx 2>&1 | head -20
```

Must compile without errors. Check that page uses DAL:

```bash
grep "getBranchProfileData" src/app/(dashboard)/pre-audit-profiling/[branchId]/page.tsx && echo "PASS: Uses DAL" || echo "FAIL: Missing DAL call"
```

  </verify>
  <done>
  - Page exists at correct route: `src/app/(dashboard)/pre-audit-profiling/[branchId]/page.tsx`
  - Page is a server component (no "use client")
  - Page calls getBranchProfileData(session, branchId)
  - Page calls notFound() if branch is null
  - Page renders BranchProfile component with data
  - generateMetadata() is exported
  - TypeScript compiles successfully
  </done>
</task>

## Verification

```bash
# 1. TypeScript compilation
cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit

# 2. Check DAL exports
grep -E "export.*(getBranchProfileData|BranchProfileData)" src/data-access/pre-audit-profiling.ts && echo "PASS: DAL exports" || echo "FAIL: Missing exports"

# 3. Check component is server component
grep -L '"use client"' src/components/pre-audit/branch-profile.tsx && echo "PASS: Server component" || echo "FAIL: Should not have 'use client'"

# 4. Check page exists
ls src/app/(dashboard)/pre-audit-profiling/[branchId]/page.tsx && echo "PASS: Page exists" || echo "FAIL: Page missing"

# 5. Verify aggregation queries
grep -E "groupBy|findFirst.*orderBy" src/data-access/pre-audit-profiling.ts && echo "PASS: Uses aggregations" || echo "FAIL: Missing aggregations"
```

## Success Criteria

1. **R12 gap closed:** Pre-audit branch profiling page displays real aggregated data
2. **DAL layer:** getBranchProfileData() aggregates from 5 models (Branch, AuditEngagement, RamAssessment, Observation, ComplianceItem)
3. **RAM breakdown:** Computes businessRiskScore vs controlRiskScore from RamAssessmentScore records
4. **Findings summary:**
   - groupBy severity for count
   - Top 5 findings ordered by date
5. **Compliance summary:** groupBy status for count
6. **UI:**
   - 5 sections displayed in grid layout
   - All null/empty cases handled with fallback messages
   - Uses shadcn/ui components (Card, Badge, Progress, Table)
7. **No mock data:** All data comes from database queries
8. **TypeScript:** All files compile successfully
9. **Conventions:** Follows DAL pattern, server component pattern from CONVENTIONS.md

## Output

After completion, create `.planning/gap-closure-a/A3-SUMMARY.md` documenting:

- What aggregations are performed
- How RAM breakdown is computed
- How findings and compliance summaries are calculated
- Any edge cases handled (null RAM assessment, no prior audit, etc.)
