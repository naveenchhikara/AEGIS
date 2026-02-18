import { getRequiredSession } from "@/data-access/session";
import { getIssues } from "@/data-access/issues";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { BoardView } from "@/components/issues/board-view";

export default async function IssuesBoardPage() {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];

  // Board view requires ACB_MEMBER, CAE, CEO, or RISK_HEAD role (R63 requirement)
  const hasAccess =
    userRoles.includes("ACB_MEMBER") ||
    userRoles.includes("CAE") ||
    userRoles.includes("CEO") ||
    userRoles.includes("RISK_HEAD");

  if (!hasAccess) {
    redirect("/issues");
  }

  // Fetch all open issues across all sources
  const openIssues = await getIssues(session, {
    status: "OPEN",
  });

  const inProgressIssues = await getIssues(session, {
    status: "IN_PROGRESS",
  });

  const allActiveIssues = [...openIssues, ...inProgressIssues];

  // Aggregate by source
  const bySource = {
    INTERNAL_AUDIT: allActiveIssues.filter((i) => i.source === "INTERNAL_AUDIT"),
    REGULATORY: allActiveIssues.filter((i) => i.source === "REGULATORY"),
    EXTERNAL_AUDIT: allActiveIssues.filter((i) => i.source === "EXTERNAL_AUDIT"),
    SELF_ASSESSMENT: allActiveIssues.filter(
      (i) => i.source === "SELF_ASSESSMENT"
    ),
    CONCURRENT: allActiveIssues.filter((i) => i.source === "CONCURRENT"),
  };

  // Aggregate by severity
  const bySeverity = {
    critical: allActiveIssues.filter((i) => i.severity === "CRITICAL").length,
    high: allActiveIssues.filter((i) => i.severity === "HIGH").length,
    medium: allActiveIssues.filter((i) => i.severity === "MEDIUM").length,
    low: allActiveIssues.filter((i) => i.severity === "LOW").length,
  };

  // Aggregate by risk theme
  const byRiskTheme = {
    CREDIT: allActiveIssues.filter((i) => i.riskTheme === "CREDIT").length,
    OPERATIONAL: allActiveIssues.filter((i) => i.riskTheme === "OPERATIONAL")
      .length,
    COMPLIANCE: allActiveIssues.filter((i) => i.riskTheme === "COMPLIANCE").length,
    IT: allActiveIssues.filter((i) => i.riskTheme === "IT").length,
    GOVERNANCE: allActiveIssues.filter((i) => i.riskTheme === "GOVERNANCE").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Board - Consolidated Issues View
        </h1>
        <p className="text-muted-foreground">
          Executive summary of all open issues across all sources
        </p>
      </div>

      <BoardView
        bySource={bySource}
        bySeverity={bySeverity}
        byRiskTheme={byRiskTheme}
        allActiveIssues={allActiveIssues}
      />
    </div>
  );
}
