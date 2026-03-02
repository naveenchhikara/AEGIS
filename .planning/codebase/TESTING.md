# Testing Patterns

**Analysis Date:** 2026-03-02

## Test Framework

**Runner:**

- Vitest 4.0.18
- Config: `vitest.config.ts`
- Environment: node (not jsdom)
- Include pattern: `src/**/__tests__/**/*.test.ts`

**Assertion Library:**

- Vitest built-in `expect()` from `vitest` package

**Run Commands:**

```bash
pnpm test:unit              # Run all tests
pnpm test:coverage          # Run with coverage report
pnpm test:e2e              # Run Playwright E2E tests
pnpm test:e2e:ui           # Run E2E with Playwright UI
```

## Test File Organization

**Location:**

- **Unit/Integration tests:** Co-located in `__tests__` subdirectory parallel to source
  - `src/lib/__tests__/rbia-scoring-engine.test.ts` tests `src/lib/rbia-scoring-engine.ts`
  - `src/services/risk-rating/__tests__/compute.test.ts` tests `src/services/risk-rating/compute.ts`
  - `src/data-access/__tests__/tenant-isolation.test.ts` tests DAL patterns

- **E2E tests:** Separate directory
  - `tests/e2e/observation-lifecycle.spec.ts`
  - `tests/e2e/permission-guards.spec.ts`
  - Auth setup: `tests/auth.setup.ts`

**Naming:**

- Unit/integration: `.test.ts` suffix
- E2E: `.spec.ts` suffix
- Setup files: `*.setup.ts`

## Test Structure

**Suite Organization:**

```typescript
import { describe, it, expect } from "vitest";

// ─── Helper functions / fixtures ──────────────────────────────────────────
function leaf(
  id: string,
  scoreLabel: ScoredNode["scoreLabel"],
  weight = 1,
  isCritical = false,
): ScoredNode {
  return {
    nodeId: id,
    code: id,
    weight,
    isCritical,
    isLeaf: true,
    scoreLabel,
    children: [],
  };
}

// ─── Test suites ──────────────────────────────────────────────────────────
describe("SCORE_VALUES", () => {
  it("FULLY_COMPLIANT = 1.0", () => {
    expect(SCORE_VALUES.FULLY_COMPLIANT).toBe(1.0);
  });

  it("LARGELY_COMPLIANT = 0.75", () => {
    expect(SCORE_VALUES.LARGELY_COMPLIANT).toBe(0.75);
  });
});

describe("computeNodeScore", () => {
  it("1. Single leaf FULLY_COMPLIANT returns score 1.0", () => {
    const node = leaf("n1", "FULLY_COMPLIANT");
    expect(computeNodeScore(node)).toEqual({
      score: 1.0,
      hasCriticalNonCompliant: false,
    });
  });

  it("2. Single leaf NON_COMPLIANT returns score 0.0", () => {
    const node = leaf("n2", "NON_COMPLIANT");
    expect(computeNodeScore(node)).toEqual({
      score: 0.0,
      hasCriticalNonCompliant: false,
    });
  });
});
```

**Patterns:**

- **Setup fixtures** at top of file (functions that create test data)
- **Nested `describe()` blocks** to group related tests
- **Numbered test descriptions** for sequential/related tests (e.g., "1. Single leaf...", "2. Array of...", "3. Critical item...")
- **Explicit assertions** — test one thing per test, but use `.toEqual()` for objects
- **No hooks** — avoid `beforeEach`, `afterEach` for unit tests (use fixtures instead)

## Mocking

**Framework:** None explicitly configured; use Jest-compatible mocks

**Patterns:**

```typescript
// No mocking in most unit tests — test pure functions directly
// Example: RBIA scoring engine tests don't mock, just pass data

// For file I/O (tenant isolation test):
import { readFileSync, readdirSync } from "fs";
const content = readFileSync(join(DAL_DIR, filename), "utf-8");

// For static analysis (tenant isolation test):
function hasDbQuery(content: string): boolean {
  return /\.(findMany|findFirst|findUnique|count|aggregate)\b/.test(content);
}
```

