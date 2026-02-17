---
phase: 2
plan: 6
type: standard
wave: 4
depends_on: [1, 2, 5]
files_modified:
  - src/data-access/analytics/branch-heatmap.ts (new)
  - src/data-access/analytics/audit-progress.ts (new)
  - src/data-access/analytics/compliance-aging.ts (new)
  - src/data-access/analytics/findings-trend.ts (new)
  - src/data-access/analytics/npa-movement.ts (new)
autonomous: true
must_haves:
  truths:
    - "Branch risk heatmap aggregates RAM scores and audit ratings by zone/category"
    - "Audit plan progress shows completed/in-progress/planned engagements per quarter"
    - "Compliance aging analysis groups items by status and days-open buckets (0-30, 31-60, 61-90, 90+)"
    - "Finding trends show observation count and severity distribution over time (monthly/quarterly)"
    - "NPA movement waterfall shows opening balance, additions, upgrades, recoveries, write-offs, closing balance"
    - "All queries respect tenantId isolation and use prismaForTenant()"
  artifacts:
    - path: "src/data-access/analytics/branch-heatmap.ts"
      provides: "getBranchRiskHeatmap() query for R42"
    - path: "src/data-access/analytics/audit-progress.ts"
      provides: "getAuditPlanProgress() query for R43"
    - path: "src/data-access/analytics/compliance-aging.ts"
      provides: "getComplianceAgingAnalysis() query for R44"
    - path: "src/data-access/analytics/findings-trend.ts"
      provides: "getFindingsTrendAnalysis() query for R45"
    - path: "src/data-access/analytics/npa-movement.ts"
      provides: "getNpaMovementWaterfall() query for R46"
---

## Objective

Implement analytics query functions for Phase 2 dashboards: branch risk heatmap (R42), audit plan progress (R43), compliance aging analysis (R44), finding trend analysis (R45), and NPA movement waterfall (R46).

This plan covers R42-R46 (analytics queries).

## Context

@AEGIS/prisma/schema.prisma — Phase 2 schema with ComplianceItem, RamAssessment, AuditEngagement
@AEGIS/src/data-access/prisma.ts — prismaForTenant() for tenant isolation
@AEGIS/.planning/REQUIREMENTS.md — R42-R46
@AEGIS/.planning/codebase/CONVENTIONS.md — DAL patterns

## Tasks

<task type="auto">
  <name>Task 1: Branch risk heatmap query (R42)</name>
  <files>src/data-access/analytics/branch-heatmap.ts (new)</files>
  <action>
  Create `src/data-access/analytics/branch-heatmap.ts`:

  ```typescript
  import { prismaForTenant } from "@/data-access/prisma";
  import type { Session } from "@/lib/auth";
  import { logger } from "@/lib/logger";

  export interface BranchRiskHeatmapItem {
    branchId: string;
    branchCode: string;
    branchName: string;
    city: string;
    state: string;
    zoneName: string | null;
    category: string | null;
    ramScore: number | null;
    riskCategory: string | null;
    lastAuditDate: Date | null;
    lastAuditRating: string | null;
    observationCount: number;
    criticalCount: number;
    highCount: number;
    complianceOpenCount: number;
    complianceOverdueCount: number;
  }

  /**
   * Get branch risk heatmap data (R42).
   * Aggregates RAM scores, audit ratings, and compliance status per branch.
   * Used for geographic/category-based risk visualization.
   */
  export async function getBranchRiskHeatmap(
    session: Session
  ): Promise<BranchRiskHeatmapItem[]> {
    const tenantId = (session.user as any).tenantId as string;
    const db = prismaForTenant(tenantId);

    try {
      // Fetch all branches with related data
      const branches = await db.branch.findMany({
        where: { tenantId },
        include: {
          zone: true,
          observations: {
            where: { status: "ISSUED" },
            select: {
              severity: true,
            },
          },
          complianceItems: {
            where: {
              status: {
                notIn: ["COMPLIED", "ACCEPTED_RISK", "CLOSED"],
              },
            },
            select: {
              daysOpen: true,
            },
          },
        },
        orderBy: [{ state: "asc" }, { city: "asc" }, { name: "asc" }],
      });

      const heatmapData: BranchRiskHeatmapItem[] = branches.map((branch) => {
        const criticalCount = branch.observations.filter(
          (obs) => obs.severity === "CRITICAL"
        ).length;
        const highCount = branch.observations.filter(
          (obs) => obs.severity === "HIGH"
        ).length;

        const complianceOverdueCount = branch.complianceItems.filter(
          (item) => item.daysOpen > 30
        ).length;

        return {
          branchId: branch.id,
          branchCode: branch.code,
          branchName: branch.name,
          city: branch.city,
          state: branch.state,
          zoneName: branch.zone?.name ?? null,
          category: branch.category,
          ramScore: branch.ramScore ? parseFloat(branch.ramScore.toString()) : null,
          riskCategory: null, // TODO: Derive from latest RAM assessment
          lastAuditDate: branch.lastAuditDate,
          lastAuditRating: branch.lastAuditRating,
          observationCount: branch.observations.length,
          criticalCount,
          highCount,
          complianceOpenCount: branch.complianceItems.length,
          complianceOverdueCount,
        };
      });

      return heatmapData;
    } catch (error) {
      logger.error({ error, tenantId }, "Failed to fetch branch risk heatmap");
      throw error;
    }
  }
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/data-access/analytics/branch-heatmap.ts
  ```
  </verify>
  <done>
  - branch-heatmap.ts exists with getBranchRiskHeatmap()
  - Aggregates RAM score, audit rating, observation counts, compliance status per branch
  - Returns BranchRiskHeatmapItem[] for visualization
  - TypeScript compiles successfully
  </done>
