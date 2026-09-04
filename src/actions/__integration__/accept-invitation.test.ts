import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import {
  createTenant,
  integrationPrisma,
  resetDatabase,
  withFixtures,
} from "../../../tests/integration/harness";

async function seedInvitedUser(tenantId: string, rawToken: string) {
  const inviteTokenHash = await bcrypt.hash(rawToken, 12);
  return withFixtures(() =>
    integrationPrisma.user.create({
      data: {
        email: "invited-user@example.test",
        name: "Invited User",
        tenantId,
        roles: ["AUDITOR"],
        status: "INVITED",
        inviteTokenHash,
        inviteExpiry: new Date(Date.now() + 60 * 60 * 1000),
      },
      select: { id: true, email: true },
    }),
  );
}

describe("acceptInvitation audit logging", () => {
  beforeEach(async () => {
    await resetDatabase();
    vi.resetModules();
  });

  it("writes exactly one trigger-backed audit row with request IP", async () => {
    vi.doMock("next/headers", () => ({
      headers: vi.fn(async () => new Headers({ "x-forwarded-for": "203.0.113.9" })),
    }));
    vi.doMock("@/lib/auth", () => ({
      auth: {
        $context: Promise.resolve({
          password: { hash: vi.fn(async (plain: string) => `scrypt:${plain}`) },
        }),
      },
    }));

    const tenant = await createTenant();
    const rawToken = "accept-token";
    const invited = await seedInvitedUser(tenant.id, rawToken);
    const { acceptInvitation } = await import("../user-invitations");

    const result = await acceptInvitation(
      rawToken,
      invited.email,
      "Branch2026audit",
    );

    expect(result).toEqual({ success: true, error: null });

    const logs = await integrationPrisma.auditLog.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        tableName: true,
        recordId: true,
        operation: true,
        actionType: true,
        userId: true,
        ipAddress: true,
      },
    });

    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      tableName: "User",
      recordId: invited.id,
      operation: "UPDATE",
      actionType: "user.invitation_accepted",
      userId: invited.id,
      ipAddress: "203.0.113.9",
    });
  });
});
