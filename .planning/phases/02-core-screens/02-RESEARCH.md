# Phase 2: Core Screens - Research

**Researched:** February 8, 2026
**Domain:** Dashboard widgets, data tables, charting, responsive layout (Next.js 16 + shadcn/ui + Recharts + TanStack Table)
**Confidence:** HIGH

## Summary

Phase 2 builds the three most important screens of the AEGIS prototype: CEO Dashboard, Compliance Registry, and Audit Planning. The research investigated the standard library stack for charting (Recharts), data tables (TanStack Table), and the shadcn/ui integration patterns for both.

The standard approach is well-established: shadcn/ui provides a `chart` component that wraps Recharts with themed `ChartContainer`, `ChartTooltip`, and `ChartLegend` primitives. TanStack Table v8 is the standard headless table solution, and shadcn/ui provides a documented "Data Table" pattern integrating TanStack Table with its own `Table` UI components. Both libraries are compatible with React 19 and Next.js 16, with one caveat about TanStack Table and the React Compiler (not enabled in this project).

**Primary recommendation:** Use the shadcn/ui `chart` component (which wraps Recharts with `ChartContainer` + `ChartConfig`) instead of raw `ResponsiveContainer`. Use the shadcn/ui Data Table pattern for TanStack Table integration. Install both libraries plus 6 additional shadcn/ui primitives before building components.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 3.7.0 | Charts (donut, area, radial gauge) | React 19 peer dep support, shadcn/ui's official charting layer, 165+ code snippets in Context7 |
| @tanstack/react-table | 8.21.3 | Headless sortable/filterable data table | Standard React table solution, 1800+ code snippets in Context7, shadcn/ui Data Table pattern |
| react-is | 19.2.4 | Peer dependency of recharts | Required by recharts; must match React version |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui chart | (installed via CLI) | `ChartContainer`, `ChartTooltip`, `ChartConfig` wrappers | All charts -- replaces raw `ResponsiveContainer` |
| shadcn/ui select | (installed via CLI) | Filter dropdowns | Category/status/type filter controls |
| shadcn/ui tabs | (installed via CLI) | View switching | Calendar vs card view toggle on audit page |
| shadcn/ui popover | (installed via CLI) | Calendar picker, filter popovers | Date pickers, complex filter UIs |
| shadcn/ui scroll-area | (installed via CLI) | Scrollable regions | Dashboard widget lists, detail modals |
| shadcn/ui progress | (installed via CLI) | Progress bars | Audit engagement completion (AUDT-05) |
| shadcn/ui checkbox | (installed via CLI) | Multi-select filters | Compliance registry filters |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Nivo, Victory, visx | Recharts has official shadcn/ui integration; others would require custom theming |
| TanStack Table | AG Grid, Mantine DataTable | TanStack is headless (fits shadcn/ui approach); AG Grid is too heavy for a prototype |
| Raw ResponsiveContainer | shadcn ChartContainer | ChartContainer provides themed tooltips, CSS variable colors, accessibility layer; use it |
| react-big-calendar | Custom month grid | A full calendar library is overkill for a 12-month FY grid showing audit pills |

**Installation:**
```bash
pnpm add recharts @tanstack/react-table react-is
npx shadcn@latest add chart --yes --overwrite
npx shadcn@latest add select tabs popover scroll-area progress checkbox --yes --overwrite
```

