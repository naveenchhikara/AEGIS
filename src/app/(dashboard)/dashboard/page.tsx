"use client";

import { HealthScoreCard } from "@/components/dashboard/health-score-card";
import { AuditCoverageChart } from "@/components/dashboard/audit-coverage-chart";
import { FindingsCountCards } from "@/components/dashboard/findings-count-cards";
import { RiskIndicatorPanel } from "@/components/dashboard/risk-indicator-panel";
import { RegulatoryCalendar } from "@/components/dashboard/regulatory-calendar";
import { QuickActions } from "@/components/dashboard/quick-actions";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Audit & compliance overview for Apex Sahakari Bank Ltd
        </p>
      </div>

      {/* Row 1 — Key Metrics (3 columns) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <HealthScoreCard />
        <AuditCoverageChart />
        <FindingsCountCards />
      </div>

      {/* Row 2 — Risk & Timeline (2 columns) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RiskIndicatorPanel />
        <RegulatoryCalendar />
      </div>

      {/* Row 3 — Actions (full width) */}
      <QuickActions />
    </div>
  );
}
