---
phase: quick
plan: 002
type: execute
wave: 1
depends_on: [quick-001]
files_modified:
  - src/data/demo/bank-profile.json
  - src/data/demo/staff.json
  - src/data/demo/branches.json
  - src/data/demo/compliance-requirements.json
  - src/data/demo/audit-plans.json
  - src/data/demo/findings.json
  - src/data/demo/rbi-circulars.json
  - src/data/index.ts
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Demo bank profile reflects realistic Tier 2 UCB in Maharashtra"
    - "Staff members have appropriate roles and departments for audit workflow"
    - "Branch locations are realistic for Maharashtra-based UCB"
    - "Compliance requirements include mix of compliant/partial/non-compliant statuses"
    - "Audit findings reflect common RBI observations from real inspections"
    - "All dates use ISO 8601 format (YYYY-MM-DD)"
    - "Data exports cleanly via src/data/index.ts"
  artifacts:
    - path: "src/data/demo/bank-profile.json"
      provides: "Main bank profile with organizational structure"
      contains: "name, shortName, established, tier"
    - path: "src/data/demo/staff.json"
      provides: "Staff members with roles and departments"
      contains: "id, name, email, role, department"
    - path: "src/data/demo/branches.json"
      provides: "Branch network for demo UCB"
      contains: "id, name, code, location, manager"
    - path: "src/data/demo/compliance-requirements.json"
      provides: "Compliance requirements mapped to RBI circulars"
      contains: "id, categoryId, status, dueDate, assignedTo"
    - path: "src/data/demo/audit-plans.json"
      provides: "Scheduled and in-progress audits"
      contains: "id, name, type, status, progress"
    - path: "src/data/demo/findings.json"
      provides: "Audit findings with severity and timeline"
      contains: "id, severity, status, observation, timeline"
    - path: "src/data/index.ts"
      provides: "Central export for all demo data"
      exports: ["bankProfile", "staff", "branches", "complianceRequirements", "auditPlans", "findings"]
  key_links:
    - from: "compliance-requirements.json"
      to: "rbi-regulations/compliance-requirements.json"
      via: "categoryId references"
      pattern: "categoryId: (GOV|RISK|CREDIT|MARKET|OPERATIONAL|CYBER|DISCLOSURE|REPORTING)-\\d{3}"
    - from: "findings.json"
      to: "rbi-regulations/definitions.json"
      via: "common RBI observation patterns"
      pattern: "observation: (Capital adequacy|Risk management|Credit appraisal)"
---

<objective>
Create realistic demo data for AEGIS UCB audit platform prototype

Purpose: Provide realistic Indian UCB context for prototype demonstrations to potential pilot partners
Output: Complete demo data set representing a Tier 2 Maharashtra cooperative bank with realistic audit scenarios
</objective>

<execution_context>
@/Users/admin/.claude/get-shit-done/workflows/execute-plan.md
@/Users/admin/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/001-rbi-regulations-knowledge-base/001-SUMMARY.md
@/Users/admin/Developer/AEGIS/src/types/index.ts
@/Users/admin/Developer/AEGIS/src/data/rbi-regulations/compliance-requirements.json
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create bank profile, staff, and branch data</name>
  <files>
    src/data/demo/bank-profile.json
    src/data/demo/staff.json
    src/data/demo/branches.json
  </files>
  <action>
    Create three JSON files representing a realistic Tier 2 UCB:

    **src/data/demo/bank-profile.json:**
    - Bank: "Apex Sahakari Bank Ltd" (fictional but realistic)
    - Short name: "Apex Bank"
    - Established: 1985-03-15
    - Location: Pune, Maharashtra
    - Tier: Tier 2 (paid-up capital 2-10 crore)
    - Business mix: ~800 crore (typical Tier 2 UCB)
    - Branches: 12 branches across Pune district
    - Departments: 7 departments (Credit, Operations, IT, Compliance, Audit, HR, Treasury)

    **src/data/demo/staff.json:**
    Create 12 staff members with realistic Indian names:
    - CEO: Rajesh Deshmukh (ceo@apexbank.example)
    - Audit Manager: Priya Sharma (auditor)
    - Compliance Officer: Amit Joshi (officer)
    - Credit Manager: Suresh Patil (manager)
    - IT Manager: Vikram Kulkarni (manager)
    - Branch Managers (3): Meena Naik, Rahul Joshi, Anjali Desai
    - Clerks (3): Sanjay More, Preeti Kale, Mahesh Thorat
    - Director: Subhash Jadhav (chairman)
    - Operations Head: Deepak Ghorpade

    **src/data/demo/branches.json:**
    Create 12 branches with realistic Pune locations:
    - Head Office: "Swargate, Pune" (BR001)
    - Branches: "Kothrud", "Shivajinagar", "Camp", "Kasar Sai", "Chinchwad", "Pimpri", "Bibvewadi", "Kondhwa", "Hadapsar", "Viman Nagar", "Wanowrie"
    - Each branch: code (BR002-BR012), location, manager name

    Use ISO 8601 dates throughout.
  </action>
  <verify>
    Check JSON validity:
    ```bash
    cat src/data/demo/bank-profile.json | jq empty
    cat src/data/demo/staff.json | jq empty
    cat src/data/demo/branches.json | jq empty
    ```
  </verify>
  <done>
    Three valid JSON files representing a complete Tier 2 UCB organizational structure
  </done>
