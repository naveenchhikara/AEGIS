---
phase: gap-closure-a
plan: A10
type: execute
wave: 2
depends_on: []
files_modified:
  - src/actions/compliance/run-escalation-job.ts
  - src/lib/escalation-engine.ts
  - src/lib/escalation-router.ts
  - src/data-access/compliance-items.ts
  - src/app/api/cron/escalation/route.ts
autonomous: true
gap_closure: true
must_haves:
  truths:
    - "Escalation job runs on schedule (cron-triggered API route)"
    - "L1 (+15d): Email notification sent to Branch + IAD"
    - "L2 (+30d): ZAC notification created for zone auditor"
    - "L3 (+90d): ACE officer notified for quarterly processing"
    - "L4 (+180d): ACB member notified for board reporting"
    - "Each escalation level routes to the correct recipients"
    - "Notifications are created in NotificationQueue with appropriate types"
  artifacts:
    - path: "src/lib/escalation-router.ts"
      provides: "Level-specific notification routing logic"
      exports: ["routeEscalationNotification"]
      min_lines: 50
    - path: "src/actions/compliance/run-escalation-job.ts"
      provides: "Server action that runs the full escalation pipeline"
      exports: ["runEscalationJob"]
    - path: "src/app/api/cron/escalation/route.ts"
      provides: "Cron-triggered API route for scheduled escalation"
      contains: "runEscalationJob"
  key_links:
    - from: "src/app/api/cron/escalation/route.ts"
      to: "src/actions/compliance/run-escalation-job.ts"
      via: "API route calls escalation job action"
      pattern: "runEscalationJob"
    - from: "src/actions/compliance/run-escalation-job.ts"
      to: "src/lib/escalation-router.ts"
      via: "Routes notifications per escalation level"
      pattern: "routeEscalationNotification"
    - from: "src/lib/escalation-router.ts"
      to: "src/data-access/notifications.ts"
      via: "Creates NotificationQueue entries"
      pattern: "createNotification"
---

## Objective

Implement R39: Escalation automation with level-specific notification routing. The escalation engine (`src/lib/escalation-engine.ts`) already computes levels, and the compute-escalation action updates ComplianceItem records. What's missing is: (1) automated scheduling via cron, and (2) level-specific notification routing that creates appropriate notifications per escalation level.

**Purpose:** Automate compliance monitoring so overdue items are automatically escalated to the appropriate authority level — ensuring nothing falls through the cracks per SDD p.40 escalation policy.

**Output:**

- Escalation routing module that maps levels to recipients/notification types
- Enhanced escalation job that computes + routes in one pass
- Cron-triggered API route for daily automated execution
- Notifications created in NotificationQueue per level

## Execution Context

@/root/.openclaw/workspace/.claude/agents/gsd-planner.md
@/root/.openclaw/workspace/.claude/workflows/execute-plan.md

## Context

@AEGIS/.planning/REQUIREMENTS.md — R39 specification
@AEGIS/.planning/VALIDATION-REPORT.md — Escalation automation gap
@AEGIS/.planning/codebase/CONVENTIONS.md — Server action patterns
@AEGIS/prisma/schema.prisma — ComplianceItem, NotificationQueue, NotificationType enum
@AEGIS/src/lib/escalation-engine.ts — Existing pure computation functions
@AEGIS/src/actions/compliance/compute-escalation.ts — Existing escalation computation action
@AEGIS/src/data-access/notifications.ts — Existing notification DAL (createNotification)
@AEGIS/src/data-access/compliance-items.ts — Existing compliance queries

## Tasks

<task type="auto">
  <name>Task 1: Escalation router — Level-specific notification routing</name>
  <files>src/lib/escalation-router.ts</files>
  <action>
  Create `src/lib/escalation-router.ts`:

This is a pure logic module (no DB access) that determines notification routing per escalation level:

```typescript
import { NotificationType } from "@/generated/prisma/enums";

export type EscalationLevel = 0 | 1 | 2 | 3 | 4;

export interface EscalationRoute {
  level: EscalationLevel;
  notificationType: NotificationType;
  recipientRoles: string[];
  recipientDescription: string;
  urgency: "normal" | "high" | "critical";
  subject: string;
  messageTemplate: string;
}

/**
 * Map escalation level to notification routing configuration.
 *
 * L0: No notification (within SLA)
 * L1 (+15d): DEADLINE_REMINDER email to Branch Head + IAD
 * L2 (+30d): OVERDUE_ESCALATION to Zonal Auditor
 * L3 (+90d): OVERDUE_ESCALATION to ACE Officer
 * L4 (+180d): OVERDUE_ESCALATION to ACB Member + CAE
 */
export function getEscalationRoute(
  level: EscalationLevel,
  itemContext: {
    observationTitle: string;
    branchName: string;
    daysOverdue: number;
  },
): EscalationRoute | null {
  switch (level) {
    case 0:
      return null; // No escalation needed

    case 1:
      return {
        level: 1,
        notificationType: "DEADLINE_REMINDER_7D", // Closest existing type
        recipientRoles: ["BRANCH_HEAD", "AUDITOR", "AUDIT_MANAGER"],
        recipientDescription: "Branch Head + Internal Audit Department",
        urgency: "normal",
        subject: `Compliance overdue: ${itemContext.observationTitle}`,
        messageTemplate: `Compliance item for "${itemContext.observationTitle}" at ${itemContext.branchName} is ${itemContext.daysOverdue} days overdue. Please submit branch response.`,
      };

    case 2:
      return {
        level: 2,
        notificationType: "OVERDUE_ESCALATION",
        recipientRoles: ["ZONAL_AUDITOR"],
        recipientDescription: "Zonal Auditor (ZAC)",
        urgency: "high",
        subject: `ZAC Escalation: ${itemContext.observationTitle} — ${itemContext.daysOverdue}d overdue`,
        messageTemplate: `Compliance item at ${itemContext.branchName} has been overdue for ${itemContext.daysOverdue} days. ZAC review required.`,
      };

    case 3:
      return {
        level: 3,
        notificationType: "OVERDUE_ESCALATION",
        recipientRoles: ["ACE_OFFICER"],
        recipientDescription: "ACE Officer",
        urgency: "high",
        subject: `ACE Escalation: ${itemContext.observationTitle} — ${itemContext.daysOverdue}d overdue`,
        messageTemplate: `Compliance item at ${itemContext.branchName} has been overdue for ${itemContext.daysOverdue} days. Requires ACE quarterly processing.`,
      };

    case 4:
      return {
        level: 4,
        notificationType: "OVERDUE_ESCALATION",
        recipientRoles: ["CAE", "ACB_MEMBER"],
        recipientDescription: "CAE + ACB Members",
        urgency: "critical",
        subject: `ACB Escalation: ${itemContext.observationTitle} — ${itemContext.daysOverdue}d overdue`,
        messageTemplate: `Critical compliance item at ${itemContext.branchName} has been overdue for ${itemContext.daysOverdue} days. Requires ACB board reporting.`,
      };
  }
}

/**
 * Determine if a notification should be sent for this escalation update.
 * Only notify when level increases (not every computation cycle).
 */
export function shouldNotify(
  previousLevel: EscalationLevel,
  newLevel: EscalationLevel,
): boolean {
  return newLevel > previousLevel;
}
```

  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/lib/escalation-router.ts 2>&1 | head -20
  ```
  </verify>
  <done>
  - `getEscalationRoute` maps all 5 levels (0-4)
  - Each level specifies notification type, recipient roles, urgency, and message
  - `shouldNotify` prevents duplicate notifications
  - Pure logic module (no side effects)
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 2: DAL — Recipient resolution for escalation</name>
  <files>src/data-access/compliance-items.ts</files>
  <action>
  Add to existing `src/data-access/compliance-items.ts`:

**`getEscalationRecipients(session, roles: string[], branchId?: string)`:**

- Query Users who have any of the specified roles AND belong to the same tenant
- For BRANCH_HEAD role, also filter by branchId (via UserBranchAssignment)
- For ZONAL_AUDITOR, match via branch → zone (future — for now, any ZONAL_AUDITOR in tenant)
- Return `{ id: string; email: string; name: string }[]`

```typescript
export async function getEscalationRecipients(
  session: Session,
  roles: string[],
  branchId?: string,
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  // For BRANCH_HEAD, scope to branch-assigned users
  if (roles.includes("BRANCH_HEAD") && branchId) {
    const branchUsers = await db.user.findMany({
      where: {
        tenantId,
        roles: { hasSome: roles as any },
        branchAssignments: { some: { branchId } },
      },
      select: { id: true, email: true, name: true },
    });

    // Also get non-branch-specific role holders
    const otherRoles = roles.filter((r) => r !== "BRANCH_HEAD");
    const otherUsers =
      otherRoles.length > 0
        ? await db.user.findMany({
            where: { tenantId, roles: { hasSome: otherRoles as any } },
            select: { id: true, email: true, name: true },
          })
        : [];

    // Deduplicate
    const map = new Map<string, { id: string; email: string; name: string }>();
    [...branchUsers, ...otherUsers].forEach((u) => map.set(u.id, u));
    return Array.from(map.values());
  }

  return db.user.findMany({
    where: { tenantId, roles: { hasSome: roles as any } },
    select: { id: true, email: true, name: true },
  });
}
```

**`getOpenComplianceItemsWithContext(session)`:**

- Enhanced version of existing `getOpenComplianceItemsForEscalation` that includes observation title, branch info
- For the escalation router to build context messages
  </action>
  <verify>

```bash
cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/data-access/compliance-items.ts 2>&1 | head -20
```

  </verify>
  <done>
  - `getEscalationRecipients` resolves users by role + optional branch scope
  - BRANCH_HEAD scoped to branch assignment
  - Deduplication for users with multiple matching roles
  - `getOpenComplianceItemsWithContext` includes observation/branch context
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 3: Server action — Enhanced escalation job</name>
  <files>src/actions/compliance/run-escalation-job.ts</files>
  <action>
  Create `src/actions/compliance/run-escalation-job.ts`:

This is the full escalation pipeline that:

1. Computes escalation levels (reuses existing logic)
2. Routes notifications per level
3. Creates NotificationQueue entries

```typescript
"use server";

