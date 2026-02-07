# Phase 1: Project Setup & Demo Data - Research

**Researched:** February 7, 2026
**Domain:** Next.js 14 App Router, shadcn/ui, Enterprise Dashboard, Demo Data Structures
**Confidence:** HIGH

## Summary

This research covers the technical foundation for Phase 1: initializing a Next.js 14 project with App Router, TypeScript, Tailwind CSS, and shadcn/ui components. Key findings include the official installation processes for Next.js and shadcn/ui, sidebar navigation patterns for enterprise dashboards, and type-safe JSON data loading patterns.

**Primary recommendation:** Use `create-next-app` with TypeScript and Tailwind defaults, then initialize shadcn/ui with `pnpm dlx shadcn@latest init`. Build navigation with shadcn/ui's Sidebar component and use direct JSON imports with TypeScript interfaces for demo data.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
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

- **Login Screen**
  - Clean, centered login card
  - Fields: email, password (both functional-looking but no real auth)
  - MFA prompt UI (visual only — "Enter code from authenticator app")
  - Language selector dropdown (EN/HI/MR/GU) prominent on login
  - Logo placeholder at top
  - "Login" button redirects to dashboard on any valid email format
  - No "forgot password" or "sign up" (internal tool)

- **Demo Data Format**
  - JSON files in `/src/data` directory
  - Each file has consistent structure with `id`, `name`, `status`, `createdAt` fields
  - All dates in ISO format
  - Relationships use IDs (foreign keys)
  - Sahyadri UCB as reference bank

- **RBI Circulars Processing**
  - Store PDFs in `/Project Doc/rbi-circulars/`
  - Create index document mapping circulars to compliance requirements
  - Extract requirements into structured JSON with categories
  - Document common observations as finding templates

### Claude's Discretion
- Exact component file structure within `/src/components`
- Tailwind config values (colors, spacing)
- shadcn/ui components to install upfront vs. as needed
- JSON file naming conventions
- Routing strategy (app directory structure)

### Deferred Ideas (OUT OF SCOPE)
- Real authentication with NextAuth.js — Phase 2 (MVP)
- Multi-tenant data structures — Phase 2 (MVP)
- Role-based navigation differences — deferred to MVP based on pilot feedback
</user_constraints>

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 14.2+ | React framework with App Router | Official recommendation for 2026, built-in Turbopack, React 19 support |
| React | Latest (via Next.js) | UI library | Next.js App Router uses React canary releases with React 19 changes |
| TypeScript | 5.1+ | Type safety | Minimum required by Next.js, provides excellent DX |
| Tailwind CSS | 3.4+ | Utility-first styling | Default in Next.js create app, excellent with shadcn/ui |
| shadcn/ui | Latest | Component library | Copy-paste components, full customization, Radix UI primitives |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx / cn | Latest | Conditional class names | shadcn/ui pattern for className composition |
| lucide-react | Latest | Icons | shadcn/ui default icon library |
| date-fns | Latest | Date formatting | For demo data ISO date handling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn/ui | Chakra UI, Mantine | shadcn/ui gives full ownership; others are dependency-heavy |
| Tailwind CSS | CSS Modules, Styled Components | Tailwind faster for dashboard layouts; utility-first matches enterprise UI needs |
| App Router | Pages Router | App Router is recommended and future-forward; Pages Router is legacy |

