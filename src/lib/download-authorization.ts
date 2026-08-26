import { hasPermission, type Role } from "@/lib/permissions";

const BOARD_REPORT_ROLES: Role[] = ["CAE", "CCO", "CEO"];

export type DownloadObjectType =
  | "EVIDENCE"
  | "BOARD_REPORT"
  | "COMMITTEE_MINUTES"
  | "UNKNOWN";

export function classifyDownloadObjectType(
  tenantId: string,
  s3Key: string,
): DownloadObjectType {
  const expectedPrefix = `${tenantId}/`;
  if (!s3Key.startsWith(expectedPrefix)) {
    return "UNKNOWN";
  }

  const [, category] = s3Key.split("/");

  if (category === "evidence" || category === "bm-evidence") {
    return "EVIDENCE";
  }
  if (category === "reports") {
    return "BOARD_REPORT";
  }
  if (category === "minutes") {
    return "COMMITTEE_MINUTES";
  }

  return "UNKNOWN";
}

export function canAccessBoardReport(roles: Role[]): boolean {
  return roles.some((role) => BOARD_REPORT_ROLES.includes(role));
}

export function canAccessCommitteeMinutes(roles: Role[]): boolean {
  return (
    hasPermission(roles, "committee:read") ||
    hasPermission(roles, "committee:manage")
  );
}

export function canAccessEvidenceByRole(roles: Role[]): boolean {
  return (
    hasPermission(roles, "observation:read") ||
    hasPermission(roles, "examination:read") ||
    hasPermission(roles, "action_point:manage") ||
    hasPermission(roles, "action_point:bm_respond") ||
    hasPermission(roles, "rbia:examine") ||
    hasPermission(roles, "rbia:score_freeze")
  );
}

export function requiresBranchScopeForEvidence(roles: Role[]): boolean {
  return roles.includes("AUDITEE");
}
