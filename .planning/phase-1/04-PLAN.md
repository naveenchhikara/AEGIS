---
phase: 1
plan: 4
type: standard
wave: 4
depends_on: [3]
files_modified:
  - prisma/schema.prisma
autonomous: true
must_haves:
  truths:
    - "CashCheck model captures denomination-level cash verification data per engagement"
    - "LoanReview model captures individual loan account review data per engagement"
    - "SmaNpaEntry model captures category-wise SMA/NPA summary per engagement"
    - "Evidence model is generalized: observationId is optional, new examinationResponseId and entityType/entityId fields added"
    - "After db:generate, Prisma client includes all new Phase 1 models"
  artifacts:
    - path: "prisma/schema.prisma"
      provides: "CashCheck, LoanReview, SmaNpaEntry models + Evidence generalization"
  key_links:
    - from: "CashCheck"
      to: "AuditEngagement"
      via: "CashCheck.engagementId → AuditEngagement.id"
    - from: "LoanReview"
      to: "AuditEngagement"
      via: "LoanReview.engagementId → AuditEngagement.id"
    - from: "SmaNpaEntry"
      to: "AuditEngagement"
      via: "SmaNpaEntry.engagementId → AuditEngagement.id"
    - from: "Evidence"
      to: "AuditExaminationResponse"
      via: "Evidence.examinationResponseId → AuditExaminationResponse.id (optional)"
---

## Objective

Add specialized audit data capture models (CashCheck for cash verification, LoanReview for individual loan reviews, SmaNpaEntry for SMA/NPA summaries) and generalize the existing Evidence model so evidence files can be attached to examination responses in addition to observations. After this plan, the complete Phase 1 schema is in place and ready for `db:push` + `db:generate`.

## Context

@AEGIS/prisma/schema.prisma — schema after Plan 03 (modify)
@AEGIS/.planning/REQUIREMENTS.md — R19, R20, R21, R27

## Tasks

<task type="auto">
  <name>Task 1: Schema — CashCheck + LoanReview + SmaNpaEntry models</name>
  <files>prisma/schema.prisma</files>
  <action>
  **1a. Add CashCheck model (after AuditSectionInstance):**

```prisma
// ─── Cash Check (Phase 1 — R19: cash verification per engagement) ──────────

model CashCheck {
  id       String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId String @db.Uuid
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  engagementId String @db.Uuid
  engagement   AuditEngagement @relation(fields: [engagementId], references: [id], onDelete: Cascade)

  cashInHand      Decimal   @db.Decimal(15, 2)
  bookBalance     Decimal   @db.Decimal(15, 2)
  difference      Decimal   @db.Decimal(15, 2)
  retentionLimit  Decimal?  @db.Decimal(15, 2)

  // ATM balances: { "ATM-01": 250000, "ATM-02": 180000 }
  atmBalances      Json?

  // Denomination breakdown: { "2000": 10, "500": 50, "200": 20, "100": 100, ... }
  denominationData Json?

  verifiedById    String?   @db.Uuid
  verifiedAt      DateTime?
  remarks         String?   @db.Text

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([engagementId])
  @@index([tenantId])
}
```

**1b. Add LoanReview model:**

```prisma
// ─── Loan Review (Phase 1 — R20: individual loan account review) ───────────

model LoanReview {
  id       String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId String @db.Uuid
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  engagementId String @db.Uuid
  engagement   AuditEngagement @relation(fields: [engagementId], references: [id], onDelete: Cascade)

  accountNo         String
  borrowerName      String
  productType       String   // e.g., "Term Loan", "CC", "OD", "Gold Loan"
  sanctionAmount    Decimal  @db.Decimal(15, 2)
  outstandingAmount Decimal  @db.Decimal(15, 2)
  assetClass        String   // "STANDARD", "SMA0", "SMA1", "SMA2", "NPA_SUB", "NPA_DOUBTFUL", "NPA_LOSS"
  dpd               Int      @default(0) // Days past due
  auditObservation  String?  @db.Text

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId])
  @@index([engagementId])
  @@index([engagementId, assetClass])
}
```

**1c. Add SmaNpaEntry model:**

```prisma
// ─── SMA/NPA Entry (Phase 1 — R21: category-wise summary per audit) ────────

model SmaNpaEntry {
  id       String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId String @db.Uuid
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  engagementId String @db.Uuid
  engagement   AuditEngagement @relation(fields: [engagementId], references: [id], onDelete: Cascade)

  category     String   // "SMA0", "SMA1", "SMA2", "NPA_SUB_STANDARD", "NPA_DOUBTFUL", "NPA_LOSS"
  accountCount Int
  totalAmount  Decimal  @db.Decimal(15, 2)
  remarks      String?  @db.Text

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([engagementId, category])
  @@index([tenantId])
}
```

**1d. Add relation arrays to AuditEngagement (after `sectionInstances`):**

