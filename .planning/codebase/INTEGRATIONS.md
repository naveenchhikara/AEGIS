# External Integrations

**Analysis Date:** 2026-02-08

## APIs & External Services

**None detected.**

This is a clickable prototype with no backend integrations. All data is sourced from JSON files in `src/data/demo/` and `src/data/rbi-regulations/`.

## Data Storage

**Databases:**

- None - No database connection detected
- Data source: Local JSON files

**File Storage:**

- Local filesystem only
- Static assets in `public/logos/` (aegis-logo.png, aegis-mark.png)
- Demo data in `src/data/demo/` (bank-profile.json, staff.json, branches.json, compliance-requirements.json, audit-plans.json, findings.json, rbi-circulars.json)
- Localized demo data in `src/data/demo/{hi,mr,gu}/` (Hindi, Marathi, Gujarati)
- RBI regulations in `src/data/rbi-regulations/` (compliance-requirements.json, chapters.json, definitions.json, capital-structure.json, index.json)

**Caching:**

- Browser-only (Next.js automatic static optimization)
- Turbopack dev cache in `.next/`

## Authentication & Identity

**Auth Provider:**

- Mock authentication only
- Login form at `src/components/auth/login-form.tsx` accepts any email/password combination
- No session management or JWT implementation
- Locale selection stored in `NEXT_LOCALE` cookie via `next-intl`

## Monitoring & Observability

**Error Tracking:**

- None

**Logs:**

- Console only (development)
- No structured logging framework detected

## CI/CD & Deployment

**Hosting:**

- Planned: AWS Mumbai (ap-south-1) for RBI data localization requirements
- Current: Local development only

**CI Pipeline:**

- None - No `.github/workflows/` directory detected
- No Docker configuration (no Dockerfile or docker-compose.yml)

**Build Process:**

- Local builds via `pnpm build`
- No automated deployment detected

## Environment Configuration

**Required env vars:**

- None - No environment variables used in current prototype
- No `.env` files detected
- All configuration is hardcoded or comes from JSON files

**Secrets location:**

- Not applicable (no external services requiring secrets)

## Webhooks & Callbacks

**Incoming:**

- None

**Outgoing:**

- None

## Third-Party SDKs

**Google Fonts:**

- Service: Google Fonts CDN
- Usage: Font loading via `next/font/google`
- Fonts loaded:
  - Noto Sans (Latin) - variable `--font-noto-sans`
  - Noto Sans Devanagari (Hindi) - variable `--font-noto-devanagari`
  - Noto Sans Gujarati (Gujarati) - variable `--font-noto-gujarati`
  - DM Serif Display (headings) - variable `--font-dm-serif`
- Implementation: `src/app/layout.tsx`
- No API key required (public CDN)

## Future Integrations (Planned)

Based on domain context (Urban Cooperative Banks + RBI compliance), future phases may require:

**Authentication:**

- OAuth 2.0 or SAML for enterprise SSO
- Multi-factor authentication (MFA)

**Database:**

- PostgreSQL or similar RDBMS
- Data residency: Must remain in India (AWS Mumbai ap-south-1)

**Email/Notifications:**

- Email service for audit notifications, finding assignments, compliance alerts
- SMS for critical alerts (Indian telecom providers)

**Document Storage:**

- AWS S3 (ap-south-1) or similar for audit workpapers, evidence uploads
- Document encryption at rest

**RBI Integration:**

- Potential API for DAKSH score submission
- RBI circular updates (currently manual JSON updates)

**Reporting:**

- PDF generation for board reports (currently print-to-PDF via browser)

---

_Integration audit: 2026-02-08_
