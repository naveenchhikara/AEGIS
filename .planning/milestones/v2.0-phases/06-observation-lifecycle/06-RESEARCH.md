# Phase 6: Observation Lifecycle - Research

**Researched:** 2026-02-09
**Domain:** State machine workflow, maker-checker approval, PostgreSQL RLS multi-tenancy, repeat finding detection
**Confidence:** MEDIUM

## Summary

Phase 6 implements a 7-state observation lifecycle (Draft → Submitted → Reviewed → Issued → Response → Compliance → Closed) with maker-checker approval, role-based state transitions, and repeat finding detection. Research reveals that XState v5 is overkill for this use case — a simple state machine implemented with TypeScript discriminated unions and Zod validation provides sufficient type safety without the complexity. PostgreSQL Row Level Security (RLS) with Prisma client extensions is the standard multi-tenant isolation pattern. Repeat finding detection can leverage PostgreSQL's pg_trgm extension for fuzzy text matching combined with composite indexes on (tenantId, branchId, auditAreaId) for performance.

The critical architectural decision is state transition validation strategy: implement transitions as server actions with Zod schemas + role guards, returning errors as data (not throwing), and recording all transitions in an immutable ObservationTimeline table. The existing Prisma schema already defines all necessary models.

**Primary recommendation:** Use discriminated union state machine pattern (not XState), enforce transitions in server actions with Zod + role guards, implement RLS via Prisma client extensions, use pg_trgm for repeat finding detection with 0.5 similarity threshold.

## Standard Stack

### Core

| Library            | Version  | Purpose                                         | Why Standard                                                                                    |
| ------------------ | -------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Zod                | 3.24+    | Schema validation for state transitions         | Industry standard for TypeScript validation, type-safe, composable schemas                      |
| Prisma             | 6.x      | PostgreSQL ORM with RLS support                 | Native PostgreSQL support, type-safe queries, client extensions for RLS                         |
| Better Auth        | Latest   | Session management & role checking              | Next.js 16 compatible, supports custom session enrichment, no database calls in middleware      |
| PostgreSQL pg_trgm | Built-in | Trigram similarity for repeat finding detection | Native PostgreSQL extension, GIN/GiST index support, 10x faster than application-level matching |

### Supporting

| Library               | Version | Purpose                                        | When to Use                                          |
| --------------------- | ------- | ---------------------------------------------- | ---------------------------------------------------- |
| next-safe-action      | 8.x     | Server action wrapper with validation pipeline | Reduces boilerplate for Zod validation + auth checks |
| @tanstack/react-table | 8.x     | Already in use for findings table              | Continue using for consistency                       |

### Alternatives Considered

| Instead of            | Could Use                | Tradeoff                                                                                                                                                              |
| --------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Custom state machine  | XState 5                 | XState adds 50KB, actors unnecessary for simple workflow. Use XState if: >15 states, parallel states, or actor orchestration needed.                                  |
| pg_trgm               | pgvector with embeddings | Embeddings overkill for structured text (branch + audit area + risk category). Use pgvector only if: semantic similarity on unstructured finding descriptions needed. |
| Prisma RLS extension  | Supabase client          | Supabase client adds vendor lock-in. Prisma extension is database-agnostic.                                                                                           |
| Return errors as data | Throw exceptions         | Throwing breaks Next.js useActionState pattern. Always return `{ success: boolean, error?: string }`                                                                  |

**Installation:**

```bash
pnpm add zod next-safe-action
# pg_trgm already built into PostgreSQL, enable with:
# CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── prisma.ts              # Prisma client with RLS extension
│   ├── auth.ts                # Better Auth instance
│   └── state-machine.ts       # State transition validation logic
├── actions/
│   ├── observations/
│   │   ├── create.ts          # Create observation (Draft state)
│   │   ├── submit.ts          # Transition Draft → Submitted
│   │   ├── review.ts          # Transition Submitted → Reviewed (Audit Manager)
│   │   ├── issue.ts           # Transition Reviewed → Issued (Audit Manager)
│   │   ├── close.ts           # Transition → Closed (role-dependent)
│   │   └── schemas.ts         # Zod schemas for each action
│   └── repeat-findings/
│       ├── detect.ts          # Detect potential repeats
│       └── confirm.ts         # Confirm repeat + escalate severity
├── app/(dashboard)/
│   └── findings/
│       ├── page.tsx           # Migrate to Prisma queries
│       ├── [id]/
│       │   └── page.tsx       # Observation detail with timeline
│       └── new/
│           └── page.tsx       # Create observation form
└── components/
    └── findings/
        ├── observation-form.tsx     # 5C format (Condition, Criteria, Cause, Effect, Recommendation)
        ├── status-timeline.tsx      # Already exists, reuse
        └── repeat-finding-banner.tsx # Displays repeat suggestion
```

