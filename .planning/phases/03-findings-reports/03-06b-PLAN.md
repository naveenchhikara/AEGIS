---
phase: 03-findings-reports
plan: 06b
type: execute
wave: 4
depends_on: ["03-01", "03-02", "03-06a"]
files_modified:
  - src/components/reports/compliance-scorecard.tsx
  - src/components/reports/board-report-preview.tsx
  - src/app/(dashboard)/reports/page.tsx
  - app/globals.css
autonomous: false

must_haves:
  truths:
    - ComplianceScorecard displays overall score and category breakdown chart
    - BoardReportPreview composes all report sections with print button
    - Reports page displays board report preview
    - Print media queries format report for clean PDF export
    - Navigation hidden in print preview
  artifacts:
    - path: "src/components/reports/compliance-scorecard.tsx"
      provides: "Compliance scorecard with Recharts"
      exports: ["ComplianceScorecard"]
    - path: "src/components/reports/board-report-preview.tsx"
      provides: "Main board report layout component"
      exports: ["BoardReportPreview"]
    - path: "src/app/(dashboard)/reports/page.tsx"
      provides: "Board report preview page route"
      exports: ["default"]
    - path: "app/globals.css"
      provides: "Print media queries for board report"
      contains: "@media print"
  key_links:
    - from: "src/components/reports/compliance-scorecard.tsx"
      to: "recharts"
      via: "import from recharts"
      pattern: "from.*recharts"
    - from: "src/components/reports/board-report-preview.tsx"
      to: "src/components/reports/executive-summary.tsx"
      via: "import ExecutiveSummary"
      pattern: "ExecutiveSummary"
    - from: "src/components/reports/board-report-preview.tsx"
      to: "src/components/reports/audit-coverage-table.tsx"
      via: "import AuditCoverageTable"
      pattern: "AuditCoverageTable"
    - from: "src/components/reports/board-report-preview.tsx"
      to: "src/components/reports/key-findings-summary.tsx"
      via: "import KeyFindingsSummary"
      pattern: "KeyFindingsSummary"
    - from: "src/components/reports/board-report-preview.tsx"
      to: "src/components/reports/compliance-scorecard.tsx"
      via: "import ComplianceScorecard"
      pattern: "ComplianceScorecard"
    - from: "src/components/reports/board-report-preview.tsx"
      to: "src/components/reports/recommendations-section.tsx"
      via: "import RecommendationsSection"
      pattern: "RecommendationsSection"
    - from: "src/app/(dashboard)/reports/page.tsx"
      to: "src/data/reports.json"
      via: "import reports"
      pattern: "import.*reports.*from.*@/data"
    - from: "app/globals.css"
      to: "print dialog"
      via: "@media print CSS"
      pattern: "@media print"
---

<objective>
Build ComplianceScorecard, compose BoardReportPreview, create reports page, add print styles.

Purpose: Create the ComplianceScorecard component with Recharts visualization, compose all report sections into the BoardReportPreview component, create the reports page, and add print media queries for clean PDF export formatting. This completes RPT-04 and RPT-06 requirements.

Output: Complete board report preview page with print functionality
</objective>

<execution_context>
@/Users/admin/.claude/get-shit-done/workflows/execute-plan.md
@/Users/admin/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/03-findings-reports/03-RESEARCH.md
@.planning/phases/03-findings-reports/03-01-SUMMARY.md
@.planning/phases/03-findings-reports/03-02-SUMMARY.md
@.planning/phases/03-findings-reports/03-06a-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create ComplianceScorecard component</name>
  <files>src/components/reports/compliance-scorecard.tsx</files>
  <action>
    Create compliance-scorecard.tsx with:
    1. Import Card, CardContent, CardHeader, CardTitle from "@/components/ui/card"
    2. Import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
    3. Import Badge from "@/components/ui/badge"

    4. Define ComplianceScorecardProps interface: { overallScore: number, breakdown: { category: string, score: number, items: number }[] }

    5. Create ComplianceScorecard component with:
        - Card with title "Compliance Scorecard"
        - Overall score display:
          - Large percentage display
          - Color-coded badge (>=80 green, 60-79 yellow, <60 red)
        - Category breakdown bar chart using Recharts:
          - X-axis: categories
          - Y-axis: scores (0-100)
          - Bars colored by score level
          - Tooltip showing exact score
        - Category breakdown table below chart:
          - Category, Score, Items columns
          - Color-coded score badges

    6. Export ComplianceScorecard component

    Use "use client" directive.
    Use ResponsiveContainer for proper chart sizing.
  </action>
  <verify>File exists at src/components/reports/compliance-scorecard.tsx with ComplianceScorecard export</verify>
  <done>ComplianceScorecard displays overall score and category breakdown chart</done>
</task>

