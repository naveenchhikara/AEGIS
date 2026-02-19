---
phase: 1
plan: 2
type: standard
wave: 2
depends_on: [1]
files_modified:
  - prisma/schema.prisma
  - src/data/seed/ram-parameters.json
  - prisma/seed.ts
autonomous: true
must_haves:
  truths:
    - "RamParameterConfig model stores 19 configurable parameters with code, name, weight, scoringCriteria JSONB, maxScore"
    - "RamAssessment model captures per-branch/year assessment with compositeScore, riskCategory, status workflow"
    - "RamAssessmentScore model links assessment to paramConfig with individual score + remarks"
    - "Seed data defines 19 RAM parameters: 10 business risk + 9 control risk"
    - "Seed script loads RAM parameters from JSON file"
  artifacts:
    - path: "prisma/schema.prisma"
      provides: "RamParameterConfig, RamAssessment, RamAssessmentScore models"
    - path: "src/data/seed/ram-parameters.json"
      provides: "19 RAM parameter definitions with weights and scoring criteria"
    - path: "prisma/seed.ts"
      provides: "Updated seed script that loads RAM parameters"
  key_links:
    - from: "RamAssessmentScore"
      to: "RamAssessment"
      via: "RamAssessmentScore.assessmentId → RamAssessment.id"
    - from: "RamAssessmentScore"
      to: "RamParameterConfig"
      via: "RamAssessmentScore.paramConfigId → RamParameterConfig.id"
    - from: "RamAssessment"
      to: "Branch"
      via: "RamAssessment.branchId → Branch.id"
---

## Objective

Add the three RAM (Risk Assessment Model) tables to the schema and create seed data for the 19 standard RAM parameters used in UCB branch risk assessment. This enables RAM-based audit planning where each branch is scored on business risk and control risk parameters to determine audit frequency.

## Context

@AEGIS/prisma/schema.prisma — schema after Plan 01 (modify)
@AEGIS/prisma/seed.ts — existing seed script (modify)
@AEGIS/.planning/REQUIREMENTS.md — R4, R5, R6, R28
@AEGIS/.planning/codebase/CONVENTIONS.md — coding patterns

## Tasks

<task type="auto">
  <name>Task 1: Schema — RamParameterConfig + RamAssessment + RamAssessmentScore</name>
  <files>prisma/schema.prisma</files>
  <action>
  **1a. Add new enum for RAM assessment status (in the enums section):**

```prisma
enum RamAssessmentStatus {
  DRAFT
  COMPUTED
  APPROVED
}
```

**1b. Add RamParameterConfig model (after AuditTeamMember):**

```prisma
// ─── RAM Parameter Config (Phase 1 — R4: master parameter definitions) ─────

model RamParameterConfig {
  id       String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId String @db.Uuid
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  code           String   // e.g., "BR-01", "CR-05"
  name           String   // e.g., "Deposit Growth Rate"
  category       String   // "BUSINESS_RISK" or "CONTROL_RISK"
  weight         Decimal  @db.Decimal(5, 4) // e.g., 0.0714 (1/14 for equal weight among 14 params)
  maxScore       Decimal  @db.Decimal(5, 2) @default(5) // Typically 1-5 scale
  scoringCriteria Json    // JSONB: { "ranges": [{ "min": 0, "max": 1, "score": 1, "label": "Poor" }, ...] }
  displayOrder   Int
  isActive       Boolean  @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  scores RamAssessmentScore[]

  @@unique([tenantId, code])
  @@index([tenantId])
}
```

**1c. Add RamAssessment model:**

```prisma
// ─── RAM Assessment (Phase 1 — R5: per-branch annual assessment) ───────────

model RamAssessment {
  id       String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId String @db.Uuid
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  branchId        String   @db.Uuid
  branch          Branch   @relation(fields: [branchId], references: [id])

  assessmentYear  String   // Indian FY e.g., "2025-26"
  compositeScore  Decimal? @db.Decimal(5, 2) // Computed weighted average
  riskCategory    String?  // "HIGH", "MEDIUM", "LOW"
  auditFrequency  Int?     // Derived: months between audits

  status          RamAssessmentStatus @default(DRAFT)

  computedById    String?   @db.Uuid
  computedAt      DateTime?
  approvedById    String?   @db.Uuid
  approvedAt      DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  scores RamAssessmentScore[]

  @@unique([tenantId, branchId, assessmentYear])
  @@index([tenantId])
  @@index([branchId])
}
```