</task>

<task type="auto">
  <name>Task 2: Audit plan progress query (R43)</name>
  <files>src/data-access/analytics/audit-progress.ts (new)</files>
  <action>
  Create `src/data-access/analytics/audit-progress.ts`:

  ```typescript
  import { prismaForTenant } from "@/data-access/prisma";
  import type { Session } from "@/lib/auth";
  import type { Quarter } from "@/generated/prisma/enums";
  import { logger } from "@/lib/logger";

  export interface AuditPlanProgressSummary {
    year: number;
    quarter: Quarter;
    totalEngagements: number;
    plannedCount: number;
    inProgressCount: number;
    completedCount: number;
    cancelledCount: number;
    completionPercentage: number;
  }

  /**
   * Get audit plan progress (R43).
   * Shows engagement status distribution per quarter.
   */
  export async function getAuditPlanProgress(
    session: Session,
    year?: number
  ): Promise<AuditPlanProgressSummary[]> {
    const tenantId = (session.user as any).tenantId as string;
    const db = prismaForTenant(tenantId);

    try {
      const currentYear = year ?? new Date().getFullYear();

      const auditPlans = await db.auditPlan.findMany({
        where: {
          tenantId,
          year: currentYear,
        },
        include: {
          engagements: {
            select: {
              status: true,
            },
          },
        },
        orderBy: { quarter: "asc" },
      });

      const progressData: AuditPlanProgressSummary[] = auditPlans.map((plan) => {
        const totalEngagements = plan.engagements.length;
        const plannedCount = plan.engagements.filter(
          (e) => e.status === "PLANNED"
        ).length;
        const inProgressCount = plan.engagements.filter(
          (e) => e.status === "IN_PROGRESS"
        ).length;
        const completedCount = plan.engagements.filter(
          (e) => e.status === "COMPLETED"
        ).length;
        const cancelledCount = plan.engagements.filter(
          (e) => e.status === "CANCELLED"
        ).length;

        const completionPercentage =
          totalEngagements > 0
            ? Math.round((completedCount / totalEngagements) * 100)
            : 0;

        return {
          year: plan.year,
          quarter: plan.quarter,
          totalEngagements,
          plannedCount,
          inProgressCount,
          completedCount,
          cancelledCount,
          completionPercentage,
        };
      });

      return progressData;
    } catch (error) {
      logger.error({ error, tenantId }, "Failed to fetch audit plan progress");
      throw error;
    }
  }
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/data-access/analytics/audit-progress.ts
  ```
  </verify>
  <done>
  - audit-progress.ts exists with getAuditPlanProgress()
  - Returns engagement status counts per quarter
  - Calculates completion percentage
  - TypeScript compiles successfully
  </done>
</task>

