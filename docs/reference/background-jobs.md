# Background jobs reference

AEGIS runs six recurring jobs on [pg-boss](https://github.com/timgit/pg-boss)
against the same `DATABASE_URL` as Prisma — no separate queue infrastructure.
The queue starts from `instrumentation.ts` on server boot
(`src/lib/job-queue.ts:startWorkers()`), which creates all six queues, then
schedules five of them by cron, then registers the real handlers from
`src/jobs/index.ts`. Not by `docs:reference` — hand-written, re-derive if
`job-queue.ts` or `src/jobs/index.ts` changes.

All cron expressions in the source are UTC; the comment column below converts
to IST (UTC+5:30) since that's the operational timezone.

| Job name | Cron (UTC) | IST | Handler | Purpose |
| --- | --- | --- | --- | --- |
| `process-notifications` | `* * * * *` (every minute) | continuous | `notification-processor.ts` | Dequeues pending `Notification` rows (batch size 50), renders the email template, sends via SES, marks `SENT`/`FAILED` |
| `deadline-check` | `30 0 * * *` | 06:00 daily | runs three functions in sequence: `deadline-reminder.ts`, `overdue-escalation.ts`, `rbia-overdue-escalation.ts` | Deadline reminders (7d/3d/1d before due), Observation overdue escalation, RBIA `BmResponseBatch` overdue transition |
| `send-weekly-digest` | `30 4 * * 1` | 10:00 Monday | `weekly-digest.ts` | Per-tenant audit stats digest to CAE/CCO — **non-optional**, a regulatory requirement they cannot opt out of |
| `snapshot-metrics` | `30 19 * * *` (prior day) | 01:00 daily | `snapshot-metrics.ts` | Captures health score, compliance summary, severity breakdown into `DashboardSnapshot` per onboarded tenant, for dashboard trend charts |
| `compliance-escalation` | `0 1 * * *` | 06:30 daily | `compliance-escalation.ts` | Runs `runEscalationJobInternal` across every tenant — the only scheduled trigger for R39 compliance escalation (see below) |
| `generate-board-report` | none — on-demand only | — | registered, handler is a stub | Not cron-scheduled; queued by user action, not yet implemented (comment cites "08-04 (PDF Board Report)") |

All six use the same retry policy (`QUEUE_OPTIONS` in `job-queue.ts`):
`retryLimit: 3`, `retryDelay: 60`s, exponential backoff, and completed jobs are
deleted after 30 days.

## Two escalation pipelines, deliberately separate schedules

`deadline-check` (06:00 IST) escalates **Observations** —
`overdue-escalation.ts` and `rbia-overdue-escalation.ts` both run inside it.
`compliance-escalation` (06:30 IST) escalates **ComplianceItems** via the R39
engine described in
[`docs/explanation/scoring-engines.md`](../explanation/scoring-engines.md#escalation-two-engines-one-deliberately-kept-separate).
They are different tables, different escalation rules, and — per the header
comment in `compliance-escalation.ts` — this job used to have **no scheduled
trigger at all**: its only path was `POST /api/cron/escalation`, which
`middleware.ts` blocked outright because it requires a session cookie before
any route-level check ever runs, and the permission-gated manual server
action `runEscalationJob`. Scheduling it here closed that gap without adding
a second auth scheme or an externally reachable endpoint.

## Multi-tenant iteration pattern

Every job that isn't purely per-notification (`notification-processor`)
iterates `prisma.tenant.findMany(...)` and processes each tenant with
`prismaForTenant(tenantId)` inside its own loop — there is no per-tenant job
instance; one job run covers every tenant on the schedule. `snapshot-metrics`
filters to `onboardingCompleted: true` tenants and batches in groups of 10 to
avoid exhausting the connection pool; the escalation jobs iterate all tenants
unconditionally.

## Audited writes from jobs

`overdue-escalation.ts`, `rbia-overdue-escalation.ts`, and
`weekly-digest.ts` import `withAuditedMutation` and `systemActor` — every
write these jobs make goes through the same audited-mutation contract as a
user action, attributed to `systemActor(tenantId)` rather than a person (see
[Invariant 2 in `docs/architecture.md`](../architecture.md#invariant-2--audit-attribution)).
`rbia-overdue-escalation.ts`'s status transition and its notification queuing
happen inside one transaction specifically so a failure on either half rolls
the `BmResponseBatch` status back to `PENDING` rather than leaving it
`OVERDUE` with no notification sent — the next day's cron run retries it
cleanly instead of the item silently going quiet.

## Duplicate-send guards

- `deadline-reminder.ts` checks `EmailLog` before sending each of the three
  reminder windows (7d/3d/1d), keyed to the same observation + deadline pair,
  so a job re-run on retry doesn't double-send.
- `overdue-escalation.ts` escalates an observation at most once per day.
- `weekly-digest.ts` computes `startOfIsoWeek(now)` (most recent Monday,
  00:00 local) as its dedup window — a retry later the same week, or a
  duplicate schedule firing twice, lands in the same week and does not
  re-queue; the window only advances on the next actual Monday.

## Where to add a new job

1. Add the job name to `JOB_NAMES` in `src/lib/job-queue.ts` **and** the
   duplicated `JOBS` constant in `src/jobs/index.ts` (the duplication exists
   because `src/jobs/index.ts` avoids the `server-only` import chain that
   `job-queue.ts` pulls in).
2. `queue.createQueue(...)` and, if recurring, `queue.schedule(...)` in
   `startWorkers()`.
3. Write the handler in `src/jobs/<name>.ts`, register it in
   `registerJobs()` in `src/jobs/index.ts`.
4. If the handler writes to an audited table, use `withAuditedMutation` and
   `systemActor(tenantId)` — never a hand-rolled transaction; see
   [`src/data-access/README.md`](../../src/data-access/README.md).
