import { getRequiredSession } from "@/data-access/session";
import { getIssues, getOverdueActionPlans } from "@/data-access/issues";
import { getQaSelfAssessments } from "@/data-access/qa-assessment";
import { getBreachedKRIs } from "@/data-access/risk-management";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { BoardView } from "@/components/issues/board-view";

export default async function IssuesBoardPage() {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;

  // Board view requires ACB_MEMBER, CAE, CEO, or RISK_HEAD role (R63 requirement)
  const hasAccess =
    userRoles.includes("ACB_MEMBER") ||
    userRoles.includes("CAE") ||
    userRoles.includes("CEO") ||
    userRoles.includes("RISK_HEAD");

  if (!hasAccess) {
    redirect("/issues");
  }

  // Fetch all open issues across all sources + board-level aggregations in parallel
  const [
    openIssues,
    inProgressIssues,
    overdueActions,
    qaGapAssessments,
    breachedKRIs,
  ] = await Promise.all([
    getIssues(session, { status: "OPEN" }),
    getIssues(session, { status: "IN_PROGRESS" }),
    getOverdueActionPlans(session),
    getQaSelfAssessments(session, { gapIdentified: true }),
    getBreachedKRIs(session),
  ]);

  const allActiveIssues = [...openIssues, ...inProgressIssues];

  // Aggregate by source
  const bySource = {
    INTERNAL_AUDIT: allActiveIssues.filter(
      (i) => i.source === "INTERNAL_AUDIT",
    ),
    REGULATORY: allActiveIssues.filter((i) => i.source === "REGULATORY"),
    EXTERNAL_AUDIT: allActiveIssues.filter(
      (i) => i.source === "EXTERNAL_AUDIT",
    ),
    SELF_ASSESSMENT: allActiveIssues.filter(
      (i) => i.source === "SELF_ASSESSMENT",
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
    COMPLIANCE: allActiveIssues.filter((i) => i.riskTheme === "COMPLIANCE")
      .length,
    IT: allActiveIssues.filter((i) => i.riskTheme === "IT").length,
    GOVERNANCE: allActiveIssues.filter((i) => i.riskTheme === "GOVERNANCE")
      .length,
  };

  // Board-level counts for R63 consolidated view
  const overdueActionPlans = overdueActions.length;
  const qaGaps = qaGapAssessments.length;
  const kriBreaches = breachedKRIs.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight md:text-2xl">
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
        overdueActionPlans={overdueActionPlans}
        qaGaps={qaGaps}
        kriBreaches={kriBreaches}
      />
    </div>
  );
}
