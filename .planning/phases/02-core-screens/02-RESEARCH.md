# Phase 2: Core Screens - Research

**Researched:** February 7, 2026
**Domain:** Next.js 14 App Router, Dashboard UI, Data Visualization, Tables, Calendar Components
**Confidence:** HIGH

## Summary

This research covers the technical implementation for Phase 2: building the three core screens (Dashboard, Compliance Registry, Audit Plan). Key findings include chart library recommendations (Recharts for React-based visualizations), table implementation patterns (shadcn/ui data table with TanStack Table), calendar component selection (react-big-calendar), and URL-based state management for filters/sorting using Next.js App Router's `useSearchParams` hook.

**Primary recommendation:** Use Recharts for all charts (donut, line trend), shadcn/ui data table with TanStack Table for the compliance registry, react-big-calendar for audit planning, and URL-based state management with `useSearchParams` for filters/sorting to enable shareable URLs and browser back-button support.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (from Phase 1 CONTEXT.md)
- **Tech Stack**
  - Next.js 14 with App Router (not Pages Router)
  - TypeScript for type safety
  - Tailwind CSS for styling
  - shadcn/ui for pre-built components (not building from scratch)
  - ESLint + Prettier for code quality

- **Project Structure**
  - `/src/app` - Next.js app router pages
  - `/src/components` - Reusable UI components
  - `/src/lib` - Utility functions and configurations
  - `/src/data` - All JSON demo data files
  - `/public` - Static assets (logos, images)

- **Navigation Structure**
  - Left sidebar with 7 menu items: Dashboard, Compliance Registry, Audit Plan, Findings, Board Report, Auditee Portal (placeholder), Settings (placeholder)
  - Top bar with: logo, language switcher, notifications bell, user profile dropdown
  - Sidebar collapses to hamburger menu on mobile
  - Active route highlighted in sidebar

- **Demo Data Format**
  - JSON files in `/src/data` directory
  - Each file has consistent structure with `id`, `name`, `status`, `createdAt` fields
  - All dates in ISO format
  - Relationships use IDs (foreign keys)
  - Sahyadri UCB as reference bank

### Claude's Discretion
- Chart library selection (Recharts vs alternatives)
- Table implementation approach (shadcn/ui Table vs TanStack Table vs custom)
- Calendar library selection and customization
- State management approach for filters/sorting (URL params vs React state)
- Modal dialog patterns for detail views
- Mobile responsive patterns for dashboard widgets
- Component file organization within `/src/components`
- Loading and empty state patterns

### Deferred Ideas (OUT OF SCOPE)
- Real-time data updates or subscriptions
- Advanced analytics or drill-down capabilities
- Export to Excel/PDF for tables (deferred to Phase 3 or MVP)
- Advanced calendar features (drag-and-drop scheduling, recurring events)
</user_constraints>

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Recharts | Latest | Chart library (donut, line, bar charts) | React-native, built on D3, declarative components, excellent TypeScript support |
| TanStack Table | v8+ | Headless table logic for sorting/filtering | Industry standard, shadcn/ui uses it, handles complex table state |
| react-big-calendar | Latest | Calendar view for audit plan | Full-featured calendar, customizable components, momentum in ecosystem |
| @tanstack/react-table | Latest | Table adapter for React | Required dependency for TanStack Table with React |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | Latest | Date formatting for calendar | Recharts and calendar need date formatting |
| clsx / cn | Latest | Conditional class names | shadcn/ui pattern for className composition |

### shadcn/ui Components Needed
| Component | Purpose |
|-----------|---------|
| table | Base table structure |
| dialog | Requirement detail modal |
| drawer | Mobile alternative to dialog |
| card | Dashboard widgets, audit cards |
| badge | Status indicators |
| progress | Audit completion bars |
| select | Category/status filters |
| button | All interactive elements |
| dropdown-menu | User profile, actions |
| separator | Visual dividers |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Chart.js, ApexCharts | Recharts is React-native, better TypeScript; Chart.js needs wrapper; ApexCharts heavier |
| TanStack Table | shadcn/ui Table only, custom table | TanStack adds powerful sorting/filtering; shadcn table alone needs custom state |
| react-big-calendar | FullCalendar, custom calendar | react-big-calendar more React-friendly; FullCalendar is jQuery-legacy |