<task type="auto">
  <name>Task 3: Compliance aging analysis query (R44)</name>
  <files>src/data-access/analytics/compliance-aging.ts (new)</files>
  <action>
  Create `src/data-access/analytics/compliance-aging.ts`:

  ```typescript
  import { prismaForTenant } from "@/data-access/prisma";
  import type { Session } from "@/lib/auth";
  import type { ComplianceStatus } from "@/generated/prisma/enums";
  import { logger } from "@/lib/logger";

  export interface ComplianceAgingBucket {
    bucket: string; // "0-30", "31-60", "61-90", "90+"
    count: number;
    statusBreakdown: Record<ComplianceStatus, number>;
  }

  export interface ComplianceAgingSummary {
    totalOpen: number;
    averageDaysOpen: number;
    buckets: ComplianceAgingBucket[];
  }

  /**
   * Get compliance aging analysis (R44).
   * Groups open compliance items by days-open buckets and status.
   */
  export async function getComplianceAgingAnalysis(
    session: Session
  ): Promise<ComplianceAgingSummary> {
    const tenantId = (session.user as any).tenantId as string;
    const db = prismaForTenant(tenantId);

    try {
      const openItems = await db.complianceItem.findMany({
        where: {
          tenantId,
          status: {
            notIn: ["COMPLIED", "ACCEPTED_RISK", "CLOSED"],
          },
        },
        select: {
          daysOpen: true,
          status: true,
        },
      });

      const totalOpen = openItems.length;
      const averageDaysOpen =
        totalOpen > 0
          ? Math.round(
              openItems.reduce((sum, item) => sum + item.daysOpen, 0) / totalOpen
            )
          : 0;

      // Define buckets
      const buckets: ComplianceAgingBucket[] = [
        { bucket: "0-30", count: 0, statusBreakdown: {} as any },
        { bucket: "31-60", count: 0, statusBreakdown: {} as any },
        { bucket: "61-90", count: 0, statusBreakdown: {} as any },
        { bucket: "90+", count: 0, statusBreakdown: {} as any },
      ];

      openItems.forEach((item) => {
        let bucketIndex: number;
        if (item.daysOpen <= 30) {
          bucketIndex = 0;
        } else if (item.daysOpen <= 60) {
          bucketIndex = 1;
        } else if (item.daysOpen <= 90) {
          bucketIndex = 2;
        } else {
          bucketIndex = 3;
        }

        buckets[bucketIndex].count++;

        if (!buckets[bucketIndex].statusBreakdown[item.status]) {
          buckets[bucketIndex].statusBreakdown[item.status] = 0;
        }
        buckets[bucketIndex].statusBreakdown[item.status]++;
      });

      return {
        totalOpen,
        averageDaysOpen,
        buckets,
      };
    } catch (error) {
      logger.error({ error, tenantId }, "Failed to fetch compliance aging analysis");
      throw error;
    }
  }
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/data-access/analytics/compliance-aging.ts
  ```
  </verify>
  <done>
  - compliance-aging.ts exists with getComplianceAgingAnalysis()
  - Groups items into buckets: 0-30, 31-60, 61-90, 90+ days
  - Provides status breakdown per bucket
  - Calculates average days open
  - TypeScript compiles successfully
  </done>
</task>

<task type="auto">
  <name>Task 4: Finding trends analysis query (R45)</name>
  <files>src/data-access/analytics/findings-trend.ts (new)</files>
  <action>
  Create `src/data-access/analytics/findings-trend.ts`:

  ```typescript
  import { prismaForTenant } from "@/data-access/prisma";
  import type { Session } from "@/lib/auth";
  import type { Severity } from "@/generated/prisma/enums";
  import { logger } from "@/lib/logger";

  export interface FindingsTrendDataPoint {
    period: string; // "2025-Q1", "2025-01" (year-quarter or year-month)
    totalCount: number;
    severityBreakdown: Record<Severity, number>;
    repeatCount: number;
  }

  export type TrendGranularity = "monthly" | "quarterly";

  /**
   * Get finding trends over time (R45).
   * Shows observation count and severity distribution by period.
   */
  export async function getFindingsTrendAnalysis(
    session: Session,
    startDate: Date,
    endDate: Date,
    granularity: TrendGranularity = "quarterly"
  ): Promise<FindingsTrendDataPoint[]> {
    const tenantId = (session.user as any).tenantId as string;
    const db = prismaForTenant(tenantId);

    try {
      const observations = await db.observation.findMany({
        where: {
          tenantId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          status: "ISSUED",
        },
        select: {
          createdAt: true,
          severity: true,
          repeatOfId: true,
        },
        orderBy: { createdAt: "asc" },
      });

      // Group by period
      const periodMap = new Map<string, FindingsTrendDataPoint>();

      observations.forEach((obs) => {
        const period = this.getPeriodKey(obs.createdAt, granularity);

        if (!periodMap.has(period)) {
          periodMap.set(period, {
            period,
            totalCount: 0,
            severityBreakdown: {
              CRITICAL: 0,
              HIGH: 0,
              MEDIUM: 0,
              LOW: 0,
            },
            repeatCount: 0,
          });
        }

        const dataPoint = periodMap.get(period)!;
        dataPoint.totalCount++;
        dataPoint.severityBreakdown[obs.severity]++;
        if (obs.repeatOfId) {
          dataPoint.repeatCount++;
        }
      });

      return Array.from(periodMap.values()).sort((a, b) =>
        a.period.localeCompare(b.period)
      );
    } catch (error) {
      logger.error({ error, tenantId }, "Failed to fetch findings trend analysis");
      throw error;
    }
  }

  function getPeriodKey(date: Date, granularity: TrendGranularity): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    if (granularity === "quarterly") {
      const quarter = Math.ceil(month / 3);
      // Indian FY quarter: Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec, Q4=Jan-Mar
      const fyQuarter =
        month >= 4 && month <= 6
          ? 1
          : month >= 7 && month <= 9
          ? 2
          : month >= 10 && month <= 12
          ? 3
          : 4;
      const fyYear = month >= 4 ? year : year - 1;
      return `${fyYear}-Q${fyQuarter}`;
    } else {
      return `${year}-${month.toString().padStart(2, "0")}`;
    }
  }
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/data-access/analytics/findings-trend.ts
  ```
  </verify>
  <done>
  - findings-trend.ts exists with getFindingsTrendAnalysis()
  - Supports monthly and quarterly granularity
  - Groups observations by period with severity breakdown
  - Tracks repeat finding count per period
  - TypeScript compiles successfully
  </done>
