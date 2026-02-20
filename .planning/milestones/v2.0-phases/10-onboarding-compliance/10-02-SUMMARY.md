---
phase: 10-onboarding-compliance
plan: 02
subsystem: onboarding-compliance
tags: [rbi, master-directions, compliance, seed-data, templates]

requires:
  - phase: 10
    plan: 01
    why: Prisma schema with RbiMasterDirection and RbiChecklistItem models

provides:
  - 10 RBI Master Direction definitions (global templates)
  - 103 checklist items with tier applicability matrix
  - Idempotent database seed script
  - TypeScript barrel export for type-safe access

affects:
  - phase: 10
    plan: 05
    impact: Step 3 of onboarding wizard uses this data to auto-select applicable checklist items

tech-stack:
  added: []
  patterns:
    - Global template data (non-tenant-scoped)
    - Tier applicability arrays with enhancements
    - Idempotent upsert seeding pattern

key-files:
  created:
    - src/data/rbi-master-directions/master-directions.json
    - src/data/rbi-master-directions/checklist-items.json
    - src/data/rbi-master-directions/index.ts
    - prisma/seed-master-directions.ts
  modified:
    - package.json

decisions:
  - id: D10-02-01
    choice: Store Master Directions as JSON data files, not hardcoded in seed script
    why: Allows business users to review/update via PR without touching code logic
    alternatives:
      - Hardcode in TypeScript seed script
      - Generate from RBI PDFs programmatically
    tradeoff: Requires manual maintenance but provides transparency and version control

  - id: D10-02-02
    choice: tierEnhancements as JSON object, not separate columns per tier
    why: Flexible for varying enhancement requirements per item without schema changes
    alternatives:
      - tier3Enhancement, tier4Enhancement columns
      - Separate EnhancementRequirement table
    tradeoff: Less type-safe but more flexible for RBI guideline changes

  - id: D10-02-03
    choice: Separate seed script (not part of main seed.ts)
    why: Master Directions seed once during deployment, tenants seed per-instance
    alternatives:
      - Include in main seed.ts
      - Run as migration script
    tradeoff: Requires explicit invocation but clearer intent and idempotency

metrics:
  duration: 3min
  completed: 2026-02-09
---

# Phase 10 Plan 02: RBI Master Directions Seed Data Summary

**One-liner:** 10 RBI Master Direction templates with 103 tier-aware checklist items for automated onboarding compliance setup

## Objective Achieved

Created global RBI Master Direction seed data comprising 10 Master Directions and 103 checklist items with tier applicability matrix. These templates power the onboarding Step 3 where banks select their UCB tier and the system auto-selects applicable compliance requirements.

**Outcome:** Banks can now onboard with pre-built RBI compliance checklists tailored to their tier (TIER_1 through TIER_4), with enhanced requirements automatically surfaced for Tier 3+ institutions.

## What Was Built

### 1. Master Direction Definitions (10)

**File:** `src/data/rbi-master-directions/master-directions.json`

10 Master Directions covering all major RBI compliance domains:

| shortId   | Category               | Items   |
| --------- | ---------------------- | ------- |
| MD-CAP    | Capital                | 12      |
| MD-IRAC   | Credit Risk            | 15      |
| MD-KYC    | Customer Due Diligence | 10      |
| MD-PSL    | Lending                | 8       |
| MD-ADV    | Credit Risk            | 12      |
| MD-BOD    | Governance             | 10      |
| MD-FRM    | Risk Management        | 8       |
| MD-CSF    | IT & Cyber Security    | 12      |
| MD-IR     | Treasury               | 6       |
| MD-INV    | Treasury               | 10      |
| **TOTAL** |                        | **103** |

Each Master Direction includes:

- `shortId`: Unique identifier (e.g., "MD-CAP")
- `title`: Official RBI Master Direction name
- `category`: Business domain classification
- `rbiRef`: RBI circular reference number
- `description`: Detailed explanation of scope

### 2. Checklist Items (103)

