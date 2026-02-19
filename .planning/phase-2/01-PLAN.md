---
phase: 2
plan: 1
type: standard
wave: 1
depends_on: []
files_modified:
  - prisma/schema.prisma
  - src/lib/permissions.ts
autonomous: true
must_haves:
  truths:
    - "ComplianceItem model exists with 1:1 observationId, status, dueDate, escalationLevel, daysOpen, branchResponseSubmittedAt fields"
    - "ZONAL_AUDITOR role added to Role enum"
    - "ReportMetadata model tracks generated reports with status workflow"
    - "TemplateVersion model supports versioning with isActive flag"
    - "ComplianceStatus enum includes OPEN, PENDING_BRANCH_RESPONSE, PENDING_ZAC_REVIEW, PENDING_ACE, PENDING_ACB, COMPLIED, ACCEPTED_RISK, CLOSED"
    - "EscalationLevel enum includes NONE, L1_EMAIL, L2_ZAC, L3_ACE, L4_ACB"
    - "ReportStatus enum includes DRAFT, UNDER_REVIEW, APPROVED, ISSUED"
  artifacts:
    - path: "prisma/schema.prisma"
      provides: "ComplianceItem, ReportMetadata, TemplateVersion models + enums + ZONAL_AUDITOR role"
    - path: "src/lib/permissions.ts"
      provides: "ZONAL_AUDITOR permissions + compliance lifecycle permissions"
  key_links:
    - from: "ComplianceItem"
      to: "Observation"
      via: "ComplianceItem.observationId → Observation.id (1:1)"
    - from: "ReportMetadata"
      to: "AuditEngagement"
      via: "ReportMetadata.engagementId → AuditEngagement.id"
---

## Objective

Establish the foundational schema for Phase 2: ComplianceItem model for tracking observation compliance through the full lifecycle (Branch → ZAC → ACE → ACB), ZONAL_AUDITOR role for zone-level compliance review, ReportMetadata model for tracking generated reports with approval workflow, and TemplateVersion model for template management with versioning.

This plan covers R34 (ComplianceItem), R41 (ZONAL_AUDITOR), R33 (report routing), and R48 (template versioning).

## Context

@AEGIS/prisma/schema.prisma — current 39-model schema from Phase 1 (modify)
@AEGIS/src/lib/permissions.ts — current RBAC system (modify)
@AEGIS/.planning/REQUIREMENTS.md — R29-R48
@AEGIS/.planning/ROADMAP.md — Phase 2 description
@AEGIS/.planning/codebase/CONVENTIONS.md — coding patterns

## Tasks

<task type="auto">
  <name>Task 1: Schema — Add enums for compliance lifecycle</name>
  <files>prisma/schema.prisma</files>
  <action>
  **1a. Add ZONAL_AUDITOR to the existing `Role` enum (after BRANCH_HEAD):**

```prisma
enum Role {
  AUDITOR
  AUDIT_MANAGER
  CAE
  CCO
  CEO
  AUDITEE
  BOARD_OBSERVER
  LEAD_AUDITOR
  FIELD_AUDITOR
  BRANCH_HEAD
  ZONAL_AUDITOR
}
```

**1b. Add new enums BEFORE the Tenant model (after existing enums):**

```prisma
enum ComplianceStatus {
  OPEN
  PENDING_BRANCH_RESPONSE
  PENDING_ZAC_REVIEW
  PENDING_ACE
  PENDING_ACB
  COMPLIED
  ACCEPTED_RISK
  CLOSED
}

enum EscalationLevel {
  NONE
  L1_EMAIL
  L2_ZAC
  L3_ACE
  L4_ACB
}

enum ReportStatus {
  DRAFT
  UNDER_REVIEW
  APPROVED
  ISSUED
}

enum ReportFormat {
  XLSX
  PDF
}

enum TemplateCategory {
  REPORT_SECTION
  EXAMINATION_CHECKLIST
  COMPLIANCE_FORM
  CUSTOM
}
```

