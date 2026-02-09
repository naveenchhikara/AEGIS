# Plan 08-03 Summary: Notification Jobs & Processing

## Status: COMPLETE

## What was built

### 1. src/jobs/notification-processor.ts (192 lines)

- Core processor dequeuing pending notifications every minute
- Renders email via `renderEmailTemplate()` from 08-02 React Email templates
- Sends via SES `sendEmail()` from 08-01
- Handles both individual notifications and batched groups (NOTF-06)
- Marks as PROCESSING to prevent double-pickup, then SENT/FAILED
- Template type mapping: NotificationType → template name (assignment, response, reminder, escalation, weekly-digest, bulk-digest)

### 2. src/jobs/deadline-reminder.ts (161 lines)

- Daily cron job (NOTF-03) checking for observations with dueDate in 7d, 3d, 1d
- Cross-tenant iteration with `prismaForTenant()` for RLS compliance
- Duplicate prevention: queries NotificationQueue by type + observationId + createdAt today
- Only processes observations in ISSUED/RESPONSE status
- Includes branch name and severity in notification payload

### 3. src/jobs/overdue-escalation.ts (156 lines)

- Daily cron job (NOTF-04) finding overdue observations (dueDate < now)
- Sends to: assigned auditee + observation creator (auditor) + all Audit Managers
- Deduplicated recipient set prevents duplicate notifications
- Daily duplicate prevention via NotificationQueue check
- Calculates overdueDays for escalation urgency display

### 4. src/jobs/weekly-digest.ts (170 lines)

- Monday cron job (NOTF-05) aggregating per-tenant stats
- Stats: openObservations, closedThisWeek, newThisWeek, upcomingDeadlines, overdueCount
- Top 3 critical/high findings included
- Sent to CAE/CCO users (regulatory, no opt-out)
- Cross-tenant iteration with scoped context

### 5. src/jobs/notification-batcher.ts (37 lines)

- Utility functions for batch key generation (NOTF-06)
- `generateBatchKey(recipientId, context)` for general batching
- `generateBulkImportBatchKey(recipientId, importId)` for bulk imports

### 6. src/jobs/index.ts (57 lines)

- `registerJobs(boss: PgBoss)` — registers all handlers with pg-boss
- Deadline check + overdue escalation combined in single daily job
- Board report handler placeholder for 08-04
- Notification processor with batchSize: 50

### 7. src/lib/notification-service.ts (85 lines)

- `queueNotification(session, recipientId, type, payload, batchKey?)` — application-level helper
- Checks NotificationPreference before queueing (respects emailEnabled)
- Mandatory types (WEEKLY_DIGEST, OVERDUE_ESCALATION, INVITATION) bypass preference check
- `queueBulkNotifications()` for multi-recipient scenarios

### 8. src/lib/job-queue.ts (updated)

- Replaced placeholder handlers with `registerJobs()` import from `src/jobs/index`
- Retains queue creation and cron schedule setup

## Deviations

- No direct Observation→AuditEngagement relation in schema. For escalation, Audit Managers are found by role (`AUDIT_MANAGER`) in the tenant rather than through engagement assignment.
- Duplicate prevention uses Prisma JSON path query (`payload.path.observationId`) against NotificationQueue instead of EmailLog check as plan suggested — more efficient since EmailLog is append-only and may not exist for unsent notifications.
- `jobs/index.ts` duplicates job name constants locally instead of importing from `job-queue.ts` to avoid `server-only` import restriction.
- Overdue escalation combined with deadline check in single daily cron job handler instead of separate cron.

## Commits

1. `801465d feat(08-03): implement notification jobs and processing pipeline` — 8 files, 861 insertions

## Verification

- `pnpm build` — PASS (0 errors, 18 routes compiled)
- `npx tsc --noEmit` — 0 errors in 08-03 files
- Notification processor handles individual + batched notifications ✓
- Deadline reminder checks 7d, 3d, 1d with duplicate prevention ✓
- Overdue escalation sends to auditee + creator + Audit Managers ✓
- Weekly digest aggregates per-tenant stats for CAE/CCO ✓
- All cron times use correct UTC offset for IST ✓
- Cross-tenant processing uses prismaForTenant (RLS compatible) ✓
- Notification service checks preferences before queueing ✓
- Mandatory notifications bypass preference check ✓
