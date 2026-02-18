import { getRequiredSession } from "@/data-access/session";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { AssessmentForm } from "@/components/qa-assessment/assessment-form";

export default async function QaAssessmentPage() {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];

  if (!hasPermission(userRoles, "qa_assessment:read")) {
    redirect("/dashboard");
  }

  const canManage = hasPermission(userRoles, "qa_assessment:manage");

  // Mock data - replace with actual data-access calls
  const currentAssessment = null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">QA Self-Assessment</h1>
        <p className="text-muted-foreground">
          Quality Assurance — IIA Standards compliance self-assessment
        </p>
      </div>
      <AssessmentForm assessment={currentAssessment} canManage={canManage} />
    </div>
  );
}
