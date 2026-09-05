# Identity and Authorization Remediation (F01–F06) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the six identity and authorization findings from the AEGIS brownfield review so that invited users can actually sign in, invitation tokens never reach logs, session state is re-validated per request, maker-checker is enforced on regulated transitions, and branch- and team-scoped actions stop being tenant-wide.

**Architecture:** Every fix follows the same shape the codebase already uses — a pure, unit-testable decision function in `src/lib/`, a thin tenant-scoped lookup in `src/data-access/`, and a server action that calls both and returns `{ success, error }`. Two net-new shared modules carry the cross-cutting rules: `src/lib/maker-checker.ts` (pure, decides whether an actor may perform a transition given who acted before) and `src/data-access/access-guards.ts` (async, resolves branch assignment and audit-team membership under the session tenant). Nothing changes in the Prisma schema; every guard is expressible against existing columns.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 7 (`@/generated/prisma/client`), PostgreSQL, Better Auth 1.6.22, Zod 4, Vitest 4, pino, AWS SES v2 via `@aws-sdk/client-sesv2`, React Email.

**Spec:** `/Users/nc/.cursor/projects/Users-nc-Dev-AEGIS/canvases/AEGIS-brownfield-review.canvas.tsx` — findings F01 through F06. The `guard` field on each finding is the acceptance criterion; the `evidence` and `path` fields locate the defect.

---

## Global Constraints

- **Do not merge to `main` during this work.** Merging to `main` auto-deploys to production via Coolify with no branch protection. All work lands on a single feature branch; the merge is a separate, deliberate decision.
- **Use `npx -y pnpm@10` for every pnpm invocation.** The Dockerfile pins pnpm 9 and CI pins 10; pnpm 11 ignores the `pnpm.overrides` block in `package.json` and fails `--frozen-lockfile`.
- **Route every audited write through `withAuditedMutation(actor, actionType, fn)`** from `src/data-access/audited-mutation.ts`. A hand-rolled `prisma.$transaction` that mutates a table in `AUDITED_TABLES` (`src/lib/audit-triggers.ts`) writes an audit row with no attribution, and `src/data-access/__tests__/audited-mutation-discipline.test.ts` fails the build. `Account`, `Session`, `AccountExamResponse`, `ComplianceItem`, `AuditTeamMember`, and `ExaminationQuestion` are **not** audited tables; `User`, `Observation`, `ObservationTimeline`, `AuditEngagement`, `Branch`, and `UserBranchAssignment` **are**.
- **Tenant ID always comes from the authenticated session.** Never from a URL param, request body, or query string.
- **Import style:** `@/*` path aliases; icons from `@/lib/icons`; `cn()` for class composition.
- **Prettier defaults apply:** semicolons enabled, double quotes.
- **No schema migration is permitted in this plan.** Loose `.sql` files in `prisma/migrations/` are applied by hand and do not ride along with a deploy, so introducing one here would create a deploy-ordering hazard that is out of scope (that is finding F12).
- **Every task ends with a passing `npx -y pnpm@10 test:unit` and a commit.**

---

## File Structure

**Net-new files**

