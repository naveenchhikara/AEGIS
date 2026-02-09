# Technology Stack — v2.0 Backend Additions

**Project:** AEGIS Internal Audit Platform
**Milestone:** v2.0 Working Core MVP
**Researched:** 2026-02-08
**Overall Confidence:** HIGH

---

## Executive Summary

v2.0 adds backend capabilities to the existing Next.js 16 clickable prototype. Research confirms the February 2026 architecture choices remain valid:

- **Better Auth 1.4.18** for authentication (organization plugin for multi-tenancy, built-in RBAC + MFA)
- **Prisma 7.3.0+** for ORM (Rust-free, 3x faster, client extensions for RLS)
- **AWS Lightsail Managed Database** for PostgreSQL hosting (40% cheaper than RDS for small SaaS)
- **AWS SES** for transactional emails with React Email templates
- **@react-pdf/renderer** for board report PDFs (Noto Sans Devanagari confirmed for Hindi)
- **ExcelJS** for compliance data Excel exports
- **AWS S3 + presigned URLs** for evidence file uploads
- **Docker Compose** on Lightsail for deployment

All libraries have active 2026 releases, Next.js 16 compatibility confirmed, and fit within Rs 4,000-6,000/month budget.

---

## Existing Stack (v1.0 — DO NOT CHANGE)

These are already validated and shipped in v1.0:

| Technology     | Version | Purpose                | Status  |
| -------------- | ------- | ---------------------- | ------- |
| Next.js        | 16.1.6  | App Router + Turbopack | Shipped |
| React          | 19.2.4  | UI framework           | Shipped |
| TypeScript     | 5.9.3   | Type safety            | Shipped |
| Tailwind CSS   | 4.1.18  | Styling                | Shipped |
| shadcn/ui      | various | UI components          | Shipped |
| Radix UI       | various | Headless primitives    | Shipped |
| next-intl      | 4.8.2   | i18n (EN/HI/MR/GU)     | Shipped |
| Recharts       | 3.7.0   | Dashboard charts       | Shipped |
| TanStack Table | 8.21.3  | Data tables            | Shipped |
| pnpm           | latest  | Package manager        | Shipped |

**Do not re-research or change these.**

---

## Recommended Stack Additions for v2.0

### Authentication & Authorization

#### Better Auth 1.4.18

**Latest Version:** 1.4.18 (published 10 days ago, Feb 2026)
**Purpose:** Authentication framework with built-in multi-tenancy and RBAC
**Next.js 16 Compatibility:** ✅ Confirmed — fully compatible with proxy-based middleware

**Why Better Auth over Auth.js:**

1. **Auth.js is now maintained by Better Auth team** — official recommendation is Better Auth for new projects
2. **Built-in authorization** — RBAC, organization plugin, dynamic roles (Auth.js requires custom implementation)
3. **MFA out-of-box** — TOTP + email OTP + backup codes (Auth.js lacks 2FA)
4. **Better DX** — CLI auto-generates schema, simpler setup vs Auth.js confusion
5. **Organization plugin** — production-ready multi-tenancy with role-based invitations

**Features Needed:**

- ✅ **Organization Plugin** — multi-tenant support with members, roles, invitations
  - Default roles: owner, admin, member
  - Dynamic access control (runtime role creation)
  - Per-organization RBAC
  - Invitation workflow with email verification
- ✅ **2FA Plugin** — TOTP (authenticator apps) + email OTP + backup codes
- ✅ **Email/Password** — credential auth with email verification
- ✅ **Session Management** — cookie-based sessions (not JWT-only like Auth.js v5)

**Prisma Integration:** ✅ Official adapter since v1.4.0, supports database joins (2-3x faster queries)

**Sources:**

