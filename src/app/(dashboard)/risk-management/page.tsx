import { getRequiredSession } from "@/data-access/session";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect } from "next/navigation";
import {
  getRiskRegisters,
  getBreachedKRIs,
  getAuditUniverseEntities,
} from "@/data-access/risk-management";
import { RiskRegisterTable } from "@/components/risk-management/risk-register-table";
import { KriDashboard } from "@/components/risk-management/kri-dashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function RiskManagementPage() {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];

  if (!hasPermission(userRoles, "risk_register:read")) {
    redirect("/dashboard");
  }

  const canManage = hasPermission(userRoles, "risk_register:manage");

  // Fetch real data from database
  const risksRaw = await getRiskRegisters(session);
  const kriDataRaw = await getBreachedKRIs(session);
  const entities = await getAuditUniverseEntities(session);

  // Convert Prisma Decimal types to numbers for client components
  const risks = risksRaw.map((risk) => ({
    ...risk,
    inherentScore: Number(risk.inherentScore),
    controlScore: Number(risk.controlScore),
    residualScore: Number(risk.residualScore),
    kris: risk.kris.map((kri) => ({
      ...kri,
      currentValue: kri.currentValue ? Number(kri.currentValue) : null,
    })),
  }));

  const kriData = kriDataRaw.map((kri) => ({
    ...kri,
    currentValue: kri.currentValue ? Number(kri.currentValue) : null,
    thresholdLow: kri.thresholdLow ? Number(kri.thresholdLow) : null,
    thresholdHigh: kri.thresholdHigh ? Number(kri.thresholdHigh) : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Risk Management</h1>
        <p className="text-muted-foreground">
          Enterprise risk register, audit universe, and KRI monitoring
        </p>
      </div>

      <Tabs defaultValue="register" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto">
          <TabsTrigger value="register">Risk Register</TabsTrigger>
          <TabsTrigger value="kri">KRI Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-4">
          <RiskRegisterTable risks={risks} entities={entities} canManage={canManage} />
        </TabsContent>

        <TabsContent value="kri" className="space-y-4">
          <KriDashboard data={kriData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
