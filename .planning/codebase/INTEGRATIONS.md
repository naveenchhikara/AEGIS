# External Integrations

**Analysis Date:** 2026-02-25

## APIs & External Services

**Error Tracking:**

- Sentry - Application error monitoring and performance tracing
  - SDK: `@sentry/nextjs` 10.39.0
  - Config: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
  - Auth: `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` (CI source maps)
  - Optional — app degrades gracefully when not configured

## Data Storage

**Databases:**

- PostgreSQL 16
  - Connection: `DATABASE_URL` env var (full connection string)
  - Optional compose vars: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`
  - Client: Prisma 7 ORM via `@prisma/adapter-pg` (pg.Pool, max 25 connections)
  - Extensions: `pgcrypto`, `pg_trgm`
  - Client generated to: `src/generated/prisma/`
  - Config: `prisma/schema.prisma` (71 models, 20 enums, 2320 lines)
  - Manual SQL applied separately: `prisma/*.sql` (views, triggers — not in Prisma migrations)
  - Views: `v_compliance_summary`, `v_observation_severity`, `v_audit_coverage_branch`, `fn_dashboard_health_score`

**File Storage:**

- AWS S3 (Mumbai region, ap-south-1)
  - SDK: `@aws-sdk/client-s3` 3.985.0, `@aws-sdk/s3-request-presigner` 3.985.0
  - Auth: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`
  - Used for: audit evidence file uploads
  - Pre-signed URLs for direct browser upload/download
  - CSP allows: `https://*.s3.ap-south-1.amazonaws.com`
  - Client wrapper: `src/lib/` (S3 utilities)
  - Optional — features degrade gracefully when not configured

**Caching:**

- None (no Redis or external cache layer)

**Job Queue:**

- pg-boss 12.9.0 — PostgreSQL-backed background job queue
  - Uses same `DATABASE_URL` PostgreSQL database
  - Job registration: `src/instrumentation.ts` (Next.js instrumentation hook)
  - Job handlers: `src/jobs/` (reminders, escalation, email digest)
  - Server-externalized from Next.js bundle

## Authentication & Identity

**Auth Provider:**

- Better Auth 1.4.18 — self-hosted, no external auth service
  - Implementation: email/password with bcryptjs hashing
  - Sessions: database-backed via Prisma adapter
  - Session cookie: `__Secure-better-auth.session_token` (prod), `better-auth.session_token` (dev)
  - RBAC: 17 roles, 60+ permissions, multi-role users (union of permissions)
  - Rate limiting: 10 login attempts per IP per 15 minutes
  - Account lockout: 5 failed attempts → 30-minute lockout
  - Concurrent sessions: max 2 per user
  - Auth config: `src/lib/auth.ts` (assumed location)
  - Session helper: `getRequiredSession()` from `src/data-access/session.ts` — use exclusively, never accept tenantId from URL/body

## Monitoring & Observability

**Error Tracking:**

- Sentry (`@sentry/nextjs` 10.39.0) — optional, configured via `SENTRY_DSN`
  - Source maps uploaded in CI when `SENTRY_AUTH_TOKEN` is set
  - CSP allows: `https://*.ingest.sentry.io`

**Logs:**

- pino 10.3.1 — structured JSON logging in production
- pino-pretty 13.1.3 — formatted dev logs
- Usage: structured logging throughout server-side code

## Email

**Email Provider:**

- AWS SES (Simple Email Service) — Mumbai region (ap-south-1)
  - SDK: `@aws-sdk/client-sesv2` 3.985.0
  - Auth: `AWS_SES_REGION`, `SES_FROM_EMAIL`
  - Templates: `src/emails/` — React Email components (assignment, escalation, digest)
  - Template dev: `react-email` 5.2.8 for local preview
  - Components: `@react-email/components` 1.0.8
  - Status: SES sandbox mode — email only goes to verified addresses; production access pending
  - Optional in development — degrades gracefully

## CI/CD & Deployment

**Hosting:**

- VPS: 4 vCPU, 16GB RAM, Ubuntu (IP: 145.223.19.8)
- Docker container `aegis-app` on port 3000, managed via Dockge
- Nginx Proxy Manager with SSL (Let's Encrypt) on `aegis.nexlyadvisory.com`
- Process: systemd `aegis.service`

**CI Pipeline:**

- GitHub Actions
  - `ci.yml` — build + test
  - `claude.yml` — Claude Code automation
  - `claude-code-review.yml` — automated code review
  - Source map upload to Sentry when `SENTRY_AUTH_TOKEN` is set in CI

**Infrastructure as Code:**

- AWS CDK in `infra/` directory

## Internationalization

**i18n Provider:**

- next-intl 4.8.3
  - Locales: English (`en`), Hindi (`hi`), Marathi (`mr`), Gujarati (`gu`)
  - Message files: `messages/{en,hi,mr,gu}.json`
  - Plugin integrated into `next.config.ts` via `createNextIntlPlugin()`

## Webhooks & Callbacks

**Incoming:**

- None detected (no third-party webhook endpoints)

**Outgoing:**

- None detected (no outbound webhook calls)

## Environment Configuration

**Required env vars:**

- `DATABASE_URL` — PostgreSQL connection string (no special chars: `/`, `@`, `#`, `%`, `?`, `=`)
- `BETTER_AUTH_SECRET` — min 32 chars, hex-only (no `+`, `=`, `\`)
- `BETTER_AUTH_URL` — auth base URL
- `NEXT_PUBLIC_APP_URL` — client-side app URL (must be set at Docker BUILD time)

**Optional env vars (degrade gracefully):**

- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME` — S3 file storage
- `AWS_SES_REGION`, `SES_FROM_EMAIL` — email sending
- `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` — error tracking

**Secrets location:**

- `.env` file (local development, never committed)
- `/docker/aegis/.env` on VPS for production
- `SKIP_ENV_VALIDATION=1` bypasses Zod validation during Docker builds

---

_Integration audit: 2026-02-25_
