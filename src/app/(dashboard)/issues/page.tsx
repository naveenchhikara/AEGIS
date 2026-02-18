import { getRequiredSession } from "@/data-access/session";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { IssuesTable } from "@/components/issues/issues-table";

export default async function IssuesPage() {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];

  if (!hasPermission(userRoles, "issue:read")) {
    redirect("/dashboard");
  }

  const canManage = hasPermission(userRoles, "issue:manage");

  // Mock data - replace with actual data-access calls
  const issues: any[] = [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Issues Management</h1>
        <p className="text-muted-foreground">
          Track and manage audit issues, corrective actions, and risk acceptance
        </p>
      </div>
      <IssuesTable issues={issues} canManage={canManage} />
    </div>
  );
}
