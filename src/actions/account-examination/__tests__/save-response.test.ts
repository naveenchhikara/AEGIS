import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/data-access/session", () => ({ getRequiredSession: vi.fn() }));
vi.mock("@/data-access/prisma", () => ({ prismaForTenant: vi.fn() }));
vi.mock("@/data-access/access-guards", () => ({
  requireTeamMembership: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { saveAccountExamResponse } from "../save-response";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { requireTeamMembership } from "@/data-access/access-guards";
import {
  ENGAGEMENT_A,
  LOAN_ACCOUNT_A,
  QUESTION_A,
  TENANT_A,
  USER_A,
  fakeDb,
  fakeSession,
} from "@/test/factories";

const INPUT = {
  engagementId: ENGAGEMENT_A,
  loanAccountId: LOAN_ACCOUNT_A,
  questionId: QUESTION_A,
  status: "VIOLATION" as const,
  note: "Valuation report older than the sanction date.",
};

function examinationDb(question: { id: string } | null) {
  return fakeDb({
    auditEngagement: {
      findFirst: vi
        .fn()
        .mockResolvedValue({ id: ENGAGEMENT_A, status: "IN_PROGRESS" }),
    },
    loanAccount: {
      findFirst: vi.fn().mockResolvedValue({
        id: LOAN_ACCOUNT_A,
        isSampled: true,
        moduleCode: "CRD-HLN",
      }),
    },
    examinationQuestion: { findFirst: vi.fn().mockResolvedValue(question) },
    accountExamResponse: {
      upsert: vi
        .fn()
        .mockResolvedValue({ id: "response-1", status: "VIOLATION" }),
    },
  });
}

describe("saveAccountExamResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireTeamMembership).mockResolvedValue({ ok: true });
  });

  it("refuses a read-only role that lacks examination:respond", async () => {
    vi.mocked(getRequiredSession).mockResolvedValue(
      fakeSession({ roles: ["CAE"] }) as never,
    );

    const result = await saveAccountExamResponse(INPUT);

    expect(result).toEqual({
      success: false,
      error: "You do not have permission to record examination responses.",
    });
  });

  it("refuses an examiner who is not on the engagement's team", async () => {
    vi.mocked(getRequiredSession).mockResolvedValue(
      fakeSession({ roles: ["FIELD_AUDITOR"] }) as never,
    );
    vi.mocked(requireTeamMembership).mockResolvedValue({
      ok: false,
      error: "You are not on the audit team for this engagement.",
    });
    vi.mocked(prismaForTenant).mockReturnValue(
      examinationDb({ id: QUESTION_A }),
    );

    const result = await saveAccountExamResponse(INPUT);

    expect(result).toEqual({
      success: false,
      error: "You are not on the audit team for this engagement.",
    });
  });

  it("refuses a question outside the account's module", async () => {
    vi.mocked(getRequiredSession).mockResolvedValue(
      fakeSession({ roles: ["FIELD_AUDITOR"] }) as never,
    );
    const db = examinationDb(null);
    vi.mocked(prismaForTenant).mockReturnValue(db);

    const result = await saveAccountExamResponse(INPUT);

    expect(result).toEqual({
      success: false,
      error: "Question not found for this account's module.",
    });
    expect(db.accountExamResponse.upsert).not.toHaveBeenCalled();
  });

  it("saves for a team examiner answering an in-module question", async () => {
    vi.mocked(getRequiredSession).mockResolvedValue(
      fakeSession({ roles: ["FIELD_AUDITOR"] }) as never,
    );
    const db = examinationDb({ id: QUESTION_A });
    vi.mocked(prismaForTenant).mockReturnValue(db);

    const result = await saveAccountExamResponse(INPUT);

    expect(result).toEqual({
      success: true,
      data: { id: "response-1", status: "VIOLATION" },
    });
    expect(db.examinationQuestion.findFirst).toHaveBeenCalledWith({
      where: {
        id: QUESTION_A,
        tenantId: TENANT_A,
        moduleCode: "CRD-HLN",
        isActive: true,
      },
      select: { id: true },
    });
    expect(requireTeamMembership).toHaveBeenCalledWith(
      { userId: USER_A, tenantId: TENANT_A },
      ENGAGEMENT_A,
    );
  });
});
