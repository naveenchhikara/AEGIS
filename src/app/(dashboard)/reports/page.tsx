import {
  demoComplianceRequirements,
  findings,
  bankProfile,
} from "@/data";
import type {
  ComplianceData,
  FindingsData,
  BankProfile,
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileBarChart,
  ShieldCheck,
  AlertTriangle,
  Building2,
  TrendingUp,
} from "@/lib/icons";
import { formatDate } from "@/lib/utils";

const bank = bankProfile as unknown as BankProfile;
const compData = demoComplianceRequirements as unknown as ComplianceData;
const findData = findings as unknown as FindingsData;

const complianceScore = Math.round(
  (compData.summary.compliant / compData.summary.total) * 100,
);

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Board Report
        </h1>
        <p className="text-sm text-muted-foreground">
          Executive summary for the Board of Directors — {bank.name}
        </p>
      </div>

      {/* Executive summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              Compliance Scorecard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-600">
              {complianceScore}%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {compData.summary.compliant} compliant, {compData.summary.partial}{" "}
              partial, {compData.summary["non-compliant"]} non-compliant out of{" "}
              {compData.summary.total} requirements
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              Findings Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{findData.summary.total}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {findData.summary.bySeverity.critical} critical,{" "}
              {findData.summary.bySeverity.high} high,{" "}
              {findData.summary.byStatus.closed} closed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2 className="h-4 w-4" />
              Financial Position
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {bank.lastFinancials.crar}%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              CRAR ({bank.lastFinancials.year}) &middot; NPA:{" "}
              {bank.lastFinancials.npaPercentage}% &middot; Net Profit: ₹
              {bank.lastFinancials.netProfit} Cr
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top findings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileBarChart className="h-4 w-4" />
            Top Findings for Board Attention
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {findData.findings
              .filter((f) => f.severity === "critical" || f.severity === "high")
              .map((f) => (
                <div key={f.id} className="rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${
                        f.severity === "critical"
                          ? "bg-red-100 text-red-700"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {f.severity.toUpperCase()}
                    </span>
                    <span className="text-sm font-semibold">{f.title}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {f.observation}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Assigned: {f.assignedAuditor} &middot; Target:{" "}
                    {formatDate(f.targetDate)}
                  </p>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Placeholder */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 rounded-lg border border-dashed p-6 text-center">
            <TrendingUp className="mx-auto h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="mt-3 text-center text-sm text-muted-foreground">
            Full board report with DAKSH score visualization and trend charts
            coming in Phase 2
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
