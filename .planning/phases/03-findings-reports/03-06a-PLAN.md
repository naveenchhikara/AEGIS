---
phase: 03-findings-reports
plan: 06a
type: execute
wave: 4
depends_on: ["03-01", "03-02"]
files_modified:
  - src/components/reports/executive-summary.tsx
  - src/components/reports/audit-coverage-table.tsx
  - src/components/reports/key-findings-summary.tsx
  - src/components/reports/recommendations-section.tsx
autonomous: true

must_haves:
  truths:
    - ExecutiveSummary component shows key metrics and risk summary
    - AuditCoverageTable shows planned vs actual by category
    - KeyFindingsSummary shows top 10 critical findings
    - RecommendationsSection shows prioritized action items
  artifacts:
    - path: "src/components/reports/executive-summary.tsx"
      provides: "Executive summary section"
      exports: ["ExecutiveSummary"]
    - path: "src/components/reports/audit-coverage-table.tsx"
      provides: "Audit coverage table component"
      exports: ["AuditCoverageTable"]
    - path: "src/components/reports/key-findings-summary.tsx"
      provides: "Key findings list component"
      exports: ["KeyFindingsSummary"]
    - path: "src/components/reports/recommendations-section.tsx"
      provides: "Prioritized recommendations list"
      exports: ["RecommendationsSection"]
  key_links:
    - from: "src/components/reports/key-findings-summary.tsx"
      to: "src/components/findings/severity-badge.tsx"
      via: "import { SeverityBadge }"
      pattern: "SeverityBadge"
    - from: "src/components/reports/executive-summary.tsx"
      to: "lucide-react"
      via: "import icons"
      pattern: "from.*lucide-react"
---

<objective>
Build report section components for board report preview.

Purpose: Create individual report section components (ExecutiveSummary, AuditCoverageTable, KeyFindingsSummary, RecommendationsSection) that will be composed together in the BoardReportPreview. These components implement RPT-01, RPT-02, RPT-03, RPT-05 requirements.

Output: Four report section components ready for composition
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
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create ExecutiveSummary component</name>
  <files>src/components/reports/executive-summary.tsx</files>
  <action>
    Create src/components/reports/ directory if not exists.

    Create executive-summary.tsx with:
    1. Import Card, CardContent, CardHeader, CardTitle from "@/components/ui/card"
    2. Import { AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from "lucide-react"
    3. Import Badge from "@/components/ui/badge"

    4. Define ExecutiveSummaryProps interface: { summary: { totalAudits: number, completedAudits: number, totalFindings: number, criticalFindings: number, overallRiskLevel: string } }

    5. Create ExecutiveSummary component with:
        - Card with title "Executive Summary"
        - Metrics grid (4 columns):
          - Total Audits: number with CheckCircle icon
          - Completed Audits: number with completion percentage
          - Total Findings: number with AlertTriangle icon
          - Critical Findings: number with red background styling
        - Risk level indicator with color-coded badge:
          - Low: green
          - Moderate: yellow
          - High: orange
          - Critical: red

    6. Export ExecutiveSummary component

    Use "use client" directive.
  </action>
  <verify>File exists at src/components/reports/executive-summary.tsx with ExecutiveSummary export</verify>
  <done>ExecutiveSummary displays all metrics and risk level</done>
</task>

<task type="auto">
  <name>Task 2: Create AuditCoverageTable component</name>
  <files>src/components/reports/audit-coverage-table.tsx</files>
  <action>
    Create audit-coverage-table.tsx with:
    1. Import Card, CardContent, CardHeader, CardTitle from "@/components/ui/card"
    2. Import Table components from "@/components/ui/table"
    3. Import Badge from "@/components/ui/badge"

    4. Define AuditCoverageProps interface: { planned: { category: string, planned: number, completed: number }[], actual: { category: string, planned: number, completed: number }[] }

    5. Create AuditCoverageTable component with:
        - Card with title "Audit Coverage"
        - Table with columns: Category, Planned, Completed, Progress
        - Row for each audit category
        - Progress column shows:
          - Badge if 100% complete (green "Complete")
          - Badge if in progress (blue "X% complete")
          - Badge if not started (gray "Not Started")
        - Summary row with totals

    6. Export AuditCoverageTable component

    Use "use client" directive.
  </action>
  <verify>File exists at src/components/reports/audit-coverage-table.tsx with AuditCoverageTable export</verify>
  <done>AuditCoverageTable displays planned vs actual audit counts</done>
</task>

<task type="auto">
  <name>Task 3: Create KeyFindingsSummary component</name>
  <files>src/components/reports/key-findings-summary.tsx</files>
  <action>
    Create key-findings-summary.tsx with:
    1. Import Card, CardContent, CardHeader, CardTitle from "@/components/ui/card"
    2. Import Separator from "@/components/ui/separator"
    3. Import SeverityBadge from "@/components/findings/severity-badge"
    4. Import Badge from "@/components/ui/badge"

    5. Define KeyFindingsProps interface: { findings: { id: string, title: string, severity: string, brief: string }[] }

    6. Create KeyFindingsSummary component with:
        - Card with title "Key Findings Summary"
        - Subtitle showing "Top 10 Critical Findings"
        - List of findings (max 10):
          - Each item shows finding ID, title
          - SeverityBadge for severity
          - Brief description text
          - Separator between items
        - Color-coded severity indicators

    7. Export KeyFindingsSummary component

    Use "use client" directive.
  </action>
  <verify>File exists at src/components/reports/key-findings-summary.tsx with KeyFindingsSummary export</verify>
  <done>KeyFindingsSummary displays top 10 findings with severity badges</done>
</task>

<task type="auto">
  <name>Task 4: Create RecommendationsSection component</name>
  <files>src/components/reports/recommendations-section.tsx</files>
  <action>
    Create recommendations-section.tsx with:
    1. Import Card, CardContent, CardHeader, CardTitle from "@/components/ui/card"
    2. Import Badge from "@/components/ui/badge"
    3. Import { Calendar } from "lucide-react"

    4. Define RecommendationsProps interface: { recommendations: { id: string, priority: string, title: string, description: string, dueDate: string }[] }

    5. Create RecommendationsSection component with:
        - Card with title "Recommendations"
        - Subtitle showing "Prioritized Action Items"
        - List of recommendations:
          - Each item shows:
            - Priority badge (High=red, Medium=yellow, Low=green)
            - Title and description
            - Due date with Calendar icon
          - Numbered list (1, 2, 3...)
        - Sort by priority (High first)

    6. Export RecommendationsSection component

    Use "use client" directive.
  </action>
  <verify>File exists at src/components/reports/recommendations-section.tsx with RecommendationsSection export</verify>
  <done>RecommendationsSection displays prioritized action items with due dates</done>
</task>

</tasks>

<verification>
- ExecutiveSummary displays all metrics with correct icons
- AuditCoverageTable shows planned vs actual with progress badges
- KeyFindingsSummary lists top 10 findings with severity badges
- RecommendationsSection shows prioritized items with due dates
- All components use "use client" directive
- All components accept typed props interfaces
</verification>

<success_criteria>
- RPT-01: Executive summary with key metrics and risk summary
- RPT-02: Audit coverage table (planned vs actual)
- RPT-03: Key findings summary (top 10 critical)
- RPT-05: Recommendations with prioritized action items
</success_criteria>

<output>
After completion, create `.planning/phases/03-findings-reports/03-06a-SUMMARY.md`
</output>
