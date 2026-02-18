import { getRequiredSession } from "@/data-access/session";
import { getWorkProgramItems } from "@/data-access/work-program";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { WorkProgramTable } from "@/components/work-program/work-program-table";

export default async function WorkProgramPage({
  searchParams,
}: {
  searchParams: Promise<{ engagementId?: string; assignedToId?: string; status?: string }>;
}) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];

  if (!hasPermission(userRoles, "work_program:read")) {
    redirect("/dashboard");
  }

  const canExecute = hasPermission(userRoles, "work_program:execute");

  // Await searchParams (Next.js 16 pattern)
  const params = await searchParams;

  // Fetch real work program items from database
  const workItems = await getWorkProgramItems(session, {
    engagementId: params.engagementId,
    assignedToId: params.assignedToId,
    status: params.status,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Work Program</h1>
        <p className="text-muted-foreground">
          Audit work program and task management
        </p>
      </div>
      <WorkProgramTable workItems={workItems} canExecute={canExecute} />
    </div>
  );
}
