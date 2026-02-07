import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ShieldCheck,
  ClipboardList,
  AlertTriangle,
  TrendingUp,
  Clock,
  FileWarning,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const stats = [
  {
    title: "Compliance Score",
    value: "78%",
    description: "DAKSH supervisory score",
    icon: ShieldCheck,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
    trend: "+2% from last quarter",
    trendUp: true,
  },
  {
    title: "Pending Audits",
    value: "4",
    description: "Across credit & operations",
    icon: ClipboardList,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
    trend: "2 in progress, 2 planned",
    trendUp: null,
  },
  {
    title: "Open Findings",
    value: "6",
    description: "3 high, 2 medium, 1 low",
    icon: AlertTriangle,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
    trend: "2 overdue for closure",
    trendUp: false,
  },
  {
    title: "Non-Compliant",
    value: "3",
    description: "RBI requirements at risk",
    icon: XCircle,
    iconColor: "text-red-600",
    iconBg: "bg-red-50",
    trend: "CRAR, ALM, Cyber Security",
    trendUp: false,
  },
];

const recentFindings = [
  {
    id: "FND-001",
    title: "CRAR below 12% threshold",
    severity: "critical",
    department: "Treasury",
    dueDate: "2026-02-28",
    status: "open",
  },
  {
    id: "FND-003",
    title: "ALM statement submission delayed",
    severity: "high",
    department: "Operations",
    dueDate: "2026-03-15",
    status: "in-progress",
  },
  {
    id: "FND-005",
    title: "Cyber security audit gaps identified",
    severity: "high",
    department: "IT",
    dueDate: "2026-03-31",
    status: "open",
  },
  {
    id: "FND-007",
    title: "KYC documentation incomplete in 2 branches",
    severity: "medium",
    department: "Credit",
    dueDate: "2026-04-15",
    status: "in-progress",
  },
];

const upcomingDeadlines = [
  { label: "CRAR Return Filing", date: "Feb 28, 2026", urgent: true },
  { label: "Quarterly Board Report", date: "Mar 10, 2026", urgent: false },
  { label: "ALM Statement Submission", date: "Mar 15, 2026", urgent: false },
  { label: "Cyber Security Audit Review", date: "Mar 31, 2026", urgent: false },
];

function getSeverityColor(severity: string) {
  switch (severity) {
    case "critical":
      return "bg-red-100 text-red-700";
    case "high":
      return "bg-amber-100 text-amber-700";
    case "medium":
      return "bg-yellow-100 text-yellow-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "in-progress":
      return <Clock className="h-3.5 w-3.5 text-blue-500" />;
    case "open":
      return <FileWarning className="h-3.5 w-3.5 text-amber-500" />;
    default:
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  }
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Audit Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Apex Sahakari Bank Ltd — FY 2025-26 Q3 Overview
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`rounded-md p-1.5 ${stat.iconBg}`}>
                  <Icon className={`h-4 w-4 ${stat.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
                {stat.trend && (
                  <div className="flex items-center gap-1 mt-2">
                    {stat.trendUp === true && (
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                    )}
                    {stat.trendUp === false && (
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {stat.trend}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Two-column layout: Findings + Deadlines */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent Findings - 2/3 width */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent Findings</CardTitle>
            <CardDescription>
              Active audit observations requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentFindings.map((finding) => (
                <div
                  key={finding.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {getStatusIcon(finding.status)}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">
                          {finding.id}
                        </span>
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${getSeverityColor(finding.severity)}`}
                        >
                          {finding.severity}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate">
                        {finding.title}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-xs text-muted-foreground">
                      {finding.department}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Due: {finding.dueDate}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Deadlines - 1/3 width */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Deadlines</CardTitle>
            <CardDescription>Regulatory submission dates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingDeadlines.map((deadline) => (
                <div
                  key={deadline.label}
                  className="flex items-start gap-3"
                >
                  <div
                    className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                      deadline.urgent ? "bg-red-500" : "bg-blue-400"
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium">{deadline.label}</p>
                    <p
                      className={`text-xs ${
                        deadline.urgent
                          ? "text-red-600 font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      {deadline.date}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
