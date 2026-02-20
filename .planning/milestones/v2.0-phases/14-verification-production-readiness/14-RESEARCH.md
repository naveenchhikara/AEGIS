# Phase 14: Verification & Production Readiness - Research

**Researched:** 2026-02-10
**Domain:** Quality Assurance, E2E Testing, AWS SES, Documentation Standards
**Confidence:** HIGH

## Summary

Phase 14 closes verification gaps from phases 6-10 by creating missing VERIFICATION.md files, executing E2E browser tests with Playwright, testing Better Auth permission guards, and completing AWS SES domain verification. This is a quality assurance phase with no new features — it formalizes completion of phases 6-10 and confirms production readiness.

**Key insight:** Phase 14 is about evidence and formalization. The features already work (phases 6-10 are code-complete), but verification documentation is missing and some manual tests were deferred to "Phase 14" during implementation. This phase closes those gaps.

**Primary recommendation:** Use Playwright for E2E tests with authentication state persistence, follow the existing VERIFICATION.md format from Phase 11, complete AWS SES DNS setup immediately (3-5 day lead time), and create comprehensive verification reports for phases 6-10 using automated checks where possible.

## Standard Stack

### Core

| Library     | Version | Purpose                   | Why Standard                                                                   |
| ----------- | ------- | ------------------------- | ------------------------------------------------------------------------------ |
| Playwright  | 1.49+   | E2E browser testing       | Official Next.js testing recommendation, cross-browser, fast, TypeScript-first |
| Better Auth | 1.x     | Authentication testing    | Already in project, built-in session management, multi-session support         |
| AWS SES     | API v2  | Email domain verification | Production email sending, Mumbai region compliance, already configured         |

### Supporting

| Library          | Version | Purpose                            | When to Use                                       |
| ---------------- | ------- | ---------------------------------- | ------------------------------------------------- |
| @playwright/test | 1.49+   | Test runner with built-in fixtures | All E2E tests, authentication state management    |
| aws-sdk          | v3      | AWS SES API interaction            | Sending test emails, checking verification status |

### Alternatives Considered

| Instead of          | Could Use             | Tradeoff                                                                |
| ------------------- | --------------------- | ----------------------------------------------------------------------- |
| Playwright          | Cypress               | Playwright has better Next.js App Router support, faster, multi-browser |
| Manual verification | Automated checks only | Manual tests required for UX flows, timing-dependent features           |
| AWS SES             | SendGrid/Mailgun      | SES required for AWS Mumbai region compliance, cost-effective at scale  |

**Installation:**

```bash
npm init playwright@latest
# OR for existing project
pnpm add -D @playwright/test
pnpm exec playwright install
```

## Architecture Patterns

### Recommended Project Structure

```
tests/
├── auth.setup.ts           # Global auth state setup (runs once)
├── playwright/.auth/       # Gitignored auth state files
│   ├── auditor.json        # Rajesh Deshmukh session
│   ├── manager.json        # Priya Sharma session
│   ├── cae.json            # CAE session
│   └── auditee.json        # Vikram Kulkarni session
├── e2e/
│   ├── observation-lifecycle.spec.ts
│   ├── permission-guards.spec.ts
│   └── auditee-portal.spec.ts
└── playwright.config.ts    # Main config with webServer
```

### Pattern 1: Authentication State Setup

**What:** Create authenticated browser states once before all tests using a setup project

**When to use:** All authenticated E2E tests requiring different user roles

**Example:**

```typescript
// tests/auth.setup.ts
// Source: https://playwright.dev/docs/auth

import { test as setup, expect } from "@playwright/test";

const auditorFile = "playwright/.auth/auditor.json";

setup("authenticate as auditor", async ({ page }) => {
  await page.goto("http://localhost:3000/login");
  await page.getByLabel("Email").fill("rajesh@apexsahakari.in");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign In" }).click();

  // Wait until the URL changes to dashboard
  await page.waitForURL("**/dashboard");

  // Save signed-in state to file
  await page.context().storageState({ path: auditorFile });
});
```

