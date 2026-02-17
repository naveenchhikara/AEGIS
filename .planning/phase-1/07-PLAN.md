---
phase: 1
plan: 7
type: standard
wave: 6
depends_on: [5, 6]
files_modified:
  - src/app/(dashboard)/ram/page.tsx
  - src/app/(dashboard)/ram/[assessmentId]/page.tsx
  - src/components/ram/ram-assessments-table.tsx
  - src/components/ram/ram-score-form.tsx
  - src/components/ram/ram-result-card.tsx
  - src/app/(dashboard)/audit-execution/[engagementId]/page.tsx
  - src/app/(dashboard)/audit-execution/[engagementId]/sections/[sectionCode]/page.tsx
  - src/components/audit-execution/engagement-header.tsx
  - src/components/audit-execution/section-tabs.tsx
  - src/components/audit-execution/examination-form.tsx
  - src/components/audit-execution/team-panel.tsx
  - src/lib/nav-items.ts
autonomous: true
must_haves:
  truths:
    - "RAM assessments page lists all assessments with branch, year, score, status"
    - "RAM assessment detail shows all 19 parameters grouped by category with score entry form"
    - "RAM computation result displays composite score, risk category, and derived audit frequency"
    - "Audit execution page shows engagement header + section tabs + team panel"
    - "Section detail page shows examination items with per-item response form (status dropdown + observation textarea)"
    - "Navigation sidebar includes RAM and Audit Execution links for appropriate roles"
  artifacts:
    - path: "src/app/(dashboard)/ram/page.tsx"
      provides: "RAM assessments list page (server component)"
    - path: "src/app/(dashboard)/ram/[assessmentId]/page.tsx"
      provides: "RAM assessment detail + score entry page"
    - path: "src/components/ram/ram-assessments-table.tsx"
      provides: "Client component: assessment list with status badges"
    - path: "src/components/ram/ram-score-form.tsx"
      provides: "Client component: parameter score entry form"
    - path: "src/components/ram/ram-result-card.tsx"
      provides: "Component: composite score + risk category display"
    - path: "src/app/(dashboard)/audit-execution/[engagementId]/page.tsx"
      provides: "Audit execution dashboard for a specific engagement"
    - path: "src/app/(dashboard)/audit-execution/[engagementId]/sections/[sectionCode]/page.tsx"
      provides: "Section detail with examination items and response forms"
    - path: "src/components/audit-execution/engagement-header.tsx"
      provides: "Component: engagement metadata (branch, dates, team, status)"
    - path: "src/components/audit-execution/section-tabs.tsx"
      provides: "Client component: horizontal tabs for 25 sections with status indicators"
    - path: "src/components/audit-execution/examination-form.tsx"
      provides: "Client component: per-item examination response form"
    - path: "src/components/audit-execution/team-panel.tsx"
      provides: "Client component: team member list with role badges"
    - path: "src/lib/nav-items.ts"
      provides: "Updated navigation with RAM and Audit Execution links"
  key_links:
    - from: "ram/page.tsx"
      to: "src/data-access/ram.ts"
      via: "getRamAssessments() for server-side data fetch"
    - from: "ram-score-form.tsx"
      to: "src/actions/ram/save-scores.ts"
      via: "saveRamScores action call on form submit"
    - from: "ram-score-form.tsx"
      to: "src/actions/ram/compute-assessment.ts"
      via: "computeRamAssessment action call on compute button"
    - from: "examination-form.tsx"
      to: "src/actions/audit-execution/submit-examination-response.ts"
      via: "submitExaminationResponse action call per item"
    - from: "section-tabs.tsx"
      to: "src/data-access/audit-execution.ts"
      via: "getEngagementSections() for section status display"
---

## Objective

Build the Phase 1 UI: RAM dashboard for viewing/creating/scoring assessments and the audit execution interface with section-based examination. The RAM UI allows auditors to score branches on 19 parameters, compute composite scores, and see risk categories. The audit execution UI provides tab-based navigation across 25 functional areas with per-item examination response forms that auto-create observations for non-compliant findings.

## Context

@AEGIS/src/app/(dashboard)/ — dashboard route group (add new routes)
@AEGIS/src/components/ — component directory (add new components)
@AEGIS/src/lib/nav-items.ts — sidebar navigation (modify)
@AEGIS/src/data-access/ram.ts — RAM DAL (read)
@AEGIS/src/data-access/audit-execution.ts — Audit execution DAL (read)
@AEGIS/src/actions/ram/ — RAM server actions (call)
@AEGIS/src/actions/audit-execution/ — Audit execution server actions (call)
@AEGIS/.planning/codebase/CONVENTIONS.md — component patterns, form patterns
@AEGIS/.planning/codebase/ARCHITECTURE.md — server/client component patterns, data flow

