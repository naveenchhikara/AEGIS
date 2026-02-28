# Phase 29: Sampling Engine - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

HIA defines sampling criteria with locked % allocations across 5 fixed criteria buckets, sets overall sample size as a percentage of portfolio, and the system auto-selects a representative account sample. Auditors can view the criteria and sample in read-only mode. This phase delivers the criteria configuration UI, sample generation algorithm, and sample display — not the account examination itself (Phase 30).

</domain>

<decisions>
## Implementation Decisions

### Criteria Configuration UX

- Simple table with number inputs per criteria bucket — one row per criterion with a percentage input field
- Running total shown below the table — cannot save until total equals 100%
- Fixed 5 criteria buckets: newly sanctioned, amount-wise, age-wise, DPD-wise, prior observations (standard RBI sampling criteria)
- Overall sample size set as percentage of total portfolio (e.g., "10% of 500 accounts = 50 accounts") — show calculated count
- Auto-lock on generate: criteria become locked when HIA clicks "Generate Sample" — can unlock to reconfigure, but regenerating replaces previous sample

### Sample Generation Logic

- Overflow handling: if a bucket requests more accounts than exist in that segment, take all available and redistribute shortfall to the next-largest bucket with a warning (e.g., "Newly sanctioned: 3/10 filled, 7 redistributed to amount-wise")
- Within each bucket, select accounts deterministically by risk indicators: highest DPD first, then largest amounts, then oldest accounts — more audit-relevant than random
- No duplicate accounts across buckets — first matching bucket wins. Each account appears in sample at most once
- "Prior observations" bucket: uses manual flag from the upload file (a column in CSV/Excel), NOT automatic query of prior engagements. Simpler, relies on HIA knowledge

### Auditor Read-Only View

- Top section shows criteria table (read-only) with bucket names and percentages
- Below it, the full list of selected sample accounts
- Subtle lock icon next to criteria section header + "Sampling criteria configured by [HIA name] on [date]" attribution text
- No edit controls rendered for auditor role at all — not even disabled fields
- No re-sample request mechanism — HIA controls sampling exclusively, offline discussion for disagreements

### Sample List Display

- Table columns: Account No, Borrower Name, Sanction Amount, Outstanding, DPD, Asset Class, and a colored badge showing which criteria bucket selected the account (e.g., "Amount-wise", "DPD-wise")
- Sortable columns (click header to sort) + filter by criteria bucket (dropdown or tabs)
- Clickable account rows navigate to the account examination page (Phase 30 integration point) — direct workflow: see sample, click, examine

### Claude's Discretion

- Exact bucket classification algorithm (how to categorize accounts as "amount-wise" vs "age-wise" thresholds)
- Table component choice (reuse existing Table component or DataTable with sorting)
- Loading states during sample generation
- Page layout within the engagement tab structure
- Color palette for bucket badges

</decisions>

<specifics>
## Specific Ideas

- The "prior observations" flag comes from the upload file (Phase 28) — add a boolean column like `has_prior_observations` to the upload template
- Bucket badge colors should be distinct and consistent — same color always means the same criterion
- Show redistribution warnings prominently after generation so HIA knows when a bucket was underfilled
- The calculated count display ("10% of 500 = 50 accounts") helps HIA understand the real-world impact of their percentage choice

</specifics>

<code_context>

## Existing Code Insights

### Reusable Assets

- `SamplingConfig` model from Phase 27: JSONB `criteriaBuckets` field stores bucket allocations, `isLocked` Boolean with `lockedAt`/`lockedById` for lock mechanism
- `LoanAccount` model from Phase 27: `moduleCode`, `engagementId`, `metadata` JSONB — the source data for sampling
- shadcn/ui Table, Card, Badge components for display
- RBIA score panel: pattern for displaying scored/weighted data with colored indicators
- Existing RBAC permission checks: `hasPermission()` for role-based visibility control

### Established Patterns

- Server component page with client component for interactive sections
- Server actions with `getRequiredSession()` for mutations (save criteria, generate sample)
- DAL functions in `src/data-access/` for queries with tenant isolation
- Badge/tag patterns used in engagement status displays
- Tabs within engagement detail page (Phase 28 adds "Loan Portfolio" tab — sampling could be a sub-section or sibling tab)

### Integration Points

- Phase 28 uploads LoanAccount data — sampling queries this data by engagement + moduleCode
- Phase 27 SamplingConfig model — stores criteria and lock state
- Phase 30 Account Examination UI — sample list rows link to individual account examination pages
- Engagement detail page: new tab or section for sampling configuration
- Permission system: HIA (CAE role) can configure, AUDITOR/FIELD_AUDITOR roles view read-only

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 29-sampling-engine_
_Context gathered: 2026-02-28_
