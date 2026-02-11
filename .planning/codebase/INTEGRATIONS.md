# External Integrations

**Analysis Date:** 2026-02-08
**Updated:** 2026-02-11 (post v2.0 MVP)

## APIs & External Services

**AWS S3 — Evidence File Storage:**

- Service: Amazon S3 (ap-south-1 Mumbai)
- Usage: Upload, download, and manage audit evidence files (PDF, JPEG, PNG, DOCX, XLSX, CSV, JSON)
- Client: `src/lib/s3.ts` (PutObject, GetObject, presigned URLs)
- Bucket: `aegis-evidence-dev` (configurable via `S3_BUCKET_NAME` env var)
- Encryption: SSE-S3 (server-side encryption)
- Auth: AWS access key + secret key
- Env vars: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`

**AWS SES — Email Notifications:**

- Service: Amazon SES v2 (ap-south-1 Mumbai)
- Usage: Transactional emails for observation assignments, responses, reminders, escalations, weekly digests
- Client: `src/lib/ses-client.ts` (SESv2Client)
- Templates: `src/emails/templates/` (6 React email templates)
  - `assignment-email.tsx` — New observation assigned to auditee
  - `response-email.tsx` — Auditee response notification
  - `reminder-email.tsx` — Deadline reminders (7d, 3d, 1d)
  - `escalation-email.tsx` — Overdue observation escalation
  - `weekly-digest-email.tsx` — CAE/CCO weekly summary
  - `bulk-digest-email.tsx` — Batched bulk operation notifications
- Rendering: `src/emails/render.ts`
- Layout: `src/emails/email-base-layout.tsx`
- Status: Code complete. **DNS CNAME records for SES domain verification not yet added** — email sending untested in production.
- Env vars: `AWS_SES_REGION`, `SES_FROM_EMAIL`

## Data Storage

**PostgreSQL — Primary Database:**

- ORM: Prisma 7.3.0
- Schema: `prisma/schema.prisma` (865 lines, 23 models)
- Multi-tenancy: Row-Level Security (tenant isolation at database level)
- Key models: Tenant, User, Observation, Evidence, ComplianceRequirement, AuditPlan, AuditEngagement, AuditLog, NotificationQueue, EmailLog, BoardReport, DashboardSnapshot, OnboardingProgress
- Connection: `DATABASE_URL` env var
- Scripts: `pnpm db:generate`, `pnpm db:push`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm db:studio`

**AWS S3 — Evidence File Storage:**

- See APIs section above
- Evidence model in Prisma: `s3Key`, `fileSize`, `contentType`, `uploadedBy`
- Tenant-scoped paths prevent cross-tenant file access

## Authentication & Identity

**Better Auth v1.4.18:**

- Provider: Email/password authentication
- Session: Secure cookies (httpOnly, sameSite=lax, secure in production)
- Storage: Prisma adapter → PostgreSQL (User, Session, Account, Verification models)
- Security features:
  - Rate limiting: 10 login attempts per 15min per IP
  - Account lockout: 5 failures → 30-min lock with auto-unlock
  - Concurrent sessions: Max 2 per user
- RBAC: 7 roles (Auditor, Audit Manager, CAE, CCO, CEO, Auditee, Admin)
- Files: `src/lib/auth.ts` (server), `src/lib/auth-client.ts` (client hooks)
- Env vars: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`

## Background Jobs

**pg-boss v12.9.0:**

- Service: PostgreSQL-based job queue
- Usage: Deadline reminders, weekly digests, daily dashboard snapshots
- Scheduling: Cron-based (e.g., daily snapshots at 01:00 IST)
- Processing: Batch processing 10 tenants at a time to prevent connection pool exhaustion
- Depends on: PostgreSQL (same database)

## Monitoring & Observability

**Health Check:**

- Endpoint: `/api/health` (used by Dockerfile health check)
- Implementation: `src/app/api/health/route.ts`

**Error Tracking:**

- None configured (recommended: add before pilot)

**Logs:**

- Console logging in development
- Append-only AuditLog in database for all data-modifying actions
- No structured logging framework (recommended: add pino or winston)

## CI/CD & Deployment

**Hosting:**

- AWS Lightsail Mumbai (ap-south-1) via Coolify self-hosted PaaS
- PostgreSQL database managed via Coolify

**Container:**

- Dockerfile: Multi-stage build (63 lines)
  - Stage 1 (deps): Install pnpm dependencies
  - Stage 2 (builder): Prisma generate + Next.js build (standalone output)
  - Stage 3 (runner): node:22-alpine, health check via wget
- Start command: `node server.js`

**CI Pipeline:**

- None — no `.github/workflows/` directory
- Manual deployment via Coolify dashboard
- Recommended: Add GitHub Actions for lint, type-check, E2E tests, and auto-deploy

## Environment Configuration

**Required env vars (52 total in `.env.example`):**

- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — Auth session encryption key
- `BETTER_AUTH_URL` — Application base URL
- `NEXT_PUBLIC_APP_URL` — Public-facing URL
- `AWS_REGION` — S3 region (ap-south-1)
- `AWS_ACCESS_KEY_ID` — AWS credentials
- `AWS_SECRET_ACCESS_KEY` — AWS credentials
- `S3_BUCKET_NAME` — Evidence storage bucket
- `AWS_SES_REGION` — SES region (ap-south-1)
- `SES_FROM_EMAIL` — Sender email address

**Secrets location:**

- Local: `.env` file (gitignored)
- Production: Coolify environment variables

## Webhooks & Callbacks

**Incoming:**

- None

**Outgoing:**

- None (email notifications are push-based via SES, not webhook)

## Third-Party SDKs

**Google Fonts:**

- Service: Google Fonts CDN
- Usage: Font loading via `next/font/google`
- Fonts: Noto Sans, Noto Sans Devanagari, Noto Sans Gujarati, DM Serif Display
- No API key required

## Future Integrations (Planned)

**TOTP/MFA (before Pilot B):**

- Better Auth supports TOTP plugin
- Required before banks load real data

**DAKSH Export:**

- Formatted Excel export for manual upload to RBI DAKSH portal
- No API integration planned (RBI doesn't offer public API)

**CI/CD Pipeline:**

- GitHub Actions for automated testing and deployment
- Trigger: Push to main branch
- Steps: lint → type-check → E2E tests → build → deploy to Coolify

---

_Integration audit: 2026-02-08_
_Updated: 2026-02-11 — reflects v2.0 Working Core MVP (shipped 2026-02-10)_
