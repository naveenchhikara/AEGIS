---
phase: 2
plan: 6
type: standard
wave: 3
depends_on: [5]
files_modified:
  - src/lib/escalation-engine.ts
  - src/actions/compliance/compute-escalation.ts
  - src/data-access/compliance.ts
autonomous: true
must_haves:
  truths:
    - "Escalation engine computes daysOpen from dueDate to current date"
    - "Escalation levels trigger at correct thresholds: L1=+15d, L2=+30d, L3=+90d, L4=+180d"
    - "computeEscalation() is a pure function (no DB access)"
    - "Cron job (or manual trigger) runs escalation computation for all open items"
    - "ComplianceItem.escalationLevel updated correctly (0-4)"
  artifacts:
    - path: "src/lib/escalation-engine.ts"
      provides: "Pure escalation computation function"
      exports: ["computeEscalation", "EscalationLevel"]
    - path: "src/actions/compliance/compute-escalation.ts"
      provides: "Server action to run escalation for all open compliance items"
    - path: "src/data-access/compliance.ts"
      provides: "Updated DAL with getOverdueComplianceItems query"
  key_links:
    - from: "computeEscalation"
      to: "ComplianceItem.daysOpen"
      via: "Calculates days between dueDate and now"
    - from: "compute-escalation action"
      to: "ComplianceItem.escalationLevel"
      via: "Updates escalation level for overdue items"
---

## Objective

Build the compliance escalation engine that automatically computes escalation levels based on days overdue. Per RBIA Policy and R39, escalation levels trigger email notifications and management reviews at: L1 (+15 days), L2 (+30 days), L3 (+90 days ACE), L4 (+180 days ACB). This plan implements the computation logic; notification triggers will be handled separately.

## Context

@AEGIS/src/lib/escalation-engine.ts — NEW: escalation computation
@AEGIS/src/actions/compliance/compute-escalation.ts — NEW: batch escalation action
@AEGIS/src/data-access/compliance.ts — extend with overdue query
@AEGIS/.planning/REQUIREMENTS.md — R39
@AEGIS/.planning/codebase/CONVENTIONS.md — pure function patterns, batch processing

## Tasks

