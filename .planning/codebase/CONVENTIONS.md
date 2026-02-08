# Coding Conventions

**Analysis Date:** 2026-02-08

## Naming Patterns

**Files:**

- React components: PascalCase with `.tsx` extension (e.g., `HealthScoreCard.tsx`, `ComplianceTable.tsx`)
- Utilities/libraries: kebab-case with `.ts` extension (e.g., `utils.ts`, `nav-items.ts`, `report-utils.ts`)
- Data files: kebab-case JSON (e.g., `bank-profile.json`, `compliance-requirements.json`)
- Configuration: kebab-case or conventional names (e.g., `components.json`, `next.config.ts`, `.prettierrc`)

**Functions:**

- Exported utilities: camelCase (e.g., `formatDate`, `calculateAge`, `ageColorClass`)
- React components: PascalCase (e.g., `HealthScoreCard`, `ComplianceTable`, `FindingsTable`)
- Hooks: camelCase with `use` prefix (e.g., `useReactTable`, `useSidebar`)

**Variables:**

- Constants: SCREAMING_SNAKE_CASE (e.g., `APP_NAME`, `SEVERITY_COLORS`, `STATUS_COLORS`)
- React state: camelCase (e.g., `sorting`, `columnFilters`, `selectedRequirement`)
- Component props: camelCase (e.g., `categoryFilter`, `statusFilter`, `onCategoryChange`)
- Objects/data: camelCase (e.g., `chartData`, `compData`, `currentUser`)

**Types:**

- Interfaces and types: PascalCase (e.g., `ComplianceRequirement`, `Finding`, `BankProfile`)
- Type exports from `@/types/index.ts`

## Code Style

**Formatting:**

- Tool: Prettier 3.8.1
- Configuration: `/Users/admin/Developer/AEGIS/.prettierrc`
- Key settings:
  - Semicolons: Required (`"semi": true`)
  - Quotes: Double quotes (`"singleQuote": false`)
  - Plugins: `prettier-plugin-tailwindcss` (auto-sorts Tailwind classes)

**Linting:**

- Tool: ESLint 10.0.0 with Next.js flat config
- Configuration: `/Users/admin/Developer/AEGIS/eslint.config.mjs`
- Key rules:
  - Extends `next/core-web-vitals` and `next/typescript`
  - Uses FlatCompat for ESLint 9+ compatibility

**TypeScript:**

- Strict mode enabled (`"strict": true`)
- Module resolution: `bundler` (Next.js 16 App Router)
- JSON imports supported (`"resolveJsonModule": true`)
- Path alias: `@/*` maps to `./src/*`

## Import Organization

**Order:**

1. React and Next.js core imports
2. Third-party libraries (UI components, utilities)
3. Local UI components (`@/components/ui/*`)
4. Feature components (`@/components/dashboard/*`, `@/components/compliance/*`)
5. Libraries and utilities (`@/lib/*`)
6. Data imports (`@/data`)
7. Type imports (`@/types`)
8. CSS imports (last)

**Example from `src/components/compliance/compliance-table.tsx`:**

```typescript
import * as React from "react";
import { ArrowUpDown } from "@/lib/icons";
import { useReactTable, type ColumnDef } from "@tanstack/react-table";
import { Table, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ComplianceDetailDialog } from "./compliance-detail-dialog";
import { ComplianceFilters } from "./compliance-filters";
import { demoComplianceRequirements } from "@/data";
import { STATUS_COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { ComplianceRequirement } from "@/types";
```

**Path Aliases:**

- `@/*` for all `src/*` imports
- Always use absolute imports, never relative paths like `../../../`

**Icon Imports:**

- ALWAYS import from `@/lib/icons` (barrel export), never directly from `lucide-react`
- Example: `import { ArrowUpDown, ChevronDown } from "@/lib/icons";`

## Error Handling

**Patterns:**

- No explicit error boundaries in current codebase (prototype phase)
- Async operations use standard try/catch (not present in demo data flows)
- Fallback rendering for empty states in tables:
  ```typescript
  {table.getRowModel().rows?.length ? (
    // Render rows
  ) : (
    <TableRow>
      <TableCell colSpan={columns.length} className="h-24 text-center">
        No findings match the selected filters.
      </TableCell>
    </TableRow>
  )}
  ```

## Logging

**Framework:** Standard `console` (no structured logging library)

**Patterns:**

- Minimal logging in production code
- Debug/development logging not present in reviewed files
- Future: Consider structured logging for server-side operations

## Comments

**When to Comment:**

- Complex business logic (e.g., custom sort functions, data transformations)
- Workarounds or Tailwind CSS v4 quirks (mentioned in MEMORY.md)
- File-level docblocks for data exports (e.g., `src/data/index.ts`)