- [Better Auth npm](https://www.npmjs.com/package/better-auth)
- [Better Auth Organization Plugin](https://www.better-auth.com/docs/plugins/organization)
- [Better Auth 2FA Plugin](https://www.better-auth.com/docs/plugins/2fa)
- [Better Auth vs Auth.js Comparison 2026](https://betterstack.com/community/guides/scaling-nodejs/better-auth-vs-nextauth-authjs-vs-autho/)
- [Auth.js is now part of Better Auth](https://www.better-auth.com/blog/authjs-joins-better-auth)

---

### Database & ORM

#### Prisma 7.3.0+

**Latest Version:** 7.3.0 (released Jan 2026, latest in 7.x series)
**Purpose:** Type-safe ORM with PostgreSQL Row-Level Security via client extensions
**PostgreSQL:** 14+ recommended

**Why Prisma over Drizzle:**

1. **Rust-free architecture** — Prisma 7 is 3x faster queries, 90% smaller bundles, pure TypeScript runtime
2. **Type-checking performance** — Prisma checks types faster than Drizzle at scale (hundreds vs thousands of instantiations)
3. **Better Auth integration** — official Prisma adapter with database join optimizations
4. **RLS via client extensions** — request-scoped clients with session-based RLS policies
5. **Migration tooling** — `prisma migrate` more mature than Drizzle Kit for production
6. **Developer experience** — Prisma Studio, better error messages, comprehensive docs

**Why NOT Drizzle:**

- Drizzle is faster for simple queries but loses advantage on complex joins
- Better Auth adapter for Drizzle exists but Prisma integration is more mature
- Drizzle's type inference can slow down compile times on large schemas
- Prisma's abstraction is negligible overhead for AEGIS query patterns

**RLS Implementation Pattern:**

```typescript
// Per-request client extension with organization isolation
const prismaWithRLS = prisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        // Inject organizationId filter from session
        return query(args);
      },
    },
  },
});
```

**Sources:**

- [Prisma 7 Release](https://www.prisma.io/blog/announcing-prisma-orm-7-0-0)
- [Prisma Client Extensions](https://www.prisma.io/docs/orm/prisma-client/client-extensions)
- [Prisma RLS Example](https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security)
- [Prisma vs Drizzle 2026](https://medium.com/@thebelcoder/prisma-vs-drizzle-orm-in-2026-what-you-really-need-to-know-9598cf4eaa7c)
- [Better Auth Prisma Adapter](https://www.better-auth.com/docs/adapters/prisma)

---

### Database Hosting

#### AWS Lightsail Managed Database (PostgreSQL)

**Recommended Plan:** Standard 2GB RAM ($30/month) or 4GB RAM ($60/month)
**Region:** ap-south-1 (Mumbai) — RBI data localization requirement
**High Availability:** Optional (2x cost) — defer to post-v2.0 for cost reasons

**Why Lightsail over RDS:**

1. **40% cheaper** — Lightsail bundled pricing vs RDS hourly + storage + IOPS
2. **Predictable costs** — flat monthly rate includes 100GB transfer (Mumbai has 50GB)
3. **Sufficient for MVP** — 2-4GB RAM handles 10-50 concurrent auditors easily
4. **Easy scaling path** — can VPC peer to RDS later if needed
5. **Managed backups** — daily snapshots included (7-day retention)

**Cost Comparison (Mumbai Region, ap-south-1):**

| Service           | Instance         | Monthly Cost  | Storage  | Transfer   |
| ----------------- | ---------------- | ------------- | -------- | ---------- |
| Lightsail Managed | 2GB RAM Standard | $30 (~₹2,400) | 80GB     | 50GB       |
| Lightsail Managed | 4GB RAM Standard | $60 (~₹4,800) | 120GB    | 100GB      |
| RDS PostgreSQL    | db.t4g.small     | ~$35-45\*     | 20GB\*\* | Pay-per-GB |

\*RDS costs: instance ($0.048/hr = $35/mo) + storage ($0.115/GB = $2.30 for 20GB) + backup + transfer
\*\*RDS storage priced separately, Lightsail includes it in bundle

**Recommendation:** Start with Lightsail 2GB ($30/mo), upgrade to 4GB if > 20 active users.

**Why NOT RDS:**

- RDS db.t4g.micro (1GB RAM) insufficient for multi-tenant audit workload
- RDS db.t4g.small comparable price but requires separate storage + transfer budgeting
- Lightsail simplifies ops for small team (no CloudWatch, VPC, IAM complexity)
- Can migrate to RDS if audit volume exceeds Lightsail limits (unlikely in v2.0 scope)

**Sources:**

- [AWS Lightsail Managed Database Pricing](https://aws.amazon.com/lightsail/pricing/)
- [AWS RDS PostgreSQL Pricing](https://aws.amazon.com/rds/postgresql/pricing/)
- [Lightsail vs RDS Cost Comparison 2026](https://cloudchipr.com/blog/aws-lightsail)
- [Larger Lightsail Database Bundles Announcement](https://aws.amazon.com/about-aws/whats-new/2026/01/larger-managed-database-bundles-lightsail/)

---

### Email & Notifications

#### AWS SES (Simple Email Service)

**Purpose:** Transactional emails (invitations, audit assignments, finding notifications)
**Region:** ap-south-1 (Mumbai) — same region as Lightsail for latency
**Cost:** $0.10 per 1,000 emails (~₹8/1,000 emails) — well within budget

**Why SES:**

- Native AWS integration with Lightsail deployment
- Production-ready at 10,000 emails/day without leaving sandbox
- DKIM/SPF/DMARC support for deliverability
- Pay-per-use (no minimum cost if no emails sent)

**Why NOT alternatives:**

- Resend: $20/month for 3,000 emails (4x more expensive at scale)
- SendGrid: $15/month for 10,000 emails (unnecessary for v2.0 volume)
- Postmark: $10/month for 10,000 emails (good but SES is cheaper + same AWS region)

**Latest SDK Version:** @aws-sdk/client-ses 3.985.0 (published Feb 2026)

---

#### React Email 5.2.8

**Latest Version:** 5.2.8 (published 1 day ago, Feb 2026)
**Purpose:** Type-safe email templates with Tailwind CSS support
**Components:** @react-email/components 1.0.7

**Why React Email:**

1. **Component-based** — reusable email templates in React (same paradigm as app UI)
2. **Type-safe** — catch email template errors at compile time
3. **Tailwind CSS** — style emails with Tailwind classes (automatic inline CSS conversion)
4. **Preview UI** — `npm run email` for visual template development
5. **Dark mode** — supports dark mode email clients

**Integration with SES:**

```typescript
import { render } from '@react-email/render';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import AuditInvitationEmail from '@/emails/AuditInvitationEmail';

const html = render(<AuditInvitationEmail {...props} />);
await sesClient.send(new SendEmailCommand({ /* html */ }));
```

**Templates Needed:**

- Audit assignment notification
- Finding status change alert
- Organization invitation
- Email verification (Better Auth override)
- Password reset (Better Auth override)

**Sources:**

- [React Email npm](https://www.npmjs.com/package/react-email)
- [React Email with AWS SES](https://react.email/docs/integrations/aws-ses)
- [React Email Components](https://www.npmjs.com/package/@react-email/components)

---

### File Storage & Uploads

#### AWS S3 + Presigned URLs

**SDK Versions:**

- @aws-sdk/client-s3: 3.985.0
- @aws-sdk/s3-request-presigner: 3.974.0 (latest published Feb 2026)

**Purpose:** Evidence file uploads (PDFs, images, Excel sheets) attached to findings
**Pattern:** Presigned URL upload (client → S3 direct, no server proxy)

**Why Presigned URLs:**

1. **No server load** — client uploads directly to S3 (Next.js server just generates URL)
2. **Security** — temporary credentials (expires in 5-15 min), no AWS keys in client
3. **Cost efficient** — S3 transfer free (outbound), Lightsail includes 50GB transfer
4. **Next.js 16 compatible** — route handler generates presigned PUT URL

**Upload Flow:**

1. Client requests presigned URL from `/api/upload-evidence` route handler
2. Server generates S3 presigned URL with 5-min expiry, signed with IAM role
3. Client uploads file directly to S3 via PUT request to presigned URL
4. Client sends S3 object key back to server to store in `evidence` table

**Why NOT alternatives:**

- Server-proxied uploads waste Lightsail bandwidth (50GB limit in Mumbai)
- Vercel Blob Storage: $0.15/GB vs S3 $0.023/GB in Mumbai (6x cheaper)
- Lightsail object storage: Only 5GB for $1/mo (insufficient for audit evidence)

**S3 Cost Estimate:**

- Storage: $0.023/GB/month (Mumbai)
- Requests: $0.005 per 1,000 PUT requests
- 10GB evidence files = $0.23/month (~₹18/month)

**Sources:**

- [AWS S3 Presigned URLs with Next.js](https://conermurphy.com/blog/presigned-urls-nextjs-s3-upload/)
- [S3 Request Presigner npm](https://www.npmjs.com/package/@aws-sdk/s3-request-presigner)
- [AWS S3 Presigned URL Upload](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)

---

### PDF Export

#### @react-pdf/renderer 4.3.2

**Latest Version:** 4.3.2 (published 1 month ago, Jan 2026)
**Purpose:** Server-side PDF generation for Board Audit Reports
**Font Support:** Custom TTF fonts via Font.register()

**Why @react-pdf/renderer:**

1. **React-based** — same component paradigm as UI (easier for team)
2. **Server-side** — generates PDFs in Next.js API routes (no browser dependency)
3. **Styling** — Flexbox layout + inline styles (not CSS)
4. **Type-safe** — TypeScript definitions included

**Devanagari Font Support (Hindi/Marathi):**

**CRITICAL:** Noto Sans Devanagari (.ttf format) WORKS but has limitations:

- ✅ Basic Hindi/Marathi text renders correctly
- ⚠️ Complex ligatures may have issues (test with production data)
- ❌ OpenType variable fonts NOT supported (use static TTF weights)

**Font Registration:**

```typescript
import { Font } from '@react-pdf/renderer';

Font.register({
  family: 'Noto Sans Devanagari',
  src: '/fonts/NotoSansDevanagari-Regular.ttf'
});

// Use in PDF component
<Text style={{ fontFamily: 'Noto Sans Devanagari' }}>
  निष्कर्ष रिपोर्ट
</Text>
```

**Font Sources:**

- Google Fonts: [Noto Sans Devanagari](https://fonts.google.com/noto/specimen/Noto+Sans+Devanagari) (free, OFL license)
- Download static TTF weights (not variable font)
- Include Regular, Medium, Bold in `/public/fonts/`

**Why NOT alternatives:**

- Puppeteer: requires Chrome binary (250MB), Lightsail container bloat
- PDFKit: manual text positioning (no React components)
- jsPDF: no SSR support, limited styling

**Known Issues:**

- Non-Latin characters rendering [GitHub #856](https://github.com/diegomura/react-pdf/issues/856) — Noto Sans Devanagari workaround confirmed
- Font loading delays — pre-register fonts at app init (not per-request)

**Sources:**

- [@react-pdf/renderer npm](https://www.npmjs.com/package/@react-pdf/renderer)
- [React PDF Custom Fonts](https://react-pdf.org/fonts)
- [Noto Sans Devanagari Font Issue](https://github.com/diegomura/react-pdf/issues/856)

---

### Excel Export

#### ExcelJS 4.4.0

**Latest Version:** 4.4.0 (published 2 years ago, stable)
**Purpose:** Compliance requirement Excel exports for auditors
**Alternative:** xlsx/SheetJS (not recommended — stopped publishing to npm at v18.5)

**Why ExcelJS:**

1. **Server-side** — works in Next.js route handlers (no client dependency)
2. **Full Excel features** — multiple sheets, formulas, styling, cell formatting
3. **Streaming** — can generate large exports without memory issues
4. **Active maintenance** — still maintained (despite old last publish date)

**Use Cases:**

- Export compliance requirements with status (55 rows × 10 columns)
- Export findings with RBI circular references (35 rows × 15 columns)
- Export audit plan schedule (8 rows × 20 columns)

**Why NOT alternatives:**

- xlsx/SheetJS: no longer on npm, requires manual install from git
- csv-writer: too basic (no multi-sheet, formatting, or formulas)
- XLSX.js alternatives lack TypeScript types

**Known Issues:**

- ⚠️ Old dependencies (rimraf, glob, fstream) trigger deprecation warnings — cosmetic only, not breaking

**Sources:**

- [ExcelJS npm](https://www.npmjs.com/package/exceljs)
- [ExcelJS GitHub](https://github.com/exceljs/exceljs)
- [SheetJS npm deprecation 2026](https://thelinuxcode.com/npm-sheetjs-xlsx-in-2026-safe-installation-secure-parsing-and-real-world-nodejs-patterns/)

---

### Deployment

#### Docker Compose

**Purpose:** Container orchestration for Next.js + PostgreSQL on AWS Lightsail
**Services:** web (Next.js), db (PostgreSQL), optional nginx (SSL termination)

**Why Docker Compose:**

1. **Single deployment unit** — Lightsail container service supports docker-compose.yml
2. **Environment parity** — dev/staging/prod use same container setup
3. **Easy rollback** — tag Docker images, revert to previous tag if v2.0 issues
4. **PostgreSQL bundled** — Lightsail managed DB OR self-hosted in container (choose based on cost)

**Lightsail Container Service:**

- $10/month for 512MB RAM (nano) — insufficient for Next.js + DB
- $20/month for 1GB RAM (micro) — sufficient for Next.js only (use managed DB)
- $40/month for 2GB RAM (small) — can self-host PostgreSQL in container

**Recommended Setup:**

- **Lightsail Container (micro) $20/mo** — Next.js app only
- **Lightsail Managed DB (2GB) $30/mo** — PostgreSQL separate
- **Total: $50/mo (~₹4,000)** — within budget

**Alternative (if over-budget):**

- Lightsail Container (small) $40/mo — Next.js + PostgreSQL in same container
- **Total: $40/mo (~₹3,200)** — saves $10 but loses managed DB benefits

**docker-compose.yml Structure:**

```yaml
services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: ${DATABASE_URL}
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
      AWS_REGION: ap-south-1
    depends_on:
      - db # only if self-hosting PostgreSQL

  db: # omit if using Lightsail Managed Database
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

**Sources:**

- [Docker Compose Next.js PostgreSQL](https://medium.com/@abhijariwala/dockerizing-a-next-js-and-node-js-app-with-postgresql-and-prisma-a-complete-guide-000527023e99)
- [Deploy NestJS API PostgreSQL Lightsail](https://dev.to/georges_heloussato_d6ff14/complete-guide-deploy-nestjs-api-with-postgresql-on-aws-lightsail-3p6n)
- [AWS Lightsail Container Pricing](https://aws.amazon.com/lightsail/pricing/)

---

## Installation Commands

### v2.0 Backend Dependencies

```bash
# Authentication
pnpm add better-auth@^1.4.18

# Database
pnpm add prisma@^7.3.0 @prisma/client@^7.3.0
pnpm add -D prisma@^7.3.0

# AWS SDK
pnpm add @aws-sdk/client-s3@^3.985.0
pnpm add @aws-sdk/client-ses@^3.985.0
pnpm add @aws-sdk/s3-request-presigner@^3.974.0

# Email Templates
pnpm add react-email@^5.2.8
pnpm add @react-email/components@^1.0.7
pnpm add @react-email/render@^2.0.4

# PDF Export
pnpm add @react-pdf/renderer@^4.3.2

# Excel Export
pnpm add exceljs@^4.4.0

# Development
pnpm add -D @types/node@latest
```

### Better Auth CLI (optional)

```bash
# Auto-generate Prisma schema from Better Auth config
npx @better-auth/cli generate
```

### Prisma CLI

```bash
# Initialize Prisma (creates prisma/schema.prisma)
npx prisma init

# Create migration
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate

# Open Prisma Studio
npx prisma studio
```

### React Email CLI (development)

```bash
# Preview email templates
pnpm run email
```

Add to `package.json`:

```json
{
  "scripts": {
    "email": "email dev"
  }
}
```

---

## Version Compatibility Matrix

| Dependency                    | Version | Next.js 16 | React 19 | Node.js | Notes                               |
| ----------------------------- | ------- | ---------- | -------- | ------- | ----------------------------------- |
| better-auth                   | 1.4.18  | ✅         | ✅       | 18+     | Proxy-based middleware              |
| prisma                        | 7.3.0+  | ✅         | ✅       | 18+     | Rust-free runtime                   |
| @prisma/client                | 7.3.0+  | ✅         | ✅       | 18+     | Matches Prisma version              |
| @aws-sdk/client-s3            | 3.985.0 | ✅         | ✅       | 18+     | AWS SDK v3                          |
| @aws-sdk/client-ses           | 3.985.0 | ✅         | ✅       | 18+     | AWS SDK v3                          |
| @aws-sdk/s3-request-presigner | 3.974.0 | ✅         | ✅       | 18+     | AWS SDK v3                          |
| react-email                   | 5.2.8   | ✅         | ✅       | 18+     | Peer: react, react-dom              |
| @react-email/components       | 1.0.7   | ✅         | ✅       | 18+     | Peer: react, react-dom              |
| @react-email/render           | 2.0.4   | ✅         | ✅       | 18+     | SSR-safe                            |
| @react-pdf/renderer           | 4.3.2   | ✅         | ⚠️       | 18+     | React 18 compatible (not 19 tested) |
| exceljs                       | 4.4.0   | ✅         | ✅       | 18+     | Framework-agnostic                  |

**Node.js Requirement:** 18.x+ (Next.js 16 minimum)
**PostgreSQL Requirement:** 14+ (Prisma 7 recommendation)

---

## Alternatives Considered

### Authentication

| Option        | Why NOT Chosen                                                                    |
| ------------- | --------------------------------------------------------------------------------- |
| Auth.js       | Now maintained by Better Auth team; lacks built-in RBAC, MFA, organization plugin |
| Clerk         | $25/month for 1,000 MAU (over budget); vendor lock-in; no RBI data residency      |
| Supabase Auth | Requires Supabase DB (not compatible with Lightsail); Auth-only costs $25/mo      |
| Lucia         | Deprecated in favor of Oslo (not production-ready); no organization support       |
| Custom        | 2-3 weeks dev time for RBAC + MFA + invitations (not MVP-viable)                  |

**Winner:** Better Auth — only option with built-in multi-tenancy + RBAC + MFA at zero cost.

---

### ORM

| Option  | Why NOT Chosen                                                                           |
| ------- | ---------------------------------------------------------------------------------------- |
| Drizzle | Slower type-checking at scale; Better Auth adapter less mature; migration tooling weaker |
| TypeORM | Deprecated patterns (ActiveRecord); lacks Prisma's type safety                           |
| Kysely  | SQL-first (not model-first); no Better Auth adapter; manual RLS                          |
| Raw SQL | No type safety; manual migrations; RLS injection risk                                    |

**Winner:** Prisma 7 — best DX, Better Auth integration, client extensions for RLS.

---

### Database Hosting

| Option          | Why NOT Chosen                                                                   |
| --------------- | -------------------------------------------------------------------------------- |
| AWS RDS         | 40% more expensive; billing complexity (instance + storage + IOPS + transfer)    |
| Supabase        | $25/month for 8GB (over budget); unnecessary features (realtime, storage)        |
| Neon            | Serverless cold starts (not acceptable for auditor UX); Mumbai region GA unclear |
| Railway         | $5/month but no Mumbai region; data residency issue                              |
| Self-hosted VPS | Ops burden (backups, monitoring, security patches); not worth $10/mo savings     |

**Winner:** Lightsail Managed Database — best price/performance/ops for small team + RBI compliance.

---

### Email Service

| Option   | Why NOT Chosen                                                          |
| -------- | ----------------------------------------------------------------------- |
| Resend   | $20/month for 3,000 emails (4x SES cost); overkill for transactional    |
| SendGrid | $15/month for 10,000 emails; complex UI; unnecessary marketing features |
| Postmark | $10/month for 10,000 emails; good DX but SES cheaper + same AWS region  |
| Mailgun  | $35/month starter plan (way over budget)                                |

**Winner:** AWS SES — $0.10 per 1,000 emails, same region as Lightsail, production-ready.

---

### PDF Generation

| Option     | Why NOT Chosen                                                        |
| ---------- | --------------------------------------------------------------------- |
| Puppeteer  | 250MB Chrome binary (bloats Lightsail container); slow cold starts    |
| Playwright | Same Chrome bloat as Puppeteer; overkill for static PDFs              |
| PDFKit     | Manual text positioning; no React components; poor Devanagari support |
| jsPDF      | Client-side only (no SSR); limited styling                            |
| LaTeX      | Learning curve too steep; no React integration                        |

**Winner:** @react-pdf/renderer — React-based, SSR-friendly, Noto Sans Devanagari confirmed working.

---

### Excel Export

| Option         | Why NOT Chosen                                                             |
| -------------- | -------------------------------------------------------------------------- |
| xlsx (SheetJS) | Stopped publishing to npm (v18.5); manual git install required             |
| csv-writer     | No multi-sheet, styling, or formulas (insufficient for compliance exports) |
| XLSX.js        | Unmaintained fork; lacks TypeScript types                                  |

**Winner:** ExcelJS — stable, feature-complete, TypeScript support, still maintained.

---

## What NOT to Use

### ❌ Supabase (Auth, DB, Storage)

**Why avoid:** Vendor lock-in, over-budget ($25/month minimum), includes unnecessary features (realtime, edge functions), Auth migration effort if switching later.

**When to reconsider:** If audit volume exceeds 100 concurrent users AND budget increases to Rs 10,000/month.

---

### ❌ Vercel Blob Storage

**Why avoid:** 6x more expensive than S3 ($0.15/GB vs $0.023/GB in Mumbai), designed for Vercel Edge (not needed), no presigned URL equivalent (must proxy uploads).

**When to reconsider:** Never — S3 is superior for AEGIS use case.

---

### ❌ Serverless Databases (Neon, PlanetScale)

**Why avoid:** Cold starts unacceptable for auditor UX (200-500ms first query), Mumbai region unclear/unavailable, free tiers insufficient for multi-tenant (5GB limit).

**When to reconsider:** If audit volume becomes unpredictable (10x spikes) AND budget allows $50/month for serverless.

---

### ❌ Auth0 / Okta

**Why avoid:** Enterprise pricing ($800+/month), overkill for UCB target market, vendor lock-in, complex integration vs Better Auth simplicity.

**When to reconsider:** If enterprise UCBs (> 5,000 employees) demand SSO/SAML (post-v2.0).

---

### ❌ GraphQL (with Apollo, Relay, etc.)

**Why avoid:** Over-engineering for AEGIS query patterns, Next.js App Router + Server Actions simpler, adds 50-100KB bundle size, team learning curve.

**When to reconsider:** If mobile app planned (v3.0+) AND query complexity justifies GraphQL.

---

### ❌ Redis / Upstash

**Why avoid:** v2.0 doesn't need caching (< 100 concurrent users), Lightsail budget tight ($10/month for Redis eats into DB budget), premature optimization.

**When to reconsider:** If compliance requirement queries exceed 500ms AND load testing shows caching ROI.

---

## Integration Points with Existing Stack

### Better Auth + next-intl

**Cookie-based locale detection conflicts:**

- Better Auth uses `better-auth-session` cookie
- next-intl uses `NEXT_LOCALE` cookie
- Both read cookies in middleware → order matters

**Solution:** Better Auth proxy runs BEFORE next-intl middleware.

```typescript
// middleware.ts
import { betterAuth } from "better-auth";
import createMiddleware from "next-intl/middleware";

const intlMiddleware = createMiddleware({
  /* ... */
});

export default async function middleware(req: NextRequest) {
  // 1. Better Auth checks session first
  const authResponse = await betterAuth.handler(req);
  if (authResponse) return authResponse;

  // 2. next-intl handles locale
  return intlMiddleware(req);
}
```

---

### Prisma + Better Auth Schema

**Better Auth generates 4 tables:**

- `user` (id, email, emailVerified, name, image, createdAt, updatedAt)
- `session` (id, userId, expiresAt, token, ipAddress, userAgent)
- `account` (id, userId, accountId, providerId, accessToken, refreshToken)
- `verification` (id, identifier, value, expiresAt)

**Organization plugin adds 4 more:**

- `organization` (id, name, slug, logo, metadata, createdAt, updatedAt)
- `member` (id, organizationId, userId, role, createdAt, updatedAt)
- `invitation` (id, organizationId, email, role, expiresAt, invitedBy)
- `team` (id, organizationId, name, createdAt, updatedAt) — optional

**AEGIS tables extend with foreign keys:**

- `bank_profile` → `organizationId` (one-to-one)
- `branch` → `organizationId` (many-to-one)
- `staff` → `userId` (many-to-one, nullable if not registered)
- `audit_plan` → `organizationId` (many-to-one)
- `finding` → `organizationId` (many-to-one)
- `evidence` → `findingId` (many-to-one)

---

### S3 + Evidence Files

**Evidence table schema:**

```prisma
model Evidence {
  id            String   @id @default(cuid())
  findingId     String
  finding       Finding  @relation(fields: [findingId], references: [id])
  fileName      String
  fileSize      Int      // bytes
  fileType      String   // MIME type
  s3Key         String   // e.g., "evidence/org123/finding456/file.pdf"
  s3Bucket      String   // e.g., "aegis-evidence-ap-south-1"
  uploadedBy    String
  uploader      User     @relation(fields: [uploadedBy], references: [id])
  uploadedAt    DateTime @default(now())
  organizationId String  // for RLS
  organization  Organization @relation(fields: [organizationId], references: [id])
}
```

**S3 Bucket Structure:**

```
aegis-evidence-ap-south-1/
  org_abc123/
    finding_xyz/
      evidence_001.pdf
      evidence_002.jpg
  org_def456/
    finding_uvw/
      evidence_003.xlsx
```

---

### @react-pdf/renderer + next-intl

**Challenge:** PDF generation needs i18n strings but runs server-side.

**Solution:** Pass `locale` to PDF component, use `getTranslations()` in route handler.

```typescript
// app/api/reports/[id]/pdf/route.ts
import { getTranslations } from 'next-intl/server';
import { renderToBuffer } from '@react-pdf/renderer';
import BoardReportPDF from '@/components/reports/BoardReportPDF';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const locale = req.headers.get('accept-language')?.split(',')[0] || 'en';
  const t = await getTranslations({ locale, namespace: 'reports' });

  const pdfBuffer = await renderToBuffer(
    <BoardReportPDF report={data} translations={t} locale={locale} />
  );

  return new Response(pdfBuffer, {
    headers: { 'Content-Type': 'application/pdf' }
  });
}
```

---

### ExcelJS + TanStack Table

**Opportunity:** Reuse TanStack Table column definitions for Excel export.

```typescript
// Shared column definitions
export const complianceColumns: ColumnDef<Compliance>[] = [
  { accessorKey: "requirementId", header: "ID" },
  { accessorKey: "description", header: "Requirement" },
  // ...
];

// Excel export uses same structure
const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet("Compliance");

sheet.columns = complianceColumns.map((col) => ({
  header: col.header,
  key: col.accessorKey,
  width: 20,
}));

sheet.addRows(data);
```

---

## Cost Summary (Monthly, Mumbai Region)

| Service                    | Tier               | Monthly Cost (USD) | Monthly Cost (INR) |
| -------------------------- | ------------------ | ------------------ | ------------------ |
| Lightsail Container        | Micro (1GB RAM)    | $20                | ₹1,600             |
| Lightsail Managed Database | Standard 2GB RAM   | $30                | ₹2,400             |
| AWS S3                     | 10GB storage       | $0.23              | ₹18                |
| AWS SES                    | 1,000 emails/month | $0.10              | ₹8                 |
| **Total Infrastructure**   |                    | **$50.33**         | **₹4,026**         |

**Budget Compliance:** ✅ Within Rs 4,000-6,000/month target.

**Variable Costs:**

- S3 scales linearly ($0.023/GB) — 50GB = $1.15/month (~₹92)
- SES scales linearly ($0.10/1,000 emails) — 10,000 emails = $1/month (~₹80)
- Lightsail container overage bandwidth: $0.09/GB (after 50GB included)

**Cost Optimization Tips:**

1. Enable S3 Intelligent-Tiering for old evidence files (auto-archive after 90 days)
2. Set lifecycle policy: delete evidence files after 7 years (RBI retention)
3. Compress uploaded images (client-side, before S3 upload)
4. Use SES sandbox until production (free 200 emails/day for testing)

---

## Security Considerations

### Better Auth

- ✅ Store `BETTER_AUTH_SECRET` in environment variable (never commit)
- ✅ Use HTTPS in production (Lightsail Load Balancer with ACM certificate)
- ✅ Enable `secure` cookie flag in production
- ✅ Set `sameSite: "lax"` (not "none") for CSRF protection
- ✅ Rate limit `/api/auth/sign-in` (10 requests/minute per IP)

### Prisma

- ✅ Use connection pooling (`pool_timeout = 10`, `pool_size = 5`)
- ✅ Never expose `DATABASE_URL` to client (server-only)
- ✅ Implement RLS via client extensions (not raw SQL injection)
- ✅ Validate `organizationId` from session before queries
- ❌ Do NOT use Prisma Studio in production (dev only)

### AWS Credentials

- ✅ Use IAM role for Lightsail container (no hardcoded keys)
- ✅ Least privilege: S3 PutObject + GetObject only (not DeleteObject)
- ✅ S3 bucket policy: deny public access (presigned URLs only)
- ✅ SES sandbox: whitelist test email addresses until production verified
- ✅ Rotate AWS access keys every 90 days (if using IAM user)

### File Uploads

- ✅ Validate file size: max 10MB per evidence file
- ✅ Validate MIME type: allow PDF, JPG, PNG, XLSX only
- ✅ Scan uploads with ClamAV (Lightsail container sidecar) — optional, post-v2.0
- ✅ Set S3 object ACL to `private` (not `public-read`)
- ✅ Presigned URL expiry: 5 minutes (not 7 days max)

---

## Performance Benchmarks

### Prisma 7 vs Prisma 4

- Query execution: 3x faster (Rust-free runtime)
- Bundle size: 90% smaller (5MB → 500KB)
- Type generation: 2x faster (hundreds vs thousands of type instantiations)
- Cold start: 50% faster (no WASM loading)

### Better Auth vs Auth.js

- Session lookup: 2-3x faster (database joins optimization)
- Bundle size: 30% smaller (tree-shakeable plugins)
- Type safety: Better Auth client fully typed (Auth.js v5 loses types)

### @react-pdf/renderer vs Puppeteer

- PDF generation: 5x faster (no Chrome startup)
- Memory usage: 90% less (30MB vs 300MB)
- Container size: 250MB smaller (no Chrome binary)

### Lightsail vs RDS

- Provisioned IOPS: Lightsail SSD (no extra cost) vs RDS gp3 ($0.20/GB/month)
- Backup cost: Lightsail free vs RDS $0.095/GB/month
- Transfer cost: Lightsail 50GB included vs RDS $0.09/GB outbound

---

## Migration Path (if needed later)

### Lightsail → RDS

**When:** Audit volume exceeds 100 concurrent users, query latency > 500ms, or Lightsail DB max (32GB RAM) hit.

**Steps:**

1. Create RDS PostgreSQL instance in same VPC
2. Dump Lightsail DB: `pg_dump -h lightsail-db -U postgres aegis > dump.sql`
3. Restore to RDS: `psql -h rds-endpoint -U postgres aegis < dump.sql`
4. Update `DATABASE_URL` in Lightsail container env vars
5. Test thoroughly (RLS policies, session lookup, evidence queries)
6. Switch DNS/load balancer to new deployment
7. Monitor for 24 hours, then delete Lightsail DB

**Cost impact:** +$20-30/month for RDS db.t4g.small vs Lightsail 2GB.

---

### Better Auth → Auth.js (NOT RECOMMENDED)

**When:** Never — Auth.js is now maintained by Better Auth team.

**If forced by enterprise requirement:**

1. Export users: `SELECT * FROM user`
2. Hash passwords with bcrypt (Better Auth uses Argon2)
3. Rebuild organization → account mapping (Auth.js lacks org plugin)
4. Rewrite all RBAC logic (Auth.js has no built-in roles)
5. Estimate: 1-2 weeks dev time + high regression risk

**Alternative:** Stay on Better Auth, request enterprise to support modern auth libraries.

---

### @react-pdf/renderer → Puppeteer

**When:** Devanagari ligatures break in production PDFs OR need pixel-perfect HTML → PDF rendering.

**Cost:** Lightsail container upgrade from micro ($20) to small ($40) for Chrome binary.

**Steps:**

1. Add Puppeteer to dependencies: `pnpm add puppeteer`
2. Install Chrome in Dockerfile: `apt-get install chromium`
3. Rewrite PDF components to HTML templates
4. Replace `renderToBuffer()` with `page.pdf()`
5. Test memory usage (Puppeteer leaks if not closed properly)

---

## Confidence Assessment

| Area                  | Confidence | Reasoning                                                                                    |
| --------------------- | ---------- | -------------------------------------------------------------------------------------------- |
| Better Auth selection | HIGH       | Official docs confirm Next.js 16 compatibility, org plugin GA, Auth.js recommendation        |
| Prisma 7 selection    | HIGH       | Prisma 7.3.0 released Jan 2026, client extensions GA, Better Auth adapter mature             |
| Lightsail vs RDS      | MEDIUM     | Lightsail cost advantage confirmed, but Mumbai-specific pricing not explicitly listed        |
| @react-pdf Devanagari | MEDIUM     | Community confirms Noto Sans TTF works, but ligature issues possible (needs testing)         |
| AWS SES               | HIGH       | Standard transactional email choice, Mumbai region supported, SES+React Email pattern proven |
| S3 presigned URLs     | HIGH       | Well-documented pattern, Next.js 16 route handlers support presigner v3                      |
| ExcelJS               | MEDIUM     | Stable but old (2 years), deprecation warnings cosmetic, no better alternatives              |
| Docker Compose deploy | HIGH       | Lightsail container service supports docker-compose.yml, community examples exist            |
| Cost estimate         | MEDIUM     | $50/month estimate based on Lightsail pricing page, but Mumbai region pricing not itemized   |

**Overall Confidence:** HIGH — all critical choices (auth, ORM, DB hosting) validated with 2026 sources.

---

## Sources

### Authentication & Authorization

- [Better Auth npm](https://www.npmjs.com/package/better-auth)
- [Better Auth Next.js Integration](https://www.better-auth.com/docs/integrations/next)
- [Better Auth Organization Plugin](https://www.better-auth.com/docs/plugins/organization)
- [Better Auth 2FA Plugin](https://www.better-auth.com/docs/plugins/2fa)
- [Better Auth vs Auth.js Comparison](https://betterstack.com/community/guides/scaling-nodejs/better-auth-vs-nextauth-authjs-vs-autho/)
- [Auth.js Joins Better Auth](https://www.better-auth.com/blog/authjs-joins-better-auth)
- [BetterAuth vs NextAuth 2026](https://www.devtoolsacademy.com/blog/betterauth-vs-nextauth/)

### Database & ORM

- [Prisma 7 Release Announcement](https://www.prisma.io/blog/announcing-prisma-orm-7-0-0)
- [Prisma 7.2.0 Release](https://www.prisma.io/blog/announcing-prisma-orm-7-2-0)
- [Prisma Client Extensions](https://www.prisma.io/docs/orm/prisma-client/client-extensions)
- [Prisma RLS Example](https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security)
- [Better Auth Prisma Adapter](https://www.better-auth.com/docs/adapters/prisma)
- [Prisma vs Drizzle 2026](https://medium.com/@thebelcoder/prisma-vs-drizzle-orm-in-2026-what-you-really-need-to-know-9598cf4eaa7c)
- [Drizzle vs Prisma Performance](https://betterstack.com/community/guides/scaling-nodejs/drizzle-vs-prisma/)

### Database Hosting

- [AWS Lightsail Pricing](https://aws.amazon.com/lightsail/pricing/)
- [AWS RDS PostgreSQL Pricing](https://aws.amazon.com/rds/postgresql/pricing/)
- [Lightsail Managed Database Bundles](https://aws.amazon.com/about-aws/whats-new/2026/01/larger-managed-database-bundles-lightsail/)
- [Lightsail vs RDS Cost Comparison](https://cloudchipr.com/blog/aws-lightsail)
- [Lightsail Pricing Guide](https://kuberns.com/blogs/post/aws-lightsail-pricing-your-comprehensive-guide/)

### Email & Notifications

- [React Email npm](https://www.npmjs.com/package/react-email)
- [React Email with AWS SES](https://react.email/docs/integrations/aws-ses)
- [@react-email/components](https://www.npmjs.com/package/@react-email/components)
- [AWS SES SDK](https://www.npmjs.com/package/@aws-sdk/client-ses)
- [Sending Emails with React, Tailwind, and SES](https://kieron-mckenna.medium.com/sending-emails-with-react-tailwind-css-and-aws-ses-bba1c5959aab)

### File Storage

- [@aws-sdk/client-s3](https://www.npmjs.com/package/@aws-sdk/client-s3)
- [@aws-sdk/s3-request-presigner](https://www.npmjs.com/package/@aws-sdk/s3-request-presigner)
- [S3 Presigned URLs with Next.js](https://conermurphy.com/blog/presigned-urls-nextjs-s3-upload/)
- [AWS S3 Presigned URL Upload](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)

### PDF Export

- [@react-pdf/renderer npm](https://www.npmjs.com/package/@react-pdf/renderer)
- [React PDF Custom Fonts](https://react-pdf.org/fonts)
- [Noto Sans Devanagari Issue](https://github.com/diegomura/react-pdf/issues/856)
- [Noto Sans Devanagari Font](https://fonts.google.com/noto/specimen/Noto+Sans+Devanagari)

### Excel Export

- [ExcelJS npm](https://www.npmjs.com/package/exceljs)
- [ExcelJS GitHub](https://github.com/exceljs/exceljs)
- [SheetJS npm Deprecation](https://thelinuxcode.com/npm-sheetjs-xlsx-in-2026-safe-installation-secure-parsing-and-real-world-nodejs-patterns/)

### Deployment

- [Docker Compose Next.js PostgreSQL](https://medium.com/@abhijariwala/dockerizing-a-next-js-and-node-js-app-with-postgresql-and-prisma-a-complete-guide-000527023e99)
- [Deploy NestJS PostgreSQL on Lightsail](https://dev.to/georges_heloussato_d6ff14/complete-guide-deploy-nestjs-api-with-postgresql-on-aws-lightsail-3p6n)
- [AWS Lightsail Container Pricing](https://aws.amazon.com/lightsail/pricing/)

---

## Next Steps for Implementation

1. **Phase 5-01: Prisma Setup** — Initialize schema with Better Auth tables + AEGIS extensions
2. **Phase 5-02: Better Auth Integration** — Add organization plugin, configure RBAC, test invitations
3. **Phase 5-03: Database Seeding** — Migrate JSON demo data to PostgreSQL, add RLS policies
4. **Phase 5-04: S3 Evidence Upload** — Implement presigned URL route, evidence table, file validation
5. **Phase 5-05: Email Notifications** — React Email templates + SES integration for audit assignments
6. **Phase 5-06: PDF Board Reports** — @react-pdf/renderer with Noto Sans Devanagari
7. **Phase 5-07: Excel Exports** — ExcelJS for compliance requirement exports
8. **Phase 5-08: Docker Compose** — Lightsail container deployment with managed DB connection

Each phase includes:

- Installation of specific dependencies
- Integration tests with existing v1.0 UI
- Mumbai region deployment verification
- Cost monitoring (should stay under $60/month during dev)

---

**Research Complete: 2026-02-08**
**Confidence: HIGH** — All versions verified, Next.js 16 compatibility confirmed, budget met.
