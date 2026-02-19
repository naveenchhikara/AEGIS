import { getRequiredSession } from "@/data-access/session";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect } from "next/navigation";
import {
  getHousekeepingMetrics,
  getHighRiskHousekeepingMetrics,
} from "@/data-access/governance";
import { prismaForTenant } from "@/data-access/prisma";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricsCaptureForm } from "@/components/housekeeping/metrics-capture-form";
import { RiskMisDashboard } from "@/components/housekeeping/risk-mis-dashboard";
import { InterbankExposureMonitor } from "@/components/housekeeping/interbank-exposure-monitor";

export default async function HousekeepingPage() {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;

  if (!hasPermission(userRoles, "regulatory:read")) {
    redirect("/dashboard");
  }

  const canManage = hasPermission(userRoles, "regulatory:manage");
  const tenantId = session.user.tenantId;

  // Fetch housekeeping data
  const metricsRaw = await getHousekeepingMetrics(session);
  const highRiskMetricsRaw = await getHighRiskHousekeepingMetrics(session, 90);

  // Serialize Decimal to number for client components
  const metrics = metricsRaw.map((m) => ({
    ...m,
    openingBalance: Number(m.openingBalance),
    closingBalance: Number(m.closingBalance),
  }));
  const highRiskMetrics = highRiskMetricsRaw.map((m) => ({
    ...m,
    openingBalance: Number(m.openingBalance),
    closingBalance: Number(m.closingBalance),
  }));

  // Fetch branches for capture form
  const db = prismaForTenant(tenantId);
  const branches = await db.branch.findMany({
    where: { tenantId },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Housekeeping & Risk MIS
        </h1>
        <p className="text-muted-foreground">
          Housekeeping risk metrics, risk management dashboards, and exposure
          monitoring
        </p>
      </div>
      <Tabs defaultValue="capture" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="capture">Metrics Capture</TabsTrigger>
          <TabsTrigger value="mis">Risk MIS</TabsTrigger>
          <TabsTrigger value="exposure">Inter-bank Exposure</TabsTrigger>
        </TabsList>
        <TabsContent value="capture">
          <MetricsCaptureForm
            metrics={metrics}
            highRiskMetrics={highRiskMetrics}
            branches={branches}
            canManage={canManage}
          />
        </TabsContent>
        <TabsContent value="mis">
          <RiskMisDashboard metrics={metrics} />
        </TabsContent>
        <TabsContent value="exposure">
          <InterbankExposureMonitor metrics={metrics} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