**JSDoc/TSDoc:**

- Not consistently used
- Type annotations via TypeScript interfaces preferred over JSDoc
- Component props documented via TypeScript interfaces

**Example from `src/data/index.ts`:**

```typescript
// ============================================================================
// AEGIS Platform - Data Exports
// ============================================================================
// This file exports all regulation and demo data objects for use in the AEGIS platform
// ============================================================================
```

## Function Design

**Size:**

- React components: 50-400 lines (median ~150 lines)
- Utility functions: 5-20 lines
- Complex table components (with filters/sorting): 300-400 lines

**Parameters:**

- Component props: Destructured with TypeScript interface
- Event handlers: Passed as props with `on` prefix (e.g., `onCategoryChange`, `onReset`)
- Use object parameters for >3 parameters

**Return Values:**

- React components: JSX
- Utilities: Typed return values (e.g., `string`, `number`, `JSX.Element`)
- Table accessors: Type-safe via `@tanstack/react-table` generics

## Module Design

**Exports:**

- Named exports for components (e.g., `export function ComplianceTable()`)
- Default exports for Next.js pages (e.g., `export default function DashboardPage()`)
- Named exports for utilities and constants

**Barrel Files:**

- `src/lib/icons.ts`: Re-exports all icons from `lucide-react`
- `src/data/index.ts`: Re-exports all demo data and RBI regulations
- Usage enforced: Import from barrel, not directly from source

## React Patterns

**Client Components:**

- Use `"use client"` directive for interactive components
- All tables, forms, and stateful widgets are client components

**Server Components:**

- Next.js pages are async server components by default
- Use `getLocale()` and `getMessages()` from `next-intl/server`

**State Management:**

- Local state via `React.useState` (no Redux/Zustand in current codebase)
- Table state managed by `@tanstack/react-table`
- Form state managed by controlled components

**Props Patterns:**

- Destructure props in function signature
- Use TypeScript interfaces for prop types
- Spread remaining props with `{...props}`

**Example from `src/components/ui/badge.tsx`:**

```typescript
export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
```

## shadcn/ui Conventions

**Component Structure:**

- Use `class-variance-authority` (cva) for variant management
- Combine classes with `cn()` utility from `@/lib/utils`
- Forward refs for primitive components
- Radix UI primitives for accessibility

**Styling:**

- Tailwind CSS v4 with CSS variables
- Use semantic color tokens (e.g., `text-muted-foreground`, `bg-primary`)
- Custom color maps in `@/lib/constants.ts` (e.g., `SEVERITY_COLORS`, `STATUS_COLORS`)

**Variants:**

- Define with `cva()` at module level
- Export `*Variants` alongside component (e.g., `buttonVariants`, `badgeVariants`)
- Use `VariantProps<typeof *Variants>` for prop typing

## Data Handling

**JSON Imports:**

- Use type casting: `as unknown as Type` due to TypeScript strict mode
- Example: `const compData = demoComplianceRequirements as unknown as ComplianceData;`

**Date Formatting:**

- Use `formatDate()` from `@/lib/utils.ts` (Indian locale: `en-IN`)
- Never render raw ISO strings in UI

**Summary Objects:**

- Embedded in JSON files (e.g., `compliance-requirements.json`, `findings.json`)
- Access via `.summary` property

## Accessibility

**Keyboard Navigation:**

- Add `tabIndex={0}` to clickable rows
- Handle `Enter` and `Space` keys via `onKeyDown`
- Example from `src/components/compliance/compliance-table.tsx`:
  ```typescript
  <TableRow
    role="button"
    tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setSelectedRequirement(row.original);
      }
    }}
  />
  ```

**ARIA Labels:**

- Use `aria-label` for charts (e.g., `aria-label={`Compliance health score: ${score} percent`}`)
- Radix UI components include ARIA attributes by default

**Reduced Motion:**

- Check `prefers-reduced-motion` for animations
- Example from `src/components/dashboard/health-score-card.tsx`:

  ```typescript
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  <RadialBar isAnimationActive={!prefersReducedMotion} />
  ```

## Internationalization

**Framework:** `next-intl` 4.8.2

**Usage:**

- Call `useTranslations()` hook with namespace (e.g., `"Dashboard"`, `"Navigation"`)
- Translation keys: camelCase (e.g., `t("title")`, `t("subtitle")`)
- Example from `src/app/(dashboard)/dashboard/page.tsx`:
  ```typescript
  const t = useTranslations("Dashboard");
  return <h1>{t("title")}</h1>;
  ```

**Locale Setup:**

- Server components: `await getLocale()` and `await getMessages()`
- Root layout wraps app in `<NextIntlClientProvider>`

---

_Convention analysis: 2026-02-08_
