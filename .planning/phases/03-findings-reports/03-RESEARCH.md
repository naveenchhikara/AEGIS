# Phase 3: Finding Management & Reports - Research

**Researched:** February 7, 2026
**Domain:** Next.js 14 App Router, shadcn/ui Data Tables, Recharts, Print CSS, Status Timelines
**Confidence:** HIGH

## Summary

This research covers the technical implementation patterns for Phase 3: Finding Management & Reports. Key findings include the shadcn/ui data table pattern with TanStack Table for advanced filtering and sorting, badge component variants for severity indicators, Next.js dynamic routes for detail pages, Recharts for compliance scorecards, and CSS print media queries for board report preview mode.

**Primary recommendation:** Use shadcn/ui's DataTable pattern with @tanstack/react-table for findings list, Next.js dynamic routes [id] for finding/audit detail pages, shadcn/ui Badge with custom Tailwind classes for severity colors, custom timeline component built with shadcn/ui primitives for status history, and @media print CSS queries for board report formatting.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (from Phase 01)

**Tech Stack:**
- Next.js 14 with App Router (not Pages Router)
- TypeScript for type safety
- Tailwind CSS for styling
- shadcn/ui for pre-built components (not building from scratch)
- ESLint + Prettier for code quality

**Project Structure:**
- `/src/app` - Next.js app router pages
- `/src/components` - Reusable UI components
- `/src/lib` - Utility functions and configurations
- `/src/data` - All JSON demo data files
- `/public` - Static assets (logos, images)

**Data Access:**
- All data from JSON files in /src/data (demo data)
- Client-side routing with Next.js App Router
- Type-safe JSON imports with TypeScript interfaces

### Claude's Discretion
- Exact component file structure within `/src/components`
- Timeline component implementation approach (custom vs. library)
- Print preview trigger method (button vs. keyboard shortcut)

### Deferred Ideas (OUT OF SCOPE)
- Real PDF generation (jsPDF, react-pdf) — Preview only in prototype
- Backend API for filtering/sorting — All client-side for demo
- Real authentication for finding access control — No auth in prototype
</user_constraints>

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-table | 8.17+ | Table logic (sorting, filtering, pagination) | Industry standard for React tables, headless UI, works with shadcn/ui |
| shadcn/ui Table | Latest | Table UI components | Consistent with project design system |
| shadcn/ui Badge | Latest | Status and severity indicators | Built-in variants with Tailwind customization |
| shadcn/ui Tabs | Latest | Workspace and detail page sections | Clean tabbed interface for multi-section content |
| shadcn/ui Progress | Latest | Audit engagement completion tracking | Simple progress indicator component |
| shadcn/ui Select | Latest | Filter dropdowns | Accessible select with keyboard navigation |
| Recharts | Latest | Compliance scorecard and metrics | React-native charts, composable components |
| date-fns | Latest | Date formatting for timeline | Lightweight, tree-shakeable date utilities |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | Latest | Icons for timeline and badges | Status icons, timeline connectors |
| @tanstack/table-core | 8.17+ | Core table utilities | Required by @tanstack/react-table |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @tanstack/react-table | react-table v7 | react-table v7 is deprecated, v8 is now @tanstack/react-table |
| shadcn/ui Table | MUI Table, AG Grid | shadcn/ui gives full ownership; AG Grid is overkill for 35 findings |
| Custom timeline | react-vertical-timeline | Custom with shadcn/ui components matches design system; external lib adds dependency |
| Recharts | Chart.js, Victory | Recharts is React-native, composable, works well with shadcn/ui |

