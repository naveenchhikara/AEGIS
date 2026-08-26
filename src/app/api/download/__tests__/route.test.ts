import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/download/route";
import { getOptionalSession } from "@/data-access/session";
import { generateDownloadUrl } from "@/lib/s3";

vi.mock("@/data-access/session", () => ({
  getOptionalSession: vi.fn(),
}));

vi.mock("@/lib/s3", () => ({
  generateDownloadUrl: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("GET /api/download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    vi.mocked(getOptionalSession).mockResolvedValueOnce(null);

    const request = new NextRequest("http://localhost/api/download?key=t1/file.pdf");
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("returns 403 for keys outside tenant scope", async () => {
    vi.mocked(getOptionalSession).mockResolvedValueOnce({
      user: { id: "u1", tenantId: "tenant-a" },
    } as never);

    const request = new NextRequest(
      "http://localhost/api/download?key=tenant-b/evidence/file.pdf",
    );
    const response = await GET(request);

    expect(response.status).toBe(403);
    expect(vi.mocked(generateDownloadUrl)).not.toHaveBeenCalled();
  });

  it("redirects for keys inside tenant scope", async () => {
    vi.mocked(getOptionalSession).mockResolvedValueOnce({
      user: { id: "u1", tenantId: "tenant-a" },
    } as never);
    vi.mocked(generateDownloadUrl).mockResolvedValueOnce(
      "https://signed.example.com",
    );

    const request = new NextRequest(
      "http://localhost/api/download?key=tenant-a/evidence/file.pdf",
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://signed.example.com/");
  });
});