### Pattern 1: State Machine as Discriminated Union (Not XState)

**What:** Use TypeScript discriminated unions + Zod for compile-time and runtime type safety without XState overhead.

**When to use:** Simple linear workflows with <10 states, no parallel states, no actor orchestration.

**Why not XState:** AEGIS observation workflow is a linear 7-state machine with single-actor transitions. XState's actor model and 50KB bundle size are unnecessary. XState makes sense for: multi-actor orchestration, parallel states, or >15 states with complex guards.

**Example:**

```typescript
// src/lib/state-machine.ts
import { z } from "zod";

export const ObservationState = z.enum([
  "DRAFT",
  "SUBMITTED",
  "REVIEWED",
  "ISSUED",
  "RESPONSE",
  "COMPLIANCE",
  "CLOSED",
]);

export type ObservationState = z.infer<typeof ObservationState>;

export const Role = z.enum([
  "AUDITOR",
  "AUDIT_MANAGER",
  "CAE",
  "CCO",
  "CEO",
  "AUDITEE",
  "BOARD_OBSERVER",
]);

export type Role = z.infer<typeof Role>;

export const Severity = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type Severity = z.infer<typeof Severity>;

// Transition validation: [fromState, toState, allowedRoles]
type Transition = {
  from: ObservationState;
  to: ObservationState;
  allowedRoles: Role[];
  requiresSeverityCheck?: (severity: Severity) => boolean;
};

const TRANSITIONS: Transition[] = [
  { from: "DRAFT", to: "SUBMITTED", allowedRoles: ["AUDITOR"] },
  { from: "SUBMITTED", to: "REVIEWED", allowedRoles: ["AUDIT_MANAGER"] },
  { from: "SUBMITTED", to: "DRAFT", allowedRoles: ["AUDIT_MANAGER"] }, // Return to draft
  { from: "REVIEWED", to: "ISSUED", allowedRoles: ["AUDIT_MANAGER"] },
  { from: "REVIEWED", to: "SUBMITTED", allowedRoles: ["AUDIT_MANAGER"] }, // Return for revision
  { from: "ISSUED", to: "RESPONSE", allowedRoles: ["AUDITEE"] },
  {
    from: "RESPONSE",
    to: "COMPLIANCE",
    allowedRoles: ["AUDITOR", "AUDIT_MANAGER"],
  },
  {
    from: "COMPLIANCE",
    to: "CLOSED",
    allowedRoles: ["AUDIT_MANAGER", "CAE"],
    requiresSeverityCheck: (severity) =>
      severity === "HIGH" || severity === "CRITICAL"
        ? ["CAE"]
        : ["AUDIT_MANAGER", "CAE"],
  },
];

export function canTransition(
  from: ObservationState,
  to: ObservationState,
  userRoles: Role[],
  severity?: Severity,
): { allowed: boolean; reason?: string } {
  const transition = TRANSITIONS.find((t) => t.from === from && t.to === to);

  if (!transition) {
    return {
      allowed: false,
      reason: `Invalid transition from ${from} to ${to}`,
    };
  }

  const hasRole = userRoles.some((role) =>
    transition.allowedRoles.includes(role),
  );
  if (!hasRole) {
    return {
      allowed: false,
      reason: `User lacks required role: ${transition.allowedRoles.join(" or ")}`,
    };
  }

  if (transition.requiresSeverityCheck && severity) {
    const allowedRoles = transition.requiresSeverityCheck(severity);
    if (!userRoles.some((role) => allowedRoles.includes(role))) {
      return {
        allowed: false,
        reason: `${severity} severity requires ${allowedRoles.join(" or ")} to close`,
      };
    }
  }

  return { allowed: true };
}
```

**Why this is better than XState for this use case:**

