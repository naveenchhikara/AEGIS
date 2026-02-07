"use client";

import { useState } from "react";
import { AuditCalendar } from "@/components/audit/audit-calendar";
import { EngagementCard } from "@/components/audit/engagement-card";
import { AuditFilterBar } from "@/components/audit/audit-filter-bar";
import { EngagementDetailSheet } from "@/components/audit/engagement-detail-sheet";
import { auditPlans } from "@/data";
import type { AuditData, AuditPlan } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, CheckCircle2, Activity, Clock } from "@/lib/icons";

const data = auditPlans as unknown as AuditData;

const summaryCards = [
  {
    label: "Total Audits",
    count: data.summary.total,
    icon: ClipboardList,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    label: "Completed",
    count: data.summary.completed,
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    label: "In Progress",
    count: data.summary["in-progress"],
    icon: Activity,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    label: "Planned",
    count: data.summary.planned,
    icon: Clock,
    color: "text-slate-600",
    bg: "bg-slate-50",
  },
];

export default function AuditPlansPage() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"calendar" | "cards">("calendar");
  const [selectedAudit, setSelectedAudit] = useState<AuditPlan | null>(null);

  const filteredAudits =
    typeFilter === "all"
      ? data.auditPlans
      : data.auditPlans.filter((a) => a.type === typeFilter);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Audit Planning
        </h1>
        <p className="text-muted-foreground text-sm">
          Annual audit plan and engagement tracking
        </p>
      </div>

      {/* Summary cards row */}
      <div className="grid gap-3 sm:grid-cols-4">
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

      {/* Filter bar */}
      <AuditFilterBar
        typeFilter={typeFilter}
        viewMode={viewMode}
        onTypeChange={setTypeFilter}
        onViewModeChange={setViewMode}
      />

      {/* Conditional view */}
      {viewMode === "calendar" ? (
        <AuditCalendar
          audits={filteredAudits}
          typeFilter={typeFilter}
          onAuditClick={setSelectedAudit}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredAudits.length > 0 ? (
            filteredAudits.map((audit) => (
              <EngagementCard
                key={audit.id}
                audit={audit}
                onClick={() => setSelectedAudit(audit)}
              />
            ))
          ) : (
            <div className="text-muted-foreground col-span-full rounded-lg border border-dashed p-8 text-center">
              No audits match the selected filter
            </div>
          )}
        </div>
      )}

      {/* Detail sheet */}
      <EngagementDetailSheet
        audit={selectedAudit}
        open={!!selectedAudit}
        onOpenChange={(open) => !open && setSelectedAudit(null)}
      />
    </div>
  );
}
