---
phase: 06-observation-lifecycle
plan: 07
status: pending-verification
type: checkpoint:human-verify
---

## Summary

Phase 6 code implementation is complete (plans 06-01 through 06-06). This plan is a manual E2E verification checkpoint requiring browser-based testing of all 8 success criteria.

## Phase 6 Commit History

| Commit    | Plan    | Description                                                                |
| --------- | ------- | -------------------------------------------------------------------------- |
| `000a582` | 06-02   | Add exhaustive state machine tests (TDD red phase)                         |
| `4dfabc0` | 06-02   | Implement observation state machine with role guards                       |
| `b839e06` | 06-prep | Add observation status colors, status order, and risk categories constants |
| `c75e97e` | 06-04   | Implement repeat finding detection with pg_trgm similarity                 |
| `4dacba6` | 06-prep | Install alert-dialog, sonner, and calendar shadcn components               |
| `cb3a207` | 06-03   | Implement observation CRUD actions and DAL (includes 06-01 migration)      |
| `a355484` | 06-05   | Implement observation form UI and migrate findings list to PostgreSQL      |
| `215772e` | 06-06   | Migrate observation detail page to PostgreSQL with timeline and actions    |
| `6056700` | 06-05   | Add Sonner Toaster to root layout                                          |

**Total: 30 files changed, ~3,194 lines added, ~300 lines removed**

## Files Created/Modified

### New Files (Phase 6)

- `src/lib/state-machine.ts` — 7-state observation lifecycle with role guards
- `src/actions/observations/schemas.ts` — Zod validation schemas (create, transition, resolve-fieldwork)
- `src/actions/observations/create.ts` — Create observation in DRAFT state
- `src/actions/observations/transition.ts` — Generic state transition with optimistic locking
- `src/actions/observations/resolve-fieldwork.ts` — Resolve during fieldwork action
- `src/actions/repeat-findings/schemas.ts` — Repeat finding Zod schemas
- `src/actions/repeat-findings/detect.ts` — pg_trgm similarity detection
- `src/actions/repeat-findings/confirm.ts` — Confirm/dismiss repeat findings with severity escalation
- `src/data-access/observations.ts` — Observation DAL (getObservations, getObservationById, getObservationSummary)
- `src/app/(dashboard)/findings/new/page.tsx` — Create observation page
- `src/components/findings/observation-form.tsx` — 5C observation form with repeat detection
- `src/components/findings/repeat-finding-banner.tsx` — Repeat finding candidate banner
- `src/components/findings/observation-actions.tsx` — Role-based state transition buttons
- `src/components/findings/tagging-panel.tsx` — Observation metadata tag display
- `src/components/ui/alert-dialog.tsx` — shadcn alert-dialog component
- `src/components/ui/sonner.tsx` — shadcn sonner toast component
- `src/components/ui/calendar.tsx` — shadcn calendar component
- `prisma/migrations/20260209060000_add_observation_lifecycle_fields/` — Schema migration

### Modified Files

- `src/lib/constants.ts` — Added OBSERVATION_STATUS_COLORS, OBSERVATION_STATUS_ORDER, RISK_CATEGORIES
- `src/app/(dashboard)/findings/page.tsx` — Migrated from JSON to PostgreSQL DAL
- `src/app/(dashboard)/findings/[id]/page.tsx` — Migrated from JSON to PostgreSQL DAL
- `src/components/findings/findings-table.tsx` — Prop-driven with 7-state badges
- `src/components/findings/findings-filters.tsx` — Updated for 7 observation states
- `src/components/findings/finding-detail.tsx` — 5C fields, tagging panel, observation actions
- `src/components/findings/status-timeline.tsx` — Color-coded event types from database

## Test Environment Setup

### Prerequisites

1. Docker Desktop running
2. PostgreSQL container up: `docker compose up -d`
3. Database migrated: `pnpm prisma migrate deploy`
4. Seed data loaded: `pnpm db:seed`
5. Dev server started: `pnpm dev`

### Test Users (from seed data)

