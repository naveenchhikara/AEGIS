---
phase: 30-account-examination-ui
plan: "03"
subsystem: ui
tags:
  [
    react,
    shadcn,
    react-hook-form,
    zod,
    server-actions,
    rbia,
    question-management,
  ]

# Dependency graph
requires:
  - phase: 30-account-examination-ui/30-01
    provides: examination-questions DAL (getQuestionsByModule), server actions (addQuestion, updateQuestion, deactivateQuestion, reactivateQuestion), schemas (AddQuestionSchema, UpdateQuestionSchema)

provides:
  - Question management page at /rbia/questions with HIA-only permission guard
  - QuestionTable component with sortable columns, inactive toggle, deactivate/reactivate
  - AddQuestionDialog for creating new examination questions
  - EditQuestionDialog for editing existing examination questions
  - Conditional Questions tab in RBIA layout (CAE/HIA only)

affects:
  - 31-instance-based-scoring
  - rbia-examination-ui

# Tech tracking
tech-stack:
  added: []
  patterns:
    - HIA-only pages: server component permission guard redirects to /rbia if role lacks audit_execution:manage_sections
    - Searchparams-based module tabs: Link hrefs with ?moduleCode=CRD-HLN switch active module
    - Controlled edit dialogs: parent manages open state, EditQuestionDialog receives open+onOpenChange props
    - Deactivation with response count warning: AlertDialog shown when _count.accountExamResponses > 0
    - useTransition for server action pending states: track pendingId per row for granular button spinners

key-files:
  created:
    - src/app/(dashboard)/audit-execution/[engagementId]/rbia/questions/page.tsx
    - src/components/examination-questions/question-table.tsx
    - src/components/examination-questions/add-question-dialog.tsx
    - src/components/examination-questions/edit-question-dialog.tsx
  modified:
    - src/app/(dashboard)/audit-execution/[engagementId]/rbia/layout.tsx
    - src/lib/icons.ts

key-decisions:
  - "Module tabs use searchParams (?moduleCode=CRD-HLN) for URL-stateful navigation, allowing direct linking to specific module"
  - "EditQuestionDialog uses controlled open state (open+onOpenChange props from QuestionTable) — dialog trigger is in parent row buttons, not inside dialog"
  - "Deactivation warning shown only when _count.accountExamResponses > 0 — immediate for unused questions, confirmation for ones with history"
  - "Questions tab added to RBIA layout via canManageQuestions conditional spread — auditors never see the tab"
  - "Archive and EyeOff icons added to @/lib/icons barrel export (Rule 2 deviation)"

patterns-established:
  - "Serialization pattern: Date objects converted to ISO strings in server component before passing to client components"
  - "Module tabs as inline server-renderable Link components (not client component with usePathname)"
  - "Empty state: check questions.length === 0 in component, show descriptive add-first-item message"

requirements-completed: [QMGT-02, QMGT-03]

# Metrics
duration: 8min
completed: 2026-02-28
---

# Phase 30 Plan 03: Question Management UI Summary

**HIA-only question management page with module tabs, sortable question table, add/edit dialogs, and deactivation with response-count warnings**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-02-28T17:13:42Z
- **Completed:** 2026-02-28T17:21:51Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Question management page at `/rbia/questions` with permission guard (HIA/CAE only via `audit_execution:manage_sections`)
- 5 credit module tabs (Housing, Gold, Vehicle, Agriculture, MSME) via searchParams-based navigation
- Sortable QuestionTable with inline deactivate/reactivate, strikethrough+Inactive badge for deactivated, show/hide toggle
- AddQuestionDialog with all QMGT-02 fields (text, RBI reference, best practice tip, category, weight, isCritical)
- EditQuestionDialog with pre-filled form and Save Changes action
- Conditional Questions tab in RBIA layout — hidden from auditors, visible to CAE/HIA

## Task Commits

Each task was committed atomically:

1. **Task 1: Question management page with module tabs and permission guard** - `83048869` (feat)
2. **Task 2: Question table, add-question dialog, and edit-question dialog** - `6f853432` (feat, bundled by orchestrator commit)

## Files Created/Modified

- `src/app/(dashboard)/audit-execution/[engagementId]/rbia/questions/page.tsx` — Server component page with permission guard, 5 module tabs, getQuestionsByModule call
- `src/components/examination-questions/question-table.tsx` — Client component: sortable table with deactivate/reactivate buttons, AlertDialog for questions with responses, show/hide inactive toggle
- `src/components/examination-questions/add-question-dialog.tsx` — Client component: Dialog form with react-hook-form + AddQuestionSchema, calls addQuestion action
- `src/components/examination-questions/edit-question-dialog.tsx` — Client component: Controlled dialog form with pre-filled values, calls updateQuestion action
- `src/app/(dashboard)/audit-execution/[engagementId]/rbia/layout.tsx` — Added canManageQuestions check + conditional Questions tab in TabNav
- `src/lib/icons.ts` — Added Archive and EyeOff icons

## Decisions Made

- Module tabs use `?moduleCode=CRD-HLN` searchParams for URL-stateful navigation (direct linking to specific module)
- EditQuestionDialog uses controlled open state from QuestionTable parent (not self-contained trigger)
- AlertDialog shown only when question has AccountExamResponse records (count > 0), immediate deactivation for unused questions
- Questions tab uses conditional spread (`...(canManageQuestions ? [...] : [])`) in RBIA layout server component

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added Archive and EyeOff icons to barrel export**

- **Found during:** Task 2 (building QuestionTable)
- **Issue:** `Archive` icon used in deactivate button but not exported from `@/lib/icons`
- **Fix:** Added `Archive` and `EyeOff` to the lucide-react re-exports in `src/lib/icons.ts`
- **Files modified:** `src/lib/icons.ts`
- **Verification:** Build succeeds with no missing export errors
- **Committed in:** `83048869` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Icon export was required for the UI to compile. No scope creep.

## Issues Encountered

- Another concurrent agent (`6f853432`) committed the component files as part of an orchestrator-level "in-progress" commit. All component files are correctly committed and the build passes.

## Next Phase Readiness

- Question management UI complete — HIA can add, edit, deactivate, and reactivate examination questions per QMGT-02 and QMGT-03
- Questions tab visible in RBIA layout for CAE/HIA role users
- Phase 31 (instance-based scoring) can use getQuestionsByModule and the question management infrastructure

---

_Phase: 30-account-examination-ui_
_Completed: 2026-02-28_
