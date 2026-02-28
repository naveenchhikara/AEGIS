# Phase 23: BM Response and Reporting - Research

**Researched:** 2026-02-23
**Domain:** Branch Manager response UX, pg-boss cron escalation, Recharts visualizations, @react-pdf/renderer PDF generation, board analytics
**Confidence:** HIGH

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**BM Response Experience**

- Single scrollable page with all ActionPoints listed vertically — inline expand/collapse response forms per AP
- Progress counter at top showing responded/total (e.g., "3/12 addressed")
- Evidence upload inline per AP — each response form has its own file upload zone, evidence clearly tied to the specific ActionPoint
- Persistent deadline countdown banner at top of page — green/amber/red based on urgency, turns red in last 48 hours
- Batch submit requires review step — clicking "Submit" shows a summary modal listing all AP responses and attachments; BM reviews and confirms before final submission
- Submit button disabled while any AP is unaddressed

**Score Visualization**

- Composite RBIA score displayed as a large circular gauge (donut/arc) — shows percentage with rating band label and color, similar to credit score displays
- Module breakdown below composite as a grid of cards — each card shows module name, score percentage, colored progress bar, and rating label
- Clicking a module card expands it in place (accordion-style) to show sub-modules as nested rows; clicking a sub-module shows leaf items with individual scores — all drill-down happens on the same page, no navigation
- Historical trend as a line chart — composite score on Y-axis, engagements on X-axis (labeled by date), with optional module-level lines toggled via legend
- Rating band color coding: Poor=red, Moderate=orange, Satisfactory=yellow, Good=blue, Very Good=dark green

**Report PDF Structure (8 Sections, Score-First)**

1. Cover Page — Bank branding: bank name, logo (if uploaded), branch name, engagement period, RBIA rating band prominently displayed. AEGIS logo small in footer
2. Executive Summary — High-level overview of audit findings and score
3. Engagement Details — Branch info, audit team, dates, scope
4. Score Summary — Rendered circular gauge for composite score + table with module scores, percentages, rating bands, and weights
5. Detailed Scores — Per-module drill-down showing sub-modules and leaf item scores
6. ActionPoints Summary — Full detail per AP: module, description, severity, BM response (if submitted), status
7. Observations — Full 5C fields for each formal observation
8. Meeting Minutes — Opening and exit meeting minutes

- The PDF is the complete record — board members should not need app access to understand the audit
- Visual gauge rendered in PDF for composite score (not just table)

**Board Analytics**

- KPI summary cards at top: Total Branches Audited, Average Composite Score, Branches in Poor/Moderate, Score Improvement vs Previous Cycle
- RadarChart for module scores — single branch at a time, selectable via dropdown. Radar fills showing module scores (0-100% on each axis)
- Branch rating distribution as horizontal bar chart — 5 bars (one per rating band: Very Good to Poor), each showing count of branches in that band, color-coded
- Period selector — defaults to most recent audit cycle, dropdown to pick previous cycles for comparison

### Claude's Discretion

- Exact spacing, typography, and animation details on score visualization
- Circular gauge SVG implementation approach in @react-pdf/renderer
- Loading skeletons and error states
- Exact color shades for rating bands (within the specified color families)
- Summary modal layout details for batch submit review
- KPI card styling to match existing dashboard cards

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                                                                  | Research Support                                                                                                                                         |
| ------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BMRP-05 | System transitions BmResponseBatch to OVERDUE status when deadline passes with email escalation to Zonal Auditor             | pg-boss DEADLINE_CHECK cron job pattern, NotificationQueue + processNotifications pipeline, BmBatchStatus enum already has OVERDUE state                 |
| REPT-01 | System displays composite RBIA score with module breakdown, rating band color coding (Poor=red through Very Good=dark green) | RadialBarChart gauge pattern from existing DakshScoreGauge/HealthScoreGauge widgets; BranchRbiaScore.moduleScores JSONB already stores per-module scores |
| REPT-02 | System shows historical RBIA score trend across engagements for each branch                                                  | getBranchScoreHistory() DAL function already exists returning frozen scores ordered by date; LineChart from recharts 3.7.0                               |
| REPT-03 | Score drill-down from composite → module → sub-module → leaf item level                                                      | BranchRbiaScore.scoringTreeSnapshot JSONB stores full tree; accordion expansion pattern with useState in client component                                |
| REPT-04 | RBIA audit report PDF generated with dual sections: score summary + findings (8-section format)                              | @react-pdf/renderer 4.3.2 already used; existing AuditSummaryDocument pattern; SVG-based circular gauge in PDF via Canvas/Path                           |
| REPT-05 | Board analytics includes RadarChart for module scores and branch rating distribution chart                                   | recharts 3.7.0 has RadarChart + Radar components; not yet used in codebase but same ChartContainer wrapper applies                                       |

