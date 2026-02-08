import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

/**
 * Better Auth server configuration
 *
 * Features:
 * - Email/password authentication
 * - Prisma adapter for database sessions
 * - Session management with idle timeout (30min)
 */
export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || "dev-secret-change-in-production",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",

  // Prisma adapter
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Email/password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
});

/**
 * Better Auth TypeScript types for type inference
 */
export type Session = typeof auth.$Infer.Session;
