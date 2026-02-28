# Phase 23: BM Response and Reporting - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Branch Managers submit batch responses to issued ActionPoints with deadline tracking and overdue escalation. HIA generates the full RBIA audit report PDF and views board-level analytics. This is the final phase completing the v6.0 RBIA workflow end-to-end.

Phase 22 delivers the BM response panel stub, score display page stub, and report page modifications. Phase 23 wires the BM-facing route, adds overdue escalation, builds score visualization, generates the RBIA PDF, and adds board analytics charts.

</domain>

<decisions>
## Implementation Decisions

### BM Response Experience

- Single scrollable page with all ActionPoints listed vertically — inline expand/collapse response forms per AP
- Progress counter at top showing responded/total (e.g., "3/12 addressed")
- Evidence upload inline per AP — each response form has its own file upload zone, evidence clearly tied to the specific ActionPoint
- Persistent deadline countdown banner at top of page — green/amber/red based on urgency, turns red in last 48 hours
- Batch submit requires review step — clicking "Submit" shows a summary modal listing all AP responses and attachments; BM reviews and confirms before final submission
- Submit button disabled while any AP is unaddressed

### Score Visualization

- Composite RBIA score displayed as a large circular gauge (donut/arc) — shows percentage with rating band label and color, similar to credit score displays
- Module breakdown below composite as a grid of cards — each card shows module name, score percentage, colored progress bar, and rating label
- Clicking a module card expands it in place (accordion-style) to show sub-modules as nested rows; clicking a sub-module shows leaf items with individual scores — all drill-down happens on the same page, no navigation
- Historical trend as a line chart — composite score on Y-axis, engagements on X-axis (labeled by date), with optional module-level lines toggled via legend
- Rating band color coding: Poor=red, Moderate=orange, Satisfactory=yellow, Good=blue, Very Good=dark green

### Report PDF Structure (8 Sections, Score-First)

1. **Cover Page** — Bank branding: bank name, logo (if uploaded), branch name, engagement period, RBIA rating band prominently displayed. AEGIS logo small in footer
2. **Executive Summary** — High-level overview of audit findings and score
3. **Engagement Details** — Branch info, audit team, dates, scope
4. **Score Summary** — Rendered circular gauge for composite score + table with module scores, percentages, rating bands, and weights
5. **Detailed Scores** — Per-module drill-down showing sub-modules and leaf item scores
6. **ActionPoints Summary** — Full detail per AP: module, description, severity, BM response (if submitted), status
7. **Observations** — Full 5C fields for each formal observation
8. **Meeting Minutes** — Opening and exit meeting minutes

- The PDF is the complete record — board members should not need app access to understand the audit
- Visual gauge rendered in PDF for composite score (not just table)

### Board Analytics

- KPI summary cards at top: Total Branches Audited, Average Composite Score, Branches in Poor/Moderate, Score Improvement vs Previous Cycle
- RadarChart for module scores — single branch at a time, selectable via dropdown. Radar fills showing module scores (0-100% on each axis)
- Branch rating distribution as horizontal bar chart — 5 bars (one per rating band: Very Good to Poor), each showing count of branches in that band, color-coded
- Period selector — defaults to most recent audit cycle, dropdown to pick previous cycles for comparison

### Claude's Discretion

- Exact spacing, typography, and animation details on score visualization
- Circular gauge SVG implementation approach in @react-pdf/renderer
- Loading skeletons and error states
- Exact color shades for rating bands (within the specified color families)
- Summary modal layout details for batch submit review
- KPI card styling to match existing dashboard cards

</decisions>

<specifics>
## Specific Ideas

- Circular gauge should feel like a CIBIL/credit score display — instantly readable, premium feel
- Board analytics should have an executive snapshot feel — KPI cards before charts, minimal scrolling to get the picture
- PDF cover page with bank's own branding makes it feel like the bank's report, not a third-party tool output
- The drill-down tree should be smooth accordion expansion — no page reloads, no route changes
- Deadline countdown banner should create appropriate urgency without being alarming in early days (green when >7 days, amber 3-7 days, red <48 hours)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 23-bm-response-and-reporting_
_Context gathered: 2026-02-23_
