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

export const AUDIT_STATUS_COLORS = {
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "in-progress": "bg-blue-100 text-blue-800 border-blue-200",
  planned: "bg-slate-100 text-slate-700 border-slate-200",
  "on-hold": "bg-amber-100 text-amber-800 border-amber-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
} as const;