**Installation:**
```bash
# Install TanStack Table for data table functionality
pnpm add @tanstack/react-table

# Recharts for charts (if not already installed in Phase 2)
pnpm add recharts

# date-fns for date formatting (if not already installed)
pnpm add date-fns

# Add required shadcn/ui components
pnpm dlx shadcn@latest add table badge tabs progress select card separator
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── findings/
│   │   │   ├── page.tsx                    # Findings list table
│   │   │   └── [id]/
│   │   │       └── page.tsx                # Finding detail with timeline
│   │   ├── audits/
│   │   │   ├── page.tsx                    # Audit plan list
│   │   │   └── [id]/
│   │   │       └── page.tsx                # Audit engagement workspace
│   │   └── reports/
│   │       └── page.tsx                    # Board report preview
├── components/
│   ├── ui/                                  # shadcn/ui components
│   │   ├── table.tsx
│   │   ├── badge.tsx
│   │   ├── tabs.tsx
│   │   ├── progress.tsx
│   │   ├── select.tsx
│   │   └── ...
│   ├── findings/
│   │   ├── findings-table.tsx              # Main findings list component
│   │   ├── finding-filters.tsx             # Filter controls
│   │   ├── severity-badge.tsx              # Custom severity badge
│   │   ├── finding-detail.tsx              # Finding detail page content
│   │   └── status-timeline.tsx             # Timeline component for status history
│   ├── audits/
│   │   ├── audit-workspace.tsx             # Audit engagement workspace
│   │   ├── audit-programs.tsx              # Audit program linkages
│   │   └── audit-progress.tsx              # Progress bar with status
│   └── reports/
│       ├── board-report-preview.tsx        # Main board report component
│       ├── executive-summary.tsx           # Executive summary section
│       ├── audit-coverage-table.tsx        # Planned vs actual table
│       ├── key-findings-summary.tsx        # Top 10 critical findings
│       ├── compliance-scorecard.tsx        # Scorecard with breakdowns
│       └── recommendations-section.tsx      # Prioritized action items
├── lib/
│   ├── utils.ts                            # cn() helper, aggregations
│   └── finding-utils.ts                    # Finding-specific utilities
├── types/
│   └── index.ts                            # TypeScript interfaces
└── data/
    ├── findings.json                       # 35 findings
    ├── audits.json                         # Audit engagements
    └── ...
```

### Pattern 1: Findings List Table with TanStack Table
**What:** Use @tanstack/react-table with shadcn/ui Table components for a filterable, sortable findings list
**When to use:** For any data table that needs sorting, filtering, or pagination
**Example:**
```typescript
// Source: https://ui.shadcn.com/docs/components/data-table
"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Finding } from "@/types"

export const columns: ColumnDef<Finding>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "title",
    header: "Title",
  },
  {
    accessorKey: "severity",
    header: "Severity",
    cell: ({ row }) => <SeverityBadge severity={row.getValue("severity")} />,
  },
  {
    accessorKey: "status",
    header: "Status",
  },
  {
    accessorKey: "category",
    header: "Category",
  },
]

export function FindingsTable({ data }: { data: Finding[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  })

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => window.location.href = `/findings/${row.original.id}`}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No findings.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
```

### Pattern 2: Severity Badge with Custom Colors
**What:** Use shadcn/ui Badge with custom Tailwind classes for severity-specific colors
**When to use:** For status indicators that need color coding based on business logic
**Example:**
```typescript
// Source: https://ui.shadcn.com/docs/components/badge
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type Severity = "critical" | "high" | "medium" | "low"

interface SeverityBadgeProps {
  severity: Severity
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <Badge
      className={cn(
        severity === "critical" && "bg-red-100 text-red-800 hover:bg-red-200",
        severity === "high" && "bg-orange-100 text-orange-800 hover:bg-orange-200",
        severity === "medium" && "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
        severity === "low" && "bg-green-100 text-green-800 hover:bg-green-200"
      )}
    >
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </Badge>
  )
}
```

### Pattern 3: Next.js Dynamic Routes for Detail Pages
**What:** Use Next.js App Router dynamic segments [id] for detail pages
**When to use:** For any page that displays details of a specific entity
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes
// app/(dashboard)/findings/[id]/page.tsx

