# Phase 22: Findings and Meetings - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Auditors can create and manage ActionPoints and formal Observations in separate tabs, record opening and exit meetings with attendees, and the engagement lifecycle enforces meeting prerequisites before status transitions. Score visualization displays composite RBIA score with module breakdown and drill-down. BM response panel (stub) shows progress counter and deadline countdown. Completing the dual findings workflow.

Requirements: FIND-04, BMRP-02, BMRP-03, BMRP-04, REPT-01, REPT-03

</domain>

<decisions>
## Implementation Decisions

### Findings Tab Layout

- Unified list with type flags (AP/Observation) — NOT separate tabs. One list shows all findings, each tagged with its type
- Filter-able by type so auditors CAN view just APs or just Observations when needed (satisfies FIND-04)
- Compact columns per row: serial number, title, type flag (AP/Observation badge), severity, status
- Inline expandable form for creating new findings — "+ New Finding" button opens form within the list, stays in context

### Finding Lifecycle States

- ActionPoints follow DRAFT → ISSUED lifecycle
- APs start as DRAFT (fully editable and deletable), then are explicitly "issued" to BM
- Editable in DRAFT, locked after ISSUED — prevents changing findings after BM has seen them
- Bulk issue at REPORT_DRAFT transition — all DRAFT APs are issued together when engagement moves to REPORT_DRAFT, BM gets one batch
- Formal Observations follow the same DRAFT → ISSUED lifecycle as ActionPoints — consistent behavior for both finding types

### Meeting Recording UX

- Attendee selection via multi-select dropdown pre-populated with engagement team members and branch staff contacts, with option to add external names
- Structured template for minutes: agenda items, decisions taken, action items, next steps — enforces consistency
- Checkbox confirmation sign-off by the auditor recording the meeting — single-person sign-off, not multi-party
- Tooltip on disabled transition button — hover shows "Record opening meeting first" or "Record exit meeting first"
- At least 1 attendee required — validation error if no attendees selected

### Meeting Placement in UI

- "Meetings" tab within the engagement detail page alongside Examination, Findings, Score tabs
- Both opening and exit meetings on the same Meetings tab — two sections/cards, exit section shows "Not yet available" until engagement reaches that stage
- Engagement status bar shows green checkmarks next to "Opening Meeting" and "Exit Meeting" steps once recorded
- Horizontal stepper at top of engagement page showing all 7 stages: PLANNED → TEAM_ASSIGNED → OPENING_MEETING → IN_PROGRESS → EXIT_MEETING → REPORT_DRAFT → COMPLETED

### Score Visualization

- Large circular/semi-circular gauge card showing composite percentage + rating band label (e.g., "78% — Good") with color coding
- Horizontal bar chart per module below the gauge — quick visual comparison across all modules
- Click module bar → expandable tree reveals nested sub-modules and leaf items with their individual scores — stays on same page
- 5-color rating band gradient: Very Good = dark green, Good = green, Satisfactory = yellow, Moderate = orange, Poor = red
- Partial scores shown with "incomplete" indicator — scored modules display scores, unscored modules greyed out with "Not scored", composite shows "Partial: X/Y modules scored"

### BM Response Panel

- Stacked card layout — each ActionPoint displayed as a card with title, severity, description, plus response textarea and file upload inline on each card
- Sticky header bar at top showing progress (e.g., "5/12 responded" progress bar) + deadline countdown — always visible as BM scrolls through cards
- Optional file upload per AP — each card has "Attach evidence" button, BM can respond with text only or add files, reuses existing S3 upload infrastructure
- Batch submit button disabled with remaining count — "Submit All Responses (5 remaining)" disabled until all APs have text responses

### Deadline & Reminder Behavior

- BM response deadline configurable per tenant in admin settings (default 15 days per RBI policy)
- Email reminders at 5 days and 1 day before deadline — pg-boss cron job checks daily
- Days remaining with color coding: green (>5 days), yellow (2-5 days), red (<2 days), "OVERDUE" red badge after deadline

### Empty States & Edge Cases

- No findings: illustration + CTA — icon/illustration + "No findings yet" + "Create your first Action Point or Observation" button
- Zero APs at REPORT_DRAFT: allowed with confirmation dialog — "No Action Points to issue. The BM will not receive any findings. Continue?"
- Empty attendee validation: require at least 1 attendee to save a meeting record

### Claude's Discretion

- Meeting view mode after save (read-only summary with Edit button vs always-editable)
- Auditor-side deadline tracking display for issued APs (findings list column vs separate tracking section)
- Engagement detail page tab count (4 vs 5 tabs — whether to include an Overview tab)
- Tab routing strategy (URL-based segments vs client-side tabs)
- Loading skeletons and animation details
- Exact spacing, typography, and component sizing

</decisions>

<specifics>
## Specific Ideas

- Findings are observation-style with type flags, not strictly separate tabs — the unified view is the primary experience, filtering gives focused views
- Horizontal stepper for engagement status is the primary navigation indicator — checkmarks show completed milestones
- Score gauge should feel prominent — it's the main deliverable of the RBIA process
- Stacked card layout for BM responses should feel like a checklist being worked through — each card "completed" as BM responds

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 22-findings-and-meetings_
_Context gathered: 2026-02-23_
