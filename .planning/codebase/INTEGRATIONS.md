# External Integrations

**Analysis Date:** 2026-02-21

## APIs & External Services

**AWS (Amazon Web Services):**

- S3 (Simple Storage Service) - Evidence file storage
  - SDK: `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`
  - Region: ap-south-1 (Mumbai) for RBI data localization
  - Auth: `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` env vars
  - Bucket: `S3_BUCKET_NAME` (default: `aegis-evidence-dev`)
  - Features: Presigned URLs (5min expiry), magic-byte MIME validation
  - Allowed types: PDF, JPEG, PNG, DOCX, XLSX (max 10MB per file)
  - Implementation: `src/lib/s3.ts`

- SES (Simple Email Service) - Transactional email
  - SDK: `@aws-sdk/client-sesv2`
  - Region: ap-south-1 (Mumbai)
  - Auth: `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` env vars
  - From address: `SES_FROM_EMAIL` env var (default: `noreply@aegis.in`)
  - Status: Sandbox mode (verified addresses only); production access pending
  - Implementation: `src/lib/ses-client.ts`
  - Features: HTML + text body, reply-to support, error logging

## Data Storage

**Databases:**

- PostgreSQL 16
  - Provider: Self-hosted or managed
  - Connection: `DATABASE_URL` env var (postgresql://user:pass@host:port/db)
  - Client: `pg` 8.18.0 (native driver)
  - ORM: Prisma 7 via `@prisma/adapter-pg`
  - Connection pool: max 25 connections (configured in `src/lib/prisma.ts`)
  - Schema: 63 models, 16 enums, views for dashboard aggregations
  - Extensions: pgcrypto, pg_trgm
  - Isolation: Application-level tenant isolation (WHERE tenantId = $1 in DAL functions)
  - Logging: Query + error logs in development, error only in production

**File Storage:**

- AWS S3 (ap-south-1 Mumbai)
  - Bucket: configurable via `S3_BUCKET_NAME`
  - Evidence files: audit findings, observation attachments, reports
  - Presigned URLs: 5-minute expiry for download links
  - Fallback: Not storing files gracefully degrades when AWS credentials missing

**Caching:**

- None - No Redis/Memcached configured
- Server state caching: React Query handles in-memory caching
- Session storage: Database-backed via Better Auth + Prisma adapter

## Authentication & Identity

**Auth Provider:**

- Better Auth 1.4.18 (Custom, self-hosted)
  - Implementation: `src/lib/auth.ts`
  - Adapter: Prisma with PostgreSQL provider
  - Database tables: User, Account, Session, Verification, FailedLoginAttempt
  - Features:
    - Email/password authentication (requireEmailVerification: false)
    - UUID-based IDs (PostgreSQL-compatible)
    - Cookie-based sessions with configurable httpOnly/secure/sameSite
    - Session expiry: 30 minutes idle timeout
    - Rate limiting: 10 login attempts per IP per 15 minutes
    - Account lockout: 5 failed attempts → 30-minute lock
    - Concurrent sessions: Max 2 per user (multiSession plugin)
  - Credentials: Bcrypt hashing via bcryptjs 3.0.3
  - Cookies: `__Secure-better-auth.session_token` (prod), `better-auth.session_token` (dev)
  - Secret: `BETTER_AUTH_SECRET` env var (min 32 chars, hex-only)

**Authorization:**

- Role-Based Access Control (RBAC)
  - Roles: 17 defined in Prisma enum (AUDITOR, AUDIT_MANAGER, CAE, CCO, CEO, AUDITEE, BOARD_OBSERVER, LEAD_AUDITOR, FIELD_AUDITOR, BRANCH_HEAD, ZONAL_AUDITOR, ACE_OFFICER, CONCURRENT_AUDITOR, IS_AUDITOR, RISK_HEAD, ACB_MEMBER, SYSTEM_ADMIN)
  - Permissions: 60+ granular permissions per role
  - Implementation: `src/lib/permissions.ts`
  - Model: Multi-role per user; permission = union of all role permissions
  - Tenant isolation: getRequiredSession() provides tenantId from session, enforced in DAL functions

**Session Management:**

- Approach: Database-backed via Better Auth + Prisma
- Validation: getRequiredSession() helper in `src/data-access/session.ts`
- Middleware: Cookie check in `src/middleware.ts` (edge-compatible)
- Dashboard: Full session validation in layout before protected pages

## Monitoring & Observability

**Error Tracking:**

- None detected - No Sentry/Rollbar integration
- Logging captures errors to stdout (production) / console (development)

**Logs:**

- Framework: pino 10.3.1
- Transport:
  - Production: JSON logs to stdout (for CloudWatch/ELK/Datadog aggregation)
  - Development: pino-pretty (colorized, human-readable)
- Configuration: `src/lib/logger.ts`
- Features:
  - Automatic redaction of sensitive fields (password, token, authorization, cookie)
  - Base metadata: { service: "aegis" }
  - ISO 8601 timestamps
  - Request-scoped child loggers with context (userId, tenantId, requestId, method, path)
  - Severity: debug (dev), info (prod)

**Health Checks:**

- Endpoint: `GET /api/health`
- Docker: Checked every 30s, 40s start period, 3 retries
- Implementation: Next.js API route (empty 200 response confirms app up)

## CI/CD & Deployment

**Hosting:**

- VPS (Ubuntu, 4 vCPU, 16GB RAM)
- Container: Docker with multi-stage build (node:22-alpine)
- Process Manager: systemd (`aegis.service`) or Dockge
- Reverse Proxy: Nginx with SSL (Let's Encrypt)
- Database: PostgreSQL 16 (Docker container or managed)

**CI Pipeline:**

- GitHub Actions
  - `ci.yml`: Build + test (pnpm build, pnpm test:e2e, pnpm lint)
  - `claude.yml`: Claude Code integration hook
  - `claude-code-review.yml`: Automated code review
- Docker build: Multi-stage, standalone output
- Trigger: Push to main branch

**Deployment Steps:**

1. GitHub Actions builds Docker image
2. Push to registry (or local build on VPS)
3. Docker Compose pulls/builds service
4. Prisma migrations/schema push (manual or pre-deployment step)
5. Systemd restart or container restart
6. Health check validation

## Environment Configuration

**Required env vars:**

Server-side (mandatory unless SKIP_ENV_VALIDATION=1):

- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Auth secret (min 32 chars, hex-only)
- `BETTER_AUTH_URL` - Auth origin (must match cookie domain)

Client-side (mandatory):

- `NEXT_PUBLIC_APP_URL` - App URL visible to browser (inlined at build time)

Optional (features degrade gracefully when missing):

- `AWS_REGION` - AWS region (default: ap-south-1)
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `S3_BUCKET_NAME` - S3 bucket name (default: aegis-evidence-dev)
- `AWS_SES_REGION` - SES region (default: ap-south-1)
- `SES_FROM_EMAIL` - Email from address (default: noreply@aegis.in)

Build-time controls:

- `SKIP_ENV_VALIDATION=1` - Skip Zod validation (Docker builds)
- `CI=true` - Enable CI mode (Playwright retries)
- `NODE_ENV=production` - Production mode

**Secrets location:**

- Development: `.env` file (git-ignored)
- Docker: Environment variables in docker-compose.yml or `.env` file
- Production: VPS environment (`/docker/aegis/.env` or systemd unit)
- Build-time NEXT*PUBLIC*\*: Docker build ARGs (e.g., `--build-arg NEXT_PUBLIC_APP_URL=...`)

**Secret patterns:**

- Database password: alphanumeric only (no `/`, `@`, `#`, `%`, `?`, `=`)
- BETTER_AUTH_SECRET: hex-only (no `+`, `=`, `\`)
- AWS keys: standard AWS format

## Webhooks & Callbacks

**Incoming:**

- None detected - No external webhook subscriptions

**Outgoing:**

- Email via AWS SES (transactional only, not webhooks)
  - Observation assignment notifications
  - Escalation alerts
  - Weekly digest summaries
  - Board report scheduling
- Implementation: React Email templates in `src/emails/`, sent via `src/lib/ses-client.ts`

**Job Queue Events:**

- pg-boss jobs (internal PostgreSQL-backed):
  - PROCESS_NOTIFICATIONS - Every minute
  - DEADLINE_CHECK - Daily 06:00 IST
  - SEND_WEEKLY_DIGEST - Monday 10:00 IST
  - GENERATE_BOARD_REPORT - Ad-hoc
  - SNAPSHOT_METRICS - Daily 01:00 IST
- Retry: 3 attempts with exponential backoff
- Retention: 30 days before deletion

---

_Integration audit: 2026-02-21_
