---
phase: 08-notifications-reports
plan: 02
status: complete
commit: ef12c50
---

# 08-02 Summary: Email Templates

## What was done

### Task 1: Shared email components + render helper

Created 4 reusable email components in `src/emails/components/`:

1. **email-base-layout.tsx** — Full email wrapper with AEGIS branding header (navy blue), bank name, content area, footer with "Manage notification preferences" link, and "CONFIDENTIAL" notice
2. **severity-badge.tsx** — Inline-styled severity indicator (Critical=red, High=orange, Medium=yellow, Low=green)
3. **observation-card.tsx** — Compact observation row for digest tables (title, severity, branch, due date)
4. **cta-button.tsx** — Centered call-to-action button (blue, rounded, inline-styled)

Created `src/emails/render.ts` with:

- `renderEmail(template)` — Converts React Email element to `{ html, text }` (plain text for Rediffmail compatibility)
- `renderEmailTemplate(templateName, payload)` — Dynamic template registry that maps template names to React components, returns `{ subject, html, text }`. Used by notification processor (08-03).

### Task 2: 6 email templates

Created in `src/emails/templates/`:

1. **assignment-email.tsx (NOTF-01)** — Subject: `[{bank}] New audit observation assigned — {title}`. Shows severity badge, branch, due date, condition excerpt, CTA → "View Observation"
2. **response-email.tsx (NOTF-02)** — Subject: `[{bank}] Auditee response received — {title}`. Shows auditor response excerpt with blue left-border, evidence count, CTA → "Review Response"
3. **reminder-email.tsx (NOTF-03)** — Subject: `[{bank}] Deadline in {days} day(s) — {title}`. Color-coded urgency: 7d=blue, 3d=amber, 1d=red. Large day counter, CTA → "Submit Response"
4. **escalation-email.tsx (NOTF-04)** — Subject: `[{bank}] OVERDUE: {title} — Immediate action required`. Red alert box with overdue day counter, branch and assignee info
5. **weekly-digest-email.tsx (NOTF-05)** — Subject: `[{bank}] Weekly Audit Summary — Week of {date}`. 4-metric grid (open, closed, overdue, new), compliance score with change indicator, top findings table, upcoming deadlines
6. **bulk-digest-email.tsx (NOTF-06)** — Subject: `[{bank}] {count} new observations assigned to you`. Observation table with severity badges, CTA → "View All Observations"

## Verification

- `pnpm build` ✅ — all 11 files compile, 14 static pages generated
- All templates use EmailBaseLayout with header/footer ✅
- Assignment email has severity badge and CTA ✅
- Reminder email has 3 urgency color levels (blue/amber/red) ✅
- Weekly digest has summary stats, top findings, compliance score ✅
- Bulk digest has observation table ✅
- render.ts produces both HTML and plain text ✅
- renderEmailTemplate integrates with notification processor (08-03) ✅
- All templates use inline styles (email-safe, no Tailwind) ✅
