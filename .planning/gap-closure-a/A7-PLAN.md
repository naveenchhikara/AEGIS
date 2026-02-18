---
phase: gap-closure-a
plan: A7
type: execute
wave: 1
depends_on: []
files_modified:
  - src/actions/audit-execution/bh-certificate.ts
  - src/actions/audit-execution/schemas.ts
  - src/data-access/bh-certificate.ts
  - src/components/audit-execution/bh-certificate-workflow.tsx
  - src/components/audit-execution/bh-signature-capture.tsx
  - src/components/pdf-report/bh-certificate-section.tsx
  - src/app/(dashboard)/audit-execution/[id]/bh-certificate/page.tsx
autonomous: true
gap_closure: true
must_haves:
  truths:
    - "Branch Head can digitally sign off on the BH Certificate via the UI"
    - "Sign-off captures signer identity (userId), timestamp, and comments"
    - "BH certificate transitions through states: PENDING → SIGNED → COUNTERSIGNED"
    - "Signed certificate renders into PDF with signature block and timestamp"
    - "Only users with BRANCH_HEAD role can sign; LEAD_AUDITOR can countersign"
  artifacts:
    - path: "src/actions/audit-execution/bh-certificate.ts"
      provides: "Server actions for BH certificate sign-off workflow"
      exports: ["signBhCertificate", "countersignBhCertificate"]
    - path: "src/components/audit-execution/bh-certificate-workflow.tsx"
      provides: "Client component for BH certificate sign-off UI"
      contains: "signBhCertificate"
    - path: "src/components/pdf-report/bh-certificate-section.tsx"
      provides: "PDF section component with signature block"
      contains: "bhCertSignedAt"
    - path: "src/app/(dashboard)/audit-execution/[id]/bh-certificate/page.tsx"
      provides: "BH certificate page within audit execution"
      contains: "BhCertificateWorkflow"
  key_links:
    - from: "src/components/audit-execution/bh-certificate-workflow.tsx"
      to: "src/actions/audit-execution/bh-certificate.ts"
      via: "Sign-off action calls"
      pattern: "signBhCertificate|countersignBhCertificate"
    - from: "src/actions/reports/generate-pdf.ts"
      to: "src/components/pdf-report/bh-certificate-section.tsx"
      via: "PDF report includes signed BH certificate section"
      pattern: "BhCertificateSection"
---

## Objective

Implement R26: BH Certificate digital sign-off workflow. The AuditEngagement model already has `bhCertSignedById`, `bhCertSignedAt`, and `bhCertComments` fields. The existing PDF report renders a static BH certificate block. This plan adds the interactive sign-off workflow and signature rendering.

**Purpose:** Enable the Branch Head to formally acknowledge audit completion and findings via a digital sign-off, with the signed certificate included in the final PDF report — a mandatory regulatory requirement per SDD p.28.

**Output:**
- Server actions for sign and countersign with role-based access
- Sign-off capture UI with declaration text and digital signature
- PDF certificate section updated with actual signature data
- State transitions: PENDING → SIGNED → COUNTERSIGNED
- New page within audit execution

## Execution Context

@/root/.openclaw/workspace/.claude/agents/gsd-planner.md
@/root/.openclaw/workspace/.claude/workflows/execute-plan.md

## Context

@AEGIS/.planning/REQUIREMENTS.md — R26 specification
@AEGIS/.planning/VALIDATION-REPORT.md — BH certificate gap
@AEGIS/.planning/codebase/CONVENTIONS.md — Server action + component patterns
@AEGIS/prisma/schema.prisma — AuditEngagement.bhCertSignedById, bhCertSignedAt, bhCertComments
@AEGIS/src/actions/reports/generate-pdf.ts — Existing PDF generation
@AEGIS/src/components/pdf-report/audit-summary-document.tsx — Existing PDF document structure

## Tasks