</phase_requirements>

---

## Summary

Phase 23 closes the v6.0 RBIA workflow by implementing five coordinated features: the BM response route, the overdue escalation cron, score visualization with drill-down, the RBIA PDF report, and board analytics charts.

All five build on infrastructure that is already in place. The pg-boss job infrastructure, notification queue pipeline, SES email sending, S3 presigned upload pattern, recharts chart components, and @react-pdf/renderer PDF generation are all operational in the codebase — Phase 23 is primarily integration work, not net-new infrastructure. The key novel challenges are: (1) rendering a visual circular gauge inside a PDF (SVG via @react-pdf/renderer), (2) implementing RadarChart from recharts which is not yet used in the codebase, and (3) building the accordion drill-down UI for the scoringTreeSnapshot JSONB.

**Primary recommendation:** Wire into existing patterns (NotificationQueue + DEADLINE_CHECK job, generatePdfReport + AuditSummaryDocument, ChartContainer + RadialBarChart) — avoid reimplementing email sending, S3 upload, or chart scaffolding from scratch.

---

## Standard Stack

### Core (already installed and in use)

| Library                 | Version | Purpose                                                                                | Pattern Reference                                                   |
| ----------------------- | ------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| recharts                | 3.7.0   | RadialBarChart (gauge), LineChart (trend), RadarChart (board), BarChart (distribution) | `src/components/ui/chart.tsx` ChartContainer wrapper                |
| @react-pdf/renderer     | 4.3.2   | PDF document generation with StyleSheet, View, Text, Page, Document                    | `src/components/pdf-report/audit-summary-document.tsx`              |
| pg-boss                 | 12.9.0  | Cron job scheduling for overdue escalation (DEADLINE_CHECK job)                        | `src/jobs/index.ts` + `src/jobs/overdue-escalation.ts`              |
| @react-email/components | 1.0.8   | Email template rendering for BM overdue escalation notification                        | `src/emails/templates/escalation-email.tsx`                         |
| AWS S3 (@aws-sdk)       | in use  | Presigned upload URLs for AP evidence files                                            | `src/lib/s3.ts` — generateUploadUrl, validateFileType, verifyUpload |
| Better Auth             | in use  | Session-based auth; BRANCH_HEAD role for BM route guard                                | `src/data-access/session.ts` getRequiredSession()                   |
| Zod v4                  | in use  | Schema validation for server actions                                                   | zodResolver pattern, `as any` for react-hook-form compatibility     |
| next-intl               | in use  | i18n translations                                                                      | `getTranslations()` in server components                            |

### Supporting

| Library             | Version  | Purpose                                    | When to Use                             |
| ------------------- | -------- | ------------------------------------------ | --------------------------------------- |
| sonner              | 2.0.7    | Toast notifications (upload success/error) | Client components after server action   |
| shadcn/ui Accordion | built-in | Score drill-down expand/collapse           | Module card accordion in score page     |
| shadcn/ui Dialog    | built-in | Batch submit review confirmation modal     | CONTEXT: "Submit shows a summary modal" |
| shadcn/ui Progress  | built-in | Module score colored progress bars         | Module breakdown cards                  |

### No New Installations Needed

All required libraries are already installed. Phase 23 adds zero new dependencies.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/(dashboard)/auditee/[engagementId]/action-points/
│   └── page.tsx                   # 23-01: BM response page (BRANCH_HEAD guard)
├── components/rbia/
│   ├── bm-response-ap-card.tsx    # Per-AP response form with evidence upload
│   ├── bm-batch-submit-modal.tsx  # Review + confirm modal
│   ├── bm-deadline-banner.tsx     # Countdown banner (green/amber/red)
│   ├── rbia-score-gauge.tsx       # 23-03: Composite circular gauge
│   ├── rbia-module-breakdown.tsx  # Module grid with accordion drill-down
│   ├── rbia-score-trend.tsx       # Historical LineChart
│   └── rbia-analytics-radar.tsx  # 23-05: RadarChart for board analytics
├── components/pdf-report/
│   └── rbia-report-document.tsx   # 23-04: 8-section RBIA PDF document
├── jobs/
│   └── rbia-overdue-escalation.ts # 23-02: BmResponseBatch overdue cron processor
└── actions/rbia/
    └── submit-bm-response-batch.ts # 23-01: Batch submit server action
