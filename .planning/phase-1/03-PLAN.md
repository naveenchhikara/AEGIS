---
phase: 1
plan: 3
type: standard
wave: 3
depends_on: [2]
files_modified:
  - prisma/schema.prisma
  - prisma/seed.ts
autonomous: true
must_haves:
  truths:
    - "ExaminationArea model stores 25 functional areas with code, name, riskWeight, displayOrder"
    - "ExaminationItem model stores 207 value statement items linked to areas"
    - "AuditExaminationResponse tracks per-item status (compliant/non-compliant/partial/na/pending) per engagement"
    - "AuditSectionInstance represents per-engagement Excel tab instances with status and sectionData JSONB"
    - "Seed script loads 25 areas from examination-areas.json and 207 items from examination-items.json"
  artifacts:
    - path: "prisma/schema.prisma"
      provides: "ExaminationArea, ExaminationItem, AuditExaminationResponse, AuditSectionInstance models + ExaminationStatus enum"
    - path: "prisma/seed.ts"
      provides: "seedExaminationData function loading from JSON seed files"
  key_links:
    - from: "ExaminationItem"
      to: "ExaminationArea"
      via: "ExaminationItem.areaId → ExaminationArea.id"
    - from: "AuditExaminationResponse"
      to: "ExaminationItem"
      via: "AuditExaminationResponse.itemId → ExaminationItem.id"
    - from: "AuditExaminationResponse"
      to: "AuditEngagement"
      via: "AuditExaminationResponse.engagementId → AuditEngagement.id"
    - from: "AuditSectionInstance"
      to: "AuditEngagement"
      via: "AuditSectionInstance.engagementId → AuditEngagement.id"
---

## Objective

Add the examination domain models (ExaminationArea, ExaminationItem, AuditExaminationResponse, AuditSectionInstance) and seed the 25 functional areas with their 207 examination items from existing JSON seed data. These models form the core of the section-based audit execution workflow where auditors examine value statements and record compliance status.

## Context

@AEGIS/prisma/schema.prisma — schema after Plan 02 (modify)
@AEGIS/prisma/seed.ts — seed script after Plan 02 (modify)
@AEGIS/src/data/seed/examination-areas.json — 25 areas (read, used by seed)
@AEGIS/src/data/seed/examination-items.json — 207 items (read, used by seed)
@AEGIS/.planning/REQUIREMENTS.md — R14, R15, R16, R18, R28

## Tasks

