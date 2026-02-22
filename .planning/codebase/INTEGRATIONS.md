# External Integrations

**Analysis Date:** 2026-02-22

## APIs & External Services

**AWS S3 Evidence Storage:**

- Service: Amazon S3 (ap-south-1 region, Mumbai, for RBI data localization)
- What it's used for: File upload/storage for audit evidence (PDFs, images, documents)
- SDK/Client: `@aws-sdk/client-s3` 3.985.0
- Pre-signing: `@aws-sdk/s3-request-presigner` for temporary upload/download URLs
- Auth: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` environment variables
- Implementation: `src/lib/s3.ts`
  - `generateUploadUrl()` - Create presigned PUT URLs (5-minute expiry)
  - `generateDownloadUrl()` - Create presigned GET URLs
  - `validateFileType()` - Magic-byte file validation (PDF, JPEG, PNG, DOCX, XLSX)
  - `verifyUpload()` - Confirm file exists via HeadObject
  - `uploadToS3()` - Direct buffer upload (for reports)
- Allowed types: PDF, JPEG, PNG, DOCX, XLSX (10 MB max)
- Bucket name: `S3_BUCKET_NAME` env var (default: `aegis-evidence-dev`)

**AWS SES Email:**

- Service: Amazon Simple Email Service (ap-south-1 region)
- What it's used for: Notification emails (assignments, escalations, weekly digests)
- SDK/Client: `@aws-sdk/client-sesv2` 3.985.0
- Auth: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SES_REGION`
- From address: `SES_FROM_EMAIL` env var (default: `noreply@aegis.in`)
- Implementation: `src/lib/ses-client.ts`
  - `sendEmail()` - Single email with HTML + optional text body
  - `sendBatchEmails()` - Parallel batch send
- Email templates: `src/emails/` - React Email components + templates
  - Assignment notifications
  - Escalation alerts
  - Weekly digest summaries
- Status: Development uses SES sandbox mode (verified addresses only); production requires SES production access

## Data Storage

**Databases:**

- Type/Provider: PostgreSQL 16 (self-hosted on VPS or managed service)
- Connection: `DATABASE_URL` environment variable (format: `postgresql://user:password@host:port/dbname`)
- Client: Prisma 7.3.0 ORM with `@prisma/adapter-pg` PostgreSQL adapter
- Pool: pg.Pool with max 25 connections (increased from default 10 for concurrent SSR load)
- Extensions: pgcrypto (encryption), pg_trgm (full-text search)
- Schema: 71 models, 20 enums, 2,320 lines in `prisma/schema.prisma`
- Seeding: `prisma/seed.ts` (10 test users, 2 tenants, 39 examination areas, 568 items)
- Migrations: Prisma migrations in `prisma/migrations/` + standalone SQL for views/triggers
- Views: 4 PostgreSQL views for dashboard KPIs (applied manually after fresh deploy)
  - `v_compliance_summary` - Compliance tracking
  - `v_observation_severity` - Finding severity distribution
  - `v_audit_coverage_branch` - Branch audit coverage
  - `fn_dashboard_health_score` - Health score computation

**File Storage:**

- Primary: AWS S3 (ap-south-1) for evidence files
- Fallback: No local filesystem storage; S3 integration is optional but features degrade gracefully without it

**Caching:**

- In-memory: Zustand client-side state store (with persist middleware to localStorage)
- Server-side: React Query (TanStack Query) with automatic cache management
- No Redis or Memcached; caching is in-process or client-side only

## Authentication & Identity

**Auth Provider:**

- Service: Custom (self-hosted, no external auth provider)
- Implementation: better-auth 1.4.18 with Prisma adapter
- Configuration: `src/lib/auth.ts`

**Auth Features:**

- Email/password authentication (no social login)
- Password hashing: bcryptjs 3.0.3 (compatible with better-auth)
- Session storage: Database-backed via Prisma (tables: `User`, `Account`, `Session`)
- Session cookies: `__Secure-better-auth.session_token` (production), `better-auth.session_token` (dev)
- Cookie security: httpOnly, secure flag in production, sameSite=lax
- Session idleness: 30-minute timeout
- Rate limiting: 10 login attempts per IP per 15 minutes
- Account lockout: 5 failed attempts → 30-minute lock (custom plugin `src/lib/auth-lockout-plugin.ts`)
- Concurrent sessions: Max 2 per user (multiSession plugin)

**Authorization:**

- RBAC: 17 roles (AUDITOR, AUDIT_MANAGER, CAE, CCO, CEO, AUDITEE, BOARD_OBSERVER, LEAD_AUDITOR, FIELD_AUDITOR, BRANCH_HEAD, ZONAL_AUDITOR, ACE_OFFICER, CONCURRENT_AUDITOR, IS_AUDITOR, RISK_HEAD, ACB_MEMBER, SYSTEM_ADMIN)
- Permission model: 60+ permissions defined in `src/lib/permissions.ts`
- Multi-role: Users can hold multiple roles; effective permissions are union of all roles
- Tenant isolation: Application-level WHERE clauses via `prismaForTenant(tenantId)` in DAL functions
- Session info: tenantId and roles stored in session, accessible via `getRequiredSession()`

**Client-Side Auth:**

- Session validation: Middleware in `src/middleware.ts` (edge-compatible cookie check)
- Full validation: Dashboard layout component re-validates session for each request
- Client library: `src/lib/auth-client.ts` - Better Auth client-side SDK

## Monitoring & Observability

**Error Tracking:**

