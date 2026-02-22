# Testing Patterns

**Analysis Date:** 2026-02-22

## Test Framework

**Runner:**

- Vitest 4.0.18
- Config: `vitest.config.ts`

**E2E Runner:**

- Playwright 1.58.2
- Config: `playwright.config.ts`

**Assertion Library:**

- Vitest built-in `expect()`
- Playwright `expect()` with async matchers (e.g., `await expect(page).toHaveURL()`)

**Run Commands:**

```bash
pnpm test:unit              # Run all unit tests (vitest run)
pnpm test:coverage          # Run with coverage report (v8 provider)
pnpm test:e2e               # Run all E2E tests (playwright test)
pnpm test:e2e:ui            # Run E2E with Playwright UI debugger
```

## Test File Organization

**Location:**

- **Unit tests:** Co-located with source: `src/lib/__tests__/*.test.ts`, `src/services/*/\_\_tests\_\_/*.test.ts`
- **E2E tests:** Centralized: `tests/e2e/*.spec.ts`
- **Auth setup:** `tests/auth.setup.ts` (runs first, creates storageState files)

**Naming:**

- **Unit:** `*.test.ts` (matches vitest config pattern `**/__tests__/**/*.test.ts`)
- **E2E:** `*.spec.ts`
- **Auth:** `*.setup.ts` (Playwright special pattern)

**Structure:**

```
tests/
├── auth.setup.ts                          # Multi-role authentication setup
├── e2e/
│   ├── observation-lifecycle.spec.ts      # 9 test groups, ~500 lines
│   └── permission-guards.spec.ts          # RBAC access control
src/
├── lib/
│   └── __tests__/
│       ├── permissions.test.ts            # 230 lines, 30+ test cases
│       └── state-machine.test.ts          # 330 lines, 40+ test cases
└── services/
    └── risk-rating/
        └── __tests__/
            └── compute.test.ts            # 290 lines, risk rating scoring
```

## Test Structure

**Suite Organization:**

```typescript
import { describe, it, expect } from "vitest";

// ─── Feature Group ──────────────────────────────────────────────────────

describe("Feature Name", () => {
  it("specific behavior returns expected result", () => {
    const result = functionUnderTest(input);
    expect(result).toBe(expectedValue);
  });

  it("edge case handles gracefully", () => {
    expect(() => functionUnderTest(badInput)).toThrow();
  });
});

describe.skip("Not yet implemented", () => {
  it("placeholder test", () => {
    // Test skipped for future implementation
  });
});
```

**Patterns:**

- **Setup:** No test fixtures required; use helper functions (`makeObs()`, `makeUser()`)
- **Teardown:** Vitest handles cleanup; no afterEach() needed for pure functions
- **Grouping:** Use `describe()` blocks with visual separator comments (`// ─── Name ───`)

## Mocking

**Framework:** Vitest has built-in mocking via `vi` object (not used in current tests)

**Current Approach:** Pure function testing with no external dependencies

**Patterns:**

```typescript
// Helper factory to create test fixtures
function makeObs(
  severity: (typeof Severity)[keyof typeof Severity],
  isRepeatFinding = false,
  id = "obs-1",
): ObservationInput {
  return { id, severity, isRepeatFinding };
}

// Unit test uses fixture
it("1 LOW observation → high percentage", () => {
  const result = service.computeEngagementRating([makeObs("LOW")]);
  expect(result.totalScore).toBe(1);
});
```

**What to Mock:**

- External APIs (if testing integration code)
- Database calls (use DAL mocks, not Prisma directly)
- File I/O operations

**What NOT to Mock:**

- Pure business logic functions (permissions, state machines, scoring)
- Type definitions and enums
- Zod validation schemas
- Utility functions

## Fixtures and Factories

**Test Data:**

```typescript
// Factory pattern for test observations
function makeObs(
  severity: typeof Severity,
  isRepeatFinding = false,
  id = "obs-1",
): ObservationInput {
  return { id, severity, isRepeatFinding };
}

// Usage in tests
const result = service.computeEngagementRating([
  makeObs("LOW", false, "obs-1"),
  makeObs("MEDIUM", true, "obs-2"),
]);
```

