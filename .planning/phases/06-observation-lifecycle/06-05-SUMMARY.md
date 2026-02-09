---
phase: 06-observation-lifecycle
plan: 05
status: complete
executor: DELTA
commit: a355484
---

## Summary

Implemented the observation form UI and migrated the findings list page from JSON to PostgreSQL.

## What Was Built

### Task 1: Create Observation Form + Repeat Finding Detection

- **`src/app/(dashboard)/findings/new/page.tsx`** — Server component page that fetches branches and audit areas for dropdowns, renders ObservationForm
- **`src/components/findings/observation-form.tsx`** — Client component with:
  - 5C observation fields (condition, criteria, cause, effect, recommendation) in a two-column layout
  - Metadata sidebar: severity, branch, audit area, risk category, due date
  - `useActionState` integration with `createObservation` server action
  - Debounced repeat finding detection (500ms) triggered when title + branchId + auditAreaId are filled
  - Success toast and redirect to `/findings/[id]` on creation
- **`src/components/findings/repeat-finding-banner.tsx`** — Amber warning banner showing up to 3 candidates with similarity %, occurrence count, "Confirm as Repeat" and "Dismiss" buttons

### Task 2: Findings List Migration (JSON → PostgreSQL)

- **`src/app/(dashboard)/findings/page.tsx`** — Migrated from `import { findings } from "@/data"` to DAL calls (`getObservationSummary`, `getObservations`) with JSON fallback via try/catch for development
- **`src/components/findings/findings-table.tsx`** — Major refactor:
  - Now receives `observations` as props (not self-contained JSON import)
  - Uses `OBSERVATION_STATUS_COLORS` for 7-state badges
  - Uses `OBSERVATION_STATUS_ORDER` for sort ordering
  - Columns updated: audit area (from relations), branch (from relations), age calculation handles Date objects
  - "Resolved" badge shown for `resolvedDuringFieldwork` observations
- **`src/components/findings/findings-filters.tsx`** — Updated with 7 observation states (DRAFT through CLOSED), removed old category filter
- "Create Observation" button added to findings page header

## Verification

- `pnpm build` passes with no errors
- `/findings/new` route appears in build output
- observation-form.tsx has 'use client' directive
- Form includes all 5C fields
- findings/page.tsx imports from data-access (with JSON fallback)
- findings-table.tsx receives observations as props
- OBSERVATION_STATUS_COLORS used for all 7 states

## Key Decisions

- Used `type="date"` HTML input for due date instead of full shadcn Calendar component — simpler, native mobile support, calendar component available for future enhancement
- Severity sort handles both uppercase (Prisma) and lowercase (JSON fallback) enum values
- Repeat finding banner only shows after observation is created (needs observationId for confirm/dismiss actions)