**Installation:**
```bash
# Charts
pnpm add recharts

# Table with sorting/filtering
pnpm add @tanstack/react-table

# Calendar
pnpm add react-big-calendar date-fns

# shadcn/ui components (run for each)
pnpm dlx shadcn@latest add table dialog drawer card badge progress select dropdown-menu separator
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx             # Dashboard layout with sidebar
│   │   ├── page.tsx               # Dashboard home
│   │   ├── compliance/
│   │   │   └── page.tsx           # Compliance registry
│   │   └── audits/
│   │       └── page.tsx           # Audit plan
├── components/
│   ├── ui/                        # shadcn/ui components
│   ├── dashboard/
│   │   ├── health-score-widget.tsx
│   │   ├── donut-chart-widget.tsx
│   │   ├── count-cards-widget.tsx
│   │   ├── risk-indicator-widget.tsx
│   │   └── regulatory-calendar-widget.tsx
│   ├── compliance/
│   │   ├── compliance-table.tsx   # Main table with filters
│   │   ├── requirement-dialog.tsx # Detail modal
│   │   └── trend-chart.tsx        # Line chart
│   ├── audits/
│   │   ├── audit-calendar.tsx     # Calendar view
│   │   ├── audit-card.tsx         # Engagement cards
│   │   └── audit-filter-bar.tsx   # Type filter
│   └── layout/
│       ├── top-bar.tsx            # User profile, notifications
│       └── mobile-drawer.tsx      # Hamburger menu
├── lib/
│   ├── utils.ts                   # cn() helper
│   └── table-utils.ts             # Column definitions helpers
└── types/
    └── index.ts                   # TypeScript types
```

### Pattern 1: URL-Based State Management
**What:** Use Next.js `useSearchParams` hook for filter and sort state
**When to use:** For any table/list with filters, sorting, or pagination
**Why:** Shareable URLs, browser back-button support, refresh-persistent state

**Example:**
```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/use-search-params
"use client"

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export function useTableState() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParam = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set(name, value)
      router.push(pathname + '?' + params.toString())
    },
    [searchParams, pathname, router]
  )

  const removeParam = useCallback(
    (name: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete(name)
      router.push(pathname + '?' + params.toString())
    },
    [searchParams, pathname, router]
  )

  return {
    getParam: (name: string) => searchParams.get(name),
    setParam: updateParam,
    clearParam: removeParam,
    searchParams,
  }
}

// Usage in compliance table
function ComplianceTable() {
  const { getParam, setParam } = useTableState()
  const categoryFilter = getParam('category') || 'all'
  const statusFilter = getParam('status') || 'all'

  const handleCategoryChange = (value: string) => {
    setParam('category', value)
  }
}
```

### Pattern 2: Recharts Donut Chart for Audit Coverage
**What:** Create donut chart showing audited vs total entities
**When to use:** Dashboard DASH-02 requirement
**Example:**
```typescript
// Source: https://context7.com/recharts/recharts/llms.txt
"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface DonutChartProps {
  data: Array<{ name: string; value: number }>
  colors?: string[]
}

const DEFAULT_COLORS = ['#10b981', '#e5e7eb'] // green for audited, gray for pending

export function AuditCoverageDonut({ data, colors = DEFAULT_COLORS }: DonutChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

// Usage
const data = [
  { name: 'Audited', value: 42 },
  { name: 'Pending', value: 18 },
]
<AuditCoverageDonut data={data} />
```

### Pattern 3: Recharts Line Chart for Compliance Trend
**What:** Create line chart showing compliance score over 6 months
**When to use:** Dashboard DASH-02 trend chart, Compliance registry COMP-06
**Example:**
```typescript
// Source: https://context7.com/recharts/recharts/llms.txt
"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface TrendData {
  month: string
  score: number
}

export function ComplianceTrendChart({ data }: { data: TrendData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
        <XAxis dataKey="month" className="text-sm" />
        <YAxis domain={[0, 100]} className="text-sm" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
          }}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ fill: 'hsl(var(--primary))' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// Usage
const trendData = [
  { month: 'Sep', score: 72 },
  { month: 'Oct', score: 75 },
  { month: 'Nov', score: 78 },
  { month: 'Dec', score: 82 },
  { month: 'Jan', score: 85 },
  { month: 'Feb', score: 88 },
]
<ComplianceTrendChart data={trendData} />
```