import { notFound } from "next/navigation"
import findings from "@/data/findings.json"
import type { Finding } from "@/types"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function FindingPage({ params }: PageProps) {
  const { id } = await params
  const finding = (findings as Finding[]).find(f => f.id === id)

  if (!finding) {
    notFound()
  }

  return (
    <div className="container mx-auto py-6">
      {/* Finding detail content */}
    </div>
  )
}
```

### Pattern 4: Status Timeline Component
**What:** Custom vertical timeline built with shadcn/ui Card and Separator components
**When to use:** For displaying chronological status history
**Example:**
```typescript
// Based on shadcn/ui patterns and timeline component research
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Clock, User } from "lucide-react"

interface TimelineEntry {
  id: string
  date: string
  action: string
  actor: string
}

interface StatusTimelineProps {
  timeline: TimelineEntry[]
}

export function StatusTimeline({ timeline }: StatusTimelineProps) {
  return (
    <div className="space-y-4">
      {timeline.map((entry, index) => (
        <div key={entry.id} className="flex gap-4">
          {/* Timeline connector line */}
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-primary" />
            {index < timeline.length - 1 && (
              <div className="w-0.5 flex-1 bg-border min-h-[3rem]" />
            )}
          </div>

          {/* Timeline content */}
          <Card className="flex-1">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{entry.action}</p>
                  <p className="text-sm text-muted-foreground">
                    {entry.actor}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {format(new Date(entry.date), "MMM d, yyyy")}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  )
}
```

### Pattern 5: Audit Workspace with Tabs
**What:** Use shadcn/ui Tabs component for multi-section workspace layout
**When to use:** For organizing complex content into navigable sections
**Example:**
```typescript
// Source: https://ui.shadcn.com/docs/components/tabs
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function AuditWorkspace({ audit }: { audit: Audit }) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="programs">Audit Programs</TabsTrigger>
        <TabsTrigger value="team">Team</TabsTrigger>
        <TabsTrigger value="findings">Findings</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <Card>
          <CardHeader>
            <CardTitle>{audit.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Overview content */}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Other tabs... */}
    </Tabs>
  )
}
```

### Pattern 6: Print Styles with @media print
**What:** Use CSS @media print queries for board report preview formatting
**When to use:** For any page that needs to print or export to PDF
**Example:**
```css
/* Source: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing */
/* app/globals.css */

@media print {
  /* Hide navigation and interactive elements */
  .sidebar,
  .top-bar,
  button,
  .no-print {
    display: none !important;
  }

  /* Ensure full width for printing */
  .container {
    max-width: 100% !important;
    width: 100% !important;
  }

  /* Page breaks */
  .page-break {
    break-after: always;
  }

  .no-break {
    break-inside: avoid;
  }

  /* Print-friendly colors */
  body {
    background: white !important;
    color: black !important;
  }

  /* Show URLs for links */
  a::after {
    content: " (" attr(href) ")";
  }
}
```

### Anti-Patterns to Avoid
- **Building custom table logic:** Use @tanstack/react-table instead of manual sorting/filtering state
- **Hardcoded badge colors:** Use a utility component (SeverityBadge) for consistent styling
- **Complex timeline libraries:** Build simple timeline with shadcn/ui components instead of adding dependencies
- **Separate print stylesheet:** Use @media print in globals.css instead of separate print.css file
- **Server-side filtering for demo:** Use client-side filtering with TanStack Table for prototype

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Table sorting/filtering | Custom useState for each column | @tanstack/react-table | Handles edge cases, multi-column sort, accessibility |
| Badge status indicators | Manual className logic | shadcn/ui Badge + variants | Consistent styling, accessibility, keyboard nav |
| Tab navigation | Custom state + conditional rendering | shadcn/ui Tabs | ARIA attributes, keyboard navigation, focus management |
| Progress bars | Custom div with width | shadcn/ui Progress | Accessibility, animation, consistent styling |
| Select dropdowns | Custom select implementation | shadcn/ui Select | Focus management, keyboard nav, collision detection |
| Date formatting | Manual date string manipulation | date-fns | Handles timezones, locales, edge cases |

**Key insight:** shadcn/ui components copy into your project, giving full ownership while avoiding the complexity of building accessible, responsive UI components from scratch. TanStack Table provides the headless logic for tables while shadcn/ui provides the visual components.

## Common Pitfalls

### Pitfall 1: Missing "use client" Directive for Interactive Tables
**What goes wrong:** TanStack Table throws "useState only works in Client Components" error
**Why it happens:** TanStack Table uses React hooks for state management
**How to avoid:** Add `"use client"` at the top of any file using @tanstack/react-table

**Example:**
```typescript
"use client" // Required for TanStack Table

