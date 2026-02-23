# 20-03 — Meeting Recording + Sign-off Server Actions

**Status:** ✅ COMPLETE  
**Commit:** `7ace6ee` — feat(20-03): meeting recording + sign-off server actions  
**File:** `src/actions/rbia/meetings.ts`

---

## What Was Built

Two `"use server"` actions for the RBIA meeting lifecycle.

### `recordMeeting(input: unknown): Promise<ActionResult<{...}>>`

Records (creates or updates) an OPENING or EXIT meeting for an engagement.

**Flow:**
1. `getRequiredSession()` + `audit_execution:manage_team` permission guard
2. `RecordMeetingSchema.safeParse(input)` — validates engagementId, meetingType, meetingDate (ISO datetime), attendees (string[], min 1), minutesText, keyDiscussionPoints
3. Determines `targetStatus`: `OPENING → OPENING_MEETING`, `EXIT → EXIT_MEETING`
4. **ATOMIC `$transaction`:**
   - Loads engagement with teamMembers, meetings (signedOff), branchRbiaScore
   - Builds `EngagementContext` for the state machine
   - Calls `canTransitionEngagement(from, to, userRoles, ctx)` — skips if already at target status (re-record idempotency)
   - `setAuditContext(tx, { actionType: "engagement.meeting_recorded", ... })`
   - `tx.engagementMeeting.upsert(...)` on compound unique `(engagementId, meetingType)`  
     — stores attendees as JSONB string array, minutesText, keyDiscussionPoints  
     — `signedOff` excluded from update clause (sign-off is separate action)
   - `tx.auditEngagement.update({ status: targetStatus })` (if not already there)
5. `revalidatePath` for audit-execution list + detail
6. Returns `ActionResult<{ meetingId, engagementStatus }>`

### `signOffMeeting(input: unknown): Promise<ActionResult<{...}>>`

Signs off an existing meeting, unlocking the next engagement status transition.

**Flow:**
1. `getRequiredSession()` + `audit_execution:manage_team` permission guard
2. `SignOffMeetingSchema.safeParse(input)` — validates engagementId + meetingType
3. **ATOMIC `$transaction`:**
   - Looks up meeting by compound unique `(engagementId, meetingType)`
   - Returns `NOT_FOUND` error if absent (must record before signing off)
   - Tenant isolation check (belt-and-suspenders)
   - **Idempotent:** returns current values if already signed off
   - `setAuditContext(tx, { actionType: "engagement.meeting_signed_off", ... })`
   - Updates `signedOff=true`, `signedOffById=userId`, `signedOffAt=now()`
4. `revalidatePath` for audit-execution list + detail
5. Returns `ActionResult<{ meetingId, signedOffAt }>`

---

## State Machine Integration

The `canTransitionEngagement` prerequisite checks in the state machine use `EngagementContext.hasOpeningMeeting` / `hasExitMeeting` (both require `signedOff=true`):

| Meeting Type | Status Transition on Record | Prerequisite for Next Transition |
|---|---|---|
| OPENING | TEAM_ASSIGNED → OPENING_MEETING | `signedOff=true` required for → IN_PROGRESS |
| EXIT | IN_PROGRESS → EXIT_MEETING | `signedOff=true` required for → REPORT_DRAFT |

---

## Design Decisions

- **Attendees as JSONB string array:** Schema provides `string[]` (names), stored directly as JSONB. Typed at the DAL boundary via `as any`.
- **Re-record idempotency:** If engagement is already at the target status, the status transition step is skipped (allows editing meeting details without re-triggering the machine).
- **Sign-off idempotency:** Re-signing an already signed-off meeting returns success with existing values (no error, no duplicate audit log).
- **Transaction scope:** Both actions use `prismaForTenant(tenantId).$transaction()` directly (not the DAL `upsertEngagementMeeting` helper) to ensure atomicity across two table writes.

---

## Type Check

`pnpm tsc --noEmit` — **0 new errors** introduced (3 pre-existing errors in `s3.ts` and `tenant-isolation.test.ts` are unrelated).
