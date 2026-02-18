import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/lib/prisma";
import { EngagementForm } from "@/components/audit-execution/engagement-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Create Audit Engagement page.
 *
 * Server component that fetches required data (branches, audit areas, audit plans)
 * and renders the engagement creation form.
 */
export default async function CreateEngagementPage() {
  const session = await getRequiredSession();
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  // Fetch branches
  const branches = await db.branch.findMany({
    where: { tenantId },
    select: {
      id: true,
      code: true,
      name: true,
    },
    orderBy: { code: "asc" },
  });

  // Fetch audit areas
  const auditAreas = await db.auditArea.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: "asc" },
  });

  // Fetch audit plans (active/planned ones)
  const auditPlans = await db.auditPlan.findMany({
    where: {
      tenantId,
      status: {
        in: ["PLANNED", "IN_PROGRESS"],
      },
    },
    select: {
      id: true,
      year: true,
      quarter: true,
    },
    orderBy: [{ year: "desc" }, { quarter: "asc" }],
  });

  return (
    <div className="container max-w-4xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create Audit Engagement</CardTitle>
          <CardDescription>
            Set up a new audit engagement with team assignment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EngagementForm
            branches={branches}
            auditAreas={auditAreas}
            auditPlans={auditPlans}
          />
        </CardContent>
      </Card>
    </div>
  );
}
