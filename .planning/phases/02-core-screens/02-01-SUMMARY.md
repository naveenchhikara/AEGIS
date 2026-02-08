---
phase: 02-core-screens
plan: 01
subsystem: dependencies, data
tags: recharts, tanstack-table, shadcn/ui, compliance-data, icons

# Dependency graph
requires:
  - phase: 01-project-setup
    provides: Next.js 16 project setup, TypeScript types, demo data structure
provides:
  - Charting library (recharts 3.7.0) with shadcn ChartContainer integration
  - Headless table library (TanStack Table 8.21.3) for sortable/filterable tables
  - 7 shadcn/ui components (chart, select, tabs, popover, scroll-area, progress, checkbox)
  - Expanded compliance demo data (55 requirements across 6 categories)
  - Complete icon barrel export with all Phase 2 icons
affects: ["02-02", "02-03", "02-04", "02-05", "02-06"]

# Tech tracking
tech-stack:
  added: ["recharts@3.7.0", "@tanstack/react-table@8.21.3", "react-is@19.2.4"]
  patterns:
    [
      "shadcn ChartContainer for all charts",
      "TanStack Table for data tables",
      "Icon barrel export pattern",
    ]

key-files:
  created:
    [
      "src/components/ui/chart.tsx",
      "src/components/ui/select.tsx",
      "src/components/ui/tabs.tsx",
      "src/components/ui/popover.tsx",
      "src/components/ui/scroll-area.tsx",
      "src/components/ui/progress.tsx",
      "src/components/ui/checkbox.tsx",
    ]
  modified:
    [
      "package.json",
      "pnpm-lock.yaml",
      "src/data/demo/compliance-requirements.json",
      "src/lib/icons.ts",
    ]

key-decisions:
  - "Use shadcn ChartContainer instead of raw Recharts ResponsiveContainer for all Phase 2 charts"
  - "Install react-is explicitly as direct dependency (recharts 3.7.0 requires it as peer dep)"
  - "Map RBI compliance requirements to 6 simplified categories: market-risk, risk-management, credit, governance, operations, it"
  - "Icon barrel export pattern: single import source for all icons"

patterns-established:
  - "Pattern 1: All charts use shadcn ChartContainer + ChartConfig instead of raw ResponsiveContainer"
  - "Pattern 2: All icons exported from @/lib/icons barrel file"
  - "Pattern 3: Demo data uses ISO 8601 dates for JSON serialization"

# Metrics
duration: 7min
completed: 2026-02-07
---

# Phase 2 Plan 1: Dependencies and Data Expansion Summary

**Recharts 3.7.0 with shadcn ChartContainer, TanStack Table 8.21.3 for data tables, 7 new shadcn/ui components, and 55 realistic UCB compliance requirements mapped to 6 categories**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-07T20:33:59Z
- **Completed:** 2026-02-07T20:41:51Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Installed recharts 3.7.0, @tanstack/react-table 8.21.3, and react-is 19.2.4
- Installed shadcn chart component with ChartContainer, ChartTooltip, ChartConfig
- Installed 6 additional shadcn/ui primitives (select, tabs, popover, scroll-area, progress, checkbox)
- Expanded compliance requirements from 15 to 55 requirements covering all 6 categories
- Added 18 missing icons to barrel export for Phase 2 components
- Fixed TypeScript compatibility in shadcn chart component for recharts 3.7.0
- Build passes successfully

## Task Commits

Each task was committed atomically:

1. **Task 1: Install npm dependencies and shadcn/ui components** - `806c40d` (feat)
2. **Task 2: Expand compliance requirements to 55 and update icons** - `fe4fd22` (feat)

**Plan metadata:** `lmn012o` (docs: complete plan)

## Files Created/Modified