```

### Pattern 1: BM Response Page (auditee sub-route)

**What:** The BM response UI lives at `/auditee/[engagementId]/action-points`. The BM is a BRANCH_HEAD role user. The page fetches `BmResponseBatch` and its `ActionPoint` list via DAL, renders each AP as a scrollable card with inline response form, and provides a batch submit button.

**Auth:** `getRequiredSession()` + `hasPermission(roles, "action_point:bm_respond")` (permission added in Phase 20).

**Evidence Upload Pattern:** Reuse the presigned upload flow from `src/lib/s3.ts`:

1. Client sends file header (base64 first 256 bytes) + metadata to `requestActionPointEvidenceUpload` server action
2. Server validates magic bytes via `validateFileType()`, generates S3 key, calls `generateUploadUrl()`
3. Client does `fetch(presignedUrl, { method: 'PUT', body: file })`
4. Client calls `confirmActionPointEvidenceUpload` to record in DB (stores s3Key in Evidence table with `newExaminationResponseId` pattern — or a new `actionPointId` column)
5. Evidence key: `${tenantId}/ap-evidence/${batchId}/${apId}/${uuid}.${ext}`

```typescript
// Pattern: evidence S3 key (matches existing tenant-scoped pattern)
const s3Key = `${tenantId}/ap-evidence/${batchId}/${actionPointId}/${uuid}.${ext}`;
```

**Submit flow:**

- `useState` tracks per-AP response text map and evidence keys
- `allAddressed = actionPoints.every(ap => responseMap[ap.id]?.text?.trim())`
- Submit button disabled when `!allAddressed || isSubmitting`
- Modal shows summary table with AP title, response text snippet, and evidence filenames
- On confirm: calls `submitBmResponseBatch(batchId, responses[])` server action

**Deadline banner countdown:**

```typescript
// Green if > 7 days, amber 3-7 days, red < 48 hours
const daysLeft = differenceInDays(batch.deadline, new Date());
const color = daysLeft > 7 ? "green" : daysLeft > 2 ? "amber" : "red";
```

### Pattern 2: BMRP-05 Overdue Escalation Job

**What:** A new function `processRbiaOverdueEscalation()` added to the existing DEADLINE_CHECK job in `src/jobs/index.ts`. Mirrors `processOverdueEscalation()` but queries `BmResponseBatch` instead of `Observation`.

**Flow:**

```typescript
// In processRbiaOverdueEscalation():
const overdueBatches = await db.bmResponseBatch.findMany({
  where: {
    tenantId,
    status: "PENDING", // not already OVERDUE or SUBMITTED
    deadline: { lt: now }, // deadline has passed
  },
  include: {
    engagement: {
      include: { branch: true },
    },
  },
});

for (const batch of overdueBatches) {
  // 1. Update status to OVERDUE
  await db.bmResponseBatch.update({
    where: { id: batch.id },
    data: { status: "OVERDUE" },
  });

  // 2. Find Zonal Auditor(s) for this tenant
  const zonalAuditors = await db.user.findMany({
    where: { tenantId, roles: { has: "ZONAL_AUDITOR" }, status: "ACTIVE" },
  });

  // 3. Queue notification for each Zonal Auditor
  for (const za of zonalAuditors) {
    await prisma.notificationQueue.create({
      data: {
        tenantId,
        recipientId: za.id,
        type: "BM_BATCH_OVERDUE", // new type — add to TEMPLATE_MAP
        status: "PENDING",
        payload: { batchId, branchName, engagementId, overdueDays },
      },
    });
  }
}
```

**Integration:** Add `processRbiaOverdueEscalation()` call inside the existing `DEADLINE_CHECK` job handler in `src/jobs/index.ts`:

```typescript
await boss.work(JOBS.DEADLINE_CHECK, async () => {
  await processDeadlineReminders();
  await processOverdueEscalation();
  await processRbiaOverdueEscalation(); // new
});
```

**Email template:** New `bm-batch-overdue-email.tsx` in `src/emails/templates/` following the escalation-email pattern. Add `BM_BATCH_OVERDUE: "bm-batch-overdue"` to `TEMPLATE_MAP` in `notification-processor.ts`.

### Pattern 3: Score Display with Gauge + Drill-down

**What:** The score display page (stub built in Phase 22 as `rbia-score-panel.tsx`) is completed with a proper composite gauge, module breakdown cards with accordion drill-down, and historical trend line chart.

**Circular Gauge (screen):** Use the existing `RadialBarChart` + `PolarAngleAxis` pattern from `HealthScoreGauge` and `DakshScoreGauge`. The RBIA gauge maps 0–100% on the domain:

```typescript
// src/components/rbia/rbia-score-gauge.tsx
import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

