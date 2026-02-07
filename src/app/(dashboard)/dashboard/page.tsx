"use client";

import { HealthScoreCard } from "@/components/dashboard/health-score-card";
import { AuditCoverageChart } from "@/components/dashboard/audit-coverage-chart";
import { FindingsCountCards } from "@/components/dashboard/findings-count-cards";
import { RiskIndicatorPanel } from "@/components/dashboard/risk-indicator-panel";
import { RegulatoryCalendar } from "@/components/dashboard/regulatory-calendar";
import { QuickActions } from "@/components/dashboard/quick-actions";

export default function DashboardPage() {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-lg font-semibold tracking-tight md:text-2xl">Dashboard</h1>
        <p className="text-muted-foreground text-xs md:text-sm">
          Audit & compliance overview for Apex Sahakari Bank Ltd
        </p>
      </div>

      {/* Row 1 — Key Metrics (1 col mobile, 2 col tablet, 3 col desktop) */}
      <div className="animate-fade-in-up grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <HealthScoreCard />
        <AuditCoverageChart />
        <FindingsCountCards />
      </div>

      {/* Row 2 — Risk & Timeline (1 col mobile, 2 col tablet+) */}
      <div className="animate-fade-in-up delay-2 grid gap-4 md:grid-cols-2">
        <RiskIndicatorPanel />
        <RegulatoryCalendar />
      </div>

      {/* Row 3 — Actions (full width) */}
      <div className="animate-fade-in-up delay-3">
        <QuickActions />
      </div>
    </div>
  );
}