**Config setup:**

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/auditor.json",
      },
      dependencies: ["setup"],
    },
  ],
});
```

### Pattern 2: VERIFICATION.md Format

**What:** Structured verification report following Phase 11 format

**When to use:** After completing each phase to document verification evidence

**Structure:**

```markdown
---
phase: 06-observation-lifecycle
verified: 2026-02-10T10:00:00Z
status: passed | gaps_found
score: X/Y must-haves verified
---

# Phase X: [Name] Verification Report

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |

### Required Artifacts

| Artifact | Expected | Status | Details |

### Key Link Verification

| From | To | Via | Status | Details |

### Requirements Coverage

| Req ID | Status | Evidence |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |

### Build Verification

- TypeScript compilation: ✓ PASSED
- File metrics
- Code quality indicators

## Phase Success Criteria Verification

| # | Criterion | Status | Evidence |

## Human Verification Required

### 1. [Test Name]

**Test:** [steps]
**Expected:** [outcome]
**Why human:** [reason]

## Verification Conclusion

[Summary and recommendation]
```

### Pattern 3: AWS SES Domain Verification

**What:** DNS-based domain ownership verification for email sending

**When to use:** Before production email sending, requires 3-5 day DNS propagation lead time

**Process:**

```bash
# 1. Create email identity in SES (AWS Console or CLI)
aws sesv2 create-email-identity \
  --email-identity yourdomain.com \
  --region ap-south-1

# 2. Get DKIM tokens (3 CNAME records)
aws sesv2 get-email-identity \
  --email-identity yourdomain.com \
  --region ap-south-1

# 3. Add DNS records to your provider
# Format: abc123._domainkey.domain.com -> abc123.dkim.amazonses.com
# CRITICAL: Do NOT add extra underscores at beginning
# CORRECT: token._domainkey.domain.com
# WRONG: _token._domainkey.domain.com

# 4. Wait up to 72 hours for propagation

# 5. Check verification status
aws sesv2 get-email-identity \
  --email-identity yourdomain.com \
  --region ap-south-1 \
  | jq '.DkimAttributes.Status'

# 6. Send test email after verified
aws sesv2 send-email \
  --from-email-address noreply@yourdomain.com \
  --destination ToAddresses=test@example.com \
  --content "Simple={Subject={Data='Test Email'},Body={Text={Data='Test message'}}}" \
  --region ap-south-1
