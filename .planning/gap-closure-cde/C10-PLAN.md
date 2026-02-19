---
module: C
plan: C10
phase: 04-regulatory
type: execute
wave: 2
depends_on: [C4, C6]
files_modified:
  - src/app/(dashboard)/housekeeping/page.tsx
  - src/components/housekeeping/metrics-capture-form.tsx
  - src/components/housekeeping/risk-mis-dashboard.tsx
  - src/components/housekeeping/interbank-exposure-monitor.tsx
  - src/data-access/governance.ts
  - src/data-access/housekeeping-mis.ts
autonomous: true
gap_closure: true

must_haves:
  truths:
    - "Housekeeping risk metrics capture UI allows branch-level data entry"
    - "Risk management MIS dashboards display CRAR, asset quality, liquidity, operational metrics"
    - "Inter-bank exposure monitoring enforces 20% total and 5% per-bank limits"
  artifacts:
    - path: "src/app/(dashboard)/housekeeping/page.tsx"
      provides: "Server component for housekeeping metrics and MIS dashboards"
      min_lines: 50
      pattern: "getHousekeepingMetrics|getHighRiskHousekeepingMetrics"
    - path: "src/components/housekeeping/metrics-capture-form.tsx"
      provides: "Housekeeping risk metrics capture form with branch/period selection"
      min_lines: 80
      pattern: "createHousekeepingMetric|updateHousekeepingMetric|INTER_BRANCH|SUSPENSE|CLEARING"
    - path: "src/components/housekeeping/risk-mis-dashboard.tsx"
      provides: "Risk management MIS dashboards (CRAR, asset quality, liquidity, operational)"
      min_lines: 100
      pattern: "crar|assetQuality|liquidity|operationalRisk"
    - path: "src/components/housekeeping/interbank-exposure-monitor.tsx"
      provides: "Inter-bank exposure monitoring with 20%/5% limits"
      min_lines: 60
      pattern: "interbankExposure|totalLimit|perBankLimit|20%|5%"
  key_links:
    - from: "src/app/(dashboard)/housekeeping/page.tsx"
      to: "src/data-access/governance.ts"
      via: "getHousekeepingMetrics, getHighRiskHousekeepingMetrics"
      pattern: "await getHousekeepingMetrics\\(session"
    - from: "src/components/housekeeping/metrics-capture-form.tsx"
      to: "src/data-access/governance.ts"
      via: "createHousekeepingMetric, updateHousekeepingMetric"
      pattern: "createHousekeepingMetric"
---

<objective>
Create housekeeping risk metrics capture UI, risk management MIS dashboards, and inter-bank exposure monitoring.

**Purpose:** Close R80, R87, R88 gaps by building dedicated UI for housekeeping metric data entry, comprehensive MIS dashboards covering CRAR/asset quality/liquidity/operational risk, and inter-bank exposure monitoring with regulatory limits.

**Output:** Housekeeping module with metrics capture, MIS dashboards, and exposure monitoring.
</objective>

<execution_context>
@.planning/gap-closure-cde/C10-PLAN.md
</execution_context>

<context>
@.planning/VALIDATION-REPORT.md
@.planning/codebase/CONVENTIONS.md
@src/data-access/governance.ts (housekeeping metrics section)
</context>

<tasks>

<task type="auto">
  <name>Create housekeeping page and route</name>
  <files>
    src/app/(dashboard)/housekeeping/page.tsx
  </files>
  <action>
Create new route for housekeeping metrics and MIS:

