import { getRequiredSession } from "@/data-access/session";
import { getWorkProgramItems } from "@/data-access/work-program";
import { getAssignableUsers } from "@/data-access/audit-teams";
import { prismaForTenant } from "@/data-access/prisma";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { WorkProgramTable } from "@/components/work-program/work-program-table";
import { WorkProgramGenerator } from "@/components/work-program/work-program-generator";

export default async function WorkProgramPage({
  searchParams,
}: {
  searchParams: Promise<{
    engagementId?: string;
    assignedToId?: string;
    status?: string;
  }>;
}) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];

  if (!hasPermission(userRoles, "work_program:read")) {
    redirect("/dashboard");
  }

  const canExecute = hasPermission(userRoles, "work_program:execute");

  // Await searchParams (Next.js 16 pattern)
  const params = await searchParams;

  // Fetch real work program items and assignable users in parallel
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  const [workItems, assignableUsers, engagements] = await Promise.all([
    getWorkProgramItems(session, {
      engagementId: params.engagementId,
      assignedToId: params.assignedToId,
      status: params.status,
    }),
    canExecute ? getAssignableUsers(session) : Promise.resolve([]),
    db.auditEngagement.findMany({
      where: { tenantId },
      select: { id: true, auditNumber: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Work Program</h1>
          <p className="text-muted-foreground">
            Audit work program and task management
          </p>
        </div>
        <WorkProgramGenerator
          engagements={engagements}
          canExecute={canExecute}
        />
      </div>
      <WorkProgramTable
        workItems={workItems}
        canExecute={canExecute}
        assignableUsers={assignableUsers}
      />
    </div>
  );
}
