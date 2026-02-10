import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for AEGIS E2E tests
 *
 * Features:
 * - Auth setup project runs once before all tests
 * - 4 role-based test projects (auditor, manager, CAE, auditee)
 * - Automatically starts Next.js dev server
 * - Uses storageState for authenticated sessions
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },

  projects: [
    // Auth setup runs once before all tests
    { name: "setup", testMatch: /.*\.setup\.ts/ },

    // Auditor tests (default role)
    {
      name: "auditor",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/auditor.json",
      },
      dependencies: ["setup"],
    },

    // Manager tests
    {
      name: "manager",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/manager.json",
      },
      dependencies: ["setup"],
    },

    // CAE tests
    {
      name: "cae",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/cae.json",
      },
      dependencies: ["setup"],
    },

    // Auditee tests
    {
      name: "auditee",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/auditee.json",
      },
      dependencies: ["setup"],
    },
  ],

  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
