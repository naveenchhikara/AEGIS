---
module: C
plan: C9
phase: 06-specialized
type: execute
wave: 2
depends_on: [C5]
files_modified:
  - src/app/(dashboard)/is-audit/page.tsx
  - src/components/is-audit/app-inventory-table.tsx
  - src/components/is-audit/checklist-form.tsx
  - src/components/is-audit/vendor-risk-panel.tsx
  - src/components/is-audit/cbs-parameter-audit.tsx
  - src/components/is-audit/cyber-security-checklist.tsx
  - src/components/is-audit/tech-control-evidence.tsx
  - src/data-access/investment.ts
autonomous: true
gap_closure: true

must_haves:
  truths:
    - "IS Audit page displays real ApplicationInventory data from database"
    - "IS audit checklists cover CBS, channels, access, BCP/DR, vendor, change mgmt"
    - "Vendor risk tracking with SLA compliance monitoring"
    - "CBS parameter audit items for interest rates, product masters, privileges"
    - "Cyber security checklist with 122 questionnaires / 25 baseline controls"
    - "Technology control evidence collection with gap analysis"
  artifacts:
    - path: "src/app/(dashboard)/is-audit/page.tsx"
      provides: "Server component fetching real IS audit data via DAL"
      min_lines: 60
      pattern: "getApplicationInventory|getIsAuditChecklists|getVendorRiskAssessments"
    - path: "src/components/is-audit/vendor-risk-panel.tsx"
      provides: "Vendor risk tracking with SLA compliance"
      min_lines: 60
      pattern: "vendorRiskAssessment|slaCompliance|contractEnd"
    - path: "src/components/is-audit/cbs-parameter-audit.tsx"
      provides: "CBS parameter audit items"
      min_lines: 80
      pattern: "cbsParameter|interestRate|productMaster|privilege"
    - path: "src/components/is-audit/cyber-security-checklist.tsx"
      provides: "Cyber security checklist (122 questions / 25 baseline controls)"
      min_lines: 100
      pattern: "cyberSecurity|baselineControl|questionnaire"
    - path: "src/components/is-audit/tech-control-evidence.tsx"
      provides: "Technology control evidence collection + gap analysis"
      min_lines: 60
      pattern: "evidenceCollection|gapAnalysis|controlGap"
  key_links:
    - from: "src/app/(dashboard)/is-audit/page.tsx"
      to: "src/data-access/investment.ts"
      via: "getApplicationInventory, getIsAuditChecklists, getVendorRiskAssessments"
      pattern: "await getApplicationInventory\\(session"
    - from: "src/components/is-audit/app-inventory-table.tsx"
      to: "src/actions/investment/manage-is-audit.ts"
      via: "manageApplicationInventory action"
      pattern: "manageApplicationInventory"
---

<objective>
Wire the `/is-audit` page to real database and build IS/EDP audit module with checklists, vendor risk tracking, CBS parameter audit, cyber security checklist, and technology control evidence collection.

**Purpose:** Close R98-R104 gaps by replacing mock data with real ApplicationInventory/IsAuditChecklist/VendorRiskAssessment data and building comprehensive IS audit tooling.

**Output:** Fully functional IS/EDP audit module with application inventory, 6 audit checklist categories, vendor risk management, CBS parameter audit, cyber security questionnaire, and tech control gap analysis.
</objective>

<execution_context>
@.planning/gap-closure-cde/C9-PLAN.md
</execution_context>

<context>
@.planning/VALIDATION-REPORT.md
@.planning/codebase/CONVENTIONS.md
@src/data-access/investment.ts
@src/actions/investment/manage-is-audit.ts
</context>

<tasks>

<task type="auto">
  <name>Wire IS Audit page to real DAL</name>
  <files>
    src/app/(dashboard)/is-audit/page.tsx
  </files>
  <action>
Replace mock data with real DAL calls and expand tabs:

1. Import DAL functions:

   ```typescript
   import {
     getApplicationInventory,
     getApplicationsPendingDrTest,
     getIsAuditChecklists,
     getVendorRiskAssessments,
   } from "@/data-access/investment";
   ```

2. Replace `const applications: any[] = [];`:

   ```typescript
   const applications = await getApplicationInventory(session);
   const pendingDr = await getApplicationsPendingDrTest(session);
   const checklists = await getIsAuditChecklists(session);
   const vendorAssessments = await getVendorRiskAssessments(session);
   ```

