---
phase: 06-observation-lifecycle
plan: 03
status: complete
completed_at: 2026-02-09T01:00:00Z
---

# 06-03 Summary: Observation CRUD Actions + DAL

## What was built

### 1. Zod Validation Schemas (`src/actions/observations/schemas.ts`)

- **CreateObservationSchema**: 5C format (condition, criteria, cause, effect, recommendation) with severity, optional branch/area/assignee/dueDate
- **TransitionObservationSchema**: Generic state transition with optimistic locking via version field, optional auditeeResponse/actionPlan for RESPONSE state
- **ResolveFieldworkSchema**: Fieldwork resolution with minimum 10-char reason and version lock

### 2. Create Observation Action (`src/actions/observations/create.ts`)

- Creates observation in DRAFT state with version=1
- Permission check: `observation:create` (AUDITOR role)
- Atomic transaction: creates observation + initial timeline entry ("created" → "DRAFT")
- Audit context set for tracking
- Returns `{ success, data: { id } }` or `{ success: false, error }`

### 3. State Transition Action (`src/actions/observations/transition.ts`)

- Single generic action handles all 8 transitions (6 forward + 2 return)
- Uses `canTransition()` from state-machine.ts for role/severity validation
- Optimistic locking: rejects if version doesn't match
- Atomic transaction: updates status + statusUpdatedAt + creates timeline entry
- Special handling for RESPONSE state: updates auditeeResponse and actionPlan fields
- Atomic version increment via Prisma `{ increment: 1 }`

### 4. Resolve Fieldwork Action (`src/actions/observations/resolve-fieldwork.ts`)

- Marks pre-issued observations (DRAFT/SUBMITTED only) as resolved during fieldwork
- Sets `resolvedDuringFieldwork=true` + stores resolution reason
- AUDITOR or AUDIT_MANAGER can resolve (permission-based)
- Optimistic locking prevents concurrent modifications

### 5. Observations DAL (`src/data-access/observations.ts`)

- **getObservations**: Paginated list with severity/status/branch/area filters, includes relations
- **getObservationById**: Full detail with timeline (ASC), evidence, branch, area, assignedTo, createdBy
- **getObservationSummary**: groupBy counts for severity and status
- All functions accept session object, use prismaForTenant, add explicit WHERE tenantId

## Schema changes

- Added to Observation model: `version` (Int, default 1), `resolvedDuringFieldwork` (Boolean), `resolutionReason` (Text?), `auditeeResponse` (Text?), `actionPlan` (Text?), `riskCategory` (String?)
- Migration: `prisma/migrations/20260209060000_add_observation_lifecycle_fields/migration.sql`

## Patterns followed

- All server actions use `"use server"` directive
- No throw statements — errors returned as `{ success: false, error }`
- Zod `safeParse()` for all input validation
- `getRequiredSession()` for auth, `prismaForTenant()` for RLS
- Belt-and-suspenders: explicit WHERE tenantId in all queries
- Audit context set via `setAuditContext()` in all mutations
- `revalidatePath()` after all mutations

## Verification

- `pnpm build` succeeds with zero errors
- All 3 server action files have `"use server"` directive
- Zero `throw` statements in action files
- `transition.ts` imports `canTransition` from state-machine.ts
- `observations.ts` uses `import "server-only"`
- All DAL functions accept session object (not raw tenantId)
- Optimistic locking uses `version` field with `{ increment: 1 }`
- Every mutation creates a timeline entry
