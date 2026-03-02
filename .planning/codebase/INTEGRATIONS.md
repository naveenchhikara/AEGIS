# External Integrations

**Analysis Date:** 2026-03-02

## APIs & External Services

**AWS S3 (Evidence Storage):**

- Service: Amazon S3 (ap-south-1 Mumbai region for RBI data localization)
- Purpose: Evidence file storage for audit observations and action point findings
- SDK: `@aws-sdk/client-s3` 3.985.0, `@aws-sdk/s3-request-presigner` 3.985.0
- Implementation: `src/lib/s3.ts`
- File validation: Magic-byte detection via `file-type` (not extension-based)
- Allowed types: PDF, JPEG, PNG, DOCX, XLSX (max 10 MB per file)
- Presigned URLs: 5-minute expiry for secure uploads/downloads
- S3 Key pattern: `{tenantId}/evidence/{observationId}/{uuid}.{ext}`
- Credentials:
  - `AWS_ACCESS_KEY_ID` - AWS access key
  - `AWS_SECRET_ACCESS_KEY` - AWS secret key
  - `AWS_REGION` - Set to ap-south-1
  - `S3_BUCKET_NAME` - Evidence bucket name (e.g., `aegis-evidence-dev`)
- Entry points:
  - `src/actions/audit-execution/upload-examination-evidence.ts` - Examination evidence
  - `src/actions/investment/upload-is-audit-evidence.ts` - IS audit evidence
  - `src/actions/issues/verify-evidence.ts` - Issue verification evidence
  - `src/actions/governance/upload-minutes.ts` - Meeting minutes
  - `src/actions/rbia/bm-evidence.ts` - Benchmark evidence (BMRP-02)

**AWS SES (Email Notifications):**

- Service: Amazon Simple Email Service (ap-south-1 Mumbai region)
- Purpose: Transactional email notifications (escalations, digests, assignments)
- SDK: `@aws-sdk/client-sesv2` 3.985.0
- Implementation: `src/lib/ses-client.ts`
- From address: `SES_FROM_EMAIL` (default: `noreply@aegis.in`)
- Region: `AWS_SES_REGION` (ap-south-1)
- Credentials: Same AWS keys as S3
- Features:
  - HTML + text email bodies
  - Reply-to header support
  - Error logging with pino logger
- Email templates: `src/emails/templates/`
  - `escalation-email.tsx` - Compliance escalation notifications
  - `weekly-digest-email.tsx` - Weekly audit summary
  - `bulk-digest-email.tsx` - Bulk notification digest
  - `bm-batch-overdue-email.tsx` - Benchmark batch reminders
- Renderer: `src/emails/render.ts` (React Email component rendering)
- Job integration: `src/jobs/notification-processor.ts` (pg-boss consumer)
- Status: Optional in development (graceful degradation if not configured)

## Data Storage

**Databases:**

- **Type:** PostgreSQL 16
  - Provider: Official PostgreSQL (not managed service)
  - Connection: `DATABASE_URL` from `@prisma/client` + `pg` driver
  - Connection pool: pg.Pool with max 25 connections
  - Extensions: pgcrypto, pg_trgm
  - Region: Must be in ap-south-1 (Mumbai) for RBI compliance
- **ORM:** Prisma 7.4.1
  - Adapter: `@prisma/adapter-pg` (PostgreSQL native adapter)
  - Client location: `src/generated/prisma/`
  - Schema: `prisma/schema.prisma` (2,320 lines, 71 models, 20 enums)
  - Seed: `prisma/seed.ts` (1,690 lines - 10 users, 2 tenants, 39 exam areas, 568 items)
  - Migrations: Prisma + standalone SQL (`prisma/migrations/`, `prisma/*.sql`)
  - Push vs Migrate: Uses `db push` (no migration files tracked) + manual SQL for triggers
  - Tenant isolation: Application-level WHERE clauses via `prismaForTenant(tenantId)`, no RLS

**Models (71 total):**

- User, Tenant, Account, Session, FailedLoginAttempt (auth)
- AuditEngagement, ExaminationNode, ExaminationResponse, ActionPoint (audit execution)
- Observation, ComplianceItem, BranchResponse, ActionPlan (findings & compliance)
- RiskAssessment, RamParameter, Control, Issue (GRC)
- BranchRbiaScore, RbiaScoreMetadata (RBIA scoring)
- NotificationQueue, NotificationPreference (notifications)
- And 50+ domain-specific models

**File Storage:**

