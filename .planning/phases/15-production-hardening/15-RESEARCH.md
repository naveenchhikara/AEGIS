# Phase 15: Production Hardening - Research

**Researched:** 2026-02-11
**Domain:** Production reliability, environment validation, structured logging, legacy code cleanup
**Confidence:** HIGH

## Summary

Phase 15 addresses four distinct tech debt items identified in the v2.0 milestone audit to improve production reliability and maintainability. The phase combines environment variable validation using @t3-oss/env-nextjs (Zod-based type-safe validation), structured logging with pino (high-performance JSON logging with request context), removal of legacy demo data dependencies (currentUser imports), and isolation of demo JSON files to seed-only usage.

The technical approaches are well-established with strong ecosystem support. @t3-oss/env-nextjs provides build-time validation preventing misconfiguration, pino offers production-grade logging with minimal overhead (5x faster than Winston), and the legacy cleanup tasks are straightforward replacements with Better Auth session patterns already proven in 256+ call sites.

**Primary recommendation:** Implement all four tasks sequentially — env validation first (catches misconfig early), then structured logging (enables debugging), then legacy cleanup (removes demo dependencies), then demo data isolation (prevents accidental runtime imports).

## Standard Stack

### Core

| Library            | Version  | Purpose                                  | Why Standard                                                                                |
| ------------------ | -------- | ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| @t3-oss/env-nextjs | 0.13.10+ | Environment variable validation with Zod | Official T3 stack package, enforces Next.js NEXT*PUBLIC* conventions, build-time validation |
| zod                | 3.x      | Schema validation                        | Required peer dependency, industry standard for TypeScript validation                       |
| pino               | 10.1.0+  | Structured JSON logging                  | Fastest Node.js logger (5x faster than Winston), minimal overhead, production-proven        |
| pino-http          | Latest   | HTTP request logging middleware          | Official pino package for request/response logging                                          |

### Supporting

