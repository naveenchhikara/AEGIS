# Phase 30: Account Examination UI - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Auditors examine sampled loan accounts one-by-one — ALL questions are asked for each account (account-centric workflow) with embedded RBI guidance, marking each as compliant or violation with optional notes and evidence. HIA can manage the question library (add, edit, deactivate questions). Compliance scoring and aggregation are Phase 31.

</domain>

<decisions>
## Implementation Decisions

### Account Navigation Flow

- Sidebar list + main panel layout (email inbox style) — left sidebar shows all sampled accounts as a scrollable list, clicking one loads its questions in the main panel
- Each sidebar list item shows: Account Number, Borrower Name (truncated), and completion percentage with colored status dot (green=done, yellow=partial, gray=not started)
- Free navigation — auditor can click any account at any time, partial answers auto-save, no forced completion order
- Question randomization: deterministic shuffle per account using a seed (e.g., account ID hash) — order stays stable on revisit/reload but differs between accounts

### Question Card Design

- Two large buttons for compliance marking: Compliant (green) / Violation (red) — binary choice, one click saves immediately
- RBI guideline reference and best practice tip shown in a collapsible panel below question text — collapsed by default, only visible when question has guidance data
- Notes and evidence in an expandable section below the compliance buttons — collapsed by default, expands on click. Reuse existing EvidenceUploadPanel component pattern
- When marked as Violation: card border turns red, note field auto-expands with "Note required for violations" prompt. Evidence upload remains optional

### Progress & Completion

- Dual progress indicators: top bar shows overall progress (e.g., "5/15 accounts complete, 33%"), each sidebar item shows per-account completion (e.g., "8/12 questions")
- Account is "complete" when every active question has a Compliant or Violation response — no minimum note requirement. Sidebar shows green checkmark
- Simple violation count badge on overall progress bar (e.g., "12 violations found") — detailed per-question violation tracking belongs in Phase 31
- Completion banner when all accounts are done: success banner at top with stats (X accounts examined, Y violations found, Z notes added). No separate summary page

### Question Management UX

- Separate admin page under RBIA section (e.g., /rbia/questions or similar route) — keeps management separate from audit execution
- Questions grouped by credit module with tabs — tab bar at top for each module (Housing Loans, Vehicle Loans, etc.), each tab shows a sortable table of questions
- Deactivated questions shown inline with strikethrough + "Inactive" badge — filterable toggle to show/hide inactive. Reactivation possible via button
- Add Question form fields: question text (required), RBI reference (optional), best practice tip (optional), weight (default 1.0), isCritical checkbox. Module pre-selected from current tab

### Claude's Discretion

- Loading skeleton design for examination page
- Exact spacing, typography, and card dimensions
- Error state handling (save failures, network issues)
- Keyboard shortcuts for compliance marking (if any)
- Auto-save debounce timing for notes

</decisions>

<specifics>
## Specific Ideas

- Account-centric workflow: the mental model is "open an account, answer all questions about it, move to next" — NOT "pick a question, answer it for all accounts"
- The sidebar should feel like navigating a checklist — auditor sees progress at a glance and can jump around
- Violation note requirement ensures audit documentation discipline without blocking workflow on compliant items
- Question management is an HIA-only capability — auditors never see management controls

</specifics>

<code_context>

## Existing Code Insights

### Reusable Assets

- `ExaminationForm` (src/components/audit-execution/examination-form.tsx): Existing pattern for rendering examination items with RadioGroup status marking, notes textarea, and evidence upload — can inform question card design
- `EvidenceUploadPanel` (src/components/audit-execution/evidence-upload-panel.tsx): Drag-and-drop file upload with S3 presigned URLs, progress tracking, retry logic — reuse directly for per-question evidence
- `ExaminationEvidenceList` (src/components/audit-execution/examination-evidence-list.tsx): Displays uploaded evidence files — reuse for showing attached evidence per question
- `Progress` component (shadcn/ui): Used throughout for progress bars
- `Badge` component: Used for status indicators
- `RbiaExaminationTree` (src/components/rbia/rbia-examination-tree.tsx): Shows pattern for inline scoring buttons with save actions — informs compliance button design
- `SCORE_BUTTON_STYLES` from `@/lib/constants`: Centralized button styling pattern

### Established Patterns

- Server actions with `getRequiredSession()` + permission checks for all mutations
- DAL functions in `src/data-access/` with tenant isolation via WHERE clauses
- Toast notifications via `sonner` for save confirmations
- `useRouter` for navigation, `useSearchParams` for state in URL
- `@tanstack/react-table` for sortable/filterable data tables (question management)

### Integration Points

- Route: `/audit-execution/[engagementId]/rbia/examination/[moduleCode]` (new route under existing RBIA layout)
- Question management: `/audit-execution/[engagementId]/rbia/questions` or separate `/rbia/questions` route
- Phase 27 schema: LoanAccount (sampled accounts), ExaminationQuestion (question bank), AccountExamResponse (responses)
- Phase 29: SamplingConfig + LoanAccount.isSampled flag determines which accounts appear in sidebar
- Existing RBIA tab navigation in layout.tsx — add "Examination" tab

</code_context>

<deferred>
## Deferred Ideas

- Per-question violation instance tracking and aggregation — Phase 31 (Instance-Based Scoring)
- Auto-create finding/observation from violation — could be a future enhancement
- Bulk import/export of questions via CSV — future phase
- Question versioning (track edits over time) — future enhancement
- Cross-module question templates — future phase

</deferred>

---

_Phase: 30-account-examination-ui_
_Context gathered: 2026-02-28_