- **Primary:** AWS S3 (ap-south-1)
- **Fall back:** Database-stored file metadata (not actual file content) in Observation, ActionPoint, ComplianceItem
- **Local filesystem only:** Development only (S3 optional)

**Caching:**

- None configured - React Query handles client-side caching
- In-memory rate limiting in Better Auth (no caching layer)

## Authentication & Identity

**Auth Provider:**

- Better Auth 1.4.18 (self-hosted, database-backed)
  - Strategy: Email/password authentication
  - Adapter: `prismaAdapter(prisma)` for PostgreSQL
  - Session storage: Database (Session, Account tables)
- Implementation: `src/lib/auth.ts`, `src/app/api/auth/[...all]/route.ts`

**Session Management:**

- Session cookie: `__Secure-better-auth.session_token` (production), `better-auth.session_token` (dev)
- Storage: PostgreSQL Account, Session tables (Prisma-backed)
- Middleware: `src/middleware.ts` (edge-compatible cookie check) + dashboard layout (full validation)
- Idle timeout: Session duration managed by Better Auth (default: 30 days or custom)
- Concurrent limit: Max 2 sessions per user (multiSession plugin)

**Security Features:**

- Password hashing: bcryptjs 3.0.3 (compatible with Better Auth)
- Rate limiting: 10 login attempts per IP per 15 minutes
- Account lockout: 5 failed attempts → 30-minute lock (custom plugin: `src/lib/auth-lockout-plugin.ts`)
- Cookie security:
  - httpOnly: true (no JavaScript access)
  - secure: true (HTTPS only in production, detected from `BETTER_AUTH_URL`)
  - sameSite: lax (CSRF protection with top-level navigation)
- Validation: `BETTER_AUTH_SECRET` must be 32+ chars, hex-only (no base64 special chars)

**Authorization:**

- RBAC: 17 roles (AUDITOR, AUDIT_MANAGER, CAE, CCO, CEO, AUDITEE, BOARD_OBSERVER, LEAD_AUDITOR, FIELD_AUDITOR, BRANCH_HEAD, ZONAL_AUDITOR, ACE_OFFICER, CONCURRENT_AUDITOR, IS_AUDITOR, RISK_HEAD, ACB_MEMBER, SYSTEM_ADMIN)
- Multi-role support: Users can hold multiple roles; permission is union of all role permissions
- Session includes: `tenantId`, `roles` as custom fields
- Checking: `hasPermission(session.user, "permission.name")` in actions/pages
- Tenant isolation: `getRequiredSession()` enforces tenantId check - never accept from URL/body

## Monitoring & Observability

**Error Tracking:**

- Sentry `@sentry/nextjs` 10.39.0 (optional, conditional on `SENTRY_DSN`)
- Configuration:
  - `sentry.server.config.ts` - Server-side (Node.js runtime)
  - `sentry.client.config.ts` - Client-side (browser)
  - `sentry.edge.config.ts` - Edge runtime
- Features:
  - Trace sample rate: 0.1 (10% of errors)
  - Session replay: 100% on error, 0% otherwise
  - Browser error filters: ResizeObserver, network errors
  - Source map upload: Disabled by default, enabled in CI with `SENTRY_AUTH_TOKEN`
- Initialization: `src/instrumentation.ts` (register hook, server-side only)

**Logging:**

- Framework: pino 10.3.1
- Implementation: `src/lib/logger.ts`
- Appender: pino-pretty (dev), JSON to stdout (production for CloudWatch)
- Features:
  - Structured JSON logging
  - Automatic redaction of sensitive fields (password, token, secret, apiKey, authorization, cookie)
  - Request-scoped child loggers: `createRequestLogger({ userId, tenantId, requestId, method, path })`
  - ISO 8601 timestamps
  - Severity level formatting for CloudWatch Logs Insights
  - Base metadata: `{ service: "aegis" }`
- Usage: `logger.info()`, `logger.error()`, `logger.debug()` throughout app
- Entry points:
  - `src/lib/ses-client.ts` - Email errors
  - `src/lib/job-queue.ts` - pg-boss errors
  - `src/data-access/` - Query logging
  - `src/actions/` - Action execution logging

## CI/CD & Deployment

**Hosting:**

- VPS: 145.223.19.8 (4 vCPU, 16GB RAM, Ubuntu)
- Container management: Dockge (Docker stack GUI)
- Docker containers:
  - `aegis-app` - Next.js standalone on port 3000
  - `postgres-postgres-1` - PostgreSQL 16 on port 5432
