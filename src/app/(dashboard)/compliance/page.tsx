"use client";

import { ComplianceTable } from "@/components/compliance/compliance-table";
import { ComplianceTrendChart } from "@/components/compliance/compliance-trend-chart";
import { demoComplianceRequirements } from "@/data";
import type { ComplianceData } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
} from "@/lib/icons";

const data = demoComplianceRequirements as unknown as ComplianceData;

const summaryCards = [
  {
    label: "Total",
    count: data.summary.total,
    icon: ShieldCheck,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    label: "Compliant",
    count: data.summary.compliant,
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    label: "Partial",
    count: data.summary.partial,
    icon: AlertTriangle,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    label: "Non-Compliant",
    count: data.summary["non-compliant"],
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-50",
  },
  {
    label: "Pending",
    count: data.summary.pending,
    icon: Clock,
    color: "text-slate-600",
    bg: "bg-slate-50",
  },
];

export default function CompliancePage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Compliance Registry
        </h1>
        <p className="text-muted-foreground text-sm">
          RBI regulatory compliance requirements tracker
        </p>
      </div>

      {/* Summary cards row */}
      <div className="grid gap-3 sm:grid-cols-5">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`rounded-lg p-2 ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold">{card.count}</p>
                <p className="text-muted-foreground text-xs">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content - Table (2 cols) and Trend Chart (1 col) */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ComplianceTable />
        </div>
        <div>
          <ComplianceTrendChart />
        </div>
      </div>
    </div>
  );
}
