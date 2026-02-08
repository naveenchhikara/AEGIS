# Architecture

**Analysis Date:** 2026-02-08

## Pattern Overview

**Overall:** Multi-tenant SaaS Prototype with Client-Side Rendering

**Key Characteristics:**

- Next.js 16 App Router with file-based routing
- Static JSON data layer (no backend/database in current prototype phase)
- Component-driven UI with shadcn/ui primitives
- Client-side i18n using next-intl with cookie-based locale storage
- No authentication/authorization in current implementation (planned for future phases)

## Layers

**Presentation Layer (Client Components):**

- Purpose: Renders UI, handles user interactions, manages client-side state
- Location: `src/components/` and `src/app/(dashboard)/*/page.tsx`
- Contains: React components marked with "use client" directive, shadcn/ui primitives, TanStack Table instances, Recharts visualizations
- Depends on: Data layer (`@/data`), Types (`@/types`), Utility functions (`@/lib/utils`)
- Used by: Next.js routing system (`src/app/`)
- Pattern: All interactive components use "use client" since they leverage hooks, state, or event handlers

**Data Layer (Static JSON):**

- Purpose: Provides demo data for prototype phase
- Location: `src/data/`
- Contains: JSON files for bank profile, staff, branches, compliance requirements, audit plans, findings, RBI circulars, RBI regulations knowledge base
- Depends on: Nothing (pure data files)
- Used by: Page components and presentation components via barrel export (`@/data`)
- Pattern: Barrel export in `src/data/index.ts` with type casting (`as unknown as Type`)

**Type System:**

- Purpose: Enforces type safety across application
- Location: `src/types/index.ts`
- Contains: TypeScript interfaces matching JSON data shapes (BankProfile, ComplianceRequirement, Finding, AuditPlan, etc.)
- Depends on: Nothing (pure type definitions)
- Used by: All components, pages, and utility functions
- Pattern: Single types file with exported interfaces

**Utility Layer:**

- Purpose: Shared helper functions, constants, and configuration
- Location: `src/lib/`
- Contains: `utils.ts` (cn, formatDate), `constants.ts` (colors, languages), `nav-items.ts` (sidebar config), `icons.ts` (Lucide icons barrel export), `report-utils.ts` (report calculations), `current-user.ts` (demo user object)
- Depends on: External packages (clsx, tailwind-merge, lucide-react)
- Used by: All components and pages

**Routing Layer:**

- Purpose: File-based routing with layouts and nested routes
- Location: `src/app/`
- Contains: Route groups (`(auth)`, `(dashboard)`), page components, layout components
- Depends on: Presentation layer, data layer, i18n
- Used by: Next.js framework

**Internationalization Layer:**

- Purpose: Multi-language support for Indian banking context
- Location: `src/i18n/`, `messages/`
- Contains: `request.ts` (locale config), JSON translation files for en/hi/mr/gu
- Depends on: next-intl package, cookies API
- Used by: All client components via `useTranslations` hook
- Pattern: Cookie-based locale storage (`NEXT_LOCALE`), dynamic message loading

## Data Flow

**Page Load Flow:**

1. User navigates to route (e.g., `/dashboard`, `/compliance`)
2. Next.js App Router matches route group and loads layout hierarchy
3. Root layout (`app/layout.tsx`) initializes fonts, locale provider
4. Dashboard layout (`app/(dashboard)/layout.tsx`) renders `SidebarProvider > AppSidebar + SidebarInset > TopBar + main`
5. Page component loads and imports static data via `@/data` barrel export
6. Component casts JSON data to TypeScript types (`as unknown as Type`)
7. Component renders, passing data to child components
8. Client components use `useTranslations` hook for i18n strings

**User Interaction Flow:**

1. User interacts with UI (e.g., clicks finding row in table)
2. Component handles event (onClick, onChange)
3. For detail views: navigate to dynamic route (`/findings/[id]`)
4. For dialogs: update local state to show modal with detail data
5. For filters: update TanStack Table filter state, table re-renders

**State Management:**

