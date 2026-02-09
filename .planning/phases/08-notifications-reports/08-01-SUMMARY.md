---
phase: 08-notifications-reports
plan: 01
status: complete
commit: pending
---

# 08-01 Summary: Notification Infrastructure

## What was done

### Task 1: Prisma schema additions

- Added `NotificationType` enum (9 values: OBSERVATION_ASSIGNED, RESPONSE_SUBMITTED, DEADLINE_REMINDER_7D/3D/1D, OVERDUE_ESCALATION, WEEKLY_DIGEST, BULK_DIGEST, INVITATION)
- Added `NotificationStatus` enum (5 values: PENDING, PROCESSING, SENT, FAILED, SKIPPED)
- Added `NotificationQueue` model with batchKey/sendAfter for NOTF-06 batching, payload as Json, retryCount, processedAt
- Added `EmailLog` model with sesMessageId, notificationIds String[], status tracking
- Added `NotificationPreference` model with emailEnabled boolean, digestPreference string, userId unique
- Added `BoardReport` model reusing existing Quarter enum (Q1_APR_JUN format), with executiveCommentary, s3Key, metricsSnapshot Json
- Added 4 Tenant relations and 3 User relations for new models
- `pnpm prisma validate` ✅

### Task 2: RLS migration SQL

- Created `prisma/migrations/add_notification_tables.sql`
- ENABLE + FORCE RLS on all 4 new tables
- Tenant isolation policies using `current_setting('app.current_tenant_id')`
- GRANT permissions to aegis_app role (scoped per table: no DELETE on NotificationQueue/NotificationPreference, INSERT-only for EmailLog)
- Audit triggers attached to all 4 tables using existing audit_trigger_function()

### Task 3: SES client + pg-boss + instrumentation.ts

- `src/lib/ses-client.ts`: SESv2Client singleton for ap-south-1 (Mumbai), sendEmail + sendBatchEmails functions, graceful error handling
- `src/lib/job-queue.ts`: pg-boss singleton using DATABASE_URL, JOB_NAMES export (4 jobs), QUEUE_OPTIONS, scheduled cron jobs (process-notifications every minute, deadline-check daily 06:00 IST, weekly-digest Monday 10:00 IST), placeholder handlers for 08-03
- `src/instrumentation.ts`: Next.js hook calling startWorkers() on nodejs runtime only

### Task 4: Notification DAL

- `src/data-access/notifications.ts` with 6 functions:
  1. `createNotification` — queue with optional batchKey (5min window for NOTF-06)
  2. `getNotificationPreferences` — fetch or create defaults
  3. `updateNotificationPreferences` — upsert with CAE/CCO digest restriction
  4. `getPendingNotifications` — cross-tenant query for job processor
  5. `markNotificationSent` — update status + create EmailLog in transaction
  6. `markNotificationFailed` — retry with exponential backoff (max 3)

### Additional fix

- Fixed `Uint8Array` not assignable to `BodyInit` in 3 export routes (audit-plans, findings, compliance) — wrapped with `Buffer.from(buffer)`

## Verification

- `pnpm prisma validate` ✅
- `pnpm prisma generate` ✅
- `pnpm build` ✅ — all routes compile, 14 static pages generated
- All must_haves satisfied:
  - NotificationQueue with batching (NOTF-06) ✅
  - EmailLog for sent email audit trail ✅
  - NotificationPreference for per-user opt-in/out ✅
  - BoardReport with executiveCommentary and metricsSnapshot ✅
  - NotificationType enum covers all 9 notification types ✅
  - pg-boss initialized via instrumentation.ts ✅
  - SES client configured for ap-south-1 ✅
  - RLS policies exist for all new tables ✅
