import { getRequiredSession } from "@/data-access/session";
import { getRamAssessments } from "@/data-access/ram";
import { RamAssessmentsTable } from "@/components/ram/ram-assessments-table";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function RamPage() {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;

  if (!hasPermission(userRoles, "ram:read")) {
    redirect("/dashboard");
  }

  const assessments = await getRamAssessments(session);
  const canCreate = hasPermission(userRoles, "ram:create");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">RAM Assessments</h1>
          <p className="text-muted-foreground">
            Risk Assessment Model — Branch risk scoring and audit frequency
            derivation
          </p>
        </div>
      </div>
      <RamAssessmentsTable assessments={assessments} canCreate={canCreate} />
    </div>
  );
}