| User            | Email                            | Roles              | Used In Tests                           |
| --------------- | -------------------------------- | ------------------ | --------------------------------------- |
| Suresh Patil    | suresh.patil@apexbank.example    | AUDITOR            | Tests 1, 7, 8                           |
| Priya Sharma    | priya.sharma@apexbank.example    | CAE, AUDIT_MANAGER | Tests 2, 4                              |
| Vikram Kulkarni | vikram.kulkarni@apexbank.example | AUDITEE, AUDITOR   | Test 3                                  |
| Rajesh Deshmukh | rajesh.deshmukh@apexbank.example | CEO                | N/A (plan incorrectly lists as Auditor) |

### Seed Data Coverage

- 35 observations with varied statuses and severities
- 8 CLOSED observations (enables repeat finding detection testing)
- Timeline events for all seeded observations
- 6 branches, multiple audit areas

## E2E Verification Checklist

### Test 1: Create Observation (OBS-01)

- [ ] Log in as Auditor (Suresh Patil)
- [ ] Navigate to /findings, click "Create Observation"
- [ ] Fill all 5C fields (condition, criteria, cause, effect, recommendation)
- [ ] Select severity, branch, audit area, risk category
- [ ] Submit — verify redirect to new observation detail page
- [ ] Verify "Created" timeline entry shows

### Test 2: State Transitions (OBS-02, OBS-03, OBS-04)

- [ ] On new observation, click "Submit for Review" with comment
- [ ] Verify status SUBMITTED, timeline shows DRAFT -> SUBMITTED
- [ ] Log in as Audit Manager (Priya Sharma)
- [ ] Verify "Approve" and "Return to Draft" buttons appear
- [ ] Click "Approve" with comment, verify REVIEWED status
- [ ] Click "Issue to Auditee" with comment, verify ISSUED status

### Test 3: Auditee Response (OBS-02)

- [ ] Log in as Auditee (Vikram Kulkarni)
- [ ] Navigate to the ISSUED observation
- [ ] Click "Respond to Observation" with auditee response and action plan
- [ ] Verify status changed to RESPONSE

### Test 4: Severity-Based Closing (OBS-05, OBS-06)

- [ ] Log in as Audit Manager, open LOW observation in COMPLIANCE state
- [ ] Verify "Close Observation" button appears
- [ ] Open HIGH observation in COMPLIANCE state
- [ ] Verify "Close Observation" button does NOT appear
- [ ] Log in as CAE (Priya Sharma), verify "Close" button appears for HIGH/CRITICAL

### Test 5: Timeline Immutability (OBS-03)

- [ ] Open observation with multiple transitions
- [ ] Verify all events in chronological order
- [ ] Verify each entry has: actor name, timestamp, event type, comment
- [ ] Verify no edit/delete buttons on timeline entries

### Test 6: Tagging (OBS-08)

- [ ] Open an observation
- [ ] Verify tagging panel shows: severity, status, branch, audit area, risk category
- [ ] Verify RBI circulars section shows linked circulars (or "None linked")

### Test 7: Repeat Finding Detection (OBS-09, OBS-10, OBS-11)

- [ ] Log in as Auditor, create new observation
- [ ] Use same branch + audit area as existing CLOSED observation
- [ ] Enter similar title, verify repeat finding banner appears
- [ ] Click "Confirm as Repeat", verify severity escalation message
- [ ] Verify timeline shows "repeat_confirmed" and "severity_escalated" entries

### Test 8: Resolved During Fieldwork (OBS-07)

- [ ] Create a DRAFT observation
- [ ] Click "Resolve During Fieldwork"
- [ ] Enter resolution reason, confirm
- [ ] Verify "Resolved During Fieldwork" badge appears in amber
- [ ] Verify timeline shows "resolved_during_fieldwork" entry

### Test 9: Findings List Migration

- [ ] Navigate to /findings
- [ ] Verify summary cards show real counts from database
- [ ] Verify table shows observations with 7 possible states
- [ ] Verify filters work (severity, status)
- [ ] Verify clicking a row navigates to the detail page

## Known Issues / Notes

- Plan references "Rajesh Deshmukh" as Auditor but he is CEO — use Suresh Patil for Auditor tests
- No COMPLIANCE-state observations in seed data — tester must manually transition an observation through the full lifecycle to test closing
- Repeat finding detection requires CLOSED observations with same branch + audit area — 8 CLOSED observations available in seed
- Manual browser verification is **pending user approval** per GSD checkpoint protocol