**Installation:**
```bash
# Create Next.js project with all defaults
pnpm create next-app@latest aegis --yes

# The --yes flag uses: TypeScript, ESLint, Tailwind CSS, App Router, Turbopack, src/ directory, @/* import alias

# Initialize shadcn/ui
cd aegis
pnpm dlx shadcn@latest init

# Add first components
pnpm dlx shadcn@latest add button card input label sidebar dropdown-menu avatar select separator
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx           # Login screen
│   ├── (dashboard)/
│   │   ├── layout.tsx             # Dashboard layout with sidebar
│   │   ├── page.tsx               # Dashboard home
│   │   ├── compliance/
│   │   │   └── page.tsx           # Compliance registry
│   │   ├── audits/
│   │   │   ├── page.tsx           # Audit plan list
│   │   │   └── [id]/
│   │   │       └── page.tsx       # Audit detail
│   │   ├── findings/
│   │   │   ├── page.tsx           # Findings list
│   │   │   └── [id]/
│   │   │       └── page.tsx       # Finding detail
│   │   ├── reports/
│   │   │   └── page.tsx           # Board reports
│   │   ├── auditee/
│   │   │   └── page.tsx           # Auditee portal (placeholder)
│   │   └── settings/
│   │       └── page.tsx           # Settings (placeholder)
│   ├── layout.tsx                 # Root layout (html, body, fonts)
│   └── globals.css                # Global styles, Tailwind directives
├── components/
│   ├── ui/                        # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── sidebar.tsx            # shadcn sidebar
│   │   └── ...
│   ├── layout/
│   │   ├── sidebar-nav.tsx        # Navigation menu component
│   │   ├── top-bar.tsx            # Header with logo, language, profile
│   │   └── mobile-drawer.tsx      # Mobile hamburger menu
│   ├── auth/
│   │   └── login-form.tsx         # Login form component
│   └── dashboard/
│       └── ...
├── lib/
│   ├── utils.ts                   # shadcn cn() helper
│   └── constants.ts               # App constants (nav items, routes)
├── data/
│   ├── bank-profile.json          # Sahyadri UCB profile
│   ├── branches.json              # Bank branches
│   ├── departments.json           # Bank departments
│   ├── compliance-requirements.json  # 50+ RBI requirements
│   ├── audit-plans.json           # 8-10 planned audits
│   ├── findings.json              # 35 open findings
│   ├── compliance-calendar.json   # Regulatory deadlines
│   ├── team-members.json          # Audit team
│   ├── rbi-circulars-index.json   # Catalogued circulars
│   └── common-observations.json   # Finding templates
└── types/
    └── index.ts                   # TypeScript types for demo data
```

### Pattern 1: Route Groups for Layout Separation
**What:** Use Next.js route groups `(auth)` and `(dashboard)` to separate layouts without affecting URLs
**When to use:** When different sections need different layouts (login has no sidebar, dashboard has sidebar)
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts

// app/(dashboard)/layout.tsx - Sidebar layout for dashboard routes
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <TopBar />
        {children}
      </main>
    </div>
  )
}
```

### Pattern 2: shadcn/ui Sidebar Component
**What:** Use official shadcn/ui Sidebar component for navigation
**When to use:** For the main dashboard navigation with collapsible menu
**Example:**
```typescript
// Source: https://ui.shadcn.com/docs/components/sidebar
// Install: pnpm dlx shadcn@latest add sidebar

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const items = [
  { title: "Dashboard", url: "/" },
  { title: "Compliance Registry", url: "/compliance" },
  { title: "Audit Plan", url: "/audits" },
  // ...
]

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>{item.title}</a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
```

### Pattern 3: Type-Safe JSON Data Loading
**What:** Import JSON directly with TypeScript types for compile-time safety
**When to use:** For all demo data files in `/src/data`
**Example:**
```typescript
// Source: TypeScript best practices for JSON imports

// types/index.ts
export interface BankProfile {
  id: string
  name: string
  shortName: string
  registrationNumber: string
  status: "active" | "inactive"
  createdAt: string // ISO date
}

export interface ComplianceRequirement {
  id: string
  category: string
  reference: string // e.g., "RBI/2023-24/117"
  title: string
  description: string
  status: "compliant" | "partial" | "non-compliant" | "pending"
  lastReviewed: string
  nextReview: string
}

// src/data/bank-profile.json
{
  "id": "sahyadri-ucb",
  "name": "Sahyadri Urban Cooperative Bank",
  "shortName": "Sahyadri UCB",
  "registrationNumber": "UCB-MH-2024-1234",
  "status": "active",
  "createdAt": "2024-01-15T00:00:00.000Z"
}

// app/page.tsx
import bankProfile from "@/data/bank-profile.json"
import type { BankProfile } from "@/types"

// Type assertion for safety (or use zod for runtime validation)
const profile = bankProfile as BankProfile

