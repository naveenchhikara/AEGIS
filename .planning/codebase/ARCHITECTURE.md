# AEGIS Architecture

## App Router Structure

### Route Groups

AEGIS uses Next.js 16 App Router with **route groups** for layout segmentation:

```
src/app/
├── (auth)/                    # Auth layout (centered, no sidebar)
│   └── login/
│       └── page.tsx
├── (dashboard)/              # Dashboard layout (sidebar + topbar)
│   ├── layout.tsx            # Two-layer auth: cookie check + session validation
│   ├── dashboard/
│   │   └── page.tsx
│   ├── findings/
│   │   ├── page.tsx
│   │   ├── new/
│   │   │   └── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   ├── compliance/
│   ├── audit-plans/
│   ├── reports/
│   ├── audit-trail/
│   ├── auditee/
│   │   ├── layout.tsx       # Nested layout for auditee view
│   │   └── [observationId]/
│   ├── admin/
│   │   └── users/
│   └── settings/
│       ├── notifications/
│       └── compliance/
├── (onboarding)/             # Onboarding layout (multi-step wizard)
│   └── onboarding/
│       ├── layout.tsx
│       └── page.tsx
├── accept-invite/            # Public invite acceptance (no layout)
│   └── page.tsx
└── api/                      # API routes (not in route group)
    ├── auth/
    │   └── [...all]/         # Better Auth catch-all
    │       └── route.ts
    ├── exports/              # Excel export endpoints
    │   ├── findings/
    │   ├── compliance/
    │   └── audit-plans/
    ├── reports/              # PDF report generation
    │   └── board-report/
    ├── dashboard/            # Dashboard data endpoint
    └── health/               # Health check
```

### Layout Hierarchy

**3 distinct layouts:**

1. **`(auth)/` - Auth Layout**
   - Centered single-panel design
   - No sidebar, no topbar
   - Used for: login, accept-invite

2. **`(dashboard)/` - Dashboard Layout**
   - Sidebar (role-filtered navigation) + Topbar
   - Session validation BEFORE render (zero content flash)
   - QueryProvider wrapper for TanStack Query
   - Suspense boundaries with loading skeletons
   - Used for: dashboard, findings, compliance, admin, etc.

3. **`(onboarding)/` - Onboarding Layout**
   - Multi-step wizard with progress indicator
   - No sidebar, simplified topbar
   - Used for: bank onboarding flow

**Nested layouts:**

- `(dashboard)/auditee/layout.tsx` - Additional layout for auditee-specific pages

---

## Server Actions Pattern

### Directory Structure

```
src/actions/
├── observations/
│   ├── create.ts             # createObservation()
│   ├── schemas.ts            # Zod schemas
│   ├── transition.ts         # transitionObservation()
│   └── resolve-fieldwork.ts
├── repeat-findings/
│   ├── detect.ts
│   ├── confirm.ts
│   └── schemas.ts
├── users.ts                  # User management actions
├── settings.ts               # Tenant settings actions
├── compliance-management.ts
├── notification-preferences.ts
├── onboarding.ts
└── onboarding-excel-upload.ts
```

### Server Action File Structure

**Every server action file follows this pattern:**

```typescript
"use server"; // MUST be first line in file

import { revalidatePath } from "next/cache";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import { ActionSchema } from "./schemas"; // Co-located Zod schema
import type { ActionInput } from "./schemas";

/**
 * JSDoc: Action purpose, security notes, atomic steps
 */
export async function myAction(input: ActionInput) {
  // Step 1: Auth
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  // Step 2: Permission check
  if (!hasPermission(userRoles, "resource:action")) {
    return {
      success: false as const,
      error: "You do not have permission...",
    };
  }

  // Step 3: Validate input
  const parsed = ActionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }
  const validated = parsed.data;

  // Step 4: Tenant-scoped Prisma
  const db = prismaForTenant(tenantId);

  try {
    const result = await db.$transaction(async (tx) => {
      // Set audit context (for AuditLog trigger)
      await setAuditContext(tx, {
        actionType: "resource.action",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      // Perform database operations
      const record = await tx.model.create({ ... });

      return record;
    });

    // Revalidate affected paths
    revalidatePath("/resource");

    return {
      success: true as const,
      data: { id: result.id },
    };
  } catch (error) {
    logger.error({ error, action: "my_action", tenantId }, "Action failed");
    return {
      success: false as const,
      error: "Failed to perform action. Please try again.",
    };
  }
}
```

**Key conventions:**