- `package.json` - Added recharts 3.7.0, @tanstack/react-table 8.21.3, react-is 19.2.4
- `src/components/ui/chart.tsx` - shadcn ChartContainer with ChartTooltip, ChartConfig for themed charts
- `src/components/ui/select.tsx` - Select dropdown component for filter controls
- `src/components/ui/tabs.tsx` - Tabs component for view switching
- `src/components/ui/popover.tsx` - Popover component for calendar pickers and complex filters
- `src/components/ui/scroll-area.tsx` - ScrollArea component for scrollable regions
- `src/components/ui/progress.tsx` - Progress component for audit engagement completion
- `src/components/ui/checkbox.tsx` - Checkbox component for multi-select filters
- `src/data/demo/compliance-requirements.json` - Expanded from 15 to 55 requirements with realistic UCB data
- `src/lib/icons.ts` - Added 18 Phase 2 icons (ArrowUpDown, ChevronUp, ChevronLeft, Plus, Filter, Target, Gauge, Briefcase, Loader2, ExternalLink, ListFilter, MoreHorizontal, Zap, LayoutGrid, UserCircle, PauseCircle, ArrowRight)

## Decisions Made

- Use shadcn ChartContainer instead of raw Recharts ResponsiveContainer for all charts - provides themed tooltips, CSS variable colors, and accessibility layer
- Install react-is explicitly as direct dependency - recharts 3.7.0 lists it as peer dependency, pnpm requires explicit install
- Map RBI regulations to 6 simplified categories (market-risk, risk-management, credit, governance, operations, it) instead of using complex RBI category structure
- Maintain realistic compliance status distribution: 30 compliant (55%), 16 partial (29%), 5 non-compliant (9%), 4 pending (7%)
- Distribute requirements across all 12 staff members from demo data for realistic assignment

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript compatibility in shadcn chart component**

- **Found during:** Task 1 (Chart component verification)
- **Issue:** shadcn chart.tsx had TypeScript errors with recharts 3.7.0 - `payload` and other props not compatible
- **Fix:** Updated ChartTooltipContent and ChartLegendContent prop types to use React.ComponentProps<"div"> with explicit props instead of picking from RechartsPrimitive types
- **Files modified:** src/components/ui/chart.tsx
- **Verification:** pnpm build passes without TypeScript errors
- **Committed in:** 806c40d (part of Task 1 commit)

**2. [Rule 1 - Bug] Fixed summary counts mismatch in compliance requirements**

- **Found during:** Task 2 (Data verification)
- **Issue:** Summary object counts didn't match actual compliance requirements array counts
- **Fix:** Recalculated and updated summary to match actual data: 30 compliant, 16 partial, 5 non-compliant, 4 pending
- **Files modified:** src/data/demo/compliance-requirements.json
- **Verification:** Node verification script confirms counts now match
- **Committed in:** fe4fd22 (part of Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both auto-fixes necessary for correctness and build success. No scope creep.

## Issues Encountered

None - all planned work completed successfully

## User Setup Required

None - no external service configuration required

## Next Phase Readiness

- All dependencies installed and verified (recharts, TanStack Table, shadcn components)
- Demo data expanded to 55 requirements covering all 6 categories
- Icon barrel export updated with all Phase 2 icons
- Build passes successfully
- Ready for Phase 2 component development (Plans 02-02 through 02-06)

---

## Self-Check: PASSED

**Files Created:**

- FOUND: src/components/ui/chart.tsx
- FOUND: src/components/ui/select.tsx
- FOUND: src/components/ui/tabs.tsx
- FOUND: src/components/ui/popover.tsx
- FOUND: src/components/ui/scroll-area.tsx
- FOUND: src/components/ui/progress.tsx
- FOUND: src/components/ui/checkbox.tsx
- FOUND: .planning/phases/02-core-screens/02-01-SUMMARY.md

**Commits:**

- FOUND: 806c40d (Task 1: Install npm dependencies and shadcn/ui components)
- FOUND: fe4fd22 (Task 2: Expand compliance requirements to 55 and update icons)
- FOUND: 2049061 (Plan metadata: complete dependencies and data expansion plan)

**All self-checks passed.**

---

_Phase: 02-core-screens_
_Completed: 2026-02-07_
