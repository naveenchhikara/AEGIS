# Phase 11: Auth Security Hardening - Research

**Researched:** 2026-02-10
**Domain:** Authentication security hardening with Better Auth
**Confidence:** HIGH

## Summary

Phase 11 closes 4 HIGH-severity auth security gaps from Phase 5: rate limiting, account lockout, concurrent session limits, and explicit cookie configuration. Better Auth provides native support for 3 of 4 requirements (rate limiting, session management, cookie configuration) but requires a custom implementation for automatic account lockout based on failed login attempts.

The standard approach combines:

1. **Rate limiting** via Better Auth's built-in IP-based rate limiter with custom rules for auth endpoints
2. **Concurrent session limits** via Better Auth's multi-session plugin (default: 5 sessions, customizable)
3. **Cookie security** via Better Auth's advanced configuration (httpOnly, secure, sameSite)
4. **Account lockout** via custom database tracking + Better Auth hooks (no native plugin exists)

**Primary recommendation:** Use Better Auth's native features for rate limiting, session limits, and cookies. Implement account lockout as a custom plugin using Better Auth's `onRequest` hook + database table tracking failed attempts, following OWASP guidelines (5 attempts → 30-minute lockout).

## Standard Stack

### Core

| Library                | Version | Purpose                           | Why Standard                                                                                   |
| ---------------------- | ------- | --------------------------------- | ---------------------------------------------------------------------------------------------- |
| Better Auth            | v1.3.x  | Authentication framework          | Already integrated in Phase 5, supports all 3 native requirements                              |
| `@better-auth/plugins` | v1.3.x  | Multi-session plugin              | Official plugin for concurrent session management                                              |
| `@upstash/ratelimit`   | v2.x    | (Optional) Enhanced rate limiting | Industry standard for serverless rate limiting if Better Auth's native limiter is insufficient |
| `@upstash/redis`       | latest  | (Optional) Redis storage          | Required if using Upstash rate limiter                                                         |

### Supporting

| Library   | Version | Purpose                    | When to Use                                                              |
| --------- | ------- | -------------------------- | ------------------------------------------------------------------------ |
| Prisma    | 6.x     | Database access            | Already in use — extend schema for `FailedLoginAttempt` table            |
| `ioredis` | latest  | Redis client (alternative) | If using database storage for Better Auth rate limiter instead of memory |

### Alternatives Considered

| Instead of               | Could Use          | Tradeoff                                                                           |
| ------------------------ | ------------------ | ---------------------------------------------------------------------------------- |
| Better Auth rate limiter | Upstash Ratelimit  | More flexible (per-user, sliding window algorithms), requires Redis infrastructure |
| Custom account lockout   | Admin plugin ban   | Admin ban is manual, not automatic based on failed attempts                        |
| Database tracking        | In-memory tracking | Memory-based tracking lost on server restart, not suitable for production          |

**Installation:**

```bash
# Already installed in Phase 5
# No new core dependencies required

# Optional: if using Upstash for advanced rate limiting
pnpm add @upstash/ratelimit @upstash/redis
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── auth.ts                           # Better Auth config (update for Phase 11)
│   └── auth-security-plugin.ts           # Custom account lockout plugin
├── dal/
│   └── failed-login-attempts.ts          # DAL for tracking failed attempts
prisma/
└── schema.prisma                         # Add FailedLoginAttempt model
```

### Pattern 1: Rate Limiting Configuration

**What:** Better Auth's built-in rate limiting with custom rules for authentication endpoints

**When to use:** Always — protects against brute-force attacks at the IP level

**Example:**

```typescript
// Source: https://github.com/better-auth/better-auth/blob/canary/docs/content/docs/concepts/rate-limit.mdx
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  rateLimit: {
    enabled: true,
    window: 900, // 15 minutes (in seconds)
    max: 10, // 10 requests globally
    storage: "database", // Use database for multi-instance persistence
    customRules: {
      "/sign-in/email": {
        window: 900, // 15 minutes
        max: 10, // 10 login attempts per IP per 15 minutes
      },
      "/sign-up/email": {
        window: 60,
        max: 3,
      },
    },
  },
});
```

**Key insight:** Rate limiting is IP-based by default (checks `x-forwarded-for` header). This prevents distributed attacks but doesn't prevent targeted account attacks from multiple IPs. Account lockout complements this by tracking per-user failed attempts.

### Pattern 2: Concurrent Session Limits

**What:** Better Auth's multi-session plugin with configurable maximum sessions

**When to use:** Always — prevents credential sharing and limits attack surface

**Example:**

