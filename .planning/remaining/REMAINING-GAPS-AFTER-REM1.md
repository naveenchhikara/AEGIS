# Remaining Gaps — After Wave REM-1

> Base: commit 50552a0 + Wave REM-1 (R29, R47, R56, R62)
> Date: 2026-02-19

## Summary

| Status             | Count |
| ------------------ | ----- |
| Total requirements | 104   |
| ✅ PASS            | 90    |
| ⚠️ REMAINING GAP   | 14    |

## Resolved in REM-1

| R-ID | Fix                                                          | Status  |
| ---- | ------------------------------------------------------------ | ------- |
| R29  | Draft reports + BoardReport tracking + re-download UI        | ✅ PASS |
| R47  | updateCalendarEvent + recurrence UI in edit/create dialogs   | ✅ PASS |
| R56  | Validated: execute dialog + server action already complete   | ✅ PASS |
| R62  | Validated: accept-risk dialog + audit trail already complete | ✅ PASS |

## Remaining 14 Gaps

### 1. R2 — Zone CRUD management

- **Has:** Zone model in schema, branches can reference zones
- **Missing:** No zone management page, no zone CRUD actions, no zone DAL
- **Files to change:** New `src/actions/admin/manage-zone.ts`, new `src/app/(dashboard)/admin/zones/page.tsx`
- **Verification:** Can create/edit/delete zones, assign branches to zones

### 2. R49/R69 — Audit Universe Entity Registry page

- **Has:** manage-entity.ts action with CRUD, AuditUniverseEntity model
- **Missing:** Actions revalidate `/risk-management/audit-universe` but no page exists at that path
- **Files to change:** New `src/app/(dashboard)/risk-management/audit-universe/page.tsx`
- **Verification:** Page renders entity list, can create/edit entities of all 5 types

### 3. R58 — Control effectiveness trends + heatmap

- **Has:** ControlEffectivenessDashboard with scores table + rating bands
- **Missing:** No time-series trend visualization, no process-area heatmap
- **Files to change:** `src/components/analytics/control-effectiveness-dashboard.tsx`, `src/data-access/control-effectiveness.ts`
- **Verification:** Trend chart renders historical scores, heatmap shows process areas by effectiveness

### 4. R70 — Calendar periodicity enforcement

- **Has:** recurrenceRule field in schema + UI (added in REM-1 edit dialog)
- **Missing:** No server-side enforcement of periodicity (auto-create next occurrence when event completes)
- **Files to change:** `src/actions/admin/manage-calendar.ts` (add recurrence expansion logic)
- **Verification:** Creating a QUARTERLY event auto-generates next 4 occurrences

### 5. R83 — Board review calendar RBI mandated items

- **Has:** board-review-calendar.tsx renders meetings
- **Missing:** RBI mandated items hardcoded (not data-driven), "Schedule" button not wired
- **Files to change:** `src/components/governance/board-review-calendar.tsx`
- **Verification:** Schedule button creates calendar events, mandated items from DB

### 6. R84 — Policy version history

- **Has:** Policy CRUD with version field
- **Missing:** Update overwrites instead of creating new version; no version comparison
- **Files to change:** `src/actions/governance/manage-policy.ts`, `src/components/governance/policy-table.tsx`
- **Verification:** Editing policy creates v2.0 record, previous v1.0 preserved

### 7. R86 — RBI inspection pack field mapping

- **Has:** generateInspectionPack aggregates 9 datasets
- **Missing:** UI references non-existent Prisma fields (ram.riskScore, obs.targetDate), export buttons disabled
- **Files to change:** `src/components/governance/rbi-inspection-pack.tsx`, `src/actions/governance/generate-inspection-pack.ts`
- **Verification:** Inspection pack renders real data, export to PDF/XLSX works

### 8. R87 — Housekeeping metric types expansion

- **Has:** metrics-capture-form + risk-mis-dashboard
- **Missing:** metricType restricted to 4 values; needs CRAR_TOTAL, GROSS_NPA, NET_NPA, SLR_MAINTAINED, TOTAL_DEPOSITS etc.
- **Files to change:** `src/components/housekeeping/metrics-capture-form.tsx`
- **Verification:** Can enter CRAR, NPA, liquidity metrics; dashboard sections populated

### 9. R88 — Inter-bank exposure metric entry

- **Has:** interbank-exposure-monitor.tsx with limit calculations
- **Missing:** INTERBANK_EXPOSURE metricType can't be entered via Metrics Capture UI; net worth is client-state only
- **Files to change:** `src/components/housekeeping/metrics-capture-form.tsx` (add INTERBANK type)
- **Verification:** Can enter interbank exposure data; monitor calculates limits

### 10. R95 — Non-SLR total deposits from DB

- **Has:** NonSlrMonitor with checkNonSlrCap logic
- **Missing:** totalDeposits is manual state input (TODO comment), not from HousekeepingMetric DB
- **Files to change:** `src/components/investments/non-slr-monitor.tsx`
- **Verification:** Total deposits auto-fetched from HousekeepingMetric; cap check automatic

### 11. R99 — IS audit checklist categories

- **Has:** 3 categories seeded (CBS, BCP_DR, CYBER_SECURITY = 28 items), ChecklistForm UI
- **Missing:** 3+ more categories needed: channels, access_control, vendor/change_mgmt
- **Files to change:** `src/data/seed/is-checklists.json`
- **Verification:** All 6 checklist areas available in ChecklistForm

### 12. R100 — Vendor risk edit bug

- **Has:** vendor-risk-panel with CRUD
- **Missing:** Edit form populates applicationId with appName (string vs UUID), update action only partial fields
- **Files to change:** `src/components/is-audit/vendor-risk-panel.tsx`, `src/actions/investment/manage-is-audit.ts`
- **Verification:** Edit vendor assessment saves correctly, all fields updated

### 13. R101 — CBS parameter audit save dedup

- **Has:** cbs-parameter-audit.tsx with items and save
- **Missing:** Save always creates new records (no checklistId), no loading of previous responses
- **Files to change:** `src/components/is-audit/cbs-parameter-audit.tsx`, related action
- **Verification:** Save updates existing, reload shows previous responses

### 14. R103/R104 — Cyber checklist resume + tech evidence persistence

- **Has:** cyber-security-checklist (25 controls, 126 questions), tech-control-evidence (575 LOC)
- **Missing:** No reload of previously saved responses; evidence/remediation fields in R104 are client-state only (not persisted)
- **Files to change:** `src/components/is-audit/cyber-security-checklist.tsx`, `src/components/is-audit/tech-control-evidence.tsx`, related actions
- **Verification:** Save + reload cycle preserves responses; tech evidence persisted to DB

## Recommended Wave Order

**Wave REM-2 (quick wins, 4 items):** R87/R88 (metric types expansion), R95 (deposits from DB), R99 (IS checklist seed)
**Wave REM-3 (4 items):** R2 (zone CRUD), R49/R69 (entity page), R100 (vendor edit fix), R101 (CBS dedup)
**Wave REM-4 (4 items):** R83 (board calendar wire), R84 (policy versions), R103/R104 (resume + persistence)
**Wave REM-5 (2 items):** R58 (trends/heatmap), R86 (inspection pack fields), R70 (periodicity enforcement)
