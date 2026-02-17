import { test as setup, expect } from "@playwright/test";

/**
 * Authentication setup for Playwright E2E tests
 *
 * Creates authenticated browser states for 4 roles using production test accounts.
 * Runs once before all test projects.
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

    // Fill credentials — try common label patterns
    const emailInput = page.getByLabel(/email/i).first();
    await emailInput.waitFor({ timeout: 10000 });
    await emailInput.fill(user.email);

    const passwordInput = page.getByLabel(/password/i).first();
    await passwordInput.fill(user.password);

    // Submit
    await page.getByRole("button", { name: /sign in|log in|login/i }).click();

    // Wait for redirect to dashboard
    await page.waitForURL("**/dashboard**", { timeout: 15000 });

    // Save authenticated state
    await page.context().storageState({ path: user.file });

    console.log(`✓ Authenticated as ${user.role} (${user.email})`);
  });
}
