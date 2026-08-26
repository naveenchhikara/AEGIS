const TENANT_FIRST_NAMESPACES = new Set([
  "evidence",
  "bm-evidence",
  "minutes",
  "is-audit",
  "reports",
]);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

type DownloadAuthorizationSuccess = { ok: true };
type DownloadAuthorizationFailure = {
  ok: false;
  code:
    | "INVALID_FORMAT"
    | "MISSING_TENANT"
    | "TENANT_MISMATCH"
    | "UNSUPPORTED_NAMESPACE";
};

export type DownloadAuthorizationResult =
  | DownloadAuthorizationSuccess
  | DownloadAuthorizationFailure;

export function authorizeDownloadKey(
  key: string,
  sessionTenantId: string | null | undefined,
): DownloadAuthorizationResult {
  if (!sessionTenantId || !UUID_REGEX.test(sessionTenantId)) {
    return { ok: false, code: "MISSING_TENANT" };
  }

  const parts = key.split("/");
  if (parts.length < 3 || parts.some((part) => part.length === 0)) {
    return { ok: false, code: "INVALID_FORMAT" };
  }

  const [firstSegment, secondSegment] = parts;

  // Legacy generated report layout: audit-reports/{tenantId}/...
  if (firstSegment === "audit-reports") {
    if (!UUID_REGEX.test(secondSegment)) {
      return { ok: false, code: "INVALID_FORMAT" };
    }
    if (secondSegment !== sessionTenantId) {
      return { ok: false, code: "TENANT_MISMATCH" };
    }
    return { ok: true };
  }

  if (!UUID_REGEX.test(firstSegment)) {
    return { ok: false, code: "INVALID_FORMAT" };
  }
  if (firstSegment !== sessionTenantId) {
    return { ok: false, code: "TENANT_MISMATCH" };
  }
  if (!TENANT_FIRST_NAMESPACES.has(secondSegment)) {
    return { ok: false, code: "UNSUPPORTED_NAMESPACE" };
  }

  return { ok: true };
}
