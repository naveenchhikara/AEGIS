# Testing Patterns

**Analysis Date:** 2026-02-08
**Updated:** 2026-02-11 (post v2.0 MVP)

## Test Framework

**E2E Runner:**

- Playwright (configured in `playwright.config.ts`)
- 4 role-based test projects: auditor, manager, CAE, auditee
- Auth setup project with persistent session storage (`playwright/.auth/`)

**Unit Test Runner:**

- Vitest installed as dependency but no unit test files yet
- No `vitest.config.ts` configured

**Run Commands:**

```bash
pnpm test:e2e          # Run Playwright E2E tests
pnpm test:e2e:ui       # Run with Playwright UI mode
```

## Test File Organization

**Location:**

- E2E tests: `tests/e2e/`
- No unit tests in `src/`

**Naming:**

- E2E: `*.spec.ts` (e.g., `observation-lifecycle.spec.ts`, `permission-guards.spec.ts`)

**Structure:**

```
tests/
└── e2e/
    ├── observation-lifecycle.spec.ts    # Full observation 7-state workflow
    └── permission-guards.spec.ts        # Role-based access control
playwright/
└── .auth/                               # Stored auth sessions per role
playwright.config.ts                     # Multi-project config
```

## Test Structure

**Suite Organization:**

- E2E tests organized by feature domain
- Each test project authenticates as a specific role
- Auth setup runs once, sessions reused across tests

**Patterns:**

- Role-based test isolation (auditor sees different UI than CAE)
- Shared auth setup project avoids repeated login flows
- Tests use Playwright locators for element selection

## Mocking

**Framework:** Not configured for unit tests

**E2E Approach:**

- Tests run against real database (seeded test data)
- Test accounts with password "TestPassword123!" created via seed script
- No HTTP mocking — full stack integration

**What to Mock (for future unit tests):**

- Database calls (Prisma client)
- AWS services (S3, SES)
- Better Auth session
- `next-intl` translation hooks
- Next.js router hooks (`useRouter`, `usePathname`)

**What NOT to Mock:**

- Pure utility functions (`formatDate`, `cn`)
- Zod validation schemas
- TypeScript types and constants

## Fixtures and Factories

**Test Data:**

- Database seeded with test tenants, users, and observations via `pnpm db:seed`
- Seed script creates users with known passwords for E2E auth
- Legacy demo data in `src/data/demo/` available but not used in tests

**Location:**

- Seed data: `prisma/seed.ts` (or similar)
- E2E fixtures: Inline in test files

## Coverage

**E2E Coverage:**

- Observation lifecycle: Full 7-state workflow (Draft → Closed)
- Permission guards: Role-based access control for all roles
- Not covered: i18n switching, report generation, Excel exports, evidence upload

**Unit Test Coverage:**

- None (no unit tests exist)

**Coverage Reporting:**

```bash
# No coverage reporting configured yet
```

## Test Types

**Unit Tests:**

- Not present. Recommended before pilot.

**Integration Tests:**

- Not present (E2E tests serve as integration tests)

**E2E Tests:**

- 2 test specs covering core workflows:
  - `observation-lifecycle.spec.ts` — Create, transition through all 7 states
  - `permission-guards.spec.ts` — Verify role-based UI filtering and access control

## Recommendations for Future Testing

### Priority Test Targets

**Critical (add before pilot):**

1. `src/lib/report-utils.ts` — RBI regulatory threshold calculations (unit tests with Vitest)
2. Server action validation — Zod schema edge cases for observation creation, state transitions
3. Multi-tenant isolation — Verify tenant A cannot access tenant B data

**High Priority:**

1. Evidence upload flow — S3 integration, file type validation
2. Email notification rendering — Template output verification
3. Onboarding wizard — Excel upload parsing, step persistence

**Medium Priority:**

1. Dashboard aggregation queries — Verify counts match actual data
2. Excel export formatting — Column headers, data accuracy
3. Repeat finding detection — Branch + audit area + risk category matching

### Suggested Unit Test Setup

```bash
# Add Vitest configuration
pnpm add -D vitest @vitejs/plugin-react
pnpm add -D @testing-library/react @testing-library/jest-dom
pnpm add -D jsdom
```

### Testing Patterns to Establish

**For Server Actions:**

```typescript
describe("createObservation", () => {
  it("validates required fields with Zod", async () => {
    // Test missing condition/criteria/cause/effect
  });

  it("enforces tenant isolation", async () => {
    // Tenant A user cannot create in tenant B
  });

  it("records audit log entry", async () => {
    // Verify AuditLog created after mutation
  });
});
```

**For Report Calculations:**

```typescript
describe("report-utils", () => {
  it("correctly categorizes CRAR below 9% as critical", () => {
    // Test RBI regulatory threshold
  });

  it("calculates compliance score from observation data", () => {
    // Test aggregation logic
  });
});
```

**For E2E (extend existing):**

```typescript
test("auditee can upload evidence and auditor sees it", async ({ page }) => {
  // Test cross-role workflow
});

test("observation deadline triggers reminder email", async ({ page }) => {
  // Test notification pipeline
});
```

---

_Testing analysis: 2026-02-08_
_Updated: 2026-02-11 — reflects v2.0 Working Core MVP (shipped 2026-02-10)_

**Note:** v2.0 added Playwright E2E tests covering the core observation lifecycle and role-based permissions. Unit tests for business logic (report calculations, regulatory thresholds) are the highest priority gap remaining before pilot deployment.
