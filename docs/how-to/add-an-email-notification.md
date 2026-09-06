# How to add an email notification

AEGIS never sends email synchronously from a server action or job. Every
email goes through a queue table and a dedicated processor, so a slow or
failed SES call never blocks the request or transaction that triggered it.

## The pipeline

```
caller creates a NotificationQueue row (status: PENDING)
        │
        ▼  every minute, pg-boss "process-notifications" job
notification-processor.ts: dequeue → group by batchKey → render → send → mark
        │                                  │
        │                          TEMPLATE_MAP[type] → templateName
        ▼                                  ▼
   src/lib/ses-client.ts          src/emails/render.ts (React Email → HTML + plain text)
```

`NotificationQueue.type` is a native Postgres enum
(`NotificationType` in `prisma/schema.prisma`) — 9 values today:
`OBSERVATION_ASSIGNED`, `RESPONSE_SUBMITTED`, `DEADLINE_REMINDER_7D/3D/1D`,
`OVERDUE_ESCALATION`, `WEEKLY_DIGEST`, `BULK_DIGEST`, `INVITATION`.

`notification-processor.ts`'s `TEMPLATE_MAP` maps each `NotificationType` to
one of 8 React Email templates in `src/emails/templates/` (three of the nine
types — the deadline reminders — share the single `reminder` template).
`src/emails/render.ts`'s `renderEmailTemplate` switch then builds the actual
React element with defaults for every payload field, so a caller can queue a
notification with a partial payload and still get a renderable email.

## Steps to add a new notification type

1. **Add the value to the `NotificationType` enum in `prisma/schema.prisma`**,
   then `pnpm db:generate` and `pnpm db:push` (or a proper migration if this
   is going through a normal PR — see
   [`docs/ops/release-checklist.md`](../ops/release-checklist.md) for the
   hand-applied SQL sequence). **Do this first.** See the gotcha below for
   what happens if you skip it.
2. **Write the React Email template** in `src/emails/templates/`, following
   an existing one for structure (`email-base-layout.tsx` wraps every
   template; `cta-button.tsx`, `severity-badge.tsx`, `observation-card.tsx`
   are the shared components). Export both the component and a
   `getXSubject(...)` function — every existing template does, and
   `render.ts` calls the subject function separately from rendering the body.
3. **Register it in two places, not one:**
   - `TEMPLATE_MAP` in `src/jobs/notification-processor.ts` — maps your new
     `NotificationType` to a template name string.
   - the `switch` in `renderEmailTemplate` in `src/emails/render.ts` — maps
     that template name string to your component, with payload defaults.
   These are two independent string-keyed maps kept in sync by hand; nothing
   currently checks that every `NotificationType` has an entry in both.
4. **Queue the notification** wherever the triggering event happens, via
   `tx.notificationQueue.create(...)` **inside** the same
   `withAuditedMutation` transaction as the write that triggered it, if the
   trigger touches an audited table — see
   [`src/data-access/README.md`](../../src/data-access/README.md) and the
   existing job files (`overdue-escalation.ts`,
   `rbia-overdue-escalation.ts`) for the pattern. If the notification should
   be deduplicated (only sent once per day, or once per unique event), check
   `EmailLog` first — see `deadline-reminder.ts`'s per-window check.
5. **Verify**: `pnpm test:unit` for the template rendering, and if the
   trigger runs inside a job, `pnpm test:integration` — but see the gotcha
   below, this alone will not catch an enum mismatch unless the test actually
   inserts a row through the real Prisma client against a real Postgres
   instance (not a mock).

## Gotcha: an unregistered `NotificationType` fails silently, not loudly

**Verified in this codebase today**: `src/jobs/rbia-overdue-escalation.ts`
creates a `NotificationQueue` row with `type: "BM_BATCH_OVERDUE" as any` —
but `"BM_BATCH_OVERDUE"` is **not** a member of the `NotificationType` enum
in `prisma/schema.prisma` (only the 9 values listed above exist). The `as
any` cast silences the TypeScript error the missing enum member would
otherwise produce, but does nothing to make the value valid at the database
level — `type` is a native Postgres enum column, and Postgres rejects an
INSERT with an out-of-range enum value.

Because this `create` runs inside `withAuditedMutation`'s transaction
alongside the `BmResponseBatch.status → OVERDUE` update, and the module's
own comment states the design explicitly ("if notification creation fails,
status rolls back to PENDING for retry on the next cron run"), the whole
transaction rolls back on this failure. The outer per-tenant `try/catch` in
`processRbiaOverdueEscalation` catches it and logs
`[rbia-overdue] Error processing tenant <name>: ...` — so the daily job does
not crash, but the batch **never transitions to OVERDUE and no Zonal Auditor
is ever notified**, and the same failure repeats every day, indefinitely,
visible only in job logs. No test in `src/jobs/__integration__/` exercises
`processRbiaOverdueEscalation` today, so nothing catches this in CI either.

**The lesson for step 1 above**: `as any` on an enum-typed Prisma field is
not a type-checking inconvenience to work around — it is silencing the exact
error that would have caught this. If you add a `NotificationType` value,
add it to the Prisma schema *before* referencing it anywhere, and never cast
past a `NotificationType` mismatch; let the compiler stop you until the enum
actually has the value.