import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { getRequiredSession } from "@/data-access/session";
import { hasPermission, type Role } from "@/lib/permissions";
import { computeBatchEscalation } from "@/lib/escalation-engine";
import {
  getEscalationRoute,
  shouldNotify,
  type EscalationLevel,
} from "@/lib/escalation-router";
import {
  getOpenComplianceItemsWithContext,
  getEscalationRecipients,
} from "@/data-access/compliance-items";
import { createNotification } from "@/data-access/notifications";
import { logger } from "@/lib/logger";
```

**`runEscalationJob()`:**

1. Auth (must be called by admin/cron user)
2. Fetch all open compliance items with context
3. Compute batch escalation (from existing engine)
4. For each item where level increased:
   a. Get escalation route via `getEscalationRoute(newLevel, itemContext)`
   b. If route is not null:
   - Resolve recipients via `getEscalationRecipients(session, route.recipientRoles, item.branchId)`
   - Create NotificationQueue entries for each recipient:
     `typescript
for (const recipient of recipients) {
  await tx.notificationQueue.create({
    data: {
      tenantId,
      recipientId: recipient.id,
      type: route.notificationType,
      payload: {
        subject: route.subject,
        message: route.messageTemplate,
        complianceItemId: item.id,
        escalationLevel: route.level,
        branchName: item.branchName,
        observationTitle: item.observationTitle,
      },
    },
  });
}
`
     c. Update ComplianceItem with new escalation level and daysOpen
5. Log summary: `{ processed, escalated, notificationsSent }`
6. Return `{ success: true, data: { processed, escalated, notificationsSent } }`

**Important:** This action must handle the case where it's called by a cron endpoint (no user session). Two approaches:

- Option A: Use a service account / system session for cron calls
- Option B: Accept an API key in the cron route and bypass session requirement

Choose **Option B** for the cron route, but keep session-based auth for manual trigger.

Create a variant `runEscalationJobInternal(tenantId: string)` for cron use that takes tenantId directly.
</action>
<verify>

```bash
cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/actions/compliance/run-escalation-job.ts 2>&1 | head -20
```

  </verify>
  <done>
  - `runEscalationJob` runs the full compute + route + notify pipeline
  - `runEscalationJobInternal` variant for cron (no session requirement)
  - Each escalation level creates appropriate NotificationQueue entries
  - Recipients resolved per level and role
  - Summary logged with counts
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 4: API route — Cron trigger</name>
  <files>src/app/api/cron/escalation/route.ts</files>
  <action>
  Create `src/app/api/cron/escalation/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * Daily cron endpoint for compliance escalation.
 * Protected by CRON_SECRET environment variable.
 *
 * Usage:
 *   curl -X POST https://app.example.com/api/cron/escalation \
 *     -H "Authorization: Bearer $CRON_SECRET"
 *
 * Can be triggered by:
 * - Vercel Cron (configured in vercel.json)
 * - External cron service (e.g., cron-job.org)
 * - Manual curl from admin
 */