**File:** `src/data/rbi-master-directions/checklist-items.json`

Each checklist item includes:

- **itemCode**: Unique code in format `MD-XXX-NNN` (e.g., "MD-CAP-001")
- **masterDirectionId**: Links to parent Master Direction
- **title**: Short compliance requirement name
- **description**: Detailed requirement explanation
- **category**: Business domain (Capital, Credit Risk, Governance, etc.)
- **tierApplicability**: Array of applicable UCB tiers (TIER_1, TIER_2, TIER_3, TIER_4)
- **tierEnhancements**: JSON object with tier-specific enhanced requirements
- **frequency**: Compliance check frequency (Continuous, Quarterly, Annual)
- **evidenceRequired**: Array of evidence types needed
- **priority**: Risk priority (critical, high, medium, low)
- **rbiCircularRef**: RBI circular reference number

**Example tier enhancement:**

```json
{
  "itemCode": "MD-CAP-001",
  "title": "Maintain CRAR >= 12%",
  "tierApplicability": ["TIER_1", "TIER_2", "TIER_3", "TIER_4"],
  "tierEnhancements": {
    "TIER_3": "Plus Capital Conservation Buffer of 2.5%",
    "TIER_4": "Plus CCB of 2.5% and Pillar 3 disclosures"
  }
}
```

**Tier distribution:**

- All 103 items apply to at least one tier
- 95+ items apply to all tiers (TIER_1 through TIER_4)
- ~30 items have enhanced requirements for Tier 3+
- Tier 4 (scheduled/systemically important UCBs) has strictest requirements

### 3. TypeScript Barrel Export

**File:** `src/data/rbi-master-directions/index.ts`

Provides type-safe access to the data:

```typescript
export interface MasterDirection { ... }
export interface ChecklistItem { ... }

export const masterDirections: MasterDirection[];
export const checklistItems: ChecklistItem[];

// Helper functions
export function getItemsByDirection(shortId: string): ChecklistItem[];
export function getItemsByTier(tier: string): ChecklistItem[];
export function getItemsByDirectionAndTier(shortId: string, tier: string): ChecklistItem[];
export function getDirectionSummary(): {...}[];
```

**Benefits:**

- Full TypeScript autocomplete and type checking
- Helper functions for common queries
- Compile-time validation of data structure

### 4. Database Seed Script

**File:** `prisma/seed-master-directions.ts`

Idempotent seed script that:

1. Reads JSON data files
2. Upserts 10 Master Directions by `shortId` (no duplicates)
3. Upserts 103 checklist items by `itemCode` (no duplicates)
4. Maps foreign key relationships (masterDirectionId)
5. Logs summary: "Seeded N Master Directions with M checklist items"

**Idempotency guarantee:**

- Uses `prisma.rbiMasterDirection.upsert({ where: { shortId } })`
- Uses `prisma.rbiChecklistItem.upsert({ where: { itemCode } })`
- Safe to re-run without duplicates

**Usage:**

```bash
pnpm seed:master-directions
```

Added to `package.json` scripts for standalone execution.

## Task Commits

| Task | Description                              | Commit  | Files                                                                                                   |
| ---- | ---------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------- |
| 1    | Master Direction and checklist item data | afa2502 | master-directions.json (10 items), checklist-items.json (103 items), index.ts                           |
| 2    | Database seed script + npm script        | 8c28367 | seed-master-directions.ts (idempotent upsert logic), package.json (added seed:master-directions script) |

**Note:** Task 1 files were created and committed in an earlier bulk commit (afa2502). Task 2 added the missing npm script to package.json for standalone seed execution.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added missing npm script**

- **Found during:** Task 2 verification
- **Issue:** Seed script existed (`prisma/seed-master-directions.ts`) but no npm script to run it
- **Fix:** Added `"seed:master-directions": "tsx prisma/seed-master-directions.ts"` to package.json scripts
- **Files modified:** package.json
- **Commit:** 8c28367
- **Why needed:** Plan required script in package.json; without it, users couldn't run seed standalone