**E2E Test Data:**

- **Auth fixtures:** `tests/auth.setup.ts` creates storageState files for 5 roles:
  - `playwright/.auth/auditor.json` (suresh.patil@apexbank.example)
  - `playwright/.auth/manager.json` (priya.sharma@apexbank.example)
  - `playwright/.auth/cae.json` (priya.sharma@apexbank.example, CAE role)
  - `playwright/.auth/cco.json` (amit.joshi@apexbank.example)
  - `playwright/.auth/auditee.json` (vikram.kulkarni@apexbank.example)

- **Seed data:** Database seeded via `pnpm db:seed` (runs `prisma/seed.ts`)
  - 10 test users with roles
  - 2 tenants
  - 39 examination areas
  - 568 examination items

**Location:**

- No centralized fixtures directory; helpers inline with tests
- E2E data comes from database seed, not fixtures

## Coverage

**Requirements:** Not enforced; coverage reporting enabled

**View Coverage:**

```bash
pnpm test:coverage
# Generates text report
# Coverage includes: src/lib/**.ts, src/services/**.ts
# Excludes: __tests__/ directories
```

**Configuration:** `vitest.config.ts`

```typescript
coverage: {
  provider: "v8",
  include: ["src/lib/**/*.ts", "src/services/**/*.ts"],
  exclude: ["src/lib/__tests__/**", "src/services/**/__tests__/**"],
  reporter: ["text", "text-summary"],
}
```

## Test Types

**Unit Tests:**

- **Scope:** Pure functions, no I/O
- **Files:** `src/lib/__tests__/*.test.ts`, `src/services/*/__tests__/*.test.ts`
- **Approach:** Test inputs → outputs; test edge cases and boundaries
- **Examples:**
  - `permissions.test.ts`: ROLE_PERMISSIONS structure, multi-role union, permission checks
  - `state-machine.test.ts`: State transitions, role-based access, invalid transitions
  - `compute.test.ts`: Risk rating scoring with severity weights, repeat findings

**Integration Tests:**

- **Scope:** Server actions with auth + DAL + database
- **Coverage:** Not automated; done via E2E
- **Manual approach:** Use dev server + database; test auth flow, permission checks, data isolation

**E2E Tests:**

- **Framework:** Playwright 1.58.2
- **Config:** `playwright.config.ts` (serial execution, 1 worker, 30s timeout)
- **Approach:**
  - Multi-project setup: `setup`, `auditor`, `manager`, `cae`, `cco`, `auditee`
  - Auth setup runs first (creates storageState files)
  - Each role project depends on auth setup
  - Tests run against live dev server or deployed instance

**E2E Test Groups:**

1. **Create Observation** (OBS-01): Auditor creates with 5C fields, severity, branch, audit area
2. **State Transitions** (OBS-02, OBS-03, OBS-04): DRAFT → SUBMITTED → REVIEWED → ISSUED → RESPONSE → COMPLIANCE → CLOSED
3. **Auditee Response** (OBS-02): Auditee submits response to issued observation
4. **Severity-Based Closing** (OBS-05, OBS-06): Manager closes LOW/MEDIUM; CAE closes HIGH/CRITICAL
5. **Timeline Immutability** (OBS-03): Timeline shows chronological events without edit/delete
6. **Tagging** (OBS-08): Observation detail shows multi-dimensional tags (severity, status, branch, audit area, risk)
7. **Repeat Finding Detection** (OBS-09, OBS-10, OBS-11): System detects + escalates repeat findings
8. **Resolved During Fieldwork** (OBS-07): Auditor marks observation as resolved during fieldwork
9. **Findings List** (OBS-12): Findings page displays observations, filters work

**E2E Special Cases:**