import { useReactTable } from "@tanstack/react-table"

export function FindingsTable() {
  const table = useReactTable({ ... })
  // ...
}
```

**Warning signs:** "X only works in Client Components" error in dev console

### Pitfall 2: Incorrect Severity Badge Color Scheme
**What goes wrong:** Severity colors don't match requirements (Critical=red, High=orange, Medium=yellow, Low=green)
**Why it happens:** Using default Badge variants instead of custom classes
**How to avoid:** Create a SeverityBadge component with explicit color mapping

**Example:**
```typescript
// WRONG - uses default variants
<Badge variant={severity === "critical" ? "destructive" : "secondary"}>

// CORRECT - explicit color mapping
<Badge className={cn(
  severity === "critical" && "bg-red-100 text-red-800",
  // ...
)}>
```

### Pitfall 3: Print Styles Not Applying
**What goes wrong:** Print preview shows screen layout instead of print-optimized view
**Why it happens:** Forgetting !important on display: none for overriding inline styles
**How to avoid:** Use !important for hiding elements in @media print

**Example:**
```css
@media print {
  .sidebar {
    display: none !important; /* !important needed to override inline styles */
  }
}
```

### Pitfall 4: Timeline Data Structure Mismatch
**What goes wrong:** Timeline component expects different data structure than JSON provides
**Why it happens:** Not defining TypeScript interface for timeline entries early
**How to avoid:** Define TimelineEntry interface in types/index.ts and ensure JSON matches

**Example:**
```typescript
// types/index.ts
export interface TimelineEntry {
  id: string
  date: string // ISO date
  action: string
  actor: string
}