```

### Anti-Patterns to Avoid

- **Creating auth state per test:** Authenticate once, reuse state across tests (60-80% faster)
- **Checking auth state into git:** Contains session cookies, security risk
- **Manual E2E tests only:** Automate what you can, reserve manual testing for UX/timing/visual checks
- **Skipping DNS propagation wait:** SES verification can take 72 hours, start early
- **Missing .gitignore for playwright/.auth:** Auth state files must never be committed
- **Using different AWS regions for verification:** DNS records are region-specific, verify in ap-south-1
- **Testing without Docker running:** PostgreSQL required for all E2E tests

## Don't Hand-Roll

| Problem                         | Don't Build             | Use Instead                | Why                                                    |
| ------------------------------- | ----------------------- | -------------------------- | ------------------------------------------------------ |
| E2E browser automation          | Custom Selenium scripts | Playwright                 | Auto-wait, retry, stable selectors, TypeScript support |
| Authentication state management | Cookie copying scripts  | Playwright storageState    | Captures cookies + localStorage + IndexedDB atomically |
| Email sending                   | SMTP relay              | AWS SES                    | Production-grade, Mumbai region compliance, monitoring |
| Test reporting                  | Console.log output      | Playwright HTML reporter   | Visual diff, traces, screenshots on failure            |
| Permission testing              | Manual role switching   | Automated Playwright tests | Consistent, repeatable, regression detection           |

**Key insight:** Phase 14 is evidence documentation, not feature building. Use existing verification tools (TypeScript compiler, grep, file checks) and automated E2E tests where possible. Manual testing is for UX flows that can't be automated (visual polish, timing, animations).

## Common Pitfalls

### Pitfall 1: DNS Configuration Errors

**What goes wrong:** AWS SES domain verification fails or times out after 72 hours

**Why it happens:** Common DNS mistakes include:

- Adding extra underscores to DKIM record names (`_token._domainkey` instead of `token._domainkey`)
- DNS provider auto-appending domain name (results in `token._domainkey.domain.com.domain.com`)
- Wrong field mapping (Name vs Host vs Record Name varies by provider)
- Using records from wrong AWS region (Mumbai ap-south-1 vs other regions)

**How to avoid:**

1. Copy DKIM tokens EXACTLY from AWS console
2. Check if your DNS provider auto-appends domain (add trailing `.` if so)
3. Verify underscore character allowed in record names (contact support if not)
4. Wait full 72 hours before declaring failure
5. Use `dig` or `nslookup` to verify DNS propagation: `dig token._domainkey.domain.com CNAME`

**Warning signs:** Verification status stays "Pending" after 24 hours, verification status changes to "Failed" before 72 hours

### Pitfall 2: Auth State Expiration

**What goes wrong:** Playwright tests pass locally but fail in CI, or fail after 24 hours

**Why it happens:** Authentication state files contain session cookies with expiration times. Better Auth default session duration is 30 minutes idle, 24 hours absolute. Playwright storageState files don't auto-refresh.

**How to avoid:**

1. Create fresh auth state in CI setup project (don't use cached state)
2. Set reasonable test timeout (< session duration)
3. Implement auth state refresh in test fixtures if tests run > 30 minutes
4. Add .gitignore for `playwright/.auth/` to prevent committing stale state

**Warning signs:** Tests pass when run immediately, fail when run hours later; "Unauthorized" errors in test logs

### Pitfall 3: Missing Docker Prerequisite

**What goes wrong:** Playwright tests fail with "Connection refused" or database errors

**Why it happens:** PostgreSQL runs in Docker container, E2E tests need database. If Docker isn't running or `pnpm db:seed` wasn't run, tests fail.

**How to avoid:**

1. Add prerequisite check in Playwright global setup
2. Document Docker requirement in test README
3. Seed database before auth setup project runs
4. Use `webServer.command` in playwright.config.ts to start dev server with DB checks

**Warning signs:** Test logs show "ECONNREFUSED localhost:5433", "prisma client not initialized"

### Pitfall 4: Incomplete Verification Evidence

**What goes wrong:** VERIFICATION.md created but lacks evidence, hard to validate later

**Why it happens:** Copy-paste verification format without filling evidence columns, manual tests not documented with screenshots/videos, "verified by inspection" without citing line numbers

**How to avoid:**

1. Use grep/find commands to provide evidence (e.g., "auth.ts line 58-61")
2. Run automated checks before manual testing (TypeScript compile, linting)
3. Document manual test results with screenshots or Playwright traces
4. Cite file paths and line numbers for all "verified" claims
5. Mark items as "requires human testing" if automation isn't feasible

**Warning signs:** Verification report has empty "Evidence" columns, no file paths cited, vague "works as expected" statements

### Pitfall 5: Region Mismatch in AWS SES

**What goes wrong:** Domain verified in one region, email sending fails in Mumbai region

**Why it happens:** AWS SES identities are region-specific. AEGIS requires Mumbai (ap-south-1) for RBI data localization. Verifying in us-east-1 doesn't help.

**How to avoid:**

1. Always specify `--region ap-south-1` in AWS CLI commands
2. Verify AWS_REGION environment variable is set to ap-south-1
3. Check SES dashboard shows "Asia Pacific (Mumbai)" in region selector
4. Test email sending from Mumbai region after verification

**Warning signs:** Verification succeeds but test email fails, "Email address not verified in this region" error

## Code Examples

Verified patterns from official sources:

### E2E Test with Authentication

```typescript
// tests/e2e/observation-lifecycle.spec.ts
// Source: https://playwright.dev/docs/auth

import { test, expect } from "@playwright/test";