```typescript
// Source: https://github.com/better-auth/better-auth/blob/canary/docs/content/docs/plugins/multi-session.mdx
import { betterAuth } from "better-auth";
import { multiSession } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    multiSession({
      maximumSessions: 2, // Max 2 concurrent sessions per user
    }),
  ],
});
```

**Key insight:** Default limit is 5 sessions. For security-sensitive banking applications, reduce to 2 (desktop + mobile). Plugin automatically revokes oldest session when limit exceeded.

### Pattern 3: Explicit Cookie Configuration

**What:** Better Auth's advanced cookie configuration for secure cookie attributes

**When to use:** Always — required for OWASP compliance and XSS/CSRF protection

**Example:**

```typescript
// Source: https://github.com/better-auth/better-auth/blob/canary/docs/content/docs/reference/options.mdx
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  advanced: {
    useSecureCookies: true, // Force secure cookies (HTTPS only)
    defaultCookieAttributes: {
      httpOnly: true, // Prevent JavaScript access
      secure: true, // HTTPS only
      sameSite: "lax", // CSRF protection (default)
    },
    // Optional: customize specific cookie attributes
    cookies: {
      session_token: {
        attributes: {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
        },
      },
    },
  },
});
```

**Key insight:** Better Auth sets `httpOnly: true` and `sameSite: "lax"` by default. `secure: true` is automatic when baseURL uses HTTPS. Explicit configuration ensures these are enforced even in development.

### Pattern 4: Custom Account Lockout Plugin

**What:** Custom Better Auth plugin using `onRequest` hook + database table to track failed login attempts and lock accounts

**When to use:** Always — required for OWASP-compliant account lockout policy

**Example:**

```typescript
// Source: Custom pattern based on Better Auth plugin architecture
// https://github.com/better-auth/better-auth/blob/canary/docs/content/docs/concepts/plugins.mdx
import { BetterAuthPlugin, createAuthMiddleware } from "better-auth/plugins";
import { prismaForTenant } from "@/dal/base";

interface AccountLockoutConfig {
  maxAttempts: number; // Default: 5
  lockoutDuration: number; // Default: 1800 (30 minutes in seconds)
  observationWindow: number; // Default: 900 (15 minutes in seconds)
}

export const accountLockout = (
  config?: Partial<AccountLockoutConfig>,
): BetterAuthPlugin => {
  const settings = {
    maxAttempts: config?.maxAttempts ?? 5,
    lockoutDuration: config?.lockoutDuration ?? 1800,
    observationWindow: config?.observationWindow ?? 900,
  };

  return {
    id: "account-lockout",

    hooks: {
      // Before hook: check if account is locked before processing login
      before: [
        {
          matcher: (context) => {
            return context.path === "/sign-in/email";
          },
          handler: createAuthMiddleware(async (ctx) => {
            const email = ctx.body?.email;
            if (!email) return { context: ctx };

            const prisma = prismaForTenant(); // Server-only DAL

            // Check if account is currently locked
            const lockout = await prisma.failedLoginAttempt.findFirst({
              where: {
                email,
                lockedUntil: { gt: new Date() }, // Still locked
              },
            });

            if (lockout) {
              return ctx.json(
                {
                  error:
                    "Account temporarily locked due to multiple failed login attempts. Please try again later.",
                  lockedUntil: lockout.lockedUntil,
                },
                { status: 423 }, // 423 Locked
              );
            }

            return { context: ctx };
          }),
        },
      ],

      // After hook: track failed attempts and lock if threshold exceeded
      after: [
        {
          matcher: (context) => {
            return context.path === "/sign-in/email";
          },
          handler: createAuthMiddleware(async (ctx) => {
            const response = ctx.response;
            const email = ctx.body?.email;

            if (!email) return ctx;

            const prisma = prismaForTenant();
            const now = new Date();
            const windowStart = new Date(
              now.getTime() - settings.observationWindow * 1000,
            );

            // If login failed (401 or 403)
            if (response?.status === 401 || response?.status === 403) {
              // Record failed attempt
              await prisma.failedLoginAttempt.create({
                data: {
                  email,
                  ipAddress: ctx.headers.get("x-forwarded-for") || "unknown",
                  attemptedAt: now,
                },
              });

              // Count recent failures in observation window
              const recentFailures = await prisma.failedLoginAttempt.count({
                where: {
                  email,
                  attemptedAt: { gte: windowStart },
                  lockedUntil: null, // Don't count attempts during previous lockouts
                },
              });

              // Lock account if threshold exceeded
              if (recentFailures >= settings.maxAttempts) {
                const lockUntil = new Date(
                  now.getTime() + settings.lockoutDuration * 1000,
                );

                await prisma.failedLoginAttempt.updateMany({
                  where: {
                    email,
                    attemptedAt: { gte: windowStart },
                  },
                  data: {
                    lockedUntil: lockUntil,
                  },
                });

                // Log lockout event
                await prisma.auditLog.create({
                  data: {
                    tenantId: "SYSTEM", // System-level event
                    tableName: "User",
                    recordId: email,
                    operation: "LOCKOUT",
                    actionType: "account.locked",
                    oldData: { recentFailures },
                    newData: { lockedUntil: lockUntil },
                    ipAddress: ctx.headers.get("x-forwarded-for") || "unknown",
                  },
                });
              }
            }

            // If login succeeded, clear failed attempts
            if (response?.status === 200) {
              await prisma.failedLoginAttempt.deleteMany({
                where: {
                  email,
                  attemptedAt: { gte: windowStart },
                },
              });
            }

            return ctx;
          }),
        },
      ],
    },

    // Schema for database migration
    schema: {
      failedLoginAttempt: {
        fields: {
          id: { type: "string", required: true },
          email: { type: "string", required: true },
          ipAddress: { type: "string", required: true },
          attemptedAt: { type: "date", required: true },
          lockedUntil: { type: "date", required: false },
        },
      },
    },
  };
};
```

