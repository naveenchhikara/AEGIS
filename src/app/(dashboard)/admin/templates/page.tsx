import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { TemplateAdminPanel } from "@/components/admin/template-admin-panel";

/**
 * Admin page for managing report templates with versioning (R48).
 * Requires template:manage permission.
 */
export default async function AdminTemplatesPage() {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];

  if (!hasPermission(userRoles, "template:manage")) {
    redirect("/dashboard");
  }

  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  const templates = await db.reportTemplate.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      category: true,
      versionNumber: true,
      isActive: true,
      createdAt: true,
      createdById: true,
    },
    orderBy: [{ name: "asc" }, { versionNumber: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Report Templates</h1>
        <p className="text-muted-foreground">
          Manage report section templates and checklists with version control
        </p>
      </div>

      <TemplateAdminPanel templates={templates} />
    </div>
  );
}
