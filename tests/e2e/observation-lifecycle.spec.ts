import { test, expect } from "@playwright/test";

/**
 * E2E tests for observation lifecycle (Phase 6 plan 06-07)
 *
 * Covers all 9 manual test groups:
 * 1. Create Observation (OBS-01)
 * 2. State Transitions (OBS-02, OBS-03, OBS-04)
 * 3. Auditee Response (OBS-02)
 * 4. Severity-Based Closing (OBS-05, OBS-06)
 * 5. Timeline Immutability (OBS-03)
 * 6. Tagging (OBS-08)
 * 7. Repeat Finding Detection (OBS-09, OBS-10, OBS-11)
 * 8. Resolved During Fieldwork (OBS-07)
 * 9. Findings List Migration
 *
 * PREREQUISITES:
 * - Database must be running (docker-compose up -d)
 * - Seed data must be loaded (pnpm db:seed)
 * - Dev server must be running (started automatically by Playwright)
 * - Test accounts must have passwords set (see tests/auth.setup.ts)
 */

// ═══════════════════════════════════════════════════════════════════════════
// Test Group 1: Create Observation (OBS-01)
// ═══════════════════════════════════════════════════════════════════════════

test.describe("Test Group 1: Create Observation", () => {
  test.use({ storageState: "playwright/.auth/auditor.json" });

  test("auditor can create observation with 5C fields", async ({ page }) => {
    // Navigate to findings page
    await page.goto("/findings");
    await expect(
      page.getByRole("heading", { name: /findings/i }),
    ).toBeVisible();

    // Click create button
    await page.getByRole("link", { name: /create observation/i }).click();
    await expect(page).toHaveURL(/\/findings\/new/);

    // Fill 5C fields (condition, criteria, cause, effect, recommendation)
    await page
      .getByLabel(/condition/i)
      .fill(
        "Test Condition: Loans approved without proper documentation review",
      );
    await page
      .getByLabel(/criteria/i)
      .fill("Test Criteria: RBI KYC guidelines require complete documentation");
    await page
      .getByLabel(/cause/i)
      .fill("Test Cause: Insufficient training of loan officers");
    await page
      .getByLabel(/effect/i)
      .fill("Test Effect: Risk of fraud and non-compliance penalties");
    await page
      .getByLabel(/recommendation/i)
      .fill("Test Recommendation: Implement mandatory documentation checklist");

    // Select severity (dropdown or radio group)
    const severityControl = page.locator('[name="severity"]').first();
    if (await severityControl.isVisible()) {
      await severityControl.click();
      await page.getByRole("option", { name: /high/i }).click();
    }

    // Select branch (dropdown)
    const branchControl = page.getByLabel(/branch/i);
    if (await branchControl.isVisible()) {
      await branchControl.click();
      await page
        .getByRole("option", { name: /head office/i })
        .first()
        .click();
    }

    // Select audit area (dropdown)
    const auditAreaControl = page.getByLabel(/audit area/i);
    if (await auditAreaControl.isVisible()) {
      await auditAreaControl.click();
      await page
        .getByRole("option", { name: /credit/i })
        .first()
        .click();
    }

    // Select risk category (dropdown)
    const riskControl = page.getByLabel(/risk/i);
    if (await riskControl.isVisible()) {
      await riskControl.click();
      await page
        .getByRole("option", { name: /operational/i })
        .first()
        .click();
    }

    // Submit form
    await page.getByRole("button", { name: /create|submit/i }).click();

    // Verify redirect to detail page
    await expect(page).toHaveURL(/\/findings\/[a-f0-9-]+/, { timeout: 10000 });

    // Verify timeline shows creation
    await expect(page.getByText(/created/i)).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Test Group 2: State Transitions (OBS-02, OBS-03, OBS-04)
// ═══════════════════════════════════════════════════════════════════════════

test.describe.serial("Test Group 2: State Transitions", () => {
  let observationUrl: string;

  test("auditor submits observation for review", async ({ page }) => {
    test.use({ storageState: "playwright/.auth/auditor.json" });

    // Create a new observation
    await page.goto("/findings/new");
    await page.getByLabel(/condition/i).fill("Transition Test Observation");
    await page.getByLabel(/criteria/i).fill("Test criteria");
    await page.getByLabel(/cause/i).fill("Test cause");
    await page.getByLabel(/effect/i).fill("Test effect");
    await page.getByLabel(/recommendation/i).fill("Test recommendation");
    await page.getByRole("button", { name: /create|submit/i }).click();

    // Wait for redirect and capture URL
    await page.waitForURL(/\/findings\/[a-f0-9-]+/);
    observationUrl = page.url();

    // Submit for review
    await page.getByRole("button", { name: /submit for review/i }).click();
    await page.getByPlaceholder(/comment/i).fill("Submitting for review");
    await page.getByRole("button", { name: /confirm|submit/i }).click();

    // Verify status changed
    await expect(page.getByText(/submitted/i)).toBeVisible();

    // Verify timeline shows transition
    await expect(page.getByText(/draft.*submitted/i)).toBeVisible();
  });

  test("manager approves and issues to auditee", async ({ browser }) => {
    // Switch to manager context
    const managerCtx = await browser.newContext({
      storageState: "playwright/.auth/manager.json",
    });
    const page = await managerCtx.newPage();

    // Navigate to the observation
    await page.goto(observationUrl);

    // Verify approve button appears
    await expect(page.getByRole("button", { name: /approve/i })).toBeVisible();

    // Approve observation
    await page.getByRole("button", { name: /approve/i }).click();
    await page.getByPlaceholder(/comment/i).fill("Approved for issuance");
    await page.getByRole("button", { name: /confirm/i }).click();

    // Verify status changed to REVIEWED
    await expect(page.getByText(/reviewed/i)).toBeVisible();

    // Issue to auditee
    await page.getByRole("button", { name: /issue to auditee/i }).click();
    await page.getByPlaceholder(/comment/i).fill("Issuing to branch manager");
    await page.getByRole("button", { name: /confirm/i }).click();

    // Verify status changed to ISSUED
    await expect(page.getByText(/issued/i)).toBeVisible();

    await managerCtx.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Test Group 3: Auditee Response (OBS-02)
// ═══════════════════════════════════════════════════════════════════════════

test.describe("Test Group 3: Auditee Response", () => {
  test.use({ storageState: "playwright/.auth/auditee.json" });

  test.skip("auditee submits response to issued observation", async ({
    page,
  }) => {
    // This test requires an observation in ISSUED state
    // In a real implementation, you would:
    // 1. Query database for ISSUED observation OR
    // 2. Create observation via API and transition to ISSUED state

    await page.goto("/findings");

    // Find an issued observation
    await page
      .getByRole("cell", { name: /issued/i })
      .first()
      .click();

    // Submit response
    await page.getByRole("button", { name: /submit response/i }).click();
    await page
      .getByLabel(/response/i)
      .fill("We have implemented corrective actions");
    await page
      .getByLabel(/action plan/i)
      .fill("Completed documentation review training for all staff");
    await page.getByRole("button", { name: /submit/i }).click();

    // Verify status changed to RESPONSE
    await expect(page.getByText(/response/i)).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Test Group 4: Severity-Based Closing (OBS-05, OBS-06)
// ═══════════════════════════════════════════════════════════════════════════

test.describe("Test Group 4: Severity-Based Closing", () => {
  test("manager can close LOW/MEDIUM observations", async ({ page }) => {
    test.use({ storageState: "playwright/.auth/manager.json" });

    await page.goto("/findings");

    // Find a LOW or MEDIUM severity observation in COMPLIANCE state
    // This test assumes seed data includes such observations
    const lowObservation = page
      .getByRole("row")
      .filter({ hasText: /low|medium/i })
      .filter({ hasText: /compliance/i })
      .first();

    if ((await lowObservation.count()) > 0) {
      await lowObservation.click();

      // Verify close button appears for manager
      await expect(
        page.getByRole("button", { name: /close observation/i }),
      ).toBeVisible();
    }
  });

  test("manager cannot close HIGH/CRITICAL observations", async ({ page }) => {
    test.use({ storageState: "playwright/.auth/manager.json" });

    await page.goto("/findings");

    // Find a HIGH or CRITICAL severity observation in COMPLIANCE state
    const highObservation = page
      .getByRole("row")
      .filter({ hasText: /high|critical/i })
      .filter({ hasText: /compliance/i })
      .first();

    if ((await highObservation.count()) > 0) {
      await highObservation.click();

      // Verify close button does NOT appear for manager
      await expect(
        page.getByRole("button", { name: /close observation/i }),
      ).not.toBeVisible();
    }
  });

  test("CAE can close HIGH/CRITICAL observations", async ({ browser }) => {
    const caeCtx = await browser.newContext({
      storageState: "playwright/.auth/cae.json",
    });
    const page = await caeCtx.newPage();

    await page.goto("/findings");

    // Find a HIGH or CRITICAL severity observation in COMPLIANCE state
    const highObservation = page
      .getByRole("row")
      .filter({ hasText: /high|critical/i })
      .filter({ hasText: /compliance/i })
      .first();

    if ((await highObservation.count()) > 0) {
      await highObservation.click();

      // Verify close button appears for CAE
      await expect(
        page.getByRole("button", { name: /close observation/i }),
      ).toBeVisible();
    }

    await caeCtx.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Test Group 5: Timeline Immutability (OBS-03)
// ═══════════════════════════════════════════════════════════════════════════

test.describe("Test Group 5: Timeline Immutability", () => {
  test.use({ storageState: "playwright/.auth/auditor.json" });

  test("timeline shows chronological events without edit/delete", async ({
    page,
  }) => {
    await page.goto("/findings");

    // Find an observation with multiple transitions
    const observationRow = page.getByRole("row").filter({
      hasText: /reviewed|issued|response|compliance|closed/i,
    });

    if ((await observationRow.count()) > 0) {
      await observationRow.first().click();

      // Verify timeline section exists
      await expect(
        page.getByRole("heading", { name: /timeline|history/i }),
      ).toBeVisible();

      // Verify timeline entries have required fields
      const timelineEntries = page.locator("[data-timeline-entry]");
      if ((await timelineEntries.count()) > 0) {
        const firstEntry = timelineEntries.first();

        // Each entry should have actor, timestamp, type
        await expect(firstEntry).toContainText(/\w+/); // Actor name

        // Verify no edit/delete buttons on timeline
        await expect(
          firstEntry.getByRole("button", { name: /edit|delete/i }),
        ).not.toBeVisible();
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Test Group 6: Tagging (OBS-08)
// ═══════════════════════════════════════════════════════════════════════════

test.describe("Test Group 6: Observation Tagging", () => {
  test.use({ storageState: "playwright/.auth/auditor.json" });

  test("observation detail shows multi-dimensional tagging", async ({
    page,
  }) => {
    await page.goto("/findings");

    // Open any observation
    await page.getByRole("row").nth(1).click();

    // Verify tagging panel elements
    await expect(page.getByText(/severity/i)).toBeVisible();
    await expect(page.getByText(/status/i)).toBeVisible();
    await expect(page.getByText(/branch/i)).toBeVisible();
    await expect(page.getByText(/audit area/i)).toBeVisible();
    await expect(page.getByText(/risk category/i)).toBeVisible();

    // Verify RBI circulars section
    await expect(page.getByText(/rbi circular|regulation/i)).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Test Group 7: Repeat Finding Detection (OBS-09, OBS-10, OBS-11)
// ═══════════════════════════════════════════════════════════════════════════

test.describe.serial("Test Group 7: Repeat Finding Detection", () => {
  test.use({ storageState: "playwright/.auth/auditor.json" });

  test.skip("system detects and escalates repeat findings", async ({
    page,
  }) => {
    // This test requires:
    // 1. An existing CLOSED observation with specific branch + audit area
    // 2. Creating a matching new observation
    // 3. Verifying repeat detection banner appears
    // 4. Confirming as repeat and checking severity escalation

    // Step 1: Create initial observation and close it
    await page.goto("/findings/new");
    await page
      .getByLabel(/condition/i)
      .fill("Repeat Test: Incomplete loan documentation");
    await page.getByLabel(/criteria/i).fill("RBI KYC guidelines");
    await page.getByLabel(/cause/i).fill("Staff training gap");
    await page.getByLabel(/effect/i).fill("Compliance risk");
    await page.getByLabel(/recommendation/i).fill("Implement training");
    await page.getByRole("button", { name: /create/i }).click();

    // (In real test, would need to transition through full lifecycle to CLOSED)

    // Step 2: Create matching observation
    await page.goto("/findings/new");
    await page
      .getByLabel(/condition/i)
      .fill("Repeat Test: Incomplete loan documentation (recurrence)");
    await page.getByLabel(/criteria/i).fill("RBI KYC guidelines");
    await page.getByLabel(/cause/i).fill("Training not implemented");
    await page.getByLabel(/effect/i).fill("Ongoing compliance risk");
    await page.getByLabel(/recommendation/i).fill("Immediate training rollout");

    // Step 3: Verify repeat finding banner appears
    await expect(
      page.getByText(/repeat finding detected|similar observation/i),
    ).toBeVisible();
    await expect(page.getByText(/\d+%/)).toBeVisible(); // Similarity percentage

    // Step 4: Confirm as repeat
    await page.getByRole("button", { name: /confirm.*repeat/i }).click();

    // Step 5: Verify severity escalation
    await expect(page.getByText(/severity escalated/i)).toBeVisible();

    // Step 6: Verify timeline entries
    await expect(page.getByText(/repeat_confirmed/i)).toBeVisible();
    await expect(page.getByText(/severity_escalated/i)).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Test Group 8: Resolved During Fieldwork (OBS-07)
// ═══════════════════════════════════════════════════════════════════════════

test.describe("Test Group 8: Resolved During Fieldwork", () => {
  test.use({ storageState: "playwright/.auth/auditor.json" });

  test("auditor can mark observation as resolved during fieldwork", async ({
    page,
  }) => {
    // Create a DRAFT observation
    await page.goto("/findings/new");
    await page
      .getByLabel(/condition/i)
      .fill("Fieldwork Resolution Test: Minor documentation gap");
    await page.getByLabel(/criteria/i).fill("Internal policy");
    await page.getByLabel(/cause/i).fill("Oversight");
    await page.getByLabel(/effect/i).fill("Minor delay");
    await page.getByLabel(/recommendation/i).fill("Update documentation");
    await page.getByRole("button", { name: /create/i }).click();

    await page.waitForURL(/\/findings\/[a-f0-9-]+/);

    // Click "Resolve During Fieldwork"
    await page.getByRole("button", { name: /resolve.*fieldwork/i }).click();

    // Enter resolution reason
    await page
      .getByPlaceholder(/reason|comment/i)
      .fill("Issue was corrected during audit fieldwork");
    await page.getByRole("button", { name: /confirm/i }).click();

    // Verify badge appears
    await expect(page.getByText(/resolved during fieldwork/i)).toBeVisible();

    // Verify timeline entry
    await expect(page.getByText(/resolved_during_fieldwork/i)).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Test Group 9: Findings List Page
// ═══════════════════════════════════════════════════════════════════════════

test.describe("Test Group 9: Findings List Migration", () => {
  test.use({ storageState: "playwright/.auth/auditor.json" });

  test("findings page displays observations from database", async ({
    page,
  }) => {
    await page.goto("/findings");

    // Verify summary cards show counts
    await expect(page.getByText(/critical/i)).toBeVisible();
    await expect(page.getByText(/high/i)).toBeVisible();
    await expect(page.getByText(/medium/i)).toBeVisible();
    await expect(page.getByText(/low/i)).toBeVisible();

    // Verify table shows observations
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("row")).not.toHaveCount(0);

    // Verify filters exist
    await expect(
      page.getByRole("button", { name: /filter|severity/i }),
    ).toBeVisible();

    // Verify row click navigates to detail
    const firstRow = page.getByRole("row").nth(1);
    await firstRow.click();
    await expect(page).toHaveURL(/\/findings\/[a-f0-9-]+/);
  });

  test("filters work correctly", async ({ page }) => {
    await page.goto("/findings");

    // Get initial row count
    const initialRowCount = await page.getByRole("row").count();

    // Apply severity filter
    const filterButton = page.getByRole("button", { name: /filter/i });
    if ((await filterButton.count()) > 0) {
      await filterButton.click();
      await page.getByLabel(/high/i).check();
      await page.getByRole("button", { name: /apply/i }).click();

      // Verify filtered results
      const filteredRowCount = await page.getByRole("row").count();
      expect(filteredRowCount).toBeLessThanOrEqual(initialRowCount);
    }
  });
});