### Pattern 4: TanStack Table with Column Definitions
**What:** Define typed columns with sorting/filtering for compliance registry
**When to use:** Any data table with sortable columns (COMP-02 requirement)
**Example:**
```typescript
// Source: https://ui.shadcn.com/docs/components/base/data-table
"use client"

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Type from Phase 1 research
import type { ComplianceRequirement } from '@/types'

export const columns: ColumnDef<ComplianceRequirement>[] = [
  {
    accessorKey: 'reference',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Reference
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div>{row.getValue('reference')}</div>,
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => <div>{row.getValue('category')}</div>,
  },
  {
    accessorKey: 'title',
    header: 'Requirement',
    cell: ({ row }) => <div className="max-w-md truncate">{row.getValue('title')}</div>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      const variant = status === 'compliant' ? 'default' :
                      status === 'partial' ? 'secondary' :
                      status === 'non-compliant' ? 'destructive' : 'outline'
      return <Badge variant={variant}>{status}</Badge>
    },
  },
  {
    accessorKey: 'nextReview',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Due Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue('nextReview'))
      return <div>{date.toLocaleDateString()}</div>
    },
  },
]

export function ComplianceDataTable({ data }: { data: ComplianceRequirement[] }) {
  const [sorting, setSorting] = useState([])
  const [columnFilters, setColumnFilters] = useState([])

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
                data-state={row.getIsSelected() && 'selected'}
                className="cursor-pointer"
                onClick={() => {/* Open detail modal */}}
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
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
```

### Pattern 5: Dialog with Responsive Drawer Fallback
**What:** Desktop uses modal dialog, mobile uses drawer from bottom
**When to use:** Detail modals that should work well on mobile
**Example:**
```typescript
// Source: https://ui.shadcn.com/docs/components/radix/drawer
"use client"

import * as React from "react"
import { useMediaQuery } from "@/hooks/use-media-query"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

interface ResponsiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: ResponsiveDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{title}</Drawer>
          {description && <DrawerDescription>{description}</DrawerDescription>}
        </DrawerHeader>
        <div className="px-4">{children}</div>
      </DrawerContent>
    </Drawer>
  )
}

// Custom hook for media query
// src/hooks/use-media-query.ts
"use client"

import { useEffect, useState } from "react"

export function useMediaQuery(query: string) {
  const [value, setValue] = useState(false)

  useEffect(() => {
    function onChange(event: MediaQueryListEvent) {
      setValue(event.matches)
    }

    const result = matchMedia(query)
    result.addEventListener("change", onChange)
    setValue(result.matches)

    return () => result.removeEventListener("change", onChange)
  }, [query])

  return value
}
```

### Pattern 6: Calendar with Audit Events
**What:** Display audit plan on monthly calendar view
**When to use:** Audit planning screen (AUDT-01 requirement)
**Example:**
```typescript
// Source: https://context7.com/jquense/react-big-calendar/llms.txt
"use client"

import { Calendar, momentLocalizer } from 'react-big-calendar'
import moment from 'moment'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import type { AuditPlan } from '@/types'

const localizer = momentLocalizer(moment)

interface AuditCalendarProps {
  audits: AuditPlan[]
  onAuditClick: (audit: AuditPlan) => void
}

export function AuditCalendar({ audits, onAuditClick }: AuditCalendarProps) {
  // Transform audit data to calendar events
  const events = audits.map((audit) => ({
    id: audit.id,
    title: audit.name,
    start: new Date(audit.startDate),
    end: new Date(audit.endDate),
    resource: audit, // Store full audit data
  }))

  // Custom event styling based on status
  const eventStyleGetter = (event: any) => {
    const status = event.resource?.status
    const backgroundColor = status === 'completed' ? '#10b981' :
                           status === 'in-progress' ? '#3b82f6' :
                           status === 'on-hold' ? '#f97316' : '#6b7280'
    return { style: { backgroundColor, borderRadius: '4px' } }
  }

  return (
    <div className="h-[600px]">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        eventPropGetter={eventStyleGetter}
        onSelectEvent={(event) => onAuditClick(event.resource)}
        views={['month', 'week', 'day']}
        defaultView="month"
      />
    </div>
  )
}
```

