import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { multiSession } from "better-auth/plugins";
import { prisma } from "./prisma";
import { randomUUID } from "crypto";
import { accountLockout } from "./auth-lockout-plugin";

/**
 * Better Auth server configuration
 *
 * Features:
 * - Email/password authentication
 * - Prisma adapter for database sessions
 * - Session management with idle timeout (30min)
 * - Rate limiting (Phase 11 SC-1): 10 login attempts per IP per 15 minutes
 * - Account lockout (Phase 11 SC-2): 5 failures → 30-minute lock
 * - Concurrent session limit (Phase 11 SC-3): max 2 sessions per user
 * - Cookie security (Phase 11 SC-4): httpOnly, secure, sameSite=lax
 */
export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || "dev-secret-change-in-production",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://aegis.nexlyadvisory.com",
  ].filter(Boolean),

  // Prisma adapter
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Email/password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  // Expose custom User columns in session so DAL functions can read tenantId/roles
  user: {
    additionalFields: {
      tenantId: {
        type: "string",
        required: false,
        input: false,
      },
      roles: {
        type: "string[]",
        required: false,
        input: false,
      },
    },
  },

  // Rate limiting (Phase 11 SC-1)
  rateLimit: {
    enabled: true,
    window: 900, // 15 minutes in seconds
    max: 100, // Global: 100 requests per 15 min per IP (generous for general use)
    storage: "memory", // In-memory rate limiting (no rateLimit table needed)
    customRules: {
      "/sign-in/email": {
        window: 900, // 15 minutes
        max: 10, // 10 login attempts per IP per 15 minutes (Phase 11 SC-1)
      },
      "/sign-up/email": {
        window: 60, // 1 minute
        max: 3, // 3 signup attempts per IP per minute
      },
    },
  },

  // Security plugins (Phase 11 SC-2, SC-3)
  plugins: [
    multiSession({
      maximumSessions: 2, // Max 2 concurrent sessions per user (Phase 11 SC-3)
    }),
    accountLockout({
      maxAttempts: 5, // 5 failed attempts triggers lockout (Phase 11 SC-2)
      lockoutDuration: 1800, // 30 minutes in seconds (Phase 11 SC-2)
      observationWindow: 900, // 15 minute window for counting attempts
    }),
  ],

  // Generate UUID-compatible IDs for PostgreSQL UUID columns + cookie security
  advanced: {
    database: {
      generateId: () => randomUUID(),
    },
    // Explicit cookie security (Phase 11 SC-4)
    // Only use secure cookies when serving over HTTPS (detected from BETTER_AUTH_URL)
    useSecureCookies: (process.env.BETTER_AUTH_URL || "").startsWith(
      "https://",
    ),
    defaultCookieAttributes: {
      httpOnly: true, // Prevent JavaScript access to session cookies
      secure: (process.env.BETTER_AUTH_URL || "").startsWith("https://"), // HTTPS only when URL is https
      sameSite: "lax" as const, // CSRF protection while allowing top-level navigations
    },
  },
});

/**
 * Better Auth TypeScript types for type inference
 */
export type Session = typeof auth.$Infer.Session;
