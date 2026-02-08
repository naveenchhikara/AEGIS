---
phase: quick
plan: 001
type: execute
wave: 1
depends_on: []
files_modified:
  - src/data/rbi-regulations/index.json
  - src/data/rbi-regulations/chapters.json
  - src/data/rbi-regulations/definitions.json
  - src/data/rbi-regulations/capital-structure.json
  - src/data/rbi-regulations/compliance-requirements.json
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Application can load RBI Basel III regulation data from JSON files"
    - "Regulation chapters are structured and navigable"
    - "Key definitions are queryable for search/reference"
    - "Capital structure elements (Tier 1, Tier 2) are documented"
    - "Compliance requirements derived from regulations are mapped to RBI circulars"
  artifacts:
    - path: "src/data/rbi-regulations/index.json"
      provides: "Master index of all Basel III regulations with metadata"
      min_lines: 20
    - path: "src/data/rbi-regulations/chapters.json"
      provides: "Chapter-by-chapter breakdown of regulations"
      contains: "chapters array with chapter_number, title, sections"
    - path: "src/data/rbi-regulations/definitions.json"
      provides: "Key banking and regulatory definitions"
      contains: "definitions array with term, explanation, reference"
    - path: "src/data/rbi-regulations/capital-structure.json"
      provides: "Capital elements (Tier 1, Tier 2) with regulatory criteria"
      contains: "tier1_capital, tier2_capital, deductions"
    - path: "src/data/rbi-regulations/compliance-requirements.json"
      provides: "UCB-specific compliance requirements derived from Basel III"
      contains: "requirements array with id, title, category, applicability"
  key_links:
    - from: "src/data/rbi-regulations/index.json"
      to: "src/data/rbi-regulations/chapters.json"
      via: "chapter_ids reference"
      pattern: "chapter_ids"
    - from: "src/data/rbi-regulations/compliance-requirements.json"
      to: "src/data/rbi-regulations/chapters.json"
      via: "chapter_number reference"
      pattern: "chapter"
    - from: "src/types/index.ts"
      to: "src/data/rbi-regulations/*.json"
      via: "TypeScript type validation"
      pattern: "RBICircular|ComplianceRequirement"
---

<objective>
Create a structured knowledge base of RBI Basel III Capital Regulations for UCBs, extracted from the provided PDF document into queryable JSON files.

Purpose: Enable the AEGIS platform to reference and display regulatory requirements, definitions, and compliance guidance for Urban Cooperative Banks. This data will support the compliance registry and audit planning features.

Output: Five JSON files containing regulation metadata, chapter breakdowns, definitions, capital structure elements, and UCB-specific compliance requirements.
</objective>

<execution_context>
@/Users/admin/.claude/get-shit-done/workflows/execute-plan.md
@/Users/admin/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@src/types/index.ts
@Project Doc/rbi-circulars/index.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create regulation index and chapter structure</name>
  <files>src/data/rbi-regulations/index.json, src/data/rbi-regulations/chapters.json</files>
  <action>
    Create two JSON files:

    **1. src/data/rbi-regulations/index.json** - Master regulation document:
    - Document metadata: title, date (2024-07-01), circular reference, applicability
    - Regulation categories: Capital Adequacy, Risk Management, Disclosure, Reporting
    - Chapter count (15), appendix count
    - UCB applicability dates by bank tier (Tier 1, Tier 2, Tier 3/4)
    - Link to chapters.json for detailed content

    **2. src/data/rbi-regulations/chapters.json** - Chapter breakdown:
    - Array of 15 chapters with: chapter_number, title, summary, key_topics[]
    - Include sections array for each chapter with section_number and title
    - Mark UCB-specific sections (Chapter 2 on applicability is critical)
    - Tag chapters by category: governance, risk, capital, disclosure, reporting

    Chapter structure based on PDF:
    1. Short title and commencement
    2. Commencement of applicability (UCB dates)
    3. Definitions (25+ terms)
    4. Capital structure (Tier 1, Tier 2 elements)
    5. Capital adequacy requirements (including buffers)
    6. Risk-weighted assets
    7. Credit risk (standardized approach)
    8. Securitization framework
    9. Counterparty credit risk
    10. Market risk
    11. Operational risk
    12. Large exposures framework
    13. Disclosure requirements
    14. Reporting to Reserve Bank
    15. Penal provisions

    Use ISO 8601 dates. Create directory if needed: src/data/rbi-regulations/

  </action>
  <verify>
    - Files exist in src/data/rbi-regulations/
    - JSON is valid (cat files, no parse errors)
    - index.json contains document metadata and UCB applicability
    - chapters.json contains 15 chapters with sections
  </verify>
  <done>
    Regulation index and chapter structure JSON files are created and valid. Files contain proper metadata for Basel III document and structured chapter/section hierarchy.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create definitions and capital structure data</name>
  <files>src/data/rbi-regulations/definitions.json, src/data/rbi-regulations/capital-structure.json</files>
  <action>
    Create two JSON files:

    **1. src/data/rbi-regulations/definitions.json** - Regulatory definitions:
    - Extract key definitions from Chapter 3 of the PDF
    - Structure: {definitions: [{term, explanation, chapter_reference, category}]}
    - Categories: capital, risk, assets, regulatory, general
    - Include 25+ key terms: Capital Adequacy Ratio, Tier 1 Capital, Tier 2 Capital, Risk-Weighted Assets, Common Equity Tier 1, Capital Conservation Buffer, NPA, Standard Assets, Subordinated Debt, etc.
    - Each definition has concise explanation suitable for UCB context

    **2. src/data/rbi-regulations/capital-structure.json** - Capital elements:
    - Structure: {tier1_capital: {...}, tier2_capital: {...}, deductions: [...]}
    - Tier 1: Paid-up capital, statutory reserves, surplus, revaluation reserves, disclosed reserves, innovative instruments (permitted)
    - Tier 2: Revaluation reserves, general provisions, hybrid instruments, subordinated debt
    - Deductions: Investments in subsidiaries, intangible assets, deferred tax assets, losses
    - Include limits: Tier 2 to Tier 1 ratio, minimum ratios for UCBs
    - UCB-specific notes where capital treatment differs from scheduled banks

    Reference the existing types in src/types/index.ts for compliance patterns.

  </action>
  <verify>
    - definitions.json has 25+ terms with explanations
    - capital-structure.json contains Tier 1, Tier 2, and deductions
    - JSON is valid
  </verify>
  <done>
    Definitions and capital structure JSON files created. Users can query regulatory terms and understand capital composition requirements for UCBs.
  </done>