<task type="auto">
  <name>Task 1: Escalation computation engine (pure functions)</name>
  <files>src/lib/escalation-engine.ts</files>
  <action>
  **Create `src/lib/escalation-engine.ts`:**

  ```typescript
  /**
   * Compliance Escalation Engine (Phase 2 — R39)
   *
   * Computes escalation levels for compliance items based on days overdue.
   * Per RBIA Policy:
   * - L0: Within SLA (0-15 days overdue)
   * - L1: +15 days (email to Branch + IAD)
   * - L2: +30 days (ZAC review)
   * - L3: +90 days (ACE quarterly processing)
   * - L4: +180 days (ACB board reporting)
   *
   * Pure functions - no side effects, no database access.
   */

  export type EscalationLevel = 0 | 1 | 2 | 3 | 4;

  export interface EscalationResult {
    daysOpen: number;
    daysOverdue: number;
    escalationLevel: EscalationLevel;
    shouldNotify: boolean; // True if escalation level just changed
  }

  /**
   * Compute days between two dates (always positive).
   */
  function daysBetween(startDate: Date, endDate: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    const diffMs = endDate.getTime() - startDate.getTime();
    return Math.floor(Math.abs(diffMs) / msPerDay);
  }

  /**
   * Determine escalation level from days overdue.
   */
  function getEscalationLevelFromDays(daysOverdue: number): EscalationLevel {
    if (daysOverdue >= 180) return 4; // L4: ACB
    if (daysOverdue >= 90) return 3;  // L3: ACE
    if (daysOverdue >= 30) return 2;  // L2: ZAC
    if (daysOverdue >= 15) return 1;  // L1: Email
    return 0;                         // L0: Within grace period
  }

  /**
   * Compute escalation status for a compliance item.
   *
   * @param createdAt - When the compliance item was created
   * @param dueDate - Original due date (typically createdAt + 30 days)
   * @param currentEscalationLevel - Current escalation level (to detect transitions)
   * @param now - Current timestamp (default: new Date())
   * @returns Escalation result with daysOpen, daysOverdue, level, and shouldNotify flag
   */
  export function computeEscalation(
    createdAt: Date,
    dueDate: Date,
    currentEscalationLevel: EscalationLevel,
    now: Date = new Date()
  ): EscalationResult {
    // Days since item was created
    const daysOpen = daysBetween(createdAt, now);

    // Days overdue (negative if still within SLA)
    const daysOverdue = Math.max(0, daysBetween(dueDate, now));

    // New escalation level
    const escalationLevel = getEscalationLevelFromDays(daysOverdue);

    // Should notify if level increased
    const shouldNotify = escalationLevel > currentEscalationLevel;

    return {
      daysOpen,
      daysOverdue,
      escalationLevel,
      shouldNotify,
    };
  }

  /**
   * Batch compute escalation for multiple items.
   * Returns only items where escalation level changed.
   */
  export interface ComplianceItemForEscalation {
    id: string;
    createdAt: Date;
    dueDate: Date;
    escalationLevel: EscalationLevel;
  }

  export interface EscalationUpdate {
    id: string;
    newEscalationLevel: EscalationLevel;
    daysOpen: number;
    daysOverdue: number;
    shouldNotify: boolean;
  }

  export function computeBatchEscalation(
    items: ComplianceItemForEscalation[],
    now: Date = new Date()
  ): EscalationUpdate[] {
    const updates: EscalationUpdate[] = [];

    for (const item of items) {
      const result = computeEscalation(
        item.createdAt,
        item.dueDate,
        item.escalationLevel,
        now
      );

      // Only include if escalation level changed or daysOpen changed
      if (result.escalationLevel !== item.escalationLevel) {
        updates.push({
          id: item.id,
          newEscalationLevel: result.escalationLevel,
          daysOpen: result.daysOpen,
          daysOverdue: result.daysOverdue,
          shouldNotify: result.shouldNotify,
        });
      }
    }

    return updates;
  }
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit --pretty 2>&1 | grep "escalation-engine" | head -10
  ```
  No TypeScript errors.

  Manual verification:
  ```bash
  cd /root/.openclaw/workspace/AEGIS && node -e "
    const createdAt = new Date('2025-01-01');
    const dueDate = new Date('2025-01-31'); // 30 days SLA
    const now = new Date('2025-03-01'); // 60 days after creation, 30 days overdue

    const daysOpen = Math.floor((now - createdAt) / (1000*60*60*24)); // 59
    const daysOverdue = Math.floor((now - dueDate) / (1000*60*60*24)); // 29

    const level = daysOverdue >= 180 ? 4 : daysOverdue >= 90 ? 3 : daysOverdue >= 30 ? 2 : daysOverdue >= 15 ? 1 : 0;

    console.log('Days open:', daysOpen, '(expected: ~59)');
    console.log('Days overdue:', daysOverdue, '(expected: ~29)');
    console.log('Escalation level:', level, '(expected: 1, just under L2 threshold)');
  "
  ```
  </verify>
  <done>
  - src/lib/escalation-engine.ts exists with 2 exported functions
  - computeEscalation calculates daysOpen and daysOverdue from dates
  - Escalation thresholds: L1=15d, L2=30d, L3=90d, L4=180d
  - shouldNotify flag is true when escalation level increases
  - computeBatchEscalation processes multiple items and returns only changed ones
  - All functions are pure (no side effects, deterministic)
  </done>
</task>

