import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/data-access/session", () => ({ getRequiredSession: vi.fn() }));
vi.mock("@/data-access/prisma", () => ({ prismaForTenant: vi.fn() }));
vi.mock("@/data-access/audit-context", () => ({ setAuditContext: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { submitBranchResponse } from "../submit-branch-response";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import {
  COMPLIANCE_ITEM_A,
  BRANCH_A,
  fakeDb,
  fakeSession,
} from "@/test/factories";

const VALID_INPUT = {
  complianceItemId: COMPLIANCE_ITEM_A,
  responseText: "Rectified; sanction note and KYC re-verified.",
};

describe("submitBranchResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuses a role without compliance:branch_response", async () => {
    vi.mocked(getRequiredSession).mockResolvedValue(
      fakeSession({ roles: ["AUDITOR"] }) as never,
    );

    const result = await submitBranchResponse(VALID_INPUT);

    expect(result).toEqual({
      success: false,
      error: "You do not have permission to submit branch responses.",
    });
  });

  it("refuses a response shorter than the schema minimum", async () => {
    vi.mocked(getRequiredSession).mockResolvedValue(
      fakeSession({ roles: ["BRANCH_HEAD"] }) as never,
    );

    const result = await submitBranchResponse({
      complianceItemId: COMPLIANCE_ITEM_A,
      responseText: "done",
    });

    expect(result.success).toBe(false);
  });

  it("submits a response for an open compliance item", async () => {
    vi.mocked(getRequiredSession).mockResolvedValue(
      fakeSession({ roles: ["BRANCH_HEAD"] }) as never,
    );
    vi.mocked(prismaForTenant).mockReturnValue(
      fakeDb({
        complianceItem: {
          findFirst: vi.fn().mockResolvedValue({
            id: COMPLIANCE_ITEM_A,
            status: "OPEN",
            branchId: BRANCH_A,
            observation: { branchId: BRANCH_A },
          }),
          update: vi.fn().mockResolvedValue({ id: COMPLIANCE_ITEM_A }),
        },
      }),
    );

    const result = await submitBranchResponse(VALID_INPUT);

    expect(result).toEqual({
      success: true,
      data: { id: COMPLIANCE_ITEM_A, status: "BRANCH_RESPONSE_SUBMITTED" },
    });
  });
});
