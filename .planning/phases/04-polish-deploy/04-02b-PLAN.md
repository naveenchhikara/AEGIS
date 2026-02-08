---
phase: 04-polish-deploy
plan: 02b
type: execute
wave: 2
depends_on: ["04-01"]
files_modified:
  - src/data/demo/hi/findings.json
  - src/data/demo/hi/audit-plans.json
  - src/data/demo/hi/compliance-requirements.json
  - src/data/demo/hi/bank-profile.json
  - src/data/demo/hi/branches.json
  - src/data/demo/hi/rbi-circulars.json
  - src/data/demo/mr/findings.json
  - src/data/demo/mr/audit-plans.json
  - src/data/demo/mr/compliance-requirements.json
  - src/data/demo/mr/bank-profile.json
  - src/data/demo/mr/branches.json
  - src/data/demo/mr/rbi-circulars.json
  - src/data/demo/gu/findings.json
  - src/data/demo/gu/audit-plans.json
  - src/data/demo/gu/compliance-requirements.json
  - src/data/demo/gu/bank-profile.json
  - src/data/demo/gu/branches.json
  - src/data/demo/gu/rbi-circulars.json
  - src/lib/get-locale-data.ts
autonomous: true

must_haves:
  truths:
    - "All 35 findings exist in Hindi, Marathi, and Gujarati with translated descriptions, root causes, action plans, and timeline events"
    - "All 55 compliance requirements translated with descriptions and notes"
    - "All 8 audit plans translated with names and notes"
    - "Bank profile, branches, and RBI circulars translated"
    - "RBI acronyms (CRAR, NPA, PCA, DAKSH, KYC, AML, CRR, SLR) remain in English within translated text"
    - "Person names remain as-is (do not translate proper names)"
    - "IDs, dates, numeric values, and enum fields (severity, status) remain identical to English source"
    - "Locale-aware data loading utility exists and returns correct locale data with English fallback"
  artifacts:
    - path: "src/data/demo/hi/findings.json"
      provides: "Hindi translations of all 35 findings"
      min_lines: 500
    - path: "src/data/demo/mr/findings.json"
      provides: "Marathi translations of all 35 findings"
      min_lines: 500
    - path: "src/data/demo/gu/findings.json"
      provides: "Gujarati translations of all 35 findings"
      min_lines: 500
    - path: "src/data/demo/hi/compliance-requirements.json"
      provides: "Hindi translations of all 55 compliance requirements"
      min_lines: 200
    - path: "src/data/demo/mr/compliance-requirements.json"
      provides: "Marathi translations of all 55 compliance requirements"
      min_lines: 200
    - path: "src/data/demo/gu/compliance-requirements.json"
      provides: "Gujarati translations of all 55 compliance requirements"
      min_lines: 200
    - path: "src/lib/get-locale-data.ts"
      provides: "Locale-aware data loading utility with English fallback"
      exports: ["getLocaleData"]
  key_links:
    - from: "src/data/demo/hi/findings.json"
      to: "src/data/demo/findings.json"
      via: "identical structure, translated text fields"
      pattern: "FND-001.*FND-035"
    - from: "src/lib/get-locale-data.ts"
      to: "src/data/demo/**/*.json"
      via: "dynamic import based on locale parameter"
      pattern: "locale.*import|require"
---

<objective>
Create fully translated demo data JSON files for Hindi, Marathi, and Gujarati locales, plus a locale-aware data loading utility. Per user decision: translate EVERYTHING visible, including all 35 findings (descriptions, root causes, action plans, timeline events), 55 compliance requirements, 8 audit plans, bank profile, branches, and RBI circulars.

Purpose: Fulfill the locked user decision to translate ALL visible content — not just UI chrome but all demo data content. This is the content translation counterpart to plan 04-02 (which handles UI label translations).
Output: 18 translated JSON files (6 per locale) in locale-specific subdirectories, plus a data loading utility.
</objective>

