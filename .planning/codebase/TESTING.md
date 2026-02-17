# AEGIS Testing Documentation

## Test Setup Overview

AEGIS uses **Playwright** for end-to-end testing. Unit testing infrastructure (Vitest) is configured but minimally used.

### Test Configuration

**File: `playwright.config.ts`**

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false, // Serial execution for state-dependent tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid race conditions
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 30000,

  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    headless: true,
  },

  projects: [
    // Auth setup runs first
    { name: "setup", testMatch: /.*\.setup\.ts/ },

    // Role-based test projects
    {
      name: "auditor",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/auditor.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "manager",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/manager.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "cae",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/cae.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "auditee",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/auditee.json",
      },
      dependencies: ["setup"],
    },
  ],
});
```

### Test Scripts

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## Test Structure

### Directory Layout

```
tests/
├── auth.setup.ts                    # Auth setup for 4 role storageStates
└── e2e/
    ├── observation-lifecycle.spec.ts # Full observation CRUD flow
    └── permission-guards.spec.ts     # RBAC permission enforcement
```

### Storage State Files (Generated)

```
playwright/
└── .auth/
    ├── auditor.json
    ├── manager.json
    ├── cae.json
    └── auditee.json
```

---

## Auth Setup Pattern

**File: `tests/auth.setup.ts`**

This setup file runs BEFORE all tests to create authenticated browser contexts for each role.

```typescript
import { test as setup, expect } from "@playwright/test";

/**
 * Authentication setup — creates storageState for 4 roles.
 * 
 * Each user logs in and saves cookies/localStorage to a JSON file.
 * Test projects load these files to bypass login for every test.
 */

const users = [
  {
    role: "auditor",
    email: "auditor@nexlybank.com",
    password: "Aegis@Test2026!",
    file: "playwright/.auth/auditor.json",
  },
  {
    role: "manager",
    email: "naveenchhikara@gmail.com",
    password: "Aegis@Admin2026!",
    file: "playwright/.auth/manager.json",
  },
  {
    role: "cae",
    email: "cae@nexlybank.com",
    password: "Aegis@Test2026!",
    file: "playwright/.auth/cae.json",
  },
  {
    role: "auditee",
    email: "cco@nexlybank.com",
    password: "Aegis@Test2026!",
    file: "playwright/.auth/auditee.json",
  },
];

for (const user of users) {
  setup(`authenticate as ${user.role}`, async ({ page }) => {
    await page.goto("/login");

    // Wait for the form to hydrate (client component)
    await page.waitForSelector('input#email', { timeout: 15000 });

    // Fill by ID (reliable, matches the JSX id= attributes)
    await page.fill('input#email', user.email);
    await page.fill('input#password', user.password);

    // Click Sign In button
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL("**/dashboard**", { timeout: 15000 });

    // Save state (cookies + localStorage)
    await page.context().storageState({ path: user.file });
    console.log(`✓ ${user.role} (${user.email})`);
  });
}
```

### How Storage State Works

1. **Setup phase:** Each user logs in, session cookie is created
2. **Save state:** `storageState()` saves cookies/localStorage to JSON
3. **Test execution:** Playwright loads the JSON file → browser has valid session
4. **Skip login:** Tests can directly navigate to protected routes

---

## E2E Test Patterns

### Basic Test Structure

```typescript
import { test, expect } from "@playwright/test";

