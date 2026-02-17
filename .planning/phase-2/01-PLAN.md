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
    - "ComplianceItem model exists with observation_id, status, due_date, escalation_level, days_open"
    - "ZONAL_AUDITOR role exists in Role enum"
    - "ReportTemplate model supports versioning with version_number, is_active, template_data JSONB"
    - "AuditCalendar model supports event scheduling with recurrence rules"
    - "ComplianceStatus enum includes all lifecycle stages"
    - "ZONAL_AUDITOR has appropriate permissions in ROLE_PERMISSIONS"
  artifacts:
    - path: "prisma/schema.prisma"
      provides: "ComplianceItem, ReportTemplate, AuditCalendar models, ComplianceStatus enum extensions, ZONAL_AUDITOR role"
    - path: "src/lib/permissions.ts"
      provides: "Updated permissions for compliance lifecycle and ZONAL_AUDITOR role"
  key_links:
    - from: "ComplianceItem"
      to: "Observation"
      via: "ComplianceItem.observationId → Observation.id (1:1 relationship)"
    - from: "ComplianceItem"
      to: "Branch"
      via: "ComplianceItem.branchId → Branch.id"
---

## Objective

Establish Phase 2 schema foundation: ComplianceItem model for tracking observation remediation lifecycle, ZONAL_AUDITOR role for zone-level compliance review, ReportTemplate model for versioned report templates, and AuditCalendar for event scheduling. These are the core data models that all Phase 2 features depend on.

## Context

@AEGIS/prisma/schema.prisma — current 39-model schema (modify)
@AEGIS/src/lib/permissions.ts — current RBAC system (modify)
@AEGIS/.planning/REQUIREMENTS.md — R34, R41, R47, R48
@AEGIS/.planning/codebase/CONVENTIONS.md — schema patterns

## Tasks