<task type="auto">
  <name>Task 2: Batch escalation computation action + DAL query</name>
  <files>src/data-access/compliance.ts, src/actions/compliance/compute-escalation.ts</files>
  <action>
  **2a. Extend `src/data-access/compliance.ts` with overdue query:**

  Add this function to the existing file:

  ```typescript
  /**
   * Get all open compliance items for escalation processing.
   * Returns minimal data needed by escalation engine.
   */
  export async function getOpenComplianceItemsForEscalation(session: Session) {
    const tenantId = (session.user as any).tenantId as string;
    const db = prismaForTenant(tenantId);

    return db.complianceItem.findMany({
      where: {
        tenantId,
        status: {
          in: [
            "OPEN",
            "BRANCH_RESPONSE_DUE",
            "BRANCH_RESPONSE_SUBMITTED",
            "ZAC_REVIEW",
          ],
        },
      },
      select: {
        id: true,
        createdAt: true,
        dueDate: true,
        escalationLevel: true,
      },
    });
  }
  ```

  **2b. Create `src/actions/compliance/compute-escalation.ts`:**

  ```typescript
  "use server";

  import { revalidatePath } from "next/cache";
  import { getRequiredSession } from "@/data-access/session";
  import { prismaForTenant } from "@/data-access/prisma";
  import { setAuditContext } from "@/data-access/audit-context";
  import { hasPermission, type Role } from "@/lib/permissions";
  import { logger } from "@/lib/logger";
  import { getOpenComplianceItemsForEscalation } from "@/data-access/compliance";
  import {
    computeBatchEscalation,
    type ComplianceItemForEscalation,
    type EscalationLevel,
  } from "@/lib/escalation-engine";

  /**
   * Compute and update escalation levels for all open compliance items.
   * Security: Requires compliance:read permission (intended for cron/admin).
   * Atomicity: Updates all items in a single transaction.
   * Side effects: Updates ComplianceItem.escalationLevel and daysOpen.
   *
   * This action is designed to be called by:
   * 1. Daily cron job (automated)
   * 2. Manual trigger from admin panel
   */
  export async function computeEscalationForAllItems() {
    const session = await getRequiredSession();
    const userRoles = ((session.user as any).roles ?? []) as Role[];
    const tenantId = (session.user as any).tenantId as string;

    // Require at least compliance:read (typically CAE, AUDIT_MANAGER)
    if (!hasPermission(userRoles, "compliance:read")) {
      return {
        success: false as const,
        error: "You do not have permission to compute escalations.",
      };
    }

    const db = prismaForTenant(tenantId);

    try {
      // Fetch all open compliance items
      const items = await getOpenComplianceItemsForEscalation(session);

      if (items.length === 0) {
        return {
          success: true as const,
          data: { processed: 0, updated: 0 },
        };
      }

      // Compute escalation updates
      const now = new Date();
      const updates = computeBatchEscalation(
        items as ComplianceItemForEscalation[],
        now
      );

      if (updates.length === 0) {
        logger.info(
          { tenantId, itemCount: items.length },
          "Escalation computation: no changes"
        );
        return {
          success: true as const,
          data: { processed: items.length, updated: 0 },
        };
      }

      // Apply updates in transaction
      await db.$transaction(async (tx: any) => {
        await setAuditContext(tx, {
          actionType: "compliance.escalation_computed",
          userId: session.user.id,
          tenantId,
          sessionId: session.session.id,
        });

        for (const update of updates) {
          await tx.complianceItem.update({
            where: { id: update.id },
            data: {
              escalationLevel: update.newEscalationLevel,
              daysOpen: update.daysOpen,
              // If escalated to OVERDUE status
              ...(update.daysOverdue > 0 && {
                status: "OVERDUE",
              }),
            },
          });
        }
      });

      logger.info(
        {
          tenantId,
          processed: items.length,
          updated: updates.length,
          escalations: updates.map((u) => ({
            id: u.id.substring(0, 8),
            level: u.newEscalationLevel,
          })),
        },
        "Escalation computation completed"
      );

      revalidatePath("/compliance");

      return {
        success: true as const,
        data: {
          processed: items.length,
          updated: updates.length,
          escalations: updates.map((u) => ({
            id: u.id,
            level: u.newEscalationLevel,
            daysOverdue: u.daysOverdue,
          })),
        },
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to compute escalations.";
      logger.error({ error, action: "compute_escalation", tenantId }, message);
      return { success: false as const, error: message };
    }
  }
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit --pretty 2>&1 | grep -E "(escalation|compliance)" | head -20
  ```
  No TypeScript errors.
  </verify>
  <done>
  - src/data-access/compliance.ts has getOpenComplianceItemsForEscalation query
  - Query returns only open/in-progress items with minimal fields (id, createdAt, dueDate, escalationLevel)
  - src/actions/compliance/compute-escalation.ts exists
  - computeEscalationForAllItems fetches all open items, runs batch computation, updates changed items
  - Action updates escalationLevel and daysOpen fields
  - Action sets status to OVERDUE if daysOverdue > 0
  - Action logs processed count + escalation changes
  - Action returns summary with processed/updated counts
  </done>
</task>

## Success Criteria

1. `pnpm exec tsc --noEmit` has no errors in escalation files
2. escalation-engine.ts exports computeEscalation + computeBatchEscalation
3. Escalation thresholds correct: L1=15d, L2=30d, L3=90d, L4=180d
4. computeEscalation is a pure function (accepts dates, returns result object)
5. shouldNotify flag is true only when escalation level increases
6. getOpenComplianceItemsForEscalation filters by open statuses
7. computeEscalationForAllItems processes all open items in batch
8. Action updates escalationLevel and daysOpen in transaction
9. Action sets status to OVERDUE for overdue items
10. Action logs processed/updated counts with escalation details
