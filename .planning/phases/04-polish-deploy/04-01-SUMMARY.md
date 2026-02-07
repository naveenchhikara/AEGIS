---
phase: 04-polish-deploy
plan: 01
subsystem: i18n
tags: [next-intl, i18n, fonts, noto-sans, translations, locale]
requires:
  - "Phase 1-3 complete (project setup, core screens, finding management)"
provides:
  - "next-intl configured with cookie-based locale detection (no routing)"
  - "Noto Sans font family for Latin, Devanagari, and Gujarati scripts"
  - "English messages file with 224 translation keys across 11 namespaces"
  - "NextIntlClientProvider wrapping all routes"
affects:
  - "04-02: Hindi translations can build on en.json namespace structure"
  - "04-02b: Marathi and Gujarati translations use same structure"
  - "04-03: Language switcher needs to set NEXT_LOCALE cookie"
tech-stack:
  added: [next-intl@4.8.2, Noto_Sans, Noto_Sans_Devanagari, Noto_Sans_Gujarati]
  patterns: [cookie-based-locale, next-intl-without-routing, font-variable-css]
key-files:
  created:
    - src/i18n/request.ts
    - messages/en.json
  modified:
    - next.config.ts
    - src/app/layout.tsx
    - src/app/globals.css
    - tailwind.config.ts
    - package.json
    - pnpm-lock.yaml
key-decisions:
  - id: FONT-SWITCH
    decision: "Replace Inter with Noto Sans family (Latin + Devanagari + Gujarati)"
    reason: "Support Hindi, Marathi, and Gujarati scripts natively with consistent typography"
  - id: LOCALE-COOKIE
    decision: "Use NEXT_LOCALE cookie for locale detection (no i18n routing)"
    reason: "Simpler setup without URL-based locale prefixes, works with existing route structure"
  - id: MESSAGES-STRUCTURE
    decision: "Flat keys within namespaces (e.g., Dashboard.complianceHealth)"
    reason: "Balance between organization and simplicity for ~224 keys"
  - id: ALL-ROUTES-DYNAMIC
    decision: "Accept all routes becoming dynamic (server-rendered) due to cookie reading in root layout"
    reason: "Required for per-request locale detection; acceptable for prototype phase"
duration: ~3 minutes
completed: 2026-02-08
---

# Phase 4 Plan 1: i18n Foundation & Font Setup Summary

**next-intl 4.8.2 with cookie-based locale detection, Noto Sans font family for 4 scripts, and 224 English translation keys across 11 namespaces**

## Performance

- Duration: ~3 minutes
- Build: Passes (46 routes, all dynamic)
- No TypeScript errors
- No lint errors

## Accomplishments

### Task 1: Install next-intl and configure i18n foundation
- Installed next-intl 4.8.2 via pnpm
- Created `src/i18n/request.ts` with cookie-based locale detection reading `NEXT_LOCALE` cookie
- Supports 4 locales: en (default), hi, mr, gu
- Updated `next.config.ts` with `createNextIntlPlugin()` wrapper
- No middleware.ts created (using "without i18n routing" approach)

### Task 2: Switch fonts and wrap layout with i18n provider
- Replaced Inter with Noto Sans (Latin), Noto Sans Devanagari, Noto Sans Gujarati
- All three font CSS variables applied to `<html>` element
- Root layout made async, calls `getLocale()` and `getMessages()` from next-intl/server
- `<html lang={locale}>` set dynamically
- Children wrapped with `<NextIntlClientProvider messages={messages}>`
- Updated `tailwind.config.ts` font-family from `--font-inter` to `--font-noto-sans`
- Added CSS rules for Hindi/Marathi (Devanagari) and Gujarati script font-families
- Created comprehensive `messages/en.json` with 224 keys across 11 namespaces:
  - Common (29), Navigation (7), TopBar (4), Dashboard (33), Compliance (27)
  - AuditPlan (31), Findings (31), Reports (20), Auditee (8), Settings (24), Login (10)

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Install next-intl and configure i18n foundation | cbc1fb2 | src/i18n/request.ts, next.config.ts, package.json |
| 2 | Switch fonts, add i18n provider and English messages | abb6489 | src/app/layout.tsx, globals.css, tailwind.config.ts, messages/en.json |

## Files Created

| File | Purpose |
|------|---------|
| `src/i18n/request.ts` | Cookie-based locale detection with getRequestConfig |
| `messages/en.json` | English translation keys (224 keys, 11 namespaces) |

## Files Modified

| File | Changes |
|------|---------|
| `next.config.ts` | Added createNextIntlPlugin wrapper |
| `src/app/layout.tsx` | Switched from Inter to Noto Sans fonts, added NextIntlClientProvider, async layout |
| `src/app/globals.css` | Added Noto Sans font-family base rule and Indian script CSS rules |
| `tailwind.config.ts` | Updated font-family from --font-inter to --font-noto-sans |
| `package.json` | Added next-intl dependency |
| `pnpm-lock.yaml` | Lock file updated with next-intl and dependencies |

## Decisions Made

1. **Font Switch (FONT-SWITCH):** Replaced Inter with Noto Sans family to natively support Latin, Devanagari (Hindi/Marathi), and Gujarati scripts with consistent typography.

2. **Cookie-based Locale (LOCALE-COOKIE):** Used NEXT_LOCALE cookie for locale detection without i18n routing middleware. This preserves the existing URL structure (no /en/, /hi/ prefixes) while supporting dynamic locale switching.

3. **Messages Structure (MESSAGES-STRUCTURE):** Organized 224 translation keys into 11 flat-key namespaces matching the UI component structure. Keys use camelCase within each namespace.

4. **Dynamic Routes (ALL-ROUTES-DYNAMIC):** Accepted that all routes become dynamic (server-rendered on demand) because the root layout reads cookies for locale detection. This is appropriate for the prototype phase and required for per-request locale.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- **Ready for 04-02 (Hindi translations):** en.json provides the complete namespace structure; create hi.json with same keys
- **Ready for 04-02b (Marathi/Gujarati translations):** Same structure, fonts already loaded
- **Ready for 04-03 (Language switcher):** TopBar language switcher needs to set NEXT_LOCALE cookie and reload; next-intl infrastructure is in place
- **Note:** Components still use hardcoded English text; subsequent plans need to replace hardcoded strings with `useTranslations()` calls

## Self-Check: PASSED
