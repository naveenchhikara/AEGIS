# Test Execution Summary (Corrected)

## Automated tests actually executed
- Unit (Vitest): **40 executed, 40 passed**
- Playwright setup/auth: **5/5 pass** (CCO passed after lockout reset rerun)
- Playwright E2E full rerun (auditor/manager/cae/cco/auditee):
  - **86 passed**
  - **49 failed**
  - **10 skipped**
  - **5 did not run**

## Known failure clusters
1. Observation lifecycle flow assertions/timeouts (5C create, transitions, tagging, resolved fieldwork, findings data assertions)
2. Permission guard expectation mismatches (CAE audit-trail and manager unauthorized redirect expectations)

## Notes
- `reports/test-validation/detailed-test-matrix.csv` currently remains conservative for TID-level mapping.
- `reports/test-validation/automated-execution-results.md` is the corrected run-level truth source.
- Next update should remap each TID to PASS/FAIL/BLOCKED with evidence links.
