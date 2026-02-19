import { getRequiredSession } from "@/data-access/session";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PolicyTable } from "@/components/governance/policy-table";
import { CommitteePanel } from "@/components/governance/committee-panel";
import { AcbWorkspace } from "@/components/governance/acb-workspace";
import { AcbAgendaBuilder } from "@/components/governance/acb-agenda-builder";
import { BoardReviewCalendar } from "@/components/governance/board-review-calendar";
import { RbiInspectionPack } from "@/components/governance/rbi-inspection-pack";
import {
  getPolicyDocuments,
  getPoliciesDueForReview,
  getCommittees,
  getCommitteeMeetings,
} from "@/data-access/governance";

export default async function GovernancePage() {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];

  if (!hasPermission(userRoles, "policy:read")) {
    redirect("/dashboard");
  }

  const canManagePolicy = hasPermission(userRoles, "policy:manage");
  const canManageCommittee = hasPermission(userRoles, "committee:manage");
  const canManageAgenda = hasPermission(userRoles, "board:agenda");
  const canViewReporting = hasPermission(userRoles, "board:reporting");

  // Fetch real data from database
  const policies = await getPolicyDocuments(session);
  const policiesDueReview = await getPoliciesDueForReview(session, 30);
  const committees = await getCommittees(session, { isActive: true });
  const meetings = await getCommitteeMeetings(session);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Governance Hub</h1>
        <p className="text-muted-foreground">
          Policy framework, committee management, and board reporting
        </p>
      </div>

      <Tabs defaultValue="policies" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto">
          <TabsTrigger value="policies">
            Policies ({policies.length})
          </TabsTrigger>
          <TabsTrigger value="committees">Committees</TabsTrigger>
          <TabsTrigger value="acb">ACB Workspace</TabsTrigger>
          <TabsTrigger value="agenda">Agenda Builder</TabsTrigger>
          <TabsTrigger value="calendar">Board Calendar</TabsTrigger>
          <TabsTrigger value="inspection">RBI Pack</TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="space-y-4">
          <PolicyTable
            policies={policies}
            policiesDueReview={policiesDueReview}
            canManage={canManagePolicy}
          />
        </TabsContent>

        <TabsContent value="committees" className="space-y-4">
          <CommitteePanel
            committees={committees}
            meetings={meetings}
            canManage={canManageCommittee}
          />
        </TabsContent>

        <TabsContent value="acb" className="space-y-4">
          <AcbWorkspace canManageAgenda={canManageAgenda} />
        </TabsContent>

        <TabsContent value="agenda" className="space-y-4">
          <AcbAgendaBuilder />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <BoardReviewCalendar
            meetings={meetings}
            canManage={canManageCommittee}
          />
        </TabsContent>

        <TabsContent value="inspection" className="space-y-4">
          <RbiInspectionPack canView={canViewReporting} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