## Tasks

<task type="auto">
  <name>Task 1: RAM dashboard UI (list + detail + score form)</name>
  <files>
    src/app/(dashboard)/ram/page.tsx
    src/app/(dashboard)/ram/[assessmentId]/page.tsx
    src/components/ram/ram-assessments-table.tsx
    src/components/ram/ram-score-form.tsx
    src/components/ram/ram-result-card.tsx
    src/lib/nav-items.ts
  </files>
  <action>
  **1a. Create `src/app/(dashboard)/ram/page.tsx` — server component (list page):**

  ```tsx
  import { getRequiredSession } from "@/data-access/session";
  import { getRamAssessments } from "@/data-access/ram";
  import { RamAssessmentsTable } from "@/components/ram/ram-assessments-table";
  import { hasPermission, type Role } from "@/lib/permissions";
  import { redirect } from "next/navigation";

  export default async function RamPage() {
    const session = await getRequiredSession();
    const userRoles = ((session.user as any).roles ?? []) as Role[];

    if (!hasPermission(userRoles, "ram:read")) {
      redirect("/dashboard");
    }

    const assessments = await getRamAssessments(session);
    const canCreate = hasPermission(userRoles, "ram:create");

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">RAM Assessments</h1>
            <p className="text-muted-foreground">
              Risk Assessment Model — Branch risk scoring and audit frequency derivation
            </p>
          </div>
        </div>
        <RamAssessmentsTable assessments={assessments} canCreate={canCreate} />
      </div>
    );
  }
  ```

  **1b. Create `src/components/ram/ram-assessments-table.tsx` — client component:**

  A "use client" component that:
  - Displays assessments in a table with columns: Branch, Year, Composite Score, Risk Category, Frequency, Status
  - Risk category shown as color-coded badge (HIGH=red, MEDIUM=amber, LOW=green)
  - Status shown as badge (DRAFT=gray, COMPUTED=blue, APPROVED=green)
  - "New Assessment" button (if canCreate) that opens a dialog with branch selector + year input, calls createRamAssessment
  - Each row links to `/ram/[assessmentId]`
  - Uses shadcn/ui Table, Badge, Button, Dialog, Select, Input components
  - Uses `useRouter` for navigation after creation
  - Uses toast (sonner) for success/error feedback

  Props interface:
  ```typescript
  interface RamAssessmentsTableProps {
    assessments: Array<{
      id: string;
      assessmentYear: string;
      compositeScore: any; // Decimal
      riskCategory: string | null;
      auditFrequency: number | null;
      status: string;
      branch: { id: string; code: string; name: string; city: string } | null;
    }>;
    canCreate: boolean;
  }
  ```

  **1c. Create `src/app/(dashboard)/ram/[assessmentId]/page.tsx` — server component (detail page):**

  ```tsx
  import { getRequiredSession } from "@/data-access/session";
  import { getRamAssessmentWithScores, getRamParameterConfigs } from "@/data-access/ram";
  import { RamScoreForm } from "@/components/ram/ram-score-form";
  import { RamResultCard } from "@/components/ram/ram-result-card";
  import { hasPermission, type Role } from "@/lib/permissions";
  import { redirect, notFound } from "next/navigation";

  interface PageProps {
    params: Promise<{ assessmentId: string }>;
  }

  export default async function RamAssessmentDetailPage({ params }: PageProps) {
    const { assessmentId } = await params;
    const session = await getRequiredSession();
    const userRoles = ((session.user as any).roles ?? []) as Role[];

    if (!hasPermission(userRoles, "ram:read")) {
      redirect("/dashboard");
    }

    const [assessment, allParams] = await Promise.all([
      getRamAssessmentWithScores(session, assessmentId),
      getRamParameterConfigs(session),
    ]);

    if (!assessment) {
      notFound();
    }

    const canEdit = hasPermission(userRoles, "ram:create") && assessment.status === "DRAFT";
    const canCompute = hasPermission(userRoles, "ram:create") && assessment.scores.length > 0;
    const canApprove = hasPermission(userRoles, "ram:approve") && assessment.status === "COMPUTED";

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            RAM Assessment — {assessment.branch?.name}
          </h1>
          <p className="text-muted-foreground">
            {assessment.assessmentYear} • Status: {assessment.status}
          </p>
        </div>

        {/* Show result card if computed */}
        {assessment.compositeScore && (
          <RamResultCard
            compositeScore={Number(assessment.compositeScore)}
            riskCategory={assessment.riskCategory ?? ""}
            auditFrequency={assessment.auditFrequency ?? 0}
            status={assessment.status}
          />
        )}

        {/* Score entry form */}
        <RamScoreForm
          assessmentId={assessment.id}
          allParams={allParams}
          existingScores={assessment.scores}
          canEdit={canEdit}
          canCompute={canCompute}
          canApprove={canApprove}
          status={assessment.status}
        />
      </div>
    );
  }
  ```

  **1d. Create `src/components/ram/ram-score-form.tsx` — client component:**

  A "use client" component that:
  - Displays all 19 parameters in two sections: "Business Risk Parameters" (BR-*) and "Control Risk Parameters" (CR-*)
  - Each parameter shows: name, current score (1-5 slider or radio group), remarks textarea
  - Scoring criteria shown as tooltip or expandable section for each parameter
  - "Save Scores" button calls `saveRamScores` action
  - "Compute" button calls `computeRamAssessment` action (shows result after computation)
  - "Approve" button calls `approveRamAssessment` action (only if canApprove)
  - Disabled state when assessment is APPROVED
  - Uses shadcn/ui Card, RadioGroup, Textarea, Button, Accordion, Tooltip
  - Uses useActionState or React Hook Form + Zod

  Props interface:
  ```typescript
  interface RamScoreFormProps {
    assessmentId: string;
    allParams: Array<{
      id: string;
      code: string;
      name: string;
      category: string;
      weight: any;
      maxScore: any;
      scoringCriteria: any;
      displayOrder: number;
    }>;
    existingScores: Array<{
      paramConfig: { id: string; code: string; name: string; category: string; weight: any; maxScore: any; scoringCriteria: any; displayOrder: number };
      score: any;
      remarks: string | null;
    }>;
    canEdit: boolean;
    canCompute: boolean;
    canApprove: boolean;
    status: string;
  }
  ```

  **1e. Create `src/components/ram/ram-result-card.tsx` — component:**

  Displays the computed result:
  - Large composite score number (e.g., "3.72")
  - Risk category badge with color (HIGH=red, MEDIUM=amber, LOW=green)
  - Derived audit frequency (e.g., "12 months")
  - Status badge (COMPUTED/APPROVED)

  Props: `{ compositeScore: number; riskCategory: string; auditFrequency: number; status: string }`

  Uses shadcn/ui Card, Badge.

  **1f. Update `src/lib/nav-items.ts`:**

  Add RAM navigation item. Find the navigation array and add (in an appropriate position, e.g., after "Audit Plans"):

  ```typescript
  {
    title: "RAM Assessment",
    href: "/ram",
    icon: BarChart3, // from lucide-react
    permission: "ram:read" as Permission,
  },
  ```

  Also add the audit execution link:

  ```typescript
  {
    title: "Audit Execution",
    href: "/audit-execution",
    icon: ClipboardCheck, // from lucide-react
    permission: "audit_execution:read" as Permission,
  },
  ```

  Import the icons at the top: `import { BarChart3, ClipboardCheck } from "lucide-react";`

  **Note:** The navigation system filters items by permission — users without `ram:read` or `audit_execution:read` won't see these links. Review the existing nav-items.ts structure to match the pattern (look at how existing items define icon, title, href, permission).
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit --pretty 2>&1 | grep -E "(ram/|ram-)" | head -20
  ```
  No TypeScript errors in RAM UI files. Verify file count:
  ```bash
  ls src/app/\(dashboard\)/ram/ src/components/ram/
  ```
  Should show page.tsx, [assessmentId]/page.tsx, and 3 component files.
  </verify>
  <done>
  - /ram page lists assessments with table, badges, and "New Assessment" dialog
  - /ram/[assessmentId] shows parameters grouped by category with score entry
  - RamResultCard shows composite score, risk category badge, audit frequency
  - Score form supports save, compute, approve workflow
  - Navigation updated with "RAM Assessment" and "Audit Execution" links
  </done>
</task>

<task type="auto">
  <name>Task 2: Audit execution UI (engagement page + section tabs + examination form)</name>
  <files>
    src/app/(dashboard)/audit-execution/[engagementId]/page.tsx
    src/app/(dashboard)/audit-execution/[engagementId]/sections/[sectionCode]/page.tsx
    src/components/audit-execution/engagement-header.tsx
    src/components/audit-execution/section-tabs.tsx
    src/components/audit-execution/examination-form.tsx
    src/components/audit-execution/team-panel.tsx
  </files>
  <action>
  **2a. Create `src/app/(dashboard)/audit-execution/[engagementId]/page.tsx` — server component:**

  ```tsx
  import { getRequiredSession } from "@/data-access/session";
  import { getEngagementWithTeam } from "@/data-access/audit-execution";
  import { EngagementHeader } from "@/components/audit-execution/engagement-header";
  import { SectionTabs } from "@/components/audit-execution/section-tabs";
  import { TeamPanel } from "@/components/audit-execution/team-panel";
  import { hasPermission, type Role } from "@/lib/permissions";
  import { redirect, notFound } from "next/navigation";

  interface PageProps {
    params: Promise<{ engagementId: string }>;
  }

  export default async function AuditExecutionPage({ params }: PageProps) {
    const { engagementId } = await params;
    const session = await getRequiredSession();
    const userRoles = ((session.user as any).roles ?? []) as Role[];

    if (!hasPermission(userRoles, "audit_execution:read")) {
      redirect("/dashboard");
    }

    const engagement = await getEngagementWithTeam(session, engagementId);
    if (!engagement) {
      notFound();
    }

    const canManageTeam = hasPermission(userRoles, "audit_execution:manage_team");
    const canManageSections = hasPermission(userRoles, "audit_execution:manage_sections");

    return (
      <div className="space-y-6">
        <EngagementHeader engagement={engagement} />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main content: Section tabs (3/4 width on desktop) */}
          <div className="lg:col-span-3">
            <SectionTabs
              engagementId={engagementId}
              sections={engagement.sectionInstances}
              canManageSections={canManageSections}
            />
          </div>

          {/* Sidebar: Team panel (1/4 width on desktop) */}
          <div className="lg:col-span-1">
            <TeamPanel
              engagementId={engagementId}
              teamMembers={engagement.teamMembers}
              canManageTeam={canManageTeam}
            />
          </div>
        </div>
      </div>
    );
  }
  ```

  **2b. Create `src/components/audit-execution/engagement-header.tsx`:**

  Server component (no "use client") that displays:
  - Engagement title: "Audit: {branch.name} — {auditNumber || 'Draft'}"
  - Metadata row: Branch code, audit type, visit number, period, status badge
  - Scheduled dates, actual dates if available
  - Overall risk rating if computed

  Props: `{ engagement: (return type of getEngagementWithTeam) }`

  **2c. Create `src/components/audit-execution/section-tabs.tsx` — client component:**

  A "use client" component that:
  - Shows horizontal scrollable tabs for each section (up to 25 tabs)
  - Each tab shows: section name + status indicator dot (gray=not started, blue=in progress, green=completed, purple=reviewed)
  - Clicking a tab navigates to `/audit-execution/[engagementId]/sections/[sectionCode]`
  - "Initialize Sections" button if no sections exist (calls initializeSections action)
  - Uses shadcn/ui Tabs or custom horizontal scroll with Button variants
  - Uses `useRouter` for navigation

  Props interface:
  ```typescript
  interface SectionTabsProps {
    engagementId: string;
    sections: Array<{
      id: string;
      sectionCode: string;
      sectionName: string;
      status: string;
      completedAt: Date | null;
      reviewedAt: Date | null;
    }>;
    canManageSections: boolean;
  }
  ```

  **2d. Create `src/components/audit-execution/team-panel.tsx` — client component:**

  A "use client" component that:
  - Shows team members in a card with: name, role badge (LEAD_AUDITOR/FIELD_AUDITOR), assigned sections list
  - "Add Member" button opens dialog with user selector, role picker, section assignment
  - "Remove" button per member
  - Calls assignTeamMember / removeTeamMember actions
  - Uses shadcn/ui Card, Badge, Button, Dialog, Select

  Props interface:
  ```typescript
  interface TeamPanelProps {
    engagementId: string;
    teamMembers: Array<{
      id: string;
      userId: string;
      roleInEngagement: string;
      assignedSections: string[];
      user: { id: string; name: string; email: string; roles: string[] };
    }>;
    canManageTeam: boolean;
  }
  ```

  **2e. Create `src/app/(dashboard)/audit-execution/[engagementId]/sections/[sectionCode]/page.tsx` — server component:**

  ```tsx
  import { getRequiredSession } from "@/data-access/session";
  import { getExaminationResponsesForSection } from "@/data-access/audit-execution";
  import { ExaminationForm } from "@/components/audit-execution/examination-form";
  import { hasPermission, type Role } from "@/lib/permissions";
  import { redirect, notFound } from "next/navigation";

  interface PageProps {
    params: Promise<{ engagementId: string; sectionCode: string }>;
  }

  export default async function SectionDetailPage({ params }: PageProps) {
    const { engagementId, sectionCode } = await params;
    const session = await getRequiredSession();
    const userRoles = ((session.user as any).roles ?? []) as Role[];

    if (!hasPermission(userRoles, "examination:read")) {
      redirect("/dashboard");
    }

    const data = await getExaminationResponsesForSection(session, engagementId, sectionCode);
    if (!data) {
      notFound();
    }

    const canRespond = hasPermission(userRoles, "examination:respond");

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">{data.area.name}</h2>
          <p className="text-muted-foreground">
            {data.items.length} examination items • Section {data.area.code}
          </p>
        </div>

        <ExaminationForm
          engagementId={engagementId}
          areaCode={sectionCode}
          items={data.items}
          canRespond={canRespond}
        />
      </div>
    );
  }
  ```

  **2f. Create `src/components/audit-execution/examination-form.tsx` — client component:**

  A "use client" component that:
  - Displays all examination items for the section in a vertical list
  - Each item shows:
    - Item number + particulars text
    - Status selector: radio group or select with COMPLIANT / NON_COMPLIANT / PARTIAL / NOT_APPLICABLE
    - Observation textarea (required when NON_COMPLIANT, optional otherwise)
    - Risk rating selector (shown when NON_COMPLIANT): LOW / MEDIUM / HIGH / CRITICAL
    - "Save" button per item that calls submitExaminationResponse
    - Status indicator showing current saved status with color coding
  - Progress bar at top showing: X of Y items responded (percentage)
  - Items with existing responses show saved data pre-filled
  - Uses shadcn/ui Card, RadioGroup, Textarea, Button, Select, Progress, Badge
  - Uses toast (sonner) for feedback
  - Shows "Auto-created observation" indicator when a non-compliant response creates an observation

  Props interface:
  ```typescript
  interface ExaminationFormProps {
    engagementId: string;
    areaCode: string;
    items: Array<{
      id: string;
      itemNumber: string;
      particulars: string;
      riskCategory: string | null;
      regulatoryRef: string | null;
      displayOrder: number;
      responses: Array<{
        id: string;
        status: string;
        observation: string | null;
        riskRating: string | null;
        respondedById: string | null;
        respondedAt: Date | null;
        observationId: string | null;
      }>;
    }>;
    canRespond: boolean;
  }
  ```

  **IMPORTANT PATTERNS TO FOLLOW:**
  - Server components for pages (data fetching) → client components for interactivity
  - Use `@/components/ui/*` for all UI primitives (Button, Card, Badge, Dialog, etc.)
  - Use `toast` from `sonner` for success/error feedback
  - Use `useRouter` from `next/navigation` for client-side navigation
  - Follow `cn()` utility for class merging
  - Use `@/` path aliases, never relative imports for src/ files
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit --pretty 2>&1 | grep -E "(audit-execution/|examination-)" | head -20
  ```
  No TypeScript errors in audit execution UI files. Verify directory structure:
  ```bash
  find src/app/\(dashboard\)/audit-execution src/components/audit-execution -type f | sort
  ```
  Should show 2 page files + 4 component files.
  </verify>
  <done>
  - /audit-execution/[engagementId] shows engagement header, section tabs (25 areas), team panel
  - /audit-execution/[engagementId]/sections/[sectionCode] shows examination items with response forms
  - Section tabs have status indicators (color dots) and navigate to section detail
  - Examination form shows per-item status selector + observation + risk rating
  - NON_COMPLIANT items require observation text and show auto-created observation indicator
  - Progress bar shows X/Y items responded
  - Team panel shows members with role badges and assigned sections
  - All pages check permissions before rendering
  - Navigation sidebar includes "RAM Assessment" and "Audit Execution" links
  </done>
</task>

## Success Criteria

1. `pnpm exec tsc --noEmit` has no errors in UI files
2. RAM list page shows assessments with score, risk category badges, and status
3. RAM detail page shows 19 parameters in two groups with score entry (1-5)
4. RAM compute button triggers computation and displays result card
5. Audit execution page shows engagement metadata, section tabs (up to 25), and team panel
6. Section detail page shows examination items with per-item response form
7. Non-compliant response form requires observation text and shows risk rating selector
8. Navigation updated with "RAM Assessment" (permission: ram:read) and "Audit Execution" (permission: audit_execution:read)
9. All pages follow server component for data fetch → client component for interactivity pattern
10. All UI uses shadcn/ui components, cn() utility, sonner toast, lucide-react icons