const RATING_COLORS = {
  VERY_GOOD: "hsl(142 71% 35%)", // dark green
  GOOD: "hsl(213 90% 55%)", // blue
  SATISFACTORY: "hsl(45 96% 56%)", // yellow
  MODERATE: "hsl(25 95% 53%)", // orange
  POOR: "hsl(0 84% 60%)", // red
} as const;
```

**Module Breakdown Accordion:** Each module card expands in place using shadcn Accordion or simple `useState` toggle. The data comes from `BranchRbiaScore.moduleScores` (JSONB) for percentages, and `BranchRbiaScore.scoringTreeSnapshot` for drill-down into sub-modules and leaf items.

**Historical Trend:** `getBranchScoreHistory(session, branchId)` already exists in `rbia-scoring.ts` and returns frozen scores ordered by date. Use recharts `LineChart` with `XAxis` labeled by `frozenAt` date, `YAxis` domain `[0, 100]`, and `CartesianGrid`.

**Drill-down Tree:** The `scoringTreeSnapshot` JSONB field in `BranchRbiaScore` stores the full scored tree at freeze time. Parse this on the server and pass as prop. Render using recursive accordion expansion with `useState`:

```typescript
// Tree node shape from scoringTreeSnapshot
type ScoreTreeNode = {
  code: string;
  name: string;
  score: number; // 0.0–1.0 decimal
  ratingBand: string;
  children?: ScoreTreeNode[];
  isLeaf?: boolean;
};
```

### Pattern 4: RBIA PDF Report

**What:** A new `RbiaReportDocument` component replaces (or supplements) `AuditSummaryDocument` for RBIA engagements. The PDF is generated in `generatePdfReport` server action by detecting `auditData.auditType === "RBIA"` and branching to the new document component.

**Circular Gauge in PDF:** @react-pdf/renderer supports SVG via the `<Svg>`, `<Circle>`, and `<Path>` primitives. Implement the gauge as a percentage arc:

```typescript
// SVG arc path for circular gauge in PDF
import { Svg, Circle, Path, G } from "@react-pdf/renderer";

function PdfGauge({ percentage, color }: { percentage: number; color: string }) {
  const radius = 40;
  const cx = 50;
  const cy = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - percentage / 100);

  // Two circles: background ring + foreground arc
  return (
    <Svg width="100" height="100" viewBox="0 0 100 100">
      <Circle cx={cx} cy={cy} r={radius} stroke="#e2e8f0" strokeWidth="8" fill="none" />
      <Circle
        cx={cx} cy={cy} r={radius}
        stroke={color}
        strokeWidth="8"
        fill="none"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={strokeDashoffset}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    </Svg>
  );
}
```

**PDF Data Fetching:** The RBIA report needs data that the existing `getAuditReportData()` DAL function doesn't return. Either:

- Option A: Extend `getAuditReportData()` with RBIA fields (branchRbiaScore, meetings, actionPoints)
- Option B: Create a new `getRbiaReportData(session, engagementId)` DAL function that joins all needed tables

**Recommendation:** Option B — create `getRbiaReportData()` in `src/data-access/reports.ts` (or a new `rbia-report.ts` file) to avoid widening the existing function's scope.

**Report generation server action:** In `generatePdfReport`, after fetching `auditData`, check `auditData.auditType === "RBIA"` and switch to `React.createElement(RbiaReportDocument, { rbiaData })`.

**File naming:** `audit-reports/${tenantId}/${engagementId}_rbia_report.pdf`

### Pattern 5: Board Analytics Charts

**What:** New tab (or section) added to the governance or analytics page with KPI cards, RadarChart, and horizontal bar chart for branch rating distribution.

**RadarChart (new — not yet used):** recharts 3.7.0 includes `RadarChart`, `Radar`, `PolarGrid`, `PolarAngleAxis`, `PolarRadiusAxis`. Wrap with `ChartContainer` following existing chart component patterns:

```typescript
// src/components/rbia/rbia-analytics-radar.tsx
"use client";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