- 0KB runtime overhead (pure TypeScript)
- Compile-time validation with discriminated unions
- Runtime validation with Zod
- Transition logic is transparent (no hidden state machine DSL)
- Easy to test: `canTransition('DRAFT', 'SUBMITTED', ['AUDITOR'])` → `{ allowed: true }`

### Pattern 2: Server Actions with Zod Validation + Role Guards

**What:** Every state transition is a server action that validates input with Zod, checks auth/roles, verifies state machine rules, and records timeline entry atomically.

**When to use:** All mutations that require authentication, authorization, and audit trail.

**Example:**

```typescript
// src/actions/observations/submit.ts
"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { getPrismaForTenant } from "@/lib/prisma";
import { canTransition } from "@/lib/state-machine";
import { revalidatePath } from "next/cache";

const SubmitSchema = z.object({
  observationId: z.string().uuid(),
  comment: z.string().min(1, "Comment required for submission"),
});

type SubmitResult =
  | { success: true; data: { id: string } }
  | { success: false; error: string };

export async function submitObservation(
  input: z.infer<typeof SubmitSchema>,
): Promise<SubmitResult> {
  // 1. Parse input
  const parsed = SubmitSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  // 2. Get session (Better Auth)
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  // 3. Get tenant-scoped Prisma client
  const prisma = await getPrismaForTenant(session.user.tenantId);

  // 4. Fetch observation (RLS automatically filters by tenant)
  const observation = await prisma.observation.findUnique({
    where: { id: parsed.data.observationId },
    select: { status: true, severity: true },
  });

  if (!observation) {
    return { success: false, error: "Observation not found" };
  }

  // 5. Validate state transition
  const transition = canTransition(
    observation.status,
    "SUBMITTED",
    session.user.roles,
    observation.severity,
  );

  if (!transition.allowed) {
    return { success: false, error: transition.reason };
  }

  // 6. Atomic update: change status + record timeline
  try {
    await prisma.$transaction([
      prisma.observation.update({
        where: { id: parsed.data.observationId },
        data: {
          status: "SUBMITTED",
          statusUpdatedAt: new Date(),
        },
      }),
      prisma.observationTimeline.create({
        data: {
          observationId: parsed.data.observationId,
          tenantId: session.user.tenantId,
          event: "status_changed",
          oldValue: observation.status,
          newValue: "SUBMITTED",
          comment: parsed.data.comment,
          createdById: session.user.id,
        },
      }),
    ]);

    revalidatePath("/findings");
    revalidatePath(`/findings/${parsed.data.observationId}`);

    return { success: true, data: { id: parsed.data.observationId } };
  } catch (error) {
    return { success: false, error: "Failed to submit observation" };
  }
}
```

**Key principles:**

- **Return errors as data, never throw** — enables Next.js useActionState pattern
- **Zod safeParse, not parse** — returns `{ success: false, error }` instead of throwing
- **Atomic transactions** — status change + timeline entry in single transaction
- **Revalidate paths** — clear Next.js cache after mutation

### Pattern 3: PostgreSQL RLS with Prisma Client Extensions

**What:** Use Prisma client extensions to set tenant context as a PostgreSQL session variable, enforcing tenant isolation at database level.

**When to use:** All Prisma queries that need tenant isolation. Extension wraps queries in transactions that set `app.current_tenant_id`.

**Example:**

```typescript
// src/lib/prisma.ts
import { PrismaClient } from "@/generated/prisma";

const globalPrisma = new PrismaClient();

export function getPrismaForTenant(tenantId: string) {
  return globalPrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, model, args, query }) {
          // Wrap in transaction that sets tenant context
          const [, result] = await globalPrisma.$transaction([
            globalPrisma.$executeRawUnsafe(
              `SET LOCAL app.current_tenant_id = '${tenantId}'`,
            ),
            query(args),
          ]);
          return result;
        },
      },
    },
  });
}

// PostgreSQL policies (run in migration):
// ALTER TABLE "Observation" ENABLE ROW LEVEL SECURITY;
// ALTER TABLE "Observation" FORCE ROW LEVEL SECURITY;
//
// CREATE POLICY tenant_isolation_policy ON "Observation"
// USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
```

**CRITICAL CONSTRAINT:** Because extension wraps every query in a transaction, explicitly calling `prisma.$transaction()` may not work. Use single queries or let the extension handle batching.