| Path                                        | Responsibility                                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/test/server-only-stub.ts`              | Empty module Vitest aliases `server-only` to, so DAL modules can be imported in a node test run. |
| `src/test/factories.ts`                     | Shared test doubles: fixed UUID constants, `fakeSession()`, `fakeDb()`.                          |
| `src/lib/password-policy.ts`                | Pure Zod schema for passwords AEGIS itself creates.                                              |
| `src/lib/session-guard.ts`                  | Pure decision function for what to do with a session whose user row was just re-read.            |
| `src/lib/maker-checker.ts`                  | Pure distinct-actor rules for observation and report transitions.                                |
| `src/lib/invitation-mailer.ts`              | Builds the accept URL, renders and sends the invitation email, logs only redacted fields.        |
| `src/emails/templates/invitation-email.tsx` | React Email template for the invitation.                                                         |
| `src/data-access/access-guards.ts`          | Async branch-assignment and audit-team-membership guards, scoped by session tenant.              |

**Modified files**

| Path                                               | Change                                                                              |
| -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `vitest.config.ts`                                 | Alias `server-only`, seed `test.env` so `@/env` imports resolve.                    |
| `src/actions/user-invitations.ts`                  | Create the credential account (F01); send email instead of logging the token (F02). |
| `src/emails/render.ts`                             | Register the `invitation` template.                                                 |
| `src/app/accept-invite/page.tsx`                   | Use the shared password schema for client-side validation.                          |
| `src/data-access/session.ts`                       | Re-read and validate user state; add `getOnboardingSession()` (F03).                |
| `src/lib/guards.ts`                                | Add `requireOnboardingPermission()` (F03).                                          |
| `src/app/(onboarding)/onboarding/page.tsx`         | Use the tenant-optional guard, to avoid a redirect loop (F03).                      |
| `src/actions/onboarding.ts`                        | Use the tenant-optional session (F03).                                              |
| `src/actions/observations/transition.ts`           | Enforce maker-checker (F04).                                                        |
| `src/actions/reports/transition-report.ts`         | Enforce maker-checker (F04).                                                        |
| `src/actions/compliance/submit-branch-response.ts` | Enforce branch assignment (F05).                                                    |
| `src/actions/audit-execution/bh-certificate.ts`    | Enforce branch assignment, team membership, distinct signer (F05).                  |
| `src/actions/account-examination/save-response.ts` | Require `examination:respond`, team membership, module-scoped question (F06).       |

---

## Task 0: Branch and baseline

- [ ] **Step 1: Create the feature branch**

The working tree is clean and currently on `main`. Merging `main` deploys to production, so do not work there.

```bash
cd /Users/nc/Dev/AEGIS
git checkout -b fix/identity-authorization-f01-f06
```

- [ ] **Step 2: Install dependencies and generate the Prisma client**

`node_modules` is absent and `src/generated/prisma/` is gitignored output. Existing tests import `@/generated/prisma/enums`, so generation must succeed before anything runs.

```bash
npx -y pnpm@10 install
npx -y pnpm@10 db:generate
```

- [ ] **Step 3: Record the baseline test result**

```bash
npx -y pnpm@10 test:unit
```

Expected: all existing suites pass (12 test files under `src/**/__tests__/`). If anything fails here, it is pre-existing — stop and report it rather than folding it into this work.

---

## Task 1: Server-action test harness

Every later task changes a server action's authorization behavior, and the repo has **zero** server-action tests today — the only existing technique is static source analysis. This task builds the smallest harness that lets a server action be imported and exercised in Vitest, and proves it with a characterization test for `submitBranchResponse` as it behaves _before_ Task 9 changes it.

**Files:**

- Create: `src/test/server-only-stub.ts`
- Create: `src/test/factories.ts`
- Modify: `vitest.config.ts`
- Test: `src/actions/compliance/__tests__/submit-branch-response.test.ts`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces:
  - `TENANT_A: string`, `TENANT_B: string`, `USER_A: string`, `USER_B: string`, `BRANCH_A: string`, `BRANCH_B: string`, `SESSION_ID: string`, `ENGAGEMENT_A: string`, `OBSERVATION_A: string`, `COMPLIANCE_ITEM_A: string`, `LOAN_ACCOUNT_A: string`, `QUESTION_A: string` — fixed valid v4 UUID string constants from `src/test/factories.ts`.
  - `fakeSession(overrides?: { userId?: string; tenantId?: string; roles?: Role[] }): { user: { id: string; name: string; email: string; tenantId: string; roles: Role[] }; session: { id: string } }`
  - `fakeDb(models: Record<string, unknown>): any` — returns the model map with a `$transaction(fn)` that calls `fn` with the same object, so code written against `tx.x.y()` hits the same doubles as `db.x.y()`.

- [ ] **Step 1: Write the failing test**

Create `src/actions/compliance/__tests__/submit-branch-response.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/data-access/session", () => ({ getRequiredSession: vi.fn() }));
vi.mock("@/data-access/prisma", () => ({ prismaForTenant: vi.fn() }));
vi.mock("@/data-access/audit-context", () => ({ setAuditContext: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { submitBranchResponse } from "../submit-branch-response";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import {
  COMPLIANCE_ITEM_A,
  BRANCH_A,
  fakeDb,
  fakeSession,
} from "@/test/factories";

const VALID_INPUT = {
  complianceItemId: COMPLIANCE_ITEM_A,
  responseText: "Rectified; sanction note and KYC re-verified.",
};

describe("submitBranchResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuses a role without compliance:branch_response", async () => {
    vi.mocked(getRequiredSession).mockResolvedValue(
      fakeSession({ roles: ["AUDITOR"] }) as never,
    );

    const result = await submitBranchResponse(VALID_INPUT);

    expect(result).toEqual({
      success: false,
      error: "You do not have permission to submit branch responses.",
    });
  });

  it("refuses a response shorter than the schema minimum", async () => {
    vi.mocked(getRequiredSession).mockResolvedValue(
      fakeSession({ roles: ["BRANCH_HEAD"] }) as never,
    );

    const result = await submitBranchResponse({
      complianceItemId: COMPLIANCE_ITEM_A,
      responseText: "done",
    });

    expect(result.success).toBe(false);
  });

  it("submits a response for an open compliance item", async () => {
    vi.mocked(getRequiredSession).mockResolvedValue(
      fakeSession({ roles: ["BRANCH_HEAD"] }) as never,
    );
    vi.mocked(prismaForTenant).mockReturnValue(
      fakeDb({
        complianceItem: {
          findFirst: vi.fn().mockResolvedValue({
            id: COMPLIANCE_ITEM_A,
            status: "OPEN",
            branchId: BRANCH_A,
            observation: { branchId: BRANCH_A },
          }),
          update: vi.fn().mockResolvedValue({ id: COMPLIANCE_ITEM_A }),
        },
      }),
    );

    const result = await submitBranchResponse(VALID_INPUT);

    expect(result).toEqual({
      success: true,
      data: { id: COMPLIANCE_ITEM_A, status: "BRANCH_RESPONSE_SUBMITTED" },
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx -y pnpm@10 exec vitest run src/actions/compliance/__tests__/submit-branch-response.test.ts
```

Expected: FAIL. The first failure is a resolution or import error — `submit-branch-response.ts` reaches `src/data-access/audit-context.ts`, which imports `server-only`, whose default entry throws outside the `react-server` condition.

- [ ] **Step 3: Add the `server-only` stub**

Create `src/test/server-only-stub.ts`:

```typescript
/**
 * Stand-in for the `server-only` package under Vitest.
 *
 * `server-only`'s default entry throws unless the bundler resolves it under
 * the `react-server` export condition. Vitest runs plain node, so importing
 * any DAL module would fail before a single assertion ran. Aliased in
 * vitest.config.ts; nothing imports this directly.
 */
export {};
```

- [ ] **Step 4: Point Vitest at the stub and give it a valid environment**

Replace `vitest.config.ts` in full:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
    // src/env.ts validates at import time. Server actions reach it through the
    // mailer and other helpers, so give every run a syntactically valid set
    // rather than mocking @/env in each file. No test connects to these.
    env: {
      DATABASE_URL: "postgresql://aegis:aegis@localhost:5432/aegis_test",
      BETTER_AUTH_SECRET: "vitest-secret-that-is-at-least-32-chars",
      BETTER_AUTH_URL: "http://localhost:3000",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    },
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts", "src/services/**/*.ts"],
      exclude: ["src/lib/__tests__/**", "src/services/**/__tests__/**"],
      reporter: ["text", "text-summary"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./src/test/server-only-stub.ts"),
    },
  },
});
```

- [ ] **Step 5: Add the shared test doubles**

Create `src/test/factories.ts`:

```typescript
import type { Role } from "@/generated/prisma/enums";

/**
 * Fixed identifiers for tests.
 *
 * prismaForTenant rejects anything that is not a v4-shaped UUID, so these must
 * stay well-formed even though no database sees them.
 */
export const TENANT_A = "11111111-1111-4111-8111-111111111111";
export const TENANT_B = "22222222-2222-4222-8222-222222222222";
export const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const BRANCH_A = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
export const BRANCH_B = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
export const SESSION_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
export const ENGAGEMENT_A = "ffffffff-ffff-4fff-8fff-ffffffffffff";
export const OBSERVATION_A = "12121212-1212-4121-8121-121212121212";
export const COMPLIANCE_ITEM_A = "23232323-2323-4232-8232-323232323232";
export const LOAN_ACCOUNT_A = "31313131-3131-4131-8131-313131313131";
export const QUESTION_A = "41414141-4141-4141-8141-414141414141";

/** A session in the shape getRequiredSession returns. */
export function fakeSession(
  overrides: { userId?: string; tenantId?: string; roles?: Role[] } = {},
) {
  return {
    user: {
      id: overrides.userId ?? USER_A,
      name: "Test User",
      email: "test@example.com",
      tenantId: overrides.tenantId ?? TENANT_A,
      roles: overrides.roles ?? (["BRANCH_HEAD"] as Role[]),
    },
    session: { id: SESSION_ID },
  };
}

/**
 * A Prisma stand-in whose $transaction hands back the same model map, so code
 * written against `tx.model.method()` exercises the same doubles as
 * `db.model.method()`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fakeDb(models: Record<string, unknown>): any {
  const db: Record<string, unknown> = { ...models };
  db.$transaction = async (fn: (tx: unknown) => unknown) => fn(db);
  return db;
}
```

- [ ] **Step 6: Make the third test pass by widening the compliance item read**

The characterization test asserts a `select` that includes `branchId` and the observation's `branchId`, which Task 9 needs. Bring that read forward now so the harness test is honest about the shape.

In `src/actions/compliance/submit-branch-response.ts`, replace the `findFirst` call inside the transaction:

```typescript
// Verify compliance item exists and is open
const item = await tx.complianceItem.findFirst({
  where: { id: parsed.data.complianceItemId, tenantId },
  select: {
    id: true,
    status: true,
    branchId: true,
    observation: { select: { branchId: true } },
  },
});
```

- [ ] **Step 7: Run the test to verify it passes**

```bash
npx -y pnpm@10 exec vitest run src/actions/compliance/__tests__/submit-branch-response.test.ts
```

Expected: 3 passed.

- [ ] **Step 8: Run the full suite and lint**

```bash
npx -y pnpm@10 test:unit
npx -y pnpm@10 lint
```

Expected: all suites pass. The `server-only` alias must not have changed the outcome of `tenant-isolation.test.ts` or `audited-mutation-discipline.test.ts`, which read source as text and never import it.

- [ ] **Step 9: Commit**

```bash
git add vitest.config.ts src/test src/actions/compliance
git commit -m "test: add a harness for exercising server actions under Vitest"
```

---

## Task 2: Invitation activation creates a real credential (F01)

`acceptInvitation` takes `_password` and throws it away — it flips `User.status` to `ACTIVE` but never writes a Better Auth credential. The invitee sees "Account Activated!", is sent to `/login`, and cannot sign in. Worse, they cannot be rescued: `resendInvitation` only matches `status: "INVITED"`.

Better Auth stores credentials as an `Account` row with `providerId: "credential"` and `accountId` equal to the user id, hashed with its own configured algorithm (scrypt by default) — **not** bcrypt. A bcrypt digest written here would never verify. The hash must come from `auth.$context`.

**Files:**

- Create: `src/lib/password-policy.ts`
- Modify: `src/actions/user-invitations.ts:145-225`
- Modify: `src/app/accept-invite/page.tsx:43-56`
- Test: `src/lib/__tests__/password-policy.test.ts`
- Test: `src/actions/__tests__/accept-invitation.test.ts`

**Interfaces:**

- Consumes: `fakeDb`, `fakeSession`, `TENANT_A`, `USER_A` from `src/test/factories.ts` (Task 1).
- Produces: `PasswordSchema: z.ZodString` from `src/lib/password-policy.ts`.

- [ ] **Step 1: Write the failing test for the password policy**

Create `src/lib/__tests__/password-policy.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { PasswordSchema } from "@/lib/password-policy";

describe("PasswordSchema", () => {
  it("accepts a password with the required character classes", () => {
    expect(PasswordSchema.safeParse("Branch2026audit").success).toBe(true);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = PasswordSchema.safeParse("Ab1cdef");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      "Password must be at least 8 characters.",
    );
  });

  it("rejects a password with no uppercase letter", () => {
    const result = PasswordSchema.safeParse("branch2026audit");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      "Password must contain an uppercase letter.",
    );
  });

  it("rejects a password with no digit", () => {
    const result = PasswordSchema.safeParse("BranchAuditReview");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      "Password must contain a digit.",
    );
  });

  it("rejects a password longer than 128 characters", () => {
    expect(PasswordSchema.safeParse(`Aa1${"x".repeat(126)}`).success).toBe(
      false,
    );
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx -y pnpm@10 exec vitest run src/lib/__tests__/password-policy.test.ts
```

Expected: FAIL — `Failed to resolve import "@/lib/password-policy"`.

- [ ] **Step 3: Write the password policy**

Create `src/lib/password-policy.ts`:

```typescript
import { z } from "zod";

/**
 * Rules for passwords AEGIS creates itself, as distinct from ones Better Auth
 * receives through its own sign-up route.
 *
 * The character classes match what the signup form already scores and what the
 * invitation form already claims, so the server now refuses what the client
 * merely discourages. Shared with the client so both show the same message.
 */
export const PasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be 128 characters or fewer.")
  .regex(/[A-Z]/, "Password must contain an uppercase letter.")
  .regex(/[a-z]/, "Password must contain a lowercase letter.")
  .regex(/[0-9]/, "Password must contain a digit.");
```

- [ ] **Step 4: Run it to verify it passes**

```bash
npx -y pnpm@10 exec vitest run src/lib/__tests__/password-policy.test.ts
```

Expected: 5 passed.

- [ ] **Step 5: Write the failing test for credential creation**

Create `src/actions/__tests__/accept-invitation.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const hash = vi.fn(async (plain: string) => `scrypt:${plain}`);

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ "x-forwarded-for": "10.0.0.1" })),
}));
vi.mock("@/lib/auth", () => ({
  auth: { $context: Promise.resolve({ password: { hash } }) },
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn(async () => true), hash: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: vi.fn() },
    auditLog: { create: vi.fn(async () => ({})) },
  },
  prismaForTenant: vi.fn(),
}));
vi.mock("@/data-access/session", () => ({ getRequiredSession: vi.fn() }));
vi.mock("@/data-access/audited-mutation", () => ({
  withAuditedMutation: vi.fn(),
  userActor: vi.fn(),
}));

import { acceptInvitation } from "../user-invitations";
import { prisma } from "@/lib/prisma";
import { withAuditedMutation } from "@/data-access/audited-mutation";
import { TENANT_A, USER_A, fakeDb } from "@/test/factories";

const INVITED_USER = {
  id: USER_A,
  email: "asha@ucb.example",
  tenantId: TENANT_A,
  status: "INVITED",
  inviteTokenHash: "$2b$12$hashedtoken",
  inviteExpiry: new Date(Date.now() + 86_400_000),
};

/** Runs the audited callback against a fake tx and exposes the doubles. */
function stubAuditedMutation(activatedCount: number) {
  const tx = fakeDb({
    user: {
      updateMany: vi.fn(async () => ({ count: activatedCount })),
    },
    account: { create: vi.fn(async () => ({ id: "account-1" })) },
  });
  vi.mocked(withAuditedMutation).mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (async (_actor: unknown, _action: unknown, fn: any) => fn(tx)) as never,
  );
  return tx;
}

describe("acceptInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findFirst).mockResolvedValue(INVITED_USER as never);
  });

  it("writes a Better Auth credential account alongside activation", async () => {
    const tx = stubAuditedMutation(1);

    const result = await acceptInvitation(
      "raw-token",
      "asha@ucb.example",
      "Branch2026audit",
    );

    expect(result.success).toBe(true);
    expect(hash).toHaveBeenCalledWith("Branch2026audit");
    expect(tx.account.create).toHaveBeenCalledWith({
      data: {
        userId: USER_A,
        accountId: USER_A,
        providerId: "credential",
        password: "scrypt:Branch2026audit",
      },
    });
  });

  it("activates only from INVITED, so a second acceptance is refused", async () => {
    stubAuditedMutation(0);

    const result = await acceptInvitation(
      "raw-token",
      "asha@ucb.example",
      "Branch2026audit",
    );

    expect(result).toEqual({
      success: false,
      error: "This invitation has already been used.",
    });
  });

  it("refuses a password that fails the policy before touching the database", async () => {
    const result = await acceptInvitation(
      "raw-token",
      "asha@ucb.example",
      "short",
    );

    expect(result).toEqual({
      success: false,
      error: "Password must be at least 8 characters.",
    });
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

```bash
npx -y pnpm@10 exec vitest run src/actions/__tests__/accept-invitation.test.ts
```

Expected: FAIL — no `account.create` call, and the weak password is accepted.

- [ ] **Step 7: Rewrite `acceptInvitation`**

In `src/actions/user-invitations.ts`, add two imports at the top of the file, after the existing `bcrypt` import:

```typescript
import { auth } from "@/lib/auth";
import { PasswordSchema } from "@/lib/password-policy";
```

Then replace the whole `acceptInvitation` function (currently `src/actions/user-invitations.ts:145-225`) with:

```typescript
export async function acceptInvitation(
  token: string,
  email: string,
  password: string,
) {
  const passwordCheck = PasswordSchema.safeParse(password);
  if (!passwordCheck.success) {
    return { success: false, error: passwordCheck.error.issues[0].message };
  }

  try {
    // Find user by email with INVITED status
    const user = await prisma.user.findFirst({
      where: {
        email,
        status: "INVITED",
        inviteTokenHash: { not: null },
      },
    });

    if (!user || !user.inviteTokenHash) {
      return { success: false, error: "Invalid or expired invitation." };
    }

    // Check token match using bcrypt
    const isValidToken = await bcrypt.compare(token, user.inviteTokenHash);
    if (!isValidToken) {
      return { success: false, error: "Invalid invitation token." };
    }

    // Check expiry
    if (user.inviteExpiry && user.inviteExpiry < new Date()) {
      return {
        success: false,
        error: "Invitation has expired. Please request a new one.",
      };
    }

    // An invited user always belongs to a tenant; fail cleanly rather than
    // asserting, since AuditLog.tenantId is NOT NULL.
    const tenantId = user.tenantId;
    if (!tenantId) {
      return { success: false, error: "Invitation is not linked to a bank." };
    }

    // Better Auth keeps credentials on Account and hashes with its own
    // configured algorithm. Hash through its context so the digest matches
    // what signIn.email will later verify — a bcrypt digest never would.
    const passwordHash = await (await auth.$context).password.hash(password);

    await withAuditedMutation(
      // The invitee is not signed in; they are activating their own account,
      // so they are the honest Actor for this change.
      { kind: "user", userId: user.id, tenantId },
      "user.invitation_accepted",
      async (tx) => {
        // Predicated on INVITED so two concurrent acceptances cannot both
        // activate and write competing credential rows.
        const activated = await tx.user.updateMany({
          where: { id: user.id, status: "INVITED" },
          data: {
            status: "ACTIVE",
            inviteTokenHash: null,
            inviteExpiry: null,
            emailVerified: true,
          },
        });

        if (activated.count !== 1) {
          throw new Error(ALREADY_ACCEPTED);
        }

        // Same transaction as activation: a user left ACTIVE with no
        // credential can neither sign in nor be re-invited, because
        // resendInvitation only matches status INVITED.
        await tx.account.create({
          data: {
            userId: user.id,
            accountId: user.id,
            providerId: "credential",
            password: passwordHash,
          },
        });
      },
    );

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        tableName: "User",
        recordId: user.id,
        operation: "UPDATE",
        actionType: "user.invitation_accepted",
        userId: user.id,
        ipAddress: (await headers()).get("x-forwarded-for") ?? "unknown",
      },
    });

    return { success: true, error: null };
  } catch (error) {
    if (error instanceof Error && error.message === ALREADY_ACCEPTED) {
      return {
        success: false,
        error: "This invitation has already been used.",
      };
    }
    logger.error(
      { error, action: "accept_invitation", email },
      "Failed to activate account.",
    );
    return { success: false, error: "Failed to activate account." };
  }
}
```

Immediately above `acceptInvitation`, under the existing `// ─── Accept Invitation ───` banner, add the sentinel:

```typescript
/** Thrown inside the activation transaction to roll it back and report cleanly. */
const ALREADY_ACCEPTED = "INVITATION_ALREADY_ACCEPTED";
```

- [ ] **Step 8: Run the test to verify it passes**

```bash
npx -y pnpm@10 exec vitest run src/actions/__tests__/accept-invitation.test.ts
```

Expected: 3 passed.

- [ ] **Step 9: Share the policy with the accept-invite form**

In `src/app/accept-invite/page.tsx`, add to the imports:

```typescript
import { PasswordSchema } from "@/lib/password-policy";
```

and replace the inline length check inside `handleSubmit`:

```typescript
const passwordCheck = PasswordSchema.safeParse(password);
if (!passwordCheck.success) {
  setError(passwordCheck.error.issues[0].message);
  return;
}
```

- [ ] **Step 10: Run the full suite, lint, and build**

```bash
npx -y pnpm@10 test:unit
npx -y pnpm@10 lint
npx -y pnpm@10 build
```

The build matters here: `src/app/accept-invite/page.tsx` is a client component now importing a shared module, and `user-invitations.ts` newly imports `@/lib/auth`.

- [ ] **Step 11: Commit**

```bash
git add src/lib/password-policy.ts src/lib/__tests__/password-policy.test.ts src/actions/user-invitations.ts src/actions/__tests__/accept-invitation.test.ts src/app/accept-invite/page.tsx
git commit -m "fix(auth): create a Better Auth credential when an invitation is accepted (F01)"
```

---

## Task 3: Invitation email replaces token logging (F02)

Both the send and resend paths write the live token-bearing accept URL to stdout, which Coolify captures. Anyone who can read container logs can activate an invited account. The fix sends the link through SES — the infrastructure already exists (`sendEmail` in `src/lib/ses-client.ts`, templates rendered by `renderEmailTemplate`) — and logs only the addressee, the outcome, and the expiry.

Sending moves **after** the transaction commits. Today the `console.log` sits inside the transaction loop; an SES call there would hold a transaction open across network I/O and roll back user creation on a transient failure.

**Files:**

- Create: `src/emails/templates/invitation-email.tsx`
- Create: `src/lib/invitation-mailer.ts`
- Modify: `src/emails/render.ts`
- Modify: `src/actions/user-invitations.ts` (`sendUserInvitations`, `resendInvitation`)
- Test: `src/emails/__tests__/invitation-email.test.ts`
- Test: `src/actions/__tests__/invitation-token-hygiene.test.ts`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces:
  - `InvitationEmail(props: { bankName: string; appUrl: string; inviteeName: string; acceptUrl: string; expiresOn: string }): React.ReactElement`
  - `getInvitationSubject(bankName: string): string`
  - `sendInvitationEmail(params: { to: string; inviteeName: string; bankName: string; rawToken: string; expiresAt: Date }): Promise<void>` from `src/lib/invitation-mailer.ts`

- [ ] **Step 1: Write the failing render test**

Create `src/emails/__tests__/invitation-email.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { renderEmailTemplate } from "@/emails/render";

describe("invitation email", () => {
  it("renders the accept link and the invitee's name", async () => {
    const { subject, html, text } = await renderEmailTemplate("invitation", {
      bankName: "Pune Sahakari UCB",
      appUrl: "https://aegis.example",
      inviteeName: "Asha Kulkarni",
      acceptUrl:
        "https://aegis.example/accept-invite?token=abc123&email=asha%40ucb.example",
      expiresOn: "11 Sep 2026",
    });

    expect(subject).toBe("[Pune Sahakari UCB] You have been invited to AEGIS");
    expect(html).toContain("https://aegis.example/accept-invite?token=abc123");
    expect(html).toContain("Asha Kulkarni");
    expect(text).toContain("11 Sep 2026");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx -y pnpm@10 exec vitest run src/emails/__tests__/invitation-email.test.ts
```

Expected: FAIL — `Unknown email template: invitation`.

- [ ] **Step 3: Write the template**

Create `src/emails/templates/invitation-email.tsx`:

```tsx
import { Text } from "@react-email/components";
import { EmailBaseLayout } from "../components/email-base-layout";
import { CtaButton } from "../components/cta-button";

interface InvitationEmailProps {
  bankName: string;
  appUrl: string;
  inviteeName: string;
  acceptUrl: string;
  expiresOn: string;
}

export function InvitationEmail({
  bankName,
  appUrl,
  inviteeName,
  acceptUrl,
  expiresOn,
}: InvitationEmailProps) {
  return (
    <EmailBaseLayout
      bankName={bankName}
      appUrl={appUrl}
      previewText={`Set your AEGIS password for ${bankName}`}
    >
      <Text style={headingStyle}>You have been invited to AEGIS</Text>

      <Text style={bodyTextStyle}>
        {inviteeName}, an administrator at {bankName} has created an AEGIS
        account for you. Choose a password to activate it.
      </Text>

      <CtaButton href={acceptUrl} text="Activate Your Account" />

      <Text style={noteStyle}>
        This link activates your account and can be used once. It expires on{" "}
        {expiresOn}. If it has expired, ask your administrator to send a new
        invitation.
      </Text>

      <Text style={noteStyle}>
        If you were not expecting this invitation, ignore this email and tell
        your administrator.
      </Text>
    </EmailBaseLayout>
  );
}

export function getInvitationSubject(bankName: string): string {
  return `[${bankName}] You have been invited to AEGIS`;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const headingStyle: React.CSSProperties = {
  color: "#0f172a",
  fontSize: "20px",
  fontWeight: "bold",
  margin: "0 0 16px 0",
};

const bodyTextStyle: React.CSSProperties = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 8px 0",
};

const noteStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: "12px",
  lineHeight: "20px",
  margin: "12px 0 0 0",
};
```

- [ ] **Step 4: Register the template**

In `src/emails/render.ts`, add to the import block:

```typescript
import {
  InvitationEmail,
  getInvitationSubject,
} from "./templates/invitation-email";
```

and add a case to the `switch (templateName)`, immediately before `case "assignment":`:

```typescript
    case "invitation":
      element = createElement(InvitationEmail, {
        bankName,
        appUrl,
        inviteeName: p.inviteeName ?? "",
        acceptUrl: p.acceptUrl ?? `${appUrl}/accept-invite`,
        expiresOn: p.expiresOn ?? "",
      });
      subject = getInvitationSubject(bankName);
      break;
```

- [ ] **Step 5: Run the render test to verify it passes**

```bash
npx -y pnpm@10 exec vitest run src/emails/__tests__/invitation-email.test.ts
```

Expected: 1 passed.

- [ ] **Step 6: Write the failing hygiene test**

Create `src/actions/__tests__/invitation-token-hygiene.test.ts`:

```typescript
/**
 * Invitation tokens are bearer credentials. This is a source scan, the same
 * technique as tenant-isolation.test.ts, because the defect it guards against
 * is a logging statement rather than a return value.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const SOURCE = readFileSync(
  join(process.cwd(), "src/actions/user-invitations.ts"),
  "utf-8",
);

describe("invitation token hygiene", () => {
  it("writes nothing to the console", () => {
    expect(SOURCE).not.toContain("console.log");
  });

  it("builds no token-bearing URL in the action layer", () => {
    // URL construction belongs to src/lib/invitation-mailer.ts, which hands
    // the link straight to SES and never to the logger.
    expect(SOURCE).not.toMatch(/token=\$\{/);
  });

  it("returns no raw token to the caller", () => {
    expect(SOURCE).not.toMatch(/return\s*\{[^}]*rawToken/);
  });
});
```

- [ ] **Step 7: Run it to verify it fails**

```bash
npx -y pnpm@10 exec vitest run src/actions/__tests__/invitation-token-hygiene.test.ts
```

Expected: FAIL on the first two assertions.

- [ ] **Step 8: Write the mailer**

Create `src/lib/invitation-mailer.ts`:

```typescript
import "server-only";
import { renderEmailTemplate } from "@/emails/render";
import { sendEmail } from "@/lib/ses-client";
import { logger } from "@/lib/logger";
import { env } from "@/env";

interface SendInvitationEmailParams {
  to: string;
  inviteeName: string;
  bankName: string;
  rawToken: string;
  expiresAt: Date;
}

/**
 * Deliver an invitation link.
 *
 * The URL carries a live bearer credential, so it is built here, handed to SES,
 * and discarded. Only the addressee, the expiry, and the delivery outcome are
 * recorded. Never returns the link, and never throws: a delivery failure is an
 * operational problem to be retried by resending, not a reason to unwind the
 * user records that were already committed.
 */
export async function sendInvitationEmail(
  params: SendInvitationEmailParams,
): Promise<void> {
  const acceptUrl = `${env.NEXT_PUBLIC_APP_URL}/accept-invite?token=${params.rawToken}&email=${encodeURIComponent(params.to)}`;

  try {
    const { subject, html, text } = await renderEmailTemplate("invitation", {
      bankName: params.bankName,
      inviteeName: params.inviteeName,
      acceptUrl,
      expiresOn: params.expiresAt.toISOString().slice(0, 10),
    });

    const result = await sendEmail({
      to: params.to,
      subject,
      htmlBody: html,
      textBody: text,
    });

    if (result.success) {
      logger.info(
        {
          action: "invitation_email_sent",
          recipient: params.to,
          messageId: result.messageId,
          expiresAt: params.expiresAt,
        },
        "Invitation email sent",
      );
    } else {
      logger.error(
        {
          action: "invitation_email_failed",
          recipient: params.to,
          error: result.error,
        },
        "Invitation email could not be delivered",
      );
    }
  } catch (error) {
    logger.error(
      { error, action: "invitation_email_failed", recipient: params.to },
      "Invitation email could not be rendered or sent",
    );
  }
}
```

- [ ] **Step 9: Send instead of logging in `sendUserInvitations`**

In `src/actions/user-invitations.ts`, add the import:

```typescript
import { sendInvitationEmail } from "@/lib/invitation-mailer";
```

Inside the `withAuditedMutation` callback of `sendUserInvitations`, delete the `console.log` block (`src/actions/user-invitations.ts:103-106`) and change the `results.push` so the token and expiry travel out of the transaction without being returned to the client:

```typescript
results.push({
  id: user.id,
  email: user.email,
  name: user.name,
  rawToken,
  inviteExpiry: user.inviteExpiry!,
});
```

Then replace the `return { success: true, error: null, data: createdUsers };` line with a post-commit send that strips the token:

```typescript
const tenant = await prisma.tenant.findUnique({
  where: { id: tenantId },
  select: { shortName: true },
});

// Sent after the transaction commits: SES is network I/O, and a transient
// delivery failure must not roll back the user records.
for (const invitee of createdUsers) {
  await sendInvitationEmail({
    to: invitee.email,
    inviteeName: invitee.name,
    bankName: tenant?.shortName ?? "AEGIS",
    rawToken: invitee.rawToken,
    expiresAt: invitee.inviteExpiry,
  });
}

return {
  success: true,
  error: null,
  data: createdUsers.map(({ id, email, name }) => ({ id, email, name })),
};
```

- [ ] **Step 10: Send instead of logging in `resendInvitation`**

In `resendInvitation`, replace the `console.log` block (`src/actions/user-invitations.ts:267-269`) with:

```typescript
const tenant = await prisma.tenant.findUnique({
  where: { id: tenantId },
  select: { shortName: true },
});

await sendInvitationEmail({
  to: user.email,
  inviteeName: user.name,
  bankName: tenant?.shortName ?? "AEGIS",
  rawToken,
  expiresAt: newExpiry,
});
```

and hoist the expiry so both the update and the email use one value. Replace the `data` block of the `updateMany` inside `withAuditedMutation`:

```typescript
          data: {
            inviteTokenHash: tokenHash,
            inviteExpiry: newExpiry,
          },
```

declaring it just above the `withAuditedMutation` call:

```typescript
const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
```

- [ ] **Step 11: Keep the Task 2 test off the mail path**

`src/actions/__tests__/accept-invitation.test.ts` imports `user-invitations.ts`, which now pulls in the mailer and, through it, React Email and SES. `acceptInvitation` never sends, so stub the module rather than load it. Add to that file's mock block:

```typescript
vi.mock("@/lib/invitation-mailer", () => ({ sendInvitationEmail: vi.fn() }));
```

- [ ] **Step 12: Run the hygiene test to verify it passes**

```bash
npx -y pnpm@10 exec vitest run src/actions/__tests__/invitation-token-hygiene.test.ts
```

Expected: 3 passed.

- [ ] **Step 13: Run the full suite, lint, and build**

```bash
npx -y pnpm@10 test:unit
npx -y pnpm@10 lint
npx -y pnpm@10 build
```

- [ ] **Step 14: Note the operational consequence in the commit**

SES variables (`AWS_SES_REGION`, `SES_FROM_EMAIL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) are `.optional()` in `src/env.ts`, so a deployment without them boots fine but silently fails to deliver invitations — previously the link at least appeared in the log. The mailer logs `invitation_email_failed` in that case. Confirm those four variables are set in Coolify before this reaches production.

```bash
git add src/emails src/lib/invitation-mailer.ts src/actions/user-invitations.ts src/actions/__tests__/invitation-token-hygiene.test.ts
git commit -m "fix(auth): email invitation links instead of logging live tokens (F02)

Invitation delivery now requires SES configuration; a missing config logs
invitation_email_failed rather than printing a usable link."
```

---

## Task 4: Session boundary re-validates user state (F03)

`getRequiredSession()` casts the Better Auth session to `AuthSession` — promising `tenantId: string` and `roles: Role[]` — without reading the user row. Three consequences: a suspended user keeps access until their session expires; a user with no tenant reaches actions that then defend themselves with `if (!tenantId)` checks the type says are impossible; a user with no roles passes every `hasPermission` call as `false` and lands on redirect loops.

The tenantless case is real and legitimate — Better Auth creates the user at signup and onboarding assigns the tenant afterwards. So `getRequiredSession()` must send tenantless users to `/onboarding`, and everything that serves `/onboarding` must stop calling it. Otherwise the redirect loops: `src/app/(onboarding)/onboarding/page.tsx` calls `requirePermission` → `getRequiredSession`.

**Files:**

- Create: `src/lib/session-guard.ts`
- Modify: `src/data-access/session.ts`
- Modify: `src/lib/guards.ts`
- Modify: `src/app/(onboarding)/onboarding/page.tsx`
- Modify: `src/actions/onboarding.ts`
- Test: `src/lib/__tests__/session-guard.test.ts`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces:
  - `type SessionDecision = { kind: "ok"; tenantId: string; roles: Role[] } | { kind: "revoke"; reason: string } | { kind: "onboard" }`
  - `decideSessionAccess(user: { status: UserStatus; tenantId: string | null; roles: Role[] } | null): SessionDecision`
  - `getOnboardingSession(): Promise<AuthSession & { user: { tenantId: string | null } }>` from `src/data-access/session.ts`
  - `requireOnboardingPermission(permission: Permission)` from `src/lib/guards.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/session-guard.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { decideSessionAccess } from "@/lib/session-guard";
import type { Role } from "@/generated/prisma/enums";

const TENANT = "11111111-1111-4111-8111-111111111111";
const ROLES = ["AUDITOR"] as Role[];

describe("decideSessionAccess", () => {
  it("admits an active, tenanted user with roles", () => {
    expect(
      decideSessionAccess({ status: "ACTIVE", tenantId: TENANT, roles: ROLES }),
    ).toEqual({ kind: "ok", tenantId: TENANT, roles: ROLES });
  });

  it("revokes when the user row is gone", () => {
    expect(decideSessionAccess(null)).toEqual({
      kind: "revoke",
      reason: "MISSING",
    });
  });

  it("revokes a suspended user", () => {
    expect(
      decideSessionAccess({
        status: "SUSPENDED",
        tenantId: TENANT,
        roles: ROLES,
      }),
    ).toEqual({ kind: "revoke", reason: "SUSPENDED" });
  });

  it("revokes an inactive user", () => {
    expect(
      decideSessionAccess({
        status: "INACTIVE",
        tenantId: TENANT,
        roles: ROLES,
      }),
    ).toEqual({ kind: "revoke", reason: "INACTIVE" });
  });

  it("revokes a user still marked INVITED", () => {
    expect(
      decideSessionAccess({
        status: "INVITED",
        tenantId: TENANT,
        roles: ROLES,
      }),
    ).toEqual({ kind: "revoke", reason: "INVITED" });
  });

  it("revokes an active user holding no roles", () => {
    expect(
      decideSessionAccess({ status: "ACTIVE", tenantId: TENANT, roles: [] }),
    ).toEqual({ kind: "revoke", reason: "NO_ROLES" });
  });

  it("sends a tenantless active user to onboarding", () => {
    expect(
      decideSessionAccess({ status: "ACTIVE", tenantId: null, roles: ROLES }),
    ).toEqual({ kind: "onboard" });
  });

  it("sends a user with a malformed tenant id to onboarding", () => {
    expect(
      decideSessionAccess({
        status: "ACTIVE",
        tenantId: "not-a-uuid",
        roles: ROLES,
      }),
    ).toEqual({ kind: "onboard" });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx -y pnpm@10 exec vitest run src/lib/__tests__/session-guard.test.ts
```

Expected: FAIL — `Failed to resolve import "@/lib/session-guard"`.

- [ ] **Step 3: Write the pure decision**

Create `src/lib/session-guard.ts`:

```typescript
import type { Role, UserStatus } from "@/generated/prisma/enums";

/**
 * What to do with a session once the user row behind it has been re-read.
 *
 * Kept pure and separate from the Next.js boundary so the rules are testable
 * without mocking headers, redirects, and Better Auth.
 */
export type SessionDecision =
  | { kind: "ok"; tenantId: string; roles: Role[] }
  | { kind: "revoke"; reason: string }
  | { kind: "onboard" };

/** Matches prismaForTenant's own check, so an admitted tenant is always usable. */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A session cookie is a snapshot taken at sign-in. This re-decides access from
 * the user row as it stands now, so a suspension or a role change takes effect
 * on the next request rather than at session expiry.
 *
 * A tenantless user is onboarding, not hostile: Better Auth creates the user
 * before the onboarding wizard assigns a tenant.
 */
export function decideSessionAccess(
  user: {
    status: UserStatus;
    tenantId: string | null;
    roles: Role[];
  } | null,
): SessionDecision {
  if (!user) {
    return { kind: "revoke", reason: "MISSING" };
  }

  if (user.status !== "ACTIVE") {
    return { kind: "revoke", reason: user.status };
  }

  if (user.roles.length === 0) {
    return { kind: "revoke", reason: "NO_ROLES" };
  }

  if (!user.tenantId || !UUID_REGEX.test(user.tenantId)) {
    return { kind: "onboard" };
  }

  return { kind: "ok", tenantId: user.tenantId, roles: user.roles };
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
npx -y pnpm@10 exec vitest run src/lib/__tests__/session-guard.test.ts
```

Expected: 8 passed.

- [ ] **Step 5: Give onboarding a tenant-optional door before closing the main one**

Steps 5 through 7 have to land together. After this step `getRequiredSession` sends a tenantless user to `/onboarding`, and until Step 7 that route still calls `getRequiredSession` — so the app loops if you stop in between.

In `src/data-access/session.ts`, replace the import block and `getRequiredSession`:

```typescript
import "server-only";
import { cache } from "react";
import { auth } from "@/lib/auth";
import type { AuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { decideSessionAccess } from "@/lib/session-guard";
import type { Role } from "@/generated/prisma/enums";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/** The columns that decide access, re-read on every request. */
const ACCESS_COLUMNS = {
  id: true,
  status: true,
  tenantId: true,
  roles: true,
} as const;

/**
 * Read the session and the current user row behind it.
 *
 * Wrapped in React's cache so the extra query runs once per request even
 * though dashboard pages call getRequiredSession a dozen times.
 */
const loadSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: ACCESS_COLUMNS,
  });

  return { session, user, decision: decideSessionAccess(user) };
});

/** End every session for a user who may no longer hold one. */
async function revokeSessions(userId: string, reason: string) {
  await prisma.session.deleteMany({ where: { userId } });
  logger.warn(
    { action: "session_revoked", userId, reason },
    "Revoked sessions for a user who is no longer active",
  );
}

/**
 * Get authenticated session or redirect to login.
 * MUST be used in all DAL functions and server actions.
 *
 * CRITICAL SECURITY (Skeptic S2):
 * - tenantId MUST come from this session ONLY
 * - NEVER accept tenantId from URL params, request body, or query string
 * - DAL functions accept session object returned by this function
 *
 * The returned tenantId and roles come from the user row, not the cookie, so
 * the AuthSession types are now earned rather than asserted.
 */
export async function getRequiredSession(): Promise<AuthSession> {
  const { session, decision } = await loadSession();

  if (decision.kind === "revoke") {
    await revokeSessions(session.user.id, decision.reason);
    redirect("/login");
  }

  if (decision.kind === "onboard") {
    redirect("/onboarding");
  }

  return {
    ...session,
    user: {
      ...session.user,
      tenantId: decision.tenantId,
      roles: decision.roles,
    },
  } as unknown as AuthSession;
}

/**
 * Session for the onboarding wizard, where a tenant does not exist yet.
 *
 * Applies every check getRequiredSession applies except the tenant one, so the
 * wizard is reachable without the tenant redirect looping back onto itself.
 */
export async function getOnboardingSession(): Promise<
  Omit<AuthSession, "user"> & {
    user: Omit<AuthSession["user"], "tenantId"> & { tenantId: string | null };
  }
> {
  const { session, user, decision } = await loadSession();

  if (decision.kind === "revoke") {
    await revokeSessions(session.user.id, decision.reason);
    redirect("/login");
  }

  return {
    ...session,
    user: {
      ...session.user,
      tenantId: user?.tenantId ?? null,
      roles: (user?.roles ?? []) as Role[],
    },
  } as unknown as Omit<AuthSession, "user"> & {
    user: Omit<AuthSession["user"], "tenantId"> & { tenantId: string | null };
  };
}
```

Leave `getOptionalSession`, `getCurrentTenantId`, `getSessionRoles`, `hasRole`, `hasAnyRole`, and `hasAllRoles` unchanged — they delegate to `getRequiredSession` and inherit the new behavior.

- [ ] **Step 6: Add the onboarding permission guard**

Append to `src/lib/guards.ts`:

```typescript
/**
 * Permission guard for the onboarding wizard.
 *
 * Uses getOnboardingSession because the wizard is the one place a user
 * legitimately has no tenant yet; getRequiredSession would redirect them here,
 * and here would redirect them here again.
 */
export async function requireOnboardingPermission(permission: Permission) {
  const session = await getOnboardingSession();

  if (!hasPermission(session.user.roles, permission)) {
    redirect("/dashboard?unauthorized=true");
  }

  return session;
}
```

and extend the existing session import at the top of the file:

```typescript
import {
  getOnboardingSession,
  getRequiredSession,
} from "@/data-access/session";
```

- [ ] **Step 7: Switch the onboarding page and actions**

In `src/app/(onboarding)/onboarding/page.tsx`, change the import and the first line of the component:

```typescript
import { requireOnboardingPermission } from "@/lib/guards";
```

```typescript
const session = await requireOnboardingPermission("admin:manage_settings");
```

In `src/actions/onboarding.ts`, change the import:

```typescript
import { getOnboardingSession } from "@/data-access/session";
```

and replace all three `const session = await getRequiredSession();` calls — in `saveWizardStep`, `getWizardProgress`, and `completeOnboarding` — with:

```typescript
const session = await getOnboardingSession();
```

Each already guards with `if (!tenantId)`, which is now a reachable branch rather than dead code.

- [ ] **Step 8: Find any other tenantless caller**

```bash
npx -y pnpm@10 exec grep -rn "getRequiredSession" src/actions/onboarding-excel-upload.ts src/app/\(onboarding\)
```

For each hit, decide whether the code needs a tenant. If it does, `getRequiredSession` is correct and the redirect is the right behavior. If it tolerates a null tenant (the template download path does), switch it to `getOnboardingSession`.

- [ ] **Step 9: Run the full suite, lint, and build**

```bash
npx -y pnpm@10 test:unit
npx -y pnpm@10 lint
npx -y pnpm@10 build
```

- [ ] **Step 10: Confirm the E2E fixtures still authenticate**

Every user in `prisma/seed.ts` is created with `status: UserStatus.ACTIVE` and a non-empty `roles` array, so the new checks should be transparent to `tests/auth.setup.ts`. Verify rather than assume:

```bash
npx -y pnpm@10 exec grep -n "status" prisma/seed.ts
```

Expected: every `user.upsert` sets `UserStatus.ACTIVE`. If any seeded user has no roles or no tenant, fix the seed rather than weakening the guard.

- [ ] **Step 11: Commit**

```bash
git add src/lib/session-guard.ts src/lib/__tests__/session-guard.test.ts src/data-access/session.ts src/lib/guards.ts "src/app/(onboarding)/onboarding/page.tsx" src/actions/onboarding.ts
git commit -m "fix(auth): re-validate user status, tenant and roles at the session boundary (F03)"
```

---

## Task 5: Maker-checker rules (F04, part 1 of 3)

`canApproveObservation` exists in `src/lib/permissions.ts:440` and is exercised only by its own unit test. No transition calls it. This task writes the rules the next two tasks enforce.

Two deliberate decisions, both to avoid deadlocking a small UCB:

- **Observations:** the actor must differ from `createdById` for `SUBMITTED→REVIEWED`, `REVIEWED→ISSUED`, and `COMPLIANCE→CLOSED`. Reviewer and issuer are both `AUDIT_MANAGER` by design in `src/lib/state-machine.ts`, so those two acts are _not_ required to differ from each other — only from the maker.
- **Reports:** the actor must differ from `reportReviewedById` for both `REVIEWED→APPROVED` and `APPROVED→ISSUED`. Issuing is restricted to `CAE`, so requiring issuer ≠ approver would make a bank with one CAE unable to issue any report. Requiring issuer ≠ reviewer gets the control — no one person carries a report from review to issue — without the deadlock.

**Files:**

- Create: `src/lib/maker-checker.ts`
- Test: `src/lib/__tests__/maker-checker.test.ts`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces:
  - `type MakerCheckerResult = { allowed: true } | { allowed: false; reason: string }`
  - `checkObservationTransition(from: ObservationStatus, to: ObservationStatus, actorId: string, record: { createdById: string }): MakerCheckerResult`
  - `checkReportTransition(from: string, to: string, actorId: string, record: { reportReviewedById: string | null }): MakerCheckerResult`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/maker-checker.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  checkObservationTransition,
  checkReportTransition,
} from "@/lib/maker-checker";

const MAKER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CHECKER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("checkObservationTransition", () => {
  it("blocks the raiser from reviewing their own observation", () => {
    const result = checkObservationTransition("SUBMITTED", "REVIEWED", MAKER, {
      createdById: MAKER,
    });
    expect(result).toEqual({
      allowed: false,
      reason:
        "You raised this record; a different user must perform this step.",
    });
  });

  it("blocks the raiser from issuing their own observation", () => {
    expect(
      checkObservationTransition("REVIEWED", "ISSUED", MAKER, {
        createdById: MAKER,
      }).allowed,
    ).toBe(false);
  });

  it("blocks the raiser from closing their own observation", () => {
    expect(
      checkObservationTransition("COMPLIANCE", "CLOSED", MAKER, {
        createdById: MAKER,
      }).allowed,
    ).toBe(false);
  });

  it("allows a different user to review", () => {
    expect(
      checkObservationTransition("SUBMITTED", "REVIEWED", CHECKER, {
        createdById: MAKER,
      }),
    ).toEqual({ allowed: true });
  });

  it("allows the raiser to submit their own draft", () => {
    expect(
      checkObservationTransition("DRAFT", "SUBMITTED", MAKER, {
        createdById: MAKER,
      }),
    ).toEqual({ allowed: true });
  });

  it("allows the raiser to mark compliance, which is not an approval", () => {
    expect(
      checkObservationTransition("RESPONSE", "COMPLIANCE", MAKER, {
        createdById: MAKER,
      }),
    ).toEqual({ allowed: true });
  });

  it("allows a return to draft by the reviewer", () => {
    expect(
      checkObservationTransition("SUBMITTED", "DRAFT", CHECKER, {
        createdById: MAKER,
      }),
    ).toEqual({ allowed: true });
  });
});

describe("checkReportTransition", () => {
  it("blocks the reviewer from approving the report they reviewed", () => {
    const result = checkReportTransition("REVIEWED", "APPROVED", MAKER, {
      reportReviewedById: MAKER,
    });
    expect(result).toEqual({
      allowed: false,
      reason:
        "You reviewed this record; a different user must perform this step.",
    });
  });

  it("blocks the reviewer from issuing the report they reviewed", () => {
    expect(
      checkReportTransition("APPROVED", "ISSUED", MAKER, {
        reportReviewedById: MAKER,
      }).allowed,
    ).toBe(false);
  });

  it("allows the approver to also issue, so a single-CAE bank is not stuck", () => {
    expect(
      checkReportTransition("APPROVED", "ISSUED", CHECKER, {
        reportReviewedById: MAKER,
      }),
    ).toEqual({ allowed: true });
  });

  it("allows approval by someone other than the reviewer", () => {
    expect(
      checkReportTransition("REVIEWED", "APPROVED", CHECKER, {
        reportReviewedById: MAKER,
      }),
    ).toEqual({ allowed: true });
  });

  it("imposes nothing when no reviewer is recorded", () => {
    expect(
      checkReportTransition("REVIEWED", "APPROVED", MAKER, {
        reportReviewedById: null,
      }),
    ).toEqual({ allowed: true });
  });

  it("imposes nothing on a rework transition", () => {
    expect(
      checkReportTransition("REVIEWED", "DRAFT", MAKER, {
        reportReviewedById: MAKER,
      }),
    ).toEqual({ allowed: true });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx -y pnpm@10 exec vitest run src/lib/__tests__/maker-checker.test.ts
```

Expected: FAIL — `Failed to resolve import "@/lib/maker-checker"`.

- [ ] **Step 3: Write the rules**

Create `src/lib/maker-checker.ts`:

```typescript
import type { ObservationStatus } from "@/generated/prisma/enums";

export type MakerCheckerResult =
  | { allowed: true }
  | { allowed: false; reason: string };

/** Someone who already acted on this record, named for the refusal message. */
interface PriorAct {
  /** Past-tense verb completing "You ___ this record". */
  verb: string;
  userId: string | null;
}

/**
 * Refuse an actor who already appears earlier in the record's chain.
 *
 * A null userId records a stage nobody has reached yet and imposes nothing.
 */
export function requireDistinctActor(
  actorId: string,
  priorActs: PriorAct[],
): MakerCheckerResult {
  const clash = priorActs.find((act) => act.userId === actorId);

  if (clash) {
    return {
      allowed: false,
      reason: `You ${clash.verb} this record; a different user must perform this step.`,
    };
  }

  return { allowed: true };
}

/**
 * Maker-checker for the observation lifecycle.
 *
 * The person who raised an observation may not carry it through review, issue,
 * or closure. Reviewer and issuer are both AUDIT_MANAGER by design in
 * src/lib/state-machine.ts, so they are not required to differ from one
 * another — only from the maker. RESPONSE→COMPLIANCE is a record of fact
 * rather than an approval and is left alone.
 */
export function checkObservationTransition(
  from: ObservationStatus,
  to: ObservationStatus,
  actorId: string,
  record: { createdById: string },
): MakerCheckerResult {
  const requiresChecker =
    (from === "SUBMITTED" && to === "REVIEWED") ||
    (from === "REVIEWED" && to === "ISSUED") ||
    (from === "COMPLIANCE" && to === "CLOSED");

  if (!requiresChecker) {
    return { allowed: true };
  }

  return requireDistinctActor(actorId, [
    { verb: "raised", userId: record.createdById },
  ]);
}

/**
 * Maker-checker for the report routing workflow.
 *
 * The reviewer may neither approve nor issue. The approver may issue: only CAE
 * can issue, so requiring issuer to differ from approver would leave a bank
 * with a single CAE unable to issue any report at all.
 */
export function checkReportTransition(
  from: string,
  to: string,
  actorId: string,
  record: { reportReviewedById: string | null },
): MakerCheckerResult {
  const requiresChecker =
    (from === "REVIEWED" && to === "APPROVED") ||
    (from === "APPROVED" && to === "ISSUED");

  if (!requiresChecker) {
    return { allowed: true };
  }

  return requireDistinctActor(actorId, [
    { verb: "reviewed", userId: record.reportReviewedById },
  ]);
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
npx -y pnpm@10 exec vitest run src/lib/__tests__/maker-checker.test.ts
```

Expected: 13 passed.

- [ ] **Step 5: Run the full suite and commit**

```bash
npx -y pnpm@10 test:unit
git add src/lib/maker-checker.ts src/lib/__tests__/maker-checker.test.ts
git commit -m "feat(authz): add maker-checker rules for observation and report transitions"
```

---

## Task 6: Enforce maker-checker on observation transitions (F04, part 2 of 3)

`transitionObservation` selects `createdById` and never compares it to the actor. A user holding both `AUDITOR` and `AUDIT_MANAGER` can raise an observation and review it.

The check runs against the `createdById` already read at `src/actions/observations/transition.ts:49-61`. That column is never written after creation, so reading it before the transaction opens is not a time-of-check race. Making the _status_ update atomic is a separate finding (F08) and is out of scope here.

**Files:**

- Modify: `src/actions/observations/transition.ts:86-96`
- Test: `src/actions/observations/__tests__/transition.test.ts`

**Interfaces:**

- Consumes: `checkObservationTransition` (Task 5); `fakeDb`, `fakeSession`, `OBSERVATION_A`, `USER_A`, `USER_B` (Task 1).
- Produces: nothing new.

- [ ] **Step 1: Write the failing test**

Create `src/actions/observations/__tests__/transition.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/data-access/session", () => ({ getRequiredSession: vi.fn() }));
vi.mock("@/data-access/prisma", () => ({ prismaForTenant: vi.fn() }));
vi.mock("@/data-access/audit-context", () => ({ setAuditContext: vi.fn() }));
vi.mock("@/data-access/notifications", () => ({ createNotification: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { transitionObservation } from "../transition";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import {
  OBSERVATION_A,
  USER_A,
  USER_B,
  fakeDb,
  fakeSession,
} from "@/test/factories";

function observationDb(createdById: string) {
  return fakeDb({
    observation: {
      findFirst: vi.fn().mockResolvedValue({
        id: OBSERVATION_A,
        status: "SUBMITTED",
        severity: "MEDIUM",
        version: 1,
        createdById,
      }),
      update: vi.fn().mockResolvedValue({ id: OBSERVATION_A }),
    },
    observationTimeline: { create: vi.fn().mockResolvedValue({}) },
  });
}

const REVIEW_INPUT = {
  observationId: OBSERVATION_A,
  targetStatus: "REVIEWED" as const,
  comment: "Reviewed against the sanction file.",
  version: 1,
};

describe("transitionObservation maker-checker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuses review by the user who raised the observation", async () => {
    vi.mocked(getRequiredSession).mockResolvedValue(
      fakeSession({
        userId: USER_A,
        roles: ["AUDITOR", "AUDIT_MANAGER"],
      }) as never,
    );
    const db = observationDb(USER_A);
    vi.mocked(prismaForTenant).mockReturnValue(db);

    const result = await transitionObservation(REVIEW_INPUT);

    expect(result).toEqual({
      success: false,
      error: "You raised this record; a different user must perform this step.",
    });
    expect(db.observation.update).not.toHaveBeenCalled();
  });

  it("allows review by a different user", async () => {
    vi.mocked(getRequiredSession).mockResolvedValue(
      fakeSession({ userId: USER_B, roles: ["AUDIT_MANAGER"] }) as never,
    );
    const db = observationDb(USER_A);
    vi.mocked(prismaForTenant).mockReturnValue(db);

    const result = await transitionObservation(REVIEW_INPUT);

    expect(result).toEqual({
      success: true,
      data: { id: OBSERVATION_A, newStatus: "REVIEWED" },
    });
    expect(db.observation.update).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx -y pnpm@10 exec vitest run src/actions/observations/__tests__/transition.test.ts
```

Expected: FAIL on the first case — the self-review currently succeeds.

- [ ] **Step 3: Enforce the rule**

In `src/actions/observations/transition.ts`, add the import next to the existing state-machine import:

```typescript
import { checkObservationTransition } from "@/lib/maker-checker";
```

and insert this block immediately after the `if (!transitionResult.allowed) { ... }` block (which ends at `src/actions/observations/transition.ts:86`) and before `// Step 4: Optimistic lock check`:

```typescript
// Step 3b: Maker-checker — the raiser may not review, issue, or close
// their own observation. createdById is immutable after creation, so the
// value read above is still the value inside the transaction.
const makerChecker = checkObservationTransition(
  currentStatus,
  targetStatus,
  session.user.id,
  { createdById: observation.createdById },
);

if (!makerChecker.allowed) {
  return {
    success: false as const,
    error: makerChecker.reason,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx -y pnpm@10 exec vitest run src/actions/observations/__tests__/transition.test.ts
```

Expected: 2 passed.

- [ ] **Step 5: Check the lifecycle E2E spec for a self-review path**

```bash
npx -y pnpm@10 exec grep -n "REVIEWED\|transitionObservation\|Approve" tests/e2e/observation-lifecycle.spec.ts
```

If the spec drives create and review as the same seeded user, that scenario now correctly fails. Fix the spec to use two users rather than relaxing the guard.

- [ ] **Step 6: Run the full suite, lint, and commit**

```bash
npx -y pnpm@10 test:unit
npx -y pnpm@10 lint
git add src/actions/observations
git commit -m "fix(authz): block self-review, self-issue and self-close of observations (F04)"
```

---

## Task 7: Enforce maker-checker on report transitions (F04, part 3 of 3)

`transitionReportStatus` writes `reportReviewedById`, `reportApprovedById`, and `reportIssuedById` but never reads them back to compare. Its `select` does not even fetch them.

**Files:**

- Modify: `src/actions/reports/transition-report.ts:49-62`, `:103-105`
- Test: `src/actions/reports/__tests__/transition-report.test.ts`

**Interfaces:**

- Consumes: `checkReportTransition` (Task 5); `fakeDb`, `fakeSession`, `ENGAGEMENT_A`, `USER_A`, `USER_B` (Task 1).
- Produces: nothing new.

- [ ] **Step 1: Write the failing test**

Create `src/actions/reports/__tests__/transition-report.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/data-access/session", () => ({ getRequiredSession: vi.fn() }));
vi.mock("@/data-access/prisma", () => ({ prismaForTenant: vi.fn() }));
vi.mock("@/data-access/audit-context", () => ({ setAuditContext: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { transitionReportStatus } from "../transition-report";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import {
  ENGAGEMENT_A,
  USER_A,
  USER_B,
  fakeDb,
  fakeSession,
} from "@/test/factories";

function engagementDb(reviewedById: string | null) {
  return fakeDb({
    auditEngagement: {
      findFirst: vi.fn().mockResolvedValue({
        id: ENGAGEMENT_A,
        reportStatus: "REVIEWED",
        bhCertSignedAt: new Date(),
        reportReviewedById: reviewedById,
        reportApprovedById: null,
        observations: [{ id: "obs-1" }],
      }),
      update: vi.fn().mockResolvedValue({ id: ENGAGEMENT_A }),
    },
  });
}

const APPROVE_INPUT = {
  engagementId: ENGAGEMENT_A,
  targetStatus: "APPROVED" as const,
  comments: "Approved for issue.",
};

describe("transitionReportStatus maker-checker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuses approval by the user who reviewed the report", async () => {
    vi.mocked(getRequiredSession).mockResolvedValue(
      fakeSession({ userId: USER_A, roles: ["AUDIT_MANAGER"] }) as never,
    );
    const db = engagementDb(USER_A);
    vi.mocked(prismaForTenant).mockReturnValue(db);

    const result = await transitionReportStatus(APPROVE_INPUT);

    expect(result).toEqual({
      success: false,
      error:
        "You reviewed this record; a different user must perform this step.",
    });
    expect(db.auditEngagement.update).not.toHaveBeenCalled();
  });

  it("allows approval by a different user", async () => {
    vi.mocked(getRequiredSession).mockResolvedValue(
      fakeSession({ userId: USER_B, roles: ["AUDIT_MANAGER"] }) as never,
    );
    const db = engagementDb(USER_A);
    vi.mocked(prismaForTenant).mockReturnValue(db);

    const result = await transitionReportStatus(APPROVE_INPUT);

    expect(result.success).toBe(true);
    expect(db.auditEngagement.update).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx -y pnpm@10 exec vitest run src/actions/reports/__tests__/transition-report.test.ts
```

Expected: FAIL on the first case.

- [ ] **Step 3: Fetch the prior actors**

In `src/actions/reports/transition-report.ts`, extend the `select` on the engagement lookup (`src/actions/reports/transition-report.ts:54-61`):

```typescript
      select: {
        id: true,
        reportStatus: true,
        bhCertSignedAt: true,
        reportReviewedById: true,
        reportApprovedById: true,
        observations: {
          select: { id: true },
        },
      },
```

- [ ] **Step 4: Enforce the rule**

Add the import alongside the schema imports:

```typescript
import { checkReportTransition } from "@/lib/maker-checker";
```

and insert this block immediately after the `if (!hasRequiredRole) { ... }` block (ending at `src/actions/reports/transition-report.ts:103`) and before `// ─── Step 6: Pre-condition checks ───`:

```typescript
// ─── Step 5b: Maker-checker ────────────────────────────────────
// The reviewer may neither approve nor issue. The approver may issue,
// because only CAE can issue and a bank may hold exactly one.
const makerChecker = checkReportTransition(
  currentStatus,
  targetStatus,
  session.user.id,
  { reportReviewedById: engagement.reportReviewedById },
);

if (!makerChecker.allowed) {
  return {
    success: false as const,
    error: makerChecker.reason,
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npx -y pnpm@10 exec vitest run src/actions/reports/__tests__/transition-report.test.ts
```

Expected: 2 passed.

- [ ] **Step 6: Run the full suite, lint, and commit**

```bash
npx -y pnpm@10 test:unit
npx -y pnpm@10 lint
git add src/actions/reports
git commit -m "fix(authz): stop a report reviewer approving or issuing the same report (F04)"
```

---

## Task 8: Branch and team access guards (F05, part 1 of 3)

`BRANCH_HEAD` means "runs a branch", not "runs this branch". Nothing in the codebase turns that distinction into a check — `src/data-access/auditee.ts:33` has `getUserBranches()`, which returns a list callers filter by, but there is no guard that refuses an unassigned branch. Likewise `src/data-access/audit-teams.ts:74` lists team members but nothing asserts membership.

**Files:**

- Create: `src/data-access/access-guards.ts`
- Test: `src/data-access/__tests__/access-guards.test.ts`

**Interfaces:**

- Consumes: `TENANT_A`, `USER_A`, `BRANCH_A`, `ENGAGEMENT_A` (Task 1).
- Produces:
  - `type GuardResult = { ok: true } | { ok: false; error: string }`
  - `type GuardActor = { userId: string; tenantId: string }`
  - `requireBranchAssignment(actor: GuardActor, branchId: string | null): Promise<GuardResult>`
  - `requireTeamMembership(actor: GuardActor, engagementId: string): Promise<GuardResult>`

The guards take `{ userId, tenantId }` rather than a full `AuthSession` so they stay cheap to call and cheap to fake.

- [ ] **Step 1: Write the failing test**

Create `src/data-access/__tests__/access-guards.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({ prismaForTenant: vi.fn() }));

import {
  requireBranchAssignment,
  requireTeamMembership,
} from "../access-guards";
import { prismaForTenant } from "@/lib/prisma";
import {
  TENANT_A,
  USER_A,
  BRANCH_A,
  ENGAGEMENT_A,
  fakeDb,
} from "@/test/factories";

const ACTOR = { userId: USER_A, tenantId: TENANT_A };

describe("requireBranchAssignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("admits a user assigned to the branch", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "assignment-1" });
    vi.mocked(prismaForTenant).mockReturnValue(
      fakeDb({ userBranchAssignment: { findFirst } }),
    );

    expect(await requireBranchAssignment(ACTOR, BRANCH_A)).toEqual({
      ok: true,
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: { userId: USER_A, branchId: BRANCH_A, tenantId: TENANT_A },
      select: { id: true },
    });
  });

  it("refuses a user with no assignment to the branch", async () => {
    vi.mocked(prismaForTenant).mockReturnValue(
      fakeDb({
        userBranchAssignment: { findFirst: vi.fn().mockResolvedValue(null) },
      }),
    );

    expect(await requireBranchAssignment(ACTOR, BRANCH_A)).toEqual({
      ok: false,
      error: "You are not assigned to this branch.",
    });
  });

  it("refuses when the branch cannot be resolved at all", async () => {
    expect(await requireBranchAssignment(ACTOR, null)).toEqual({
      ok: false,
      error:
        "This record is not linked to a branch, so branch access cannot be verified.",
    });
    expect(prismaForTenant).not.toHaveBeenCalled();
  });
});

describe("requireTeamMembership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("admits a member of the engagement's audit team", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "member-1" });
    vi.mocked(prismaForTenant).mockReturnValue(
      fakeDb({ auditTeamMember: { findFirst } }),
    );

    expect(await requireTeamMembership(ACTOR, ENGAGEMENT_A)).toEqual({
      ok: true,
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        engagementId: ENGAGEMENT_A,
        userId: USER_A,
        tenantId: TENANT_A,
      },
      select: { id: true },
    });
  });

  it("refuses a non-member", async () => {
    vi.mocked(prismaForTenant).mockReturnValue(
      fakeDb({
        auditTeamMember: { findFirst: vi.fn().mockResolvedValue(null) },
      }),
    );

    expect(await requireTeamMembership(ACTOR, ENGAGEMENT_A)).toEqual({
      ok: false,
      error: "You are not on the audit team for this engagement.",
    });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx -y pnpm@10 exec vitest run src/data-access/__tests__/access-guards.test.ts
```

Expected: FAIL — `Failed to resolve import "../access-guards"`.

- [ ] **Step 3: Write the guards**

Create `src/data-access/access-guards.ts`:

```typescript
import "server-only";
import { prismaForTenant } from "@/lib/prisma";

export type GuardResult = { ok: true } | { ok: false; error: string };

/** The subject of a guard check, always taken from the authenticated session. */
export interface GuardActor {
  userId: string;
  tenantId: string;
}

/**
 * Require the actor to hold an assignment to this specific branch.
 *
 * A role is tenant-wide: BRANCH_HEAD says "runs a branch", not "runs this
 * branch". An unresolvable branch is refused rather than waved through,
 * because that is precisely the case where scope cannot be proven.
 */
export async function requireBranchAssignment(
  actor: GuardActor,
  branchId: string | null,
): Promise<GuardResult> {
  if (!branchId) {
    return {
      ok: false,
      error:
        "This record is not linked to a branch, so branch access cannot be verified.",
    };
  }

  const db = prismaForTenant(actor.tenantId);
  const assignment = await db.userBranchAssignment.findFirst({
    where: { userId: actor.userId, branchId, tenantId: actor.tenantId },
    select: { id: true },
  });

  return assignment
    ? { ok: true }
    : { ok: false, error: "You are not assigned to this branch." };
}

/** Require the actor to be on the engagement's audit team. */
export async function requireTeamMembership(
  actor: GuardActor,
  engagementId: string,
): Promise<GuardResult> {
  const db = prismaForTenant(actor.tenantId);
  const membership = await db.auditTeamMember.findFirst({
    where: { engagementId, userId: actor.userId, tenantId: actor.tenantId },
    select: { id: true },
  });

  return membership
    ? { ok: true }
    : {
        ok: false,
        error: "You are not on the audit team for this engagement.",
      };
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
npx -y pnpm@10 exec vitest run src/data-access/__tests__/access-guards.test.ts
```

Expected: 5 passed.

- [ ] **Step 5: Run the full suite and commit**

The discipline test scans `src/data-access` — this file performs reads only, so it will not be flagged.

```bash
npx -y pnpm@10 test:unit
npx -y pnpm@10 lint
git add src/data-access/access-guards.ts src/data-access/__tests__/access-guards.test.ts
git commit -m "feat(authz): add branch-assignment and audit-team guards"
```

---

## Task 9: Scope branch responses to the actor's branch (F05, part 2 of 3)

`submitBranchResponse` checks the `compliance:branch_response` permission and the tenant, so any `BRANCH_HEAD` or `AUDITEE` in the bank can respond on behalf of any branch. The compliance item's branch is resolved from `ComplianceItem.branchId`, falling back to the parent observation's branch when the denormalised column is null.

**Files:**

- Modify: `src/actions/compliance/submit-branch-response.ts:40-74`
- Test: `src/actions/compliance/__tests__/submit-branch-response.test.ts` (extend from Task 1)

**Interfaces:**

- Consumes: `requireBranchAssignment` (Task 8); the Task 1 harness.
- Produces: nothing new.

- [ ] **Step 1: Add the failing cases**

In `src/actions/compliance/__tests__/submit-branch-response.test.ts`, add the guard mock to the top block:

```typescript
vi.mock("@/data-access/access-guards", () => ({
  requireBranchAssignment: vi.fn(),
}));
```

add to the imports:

```typescript
import { requireBranchAssignment } from "@/data-access/access-guards";
```

set the default in `beforeEach` so the existing success case keeps passing:

```typescript
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireBranchAssignment).mockResolvedValue({ ok: true });
});
```

and append these cases inside the `describe`:

```typescript
it("refuses a branch head acting on a branch they are not assigned to", async () => {
  vi.mocked(getRequiredSession).mockResolvedValue(
    fakeSession({ roles: ["BRANCH_HEAD"] }) as never,
  );
  vi.mocked(requireBranchAssignment).mockResolvedValue({
    ok: false,
    error: "You are not assigned to this branch.",
  });
  const update = vi.fn();
  vi.mocked(prismaForTenant).mockReturnValue(
    fakeDb({
      complianceItem: {
        findFirst: vi.fn().mockResolvedValue({
          id: COMPLIANCE_ITEM_A,
          status: "OPEN",
          branchId: BRANCH_B,
          observation: { branchId: BRANCH_B },
        }),
        update,
      },
    }),
  );

  const result = await submitBranchResponse(VALID_INPUT);

  expect(result).toEqual({
    success: false,
    error: "You are not assigned to this branch.",
  });
  expect(update).not.toHaveBeenCalled();
});

it("falls back to the observation's branch when the item has none", async () => {
  vi.mocked(getRequiredSession).mockResolvedValue(
    fakeSession({ roles: ["BRANCH_HEAD"] }) as never,
  );
  vi.mocked(prismaForTenant).mockReturnValue(
    fakeDb({
      complianceItem: {
        findFirst: vi.fn().mockResolvedValue({
          id: COMPLIANCE_ITEM_A,
          status: "OPEN",
          branchId: null,
          observation: { branchId: BRANCH_A },
        }),
        update: vi.fn().mockResolvedValue({ id: COMPLIANCE_ITEM_A }),
      },
    }),
  );

  await submitBranchResponse(VALID_INPUT);

  expect(requireBranchAssignment).toHaveBeenCalledWith(
    { userId: USER_A, tenantId: TENANT_A },
    BRANCH_A,
  );
});
```

and extend the factory import:

```typescript
import {
  BRANCH_A,
  BRANCH_B,
  COMPLIANCE_ITEM_A,
  TENANT_A,
  USER_A,
  fakeDb,
  fakeSession,
} from "@/test/factories";
```

- [ ] **Step 2: Run the tests to verify the new cases fail**

```bash
npx -y pnpm@10 exec vitest run src/actions/compliance/__tests__/submit-branch-response.test.ts
```

Expected: 3 passed, 2 failed.

- [ ] **Step 3: Resolve the branch and guard before mutating**

In `src/actions/compliance/submit-branch-response.ts`, add the import:

```typescript
import { requireBranchAssignment } from "@/data-access/access-guards";
```

Then replace the body from `const db = prismaForTenant(tenantId);` down to the end of the `try` block's transaction with a two-phase version: resolve and authorize first, mutate second.

```typescript
  const db = prismaForTenant(tenantId);

  try {
    // Resolve the branch before authorizing. ComplianceItem.branchId is a
    // denormalised copy and may be null on older rows, so fall back to the
    // observation that produced the item.
    const item = await db.complianceItem.findFirst({
      where: { id: parsed.data.complianceItemId, tenantId },
      select: {
        id: true,
        status: true,
        branchId: true,
        observation: { select: { branchId: true } },
      },
    });

    if (!item) {
      return { success: false as const, error: "Compliance item not found" };
    }

    const branchGuard = await requireBranchAssignment(
      { userId: session.user.id, tenantId },
      item.branchId ?? item.observation?.branchId ?? null,
    );

    if (!branchGuard.ok) {
      return { success: false as const, error: branchGuard.error };
    }

    const result = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "compliance.branch_response_submitted",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Re-read inside the transaction: status is the part that can change
      // between the authorization read and the write.
      const current = await tx.complianceItem.findFirst({
        where: { id: item.id, tenantId },
        select: { id: true, status: true },
      });

      if (!current) {
        throw new Error("Compliance item not found");
      }

      if (
        current.status !== "OPEN" &&
        current.status !== "BRANCH_RESPONSE_DUE"
      ) {
        throw new Error("Can only respond to open compliance items");
      }

      return tx.complianceItem.update({
        where: { id: current.id },
        data: {
          branchResponseText: parsed.data.responseText,
          branchResponseDate: new Date(),
          branchResponseEvidence: parsed.data.evidenceS3Keys || [],
          status: "BRANCH_RESPONSE_SUBMITTED",
        },
      });
    });
```

Leave the `revalidatePath` calls, the success return, and the `catch` block below it unchanged.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx -y pnpm@10 exec vitest run src/actions/compliance/__tests__/submit-branch-response.test.ts
```

Expected: 5 passed. The Task 1 success case still passes because `fakeDb` returns the same model map inside `$transaction`, so the re-read hits the same `findFirst` double.

- [ ] **Step 5: Check that branch heads are actually assigned in seed data**

This guard refuses anyone with no `UserBranchAssignment` row. If seeded or production branch heads have none, the feature stops working for them — which is the correct refusal, but it must be a known one, not a surprise.

```bash
npx -y pnpm@10 exec grep -n "userBranchAssignment\|BRANCH_HEAD" prisma/seed.ts scripts/seed-full-audit-lifecycle.ts
```

If the lifecycle seed creates a `BRANCH_HEAD` with no assignment, add the assignment to the seed.

- [ ] **Step 6: Run the full suite, lint, and commit**

```bash
npx -y pnpm@10 test:unit
npx -y pnpm@10 lint
git add src/actions/compliance
git commit -m "fix(authz): require a branch assignment to submit a branch response (F05)"
```

---

## Task 10: Scope BH certificate signing (F05, part 3 of 3)

`signBhCertificate` requires only the `BRANCH_HEAD` role, so any branch head in the bank can sign any engagement's certificate. `countersignBhCertificate` requires only `LEAD_AUDITOR` or `AUDIT_MANAGER`, with no link to the engagement and no check that the countersigner is not the signer.

`AUDIT_MANAGER` is deliberately exempt from the team-membership requirement: it is a tenant-wide oversight role and managers are not enrolled in `AuditTeamMember`. `LEAD_AUDITOR` is not exempt — it is an engagement role.

**Files:**

- Modify: `src/actions/audit-execution/bh-certificate.ts:30-133`, `:149-262`
- Test: `src/actions/audit-execution/__tests__/bh-certificate.test.ts`

**Interfaces:**

- Consumes: `requireBranchAssignment`, `requireTeamMembership` (Task 8); the Task 1 harness.
- Produces: nothing new.

- [ ] **Step 1: Write the failing test**

Create `src/actions/audit-execution/__tests__/bh-certificate.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/data-access/session", () => ({ getRequiredSession: vi.fn() }));
vi.mock("@/data-access/prisma", () => ({ prismaForTenant: vi.fn() }));
vi.mock("@/data-access/audit-context", () => ({ setAuditContext: vi.fn() }));
vi.mock("@/data-access/access-guards", () => ({
  requireBranchAssignment: vi.fn(),
  requireTeamMembership: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { signBhCertificate, countersignBhCertificate } from "../bh-certificate";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import {
  requireBranchAssignment,
  requireTeamMembership,
} from "@/data-access/access-guards";
import {
  BRANCH_A,
  ENGAGEMENT_A,
  USER_A,
  USER_B,
  fakeDb,
  fakeSession,
} from "@/test/factories";

const SIGN_INPUT = {
  engagementId: ENGAGEMENT_A,
  comments: "Records verified.",
};

describe("signBhCertificate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireBranchAssignment).mockResolvedValue({ ok: true });
  });

  it("refuses a branch head from another branch", async () => {
    vi.mocked(getRequiredSession).mockResolvedValue(
      fakeSession({ roles: ["BRANCH_HEAD"] }) as never,
    );
    vi.mocked(requireBranchAssignment).mockResolvedValue({
      ok: false,
      error: "You are not assigned to this branch.",
    });
    const updateMany = vi.fn();
    vi.mocked(prismaForTenant).mockReturnValue(
      fakeDb({
        auditEngagement: {
          findFirst: vi.fn().mockResolvedValue({
            id: ENGAGEMENT_A,
            branchId: BRANCH_A,
            bhCertSignedAt: null,
          }),
          updateMany,
        },
      }),
    );

    const result = await signBhCertificate(SIGN_INPUT);

    expect(result).toEqual({
      success: false,
      error: "You are not assigned to this branch.",
    });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("allows the assigned branch head to sign", async () => {
    vi.mocked(getRequiredSession).mockResolvedValue(
      fakeSession({ roles: ["BRANCH_HEAD"] }) as never,
    );
    const signedAt = new Date();
    vi.mocked(prismaForTenant).mockReturnValue(
      fakeDb({
        auditEngagement: {
          // First call authorizes against an unsigned engagement; the second,
          // inside the transaction, reads back the timestamp just written.
          findFirst: vi
            .fn()
            .mockResolvedValueOnce({
              id: ENGAGEMENT_A,
              branchId: BRANCH_A,
              bhCertSignedAt: null,
            })
            .mockResolvedValue({ id: ENGAGEMENT_A, bhCertSignedAt: signedAt }),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      }),
    );

    const result = await signBhCertificate(SIGN_INPUT);

    expect(result.success).toBe(true);
  });
});

describe("countersignBhCertificate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireTeamMembership).mockResolvedValue({ ok: true });
  });

  function signedEngagement(signedById: string) {
    return fakeDb({
      auditEngagement: {
        findFirst: vi.fn().mockResolvedValue({
          id: ENGAGEMENT_A,
          bhCertSignedAt: new Date(),
          bhCertSignedById: signedById,
          bhCertCountersignedAt: null,
        }),
        update: vi.fn().mockResolvedValue({
          id: ENGAGEMENT_A,
          bhCertCountersignedAt: new Date(),
        }),
      },
    });
  }

  it("refuses a lead auditor who is not on the engagement team", async () => {
    vi.mocked(getRequiredSession).mockResolvedValue(
      fakeSession({ userId: USER_B, roles: ["LEAD_AUDITOR"] }) as never,
    );
    vi.mocked(requireTeamMembership).mockResolvedValue({
      ok: false,
      error: "You are not on the audit team for this engagement.",
    });
    vi.mocked(prismaForTenant).mockReturnValue(signedEngagement(USER_A));

    const result = await countersignBhCertificate({
      engagementId: ENGAGEMENT_A,
    });

    expect(result).toEqual({
      success: false,
      error: "You are not on the audit team for this engagement.",
    });
  });

  it("does not require team membership from an audit manager", async () => {
    vi.mocked(getRequiredSession).mockResolvedValue(
      fakeSession({ userId: USER_B, roles: ["AUDIT_MANAGER"] }) as never,
    );
    vi.mocked(prismaForTenant).mockReturnValue(signedEngagement(USER_A));

    const result = await countersignBhCertificate({
      engagementId: ENGAGEMENT_A,
    });

    expect(result.success).toBe(true);
    expect(requireTeamMembership).not.toHaveBeenCalled();
  });

  it("refuses the signer countersigning their own certificate", async () => {
    vi.mocked(getRequiredSession).mockResolvedValue(
      fakeSession({
        userId: USER_A,
        roles: ["BRANCH_HEAD", "AUDIT_MANAGER"],
      }) as never,
    );
    vi.mocked(prismaForTenant).mockReturnValue(signedEngagement(USER_A));

    const result = await countersignBhCertificate({
      engagementId: ENGAGEMENT_A,
    });

    expect(result).toEqual({
      success: false,
      error:
        "You signed this certificate; a different user must countersign it.",
    });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx -y pnpm@10 exec vitest run src/actions/audit-execution/__tests__/bh-certificate.test.ts
```

Expected: FAIL — the branch guard, the team guard, and the distinct-signer check do not exist.

- [ ] **Step 3: Guard the signing path**

In `src/actions/audit-execution/bh-certificate.ts`, add the import:

```typescript
import {
  requireBranchAssignment,
  requireTeamMembership,
} from "@/data-access/access-guards";
```

In `signBhCertificate`, replace everything from `// ─── Step 5: Transaction (Atomic Operation) ───` through the end of the transaction's engagement lookup with an authorization phase followed by the transaction:

```typescript
  // ─── Step 5: Resolve the engagement and authorize the branch ───
  try {
    const engagement = await db.auditEngagement.findFirst({
      where: { id: validated.engagementId, tenantId },
      select: { id: true, branchId: true, bhCertSignedAt: true },
    });

    if (!engagement) {
      throw new Error("Engagement not found");
    }

    if (engagement.bhCertSignedAt) {
      throw new Error("BH Certificate has already been signed");
    }

    // The BRANCH_HEAD role is tenant-wide; the certificate is not.
    const branchGuard = await requireBranchAssignment(
      { userId: session.user.id, tenantId },
      engagement.branchId,
    );

    if (!branchGuard.ok) {
      return { success: false as const, error: branchGuard.error };
    }

    // ─── Step 6: Transaction (Atomic Operation) ────────────────────
    const result = await db.$transaction(async (tx: any) => {
      // Set audit context for AuditLog trigger
      await setAuditContext(tx, {
        actionType: "bh_certificate.signed",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Update engagement with signature, predicated on it still being
      // unsigned so two branch heads cannot both claim the signature.
      const signed = await tx.auditEngagement.updateMany({
        where: {
          id: validated.engagementId,
          tenantId,
          bhCertSignedAt: null,
        },
        data: {
          bhCertSignedById: session.user.id,
          bhCertSignedAt: new Date(),
          bhCertComments: validated.comments,
        },
      });

      if (signed.count !== 1) {
        throw new Error("BH Certificate has already been signed");
      }

      const updated = await tx.auditEngagement.findFirst({
        where: { id: validated.engagementId, tenantId },
        select: { id: true, bhCertSignedAt: true },
      });

      return {
        signedAt: updated!.bhCertSignedAt!,
        signedBy: session.user.name,
      };
    });
```

Leave the `revalidatePath`, success return, and `catch` block that follow unchanged.

- [ ] **Step 4: Guard the countersigning path**

In `countersignBhCertificate`, insert the following immediately after `const validated = parsed.data;` (`src/actions/audit-execution/bh-certificate.ts:177`) and before the `// ─── Step 4: Tenant-Scoped Database ───` banner. It has to sit below input validation, because it needs `validated.engagementId`:

```typescript
// LEAD_AUDITOR is an engagement role and must be on this engagement's team.
// AUDIT_MANAGER is a tenant-wide oversight role and is not enrolled in
// AuditTeamMember, so it is exempt.
if (!userRoles.includes("AUDIT_MANAGER")) {
  const teamGuard = await requireTeamMembership(
    { userId: session.user.id, tenantId: session.user.tenantId },
    validated.engagementId,
  );

  if (!teamGuard.ok) {
    return { success: false as const, error: teamGuard.error };
  }
}
```

Then extend the `select` inside the transaction's engagement lookup:

```typescript
        select: {
          id: true,
          bhCertSignedAt: true,
          bhCertSignedById: true,
          bhCertCountersignedAt: true,
        },
```

and add the distinct-actor check immediately after the existing `if (engagement.bhCertCountersignedAt) { ... }` block:

```typescript
// A user holding both BRANCH_HEAD and AUDIT_MANAGER could otherwise sign
// and countersign the same certificate.
if (engagement.bhCertSignedById === session.user.id) {
  throw new Error(
    "You signed this certificate; a different user must countersign it.",
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npx -y pnpm@10 exec vitest run src/actions/audit-execution/__tests__/bh-certificate.test.ts
```

Expected: 5 passed.

- [ ] **Step 6: Run the full suite, lint, build, and commit**

```bash
npx -y pnpm@10 test:unit
npx -y pnpm@10 lint
npx -y pnpm@10 build
git add src/actions/audit-execution
git commit -m "fix(authz): scope BH certificate signing to branch, team and a distinct signer (F05)"
```

---

## Task 11: Account examination writes require a write permission (F06)

`saveAccountExamResponse` gates on `audit_execution:read`, which `CAE`, `CEO`, `ZONAL_AUDITOR`, and every auditor role hold — so read-only roles can write examination results. It also never checks that the caller is on the engagement's audit team, and never validates that `questionId` belongs to the tenant or to the module the sampled account was drawn from, so an unrelated question can be attached to any account.

`examination:respond` is held by `LEAD_AUDITOR`, `FIELD_AUDITOR`, `CONCURRENT_AUDITOR`, and `IS_AUDITOR` — the roles that actually examine. **This intentionally removes write access from `CAE`,** which holds `examination:read` only.

**Files:**

- Modify: `src/actions/account-examination/save-response.ts:33-115`
- Test: `src/actions/account-examination/__tests__/save-response.test.ts`

**Interfaces:**

- Consumes: `requireTeamMembership` (Task 8); the Task 1 harness.
- Produces: nothing new.

- [ ] **Step 1: Write the failing test**

Create `src/actions/account-examination/__tests__/save-response.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx -y pnpm@10 exec vitest run src/actions/account-examination/__tests__/save-response.test.ts
```

Expected: FAIL — the CAE currently succeeds and no question or team check exists.

- [ ] **Step 3: Require the write permission**

In `src/actions/account-examination/save-response.ts`, add the import:

```typescript
import { requireTeamMembership } from "@/data-access/access-guards";
```

Replace the permission check (`src/actions/account-examination/save-response.ts:53-59`):

```typescript
// 2. Permission check — recording a result is a write, not a read
if (!hasPermission(userRoles, "examination:respond")) {
  return {
    success: false,
    error: "You do not have permission to record examination responses.",
  };
}
```

and update the doc comment above the function so it matches:

```
 * Security:
 * - Requires "examination:respond" — recording a result is a write
 * - Requires membership of the engagement's audit team
 * - Verifies engagement belongs to tenant and is in a scoring-allowed status
 * - Verifies loanAccount belongs to the same engagement and tenant
 * - Verifies the question belongs to the tenant and the account's module
```

- [ ] **Step 4: Require team membership and validate the question**

Immediately after the `SCORING_ALLOWED_STATUSES` check (ending at `src/actions/account-examination/save-response.ts:93`), insert:

```typescript
// Holding an examiner role is not the same as being on this engagement.
const teamGuard = await requireTeamMembership(
  { userId, tenantId },
  engagementId,
);

if (!teamGuard.ok) {
  return { success: false, error: teamGuard.error };
}
```

Extend the loan account `select` to carry the module:

```typescript
      select: { id: true, isSampled: true, moduleCode: true },
```

and insert the question check after the `isSampled` check, before the upsert:

```typescript
// 5b. Verify the question belongs to this tenant and to the module the
// sampled account was drawn from. AccountExamResponse.questionId is a bare
// foreign key, so nothing else stops an unrelated question being attached.
const question = await db.examinationQuestion.findFirst({
  where: {
    id: questionId,
    tenantId,
    moduleCode: loanAccount.moduleCode,
    isActive: true,
  },
  select: { id: true },
});

if (!question) {
  return {
    success: false,
    error: "Question not found for this account's module.",
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npx -y pnpm@10 exec vitest run src/actions/account-examination/__tests__/save-response.test.ts
```

Expected: 4 passed.

- [ ] **Step 6: Align the UI with the new permission**

The examination UI may still gate its save control on `audit_execution:read`, which would show a control that now always fails.

```bash
npx -y pnpm@10 exec grep -rn "saveAccountExamResponse\|audit_execution:read" src/app src/components
```

For every call site that renders a save control, switch the gate to `examination:respond`. Do not change the server check to match the UI.

- [ ] **Step 7: Run the full suite, lint, build, and commit**

```bash
npx -y pnpm@10 test:unit
npx -y pnpm@10 lint
npx -y pnpm@10 build
git add src/actions/account-examination src/app src/components
git commit -m "fix(authz): require examination:respond, team membership and an in-module question (F06)

CAE holds examination:read only and can no longer record responses."
```

---

## Final verification

- [ ] **Step 1: Full local gate**

```bash
npx -y pnpm@10 test:unit
npx -y pnpm@10 lint
npx -y pnpm@10 build
```

- [ ] **Step 2: Confirm the audited-mutation discipline test still holds its line**

```bash
npx -y pnpm@10 exec vitest run src/data-access/__tests__/audited-mutation-discipline.test.ts
```

Expected: 4 passed, including `keeps the allowlist shrinking, never growing`. This plan adds `src/data-access/access-guards.ts` (reads only) and `src/lib/invitation-mailer.ts` (outside the scanned roots), neither of which mutates an audited table.

- [ ] **Step 3: E2E against a seeded database**

```bash
npx -y pnpm@10 db:push
npx -y pnpm@10 db:seed
npx -y pnpm@10 test:e2e
```

Three suites are the ones this work can plausibly break, and each failure mode is a real behavior change rather than a defect: `observation-lifecycle` (self-review now refused), any compliance-response flow (branch assignment now required), and any account-examination flow (`examination:respond` now required). Fix the fixtures, not the guards.

- [ ] **Step 4: Open a pull request; do not merge**

CI runs on the merge ref, so the check reflects the branch combined with `main` at that moment. Merging to `main` deploys to production immediately.

```bash
git push -u origin fix/identity-authorization-f01-f06
gh pr create --title "Close identity and authorization findings F01-F06" --body "$(cat <<'BODY'
Implements the guards from the AEGIS brownfield review, findings F01 through F06.

- F01 invitation activation now writes a Better Auth credential account, hashed through auth.$context, in the same transaction as activation.
- F02 invitation links are emailed through SES; no token or token-bearing URL reaches a log.
- F03 the session boundary re-reads user status, tenant, and roles per request, revokes sessions for non-active users, and routes tenantless users to onboarding through a new tenant-optional session.
- F04 maker-checker is enforced: an observation's raiser cannot review, issue, or close it; a report's reviewer cannot approve or issue it.
- F05 branch responses and BH certificate signing require a matching branch assignment; countersigning requires audit-team membership for LEAD_AUDITOR and a signer distinct from the countersigner.
- F06 account examination writes require examination:respond, audit-team membership, and a tenant- and module-scoped question.

Behavior changes worth a second look before merge:
- CAE can no longer record account examination responses (holds examination:read only).
- Branch heads with no UserBranchAssignment row can no longer respond or sign.
- Invitation delivery now depends on SES configuration in Coolify; a missing config logs invitation_email_failed instead of printing a usable link.
BODY
)"
```

- [ ] **Step 5: Report the deployment prerequisite**

Before this is merged, confirm with the operator that `AWS_SES_REGION`, `SES_FROM_EMAIL`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` are set on Coolify app `nil0nfvohfrgehgjxdv1g2xc`. They are `.optional()` in `src/env.ts`, so their absence does not block boot — it silently breaks invitations, which previously fell back to a log line.