// Data shape: one entry per module
// [{ module: "OPS", score: 75 }, { module: "CREDIT", score: 60 }, ...]
```

**Branch Rating Distribution:** `BarChart` with `layout="vertical"` (horizontal bars) already used in other analytics components. 5 bars, one per rating band (Very Good → Poor), each colored with the RATING_COLORS constant.

**Data Source:** New DAL function `getRbiaAnalyticsSummary(session)` that queries all frozen `BranchRbiaScore` records for the tenant, grouped by ratingBand, with module score averages.

**Period Selector:** Client-side `useState` + `useEffect` to re-fetch scores when the period changes, or pass all periods as server-side props and filter client-side (simpler, no re-fetch).

### Anti-Patterns to Avoid

- **Don't query scoringTreeSnapshot on every render** — pass it as a server-component prop; parsing JSON server-side avoids hydration issues.
- **Don't create new email-sending infrastructure** — use the existing `NotificationQueue` → `notification-processor` → SES pipeline. Queue a `BM_BATCH_OVERDUE` notification, don't call `sendEmail()` directly from the cron job.
- **Don't use `as const` array for BmBatchStatus filter** — cast directly with `as any` per existing DAL pattern.
- **Don't import icons directly from `lucide-react`** — always use `@/lib/icons` barrel export.
- **Don't accept engagementId from URL body in server actions** — always extract tenantId from session.

---

## Don't Hand-Roll

| Problem                 | Don't Build                      | Use Instead                                  | Why                                                     |
| ----------------------- | -------------------------------- | -------------------------------------------- | ------------------------------------------------------- |
| Email sending           | Direct SES sendEmail() from cron | NotificationQueue pipeline                   | Retry, dedup, and audit trail built-in                  |
| File type validation    | Extension check                  | validateFileType() in `src/lib/s3.ts`        | Magic-byte validation prevents spoofing                 |
| Presigned S3 upload     | Custom upload endpoint           | generateUploadUrl() from `src/lib/s3.ts`     | Already handles expiry, SSE-S3, and size limits         |
| Circular gauge (screen) | Custom SVG component             | RadialBarChart from recharts                 | Existing DakshScoreGauge pattern, tooltip/aria included |
| Circular gauge (PDF)    | Third-party PDF chart lib        | @react-pdf/renderer SVG primitives (Circle)  | react-pdf already bundled, SVG Circle is sufficient     |
| RadarChart              | Custom SVG radar                 | recharts RadarChart                          | Built into installed recharts 3.7.0                     |
| Score history query     | Raw SQL                          | getBranchScoreHistory() in `rbia-scoring.ts` | Already implemented in Phase 19                         |
| Cron scheduling         | setInterval or custom timer      | pg-boss DEADLINE_CHECK job                   | Already runs daily at 06:00 IST                         |
| Tenant isolation        | URL-based tenantId               | session.user.tenantId only                   | Project-wide security requirement                       |

**Key insight:** Phase 23 is almost entirely composition and wiring. The infrastructure is complete. Build thin new components that call existing utilities.

---

## Common Pitfalls

### Pitfall 1: BM_BATCH_OVERDUE Notification Type Not in Enum

**What goes wrong:** `NotificationQueue.type` is a string field in Prisma (not an enum), but `TEMPLATE_MAP` in `notification-processor.ts` must have a matching entry or the email will use the fallback `assignment` template.

**Why it happens:** The notification type is stored as a free-form string. Forgetting to add `BM_BATCH_OVERDUE: "bm-batch-overdue"` to `TEMPLATE_MAP` will silently send wrong email.

**How to avoid:** Add to both `TEMPLATE_MAP` in `notification-processor.ts` and create the email template before registering the cron behavior.

**Warning signs:** Escalation email received by Zonal Auditor but content is an "assignment" email template (wrong).

### Pitfall 2: Double-firing the Overdue Transition

**What goes wrong:** If the cron runs twice (pg-boss retry after error), `BmResponseBatch.status` gets set to OVERDUE twice, causing duplicate notification queue entries.

**Why it happens:** The cron finds `status: "PENDING"` on first run, updates to OVERDUE, but the notification creation fails — rollback leaves status as PENDING, cron fires again.

**How to avoid:** Use a database transaction that atomically updates `status` AND creates the notification. Or filter for `status: "PENDING"` (not OVERDUE) — so a successfully transitioned batch is never re-processed. The recommended approach is wrapping both operations in `db.$transaction`.

**Warning signs:** Multiple OVERDUE notification emails received by Zonal Auditor for the same batch.

### Pitfall 3: scoringTreeSnapshot JSONB Shape Unknown Until Phase 20

**What goes wrong:** Phase 23 plan 23-03 (drill-down) depends on `BranchRbiaScore.scoringTreeSnapshot` having a specific shape. This snapshot is written by Phase 20's `freezeRbiaScore` server action — which hasn't been implemented yet.

**Why it happens:** RBIA scoring freeze (EXAM-10) is in Phase 20, not Phase 23. The snapshot shape is defined there.

**How to avoid:** In Phase 23-03 planning, define a `ScoreTreeNode` TypeScript type that matches what Phase 20 will write. From the schema comment: "Full tree with per-node scores for drill-down." The scoring engine from Phase 18 uses `computeModuleScore()` returning `{ score: Decimal, criticalCapped: boolean }` — the snapshot likely mirrors the ExaminationNode hierarchy with scores attached.

**Recommended snapshot shape to assume:**

```typescript
type ScoreTreeNode = {
  nodeId: string;
  code: string;
  name: string;
  depth: number;
  rawScore: number; // 0.0–1.0 Decimal as number
  percentage: number; // rawScore * 100, Math.round
  ratingBand: string;
  criticalCapped: boolean;
  isLeaf: boolean;
  children: ScoreTreeNode[];
};
```

**Warning signs:** Drill-down tree renders empty or throws "cannot read property of undefined" on snapshot children.

### Pitfall 4: PDF Gauge Arc Direction

**What goes wrong:** SVG arc for the circular gauge starts at the wrong angle or goes clockwise/counterclockwise incorrectly when rendered by @react-pdf/renderer.

**Why it happens:** PDF rendering of SVG `strokeDashoffset` and `transform="rotate(-90)"` can differ subtly from browser SVG rendering.

**How to avoid:** Test the `PdfGauge` component in isolation by generating a quick PDF with just the gauge component before assembling the full 8-section document. @react-pdf/renderer 4.x supports SVG `Circle` with `strokeDasharray` and `strokeDashoffset` correctly for arc effects.

**Warning signs:** Gauge appears as a full ring (0%) or full fill (100%) regardless of score.

### Pitfall 5: REPT-01 vs REPT-03 Route Disambiguation

**What goes wrong:** The roadmap shows REPT-01 (composite score display) as Phase 22 and REPT-03 (drill-down) also as Phase 22 — but REPT-02 (historical trend) is Phase 23. The traceability table in REQUIREMENTS.md assigns REPT-01 and REPT-03 to Phase 22, and REPT-02, REPT-04, REPT-05 to Phase 23.

**Actual assignment (from REQUIREMENTS.md traceability):**

- Phase 22: REPT-01 (composite score display + module breakdown), REPT-03 (drill-down)
- Phase 23: REPT-02 (historical trend), REPT-04 (PDF), REPT-05 (board analytics)

**Implication for Phase 23:** Phase 22 delivers the score display page with gauge and module breakdown stub. Phase 23 adds REPT-02 (historical trend line chart) and completes REPT-04 and REPT-05. Do NOT rebuild the score gauge in Phase 23 — complete the trend chart on top of what Phase 22 leaves.

**Warning signs:** Planning redundant gauge component when Phase 22 already built one.

### Pitfall 6: Evidence on ActionPoints — Schema Gap

**What goes wrong:** The existing `Evidence` model has `observationId`, `examinationResponseId`, and `newExaminationResponseId` — but no `actionPointId` field. Storing AP evidence currently has no designated column.

**Why it happens:** The Evidence model is polymorphic but was built before v6.0 ActionPoints existed.

**How to avoid:** Check if Phase 20 adds `actionPointId` to the Evidence model as part of plan 20-04 (`createActionPoint`). If not, either: (a) store evidence S3 keys inline in the `ActionPoint` record as a JSON array field, or (b) add `actionPointId String? @db.Uuid` to `Evidence` in Phase 23. The CONTEXT.md says "evidence upload inline per AP — each response form has its own file upload zone, evidence clearly tied to the specific ActionPoint" — this requires a persistent link. Plan 23-01 should include a Prisma schema addition if Phase 20 doesn't add it.

**Warning signs:** Evidence uploads succeed but have no DB association with the ActionPoint.

---

## Code Examples

Verified patterns from official sources and existing codebase:

### Radial Gauge (screen) — from existing DakshScoreGauge

```typescript
// src/components/rbia/rbia-score-gauge.tsx
"use client";
import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