<task type="auto">
  <name>Task 1: Schema — ComplianceItem model + ComplianceStatus extensions</name>
  <files>prisma/schema.prisma</files>
  <action>
  **1a. Extend ComplianceStatus enum to include all lifecycle stages (after existing values):**

  Find the existing ComplianceStatus enum and ADD these values (do not remove existing ones):

  ```prisma
  enum ComplianceStatus {
    COMPLIANT
    PARTIAL
    NON_COMPLIANT
    PENDING
    OPEN
    BRANCH_RESPONSE_DUE
    BRANCH_RESPONSE_SUBMITTED
    ZAC_REVIEW
    ZAC_APPROVED
    ZAC_REJECTED
    ACE_REVIEW
    ACB_REVIEW
    CLOSED
    OVERDUE
  }
  ```

  **1b. Add ComplianceItem model (after SmaNpaEntry model):**

  ```prisma
  // ─── Compliance Item (Phase 2 — R34: observation remediation lifecycle) ────

  model ComplianceItem {
    id       String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
    tenantId String @db.Uuid
    tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

    // Link to observation (1:1 relationship)
    observationId String      @unique @db.Uuid
    observation   Observation @relation(fields: [observationId], references: [id], onDelete: Cascade)

    // Denormalized for query performance
    auditId   String?          @db.Uuid
    audit     AuditEngagement? @relation(fields: [auditId], references: [id])
    branchId  String?          @db.Uuid
    branch    Branch?          @relation(fields: [branchId], references: [id])

    status          ComplianceStatus @default(OPEN)
    dueDate         DateTime
    escalationLevel Int              @default(0) // 0=none, 1=L1 (+15d), 2=L2 (+30d), 3=L3 (+90d), 4=L4 (+180d)
    daysOpen        Int              @default(0) // Computed field, updated by cron

    // Branch response
    branchResponseText      String?   @db.Text
    branchResponseDate      DateTime?
    branchResponseEvidence  String[]  // S3 keys

    // ZAC review
    zacReviewedById         String?   @db.Uuid
    zacReviewedAt           DateTime?
    zacReviewComments       String?   @db.Text
    zacReviewDecision       String?   // "APPROVED", "REJECTED", "REQUEST_INFO"

    // ACE processing
    aceReviewedById         String?   @db.Uuid
    aceReviewedAt           DateTime?
    aceQuarter              String?   // "2025-Q1"

    // ACB reporting
    acbReportedAt           DateTime?
    acbMeetingRef           String?

    closedAt                DateTime?
    closedById              String?   @db.Uuid

    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    @@index([tenantId])
    @@index([status])
    @@index([branchId, status])
    @@index([dueDate])
    @@index([escalationLevel])
  }
  ```

  **1c. Add ComplianceItem relation to Tenant model (after smaNpaEntries):**

  ```prisma
    complianceItems            ComplianceItem[]
  ```

  **1d. Add ComplianceItem relation to Branch model (after ramAssessments):**

  ```prisma
    complianceItems  ComplianceItem[]
  ```

  **1e. Add ComplianceItem relation to AuditEngagement model (after smaNpaEntries):**

  ```prisma
    complianceItems          ComplianceItem[]
  ```

  **1f. Add ComplianceItem relation to Observation model (after examinationResponses):**

  ```prisma
    complianceItem           ComplianceItem?
  ```

  **IMPORTANT:** Do NOT remove or change any existing fields. Only ADD new content.
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm prisma validate
  ```
  Must exit 0 with no errors.
  </verify>
  <done>
  - ComplianceStatus enum has 14 values (including OPEN, BRANCH_RESPONSE_DUE, ZAC_REVIEW, ACE_REVIEW, ACB_REVIEW, CLOSED, OVERDUE)
  - ComplianceItem model exists with observationId @unique
  - ComplianceItem has escalationLevel (0-4), daysOpen, status, dueDate
  - ComplianceItem has branch/ZAC/ACE/ACB workflow fields
  - Tenant, Branch, AuditEngagement, Observation have ComplianceItem relations
  - `pnpm prisma validate` passes
  </done>
</task>

<task type="auto">
  <name>Task 2: Schema — ZONAL_AUDITOR role + ReportTemplate + AuditCalendar models</name>
  <files>prisma/schema.prisma, src/lib/permissions.ts</files>
  <action>
  **2a. Add ZONAL_AUDITOR to Role enum (after BRANCH_HEAD):**

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

  **2b. Add ReportTemplate model (after ComplianceItem):**

  ```prisma
  // ─── Report Template (Phase 2 — R48: versioned templates) ──────────────────

  model ReportTemplate {
    id       String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
    tenantId String @db.Uuid
    tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

    name           String
    category       String // "AUDIT_SECTION", "CHECKLIST", "REPORT_HEADER"
    versionNumber  Int    @default(1)
    isActive       Boolean @default(true)
    templateData   Json   // JSONB: flexible template structure

    createdById    String   @db.Uuid
    createdAt      DateTime @default(now())
    updatedAt      DateTime @updatedAt

    @@unique([tenantId, name, versionNumber])
    @@index([tenantId])
    @@index([tenantId, category, isActive])
  }
  ```

  **2c. Add AuditCalendar model (after ReportTemplate):**

  ```prisma
  // ─── Audit Calendar (Phase 2 — R47: audit event scheduling) ────────────────

  model AuditCalendar {
    id       String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
    tenantId String @db.Uuid
    tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

    title          String
    eventType      String   // "RBIA", "CONCURRENT", "IS_EDP", "STATUTORY", "MEETING"
    startDate      DateTime
    endDate        DateTime?
    allDay         Boolean  @default(false)

    branchId       String?  @db.Uuid
    branch         Branch?  @relation(fields: [branchId], references: [id])

    engagementId   String?  @db.Uuid
    engagement     AuditEngagement? @relation(fields: [engagementId], references: [id])

    recurrenceRule String?  // iCalendar RRULE format
    description    String?  @db.Text
    assignedToId   String?  @db.Uuid

    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    @@index([tenantId])
    @@index([tenantId, startDate])
    @@index([eventType])
  }
  ```

  **2d. Add relations to Tenant model (after complianceItems):**

  ```prisma
    reportTemplates            ReportTemplate[]
    auditCalendarEvents        AuditCalendar[]
  ```

  **2e. Add relations to Branch model (after complianceItems):**

  ```prisma
    calendarEvents   AuditCalendar[]
  ```

  **2f. Add relation to AuditEngagement model (after complianceItems):**

  ```prisma
    calendarEvents           AuditCalendar[]
  ```

  **2g. Update `src/lib/permissions.ts`:**

  Add new permissions to the Permission type union:

  ```typescript
    // Compliance Lifecycle (Phase 2)
    | "compliance:read"
    | "compliance:create"
    | "compliance:branch_response"
    | "compliance:zac_review"
    | "compliance:ace_process"
    | "compliance:acb_report"
    | "report:generate"
    | "report:approve"
    | "template:manage"
    | "calendar:manage"
  ```

  Add ZONAL_AUDITOR role to ROLE_PERMISSIONS:

  ```typescript
    ZONAL_AUDITOR: [
      "observation:read",
      "compliance:read",
      "compliance:zac_review",
      "audit_plan:read",
      "audit_execution:read",
      "examination:read",
      "dashboard:auditor",
    ],
  ```

  Also add compliance:read to existing roles:
  - Add `"compliance:read"` to AUDITOR, LEAD_AUDITOR, FIELD_AUDITOR, AUDIT_MANAGER
  - Add `"compliance:read"`, `"compliance:create"`, `"compliance:ace_process"` to CAE
  - Add `"compliance:read"`, `"compliance:acb_report"`, `"report:generate"`, `"report:approve"` to CEO
  - Add `"compliance:branch_response"` to BRANCH_HEAD and AUDITEE
  - Add `"template:manage"`, `"calendar:manage"` to CAE and AUDIT_MANAGER

  Update getAssignableRoles() to include ZONAL_AUDITOR:

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

  Update getRoleDisplayName() to include:

  ```typescript
    ZONAL_AUDITOR: "Zonal Auditor",
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm prisma validate && pnpm exec tsc --noEmit --pretty 2>&1 | head -30
  ```
  Both prisma validate and typecheck must pass.
  </verify>
  <done>
  - Role enum has 11 values (includes ZONAL_AUDITOR)
  - ReportTemplate model exists with versionNumber, isActive, templateData JSONB
  - ReportTemplate has @@unique([tenantId, name, versionNumber])
  - AuditCalendar model exists with eventType, startDate, recurrenceRule
  - Tenant, Branch, AuditEngagement have appropriate relations
  - Permission type includes 10 new Phase 2 permissions
  - ZONAL_AUDITOR role has zac_review permission
  - All relevant roles have compliance:read permission
  - `pnpm prisma validate` and TypeScript compilation pass
  </done>
</task>

## Success Criteria

1. `pnpm prisma validate` passes with all schema additions
2. `pnpm exec tsc --noEmit` passes (or only pre-existing errors)
3. Role enum has exactly 11 values (includes ZONAL_AUDITOR)
4. ComplianceItem model has 1:1 relationship with Observation via @unique observationId
5. ComplianceItem has escalationLevel (0-4), daysOpen, status, dueDate fields
6. ComplianceStatus enum includes lifecycle stages (OPEN, ZAC_REVIEW, ACE_REVIEW, ACB_REVIEW, CLOSED)
7. ReportTemplate supports versioning with @@unique([tenantId, name, versionNumber])
8. AuditCalendar supports recurrence with recurrenceRule field
9. permissions.ts includes 10 new Phase 2 permissions
10. ZONAL_AUDITOR has compliance:zac_review permission
