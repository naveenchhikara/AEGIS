import { describe, it, expect, beforeEach, vi } from "vitest";
import bcrypt from "bcryptjs";
import {
  createTenant,
  integrationPrisma,
  resetDatabase,
  withFixtures,
} from "../../../tests/integration/harness";

async function seedInvitedUser(email: string, token: string) {
  const tenant = await createTenant("Invitation Tenant");
  const inviteTokenHash = await bcrypt.hash(token, 12);
  const user = await withFixtures(() =>
    integrationPrisma.user.create({
      data: {
        email,
        name: "Invited User",
        tenantId: tenant.id,
        roles: ["AUDITOR"],
        status: "INVITED",
        inviteTokenHash,
        inviteExpiry: new Date(Date.now() + 60_000),
      },
      select: { id: true, tenantId: true },
    }),
  );

  return { userId: user.id, tenantId: user.tenantId };
}

describe("acceptInvitation integration", () => {
  beforeEach(async () => {
    await resetDatabase();
    vi.resetModules();
  });

  it("lets exactly one of two concurrent accepts succeed and persists one credential account", async () => {
    vi.doMock("next/headers", () => ({
      headers: vi.fn(async () => new Headers({ "x-forwarded-for": "127.0.0.1" })),
    }));
    vi.doMock("@/lib/auth", () => ({
      auth: {
        $context: Promise.resolve({
          password: { hash: vi.fn(async (plain: string) => `scrypt:${plain}`) },
        }),
      },
    }));
    vi.doMock("@/lib/logger", () => ({
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    }));
    vi.doMock("@/lib/invitation-mailer", () => ({
      sendInvitationEmail: vi.fn(),
    }));

    const email = "invitee@ucb.example";
    const token = "raw-invite-token";
    const password = "Branch2026audit";
    const { userId } = await seedInvitedUser(email, token);
    const { acceptInvitation } = await import("../user-invitations");

    const [a, b] = await Promise.all([
      acceptInvitation(token, email, password),
      acceptInvitation(token, email, password),
    ]);

    const winners = [a, b].filter((result) => result.success);
    const losers = [a, b].filter((result) => !result.success);

    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);

    const accounts = await integrationPrisma.account.findMany({
      where: { userId, providerId: "credential" },
      select: { accountId: true, password: true },
    });
    expect(accounts).toHaveLength(1);
    expect(accounts[0].accountId).toBe(userId);
    expect(accounts[0].password).toBe("scrypt:Branch2026audit");

    const user = await integrationPrisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { status: true, inviteTokenHash: true, inviteExpiry: true },
    });
    expect(user.status).toBe("ACTIVE");
    expect(user.inviteTokenHash).toBeNull();
    expect(user.inviteExpiry).toBeNull();
  });
});