<task type="auto">
  <name>Task 2: Create BoardReportPreview main component</name>
  <files>src/components/reports/board-report-preview.tsx</files>
  <action>
    Create board-report-preview.tsx with:
    1. Import Button from "@/components/ui/button"
    2. Import { Printer } from "lucide-react"
    3. Import ExecutiveSummary from "@/components/reports/executive-summary"
    4. Import AuditCoverageTable from "@/components/reports/audit-coverage-table"
    5. Import KeyFindingsSummary from "@/components/reports/key-findings-summary"
    6. Import ComplianceScorecard from "@/components/reports/compliance-scorecard"
    7. Import RecommendationsSection from "@/components/reports/recommendations-section"
    8. Import Separator from "@/components/ui/separator"
    9. Import Report type from "@/types"

    10. Define BoardReportPreviewProps interface: { report: Report }

    11. Create BoardReportPreview component with:
        - Header section with:
          - Report title "Board Report"
          - Period subtitle (e.g., "Q1 2026")
          - "Print Report" button with Printer icon
          - onClick handler: window.print()
        - Main content with sections:
          - ExecutiveSummary
          - Separator
          - AuditCoverageTable
          - Separator
          - KeyFindingsSummary
          - Separator
          - ComplianceScorecard
          - Separator
          - RecommendationsSection
        - Apply "report-content" class for print styling
        - Apply "no-print" class to print button

    12. Export BoardReportPreview component

    Use "use client" directive.
  </action>
  <verify>File exists at src/components/reports/board-report-preview.tsx with BoardReportPreview export</verify>
  <done>BoardReportPreview displays all report sections with print button</done>
</task>

<task type="auto">
  <name>Task 3: Create reports page</name>
  <files>src/app/(dashboard)/reports/page.tsx</files>
  <action>
    Create src/app/(dashboard)/reports/ directory if not exists.

    Create page.tsx with:
    1. Import reports from "@/data/reports.json"
    2. Import BoardReportPreview from "@/components/reports/board-report-preview"
    3. Import Report type from "@/types"

    4. Create default page component:
       - Get the first (or latest) report from reports array
       - Render page layout with container
       - Render BoardReportPreview with report data
       - Add "report-page" class for print-specific styling

    5. Export default page component

    This can be a server component that passes data to client-side BoardReportPreview.
  </action>
  <verify>File exists at src/app/(dashboard)/reports/page.tsx with default export</verify>
  <done>Reports page displays board report preview with all sections</done>
</task>

<task type="auto">
  <name>Task 4: Add print media queries to globals.css</name>
  <files>app/globals.css</files>
  <action>
    Read existing app/globals.css.

    Add print media queries at end of file:

    ```css
    @media print {
      /* Hide navigation and interactive elements */
      .sidebar,
      .top-bar,
      button,
      .no-print {
        display: none !important;
      }

      /* Ensure full width for printing */
      .container,
      .report-content {
        max-width: 100% !important;
        width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
      }

      /* Page breaks */
      .page-break {
        break-after: always;
      }

      .no-break {
        break-inside: avoid;
      }

      /* Cards print without shadows/borders */
      .card {
        box-shadow: none !important;
        border: 1px solid #e5e7eb !important;
        break-inside: avoid;
      }

      /* Print-friendly colors */
      body {
        background: white !important;
        color: black !important;
      }

      /* Ensure text is readable */
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      /* Hide URLs for links */
      a {
        text-decoration: none;
        color: inherit;
      }
    }
    ```

    Preserve all existing CSS content.
  </action>
  <verify>File app/globals.css contains @media print section with required styles</verify>
  <done>Print styles hide navigation and format report for clean printing</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Board report preview page with all sections and print formatting</what-built>
  <how-to-verify>
    1. Start dev server: npm run dev
    2. Navigate to reports page: http://localhost:3000/reports
    3. Verify all sections display:
       - Executive Summary with metrics and risk level
       - Audit Coverage table with planned vs actual
       - Key Findings Summary with top 10 findings
       - Compliance Scorecard with chart
       - Recommendations with prioritized items
    4. Verify Compliance Scorecard chart renders correctly
    5. Click "Print Report" button
    6. Verify print preview opens with:
       - Navigation hidden (sidebar, top bar)
       - Print button hidden
       - Full-width content
       - Clean formatting without shadows
       - Page breaks between sections if content is long
    7. Cancel print dialog
    8. Verify priority badges show correct colors in recommendations
    9. Verify severity badges show correct colors in key findings
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
- ComplianceScorecard displays overall score and Recharts bar chart
- BoardReportPreview combines all sections with print button
- Print button triggers window.print()
- Print styles hide navigation and format correctly
- All components use "use client" directive
- Charts render properly with ResponsiveContainer
- Page loads with all report data from reports.json
</verification>

<success_criteria>
- RPT-04: Compliance scorecard with category breakdowns
- RPT-06: Print/PDF preview mode with clean formatting
- All report sections composed in BoardReportPreview
- Print media queries hide navigation and format content
</success_criteria>

<output>
After completion, create `.planning/phases/03-findings-reports/03-06b-SUMMARY.md`
</output>
