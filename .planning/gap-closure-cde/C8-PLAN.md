---
module: C
plan: C8
phase: 06-specialized
type: execute
wave: 2
depends_on: [C5]
files_modified:
  - src/app/(dashboard)/investments/page.tsx
  - src/components/investments/investment-table.tsx
  - src/components/investments/sgl-reconciliation.tsx
  - src/components/investments/broker-analytics.tsx
  - src/components/investments/non-slr-monitor.tsx
  - src/components/investments/classification-checklist.tsx
  - src/components/investments/quarterly-certification.tsx
  - src/data-access/investment.ts
autonomous: true
gap_closure: true

must_haves:
  truths:
    - "Investments page displays real InvestmentRecord data from database"
    - "SGL/CSGL reconciliation tracking shows reconciled vs unreconciled records"
    - "Broker compliance analytics enforce 5% cap per broker"
    - "Non-SLR investment cap monitoring shows 10% of deposits threshold"
    - "HTM/HFT/AFS classification audit checklist available"
    - "Quarterly auditor certification workflow tracks certifications"
  artifacts:
    - path: "src/app/(dashboard)/investments/page.tsx"
      provides: "Server component fetching real investment data via DAL"
      min_lines: 60
      pattern: "getInvestmentRecords|getBrokerConcentration|getUnreconciledInvestments"
    - path: "src/components/investments/sgl-reconciliation.tsx"
      provides: "SGL/CSGL reconciliation tracking dashboard"
      min_lines: 60
      pattern: "reconciled|unreconciled|markReconciled"
    - path: "src/components/investments/broker-analytics.tsx"
      provides: "Broker concentration analytics with 5% cap alerts"
      min_lines: 80
      pattern: "brokerConcentration|capBreach|5%"
    - path: "src/components/investments/non-slr-monitor.tsx"
      provides: "Non-SLR cap monitoring (10% of deposits)"
      min_lines: 40
      pattern: "nonSlrCap|totalDeposits|capUtilization"
    - path: "src/components/investments/classification-checklist.tsx"
      provides: "HTM/HFT/AFS classification audit checklist"
      min_lines: 60
      pattern: "HTM|HFT|AFS|classificationCheck"
    - path: "src/components/investments/quarterly-certification.tsx"
      provides: "Quarterly auditor certification workflow"
      min_lines: 50
      pattern: "certification|quarter|certified"
  key_links:
    - from: "src/app/(dashboard)/investments/page.tsx"
      to: "src/data-access/investment.ts"
      via: "getInvestmentRecords, getBrokerConcentration"
      pattern: "await getInvestmentRecords\\(session"
    - from: "src/components/investments/investment-table.tsx"
      to: "src/actions/investment/manage-records.ts"
      via: "manageInvestmentRecord, markReconciled"
      pattern: "manageInvestmentRecord|markReconciled"
---

<objective>
Wire the `/investments` page to real database and build investment/treasury compliance monitoring including SGL/CSGL reconciliation, broker analytics, non-SLR cap monitoring, classification checklist, and quarterly certification.

**Purpose:** Close R93-R97 gaps by replacing mock data with real InvestmentRecord data and building specialized compliance monitoring dashboards for UCB investment/treasury operations.

**Output:** Fully functional investment & treasury module with portfolio view, reconciliation, broker monitoring, regulatory cap tracking, classification audit, and certification workflow.
</objective>

<execution_context>
@.planning/gap-closure-cde/C8-PLAN.md
</execution_context>

<context>
@.planning/VALIDATION-REPORT.md
@.planning/codebase/CONVENTIONS.md
@src/data-access/investment.ts
@src/actions/investment/manage-records.ts
@src/lib/investment-compliance.ts
</context>

<tasks>

<task type="auto">
  <name>Wire investments page to real DAL</name>
  <files>
    src/app/(dashboard)/investments/page.tsx
  </files>
  <action>
Replace mock data with real DAL calls and expand to 6 tabs:

1. Import DAL functions:
   ```typescript
   import {
     getInvestmentRecords, getBrokerConcentration,
     getUnreconciledInvestments
   } from "@/data-access/investment";
   ```

