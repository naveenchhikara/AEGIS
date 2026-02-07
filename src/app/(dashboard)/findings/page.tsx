import { findings } from "@/data";
import type { FindingsData } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SEVERITY_COLORS, FINDING_STATUS_COLORS } from "@/lib/constants";
import {
  CircleAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "@/lib/icons";

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

const statusCards = [
  { label: "Draft", count: data.summary.byStatus.draft ?? 0 },
  { label: "Submitted", count: data.summary.byStatus.submitted ?? 0 },
  { label: "Reviewed", count: data.summary.byStatus.reviewed ?? 0 },
  { label: "Responded", count: data.summary.byStatus.responded ?? 0 },
  { label: "Closed", count: data.summary.byStatus.closed ?? 0 },
];

export default function FindingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Audit Findings
        </h1>
        <p className="text-sm text-muted-foreground">
          {data.summary.total} findings across all audits
        </p>
      </div>

      {/* Severity distribution */}
      <div className="grid gap-3 sm:grid-cols-4">
        {severityCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`rounded-lg p-2 ${s.bg}`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold">{s.count}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status distribution */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            {statusCards.map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="text-sm font-medium">{s.count}</span>
                <span className="text-xs text-muted-foreground">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Findings table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">ID</TableHead>
                <TableHead>Finding</TableHead>
                <TableHead className="w-28">Category</TableHead>
                <TableHead className="w-24">Severity</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-28">Auditor</TableHead>
                <TableHead className="w-28">Target Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.findings.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-xs">{f.id}</TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{f.title}</p>
                  </TableCell>
                  <TableCell className="text-xs">{f.category}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        SEVERITY_COLORS[
                          f.severity as keyof typeof SEVERITY_COLORS
                        ] ?? ""
                      }
                    >
                      {f.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        FINDING_STATUS_COLORS[
                          f.status as keyof typeof FINDING_STATUS_COLORS
                        ] ?? ""
                      }
                    >
                      {f.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {f.assignedAuditor}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(f.targetDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