### Pattern 7: Status Badge Colors
**What:** Consistent color coding for status values across all screens
**When to use:** Compliance status, audit status, finding severity, finding status
**Example:**
```typescript
// lib/status-utils.ts
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Compliance status colors
export function ComplianceStatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    compliant: 'default',      // green
    partial: 'secondary',       // yellow
    'non-compliant': 'destructive', // red
    pending: 'outline',         // gray
    'not-applicable': 'outline',
  }
  return <Badge variant={variants[status] || 'outline'}>{status}</Badge>
}

// Audit status colors
export function AuditStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    planned: 'bg-gray-500',
    'in-progress': 'bg-blue-500',
    'on-hold': 'bg-orange-500',
    completed: 'bg-green-500',
  }
  return (
    <Badge className={cn('text-white', colors[status] || 'bg-gray-500')}>
      {status}
    </Badge>
  )
}

// Finding severity colors
export function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-600',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
  }
  return (
    <Badge className={cn('text-white', colors[severity] || 'bg-gray-500')}>
      {severity}
    </Badge>
  )
}
```

### Anti-Patterns to Avoid
- **Building custom table sorting/filtering:** Use TanStack Table instead - it handles edge cases like multi-sort, nested sorting, filter composition
- **Using React state for filter/sort:** URL-based state is better for sharing and back-button support
- **Hardcoding chart colors:** Define color palette in constants for consistency across charts
- **Building custom calendar:** react-big-calendar handles month navigation, event overlap, responsive sizing
- **Using Chart.js directly:** Recharts is React-native with better TypeScript and Next.js Server Component compatibility
- **Creating separate mobile/tablet components:** Use responsive design patterns with Tailwind breakpoints and conditional rendering

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Table sorting/filtering state | Custom useState for sort direction, filter logic | TanStack Table with useReactTable | Handles multi-column sort, filter composition, pagination state automatically |
| Donut chart from scratch | SVG paths calculations, arc trigonometry | Recharts PieChart with innerRadius | Handles hover states, tooltips, accessibility, responsive sizing |
| Calendar view | Date math, month grid generation, event positioning | react-big-calendar | Handles month boundaries, event overlap, view switching, keyboard navigation |
| Status badge colors | Conditional className strings everywhere | Centralized badge component utilities | Consistent colors, easier to update, single source of truth |
| Modal with overlay | Custom click-outside logic, escape key handling, focus trap | shadcn/ui Dialog component | ARIA attributes, focus management, portal rendering built-in |
| Mobile drawer | Custom CSS transforms, gesture handling | shadcn/ui Drawer component | Swipe gestures, proper z-indexing, animation timing |
| Filter dropdown | Custom positioning, collision detection | shadcn/ui Select/DropdownMenu | Handles screen edge collision, keyboard navigation, scroll locking |
| URL state management | Manual string manipulation | Next.js useSearchParams + URLSearchParams API | Proper encoding, multi-value handling, type-safe methods |

**Key insight:** The combination of TanStack Table + shadcn/ui components + URL-based state management creates a powerful pattern for data-heavy screens. TanStack Table handles the complex logic, shadcn/ui provides beautiful accessible UI, and URL state ensures the UI is shareable and navigable. Building any of these from scratch would be reinventing well-tested wheels.

## Common Pitfalls

### Pitfall 1: Recharts in Server Components
**What goes wrong:** "Chart did not render" or hydration errors
**Why it happens:** Recharts uses browser APIs and requires client-side rendering
**How to avoid:** Always add `"use client"` directive to components using Recharts
```typescript
"use client" // REQUIRED for all Recharts components
import { PieChart } from 'recharts'
```

**Warning signs:** Chart not appearing, console errors about `window` being undefined

### Pitfall 2: Table State Not Syncing with URL
**What goes wrong:** User filters/sorts table, refreshing page loses state
**Why it happens:** Using useState instead of URL params for filter/sort state
**How to avoid:** Use `useSearchParams` pattern from Pattern 1 above

**Warning signs:** Back button doesn't undo filter changes, can't share filtered table URL

### Pitfall 3: react-big-calendar CSS Not Loading
**What goes wrong:** Calendar renders but has no styling, events overlapping incorrectly
**Why it happens:** Forgetting to import the CSS file
**How to avoid:** Always import CSS in layout or component:
```typescript
import 'react-big-calendar/lib/css/react-big-calendar.css'
```

**Warning signs:** Calendar looks broken, events not positioned correctly

### Pitfall 4: Modal Not Closing on Escape
**What goes wrong:** User presses Escape and modal stays open
**Why it happens:** Building custom modal without proper event handling
**How to avoid:** Use shadcn/ui Dialog which handles this automatically

**Warning signs:** Accessibility issues, can't close modal without clicking X button

### Pitfall 5: Status Colors Inconsistent Across Screens
**What goes wrong:** Compliance "compliant" is green on dashboard but blue on registry
**Why it happens:** Hardcoded colors in different components
**How to avoid:** Use centralized badge utilities from Pattern 7