- `"use server"` at top of file (not inline)
- Return `{ success: boolean, data?, error? }` discriminated union
- NEVER throw errors - always return error object
- Always call `getRequiredSession()` first
- Always validate with Zod
- Always use `prismaForTenant(tenantId)` from session
- Always wrap mutations in `$transaction` with `setAuditContext`
- Always call `revalidatePath()` for cache invalidation
- Always log errors with `logger.error()`

---

## Data Access Layer (DAL)

### Directory Structure

```
src/data-access/
├── README.md                 # DAL philosophy and conventions
├── index.ts                  # Public DAL exports
├── session.ts                # Session helpers (getRequiredSession, etc.)
├── prisma.ts                 # prismaForTenant() RLS extension
├── audit-context.ts          # setAuditContext() for AuditLog
├── observations.ts           # Observation queries
├── dashboard.ts              # Dashboard widget data fetchers
├── compliance-management.ts
├── auditee.ts
├── audit-trail.ts
├── exports.ts
├── reports.ts
├── notifications.ts
├── onboarding.ts
├── settings.ts
└── users.ts
```

### DAL Function Pattern

**Every DAL function:**

1. Accepts `session` object (NOT raw tenantId string)
2. Uses `prismaForTenant(session.user.tenantId)`
3. Adds explicit `WHERE tenantId` clauses (belt-and-suspenders)
4. Returns plain objects (not Prisma models with methods)
5. Handles errors gracefully (returns null or throws domain error)

```typescript
import "server-only"; // Mark as server-only
import { prismaForTenant } from "./prisma";
import type { Session } from "@/lib/auth";

export async function getObservation(session: Session, observationId: string) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  // Belt-and-suspenders: explicit WHERE tenantId clause
  const observation = await db.observation.findFirst({
    where: {
      id: observationId,
      tenantId, // ALWAYS include tenantId
    },
    include: {
      branch: true,
      auditArea: true,
      assignedTo: true,
    },
  });

  return observation;
}
```

---

## Lib Directory Structure

```
src/lib/
├── auth.ts                   # Better Auth server config
├── auth-client.ts            # Better Auth client (createAuthClient)
├── auth-lockout-plugin.ts    # Custom Better Auth plugin for account lockout
├── prisma.ts                 # Prisma client singleton
├── permissions.ts            # RBAC permission system
├── guards.ts                 # Declarative route/action guards (requirePermission, etc.)
├── logger.ts                 # Pino structured logger
├── constants.ts              # App-wide constants (RISK_CATEGORIES, etc.)
├── utils.ts                  # cn() helper (tailwind-merge + clsx)
├── s3.ts                     # AWS S3 helpers (upload, download, presigned URLs)
├── ses-client.ts             # AWS SES email client
├── notification-service.ts   # Notification queue interface
├── job-queue.ts              # pg-boss job queue setup
├── csrf.ts                   # CSRF token generation (for forms)
├── dashboard-config.ts       # Role-to-dashboard-widget mapping
├── nav-items.ts              # Sidebar navigation structure (role-filtered)
├── fiscal-year.ts            # Indian FY quarter helpers (Q1=Apr-Jun, etc.)
├── state-machine.ts          # Observation status transition logic
├── report-utils.ts           # Board report PDF generation helpers
├── excel-export.ts           # ExcelJS export utilities
├── onboarding-validation.ts  # Onboarding step validation
├── excel-parsers/            # Excel import parsers (branch, audit area, etc.)
│   ├── branch-parser.ts
│   └── ...
├── excel-templates/          # Excel export templates
│   ├── findings-template.ts
│   └── ...
├── validations/              # Reusable Zod schemas
│   └── ...
└── __tests__/                # Lib unit tests
```

### Key Lib Files

**`prisma.ts`** - Prisma client singleton with error handling:

```typescript
import { PrismaClient } from "@/generated/prisma";

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}
```

**`permissions.ts`** - Multi-role permission system:

- `hasPermission(roles: Role[], permission: Permission): boolean`
- `getPermissions(roles: Role[]): Permission[]`
- `canApproveObservation(userId, observation): boolean` (maker-checker)

**`guards.ts`** - Declarative guards:

- `requirePermission(permission: Permission)` - Redirects if unauthorized
- `requireAnyPermission(permissions: Permission[])` - OR check
- `requireAllPermissions(permissions: Permission[])` - AND check

---

## Component Organization