export default function DashboardPage() {
  return (
    <div>
      <h1>{profile.name}</h1>
      <p>Reg No: {profile.registrationNumber}</p>
    </div>
  )
}
```

### Anti-Patterns to Avoid
- **Building custom navigation components:** Use shadcn/ui Sidebar instead of hand-rolling
- **Pages Router pattern with useRouter for navigation:** Use App Router with `<Link>` component
- **Client Components by default:** Start with Server Components, only add "use client" when needed
- **importing JSON without types:** Always define TypeScript interfaces for JSON data
- **Hardcoded navigation items:** Store in constants file for reuse

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sidebar navigation with collapsible menu | Custom collapsible state, drawer logic | shadcn/ui `sidebar` component | Handles mobile/desktop responsiveness, keyboard navigation, ARIA attributes |
| Dropdown menus (language switcher, profile menu) | Custom click handlers, positioning | shadcn/ui `dropdown-menu` component | Proper focus management, keyboard shortcuts, collision detection |
| Login form styling and validation | Custom input wrappers, error states | shadcn/ui `form` + `input` + `label` components | Consistent styling, built-in error handling patterns |
| Icon handling | Custom SVG imports, sizing issues | `lucide-react` icon library | Tree-shakeable, consistent sizing, 2000+ icons |
| Conditional className logic | Ternary operators in className | `cn()` utility from shadcn | Cleaner code, handles clsx/tw-merge automatically |

**Key insight:** shadcn/ui components copy directly into your project, giving you full ownership while avoiding the complexity of building accessible, responsive UI components from scratch. Each component handles edge cases like keyboard navigation, focus management, and mobile responsiveness that are easy to miss in custom implementations.

## Common Pitfalls

### Pitfall 1: Missing "use client" Directive
**What goes wrong:** Components using hooks (useState, useEffect) throw "useState only works in Client Components" error
**Why it happens:** Next.js 14 App Router uses Server Components by default. React hooks only work in Client Components.
**How to avoid:** Add `"use client"` at the top of any file that uses:
- React hooks (useState, useEffect, useReducer)
- Browser APIs (window, localStorage, navigator)
- Event handlers (onClick, onChange)
- Form libraries (react-hook-form)

**Example:**
```typescript
"use client" // Required for interactive components

import { useState } from "react"

export function LoginForm() {
  const [email, setEmail] = useState("")
  // ...
}
```

**Warning signs:** "X only works in Client Components" error in dev console

### Pitfall 2: Layout vs Page Confusion
**What goes wrong:** UI that should persist across routes gets re-rendered, losing state
**Why it happens:** Putting shared UI in `page.tsx` instead of `layout.tsx`. Pages re-render on navigation, layouts don't.
**How to avoid:** Sidebar, top bar, and any shared UI go in `layout.tsx`. Page-specific content goes in `page.tsx`.

**Warning signs:** Sidebar flickering or state resetting when navigating

### Pitfall 3: Relative Import Hell
**What goes wrong:** Imports like `import { Button } from "../../../components/ui/button"`
**Why it happens:** Not configuring path aliases
**How to avoid:** Use the `@/*` alias configured by create-next-app:
```typescript
// Good
import { Button } from "@/components/ui/button"

// Bad
import { Button } from "../../../components/ui/button"
```

**Configuration (in tsconfig.json):**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Pitfall 4: JSON Import Without Type Safety
**What goes wrong:** Runtime errors when JSON structure changes, no autocomplete
**Why it happens:** Using `import data from "./file.json"` without TypeScript types
**How to avoid:** Always define interfaces matching JSON structure:
```typescript
// Define type
interface ComplianceRequirement {
  id: string
  title: string
  status: "compliant" | "partial" | "non-compliant"
}

// Import with type assertion
import requirements from "./data/requirements.json"
const typedRequirements = requirements as ComplianceRequirement[]
```

**Better:** Use Zod for runtime validation (deferred to Phase 2 for MVP)

### Pitfall 5: Sidebar Width on Mobile
**What goes wrong:** Sidebar takes full screen on mobile, content inaccessible
**Why it happens:** Fixed-width sidebar not responsive
**How to avoid:** Use shadcn/ui Sidebar with `collapsible` and `inset` variants:
- Desktop: Sidebar visible, 240-280px wide (per UX best practices)
- Mobile: Sidebar hidden, hamburger menu triggers overlay drawer

**Warning signs:** Horizontal scroll on mobile, content cut off

## Code Examples

Verified patterns from official sources:

### Next.js 14 Project Creation
```bash
# Source: https://nextjs.org/docs/app/getting-started/installation
pnpm create next-app@latest aegis --yes
cd aegis
pnpm dev
```
The `--yes` flag accepts defaults: TypeScript, ESLint, Tailwind CSS, App Router, Turbopack, src/ directory, @/* import alias.

### shadcn/ui Initialization
```bash
# Source: https://ui.shadcn.com/docs/installation/next
pnpm dlx shadcn@latest init
# Choose: Next.js, Default style, Neutral color, CSS variables
```

### App Router Layout Pattern
```typescript
// Source: https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts
// app/layout.tsx - Root layout (REQUIRED)
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

### Navigation with Active Route Highlighting
```typescript
// Source: App Router patterns, shadcn/ui Sidebar docs
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navItems = [
  { title: "Dashboard", href: "/", icon: "layout-dashboard" },
  { title: "Compliance Registry", href: "/compliance", icon: "scale" },
  { title: "Audit Plan", href: "/audits", icon: "clipboard-list" },
  { title: "Findings", href: "/findings", icon: "alert-triangle" },
  { title: "Board Report", href: "/reports", icon: "file-text" },
  { title: "Auditee Portal", href: "/auditee", icon: "users" },
  { title: "Settings", href: "/settings", icon: "settings" },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      {/* Icon component here */}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