**1d. Add RamAssessmentScore model:**

```prisma
// ─── RAM Assessment Score (Phase 1 — R6: individual parameter scores) ──────

model RamAssessmentScore {
  id             String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid

  assessmentId   String @db.Uuid
  assessment     RamAssessment @relation(fields: [assessmentId], references: [id], onDelete: Cascade)

  paramConfigId  String @db.Uuid
  paramConfig    RamParameterConfig @relation(fields: [paramConfigId], references: [id])

  score          Decimal @db.Decimal(5, 2)
  remarks        String? @db.Text

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([assessmentId, paramConfigId])
  @@index([assessmentId])
}
```

**1e. Add relation arrays to Tenant model (after `auditTeamMembers`):**

```prisma
  ramParameterConfigs      RamParameterConfig[]
  ramAssessments           RamAssessment[]
```

**1f. Add relation to Branch model (after `userAssignments`):**

```prisma
  ramAssessments   RamAssessment[]
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

- RamAssessmentStatus enum exists with DRAFT, COMPUTED, APPROVED
- RamParameterConfig model exists with code, name, category, weight, maxScore, scoringCriteria, displayOrder, isActive
- RamParameterConfig has @@unique([tenantId, code])
- RamAssessment model exists with branchId, assessmentYear, compositeScore, riskCategory, auditFrequency, status
- RamAssessment has @@unique([tenantId, branchId, assessmentYear])
- RamAssessmentScore model exists with assessmentId, paramConfigId, score, remarks
- RamAssessmentScore has @@unique([assessmentId, paramConfigId])
- Tenant and Branch have appropriate relation arrays
- `pnpm prisma validate` passes
  </done>
  </task>

<task type="auto">
  <name>Task 2: Seed data — 19 RAM parameters JSON + seed script update</name>
  <files>src/data/seed/ram-parameters.json, prisma/seed.ts</files>
  <action>
  **2a. Create `src/data/seed/ram-parameters.json` with all 19 parameters:**

```json
[
  {
    "code": "BR-01",
    "name": "Deposit Growth Rate",
    "category": "BUSINESS_RISK",
    "weight": 0.0556,
    "maxScore": 5,
    "displayOrder": 1,
    "scoringCriteria": {
      "description": "Year-on-year deposit growth percentage",
      "ranges": [
        {
          "min": null,
          "max": 0,
          "score": 5,
          "label": "Negative growth — highest risk"
        },
        { "min": 0, "max": 5, "score": 4, "label": "Low growth" },
        { "min": 5, "max": 10, "score": 3, "label": "Moderate growth" },
        { "min": 10, "max": 20, "score": 2, "label": "Good growth" },
        {
          "min": 20,
          "max": null,
          "score": 1,
          "label": "High growth — lowest risk"
        }
      ]
    }
  },
  {
    "code": "BR-02",
    "name": "Advances Growth Rate",
    "category": "BUSINESS_RISK",
    "weight": 0.0556,
    "maxScore": 5,
    "displayOrder": 2,
    "scoringCriteria": {
      "description": "Year-on-year advances growth percentage",
      "ranges": [
        { "min": null, "max": 0, "score": 5, "label": "Negative growth" },
        { "min": 0, "max": 5, "score": 4, "label": "Low growth" },
        { "min": 5, "max": 15, "score": 3, "label": "Moderate growth" },
        { "min": 15, "max": 25, "score": 2, "label": "Good growth" },
        { "min": 25, "max": null, "score": 1, "label": "High growth" }
      ]
    }
  },
  {
    "code": "BR-03",
    "name": "CRAR (Capital to Risk-Weighted Assets Ratio)",
    "category": "BUSINESS_RISK",
    "weight": 0.0556,
    "maxScore": 5,
    "displayOrder": 3,
    "scoringCriteria": {
      "description": "Capital adequacy ratio — RBI minimum 9% for UCBs",
      "ranges": [
        {
          "min": null,
          "max": 9,
          "score": 5,
          "label": "Below regulatory minimum"
        },
        { "min": 9, "max": 10, "score": 4, "label": "Marginal compliance" },
        { "min": 10, "max": 12, "score": 3, "label": "Adequate" },
        { "min": 12, "max": 15, "score": 2, "label": "Well capitalised" },
        { "min": 15, "max": null, "score": 1, "label": "Strongly capitalised" }
      ]
    }
  },
  {
    "code": "BR-04",
    "name": "Gross NPA to Gross Advances",
    "category": "BUSINESS_RISK",
    "weight": 0.0556,
    "maxScore": 5,
    "displayOrder": 4,
    "scoringCriteria": {
      "description": "Asset quality — lower is better",
      "ranges": [
        { "min": 10, "max": null, "score": 5, "label": "Critically high NPAs" },
        { "min": 7, "max": 10, "score": 4, "label": "High NPAs" },
        { "min": 5, "max": 7, "score": 3, "label": "Moderate NPAs" },
        { "min": 3, "max": 5, "score": 2, "label": "Acceptable" },
        { "min": null, "max": 3, "score": 1, "label": "Healthy" }
      ]
    }
  },
  {
    "code": "BR-05",
    "name": "Net NPA to Net Advances",
    "category": "BUSINESS_RISK",
    "weight": 0.0556,
    "maxScore": 5,
    "displayOrder": 5,
    "scoringCriteria": {
      "description": "Net asset quality after provisions",
      "ranges": [
        { "min": 5, "max": null, "score": 5, "label": "Critical" },
        { "min": 3, "max": 5, "score": 4, "label": "High" },
        { "min": 2, "max": 3, "score": 3, "label": "Moderate" },
        { "min": 1, "max": 2, "score": 2, "label": "Acceptable" },
        { "min": null, "max": 1, "score": 1, "label": "Healthy" }
      ]
    }
  },
  {
    "code": "BR-06",
    "name": "Provision Coverage Ratio",
    "category": "BUSINESS_RISK",
    "weight": 0.0556,
    "maxScore": 5,
    "displayOrder": 6,
    "scoringCriteria": {
      "description": "Provisions as % of gross NPAs — higher is better",
      "ranges": [
        {
          "min": null,
          "max": 40,
          "score": 5,
          "label": "Inadequate provisioning"
        },
        { "min": 40, "max": 50, "score": 4, "label": "Low coverage" },
        { "min": 50, "max": 60, "score": 3, "label": "Moderate coverage" },
        { "min": 60, "max": 70, "score": 2, "label": "Good coverage" },
        { "min": 70, "max": null, "score": 1, "label": "Strong coverage" }
      ]
    }
  },
  {
    "code": "BR-07",
    "name": "Return on Assets (ROA)",
    "category": "BUSINESS_RISK",
    "weight": 0.0556,
    "maxScore": 5,
    "displayOrder": 7,
    "scoringCriteria": {
      "description": "Profitability indicator — higher is better",
      "ranges": [
        { "min": null, "max": 0, "score": 5, "label": "Loss-making" },
        { "min": 0, "max": 0.25, "score": 4, "label": "Marginal profit" },
        { "min": 0.25, "max": 0.5, "score": 3, "label": "Moderate" },
        { "min": 0.5, "max": 1.0, "score": 2, "label": "Good" },
        { "min": 1.0, "max": null, "score": 1, "label": "Strong profitability" }
      ]
    }
  },
  {
    "code": "BR-08",
    "name": "Business per Employee",
    "category": "BUSINESS_RISK",
    "weight": 0.0556,
    "maxScore": 5,
    "displayOrder": 8,
    "scoringCriteria": {
      "description": "Total business (deposits + advances) per employee in lakhs",
      "ranges": [
        {
          "min": null,
          "max": 200,
          "score": 5,
          "label": "Very low productivity"
        },
        { "min": 200, "max": 400, "score": 4, "label": "Low productivity" },
        { "min": 400, "max": 600, "score": 3, "label": "Average" },
        { "min": 600, "max": 800, "score": 2, "label": "Good" },
        { "min": 800, "max": null, "score": 1, "label": "High productivity" }
      ]
    }
  },
  {
    "code": "BR-09",
    "name": "Cost to Income Ratio",
    "category": "BUSINESS_RISK",
    "weight": 0.0556,
    "maxScore": 5,
    "displayOrder": 9,
    "scoringCriteria": {
      "description": "Operating efficiency — lower is better",
      "ranges": [
        { "min": 70, "max": null, "score": 5, "label": "Very inefficient" },
        { "min": 60, "max": 70, "score": 4, "label": "Inefficient" },
        { "min": 50, "max": 60, "score": 3, "label": "Moderate" },
        { "min": 40, "max": 50, "score": 2, "label": "Efficient" },
        { "min": null, "max": 40, "score": 1, "label": "Highly efficient" }
      ]
    }
  },
  {
    "code": "BR-10",
    "name": "Priority Sector Lending Compliance",
    "category": "BUSINESS_RISK",
    "weight": 0.0556,
    "maxScore": 5,
    "displayOrder": 10,
    "scoringCriteria": {
      "description": "PSL as % of ANBC vs RBI target (40% for UCBs)",
      "ranges": [
        { "min": null, "max": 30, "score": 5, "label": "Severe shortfall" },
        { "min": 30, "max": 35, "score": 4, "label": "Significant shortfall" },
        { "min": 35, "max": 40, "score": 3, "label": "Minor shortfall" },
        { "min": 40, "max": 45, "score": 2, "label": "Meets target" },
        { "min": 45, "max": null, "score": 1, "label": "Exceeds target" }
      ]
    }
  },
  {
    "code": "CR-01",
    "name": "Previous Audit Rating",
    "category": "CONTROL_RISK",
    "weight": 0.0556,
    "maxScore": 5,
    "displayOrder": 11,
    "scoringCriteria": {
      "description": "Last RBIA audit rating for this branch",
      "ranges": [
        {
          "min": null,
          "max": null,
          "score": 5,
          "label": "Poor / No prior audit"
        },
        { "min": null, "max": null, "score": 4, "label": "Moderate" },
        { "min": null, "max": null, "score": 3, "label": "Satisfactory" },
        { "min": null, "max": null, "score": 2, "label": "Good" },
        { "min": null, "max": null, "score": 1, "label": "Very Good" }
      ],
      "note": "Qualitative parameter — auditor selects score directly based on prior rating"
    }
  },
  {
    "code": "CR-02",
    "name": "Compliance with RBI Inspection Findings",
    "category": "CONTROL_RISK",
    "weight": 0.0556,
    "maxScore": 5,
    "displayOrder": 12,
    "scoringCriteria": {
      "description": "Status of compliance with last RBI inspection observations",
      "ranges": [
        { "min": null, "max": null, "score": 5, "label": "<50% compliance" },
        { "min": null, "max": null, "score": 4, "label": "50-65% compliance" },
        { "min": null, "max": null, "score": 3, "label": "65-80% compliance" },
        { "min": null, "max": null, "score": 2, "label": "80-95% compliance" },
        { "min": null, "max": null, "score": 1, "label": ">95% compliance" }
      ],
      "note": "Qualitative parameter — auditor selects score"
    }
  },
  {
    "code": "CR-03",
    "name": "IT / Cyber Security Controls",
    "category": "CONTROL_RISK",
    "weight": 0.0556,
    "maxScore": 5,
    "displayOrder": 13,
    "scoringCriteria": {
      "description": "Adequacy of IS/IT controls at the branch",
      "ranges": [
        {
          "min": null,
          "max": null,
          "score": 5,
          "label": "Critical gaps in IS controls"
        },
        { "min": null, "max": null, "score": 4, "label": "Major gaps" },
        {
          "min": null,
          "max": null,
          "score": 3,
          "label": "Some gaps, being addressed"
        },
        { "min": null, "max": null, "score": 2, "label": "Adequate controls" },
        { "min": null, "max": null, "score": 1, "label": "Strong IS controls" }
      ],
      "note": "Qualitative parameter"
    }
  },
  {
    "code": "CR-04",
    "name": "KYC / AML Compliance",
    "category": "CONTROL_RISK",
    "weight": 0.0556,
    "maxScore": 5,
    "displayOrder": 14,
    "scoringCriteria": {
      "description": "Adherence to KYC/AML norms — deficiencies increase risk",
      "ranges": [
        {
          "min": null,
          "max": null,
          "score": 5,
          "label": "Serious KYC deficiencies"
        },
        {
          "min": null,
          "max": null,
          "score": 4,
          "label": "Multiple deficiencies"
        },
        { "min": null, "max": null, "score": 3, "label": "Minor lapses" },
        { "min": null, "max": null, "score": 2, "label": "Largely compliant" },
        { "min": null, "max": null, "score": 1, "label": "Fully compliant" }
      ],
      "note": "Qualitative parameter"
    }
  },
  {
    "code": "CR-05",
    "name": "HR and Staff Accountability",
    "category": "CONTROL_RISK",
    "weight": 0.0556,
    "maxScore": 5,
    "displayOrder": 15,
    "scoringCriteria": {
      "description": "Staff discipline, rotation, leave policy compliance",
      "ranges": [
        {
          "min": null,
          "max": null,
          "score": 5,
          "label": "Serious staff accountability issues"
        },
        { "min": null, "max": null, "score": 4, "label": "Multiple HR lapses" },
        { "min": null, "max": null, "score": 3, "label": "Minor lapses" },
        { "min": null, "max": null, "score": 2, "label": "Good compliance" },
        {
          "min": null,
          "max": null,
          "score": 1,
          "label": "Excellent HR controls"
        }
      ],
      "note": "Qualitative parameter"
    }
  },
  {
    "code": "CR-06",
    "name": "Treasury Operations Compliance",
    "category": "CONTROL_RISK",
    "weight": 0.0556,
    "maxScore": 5,
    "displayOrder": 16,
    "scoringCriteria": {
      "description": "Adherence to investment and treasury operation norms",
      "ranges": [
        { "min": null, "max": null, "score": 5, "label": "Major violations" },
        {
          "min": null,
          "max": null,
          "score": 4,
          "label": "Significant deviations"
        },
        { "min": null, "max": null, "score": 3, "label": "Minor deviations" },
        { "min": null, "max": null, "score": 2, "label": "Compliant" },
        {
          "min": null,
          "max": null,
          "score": 1,
          "label": "Fully compliant with strong controls"
        }
      ],
      "note": "Qualitative parameter"
    }
  },
  {
    "code": "CR-07",
    "name": "Customer Complaints Ratio",
    "category": "CONTROL_RISK",
    "weight": 0.0556,
    "maxScore": 5,
    "displayOrder": 17,
    "scoringCriteria": {
      "description": "Complaints per 1000 accounts — lower is better",
      "ranges": [
        { "min": 5, "max": null, "score": 5, "label": "Very high complaints" },
        { "min": 3, "max": 5, "score": 4, "label": "High complaints" },
        { "min": 2, "max": 3, "score": 3, "label": "Moderate" },
        { "min": 1, "max": 2, "score": 2, "label": "Low" },
        { "min": null, "max": 1, "score": 1, "label": "Very low complaints" }
      ]
    }
  },
  {
    "code": "CR-08",
    "name": "Housekeeping Standards",
    "category": "CONTROL_RISK",
    "weight": 0.0556,
    "maxScore": 5,
    "displayOrder": 18,
    "scoringCriteria": {
      "description": "Record maintenance, reconciliation, suspense account management",
      "ranges": [
        {
          "min": null,
          "max": null,
          "score": 5,
          "label": "Chronic housekeeping failures"
        },
        { "min": null, "max": null, "score": 4, "label": "Significant lapses" },
        { "min": null, "max": null, "score": 3, "label": "Some lapses" },
        { "min": null, "max": null, "score": 2, "label": "Good standards" },
        {
          "min": null,
          "max": null,
          "score": 1,
          "label": "Excellent housekeeping"
        }
      ],
      "note": "Qualitative parameter"
    }
  },
  {
    "code": "CR-09",
    "name": "Management Oversight and Governance",
    "category": "CONTROL_RISK",
    "weight": 0.0556,
    "maxScore": 5,
    "displayOrder": 19,
    "scoringCriteria": {
      "description": "Branch management quality, board oversight, governance practices",
      "ranges": [
        { "min": null, "max": null, "score": 5, "label": "Weak governance" },
        { "min": null, "max": null, "score": 4, "label": "Below average" },
        { "min": null, "max": null, "score": 3, "label": "Average" },
        { "min": null, "max": null, "score": 2, "label": "Good governance" },
        { "min": null, "max": null, "score": 1, "label": "Strong governance" }
      ],
      "note": "Qualitative parameter"
    }
  }
]
```

Weight rationale: 18 params × ~0.0556 = ~1.0 total weight (equal weighting). The bank can later adjust per-parameter weights. Weights across all 18 quantitative params sum to approximately 1.0 (19 × 0.0556 ≈ 1.0).

**2b. Update `prisma/seed.ts` to load RAM parameters:**

Add this import at the top (after existing imports):

```typescript
import ramParametersData from "../src/data/seed/ram-parameters.json";
```

Add a `seedRamParameters` function after the existing seed functions:

```typescript
async function seedRamParameters(tenantId: string) {
  console.log("  Seeding RAM parameters...");

  for (const param of ramParametersData) {
    await prisma.ramParameterConfig.upsert({
      where: {
        tenantId_code: { tenantId, code: param.code },
      },
      update: {
        name: param.name,
        category: param.category,
        weight: param.weight,
        maxScore: param.maxScore,
        scoringCriteria: param.scoringCriteria as any,
        displayOrder: param.displayOrder,
      },
      create: {
        tenantId,
        code: param.code,
        name: param.name,
        category: param.category,
        weight: param.weight,
        maxScore: param.maxScore,
        scoringCriteria: param.scoringCriteria as any,
        displayOrder: param.displayOrder,
        isActive: true,
      },
    });
  }

  console.log(`  ✓ ${ramParametersData.length} RAM parameters seeded`);
}
```

Call `seedRamParameters(tenantA.id)` and `seedRamParameters(tenantB.id)` in the main seed function, after branches are seeded.
</action>
<verify>

```bash
cd /root/.openclaw/workspace/AEGIS && pnpm prisma validate && node -e "const d = require('./src/data/seed/ram-parameters.json'); console.log('Count:', d.length); const cats = d.reduce((a,p) => { a[p.category] = (a[p.category]||0)+1; return a; }, {}); console.log('Categories:', cats);"
```

Must show: Count: 19, Categories: { BUSINESS_RISK: 10, CONTROL_RISK: 9 }
</verify>
<done>

- ram-parameters.json has exactly 19 entries: 10 BUSINESS_RISK (BR-01..BR-10) + 9 CONTROL_RISK (CR-01..CR-09)
- Each entry has code, name, category, weight, maxScore, displayOrder, scoringCriteria
- Weights sum to approximately 1.0 (19 × 0.0556 ≈ 1.056)
- seed.ts has seedRamParameters function using upsert
- `pnpm prisma validate` passes
  </done>
  </task>

## Success Criteria

1. `pnpm prisma validate` passes
2. 3 new models: RamParameterConfig, RamAssessment, RamAssessmentScore
3. RamAssessmentStatus enum exists
4. ram-parameters.json has exactly 19 entries (10 business + 9 control)
5. Each parameter has scoringCriteria JSONB with ranges array
6. seed.ts updated with seedRamParameters function
7. All unique constraints in place: [tenantId, code], [tenantId, branchId, assessmentYear], [assessmentId, paramConfigId]
