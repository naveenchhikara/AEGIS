import { bankProfile } from "@/data";
import type { BankProfile } from "@/types";
import { ExecutiveSummary } from "@/components/reports/executive-summary";
import { AuditCoverageTable } from "@/components/reports/audit-coverage-table";
import { KeyFindingsSummary } from "@/components/reports/key-findings-summary";
import { ComplianceScorecard } from "@/components/reports/compliance-scorecard";
import { RecommendationsSection } from "@/components/reports/recommendations-section";
import { PrintButton } from "@/components/reports/print-button";
import { Separator } from "@/components/ui/separator";

const bank = bankProfile as unknown as BankProfile;

export default function ReportsPage() {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Report Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight md:text-2xl">
            Board Report
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm">
            {bank.name} | Internal Audit Report &mdash; Q3 FY 2025-26
          </p>
        </div>
        <PrintButton />
      </div>

      {/* Report Body */}
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
          Confidential &mdash; Prepared by Internal Audit Department,{" "}
          {bank.name}
        </p>
        <p>Generated: {new Date().toLocaleDateString("en-IN")}</p>
      </div>
    </div>
  );
}
