import { getRequiredSession } from "@/data-access/session";
import { getRegulatoryObservations, getPendingAtrObservations } from "@/data-access/regulatory";
import { getIssues } from "@/data-access/issues";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RegulatoryTable } from "@/components/regulatory/regulatory-table";
import { AtrWorkflowPanel } from "@/components/regulatory/atr-workflow-panel";
import { ParaIssueMapping } from "@/components/regulatory/para-issue-mapping";

export default async function RegulatoryPage() {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];

  if (!hasPermission(userRoles, "regulatory:read")) {
    redirect("/dashboard");
  }

  // Fetch real data from DAL
  const observations = await getRegulatoryObservations(session);
  const pendingAtr = await getPendingAtrObservations(session);
  const issues = await getIssues(session);

  // Check permissions for management and ATR actions
  const canManage = hasPermission(userRoles, "regulatory:manage");
  const canSubmitAtr = hasPermission(userRoles, "regulatory:atr_submit");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Regulatory Observations</h1>
        <p className="text-muted-foreground">
          RBI/NABARD/Statutory observations tracking and Action Taken Report (ATR) management
        </p>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All Observations ({observations.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ATR ({pendingAtr.length})
          </TabsTrigger>
          <TabsTrigger value="mapped">
            Issue Mapping ({observations.filter(o => o.issueId).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <RegulatoryTable 
            observations={observations} 
            canManage={canManage}
            canSubmitAtr={canSubmitAtr}
            issues={issues}
          />
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <AtrWorkflowPanel 
            observations={pendingAtr}
            canManage={canManage}
            canSubmitAtr={canSubmitAtr}
          />
        </TabsContent>

        <TabsContent value="mapped" className="space-y-4">
          <ParaIssueMapping
            observations={observations.filter(o => o.issueId)}
            allObservations={observations}
            issues={issues}
            canManage={canManage}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