No other deviations — plan executed exactly as written.

## Verification Results

All verification criteria met:

✅ **1. `pnpm build` succeeds** - Completed in 13.6s with no errors
✅ **2. 10 Master Directions with correct shortIds** - MD-CAP through MD-INV
✅ **3. 103 checklist items with proper tier applicability** - All items have tierApplicability arrays
✅ **4. Each item has itemCode, priority, frequency, evidenceRequired** - Verified in JSON structure
✅ **5. Tier enhancements specified for Tier 3+ items** - ~30 items have tierEnhancements object
✅ **6. Seed script is idempotent** - Uses upsert by unique key (shortId, itemCode)
✅ **7. Barrel export provides type-safe access** - index.ts compiles with full TypeScript types

**File verification:**

- master-directions.json: 3.5KB, 72 lines, 10 Master Directions
- checklist-items.json: 65KB, 1822 lines, 103 checklist items
- index.ts: 2.5KB, 74 lines, TypeScript interfaces + helpers
- seed-master-directions.ts: 109 lines, idempotent upsert logic

**Item distribution by Master Direction:**

- MD-CAP: 12 items (Capital Adequacy)
- MD-IRAC: 15 items (Income Recognition, Asset Classification)
- MD-KYC: 10 items (Know Your Customer)
- MD-PSL: 8 items (Priority Sector Lending)
- MD-ADV: 12 items (Management of Advances)
- MD-BOD: 10 items (Board of Directors)
- MD-FRM: 8 items (Fraud Risk Management)
- MD-CSF: 12 items (Cyber Security Framework)
- MD-IR: 6 items (Interest Rate)
- MD-INV: 10 items (Investment Portfolio)

## Next Phase Readiness

**Ready for Phase 10 Plan 05** (Onboarding Steps 1-3 UI):

- Step 3 "RBI Master Directions" can now:
  - Display 10 Master Directions grouped by category
  - Filter 103 checklist items by selected UCB tier
  - Show tier-specific enhancements for Tier 3+
  - Pre-select all applicable items based on tier

**Database seeding:**

- Run `pnpm seed:master-directions` after migrations
- Populates global (non-tenant) template tables
- Each tenant will reference these templates during onboarding

**Blockers:** None

**Concerns:** None — data derived from existing compliance-requirements.json and expanded per RBI guidelines

## Integration Points

**Onboarding Wizard (Phase 10-05):**

```typescript
import {
  getItemsByTier,
  getDirectionSummary,
} from "@/data/rbi-master-directions";

// Step 3: Display Master Directions by category
const summary = getDirectionSummary();

// Filter checklist items by selected tier
const items = getItemsByTier(selectedTier); // e.g., "TIER_3"

// Show tier-specific enhancements
items.forEach((item) => {
  const enhancement = item.tierEnhancements?.[selectedTier];
  if (enhancement) {
    // Display enhanced requirement
  }
});
```

**Database seed (deployment):**

```bash
# After migrations
pnpm db:migrate
pnpm seed:master-directions

# Populates RbiMasterDirection and RbiChecklistItem tables
# Safe to re-run (idempotent)
```

**Future extensibility:**

- Add new Master Directions: Append to master-directions.json
- Add new checklist items: Append to checklist-items.json with unique itemCode
- Update tier requirements: Modify tierApplicability or tierEnhancements
- Re-run seed script: Upserts handle updates without duplicates

## Self-Check: PASSED

**Created files verified:**
✅ src/data/rbi-master-directions/master-directions.json (exists, 10 items)
✅ src/data/rbi-master-directions/checklist-items.json (exists, 103 items)
✅ src/data/rbi-master-directions/index.ts (exists, compiles)
✅ prisma/seed-master-directions.ts (exists, 109 lines)

**Modified files verified:**
✅ package.json (seed:master-directions script present)

**Commits verified:**
✅ afa2502 (bulk commit with data files and seed script)
✅ 8c28367 (added npm script to package.json)

All files and commits confirmed present in repository.