- Service: Sentry (error tracking and performance monitoring)
- SDK: `@sentry/nextjs` 10.39.0
- Configuration:
  - Server: `sentry.server.config.ts` (tracesSampleRate: 0.1 for free tier)
  - Client: `sentry.client.config.ts`
  - Edge: `sentry.edge.config.ts`
- Environment variable: `SENTRY_DSN` (optional; error tracking degrades gracefully without it)
- Source maps: `SENTRY_AUTH_TOKEN` for CI source map upload (disabled by default)
- Initialization: Via `src/instrumentation.ts` on server boot

**Logs:**

- Approach: Structured JSON logging via pino
- Configuration: `src/lib/logger.ts`
  - Development: Pretty-printed colorized output (pino-pretty)
  - Production: Raw JSON to stdout (captured by CloudWatch/Docker logs)
  - Log level: debug in dev, info in production
  - Automatic redaction: password, token, authorization, cookie, secret, apiKey fields masked
  - Base metadata: { service: "aegis" }
  - Timestamps: ISO 8601 format
  - Severity levels: Formatted for CloudWatch Logs Insights
- Usage: `createRequestLogger()` for request-scoped child loggers with userId, tenantId, requestId context

## Job Queue & Background Jobs

**Job Queue:**

- Service: pg-boss 12.9.0 (PostgreSQL-backed job queue)
- Connection: Uses `DATABASE_URL` (no extra infrastructure)
- Initialization: `src/lib/job-queue.ts`
  - `startWorkers()` called from `src/instrumentation.ts` on server boot
  - Job handlers registered from `src/jobs/index.ts`
- Job names: Defined in `JOB_NAMES` constant
  - PROCESS_NOTIFICATIONS - Every minute
  - DEADLINE_CHECK - Daily 00:30 UTC (06:00 IST)
  - SEND_WEEKLY_DIGEST - Monday 04:30 UTC (10:00 IST)
  - GENERATE_BOARD_REPORT - As needed
  - SNAPSHOT_METRICS - Daily 19:30 UTC (01:00 IST)
- Retry policy: Max 3 retries, 60-second delay, exponential backoff
- Cleanup: Jobs deleted 30 days after completion

**Job Implementation:**

- Job handlers: `src/jobs/` directory
- Notifications: Via pg-boss queue with configurable schedule
- Reports: Board report generation, export triggers

## CI/CD & Deployment

**Hosting:**

- Platform: Ubuntu VPS (4 vCPU, 16 GB RAM at 145.223.19.8)
- Container runtime: Docker + Docker Compose
- Process manager: systemd (`aegis.service`)
- Reverse proxy: Nginx Proxy Manager (NPM) on port 81
- SSL: Let's Encrypt via Certbot (valid till 2026-05-21)

**CI Pipeline:**

- Provider: GitHub Actions
- Workflows:
  - `ci.yml` - Build + test on push/PR
  - `claude.yml` - Claude Code integration
  - `claude-code-review.yml` - Code review automation

**Build Process:**

- Multi-stage Docker build (node:22-alpine)
  1. Dependencies stage: pnpm install
  2. Builder stage: Generate Prisma client, next build
  3. Runner stage: Minimal runtime image
- Environment at build time:
  - `NEXT_PUBLIC_APP_URL` - Inlined by Next.js (default: https://aegis.nexlyadvisory.com)
  - `SKIP_ENV_VALIDATION=1` - Bypass Zod validation when secrets unavailable
  - `DATABASE_URL` - Dummy value for Prisma generation (not used at runtime)
- Output: Standalone Next.js runtime (no .next folder)

**Deployment:**

- Docker Compose production stack: postgres + app services
- Health checks:
  - PostgreSQL: pg_isready every 10s
  - App: HTTP request to / every 30s
- Database migrations: `pnpm db:push` (Prisma push, no migration files)
- Seed triggers: Disabled before seeding, re-enabled after

## Environment Configuration

**Required env vars:**

- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Min 32 chars, hex-only (base64 chars cause JSON parse errors)
- `BETTER_AUTH_URL` - Auth base URL (must match NEXT_PUBLIC_APP_URL port)
- `NEXT_PUBLIC_APP_URL` - Client-side app URL (set at Docker build time via ARG)

**Optional env vars:**

- `AWS_REGION` - AWS region (default: ap-south-1)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` - AWS credentials
- `S3_BUCKET_NAME` - Evidence storage bucket (default: aegis-evidence-dev)
- `AWS_SES_REGION` - Email sending region (default: ap-south-1)
- `SES_FROM_EMAIL` - From address for emails
- `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` - Error tracking (optional)
- `NODE_ENV` - development/test/production

**Secrets location:**

- Docker: `.env` file in `/docker/aegis/.env` (Dockge-managed)
- Development: `.env` (local, never committed)
- Production: Docker environment variables + secrets management via orchestration platform

## Webhooks & Callbacks

**Incoming:**

- None detected. No webhook endpoints for external services.

**Outgoing:**

- None detected. No external webhook notifications.
- All notifications are internal (email via SES, in-app alerts via pg-boss jobs)

## External Data Sources

**RBI Master Data:**

- Examination areas, items, and regulatory parameters from RBI RBIA policy
- Source: `src/data/seed/` (deprecated for runtime) and seeded via `pnpm seed:master-directions`
- Implementation: Hardcoded in seed files, loaded once at DB initialization

**i18n Message Files:**

- 4 locales: English (en), Hindi (hi), Marathi (mr), Gujarati (gu)
- Source: `messages/{en,gu,hi,mr}.json`
- Framework: next-intl 4.8.2
- Usage: All UI text localized via `useTranslations()` hook

---

_Integration audit: 2026-02-22_
