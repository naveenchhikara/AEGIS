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
  previousLevel: EscalationLevel;
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
        previousLevel: item.escalationLevel,
        newEscalationLevel: result.escalationLevel,
        daysOpen: result.daysOpen,
        daysOverdue: result.daysOverdue,
        shouldNotify: result.shouldNotify,
      });
    }
  }

  return updates;
}
