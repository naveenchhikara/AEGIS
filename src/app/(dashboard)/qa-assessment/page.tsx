import { getRequiredSession } from "@/data-access/session";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect } from "next/navigation";
import {
  getQaAssessmentsByYear,
  getUnconvertedGaps,
  getQaAssessmentProgress,
  getQaSummaryByStandard,
} from "@/data-access/qa-assessment";
import { AssessmentForm } from "@/components/qa-assessment/assessment-form";
import { GapConversionPanel } from "@/components/qa-assessment/gap-conversion-panel";
import { EffectivenessKpis } from "@/components/qa-assessment/effectiveness-kpis";
import { AuditHealthDashboard } from "@/components/qa-assessment/audit-health-dashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function QaAssessmentPage() {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;

  if (!hasPermission(userRoles, "qa_assessment:read")) {
    redirect("/dashboard");
  }

  const canManage = hasPermission(userRoles, "qa_assessment:manage");

  // Fetch real QA assessment data
  const currentYear = new Date().getFullYear();

  try {
    const { assessments, summary } = await getQaAssessmentsByYear(
      session,
      currentYear,
    );
    const unconvertedGaps = await getUnconvertedGaps(session);
    const progress = await getQaAssessmentProgress(session);
    const standardSummary = await getQaSummaryByStandard(session, currentYear);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            QA Self-Assessment
          </h1>
          <p className="text-muted-foreground">
            Quality Assurance — IIA Standards compliance self-assessment
          </p>
        </div>

        <Tabs defaultValue="assessment" className="space-y-4">
          <TabsList>
            <TabsTrigger value="assessment">Self-Assessment</TabsTrigger>
            <TabsTrigger value="gaps">
              Gap Conversion ({unconvertedGaps.length})
            </TabsTrigger>
            <TabsTrigger value="kpis">Effectiveness KPIs</TabsTrigger>
            <TabsTrigger value="health">Audit Health</TabsTrigger>
          </TabsList>

          <TabsContent value="assessment" className="space-y-4">
            <AssessmentForm
              assessments={assessments}
              summary={summary}
              canManage={canManage}
            />
          </TabsContent>

          <TabsContent value="gaps" className="space-y-4">
            <GapConversionPanel gaps={unconvertedGaps} canManage={canManage} />
          </TabsContent>

          <TabsContent value="kpis" className="space-y-4">
            <EffectivenessKpis session={session} />
          </TabsContent>

          <TabsContent value="health" className="space-y-4">
            <AuditHealthDashboard
              progress={progress}
              standardSummary={standardSummary}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  } catch (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            QA Self-Assessment
          </h1>
          <p className="text-muted-foreground">
            Quality Assurance — IIA Standards compliance self-assessment
          </p>
        </div>
        <div className="border-destructive bg-destructive/10 rounded-lg border p-4">
          <p className="text-destructive text-sm">
            Failed to load QA assessment data. Please try again later.
          </p>
        </div>
      </div>
    );
  }
}
