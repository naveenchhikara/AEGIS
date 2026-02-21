# Testing Patterns

**Analysis Date:** 2025-02-21

## Test Framework

**Runner:**

- Playwright for E2E tests
- Vitest for unit tests
- Config files: `playwright.config.ts`, `vitest.config.ts`

**Assertion Library:**

- Playwright: `expect()` from `@playwright/test`
- Vitest: `expect()` from `vitest`

**Run Commands:**

```bash
pnpm test:e2e              # Run all Playwright E2E tests
pnpm test:e2e:ui           # Run E2E tests with Playwright UI (interactive)
pnpm test:unit             # Run Vitest unit tests
pnpm lint                  # Run ESLint (included in QA)
```

## Test File Organization

**Location:**

- E2E tests: `tests/e2e/*.spec.ts` (co-located by feature)
- Unit tests: `src/lib/__tests__/*.test.ts` (co-located in source directories)
- Auth setup: `tests/auth.setup.ts` (single file for all auth credentials)

**Naming:**

- E2E: `{feature}.spec.ts` (e.g., `observation-lifecycle.spec.ts`, `permission-guards.spec.ts`)
- Unit: `{module}.test.ts` (e.g., `state-machine.test.ts`)
- Auth: `auth.setup.ts` (not a test, runs before suite)

**Directory Structure:**

```
tests/
├── auth.setup.ts          # Authentication setup (runs first)
├── e2e/
│   ├── observation-lifecycle.spec.ts
│   └── permission-guards.spec.ts
src/
├── lib/
│   ├── __tests__/
│   │   └── state-machine.test.ts
│   └── state-machine.ts
```

## Test Structure

**E2E Test Suite Organization:**

Playwright tests use `test.describe()` for grouping with `test.describe.serial()` for state-dependent tests:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Test Group 1: Create Observation", () => {
  test.use({ storageState: "playwright/.auth/auditor.json" });

  test("auditor can create observation with 5C fields", async ({ page }) => {
    // Navigate
    await page.goto("/findings");

    // Interact
    await page.getByRole("link", { name: /create observation/i }).click();
    await page.getByLabel(/condition/i).fill("Test condition");

    // Assert
    await expect(page).toHaveURL(/\/findings\/[a-f0-9-]+/);
  });
});

// Serial tests maintain state across tests (observation URL shared)
test.describe.serial("Test Group 2: State Transitions", () => {
  let observationUrl: string;

  test("auditor submits observation", async ({ page }) => {
    // ...
    observationUrl = page.url();
  });

  test("manager approves observation", async ({ browser }) => {
    const managerCtx = await browser.newContext({
      storageState: "playwright/.auth/manager.json",
    });
    const page = await managerCtx.newPage();
    await page.goto(observationUrl);
    // ...
  });
});
```

**Unit Test Structure:**

Vitest uses `describe()` for grouping and `it()` for individual tests:

```typescript
import { describe, it, expect } from "vitest";
import { canTransition } from "@/lib/state-machine";