</task>

<task type="auto">
  <name>Task 5: NPA movement waterfall query (R46)</name>
  <files>src/data-access/analytics/npa-movement.ts (new)</files>
  <action>
  Create `src/data-access/analytics/npa-movement.ts`:

  ```typescript
  import { prismaForTenant } from "@/data-access/prisma";
  import type { Session } from "@/lib/auth";
  import { logger } from "@/lib/logger";

  export interface NpaMovementWaterfall {
    openingBalance: number;
    additions: number;
    upgrades: number; // SMA → NPA, or NPA_SUB → NPA_DOUBTFUL
    recoveries: number;
    writeOffs: number;
    closingBalance: number;
    netChange: number;
  }

  /**
   * Get NPA movement waterfall (R46).
   * Shows opening balance, additions, upgrades, recoveries, write-offs, closing balance.
   * 
   * NOTE: This is a simplified version. In production, this would require:
   * - Time-series loan data (opening/closing balances per period)
   * - Movement tracking (new NPAs, upgrades, recoveries)
   * - CBS data integration
   * 
   * For Phase 2, we compute a simplified view from SmaNpaEntry data.
   */
  export async function getNpaMovementWaterfall(
    session: Session,
    startDate: Date,
    endDate: Date
  ): Promise<NpaMovementWaterfall> {
    const tenantId = (session.user as any).tenantId as string;
    const db = prismaForTenant(tenantId);

    try {
      // Fetch all SMA/NPA entries within date range
      const entries = await db.smaNpaEntry.findMany({
        where: {
          tenantId,
          engagement: {
            actualEndDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
        select: {
          category: true,
          totalAmount: true,
          engagement: {
            select: {
              actualEndDate: true,
            },
          },
        },
        orderBy: {
          engagement: {
            actualEndDate: "asc",
          },
        },
      });

      // Simplified calculation: group by NPA categories
      const npaCategories = ["NPA_SUB_STANDARD", "NPA_DOUBTFUL", "NPA_LOSS"];

      const opening = entries
        .filter(
          (e) =>
            npaCategories.includes(e.category) &&
            e.engagement.actualEndDate &&
            e.engagement.actualEndDate <= startDate
        )
        .reduce((sum, e) => sum + parseFloat(e.totalAmount.toString()), 0);

      const closing = entries
        .filter(
          (e) =>
            npaCategories.includes(e.category) &&
            e.engagement.actualEndDate &&
            e.engagement.actualEndDate <= endDate
        )
        .reduce((sum, e) => sum + parseFloat(e.totalAmount.toString()), 0);

      // Simplified: assume net change is additions
      const netChange = closing - opening;
      const additions = netChange > 0 ? netChange : 0;
      const recoveries = netChange < 0 ? Math.abs(netChange) : 0;

      return {
        openingBalance: opening,
        additions,
        upgrades: 0, // TODO: Requires movement tracking
        recoveries,
        writeOffs: 0, // TODO: Requires write-off data
        closingBalance: closing,
        netChange,
      };
    } catch (error) {
      logger.error({ error, tenantId }, "Failed to fetch NPA movement waterfall");
      throw error;
    }
  }
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/data-access/analytics/npa-movement.ts
  ```
  </verify>
  <done>
  - npa-movement.ts exists with getNpaMovementWaterfall()
  - Simplified implementation using SmaNpaEntry data
  - Returns opening balance, additions, recoveries, closing balance
  - TODO comments for CBS integration in future phases
  - TypeScript compiles successfully
  </done>
</task>

## Success Criteria

1. `pnpm exec tsc --noEmit` passes for all new analytics DAL files
2. getBranchRiskHeatmap() aggregates RAM scores, audit ratings, and compliance status per branch
3. getAuditPlanProgress() shows engagement status distribution per quarter with completion percentage
4. getComplianceAgingAnalysis() groups items into buckets (0-30, 31-60, 61-90, 90+) with status breakdown
5. getFindingsTrendAnalysis() supports monthly and quarterly granularity with severity distribution
6. getNpaMovementWaterfall() provides opening/closing balance and net change (simplified for Phase 2)
7. All queries respect tenant isolation via prismaForTenant()