- Local component state with React useState (tables, dialogs, filters)
- No global state management (Redux, Zustand) — not needed for prototype
- Locale stored in cookie (`NEXT_LOCALE`), read server-side per request

## Key Abstractions

**Route Groups:**

- Purpose: Organize routes without affecting URL structure
- Examples: `src/app/(auth)/`, `src/app/(dashboard)/`
- Pattern: Parentheses in folder names create logical grouping without URL segments
- `(auth)` contains login page with simple layout
- `(dashboard)` contains all authenticated pages with sidebar/topbar layout

**Barrel Exports:**

- Purpose: Simplify imports with single entry point
- Examples: `src/data/index.ts`, `src/lib/icons.ts`
- Pattern: Re-export multiple modules from single file
- `@/data` exports all demo JSON files and RBI regulations
- `@/lib/icons` exports all Lucide icons used in app

**shadcn/ui Component Pattern:**

- Purpose: Reusable UI primitives with consistent theming
- Examples: `src/components/ui/card.tsx`, `src/components/ui/table.tsx`, `src/components/ui/sidebar.tsx`
- Pattern: Radix UI primitives wrapped with Tailwind CSS styling, exported as composable sub-components
- Most UI components are "use client" since Radix requires client-side JS

**Feature Component Grouping:**

- Purpose: Co-locate related components by feature area
- Examples: `src/components/dashboard/`, `src/components/compliance/`, `src/components/findings/`, `src/components/reports/`
- Pattern: Each feature has its own directory with page-specific components
- Components in these directories are "use client" and import from `@/components/ui`

## Entry Points

**Application Entry:**

- Location: `src/app/layout.tsx`
- Triggers: Every page load
- Responsibilities: Load fonts (Noto Sans, Noto Sans Devanagari, Noto Sans Gujarati, DM Serif Display), initialize next-intl provider, set HTML lang attribute, suppress hydration warnings for Radix UI

**Root Redirect:**

- Location: `src/app/page.tsx`
- Triggers: User visits `/`
- Responsibilities: Redirect to `/login`

**Login Page:**

- Location: `src/app/(auth)/login/page.tsx`
- Triggers: User visits `/login` or redirected from root
- Responsibilities: Render login form (demo only, no validation), navigate to `/dashboard` on submit

**Dashboard Layout:**

- Location: `src/app/(dashboard)/layout.tsx`
- Triggers: Any page under `(dashboard)` route group
- Responsibilities: Render sidebar + topbar layout, provide Suspense boundary with loading skeleton, skip-to-content link for accessibility

**Dynamic Finding Route:**

- Location: `src/app/(dashboard)/findings/[id]/page.tsx`
- Triggers: User navigates to `/findings/{id}`
- Responsibilities: Load finding by ID from static data, render `FindingDetail` component, show 404 if not found
- Pattern: Uses `generateStaticParams` for static site generation

## Error Handling

**Strategy:** Minimal error handling in prototype phase (production hardening planned for future)

**Patterns:**

- 404 for invalid finding IDs: `notFound()` function in dynamic routes
- Type casting safety: `as unknown as Type` pattern with runtime undefined checks
- Optional chaining for nested data access
- No error boundaries implemented yet
- No global error handling middleware

## Cross-Cutting Concerns

**Logging:** None (console.log in development only, no structured logging)

**Validation:** None (demo data trusted, no user input validation beyond form submits that don't persist)

**Authentication:** None (planned for Phase 5+, current prototype allows unrestricted access)

**Authorization:** None (no role-based access control implemented)

**Performance Monitoring:** None (no analytics, error tracking, or performance monitoring)

**Accessibility:**

- Skip-to-content link in dashboard layout
- Recharts `accessibilityLayer` prop enabled
- Radix UI primitives include ARIA attributes
- Reduced motion support in chart animations
- Semantic HTML structure

**Responsive Design:**

- Mobile-first approach with Tailwind breakpoints (sm, md, lg)
- Collapsible sidebar with icon-only mode
- Adaptive grid layouts (1 col mobile → 2-3 cols desktop)
- `use-mobile.tsx` hook for breakpoint detection

---

_Architecture analysis: 2026-02-08_