**IMPORTANT:** Place these enums in the enums section, NOT inside any model.
</action>
<verify>

```bash
cd /root/.openclaw/workspace/AEGIS && pnpm prisma validate
```

Must exit 0 with no errors.
</verify>
<done>

- Role enum has ZONAL_AUDITOR (11 total values)
- ComplianceStatus enum exists with 8 values
- EscalationLevel enum exists with 5 values
- ReportStatus enum exists with 4 values
- ReportFormat enum exists with 2 values
- TemplateCategory enum exists with 4 values
- `pnpm prisma validate` passes
  </done>
  </task>

<task type="auto">
  <name>Task 2: Schema — ComplianceItem model</name>
  <files>prisma/schema.prisma</files>
  <action>
  **2a. Add ComplianceItem model (after the Observation model, before ObservationTimeline):**

```prisma
// ─── Compliance Item (Phase 2 — R34: observation compliance tracking) ──────

model ComplianceItem {
  id            String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId      String @db.Uuid
  tenant        Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // 1:1 relationship with Observation
  observationId String      @unique @db.Uuid
  observation   Observation @relation(fields: [observationId], references: [id], onDelete: Cascade)

  // Denormalized for query efficiency
  auditId       String          @db.Uuid
  audit         AuditEngagement @relation(fields: [auditId], references: [id])
  branchId      String?         @db.Uuid
  branch        Branch?         @relation(fields: [branchId], references: [id])

  status            ComplianceStatus  @default(OPEN)
  escalationLevel   EscalationLevel   @default(NONE)
  daysOpen          Int               @default(0) // Computed daily by cron

  dueDate           DateTime?
  branchResponseDue DateTime?         // 30-day SLA from observation issued date

  branchResponseSubmittedAt DateTime?
  branchResponseSubmittedBy String?   @db.Uuid

  zacReviewedAt     DateTime?
  zacReviewedBy     String?   @db.Uuid
  zacDecision       String?   // "ACCEPTED", "REJECTED", "REQUEST_INFO"
  zacComments       String?   @db.Text

  aceProcessedAt    DateTime?
  aceProcessedBy    String?   @db.Uuid
  aceQuarter        Quarter?
  aceYear           Int?

  acbReportedAt     DateTime?
  acbReportedBy     String?   @db.Uuid
  acbMeetingDate    DateTime?

  closedAt          DateTime?
  closedBy          String?   @db.Uuid
  closureReason     String?   @db.Text

  acceptedRisk      Boolean   @default(false)
  acceptedRiskBy    String?   @db.Uuid
  acceptedRiskAt    DateTime?
  acceptedRiskReason String?  @db.Text

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  escalations     ComplianceEscalation[]
  statusHistory   ComplianceStatusHistory[]

  @@index([tenantId])
  @@index([status])
  @@index([escalationLevel])
  @@index([tenantId, status, daysOpen])
  @@index([auditId])
  @@index([branchId])
}
```

**2b. Add relation to Tenant model (after `dashboardSnapshots`):**

```prisma
  complianceItems            ComplianceItem[]
```

**2c. Add relation to Observation model (after `examinationResponses`):**

```prisma
  complianceItem             ComplianceItem?
```

**2d. Add relation to AuditEngagement model (after `smaNpaEntries`):**

```prisma
  complianceItems            ComplianceItem[]
```

**2e. Add relation to Branch model (after `ramAssessments`):**

```prisma
  complianceItems            ComplianceItem[]
```

**IMPORTANT:** Do NOT remove any existing fields. Only ADD new content.
</action>
<verify>

```bash
cd /root/.openclaw/workspace/AEGIS && pnpm prisma validate
```

Must exit 0 with no errors.
</verify>
<done>

