import { test as setup, expect } from "@playwright/test";

/**
 * Authentication setup for Playwright E2E tests
 *
 * Creates authenticated browser states for 4 roles:
 * - Auditor: suresh.patil@apexbank.example (AUDITOR role)
 * - Manager: priya.sharma@apexbank.example (CAE + AUDIT_MANAGER roles)
 * - CAE: priya.sharma@apexbank.example (same as manager - dual-hatting)
 * - Auditee: vikram.kulkarni@apexbank.example (AUDITEE + AUDITOR roles)
 *
 * PREREQUISITES:
 * - Database must be running (docker-compose up -d)
 * - Seed data must be loaded (pnpm db:seed)
 * - Test accounts must have passwords set in Better Auth Account table
 *
 * If tests fail with authentication errors, you may need to manually create
 * test accounts via the signup form or add password seeding to seed.ts.
 */

// Demo user credentials
// NOTE: Adjust password if different in your test environment
const TEST_PASSWORD = "TestPassword123!";

const users = [
  {
    role: "auditor",
    email: "suresh.patil@apexbank.example",
    file: "playwright/.auth/auditor.json",
  },
  {
    role: "manager",
    email: "priya.sharma@apexbank.example",
    file: "playwright/.auth/manager.json",
  },
  {
    role: "cae",
    email: "priya.sharma@apexbank.example", // Same as manager (dual-hatting)
    file: "playwright/.auth/cae.json",
  },
  {
    role: "auditee",
    email: "vikram.kulkarni@apexbank.example",
    file: "playwright/.auth/auditee.json",
  },
];

for (const user of users) {
  setup(`authenticate as ${user.role}`, async ({ page }) => {
    // Navigate to login page
    await page.goto("/login");

    // Wait for login form to be visible
    await expect(page.getByLabel("Email Address")).toBeVisible();

    // Fill in credentials
    await page.getByLabel("Email Address").fill(user.email);
    await page.getByLabel("Password").fill(TEST_PASSWORD);

    // Submit login form
    await page.getByRole("button", { name: /sign in/i }).click();

    // Wait for redirect to dashboard (indicates successful login)
    await page.waitForURL("**/dashboard", { timeout: 30000 });

    // Verify we're logged in by checking for dashboard elements
    await expect(page.getByText(/Dashboard|Overview/i).first()).toBeVisible({
      timeout: 5000,
    });

    // Save authenticated state
    await page.context().storageState({ path: user.file });

    console.log(`✓ Authenticated as ${user.role} (${user.email})`);
  });
}
