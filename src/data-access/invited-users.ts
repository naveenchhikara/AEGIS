import "server-only";

import { Prisma } from "@/generated/prisma/client";
import bcrypt from "bcryptjs";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface CreateInvitedUserInput {
  email: string;
  name: string;
  roles: string[];
  tenantId: string;
  invitedBy: string;
}

export interface InvitationDelivery {
  email: string;
  name: string;
  rawToken: string;
  inviteExpiry: Date;
}

export async function createInvitedUserWithToken(
  tx: Prisma.TransactionClient,
  input: CreateInvitedUserInput,
) {
  const crypto = await import("crypto");
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = await bcrypt.hash(rawToken, 12);
  const inviteExpiry = new Date(Date.now() + INVITATION_TTL_MS);

  const user = await tx.user.create({
    data: {
      email: input.email,
      name: input.name,
      roles: input.roles as any[],
      tenantId: input.tenantId,
      status: "INVITED",
      invitedAt: new Date(),
      invitedBy: input.invitedBy,
      inviteTokenHash: tokenHash,
      inviteExpiry,
    },
  });

  return { user, rawToken, inviteExpiry };
}