```
src/components/
├── ui/                       # shadcn/ui primitives (Radix + Tailwind)
│   ├── button.tsx
│   ├── input.tsx
│   ├── dialog.tsx
│   ├── sidebar.tsx          # Sidebar primitive (shadcn/ui)
│   └── ...
├── layout/                   # Layout components
│   ├── app-sidebar.tsx      # Main sidebar with role-filtered nav
│   ├── top-bar.tsx          # Topbar with breadcrumbs, user menu
│   └── ...
├── auth/                     # Auth-related components
│   ├── login-form.tsx
│   ├── session-warning-wrapper.tsx
│   └── ...
├── dashboard/                # Dashboard widgets (client components)
│   ├── dashboard-composer.tsx
│   ├── observation-summary-card.tsx
│   ├── compliance-tracker-widget.tsx
│   └── ...
├── findings/                 # Findings/observation components
│   ├── observation-form.tsx
│   ├── findings-table.tsx
│   ├── observation-actions.tsx
│   ├── repeat-finding-banner.tsx
│   └── ...
├── compliance/               # Compliance management
│   ├── compliance-table.tsx
│   └── ...
├── audit/                    # Audit plan components
│   └── ...
├── audit-trail/              # Audit trail components
│   └── audit-trail-table.tsx
├── auditee/                  # Auditee-specific components
│   └── ...
├── reports/                  # Report generation UI
│   └── ...
├── pdf-report/               # PDF report components (@react-pdf/renderer)
│   ├── board-report-document.tsx
│   └── ...
├── settings/                 # Settings forms
│   ├── bank-profile-form.tsx
│   ├── notification-preferences-form.tsx
│   └── ...
└── admin/                    # Admin components
    ├── user-list.tsx
    └── role-assignment-form.tsx
```

### Component Patterns

**Server Component (default):**

```tsx
// No "use client" directive
// Can directly fetch data, access session
import { getRequiredSession } from "@/data-access/session";
import { getDashboardData } from "@/data-access/dashboard";

export default async function DashboardPage() {
  const session = await getRequiredSession();
  const data = await getDashboardData(session);

  return <div>{/* Render data */}</div>;
}
```

**Client Component (interactive):**

```tsx
"use client"; // MUST be first line

import { useState } from "react";
import { useActionState } from "react";
import { createObservation } from "@/actions/observations/create";

export function ObservationForm() {
  const [state, formAction, isPending] = useActionState(submitAction, {});

  return (
    <form action={formAction}>
      {/* Form fields */}
      <button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create"}
      </button>
    </form>
  );
}
```

---

## Data Flow

### Request Flow (Page → Action → Prisma → Response)

**1. User navigates to `/findings/new`**

```
GET /findings/new
  ↓
src/app/(dashboard)/findings/new/page.tsx (Server Component)
  ↓ await getRequiredSession()
  ↓ await getBranches(session)
  ↓ await getAuditAreas(session)
  ↓
Renders <ObservationForm branches={...} auditAreas={...} />
  ↓
Browser: Client component hydrates
```

**2. User submits form**

```
POST (Server Action)
  ↓
src/components/findings/observation-form.tsx (Client Component)
  ↓ useActionState → formAction
  ↓
src/actions/observations/create.ts (Server Action)
  ↓ getRequiredSession()
  ↓ hasPermission(roles, "observation:create")
  ↓ Zod validation
  ↓ prismaForTenant(tenantId)
  ↓ $transaction: create observation + timeline
  ↓ revalidatePath("/findings")
  ↓ return { success: true, data: { id } }
  ↓
ObservationForm: useEffect on state.success
  ↓ toast.success()
  ↓ router.push(`/findings/${id}`)
```

**3. User views observation detail**

```
GET /findings/[id]
  ↓
src/app/(dashboard)/findings/[id]/page.tsx (Server Component)
  ↓ await getRequiredSession()
  ↓ await getObservationById(session, params.id)
  ↓
Renders observation detail page
```

---

## Multi-Tenancy: How tenantId Flows

### Critical Security Invariant

**tenantId MUST come from session ONLY. NEVER from URL params, query strings, or request body.**

### Flow Diagram

```
User logs in
  ↓
Better Auth creates Session
  ↓ session.user.tenantId = "uuid"
  ↓
Middleware: Cookie check (optimistic)
  ↓
Layout: getRequiredSession() (authoritative)
  ↓ Validates session token
  ↓ Returns session with user.tenantId
  ↓
Server Action: getRequiredSession()
  ↓ Extracts tenantId from session.user
  ↓
DAL Function: prismaForTenant(tenantId)
  ↓ Wraps query in transaction with SET LOCAL 'app.current_tenant_id'
  ↓
Prisma Query: WHERE tenantId = ... (explicit, belt-and-suspenders)
  ↓
PostgreSQL RLS: Filters rows by app.current_tenant_id parameter
  ↓
Result: Only tenant's data returned
```