</task>

<task type="auto">
  <name>Task 3: Create UCB compliance requirements from Basel III</name>
  <files>src/data/rbi-regulations/compliance-requirements.json, src/data/index.ts</files>
  <action>
    Create compliance requirements JSON and update data exports:

    **1. src/data/rbi-regulations/compliance-requirements.json**:
    - Structure: {requirements: [{id, title, description, category, chapter_reference, ucb_applicability, frequency, evidence_required}]}
    - Extract 30+ requirements from Basel III relevant to UCBs
    - Use CATEGORY-NNN ID format matching existing patterns (from 01-01-SUMMARY)
    - Categories: Capital (CAP-), Risk Management (RISK-), Credit Risk (CR-), Market Risk (MR-), Operational Risk (OR-), Disclosure (DISC-), Reporting (REP-)
    - Mark applicability by UCB tier (all UCBs, Tier 1 only, Tier 2+)
    - Include evidence_required field for each requirement

    Key requirements to include:
    - CAP-001: Minimum Capital Adequacy Ratio (9% for UCBs)
    - CAP-002: Capital Conservation Buffer (varies by tier)
    - CAP-003: Tier 1 capital minimum (6% for UCBs)
    - RISK-001: Risk-based supervision implementation
    - CR-001: Standardized approach for credit risk
    - CR-002: NPA classification and provisioning
    - MR-001: Interest rate risk monitoring
    - OR-001: Operational risk assessment
    - DISC-001: Pillar 3 disclosure requirements
    - REP-001: Monthly/quarterly reporting to RBI
    - REP-002: Large exposure reporting
    - etc.

    **2. Update src/data/index.ts**:
    - Export regulation data: export { regulations } from './rbi-regulations/index.json'
    - Export requirements: export { complianceRequirements } from './rbi-regulations/compliance-requirements.json'
    - Add re-exports for chapters, definitions, capital-structure

    Follow existing project patterns from 01-01-SUMMARY for ISO 8601 dates and CATEGORY-NNN IDs.

  </action>
  <verify>
    - compliance-requirements.json has 30+ requirements
    - IDs follow CATEGORY-NNN pattern
    - Each requirement has ucb_applicability field
    - src/data/index.ts exports all regulation data
  </verify>
  <done>
    UCB compliance requirements extracted from Basel III and exported. Application can now load and display regulatory requirements with UCB-specific applicability.
  </done>
</task>

</tasks>

<verification>
After completing all tasks:

1. **Data Validation**: All JSON files are valid and parse correctly
2. **Coverage**: All 15 chapters from Basel III are represented
3. **UCB Context**: Requirements include UCB-specific applicability notes
4. **Type Safety**: Data structures align with TypeScript types in src/types/index.ts
5. **Export Integration**: Data is properly exported from src/data/index.ts for use in components
   </verification>

<success_criteria>

- [ ] 5 JSON files created in src/data/rbi-regulations/
- [ ] index.json contains Basel III document metadata
- [ ] chapters.json contains all 15 chapters with sections
- [ ] definitions.json contains 25+ regulatory terms
- [ ] capital-structure.json documents Tier 1, Tier 2, deductions
- [ ] compliance-requirements.json contains 30+ UCB requirements
- [ ] src/data/index.ts exports all regulation data
- [ ] All files are valid JSON with proper structure
      </success_criteria>

<output>
After completion, create `.planning/quick/001-rbi-regulations-knowledge-base/001-SUMMARY.md`
</output>
