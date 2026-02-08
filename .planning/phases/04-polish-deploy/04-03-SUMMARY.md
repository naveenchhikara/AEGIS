---
phase: 04-polish-deploy
plan: 03
subsystem: i18n
tags: [next-intl, translations, language-switcher, cookie-locale]

requires:
  - phase: 04-polish-deploy
    plan: 01
    provides: "i18n foundation (next-intl, Noto Sans fonts, messages/*.json)"
  - phase: 04-polish-deploy
    plan: 02
    provides: "Hindi/Marathi/Gujarati UI translation files"
provides:
  - "Fully translatable UI with working language switching"
  - "All dashboard pages use translation function calls"
  - "Cookie-based locale persistence"
affects: []

tech-stack:
  added: []
  patterns:
    [
      "useTranslations (client)",
      "getTranslations (server)",
      "NEXT_LOCALE cookie",
    ]

key-files:
  created: []
  modified:
    - src/lib/nav-items.ts
    - src/components/layout/top-bar.tsx
    - src/components/layout/app-sidebar.tsx
    - src/components/auth/login-form.tsx
    - src/app/(dashboard)/dashboard/page.tsx
    - src/app/(dashboard)/compliance/page.tsx
    - src/app/(dashboard)/audit-plans/page.tsx
    - src/app/(dashboard)/findings/page.tsx
    - src/app/(dashboard)/reports/page.tsx
    - src/app/(dashboard)/settings/page.tsx
    - src/app/(dashboard)/auditee/page.tsx
    - src/components/reports/print-button.tsx

key-decisions:
  - "UI frame translations only — demo data stays English per user directive"
  - "Cookie-based locale switching with page reload (not client-side state)"
  - "tKey field added to navItems for translation key lookup"

duration: 15min
completed: 2026-02-08
---

# Phase 4 Plan 03: Language Switcher Wiring & UI Translations

**Wire next-intl translations into all layout components and dashboard pages**

## Performance

- **Duration:** 15 min
- **Tasks:** 3/3
- **Files modified:** 12

## Accomplishments

- Wired language switcher in TopBar to set NEXT_LOCALE cookie and reload page
- Added `tKey` field to nav-items.ts for translation key lookup in Navigation namespace
- Translated sidebar navigation labels and footer (Settings, Sign out)
- Translated login form labels, placeholders, buttons, and demo hint
- Wired all 7 dashboard pages with useTranslations (client) or getTranslations (server)
- Translated print button component
- Locale preference persists across page refreshes via cookie

## Task Commits

1. **Task 1: Wire language switcher and translate layout components** — `ef4a8aa`
2. **Task 2: Translate primary dashboard pages** — `ef4a8aa` + `2cf1091`
3. **Task 3: Translate secondary pages** — `2cf1091`

## Files Modified

- `src/lib/nav-items.ts` — Added tKey field for translation lookup
- `src/components/layout/top-bar.tsx` — Language switcher with cookie mechanism, breadcrumb translations
- `src/components/layout/app-sidebar.tsx` — Navigation labels and footer translations
- `src/components/auth/login-form.tsx` — All form labels and placeholders translated
- `src/app/(dashboard)/dashboard/page.tsx` — useTranslations('Dashboard')
- `src/app/(dashboard)/compliance/page.tsx` — useTranslations('Compliance') + Common
- `src/app/(dashboard)/audit-plans/page.tsx` — useTranslations('AuditPlan')
- `src/app/(dashboard)/findings/page.tsx` — getTranslations('Findings')
- `src/app/(dashboard)/reports/page.tsx` — getTranslations('Reports')
- `src/app/(dashboard)/settings/page.tsx` — getTranslations('Settings') + Common
- `src/app/(dashboard)/auditee/page.tsx` — getTranslations('Auditee') + Common
- `src/components/reports/print-button.tsx` — useTranslations('Reports')

## Decisions Made

- User directed "focus on frames" — UI labels translated, demo data content stays in English
- Summary card arrays moved inside component functions to access translation hooks
- Client components use useTranslations(), server components use await getTranslations()

## Deviations from Plan

- getLocaleData() not wired into pages per user directive to skip demo data translation
- Print styles already existed from Phase 3 Plan 5, no changes needed

## Issues Encountered

- None — pnpm build passed successfully

## Verification

- All 7 dashboard pages confirmed using translation functions via grep
- Language switcher sets NEXT_LOCALE cookie and persists across refreshes
- pnpm build succeeds with zero errors

---

_Phase: 04-polish-deploy_
_Completed: 2026-02-08_
