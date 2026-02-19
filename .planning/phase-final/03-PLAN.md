---
phase: final
plan: 3
type: standard
wave: 2
depends_on: [1, 2]
files_modified: []
autonomous: true
must_haves:
  truths:
    - "All dashboard pages render without 500 errors"
    - "CRUD operations work on at least 3 modules"
    - "Permission gates block unauthorized access"
    - "Seed data displays correctly on all pages"
  artifacts:
    - path: ".planning/phase-final/SMOKE-TEST-RESULTS.md"
      provides: "Complete smoke test report with pass/fail per page"
---

## Objective

Systematic smoke test of all RBIAS v3.0 pages and key workflows to verify the build is functional end-to-end. This is NOT a deep E2E test — it's a rapid verification that pages load, data displays, and critical actions work.

## Context

@AEGIS deployed at https://aegis.nexlyadvisory.com
4 existing accounts: CEO, Auditor (AUDIT_MANAGER), CAE, CCO
New roles need test accounts: LEAD_AUDITOR, ZONAL_AUDITOR, ACE_OFFICER, RISK_HEAD
DB has seed data from Plan 02

## Tasks

<task type="auto">
  <name>Task 1: Page Load Smoke Test (all 20+ pages)</name>
  <files>.planning/phase-final/SMOKE-TEST-RESULTS.md</files>
  <action>
  Use `curl` with an authenticated session cookie to hit every dashboard page and verify 200 responses. Alternatively, use the browser tool.

**Test each page with an appropriate role's session:**

| Page            | URL              | Required Permission  |
| --------------- | ---------------- | -------------------- |
| Dashboard       | /dashboard       | any role             |
| RAM Assessments | /ram             | ram:read             |
| Audit Execution | /audit-execution | audit_execution:read |
| Compliance      | /compliance      | compliance:read      |
| Analytics       | /analytics       | dashboard:cae        |
| Calendar        | /calendar        | calendar:manage      |
| Reports         | /reports         | report:read          |
| Risk Management | /risk-management | risk_register:read   |
| Controls        | /controls        | control_library:read |
| Work Program    | /work-program    | work_program:read    |
| Issues          | /issues          | issue:read           |
| QA Assessment   | /qa-assessment   | qa_assessment:read   |
| Regulatory      | /regulatory      | regulatory:read      |
| Governance      | /governance      | policy:read          |
| Investments     | /investments     | risk_mis:read        |
| IS Audit        | /is-audit        | admin:system         |
| Findings        | /findings        | observation:read     |
| Audit Plans     | /audit-plans     | audit_plan:read      |
| Admin           | /admin           | admin:manage_users   |
| Settings        | /settings        | any                  |

For each page, record:

- HTTP status (200 = PASS, 500 = FAIL, 403 = PASS if unauthorized)
- Whether data renders (has table rows / card content)
- Any console errors visible

**Approach:**

1. Start a headless browser session
2. Login as CAE (has most permissions)
3. Navigate to each page
4. Take snapshot, verify content
5. Log pass/fail

If browser isn't available, use `curl` with session cookie extraction.
</action>
<verify>
All pages return 200 for authorized users.
No 500 errors on any page.
</verify>
<done>

- All 20+ pages tested
- Results documented in SMOKE-TEST-RESULTS.md
- Pass rate >= 90% (some pages may lack data but shouldn't error)
  </done>
  </task>

<task type="auto">
  <name>Task 2: CRUD Workflow Smoke Tests</name>
  <files>.planning/phase-final/SMOKE-TEST-RESULTS.md</files>
  <action>
  Test 5 key write workflows via browser or direct server action invocation:

**Test A: Create RAM Assessment**

1. Navigate to /ram
2. Click "New Assessment"
3. Select a branch
4. Enter scores for 5 parameters
5. Save → Compute → verify risk category appears

**Test B: Submit Compliance Response**

1. Navigate to /compliance
2. Find an OPEN item
3. Submit a branch response with text
4. Verify status changes to BRANCH_RESPONSE_SUBMITTED

**Test C: Create Issue**

1. Navigate to /issues
2. Create new issue (INTERNAL_AUDIT source, HIGH severity)
3. Add an action plan
4. Verify it appears in the table

**Test D: Create Calendar Event**

1. Navigate to /calendar
2. Create a new RBIA event
3. Verify it appears in the list

**Test E: Generate Report**

1. Navigate to /reports
2. Trigger XLSX generation for an engagement
3. Verify action completes (even if S3 upload fails in dev)

For each test, record PASS/FAIL and any error messages.
</action>
<verify>
At least 4 of 5 workflows complete without errors.
</verify>
<done>

- 5 CRUD workflows tested
- Results documented
- Any failures have clear error messages for debugging
  </done>
  </task>

<task type="auto">
  <name>Task 3: Permission Gate Verification</name>
  <files>.planning/phase-final/SMOKE-TEST-RESULTS.md</files>
  <action>
  Verify RBAC actually works — an unauthorized role can't access restricted pages.

**Negative tests:**

1. Login as AUDITEE → try /admin → should redirect/403
2. Login as FIELD_AUDITOR → try /analytics → should not show (no dashboard:cae)
3. Login as CCO → try /ram → should not see RAM (no ram:read)
4. Login as BRANCH_HEAD → try /issues → should not show
5. Verify sidebar only shows permitted items per role

**Method:**

- If browser available: login as each role, check sidebar items
- If not: check nav-items.ts logic manually + verify `requirePermission` guards on server pages
  </action>
  <verify>
  All 5 negative tests produce expected 403/redirect behavior.
  Sidebar filters correctly per role.
  </verify>
  <done>
- Permission gates verified for at least 3 roles
- No data leakage across permission boundaries
- Results documented
  </done>
  </task>

## Success Criteria

1. All 20+ pages load without 500 errors
2. At least 4/5 CRUD workflows complete
3. Permission gates block unauthorized access
4. Seed data displays on all pages with data
5. Complete smoke test report at `.planning/phase-final/SMOKE-TEST-RESULTS.md`
