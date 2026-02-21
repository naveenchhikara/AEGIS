# Automated Execution Results (Corrected)

## Runs executed

### Unit
- Command: `pnpm test:unit`
- Result: **40 passed / 0 failed**

### Playwright setup/auth
- Initial run: 4 passed / 1 failed (CCO)
- Rerun for CCO after clearing lockout table: 1 passed
- Net setup status: **5/5 roles authenticated**

### Playwright E2E full rerun
- Command: `pnpm playwright test --no-deps --project=auditor --project=manager --project=cae --project=cco --project=auditee`
- Duration: ~12.2m
- Result from runner summary:
  - **86 passed**
  - **49 failed**
  - **10 skipped**
  - **5 did not run**

## Repeating failure clusters (from e2e output)
1. Observation lifecycle:
   - create observation with 5C fields
   - submit for review
   - severity-based closing (manager close low/medium, manager cannot close high/critical expectation)
   - observation tagging visibility
   - resolved during fieldwork flow
   - findings list data assertions
2. Permission guards:
   - CAE audit-trail access expectation mismatches
   - manager unauthorized redirect expectations for `/audit-trail` and `/settings` mismatch actual behavior

## Important correction
Previous PR summary used conservative placeholders and did not reflect this completed rerun. This file is the corrected source of truth for executed automated tests.
