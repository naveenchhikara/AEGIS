import { getRequiredSession } from "@/data-access/session";
import {
  getBranchRiskHeatmap,
  getAuditPlanProgress,
  getComplianceAging,
  getFindingTrends,
  getNpaMovement,
} from "@/data-access/analytics";
import { RiskHeatmap } from "@/components/analytics/risk-heatmap";
import { PlanProgress } from "@/components/analytics/plan-progress";
import { ComplianceAging } from "@/components/analytics/compliance-aging";
import { FindingTrends } from "@/components/analytics/finding-trends";
import { NpaWaterfall } from "@/components/analytics/npa-waterfall";
import { ControlEffectivenessDashboard } from "@/components/analytics/control-effectiveness-dashboard";
import { getControlEffectivenessData } from "@/data-access/control-effectiveness";
import { RiskMisDashboard } from "@/components/analytics/risk-mis-dashboard";
import { getRiskMisDashboardData } from "@/data-access/risk-mis";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function AnalyticsPage() {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  // Check permission: CAE or CEO can view analytics
  const hasAccess =
    hasPermission(userRoles, "dashboard:cae") ||
    hasPermission(userRoles, "dashboard:ceo");

  if (!hasAccess) {
    redirect("/dashboard");
  }

  // Fetch all analytics data
  const [branchRiskData, planProgressData, complianceAgingData, findingTrendsData, npaMovementData, controlEffectivenessData, riskMisData] =
    await Promise.all([
      getBranchRiskHeatmap(tenantId),
      getAuditPlanProgress(tenantId),
      getComplianceAging(tenantId),
      getFindingTrends(tenantId),
      getNpaMovement(tenantId),
      getControlEffectivenessData(tenantId),
      getRiskMisDashboardData(tenantId),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Comprehensive insights into audit performance, compliance, and risk metrics
        </p>
      </div>

      <Tabs defaultValue="risk" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-7">
          <TabsTrigger value="risk">Branch Risk</TabsTrigger>
          <TabsTrigger value="plan">Audit Plans</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="findings">Findings</TabsTrigger>
          <TabsTrigger value="npa">NPA</TabsTrigger>
          <TabsTrigger value="controls">Controls</TabsTrigger>
          <TabsTrigger value="mis">Risk MIS</TabsTrigger>
        </TabsList>

        <TabsContent value="risk" className="space-y-4">
          <RiskHeatmap data={branchRiskData} />
        </TabsContent>

        <TabsContent value="plan" className="space-y-4">
          <PlanProgress data={planProgressData} />
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <ComplianceAging data={complianceAgingData} />
        </TabsContent>

        <TabsContent value="findings" className="space-y-4">
          <FindingTrends data={findingTrendsData} />
        </TabsContent>

        <TabsContent value="npa" className="space-y-4">
          <NpaWaterfall data={npaMovementData} />
        </TabsContent>

        <TabsContent value="controls" className="space-y-4">
          <ControlEffectivenessDashboard data={controlEffectivenessData} />
        </TabsContent>

        <TabsContent value="mis" className="space-y-4">
          <RiskMisDashboard data={riskMisData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