**What to Mock:**

- External APIs (AWS S3, SES) — **not in current unit tests**
- File system calls in some security tests — use real file I/O for integration tests
- Time-dependent operations — use fixed dates instead

**What NOT to Mock:**

- Pure business logic functions (RBIA scoring, permission checks)
- Zod validation (use real schema)
- Helper functions (test real behavior)
- Prisma schema structure (test against schema, not mock DB)

## Fixtures and Factories

**Test Data:**

```typescript
// Fixture factory pattern (from rbia-scoring-engine.test.ts)
function leaf(
  id: string,
  scoreLabel: ScoredNode["scoreLabel"],
  weight = 1,
  isCritical = false,
): ScoredNode {
  return {
    nodeId: id,
    code: id,
    weight,
    isCritical,
    isLeaf: true,
    scoreLabel,
    children: [],
  };
}

function parent(id: string, children: ScoredNode[], weight = 1): ScoredNode {
  return {
    nodeId: id,
    code: id,
    weight,
    isCritical: false,
    isLeaf: false,
    scoreLabel: null,
    children,
  };
}

// Usage
const node = parent("root", [
  leaf("n1", "FULLY_COMPLIANT"),
  leaf("n2", "NON_COMPLIANT"),
]);
```

**Location:**

- Fixtures defined **at top of test file** (after imports, before describe blocks)
- Helpers for **logical grouping** (parent/leaf builders for tree structures)
- **Domain-specific factories** in test file itself (not separate factory files)

## Coverage

**Requirements:** No hard coverage threshold enforced

**View Coverage:**

```bash
pnpm test:coverage
```

**Coverage config** (vitest.config.ts):

```typescript
coverage: {
  provider: "v8",
  include: ["src/lib/**/*.ts", "src/services/**/*.ts"],
  exclude: ["src/lib/__tests__/**", "src/services/**/__tests__/**"],
  reporter: ["text", "text-summary"],
}
```

**Target areas:**

- Business logic engines: `src/lib/rbia-scoring-engine.ts`, `src/lib/permissions.ts`
- Services: `src/services/risk-rating/compute.ts`
- Skip: UI components, API routes, pages

## Test Types

**Unit Tests:**

- **Scope:** Pure functions with no side effects
- **Examples:**
  - `src/lib/__tests__/rbia-scoring-engine.test.ts` — RBIA 4-point scoring logic
  - `src/lib/__tests__/permissions.test.ts` — RBAC permission checks
  - `src/lib/__tests__/state-machine.test.ts` — State machine transitions
  - `src/lib/__tests__/instance-scoring.test.ts` — Examination item scoring
  - `src/services/risk-rating/__tests__/compute.test.ts` — Risk rating computation
- **Approach:** Pass input, assert output; no mocking, no DB

**Integration Tests:**

- **Scope:** DAL functions with static analysis (no running DB)
- **Examples:**
  - `src/data-access/__tests__/tenant-isolation.test.ts` — Scans DAL files for tenant isolation patterns
- **Approach:** File I/O, regex analysis of source code

**E2E Tests:**

- **Framework:** Playwright 1.58.2
- **Scope:** Full user workflows (login, navigate, submit forms, verify UI)
- **Examples:**
  - `tests/e2e/observation-lifecycle.spec.ts` — Create, edit, close observations
  - `tests/e2e/permission-guards.spec.ts` — Permission-based access control
- **Setup:** `tests/auth.setup.ts` — Pre-authenticates 5 test users, saves storageState
- **Run:** `pnpm test:e2e` (headless) or `pnpm test:e2e:ui` (Playwright UI)

## E2E Test Setup

**Authentication Setup** (`tests/auth.setup.ts`):

