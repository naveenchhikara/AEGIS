# Testing Patterns

**Analysis Date:** 2026-02-25

## Test Framework

**Unit Test Runner:**

- Vitest — config at `vitest.config.ts`
- Environment: `node` (not happy-dom/jsdom)
- Coverage provider: v8

**E2E Test Runner:**

- Playwright — config at `playwright.config.ts`
- Auth setup: `tests/auth.setup.ts`

**Run Commands:**

```bash
pnpm test:e2e           # Run all Playwright E2E tests
pnpm test:e2e:ui        # Run E2E tests with Playwright UI
# Vitest (unit):
pnpm exec vitest        # Run unit tests
pnpm exec vitest --coverage  # Run with coverage report
```

## Test File Organization

**Unit Tests:**

- Location: co-located under `src/**/__tests__/` directories
- Pattern: `src/lib/__tests__/*.test.ts`, `src/services/**/__tests__/*.test.ts`
- Vitest `include` glob: `src/**/__tests__/**/*.test.ts`

**E2E Tests:**

- Location: `tests/e2e/` directory
- Auth setup: `tests/auth.setup.ts` — runs before all E2E specs
- Playwright report output: `playwright-report/` (git-ignored, excluded from ESLint)

**Structure:**

```
src/
├── lib/
│   └── __tests__/         # Unit tests for lib utilities
└── services/
    └── **/__tests__/      # Unit tests for service logic
tests/
├── e2e/                   # Playwright E2E specs
└── auth.setup.ts          # Shared auth state for E2E
```

## Coverage Scope

**What is covered by unit tests:**

- `src/lib/**/*.ts` — utility functions, auth helpers, permission engine, scoring logic
- `src/services/**/*.ts` — business logic (risk-rating computation)

**Excluded from coverage:**

- `src/lib/__tests__/**` — test files themselves
- `src/services/**/__tests__/**` — test files themselves

**Coverage reporters:** `text` (terminal) and `text-summary`

**Requirements:** No enforced threshold — coverage is informational only.

**View Coverage:**

```bash
pnpm exec vitest --coverage
```

## Test Structure

**Suite Organization (Vitest unit tests):**

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("FunctionName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should [expected behavior]", () => {
    // arrange
    const input = { ... };
    // act
    const result = functionName(input);
    // assert
    expect(result).toBe(expectedValue);
  });

  it("should handle [edge case]", () => {
    expect(() => functionName(null)).toThrow("Expected error message");
  });
});
```

**E2E Suite Organization (Playwright):**

```typescript
import { test, expect } from "@playwright/test";

test.describe("Feature Area", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should [behavior]", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading")).toBeVisible();
  });
});
```

## Mocking

**Framework:** Vitest built-in (`vi`)

**Patterns:**

```typescript
// Module mock
vi.mock("@/lib/auth", () => ({
  getRequiredSession: vi.fn().mockResolvedValue({
    user: { id: "user-1", tenantId: "tenant-1", roles: ["AUDITOR"] },
  }),
}));

// Spy on function
const spy = vi.spyOn(module, "functionName").mockReturnValue(value);

// Reset between tests
beforeEach(() => vi.clearAllMocks());
afterAll(() => vi.restoreAllMocks());
```

**What to Mock:**

- Database calls (Prisma client) — unit tests must not touch real DB
- `getRequiredSession()` — inject test session with appropriate tenantId and roles
- External services (AWS S3, SES, pg-boss)
- `Date.now()` / `new Date()` for time-sensitive tests

**What NOT to Mock:**

- Pure utility functions (test them directly)
- Zod schemas (test validation directly with `.parse()` / `.safeParse()`)
- Business logic in `src/services/` — test actual scoring computations

## Fixtures and Test Data

**Test Users (E2E / seed):**

- `rajesh.deshmukh@apexbank.example` — CEO role, password `TestPassword123!`
- 10 seed users across 2 tenants — defined in `prisma/seed.ts`

**Auth State (E2E):**

- `tests/auth.setup.ts` logs in and saves session cookie state to `playwright/.auth/`
- E2E tests reuse saved auth state: `test.use({ storageState: "playwright/.auth/user.json" })`

**Seed Data:**

- `prisma/seed.ts` — 1,690-line seeder, 10 users, 2 tenants, 39 exam areas, 568 exam items
- Run via `pnpm db:seed`

**Unit Test Data:**

- Inline test data in `describe`/`it` blocks — no shared fixtures directory
- Prisma types used directly for typed test objects

## Test Types

**Unit Tests (Vitest):**

- Scope: Pure functions in `src/lib/` and `src/services/`
- Focus: Scoring computations, permission checks, utility functions, Zod schema validation
- No DB or network — all external dependencies mocked

**E2E Tests (Playwright):**

- Scope: Full user workflows via browser automation
- Focus: Auth flows, page navigation, form submissions, data display
- Requires running app + seeded database
- Auth state shared across tests via `storageState`

**Integration Tests:**

- Not formalized — covered implicitly by E2E tests
- No dedicated integration test layer

## Common Patterns

**Async Testing (Vitest):**

```typescript
it("should resolve async operation", async () => {
  const result = await asyncFunction(input);
  expect(result).toEqual(expectedValue);
});
```

**Error Testing (Vitest):**

```typescript
it("should throw on invalid input", async () => {
  await expect(asyncFunction(invalidInput)).rejects.toThrow("Error message");
});

// Zod validation errors:
it("should reject invalid schema", () => {
  const result = MySchema.safeParse(invalidData);
  expect(result.success).toBe(false);
});
```

**Permission Testing:**

```typescript
// Mock session with specific role
vi.mocked(getRequiredSession).mockResolvedValue({
  user: { tenantId: "t1", roles: ["AUDITOR"], permissions: [...] },
});
```

## Preflight Requirements for E2E

Before running E2E tests, verify:

1. Dev server running on `http://localhost:3000`
2. Database seeded (`pnpm db:seed`)
3. No locked accounts in `FailedLoginAttempt` table
4. `BETTER_AUTH_URL` matches running server port
5. `DATABASE_URL` has no special characters (`/`, `@`, `#`, `%`)

---

_Testing analysis: 2026-02-25_
