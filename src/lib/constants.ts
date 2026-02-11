export const APP_NAME = "AEGIS";
export const APP_FULL_NAME = "AEGIS Audit & Compliance Platform";
export const APP_DESCRIPTION =
  "Internal Audit & RBI Compliance Management for Urban Cooperative Banks";

export const LANGUAGES = [
  { code: "en", label: "English", short: "EN" },
  { code: "hi", label: "हिन्दी", short: "HI" },
  { code: "mr", label: "मराठी", short: "MR" },
  { code: "gu", label: "ગુજરાતી", short: "GU" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const DEFAULT_LANGUAGE: LanguageCode = "en";

export const SEVERITY_COLORS = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-green-100 text-green-800 border-green-200",
} as const;

export const STATUS_COLORS = {
  compliant: "bg-emerald-100 text-emerald-800 border-emerald-200",
  partial: "bg-amber-100 text-amber-800 border-amber-200",
  "non-compliant": "bg-red-100 text-red-800 border-red-200",
  pending: "bg-slate-100 text-slate-700 border-slate-200",
} as const;

export const FINDING_STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  submitted: "bg-blue-100 text-blue-800 border-blue-200",
  reviewed: "bg-purple-100 text-purple-800 border-purple-200",
  responded: "bg-amber-100 text-amber-800 border-amber-200",
  closed: "bg-emerald-100 text-emerald-800 border-emerald-200",
} as const;

export const OBSERVATION_STATUS_COLORS = {
  DRAFT: "border-gray-300 bg-gray-50 text-gray-700",
  SUBMITTED: "border-blue-300 bg-blue-50 text-blue-700",
  REVIEWED: "border-purple-300 bg-purple-50 text-purple-700",
  ISSUED: "border-orange-300 bg-orange-50 text-orange-700",
  RESPONSE: "border-yellow-300 bg-yellow-50 text-yellow-700",
  COMPLIANCE: "border-teal-300 bg-teal-50 text-teal-700",
  CLOSED: "border-green-300 bg-green-50 text-green-700",
} as const;

export const OBSERVATION_STATUS_ORDER: Record<string, number> = {
  DRAFT: 0,
  SUBMITTED: 1,
  REVIEWED: 2,
  ISSUED: 3,
  RESPONSE: 4,
  COMPLIANCE: 5,
  CLOSED: 6,
};

/**
 * Severity sort order (lower = more severe). Case-insensitive — includes
 * both upper and lower variants so callers don't need to normalize.
 * Previously duplicated in findings-table.tsx, observation-list.tsx, report-utils.ts.
 */
export const SEVERITY_SORT_ORDER: Record<string, number> = {
  CRITICAL: 0,
  critical: 0,
  HIGH: 1,
  high: 1,
  MEDIUM: 2,
  medium: 2,
  LOW: 3,
  low: 3,
};

/**
 * Capitalize first letter, lowercase the rest.
 * Used for displaying severity/status values from the database.
 * Previously duplicated in findings-table.tsx.
 */
export function formatEnumLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export const RISK_CATEGORIES = [
  { id: "credit-risk", label: "Credit Risk" },
  { id: "market-risk", label: "Market Risk" },
  { id: "operational-risk", label: "Operational Risk" },
  { id: "liquidity-risk", label: "Liquidity Risk" },
  { id: "compliance-risk", label: "Compliance Risk" },
  { id: "it-risk", label: "IT & Cyber Risk" },
  { id: "governance-risk", label: "Governance Risk" },
  { id: "aml-cft", label: "AML/CFT" },
] as const;

export const AUDIT_STATUS_COLORS = {
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "in-progress": "bg-blue-100 text-blue-800 border-blue-200",
  planned: "bg-slate-100 text-slate-700 border-slate-200",
  "on-hold": "bg-amber-100 text-amber-800 border-amber-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
} as const;
