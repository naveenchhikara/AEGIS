import { demoComplianceRequirements } from "@/data";
import type { ComplianceData } from "@/types";
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
import { STATUS_COLORS } from "@/lib/constants";
import { ShieldCheck, CheckCircle2, AlertTriangle, XCircle, Clock } from "@/lib/icons";

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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Compliance Registry
        </h1>
        <p className="text-sm text-muted-foreground">
          RBI regulatory compliance requirements tracker
        </p>
      </div>

      {/* Summary bar */}
      <div className="grid gap-3 sm:grid-cols-5">
        {summaryCards.map((s) => (
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

      {/* Requirements table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">ID</TableHead>
                <TableHead>Requirement</TableHead>
                <TableHead className="w-24">Priority</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-28">Assigned To</TableHead>
                <TableHead className="w-28">Due Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.complianceRequirements.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-mono text-xs">{req.id}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{req.title}</p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {req.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        req.priority === "critical"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : req.priority === "high"
                            ? "border-orange-200 bg-orange-50 text-orange-700"
                            : "border-slate-200 bg-slate-50 text-slate-700"
                      }
                    >
                      {req.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        STATUS_COLORS[
                          req.status as keyof typeof STATUS_COLORS
                        ] ?? ""
                      }
                    >
                      {req.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {req.assignedToName}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(req.dueDate).toLocaleDateString("en-IN", {
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