3. Expand to 6 tabs:

   ```typescript
   <Tabs defaultValue="inventory" className="space-y-4">
     <TabsList>
       <TabsTrigger value="inventory">App Inventory ({applications.length})</TabsTrigger>
       <TabsTrigger value="checklist">Audit Checklists</TabsTrigger>
       <TabsTrigger value="vendor">Vendor Risk</TabsTrigger>
       <TabsTrigger value="cbs">CBS Parameters</TabsTrigger>
       <TabsTrigger value="cyber">Cyber Security</TabsTrigger>
       <TabsTrigger value="evidence">Evidence & Gaps</TabsTrigger>
     </TabsList>
     <TabsContent value="inventory">
       <AppInventoryTable applications={applications} pendingDr={pendingDr} />
     </TabsContent>
     <TabsContent value="checklist">
       <ChecklistForm checklists={checklists} />
     </TabsContent>
     <TabsContent value="vendor">
       <VendorRiskPanel assessments={vendorAssessments} applications={applications} />
     </TabsContent>
     <TabsContent value="cbs">
       <CbsParameterAudit />
     </TabsContent>
     <TabsContent value="cyber">
       <CyberSecurityChecklist />
     </TabsContent>
     <TabsContent value="evidence">
       <TechControlEvidence checklists={checklists} />
     </TabsContent>
   </Tabs>
   ```

4. Permission check: IS_AUDITOR role or admin:system
   </action>
   <verify>
   TypeScript clean, IS audit page loads with 6 tabs and real data.
   </verify>
   <done>

- IS Audit page fetches real ApplicationInventory, Checklist, VendorRisk data
- 6-tab layout: Inventory, Checklists, Vendor Risk, CBS, Cyber, Evidence
  </done>
  </task>

<task type="auto">
  <name>Wire AppInventoryTable and ChecklistForm</name>
  <files>
    src/components/is-audit/app-inventory-table.tsx
    src/components/is-audit/checklist-form.tsx
  </files>
  <action>
**AppInventoryTable:**
1. Update props to accept real ApplicationInventory data + pendingDr list
2. Table columns: App Name, Vendor, Version, Hosting (badge), Criticality (color), DR Tested, Last DR Test, Last IS Audit, Data Classification
3. "DR Overdue" alert for apps in pendingDr list (>12 months since last test)
4. CRUD dialogs wired to `manageApplicationInventory()` action
5. Filters: criticality, hosting type, DR tested

**ChecklistForm:**

1. Update to work with real IsAuditChecklist data
2. Category selector: CBS, CHANNELS, ACCESS_CONTROL, BCP_DR, VENDOR, CHANGE_MGMT, CYBER_SECURITY
3. Display checklists grouped by category with completion status
4. Per checklist:
   - Items list with response status (COMPLIANT/NON_COMPLIANT/PARTIAL/NOT_APPLICABLE)
   - Evidence text field per item
   - Remarks field
   - Overall rating: SATISFACTORY/NEEDS_IMPROVEMENT/UNSATISFACTORY
5. Create new checklist → `manageIsAuditChecklist()` action
6. Update existing checklist responses
7. Mark checklist as completed (with completedBy and timestamp)

```typescript
import {
  manageApplicationInventory,
  manageIsAuditChecklist,
} from "@/actions/investment/manage-is-audit";
```

  </action>
  <verify>
App inventory CRUD and checklist form save responses.
  </verify>
  <done>
- App inventory table with CRUD and DR overdue alerts
- Checklist form for 7 categories with response capture
  </done>
</task>

<task type="auto">
  <name>Build Vendor Risk Panel</name>
  <files>
    src/components/is-audit/vendor-risk-panel.tsx
  </files>
  <action>
Create vendor risk tracking with SLA compliance (R100):

1. Props: `assessments` array, `applications` array

2. Vendor risk table:
   - Vendor Name, Application, Contract Start/End, SLA Compliance %, Risk Rating, Last Assessment
   - Risk rating badge (HIGH=red, MEDIUM=yellow, LOW=green)
   - SLA compliance indicator (< 80% = red, 80-95% = yellow, >95% = green)
   - Contract expiry alert (< 90 days = warning, expired = critical)

3. "Add Assessment" dialog:
   - Vendor name, linked application (dropdown)
   - Contract dates, SLA compliance %
   - Risk rating, findings, mitigations
   - Wired to `manageVendorRiskAssessment()` action

4. Edit/update existing assessment

5. Summary cards:
   - Total vendors, high-risk count, expiring contracts, avg SLA compliance

6. Expiring contracts section:
   - List vendors with contracts expiring within 90 days

```typescript
import { manageVendorRiskAssessment } from "@/actions/investment/manage-is-audit";
```

  </action>
  <verify>
Vendor risk panel shows SLA compliance and contract alerts.
  </verify>
  <done>
- Vendor risk tracking with SLA compliance monitoring
- Contract expiry alerts
- CRUD operations for vendor assessments
  </done>
</task>

<task type="auto">
  <name>Build CBS Parameter Audit</name>
  <files>
    src/components/is-audit/cbs-parameter-audit.tsx
  </files>
  <action>
Create CBS (Core Banking Solution) parameter audit items (R101):