const RBIA_RATING_COLORS: Record<string, string> = {
  VERY_GOOD: "hsl(142 60% 35%)",   // dark green — CONTEXT: "Very Good=dark green"
  GOOD: "hsl(213 90% 55%)",         // blue — CONTEXT: "Good=blue"
  SATISFACTORY: "hsl(45 96% 56%)", // yellow — CONTEXT: "Satisfactory=yellow"
  MODERATE: "hsl(25 95% 53%)",     // orange — CONTEXT: "Moderate=orange"
  POOR: "hsl(0 84% 60%)",          // red — CONTEXT: "Poor=red"
};

export function RbiaScoreGauge({ compositeScore, ratingBand }: {
  compositeScore: number;  // 0.0–1.0 from BranchRbiaScore.compositeScore
  ratingBand: string;
}) {
  const percentage = Math.round(compositeScore * 100);
  const color = RBIA_RATING_COLORS[ratingBand] ?? RBIA_RATING_COLORS.POOR;
  const chartConfig = { score: { label: "RBIA Score", color } } satisfies ChartConfig;
  const chartData = [{ name: "score", value: percentage, fill: "var(--color-score)" }];

  return (
    <div className="relative">
      <ChartContainer config={chartConfig} className="mx-auto min-h-[200px] w-full max-w-[200px]">
        <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%"
          startAngle={90} endAngle={-270} data={chartData}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={10} background />
        </RadialBarChart>
      </ChartContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-bold">{percentage}%</span>
        <span className="text-sm font-medium" style={{ color }}>{ratingBand.replace(/_/g, " ")}</span>
      </div>
    </div>
  );
}
```

### RadarChart for Board Analytics

```typescript
// src/components/rbia/rbia-analytics-radar.tsx — recharts RadarChart (new usage)
"use client";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

