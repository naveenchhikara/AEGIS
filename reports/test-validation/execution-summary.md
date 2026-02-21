# Test Execution Summary (Current Run)

## Automated tests actually executed
- Unit (Vitest): 40 executed, 40 passed
- Playwright setup/auth: 5 executed, 4 passed, 1 failed (CCO auth)
- Playwright E2E (selected projects): 120 executed, 40 failed, remaining passed/skipped by dependencies

## Known failure clusters
1. CCO login setup failure
2. Observation lifecycle flow assertions/timeouts
3. Permission guard expectation mismatches in specific manager/cae paths

## Notes
- `reports/test-validation/detailed-test-matrix.csv` lists all 226 test IDs from TEST-PLAN with explicit status field per test ID.
- Conservative mapping used: only T001-T013 marked PARTIAL pending exact 1:1 TID-script mapping; remaining marked NOT_EXECUTED until explicit case-level evidence is attached.