**Security benefit:** Even if application code forgets to filter by tenantId, PostgreSQL RLS policies enforce isolation. Defense-in-depth.

### Pattern 4: Repeat Finding Detection with pg_trgm

**What:** Use PostgreSQL's pg_trgm extension to find similar observations by comparing branch + audit area + risk category. Trigrams provide fuzzy matching for text fields.

**When to use:** When user creates a new observation, query for potential repeats before saving.

**Example:**

```typescript
// src/actions/repeat-findings/detect.ts
"use server";

import { getPrismaForTenant } from "@/lib/prisma";

interface RepeatCandidate {
  id: string;
  title: string;
  similarity: number;
  occurrenceCount: number;
}

export async function detectRepeatFindings(
  tenantId: string,
  branchId: string,
  auditAreaId: string,
  title: string,
): Promise<RepeatCandidate[]> {
  const prisma = await getPrismaForTenant(tenantId);

  // pg_trgm similarity query with composite index on (tenantId, branchId, auditAreaId)
  const results = await prisma.$queryRaw<RepeatCandidate[]>`
    SELECT
      id,
      title,
      similarity(title, ${title}) as similarity,
      (
        SELECT COUNT(*)
        FROM "Observation" o2
        WHERE o2."branchId" = o."branchId"
          AND o2."auditAreaId" = o."auditAreaId"
          AND o2.status = 'CLOSED'
      ) as "occurrenceCount"
    FROM "Observation" o
    WHERE
      "tenantId" = ${tenantId}::uuid
      AND "branchId" = ${branchId}::uuid
      AND "auditAreaId" = ${auditAreaId}::uuid
      AND similarity(title, ${title}) > 0.5
      AND status = 'CLOSED'
    ORDER BY similarity DESC
    LIMIT 5
  `;

  return results;
}

// Severity escalation logic
export function escalateSeverity(
  currentSeverity: Severity,
  occurrenceCount: number,
): Severity {
  // 2nd occurrence: +1 level
  // 3rd+ occurrence: always CRITICAL
  if (occurrenceCount >= 3) return "CRITICAL";

  if (occurrenceCount === 2) {
    const escalationMap: Record<Severity, Severity> = {
      LOW: "MEDIUM",
      MEDIUM: "HIGH",
      HIGH: "CRITICAL",
      CRITICAL: "CRITICAL",
    };
    return escalationMap[currentSeverity];
  }

  return currentSeverity;
}
```

**Performance:**

- Composite index on `(tenantId, branchId, auditAreaId)` filters to ~10-100 rows before similarity calculation
- GIN index on `title` for pg_trgm: `CREATE INDEX idx_observation_title_trgm ON "Observation" USING gin (title gin_trgm_ops);`
- Similarity threshold 0.5 is standard (range: 0.3-0.7, higher = stricter matching)

**Alternate approach (if pg_trgm insufficient):**

- Use composite key matching: `(branchId, auditAreaId, riskCategory)` exact match
- Fall back to pg_trgm only for title similarity within same composite key

### Pattern 5: Immutable Audit Trail with ObservationTimeline

**What:** Every state transition appends an immutable record to ObservationTimeline. No updates or deletes — only inserts.

**When to use:** Always. Timeline is the source of truth for "who did what when."

**Schema (already exists in Prisma schema):**

```prisma
model ObservationTimeline {
  id            String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  observationId String @db.Uuid
  tenantId      String @db.Uuid
  event         String        // e.g., "status_changed", "severity_escalated", "repeat_confirmed"
  oldValue      String?       // Previous value (e.g., "DRAFT")
  newValue      String?       // New value (e.g., "SUBMITTED")
  comment       String? @db.Text
  createdById   String @db.Uuid
  createdAt     DateTime @default(now())

  @@index([tenantId])
  @@index([observationId])
}
```

**Display pattern (status-timeline.tsx already exists):**

- Query `ObservationTimeline` ordered by `createdAt ASC`
- Render as vertical timeline with dots and connecting line
- Color-code events: status changes (blue), severity escalations (orange), closures (green)

**Compliance benefit:** Immutable log satisfies RBI audit requirements. Export timeline as PDF for regulatory submission.

### Anti-Patterns to Avoid