export interface Finding {
  // ...
  timeline: TimelineEntry[]
}
```

### Pitfall 5: Chart Data Not Aggregating Correctly
**What goes wrong:** Compliance scorecard shows wrong totals or percentages
**Why it happens:** Not properly aggregating data from JSON before passing to Recharts
**How to avoid:** Create utility functions for data aggregation in lib/utils.ts

**Example:**
```typescript
// lib/utils.ts
export function aggregateComplianceData(findings: Finding[]) {
  const byCategory = findings.reduce((acc, finding) => {
    acc[finding.category] = (acc[finding.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return Object.entries(byCategory).map(([category, count]) => ({
    category,
    count,
    percentage: (count / findings.length) * 100,
  }))
}
```

## Code Examples

Verified patterns from official sources:

### Data Table with Filters and Sorting
```typescript
// Source: https://ui.shadcn.com/docs/components/data-table
"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  })

  return (
    <div className="rounded-md border">
      <Table>{/* Table content */}</Table>
    </div>
  )
}
```

### Status Filter Dropdown
```typescript
// Source: https://ui.shadcn.com/docs/components/select
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  const statuses = ["Draft", "Under Review", "Response Pending", "Action Planned", "Closed"]

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Filter by status" />
      </SelectTrigger>
      <SelectContent>
        {statuses.map((status) => (
          <SelectItem key={status} value={status.toLowerCase().replace(" ", "-")}>
            {status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

### Compliance Scorecard with Recharts
```typescript
// Source: https://recharts.org/en-US/api/BarChart
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

export function ComplianceScorecard({ data }: { data: ComplianceData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="category" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="score" fill="#8884d8" name="Compliance Score" />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

### Progress Bar for Audit Engagement
```typescript
// Source: https://ui.shadcn.com/docs/components/progress
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function AuditEngagementCard({ audit }: { audit: Audit }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{audit.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{audit.completion}%</span>
          </div>
          <Progress value={audit.completion} />
        </div>
      </CardContent>
    </Card>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-table v7 | @tanstack/react-table v8 | 2023 | Package renamed, now maintained under TanStack umbrella |
| Manual print styles | @media print queries | CSS3 (stable) | Standard print CSS approach, well-supported |
| Custom timeline components | shadcn/ui primitives for timelines | 2023-2024 | Build with existing components instead of external libraries |
| Chart.js for React | Recharts | 2020+ | Recharts is React-native, better DX for React apps |
| Pagination handled manually | TanStack Table built-in pagination | 2023 | v8 includes improved pagination support |

**Deprecated/outdated:**
- **react-table v7:** Package renamed to @tanstack/react-table
- **page-break-*** CSS properties: Replaced by break-*** properties (though older ones still work)
- **Separate print.css:** Modern approach uses @media print in main stylesheet

## Open Questions

1. **Timeline Component Complexity**
   - What we know: Timeline needs to show status history with dates and actors
   - What's unclear: Should timeline show just status changes or all activity (comments, attachments)?
   - Recommendation: Start with status changes only. Expand based on demo feedback.

2. **Print Preview Trigger**
   - What we know: Board report needs print/PDF preview mode
   - What's unclear: Should this be triggered by a button or keyboard shortcut (Cmd+P)?
   - Recommendation: Add a "Print Report" button that calls window.print() for discoverability. Keyboard shortcut works automatically.

3. **Chart Customization Level**
   - What we know: Recharts needed for compliance scorecard
   - What's unclear: How much customization (colors, tooltips, animations) is needed?
   - Recommendation: Start with default Recharts styling. Customize colors to match shadcn/ui theme.

## Sources

### Primary (HIGH confidence)
- [shadcn/ui DataTable Documentation](https://ui.shadcn.com/docs/components/data-table) - Complete data table pattern with TanStack Table
- [shadcn/ui Badge Component](https://ui.shadcn.com/docs/components/badge) - Badge variants and customization
- [shadcn/ui Tabs Component](https://ui.shadcn.com/docs/components/tabs) - Tabbed interface patterns
- [shadcn/ui Progress Component](https://ui.shadcn.com/docs/components/progress) - Progress bar implementation
- [shadcn/ui Select Component](https://ui.shadcn.com/docs/components/select) - Select dropdown patterns
- [Next.js Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes) - App Router dynamic segments
- [Recharts Documentation](https://recharts.org/) - Chart components and API
- [MDN - Printing CSS](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing) - Print media queries (Nov 7, 2025)

### Secondary (MEDIUM confidence)
- [SitePoint - Printer-friendly Pages with CSS](https://www.sitepoint.com/css-printer-friendly-pages/) - Print CSS best practices (March 27, 2024)
- [TimDeHof/shadcn-timeline](https://github.com/timDeHof/shadcn-timeline) - Timeline component reference for shadcn/ui
- [ShadcnBlocks Timeline](https://www.shadcnblocks.com/blocks/timeline) - Timeline block patterns
- [react-vertical-timeline](https://github.com/stephane-monnot/react-vertical-timeline) - Alternative timeline library (not recommended due to dependency)

### Tertiary (LOW confidence)
- [Aceternity UI Timeline](https://ui.aceternity.com/components/timeline) - Timeline with animations (marked for validation - may be overkill for prototype)
- Various blog posts on React timeline components (LOW confidence without direct verification)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - TanStack Table and shadcn/ui components verified from official docs
- Architecture: HIGH - Next.js dynamic routes and App Router patterns from official Next.js documentation
- Data table patterns: HIGH - Complete DataTable example from shadcn/ui official docs
- Badge/severity patterns: HIGH - Badge customization examples from official docs
- Timeline patterns: MEDIUM - Based on shadcn/ui primitives and community patterns
- Print CSS: HIGH - MDN and SitePoint documentation verified
- Recharts integration: HIGH - Official Recharts documentation verified
- Pitfalls: HIGH - Well-documented common issues with TanStack Table and Next.js

**Research date:** February 7, 2026
**Valid until:** March 9, 2026 (30 days - All sources are stable libraries with verified documentation)