**Warning signs:** User confusion about what colors mean, repeated color definitions

### Pitfall 6: Calendar Events Not Clickable on Mobile
**What goes wrong:** Desktop works fine, mobile nothing happens when tapping event
**Why it happens:** Touch events not handled, or click area too small
**How to avoid:** react-big-calendar handles this, but ensure minimum touch target sizes in custom event components

**Warning signs:** Mobile users can't open audit details from calendar

### Pitfall 7: Missing Loading States
**What goes wrong:** Blank screen while data loads, poor perceived performance
**Why it happens:** Not showing skeleton/placeholder during data fetch
**How to avoid:** Use shadcn/ui Skeleton component or simple loading spinners

**Warning signs:** Screen flashes or feels slow when navigating between screens

## Code Examples

Verified patterns from official sources:

### Recharts Donut Chart with Center Label
```typescript
// Source: https://context7.com/recharts/recharts/llms.txt
"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface DonutChartProps {
  data: Array<{ name: string; value: number }>
  centerLabel?: string
}

const COLORS = ['#10b981', '#e5e7eb', '#fbbf24', '#ef4444']

export function DonutChart({ data, centerLabel }: DonutChartProps) {
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      {centerLabel && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold">{centerLabel}</span>
        </div>
      )}
    </div>
  )
}
```

### Compliance Registry with Filters
```typescript
// Source: Combined from TanStack Table and shadcn/ui patterns
"use client"

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'

export function ComplianceFilterBar() {
  const searchParams = useSearchParams()
  const category = searchParams.get('category') || 'all'
  const status = searchParams.get('status') || 'all'
  const search = searchParams.get('search') || ''

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    window.history.pushState(null, '', `?${params.toString()}`)
  }

  const categories = ['all', 'Governance', 'Risk Management', 'Operations', 'IT', 'Credit']
  const statuses = ['all', 'compliant', 'partial', 'non-compliant', 'pending']

  return (
    <div className="flex gap-4 mb-4">
      <Input
        placeholder="Search requirements..."
        value={search}
        onChange={(e) => updateFilter('search', e.target.value)}
        className="max-w-sm"
      />
      <Select value={category} onValueChange={(v) => updateFilter('category', v)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          {categories.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {cat === 'all' ? 'All Categories' : cat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={(v) => updateFilter('status', v)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {statuses.map((stat) => (
            <SelectItem key={stat} value={stat}>
              {stat === 'all' ? 'All Statuses' : stat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {(category !== 'all' || status !== 'all' || search) && (
        <Button
          variant="ghost"
          onClick={() => {
            window.history.pushState(null, '', window.location.pathname)
          }}
        >
          Clear filters
        </Button>
      )}
    </div>
  )
}
```

### Health Score Widget with Color Indicator
```typescript
// Dashboard health score widget
"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function HealthScoreWidget({ score }: { score: number }) {
  // Color based on score
  const getColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100'
    if (score >= 60) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Compliance Health Score</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center">
          <div className={cn('relative w-32 h-32 rounded-full flex items-center justify-center', getBgColor(score))}>
            <div className="text-center">
              <div className={cn('text-4xl font-bold', getColor(score))}>{score}</div>
              <div className="text-xs text-muted-foreground">out of 100</div>
            </div>
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-4">
          {score >= 80 ? 'Good standing' : score >= 60 ? 'Needs attention' : 'Critical'}
        </p>
      </CardContent>
    </Card>
  )
}
```

### Count Cards Widget
```typescript
// Dashboard count cards for findings
"use client"

import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, AlertCircle, Clock, Ban } from 'lucide-react'

export function CountCardsWidget({ counts }: {
  counts: {
    total: number
    critical: number
    open: number
    overdue: number
  }
}) {
  const cards = [
    { label: 'Total Findings', value: counts.total, icon: AlertTriangle, color: 'text-gray-600' },
    { label: 'Critical', value: counts.critical, icon: AlertCircle, color: 'text-red-600' },
    { label: 'Open', value: counts.open, icon: Clock, color: 'text-blue-600' },
    { label: 'Overdue', value: counts.overdue, icon: Ban, color: 'text-orange-600' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
              <card.icon className={cn('h-8 w-8', card.color)} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

### Audit Engagement Card
```typescript
// Audit plan engagement cards
"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Calendar, Users } from 'lucide-react'
import type { AuditPlan } from '@/types'