test.use({ storageState: "playwright/.auth/auditor.json" });

test("create and submit observation", async ({ page }) => {
  await page.goto("http://localhost:3000/findings");
  await page.getByRole("button", { name: "Create Observation" }).click();

  // Fill 5C fields
  await page.getByLabel("Condition").fill("Test condition");
  await page.getByLabel("Criteria").fill("Test criteria");
  await page.getByLabel("Cause").fill("Test cause");
  await page.getByLabel("Effect").fill("Test effect");
  await page.getByLabel("Recommendation").fill("Test recommendation");

  // Select severity
  await page.getByLabel("Severity").selectOption("MEDIUM");

  // Submit
  await page.getByRole("button", { name: "Submit" }).click();

  // Verify redirect to detail page
  await expect(page).toHaveURL(/\/observations\/[a-f0-9-]+$/);

  // Verify timeline shows creation
  await expect(page.getByText("Created")).toBeVisible();
});
```

### Permission Guard Test

```typescript
// tests/e2e/permission-guards.spec.ts
// Source: https://www.better-auth.com/docs/reference/security

import { test, expect } from "@playwright/test";

test.describe("Permission Guards", () => {
  test("auditee cannot access audit-trail page", async ({ page }) => {
    // Use auditee auth state
    await page
      .context()
      .storageState({ path: "playwright/.auth/auditee.json" });

    // Attempt to navigate to audit-trail (CAE-only page)
    await page.goto("http://localhost:3000/audit-trail");

    // Should redirect to forbidden or dashboard
    await expect(page).not.toHaveURL(/\/audit-trail$/);

    // OR verify 403 message if not redirected
    await expect(page.getByText(/forbidden|not authorized/i)).toBeVisible();
  });

  test("CAE can access audit-trail page", async ({ page }) => {
    await page.context().storageState({ path: "playwright/.auth/cae.json" });

    await page.goto("http://localhost:3000/audit-trail");

    // Should successfully load
    await expect(page).toHaveURL(/\/audit-trail$/);
    await expect(
      page.getByRole("heading", { name: "Audit Trail" }),
    ).toBeVisible();
  });
});
```

### AWS SES Test Email

```typescript
// scripts/test-ses-email.ts
// Source: https://docs.aws.amazon.com/ses/latest/dg/send-an-email-using-sdk.html

import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

const client = new SESv2Client({ region: "ap-south-1" });

const command = new SendEmailCommand({
  FromEmailAddress: "noreply@yourdomain.com",
  Destination: {
    ToAddresses: ["test@example.com"],
  },
  Content: {
    Simple: {
      Subject: {
        Data: "Test Email - AEGIS",
        Charset: "UTF-8",
      },
      Body: {
        Text: {
          Data: "This is a test email from AEGIS to verify AWS SES domain verification.",
          Charset: "UTF-8",
        },
      },
    },
  },
});

