# Testing Patterns

**Analysis Date:** 2026-02-20

## Test Frameworks

**Unit Test Runner:**

- Vitest — config at `vitest.config.ts`
- Environment: `node` (not happy-dom/jsdom)
- Test pattern: `src/**/__tests__/**/*.test.ts`

**E2E Test Runner:**

- Playwright — config at `playwright.config.ts`
- Test directory: `tests/`
- Runs serially (`workers: 1`, `fullyParallel: false`) — state-dependent tests
- CI retries: 2 retries on CI, 0 locally

**Assertion Library:**

- Vitest unit tests: `expect` from `vitest`
- Playwright E2E tests: `expect` from `@playwright/test`

**Run Commands:**

```bash
pnpm test:e2e            # Run all Playwright E2E tests (builds + starts server)
pnpm test:e2e:ui         # Run E2E tests with Playwright UI
```

```bash
pnpm test:unit           # Run all unit tests once
npx vitest               # Watch mode
npx vitest run --coverage  # Coverage report
```

## Test File Organization

**Unit tests:**

- Location: colocated in `src/lib/__tests__/` subdirectory under the tested module
- Naming: `{module-name}.test.ts`
- Current unit tests: `src/lib/__tests__/state-machine.test.ts`

**E2E tests:**

- Location: `tests/e2e/`
- Naming: `{feature}.spec.ts`
- Auth setup: `tests/auth.setup.ts` (runs before all E2E specs)

**Structure:**

```
tests/
├── auth.setup.ts                         # Auth state setup for 4 roles
└── e2e/
    ├── observation-lifecycle.spec.ts      # Full observation flow (9 test groups)
    └── permission-guards.spec.ts          # RBAC access control tests

src/
└── lib/
    └── __tests__/
        └── state-machine.test.ts          # State machine unit tests (50 cases)
```

## Unit Test Structure

**Suite Organization (Vitest):**

```typescript
import { describe, it, expect } from "vitest";
import { canTransition, getAvailableTransitions } from "@/lib/state-machine";

describe("canTransition", () => {
  // Logical grouping by scenario
  describe("forward transitions", () => {
    it("DRAFT -> SUBMITTED: AUDITOR allowed", () => {
      const result = canTransition("DRAFT", "SUBMITTED", ["AUDITOR"]);
      expect(result).toEqual({ allowed: true });
    });
  });

  describe("wrong role", () => {
    it("DRAFT -> SUBMITTED: AUDIT_MANAGER rejected", () => {
      const result = canTransition("DRAFT", "SUBMITTED", ["AUDIT_MANAGER"]);
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.reason).toContain("AUDITOR");
      }
    });
  });
});
```

**Patterns:**

- No `beforeEach`/`afterEach` — pure function tests only (state machine)
- No mocking in current unit tests — pure computation tested directly
- Test name format: `"INPUT -> OUTPUT: condition description"`
- Discriminated union narrowing: use `if (!result.allowed)` before accessing `result.reason`
- Group related cases in nested `describe` blocks: forward transitions, invalid transitions, wrong role, multi-role, severity-based

## E2E Test Structure

**Auth Setup:**

```typescript
// tests/auth.setup.ts
import { test as setup } from "@playwright/test";

const users = [
  {
    role: "auditor",
    email: "suresh.patil@apexbank.example",
    password: TEST_PASSWORD,
    file: "playwright/.auth/auditor.json",
  },
  {
    role: "cae",
    email: "priya.sharma@apexbank.example",
    password: TEST_PASSWORD,
    file: "playwright/.auth/cae.json",
  },
  // ...
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
  });
}
```

**E2E Suite Organization:**

```typescript
// tests/e2e/permission-guards.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Permission Guards", () => {
  test.describe("Auditee role restrictions", () => {
    test.use({ storageState: "playwright/.auth/auditee.json" });

    test("auditee cannot access audit-trail page", async ({ page }) => {
      await page.goto("/audit-trail");
      await expect(page).toHaveURL(/\/dashboard\?unauthorized=true/);
    });
  });
});
```

**Patterns:**

- Role scoping: `test.use({ storageState: "playwright/.auth/{role}.json" })` at describe-block level
- Multi-context tests: `browser.newContext({ storageState: "..." })` for testing cross-role interactions
- State-dependent tests: `test.describe.serial(...)` for ordered test sequences
- Skipped tests: `test.skip(...)` for tests requiring complex state setup not yet automated
- Selectors: prefer accessibility-based (`getByRole`, `getByLabel`, `getByText`) over CSS selectors
- URL patterns: verify navigation with `await expect(page).toHaveURL(/pattern/)`

## Mocking

**Framework:** Not applicable in current test suite — no mocking framework in use.

**Current approach:**

- Unit tests (`src/lib/__tests__/`): pure functions tested without mocks
- E2E tests: full stack against real running server and seeded database

**What is NOT mocked:**

- Database queries (E2E tests use real seeded DB)
- Auth sessions (E2E tests use real storageState files)
- External services in E2E (AWS S3, SES are not exercised in tests)

## Fixtures and Factories

**Test Data:**

