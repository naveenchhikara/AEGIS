import { findings } from "@/data";
import type { FindingsData } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { FindingsTable } from "@/components/findings/findings-table";
import { CircleAlert, AlertTriangle, CheckCircle2, Clock } from "@/lib/icons";

const data = findings as unknown as FindingsData;

const severityCards = [
  {
    label: "Critical",
    count: data.summary.bySeverity.critical ?? 0,
    icon: CircleAlert,
    color: "text-red-600",
    bg: "bg-red-50",
  },
  {
    label: "High",
    count: data.summary.bySeverity.high ?? 0,
    icon: AlertTriangle,
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    label: "Medium",
    count: data.summary.bySeverity.medium ?? 0,
    icon: Clock,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
  },
  {
    label: "Low",
    count: data.summary.bySeverity.low ?? 0,
    icon: CheckCircle2,
    color: "text-green-600",
    bg: "bg-green-50",
  },
];

export default function FindingsPage() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight md:text-2xl">
          Audit Findings
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          {data.summary.total} findings across all audits
        </p>
      </div>

      {/* Severity distribution — 2 cols mobile, 4 cols sm+ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {severityCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-2 p-3 md:gap-3 md:p-4">
              <div className={`rounded-lg p-1.5 md:p-2 ${s.bg}`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-lg font-bold md:text-xl">{s.count}</p>
                <p className="text-muted-foreground text-sm">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Findings table with sorting, filtering, and row navigation */}
      <FindingsTable />
    </div>
  );
}
