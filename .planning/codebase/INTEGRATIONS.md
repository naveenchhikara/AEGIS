# External Integrations

**Analysis Date:** 2026-02-20

## APIs & External Services

**File Storage:**

- AWS S3 - Evidence file storage
  - SDK: `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`
  - Client: `src/lib/s3.ts` (singleton `S3Client`, region hardcoded to `ap-south-1`)
  - Auth: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
  - Bucket: `S3_BUCKET_NAME` env var
  - Key pattern: `{tenantId}/evidence/{observationId}/{uuid}.{ext}`
  - File types: PDF, JPEG, PNG, DOCX, XLSX (magic-byte validated)
  - Max size: 10MB per file
  - Access: presigned GET/PUT URLs with 5-minute expiry
  - Encryption: Server-side SSE-S3 via bucket default policy
  - Reports also uploaded directly via `uploadToS3()` buffer upload

**Email:**

- AWS SES v2 - Transactional email
  - SDK: `@aws-sdk/client-sesv2`
  - Client: `src/lib/ses-client.ts` (lazy singleton `SESv2Client`)
  - Auth: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SES_REGION`
  - From address: `SES_FROM_EMAIL` env var (defaults to `noreply@aegis.in`)
  - Status: Sandbox mode — only sends to verified addresses; production access pending
  - Templates: React Email components in `src/emails/templates/`
  - Email renderer: `src/emails/render.ts`
  - Use cases: assignment notifications, escalation alerts, weekly digest
  - Batch sending: `sendBatchEmails()` uses `Promise.all()`

## Data Storage

**Databases:**

- PostgreSQL 16 - Primary database (local on VPS in production)
  - Connection: `DATABASE_URL` env var
  - Client: Prisma 7 ORM with `@prisma/adapter-pg` (pg.Pool, max 25 connections)
  - Singleton: `src/lib/prisma.ts`
  - Extensions: `pgcrypto`, `pg_trgm` (declared in `prisma/schema.prisma`)
  - Models: 63 models, 16 enums, 1999-line schema
  - Views: 4 PostgreSQL views (`v_compliance_summary`, `v_observation_severity`, `v_audit_coverage_branch`, `fn_dashboard_health_score`) — NOT in Prisma migrations, must be applied manually via `prisma/*.sql`
  - Tenant isolation: Application-level WHERE clauses (no PostgreSQL RLS policies)
  - Job queue: pg-boss uses same `DATABASE_URL` (stores jobs in `pgboss.*` schema)

**File Storage:**

- AWS S3 (ap-south-1) — see APIs section above

**Caching:**

- None (no Redis or other cache layer)

## Authentication & Identity

**Auth Provider:**

- better-auth 1.4.18 - Self-hosted, email/password only
  - Config: `src/lib/auth.ts`
  - Adapter: Prisma (`better-auth/adapters/prisma`)
  - Session storage: Database-backed (PostgreSQL via Prisma)
  - Session cookies: `__Secure-better-auth.session_token` (production HTTPS), `better-auth.session_token` (dev)
  - Cookie attributes: `httpOnly`, `secure` (HTTPS only), `sameSite: lax`
  - Idle timeout: 30 minutes
  - Rate limiting: In-memory; 10 login attempts per IP per 15 minutes; 3 signup per IP per minute
  - Account lockout: 5 failures → 30-minute lock (custom plugin: `src/lib/auth-lockout-plugin.ts`)
  - Concurrent sessions: Max 2 per user (`multiSession` plugin)
  - Password hashing: bcryptjs
  - No social/OAuth providers configured
  - Trusted origins: `NEXT_PUBLIC_APP_URL`, `http://127.0.0.1:3000`, `https://aegis.nexlyadvisory.com`

## Monitoring & Observability

**Error Tracking:**

- None (no Sentry, Datadog, or similar)

**Logs:**

- pino 10.3.1 - Structured JSON logging (`src/lib/logger.ts`)
  - Development: colorized pino-pretty output
  - Production: JSON to stdout (intended for CloudWatch Logs Insights)
  - Sensitive field redaction: `password`, `token`, `authorization`, `cookie`, `secret`, `apiKey`
  - Base metadata: `{ service: "aegis" }`
  - Child loggers via `createRequestLogger()` for request-scoped context

**Infrastructure Monitoring:**

- AWS CloudWatch - Log aggregation target (JSON logs structured for CloudWatch Logs Insights)

## CI/CD & Deployment

**Hosting:**

- Production VPS (Ubuntu, 4 vCPU 16GB RAM) via systemd + Nginx
- Docker support: `Dockerfile`, `docker-compose.yml`, `docker-compose.prod.yml`, `docker-compose.dev.yml`
- Infrastructure as Code: AWS CDK in `infra/` directory

**CI Pipeline:**

- GitHub Actions:
  - `ci.yml` - Build and test pipeline
  - `claude.yml` - Claude Code integration
  - `claude-code-review.yml` - Automated code review

## Background Jobs

**pg-boss 12.9.0 - PostgreSQL-backed job queue:**

- Config: `src/lib/job-queue.ts`
- Registered on server boot via `src/instrumentation.ts` (Next.js instrumentation hook)
- Job handlers: `src/jobs/`
- Scheduled jobs (UTC cron):
  - `process-notifications`: every minute (`* * * * *`)
  - `deadline-check`: daily 00:30 UTC (06:00 IST)
  - `send-weekly-digest`: Monday 04:30 UTC (10:00 IST)
  - `snapshot-metrics`: daily 19:30 UTC (01:00 IST)
- Job files:
  - `src/jobs/notification-processor.ts` - Process notification queue
  - `src/jobs/notification-batcher.ts` - Batch notification sending
  - `src/jobs/deadline-reminder.ts` - Deadline reminders
  - `src/jobs/overdue-escalation.ts` - Escalation triggers
  - `src/jobs/snapshot-metrics.ts` - Metrics snapshots
  - `src/jobs/weekly-digest.ts` - Weekly email digest
- Retry config: 3 retries, 60s delay, exponential backoff, 30-day job retention

## Webhooks & Callbacks

**Incoming:**

- None (no webhook receivers)

**Outgoing:**

- None (no outgoing webhooks)

## REST API Endpoints

**Internal API routes (`src/app/api/`):**

- `/api/auth/*` - better-auth handler
- `/api/health` - Health check endpoint
- `/api/dashboard` - Dashboard data
- `/api/exports` - Data export endpoints
- `/api/reports` - Report generation
- `/api/cron` - Cron job triggers
- `/api/download` - File download proxy
- `/api/is-audit` - IS audit endpoints

## Environment Configuration

**Required env vars:**

- `DATABASE_URL` - PostgreSQL connection string (no special chars: `/`, `@`, `#`, `%`, `?`, `=`)
- `BETTER_AUTH_SECRET` - Min 32 chars
- `BETTER_AUTH_URL` - Auth base URL (must match `NEXT_PUBLIC_APP_URL` port)
- `AWS_REGION` - AWS region
- `AWS_ACCESS_KEY_ID` - AWS credentials
- `AWS_SECRET_ACCESS_KEY` - AWS credentials
- `S3_BUCKET_NAME` - Evidence storage bucket
- `NEXT_PUBLIC_APP_URL` - Client-side app URL

**Optional env vars:**

- `AWS_SES_REGION` - SES region (defaults to `ap-south-1`)
- `SES_FROM_EMAIL` - From address (defaults to `noreply@aegis.in`)
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT` - Used by docker-compose DB container only
- `SKIP_ENV_VALIDATION=1` - Bypass env validation for Docker builds
- `BASE_URL` - Playwright E2E base URL (defaults to `http://localhost:3000`)

**Secrets location:**

- `.env` file (never committed; `.env.example` committed as template)
- Docker: passed as environment variables to container

---

_Integration audit: 2026-02-20_
