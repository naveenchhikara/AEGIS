import { getTranslations } from "next-intl/server";
import { bankProfile } from "@/data";
import type { BankProfile } from "@/types";
import { ExecutiveSummary } from "@/components/reports/executive-summary";
import { AuditCoverageTable } from "@/components/reports/audit-coverage-table";
import { KeyFindingsSummary } from "@/components/reports/key-findings-summary";
import { ComplianceScorecard } from "@/components/reports/compliance-scorecard";
import { RecommendationsSection } from "@/components/reports/recommendations-section";
import { PrintButton } from "@/components/reports/print-button";
import { ReportGenerator } from "@/components/reports/report-generator";
import { Separator } from "@/components/ui/separator";
import { requireAnyPermission } from "@/lib/guards";
import { hasPermission, type Role } from "@/lib/permissions";
import { getBoardReports } from "@/data-access/reports";

const bank = bankProfile as unknown as BankProfile;

export default async function ReportsPage() {
  const session = await requireAnyPermission([
    "report:read",
    "report:generate",
  ]);
  const t = await getTranslations("Reports");

  const userRoles = (session.user as any).roles as Role[];
  const canGenerate = hasPermission(userRoles, "report:generate");

  // Fetch previously generated board reports
  const reports = (await getBoardReports(session)) ?? [];
  const serializedReports = reports.map((r) => ({
    id: r.id,
    title: r.title,
    quarter: r.quarter,
    year: r.year,
    generatedAt: r.generatedAt.toISOString(),
    generatedBy: r.generatedBy,
    fileSize: r.fileSize,
  }));

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Report Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight md:text-2xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm">
            {t("subtitle", { bankName: bank.name })} &mdash; Q3 FY 2025-26
          </p>
        </div>
        <PrintButton />
      </div>

      {/* Board Report Generator */}
      <ReportGenerator
        canGenerate={canGenerate}
        previousReports={serializedReports}
      />

      <Separator />

      {/* Report Preview / Dashboard */}
      <div className="print-report space-y-4 md:space-y-6">
        <ExecutiveSummary />

        <Separator />

        <AuditCoverageTable />

        <Separator />

        <KeyFindingsSummary />

        <Separator />

        <ComplianceScorecard />

        <Separator />

        <RecommendationsSection />
      </div>

      {/* Report Footer (print only) */}
      <div className="text-muted-foreground mt-8 hidden border-t pt-4 text-center text-xs print:block">
        <p>
          {t("confidential")} &mdash; {t("preparedBy", { bankName: bank.name })}
        </p>
        <p>
          {t("generated", { date: new Date().toLocaleDateString("en-IN") })}
        </p>
      </div>
    </div>
  );
}