try {
  const response = await client.send(command);
  console.log("Email sent successfully:", response.MessageId);
} catch (error) {
  console.error("Failed to send email:", error);
  process.exit(1);
}
```

### Playwright Configuration

```typescript
// playwright.config.ts
// Source: https://nextjs.org/docs/pages/guides/testing/playwright

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },

  projects: [
    // Setup project runs auth.setup.ts once
    { name: "setup", testMatch: /.*\.setup\.ts/ },

    // Chromium with auditor auth
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/auditor.json",
      },
      dependencies: ["setup"],
    },
  ],

  // Start dev server before running tests
  webServer: {
    command: "pnpm dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

## State of the Art

| Old Approach         | Current Approach             | When Changed            | Impact                                            |
| -------------------- | ---------------------------- | ----------------------- | ------------------------------------------------- |
| Manual E2E testing   | Playwright automated tests   | 2023-2024               | 60-80% faster test execution, consistent results  |
| Login in every test  | storageState authentication  | Playwright 1.15+ (2021) | Massive speed improvement, stable tests           |
| AWS SES v1 API       | AWS SES v2 API               | 2019                    | Better TypeScript support, modern SDK             |
| Sandbox mode testing | Domain verification required | Always required         | Production email sending requires verified domain |

**Deprecated/outdated:**

- **Selenium WebDriver:** Playwright is now the standard for Next.js testing, faster and more stable
- **AWS SDK v2:** Use @aws-sdk v3 client packages (SESv2Client), modular and tree-shakeable
- **Manual DNS verification:** No programmatic API for DNS propagation checks, must wait 72 hours

## Open Questions

1. **Should we automate all 9 manual tests from Phase 6?**
   - What we know: Phase 6 plan 06-07 defines 9 manual test groups for observation lifecycle
   - What's unclear: Which tests are truly manual-only (UX/visual) vs automatable with Playwright
   - Recommendation: Automate state transitions and CRUD operations, keep manual tests for visual polish (badges, colors, timeline formatting)

2. **How to handle auth state expiration in long-running tests?**
   - What we know: Better Auth sessions expire after 30 min idle, 24 hours absolute
   - What's unclear: Whether Playwright tests will exceed 30 minutes, how to refresh auth mid-test
   - Recommendation: Keep test suites under 20 minutes per worker, recreate auth state in CI always

3. **Which phases need new VERIFICATION.md vs re-verification?**
   - What we know: Phases 6-10 are code-complete but lack VERIFICATION.md files
   - What's unclear: Whether to verify current state only or track changes since completion
   - Recommendation: Create fresh verification for current state, not historical re-verification (no "re_verification" frontmatter)

4. **Should we test AWS SES sandbox mode or production mode?**
   - What we know: SES sandbox requires verifying recipient emails, production allows any recipient
   - What's unclear: Whether AEGIS AWS account is still in sandbox or already in production mode
   - Recommendation: Check current SES status first, request production access if in sandbox, test with verified recipients until approved

## Sources

### Primary (HIGH confidence)

- [Playwright Official Docs - Authentication](https://playwright.dev/docs/auth) - storageState pattern, setup projects
- [Next.js Official Docs - Testing with Playwright](https://nextjs.org/docs/pages/guides/testing/playwright) - Next.js integration
- [AWS SES Official Docs - Creating Identities](https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html) - Domain verification process
- [AWS SES Official Docs - Troubleshooting Verification](https://docs.aws.amazon.com/ses/latest/dg/troubleshoot-verification.html) - DNS pitfalls
- [Better Auth Security Reference](https://www.better-auth.com/docs/reference/security) - Permission checks

### Secondary (MEDIUM confidence)

- [BrowserStack - Playwright Authentication Guide](https://www.browserstack.com/guide/playwright-storage-state) - storageState best practices
- [Cortex - Production Readiness Checklist](https://www.cortex.io/post/how-to-create-a-great-production-readiness-checklist) - Quality assurance patterns
- [Port.io - Production Readiness](https://www.port.io/blog/production-readiness-checklist-ensuring-smooth-deployments) - Deployment verification
- [SigNoz - Production Readiness Checklist](https://signoz.io/guides/production-readiness-checklist/) - Monitoring and security

### Tertiary (LOW confidence)

- Various Medium articles on Playwright authentication (implementation patterns vary)
- Community blog posts on verification documentation (no standard format emerged)

## Metadata

**Confidence breakdown:**

- Playwright setup and testing: HIGH - Official docs, widely adopted, standard Next.js integration
- AWS SES domain verification: HIGH - Official AWS docs, clear process, known pitfalls documented
- Better Auth permission testing: MEDIUM - Official docs exist but less E2E testing examples
- VERIFICATION.md format: HIGH - Phase 11 provides working template, consistent with Phase 5 format
- Production readiness: MEDIUM - General best practices, not specific to AEGIS stack

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days for stable tooling, Playwright and AWS SES APIs are mature)

**Key takeaway:** Phase 14 success depends on execution discipline, not new technology. All tools exist and are documented. The challenge is thoroughness: complete all manual tests, document all evidence, verify DNS propagation fully, and create comprehensive VERIFICATION.md files for 5 phases.