- ComplianceItem model exists with observationId @unique (1:1 relation)
- ComplianceItem has status, escalationLevel, daysOpen, dueDate fields
- ComplianceItem has all lifecycle stage fields (branch response, ZAC, ACE, ACB)
- ComplianceItem has acceptedRisk tracking fields
- Tenant, Observation, AuditEngagement, Branch have complianceItems relations
- `pnpm prisma validate` passes
  </done>
  </task>

<task type="auto">
  <name>Task 3: Schema — ComplianceEscalation and StatusHistory tracking</name>
  <files>prisma/schema.prisma</files>
  <action>
  **3a. Add ComplianceEscalation model (after ComplianceItem):**

```prisma
// ─── Compliance Escalation (Phase 2 — escalation event tracking) ───────────

model ComplianceEscalation {
  id               String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId         String @db.Uuid
  tenant           Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  complianceItemId String         @db.Uuid
  complianceItem   ComplianceItem @relation(fields: [complianceItemId], references: [id], onDelete: Cascade)

  level            EscalationLevel
  triggeredAt      DateTime        @default(now())
  notifiedUserIds  String[]        // Array of user IDs notified
  emailsSent       Int             @default(0)

  resolvedAt       DateTime?
  resolvedBy       String?         @db.Uuid

  createdAt DateTime @default(now())

  @@index([tenantId])
  @@index([complianceItemId])
  @@index([level, triggeredAt])
}
```

**3b. Add ComplianceStatusHistory model (after ComplianceEscalation):**

```prisma
// ─── Compliance Status History (Phase 2 — audit trail) ─────────────────────

model ComplianceStatusHistory {
  id               String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId         String @db.Uuid
  tenant           Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  complianceItemId String         @db.Uuid
  complianceItem   ComplianceItem @relation(fields: [complianceItemId], references: [id], onDelete: Cascade)

  fromStatus       ComplianceStatus?
  toStatus         ComplianceStatus
  changedById      String           @db.Uuid
  changedBy        User             @relation(fields: [changedById], references: [id])
  comments         String?          @db.Text

  createdAt DateTime @default(now())

  @@index([tenantId])
  @@index([complianceItemId])
  @@index([createdAt])
}
```

**3c. Add relations to Tenant model (after `complianceItems`):**

```prisma
  complianceEscalations      ComplianceEscalation[]
  complianceStatusHistory    ComplianceStatusHistory[]
```

**3d. Add relation to User model (after `auditTeamMemberships`):**

```prisma
  complianceStatusChanges    ComplianceStatusHistory[]
```

**IMPORTANT:** Only ADD new models and relations.
</action>
<verify>

```bash
cd /root/.openclaw/workspace/AEGIS && pnpm prisma validate
```

Must exit 0 with no errors.
</verify>
<done>

- ComplianceEscalation model exists with level, triggeredAt, notifiedUserIds
- ComplianceStatusHistory model exists with fromStatus, toStatus, changedById
- Tenant has complianceEscalations and complianceStatusHistory relations
- User has complianceStatusChanges relation
- `pnpm prisma validate` passes
  </done>
  </task>

<task type="auto">
  <name>Task 4: Schema — ReportMetadata and TemplateVersion models</name>
  <files>prisma/schema.prisma</files>
  <action>
  **4a. Add ReportMetadata model (after BoardReport, before DashboardSnapshot):**