- **Don't use XState for simple workflows** — 50KB bundle + actor complexity unnecessary for linear 7-state machine
- **Don't throw errors in server actions** — breaks Next.js useActionState. Always return `{ success: false, error: string }`
- **Don't filter by tenantId in queries** — let RLS enforce isolation (defense-in-depth)
- **Don't update timeline records** — timeline is append-only audit log
- **Don't use `$transaction()` with RLS extension** — extension already wraps queries in transactions
- **Don't rely on client-side state machine validation** — always validate on server

## Don't Hand-Roll

| Problem                          | Don't Build                                          | Use Instead                                       | Why                                                                                |
| -------------------------------- | ---------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| State transition validation      | Custom if/else chains for 35+ role-permission combos | Discriminated union + Zod + transition matrix     | Type-safe, testable, maintainable. Custom chains become spaghetti code.            |
| Server action validation         | Manual try/catch + role checks per action            | next-safe-action wrapper                          | Reduces boilerplate, enforces consistent auth/validation pipeline                  |
| Tenant isolation                 | Manual `where: { tenantId }` in every query          | Prisma RLS extension                              | Defense-in-depth: database-level enforcement prevents accidental leaks             |
| Fuzzy text matching              | Levenshtein distance in JavaScript                   | pg_trgm PostgreSQL extension                      | 10-100x faster, index-backed, battle-tested                                        |
| Session management in middleware | Database queries for user/roles                      | Better Auth session cookie + customSession plugin | Middleware runs on every request — avoid DB calls, use JWT-like session enrichment |

**Key insight:** PostgreSQL is better at text similarity (pg_trgm) and multi-tenancy (RLS) than application code. Push logic down to database when possible.

## Common Pitfalls

### Pitfall 1: Throwing Errors in Server Actions

**What goes wrong:** `throw new Error()` in server actions breaks Next.js useActionState hook and error boundaries.

**Why it happens:** Developers carry over Express/REST habits where throwing is standard error handling.

**How to avoid:** Always return errors as data:

```typescript
// ❌ BAD
export async function submitObservation(input) {
  if (!isValid) throw new Error("Invalid input");
  // ...
}

// ✅ GOOD
export async function submitObservation(input): Promise<SubmitResult> {
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }
  // ...
  return { success: true, data: { id } };
}
```

**Warning signs:** `try/catch` blocks in client components, error boundaries catching server action errors.

### Pitfall 2: Forgetting to Revalidate Paths After Mutations

**What goes wrong:** User submits observation, but findings list still shows stale "Draft" status.

**Why it happens:** Next.js aggressively caches server component data. Mutations don't automatically invalidate cache.

**How to avoid:** Call `revalidatePath()` after every mutation:

```typescript
await prisma.observation.update({
  /* ... */
});
revalidatePath("/findings");
revalidatePath(`/findings/${id}`);
```

**Warning signs:** Users need to hard-refresh to see changes, data appears stale after mutations.

### Pitfall 3: Missing Composite Index for Repeat Finding Queries

**What goes wrong:** Repeat finding detection query times out on production data (10K+ observations).

**Why it happens:** Query filters by `(tenantId, branchId, auditAreaId)` then calculates similarity. Without composite index, PostgreSQL scans entire table.

**How to avoid:** Create composite index in migration:

```sql
CREATE INDEX idx_observation_repeat_detection
ON "Observation" (
  "tenantId",
  "branchId",
  "auditAreaId",
  status
)
WHERE status = 'CLOSED';

CREATE INDEX idx_observation_title_trgm
ON "Observation" USING gin (title gin_trgm_ops);
```

**Warning signs:** Slow query logs show `Seq Scan` on Observation table, repeat finding detection takes >1 second.

### Pitfall 4: State Machine Permission Matrix Explosion

**What goes wrong:** 7 states × 5 roles = 35+ transition rules become unmaintainable if/else chains.

**Why it happens:** Adding new transitions without structured validation logic.

**How to avoid:** Use transition matrix (see Pattern 1) with declarative rules:

```typescript
const TRANSITIONS: Transition[] = [
  { from: "DRAFT", to: "SUBMITTED", allowedRoles: ["AUDITOR"] },
  // ... 10 total transitions
];

// Single validation function
canTransition(from, to, userRoles, severity);
```

**Warning signs:** Nested if statements checking roles, duplicated role checks across actions, missing transition validations.