```prisma
  cashChecks           CashCheck[]
  loanReviews          LoanReview[]
  smaNpaEntries        SmaNpaEntry[]
```

**1e. Add relation arrays to Tenant model (after `auditSectionInstances`):**

```prisma
  cashChecks               CashCheck[]
  loanReviews              LoanReview[]
  smaNpaEntries            SmaNpaEntry[]
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

- CashCheck model with cashInHand, bookBalance, difference, retentionLimit, atmBalances JSONB, denominationData JSONB
- CashCheck has @@unique([engagementId]) — one cash check per engagement
- LoanReview model with accountNo, borrowerName, productType, sanctionAmount, outstandingAmount, assetClass, dpd
- SmaNpaEntry model with category, accountCount, totalAmount
- SmaNpaEntry has @@unique([engagementId, category])
- All 3 models linked to AuditEngagement and Tenant
- `pnpm prisma validate` passes
  </done>
  </task>

<task type="auto">
  <name>Task 2: Evidence model generalization + db:generate</name>
  <files>prisma/schema.prisma</files>
  <action>
  **2a. Modify the existing Evidence model to generalize it (R27):**

The current Evidence model has `observationId String @db.Uuid` as REQUIRED. We need to:

1. Make `observationId` optional (change from `String @db.Uuid` to `String? @db.Uuid`)
2. Make the `observation` relation optional (change to `Observation?`)
3. Add polymorphic reference fields for examination responses

Find in Evidence model:

```prisma
  observationId String @db.Uuid
  observation   Observation @relation(fields: [observationId], references: [id], onDelete: Cascade)
```

Replace with:

```prisma
  // Polymorphic evidence attachment (R27: generalized evidence)
  // Exactly one of observationId or examinationResponseId should be set
  observationId           String?                    @db.Uuid
  observation             Observation?               @relation(fields: [observationId], references: [id], onDelete: Cascade)

  examinationResponseId   String?                    @db.Uuid
  examinationResponse     AuditExaminationResponse?  @relation(fields: [examinationResponseId], references: [id], onDelete: Cascade)
```

**2b. Add evidence relation to AuditExaminationResponse model (after `linkedObservation` relation):**

```prisma
  evidence          Evidence[]
```

**2c. Update the Evidence @@index section — add index for examinationResponseId:**

After the existing `@@index([observationId])` line, add:

```prisma
  @@index([examinationResponseId])
```

**2d. Run Prisma generate to create the complete Phase 1 client:**

After all schema changes are saved, run:

```bash
cd /root/.openclaw/workspace/AEGIS && pnpm prisma generate
```

This generates the Prisma client with all Phase 1 models.

**NOTE on existing code:** Making observationId optional may cause TypeScript errors in existing code that assumes `evidence.observationId` is always a string. The executor should check:

```bash
grep -rn "evidence\.observationId" src/ --include="*.ts" --include="*.tsx" | head -20
```

If any existing code references `evidence.observationId` as non-nullable, add a null check or filter. This is expected and acceptable — the generalization is necessary for Phase 1.
</action>
<verify>

```bash
cd /root/.openclaw/workspace/AEGIS && pnpm prisma validate && pnpm prisma generate 2>&1 | tail -5
```

Both must succeed. The generate command should output "Generated Prisma Client" or similar success message.

Then verify the complete schema model count:

```bash
grep -c "^model " prisma/schema.prisma
```

Should show 38 or more models (original 27 + Zone + AuditTeamMember + RamParameterConfig + RamAssessment + RamAssessmentScore + ExaminationArea + ExaminationItem + AuditExaminationResponse + AuditSectionInstance + CashCheck + LoanReview + SmaNpaEntry = 39 total).
</verify>
<done>

- Evidence.observationId is now optional (String?)
- Evidence has new examinationResponseId field (String?, optional)
- Evidence has @@index([examinationResponseId])
- AuditExaminationResponse has `evidence Evidence[]` relation
- `pnpm prisma validate` passes
- `pnpm prisma generate` succeeds — client includes all 39 models
- Total Phase 1 new models: 12 (Zone, AuditTeamMember, RamParameterConfig, RamAssessment, RamAssessmentScore, ExaminationArea, ExaminationItem, AuditExaminationResponse, AuditSectionInstance, CashCheck, LoanReview, SmaNpaEntry)
- Total Phase 1 new enums: 3 (RamAssessmentStatus, ExaminationStatus, AuditSectionStatus)
  </done>
  </task>

## Success Criteria

1. `pnpm prisma validate` passes
2. `pnpm prisma generate` succeeds
3. 3 new specialized models: CashCheck, LoanReview, SmaNpaEntry
4. Evidence model generalized: both observationId and examinationResponseId are optional
5. Total schema now has 39 models (27 original + 12 new)
6. All unique constraints: CashCheck[engagementId], SmaNpaEntry[engagementId,category]
7. CashCheck has JSONB fields for denominationData and atmBalances
8. LoanReview has assetClass field with proper index on [engagementId, assetClass]
