# Phase 27: Schema and Data Models - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

New Prisma models for sample-based account examination: LoanAccount, SamplingConfig, AccountExamResponse, and ExaminationQuestion. Seed data for Housing Loans default question set. Architectural contracts that Phases 28-31 depend on. No UI or business logic — schema and seed only.

</domain>

<decisions>
## Implementation Decisions

### Loan data model

- New `LoanAccount` model — separate from existing `LoanReview` (which stays for audit execution loan reviews)
- Per-engagement scope: each upload tied to one AuditEngagement. Different audits of same branch get their own snapshot
- Common fixed columns + JSONB `metadata` column for module-specific fields (e.g., collateral type for Housing, gold purity for Gold Loans)
- Core mandatory fields: accountNo, borrowerName, productType, sanctionAmount, sanctionDate, outstandingAmount, assetClass, DPD (same as LoanReview + sanctionDate for 'newly sanctioned' sampling criteria)
- tenantId for multi-tenant isolation, branchId for branch scoping, moduleCode for credit module linkage

### Question model

- New `ExaminationQuestion` model — parallel to ExaminationNode, linked by moduleCode (not tree children)
- Per-tenant ownership with global defaults: seed creates default questions, HIA can add/edit/deactivate per bank
- Fields per QMGT-04: text, rbiReference (optional), bestPracticeTip (optional), weight (Decimal), isCritical (Boolean)
- Optional `category` string field for grouping within a module (e.g., "Documentation", "Collateral", "NPA Norms")
- `displayOrder` field for management UI ordering; runtime examination randomizes per account (AEXM-01)
- `isActive` Boolean for soft-delete (QMGT-03: deactivate without losing historical data)

### Seed data

- Claude's discretion on question count — aim for solid RBI housing loan coverage based on guidelines
- RBI references use general regulation area (e.g., "Master Direction on Housing Finance") not specific circular numbers — more maintainable
- Housing Loans module only for v7.0 seed data; architecture supports all modules (XMOD-01/XMOD-02) but other module seeds deferred
- Best practice tips: 1-2 sentence practical guidance with common findings (e.g., "Check CERSAI registration within 30 days of mortgage creation")
- Varied question weights and isCritical flags reflecting real audit emphasis (PSL classification and NPA recognition as critical)

### Response and scoring model

- New `AccountExamResponse` model — separate from ExaminationResponse (node-level scoring)
- Binary response: COMPLIANT or VIOLATION enum per account-question pair
- Optional text note + optional evidence attachment per response (AEXM-04)
- Full audit trail: respondedById (auditor UUID) + respondedAt timestamp
- Scoring integration: compliance % per question (compliant / total sampled) writes to ExaminationResponse with ScoreLabel mapping — existing weighted roll-up engine works unchanged

### Claude's Discretion

- Exact question count and content for Housing Loans seed (guided by RBI norms)
- SamplingConfig model field design (criteria buckets, percentages, locking mechanism)
- Index strategy and unique constraints
- Migration approach (additive schema, no existing model changes)
- Enum choices for response status if needed beyond COMPLIANT/VIOLATION

</decisions>

<code_context>

## Existing Code Insights

### Reusable Assets

- `ExaminationNode`: Hierarchical tree with materialized path, moduleCode-based linking pattern already established
- `ExaminationResponse`: Per-node scoring with ScoreLabel enum — target for compliance % write-back
- `LoanReview`: Reference for loan data field naming conventions (accountNo, borrowerName, sanctionAmount, etc.)
- `ActionPoint`: Pattern for moduleCode traceability, createdById audit trail, evidence relation
- `BranchRbiaScore`: Frozen JSONB snapshot pattern — may be relevant for sampling config snapshots
- `ScoreLabel` enum: FULLY_COMPLIANT, LARGELY_COMPLIANT, PARTIALLY_COMPLIANT, NON_COMPLIANT — compliance % maps to these

### Established Patterns

- All models have tenantId + tenant relation with onDelete: Cascade
- UUIDs via gen_random_uuid() for primary keys
- DateTime fields: createdAt @default(now()), updatedAt @updatedAt
- Decimal for monetary values: @db.Decimal(15, 2) for amounts, @db.Decimal(5, 4) for weights
- @@index on tenantId as baseline, composite indexes for common query patterns
- Soft-delete via isActive Boolean (used in ExaminationNode)

### Integration Points

- `AuditEngagement`: LoanAccount and SamplingConfig link here (engagementId FK)
- `ExaminationNode`: ExaminationQuestion links via moduleCode string (not FK — decoupled)
- `ExaminationResponse`: AccountExamResponse compliance % writes back here for scoring roll-up
- `Evidence` model: Existing S3 evidence pattern for account-level response attachments
- Seed script: `prisma/seed.ts` (1,690 lines) — Housing Loans questions added here

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

_Phase: 27-schema-and-data-models_
_Context gathered: 2026-02-28_