```

### Login Form Component
```typescript
// Source: shadcn/ui form patterns
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showMfa, setShowMfa] = useState(false)
  const [mfaCode, setMfaCode] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Validate email format only
    if (email.includes("@")) {
      if (!showMfa) {
        setShowMfa(true)
      } else {
        // On valid email, redirect to dashboard
        router.push("/")
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            {/* Logo placeholder */}
          </div>
          <CardTitle className="text-center">AEGIS Audit Platform</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@bank.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {showMfa && (
              <div className="space-y-2">
                <Label htmlFor="mfa">Enter code from authenticator app</Label>
                <Input
                  id="mfa"
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                />
              </div>
            )}
            <Button type="submit" className="w-full">
              {showMfa ? "Verify & Login" : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

### Demo Data TypeScript Types
```typescript
// Source: TypeScript best practices for 2026
// src/types/index.ts

export interface BankProfile {
  id: string
  name: string
  shortName: string
  registrationNumber: string
  city: string
  state: string
  status: "active" | "inactive"
  establishedDate: string
  createdAt: string
}

export interface Branch {
  id: string
  name: string
  code: string
  city: string
  state: string
  manager: string
  status: "active" | "dormant"
  lastAuditDate: string
}

export interface Department {
  id: string
  name: string
  head: string
  code: string
}

export interface ComplianceRequirement {
  id: string
  category: "Governance" | "Risk Management" | "Compliance" | "Operations" | "IT" | "Credit" | "Treasury"
  reference: string // e.g., "RBI/2023-24/117"
  circularRef: string // Link to RBI circular
  title: string
  description: string
  status: "compliant" | "partial" | "non-compliant" | "not-applicable" | "pending"
  severity: "high" | "medium" | "low"
  lastReviewed: string
  nextReview: string
  assignedTo: string | null
  evidenceCount: number
}

export interface AuditPlan {
  id: string
  name: string
  type: "statutory" | "internal" | "concurrent" | "inspection"
  scope: string
  startDate: string
  endDate: string
  status: "planned" | "in-progress" | "completed" | "on-hold"
  team: AuditTeamMember[]
  branches: string[] // Branch IDs
  coverage: number // Percentage
}

export interface AuditTeamMember {
  id: string
  name: string
  role: "auditor" | "senior-auditor" | "audit-manager"
  email: string
}

export interface Finding {
  id: string
  auditId: string
  category: string
  severity: "critical" | "high" | "medium" | "low"
  title: string
  observation: string
  rootCause: string
  recommendation: string
  status: "draft" | "submitted" | "reviewed" | "responded" | "closed"
  assignedTo: string
  dueDate: string
  createdAt: string
  responseDate: string | null
  response: FindingResponse | null
}

export interface FindingResponse {
  text: string
  submittedBy: string
  submittedAt: string
  actionPlan: ActionPlanItem[]
}

export interface ActionPlanItem {
  id: string
  description: string
  targetDate: string
  assignedTo: string
  status: "pending" | "in-progress" | "completed"
}

export interface ComplianceCalendar {
  id: string
  title: string
  type: "statutory" | "regulatory" | "internal"
  dueDate: string
  frequency: "monthly" | "quarterly" | "half-yearly" | "annual" | "ad-hoc"
  description: string
  status: "upcoming" | "due-soon" | "overdue" | "completed"
}

export interface RBICircular {
  id: string
  reference: string // e.g., "RBI/2023-24/117"
  date: string
  title: string
  category: string
  pdfPath: string
  requirementsExtracted: number
}

export interface CommonObservation {
  id: string
  title: string
  category: string
  description: string
  commonFor: string[] // Bank types/areas
  reference: string // RBI circular reference
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router (`/pages`) | App Router (`/app`) | Next.js 13+ (2023) | App Router is now default; better nesting, layouts, Server Components |
| Webpack bundler | Turbopack bundler | Next.js 15+ (2024) | Turbopack is now default; 10x faster dev server |
| Custom component libraries | shadcn/ui copy-paste | 2023-2024 trend | Full ownership with Radix primitives; no dependency hell |
| Manual responsive CSS | Tailwind utility-first | Industry standard 2024+ | Faster development, consistent design system |
| Runtime JSON parsing | TypeScript type assertions | 2024+ | Catch errors at compile time; better DX |

**Deprecated/outdated:**
- **Pages Router:** Still supported but not recommended for new projects
- **`@next/font`:** Use `next/font` instead (renamed in Next.js 13.2)
- **`next/image` without sizes:** Always provide `sizes` prop for responsive images
- **Custom theme providers for dark mode:** Use `next-themes` (shadcn/ui pattern)

## Open Questions

1. **RBI Circular PDF Storage Location**
   - What we know: CONTEXT.md mentions `/Project Doc/rbi-circulars/` but this directory doesn't exist yet
   - What's unclear: Where are the actual RBI circular PDFs? Do they need to be created/mocked?
   - Recommendation: Create the directory structure and mock the circular index. Actual PDFs can be placeholders or public RBI circulars if available.

2. **i18n Implementation for Language Switcher**
   - What we know: Need EN/HI/MR/GU support with prominent language selector
   - What's unclear: Should we implement full i18n framework (next-intl) in Phase 1, or just visual placeholder?
   - Recommendation: Phase 1 should have visual placeholder only. Full i18n implementation deferred to Phase 2 (per project plan).

3. **Exact shadcn/ui Component List**
   - What we know: Need button, card, input, label, sidebar, dropdown-menu, avatar, select, separator
   - What's unclear: Which additional components needed for notifications, toast messages, empty states?
   - Recommendation: Install base components first. Add others (toast, alert, skeleton, empty-state) as needed during development.

## Sources

### Primary (HIGH confidence)
- [Next.js Installation Guide](https://nextjs.org/docs/app/getting-started/installation) - Official installation docs, December 9, 2025
- [Next.js Pages and Layouts](https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts) - Official routing documentation
- [shadcn/ui Next.js Installation](https://ui.shadcn.com/docs/installation/next) - Official shadcn/ui setup for Next.js
- [shadcn/ui Sidebar Component](https://ui.shadcn.com/docs/components/sidebar) - Official sidebar component documentation
- [shadcn/ui Language Selector Pattern](https://www.shadcn.io/patterns/dropdown-menu-settings-2) - Official language selector dropdown pattern

### Secondary (MEDIUM confidence)
- [How to Set up a Next.js App in 2026](https://medium.com/talex-global/how-to-set-up-a-next-js-app-in-2026-7cf9e17968a7) - Medium article with 2026-specific guidance
- [Common mistakes with the Next.js App Router](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them) - Vercel official blog, January 8, 2024
- [TypeScript with React Best Practices 2026](https://medium.com/@mernstackdevbykevin/typescript-with-react-best-practices-2026-78ce4546210b) - 2026 TypeScript patterns
- [Stop Trusting Your Backend: Type-Safe Fetching with Zod](https://javascript.plainenglish.io/stop-trusting-your-backend-the-ultimate-guide-to-type-safe-fetching-with-zod-react-typescript-8bc83cf8e1f3) - December 17, 2025
- [Enterprise UX Design Guide 2026](https://fuselabcreative.com/enterprise-ux-design-guide-2026-best-practices/) - Enterprise dashboard UX patterns
- [Best UX Practices for Designing a Sidebar](https://uxplanet.org/best-ux-practices-for-designing-a-sidebar-9174ee0ecaa2) - Sidebar width guidelines (240-300px expanded, 48-64px collapsed)
- [15 Mistakes Developers Make With Next.js Routing](https://medium.com/@baheer224/15-mistakes-developers-make-with-next-js-routing-0bb173ef5e82) - Common routing pitfalls

### Tertiary (LOW confidence)
- [Next.js 14 sidebar with hamburger menu](https://stackoverflow.com/questions/77746669/next-js-14-sidebar-with-hamburger-menu) - StackOverflow discussion (marked for validation)
- [Step-by-Step Next.js + Shadcn Setup Tutorial](https://medium.com/zestgeek/how-to-integrate-shadcn-into-next-js-14-a-step-by-step-guide-917bb1946cba) - Third-party tutorial (verify with official docs)
- Urban Cooperative Bank audit format documents - Various ICAI and RBI documents referenced in search (LOW confidence without direct verification)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Next.js and shadcn/ui documentation verified
- Architecture: HIGH - Official App Router patterns documented
- Demo data structure: MEDIUM - Based on TypeScript best practices, banking domain knowledge needs validation
- Pitfalls: HIGH - Vercel official blog and Next.js docs verified
- Sidebar/navigation: HIGH - shadcn/ui official docs and sidebar component verified

**Research date:** February 7, 2026
**Valid until:** March 9, 2026 (30 days - Next.js and shadcn/ui are stable but fast-moving; verify closer to implementation)