- E2E tests depend on seed data loaded via `pnpm db:seed` (`prisma/seed.ts`)
- No programmatic factories or fixtures in current test suite
- Seed users: `suresh.patil@apexbank.example` (AUDITOR), `priya.sharma@apexbank.example` (CAE + AUDIT_MANAGER), `amit.joshi@apexbank.example` (CCO), `vikram.kulkarni@apexbank.example` (AUDITEE + AUDITOR)
- Test password: `TEST_PASSWORD` constant in `tests/auth.setup.ts` (must match `prisma/seed.ts`)

**Auth state location:**

- `playwright/.auth/auditor.json`
- `playwright/.auth/manager.json`
- `playwright/.auth/cae.json`
- `playwright/.auth/cco.json`
- `playwright/.auth/auditee.json`

## Test Data Strategy

- E2E tests run against a **shared seeded database** — no DB reset between specs or runs
- Serial execution (`workers: 1`) prevents race conditions but tests that create data (e.g., observations) persist across subsequent specs
- Seed data is loaded once via `pnpm db:seed` before test runs; tests assume seed state exists
- **No programmatic cleanup:** tests that mutate data rely on idempotent assertions or seed-data guards (e.g., `if (await row.count() > 0)`)
- To reset to clean state: re-run `pnpm db:push --force-reset && pnpm db:seed`

## Coverage

**Requirements:** No enforced coverage threshold.

**View Coverage:**

```bash
npx vitest run --coverage
```

**Current coverage:** Only `src/lib/state-machine.ts` has unit test coverage. The vast majority of application code (DAL, server actions, components) is covered only through E2E tests.

## Execution Times

- **Unit tests:** <1 second (50 pure-function test cases)
- **E2E (CI):** ~2-3 minutes total (includes `pnpm build` ~60-90s + serial Playwright specs)
- **E2E (local):** ~30-60s (reuses running dev server via `reuseExistingServer: !process.env.CI`)
- **Auth setup:** ~15-30s (4 sequential login flows saving storageState)

## Test Types

**Unit Tests (`src/lib/__tests__/`):**

- Scope: Pure business logic functions with no I/O
- Current: State machine (`canTransition`, `getAvailableTransitions`, `escalateSeverity`) — 50 test cases
- Pattern: Input/output assertions for all combinations (role, severity, valid/invalid transitions)

**E2E Tests (`tests/e2e/`):**

- Scope: Full user workflows through browser against live Next.js server + PostgreSQL
- Prerequisites: Docker DB running, seed data loaded, server built and started
- Current specs:
  - `observation-lifecycle.spec.ts` — 9 test groups covering full observation flow (OBS-01 through OBS-11)
  - `permission-guards.spec.ts` — RBAC tests for 4 roles (auditee, CAE, auditor, manager)
- `webServer` config: `pnpm build && pnpm start` (full production build)
- Reuses existing server on non-CI (`reuseExistingServer: !process.env.CI`)
- **Future optimization:** `permission-guards.spec.ts` (read-only RBAC checks) could run in parallel since it doesn't mutate state; only `observation-lifecycle.spec.ts` requires serial execution

**Integration Tests:** Not used — no dedicated integration test layer.

## Playwright Project Configuration

**Projects and auth files:**

| Project   | Storage State                   | Seed User                          |
| --------- | ------------------------------- | ---------------------------------- |
| `auditor` | `playwright/.auth/auditor.json` | `suresh.patil@apexbank.example`    |
| `manager` | `playwright/.auth/manager.json` | `priya.sharma@apexbank.example`    |
| `cae`     | `playwright/.auth/cae.json`     | `priya.sharma@apexbank.example`    |
| `cco`     | `playwright/.auth/cco.json`     | `amit.joshi@apexbank.example`      |
| `auditee` | `playwright/.auth/auditee.json` | `vikram.kulkarni@apexbank.example` |

**Note:** `manager` and `cae` share the same user (`priya.sharma`) who holds both CAE and AUDIT_MANAGER roles. Separate projects allow organizing tests by role perspective, not by unique user.

All projects depend on `setup` project (auth.setup.ts). CI uses `BASE_URL` env var; local defaults to `http://localhost:3000`.

## Common Patterns

**Async E2E:**

```typescript
// Wait for navigation after form submit
await page.click('button[type="submit"]');
await page.waitForURL(/\/findings\/[a-f0-9-]+/, { timeout: 10000 });

// Wait for element hydration before interacting
await page.waitForSelector("input#email", { timeout: 15000 });
```

**Conditional E2E (seed-data dependent):**

```typescript
// Guard against missing seed data
const row = page
  .getByRole("row")
  .filter({ hasText: /low|medium/i })
  .first();
if ((await row.count()) > 0) {
  await row.click();
  await expect(
    page.getByRole("button", { name: /close observation/i }),
  ).toBeVisible();
}
```

**Cross-role interaction:**

```typescript
test("manager approves", async ({ browser }) => {
  const managerCtx = await browser.newContext({
    storageState: "playwright/.auth/manager.json",
  });
  const page = await managerCtx.newPage();
  await page.goto(observationUrl);
  // ... assertions
  await managerCtx.close();
});
```

**Unit test discriminated union:**

```typescript
it("AUDIT_MANAGER + HIGH severity rejected", () => {
  const result = canTransition(
    "COMPLIANCE",
    "CLOSED",
    ["AUDIT_MANAGER"],
    "HIGH",
  );
  expect(result).toEqual({
    allowed: false,
    reason: "HIGH severity requires CAE to close",
  });
});
```

---

_Testing analysis: 2026-02-20_