<task type="auto">
  <name>Task 1: DAL — BH certificate data access</name>
  <files>src/data-access/bh-certificate.ts</files>
  <action>
  Create `src/data-access/bh-certificate.ts`:

  ```typescript
  import "server-only";
  import { prismaForTenant } from "./prisma";
  import type { Session } from "@/lib/auth";

  export type BhCertificateStatus = "PENDING" | "SIGNED" | "COUNTERSIGNED";

  /**
   * Derive BH certificate status from engagement fields.
   * Since we don't have a dedicated status field, derive from data:
   * - bhCertSignedAt is null → PENDING
   * - bhCertSignedAt set, no countersign → SIGNED
   * - Both set → COUNTERSIGNED (use a new field or convention)
   */
  export function deriveBhCertStatus(engagement: {
    bhCertSignedAt: Date | null;
    bhCertCountersignedAt?: Date | null;
  }): BhCertificateStatus {
    if (engagement.bhCertCountersignedAt) return "COUNTERSIGNED";
    if (engagement.bhCertSignedAt) return "SIGNED";
    return "PENDING";
  }

  /**
   * Get engagement with BH certificate fields + audit context.
   */
  export async function getEngagementForBhCertificate(
    session: Session,
    engagementId: string,
  ) {
    const tenantId = (session.user as any).tenantId as string;
    const db = prismaForTenant(tenantId);

    return db.auditEngagement.findFirst({
      where: { id: engagementId, tenantId },
      select: {
        id: true,
        status: true,
        auditNumber: true,
        bhCertSignedById: true,
        bhCertSignedAt: true,
        bhCertComments: true,
        branch: { select: { id: true, code: true, name: true } },
        auditPlan: { select: { year: true, quarter: true } },
        teamMembers: {
          include: {
            user: { select: { id: true, name: true, email: true, roles: true } },
          },
        },
        // Include observation summary for certificate content
        observations: {
          select: {
            id: true,
            title: true,
            severity: true,
            status: true,
          },
        },
      },
    });
  }
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/data-access/bh-certificate.ts 2>&1 | head -20
  ```
  </verify>
  <done>
  - `getEngagementForBhCertificate` exported with full BH cert context
  - `deriveBhCertStatus` helper exported for status derivation
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 2: Schema migration consideration + schemas</name>
  <files>src/actions/audit-execution/schemas.ts</files>
  <action>
  **2a. Note on schema extension:**

  The current AuditEngagement has `bhCertSignedById`, `bhCertSignedAt`, `bhCertComments` for BH sign-off. For the countersign workflow, we need additional fields. Two approaches:

  **Option A (preferred — no migration):** Store countersign data in bhCertComments as structured JSON, or use a convention where bhCertComments contains both BH comments and countersign metadata.

  **Option B (clean — requires migration):** Add `bhCertCountersignedById`, `bhCertCountersignedAt` fields to AuditEngagement.

  **Choose Option B** for clean data modeling. Add to schema:
  ```prisma
  bhCertCountersignedById String?   @db.Uuid
  bhCertCountersignedAt   DateTime?
  ```

  Then run `pnpm prisma db push` (dev) or create migration.

  **2b. Add to schemas.ts:**

  ```typescript
  // ─── BH Certificate ───────────────────────────────────────────
  export const SignBhCertificateSchema = z.object({
    engagementId: z.string().uuid(),
    comments: z.string().min(1, "Please add acknowledgment comments").max(2000),
    declarationAccepted: z.literal(true, {
      errorMap: () => ({ message: "You must accept the declaration to sign" }),
    }),
  });

  export const CountersignBhCertificateSchema = z.object({
    engagementId: z.string().uuid(),
    comments: z.string().max(2000).optional(),
  });

  export type SignBhCertificateInput = z.infer<typeof SignBhCertificateSchema>;
  export type CountersignBhCertificateInput = z.infer<typeof CountersignBhCertificateSchema>;
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/actions/audit-execution/schemas.ts 2>&1 | head -20
  ```
  </verify>
  <done>
  - BH certificate schemas added
  - declarationAccepted must be `true` (enforced by z.literal)
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 3: Server actions — Sign and countersign</name>
  <files>src/actions/audit-execution/bh-certificate.ts</files>
  <action>
  Create `src/actions/audit-execution/bh-certificate.ts`:

  ```typescript
  "use server";
  ```

  **`signBhCertificate(input: SignBhCertificateInput)`:**
  1. Auth + extract roles
  2. **Role check:** User must have `BRANCH_HEAD` role (not permission-based — this is a specific role requirement)
     ```typescript
     if (!userRoles.includes("BRANCH_HEAD")) {
       return { success: false as const, error: "Only Branch Heads can sign the BH Certificate." };
     }
     ```
  3. Validate input with SignBhCertificateSchema
  4. Verify engagement exists, belongs to tenant, and bhCertSignedAt is null (not already signed)
  5. Transaction:
     - Set audit context: `bh_certificate.signed`
     - Update engagement:
       ```typescript
       await tx.auditEngagement.update({
         where: { id: validated.engagementId },
         data: {
           bhCertSignedById: session.user.id,
           bhCertSignedAt: new Date(),
           bhCertComments: validated.comments,
         },
       });
       ```
  6. revalidatePath
  7. Return `{ success: true, data: { signedAt: now, signedBy: session.user.name } }`

  **`countersignBhCertificate(input: CountersignBhCertificateInput)`:**
  1. Auth + extract roles
  2. **Role check:** User must have `LEAD_AUDITOR` or `AUDIT_MANAGER` role
  3. Validate input
  4. Verify engagement is already signed (bhCertSignedAt not null) but not countersigned
  5. Transaction:
     - Set audit context: `bh_certificate.countersigned`
     - Update engagement: set bhCertCountersignedById + bhCertCountersignedAt
       (If Option A chosen: append to bhCertComments as structured text)
  6. revalidatePath
  7. Return success

  **`getBhCertificateStatus(engagementId: string)`:**
  - Read-only action to fetch current BH cert state
  - Return `{ status, signedBy, signedAt, comments, countersignedBy, countersignedAt }`
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/actions/audit-execution/bh-certificate.ts 2>&1 | head -20
  ```
  </verify>
  <done>
  - `signBhCertificate` enforces BRANCH_HEAD role
  - `countersignBhCertificate` enforces LEAD_AUDITOR/AUDIT_MANAGER
  - State transition guards prevent double-signing
  - Audit context set for both actions
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 4: Client components — BH certificate workflow + signature capture</name>
  <files>src/components/audit-execution/bh-certificate-workflow.tsx, src/components/audit-execution/bh-signature-capture.tsx</files>
  <action>
  **4a. Create `src/components/audit-execution/bh-signature-capture.tsx`:**

  "use client" — Simple signature capture component:
  - **Not** a canvas drawing pad (too complex for v1) — instead, use a declaration + checkbox pattern:
    - Full declaration text displayed:
      > "I, [Branch Head Name], hereby certify that I have reviewed the audit observations listed in this report. The information provided herein is true and correct to the best of my knowledge. I acknowledge the findings and commit to implementing the remedial actions as agreed."
    - Checkbox: "I accept this declaration"
    - Comments textarea: mandatory
    - "Sign Certificate" button
  - Props: `{ signerName: string; onSign: (comments: string) => void; disabled?: boolean }`
  - Button disabled until checkbox checked and comments entered

  **4b. Create `src/components/audit-execution/bh-certificate-workflow.tsx`:**

  "use client" — Main workflow component:

  Props:
  ```typescript
  interface BhCertificateWorkflowProps {
    engagementId: string;
    currentStatus: "PENDING" | "SIGNED" | "COUNTERSIGNED";
    signedBy: { name: string; signedAt: string } | null;
    countersignedBy: { name: string; signedAt: string } | null;
    comments: string | null;
    currentUserRole: string[];
    currentUserName: string;
    observationSummary: { total: number; critical: number; high: number; medium: number; low: number };
  }
  ```

  Implementation:
  - **Step indicator:** Three steps (PENDING → SIGNED → COUNTERSIGNED) with visual progress
  - **Observation summary card:** Show finding counts by severity
  - **Status-based rendering:**
    - PENDING + user is BRANCH_HEAD: Show BhSignatureCapture
    - PENDING + user is not BRANCH_HEAD: "Awaiting Branch Head signature"
    - SIGNED + user is LEAD_AUDITOR: Show countersign button + optional comments
    - SIGNED + user is not LEAD_AUDITOR: "Awaiting Lead Auditor countersign"
    - COUNTERSIGNED: Show completed state with all details (who signed, when, comments)
  - Toast on success/error
  - Use Card + Badge + Alert components
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/components/audit-execution/bh-certificate-workflow.tsx src/components/audit-execution/bh-signature-capture.tsx 2>&1 | head -20
  ```
  </verify>
  <done>
  - BhSignatureCapture has declaration text + checkbox + comments
  - BhCertificateWorkflow renders status-appropriate UI
  - Role-based rendering (BRANCH_HEAD for sign, LEAD_AUDITOR for countersign)
  - Step indicator shows workflow progress
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 5: PDF section — Render signed BH certificate</name>
  <files>src/components/pdf-report/bh-certificate-section.tsx</files>
  <action>
  Update or create `src/components/pdf-report/bh-certificate-section.tsx`:

  Using @react-pdf/renderer components (the project already uses this library):

  ```typescript
  import { View, Text, StyleSheet } from "@react-pdf/renderer";
  ```

  Render a certificate block with:
  - Title: "BRANCH HEAD CERTIFICATE"
  - Declaration text (same as UI)
  - If signed:
    - "Signed by: [Name]"
    - "Date: [formatted date]"
    - "Comments: [bhCertComments]"
    - Horizontal line as "signature line"
  - If countersigned:
    - "Countersigned by: [Lead Auditor Name]"
    - "Date: [formatted date]"
  - If not signed:
    - "Certificate pending signature"

  Props:
  ```typescript
  interface BhCertificateSectionProps {
    branchName: string;
    auditPeriod: string;
    signedBy: string | null;
    signedAt: Date | null;
    comments: string | null;
    countersignedBy: string | null;
    countersignedAt: Date | null;
  }
  ```

  Wire this into the existing `AuditSummaryDocument` component so it renders as the final section of the PDF.
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/components/pdf-report/bh-certificate-section.tsx 2>&1 | head -20
  ```
  </verify>
  <done>
  - BhCertificateSection renders signature block in PDF
  - Conditional rendering based on signed/unsigned state
  - Wired into AuditSummaryDocument
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 6: Page — /audit-execution/[id]/bh-certificate</name>
  <files>src/app/(dashboard)/audit-execution/[id]/bh-certificate/page.tsx</files>
  <action>
  Create server component page:

  1. Fetch engagement via `getEngagementForBhCertificate(session, engagementId)`
  2. Derive BH cert status via `deriveBhCertStatus()`
  3. Resolve signer names from User model if bhCertSignedById is set
  4. Compute observation summary from engagement.observations
  5. Pass current user's roles and name for role-based rendering
  6. Render BhCertificateWorkflow with all props

  ```typescript
  export default async function BhCertificatePage({ params }: PageProps) {
    const { id: engagementId } = await params;
    const session = await getRequiredSession();
    const engagement = await getEngagementForBhCertificate(session, engagementId);
    if (!engagement) notFound();

    const status = deriveBhCertStatus(engagement);
    const userRoles = ((session.user as any).roles ?? []) as string[];

    const observationSummary = {
      total: engagement.observations.length,
      critical: engagement.observations.filter(o => o.severity === "CRITICAL").length,
      high: engagement.observations.filter(o => o.severity === "HIGH").length,
      medium: engagement.observations.filter(o => o.severity === "MEDIUM").length,
      low: engagement.observations.filter(o => o.severity === "LOW").length,
    };

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">BH Certificate</h1>
          <p className="text-muted-foreground">
            {engagement.branch?.name} — Digital sign-off
          </p>
        </div>
        <BhCertificateWorkflow
          engagementId={engagementId}
          currentStatus={status}
          signedBy={...}
          countersignedBy={...}
          comments={engagement.bhCertComments}
          currentUserRole={userRoles}
          currentUserName={session.user.name}
          observationSummary={observationSummary}
        />
      </div>
    );
  }
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/app/\(dashboard\)/audit-execution/\[id\]/bh-certificate/page.tsx 2>&1 | head -20
  ```
  </verify>
  <done>
  - Page exists at correct route
  - Server component fetches engagement + derives status
  - Observation summary computed server-side
  - User roles passed to client component
  - TypeScript compiles
  </done>
</task>

## Verification

```bash
# 1. TypeScript compilation
cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit

# 2. Verify sign-off actions
grep -E "export async function (sign|countersign)BhCertificate" src/actions/audit-execution/bh-certificate.ts | wc -l
# Expected: 2

# 3. Verify role checks
grep "BRANCH_HEAD" src/actions/audit-execution/bh-certificate.ts && echo "PASS: BH role check" || echo "FAIL"
grep "LEAD_AUDITOR" src/actions/audit-execution/bh-certificate.ts && echo "PASS: LA role check" || echo "FAIL"

# 4. Verify PDF section
grep "BhCertificateSection" src/components/pdf-report/bh-certificate-section.tsx && echo "PASS" || echo "FAIL"

# 5. Verify page exists
test -f src/app/\(dashboard\)/audit-execution/\[id\]/bh-certificate/page.tsx && echo "PASS" || echo "FAIL"
```

## Success Criteria

1. **R26 gap closed:** BH Certificate digital sign-off fully implemented
2. **Role-based access:** Only BRANCH_HEAD can sign, LEAD_AUDITOR/AUDIT_MANAGER can countersign
3. **State transitions:** PENDING → SIGNED → COUNTERSIGNED with guards
4. **Declaration capture:** Formal acknowledgment text with mandatory acceptance
5. **PDF integration:** Signed certificate renders in PDF report with signature details
6. **Audit trail:** All sign-off actions recorded via audit context
7. **Observation summary:** Certificate page shows finding summary for context
8. **TypeScript:** All files compile
9. **Conventions:** Server action boilerplate, client component patterns followed
