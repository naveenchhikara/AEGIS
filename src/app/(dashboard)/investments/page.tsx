import { getRequiredSession } from "@/data-access/session";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { InvestmentTable } from "@/components/investments/investment-table";
import { SglReconciliation } from "@/components/investments/sgl-reconciliation";
import { BrokerAnalytics } from "@/components/investments/broker-analytics";
import { NonSlrMonitor } from "@/components/investments/non-slr-monitor";
import { ClassificationChecklist } from "@/components/investments/classification-checklist";
import { QuarterlyCertification } from "@/components/investments/quarterly-certification";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getInvestmentRecords,
  getBrokerConcentration,
  getUnreconciledInvestments,
} from "@/data-access/investment";

export default async function InvestmentsPage() {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];

  if (!hasPermission(userRoles, "risk_mis:read")) {
    redirect("/dashboard");
  }

  // Fetch real investment data
  const investments = await getInvestmentRecords(session);
  const currentPeriod = `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
  const brokerData = await getBrokerConcentration(session, currentPeriod);
  const unreconciled = await getUnreconciledInvestments(session, currentPeriod);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Investment & Treasury</h1>
        <p className="text-muted-foreground">
          Investment portfolio monitoring, broker management, and treasury compliance
        </p>
      </div>

      <Tabs defaultValue="portfolio" className="space-y-4">
        <TabsList>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="reconciliation">
            SGL/CSGL ({unreconciled.length} pending)
          </TabsTrigger>
          <TabsTrigger value="broker">Broker Analytics</TabsTrigger>
          <TabsTrigger value="non-slr">Non-SLR Cap</TabsTrigger>
          <TabsTrigger value="classification">Classification</TabsTrigger>
          <TabsTrigger value="certification">Certification</TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio">
          <InvestmentTable investments={investments} />
        </TabsContent>

        <TabsContent value="reconciliation">
          <SglReconciliation investments={investments} unreconciled={unreconciled} />
        </TabsContent>

        <TabsContent value="broker">
          <BrokerAnalytics brokerData={brokerData} />
        </TabsContent>

        <TabsContent value="non-slr">
          <NonSlrMonitor investments={investments} />
        </TabsContent>

        <TabsContent value="classification">
          <ClassificationChecklist investments={investments} />
        </TabsContent>

        <TabsContent value="certification">
          <QuarterlyCertification />
        </TabsContent>
      </Tabs>
    </div>
  );
}