2. Replace `const investments: any[] = [];`:
   ```typescript
   const investments = await getInvestmentRecords(session);
   const currentPeriod = `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
   const brokerData = await getBrokerConcentration(session, currentPeriod);
   const unreconciled = await getUnreconciledInvestments(session, currentPeriod);
   ```

3. Expand to 6-tab layout:
   ```typescript
   <Tabs defaultValue="portfolio" className="space-y-4">
     <TabsList>
       <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
       <TabsTrigger value="reconciliation">SGL/CSGL ({unreconciled.length} pending)</TabsTrigger>
       <TabsTrigger value="broker">Broker Analytics</TabsTrigger>
       <TabsTrigger value="non-slr">Non-SLR Cap</TabsTrigger>
       <TabsTrigger value="classification">Classification</TabsTrigger>
       <TabsTrigger value="certification">Certification</TabsTrigger>
     </TabsList>
     <TabsContent value="portfolio">
       <InvestmentTable investments={investments} />
     </TabsContent>
     <TabsContent value="reconciliation">
       <SglReconciliation investments={investments} unreconciled={unreconciled} />
     </TabsContent>
     <TabsContent value="broker">
       <BrokerAnalytics brokerData={brokerData} />
     </TabsContent>
     <TabsContent value="non-slr">
       <NonSlrMonitor investments={investments} />
     </TabsContent>
     <TabsContent value="classification">
       <ClassificationChecklist investments={investments} />
     </TabsContent>
     <TabsContent value="certification">
       <QuarterlyCertification />
     </TabsContent>
   </Tabs>
   ```
  </action>
  <verify>
TypeScript clean, investments page loads with 6 tabs and real data.
  </verify>
  <done>
- Investments page fetches real InvestmentRecord data
- 6-tab layout: Portfolio, SGL/CSGL, Broker, Non-SLR, Classification, Certification
  </done>
</task>

<task type="auto">
  <name>Wire InvestmentTable to real actions</name>
  <files>
    src/components/investments/investment-table.tsx
  </files>
  <action>
Update InvestmentTable with real data handling:

1. Props: `investments` array of InvestmentRecord data

2. Table columns:
   - Security Type (SLR/NON_SLR/EQUITY/MUTUAL_FUND badge)
   - Classification (HTM/HFT/AFS badge)
   - ISIN
   - Face Value, Book Value, Market Value (formatted currency)
   - Broker Name
   - SGL Account (SGL/CSGL)
   - Reconciled (✅/❌)
   - Period
   - Actions

3. Filters: securityType, classification, reconciled, period

4. "Add Investment Record" dialog:
   - Form wired to `manageInvestmentRecord()` action
   - Shows compliance warnings (broker 5% cap, non-SLR cap) in result

5. Edit record dialog

6. "Mark Reconciled" button per row → `markReconciled()` action

7. Summary stats row: Total face value, book value, market value, reconciliation %

```typescript
import { manageInvestmentRecord, markReconciled } from "@/actions/investment/manage-records";
```
  </action>
  <verify>
Investment table renders real data with CRUD and reconciliation.
  </verify>
  <done>
- Investment table displays real records with filters
- CRUD operations wired to manageInvestmentRecord
- Mark reconciled action works
- Compliance warnings shown on create/edit
  </done>
</task>

<task type="auto">
  <name>Build SGL/CSGL Reconciliation Dashboard</name>
  <files>
    src/components/investments/sgl-reconciliation.tsx
  </files>
  <action>
Create SGL/CSGL reconciliation tracking (R93):

1. Props: `investments` (all), `unreconciled` (pending)

2. Summary cards:
   - Total SGL records / reconciled count / pending count
   - Total CSGL records / reconciled count / pending count
   - Overall reconciliation percentage

3. Unreconciled records table:
   - Security Type, ISIN, Face Value, Book Value, SGL Account, Period
   - "Mark Reconciled" button per row

4. Reconciliation by period chart/table:
   - Group by period, show reconciled vs total

5. Bulk reconciliation:
   - Select multiple records
   - "Mark All Selected as Reconciled" button

```typescript
import { markReconciled } from "@/actions/investment/manage-records";
```
  </action>
  <verify>
Reconciliation dashboard shows SGL/CSGL status and supports bulk reconciliation.
  </verify>
  <done>
- SGL/CSGL reconciliation summary with counts
- Unreconciled records table with mark-reconciled action
- Bulk reconciliation support
  </done>
</task>

<task type="auto">
  <name>Build Broker Compliance Analytics</name>
  <files>
    src/components/investments/broker-analytics.tsx
  </files>
  <action>
Create broker compliance analytics with 5% cap enforcement (R94):

1. Props: `brokerData` from `getBrokerConcentration()`

2. Broker concentration table:
   - Broker Name, Total Value, Transaction Count, Max Share %
   - 5% cap indicator: green (<4%), yellow (4-5%), red (>5%)
   - Sort by share descending

3. Cap breach alerts:
   - Banner showing any brokers exceeding 5% cap
   - Severity: WARNING at 4%, BREACH at 5%

4. Concentration chart (horizontal bar):
   - Each broker's share as % of total
   - Red line at 5% threshold

5. Period selector to view different quarters

6. Regulatory reference: "Per RBI circular, no single broker should handle more than 5% of total investment transactions"
  </action>
  <verify>
Broker analytics shows concentration with 5% cap alerts.
  </verify>
  <done>
- Broker concentration analytics with 5% cap enforcement
- Visual alerts for cap breaches
- Period-wise analysis
  </done>
</task>

<task type="auto">
  <name>Build Non-SLR Cap Monitor</name>
  <files>
    src/components/investments/non-slr-monitor.tsx
  </files>
  <action>
Create non-SLR investment cap monitoring (R95):

1. Props: `investments` array

2. Calculate non-SLR totals:
   ```typescript
   const nonSlrTotal = investments
     .filter(i => i.securityType === "NON_SLR")
     .reduce((sum, i) => sum + Number(i.faceValue), 0);
   ```

3. Display:
   - Total deposits (from HousekeepingMetric TOTAL_DEPOSITS or manual input)
   - Non-SLR investment total
   - Cap utilization: nonSlrTotal / (totalDeposits * 0.10) * 100
   - Progress bar showing utilization
   - Alert if utilization > 90% (WARNING) or > 100% (BREACH)

4. Breakdown by classification (HTM/HFT/AFS) within non-SLR

5. Regulatory reference: "Non-SLR investments must not exceed 10% of total deposits as per RBI norms"

6. If total deposits not available, show input field to manually enter or note to capture via housekeeping metrics
  </action>
  <verify>
Non-SLR cap monitor shows utilization against 10% threshold.
  </verify>
  <done>
- Non-SLR cap monitoring with 10% threshold
- Utilization progress bar with alerts
- Classification breakdown
  </done>
</task>

<task type="auto">
  <name>Build HTM/HFT/AFS Classification Checklist</name>
  <files>
    src/components/investments/classification-checklist.tsx
  </files>
  <action>
Create HTM/HFT/AFS classification audit checklist (R96):

1. Classification rules checklist (per RBI norms):
   ```typescript
   const CLASSIFICATION_CHECKS = [
     { id: "htmLimit", question: "HTM portfolio does not exceed 25% of total investments (or applicable limit)", category: "HTM" },
     { id: "htmSale", question: "No sale from HTM except with RBI approval or per policy", category: "HTM" },
     { id: "htmValuation", question: "HTM securities valued at acquisition cost (amortized)", category: "HTM" },
     { id: "hftIntent", question: "HFT securities held for trading, sold within 90 days", category: "HFT" },
     { id: "hftMtm", question: "HFT portfolio marked-to-market at monthly intervals", category: "HFT" },
     { id: "afsReclass", question: "AFS reclassification only at start of accounting year", category: "AFS" },
     { id: "afsValuation", question: "AFS securities marked-to-market quarterly", category: "AFS" },
     { id: "depreciationProvision", question: "Depreciation provision created for AFS/HFT net losses", category: "PROVISION" },
     { id: "shiftingNorms", question: "Inter-category shifting complies with RBI circular norms", category: "GENERAL" },
     { id: "boardApproval", question: "Board-approved investment policy reviewed annually", category: "GENERAL" },
   ];
   ```

2. Checklist form:
   - Each check: checkbox (compliant/non-compliant), evidence text, remarks
   - Grouped by category (HTM, HFT, AFS, Provision, General)
   - Save progress (local state or server action)

3. Auto-populate from portfolio data where possible:
   - HTM % of total → auto-check/flag htmLimit
   - AFS last MTM date → auto-check afsValuation

4. Summary: X of Y checks compliant, overall rating
  </action>
  <verify>
Classification checklist displays checks and captures compliance responses.
  </verify>
  <done>
- 10-item classification audit checklist per RBI norms
- Grouped by HTM/HFT/AFS/General
- Compliance capture with evidence
  </done>
</task>

<task type="auto">
  <name>Build Quarterly Certification Workflow</name>
  <files>
    src/components/investments/quarterly-certification.tsx
    src/actions/investment/quarterly-certification.ts
  </files>
  <action>
Create quarterly auditor certification workflow (R97):

1. Create server action `quarterly-certification.ts`:
   ```typescript
   "use server";
   const CertificationSchema = z.object({
     year: z.number(),
     quarter: z.enum(["Q1", "Q2", "Q3", "Q4"]),
     certifiedBy: z.string().uuid(),
     certificationChecks: z.array(z.object({
       checkId: z.string(),
       compliant: z.boolean(),
       remarks: z.string().optional(),
     })),
     overallOpinion: z.enum(["SATISFACTORY", "QUALIFIED", "ADVERSE"]),
     remarks: z.string().optional(),
   });

   export async function submitQuarterlyCertification(input) {
     // Validates, saves certification to BoardReport or similar
     // Creates notification to ACB members
   }
   ```

2. Component:
   - Quarter/year selector
   - Certification checklist:
     - SGL/CSGL reconciliation completed?
     - Broker concentration within 5% limit?
     - Non-SLR within 10% cap?
     - HTM/HFT/AFS classification per norms?
     - MTM provisions created?
     - Investment policy reviewed by board?
   - Overall opinion: Satisfactory / Qualified / Adverse
   - Remarks field
   - Digital sign-off (auditor name + timestamp)
   - Submit → creates certification record

3. Previous certifications list showing history
  </action>
  <verify>
Quarterly certification workflow captures and saves certification.
  </verify>
  <done>
- Quarterly certification form with investment-specific checks
- Overall opinion with remarks
- Certification record created and tracked
  </done>
</task>

</tasks>

<verification>
1. TypeScript compilation clean
2. `/investments` loads with 6 tabs and real data
3. SGL/CSGL reconciliation with bulk mark-reconciled
4. Broker analytics with 5% cap alerts
5. Non-SLR monitoring with 10% threshold
6. Classification checklist captures compliance
7. Quarterly certification workflow end-to-end
</verification>

<success_criteria>
- ✅ `/investments` page uses real DAL instead of mock data
- ✅ SGL/CSGL reconciliation tracking with reconciled/pending status
- ✅ Broker compliance analytics with 5% cap enforcement
- ✅ Non-SLR investment cap monitoring (10% of deposits)
- ✅ HTM/HFT/AFS classification audit checklist
- ✅ Quarterly auditor certification workflow
- ✅ TypeScript compilation clean
- ✅ R93-R97 requirements closed
</success_criteria>

<output>
After completion, update VALIDATION-REPORT.md:
- R93: ✅ (SGL/CSGL reconciliation tracking)
- R94: ✅ (Broker compliance analytics with 5% cap)
- R95: ✅ (Non-SLR investment cap monitoring)
- R96: ✅ (HTM/HFT/AFS classification audit checklist)
- R97: ✅ (Quarterly auditor certification workflow)
</output>
