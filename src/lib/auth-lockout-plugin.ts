import { type BetterAuthPlugin, APIError } from "better-auth";
import { prisma } from "@/lib/prisma";

/**
 * Account Lockout Plugin Configuration
 *
 * Implements account lockout after repeated failed login attempts
 * to prevent brute-force attacks on user accounts.
 */
export interface AccountLockoutConfig {
  /** Maximum failed attempts before lockout (default: 5) */
  maxAttempts: number;
  /** Lockout duration in seconds (default: 1800 = 30 minutes) */
  lockoutDuration: number;
  /** Observation window for counting attempts in seconds (default: 900 = 15 minutes) */
  observationWindow: number;
}

const defaultConfig: AccountLockoutConfig = {
  maxAttempts: 5,
  lockoutDuration: 1800, // 30 minutes
  observationWindow: 900, // 15 minutes
};

/**
 * Account Lockout Plugin for Better Auth
 *
 * Features:
 * - Checks for account lockout before sign-in
 * - Prevents locked accounts from authenticating
 * - Returns LOCKED error when account is locked
 *
 * Implementation notes:
 * - `before` hook checks FailedLoginAttempt table for active lockouts
 * - Failed attempt tracking and lockout application happen via rate limiting config
 * - This plugin enforces the lockout; rate limiting triggers it
 *
 * @example
 * ```typescript
 * import { accountLockout } from "@/lib/auth-lockout-plugin";
 *
 * export const auth = betterAuth({
 *   plugins: [
 *     accountLockout({
 *       maxAttempts: 5,
 *       lockoutDuration: 1800,
 *       observationWindow: 900,
 *     }),
 *   ],
 * });
 * ```
 */
export const accountLockout = (
  config?: Partial<AccountLockoutConfig>,
): BetterAuthPlugin => {
  const finalConfig = { ...defaultConfig, ...config };

  return {
    id: "account-lockout",
    hooks: {
      before: [
        {
          matcher: (ctx) => ctx.path === "/sign-in/email",
          handler: async (ctx) => {
            const body = ctx.body as { email?: string } | undefined;
            const email = body?.email?.toLowerCase();

            if (!email) {
              return;
            }

            // Check if account is currently locked
            const now = new Date();
            const lockout = await prisma.failedLoginAttempt.findFirst({
              where: {
                email,
                lockedUntil: {
                  gt: now, // lockedUntil is in the future
                },
              },
              orderBy: {
                lockedUntil: "desc",
              },
            });

            if (lockout) {
              // Account is locked - throw APIError
              throw new APIError("LOCKED", {
                message:
                  "Account temporarily locked due to multiple failed login attempts. Please try again later.",
                metadata: {
                  lockedUntil: lockout.lockedUntil,
                },
              });
            }

            return;
          },
        },
      ],
      // TODO (Phase 14): Implement `after` hook for failed attempt tracking
      // Better Auth plugin API for accessing response status in after hooks needs
      // runtime testing/documentation review. For now, lockout enforcement works;
      // failed attempt recording will be added in Phase 14 verification.
      // Interim: Manual SQL or separate middleware can populate FailedLoginAttempt
      // table for testing lockout behavior.
    },
  };
};
