---
phase: 04-polish-deploy
plan: 02
subsystem: i18n
tags: [hindi, marathi, gujarati, devanagari, translations, rbi-terminology, next-intl]

# Dependency graph
requires:
  - phase: 04-01
    provides: "i18n foundation with next-intl, messages/en.json with 224 keys across 11 namespaces"
provides:
  - "Hindi translation file (messages/hi.json) with 224 keys"
  - "Marathi translation file (messages/mr.json) with 224 keys"
  - "Gujarati translation file (messages/gu.json) with 224 keys"
affects: [04-02b, 04-03, 04-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RBI acronym preservation across locales (CRAR, NPA, PCA, DAKSH, KYC, AML, UCB, MFA kept in English)"
    - "Banking terminology follows RBI Shabdavali conventions for Hindi"
    - "Transliteration for tech terms without natural equivalents (Dashboard, Filter, Export)"

key-files:
  created:
    - messages/hi.json
    - messages/mr.json
    - messages/gu.json
  modified: []

key-decisions:
  - "Hindi uses standard Khariboli banking terms per RBI Shabdavali (lekha pariksha, anupaalan, jokhim)"
  - "Marathi uses distinct vocabulary where different from Hindi (ahavaal for Report, teevrata for Severity, pralumbit for Pending)"
  - "Gujarati uses transliterated Audit (ઓડિટ) rather than lekha pariksha, matching common Gujarati banking software usage"
  - "Email placeholder kept as-is across all locales (rajesh.deshmukh@apexbank.example) since it is sample data"

patterns-established:
  - "Translation key structure: 11 namespaces with flat camelCase keys, identical across en/hi/mr/gu"
  - "Acronym policy: All RBI/banking acronyms remain in English; only surrounding text is translated"
  - "Tech term transliteration: Dashboard, Filter, Export, Print, Reset use script-native transliterations"

# Metrics
duration: 5min
completed: 2026-02-08
---

# Phase 4 Plan 2: Hindi/Marathi/Gujarati UI Translation Files Summary

**224-key UI translations in Hindi (Devanagari), Marathi (Devanagari), and Gujarati (Gujarati script) with RBI acronyms preserved and standard banking terminology**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-07T22:14:58Z
- **Completed:** 2026-02-07T22:19:43Z
- **Tasks:** 2
- **Files created:** 3

## Accomplishments

- Hindi translation file with all 224 keys using standard Khariboli banking terminology per RBI Shabdavali
- Marathi translation file with distinct Marathi vocabulary (ahavaal, teevrata, pralumbit) in Devanagari script
- Gujarati translation file with Gujarati script (U+0A80-U+0AFF) throughout, using common banking software conventions
- All RBI acronyms (CRAR, NPA, PCA, DAKSH, KYC, AML, CRR, SLR, ALM, UCB, MFA) preserved in English across all locales
- Key structure verified identical across all 4 locale files (en, hi, mr, gu)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Hindi translation file** - `141d6fa` (feat)
2. **Task 2: Create Marathi and Gujarati translation files** - `cb9d00c` (feat)

## Files Created/Modified

- `messages/hi.json` - Hindi (Devanagari) UI translations, 248 lines, 224 keys across 11 namespaces
- `messages/mr.json` - Marathi (Devanagari) UI translations, 248 lines, 224 keys across 11 namespaces
- `messages/gu.json` - Gujarati (Gujarati script) UI translations, 248 lines, 224 keys across 11 namespaces

## Decisions Made

1. **Hindi banking terminology source:** Used RBI Shabdavali conventions -- lekha pariksha (audit), anupaalan (compliance), jokhim (risk), prativedan (report)
2. **Marathi distinct vocabulary:** Where Marathi differs from Hindi, used authentic Marathi: ahavaal (report vs Hindi prativedan), teevrata (severity vs Hindi gambhirta), pralumbit (pending vs Hindi lumbit)
3. **Gujarati audit transliteration:** Used transliterated "ઓડિટ" (audit) rather than formal "લેખા પરીક્ષા", matching common usage in Gujarati banking software
4. **Email placeholder preserved:** rajesh.deshmukh@apexbank.example kept as-is in all locales since it is sample/demo data
5. **Status and severity translations standardized:** Each language has consistent status values (Compliant/Partial/Non-Compliant/Pending) and severity levels (Critical/High/Medium/Low) mapped to natural equivalents

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 4 locale files (en, hi, mr, gu) ready for next-intl integration
- Plan 04-02b can proceed with demo data translations (findings, compliance, audit plan content)
- Plan 04-03 can proceed with language switcher cookie integration
- Build tested successfully with all translation files in place

## Self-Check: PASSED

---
*Phase: 04-polish-deploy*
*Completed: 2026-02-08*
