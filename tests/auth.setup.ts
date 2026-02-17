import { test as setup, expect } from "@playwright/test";

/**
 * Authentication setup — creates storageState for 4 roles.
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

    // Save state
    await page.context().storageState({ path: user.file });
    console.log(`✓ ${user.role} (${user.email})`);
  });
}