interface ModuleScoreEntry {
  module: string;
  score: number;  // 0–100 percentage
}

export function RbiaModuleRadarChart({ data }: { data: ModuleScoreEntry[] }) {
  const chartConfig = {
    score: { label: "Score", color: "hsl(213 90% 55%)" }
  } satisfies ChartConfig;

  return (
    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid />
        <PolarAngleAxis dataKey="module" />
        <PolarRadiusAxis domain={[0, 100]} tick={false} />
        <Radar dataKey="score" stroke="var(--color-score)" fill="var(--color-score)" fillOpacity={0.3} />
      </RadarChart>
    </ChartContainer>
  );
}
```

### PDF Circular Gauge using @react-pdf/renderer SVG

```typescript
// Inside rbia-report-document.tsx — PDF circular gauge via SVG primitives
import { Svg, Circle, G, Text as PdfText } from "@react-pdf/renderer";

function PdfScoreGauge({ percentage, ratingBand, color }: {
  percentage: number;
  ratingBand: string;
  color: string;
}) {
  const r = 38;
  const circumference = 2 * Math.PI * r;
  const arcLength = circumference * (percentage / 100);
  const gapLength = circumference - arcLength;

  return (
    <Svg width="120" height="120" viewBox="0 0 100 100">
      {/* Background ring */}
      <Circle cx="50" cy="50" r={r} stroke="#e2e8f0" strokeWidth="8" fill="none" />
      {/* Score arc — rotate -90 to start from top */}
      <Circle
        cx="50" cy="50" r={r}
        stroke={color}
        strokeWidth="8"
        fill="none"
        strokeDasharray={`${arcLength} ${gapLength}`}
        transform="rotate(-90 50 50)"
      />
    </Svg>
  );
}
```

### pg-boss DEADLINE_CHECK Extension Pattern

```typescript
// src/jobs/rbia-overdue-escalation.ts — follows overdue-escalation.ts pattern
import { prisma } from "@/lib/prisma";
import { prismaForTenant } from "@/data-access/prisma";

export async function processRbiaOverdueEscalation(): Promise<void> {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true },
  });

  for (const tenant of tenants) {
    try {
      await processRbiaOverdueForTenant(tenant.id);
    } catch (error) {
      console.error(`[rbia-overdue] Error for tenant ${tenant.name}:`, error);
    }
  }
}