```typescript
import { test as setup } from "@playwright/test";

const TEST_PASSWORD = "TestPassword123!";

const users = [
  {
    role: "auditor",
    email: "suresh.patil@apexbank.example",
    password: TEST_PASSWORD,
    file: "playwright/.auth/auditor.json",
  },
  {
    role: "manager",
    email: "priya.sharma@apexbank.example",
    password: TEST_PASSWORD,
    file: "playwright/.auth/manager.json",
  },
  // ... more roles
];

for (const user of users) {
  setup(`authenticate as ${user.role}`, async ({ page }) => {
    await page.goto("/login");
    await page.waitForSelector("input#email", { timeout: 15000 });
    await page.fill("input#email", user.email);
    await page.fill("input#password", user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard**", { timeout: 15000 });
    await page.context().storageState({ path: user.file });
    console.log(`✓ ${user.role} (${user.email})`);
  });
}
```

**Key points:**

- Test users pre-seeded in DB via `prisma/seed.ts` — emails and password must match exactly
- StorageState (cookies + localStorage) saved to `playwright/.auth/{role}.json`
- E2E tests use `@auth/{role}` in `@playwright/test` config to load storageState
- Wait for form hydration: `await page.waitForSelector("input#email", { timeout: 15000 })`
- Fill by ID (reliable): `await page.fill("input#email", email)` not by label

## Common Patterns

**Async Testing:**

```typescript
// For async DAL functions in integration tests
it("getEngagements returns all tenant engagements", async () => {
  const session = {
    user: { tenantId: "test-tenant-1", roles: [Role.AUDITOR] },
  };
  const result = await getEngagements(session);
  expect(result).toHaveLength(3);
});
```

**Error Testing:**

```typescript
// Test permission denials
it("AUDITOR does NOT have observation:approve", () => {
  expect(hasPermission([Role.AUDITOR], "observation:approve")).toBe(false);
});

// Test validation errors
it("updateRolesSchema rejects invalid UUID", () => {
  const result = updateRolesSchema.safeParse({
    userId: "not-a-uuid",
    roles: [Role.AUDITOR],
    justification: "test reason",
  });
  expect(result.success).toBe(false);
});
```

**Tree/Hierarchy Testing:**

```typescript
// Test scoring with parent-child nodes
it("parent with two children scores correctly", () => {
  const node = parent("root", [
    leaf("n1", "FULLY_COMPLIANT"),
    leaf("n2", "PARTIALLY_COMPLIANT"),
  ]);
  const { score } = computeNodeScore(node);
  expect(score).toBe(0.875); // (1.0 + 0.5) / 2
});
```

**Static Analysis Testing:**

```typescript
// Tenant isolation test — scans files, no running DB
describe("DAL file with queries includes tenantId filter", () => {
  for (const file of dalFiles) {
    const content = getFileContent(file);
    if (!hasDbQuery(content)) continue;

    it(`${file} — queries reference tenantId`, () => {
      expect(content).toContain("tenantId");
    });
  }
});
```

## Test Data / Seed

**Database Seed:**

- `prisma/seed.ts` — 10 users, 2 tenants, 39 examination areas, 568 examination items, RAM parameters
- **Passwords:** Generated via `better-auth/crypto` `hashPassword()` to match Better Auth expectations
- **Default test password:** `TestPassword123!` (hashed in seed)
- **Test users:**
  - `rajesh.deshmukh@apexbank.example` (CEO)
  - `suresh.patil@apexbank.example` (AUDITOR)
  - `priya.sharma@apexbank.example` (CAE + AUDIT_MANAGER)
  - `amit.joshi@apexbank.example` (CCO)
  - `vikram.kulkarni@apexbank.example` (AUDITEE + AUDITOR)

**Seed triggers during test:**

- Run seeding before E2E tests: `pnpm db:seed`
- Disable triggers when seeding: `DISABLE TRIGGER USER` (SQL applied manually)
- Verify bcrypt hashes: `SELECT LENGTH(password) FROM "Account"` (should be ~60 chars)

---

_Testing analysis: 2026-03-02_
