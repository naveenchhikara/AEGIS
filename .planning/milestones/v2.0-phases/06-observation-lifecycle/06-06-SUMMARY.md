# Plan 06-06 Summary: Observation Detail Page + Timeline + Actions

## Status: COMPLETE

## What was built

### 1. findings/[id]/page.tsx — Migrated from JSON to DAL

- Replaced JSON import (`findings from "@/data"`) with `getObservationById(session, id)` DAL call
- Removed `generateStaticParams` (page is now fully dynamic, data comes from DB)
- Passes both `observation` and `session` to FindingDetail component
- Uses Next.js 16 `params: Promise<{ id: string }>` pattern

### 2. finding-detail.tsx — Rewritten for PostgreSQL data with 5C fields

- Props accept Prisma observation shape with timeline, branch, auditArea, assignedTo, createdBy
- Displays all 5C fields in labeled card sections: Condition, Criteria, Cause, Effect, Recommendation
- Shows "Resolved During Fieldwork" amber badge when `resolvedDuringFieldwork === true`
- Shows fieldwork resolution reason in amber-bordered card
- Auditee response and action plan only shown for RESPONSE/COMPLIANCE/CLOSED statuses
- Uses `OBSERVATION_STATUS_COLORS` instead of `FINDING_STATUS_COLORS`
- Renders ObservationActions, TaggingPanel, and StatusTimeline child components

### 3. status-timeline.tsx — Updated for database timeline entries

- New `TimelineEntry` interface matching DAL return shape (id, event, oldValue, newValue, comment, createdBy, createdAt)
- Color-coded dots by event type:
  - `created` = green
  - `status_changed` = blue
  - `severity_escalated` = orange
  - `repeat_confirmed` = red
  - `repeat_dismissed` = slate
  - `resolved_during_fieldwork` = amber
- Event-specific icons (Plus, ArrowRight, AlertTriangle, Copy, CheckCircle2, MessageSquare)
- Shows `oldValue → newValue` for status changes
- Displays actor name and timestamp for each entry

### 4. observation-actions.tsx — Client component with role-based transition buttons

- Uses `getAvailableTransitions(status, roles, severity)` from state-machine.ts
- Forward transitions render as primary buttons, return transitions as outline
- Each button opens Dialog with required comment textarea
- RESPONSE transition shows additional auditeeResponse and actionPlan textareas
- Calls `transitionObservation` server action on confirm
- "Resolve During Fieldwork" button for DRAFT/SUBMITTED (AUDITOR/AUDIT_MANAGER only)
- Calls `resolveFieldwork` server action with resolution reason (min 10 chars)
- Toast notifications via sonner for success and error states
- Loading state with `useTransition` and spinner

### 5. tagging-panel.tsx — Tags display panel

- Compact 2-column grid (1 column on mobile)
- Displays: severity badge, status badge, branch, audit area, risk category, assigned to, due date
- Uses `RISK_CATEGORIES` constant for human-readable labels
- Uses `formatDate` for dates, shows "Not assigned"/"Unassigned"/"No deadline" fallbacks

## Additional changes

- Added `Copy`, `RotateCcw`, `Tag`, `MessageSquare` to icons barrel export (`src/lib/icons.ts`)

## Deviations

None — implemented exactly as specified in the plan.

## Commits

1. `feat(06-06): migrate observation detail page to PostgreSQL with timeline and actions` — all 5 files + icons update

## Verification

- `pnpm build` — PASS (0 errors, 14 static + dynamic pages)
- Detail page imports `getObservationById` from DAL (not JSON)
- Timeline handles all 5 event types with correct colors
- observation-actions imports `getAvailableTransitions` from state-machine.ts
- observation-actions imports `transitionObservation` from actions
- 5C fields displayed in finding-detail.tsx
- Resolved During Fieldwork badge shown when applicable
- Tagging panel shows all metadata dimensions