```prisma
// ─── Report Metadata (Phase 2 — R33: report tracking + routing workflow) ───

model ReportMetadata {
  id           String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId     String @db.Uuid
  tenant       Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  engagementId String          @db.Uuid
  engagement   AuditEngagement @relation(fields: [engagementId], references: [id])

  format       ReportFormat
  status       ReportStatus    @default(DRAFT)

  // Risk rating (R31, R32)
  riskScore    Decimal?        @db.Decimal(5, 2) // Weighted average
  ratingBand   String?         // "VERY_GOOD", "GOOD", "SATISFACTORY", "MODERATE", "POOR"

  // File storage
  s3Key        String?
  fileSize     Int?
  filename     String?

  // Workflow
  generatedById  String   @db.Uuid
  generatedBy    User     @relation("ReportGeneratedBy", fields: [generatedById], references: [id])
  generatedAt    DateTime @default(now())

  reviewedById   String?  @db.Uuid
  reviewedBy     User?    @relation("ReportReviewedBy", fields: [reviewedById], references: [id])
  reviewedAt     DateTime?
  reviewComments String?  @db.Text

  approvedById   String?  @db.Uuid
  approvedBy     User?    @relation("ReportApprovedBy", fields: [approvedById], references: [id])
  approvedAt     DateTime?
  approvalComments String? @db.Text

  issuedAt       DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId])
  @@index([engagementId])
  @@index([status])
}
```

**4b. Add TemplateVersion model (after ReportMetadata):**

```prisma
// ─── Template Version (Phase 2 — R48: template management with versioning) ─

model TemplateVersion {
  id           String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId     String @db.Uuid
  tenant       Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  templateCode String   // e.g., "RBIA_REPORT", "CASH_CHECK_FORM"
  category     TemplateCategory
  name         String
  description  String?  @db.Text

  versionNumber Int
  isActive      Boolean @default(false)

  // Template content (JSON structure or HTML template string)
  contentJson   Json?
  contentHtml   String?  @db.Text

  // Template configuration (field mappings, section order, etc.)
  config        Json?

  createdById   String   @db.Uuid
  createdBy     User     @relation(fields: [createdById], references: [id])
  createdAt     DateTime @default(now())

  activatedById String?  @db.Uuid
  activatedBy   User?    @relation("TemplateActivatedBy", fields: [activatedById], references: [id])
  activatedAt   DateTime?

  @@unique([tenantId, templateCode, versionNumber])
  @@index([tenantId])
  @@index([tenantId, templateCode, isActive])
}
```

**4c. Add relations to Tenant model (after `complianceStatusHistory`):**

```prisma
  reportMetadata             ReportMetadata[]
  templateVersions           TemplateVersion[]
```

**4d. Add relations to AuditEngagement model (after `complianceItems`):**

```prisma
  reportMetadata             ReportMetadata[]
```

**4e. Add relations to User model (after `complianceStatusChanges`):**

```prisma
  generatedReportMetadata    ReportMetadata[]  @relation("ReportGeneratedBy")
  reviewedReportMetadata     ReportMetadata[]  @relation("ReportReviewedBy")
  approvedReportMetadata     ReportMetadata[]  @relation("ReportApprovedBy")
  createdTemplates           TemplateVersion[]
  activatedTemplates         TemplateVersion[] @relation("TemplateActivatedBy")
```

**IMPORTANT:** Only ADD new models and relations.
</action>
<verify>

```bash
cd /root/.openclaw/workspace/AEGIS && pnpm prisma validate
```

Must exit 0 with no errors.
</verify>
<done>

- ReportMetadata model exists with format, status, riskScore, ratingBand
- ReportMetadata has workflow fields (generated, reviewed, approved, issued)
- TemplateVersion model exists with templateCode, versionNumber, isActive
- TemplateVersion has @@unique([tenantId, templateCode, versionNumber])
- Tenant has reportMetadata and templateVersions relations
- AuditEngagement has reportMetadata relation
- User has 5 new report/template relations
- `pnpm prisma validate` passes
  </done>
  </task>

<task type="auto">
  <name>Task 5: RBAC — ZONAL_AUDITOR permissions</name>
  <files>src/lib/permissions.ts</files>
  <action>
  **5a. Add new permissions to the `Permission` type union (after existing permissions):**