<task type="auto">
  <name>Task 1: Schema — ExaminationArea + ExaminationItem + AuditExaminationResponse + AuditSectionInstance</name>
  <files>prisma/schema.prisma</files>
  <action>
  **1a. Add ExaminationStatus enum (in the enums section, after RamAssessmentStatus):**

  ```prisma
  enum ExaminationStatus {
    PENDING
    COMPLIANT
    NON_COMPLIANT
    PARTIAL
    NOT_APPLICABLE
  }
  ```

  **1b. Add AuditSectionStatus enum:**

  ```prisma
  enum AuditSectionStatus {
    NOT_STARTED
    IN_PROGRESS
    COMPLETED
    REVIEWED
  }
  ```

  **1c. Add ExaminationArea model (after RamAssessmentScore):**

  ```prisma
  // ─── Examination Area (Phase 1 — R14: 25 functional audit areas) ───────────

  model ExaminationArea {
    id       String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
    tenantId String @db.Uuid
    tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

    code         String   // e.g., "AREA-01"
    name         String   // e.g., "Cash"
    description  String?  @db.Text
    riskWeight   Decimal  @db.Decimal(5, 2) @default(1.0)
    displayOrder Int
    isActive     Boolean  @default(true)

    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    // Relations
    items ExaminationItem[]

    @@unique([tenantId, code])
    @@index([tenantId])
  }
  ```

  **1d. Add ExaminationItem model:**

  ```prisma
  // ─── Examination Item (Phase 1 — R15: 207 value statement items) ───────────

  model ExaminationItem {
    id       String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
    tenantId String @db.Uuid
    tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

    areaId        String @db.Uuid
    area          ExaminationArea @relation(fields: [areaId], references: [id], onDelete: Cascade)

    itemNumber    String   // e.g., "1.1.1", "5.3.2"
    particulars   String   @db.Text // The examination statement/question
    riskCategory  String?  // e.g., "Operational Risk", "Credit Risk"
    regulatoryRef String?  // RBI circular reference if applicable
    displayOrder  Int
    isActive      Boolean  @default(true)

    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    // Relations
    responses AuditExaminationResponse[]

    @@unique([tenantId, areaId, itemNumber])
    @@index([tenantId])
    @@index([areaId])
  }
  ```

  **1e. Add AuditExaminationResponse model:**

  ```prisma
  // ─── Audit Examination Response (Phase 1 — R16: per-item audit response) ───

  model AuditExaminationResponse {
    id       String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
    tenantId String @db.Uuid
    tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

    engagementId  String @db.Uuid
    engagement    AuditEngagement @relation(fields: [engagementId], references: [id], onDelete: Cascade)

    itemId        String @db.Uuid
    item          ExaminationItem @relation(fields: [itemId], references: [id])

    status        ExaminationStatus @default(PENDING)
    observation   String?  @db.Text  // Auditor's observation text
    riskRating    String?            // Severity: "LOW", "MEDIUM", "HIGH", "CRITICAL"

    respondedById String?  @db.Uuid
    respondedAt   DateTime?

    // Auto-created observation reference (R17)
    observationId       String?      @db.Uuid
    linkedObservation   Observation? @relation(fields: [observationId], references: [id])

    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    @@unique([engagementId, itemId])
    @@index([tenantId])
    @@index([engagementId])
    @@index([observationId])
  }
  ```

  **1f. Add AuditSectionInstance model:**

  ```prisma
  // ─── Audit Section Instance (Phase 1 — R18: per-engagement section tracking) ─

  model AuditSectionInstance {
    id       String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
    tenantId String @db.Uuid
    tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

    engagementId String @db.Uuid
    engagement   AuditEngagement @relation(fields: [engagementId], references: [id], onDelete: Cascade)

    sectionCode  String  // Matches ExaminationArea.code e.g., "AREA-01"
    sectionName  String  // Denormalized for display e.g., "Cash"
    status       AuditSectionStatus @default(NOT_STARTED)

    sectionData  Json?   // Flexible JSONB for section-specific structured data

    assignedToId String?  @db.Uuid
    completedAt  DateTime?
    reviewedAt   DateTime?

    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    @@unique([engagementId, sectionCode])
    @@index([tenantId])
    @@index([engagementId])
  }
  ```

  **1g. Add relation arrays to existing models:**

  Add to **Tenant** model (after `ramAssessments`):
  ```prisma
    examinationAreas           ExaminationArea[]
    examinationItems           ExaminationItem[]
    auditExaminationResponses  AuditExaminationResponse[]
    auditSectionInstances      AuditSectionInstance[]
  ```

  Add to **AuditEngagement** model (after `teamMembers`):
  ```prisma
    examinationResponses AuditExaminationResponse[]
    sectionInstances     AuditSectionInstance[]
  ```

  Add to **Observation** model — add a new reverse relation for examination responses.
  After `rbiCirculars ObservationRbiCircular[]` add:
  ```prisma
    examinationResponses AuditExaminationResponse[]
  ```

  **IMPORTANT:** Do NOT remove or change any existing fields. Only ADD new content.
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm prisma validate
  ```
  Must exit 0.
  </verify>
  <done>
  - ExaminationStatus enum: PENDING, COMPLIANT, NON_COMPLIANT, PARTIAL, NOT_APPLICABLE
  - AuditSectionStatus enum: NOT_STARTED, IN_PROGRESS, COMPLETED, REVIEWED
  - ExaminationArea model with @@unique([tenantId, code])
  - ExaminationItem model with @@unique([tenantId, areaId, itemNumber])
  - AuditExaminationResponse model with @@unique([engagementId, itemId]), observationId for R17 linking
  - AuditSectionInstance model with @@unique([engagementId, sectionCode])
  - All relation arrays added to Tenant, AuditEngagement, Observation
  - `pnpm prisma validate` passes
  </done>
</task>

<task type="auto">
  <name>Task 2: Seed script — load 25 examination areas + 207 items from JSON</name>
  <files>prisma/seed.ts</files>
  <action>
  **2a. Add imports at the top of seed.ts (after existing imports):**

  ```typescript
  import examinationAreasData from "../src/data/seed/examination-areas.json";
  import examinationItemsData from "../src/data/seed/examination-items.json";
  ```

  **2b. Add `seedExaminationData` function:**

  ```typescript
  async function seedExaminationData(tenantId: string) {
    console.log("  Seeding examination areas and items...");

    // Build area code→id map for linking items
    const areaIdMap = new Map<string, string>();

    // Seed areas
    for (const area of examinationAreasData) {
      const record = await prisma.examinationArea.upsert({
        where: {
          tenantId_code: { tenantId, code: area.code },
        },
        update: {
          name: area.name,
          description: area.description,
          riskWeight: area.riskWeight,
          displayOrder: area.displayOrder,
        },
        create: {
          tenantId,
          code: area.code,
          name: area.name,
          description: area.description,
          riskWeight: area.riskWeight,
          displayOrder: area.displayOrder,
          isActive: true,
        },
      });
      areaIdMap.set(area.code, record.id);
    }
    console.log(`  ✓ ${examinationAreasData.length} examination areas seeded`);

    // Seed items — map areaCode from items to ExaminationArea.code
    // Items use numeric areaCode (e.g., "1"), areas use "AREA-01" format
    // Build numeric→code map: "1" → "AREA-01"
    const numericToAreaCode = new Map<string, string>();
    examinationAreasData.forEach((area) => {
      // Extract number from "AREA-01" → "1", "AREA-12" → "12"
      const num = String(parseInt(area.code.replace("AREA-", ""), 10));
      numericToAreaCode.set(num, area.code);
    });

    let itemCount = 0;
    for (const item of examinationItemsData) {
      const areaCode = numericToAreaCode.get(item.areaCode);
      if (!areaCode) {
        console.warn(`  ⚠ Skipping item ${item.itemNumber}: unknown areaCode ${item.areaCode}`);
        continue;
      }
      const areaId = areaIdMap.get(areaCode);
      if (!areaId) {
        console.warn(`  ⚠ Skipping item ${item.itemNumber}: no area ID for ${areaCode}`);
        continue;
      }

      await prisma.examinationItem.upsert({
        where: {
          tenantId_areaId_itemNumber: {
            tenantId,
            areaId,
            itemNumber: item.itemNumber,
          },
        },
        update: {
          particulars: item.particulars,
          riskCategory: item.riskCategory,
          regulatoryRef: item.regulatoryReference,
          displayOrder: item.displayOrder,
        },
        create: {
          tenantId,
          areaId,
          itemNumber: item.itemNumber,
          particulars: item.particulars,
          riskCategory: item.riskCategory,
          regulatoryRef: item.regulatoryReference,
          displayOrder: item.displayOrder,
          isActive: true,
        },
      });
      itemCount++;
    }
    console.log(`  ✓ ${itemCount} examination items seeded`);
  }
  ```

  **2c. Call `seedExaminationData(tenantA.id)` and `seedExaminationData(tenantB.id)` in the main seed function, after `seedRamParameters` calls.**

  The function safely handles the areaCode mapping: examination-items.json uses numeric areaCode ("1", "2"...) while examination-areas.json uses "AREA-01", "AREA-02" format.
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm prisma validate && node -e "
    const areas = require('./src/data/seed/examination-areas.json');
    const items = require('./src/data/seed/examination-items.json');
    console.log('Areas:', areas.length);
    console.log('Items:', items.length);
    // Verify all item areaCodes map to an area
    const areaNums = new Set(areas.map(a => String(parseInt(a.code.replace('AREA-', ''), 10))));
    const unmapped = items.filter(i => !areaNums.has(i.areaCode));
    console.log('Unmapped items:', unmapped.length);
  "
  ```
  Must show: Areas: 25, Items: 207, Unmapped items: 0
  </verify>
  <done>
  - seedExaminationData function exists in seed.ts
  - Loads from examination-areas.json (25 areas) and examination-items.json (207 items)
  - Uses upsert for idempotent seeding
  - Correctly maps numeric areaCode to AREA-NN format
  - Called for both tenant A and tenant B
  - Verification shows 25 areas, 207 items, 0 unmapped
  </done>
</task>

## Success Criteria

1. `pnpm prisma validate` passes
2. 4 new models: ExaminationArea, ExaminationItem, AuditExaminationResponse, AuditSectionInstance
3. 2 new enums: ExaminationStatus, AuditSectionStatus
4. Seed script correctly maps 207 items to 25 areas
5. AuditExaminationResponse has observationId field for R17 auto-linking
6. AuditSectionInstance has sectionData JSONB for flexible section data
7. All unique constraints and indexes in place