- Runtime: Node.js 22-alpine (multi-stage Docker build)
- Reverse proxy: Nginx Proxy Manager (NPM) with SSL
- Domain: `aegis.nexlyadvisory.com` (SSL valid till 2026-05-21)

**CI Pipeline:**

- Platform: GitHub Actions
- Workflows:
  - `ci.yml` - Build + test (Vitest, Playwright)
  - `claude.yml` - Claude Code analysis/generation
  - `claude-code-review.yml` - Claude Code review automation
- Build process:
  1. `pnpm install --frozen-lockfile`
  2. `pnpm build` (Next.js with Turbopack)
  3. `pnpm test:unit` (Vitest)
  4. `pnpm test:e2e` (Playwright, serial, no parallelism)
  5. Docker build & push (if applicable)

**Deploy Workflow:**

1. Push to GitHub → GitHub Actions CI
2. SSH to VPS → `git pull` in project dir
3. Dockge rebuilds Docker stack (`docker-compose.prod.yml`)
4. Container restart with new image
5. Run `prisma db push` inside container (post-deploy schema updates)
6. Disable triggers before seeding: `DISABLE TRIGGER USER`

**Production Build:**

- Output: Next.js standalone (`.next/standalone/`)
- Dockerfile: Multi-stage (deps → builder → runner)
- ENV vars at build time: `NEXT_PUBLIC_*` inlined by Next.js (must be set via ARG/ENV in Dockerfile)
- ENV vars at runtime: All others from `/docker/aegis/.env` file
- Health check: `GET http://127.0.0.1:3000/api/health` (use 127.0.0.1, not localhost for IPv6 compat)

## Environment Configuration

**Required env vars (production):**

- `DATABASE_URL` - PostgreSQL connection string (must not have special chars: `/`, `@`, `#`, `%`)
- `BETTER_AUTH_SECRET` - 32+ chars, hex-only (no `+`, `=`, `\`)
- `BETTER_AUTH_URL` - Auth base URL (e.g., `https://aegis.nexlyadvisory.com`)
- `NEXT_PUBLIC_APP_URL` - Client-side app URL (set at Docker build time as ARG)
- `AWS_REGION` - ap-south-1
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `S3_BUCKET_NAME` - S3 bucket name
- `AWS_SES_REGION` - ap-south-1 (or skip if email disabled)
- `SES_FROM_EMAIL` - Verified sender email (or skip if email disabled)

**Optional env vars:**

- `SENTRY_DSN` - Sentry server-side DSN (error tracking)
- `NEXT_PUBLIC_SENTRY_DSN` - Sentry client-side DSN
- `SENTRY_AUTH_TOKEN` - For source map upload in CI
- `NODE_ENV` - development/test/production (default: development)
- `SKIP_ENV_VALIDATION` - Set to 1 to skip validation in Docker builds

**Secrets location:**

- Development: `.env` file (git-ignored)
- Production: `/docker/aegis/.env` on VPS (Docker entrypoint loads with `--env-file`)
- CI: GitHub Actions secrets (SENTRY_AUTH_TOKEN, etc.)

## Webhooks & Callbacks

**Incoming:**

- `POST /api/auth/[...all]` - Better Auth endpoints (sign-in, sign-up, logout, session)
- `POST /api/exports/*` - Export triggers (findings, compliance, audit plans)
- `POST /api/reports/*` - Report generation (board report, gap analysis)
- `POST /api/dashboard` - Dashboard data endpoint
- `GET /api/health` - Health check (Docker)
- `GET /api/download` - File downloads (presigned S3 URLs)
- `POST /api/is-audit/checklist` - IS audit checklist template download
- `POST /api/loan-portfolio/template` - Loan portfolio template download

**Outgoing:**

- Email via AWS SES (no webhooks, one-way delivery)
  - To: User email addresses in Notification, ComplianceItem
  - Subject: Role-specific (escalation, digest, overdue notices)
  - Body: React Email templates (`src/emails/templates/`)
- No third-party webhooks configured
- No event streaming or pub/sub

## Data Localization & Compliance

**AWS Region:** ap-south-1 (Mumbai)

- S3 bucket location
- SES region
- All data must remain in India per RBI regulations

**No external APIs:**

- No Stripe, Twilio, GitHub, Slack integrations
- No third-party audit/compliance providers
- Self-contained platform using AWS managed services only

---

_Integration audit: 2026-03-02_