```typescript
  // Compliance Lifecycle (Phase 2)
  | "compliance:manage"
  | "compliance:branch_response"
  | "compliance:zac_review"
  | "compliance:ace_process"
  | "compliance:acb_report"
  | "compliance:accept_risk"
  // Reports (Phase 2)
  | "report:generate"
  | "report:review"
  | "report:approve"
  | "report:issue"
  // Templates (Phase 2)
  | "template:read"
  | "template:create"
  | "template:activate"
  // Analytics (Phase 2)
  | "analytics:branch_heatmap"
  | "analytics:audit_progress"
  | "analytics:compliance_aging"
  | "analytics:findings_trend"
  | "analytics:npa_movement"
```

**5b. Add ZONAL_AUDITOR entry to `ROLE_PERMISSIONS` (after BRANCH_HEAD):**

```typescript
  ZONAL_AUDITOR: [
    "observation:read",
    "compliance:read",
    "compliance:zac_review",
    "audit_plan:read",
    "audit_execution:read",
    "examination:read",
    "report:generate",
    "analytics:branch_heatmap",
    "analytics:compliance_aging",
    "dashboard:auditor",
  ],
```

**5c. Update existing role permissions:**

Add to AUDIT_MANAGER:

```typescript
    "compliance:manage",
    "report:generate",
    "report:review",
    "analytics:audit_progress",
    "analytics:findings_trend",
```

Add to CAE:

```typescript
    "compliance:manage",
    "compliance:ace_process",
    "report:generate",
    "report:review",
    "report:approve",
    "template:read",
    "template:create",
    "template:activate",
    "analytics:branch_heatmap",
    "analytics:audit_progress",
    "analytics:compliance_aging",
    "analytics:findings_trend",
    "analytics:npa_movement",
```

Add to CEO:

```typescript
    "compliance:acb_report",
    "report:issue",
    "analytics:branch_heatmap",
    "analytics:audit_progress",
    "analytics:compliance_aging",
    "analytics:findings_trend",
    "analytics:npa_movement",
```

Add to AUDITEE:

```typescript
    "compliance:branch_response",
```

**5d. Update `getAssignableRoles()` to include ZONAL_AUDITOR:**

```typescript
export function getAssignableRoles(): Role[] {
  return [
    Role.AUDITOR,
    Role.AUDIT_MANAGER,
    Role.CAE,
    Role.CCO,
    Role.CEO,
    Role.AUDITEE,
    Role.LEAD_AUDITOR,
    Role.FIELD_AUDITOR,
    Role.BRANCH_HEAD,
    Role.ZONAL_AUDITOR,
  ];
}
```

**5e. Update `getRoleDisplayName()` to include:**

```typescript
  ZONAL_AUDITOR: "Zonal Auditor",
```

**IMPORTANT:** Only ADD permissions to existing arrays, don't remove any.
</action>
<verify>

```bash
cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/lib/permissions.ts 2>&1 | head -20
```

Must compile without errors.
</verify>
<done>

- Permission type includes 16 new Phase 2 permissions
- ZONAL_AUDITOR has appropriate permissions in ROLE_PERMISSIONS
- AUDIT_MANAGER, CAE, CEO, AUDITEE have compliance/report/analytics permissions
- getAssignableRoles() includes ZONAL_AUDITOR
- getRoleDisplayName() includes "Zonal Auditor"
- TypeScript compiles successfully
  </done>
  </task>

## Success Criteria

1. `pnpm prisma validate` passes with all Phase 2 schema additions
2. `pnpm exec tsc --noEmit` passes
3. Role enum has 11 values (including ZONAL_AUDITOR)
4. 5 new enums exist (ComplianceStatus, EscalationLevel, ReportStatus, ReportFormat, TemplateCategory)
5. ComplianceItem model has 1:1 relation with Observation via @unique observationId
6. ComplianceEscalation and ComplianceStatusHistory tracking models exist
7. ReportMetadata model has workflow fields and risk rating fields
8. TemplateVersion model has @@unique([tenantId, templateCode, versionNumber])
9. permissions.ts compiles with 16 new permissions and ZONAL_AUDITOR role mapping
10. All existing models retain their fields (no deletions)
