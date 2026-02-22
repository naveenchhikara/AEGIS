import { getRequiredSession } from "@/data-access/session";
import { getEngagementWithTeam } from "@/data-access/audit-execution";
import { prismaForTenant } from "@/data-access/prisma";
import { EngagementHeader } from "@/components/audit-execution/engagement-header";
import { SectionTabs } from "@/components/audit-execution/section-tabs";
import { TeamPanel } from "@/components/audit-execution/team-panel";
import { RefreshWorkProgramButton } from "@/components/audit-execution/refresh-work-program-button";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect, notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ engagementId: string }>;
}

export default async function AuditExecutionPage({ params }: PageProps) {
  const { engagementId } = await params;
  const session = await getRequiredSession();
  const userRoles = session.user.roles;

  if (!hasPermission(userRoles, "audit_execution:read")) {
    redirect("/dashboard");
  }

  const engagement = await getEngagementWithTeam(session, engagementId);
  if (!engagement) {
    notFound();
  }

  const canManageTeam = hasPermission(userRoles, "audit_execution:manage_team");

  // Fetch available auditors for team assignment (R13)
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);
  const availableUsers = canManageTeam
    ? await db.user.findMany({
        where: { tenantId },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      })
    : [];

  // Fetch examination areas for section allocation (R10)
  const sectionOptions = canManageTeam
    ? await db.examinationArea.findMany({
        where: { tenantId, isActive: true },
        select: { code: true, name: true },
        orderBy: { displayOrder: "asc" },
      })
    : [];
  const canManageSections = hasPermission(
    userRoles,
    "audit_execution:manage_sections",
  );
  const canRefreshWorkProgram = hasPermission(
    userRoles,
    "work_program:execute",
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <EngagementHeader
          engagement={engagement as any}
          canManageStatus={canManageTeam}
        />
        {canRefreshWorkProgram && (
          <RefreshWorkProgramButton engagementId={engagementId} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Main content: Section tabs (3/4 width on desktop) */}
        <div className="lg:col-span-3">
          <SectionTabs
            engagementId={engagementId}
            sections={
              (engagement as any).sectionInstances?.map((s: any) => ({
                ...s,
                assignedToName: null, // R18: resolved via separate lookup if needed
              })) ?? []
            }
            canManageSections={canManageSections}
          />
        </div>

        {/* Sidebar: Team panel (1/4 width on desktop) */}
        <div className="lg:col-span-1">
          <TeamPanel
            engagementId={engagementId}
            teamMembers={(engagement as any).teamMembers}
            canManageTeam={canManageTeam}
            availableUsers={availableUsers.map((u) => ({
              id: u.id,
              name: u.name ?? "Unnamed",
              email: u.email,
            }))}
            sectionOptions={sectionOptions}
          />
        </div>
      </div>
    </div>
  );
}
