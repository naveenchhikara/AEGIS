import { getRequiredSession } from "@/data-access/session";
import { getEngagementWithTeam } from "@/data-access/audit-execution";
import { EngagementHeader } from "@/components/audit-execution/engagement-header";
import { hasPermission } from "@/lib/permissions";
import { redirect, notFound } from "next/navigation";
import { ChevronLeft } from "@/lib/icons";

interface PageProps {
  params: Promise<{ engagementId: string }>;
}

export default async function RbiaEngagementPage({ params }: PageProps) {
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

  return (
    <div className="space-y-6">
      <a
        href="/audit-execution"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Audits
      </a>

      <EngagementHeader
        engagement={engagement as any}
        canManageStatus={hasPermission(
          userRoles,
          "audit_execution:manage_team",
        )}
      />

      <div className="bg-muted/50 border-border rounded-lg border p-8 text-center">
        <h2 className="text-lg font-semibold">RBIA Examination</h2>
        <p className="text-muted-foreground mt-2">
          This page will be replaced with the full RBIA examination interface in
          Phase 21.
        </p>
      </div>
    </div>
  );
}