| Library     | Version    | Purpose                    | When to Use                                                    |
| ----------- | ---------- | -------------------------- | -------------------------------------------------------------- |
| pino-pretty | Latest     | Development log formatting | Dev-only (don't use in production — defeats performance gains) |
| fast-redact | (via pino) | Sensitive data redaction   | Built into pino, use for PII/secrets redaction                 |

### Alternatives Considered

| Instead of         | Could Use              | Tradeoff                                                                                              |
| ------------------ | ---------------------- | ----------------------------------------------------------------------------------------------------- |
| @t3-oss/env-nextjs | dotenv-safe or envalid | T3 Env has Next.js-specific features (client/server split enforcement), better TypeScript integration |
| pino               | winston or bunyan      | Winston has plugins but 5x slower; bunyan is deprecated-ish; pino is fastest, most maintained         |
| pino               | console.log            | console.log works but no structure, no context, no redaction, hard to query in production             |

**Installation:**

```bash
pnpm add @t3-oss/env-nextjs zod pino pino-http
pnpm add -D pino-pretty  # dev-only
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── env.ts                      # Centralized env validation (imported by next.config.ts)
├── lib/
│   ├── logger.ts               # Pino logger singleton
│   └── auth/dal.ts             # Already uses getRequiredSession (replace currentUser)
├── data/
│   └── seed/                   # NEW: Move demo JSON here (seed-only)
│       ├── demo-bank-profile.json
│       ├── demo-staff.json
│       └── ... (7 files)
├── app/
│   └── api/                    # Use logger in API routes
prisma/
└── seed.ts                     # Import from @/data/seed (not @/data)
```

### Pattern 1: Environment Variable Validation (T3 Env)

**What:** Centralized Zod schema for all environment variables with build-time validation and type-safe access

**When to use:** Required for production apps to prevent misconfiguration (missing vars, wrong formats)

**Example:**

```typescript
// src/env.ts
// Source: https://env.t3.gg/docs/nextjs
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    // Database
    DATABASE_URL: z.string().url(),
    POSTGRES_USER: z.string().min(1),
    POSTGRES_PASSWORD: z.string().min(8),
    POSTGRES_DB: z.string().min(1),
    POSTGRES_PORT: z.coerce.number().int().positive(),

    // Auth
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url(),

    // AWS
    AWS_REGION: z.string().regex(/^ap-south-1$/), // RBI data localization
    AWS_ACCESS_KEY_ID: z.string().min(1),
    AWS_SECRET_ACCESS_KEY: z.string().min(1),
    S3_BUCKET_NAME: z.string().min(1),
    AWS_SES_REGION: z.string().regex(/^ap-south-1$/),
    SES_FROM_EMAIL: z.string().email(),

    // App
    NODE_ENV: z.enum(["development", "test", "production"]),
  },

  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },

  // CRITICAL: Must manually destructure for Next.js bundling
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    POSTGRES_USER: process.env.POSTGRES_USER,
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
    POSTGRES_DB: process.env.POSTGRES_DB,
    POSTGRES_PORT: process.env.POSTGRES_PORT,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    AWS_REGION: process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
    AWS_SES_REGION: process.env.AWS_SES_REGION,
    SES_FROM_EMAIL: process.env.SES_FROM_EMAIL,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  // Skip validation in build (Docker build won't have secrets)
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});

// Usage anywhere: import { env } from "@/env"
// env.DATABASE_URL — type-safe, validated
```

```typescript
// next.config.ts
// Source: https://env.t3.gg/docs/nextjs
import "./src/env"; // Validates at build time

const nextConfig: NextConfig = {
  // ...rest of config
};

export default nextConfig;
```

### Pattern 2: Pino Structured Logging with Request Context

**What:** Singleton logger with child loggers for request-scoped context, JSON output in production, pretty-print in dev

**When to use:** All server-side code (API routes, server actions, middleware)

**Example:**

```typescript
// src/lib/logger.ts
// Source: https://blog.arcjet.com/structured-logging-in-json-for-next-js/
// Source: https://signoz.io/guides/pino-logger/
import pino from "pino";

const isDev = process.env.NODE_ENV === "development";

export const logger = pino({
  level: isDev ? "debug" : "info",

  // Production: JSON output for log aggregation (Datadog, CloudWatch)
  // Development: Pretty-print with colors
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,

  // Base metadata for all logs
  base: {
    env: process.env.NODE_ENV,
    region: process.env.AWS_REGION,
  },

  // Format level as uppercase severity
  formatters: {
    level: (label) => ({ severity: label.toUpperCase() }),
  },

  // Redact sensitive fields (PII, secrets)
  redact: {
    paths: [
      "password",
      "*.password",
      "token",
      "*.token",
      "authorization",
      "*.authorization",
      "cookie",
      "*.cookie",
      "secret",
      "*.secret",
    ],
    censor: "[REDACTED]",
  },
});

// Usage: logger.info({ userId: 123 }, "user logged in")
// Output: {"severity":"INFO","time":"2026-02-11T10:30:00.000Z","env":"production","region":"ap-south-1","userId":123,"msg":"user logged in"}
```

```typescript
// src/app/api/some-route/route.ts
// Source: https://context7.com/pinojs/pino-http/llms.txt
import { logger } from "@/lib/logger";
import { getRequiredSession } from "@/lib/auth/dal";

export async function GET(request: Request) {
  const { session } = await getRequiredSession();

  // Create child logger with request context
  const log = logger.child({
    userId: session.userId,
    tenantId: session.user.tenantId,
    requestId: crypto.randomUUID(),
  });

  log.info("processing request");

  try {
    // Business logic
    log.debug({ data: someData }, "fetched data");
    return Response.json({ success: true });
  } catch (error) {
    log.error({ error }, "request failed");
    throw error;
  }
}
```

### Pattern 3: Replace Legacy currentUser with Session

**What:** Remove imports of `@/lib/current-user` (hardcoded demo CEO) and use Better Auth session

**When to use:** The 2 files still importing currentUser: `src/components/layout/top-bar.tsx`, `src/lib/current-user.ts`

**Example:**

```typescript
// BEFORE (legacy pattern from prototype phase):
import { currentUser } from "@/lib/current-user"; // Hardcoded demo CEO
<Avatar><AvatarFallback>{currentUser.initials}</AvatarFallback></Avatar>

// AFTER (use Better Auth session):
// Source: https://www.better-auth.com/docs/integrations/next
"use client";
import { authClient } from "@/lib/auth/client";

export function TopBar() {
  const { data: session } = authClient.useSession();

  if (!session) return null;

  const initials = session.user.name
    .split(" ")
    .map((n) => n[0])
    .join("");

  return (
    <Avatar>
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}
```

### Pattern 4: Isolate Demo Data to Seed-Only

**What:** Move `src/data/demo/*.json` to `src/data/seed/` and update seed script imports to prevent accidental runtime usage

**When to use:** Prevent demo JSON from being imported by app code (currently 12 files import from `@/data`)

**Example:**

```bash
# Move demo JSON to seed-specific directory
mkdir -p src/data/seed
mv src/data/demo/*.json src/data/seed/
```

```typescript
// prisma/seed.ts
// BEFORE:
import { bankProfile, staff, branches } from "@/data"; // Could import runtime

// AFTER:
import bankProfile from "../src/data/seed/demo-bank-profile.json";
import staff from "../src/data/seed/demo-staff.json";
import branches from "../src/data/seed/demo-branches.json";
// Explicit imports — won't be in app bundle
```

```typescript
// src/data/index.ts (remove barrel export)
// BEFORE:
export { default as bankProfile } from "./demo/bank-profile.json";
export { default as staff } from "./demo/staff.json";
// ...rest

// AFTER: (file deleted or emptied)
// App code can't import @/data anymore
```

### Anti-Patterns to Avoid

- **Don't use pino-pretty in production** — defeats performance gains, meant only for dev
- **Don't skip runtimeEnv destructuring** — T3 Env requires explicit mapping for Next.js bundling
- **Don't log sensitive data unredacted** — always configure redact paths for PII/secrets
- **Don't use console.log in production** — no structure, no context, can't query or aggregate
- **Don't import demo data at runtime** — causes bundle bloat, breaks multi-tenancy assumptions

## Don't Hand-Roll

| Problem                  | Don't Build               | Use Instead        | Why                                                                 |
| ------------------------ | ------------------------- | ------------------ | ------------------------------------------------------------------- |
| Env variable validation  | Custom dotenv checks      | @t3-oss/env-nextjs | Type safety, build-time validation, client/server split enforcement |
| Request context logging  | Manual context passing    | pino child loggers | Automatic context inheritance, no parameter drilling                |
| Sensitive data redaction | Custom string replacement | pino redact option | Handles nested paths, type-safe, performance-optimized              |
| Log aggregation format   | Custom JSON serialization | pino (built-in)    | Standardized format, serializers, error stack traces                |

**Key insight:** Production reliability tools have solved edge cases (async context, circular refs, performance, security) that custom solutions will hit later. Use proven libraries.

## Common Pitfalls

### Pitfall 1: Missing runtimeEnv Keys in T3 Env

**What goes wrong:** TypeScript error "Property 'X' is missing in type" when creating env object

**Why it happens:** T3 Env Next.js package requires explicit `runtimeEnv` destructuring due to how Next.js bundles env vars (only explicitly accessed vars are included)

**How to avoid:** Every key in `server` and `client` schemas MUST have a matching entry in `runtimeEnv` object

**Warning signs:**

- Build fails with "missing property" error
- New env var added to schema but not runtimeEnv

**Source:** [T3 Env Next.js Docs](https://env.t3.gg/docs/nextjs)

### Pitfall 2: Exposing Server Secrets to Client

**What goes wrong:** Sensitive keys (database passwords, API secrets) leak to browser bundle

**Why it happens:** Putting server-only vars in `client` schema or forgetting NEXT*PUBLIC* prefix for actual client vars

**How to avoid:**

- Server vars → `server` schema (NO prefix)
- Client vars → `client` schema (MUST have NEXT*PUBLIC* prefix)
- T3 Env throws runtime error if you access server var from client

**Warning signs:**

- "Invalid environment variable on client" error
- Build warnings about exposed secrets

**Source:** [T3 Env Core Docs](https://env.t3.gg/docs/core)

### Pitfall 3: Using pino-pretty in Production

**What goes wrong:** Performance degrades, logs lose structure, harder to query in log aggregation tools

**Why it happens:** pino-pretty is a dev tool that transforms JSON to colored text — defeats pino's speed and structured output

**How to avoid:**

- Only use pino-pretty in `transport` when `NODE_ENV === "development"`
- Production: no transport (raw JSON to stdout → Docker/CloudWatch captures)

**Warning signs:**

- Slow logging in production
- CloudWatch queries fail (expecting JSON, getting text)

**Source:** [Pino Production Guide - Dash0](https://www.dash0.com/guides/logging-in-node-js-with-pino)

### Pitfall 4: Hardcoding Request Context (No Child Loggers)

**What goes wrong:** Logs lack request-specific context (userId, tenantId, requestId), hard to trace requests

**Why it happens:** Using global logger directly instead of creating child loggers with request context

**How to avoid:**

- API routes: Create child logger with `logger.child({ userId, tenantId, requestId })`
- Use child logger for all logs in that request
- Context automatically included in every log line

**Warning signs:**

- Can't filter logs by user or tenant
- Can't trace a single request through system

**Source:** [Pino Child Loggers - Context7](https://context7.com/pinojs/pino/llms.txt)

### Pitfall 5: Forgetting to Redact Sensitive Fields

**What goes wrong:** Passwords, tokens, or PII appear in production logs, compliance/security violation

**Why it happens:** Default pino config doesn't redact, must explicitly configure `redact` option

**How to avoid:**

- Configure `redact.paths` with sensitive field patterns: `password`, `*.token`, `authorization`
- Use wildcard patterns (`*.secret`) to catch nested objects
- Test redaction in dev: log a mock object with sensitive fields

**Warning signs:**

- Security audit finds secrets in logs
- GDPR/compliance violation (PII in logs)

**Source:** [Pino Redaction Guide - Better Stack](https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/)

### Pitfall 6: AsyncLocalStorage in Next.js Middleware (Edge Runtime)

**What goes wrong:** AsyncLocalStorage doesn't work in Edge runtime (Next.js middleware default), logs lose request context

**Why it happens:** Edge runtime doesn't support Node.js async_hooks module (AsyncLocalStorage depends on it)

**How to avoid:**

- Use child loggers with explicit context passing (not AsyncLocalStorage)
- If middleware needs logging, generate requestId and pass via header to route handlers
- For advanced cases: use Node.js runtime for specific routes (`export const runtime = "nodejs"`)

**Warning signs:**

- "AsyncLocalStorage is not defined" error in middleware
- Request context missing in edge route logs

**Source:** [Next.js Pino Logging - Arcjet Blog](https://blog.arcjet.com/structured-logging-in-json-for-next-js/)

### Pitfall 7: Demo Data Accidentally Imported at Runtime

**What goes wrong:** Demo JSON files bundled in production app, increase bundle size, break multi-tenant assumptions

**Why it happens:** Barrel export (`@/data/index.ts`) makes demo data too easy to import, developers don't realize it's seed-only

**How to avoid:**

- Move demo JSON to `src/data/seed/` (separate directory)
- Remove barrel export for demo data
- Seed script uses explicit imports (`import from "../src/data/seed/demo-bank.json"`)
- Lint rule (optional): disallow imports from `@/data/seed` in app code

**Warning signs:**

- Build bundle includes JSON files
- `grep "from \"@/data\"" src/**/*.tsx` shows app code importing demo data

**Source:** AEGIS v2.0 milestone audit (tech debt item)

## Code Examples

Verified patterns from official sources:

### Environment Validation with Custom Transforms

```typescript
// src/env.ts
// Source: https://env.t3.gg/docs/nextjs
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    // Port with coercion (string → number)
    POSTGRES_PORT: z.coerce.number().int().positive(),

    // Enum validation
    NODE_ENV: z.enum(["development", "test", "production"]),

    // Custom transform (uppercase region)
    AWS_REGION: z.string().transform((val) => val.toLowerCase()),

    // Default value
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  },
  client: {
    // Client var MUST have NEXT_PUBLIC_ prefix
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  runtimeEnv: {
    POSTGRES_PORT: process.env.POSTGRES_PORT,
    NODE_ENV: process.env.NODE_ENV,
    AWS_REGION: process.env.AWS_REGION,
    LOG_LEVEL: process.env.LOG_LEVEL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  // Skip validation during Docker build (secrets not available)
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
```

### Pino HTTP Logging in API Routes (Custom Request Context)

```typescript
// src/app/api/observations/route.ts
// Source: https://context7.com/pinojs/pino-http/llms.txt
import { logger } from "@/lib/logger";
import { getRequiredSession } from "@/lib/auth/dal";

export async function POST(request: Request) {
  const { session } = await getRequiredSession();

  // Child logger with request-specific context
  const log = logger.child({
    userId: session.userId,
    tenantId: session.user.tenantId,
    requestId: request.headers.get("x-request-id") || crypto.randomUUID(),
    path: "/api/observations",
    method: "POST",
  });

  log.info("creating observation");

  try {
    const body = await request.json();
    log.debug({ body }, "parsed request body");

    // Business logic
    const observation = await createObservation(body);

    log.info({ observationId: observation.id }, "observation created");
    return Response.json(observation);
  } catch (error) {
    log.error({ error }, "failed to create observation");
    throw error;
  }
}
```

### Sensitive Data Redaction Configuration

```typescript
// src/lib/logger.ts
// Source: https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/
import pino from "pino";

export const logger = pino({
  level: "info",

  // Redact sensitive fields (supports wildcards and nested paths)
  redact: {
    paths: [
      // Auth fields
      "password",
      "*.password",
      "token",
      "*.token",
      "authorization",
      "req.headers.authorization",
      "cookie",
      "req.headers.cookie",

      // Secrets
      "secret",
      "*.secret",
      "apiKey",
      "*.apiKey",

      // PII (GDPR compliance)
      "email",
      "*.email",
      "phoneNumber",
      "*.phoneNumber",
      "ssn",
      "*.ssn",
    ],
    censor: "[REDACTED]",
  },
});

// Test redaction:
logger.info({
  user: {
    name: "John Doe",
    email: "john@example.com", // Will be redacted
    password: "secret123", // Will be redacted
  },
  message: "user logged in",
});
// Output: {"level":30,"user":{"name":"John Doe","email":"[REDACTED]","password":"[REDACTED]"},"message":"user logged in"}
```

### Replacing currentUser with Better Auth Session (Client Component)

```typescript
// src/components/layout/top-bar.tsx
// Source: https://www.better-auth.com/docs/integrations/next
"use client";

import { authClient } from "@/lib/auth/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function TopBar() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (!session?.user) {
    return null; // Or redirect to login
  }

  const initials = session.user.name
    .split(" ")
    .map((n) => n[0])
    .join("");

  return (
    <header className="flex items-center gap-4">
      <Avatar>
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div>
        <p className="font-medium">{session.user.name}</p>
        <p className="text-sm text-muted-foreground">{session.user.email}</p>
      </div>
    </header>
  );
}
```

### Demo Data Isolation (Seed Script Pattern)

```typescript
// prisma/seed.ts
// BEFORE (barrel export from @/data):
import { bankProfile, staff, branches } from "@/data"; // Runtime import risk

// AFTER (explicit seed-only imports):
import bankProfileData from "../src/data/seed/demo-bank-profile.json";
import staffData from "../src/data/seed/demo-staff.json";
import branchesData from "../src/data/seed/demo-branches.json";

async function seed() {
  // Type-cast if needed
  const bank = bankProfileData as BankProfile;
  const staff = staffData as StaffData;
  const branches = branchesData as BranchesData;

  // Seed logic...
}
```

## State of the Art

| Old Approach                    | Current Approach                    | When Changed        | Impact                                                       |
| ------------------------------- | ----------------------------------- | ------------------- | ------------------------------------------------------------ |
| dotenv with manual validation   | @t3-oss/env-nextjs with Zod         | 2023 (T3 Stack)     | Build-time validation, type safety, client/server separation |
| Winston logging                 | Pino                                | 2020+ (benchmarks)  | 5x performance, structured JSON, minimal overhead            |
| AsyncLocalStorage for context   | Child loggers with explicit context | 2024 (Next.js Edge) | Edge runtime compatibility, simpler mental model             |
| Demo data in @/data (prototype) | Demo data in @/data/seed (post-MVP) | v2.0 audit (2026)   | Prevents accidental runtime imports, clear separation        |
| Hardcoded currentUser           | Better Auth session                 | Phase 5 (2026)      | Real auth, multi-tenant, role-based                          |

**Deprecated/outdated:**

- **bunyan logger**: Deprecated/unmaintained, use pino instead
- **dotenv-safe**: T3 Env has better TypeScript integration and Next.js-specific features
- **Custom AsyncLocalStorage wrappers in Next.js**: Edge runtime doesn't support it, use explicit context passing

## Open Questions

1. **Should we use AsyncLocalStorage for request context?**
   - What we know: AsyncLocalStorage works in Node.js runtime, not Edge runtime
   - What's unclear: Do we need Edge runtime for any routes? (Middleware uses Edge by default)
   - Recommendation: Use child loggers with explicit context (simpler, works everywhere). If we later need AsyncLocalStorage for complex DAL patterns, revisit.

2. **Should we split env.ts into server-only and client-safe files?**
   - What we know: Single file ships validation schemas to client bundle
   - What's unclear: Are variable _names_ sensitive? (e.g., exposing that we use S3, SES)
   - Recommendation: Start with single file (easier). If security audit flags variable names as sensitive, split later.

3. **How many files currently import demo data at runtime?**
   - What we know: 12 files import from `@/data` (includes RBI regulations + demo data)
   - What's unclear: Which imports are demo data vs. RBI regulations (regulations are valid runtime data)
   - Recommendation: Audit `@/data/index.ts` barrel export, separate demo (seed-only) from regulations (runtime-valid).

## Sources

### Primary (HIGH confidence)

- [Context7: /pinojs/pino](https://context7.com/pinojs/pino/llms.txt) - Child loggers, configuration, serializers
- [Context7: /pinojs/pino-http](https://context7.com/pinojs/pino-http/llms.txt) - HTTP middleware, request logging
- [T3 Env Next.js Official Docs](https://env.t3.gg/docs/nextjs) - Setup, client/server separation, runtimeEnv
- [T3 Env GitHub README](https://github.com/t3-oss/t3-env) - Installation, version compatibility
- [Better Auth Next.js Docs](https://www.better-auth.com/docs/integrations/next) - useSession hook, session access patterns

### Secondary (MEDIUM confidence)

- [Arcjet: Structured Logging in Next.js](https://blog.arcjet.com/structured-logging-in-json-for-next-js/) - Pino in Next.js, middleware limitations
- [Dash0: Production-Grade Pino Logging](https://www.dash0.com/guides/logging-in-node-js-with-pino) - Production config, performance
- [Better Stack: Pino Guide](https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/) - Redaction, configuration
- [SigNoz: Pino Logger Guide 2026](https://signoz.io/guides/pino-logger/) - Performance benchmarks, best practices
- [Medium: T3 Env Why It's Best](https://www.mwskwong.com/blog/why-t3-env-is-my-go-to-for-managing-environment-variables) - Rationale, benefits
- [Medium: Validate Env Vars in Next.js](https://medium.com/@chandan.jal.code/validate-environment-variables-in-next-js-before-building-best-practice-guide-d8786d36bd5f) - Build-time validation patterns
- [Better Auth Migration Guide](https://www.better-auth.com/docs/guides/next-auth-migration-guide) - Replacing legacy session patterns

### Tertiary (LOW confidence)

- [Vercel: Package Import Optimization](https://vercel.com/blog/how-we-optimized-package-imports-in-next-js) - Tree-shaking, modularizeImports
- [LogRocket: Pino + AsyncLocalStorage](https://blog.logrocket.com/logging-with-pino-and-asynclocalstorage-in-node-js/) - Advanced context patterns (not used — Edge runtime incompatible)

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - T3 Env and Pino are industry standard, verified via Context7 + official docs
- Architecture: HIGH - Patterns verified from official sources, aligned with existing AEGIS DAL patterns
- Pitfalls: HIGH - Common mistakes documented in GitHub issues, official guides, production blogs

**Research date:** 2026-02-11
**Valid until:** ~30 days (stable domain — env validation and logging are mature, unlikely to change)