export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Import dynamically to avoid issues with server-only modules
    const { runEscalationJobInternal } =
      await import("@/actions/compliance/run-escalation-job");

    // Run for all tenants (or specific tenant if provided in body)
    const body = await request.json().catch(() => ({}));
    const tenantId = body.tenantId;

    if (tenantId) {
      // Single tenant
      const result = await runEscalationJobInternal(tenantId);
      return NextResponse.json(result);
    }

    // All tenants: fetch tenant list and run for each
    const { prisma } = await import("@/lib/prisma");
    const tenants = await prisma.tenant.findMany({
      select: { id: true, shortName: true },
    });

    const results = [];
    for (const tenant of tenants) {
      try {
        const result = await runEscalationJobInternal(tenant.id);
        results.push({
          tenantId: tenant.id,
          name: tenant.shortName,
          ...result,
        });
      } catch (error) {
        logger.error(
          { error, tenantId: tenant.id },
          "Escalation job failed for tenant",
        );
        results.push({
          tenantId: tenant.id,
          name: tenant.shortName,
          success: false,
          error: "Failed",
        });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    logger.error({ error }, "Escalation cron job failed");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

Also add to `vercel.json` (or equivalent) if deployed on Vercel:

```json
{
  "crons": [
    {
      "path": "/api/cron/escalation",
      "schedule": "0 6 * * *"
    }
  ]
}
```

  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/app/api/cron/escalation/route.ts 2>&1 | head -20
  ```
  </verify>
  <done>
  - Cron route at /api/cron/escalation
  - Protected by CRON_SECRET bearer token
  - Supports single-tenant or all-tenant runs
  - Error handling per tenant (one failure doesn't stop others)
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 5: Update escalation engine with enhanced batch output</name>
  <files>src/lib/escalation-engine.ts</files>
  <action>
  The existing `computeBatchEscalation` function returns updates with `{ id, newEscalationLevel, daysOpen, daysOverdue }`. Verify this is sufficient for the router. If not, extend the return type to include `previousLevel` for the `shouldNotify` check.

Add or update the `EscalationUpdate` type:

```typescript
export interface EscalationUpdate {
  id: string;
  previousLevel: EscalationLevel;
  newEscalationLevel: EscalationLevel;
  daysOpen: number;
  daysOverdue: number;
  shouldNotify: boolean;
}
```

Ensure `computeBatchEscalation` includes `previousLevel` and `shouldNotify` in each update object, so the job doesn't need to recompute this.
</action>
<verify>

```bash
cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/lib/escalation-engine.ts 2>&1 | head -20
```

  </verify>
  <done>
  - EscalationUpdate type includes previousLevel and shouldNotify
  - computeBatchEscalation returns enriched updates
  - Backward compatible (existing callers still work)
  - TypeScript compiles
  </done>
</task>

## Verification

```bash
# 1. TypeScript compilation
cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit

# 2. Verify escalation router
grep "getEscalationRoute" src/lib/escalation-router.ts && echo "PASS" || echo "FAIL"

# 3. Verify level-specific routing
grep -c "case [0-4]:" src/lib/escalation-router.ts
# Expected: 5 (levels 0-4)

# 4. Verify job action
grep "runEscalationJob" src/actions/compliance/run-escalation-job.ts && echo "PASS" || echo "FAIL"

# 5. Verify cron route
test -f src/app/api/cron/escalation/route.ts && echo "PASS" || echo "FAIL"

# 6. Verify notification creation
grep "notificationQueue\|createNotification" src/actions/compliance/run-escalation-job.ts && echo "PASS" || echo "FAIL"
```

## Success Criteria

1. **R39 gap closed:** Escalation automation fully implemented with level-specific routing
2. **L1 routing:** Email to Branch Head + IAD at +15 days
3. **L2 routing:** Notification to Zonal Auditor at +30 days
4. **L3 routing:** Notification to ACE Officer at +90 days
5. **L4 routing:** Notification to CAE + ACB Members at +180 days
6. **Cron automation:** API route callable by daily cron job
7. **Notification records:** NotificationQueue entries created per recipient per level
8. **Deduplication:** Only notifies when level increases (not on every run)
9. **Multi-tenant:** Cron runs across all tenants
10. **TypeScript:** All files compile
11. **Conventions:** Pure logic in lib, side effects in actions, API route for external triggers
