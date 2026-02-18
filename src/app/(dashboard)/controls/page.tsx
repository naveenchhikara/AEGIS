import { getRequiredSession } from "@/data-access/session";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { ControlLibraryTable } from "@/components/controls/control-library-table";

export default async function ControlsPage() {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];

  if (!hasPermission(userRoles, "control_library:read")) {
    redirect("/dashboard");
  }

  const canManage = hasPermission(userRoles, "control_library:manage");

  // Mock data - replace with actual data-access calls
  const controls: any[] = [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Control Library</h1>
        <p className="text-muted-foreground">
          Internal control framework and effectiveness assessments
        </p>
      </div>
      <ControlLibraryTable controls={controls} canManage={canManage} />
    </div>
  );
}