<execution_context>
@/Users/admin/.claude/get-shit-done/workflows/execute-plan.md
@/Users/admin/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/04-polish-deploy/04-CONTEXT.md
@src/data/demo/findings.json
@src/data/demo/audit-plans.json
@src/data/demo/compliance-requirements.json
@src/data/demo/bank-profile.json
@src/data/demo/branches.json
@src/data/demo/rbi-circulars.json
@src/data/index.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create Hindi translated demo data files</name>
  <files>
    src/data/demo/hi/findings.json
    src/data/demo/hi/audit-plans.json
    src/data/demo/hi/compliance-requirements.json
    src/data/demo/hi/bank-profile.json
    src/data/demo/hi/branches.json
    src/data/demo/hi/rbi-circulars.json
  </files>
  <action>
    Create directory `src/data/demo/hi/` and translate ALL 6 demo data JSON files into Hindi.

    **Critical rules for ALL files:**
    - Maintain the EXACT same JSON structure and key names as the English source files
    - IDs (id, auditId, branchId, etc.) remain UNCHANGED — they are internal identifiers
    - Dates remain UNCHANGED (ISO format strings)
    - Numeric values remain UNCHANGED (progress percentages, counts, amounts)
    - Enum-like fields remain UNCHANGED: severity ("critical", "high", "medium", "low"), status ("responded", "reviewed", "open", etc.), type fields — these are programmatic values used for filtering/coloring
    - Person names (assignedAuditor, manager, head, actor in timelines) remain as-is — Indian names don't translate
    - Email addresses, phone numbers, PAN, CIN, license numbers remain as-is
    - RBI acronyms stay in English within translated text: CRAR, NPA, PCA, DAKSH, KYC, AML, CRR, SLR, ALM, Basel III, Tier 1, Tier 2
    - RBI circular reference numbers (e.g., "RBI/2023-24/117") remain as-is

    **Fields to translate per file:**

    **findings.json** (35 findings):
    - `title` — translate the finding title (e.g., "CRAR Below Regulatory Threshold" → Hindi equivalent keeping "CRAR" in English)
    - `category` — translate category name (e.g., "Capital Adequacy" → "पूंजी पर्याप्तता")
    - `observation` — full paragraph translation
    - `rootCause` — full paragraph translation
    - `riskImpact` — full paragraph translation
    - `auditeeResponse` — full paragraph translation
    - `actionPlan` — translate numbered action items
    - `timeline[].action` — translate each timeline event description (107 total events across 35 findings)

    **audit-plans.json** (8 plans):
    - `name` — translate audit plan name (e.g., "Q3 2025 Branch Audit - Kothrud" → Hindi equivalent, keeping "Q3 2025" and "Kothrud" as-is since they're proper nouns/dates)
    - `notes` — translate the notes text
    - `branchName` — translate if it contains translatable words (e.g., "Head Office" → "मुख्य कार्यालय", but "Kothrud Branch" → "कोथरुड शाखा")

    **compliance-requirements.json** (55 requirements):
    - `title` — translate requirement title
    - `description` — translate description
    - `notes` — translate notes

    **bank-profile.json:**
    - `name` — keep as-is (registered name stays in English)
    - `shortName` — keep as-is
    - `location` — translate city/state if applicable (Pune stays as "पुणे, महाराष्ट्र")
    - `departments[].name` — translate department names (e.g., "Credit" → "ऋण", "Operations" → "संचालन")
    - `tier` — keep "Tier 2" as-is (RBI classification)

    **branches.json:**
    - `name` — translate (e.g., "Head Office" → "मुख्य कार्यालय", "Kothrud Branch" → "कोथरुड शाखा")
    - `location` — transliterate/translate (e.g., "Swargate, Pune" → "स्वारगेट, पुणे")
    - `address` — transliterate the address into Hindi
    - `type` — translate (e.g., "Head Office" → "मुख्य कार्यालय", "Branch" → "शाखा")

    **rbi-circulars.json:**
    - `title` — translate circular title
    - `category` — translate category
    - `description` — translate description
    - `keyRequirements[]` — translate each requirement string
    - `applicability` — translate

    Use the same Hindi banking terminology as defined in plan 04-02 for consistency. AI-generated translations are acceptable for prototype quality (per user decision).

  </action>
  <verify>
    - All 6 files exist in `src/data/demo/hi/`
    - Each file is valid JSON: `for f in src/data/demo/hi/*.json; do node -e "require('./$f')"; done`
    - findings.json has 35 entries: `node -e "const f=require('./src/data/demo/hi/findings.json'); console.log(f.findings.length);"` outputs 35
    - compliance-requirements.json has 55 entries
    - audit-plans.json has 8 entries
    - All IDs match English source (spot check FND-001, CMP-001, AUD-001)
    - Hindi text uses Devanagari script (not Latin transliteration)
  </verify>
  <done>All 6 Hindi demo data files created with complete translations, maintaining identical JSON structure and preserving IDs/dates/enums/names/acronyms</done>
</task>

<task type="auto">
  <name>Task 2: Create Marathi translated demo data files</name>
  <files>
    src/data/demo/mr/findings.json
    src/data/demo/mr/audit-plans.json
    src/data/demo/mr/compliance-requirements.json
    src/data/demo/mr/bank-profile.json
    src/data/demo/mr/branches.json
    src/data/demo/mr/rbi-circulars.json
  </files>
  <action>
    Create directory `src/data/demo/mr/` and translate ALL 6 demo data JSON files into Marathi.

    Follow the EXACT same rules as Task 1 for what to translate vs. what to keep unchanged. The same field-by-field breakdown applies.

    **Marathi-specific terminology (use distinct Marathi vocabulary, not Hindi):**
    - Audit = "लेखापरीक्षण" (not Hindi "लेखा परीक्षा")
    - Finding = "आढावा" or "निष्कर्ष"
    - Report = "अहवाल" (not Hindi "रिपोर्ट")
    - Risk = "जोखीम" (not Hindi "जोखिम")
    - Severity = "तीव्रता"
    - Category terms should use Marathi equivalents where they differ from Hindi
    - Location names like "Pune" → "पुणे" (Marathi native form)
    - Branch addresses use Marathi transliteration

    Use the same Marathi banking terminology as defined in plan 04-02 Task 2 for consistency.

  </action>
  <verify>
    - All 6 files exist in `src/data/demo/mr/`
    - Each file is valid JSON
    - findings.json has 35 entries, compliance-requirements.json has 55, audit-plans.json has 8
    - All IDs match English source
    - Marathi text uses Devanagari script with Marathi-specific vocabulary (spot-check: "अहवाल" not "रिपोर्ट")
  </verify>
  <done>All 6 Marathi demo data files created with complete translations using distinct Marathi vocabulary</done>
</task>

<task type="auto">
  <name>Task 3: Create Gujarati translated demo data files and locale-aware data loader</name>
  <files>
    src/data/demo/gu/findings.json
    src/data/demo/gu/audit-plans.json
    src/data/demo/gu/compliance-requirements.json
    src/data/demo/gu/bank-profile.json
    src/data/demo/gu/branches.json
    src/data/demo/gu/rbi-circulars.json
    src/lib/get-locale-data.ts
  </files>
  <action>
    **Part A: Create Gujarati demo data files**

    Create directory `src/data/demo/gu/` and translate ALL 6 demo data JSON files into Gujarati.

    Follow the EXACT same rules as Task 1 for what to translate vs. what to keep unchanged.

    **Gujarati-specific notes:**
    - Uses Gujarati script (Unicode U+0A80-U+0AFF), NOT Devanagari
    - Audit = "ઓડિટ" or "લેખા પરીક્ષા"
    - Finding = "તારણ"
    - Report = "અહેવાલ"
    - Risk = "જોખમ"
    - Location "Pune" → "પુણે" (Gujarati script)
    - Use Gujarati banking terminology from plan 04-02 Task 2

    **Part B: Create locale-aware data loading utility**

    Create `src/lib/get-locale-data.ts` that provides a function to load demo data based on locale:

    ```typescript
    import type { Locale } from '@/lib/constants'; // or define locally: 'en' | 'hi' | 'mr' | 'gu'

    // English source data (default fallback)
    import bankProfileEn from '@/data/demo/bank-profile.json';
    import staffEn from '@/data/demo/staff.json';
    import branchesEn from '@/data/demo/branches.json';
    import complianceRequirementsEn from '@/data/demo/compliance-requirements.json';
    import auditPlansEn from '@/data/demo/audit-plans.json';
    import findingsEn from '@/data/demo/findings.json';
    import rbiCircularsEn from '@/data/demo/rbi-circulars.json';

    // Hindi translations
    import bankProfileHi from '@/data/demo/hi/bank-profile.json';
    import branchesHi from '@/data/demo/hi/branches.json';
    import complianceRequirementsHi from '@/data/demo/hi/compliance-requirements.json';
    import auditPlansHi from '@/data/demo/hi/audit-plans.json';
    import findingsHi from '@/data/demo/hi/findings.json';
    import rbiCircularsHi from '@/data/demo/hi/rbi-circulars.json';

    // Marathi translations
    import bankProfileMr from '@/data/demo/mr/bank-profile.json';
    import branchesMr from '@/data/demo/mr/branches.json';
    import complianceRequirementsMr from '@/data/demo/mr/compliance-requirements.json';
    import auditPlansMr from '@/data/demo/mr/audit-plans.json';
    import findingsMr from '@/data/demo/mr/findings.json';
    import rbiCircularsMr from '@/data/demo/mr/rbi-circulars.json';

    // Gujarati translations
    import bankProfileGu from '@/data/demo/gu/bank-profile.json';
    import branchesGu from '@/data/demo/gu/branches.json';
    import complianceRequirementsGu from '@/data/demo/gu/compliance-requirements.json';
    import auditPlansGu from '@/data/demo/gu/audit-plans.json';
    import findingsGu from '@/data/demo/gu/findings.json';
    import rbiCircularsGu from '@/data/demo/gu/rbi-circulars.json';

    type DemoData = {
      bankProfile: typeof bankProfileEn;
      staff: typeof staffEn;           // staff not translated (names)
      branches: typeof branchesEn;
      complianceRequirements: typeof complianceRequirementsEn;
      auditPlans: typeof auditPlansEn;
      findings: typeof findingsEn;
      rbiCirculars: typeof rbiCircularsEn;
    };

    const dataByLocale: Record<string, Partial<Omit<DemoData, 'staff'>>> = {
      hi: {
        bankProfile: bankProfileHi,
        branches: branchesHi,
        complianceRequirements: complianceRequirementsHi,
        auditPlans: auditPlansHi,
        findings: findingsHi,
        rbiCirculars: rbiCircularsHi,
      },
      mr: {
        bankProfile: bankProfileMr,
        branches: branchesMr,
        complianceRequirements: complianceRequirementsMr,
        auditPlans: auditPlansMr,
        findings: findingsMr,
        rbiCirculars: rbiCircularsMr,
      },
      gu: {
        bankProfile: bankProfileGu,
        branches: branchesGu,
        complianceRequirements: complianceRequirementsGu,
        auditPlans: auditPlansGu,
        findings: findingsGu,
        rbiCirculars: rbiCircularsGu,
      },
    };

    /**
     * Get demo data for the specified locale.
     * Falls back to English for any missing locale data.
     * Staff data is always English (names don't translate).
     */
    export function getLocaleData(locale: string = 'en'): DemoData {
      const localeData = dataByLocale[locale] || {};
      return {
        bankProfile: localeData.bankProfile ?? bankProfileEn,
        staff: staffEn,
        branches: localeData.branches ?? branchesEn,
        complianceRequirements: localeData.complianceRequirements ?? complianceRequirementsEn,
        auditPlans: localeData.auditPlans ?? auditPlansEn,
        findings: localeData.findings ?? findingsEn,
        rbiCirculars: localeData.rbiCirculars ?? rbiCircularsEn,
      };
    }
    ```

    Adjust types as needed based on actual TypeScript setup. The key requirement is:
    - Accepts a locale string parameter ('en', 'hi', 'mr', 'gu')
    - Returns the correct locale-specific data
    - Falls back to English for unknown locales or missing data
    - Staff data is always English (names are proper nouns)
    - Exported as a named export `getLocaleData`

  </action>
  <verify>
    - All 6 files exist in `src/data/demo/gu/`
    - Each file is valid JSON
    - findings.json has 35 entries, compliance-requirements.json has 55, audit-plans.json has 8
    - Gujarati text uses Gujarati script characters (not Devanagari)
    - `src/lib/get-locale-data.ts` exists and exports `getLocaleData`
    - TypeScript compiles: `npx tsc --noEmit src/lib/get-locale-data.ts` (or run `pnpm build` if faster)
    - Quick smoke test: `node -e "const m=require('./src/lib/get-locale-data'); const d=m.getLocaleData('hi'); console.log(d.findings.findings.length);"` outputs 35
  </verify>
  <done>All 6 Gujarati demo data files created, locale-aware data loader utility exports getLocaleData with English fallback, all 18 translated JSON files valid</done>
</task>

</tasks>

<verification>
1. Directory structure exists: `src/data/demo/hi/`, `src/data/demo/mr/`, `src/data/demo/gu/`
2. Each directory has 6 JSON files: findings.json, audit-plans.json, compliance-requirements.json, bank-profile.json, branches.json, rbi-circulars.json
3. All 18 JSON files parse without errors
4. Entry counts match English source: 35 findings, 55 compliance reqs, 8 audit plans per locale
5. IDs are identical across all locales (FND-001 through FND-035, CMP-001 through CMP-055, AUD-001 through AUD-008)
6. RBI acronyms appear in English within translated text
7. Person names are unchanged across locales
8. Hindi/Marathi files use Devanagari script, Gujarati files use Gujarati script
9. `src/lib/get-locale-data.ts` compiles and returns correct data per locale
10. `getLocaleData('en')` returns English data, `getLocaleData('hi')` returns Hindi data, etc.
</verification>

<success_criteria>

- 18 translated demo data JSON files exist (6 per locale x 3 locales)
- All 35 findings fully translated in all 3 languages (descriptions, root causes, action plans, timeline events)
- All 55 compliance requirements translated in all 3 languages
- All 8 audit plans translated in all 3 languages
- Bank profile, branches, and RBI circulars translated in all 3 languages
- Locale-aware data loading utility works with English fallback
- RBI acronyms preserved in English, person names unchanged, IDs/dates/enums unchanged
- All JSON files valid and correctly structured
  </success_criteria>

<output>
After completion, create `.planning/phases/04-polish-deploy/04-02b-SUMMARY.md`
</output>
