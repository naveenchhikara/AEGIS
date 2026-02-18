import { getRequiredSession } from "@/data-access/session";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PolicyTable } from "@/components/governance/policy-table";
import { CommitteePanel } from "@/components/governance/committee-panel";

export default async function GovernancePage() {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];

  if (!hasPermission(userRoles, "policy:read")) {
    redirect("/dashboard");
  }

  const canManagePolicy = hasPermission(userRoles, "policy:manage");
  const canManageCommittee = hasPermission(userRoles, "committee:manage");

  // Mock data - replace with actual data-access calls
  const policies: any[] = [];
  const committees: any[] = [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Governance Hub</h1>
        <p className="text-muted-foreground">
          Policy framework, committee management, and board reporting
        </p>
      </div>

      <Tabs defaultValue="policies" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="committees">Committees</TabsTrigger>
          <TabsTrigger value="board">Board Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="space-y-4">
          <PolicyTable policies={policies} canManage={canManagePolicy} />
        </TabsContent>

        <TabsContent value="committees" className="space-y-4">
          <CommitteePanel committees={committees} canManage={canManageCommittee} />
        </TabsContent>

        <TabsContent value="board" className="space-y-4">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <p className="text-center text-muted-foreground">
              Board reports module coming soon.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
