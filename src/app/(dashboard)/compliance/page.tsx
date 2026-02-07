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
    <div className="space-y-4 md:space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-lg font-semibold tracking-tight md:text-2xl">
          Compliance Registry
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          RBI regulatory compliance requirements tracker
        </p>
      </div>

      {/* Summary cards row — 2 cols mobile, 3 cols sm, 5 cols md+ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="flex items-center gap-2 p-3 md:gap-3 md:p-4">
              <div className={`rounded-lg p-1.5 md:p-2 ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <div>
                <p className="text-lg font-bold md:text-xl">{card.count}</p>
                <p className="text-muted-foreground text-sm">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content - stacked on mobile, 2+1 cols on desktop */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
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