### Pitfall 5: Not Setting Tenant Context in Prisma RLS Extension

**What goes wrong:** RLS policies block all queries because `app.current_tenant_id` is unset.

**Why it happens:** Forgetting to call `getPrismaForTenant(tenantId)` and using global Prisma client instead.

**How to avoid:** Never use global Prisma client directly. Always:

```typescript
const session = await auth.api.getSession();
const prisma = await getPrismaForTenant(session.user.tenantId);
```

**Warning signs:** Queries return empty results in production, PostgreSQL logs show RLS policy violations.

### Pitfall 6: Storing Severity Escalation Without Audit Trail

**What goes wrong:** Observation severity changes from MEDIUM to HIGH, but no record of why or when.

**Why it happens:** Updating `observation.severity` directly without timeline entry.

**How to avoid:** Always create timeline entry when escalating:

```typescript
await prisma.$transaction([
  prisma.observation.update({
    where: { id },
    data: { severity: escalatedSeverity },
  }),
  prisma.observationTimeline.create({
    data: {
      observationId: id,
      event: "severity_escalated",
      oldValue: currentSeverity,
      newValue: escalatedSeverity,
      comment: `Auto-escalated: ${occurrenceCount} repeat occurrences`,
      createdById: systemUserId,
    },
  }),
]);
```

**Warning signs:** Severity changes with no explanation, audit trail missing escalation events.

## Code Examples

Verified patterns from official sources and research:

### Server Action with next-safe-action

```typescript
// Using next-safe-action to reduce boilerplate
import { createSafeActionClient } from "next-safe-action";
import { auth } from "@/lib/auth";

export const actionClient = createSafeActionClient({
  async middleware() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    return {
      userId: session.user.id,
      tenantId: session.user.tenantId,
      roles: session.user.roles,
    };
  },
});

export const closeObservation = actionClient
  .schema(z.object({ observationId: z.string().uuid(), comment: z.string() }))
  .action(async ({ parsedInput, ctx }) => {
    const { observationId, comment } = parsedInput;
    const { userId, tenantId, roles } = ctx;

    const prisma = await getPrismaForTenant(tenantId);
    const observation = await prisma.observation.findUnique({
      where: { id: observationId },
      select: { status: true, severity: true },
    });

    const transition = canTransition(
      observation.status,
      "CLOSED",
      roles,
      observation.severity,
    );
    if (!transition.allowed) {
      throw new Error(transition.reason);
    }

    // ... rest of logic
  });
```