**Key insight:** Account lockout is NOT a built-in Better Auth feature. Custom implementation required. Use `before` hook to check lockout status, `after` hook to track failures. Store in database (not memory) for multi-instance deployments.

### Pattern 5: Prisma Schema for Failed Login Tracking

**What:** Database table to track failed login attempts and lockout status

**When to use:** Required for custom account lockout implementation

**Example:**

```prisma
// AEGIS schema.prisma extension
model FailedLoginAttempt {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email       String   // Track by email (pre-authentication, no userId yet)
  ipAddress   String
  attemptedAt DateTime @default(now())
  lockedUntil DateTime? // NULL = not locked, otherwise locked until this timestamp

  @@index([email, attemptedAt])
  @@index([email, lockedUntil])
}
```

**Key insight:** Track by `email` not `userId` (user might not exist yet). Index on `[email, attemptedAt]` for counting recent failures, `[email, lockedUntil]` for checking lockout status. Use soft delete pattern (don't delete old records) for audit trail.

### Anti-Patterns to Avoid

- **Memory-based tracking:** Lost on server restart, won't work in multi-instance deployments
- **IP-based lockout:** Attacker can bypass by rotating IPs, doesn't protect specific accounts
- **Fixed lockout without auto-unlock:** Users can't recover without admin intervention
- **Locking by userId:** Fails for non-existent users, creates enumeration vulnerability
- **No audit logging:** Lockout events should be logged for security monitoring

## Don't Hand-Roll

| Problem                   | Don't Build                             | Use Instead                       | Why                                                                                        |
| ------------------------- | --------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------ |
| IP-based rate limiting    | Custom token bucket implementation      | Better Auth `rateLimit` config    | Handles distributed denial of service, respects X-Forwarded-For, integrates with auth flow |
| Session concurrency       | Manual session counting in middleware   | Better Auth `multiSession` plugin | Automatic oldest-session eviction, cookie management, revocation on sign-out               |
| Cookie security           | Manual cookie setting with `Set-Cookie` | Better Auth `advanced.cookies`    | CSRF protection, secure defaults, cross-subdomain support                                  |
| Distributed rate limiting | Custom Redis rate limiter               | `@upstash/ratelimit` (if needed)  | Production-ready sliding window, handles race conditions, analytics integration            |

**Key insight:** Don't implement rate limiting from scratch — edge cases (clock skew, race conditions, Redis pipelining) are subtle. Better Auth's rate limiter is production-tested. Only reach for Upstash if you need per-user (not IP) rate limiting or advanced algorithms.

## Common Pitfalls

### Pitfall 1: Rate Limiting in Development Mode

**What goes wrong:** Better Auth disables rate limiting in development by default. Developers forget to test with `rateLimit.enabled: true` and ship untested code.

**Why it happens:** Better Auth checks `NODE_ENV` and disables rate limiting to improve dev experience. Rate limiting config is ignored unless explicitly enabled.

**How to avoid:**

- Set `rateLimit.enabled: true` explicitly in auth config (overrides NODE_ENV check)
- Test rate limiting in staging environment that mirrors production
- Use separate `.env.test` with rate limiting enabled for E2E tests

**Warning signs:** Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`) missing in dev environment responses.

### Pitfall 2: Single-Instance Rate Limit Storage

**What goes wrong:** Using `storage: "memory"` for rate limiting works locally but fails in production with multiple instances. One instance doesn't know about requests handled by another instance.

**Why it happens:** Default `storage: "memory"` stores rate limit counters in process memory. Each Next.js instance maintains separate counters.

**How to avoid:**

- Use `storage: "database"` for Better Auth rate limiter in production
- Alternatively, use Redis-backed rate limiter (`@upstash/ratelimit`) for shared state
- Document storage mode in config comments

**Warning signs:** Users report inconsistent rate limiting behavior, some requests get through despite exceeding limit.

### Pitfall 3: Account Lockout Denial of Service

**What goes wrong:** Attacker intentionally locks out legitimate user accounts by making failed login attempts with known emails.

**Why it happens:** Account lockout based solely on email creates DoS vector — attacker doesn't need password to disrupt access.

**How to avoid:**

- OWASP recommendation: Allow password reset to proceed even when account is locked
- Consider CAPTCHA after 2-3 failed attempts (before full lockout)
- Implement exponential backoff instead of fixed lockout: 1s → 2s → 4s → 8s → 30min
- Log lockout events for security monitoring (detect patterns)

**Warning signs:** Support tickets about "account locked but I didn't try to login", lockout events clustered by time/IP suggest attack.

### Pitfall 4: Cookie Security in Development

**What goes wrong:** `secure: true` cookies don't work in development (http://localhost), developers disable `useSecureCookies` globally and forget to re-enable for production.

**Why it happens:** Browsers reject `secure: true` cookies over HTTP. Better Auth auto-detects HTTPS from baseURL but developers override this for local testing.

**How to avoid:**

- Better Auth defaults to `secure: true` when `baseURL` starts with `https://` — don't override
- Use `https://localhost:3000` in development with self-signed cert (or accept HTTP for dev only)
- Environment-based config: `useSecureCookies: process.env.NODE_ENV === "production"`
- Explicitly document security settings in config comments

**Warning signs:** Production cookies visible in browser DevTools JavaScript console, cookies sent over HTTP in production.

### Pitfall 5: Concurrent Session Limit vs. Multi-Device UX

**What goes wrong:** Setting `maximumSessions: 1` for security causes frustration when users legitimately use multiple devices (phone + laptop).

**Why it happens:** Overzealous security config without UX consideration. Users don't understand why their phone logs out when they log in on desktop.

**How to avoid:**

- For banking apps, 2 sessions is reasonable balance (primary + mobile)
- Show "You've been logged out from another device" message when session revoked
- Consider "trusted devices" flow for higher limits on verified devices
- Provide session management UI ("Active sessions" page) so users can manually revoke

**Warning signs:** Support tickets about "keeps logging me out", users report needing to log in repeatedly across devices.

## Code Examples

Verified patterns from official sources:

### Rate Limiting with Custom Rules

```typescript
// Source: https://github.com/better-auth/better-auth/blob/canary/docs/content/docs/concepts/rate-limit.mdx
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  rateLimit: {
    enabled: true,
    window: 900, // 15 minutes
    max: 10, // 10 requests per IP per window
    storage: "database",
    customRules: {
      "/sign-in/email": {
        window: 900, // 15 minutes
        max: 10, // 10 login attempts per IP
      },
      "/sign-up/email": {
        window: 60,
        max: 3,
      },
    },
  },
});
```

### Multi-Session Plugin Configuration

```typescript
// Source: https://github.com/better-auth/better-auth/blob/canary/docs/content/docs/plugins/multi-session.mdx
import { betterAuth } from "better-auth";
import { multiSession } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    multiSession({
      maximumSessions: 2, // Max 2 concurrent sessions
    }),
  ],
});
```

### Explicit Cookie Configuration

```typescript
// Source: https://github.com/better-auth/better-auth/blob/canary/docs/content/docs/reference/options.mdx
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  advanced: {
    useSecureCookies: true,
    disableCSRFCheck: false, // Keep CSRF protection enabled
    disableOriginCheck: false, // Keep origin validation enabled
    defaultCookieAttributes: {
      httpOnly: true,
      secure: true,
      sameSite: "lax", // "lax" is Better Auth default
    },
  },
});
```

### Client-Side Rate Limit Error Handling

```typescript
// Source: https://github.com/better-auth/better-auth/blob/canary/docs/content/docs/concepts/rate-limit.mdx
import { authClient } from "./auth-client";

await authClient.signIn.email({
  email: "user@example.com",
  password: "password123",
  fetchOptions: {
    onError: async (context) => {
      const { response } = context;
      if (response.status === 429) {
        const retryAfter = response.headers.get("X-Retry-After");
        console.log(`Rate limit exceeded. Retry after ${retryAfter} seconds`);
        // Show user-friendly error message
      }
    },
  },
});
```

## State of the Art

| Old Approach                     | Current Approach        | When Changed      | Impact                                                                 |
| -------------------------------- | ----------------------- | ----------------- | ---------------------------------------------------------------------- |
| NextAuth.js (Auth.js v5)         | Better Auth             | 2024-2025         | Better Next.js App Router support, simpler config, native TypeScript   |
| Fixed lockout (30 min hard lock) | Exponential backoff     | OWASP 2023 update | Better UX, still secure (1s → 2s → 4s → 8s → 30min)                    |
| Global rate limiting             | Endpoint-specific rules | Better Auth v1.2+ | Stricter limits on auth endpoints, looser on public routes             |
| IP-only rate limiting            | IP + User-based hybrid  | 2025 pattern      | Prevents both distributed attacks (IP) and targeted attacks (per-user) |
| Manual session tracking          | Multi-session plugin    | Better Auth v1.3+ | Automatic session limit enforcement, no custom code                    |

**Deprecated/outdated:**

- **NextAuth.js**: Better Auth has better Next.js 16 support and simpler plugin architecture
- **Manual cookie setting**: Better Auth handles secure cookie defaults automatically
- **In-memory rate limiting**: Not suitable for multi-instance production deployments

## Open Questions

1. **Should rate limiting use Redis instead of database?**
   - What we know: Better Auth supports database storage, Upstash Ratelimit uses Redis
   - What's unclear: Performance impact of database writes for every rate-limited request vs. Redis overhead
   - Recommendation: Start with Better Auth's `storage: "database"`. Profile under load. Switch to Redis only if database becomes bottleneck.

2. **Should account lockout use exponential backoff instead of fixed 30-minute lockout?**
   - What we know: OWASP 2023 recommends exponential backoff for better UX
   - What's unclear: Implementation complexity with current Better Auth hook architecture
   - Recommendation: Implement fixed 30-minute lockout for Phase 11 (closes tech debt). Consider exponential backoff as future enhancement if user feedback indicates frustration.

3. **Should failed login attempts be stored indefinitely for audit purposes?**
   - What we know: AEGIS has 10-year retention policy for audit logs
   - What's unclear: Whether failed login attempts fall under PMLA retention requirements
   - Recommendation: Store failed attempts for 90 days (sufficient for security investigation). Link lockout events to `AuditLog` table for long-term retention of lockout decisions (not individual attempts).

## Sources

### Primary (HIGH confidence)

- [Better Auth Rate Limiting](https://www.better-auth.com/docs/concepts/rate-limit) - Rate limit configuration and customization
- [Better Auth Multi-Session Plugin](https://www.better-auth.com/docs/plugins/multi-session) - Concurrent session management
- [Better Auth Security Reference](https://www.better-auth.com/docs/reference/security) - Cookie security, CSRF protection
- [Better Auth Options Reference](https://www.better-auth.com/docs/reference/options) - Advanced configuration options
- [Better Auth Plugins](https://www.better-auth.com/docs/concepts/plugins) - Plugin architecture and hooks
- Context7: `/better-auth/better-auth` - Code examples verified against official docs
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) - Account lockout best practices
- [OWASP Blocking Brute Force Attacks](https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks) - Rate limiting strategies

### Secondary (MEDIUM confidence)

- [Upstash Ratelimit Documentation](https://upstash.com/blog/nextjs-ratelimiting) - Alternative rate limiting approach
- [Better Auth GitHub Issues](https://github.com/better-auth/better-auth/issues) - Community patterns and known issues
- [Rate Limiting Next.js Apps (2024)](https://dev.to/ethanleetech/4-best-rate-limiting-solutions-for-nextjs-apps-2024-3ljj) - Ecosystem comparison

### Tertiary (LOW confidence)

- Web search results on Prisma schema patterns - General database design, not specific to auth
- General PostgreSQL account lockout patterns - Need adaptation for Better Auth

## Metadata

**Confidence breakdown:**

- Rate limiting: HIGH - Better Auth official docs + Context7 verified examples
- Session limits: HIGH - Official multi-session plugin documented and stable
- Cookie security: HIGH - Better Auth defaults align with OWASP recommendations
- Account lockout: MEDIUM - No official plugin, custom implementation pattern based on plugin architecture examples

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days — Better Auth is stable, auth standards change slowly)