**Note on react-is:** Recharts 3.7.0 lists `react-is` as a peer dependency (`^19.0.0`). With pnpm, this will produce a warning unless `react-is` is explicitly installed. Install it as a direct dependency to silence warnings and ensure compatibility.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── dashboard/           # 6 dashboard widget components
│   │   ├── health-score-card.tsx
│   │   ├── audit-coverage-chart.tsx
│   │   ├── findings-count-cards.tsx
│   │   ├── risk-indicator-panel.tsx
│   │   ├── regulatory-calendar.tsx
│   │   └── quick-actions.tsx
│   ├── compliance/          # 4 compliance registry components
│   │   ├── compliance-table.tsx         # TanStack Table + filters + dialog trigger
│   │   ├── compliance-filters.tsx       # Category/status Select dropdowns
│   │   ├── compliance-detail-dialog.tsx # Dialog with full requirement info
│   │   └── compliance-trend-chart.tsx   # AreaChart showing 6-month trend
│   ├── audit/               # 4 audit planning components
│   │   ├── audit-calendar.tsx           # FY month grid with audit pills
│   │   ├── engagement-card.tsx          # Single audit card with progress bar
│   │   ├── audit-filter-bar.tsx         # Type filter + view mode toggle
│   │   └── engagement-detail-sheet.tsx  # Sheet side panel with audit workspace
│   ├── layout/              # Already exists: top-bar.tsx, app-sidebar.tsx
│   └── ui/                  # Already exists: 14 components + 7 new ones
├── app/(dashboard)/
│   ├── dashboard/page.tsx   # Composes 6 dashboard components
│   ├── compliance/page.tsx  # Composes compliance table + trend chart
│   └── audit-plans/page.tsx # Composes calendar/cards + filter + detail sheet
└── lib/
    └── icons.ts             # Add missing icons for new components
```

### Pattern 1: shadcn/ui ChartContainer + ChartConfig (for all charts)

**What:** Use shadcn's `ChartContainer` wrapper instead of Recharts' raw `ResponsiveContainer`. Define a `ChartConfig` object for each chart to map data keys to labels and colors.

**When to use:** Every chart in the application.

**Why:** ChartContainer provides themed tooltips that match the shadcn design system, automatic CSS variable color mapping (`var(--color-KEY)`), and the `accessibilityLayer` prop on Recharts chart components for screen reader support.

**Example:**
```typescript
// Source: Context7 /websites/ui_shadcn - chart docs
"use client"