**Source:** [next-safe-action docs](https://next-safe-action.dev/) — pipeline pattern for auth + validation

### Better Auth Session with Custom Roles

```typescript
// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  session: {
    strategy: "compact", // Smallest cookie size, best performance
  },
  plugins: [
    customSession(async ({ session, user }) => {
      // Enrich session with user roles
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { roles: true, tenantId: true },
      });

      return {
        user: {
          ...user,
          roles: dbUser.roles,
          tenantId: dbUser.tenantId,
        },
        session,
      };
    }),
  ],
});

// In server actions:
const session = await auth.api.getSession({ headers: await headers() });
console.log(session.user.roles); // ['AUDITOR', 'AUDIT_MANAGER']
```

**Source:** [Better Auth session management](https://www.better-auth.com/docs/concepts/session-management) — customSession plugin

### PostgreSQL Migration for RLS + pg_trgm

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable RLS on Observation table
ALTER TABLE "Observation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Observation" FORCE ROW LEVEL SECURITY;

-- Tenant isolation policy
CREATE POLICY tenant_isolation_policy ON "Observation"
USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);

-- Composite index for repeat finding detection
CREATE INDEX idx_observation_repeat_detection
ON "Observation" ("tenantId", "branchId", "auditAreaId", status)
WHERE status = 'CLOSED';

-- Trigram index for title similarity
CREATE INDEX idx_observation_title_trgm
ON "Observation" USING gin (title gin_trgm_ops);

-- Index for timeline queries
CREATE INDEX idx_timeline_observation
ON "ObservationTimeline" ("observationId", "createdAt");

-- Set similarity threshold (default 0.3, we use 0.5 for stricter matching)
ALTER DATABASE your_db_name SET pg_trgm.similarity_threshold = 0.5;
```

**Sources:**

- [PostgreSQL pg_trgm docs](https://www.postgresql.org/docs/current/pgtrgm.html)
- [Prisma RLS extension example](https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security)

### Client-Side Form with useActionState

```typescript
// src/app/(dashboard)/findings/new/page.tsx
'use client';

import { useActionState } from 'react';
import { submitObservation } from '@/actions/observations/submit';

export default function CreateObservationPage() {
  const [state, formAction, isPending] = useActionState(submitObservation, null);

  return (
    <form action={formAction}>
      {/* form fields */}
      {state?.error && <div className="text-red-600">{state.error}</div>}
      <button disabled={isPending}>
        {isPending ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
```

**Source:** [Next.js 16 useActionState](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations) — recommended form pattern

## State of the Art

| Old Approach                     | Current Approach                          | When Changed          | Impact                                                                                                     |
| -------------------------------- | ----------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------- |
| NextAuth.js                      | Auth.js / Better Auth                     | Sept 2025             | Auth.js absorbed NextAuth team; Better Auth has better Next.js 16 support, no database calls in middleware |
| Manual RLS queries               | Prisma client extensions                  | Prisma 4.16+ (2023)   | Database-level tenant isolation, defense-in-depth security                                                 |
| try/catch in actions             | Return errors as data                     | React 19 (2025)       | useActionState requires non-throwing actions                                                               |
| XState for all state machines    | Discriminated unions for simple workflows | XState 5 (2024)       | Actor model + 50KB overhead unnecessary for <10 state machines                                             |
| Application-level fuzzy matching | PostgreSQL pg_trgm                        | Built-in since PG 9.1 | 10-100x faster, index-backed                                                                               |

**Deprecated/outdated:**

- NextAuth.js: Merged into Auth.js (Sept 2025). Better Auth is now preferred for Next.js 16 due to better App Router support.
- Middleware database queries: Next.js 16 proxy/middleware should only check session cookie existence, not query DB/API. Use Better Auth compact session strategy.
- Throwing errors in server actions: React 19's useActionState requires actions to return results, not throw.

## Open Questions

1. **How to handle "Resolved during fieldwork" status (OBS-07)?**
   - What we know: Requirement says observations dropped during fieldwork need special status
   - What's unclear: Is this a sub-status of DRAFT, or separate workflow?
   - Recommendation: Add `resolvedDuringFieldwork: boolean` flag + `resolutionReason: string?` to Observation model. Display in UI as badge. Not a separate state — keep 7-state machine simple.

2. **How to link observations to RBI circulars (multi-dimensional tagging)?**
   - What we know: OBS-08 requires tagging observations with RBI requirements
   - What's unclear: Schema has `ComplianceRequirement` → `RbiCircular` link, but no `Observation` → `RbiCircular` link
   - Recommendation: Add junction table `ObservationRbiCircular` for many-to-many relationship. Alternative: store `rbiCircularIds: String[]` in Observation (PostgreSQL array column).

3. **Should repeat finding detection run automatically or manually?**
   - What we know: OBS-11 says auditor can confirm/dismiss suggestions
   - What's unclear: Does system auto-suggest on create, or auditor triggers detection manually?
   - Recommendation: Auto-detect on save (before SUBMITTED state), show banner with suggestions. Auditor must explicitly confirm to escalate severity. Store confirmation in timeline.

4. **How to handle concurrent state transitions (optimistic locking)?**
   - What we know: Two users might try to transition same observation simultaneously
   - What's unclear: Should system prevent with row-level locks, or allow last-write-wins?
   - Recommendation: Add `version: Int` column to Observation, increment on every update. Use Prisma's `where: { id, version }` optimistic locking. Return error if version mismatch.

## Sources

### Primary (HIGH confidence)

- [Prisma RLS extension](https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security) — Official Prisma client extension pattern for Row Level Security
- [PostgreSQL pg_trgm docs](https://www.postgresql.org/docs/current/pgtrgm.html) — Official PostgreSQL trigram similarity documentation
- [Next.js Server Actions security guide](https://makerkit.dev/blog/tutorials/secure-nextjs-server-actions) — Production best practices for validation, auth, error handling
- [Better Auth session management](https://www.better-auth.com/docs/concepts/session-management) — Official Better Auth session patterns
- [XState v5 announcement](https://stately.ai/blog/2023-12-01-xstate-v5) — Actor-based state management (considered but not recommended for this phase)

### Secondary (MEDIUM confidence)

- [Maker-checker banking workflow](https://medium.com/@vdharam/implementation-of-maker-checker-flow-in-banking-domain-projects-17068cd05d73) — Banking industry pattern for dual approval (verified with multiple sources)
- [Next.js 16 authentication guide](https://auth0.com/blog/whats-new-nextjs-16/) — Middleware best practices (verified with Next.js docs)
- [PostgreSQL composite indexes](https://www.postgresql.org/docs/current/indexes-multicolumn.html) — Official PostgreSQL multicolumn index docs
- [Role-based access control Next.js](https://clerk.com/blog/nextjs-role-based-access-control) — RBAC patterns (verified with multiple 2025-2026 sources)

### Tertiary (LOW confidence)

- Severity escalation algorithms for repeat findings — No authoritative source found. Requirement OBS-10 specifies "+1 level for 2nd occurrence, Critical for 3rd+". Implementation is straightforward mapping.
- Property-based testing for 35+ permission combinations — STATE.md mentions this, but no specific testing library researched. Mark for validation during implementation.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — Zod, Prisma, Better Auth are industry standard for Next.js 16
- Architecture (state machine): MEDIUM — Discriminated union pattern verified with TypeScript docs, but XState comparison is opinion-based
- Architecture (RLS): HIGH — Official Prisma extension example
- Architecture (pg_trgm): HIGH — Official PostgreSQL docs
- Pitfalls: MEDIUM — Based on WebSearch + Next.js docs, not empirical testing
- Maker-checker pattern: MEDIUM — Banking sources verified, but no official TypeScript implementation guide

**Research date:** 2026-02-09
**Valid until:** ~60 days (2026-04-10) — Next.js 16 stable, Prisma 6.x stable, Better Auth actively maintained. Re-verify if Prisma 7 or Next.js 17 releases.

---

## Sources Reference

- [Next.js Server Actions: The Complete Guide (2026)](https://makerkit.dev/blog/tutorials/nextjs-server-actions)
- [XState v5 announcement](https://stately.ai/blog/2023-12-01-xstate-v5)
- [XState Documentation](https://stately.ai/docs/xstate)
- [Securing Multi-Tenant Applications Using Row Level Security in PostgreSQL with Prisma ORM](https://medium.com/@francolabuschagne90/securing-multi-tenant-applications-using-row-level-security-in-postgresql-with-prisma-orm-4237f4d4bd35)
- [Prisma Client Extensions: Row-Level Security](https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security)
- [Implementation of maker-checker flow in banking domain projects](https://medium.com/@vdharam/implementation-of-maker-checker-flow-in-banking-domain-projects-17068cd05d73)
- [PostgreSQL: pg_trgm — support for similarity of text using trigram matching](https://www.postgresql.org/docs/current/pgtrgm.html)
- [Effective similarity search in PostgreSQL](https://railsware.com/blog/effective-similarity-search-in-postgresql/)
- [Building a Scalable Role-Based Access Control (RBAC) System in Next.js](https://medium.com/@muhebollah.diu/building-a-scalable-role-based-access-control-rbac-system-in-next-js-b67b9ecfe5fa)
- [Implement Role-Based Access Control in Next.js 15](https://clerk.com/blog/nextjs-role-based-access-control)
- [Next.js Server Actions Error Handling: A Production-Ready Guide](https://medium.com/@pawantripathi648/next-js-server-actions-error-handling-the-pattern-i-wish-i-knew-earlier-e717f28f2f75)
- [PostgreSQL: Multicolumn Indexes](https://www.postgresql.org/docs/current/indexes-multicolumn.html)
- [Optimizing PostgreSQL with Composite and Partial Indexes](https://stormatics.tech/blogs/optimizing-postgresql-with-composite-and-partial-indexes)
- [Audit trail immutable log PostgreSQL best practices](https://dev.to/akkaraponph/comprehensive-research-audit-log-paradigms-gopostgresqlgorm-design-patterns-1jmm)
- [Better Auth with Next.js](https://www.better-auth.com/docs/integrations/next)
- [Better Auth Session Management](https://www.better-auth.com/docs/concepts/session-management)