```typescript
test.describe.serial("Test Group 2: State Transitions", () => {
  let observationUrl: string;

  test("auditor submits observation for review", async ({ page }) => {
    // First test creates observation and captures URL
    await page.goto("/findings/new");
    // ... create observation
    observationUrl = page.url();
  });

  test("manager approves and issues to auditee", async ({ browser }) => {
    // Second test uses URL from first test
    const managerCtx = await browser.newContext({
      storageState: "playwright/.auth/manager.json",
    });
    const page = await managerCtx.newPage();
    await page.goto(observationUrl);
    // ... test transition
  });
});
```

- **Serial mode:** `test.describe.serial()` ensures tests run in order; state is shared via closure
- **Multi-context:** Use `browser.newContext()` to switch roles mid-test

## Common Patterns

**Async Testing:**

```typescript
// Playwright: Use async matchers (await required)
test("page loads", async ({ page }) => {
  await page.goto("/findings");
  await expect(page).toHaveURL(/\/findings$/);
  await expect(page.getByRole("heading", { name: /findings/i })).toBeVisible();
});

// Vitest: Pure function, synchronous
it("computes rating", () => {
  const service = new RiskRatingService();
  const result = service.computeEngagementRating([makeObs("LOW")]);
  expect(result.ratingBand).toBe("VERY_GOOD");
});
```

**Error Testing:**

```typescript
// Playwright: Check error message appears
test("invalid input shows error", async ({ page }) => {
  await page.goto("/findings/new");
  await page.getByRole("button", { name: /create/i }).click();
  // Form validation should show error
  await expect(page.getByText(/required/i)).toBeVisible();
});

// Vitest: Expect throw
it("invalid transition throws error", () => {
  const result = canTransition("DRAFT", "CLOSED", ["CAE"]);
  expect(result.allowed).toBe(false);
  if (!result.allowed) {
    expect(result.reason).toContain("Invalid transition");
  }
});
```

**Role-Based Testing:**

```typescript
// Setup in auth.setup.ts — creates storageState for each role
setup(`authenticate as ${user.role}`, async ({ page }) => {
  await page.goto("/login");
  await page.fill("input#email", user.email);
  await page.fill("input#password", user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard**");
  await page.context().storageState({ path: user.file });
});

// Use in tests
test("auditor can access findings", async ({ page }) => {
  test.use({ storageState: "playwright/.auth/auditor.json" });
  await page.goto("/findings");
  await expect(page).toHaveURL(/\/findings$/);
});
```

**Conditional Checks (Playwright):**

```typescript
// Some DOM elements may not exist in all scenarios
const observationCards = page.locator('[data-testid="observation-card"]');
const count = await observationCards.count();

if (count > 0) {
  // Test presence of observations
  const firstCard = observationCards.first();
  await expect(firstCard).toBeVisible();
} else {
  // Handle empty state
}
```

## E2E Execution

**Prerequisites:**

1. Database running: `docker-compose up -d` (or PostgreSQL 16 locally)
2. Seed data loaded: `pnpm db:seed`
3. Dev server running: `pnpm build && pnpm start` (started automatically by Playwright)
4. Test users created with bcrypt hashes matching seed

**Run Full Suite:**

```bash
pnpm test:e2e
# Runs: auth.setup.ts → [auditor, manager, cae, cco, auditee] in parallel
# Each test gets storageState (authenticated session)
```

**Run Single Project:**

```bash
pnpm test:e2e --project=auditor
# Requires auth.setup.ts to have run first
```

**Debug Mode:**

```bash
pnpm test:e2e:ui
# Opens Playwright Inspector
# Step through tests, inspect DOM, retry
```

**Parallelization:**

- Currently serial (`workers: 1`) for state-dependent tests
- Can increase to `workers: 4` if tests are independent

**CI/CD:**

- GitHub Actions (configured in `.github/workflows/`)
- Retries enabled: `retries: 2` in CI
- Traces: `on-first-retry` (captured if test fails)
- Screenshots: `only-on-failure`

---

_Testing analysis: 2026-02-22_
