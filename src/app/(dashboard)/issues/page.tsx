import { getRequiredSession } from "@/data-access/session";
import { getIssues } from "@/data-access/issues";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { IssuesTable } from "@/components/issues/issues-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type SearchParams = Promise<{
  source?: string;
  severity?: string;
  status?: string;
  riskTheme?: string;
}>;

export default async function IssuesPage(props: {
  searchParams: SearchParams;
}) {
  const searchParams = await props.searchParams;
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];

  if (!hasPermission(userRoles, "issue:read")) {
    redirect("/dashboard");
  }

  const canManage = hasPermission(userRoles, "issue:manage");
  const canAcceptRisk = hasPermission(userRoles, "issue:accept_risk");

  // Fetch issues with filters
  const issues = await getIssues(session, {
    source: searchParams.source,
    severity: searchParams.severity,
    status: searchParams.status,
    riskTheme: searchParams.riskTheme,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Issues Management</h1>
        <p className="text-muted-foreground">
          Track and manage audit issues, corrective actions, and risk acceptance
        </p>
      </div>

      {/* Filter UI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="source">Source</Label>
          <Select
            name="source"
            defaultValue={searchParams.source || "all"}
          >
            <SelectTrigger id="source">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="INTERNAL_AUDIT">Internal Audit</SelectItem>
              <SelectItem value="REGULATORY">Regulatory</SelectItem>
              <SelectItem value="EXTERNAL_AUDIT">External Audit</SelectItem>
              <SelectItem value="SELF_ASSESSMENT">Self Assessment</SelectItem>
              <SelectItem value="CONCURRENT">Concurrent Audit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="severity">Severity</Label>
          <Select
            name="severity"
            defaultValue={searchParams.severity || "all"}
          >
            <SelectTrigger id="severity">
              <SelectValue placeholder="All Severities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            name="status"
            defaultValue={searchParams.status || "all"}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
              <SelectItem value="ACCEPTED_RISK">Accepted Risk</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="riskTheme">Risk Theme</Label>
          <Select
            name="riskTheme"
            defaultValue={searchParams.riskTheme || "all"}
          >
            <SelectTrigger id="riskTheme">
              <SelectValue placeholder="All Themes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Themes</SelectItem>
              <SelectItem value="CREDIT">Credit</SelectItem>
              <SelectItem value="OPERATIONAL">Operational</SelectItem>
              <SelectItem value="COMPLIANCE">Compliance</SelectItem>
              <SelectItem value="IT">IT</SelectItem>
              <SelectItem value="GOVERNANCE">Governance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <IssuesTable
        issues={issues}
        canManage={canManage}
        canAcceptRisk={canAcceptRisk}
      />
    </div>
  );
}