1. CBS parameter audit questionnaire:

   ```typescript
   const CBS_PARAMETER_CHECKS = {
     INTEREST_RATES: [
       {
         id: "ir01",
         question: "Interest rates on deposits match approved rate chart",
         riskLevel: "HIGH",
       },
       {
         id: "ir02",
         question: "Interest rates on advances match sanction terms",
         riskLevel: "HIGH",
       },
       {
         id: "ir03",
         question: "Penal interest rates correctly configured",
         riskLevel: "MEDIUM",
       },
       {
         id: "ir04",
         question: "Interest calculation methodology (360/365 days) correct",
         riskLevel: "HIGH",
       },
       {
         id: "ir05",
         question:
           "NPA interest reversal/non-accrual configured per IRAC norms",
         riskLevel: "CRITICAL",
       },
     ],
     PRODUCT_MASTERS: [
       {
         id: "pm01",
         question: "Loan product codes match approved product menu",
         riskLevel: "HIGH",
       },
       {
         id: "pm02",
         question: "Deposit product parameters match policy",
         riskLevel: "HIGH",
       },
       {
         id: "pm03",
         question: "Tenor/maturity limits correctly set per product",
         riskLevel: "MEDIUM",
       },
       {
         id: "pm04",
         question: "Auto-renewal parameters for deposits correctly configured",
         riskLevel: "MEDIUM",
       },
       {
         id: "pm05",
         question: "Charge/fee master matches approved schedule",
         riskLevel: "MEDIUM",
       },
     ],
     PRIVILEGES: [
       {
         id: "pr01",
         question:
           "Maker-checker controls active for all financial transactions",
         riskLevel: "CRITICAL",
       },
       {
         id: "pr02",
         question: "User access matrix matches role-based access policy",
         riskLevel: "CRITICAL",
       },
       {
         id: "pr03",
         question: "Dormant user accounts disabled (>90 days inactive)",
         riskLevel: "HIGH",
       },
       {
         id: "pr04",
         question: "Super-user/admin access restricted and logged",
         riskLevel: "CRITICAL",
       },
       {
         id: "pr05",
         question:
           "Branch-level access controls prevent cross-branch operations",
         riskLevel: "HIGH",
       },
     ],
     DAY_END: [
       {
         id: "de01",
         question:
           "Day-end batch processes complete successfully with reconciliation",
         riskLevel: "HIGH",
       },
       {
         id: "de02",
         question: "EOD reports generated and reviewed daily",
         riskLevel: "MEDIUM",
       },
       {
         id: "de03",
         question: "Exception reports generated for out-of-policy transactions",
         riskLevel: "HIGH",
       },
       {
         id: "de04",
         question: "Backup procedures executed post day-end",
         riskLevel: "HIGH",
       },
       {
         id: "de05",
         question: "Inter-branch reconciliation automated and monitored",
         riskLevel: "MEDIUM",
       },
     ],
   };
   ```

2. Render as grouped checklist form:
   - Category tabs: Interest Rates, Product Masters, Privileges, Day-End
   - Per item: risk level badge, compliance status, evidence, remarks
   - Save progress via `manageIsAuditChecklist()` with category="CBS"

3. Summary: compliant/non-compliant/partial counts per category
4. Overall CBS audit opinion (auto-calculated from responses)
   </action>
   <verify>
   CBS parameter audit checklist renders and saves responses.
   </verify>
   <done>

- 20 CBS parameter audit items across 4 categories
- Checklist with compliance capture
- Saved via IS audit checklist action
  </done>
  </task>

<task type="auto">
  <name>Build Cyber Security Checklist</name>
  <files>
    src/components/is-audit/cyber-security-checklist.tsx
  </files>
  <action>
Create comprehensive cyber security checklist (R103):

1. Structure: 25 baseline controls with expanded questionnaires (simplified to key items):

   ```typescript
   const CYBER_BASELINE_CONTROLS = [
     {
       id: "BC01",
       control: "Inventory of Business Assets",
       questions: [
         "Maintain updated inventory of authorized hardware/software",
         "Identify and document data classification for all critical systems",
         "Track asset lifecycle from procurement to disposal",
         "Periodic verification of inventory accuracy",
       ],
     },
     {
       id: "BC02",
       control: "Access Control Management",
       questions: [
         "Role-based access control (RBAC) implemented",
         "Multi-factor authentication for critical systems",
         "Privileged access management with logging",
         "Access review conducted quarterly",
         "Vendor/third-party access through secure gateway",
       ],
     },
     {
       id: "BC03",
       control: "Network Security",
       questions: [
         "Firewall rules reviewed and updated quarterly",
         "IDS/IPS deployed and monitored",
         "Network segmentation between critical/non-critical zones",
         "Wireless network security controls",
         "VPN for remote access with encryption",
       ],
     },
     // ... Continue for all 25 baseline controls (BC04-BC25):
     // BC04: Secure Configuration, BC05: Patch Management,
     // BC06: Anti-Malware, BC07: Email Security,
     // BC08: Data Loss Prevention, BC09: Encryption,
     // BC10: Vulnerability Assessment, BC11: Penetration Testing,
     // BC12: Log Management, BC13: Incident Response,
     // BC14: Business Continuity, BC15: DR Testing,
     // BC16: Mobile Device Security, BC17: Social Engineering Awareness,
     // BC18: Security Awareness Training, BC19: Change Management,
     // BC20: Physical Security, BC21: Vendor Risk Management,
     // BC22: Outsourcing Security, BC23: Regulatory Compliance,
     // BC24: Security Audit, BC25: Board-Level Cyber Reporting
   ];
   ```