async function processRbiaOverdueForTenant(tenantId: string): Promise<void> {
  const db = prismaForTenant(tenantId);
  const now = new Date();

  const overdueBatches = await db.bmResponseBatch.findMany({
    where: { tenantId, status: "PENDING", deadline: { lt: now } },
    select: {
      id: true,
      engagementId: true,
      engagement: { select: { branch: { select: { name: true } } } },
    },
  });

  if (overdueBatches.length === 0) return;

  const zonalAuditors = await db.user.findMany({
    where: {
      tenantId,
      roles: { has: "ZONAL_AUDITOR" as any },
      status: "ACTIVE",
    },
    select: { id: true },
  });

  for (const batch of overdueBatches) {
    await db.$transaction(async (tx) => {
      await tx.bmResponseBatch.update({
        where: { id: batch.id },
        data: { status: "OVERDUE" },
      });

      for (const za of zonalAuditors) {
        await prisma.notificationQueue.create({
          data: {
            tenantId,
            recipientId: za.id,
            type: "BM_BATCH_OVERDUE" as any,
            status: "PENDING",
            payload: {
              batchId: batch.id,
              engagementId: batch.engagementId,
              branchName: batch.engagement.branch?.name ?? "Unknown",
            } as object,
          },
        });
      }
    });
  }
}
```

---

## State of the Art

| Old Approach                  | Current Approach                       | Impact                          |
| ----------------------------- | -------------------------------------- | ------------------------------- |
| Direct `sendEmail()` from job | NotificationQueue + processor pipeline | Retry, dedup, audit trail       |
| Global prisma import in jobs  | `prismaForTenant()` per tenant         | Tenant isolation pattern        |
| Inline PDF styles             | `StyleSheet.create()` at module level  | Performance (computed once)     |
| Custom SVG gauge              | RadialBarChart from recharts           | Tooltip, accessibility, theming |

---

## Open Questions

1. **scoringTreeSnapshot shape from Phase 20**
   - What we know: The JSONB field is called `scoringTreeSnapshot` and contains "full tree with per-node scores for drill-down" (schema comment). Phase 20 plan 20-05 writes this during `freezeRbiaScore`.
   - What's unclear: Exact key names (camelCase vs snake_case), whether `ratingBand` per node is included, whether weights are included.
   - Recommendation: When planning 23-03, coordinate with the 20-05 plan to confirm the shape. Default to the `ScoreTreeNode` type defined in Pitfall 3 above; adjust field names after Phase 20 execution.

2. **Evidence schema gap — actionPointId in Evidence table**
   - What we know: Evidence model currently has `observationId`, `examinationResponseId`, `newExaminationResponseId` but no `actionPointId`. BM AP response requires file attachment.
   - What's unclear: Whether Phase 20 plan 20-04 (createActionPoint + submitBmResponse) adds an `actionPointId` foreign key to Evidence.
   - Recommendation: Plan 23-01 should check and conditionally add `actionPointId String? @db.Uuid` + `actionPoint ActionPoint?` relation to Evidence, plus `evidence Evidence[]` relation on ActionPoint. Include this as a Prisma schema change in the 23-01 plan.

3. **REPT-01 and REPT-03 boundary with Phase 22**
   - What we know: REQUIREMENTS.md traceability assigns REPT-01 and REPT-03 to Phase 22. Phase 22 plan 22-04 delivers `bm-response-panel.tsx` stub. Phase 23 plan 23-03 is "Score display page".
   - What's unclear: Whether Phase 22 builds the full score display page or only a stub that Phase 23 completes.
   - Recommendation: Plan 23-03 should start from what Phase 22 delivers (the stub from Phase 22 plan 21-03 `rbia-score-panel.tsx`) and add REPT-02 (historical trend). Do not rebuild existing gauge or module breakdown — extend them.

4. **Board analytics location — new page or existing analytics tab?**
   - What we know: The existing analytics page is at `/analytics` and uses Tabs for multiple views.
   - What's unclear: Whether board RBIA analytics goes on the existing `/analytics` page (new tab) or a dedicated `/rbia/analytics` page.
   - Recommendation: Add a new "RBIA Analytics" tab to the existing `/analytics` page — this is consistent with how other analytics views are organized and avoids a new route.

---

## Validation Architecture

_(nyquist_validation is not enabled in config.json — this section is omitted)_

---

## Sources

### Primary (HIGH confidence)

- Codebase analysis — `src/jobs/overdue-escalation.ts` — existing cron escalation pattern
- Codebase analysis — `src/jobs/index.ts` — pg-boss DEADLINE_CHECK job registration
- Codebase analysis — `src/components/dashboard/widgets/daksh-score-gauge.tsx` — RadialBarChart gauge pattern
- Codebase analysis — `src/components/dashboard/widgets/health-score-gauge.tsx` — RadialBarChart with percentage domain
- Codebase analysis — `src/components/pdf-report/audit-summary-document.tsx` — @react-pdf/renderer document structure
- Codebase analysis — `src/components/pdf-report/cover-page.tsx` — PDF cover page with bank branding
- Codebase analysis — `src/lib/s3.ts` — presigned upload, validateFileType, generateUploadUrl
- Codebase analysis — `src/data-access/rbia-scoring.ts` — getBranchScoreHistory() already exists
- Codebase analysis — `prisma/schema.prisma` — BmResponseBatch, BranchRbiaScore, Evidence, ActionPoint, BmBatchStatus enum
- Codebase analysis — `package.json` — recharts 3.7.0, @react-pdf/renderer 4.3.2, pg-boss 12.9.0

### Secondary (MEDIUM confidence)

- recharts 3.7.0 RadarChart API — standard Recharts API; Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis components available in 3.x
- @react-pdf/renderer SVG Svg/Circle primitives — documented in official react-pdf docs; strokeDasharray arc pattern is standard SVG

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries are installed and used in codebase; patterns verified by code reading
- Architecture: HIGH — all 5 plans trace directly to existing infrastructure; no unknowns beyond Phase 20 snapshot shape
- Pitfalls: HIGH — identified from concrete schema gaps and notification pipeline analysis

**Research date:** 2026-02-23
**Valid until:** 2026-03-25 (30-day window — recharts and react-pdf are stable APIs)