### Code Example

```typescript
// ❌ WRONG: tenantId from URL
export async function updateTenant(tenantId: string, data: any) {
  const db = prismaForTenant(tenantId); // ATTACKER CAN PASS ANY tenantId!
}

// ✅ CORRECT: tenantId from session
export async function updateTenant(data: UpdateTenantInput) {
  const session = await getRequiredSession();
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId); // Safe: from authenticated session

  return db.tenant.update({
    where: { id: tenantId }, // Belt-and-suspenders
    data,
  });
}
```

---

## File Structure: Where to Put New Code

### New Feature Checklist

**1. Database Model**

- Add model to `prisma/schema.prisma`
- Run `pnpm db:generate` → generates Prisma Client
- Run `pnpm db:push` or `pnpm db:migrate` → updates database

**2. Server Actions**

- Create `src/actions/{feature}/` directory
- Add `schemas.ts` for Zod validation
- Add action files: `create.ts`, `update.ts`, etc.
- Follow server action pattern (see above)

**3. Data Access Layer**

- Create `src/data-access/{feature}.ts`
- Export query functions (accept `session` param)
- Use `prismaForTenant()` and explicit `WHERE tenantId`

**4. UI Components**

- Add to `src/components/{feature}/`
- Use `"use client"` only if interactive
- Import from `@/components/ui/` for primitives

**5. Page Route**

- Add to `src/app/(dashboard)/{feature}/`
- Create `page.tsx` (server component)
- Fetch data directly in page component
- Pass to client components as props

**6. API Route (if needed)**

- Add to `src/app/api/{feature}/`
- Create `route.ts` with HTTP handlers
- Use for: file downloads, webhooks, external integrations

**7. Types**

- Add to `src/types/index.ts` or `src/types/{feature}.ts`
- Use `interface` for object shapes, `type` for unions/intersections

**8. Constants**

- Add to `src/lib/constants.ts`
- Export as named const arrays/objects

**9. Permissions**

- Add permission to `Permission` type in `src/lib/permissions.ts`
- Map permission to roles in `ROLE_PERMISSIONS`

**10. Navigation**

- Add route to `src/lib/nav-items.ts`
- Assign permission for role filtering

---

## Deployment Architecture

### Docker Compose Structure

```yaml
# docker-compose.prod.yml
services:
  postgres:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER
      - POSTGRES_PASSWORD
      - POSTGRES_DB

  app:
    build:
      context: .
      dockerfile: Dockerfile
    depends_on:
      - postgres
    environment:
      - DATABASE_URL
      - BETTER_AUTH_SECRET
      - AWS_ACCESS_KEY_ID
      - AWS_SECRET_ACCESS_KEY
      - S3_BUCKET_NAME
      - SES_FROM_EMAIL
    ports:
      - "3000:3000"
```

### Dockerfile (Multi-stage Build)

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
CMD ["node", "server.js"]
```

---

## Key Architectural Decisions

### 1. Server Components by Default

- All pages are server components unless interactive
- Reduces client bundle size
- Direct database access in components
- Zero loading states for initial render

### 2. Server Actions for Mutations

- No API routes for CRUD operations
- Server actions live in `src/actions/`
- Progressive enhancement (forms work without JS)
- Type-safe end-to-end (input → validation → response)

### 3. Data Access Layer Separation

- DAL functions in `src/data-access/`
- Never call Prisma directly from actions/pages
- Testable, reusable query logic
- Security: tenantId from session only

### 4. Multi-Tenant Row-Level Security

- `prismaForTenant()` extension wraps all queries
- Transaction-scoped `app.current_tenant_id` parameter
- PostgreSQL RLS policies filter rows automatically
- Belt-and-suspenders: explicit WHERE clauses in DAL

### 5. Optimistic Locking for Concurrency

- `version` field on mutable models (e.g., Observation)
- Check-and-increment pattern in transactions
- Prevents race conditions on status transitions

### 6. Audit Logging on All Mutations

- `setAuditContext()` called in every transaction
- PostgreSQL trigger populates `AuditLog` table
- Immutable append-only log (10-year retention)

### 7. Role-Based Access Control (RBAC)

- Multi-role support (users have `roles Role[]`)
- Permission checks use `hasPermission(roles, permission)`
- Guards for declarative route protection
- Maker-checker enforcement (creator ≠ approver)

### 8. Type Safety End-to-End

- Zod for runtime validation (env vars, server actions, forms)
- TypeScript for compile-time type checking
- Prisma for database type generation
- No `any` types except session user casting (Better Auth limitation)
