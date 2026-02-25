import { requirePermission } from "@/lib/guards";
import { getWorkProgramItemById } from "@/data-access/work-program";
import { getAssignableUsers } from "@/data-access/audit-teams";
import { hasPermission } from "@/lib/permissions";
import { notFound } from "next/navigation";
import { WorkProgramDetail } from "@/components/work-program/work-program-detail";

interface WorkProgramDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkProgramDetailPage({
  params,
}: WorkProgramDetailPageProps) {
  const { id } = await params;
  const session = await requirePermission("work_program:read");
  const userRoles = session.user.roles;
  const canExecute = hasPermission(userRoles, "work_program:execute");

  const [item, assignableUsers] = await Promise.all([
    getWorkProgramItemById(session, id),
    canExecute ? getAssignableUsers(session) : Promise.resolve([]),
  ]);

  if (!item) {
    notFound();
  }

  return (
    <WorkProgramDetail
      item={item}
      canExecute={canExecute}
      assignableUsers={assignableUsers}
    />
  );
}