describe("canTransition", () => {
  describe("forward transitions", () => {
    it("DRAFT -> SUBMITTED: AUDITOR allowed", () => {
      const result = canTransition("DRAFT", "SUBMITTED", ["AUDITOR"]);
      expect(result).toEqual({ allowed: true });
    });

    it("returns reason when transition denied", () => {
      const result = canTransition("DRAFT", "SUBMITTED", ["AUDIT_MANAGER"]);
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.reason).toContainText("AUDITOR");
      }
    });
  });
});
```

## Patterns

**E2E Test Patterns:**

1. **Setup and Auth:**
   - `tests/auth.setup.ts` creates storage state files for 5 roles
   - Each test project uses one storageState: `test.use({ storageState: "playwright/.auth/auditor.json" })`
   - Tests run serially (`workers: 1`) to avoid test database conflicts

2. **Page Interaction:**
   - Use accessibility selectors: `getByRole("button", { name: /submit/i })`
   - Fallback to data-testid: `locator('[data-testid="observation-card"]')`
   - Wait for visibility before interacting: `await expect(page.getByText(/findings/i)).toBeVisible()`

3. **State Sharing (serial tests):**
   - Declare variable outside test scope
   - Test 1 sets value, Test 2+ reads it
   - Cross-context: create new context with `browser.newContext()` instead of reusing page

4. **Conditional Assertions:**
   - Check existence before asserting: `if ((await observationRow.count()) > 0)`
   - Use `.not.toBeVisible()` to verify non-existent controls

**Unit Test Patterns:**

1. **State Machine Testing:**
   - Test allowed and denied transitions separately
   - Include reason messages in denial assertions: `expect(result.reason).toContain("AUDITOR")`
   - Test edge cases: multi-role users, severity guards, invalid transitions

2. **Permission Testing:**
   - Test single role access: `hasPermission(["AUDITOR"], "observation:create")`
   - Test multi-role union: `hasPermission(["AUDITOR", "AUDIT_MANAGER"], "observation:approve")`
   - Test denial: assert both `allowed: false` and reason message

3. **Happy Path + Error Cases:**
   - Always include at least one positive test (should pass/allow)
   - Always include at least one negative test (should fail/deny)
   - Test boundary conditions (empty arrays, null values, edge severities)

## Mocking

**Framework:** None explicitly configured (Vitest uses happy-dom by default)

**Patterns:**

- Unit tests: Import pure functions directly, no mocking needed for `state-machine.ts`
- E2E tests: Mock via UI (skip tests with `.skip`, conditionally render with visibility checks)
- Server actions: Not unit tested — tested via E2E instead (due to "use server" boundary)

**What to Mock:**

- Database calls → Don't mock; use test database (E2E handles this)
- HTTP requests → Not needed; focus E2E on happy path
- Current time/dates → Not done; use actual system time

**What NOT to Mock:**

- Pure state machine logic (test directly)
- Permission checking (test directly)
- Database schema/relationships (use real DB in E2E)

## Fixtures and Factories

**Test Data:**

- Auth credentials in `tests/auth.setup.ts`:
  ```typescript
  const users = [
    {
      role: "auditor",
      email: "suresh.patil@apexbank.example",
      password: "TestPassword123!",
      file: "playwright/.auth/auditor.json",
    },
    // ... 4 more roles
  ];
  ```
- Password must match `prisma/seed.ts` exactly
- Database seeded via `pnpm db:seed` (from `prisma/seed.ts` using tsx)

**Location:**

- Auth setup: `tests/auth.setup.ts` (fixtures created at build time)
- Storage states: `playwright/.auth/{role}.json` (generated by auth.setup.ts)
- Seed data: `prisma/seed.ts` (observational test users, branches, audit areas)

**Test User Roles (from seed):**

- `suresh.patil@apexbank.example` → AUDITOR
- `priya.sharma@apexbank.example` → CAE + AUDIT_MANAGER
- `amit.joshi@apexbank.example` → CCO
- `vikram.kulkarni@apexbank.example` → AUDITEE + AUDITOR

## Coverage

**Requirements:** No coverage enforced (no thresholds in vitest.config.ts)

**Current coverage:**

- E2E: 226 tests across 18 modules (from `.planning/PROJECT.md`)
- Unit: 1 test file for state-machine (core business logic)
- Missing: Server actions not directly unit tested (tested via E2E)

**View Coverage:**

```bash
# Vitest coverage would be enabled via:
# vitest run --coverage
# (Currently not configured in project)
```

## Test Types

**Unit Tests:**

- **Scope:** Pure functions (state-machine.ts, permission checks)
- **Approach:** Direct function calls, compare outputs against expected results
- **Location:** `src/lib/__tests__/*.test.ts`
- **Example:** `state-machine.test.ts` tests 100+ transition combinations

**Integration Tests:**

- **Scope:** Cross-domain interactions (observations + timeline + audit trail)
- **Approach:** Database transactions in E2E tests
- **Location:** `tests/e2e/*.spec.ts`
- **Example:** Observation lifecycle test creates observation, transitions state, verifies timeline

**E2E Tests:**

- **Framework:** Playwright
- **Scope:** User workflows (create observation, approve, issue, respond)
- **Approach:** Browser-based navigation, form interaction, assertion on UI
- **Location:** `tests/e2e/*.spec.ts`
- **Example:** `observation-lifecycle.spec.ts` covers 9 manual test groups

**Manual Tests:**
Not in automated suite but documented in test specs (marked with `.skip()`):

- Repeat finding detection (requires pre-closed observation)
- Resolved during fieldwork (requires fieldwork state)
- Auditee response (requires ISSUED observation in test data)

## Common Patterns

**Async Testing (E2E):**

All Playwright tests are async by default; use `await` for all operations:

```typescript
test("auditor can create observation", async ({ page }) => {
  // Wait for navigation
  await page.goto("/findings");

  // Wait for element visibility
  await expect(page.getByRole("link", { name: /create/i })).toBeVisible();

  // Interact
  await page.click(...);
  await page.fill(...);

  // Wait for result
  await expect(page).toHaveURL(...);
});
```

**Error Testing (Unit):**

Use discriminated unions to test both success and error paths:

```typescript
it("DRAFT -> SUBMITTED: AUDITOR allowed", () => {
  const result = canTransition("DRAFT", "SUBMITTED", ["AUDITOR"]);
  expect(result).toEqual({ allowed: true });
});

it("SUBMITTED -> DRAFT: wrong role rejected", () => {
  const result = canTransition("SUBMITTED", "DRAFT", ["AUDITOR"]);
  expect(result.allowed).toBe(false);
  if (!result.allowed) {
    expect(result.reason).toContain("AUDIT_MANAGER");
  }
});
```

**Role-Based Testing Pattern (E2E):**

Each role test uses storageState to avoid re-authenticating:

```typescript
test.describe("CAE role access", () => {
  test.use({ storageState: "playwright/.auth/cae.json" });

  test("CAE can access audit-trail", async ({ page }) => {
    await page.goto("/audit-trail");
    await expect(page).toHaveURL(/\/audit-trail$/);
  });

  test("CAE can close HIGH severity observations", async ({ page }) => {
    // ... navigate to observation
    await expect(page.getByRole("button", { name: /close/i })).toBeVisible();
  });
});

test.describe("Auditor role restrictions", () => {
  test.use({ storageState: "playwright/.auth/auditor.json" });

  test("auditor cannot access audit-trail", async ({ page }) => {
    await page.goto("/audit-trail");
    await expect(page).toHaveURL(/\/dashboard\?unauthorized=true/);
  });
});
```

## Configuration Details

**Playwright Config (`playwright.config.ts`):**

- Test directory: `./tests`
- Base URL: `http://localhost:3000` (configurable via `BASE_URL` env var)
- Workers: 1 (serial execution for state-dependent tests)
- Timeout: 30 seconds per test
- Retries: 2 in CI, 0 locally
- Screenshots: on failure
- Traces: on first retry
- Web server: Builds and starts production server automatically

**Vitest Config (`vitest.config.ts`):**

- Test environment: `node` (not browser)
- Include pattern: `src/**/__tests__/**/*.test.ts`
- Path alias: `@` maps to `./src`

## Project Setup for Testing

**Prerequisites:**

1. Database running: `docker-compose up -d` (if using Docker)
2. Database seeded: `pnpm db:seed`
3. Dependencies installed: `pnpm install`
4. Dev/build server started: Playwright starts automatically OR `pnpm dev` in parallel terminal

**Auth Test Accounts:**

- Must exist in database (created by `prisma/seed.ts`)
- Password must match exactly: `TestPassword123!`
- Emails must match `tests/auth.setup.ts` exactly
- Verify with: `SELECT * FROM "Account" WHERE "providerId" = 'credential'` (check password hashes exist)

**GitHub Actions CI:**

- Runs `pnpm lint` (ESLint)
- Runs `pnpm build` (Next.js production build)
- Runs `pnpm test:e2e` (Playwright E2E on production build)
- Retries failed tests 2 times automatically

---

_Testing analysis: 2025-02-21_
