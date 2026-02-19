import { getRequiredSession } from "@/data-access/session";
import { getIssues } from "@/data-access/issues";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { IssuesTable } from "@/components/issues/issues-table";
import { prismaForTenant } from "@/lib/prisma";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "@/lib/icons";

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
  const userRoles = session.user.roles;

  if (!hasPermission(userRoles, "issue:read")) {
    redirect("/dashboard");
  }

  const canManage = hasPermission(userRoles, "issue:manage");
  const canAcceptRisk = hasPermission(userRoles, "issue:accept_risk");
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  // Fetch issues with filters
  const issues = await getIssues(session, {
    source: searchParams.source,
    severity: searchParams.severity,
    status: searchParams.status,
    riskTheme: searchParams.riskTheme,
  });

  // Count accepted-risk issues for the quick-filter badge
  const acceptedRiskCount = await db.issue.count({
    where: { tenantId, status: "ACCEPTED_RISK" },
  });

  const isAcceptedRiskView = searchParams.status === "ACCEPTED_RISK";

  // Fetch controls and compliance items for linking (R60)
  const controls = canManage
    ? await db.controlLibrary.findMany({
        where: { tenantId },
        select: { id: true, controlCode: true, description: true },
        orderBy: { controlCode: "asc" },
      })
    : [];

  const complianceItems = canManage
    ? await db.complianceItem.findMany({
        where: { tenantId },
        select: {
          id: true,
          observation: {
            select: { id: true, title: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Issues Management</h1>
        <p className="text-muted-foreground">
          Track and manage audit issues, corrective actions, and risk acceptance
        </p>
      </div>

      {/* Quick-filter tabs */}
      <div className="flex items-center gap-2">
        <Link href="/issues">
          <Badge
            variant={!isAcceptedRiskView ? "default" : "outline"}
            className="cursor-pointer px-3 py-1 text-sm"
          >
            All Issues
          </Badge>
        </Link>
        <Link href="/issues?status=ACCEPTED_RISK">
          <Badge
            variant={isAcceptedRiskView ? "default" : "outline"}
            className="cursor-pointer gap-1.5 px-3 py-1 text-sm"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Accepted Risks
            {acceptedRiskCount > 0 && (
              <span className="bg-primary-foreground text-primary ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold">
                {acceptedRiskCount}
              </span>
            )}
          </Badge>
        </Link>
      </div>

      {/* Filter UI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="source">Source</Label>
          <Select name="source" defaultValue={searchParams.source || "all"}>
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
          <Select name="severity" defaultValue={searchParams.severity || "all"}>
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
          <Select name="status" defaultValue={searchParams.status || "all"}>
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
        controls={controls}
        complianceItems={complianceItems}
      />
    </div>
  );
}
