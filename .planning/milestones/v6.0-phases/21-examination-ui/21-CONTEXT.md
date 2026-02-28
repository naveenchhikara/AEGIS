# Phase 21: Examination UI - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Auditors can navigate, score, and annotate the full hierarchical examination tree in a single working UI — with live progress tracking and filtering — before any findings or reporting features are built.

Requirements: EXAM-01, EXAM-02, EXAM-07, EXAM-08

This phase builds the UI components and pages only. Server actions (Phase 20) and scoring engine (Phase 18) are already built. Findings management and freeze triggering are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Tree Navigation & Layout

- **TanStack Table expanding rows** — table with expand/collapse chevrons per row, each depth level indented, leaf rows show score buttons inline
- **Module grid → per-module tree page** — dashboard shows module cards with status badges; clicking a module navigates to its own page with the full expanded tree for that module only
- **Default expand to depth 2** — modules → sub-areas expanded by default; categories and leaf items stay collapsed
- **Module cards show:** name, progress bar (12/24 items), current score percentage, and status badge (Not started / In progress / Complete)

### Score Picker Interaction

- **Inline button group** — 4 small buttons right-aligned in each leaf row: FC | LC | PC | NC; selected button is filled/highlighted; always visible on leaf rows, no extra click
- **Inline expand for working notes** — when auditor picks PARTIALLY or NON_COMPLIANT, the row expands downward revealing a textarea for working notes (500+ chars required) plus flag checkboxes (AP / Observation); saves without a modal
- **Traffic-light gradient colors** — FC=green, LC=yellow/amber, PC=orange, NC=red; unscored items are neutral/gray
- **Immediate save with undo toast** — score changes instantly (optimistic UI); brief toast: "Score updated — Undo"; no confirmation dialog

### Progress & Score Display

- **Sticky header panel** above the tree table — module name, progress bar (12/24 — 50%), current module score, rating band badge; stays visible while scrolling
- **Score panel above module grid** on the engagement dashboard — composite score across all modules, overall rating band (e.g., "Good — 72%"), total items scored/total, freeze button (read-only in Phase 21)
- **Roll-up scores on parent rows** — each parent row shows its weighted average score as a percentage badge (e.g., "68%") computed from children; instant sub-area health at a glance
- **Critical items: red border + warning icon** — critical leaf rows have a left red border accent and a small warning icon next to the item name; if scored NON_COMPLIANT, the row background turns light red

### Filtering & Tree State

- **Toggle button bar above table** — "Unscored" | "Flagged AP" | "Flagged Observation"; clicking toggles filter on/off; active filters highlighted; multiple can be active simultaneously
- **Count badges on each filter toggle** — "Unscored (18)" | "Flagged AP (3)" | "Flagged Obs (1)"; updates in real-time as items are scored
- **Hide non-matching, keep parent chain** — non-matching leaf items hidden; parent nodes with at least one matching child stay visible; clear visual indicator that filtered mode is active
- **Tree expand state persisted in URL search params** — expanded node IDs stored in URL; back/forward navigation and page refresh restore tree state; shareable links

### Claude's Discretion

- Exact spacing, typography, and responsive breakpoints
- Loading skeleton design while tree data fetches
- Error state handling (network failures, stale data)
- Keyboard navigation within the tree (tab/arrow key support)
- Toast implementation details (duration, position)
- Working notes textarea auto-grow behavior

</decisions>

<specifics>
## Specific Ideas

- Module grid should feel like a Kanban-style status board — each card gives at-a-glance health of that examination module
- The inline row expansion for working notes should feel lightweight — not like opening a form, more like expanding a detail row in a data table
- Filter toggles should feel like GitHub issue label filters — quick, toggleable, with count badges
- The 4 score buttons (FC/LC/PC/NC) should be compact enough to not dominate the row but large enough to be easy click targets on laptop screens

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 21-examination-ui_
_Context gathered: 2026-02-23_
