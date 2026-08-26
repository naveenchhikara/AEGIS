import { describe, expect, it } from "vitest";
import { authorizeDownloadKey } from "@/lib/authorize-download";

const TENANT_A = "11111111-1111-4111-8111-111111111111";
const TENANT_B = "22222222-2222-4222-8222-222222222222";

describe("authorizeDownloadKey", () => {
  it("allows tenant-first evidence keys for the session tenant", () => {
    const key = `${TENANT_A}/evidence/obs-1/file.pdf`;
    expect(authorizeDownloadKey(key, TENANT_A)).toEqual({ ok: true });
  });

  it("allows legacy audit-reports keys with tenant in second segment", () => {
    const key = `audit-reports/${TENANT_A}/A-001_report.pdf`;
    expect(authorizeDownloadKey(key, TENANT_A)).toEqual({ ok: true });
  });

  it("rejects missing tenant IDs from optional session", () => {
    const key = `${TENANT_A}/evidence/obs-1/file.pdf`;
    expect(authorizeDownloadKey(key, null)).toEqual({
      ok: false,
      code: "MISSING_TENANT",
    });
  });

  it("rejects tenant mismatch for tenant-first layout", () => {
    const key = `${TENANT_B}/minutes/meeting-1/minutes.pdf`;
    expect(authorizeDownloadKey(key, TENANT_A)).toEqual({
      ok: false,
      code: "TENANT_MISMATCH",
    });
  });

  it("rejects tenant mismatch for audit-reports layout", () => {
    const key = `audit-reports/${TENANT_B}/A-001_report.pdf`;
    expect(authorizeDownloadKey(key, TENANT_A)).toEqual({
      ok: false,
      code: "TENANT_MISMATCH",
    });
  });

  it("rejects unsupported namespaces even when tenant matches", () => {
    const key = `${TENANT_A}/unknown-space/record/file.pdf`;
    expect(authorizeDownloadKey(key, TENANT_A)).toEqual({
      ok: false,
      code: "UNSUPPORTED_NAMESPACE",
    });
  });

  it("rejects malformed UUID tenant segment", () => {
    const key = `not-a-uuid/evidence/obs-1/file.pdf`;
    expect(authorizeDownloadKey(key, TENANT_A)).toEqual({
      ok: false,
      code: "INVALID_FORMAT",
    });
  });

  it("rejects malformed audit-reports tenant segment", () => {
    const key = "audit-reports/not-a-uuid/A-001_report.pdf";
    expect(authorizeDownloadKey(key, TENANT_A)).toEqual({
      ok: false,
      code: "INVALID_FORMAT",
    });
  });
});