import { PieChart, Pie, Cell } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const chartConfig = {
  completed: { label: "Completed", color: "hsl(var(--chart-1))" },
  inProgress: { label: "In Progress", color: "hsl(var(--chart-2))" },
  remaining: { label: "Remaining", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig

export function AuditCoverageChart() {
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <PieChart accessibilityLayer>
        <Pie data={data} dataKey="value" innerRadius={60} outerRadius={80}>
          {data.map((entry, i) => (
            <Cell key={i} fill={`var(--color-${entry.key})`} />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent />} />
      </PieChart>
    </ChartContainer>
  )
}
```

### Pattern 2: TanStack Table with shadcn/ui Data Table Pattern

**What:** Use `useReactTable` with shadcn's `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` components. Define column definitions with `ColumnDef<T>[]`. Use `flexRender` for cell rendering.

**When to use:** The compliance registry table.

**Example:**
```typescript
// Source: Context7 /websites/ui_shadcn - data table docs
"use client"

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

const columns: ColumnDef<ComplianceRequirement>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        ID <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  // ... more columns
]

function ComplianceTable() {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map(headerGroup => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map(header => (
              <TableHead key={header.id}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map(row => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map(cell => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

### Pattern 3: "use client" Boundary Strategy

**What:** Mark chart/table wrapper components as `"use client"` but keep page-level layout as Server Components where possible. Since all chart/table components need client-side interactivity, the page files can be `"use client"` for simplicity in a prototype.

**When to use:** All dashboard, compliance, and audit plan pages. Recharts renders SVG client-side and will cause hydration errors if SSR-rendered.

**Key rule:** Every file that imports from `recharts` or uses `useReactTable` MUST have `"use client"` at the top.

### Pattern 4: Data Import with Type Casting

**What:** Import JSON demo data with `as unknown as Type` pattern for TypeScript compatibility.

**When to use:** Every component that reads demo data.

**Example:**
```typescript
// Already established in codebase
import { demoComplianceRequirements } from "@/data"
import type { ComplianceData } from "@/types"

const data = demoComplianceRequirements as unknown as ComplianceData
```

### Anti-Patterns to Avoid

- **Don't use raw `ResponsiveContainer`:** Use `ChartContainer` from shadcn/ui instead. It provides themed tooltips, CSS variable colors, and accessibility. The existing plans reference `ResponsiveContainer` -- update to `ChartContainer`.
- **Don't build custom chart tooltips:** Use `ChartTooltipContent` from shadcn/ui. It automatically picks up labels and colors from `ChartConfig`.
- **Don't use `w-[--sidebar-width]`:** Tailwind v4 does NOT auto-wrap CSS vars in `var()`. Must use `w-[var(--sidebar-width)]`. This is a KNOWN GOTCHA documented in project memory.
- **Don't make compliance table a Server Component:** TanStack Table hooks (`useReactTable`, `useState`) require client-side rendering. The table MUST be a Client Component.
- **Don't install `react-big-calendar`:** The audit plan calendar is a simple FY month grid -- a custom Tailwind component is lighter and more appropriate.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart tooltips | Custom `<div>` positioned on hover | `ChartTooltipContent` from shadcn/ui chart | Handles positioning, theming, dark mode, responsive behavior |
| Sortable table headers | Custom sort state + icon toggle | TanStack Table `getSortedRowModel()` + `column.toggleSorting()` | Handles multi-sort, sort direction, stable sort |
| Filtered table | Custom `Array.filter()` on render | TanStack Table `getFilteredRowModel()` + `columnFilters` state | Handles multiple filters, filter removal, filter count |
| Progress bars | `<div>` with width percentage | shadcn/ui `Progress` component | Handles animation, accessibility (`role="progressbar"`), colors |
| Side panels | Custom positioned `<div>` | shadcn/ui `Sheet` component | Handles slide animation, backdrop, focus trap, keyboard dismiss |
| Modal dialogs | Custom overlay | shadcn/ui `Dialog` component | Handles focus trap, Escape key, click-outside, scroll lock |
| Scrollable lists | `overflow-y: auto` | shadcn/ui `ScrollArea` component | Custom scrollbar styling, touch support, consistent cross-browser |

**Key insight:** shadcn/ui has dedicated chart primitives (`ChartContainer`, `ChartTooltip`, `ChartLegend`) that the existing plans did NOT use. These should replace raw Recharts `ResponsiveContainer` + custom tooltips throughout.

## Common Pitfalls

### Pitfall 1: Missing `chart.tsx` Component
**What goes wrong:** Plans reference Recharts `ResponsiveContainer` directly, but shadcn/ui provides a `chart` component with `ChartContainer` that provides themed integration.
**Why it happens:** The shadcn chart component must be installed separately (`npx shadcn@latest add chart`) and was not included in the existing Phase 1 setup.
**How to avoid:** Install chart component in Plan 02-01 alongside other shadcn primitives. Use `ChartContainer` instead of `ResponsiveContainer` in all chart components.
**Warning signs:** Charts don't match the shadcn theme, custom tooltip code is being written.

### Pitfall 2: Recharts SSR Hydration Errors
**What goes wrong:** Recharts renders SVG client-side. If a chart component is rendered as a Server Component, the server HTML won't match the client HTML, causing hydration errors.
**Why it happens:** Next.js App Router defaults to Server Components. Forgetting `"use client"` on chart files causes SSR mismatches.
**How to avoid:** Every file that imports from `recharts` MUST have `"use client"` at the top. This is already noted in the existing plans.
**Warning signs:** Console errors about "Hydration failed" or "Text content does not match."

### Pitfall 3: Recharts `react-is` Peer Dependency
**What goes wrong:** pnpm warns about unmet peer dependency for `react-is` when installing recharts.
**Why it happens:** Recharts 3.7.0 lists `react-is` as a peer dependency (not a regular dependency). pnpm is strict about peer deps.
**How to avoid:** Explicitly install `react-is` alongside recharts: `pnpm add recharts react-is`.
**Warning signs:** pnpm install warnings about missing peer dependency.

### Pitfall 4: TanStack Table + React Compiler
**What goes wrong:** TanStack Table v8 doesn't re-render properly when the React Compiler is enabled. The table instance returned from `useReactTable` doesn't update as expected under aggressive memoization.
**Why it happens:** TanStack Table v8 has internal optimization patterns that conflict with the React Compiler's automatic memoization.
**How to avoid:** Do NOT enable `reactCompiler: true` in `next.config.ts` while using TanStack Table v8. The React Compiler is opt-in in Next.js 16 (not enabled by default), and it is currently NOT enabled in this project.
**Warning signs:** Table data doesn't update after state changes, filters appear to do nothing.

### Pitfall 5: ChartContainer Requires `min-h-[VALUE]`
**What goes wrong:** Chart renders with zero height, appearing invisible.
**Why it happens:** `ChartContainer` (unlike `ResponsiveContainer` which takes `height` prop) needs a CSS min-height to establish a rendering box.
**How to avoid:** Always set `className="min-h-[200px] w-full"` (or appropriate height) on `ChartContainer`.
**Warning signs:** Chart container exists in DOM but has 0px height.

### Pitfall 6: Compliance Data Has Only 15 Requirements (Not 50+)
**What goes wrong:** COMP-01 requires "50+ RBI compliance requirements" but the demo data only has 15.
**Why it happens:** The current `compliance-requirements.json` was created with 15 items during Quick Task 002.
**How to avoid:** Either expand the demo data to 50+ requirements (from the RBI regulations knowledge base in `src/data/rbi-regulations/`), or note this as a known gap for later data expansion. The table component should handle any number of rows.
**Warning signs:** Table looks sparse, success criteria #2 fails.

### Pitfall 7: Tailwind v4 CSS Variable Syntax
**What goes wrong:** Using `var(--chart-1)` works in plain CSS but chart colors defined as `hsl(var(--chart-1))` need the HSL values stored WITHOUT the `hsl()` wrapper in the CSS variable.
**Why it happens:** The project's globals.css stores chart colors as HSL triplets (e.g., `--chart-1: 207 90% 35%`) which are then wrapped with `hsl()` in the `@theme inline` block.
**How to avoid:** Use `hsl(var(--chart-1))` in ChartConfig color values, matching the pattern in globals.css `@theme inline` block. Or use hex/oklch colors directly.
**Warning signs:** Chart segments appear with wrong or no color.

## Code Examples

### Donut Chart (Audit Coverage - DASH-02)
```typescript
// Source: Context7 /recharts/recharts - PieChart + shadcn chart pattern
"use client"

import { Pie, PieChart, Cell } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { auditPlans } from "@/data"
import type { AuditData } from "@/types"

const data = auditPlans as unknown as AuditData

const chartConfig = {
  completed: { label: "Completed", color: "hsl(142 71% 45%)" },
  inProgress: { label: "In Progress", color: "hsl(217 91% 60%)" },
  remaining: { label: "Remaining", color: "hsl(215 20% 65%)" },
} satisfies ChartConfig

export function AuditCoverageChart() {
  const chartData = [
    { key: "completed", value: data.summary.completed },
    { key: "inProgress", value: data.summary["in-progress"] },
    { key: "remaining", value: data.summary.planned + data.summary["on-hold"] },
  ]

  return (
    <Card>
      <CardHeader><CardTitle>Audit Coverage</CardTitle></CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto min-h-[200px] w-full">
          <PieChart accessibilityLayer>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="key"
              innerRadius={60}
              outerRadius={80}
              strokeWidth={2}
            >
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={`var(--color-${entry.key})`} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
```

### Area Chart (Compliance Trend - COMP-06)
```typescript
// Source: Context7 /recharts/recharts - AreaChart + shadcn chart pattern
"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const chartConfig = {
  score: { label: "Compliance Score", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig

const trendData = [
  { month: "Aug 2025", score: 38 },
  { month: "Sep 2025", score: 40 },
  { month: "Oct 2025", score: 42 },
  { month: "Nov 2025", score: 44 },
  { month: "Dec 2025", score: 45 },
  { month: "Jan 2026", score: 47 },
]

export function ComplianceTrendChart() {
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <AreaChart accessibilityLayer data={trendData}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="score"
          stroke="var(--color-score)"
          fill="var(--color-score)"
          fillOpacity={0.2}
        />
      </AreaChart>
    </ChartContainer>
  )
}
```

### Sortable Table Header (from shadcn Data Table pattern)
```typescript
// Source: Context7 /websites/ui_shadcn - data table docs
import { Button } from "@/components/ui/button"
import { ArrowUpDown } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"

const columns: ColumnDef<ComplianceRequirement>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Requirement ID
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.getValue("id")}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return (
        <Badge variant="outline" className={STATUS_COLORS[status] ?? ""}>
          {status}
        </Badge>
      )
    },
  },
]
```

### RadialBarChart as Gauge (Health Score - DASH-01)
```typescript
// Source: Context7 /recharts/recharts - RadialBarChart
"use client"

import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"

const chartConfig = {
  score: { label: "Health Score", color: "hsl(142 71% 45%)" },
} satisfies ChartConfig

export function HealthScoreCard({ score }: { score: number }) {
  const chartData = [{ name: "score", value: score, fill: "var(--color-score)" }]

  return (
    <ChartContainer config={chartConfig} className="mx-auto min-h-[120px] w-full">
      <RadialBarChart
        innerRadius="70%"
        outerRadius="100%"
        data={chartData}
        startAngle={90}
        endAngle={-270}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
        <RadialBar dataKey="value" cornerRadius={10} background />
      </RadialBarChart>
    </ChartContainer>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw `ResponsiveContainer` | shadcn `ChartContainer` + `ChartConfig` | shadcn/ui chart component release (2024) | Themed tooltips, CSS variable colors, accessibility |
| Custom chart tooltips | `ChartTooltipContent` from shadcn | shadcn/ui chart component | No custom tooltip code needed |
| Manual table sorting/filtering | TanStack Table v8 with row models | TanStack Table v8 stable | Declarative sorting/filtering with `getSortedRowModel()` / `getFilteredRowModel()` |
| Custom progress bars | shadcn/ui `Progress` component | Available since shadcn launch | Accessible, animated, consistent with design system |
| Recharts 2.x with react-is workaround | Recharts 3.7.0 with React 19 peer dep | Recharts 3.x (2025) | Clean peer dependency, no workaround needed |

**Deprecated/outdated:**
- **Recharts 2.x:** Still works but 3.x has proper React 19 support and improved TypeScript types
- **TanStack Table `@tanstack/react-table` v7:** v8 has been stable for years; v7 had a completely different API

## Existing Plans Assessment

### What the existing plans got right:
1. **Correct library choices:** Recharts + TanStack Table is the standard stack
2. **Component structure:** 6 dashboard widgets, 4 compliance components, 4 audit components is well-organized
3. **Wave dependency model:** Plan 01 (deps) -> Plans 02-05 (components, parallel) -> Plan 06 (composition) is correct
4. **Accessibility notes:** Color-not-alone, aria-labels on icon buttons, keyboard navigation -- all good
5. **Responsive strategy:** `hidden md:table-cell` for less important table columns, responsive padding
6. **Demo data import pattern:** `as unknown as Type` casting is correct for JSON imports
7. **Audit calendar design:** Custom month grid instead of react-big-calendar is appropriate

### What the existing plans got wrong or missed:
1. **Missing shadcn chart component:** Plans reference raw `ResponsiveContainer` instead of `ChartContainer`. The shadcn `chart` component (`npx shadcn@latest add chart`) is not mentioned anywhere. This is the biggest gap.
2. **Missing `react-is` dependency:** Recharts 3.7.0 requires `react-is` as a peer dep. Not mentioned in Plan 02-01.
3. **Chart color pattern:** Plans use hardcoded hex colors (`#10B981`, `#3B82F6`) instead of CSS variable pattern (`var(--color-KEY)`) from ChartConfig.
4. **RadialBarChart gauge pattern:** Plan 02-02 uses `RadialBarChart` correctly but doesn't use `PolarAngleAxis` to set domain, which means the gauge won't properly show a 0-100 scale.
5. **ComplianceTable encapsulation:** Plan 02-03 has ComplianceTable including filters and dialog internally. This is fine for a prototype but the filter state should be lifted if the filters need to affect counts shown elsewhere on the page.
6. **15 vs 50+ requirements gap:** COMP-01 requires 50+ requirements but only 15 exist in demo data. This gap is not addressed.
7. **`accessibilityLayer` prop:** shadcn charts use `accessibilityLayer` prop on Recharts chart components (e.g., `<PieChart accessibilityLayer>`). This is not in the existing plans.

## Open Questions

1. **50+ compliance requirements (COMP-01)**
   - What we know: Current demo data has 15 requirements. The RBI regulations knowledge base in `src/data/rbi-regulations/` has additional requirements that could be merged.
   - What's unclear: Whether to expand the demo JSON now or accept 15 as "good enough" for prototype.
   - Recommendation: Expand to 50+ by mapping from the RBI regulations knowledge base. This can be a sub-task in Plan 02-01 or a prerequisite quick task. The table component should work with any count.

2. **shadcn chart vs raw Recharts for RadialBarChart gauge**
   - What we know: shadcn/ui has radial chart examples on their charts page. ChartContainer works with RadialBarChart.
   - What's unclear: Whether the single-value gauge pattern (health score 0-100) has a specific shadcn example, or if it needs custom positioning of the center text label.
   - Recommendation: Use ChartContainer + RadialBarChart + PolarAngleAxis for the gauge. Add a custom center text overlay with absolute positioning for the score number.

3. **Compliance data 50+ expansion source**
   - What we know: `src/data/rbi-regulations/compliance-requirements.ts` exists with additional requirements from the knowledge base.
   - What's unclear: Whether these are in the right format to merge with demo data, or need transformation.
   - Recommendation: Check the format and merge/transform in Plan 02-01. The expanded data should use the same `ComplianceRequirement` type from `src/types/index.ts`.

## Sources

### Primary (HIGH confidence)
- Context7 `/recharts/recharts` - PieChart, RadialBarChart, AreaChart patterns, ResponsiveContainer usage
- Context7 `/websites/tanstack_table` - useReactTable setup with sorting, filtering, column definitions
- Context7 `/websites/ui_shadcn` - Data Table pattern, Chart component, ChartContainer/ChartConfig/ChartTooltip
- npm registry: recharts 3.7.0 peer deps confirm React 19 support (`react: '^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0'`)
- npm registry: @tanstack/react-table 8.21.3 peer deps (`react: '>=16.8'`)
- [shadcn/ui Chart docs](https://ui.shadcn.com/docs/components/radix/chart) - ChartContainer, ChartConfig, installation
- [shadcn/ui Data Table docs](https://ui.shadcn.com/docs/components/radix/data-table) - TanStack Table integration pattern

### Secondary (MEDIUM confidence)
- [Next.js 16 blog](https://nextjs.org/blog/next-16) - React Compiler is opt-in, not default
- [Next.js reactCompiler config](https://nextjs.org/docs/app/api-reference/config/next-config-js/reactCompiler) - promoted from experimental to stable, but not enabled by default
- [TanStack Table + React Compiler issue](https://github.com/TanStack/table/issues/5567) - confirmed open issue, workaround is `"use no memo"`
- [recharts React 19 issue](https://github.com/recharts/recharts/issues/4558) - historical context, now resolved in 3.x

### Tertiary (LOW confidence)
- Web search results for Recharts SSR hydration patterns - general Next.js hydration guidance, not Recharts-specific testing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - verified via Context7 docs, npm registry, and shadcn/ui official docs
- Architecture: HIGH - patterns match Context7 code examples and shadcn/ui documented patterns
- Pitfalls: HIGH - React Compiler issue verified via GitHub issue #5567; recharts peer deps verified via npm; Tailwind v4 gotcha from project memory

**Research date:** February 8, 2026
**Valid until:** March 10, 2026 (30 days -- all libraries are stable releases)
