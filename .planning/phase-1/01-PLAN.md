---
phase: 1
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
    - "Role enum includes LEAD_AUDITOR, FIELD_AUDITOR, BRANCH_HEAD"
    - "Zone model exists with tenant-scoped code uniqueness"
    - "Branch has zoneId, category, businessSize, staffStrength, ramScore, auditFrequency, lastAuditDate, lastAuditRating fields"
    - "AuditEngagement has auditNumber, auditType, visitNumber, periodFrom/To, actualStartDate/End, overallRiskRating, BH cert fields"
    - "AuditTeamMember join model links users to engagements with roleInEngagement and assignedSections"
    - "New roles have appropriate permissions in ROLE_PERMISSIONS map"
  artifacts:
    - path: "prisma/schema.prisma"
      provides: "Zone model, Branch extensions, Role additions, AuditEngagement extensions, AuditTeamMember model"
    - path: "src/lib/permissions.ts"
      provides: "Updated Permission type + ROLE_PERMISSIONS for LEAD_AUDITOR, FIELD_AUDITOR, BRANCH_HEAD"
  key_links:
    - from: "Zone"
      to: "Branch"
      via: "Branch.zoneId → Zone.id"
    - from: "AuditTeamMember"
      to: "AuditEngagement"
      via: "AuditTeamMember.engagementId → AuditEngagement.id"
    - from: "AuditTeamMember"
      to: "User"
      via: "AuditTeamMember.userId → User.id"
---

## Objective

Establish the foundational schema changes for Phase 1: new audit roles, Zone model for ZAC workflow, extended Branch with RAM-relevant fields, extended AuditEngagement with full audit metadata, and the AuditTeamMember join model for multi-member team assignments. Also updates the RBAC permissions system to recognize the three new roles.

This is the foundation that every subsequent Phase 1 plan builds on.

## Context

@AEGIS/prisma/schema.prisma — current 27-model schema (modify)
@AEGIS/src/lib/permissions.ts — current RBAC system (modify)
@AEGIS/.planning/REQUIREMENTS.md — R1, R2, R3, R10, R11
@AEGIS/.planning/codebase/CONVENTIONS.md — coding patterns

## Tasks

<task type="auto">
  <name>Task 1: Schema — Role enum, Zone model, Branch extensions</name>
  <files>prisma/schema.prisma</files>
  <action>
  **1a. Add three values to the existing `Role` enum (after BOARD_OBSERVER):**

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
}
```

**1b. Add Zone model (after the Branch model section):**

```prisma
// ─── Zone (Phase 1 — R2: ZAC workflow foundation) ──────────────────────────

model Zone {
  id       String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId String @db.Uuid
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  code     String  // e.g., "ZONE-01", "WEST"
  name     String  // e.g., "Western Zone"

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  branches Branch[]

  @@unique([tenantId, code])
  @@index([tenantId])
}
```

**1c. Extend the existing Branch model — add these fields AFTER `type String?`:**

```prisma
  // Phase 1 extensions (R3: RAM-relevant branch metadata)
  zoneId          String?   @db.Uuid
  zone            Zone?     @relation(fields: [zoneId], references: [id])
  category        String?   // "LARGE", "MEDIUM", "SMALL", "VERY_SMALL"
  businessSize    Decimal?  @db.Decimal(15, 2) // Total business in lakhs
  staffStrength   Int?
  ramScore        Decimal?  @db.Decimal(5, 2) // Latest RAM composite score (cached)
  auditFrequency  Int?      // Derived audit frequency in months
  lastAuditDate   DateTime?
  lastAuditRating String?   // "VERY_GOOD", "GOOD", "SATISFACTORY", "MODERATE", "POOR"
```

**1d. Add `zones` relation to the Tenant model's relations block:**

```prisma
  zones                    Zone[]
```

Add it after the `branches Branch[]` line in the Tenant model.

**IMPORTANT:** Do NOT remove or change any existing fields or relations. Only ADD new content.
</action>
<verify>

```bash
cd /root/.openclaw/workspace/AEGIS && pnpm prisma validate
```

Must exit 0 with no errors.
</verify>
<done>

- Role enum has 10 values (original 7 + LEAD_AUDITOR, FIELD_AUDITOR, BRANCH_HEAD)
- Zone model exists with id, tenantId, code, name, @@unique([tenantId, code])
- Branch has 8 new fields: zoneId, zone, category, businessSize, staffStrength, ramScore, auditFrequency, lastAuditDate, lastAuditRating
- Tenant has `zones Zone[]` relation
- `pnpm prisma validate` passes
  </done>
  </task>

<task type="auto">
  <name>Task 2: Schema — AuditEngagement extensions + AuditTeamMember model + RBAC updates</name>
  <files>prisma/schema.prisma, src/lib/permissions.ts</files>
  <action>
  **2a. Extend the existing AuditEngagement model — add these fields AFTER `completionDate DateTime?`:**

```prisma
  // Phase 1 extensions (R11: full audit engagement metadata)
  auditNumber       String?             // Unique audit reference e.g. "RBIA/2025-26/BR-001/V1"
  auditType         String?  @default("RBIA") // "RBIA", "CONCURRENT", "IS_EDP", "STATUTORY"
  visitNumber       Int?     @default(1)
  periodFrom        DateTime?
  periodTo          DateTime?
  actualStartDate   DateTime?
  actualEndDate     DateTime?
  overallRiskRating String?             // Computed after audit: "VERY_GOOD"..."POOR"

  // BH Certificate fields (R26)
  bhCertSignedById  String?   @db.Uuid
  bhCertSignedAt    DateTime?
  bhCertComments    String?   @db.Text