</task>

<task type="auto">
  <name>Task 2: Create compliance requirements and audit plans</name>
  <files>
    src/data/demo/compliance-requirements.json
    src/data/demo/audit-plans.json
  </files>
  <action>
    Create two JSON files representing compliance and audit status:

    **src/data/demo/compliance-requirements.json:**
    Create 15 compliance requirements using CATEGORY-NNN format from existing RBI knowledge base:
    - Status mix: 5 compliant, 4 partial, 3 non-compliant, 3 pending
    - Categories: Capital (CAP), Risk Management (RISK), Governance (GOV), Credit (CREDIT), Cyber Security (CYBER)
    - Due dates spread across Q1 2026 (Jan-Mar)
    - Each assigned to relevant staff (Amit Joshi for compliance, Suresh Patil for credit, etc.)
    - Evidence count varies (0-6 documents)
    - Example: CAP-001 "Maintain CRAR >= 9%" - status: partial, due: 2026-03-31, assignedTo: "amit.joshi"

    **src/data/demo/audit-plans.json:**
    Create 8 audit plans showing different states:
    - 2 completed (Q3 2025 branch audits)
    - 2 in-progress (Q4 2025 IS audit, credit audit)
    - 2 planned (Q1 2026 compliance audit, annual inspection)
    - 1 on-hold (revenue audit pending clarifications)
    - 1 cancelled (merged with annual audit)
    - Progress values: 0%, 25%, 45%, 60%, 80%, 100%
    - Audit types: branch-audit, is-audit, credit-audit, compliance-audit, revenue-audit
    - Teams: mix of Priya Sharma + external auditors

    Reference existing compliance requirements IDs from src/data/rbi-regulations/compliance-requirements.json
  </action>
  <verify>
    Check JSON validity and reference consistency:
    ```bash
    cat src/data/demo/compliance-requirements.json | jq empty
    cat src/data/demo/audit-plans.json | jq empty
    jq '.[].categoryId' src/data/demo/compliance-requirements.json | sort -u
    ```
  </verify>
  <done>
    Valid JSON files with realistic audit scenario covering all lifecycle states
  </done>
</task>

<task type="auto">
  <name>Task 3: Create audit findings and RBI circulars, export data</name>
  <files>
    src/data/demo/findings.json
    src/data/demo/rbi-circulars.json
    src/data/index.ts
  </files>
  <action>
    Create findings and circulars data, then update exports:

    **src/data/demo/findings.json:**
    Create 10 audit findings reflecting common RBI observations:
    - Severity mix: 1 critical, 3 high, 4 medium, 2 low
    - Status: 2 closed, 3 responded, 2 reviewed, 2 submitted, 1 draft
    - Categories based on common observations: Credit appraisal deficiencies, ALM weaknesses, Cyber security gaps, Governance issues
    - Each finding includes: observation, rootCause, riskImpact, auditeeResponse, actionPlan
    - Timeline entries: 2-5 entries per finding showing progression
    - Critical finding example: "CRAR fell to 8.2% in Sep 2025, below regulatory 9% threshold"
    - High finding examples: "No approved ALM policy", "Annual cyber security audit not conducted"

    **src/data/demo/rbi-circulars.json:**
    Create 6 important RBI circulars referenced in findings:
    - RBI/2023-24/117: Revised Basel III capital guidelines
    - RBI/2022-23/153: Cyber security framework
    - RBI/2021-22/108: ALM guidelines for UCBs
    - RBI/2024-25/42: Fit & Proper norms
    - RBI/2023-24/89: Large exposure norms
    - RBI/2022-23/76: Risk management committee

    **src/data/index.ts:**
    Add exports for all demo data files:
    ```typescript
    // Demo data
    export { default as bankProfile } from './demo/bank-profile.json'
    export { default as staff } from './demo/staff.json'
    export { default as branches } from './demo/branches.json'
    export { default as complianceRequirements } from './demo/compliance-requirements.json'
    export { default as auditPlans } from './demo/audit-plans.json'
    export { default as findings } from './demo/findings.json'
    export { default as rbiCirculars } from './demo/rbi-circulars.json'
    ```

    Ensure all dates are ISO 8601 format.
  </action>
  <verify>
    Check JSON validity and TypeScript exports:
    ```bash
    cat src/data/demo/findings.json | jq empty
    cat src/data/demo/rbi-circulars.json | jq empty
    npx tsc --noEmit
    ```
  </verify>
  <done>
    All demo data files created and exported, no TypeScript errors
  </done>
</task>

</tasks>

<verification>
1. All JSON files parse without errors
2. Type imports work correctly in TypeScript
3. Reference integrity (categoryId, assignedTo references valid)
4. Date format consistency (ISO 8601)
5. Realistic Indian UCB context throughout
</verification>

<success_criteria>
1. Can import and use all demo data from src/data/index.ts
2. Data represents plausible Tier 2 UCB scenario
3. Audit findings reflect real RBI observation patterns
4. Staff and branch data scale appropriately for prototype
5. All foreign key references resolve correctly
</success_criteria>

<output>
After completion, create `.planning/quick/002-demo-data/002-SUMMARY.md`
</output>
