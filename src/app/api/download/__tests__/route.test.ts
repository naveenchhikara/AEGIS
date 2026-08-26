import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getOptionalSessionMock, generateDownloadUrlMock } = vi.hoisted(() => ({
  getOptionalSessionMock: vi.fn(),
  generateDownloadUrlMock: vi.fn(),
}));

vi.mock("@/data-access/session", () => ({
  getOptionalSession: getOptionalSessionMock,
}));

vi.mock("@/lib/s3", () => ({
  generateDownloadUrl: generateDownloadUrlMock,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { GET } from "@/app/api/download/route";

describe("GET /api/download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 for cross-tenant keys", async () => {
    getOptionalSessionMock.mockResolvedValue({
      user: { id: "user-1", tenantId: "tenant-a" },
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/download?key=tenant-b/evidence/file.pdf",
      ),
    );

    expect(response.status).toBe(403);
    expect(generateDownloadUrlMock).not.toHaveBeenCalled();
  });

  it("allows tenant-scoped evidence keys", async () => {
    getOptionalSessionMock.mockResolvedValue({
      user: { id: "user-1", tenantId: "tenant-a" },
    });
    generateDownloadUrlMock.mockResolvedValue("https://example.com/signed");

    const response = await GET(
      new NextRequest(
        "http://localhost/api/download?key=tenant-a/evidence/file.pdf",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/signed");
    expect(generateDownloadUrlMock).toHaveBeenCalledWith(
      "tenant-a/evidence/file.pdf",
    );
  });

  it("allows tenant-scoped report keys", async () => {
    getOptionalSessionMock.mockResolvedValue({
      user: { id: "user-1", tenantId: "tenant-a" },
    });
    generateDownloadUrlMock.mockResolvedValue("https://example.com/signed");

    const response = await GET(
      new NextRequest(
        "http://localhost/api/download?key=audit-reports/tenant-a/report.pdf",
      ),
    );

    expect(response.status).toBe(307);
    expect(generateDownloadUrlMock).toHaveBeenCalledWith(
      "audit-reports/tenant-a/report.pdf",
    );
  });
});