test.describe("Feature Name", () => {
  test("should perform action", async ({ page }) => {
    // Arrange: Navigate to page
    await page.goto("/path");

    // Act: Perform user actions
    await page.click('button#action');

    // Assert: Verify outcome
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

### Observation Lifecycle Test

**File: `tests/e2e/observation-lifecycle.spec.ts`**

This test verifies the full CRUD flow for observations.

```typescript
import { test, expect } from "@playwright/test";

test.describe("Observation Lifecycle", () => {
  test.describe.configure({ mode: "serial" }); // Run tests in order

  let observationId: string;

  test("should create observation as auditor", async ({ page }) => {
    // Navigate to form
    await page.goto("/findings/new");

    // Wait for form hydration
    await page.waitForSelector('input#title');

    // Fill 5C fields
    await page.fill('input#title', "Test Observation - Lifecycle");
    await page.fill('textarea#condition', "Condition: Test condition text...");
    await page.fill('textarea#criteria', "Criteria: Test criteria text...");
    await page.fill('textarea#cause', "Cause: Test cause text...");
    await page.fill('textarea#effect', "Effect: Test effect text...");
    await page.fill('textarea#recommendation', "Recommendation: Test recommendation text...");

    // Select severity
    await page.click('button#severity');
    await page.click('text=High');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect to detail page
    await page.waitForURL(/\/findings\/[a-f0-9-]+$/);

    // Extract observation ID from URL
    const url = page.url();
    observationId = url.split("/").pop()!;

    // Verify success toast
    await expect(page.locator('text=created successfully')).toBeVisible({ timeout: 5000 });

    // Verify observation appears on page
    await expect(page.locator('h1:has-text("Test Observation - Lifecycle")')).toBeVisible();
  });

  test("should view observation detail", async ({ page }) => {
    // Navigate to observation detail
    await page.goto(`/findings/${observationId}`);

    // Verify 5C fields are displayed
    await expect(page.locator('text=Condition: Test condition')).toBeVisible();
    await expect(page.locator('text=Criteria: Test criteria')).toBeVisible();
    await expect(page.locator('text=Cause: Test cause')).toBeVisible();
    await expect(page.locator('text=Effect: Test effect')).toBeVisible();
    await expect(page.locator('text=Recommendation: Test recommendation')).toBeVisible();
  });

  test("should submit observation for review", async ({ page }) => {
    await page.goto(`/findings/${observationId}`);

    // Click "Submit for Review" button
    await page.click('button:has-text("Submit for Review")');

    // Wait for status update
    await expect(page.locator('text=Status: Submitted')).toBeVisible({ timeout: 5000 });
  });
});
```

### Permission Guard Test

**File: `tests/e2e/permission-guards.spec.ts`**

This test verifies RBAC enforcement.

```typescript
import { test, expect } from "@playwright/test";

test.describe("Permission Guards", () => {
  test("auditor can create observations", async ({ page }) => {
    await page.goto("/findings/new");
    
    // Should see the form
    await expect(page.locator('input#title')).toBeVisible();
  });

  test("auditee cannot access admin panel", async ({ page }) => {
    await page.goto("/admin/users");
    
    // Should redirect or show unauthorized
    await expect(page.locator('text=Unauthorized')).toBeVisible({ timeout: 5000 });
  });

  test("CAE can access audit trail", async ({ page }) => {
    await page.goto("/audit-trail");
    
    // Should see audit trail table
    await expect(page.locator('table')).toBeVisible();
  });
});
```

---

## Test Patterns Used

### 1. Page Object Pattern (Minimal)

Tests use direct selectors instead of full page objects to keep tests simple and readable.

```typescript
// Instead of:
// const loginPage = new LoginPage(page);
// await loginPage.login(email, password);

// We use direct selectors:
await page.fill('input#email', email);
await page.fill('input#password', password);
await page.click('button[type="submit"]');
```

### 2. Serial Test Execution

For state-dependent tests (e.g., create → view → update), use serial mode:

```typescript
test.describe.configure({ mode: "serial" });

let resourceId: string;

test("create", async ({ page }) => {
  // Create and capture ID
  resourceId = await createResource(page);
});

test("update", async ({ page }) => {
  // Use resourceId from previous test
  await updateResource(page, resourceId);
});
```

### 3. Selector Strategies

**Priority order:**

1. **ID selectors** (most reliable): `'input#email'`
2. **Test ID attributes** (if added): `'[data-testid="submit-button"]'`
3. **Accessible names** (good for buttons): `'button:has-text("Submit")'`
4. **CSS selectors** (last resort): `'.submit-button'`

### 4. Waiting for Dynamic Content

**Use built-in waits:**

```typescript
// Wait for selector
await page.waitForSelector('input#email', { timeout: 15000 });

// Wait for URL change
await page.waitForURL("**/dashboard**", { timeout: 15000 });

// Wait for visibility (implicit in expect)
await expect(page.locator('text=Success')).toBeVisible({ timeout: 5000 });
```

### 5. Toast/Notification Assertions

```typescript
// Wait for toast to appear
await expect(page.locator('text=created successfully')).toBeVisible({ timeout: 5000 });

// Toast might auto-hide, so don't wait too long after action
```

---

## What's Tested

### ✅ Currently Covered

1. **Authentication Flow**
   - Login for 4 roles (auditor, manager, cae, auditee)
   - Session persistence via storageState

2. **Observation Lifecycle**
   - Create observation (5C fields)
   - View observation detail
   - Submit for review (status transition)

3. **Permission Guards**
   - Auditor can create observations
   - Auditee cannot access admin panel
   - CAE can access audit trail

### ❌ Not Yet Tested

1. **Observation Management**
   - Edit observation
   - Delete observation
   - Resolve during fieldwork
   - Assign to user
   - Upload evidence
   - Add comments

2. **Status Transitions**
   - DRAFT → SUBMITTED (tested)
   - SUBMITTED → REVIEWED (not tested)
   - REVIEWED → ISSUED (not tested)
   - ISSUED → RESPONSE (not tested)
   - RESPONSE → COMPLIANCE (not tested)
   - COMPLIANCE → CLOSED (not tested)

3. **Multi-Role Workflows**
   - Auditor creates → Manager reviews → CAE approves
   - Auditee responds to observation
   - Maker-checker enforcement (creator ≠ approver)

4. **Compliance Management**
   - View compliance requirements
   - Update compliance status
   - Mark as N/A
   - Upload evidence

5. **Audit Plans**
   - Create audit plan
   - Add engagements
   - Link observations to engagements

6. **Reports**
   - Generate board report
   - Export to Excel
   - Export to PDF

7. **Admin Functions**
   - Create user
   - Assign roles
   - Manage branches
   - Manage audit areas

8. **Settings**
   - Update tenant settings
   - Update notification preferences

9. **Onboarding**
   - Multi-step wizard flow
   - Excel bulk upload
   - Validation errors

10. **Error Cases**
    - Form validation errors
    - Permission denied errors
    - Network errors
    - Optimistic locking conflicts

11. **Edge Cases**
    - Concurrent edits
    - Session expiry
    - Large data sets
    - File upload limits

---

## Unit Testing (Vitest - Minimal Usage)

### Configuration

**File: `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    globals: true,
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
```

### Current Status

**No unit tests written yet.** The codebase focuses on E2E testing with Playwright.

### Potential Unit Test Targets

If unit tests were added, these would be good candidates:

1. **Lib utilities:**
   - `src/lib/permissions.ts` - `hasPermission()`, `getPermissions()`
   - `src/lib/fiscal-year.ts` - `getCurrentFiscalYear()`, `getCurrentQuarter()`
   - `src/lib/utils.ts` - `cn()` class name merging
   - `src/lib/state-machine.ts` - Observation status transitions

2. **Validation logic:**
   - `src/lib/onboarding-validation.ts` - Step validation functions
   - `src/actions/*/schemas.ts` - Zod schema edge cases

3. **Data transformations:**
   - `src/lib/excel-parsers/*.ts` - Excel parsing logic
   - `src/lib/report-utils.ts` - Report data aggregation

**Example unit test (not implemented):**

```typescript
// src/lib/__tests__/permissions.test.ts
import { describe, it, expect } from "vitest";
import { hasPermission, Role } from "../permissions";

describe("hasPermission", () => {
  it("should return true for CAE with audit_trail:read", () => {
    const roles: Role[] = ["CAE"];
    expect(hasPermission(roles, "audit_trail:read")).toBe(true);
  });

  it("should return false for AUDITOR with audit_trail:read", () => {
    const roles: Role[] = ["AUDITOR"];
    expect(hasPermission(roles, "audit_trail:read")).toBe(false);
  });

  it("should handle multi-role users", () => {
    const roles: Role[] = ["AUDITOR", "CAE"];
    expect(hasPermission(roles, "audit_trail:read")).toBe(true);
  });
});
```

---

## Running Tests

### Local Development

**1. Start the application:**

```bash
# In one terminal: start dev server
pnpm dev

# Or: use Docker Compose
docker-compose up
```

**2. Run tests:**

```bash
# Run all E2E tests (headless)
pnpm test:e2e

# Run with UI mode (interactive)
pnpm test:e2e:ui

# Run specific test file
pnpm test:e2e tests/e2e/observation-lifecycle.spec.ts

# Run specific project (role)
pnpm test:e2e --project=auditor
```

### CI/CD (Not yet configured)

**Future GitHub Actions workflow:**

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 22
      - run: corepack enable
      - run: pnpm install --frozen-lockfile
      - run: docker-compose up -d
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Test Reports

### HTML Report

After test execution, view the HTML report:

```bash
npx playwright show-report
```

Opens browser with:
- Test results summary
- Screenshots (on failure)
- Traces (on retry)
- Video (if configured)

### Trace Viewer

For failed tests with traces:

```bash
npx playwright show-trace playwright-report/trace-*.zip
```

Shows:
- Network requests
- Console logs
- DOM snapshots
- Action timeline

---

## Test Data Strategy

### Current Approach: Shared Test Database

- Tests run against a shared PostgreSQL database
- Auth setup creates user sessions for existing users
- Tests create/modify data during execution
- No automatic cleanup between test runs

### Challenges

1. **State pollution:** Tests may interfere with each other
2. **Data dependencies:** Tests assume certain data exists
3. **No isolation:** Concurrent test runs would conflict

### Future Improvements

**1. Test Database Seeding:**

```typescript
// tests/seed.ts
export async function seedTestData() {
  await prisma.tenant.create({ data: { ... } });
  await prisma.user.create({ data: { ... } });
  await prisma.branch.create({ data: { ... } });
}
```

**2. Cleanup Hooks:**

```typescript
test.afterEach(async ({ page }) => {
  // Delete test data created during test
  await cleanupTestData(page);
});
```

**3. Isolated Test Tenants:**

```typescript
test("should create observation", async ({ page }) => {
  const tenantId = await createTestTenant();
  
  // Test with isolated tenant
  await loginAsUser(page, { tenantId });
  
  // Cleanup
  await deleteTestTenant(tenantId);
});
```

---

## Best Practices for Adding Tests

### 1. Follow Existing Patterns

Look at `tests/e2e/observation-lifecycle.spec.ts` for reference.

### 2. Use Reliable Selectors

```typescript
// ✅ GOOD: ID selector
await page.fill('input#email', email);

// ✅ GOOD: Text selector for buttons
await page.click('button:has-text("Submit")');

// ❌ BAD: Fragile class selector
await page.click('.btn-submit');
```

### 3. Add Explicit Waits

```typescript
// ✅ GOOD: Wait for element before interacting
await page.waitForSelector('input#email');
await page.fill('input#email', email);

// ❌ BAD: Hope it's already there
await page.fill('input#email', email);
```

### 4. Use Storage State for Auth

Don't log in manually in every test. Use the storage state from `auth.setup.ts`.

### 5. Test Happy Paths First

Focus on core user workflows before edge cases.

### 6. Keep Tests Independent

Each test should work standalone (don't rely on previous test state).

### 7. Use Descriptive Test Names

```typescript
// ✅ GOOD
test("should create observation with all required fields", async ({ page }) => {

// ❌ BAD
test("test1", async ({ page }) => {
```

### 8. Add Comments for Complex Logic

```typescript
// Waiting for form hydration because it's a client component
await page.waitForSelector('input#email', { timeout: 15000 });
```

---

## Known Test Issues

### 1. Non-Deterministic Timing

Some tests may fail intermittently due to:
- Toast auto-hide timing
- Network latency
- Client component hydration

**Solution:** Add explicit waits and generous timeouts for assertions.

### 2. State Pollution

Tests modify shared database, which can affect subsequent runs.

**Solution:** Future work to add cleanup hooks or isolated test data.

### 3. Serial Execution Required

Tests run serially (`workers: 1`) to avoid race conditions.

**Solution:** This is intentional for now. Parallel execution requires better isolation.

---

## Future Testing Roadmap

### Phase 1: Coverage Expansion
- [ ] Full observation lifecycle (all status transitions)
- [ ] Evidence upload/download
- [ ] Multi-role workflows (maker-checker)

### Phase 2: Core Features
- [ ] Compliance management
- [ ] Audit plans
- [ ] Report generation

### Phase 3: Admin & Settings
- [ ] User management
- [ ] Role assignment
- [ ] Tenant settings

### Phase 4: Error Cases
- [ ] Form validation errors
- [ ] Permission denied
- [ ] Optimistic locking conflicts

### Phase 5: Unit Tests
- [ ] Lib utilities
- [ ] Validation logic
- [ ] Data transformations

### Phase 6: Infrastructure
- [ ] CI/CD integration
- [ ] Test database seeding
- [ ] Parallel execution with isolation
