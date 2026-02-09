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
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  SUBMITTED: "bg-blue-100 text-blue-800 border-blue-200",
  REVIEWED: "bg-purple-100 text-purple-800 border-purple-200",
  ISSUED: "bg-indigo-100 text-indigo-800 border-indigo-200",
  RESPONSE: "bg-amber-100 text-amber-800 border-amber-200",
  COMPLIANCE: "bg-teal-100 text-teal-800 border-teal-200",
  CLOSED: "bg-emerald-100 text-emerald-800 border-emerald-200",
} as const;

export const OBSERVATION_STATUS_ORDER: string[] = [
  "DRAFT",
  "SUBMITTED",
  "REVIEWED",
  "ISSUED",
  "RESPONSE",
  "COMPLIANCE",
  "CLOSED",
];

export const RISK_CATEGORIES = [
  { value: "CREDIT_RISK", label: "Credit Risk" },
  { value: "MARKET_RISK", label: "Market Risk" },
  { value: "OPERATIONAL_RISK", label: "Operational Risk" },
  { value: "LIQUIDITY_RISK", label: "Liquidity Risk" },
  { value: "COMPLIANCE_RISK", label: "Compliance Risk" },
  { value: "IT_RISK", label: "IT Risk" },
  { value: "FRAUD_RISK", label: "Fraud Risk" },
  { value: "REPUTATIONAL_RISK", label: "Reputational Risk" },
  { value: "STRATEGIC_RISK", label: "Strategic Risk" },
  { value: "INTEREST_RATE_RISK", label: "Interest Rate Risk" },
  { value: "KYC_AML_RISK", label: "KYC/AML Risk" },
  { value: "GOVERNANCE_RISK", label: "Governance Risk" },
] as const;

export const AUDIT_STATUS_COLORS = {
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "in-progress": "bg-blue-100 text-blue-800 border-blue-200",
  planned: "bg-slate-100 text-slate-700 border-slate-200",
  "on-hold": "bg-amber-100 text-amber-800 border-amber-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
} as const;
