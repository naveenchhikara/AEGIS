import { describe, expect, it } from "vitest";
import {
  canAccessBoardReport,
  canAccessCommitteeMinutes,
  canAccessEvidenceByRole,
  classifyDownloadObjectType,
  requiresBranchScopeForEvidence,
} from "@/lib/download-authorization";

describe("download authorization model", () => {
  const tenantId = "tenant-123";

  describe("classifyDownloadObjectType", () => {
    it("classifies supported key categories", () => {
      expect(
        classifyDownloadObjectType(tenantId, `${tenantId}/evidence/obs/file.pdf`),
      ).toBe("EVIDENCE");
      expect(
        classifyDownloadObjectType(
          tenantId,
          `${tenantId}/bm-evidence/ap/file.pdf`,
        ),
      ).toBe("EVIDENCE");
      expect(
        classifyDownloadObjectType(tenantId, `${tenantId}/reports/2026/Q1/file`),
      ).toBe("BOARD_REPORT");
      expect(
        classifyDownloadObjectType(tenantId, `${tenantId}/minutes/mtg/file.pdf`),
      ).toBe("COMMITTEE_MINUTES");
    });

    it("returns UNKNOWN for cross-tenant and unsupported prefixes", () => {
      expect(
        classifyDownloadObjectType(tenantId, `other-tenant/evidence/obs/file`),
      ).toBe("UNKNOWN");
      expect(
        classifyDownloadObjectType(tenantId, `${tenantId}/policy/file.pdf`),
      ).toBe("UNKNOWN");
    });
  });

  it("enforces strict board report role access", () => {
    expect(canAccessBoardReport(["CAE"])).toBe(true);
    expect(canAccessBoardReport(["CCO"])).toBe(true);
    expect(canAccessBoardReport(["CEO"])).toBe(true);
    expect(canAccessBoardReport(["AUDIT_MANAGER"])).toBe(false);
  });

  it("uses committee permissions for committee minutes access", () => {
    expect(canAccessCommitteeMinutes(["CEO"])).toBe(true);
    expect(canAccessCommitteeMinutes(["SYSTEM_ADMIN"])).toBe(true);
    expect(canAccessCommitteeMinutes(["AUDITEE"])).toBe(false);
  });

  it("uses role + assignment model for evidence access", () => {
    expect(canAccessEvidenceByRole(["AUDITOR"])).toBe(true);
    expect(canAccessEvidenceByRole(["LEAD_AUDITOR"])).toBe(true);
    expect(canAccessEvidenceByRole(["AUDITEE"])).toBe(true);
    expect(canAccessEvidenceByRole(["SYSTEM_ADMIN"])).toBe(false);

    expect(requiresBranchScopeForEvidence(["AUDITEE"])).toBe(true);
    expect(requiresBranchScopeForEvidence(["LEAD_AUDITOR"])).toBe(false);
  });
});
