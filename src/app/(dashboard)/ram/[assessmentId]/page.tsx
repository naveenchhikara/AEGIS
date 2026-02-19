import { getRequiredSession } from "@/data-access/session";
import {
  getRamAssessmentWithScores,
  getRamParameterConfigs,
} from "@/data-access/ram";
import { RamScoreForm } from "@/components/ram/ram-score-form";
import { RamResultCard } from "@/components/ram/ram-result-card";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect, notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ assessmentId: string }>;
}

export default async function RamAssessmentDetailPage({ params }: PageProps) {
  const { assessmentId } = await params;
  const session = await getRequiredSession();
  const userRoles = session.user.roles;

  if (!hasPermission(userRoles, "ram:read")) {
    redirect("/dashboard");
  }

  const [assessment, allParams] = await Promise.all([
    getRamAssessmentWithScores(session, assessmentId),
    getRamParameterConfigs(session),
  ]);

  if (!assessment) {
    notFound();
  }

  const canEdit =
    hasPermission(userRoles, "ram:create") && assessment.status === "DRAFT";
  const canCompute =
    hasPermission(userRoles, "ram:create") && assessment.scores.length > 0;
  const canApprove =
    hasPermission(userRoles, "ram:approve") && assessment.status === "COMPUTED";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          RAM Assessment — {assessment.branch?.name}
        </h1>
        <p className="text-muted-foreground">
          {assessment.assessmentYear} • Status: {assessment.status}
        </p>
      </div>

      {/* Show result card if computed */}
      {assessment.compositeScore && (
        <RamResultCard
          compositeScore={Number(assessment.compositeScore)}
          riskCategory={assessment.riskCategory ?? ""}
          auditFrequency={assessment.auditFrequency ?? 0}
          status={assessment.status}
          repeatUpliftApplied={assessment.repeatUpliftApplied ?? false}
          repeatFindingCount={assessment.repeatFindingCount ?? 0}
          rawCompositeScore={
            assessment.rawCompositeScore
              ? Number(assessment.rawCompositeScore)
              : undefined
          }
        />
      )}

      {/* Score entry form */}
      <RamScoreForm
        assessmentId={assessment.id}
        allParams={allParams}
        existingScores={assessment.scores}
        canEdit={canEdit}
        canCompute={canCompute}
        canApprove={canApprove}
        status={assessment.status}
      />
    </div>
  );
}
