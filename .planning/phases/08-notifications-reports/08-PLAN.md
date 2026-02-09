# Phase 8: Notifications & Reports — Comprehensive Plan

**Phase Goal:** Users receive email notifications for assignments and deadlines, CAE can generate PDF board reports, and users can export data as formatted Excel files.

**Requirements:** NOTF-01 through NOTF-06, RPT-01 through RPT-05, EXP-01 through EXP-05 (16 total)

**Depends on:** Phase 5 (auth, DB, RBAC, audit trail), Phase 6 (observations), Phase 7 (evidence, auditee portal)
**Soft depends on:** Phase 10 (onboarding — INVITATION notification type, compliance export data)

**Created:** 2026-02-09

---

## Table of Contents

1. [Research Findings](#1-research-findings)
2. [Notification System Architecture](#2-notification-system-architecture)
3. [Email Template Designs](#3-email-template-designs)
4. [PDF Board Report Generation](#4-pdf-board-report-generation)
5. [Excel Export Architecture](#5-excel-export-architecture)
6. [Scheduler & Cron Design](#6-scheduler--cron-design)
7. [Database Schema Additions](#7-database-schema-additions)
8. [API Endpoints](#8-api-endpoints)
9. [Task Breakdown](#9-task-breakdown)
10. [Dependencies](#10-dependencies)
11. [Requirements Mapping](#11-requirements-mapping)

---

## 1. Research Findings

### 1.1 AWS SES (Mumbai Region)

**Pricing:**

- $0.10 per 1,000 emails sent (uniform across all regions including ap-south-1)
- Free tier: 3,000 messages/month free for first 12 months
- At AEGIS scale (~500 emails/month per bank, ~10 banks in pilot): **~$0.50/month** — negligible
- Dedicated IPs: $15/month (NOT needed for pilot; shared IPs sufficient at low volume)

**Domain Verification Process:**

1. Add domain identity in SES console (ap-south-1)
2. Add 3 CNAME records for DKIM (Easy DKIM)
3. Add SPF record: `v=spf1 include:amazonses.com -all`
4. Add DMARC record: `v=DMARC1; p=quarantine; rua=mailto:dmarc@aegis.in`
5. DNS propagation: **typically 24-72 hours**, can take up to 5 days
6. **CRITICAL:** Must request production access (sandbox only sends to verified addresses)

**Sandbox vs Production:**

- Sandbox: Can only send to verified email addresses (max 200 emails/24h, 1 email/sec)
- Production: Must submit request via AWS Support; requires: use case description, expected volume, bounce/complaint handling, unsubscribe mechanism
- Approval typically takes 24-48 hours
- **Plan for 1-week lead time** (DNS propagation + production approval)

**Sending Limits (New Production Account):**

- Initial: 200 emails/24h, 1 email/sec
- Automatically scales based on sending reputation
- Can request increase via AWS Support

**Indian ISP Deliverability:**

- Airtel, Jio, BSNL: Generally good with proper DKIM/SPF/DMARC
- Rediffmail: Known to be aggressive with spam filtering — ensure plain text alternative included
- Key: Keep bounce rate <5%, complaint rate <0.1%
- **Recommendation:** Implement feedback loop processing for bounces/complaints

**SDK Choice:**

- Use `@aws-sdk/client-sesv2` (SESv2) — the current recommended API
- SESv1 (`@aws-sdk/client-ses`) is legacy; SESv2 has better templating, event tracking
- SESv2 supports `SendEmail` with both raw and templated modes

### 1.2 React-PDF (@react-pdf/renderer)

**Version:** 4.3.2 (latest as of 2026)

**Next.js Compatibility:**

- Compatible with React 18 and React 19 (since v4.1.0)
- **Known issue with App Router:** Server-side rendering in route handlers has had limitations
- **Recommendation:** Use `renderToBuffer()` in a **Next.js API route** (not server component)
- Must add to next.config.ts: `serverExternalPackages: ['@react-pdf/renderer']`

**Server-Side PDF Generation Strategy:**

- Use `renderToBuffer()` or `renderToStream()` in a Route Handler (`/api/reports/board-report`)
- NOT in server components — React-PDF relies on React reconciler internals
- Route handler returns `Response` with `content-type: application/pdf`
- **Known Next.js 15+ issue (GitHub #3074):** `renderToBuffer` may throw "PDFDocument is not a constructor" in App Router route handlers. Workaround: use `pdf(<Document />).toBuffer()` pattern with `export const dynamic = 'force-dynamic'`

**Chart Embedding:**

- React-PDF supports SVG primitives (`<Svg>`, `<Path>`, `<Circle>`, `<Rect>`, `<Line>`)
- **Cannot** directly embed Recharts/SVG DOM elements
- **Strategy:** Build custom PDF chart components using React-PDF's SVG primitives
- For bar charts, pie charts: manually calculate coordinates and render with `<Rect>`, `<Path>`
- Alternative: Pre-render charts as PNG images on server, embed as `<Image>` in PDF

**Font Support (Indian Languages):**

- React-PDF supports custom font registration via `Font.register()`
- Use **Noto Sans Devanagari** for Hindi/Marathi (already used in app: Noto Sans family)
- Use **Noto Sans Gujarati** for Gujarati
- Must register each font family explicitly with font files (TTF/OTF/WOFF)
- Download from Google Fonts and bundle with the application

**Image Embedding:**

- Supports `<Image src={...} />` with local files, URLs, or Buffer
- Bank logo: Store in tenant settings (S3 URL or base64) and embed in report header

**Page Numbering / Headers / Footers:**

- `<Text render={({ pageNumber, totalPages }) => ...} fixed />` for page numbers
- Use `fixed` prop on elements to repeat on every page (headers/footers)

**Performance:**

- 20-30 page reports: ~2-5 seconds server-side generation
- Acceptable for on-demand generation (user clicks "Generate Report")
- Cache generated PDFs in S3 for repeated downloads
- Peak memory: 50-150MB during generation — use dedicated route handler, not page component

**Devanagari/Gujarati Font Warning:**

- Known issues with complex script shaping (ligatures, conjuncts) in React-PDF (GitHub issues #454, #856, #933)
- **v2.0 Decision: Board reports will be English-only.** Multi-language PDFs deferred to post-MVP
- If needed later, fallback: Puppeteer-based HTML-to-PDF (browser engine handles complex scripts correctly)

**react-pdf-charts Library:**

- `react-pdf-charts` (by EvHaus) bridges recharts to React-PDF SVG primitives
- Requires recharts v2.x (NOT v3+) and `isAnimationActive={false}` on all chart components
- **Decision: Build custom SVG charts directly with React-PDF primitives** — avoids recharts version pinning (AEGIS may upgrade to recharts v3 for dashboard charts in Phase 9), reduces bundle size, and gives full control over layout. Reserve react-pdf-charts as fallback only if custom charts prove too complex.

### 1.3 ExcelJS

**Version:** 4.4.0 (actively maintained, ~3M weekly downloads)

**Why ExcelJS over SheetJS:**
| Feature | ExcelJS | SheetJS (free) |
|---------|---------|----------------|
| Cell styling | Full (fonts, colors, borders, fills) | None (paid pro only) |
| Merged cells | Yes | Yes |
| Auto-filters | Yes | Yes |
| Streaming write | Yes (WorkbookWriter) | No |
| License | MIT | Apache 2.0 |
| Download stats | ~3M/week | ~4M/week |

**Decision: ExcelJS** — Full styling in free version is critical for professional AEGIS exports.

**Server-Side Usage:**

```
// Server action or API route
const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet('Findings');
// ... add data, styling
const buffer = await workbook.xlsx.writeBuffer();
return new Response(buffer, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } });
```

**Memory:** Streaming mode (WorkbookWriter) for datasets >10,000 rows. AEGIS exports typically <1,000 rows — standard Workbook mode is fine.

### 1.4 Email Templating

**Decision: React Email**

| Feature             | React Email                      | MJML        | Handlebars |
| ------------------- | -------------------------------- | ----------- | ---------- |
| TypeScript          | Native                           | Via wrapper | Via types  |
| Next.js integration | Excellent (same React ecosystem) | Good        | Good       |
| Preview             | Built-in dev server              | MJML CLI    | Manual     |
| Components          | Reusable React components        | MJML tags   | Partials   |
| Email client compat | Excellent (tested rendering)     | Excellent   | Manual     |

**React Email** is the best fit:

- Same React/TypeScript stack as AEGIS
- Components compile to HTML email with inline styles
- Preview with `email dev` command during development
- Can use `render()` function in server actions to produce HTML string
- Libraries: `@react-email/components`, `react-email`

### 1.5 Job Scheduling

**Deployment Context:** AWS Lightsail (single container), NOT Vercel, NOT Lambda

**Options Analysis:**

| Scheduler       | Backend    | Pros                             | Cons                            |
| --------------- | ---------- | -------------------------------- | ------------------------------- |
| pg-boss         | PostgreSQL | No extra infra, persistent, ACID | Polling overhead, PG load       |
| BullMQ          | Redis      | Fast, proven, rich features      | Requires Redis (extra $)        |
| node-cron       | In-process | Simple, no dependencies          | Lost on restart, no persistence |
| AWS EventBridge | AWS        | Managed, reliable                | Requires Lambda or HTTP target  |

**Decision: pg-boss**

Rationale:

1. PostgreSQL is already provisioned (no extra infrastructure cost)
2. Jobs survive process restarts (persisted in DB)
3. Supports cron scheduling, delayed jobs, and retries
4. ACID guarantees for job state
5. Perfect for AEGIS's low-volume, reliability-critical use case
6. Budget constraint: No Redis cost (~$15/month for ElastiCache)

**pg-boss Usage:**

- Cron jobs: Deadline check (daily 6:00 AM IST), Weekly digest (Monday 9:00 AM IST), Overdue escalation (daily 8:00 AM IST)
- Event-driven jobs: Observation assigned → queue email, Response submitted → queue email
- Batch/digest jobs: Bulk operation → queue digest (5-minute window)

### 1.6 Notification Batching

**Pattern: Time-Window Batching with Database Queue**

1. When a bulk operation occurs (e.g., "assign 20 observations"):
   - Each assignment creates a `notification_queue` record with `batch_key = user_id + event_type`
   - Records have `send_after` timestamp = now + 5 minutes
2. pg-boss cron job runs every minute:
   - Groups pending notifications by `batch_key` where `send_after <= now`
   - If group count > 1: Send single digest email (e.g., "You have 20 new assignments")
   - If group count == 1: Send individual email
   - Mark all grouped records as `sent`

**NOTF-06 satisfaction:** Bulk operations produce ONE digest email, not 20 individual emails.

---

## 2. Notification System Architecture

### 2.1 Event-Driven Flow

```
[Application Event] → [Create NotificationQueue record] → [pg-boss processes] → [SES sends email]
                                                                ↓
                                                        [Batch/Digest check]
                                                                ↓
                                                        [Email rendered via React Email]
                                                                ↓
                                                        [SES API call]
                                                                ↓
                                                        [EmailLog record created]
```

### 2.2 Notification Types

| Type                 | Trigger                     | Recipients                                               | Template        | Req     |
| -------------------- | --------------------------- | -------------------------------------------------------- | --------------- | ------- |
| observation_assigned | Observation status → ISSUED | Auditee (assignedTo)                                     | AssignmentEmail | NOTF-01 |
| response_submitted   | Auditee submits response    | Auditor + Manager who created observation                | ResponseEmail   | NOTF-02 |
| deadline_reminder_7d | Cron: 7 days before due     | Auditee (assignedTo)                                     | ReminderEmail   | NOTF-03 |
| deadline_reminder_3d | Cron: 3 days before due     | Auditee (assignedTo)                                     | ReminderEmail   | NOTF-03 |
| deadline_reminder_1d | Cron: 1 day before due      | Auditee (assignedTo)                                     | ReminderEmail   | NOTF-03 |
| overdue_escalation   | Cron: due date passed       | Auditee + observation creator + engagement Audit Manager | EscalationEmail | NOTF-04 |
| weekly_digest        | Cron: Monday 9AM IST        | CAE + CCO                                                | DigestEmail     | NOTF-05 |
| bulk_digest          | Batch window (5 min)        | Affected users                                           | BulkDigestEmail | NOTF-06 |
| invitation           | Admin creates user (Ph 10)  | New user                                                 | InvitationEmail | Ph 10   |

### 2.3 Notification Preferences

Each user can configure (stored in User model or separate table):

- `emailNotifications: boolean` (default: true)
- `digestPreference: 'immediate' | 'daily' | 'weekly'` (default: 'immediate')
- CAE/CCO always receive weekly digest regardless of preference (regulatory requirement)

### 2.4 Sender Identity

- From: `noreply@audit.{bank-domain}.in` or `noreply@aegis.in`
- Reply-To: Not applicable (system notifications)
- Branding: Bank name in subject line, bank logo in email body
- **Initial setup:** Use `noreply@aegis.in` for all tenants; tenant-specific domains are post-MVP

---

## 3. Email Template Designs

### 3.1 Base Layout Template

All emails share a base layout:

- Header: AEGIS logo + bank name
- Body: Content area (template-specific)
- Footer: "This is an automated notification from AEGIS Audit Platform" + unsubscribe link (`{app_url}/settings/notifications`) + confidentiality notice
- **Unsubscribe mechanism:** Footer includes "Manage notification preferences" link pointing to `/settings/notifications` (built in plan 08-06, Task 1). CAE/CCO weekly digest cannot be unsubscribed (regulatory requirement — note in preferences UI).
- Responsive: Tested for mobile (UCB staff use phones)
- Plain text alternative: Required for Rediffmail compatibility

### 3.2 Template Specifications

**AssignmentEmail (NOTF-01):**

- Subject: "[{bank_shortname}] New audit observation assigned to you — {observation_title}"
- Body: Observation title, severity badge (colored), branch name, due date, brief condition excerpt (first 200 chars), CTA button → "View Observation"
- CTA URL: `{app_url}/auditee/observations/{observation_id}`

**ResponseEmail (NOTF-02):**

- Subject: "[{bank_shortname}] Auditee response received — {observation_title}"
- Body: Observation title, severity, auditee name, response timestamp, response excerpt (first 200 chars), evidence count if uploaded, CTA → "Review Response"

**ReminderEmail (NOTF-03):**

- Subject: "[{bank_shortname}] Deadline in {days} day(s) — {observation_title}"
- Body: Observation title, severity (color-coded), days remaining (bold), original due date, CTA → "Submit Response"
- Urgency escalation: 7d = blue, 3d = amber, 1d = red color scheme

**EscalationEmail (NOTF-04):**

- Subject: "[{bank_shortname}] OVERDUE: {observation_title} — Immediate action required"
- Body: Observation title, severity, days overdue (red, bold), original due date, branch name, assigned auditee name
- Sent to: auditee (assignedTo), observation creator (createdBy), and any user with AUDIT_MANAGER role on the parent engagement
- **Note:** There is no `managerId` on the Branch model. Supervisor escalation targets the audit team chain (creator → Audit Manager), not branch management hierarchy. This aligns with audit workflow where the audit team tracks compliance.
- Audit Manager version includes: "This observation assigned to {auditee_name} at {branch_name} is {days} days overdue"

**DigestEmail (NOTF-05):**

- Subject: "[{bank_shortname}] Weekly Audit Summary — Week of {date}"
- Body:
  - Summary stats: total observations (open/closed this week), overdue count, new assignments
  - Top 3 critical/high findings (title + status)
  - Compliance score change (if changed)
  - Audit coverage progress
  - Upcoming deadlines (next 7 days)
  - CTA → "View Dashboard"

**BulkDigestEmail (NOTF-06):**

- Subject: "[{bank_shortname}] {count} new observations assigned to you"
- Body: Table listing all observations (title, severity, due date), single CTA → "View All Observations"

### 3.3 Email Template File Structure

```
src/
  emails/
    components/
      email-base-layout.tsx     # Shared header/footer
      severity-badge.tsx        # Colored severity indicator
      observation-card.tsx      # Reusable observation snippet
      cta-button.tsx            # Call-to-action button
    templates/
      assignment-email.tsx      # NOTF-01
      response-email.tsx        # NOTF-02
      reminder-email.tsx        # NOTF-03
      escalation-email.tsx      # NOTF-04
      weekly-digest-email.tsx   # NOTF-05
      bulk-digest-email.tsx     # NOTF-06
    render.ts                   # Helper: render template to HTML string
```

---

## 4. PDF Board Report Generation

### 4.1 Architecture

```
[CAE clicks "Generate Report"]
    → [Client: POST /api/reports/board-report with params]
    → [Route Handler: Aggregate data from PostgreSQL]
    → [React-PDF: renderToBuffer(<BoardReport data={...} />)]
    → [Response: PDF binary with Content-Disposition: attachment]
    → [Optionally: Store in S3 for audit trail]
```

### 4.2 Report Structure (RPT-02)

The board report has 5 mandatory sections per requirements:

**Cover Page:**

- Bank name and logo (from tenant settings)
- "Internal Audit Board Report"
- Reporting period (quarter + fiscal year, e.g., "Q3 FY 2025-26")
- "CONFIDENTIAL — For Audit Committee Members Only"
- Generated date and time
- Page: i of N

**Section 1: Executive Summary**

- Overall risk rating (High/Medium/Low) with color indicator
- Key metrics: total observations, critical/high count, compliance score
- CRAR and NPA percentage
- Audit completion rate
- 3-5 bullet point highlights for board attention

**Section 2: Audit Coverage**

- Table: Audit type × Planned/Completed/In-Progress/Completion Rate
- Branch coverage summary (which branches audited this period)
- Visual: Horizontal bar chart showing completion by audit type

**Section 3: Key Findings**

- Grouped by severity (Critical → High → Medium)
- Each finding: Title, branch, observation excerpt, status, due date
- Color-coded severity indicators
- Overdue findings flagged with red marker

**Section 4: Compliance Scorecard**

- Overall compliance percentage
- Table: Category × Total/Compliant/Partial/Non-Compliant/Pending/Score
- Visual: Stacked bar chart per category
- Trend: "Improved/Declined/Stable" vs previous period (if data available)

**Section 5: Recommendations**

- Prioritized list (Critical → High → Medium)
- Each: Title, description, related finding IDs, target date
- Grouped by risk category

**Repeat Findings Summary (RPT-05):**

- Separate subsection within Key Findings or as Section 6
- Table: Observation title, original occurrence date, current occurrence, severity escalation
- Highlights repeated observations that remain unresolved

**Report Footer (every page):**

- Page number: "Page X of Y"
- Bank name and "CONFIDENTIAL" watermark
- Report generation timestamp

### 4.2.1 S3 Storage for Generated Reports

**Separate S3 prefix from evidence files.** Phase 7's evidence S3 bucket has a strict no-DeleteObject IAM policy (evidence immutability). Reports may need regeneration (CAE edits commentary, re-runs for corrections).

**S3 path structure:**

- Evidence: `s3://aegis-{env}/{tenantId}/evidence/{observationId}/{filename}` — **no delete allowed**
- Reports: `s3://aegis-{env}/{tenantId}/reports/{year}/{quarter}/{reportId}.pdf` — **delete + put allowed**

**IAM policy:** Use S3 prefix-based conditions to allow `s3:DeleteObject` only on the `reports/` prefix:

```json
{
  "Effect": "Allow",
  "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
  "Resource": "arn:aws:s3:::aegis-*/{tenantId}/reports/*"
}
```

Evidence prefix retains the immutability constraint from Phase 7.

### 4.3 Executive Commentary (RPT-03)

Before generating the PDF, CAE can add free-text executive commentary:

- UI: Rich text editor (or simple textarea) on the report generation page
- Commentary appears at the top of Section 1 (Executive Summary)
- Saved with the report metadata for audit trail

### 4.4 Report Design Elements (RPT-04)

- **Bank logo:** Loaded from tenant settings (S3 URL or base64 stored in `Tenant.settings`)
- **Confidentiality notice:** Footer on every page + cover page
- **Page numbers:** React-PDF `<Text render={({ pageNumber, totalPages }) => ...} fixed />`
- **Charts:** Custom React-PDF SVG components for:
  - Bar chart (audit coverage completion rates)
  - Stacked bar chart (compliance status distribution)
  - Donut/pie chart (finding severity distribution) — optional, use table if complex
- **Colors:** Use AEGIS brand colors, severity colors from `SEVERITY_COLORS` constant

### 4.5 PDF Component Structure

```
src/
  components/
    pdf-report/
      board-report.tsx            # Main document component
      cover-page.tsx              # Cover page with logo, confidentiality
      executive-summary.tsx       # Section 1
      audit-coverage.tsx          # Section 2 with bar chart
      key-findings.tsx            # Section 3
      compliance-scorecard.tsx    # Section 4 with stacked bar
      recommendations.tsx         # Section 5
      repeat-findings.tsx         # RPT-05
      pdf-charts/
        bar-chart.tsx             # Custom SVG bar chart for React-PDF
        stacked-bar-chart.tsx     # Custom SVG stacked bar for React-PDF
      pdf-primitives/
        page-header.tsx           # Repeating header with bank name
        page-footer.tsx           # Repeating footer with page numbers
        severity-badge-pdf.tsx    # Colored severity indicator for PDF
  app/
    api/
      reports/
        board-report/
          route.ts                # GET/POST handler for PDF generation
```

### 4.6 Font Registration

```typescript
// Must register before rendering
Font.register({
  family: "NotoSans",
  fonts: [
    { src: "/fonts/NotoSans-Regular.ttf", fontWeight: "normal" },
    { src: "/fonts/NotoSans-Bold.ttf", fontWeight: "bold" },
    { src: "/fonts/NotoSans-Italic.ttf", fontStyle: "italic" },
  ],
});
// Indian language fonts (for future multi-language reports)
Font.register({
  family: "NotoSansDevanagari",
  src: "/fonts/NotoSansDevanagari-Regular.ttf",
});
```

---

## 5. Excel Export Architecture

### 5.1 Export Types

| Export            | Data Source                 | Columns                                                                                             | Req    |
| ----------------- | --------------------------- | --------------------------------------------------------------------------------------------------- | ------ |
| Findings Export   | Observation table           | ID, Title, Severity, Status, Branch, Category, Due Date, Assigned To, Created Date, Response Status | EXP-01 |
| Compliance Export | ComplianceRequirement table | ID, Requirement, Category, Status, RBI Circular Ref, Owner, Next Review Date, Notes                 | EXP-02 |
| Audit Plan Export | AuditPlan + AuditEngagement | Plan Year/Quarter, Branch, Audit Area, Status, Assigned To, Start Date, End Date, Findings Count    | EXP-03 |

### 5.2 Export Architecture

```
[User clicks "Export to Excel"]
    → [Client: POST /api/exports/{type} with filters]
    → [Server: Check role permissions (EXP-04)]
    → [Server: Query data via DAL with tenant scope]
    → [Server: Generate XLSX with ExcelJS]
    → [Response: XLSX binary with Content-Disposition: attachment]
```

### 5.3 Role Permission Enforcement (EXP-04)

| Role          | Findings                    | Compliance | Audit Plans               |
| ------------- | --------------------------- | ---------- | ------------------------- |
| CEO           | All (read-only)             | All        | All                       |
| CAE           | All                         | All        | All                       |
| CCO           | All                         | All        | All                       |
| Audit Manager | All in assigned engagements | All        | All in assigned plans     |
| Auditor       | Only own observations       | No         | Only assigned engagements |
| Auditee       | Only assigned to self       | No         | No                        |

### 5.4 XLSX Formatting (EXP-05)

Every exported XLSX includes:

- **Row 1:** Bank name (bold, 14pt, merged across all columns)
- **Row 2:** Export type and date (e.g., "Findings Export — 09 Feb 2026")
- **Row 3:** "CONFIDENTIAL — For Internal Use Only" (red, italic)
- **Row 4:** Empty (spacer)
- **Row 5:** Column headers (bold, dark background, white text, auto-filter enabled)
- **Data rows:** Alternating row colors (light gray/white) for readability
- **Auto-width:** Columns sized to content
- **Severity formatting:** Cell background colored (red for Critical, orange for High, yellow for Medium, green for Low)
- **Date formatting:** Indian locale (DD/MM/YYYY)
- **Sheet name:** Export type (e.g., "Findings", "Compliance", "Audit Plans")

### 5.5 Export File Structure

```
src/
  lib/
    excel-export.ts              # ExcelJS workbook builder utilities
  app/
    api/
      exports/
        findings/
          route.ts               # GET handler for findings XLSX
        compliance/
          route.ts               # GET handler for compliance XLSX
        audit-plans/
          route.ts               # GET handler for audit plan XLSX
  data-access/
    exports.ts                   # DAL: queries for export data with role filtering
```

---

## 6. Scheduler & Cron Design

### 6.1 pg-boss Setup

```
src/
  lib/
    job-queue.ts                 # pg-boss singleton, connection config
  jobs/
    index.ts                     # Job registration and cron schedules
    deadline-reminder.ts         # Check upcoming deadlines → queue emails
    overdue-escalation.ts        # Check overdue observations → queue escalation
    weekly-digest.ts             # Aggregate weekly stats → queue digest emails
    notification-processor.ts    # Process notification_queue → send via SES
    notification-batcher.ts      # Batch pending notifications into digests
```

### 6.2 Cron Schedules

| Job                     | Schedule                         | Description                                                                   |
| ----------------------- | -------------------------------- | ----------------------------------------------------------------------------- |
| `deadline-check`        | `0 0 * * *` (midnight IST daily) | Find observations with dueDate in 1d/3d/7d; create notifications              |
| `overdue-escalation`    | `0 2 * * *` (2AM IST daily)      | Find overdue observations; create escalation notifications                    |
| `weekly-digest`         | `0 3 * * 1` (Monday 3AM IST)     | Aggregate weekly stats per tenant; create digest notifications                |
| `process-notifications` | `*/1 * * * *` (every minute)     | Process pending notification_queue records; batch if applicable; send via SES |

### 6.3 Job Queue Initialization

pg-boss starts when the Next.js application starts:

- In production: Initialize in a custom server entry point or instrumentation hook
- Use Next.js `instrumentation.ts` file (stable in Next.js 15+) to start pg-boss on server startup
- pg-boss uses the same PostgreSQL database (no extra infrastructure)
- Connection string: same `DATABASE_URL` with dedicated schema or table prefix

### 6.3.1 Cross-Tenant Processing Strategy (RLS Compatibility)

**Problem:** pg-boss cron jobs (deadline-check, overdue-escalation, weekly-digest) must process data across ALL tenants. But RLS restricts queries to `current_setting('app.current_tenant_id')`.

**Decision: Iterate tenants with scoped context (Option B)**

System jobs iterate over all active tenants and set tenant context per batch:

```
async function processDeadlineReminders() {
  // 1. Query tenant list using admin/service connection (no RLS)
  const tenants = await prisma.tenant.findMany({ select: { id: true } });

  // 2. For each tenant, set RLS context and process
  for (const tenant of tenants) {
    const scopedPrisma = prismaForTenant(tenant.id);
    const upcomingDeadlines = await scopedPrisma.observation.findMany({
      where: { dueDate: { gte: today, lte: sevenDaysFromNow }, status: { not: 'CLOSED' } }
    });
    // Queue notifications per tenant...
  }
}
```

**Why not bypass RLS entirely:**

- Keeps RLS guarantees intact — even system jobs respect tenant boundaries
- If a bug in the notification processor leaks data, RLS prevents cross-tenant exposure
- Audit log shows tenant-scoped operations, maintaining traceability

**Admin connection for tenant enumeration:**

- `prisma` (base client without RLS) used ONLY for `tenant.findMany()` to get the tenant list
- All subsequent data access uses `prismaForTenant(tenantId)` with proper RLS context
- This is the same pattern used in Phase 5's seed script and isolation test

### 6.4 Notification Processing Flow

```
1. Event occurs (e.g., observation assigned)
2. Application code inserts NotificationQueue record:
   - recipientId, type, payload (JSON), batchKey, sendAfter
3. pg-boss job 'process-notifications' runs every minute:
   a. SELECT * FROM notification_queue WHERE status = 'pending' AND send_after <= NOW()
   b. GROUP BY batch_key
   c. For each group:
      - If count > 1: Render digest template with all items
      - If count == 1: Render individual template
   d. Call SES SendEmail API
   e. Update notification_queue status = 'sent', update email_log
   f. On SES error: status = 'failed', increment retryCount, set sendAfter = NOW() + backoff
4. Failed notifications retry up to 3 times with exponential backoff (5min, 15min, 45min)
```

---

## 7. Database Schema Additions

### 7.1 New Prisma Models

```prisma
// Add to prisma/schema.prisma

enum NotificationType {
  OBSERVATION_ASSIGNED
  RESPONSE_SUBMITTED
  DEADLINE_REMINDER_7D
  DEADLINE_REMINDER_3D
  DEADLINE_REMINDER_1D
  OVERDUE_ESCALATION
  WEEKLY_DIGEST
  BULK_DIGEST
  INVITATION           // Phase 10 integration: user invitation emails
}

enum NotificationStatus {
  PENDING
  PROCESSING
  SENT
  FAILED
  SKIPPED  // User opted out
}

// ─── Notification Queue ─────────────────────────────────────────────────────

model NotificationQueue {
  id           String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId     String             @db.Uuid
  tenant       Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  recipientId  String             @db.Uuid
  recipient    User               @relation("NotificationRecipient", fields: [recipientId], references: [id])
  type         NotificationType
  status       NotificationStatus @default(PENDING)

  // Batching support (NOTF-06)
  batchKey     String?            // e.g., "{userId}:{type}" — group for digest
  sendAfter    DateTime           @default(now())  // Delayed sending for batching

  // Payload: template variables as JSON
  payload      Json               // { observationId, observationTitle, severity, ... }

  // Processing metadata
  retryCount   Int                @default(0)
  lastError    String?
  processedAt  DateTime?

  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt

  @@index([tenantId])
  @@index([status, sendAfter])  // Main processing query
  @@index([batchKey, status])   // Batch grouping query
}

// ─── Email Log (audit trail for sent emails) ────────────────────────────────

model EmailLog {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId        String   @db.Uuid
  tenant          Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  recipientEmail  String
  recipientName   String?
  subject         String
  templateName    String   // e.g., "assignment-email"

  // SES response
  sesMessageId    String?
  status          String   // 'sent', 'bounced', 'complained', 'failed'

  // Reference back to notification(s) that triggered this email
  notificationIds String[] // Array of NotificationQueue IDs

  sentAt          DateTime @default(now())

  @@index([tenantId])
  @@index([recipientEmail])
  @@index([sentAt])
}

// ─── User Notification Preferences ──────────────────────────────────────────

model NotificationPreference {
  id       String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId   String @db.Uuid @unique
  tenantId String @db.Uuid

  emailEnabled     Boolean @default(true)
  digestPreference String  @default("immediate") // 'immediate' | 'daily' | 'weekly'

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId])
}

// ─── Generated Board Report (audit trail) ──────────────────────────────────

model BoardReport {
  id       String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId String @db.Uuid

  // Report metadata
  year     Int
  quarter  Quarter
  title    String    // e.g., "Board Report Q3 FY 2025-26"

  // CAE executive commentary (RPT-03)
  executiveCommentary String? @db.Text

  // Storage
  s3Key    String?   // S3 path to generated PDF
  fileSize Int?      // PDF file size in bytes

  // Generation context
  generatedById String @db.Uuid
  generatedAt   DateTime @default(now())

  // Snapshot of key metrics at generation time
  metricsSnapshot Json?  // { totalObservations, critical, high, complianceScore, ... }

  @@index([tenantId])
  @@index([tenantId, year, quarter])
}
```

### 7.2 RLS Policies

All new tables need RLS policies matching the existing pattern:

```sql
ALTER TABLE "NotificationQueue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationQueue" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "NotificationQueue"
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);

-- Same for EmailLog, NotificationPreference, BoardReport
```

### 7.3 Audit Triggers

Attach the existing audit trigger (from Phase 5, plan 05-05) to new tables:

```sql
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON "NotificationQueue" FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON "EmailLog" FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON "NotificationPreference" FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON "BoardReport" FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

---

## 8. API Endpoints

### 8.1 Notification Endpoints

| Method | Path                             | Auth              | Description                         |
| ------ | -------------------------------- | ----------------- | ----------------------------------- |
| GET    | `/api/notifications/preferences` | Any authenticated | Get user's notification preferences |
| PUT    | `/api/notifications/preferences` | Any authenticated | Update notification preferences     |
| GET    | `/api/notifications/history`     | CAE/CCO           | View sent notification log          |

### 8.2 Report Endpoints

| Method | Path                             | Auth        | Description                          |
| ------ | -------------------------------- | ----------- | ------------------------------------ |
| POST   | `/api/reports/board-report`      | CAE         | Generate PDF board report            |
| GET    | `/api/reports/board-report/{id}` | CAE/CCO/CEO | Download previously generated report |
| GET    | `/api/reports/board-report/list` | CAE/CCO/CEO | List generated reports               |

### 8.3 Export Endpoints

| Method | Path                       | Auth          | Description             |
| ------ | -------------------------- | ------------- | ----------------------- |
| GET    | `/api/exports/findings`    | Role-filtered | Export findings XLSX    |
| GET    | `/api/exports/compliance`  | CAE/CCO/CEO   | Export compliance XLSX  |
| GET    | `/api/exports/audit-plans` | Role-filtered | Export audit plans XLSX |

---

## 9. Task Breakdown

### Plan 08-01: Notification Infrastructure (Wave 1)

**Goal:** Set up pg-boss, SES client, notification queue schema, and email rendering pipeline.

**Files:**

- `prisma/schema.prisma` (add NotificationQueue, EmailLog, NotificationPreference, BoardReport models)
- `prisma/migrations/YYYYMMDD_notification_tables/migration.sql` (RLS + triggers)
- `src/lib/ses-client.ts` (AWS SES v2 client singleton)
- `src/lib/job-queue.ts` (pg-boss initialization)
- `src/instrumentation.ts` (start pg-boss on app boot)
- `package.json` (add dependencies)

**Dependencies to install:**

- `@aws-sdk/client-sesv2` — AWS SES v2 SDK
- `pg-boss` — PostgreSQL job queue
- `@react-email/components` — Email components
- `react-email` — Email dev tools (devDependency)

**Tasks:**

1. Add new models to Prisma schema (NotificationQueue, EmailLog, NotificationPreference, BoardReport enums and models)
2. Create and apply migration (RLS policies, audit triggers for new tables)
3. Create SES client utility (`ses-client.ts`) with ap-south-1 region config
4. Create pg-boss singleton (`job-queue.ts`) connected to same DATABASE_URL
5. Create `instrumentation.ts` to start pg-boss workers on Next.js server boot
6. Create notification DAL (`src/data-access/notifications.ts`) with `createNotification()`, `getNotificationPreferences()`, `updatePreferences()`

### Plan 08-02: Email Templates (Wave 1, parallel with 08-01)

**Goal:** Build all 6 email templates using React Email.

**Files:**

- `src/emails/components/email-base-layout.tsx`
- `src/emails/components/severity-badge.tsx`
- `src/emails/components/observation-card.tsx`
- `src/emails/components/cta-button.tsx`
- `src/emails/templates/assignment-email.tsx`
- `src/emails/templates/response-email.tsx`
- `src/emails/templates/reminder-email.tsx`
- `src/emails/templates/escalation-email.tsx`
- `src/emails/templates/weekly-digest-email.tsx`
- `src/emails/templates/bulk-digest-email.tsx`
- `src/emails/render.ts`

**Tasks:**

1. Create base email layout component with AEGIS branding, header, footer, confidentiality notice
2. Create shared components (severity badge, observation card, CTA button)
3. Build assignment email template (NOTF-01)
4. Build response notification template (NOTF-02)
5. Build deadline reminder template with urgency levels (NOTF-03)
6. Build escalation email template (NOTF-04)
7. Build weekly digest template with summary stats (NOTF-05)
8. Build bulk digest template with observation table (NOTF-06)
9. Create render helper that converts React Email components to HTML string

### Plan 08-03: Notification Jobs & Processing (Wave 2, depends on 08-01 + 08-02)

**Goal:** Implement all notification triggers, cron jobs, and the batch processing pipeline.

**Files:**

- `src/jobs/notification-processor.ts`
- `src/jobs/notification-batcher.ts`
- `src/jobs/deadline-reminder.ts`
- `src/jobs/overdue-escalation.ts`
- `src/jobs/weekly-digest.ts`
- `src/jobs/index.ts` (register all jobs and cron schedules)
- `src/lib/notification-service.ts` (helper: queue notification from app code)
- Integration points in Phase 6/7 server actions (add `queueNotification()` calls)

**Tasks:**

1. Create notification service: `queueNotification(type, recipientId, payload, batchKey?)` — inserts NotificationQueue record
2. Create notification processor job: dequeue pending notifications, render email, send via SES, log to EmailLog
3. Create notification batcher: group by batchKey, aggregate into digest, render bulk template
4. Create deadline reminder job (cron daily): query observations with dueDate in 1d/3d/7d, queue reminders (skip if already sent for this deadline)
5. Create overdue escalation job (cron daily): query overdue observations, queue escalation to auditee + supervisor
6. Create weekly digest job (cron Monday): aggregate per-tenant stats, queue digest to CAE/CCO
7. Register all jobs and cron schedules in `jobs/index.ts`
8. Add duplicate prevention: don't send same reminder twice (check EmailLog)

### Plan 08-04: PDF Board Report (Wave 2, parallel with 08-03)

**Goal:** Implement React-PDF board report with all 5 sections, charts, and professional formatting.

**Files:**

- `src/components/pdf-report/board-report.tsx`
- `src/components/pdf-report/cover-page.tsx`
- `src/components/pdf-report/executive-summary.tsx`
- `src/components/pdf-report/audit-coverage.tsx`
- `src/components/pdf-report/key-findings.tsx`
- `src/components/pdf-report/compliance-scorecard.tsx`
- `src/components/pdf-report/recommendations.tsx`
- `src/components/pdf-report/repeat-findings.tsx`
- `src/components/pdf-report/pdf-charts/bar-chart.tsx`
- `src/components/pdf-report/pdf-charts/stacked-bar-chart.tsx`
- `src/components/pdf-report/pdf-primitives/page-header.tsx`
- `src/components/pdf-report/pdf-primitives/page-footer.tsx`
- `src/app/api/reports/board-report/route.ts`
- `src/data-access/reports.ts`
- `next.config.ts` (add serverExternalPackages)

**Dependencies to install:**

- `@react-pdf/renderer` — PDF generation
- `@react-pdf/font` — Font management (if separate)

**Tasks:**

1. Install React-PDF, configure next.config.ts with `serverExternalPackages`
2. Register Noto Sans fonts (Regular, Bold, Italic) for PDF rendering
3. Create PDF primitive components (page header, page footer with page numbers, severity badge)
4. Create custom SVG chart components (bar chart for audit coverage, stacked bar for compliance)
5. Build cover page component (logo, bank name, confidentiality, period)
6. Build executive summary section (reusing data logic from `report-utils.ts`)
7. Build audit coverage section with bar chart
8. Build key findings section with severity grouping
9. Build compliance scorecard with stacked bar chart
10. Build recommendations section
11. Build repeat findings summary section (RPT-05)
12. Create main BoardReport document component composing all sections
13. Create report DAL (`data-access/reports.ts`): aggregate data, create BoardReport record
14. Create API route handler: validate CAE role, aggregate data, render PDF, store in S3, return binary
15. Update report generation page UI: add quarter/year selector, executive commentary textarea, generate button

### Plan 08-05: Excel Exports (Wave 2, parallel with 08-03, 08-04)

**Goal:** Implement XLSX export for findings, compliance, and audit plans with role filtering and professional formatting.

**Files:**

- `src/lib/excel-export.ts` (shared ExcelJS utilities)
- `src/app/api/exports/findings/route.ts`
- `src/app/api/exports/compliance/route.ts`
- `src/app/api/exports/audit-plans/route.ts`
- `src/data-access/exports.ts` (export data queries with role filtering)

**Dependencies to install:**

- `exceljs` — Excel file generation

**Tasks:**

1. Install ExcelJS
2. Create shared Excel utilities: `createWorkbook()` with bank header rows, confidentiality notice, auto-width, alternating row colors
3. Create export DAL with role-based data filtering (EXP-04)
4. Build findings export route (EXP-01): query observations with role filter, format as XLSX
5. Build compliance export route (EXP-02): query compliance requirements, format as XLSX
6. Build audit plans export route (EXP-03): query audit plans + engagements, format as XLSX
7. Add export buttons to existing findings, compliance, and audit plan pages (UI integration)

### Plan 08-06: Integration & UI (Wave 3, depends on 08-03, 08-04, 08-05)

**Goal:** Wire up notification triggers in existing workflows, add UI for notification preferences, report generation, and export buttons.

**Files:**

- `src/app/(dashboard)/settings/notifications/page.tsx` (notification preferences UI)
- `src/app/(dashboard)/reports/page.tsx` (update: add PDF generation button, quarter selector)
- `src/components/reports/report-generator.tsx` (new: UI for generating board report)
- `src/app/(dashboard)/findings/page.tsx` (add export button)
- `src/app/(dashboard)/compliance/page.tsx` (add export button)
- `src/app/(dashboard)/audit-plans/page.tsx` (add export button)
- Various Phase 6/7 server actions (add notification triggers)

**Tasks:**

1. Create notification preferences page (settings/notifications)
2. Update reports page: add board report generation UI (quarter selector, commentary editor, generate button, download link)
3. Add export XLSX buttons to findings, compliance, and audit plans pages
4. Integrate notification triggers into observation lifecycle (Phase 6 actions):
   - Observation issued → queue NOTF-01 (assignment)
   - Response submitted → queue NOTF-02 (response notification)
5. Test end-to-end flow: create observation → issue to auditee → receive email notification
6. Test batch flow: bulk assign 10 observations → receive ONE digest email

---

## 10. Dependencies

### 10.1 Phase Dependencies

| Phase 8 Component        | Depends on                                                      |
| ------------------------ | --------------------------------------------------------------- |
| NotificationQueue schema | Phase 5: PostgreSQL + RLS + audit triggers                      |
| SES email sending        | Phase 5: User model (recipient email), Tenant model (bank name) |
| Notification triggers    | Phase 6: Observation lifecycle (status transitions)             |
| Escalation (supervisor)  | Phase 7: Auditee portal (auditee assignment)                    |
| PDF report data          | Phase 6: Real observation data in PostgreSQL                    |
| Excel export data        | Phase 5: All data migrated to PostgreSQL                        |
| INVITATION email         | Phase 10 (soft): User onboarding creates invitation emails      |
| Compliance export data   | Phase 10 (soft): Full compliance data populated by onboarding   |

### 10.2 External Dependencies

| Dependency                | Version | Purpose                                      |
| ------------------------- | ------- | -------------------------------------------- |
| `@aws-sdk/client-sesv2`   | ^3.x    | AWS SES email sending                        |
| `pg-boss`                 | ^10.x   | PostgreSQL job queue (requires Node 20+)     |
| `@react-email/components` | ^0.x    | Email template components                    |
| `react-email`             | ^5.x    | Email dev tools (devDep, Tailwind 4 support) |
| `@react-pdf/renderer`     | ^4.x    | PDF generation                               |
| `exceljs`                 | ^4.x    | Excel file generation                        |

### 10.3 Infrastructure Prerequisites

- AWS SES domain verification (start during Phase 5 — **1 week lead time**)
- SES production access request (submit early)
- S3 bucket for generated PDFs (created in Phase 7 for evidence)
- Noto Sans font files bundled in `public/fonts/`

---

## 11. Requirements Mapping

| Requirement | Plan         | Success Criterion                                                                    |
| ----------- | ------------ | ------------------------------------------------------------------------------------ |
| NOTF-01     | 08-03, 08-06 | Auditee receives email when observation is assigned                                  |
| NOTF-02     | 08-03, 08-06 | Auditor/Manager receives email when auditee responds                                 |
| NOTF-03     | 08-03        | Deadline reminders sent at 7d, 3d, 1d before due                                     |
| NOTF-04     | 08-03        | Overdue → escalation email to auditee + supervisor                                   |
| NOTF-05     | 08-03        | CAE/CCO receive weekly digest every Monday                                           |
| NOTF-06     | 08-01, 08-03 | Bulk operations batched into single digest email                                     |
| RPT-01      | 08-04        | CAE generates PDF board report for selected period                                   |
| RPT-02      | 08-04        | Report has 5 sections: exec summary, coverage, findings, compliance, recommendations |
| RPT-03      | 08-04, 08-06 | CAE adds executive commentary before generation                                      |
| RPT-04      | 08-04        | Report has logo, confidentiality, page numbers, charts                               |
| RPT-05      | 08-04        | Report includes repeat findings summary                                              |
| EXP-01      | 08-05        | Findings exported as formatted XLSX                                                  |
| EXP-02      | 08-05        | Compliance exported as formatted XLSX                                                |
| EXP-03      | 08-05        | Audit plans exported as formatted XLSX                                               |
| EXP-04      | 08-05        | Exports respect role permissions                                                     |
| EXP-05      | 08-05        | XLSX includes bank name, date, confidentiality header                                |

**Coverage: 16/16 requirements mapped (100%)**

---

## Execution Order

```
Wave 1 (parallel):
  ├── 08-01: Notification Infrastructure
  └── 08-02: Email Templates

Wave 2 (parallel, after Wave 1):
  ├── 08-03: Notification Jobs & Processing
  ├── 08-04: PDF Board Report
  └── 08-05: Excel Exports

Wave 3 (after Wave 2):
  └── 08-06: Integration & UI
```

---

## Risk Mitigation

| Risk                               | Impact                             | Mitigation                                                                       |
| ---------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------- |
| SES domain verification delay      | Can't send emails                  | Start DNS setup in Phase 5; use sandbox for dev/testing                          |
| SES production access denied       | Can't send to unverified addresses | Submit request early with clear use case; have Mailgun as backup                 |
| React-PDF SSR issues in Next.js 16 | Can't generate PDFs server-side    | Fallback: Use API route with `renderToBuffer()`; tested pattern in Next.js 14+   |
| Indian ISP spam filtering          | Users don't receive emails         | SPF/DKIM/DMARC mandatory; plain text alternative; low volume builds reputation   |
| pg-boss process crash              | Missed scheduled jobs              | pg-boss persists jobs in DB; they resume on restart; add health check monitoring |
| Large PDF generation timeout       | Report fails for large banks       | Cache report data; stream response; set generous timeout (60s)                   |

---

_Plan created: 2026-02-09_
_Author: phase-8 planning agent_
_Status: Cross-reviewed by phase-10; all critical + minor issues resolved. Ready for master approval._
