// English source data (default fallback)
import bankProfileEn from "@/data/demo/bank-profile.json";
import staffEn from "@/data/demo/staff.json";
import branchesEn from "@/data/demo/branches.json";
import complianceRequirementsEn from "@/data/demo/compliance-requirements.json";
import auditPlansEn from "@/data/demo/audit-plans.json";
import findingsEn from "@/data/demo/findings.json";
import rbiCircularsEn from "@/data/demo/rbi-circulars.json";

// Hindi translations
import bankProfileHi from "@/data/demo/hi/bank-profile.json";
import branchesHi from "@/data/demo/hi/branches.json";
import complianceRequirementsHi from "@/data/demo/hi/compliance-requirements.json";
import auditPlansHi from "@/data/demo/hi/audit-plans.json";
import findingsHi from "@/data/demo/hi/findings.json";
import rbiCircularsHi from "@/data/demo/hi/rbi-circulars.json";

// Marathi translations
import bankProfileMr from "@/data/demo/mr/bank-profile.json";
import branchesMr from "@/data/demo/mr/branches.json";
import complianceRequirementsMr from "@/data/demo/mr/compliance-requirements.json";
import auditPlansMr from "@/data/demo/mr/audit-plans.json";
import findingsMr from "@/data/demo/mr/findings.json";
import rbiCircularsMr from "@/data/demo/mr/rbi-circulars.json";

// Gujarati translations
import bankProfileGu from "@/data/demo/gu/bank-profile.json";
import branchesGu from "@/data/demo/gu/branches.json";
import complianceRequirementsGu from "@/data/demo/gu/compliance-requirements.json";
import auditPlansGu from "@/data/demo/gu/audit-plans.json";
import findingsGu from "@/data/demo/gu/findings.json";
import rbiCircularsGu from "@/data/demo/gu/rbi-circulars.json";

type DemoData = {
  bankProfile: typeof bankProfileEn;
  staff: typeof staffEn;
  branches: typeof branchesEn;
  complianceRequirements: typeof complianceRequirementsEn;
  auditPlans: typeof auditPlansEn;
  findings: typeof findingsEn;
  rbiCirculars: typeof rbiCircularsEn;
};

const dataByLocale: Record<string, Partial<Omit<DemoData, "staff">>> = {
  hi: {
    bankProfile: bankProfileHi as unknown as typeof bankProfileEn,
    branches: branchesHi as unknown as typeof branchesEn,
    complianceRequirements:
      complianceRequirementsHi as unknown as typeof complianceRequirementsEn,
    auditPlans: auditPlansHi as unknown as typeof auditPlansEn,
    findings: findingsHi as unknown as typeof findingsEn,
    rbiCirculars: rbiCircularsHi as unknown as typeof rbiCircularsEn,
  },
  mr: {
    bankProfile: bankProfileMr as unknown as typeof bankProfileEn,
    branches: branchesMr as unknown as typeof branchesEn,
    complianceRequirements:
      complianceRequirementsMr as unknown as typeof complianceRequirementsEn,
    auditPlans: auditPlansMr as unknown as typeof auditPlansEn,
    findings: findingsMr as unknown as typeof findingsEn,
    rbiCirculars: rbiCircularsMr as unknown as typeof rbiCircularsEn,
  },
  gu: {
    bankProfile: bankProfileGu as unknown as typeof bankProfileEn,
    branches: branchesGu as unknown as typeof branchesEn,
    complianceRequirements:
      complianceRequirementsGu as unknown as typeof complianceRequirementsEn,
    auditPlans: auditPlansGu as unknown as typeof auditPlansEn,
    findings: findingsGu as unknown as typeof findingsEn,
    rbiCirculars: rbiCircularsGu as unknown as typeof rbiCircularsEn,
  },
};

/**
 * Get demo data for the specified locale.
 * Falls back to English for any missing locale data.
 * Staff data is always English (names don't translate).
 */
export function getLocaleData(locale: string = "en"): DemoData {
  const localeData = dataByLocale[locale] || {};
  return {
    bankProfile: localeData.bankProfile ?? bankProfileEn,
    staff: staffEn,
    branches: localeData.branches ?? branchesEn,
    complianceRequirements:
      localeData.complianceRequirements ?? complianceRequirementsEn,
    auditPlans: localeData.auditPlans ?? auditPlansEn,
    findings: localeData.findings ?? findingsEn,
    rbiCirculars: localeData.rbiCirculars ?? rbiCircularsEn,
  };
}