```

**2b. Add relation arrays to AuditEngagement (after `observations Observation[]`):**

```prisma
  teamMembers          AuditTeamMember[]
```

**2c. Add AuditTeamMember model (after AuditEngagement model):**

```prisma
// ─── Audit Team Member (Phase 1 — R10: team assignment join model) ─────────

model AuditTeamMember {
  id           String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId     String @db.Uuid
  tenant       Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  engagementId String @db.Uuid
  engagement   AuditEngagement @relation(fields: [engagementId], references: [id], onDelete: Cascade)

  userId       String @db.Uuid
  user         User   @relation(fields: [userId], references: [id])

  roleInEngagement String  // "LEAD_AUDITOR" or "FIELD_AUDITOR"
  assignedSections String[] // Array of section codes e.g., ["CASH", "ATM", "CLEARING"]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([engagementId, userId])
  @@index([tenantId])
  @@index([engagementId])
  @@index([userId])
}
```

**2d. Add relations to Tenant model (after `zones Zone[]`):**

```prisma
  auditTeamMembers         AuditTeamMember[]
```

**2e. Add relation to User model (after `generatedReports BoardReport[] @relation("ReportGeneratedBy")`):**

```prisma
  auditTeamMemberships AuditTeamMember[]
```

**2f. Update `src/lib/permissions.ts`:**

Add new permissions to the `Permission` type union:

```typescript
  // RAM & Audit Execution (Phase 1)
  | "ram:read"
  | "ram:create"
  | "ram:approve"
  | "audit_execution:read"
  | "audit_execution:manage_team"
  | "audit_execution:manage_sections"
  | "examination:respond"
  | "examination:read"
  | "bh_certificate:sign"
```

Add entries to `ROLE_PERMISSIONS` for the 3 new roles:

```typescript
  LEAD_AUDITOR: [
    "observation:create",
    "observation:read",
    "compliance:read",
    "audit_plan:read",
    "audit_execution:read",
    "audit_execution:manage_team",
    "audit_execution:manage_sections",
    "examination:respond",
    "examination:read",
    "ram:read",
    "dashboard:auditor",
  ],
  FIELD_AUDITOR: [
    "observation:create",
    "observation:read",
    "compliance:read",
    "audit_plan:read",
    "audit_execution:read",
    "examination:respond",
    "examination:read",
    "ram:read",
    "dashboard:auditor",
  ],
  BRANCH_HEAD: [
    "observation:read",
    "compliance:read",
    "examination:read",
    "bh_certificate:sign",
  ],
```

Also add `"ram:read"` and `"ram:create"` to AUDIT_MANAGER's permissions array.
Also add `"ram:read"`, `"ram:create"`, `"ram:approve"`, `"audit_execution:read"`, `"audit_execution:manage_team"`, `"audit_execution:manage_sections"`, `"examination:read"` to CAE's permissions array.

Update `getAssignableRoles()` to include the 3 new roles:

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
  ];
}
```

Update `getRoleDisplayName()` to include display names:

```typescript
  LEAD_AUDITOR: "Lead Auditor",
  FIELD_AUDITOR: "Field Auditor",
  BRANCH_HEAD: "Branch Head",
```

  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm prisma validate && pnpm exec tsc --noEmit --pretty 2>&1 | head -30
  ```
  Both prisma validate and typecheck must pass (or typecheck errors must be unrelated to our changes).
  </verify>
  <done>
  - AuditEngagement has 11 new fields (auditNumber through bhCertComments)
  - AuditTeamMember model exists with engagementId, userId, roleInEngagement, assignedSections
  - AuditTeamMember has @@unique([engagementId, userId])
  - Tenant has `auditTeamMembers` relation
  - User has `auditTeamMemberships` relation
  - Permission type includes 9 new Phase 1 permissions
  - LEAD_AUDITOR, FIELD_AUDITOR, BRANCH_HEAD have appropriate permissions in ROLE_PERMISSIONS
  - CAE and AUDIT_MANAGER have RAM permissions
  - `pnpm prisma validate` passes
  </done>
</task>

## Success Criteria

1. `pnpm prisma validate` passes with all schema additions
2. `pnpm exec tsc --noEmit` passes (or only pre-existing errors)
3. Role enum has exactly 10 values
4. Zone model has @@unique([tenantId, code]) and relation to Branch
5. Branch model has 8 new Phase 1 fields
6. AuditEngagement has 11 new fields including BH cert fields
7. AuditTeamMember join model has @@unique([engagementId, userId])
8. permissions.ts compiles with 9 new permissions and 3 new role mappings