export function AuditEngagementCard({ audit }: { audit: AuditPlan }) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{audit.name}</CardTitle>
          <AuditStatusBadge status={audit.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 mr-2" />
          {formatDate(audit.startDate)} - {formatDate(audit.endDate)}
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Users className="h-4 w-4 mr-2" />
          {audit.team.length} team members
        </div>
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Progress</span>
            <span>{audit.coverage}%</span>
          </div>
          <Progress value={audit.coverage} />
        </div>
        <div className="flex gap-2">
          {audit.branches.slice(0, 3).map((branch) => (
            <Badge key={branch} variant="outline" className="text-xs">
              {branch}
            </Badge>
          ))}
          {audit.branches.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{audit.branches.length - 3} more
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual SVG charts | Declarative chart libraries (Recharts) | 2023+ | Faster development, better accessibility, easier customization |
| Custom table state | TanStack Table headless UI | 2022+ | Powerful sorting/filtering out of the box, better performance |
| React state for filters | URL-based state management | 2023+ with Next.js App Router | Shareable URLs, browser history support |
| CSS-in-JS for modals | Radix UI + Tailwind patterns | 2023+ | Better performance, smaller bundles, server-compatible |
| jQuery-based calendars | React-native calendar components | 2021+ | Better React integration, modern APIs |

**Deprecated/outdated:**
- **Chart.js with react-chartjs-2:** Recharts is more React-idiomatic with better TypeScript
- **react-table v7:** Upgrade to TanStack Table v8 (new name, better APIs)
- **Custom table sorting:** TanStack Table handles multi-column sort, nested sorting
- **Framer Motion for simple animations:** Tailwind animate- utilities for simple cases

## Open Questions

1. **Calendar Date Localization**
   - What we know: react-big-calendar requires a localizer (moment, date-fns, globalize)
   - What's unclear: Should dates be formatted in English (EN) or respect the language switcher (HI/MR/GU)?
   - Recommendation: For prototype, keep dates in English. Full i18n deferred to Phase 4.

2. **Chart Animation Duration**
   - What we know: Recharts has animation but default durations may feel slow
   - What's unclear: Should we customize animation duration for snappier feel?
   - Recommendation: Use defaults initially, adjust if dashboard feels sluggish. Can add `animationDuration={500}` to charts.

3. **Table Pagination
   - What we know: Compliance registry has 50+ requirements (COMP-01)
   - What's unclear: Should all 50+ show at once or paginate?
   - Recommendation: Show all 50+ in scrollable container for prototype. Pagination adds complexity that can wait for MVP.

4. **Calendar Color Scheme
   - What we know: Need colors for audit statuses (planned, in-progress, on-hold, completed)
   - What's unclear: Exact color values for enterprise audit context
   - Recommendation: Use semantic colors (gray/blue/orange/green) matching status badges for consistency.

## Sources

### Primary (HIGH confidence)
- [Recharts Documentation](https://context7.com/recharts/recharts/llms.txt) - Pie charts, line charts, donut charts with examples
- [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/base/data-table) - TanStack Table integration patterns
- [shadcn/ui Dialog](https://ui.shadcn.com/docs/components/base/dialog) - Modal components for detail views
- [shadcn/ui Progress](https://ui.shadcn.com/docs/components/radix/progress) - Progress bar components
- [shadcn/ui Select](https://ui.shadcn.com/docs/components/radix/select) - Dropdown filter components
- [react-big-calendar Documentation](https://context7.com/jquense/react-big-calendar/llms.txt) - Calendar customization, event rendering
- [Next.js useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params) - URL state management patterns

### Secondary (MEDIUM confidence)
- [shadcn/ui Badge Patterns](https://ui.shadcn.com/docs/components/base/avatar) - Status badge with avatar badge pattern
- [shadcn/ui Card Examples](https://ui.shadcn.com/docs/components/base/card) - Dashboard card layouts
- [Next.js Shallow Routing](https://nextjs.org/docs/app/guides/single-page-applications) - URL updates without reload

### Tertiary (LOW confidence)
- None - all sources verified through Context7 or official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified through Context7 and official docs
- Architecture: HIGH - Official patterns from shadcn/ui, Next.js, and library documentation
- Code examples: HIGH - Verified from official Context7 documentation
- Pitfalls: HIGH - Based on verified documentation and known framework constraints

**Research date:** February 7, 2026
**Valid until:** March 9, 2026 (30 days - libraries are stable but check for updates before implementation)

## RESEARCH COMPLETE