```typescript
import { getRequiredSession } from "@/data-access/session";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { getHousekeepingMetrics, getHighRiskHousekeepingMetrics } from "@/data-access/governance";
import { prismaForTenant } from "@/data-access/prisma";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricsCaptureForm } from "@/components/housekeeping/metrics-capture-form";
import { RiskMisDashboard } from "@/components/housekeeping/risk-mis-dashboard";
import { InterbankExposureMonitor } from "@/components/housekeeping/interbank-exposure-monitor";

export default async function HousekeepingPage() {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];

  if (!hasPermission(userRoles, "risk_mis:read")) {
    redirect("/dashboard");
  }

  const canManage = hasPermission(userRoles, "risk_mis:manage");
  const tenantId = (session.user as any).tenantId as string;

  // Fetch housekeeping data
  const metrics = await getHousekeepingMetrics(session);
  const highRiskMetrics = await getHighRiskHousekeepingMetrics(session, 90);

  // Fetch branches for capture form
  const db = prismaForTenant(tenantId);
  const branches = await db.branch.findMany({
    where: { tenantId },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Housekeeping & Risk MIS</h1>
        <p className="text-muted-foreground">
          Housekeeping risk metrics, risk management dashboards, and exposure monitoring
        </p>
      </div>
      <Tabs defaultValue="capture" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="capture">Metrics Capture</TabsTrigger>
          <TabsTrigger value="mis">Risk MIS</TabsTrigger>
          <TabsTrigger value="exposure">Inter-bank Exposure</TabsTrigger>
        </TabsList>
        <TabsContent value="capture">
          <MetricsCaptureForm
            metrics={metrics}
            highRiskMetrics={highRiskMetrics}
            branches={branches}
            canManage={canManage}
          />
        </TabsContent>
        <TabsContent value="mis">
          <RiskMisDashboard metrics={metrics} />
        </TabsContent>
        <TabsContent value="exposure">
          <InterbankExposureMonitor metrics={metrics} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

Also update nav-items.ts to include the `/housekeeping` route if not present.
</action>
<verify>

```bash
cd /root/.openclaw/workspace/AEGIS
pnpm exec tsc --noEmit --pretty false 2>&1 | grep -c "error TS"
```

  </verify>
  <done>
- `/housekeeping` route created with 3 tabs
- Real data fetched from governance DAL (housekeeping metrics)
  </done>
</task>

<task type="auto">
  <name>Build Housekeeping Metrics Capture Form</name>
  <files>
    src/components/housekeeping/metrics-capture-form.tsx
  </files>
  <action>
Create housekeeping risk metrics capture UI (R80):

1. Props: `metrics` array, `highRiskMetrics` array, `branches` array, `canManage` boolean

2. High-risk alerts banner:
   - Show metrics with agingDays > 90 days
   - Red badges for > 180 days, yellow for 90-180 days

3. Capture form (dialog):
   - Branch selector (from branches prop)
   - Metric type: INTER_BRANCH, SUSPENSE, CLEARING, SUNDRY
   - Period: year-quarter format (e.g., "2025-Q4")
   - Opening balance (Decimal)
   - Closing balance (Decimal)
   - Entries count (Int)
   - Aging days (Int)
   - Remarks (text)

4. Create action — use DAL directly since no server action exists:

   ```typescript
   // Create server action for housekeeping metrics
   "use server";
   import {
     createHousekeepingMetric,
     updateHousekeepingMetric,
   } from "@/data-access/governance";
   ```

   Actually, create a new server action `src/actions/housekeeping/manage-metric.ts`:

   ```typescript
   "use server";
   const ManageMetricSchema = z.object({
     id: z.string().uuid().optional(),
     branchId: z.string().uuid(),
     metricType: z.enum(["INTER_BRANCH", "SUSPENSE", "CLEARING", "SUNDRY"]),
     period: z.string().regex(/^\d{4}-Q[1-4]$/),
     openingBalance: z.number(),
     closingBalance: z.number(),
     entriesCount: z.number().int().min(0).optional(),
     agingDays: z.number().int().min(0).optional(),
     remarks: z.string().optional(),
   });
   // Implementation follows standard action pattern
   ```

5. Metrics table:
   - Grouped by branch, then by metric type
   - Columns: Branch, Metric Type, Period, Opening, Closing, Entries, Aging, Remarks
   - Color-code aging: green (<30), yellow (30-90), orange (90-180), red (>180)
   - Edit/delete actions

6. Filters: branch, metric type, period
   </action>
   <verify>
   Metrics capture form creates and updates housekeeping metrics.
   </verify>
   <done>

- Housekeeping metrics capture form with branch/period selection
- Server action created for metric CRUD
- High-risk aging alerts
- Table with color-coded aging indicators
  </done>
  </task>

<task type="auto">
  <name>Build Risk Management MIS Dashboards</name>
  <files>
    src/components/housekeeping/risk-mis-dashboard.tsx
    src/data-access/housekeeping-mis.ts
  </files>
  <action>
Create risk management MIS dashboards (R87):

1. Create new DAL file `src/data-access/housekeeping-mis.ts`:

   ```typescript
   import "server-only";
   import { prismaForTenant } from "./prisma";
   import type { Session } from "@/lib/auth";

   export async function getRiskMisData(session: Session) {
     const tenantId = (session.user as any).tenantId as string;
     const db = prismaForTenant(tenantId);

     // CRAR Indicators (from housekeeping metrics or manual input)
     const crarMetrics = await db.housekeepingMetric.findMany({
       where: {
         tenantId,
         metricType: {
           in: [
             "CRAR_TIER1",
             "CRAR_TIER2",
             "CRAR_TOTAL",
             "RISK_WEIGHTED_ASSETS",
           ],
         },
       },
       orderBy: { period: "desc" },
       take: 8, // Last 8 quarters
     });

     // Asset Quality
     const assetQuality = await db.housekeepingMetric.findMany({
       where: {
         tenantId,
         metricType: {
           in: ["GROSS_NPA", "NET_NPA", "PROVISION_COVERAGE", "SLIPPAGE_RATIO"],
         },
       },
       orderBy: { period: "desc" },
       take: 8,
     });

     // Liquidity
     const liquidity = await db.housekeepingMetric.findMany({
       where: {
         tenantId,
         metricType: {
           in: ["SLR_MAINTAINED", "CRR_MAINTAINED", "LCR", "CD_RATIO"],
         },
       },
       orderBy: { period: "desc" },
       take: 8,
     });

     // Operational Risk
     const operational = await db.housekeepingMetric.findMany({
       where: {
         tenantId,
         metricType: { in: ["INTER_BRANCH", "SUSPENSE", "CLEARING", "SUNDRY"] },
       },
       include: { branch: { select: { name: true } } },
       orderBy: { period: "desc" },
     });

     return { crarMetrics, assetQuality, liquidity, operational };
   }
   ```

2. Dashboard component with 4 sections:

   **A. CRAR Dashboard:**
   - Current CRAR ratio (if available) with regulatory minimum (9%)
   - Tier 1 + Tier 2 breakdown
   - Trend chart (quarter-over-quarter)
   - Alert if below regulatory minimum

   **B. Asset Quality:**
   - Gross NPA %, Net NPA %
   - Provision coverage ratio
   - Slippage ratio trend
   - Alert thresholds per RBI norms

   **C. Liquidity:**
   - SLR maintained vs required (currently 18%)
   - CRR maintained vs required
   - Liquidity Coverage Ratio (LCR)
   - Credit-Deposit ratio
   - Regulatory compliance indicators

   **D. Operational Risk:**
   - Inter-branch reconciliation aging (aggregate)
   - Suspense account balances
   - Clearing account aging
   - Sundry account monitoring
   - Heatmap: branch × metric type with aging colors

3. Note: Many MIS metrics require manual data entry via housekeeping capture form
   - Show "Data not available" with prompt to enter via Metrics Capture tab
   - Expand metric types in the capture form to include CRAR/asset quality/liquidity types

4. Use Card, Table, Badge, Progress components
   </action>
   <verify>
   MIS dashboard renders 4 risk sections from housekeeping data.
   </verify>
   <done>

- CRAR, Asset Quality, Liquidity, Operational risk dashboards
- Trend data from housekeeping metrics
- Regulatory threshold alerts
- "Data not available" prompts for missing metrics
  </done>
  </task>

<task type="auto">
  <name>Build Inter-bank Exposure Monitor</name>
  <files>
    src/components/housekeeping/interbank-exposure-monitor.tsx
    src/actions/housekeeping/manage-metric.ts
  </files>
  <action>
Create inter-bank exposure monitoring (R88):

1. First, create the server action file `src/actions/housekeeping/manage-metric.ts`:

   ```typescript
   "use server";
   import { revalidatePath } from "next/cache";
   import { z } from "zod";
   import { getRequiredSession } from "@/data-access/session";
   import { prismaForTenant } from "@/data-access/prisma";
   import { setAuditContext } from "@/data-access/audit-context";
   import { hasPermission, type Role } from "@/lib/permissions";
   import { logger } from "@/lib/logger";

   const ManageMetricSchema = z.object({
     id: z.string().uuid().optional(),
     branchId: z.string().uuid(),
     metricType: z.string().min(1),
     period: z.string().regex(/^\d{4}-Q[1-4]$/),
     openingBalance: z.number(),
     closingBalance: z.number(),
     entriesCount: z.number().int().min(0).optional(),
     agingDays: z.number().int().min(0).optional(),
     remarks: z.string().optional(),
   });

   export async function manageHousekeepingMetric(
     input: z.infer<typeof ManageMetricSchema>,
   ) {
     const session = await getRequiredSession();
     const userRoles = ((session.user as any).roles ?? []) as Role[];
     const tenantId = (session.user as any).tenantId as string;

     if (!hasPermission(userRoles, "risk_mis:manage")) {
       return { success: false as const, error: "Permission denied." };
     }

     const parsed = ManageMetricSchema.safeParse(input);
     if (!parsed.success) {
       return {
         success: false as const,
         error: parsed.error.issues[0].message,
       };
     }

     const db = prismaForTenant(tenantId);

     try {
       const result = await db.$transaction(async (tx: any) => {
         await setAuditContext(tx, {
           actionType: parsed.data.id
             ? "housekeeping.metric_updated"
             : "housekeeping.metric_created",
           userId: session.user.id,
           tenantId,
           sessionId: session.session.id,
         });

         if (parsed.data.id) {
           return tx.housekeepingMetric.update({
             where: { id: parsed.data.id },
             data: {
               openingBalance: parsed.data.openingBalance,
               closingBalance: parsed.data.closingBalance,
               entriesCount: parsed.data.entriesCount || 0,
               agingDays: parsed.data.agingDays,
               remarks: parsed.data.remarks,
             },
           });
         }
         return tx.housekeepingMetric.create({
           data: {
             tenantId,
             ...parsed.data,
             entriesCount: parsed.data.entriesCount || 0,
           },
         });
       });

       revalidatePath("/housekeeping");
       return { success: true as const, data: { id: result.id } };
     } catch (error) {
       logger.error(
         { error, action: "manage_housekeeping_metric", tenantId },
         "Failed",
       );
       return { success: false as const, error: "Failed to manage metric." };
     }
   }
   ```

2. Inter-bank exposure monitoring component:

   **Exposure data model:**
   - Use HousekeepingMetric with metricType = "INTERBANK_EXPOSURE"
   - Each entry represents exposure to one bank
   - branchId used as the "source branch" context
   - Remarks stores the counterparty bank name
   - closingBalance = current exposure amount

   **Dashboard:**
   - Total net worth (manual input or from CRAR metrics)
   - Total inter-bank exposure (sum of all INTERBANK_EXPOSURE metrics)
   - Total limit: 20% of net worth
   - Utilization bar: current exposure / total limit

   **Per-bank exposure table:**
   - Counterparty bank name
   - Exposure amount
   - Per-bank limit: 5% of net worth
   - Utilization %
   - Status: WITHIN_LIMIT (green), WARNING (yellow >80%), BREACH (red >100%)

   **Alerts:**
   - Total exposure > 18% of net worth: WARNING
   - Total exposure > 20% of net worth: BREACH
   - Any single bank > 4% of net worth: WARNING
   - Any single bank > 5% of net worth: BREACH

   **Add exposure entry form:**
   - Counterparty bank name
   - Exposure amount
   - Period
   - Remarks

3. Regulatory reference: "Total inter-bank exposure shall not exceed 20% of net worth. Exposure to any single bank shall not exceed 5% of net worth (RBI Master Circular on Exposure Norms)"
   </action>
   <verify>
   Inter-bank exposure monitor shows utilization with alerts.
   </verify>
   <done>

- Inter-bank exposure monitoring with 20% total / 5% per-bank limits
- Server action for housekeeping metric CRUD created
- Per-bank exposure table with breach alerts
- Regulatory limit compliance indicators
  </done>
  </task>

</tasks>

<verification>
1. TypeScript compilation clean
2. `/housekeeping` loads with 3 tabs and real data
3. Metrics capture form creates/updates housekeeping metrics
4. Risk MIS shows 4 dashboards (CRAR, asset quality, liquidity, operational)
5. Inter-bank exposure monitoring with limit tracking
6. Aging color coding works across all views
7. Tenant isolation maintained
</verification>

<success_criteria>

- ✅ `/housekeeping` page created with metrics capture UI
- ✅ Housekeeping risk metrics (inter-branch, suspense, clearing) capturable
- ✅ Risk management MIS dashboards (CRAR, asset quality, liquidity, operational)
- ✅ Inter-bank exposure monitoring (20% total, 5% per-bank)
- ✅ Server action for housekeeping metric management
- ✅ TypeScript compilation clean
- ✅ R80, R87, R88 requirements closed
  </success_criteria>

<output>
After completion, update VALIDATION-REPORT.md:
- R80: ✅ (Housekeeping risk metrics capture UI)
- R87: ✅ (Risk management MIS dashboards — CRAR, asset quality, liquidity, operational)
- R88: ✅ (Inter-bank exposure monitoring — 20% total, 5% per-bank limits)
</output>