2. Expand all 25 baseline controls with 4-5 questions each (≈122 total questions)

3. Checklist UI:
   - Accordion for each baseline control
   - Per question: COMPLIANT / NON_COMPLIANT / PARTIAL / NOT_APPLICABLE
   - Evidence text, remarks
   - Control-level summary (X of Y compliant)

4. Dashboard header:
   - Total questions, answered, compliant %, non-compliant count
   - Progress bar per baseline control

5. Save via `manageIsAuditChecklist()` with category="CYBER_SECURITY"

6. Gap summary: list all non-compliant items with recommendations
   </action>
   <verify>
   Cyber security checklist renders 25 controls with ~122 questions.
   </verify>
   <done>

- 25 baseline controls with ~122 questionnaire items
- Accordion UI with per-question compliance capture
- Overall and per-control compliance percentages
- Gap summary for non-compliant items
  </done>
  </task>

<task type="auto">
  <name>Build Technology Control Evidence & Gap Analysis</name>
  <files>
    src/components/is-audit/tech-control-evidence.tsx
  </files>
  <action>
Create technology control evidence collection and gap analysis (R104):

1. Props: `checklists` (completed IS audit checklists)

2. Evidence Collection section:
   - Group by checklist category (CBS, Channels, Access, BCP/DR, Vendor, Change Mgmt, Cyber)
   - Per category: list items with non-compliant status
   - "Attach Evidence" button per item (text field for evidence reference)
   - Evidence status: COLLECTED / PENDING / NOT_AVAILABLE

3. Gap Analysis dashboard:
   - Summary: total controls assessed, gaps found, gaps with evidence, gaps without evidence
   - Gap matrix: rows = categories, columns = CRITICAL/HIGH/MEDIUM/LOW risk items
   - Heat map showing gap density per category

4. Gap detail table:
   - Control area, item description, risk level, compliance status
   - Evidence status, remediation plan text
   - Target remediation date
   - Owner assignment

5. Export capability:
   - "Generate Gap Report" button
   - Produces summary of all gaps with evidence status and remediation plans
   - Output as structured data (table view)

6. Remediation tracking:
   - Open gaps count, in-progress, closed
   - Aging of open gaps
     </action>
     <verify>
     Evidence collection and gap analysis render from checklist data.
     </verify>
     <done>

- Technology control evidence collection UI
- Gap analysis dashboard with heat map data
- Gap detail table with remediation tracking
- Category-wise gap matrix
  </done>
  </task>

</tasks>

<verification>
1. TypeScript compilation clean
2. `/is-audit` loads with 6 tabs and real data
3. App inventory CRUD with DR overdue alerts
4. 7-category audit checklists with response capture
5. Vendor risk tracking with SLA compliance
6. CBS parameter audit (20 items, 4 categories)
7. Cyber security checklist (~122 questions, 25 controls)
8. Tech control evidence collection and gap analysis
</verification>

<success_criteria>

- ✅ `/is-audit` page uses real DAL instead of mock data
- ✅ IS audit checklists: CBS, channels, access, BCP/DR, vendor, change mgmt
- ✅ Vendor risk tracking with SLA compliance
- ✅ CBS parameter audit items (interest rates, product masters, privileges)
- ✅ Cyber security checklist (122 questionnaires / 25 baseline controls)
- ✅ Technology control evidence collection + gap analysis
- ✅ TypeScript compilation clean
- ✅ R98-R104 requirements closed
  </success_criteria>

<output>
After completion, update VALIDATION-REPORT.md:
- R98: ✅ (ApplicationInventory wired to real DAL with CRUD)
- R99: ✅ (IS audit checklists for CBS, channels, access, BCP/DR, vendor, change mgmt)
- R100: ✅ (Vendor risk tracking with SLA compliance)
- R101: ✅ (CBS parameter audit items)
- R102: ✅ (IS_AUDITOR role already exists, scoped access)
- R103: ✅ (Cyber security checklist — 25 baseline controls, ~122 questions)
- R104: ✅ (Technology control evidence collection and gap analysis)
</output>
