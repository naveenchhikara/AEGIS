# Phase 10: Onboarding & Compliance — Planning Document

**Phase Goal:** New banks complete guided onboarding wizard that seeds compliance registry with pre-built RBI checklists based on UCB tier.

**Requirements:** ONBD-01, ONBD-02, ONBD-03, ONBD-04, ONBD-05, ONBD-06, CMPL-01, CMPL-02, CMPL-03, CMPL-04

**Dependencies:** Phase 5 (auth, tenant, DB), Phase 6 (observations link to compliance), Phase 9 (dashboards consume compliance data)

---

## 1. Research Findings

### 1.1 UCB Tier Classification (RBI 2025 Framework)

The RBI's revised regulatory classification for UCBs is based on **deposit size**, not paid-up capital and reserves as the existing codebase data suggests. The 2025 framework:

| Tier       | Criteria                                                                                     | CRAR Requirement | Enhanced Requirements                         |
| ---------- | -------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------- |
| **Tier 1** | All unit UCBs, salary earners' UCBs (any size), other UCBs with deposits up to Rs. 100 crore | 12% by Mar 2026  | No                                            |
| **Tier 2** | UCBs with deposits Rs. 100 crore to Rs. 1,000 crore                                          | 12% by Mar 2026  | Some                                          |
| **Tier 3** | UCBs with deposits Rs. 1,000 crore to Rs. 10,000 crore                                       | 12% + 3% buffer  | Yes — independent RM function, CISO mandatory |
| **Tier 4** | UCBs with deposits exceeding Rs. 10,000 crore                                                | 12% + 3% buffer  | Yes — full Basel III, Pillar 3 disclosures    |

**Note on existing Prisma schema:** The `UcbTier` enum already has TIER_1 through TIER_4. The tier definitions in `src/data/rbi-regulations/index.json` use the older paid-up capital and reserves criteria (Rs. 100cr / 50cr / 10cr). The onboarding wizard should use the **current deposit-based criteria** but accept both self-declaration and manual selection for flexibility (some banks may be transitioning between classifications).

**Implication for AEGIS target market:** Per PROJECT.md, the target is Tier III and IV UCBs. Under the new classification, most target UCBs will be Tier 1 or Tier 2 (smaller banks with deposits under Rs. 1,000 crore). The onboarding wizard must accommodate this — the simplest UX is for Tier 1 banks, with progressive complexity for higher tiers.

### 1.2 The 10 Pre-Built RBI Master Direction Checklists (CMPL-01)

Based on analysis of the existing compliance data (`src/data/rbi-regulations/compliance-requirements.json` — 42 requirements across 10 categories) and the RBI's 27 Master Directions for UCBs issued in 2025, the following 10 Master Directions are the most impactful and universally applicable:

| #   | Master Direction                                                   | Short ID | Tier Applicability               | Checklist Items | Priority |
| --- | ------------------------------------------------------------------ | -------- | -------------------------------- | --------------- | -------- |
| 1   | **Prudential Norms on Capital Adequacy**                           | MD-CAP   | All tiers                        | 12 items        | Critical |
| 2   | **Income Recognition, Asset Classification & Provisioning (IRAC)** | MD-IRAC  | All tiers                        | 15 items        | Critical |
| 3   | **Know Your Customer (KYC) Direction**                             | MD-KYC   | All tiers                        | 10 items        | Critical |
| 4   | **Priority Sector Lending — Targets & Classification**             | MD-PSL   | All tiers                        | 8 items         | High     |
| 5   | **Management of Advances**                                         | MD-ADV   | All tiers                        | 12 items        | High     |
| 6   | **Board of Directors — UCBs**                                      | MD-BOD   | All tiers                        | 10 items        | High     |
| 7   | **Fraud Risk Management**                                          | MD-FRM   | All tiers                        | 8 items         | High     |
| 8   | **Cyber Security Framework**                                       | MD-CSF   | All tiers (enhanced for Tier 3+) | 12 items        | Critical |
| 9   | **Interest Rate on Deposits & Advances**                           | MD-IR    | All tiers                        | 6 items         | Medium   |
| 10  | **Investment Portfolio — Classification, Valuation & Operation**   | MD-INV   | All tiers (enhanced for Tier 3+) | 10 items        | Medium   |

**Total: ~103 pre-built checklist items across 10 Master Directions.**

#### Tier-to-Master-Direction Applicability Matrix

| Master Direction           | Tier 1 | Tier 2           | Tier 3                | Tier 4                 |
| -------------------------- | ------ | ---------------- | --------------------- | ---------------------- |
| MD-CAP (Capital Adequacy)  | Core   | Core             | Core + CCB            | Core + CCB + Pillar 3  |
| MD-IRAC (NPA/Provisioning) | Core   | Core             | Core                  | Core                   |
| MD-KYC                     | Core   | Core             | Core + Enhanced CDD   | Core + Enhanced CDD    |
| MD-PSL                     | Core   | Core             | Core                  | Core                   |
| MD-ADV (Advances Mgmt)     | Core   | Core             | Core + Large Exposure | Core + Large Exposure  |
| MD-BOD (Board Governance)  | Core   | Core             | Core + RMC mandatory  | Core + Full committees |
| MD-FRM (Fraud Risk)        | Core   | Core             | Core + CEO reporting  | Core + Board reporting |
| MD-CSF (Cyber Security)    | Basic  | Basic + CISO rec | Full + CISO mandatory | Full + SOC             |
| MD-IR (Interest Rates)     | Core   | Core             | Core                  | Core                   |
| MD-INV (Investments)       | Core   | Core             | Core + MTM            | Core + Full HTM/AFS    |

When a bank selects their tier during onboarding, the system auto-selects all 10 Master Directions but **auto-toggles tier-specific enhanced requirements** within each checklist. For example, Tier 1 banks get the "Core" items from MD-CSF (8 items), while Tier 3+ banks also get the "Enhanced" items (4 additional items).

### 1.3 Checklist Item Structure

Each pre-built checklist item will have:

```typescript
interface RbiChecklistTemplate {
  id: string; // e.g., "MD-CAP-001"
  masterDirectionId: string; // e.g., "MD-CAP"
  title: string; // "Maintain CRAR >= 12%"
  description: string; // Detailed requirement text
  category: string; // "Capital", "Credit Risk", etc.
  rbiCircularRef: string; // "RBI/2024-25/09" or circular number
  rbiCircularUrl?: string; // Link to RBI website
  tierApplicability: UcbTier[]; // [TIER_1, TIER_2, TIER_3, TIER_4]
  tierEnhancements?: Record<UcbTier, string>; // Tier-specific additional text
  frequency: string; // "Continuous", "Quarterly", "Annual"
  evidenceRequired: string[]; // What documents are needed
  priority: "critical" | "high" | "medium" | "low";
}
```

### 1.4 Onboarding Wizard UX Research

**Pattern chosen:** Zustand + React Hook Form + Zod per-step validation + localStorage persistence.

**Why this stack:**

- **Zustand** for cross-step state — lightweight, works with SSR, supports localStorage middleware for persistence (ONBD-06: save and return later)
- **React Hook Form** for form management — minimal re-renders, ideal for large forms
- **Zod** for validation — type-safe schemas per step, integrates with React Hook Form via zodResolver
- **localStorage** for wizard progress persistence — simple, no server calls needed for draft state

**Alternative considered and rejected:**

- Server-side persistence (too complex for wizard draft state — adds API calls on every field change)
- React Context (insufficient for localStorage persistence out of the box)
- URL-based step tracking (breaks save-and-return pattern since URL state is ephemeral)

**Final submission** (after all 5 steps) will use a **server action** to create the tenant configuration, seed compliance requirements, and send user invitations — a single atomic operation.

### 1.5 Excel Template Upload Research

**Library: SheetJS (xlsx)**

- Active maintenance, TypeScript support
- Server-side parsing via Node.js buffer
- **CRITICAL:** Do NOT install from npm registry (`npm install xlsx`) — use the official distribution (`npm install xlsx@https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`)
- Alternative: `exceljs` — more feature-rich but heavier

**Upload flow:**

1. Admin downloads pre-formatted Excel template from AEGIS
2. Admin fills in org structure (departments, branches, staff)
3. Admin uploads via drag-and-drop (reuse `react-dropzone` UI from Phase 7, but NOT the S3 presigned URL flow)
4. File sent to server action via FormData (server-side parsing required — differs from Phase 7's browser→S3 direct upload)
5. Server action parses Excel with SheetJS → validates against expected schema → returns parsed data for preview
6. Admin reviews preview table with per-row validation status → confirms → data is created in database

**IMPORTANT distinction from Phase 7 evidence upload (Phase 7 cross-review feedback):**

- Phase 7: Browser → S3 (presigned URL) → server confirms. File never hits app server.
- Phase 10: Browser → server action (FormData) → SheetJS parse → preview → confirm. File MUST go to server for parsing.
- Reuse: Only the `react-dropzone` drag-and-drop UI component is shared. The upload destination and flow are different.

**Template columns for org structure:**

- **Departments sheet:** Department Name, Department Code, Department Head, Department Head Email
- **Branches sheet:** Branch Name, Branch Code, City, State, Type (HO/Branch/Extension Counter), Branch Manager Name, Branch Manager Email
- **Staff sheet:** Name, Email, Employee Code, Department, Role(s), Qualification

### 1.6 User Invitation Flow Research

**Pattern:** Email invitation with magic link or temporary password.

Since Phase 5 uses Better Auth:

1. Admin enters invitee name, email, role(s), branch assignment(s) in wizard Step 5
2. Server action creates `User` record with `status: INVITED` and `roles: [selected roles]`
3. For AUDITEE users, also creates `UserBranchAssignment` records linking user to selected branches
4. Generate random 32-byte token via `crypto.randomBytes(32).toString('hex')`
5. Store **bcrypt hash** of token in `user.inviteTokenHash` (not raw token — prevents theft if DB compromised)
6. System sends invitation email via AWS SES (Phase 8 infrastructure)
7. Email contains one-time link: `/accept-invite?token=<raw-token>&email=<email>`
8. Invitee clicks link → server verifies `bcrypt.compare(token, user.inviteTokenHash)` + expiry check → sets password → status changes to `ACTIVE`
9. Token is cleared from DB after successful acceptance (single-use)

**Dependency:** Phase 8 (AWS SES) must be available for actual email sending. During development/testing, invitation emails can be logged to console.

---

## 2. Onboarding Wizard Design

### 2.1 Five-Step Wizard Overview

```
Step 1: Bank Registration     → Tenant record created (draft)
Step 2: Tier Selection        → UcbTier selected, implications shown
Step 3: RBI Directions        → Master Directions auto-selected per tier, admin customizes
Step 4: Org Structure         → Departments, branches, staff via form or Excel upload
Step 5: User Invites          → Invite users with role assignment
         ↓
    [Complete Onboarding]     → Seeds compliance registry, sends invitations
```

### 2.2 Step 1: Bank Registration

**Fields:**
| Field | Type | Validation | Required |
|-------|------|-----------|----------|
| Bank Name | text | min 3, max 200 | Yes |
| Short Name | text | min 2, max 50 | Yes |
| RBI License Number | text | pattern `UCB-[A-Z]{2,3}-YYYY-NNNN` | Yes |
| State | select (Indian states) | from predefined list | Yes |
| City | text | min 2, max 100 | Yes |
| Registration Number | text | — | Yes |
| Registered With | select (RCS options per state) | — | Yes |
| UCB Type | select (Scheduled/Non-scheduled) | — | Yes |
| Scheduled Date | date | only if UCB Type = Scheduled | Conditional |
| Established Date | date | past date | Yes |
| PAN | text | pattern `[A-Z]{5}[0-9]{4}[A-Z]` | Yes |
| CIN | text | standard CIN pattern | No |

**UX considerations:**

- Pre-fill "Registered With" based on selected state (e.g., Maharashtra → "Registrar of Co-operative Societies, Maharashtra")
- Show tooltip explaining Scheduled vs Non-scheduled UCB
- Validate RBI License Number format client-side with helpful error message

### 2.3 Step 2: Tier Selection

**Display tier classification criteria clearly:**

- Show the RBI's deposit-based tier table with Rs. amounts
- Ask: "What is your bank's total deposits (as of last quarter)?"
- Auto-suggest tier based on deposit amount entered
- Allow manual override with confirmation: "You've selected Tier 2 but your deposits suggest Tier 1. Are you sure?"

**Tier selection implications panel:**
When a tier is selected, immediately show:

- Applicable CRAR requirement
- Number of RBI Master Directions that will be auto-selected
- Whether enhanced requirements (CISO, independent RM function, Pillar 3) apply
- Capital Conservation Buffer requirement

**Additional fields per tier:**
| Field | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|-------|--------|--------|--------|--------|
| NABARD Registration | Optional | Optional | Optional | Optional |
| Multi-State License | Yes/No | Yes/No | Yes/No | Yes/No |
| Last DAKSH Score | Optional | Optional | Recommended | Recommended |
| PCA Status | Select | Select | Select | Select |
| Last RBI Inspection Date | Optional | Optional | Recommended | Recommended |

### 2.4 Step 3: RBI Directions Selection

**Auto-selection:** Based on tier from Step 2, all 10 Master Directions are pre-selected with appropriate tier-specific items toggled on.

**Display:**

- Accordion/collapsible list of 10 Master Directions
- Each direction shows: title, brief description, number of checklist items, tier applicability badge
- Admin can expand each to see individual checklist items
- Admin can deselect entire Master Directions (with warning: "Deselecting KYC Direction is unusual. Are you sure?")
- Admin can mark individual items as "Not Applicable" with required justification text field (CMPL-03)

**Summary panel (sidebar):**

- Total selected requirements: N
- By category breakdown (Capital: 12, Credit: 15, ...)
- Estimated compliance workload indicator (light/moderate/heavy based on count)

### 2.5 Step 4: Org Structure

**Two paths:**

1. **Manual Entry** (default for small banks)
   - Add departments: name, code, head name, head email
   - Add branches: name, code, city, state, type, manager name, manager email
   - Minimum: 1 department (Audit), 1 branch (Head Office)
   - Pre-populated suggestions: "Most UCBs have these departments: Credit, Operations, IT, Compliance, Audit, HR, Treasury"

2. **Excel Upload** (for banks with existing staff lists)
   - Download template button → generates .xlsx with 3 sheets (Departments, Branches, Staff)
   - Upload via drag-and-drop
   - Parse and preview table with validation status per row (green check / red X)
   - Fix validation errors inline or re-upload
   - Confirm to proceed

**Validation rules:**

- Department code: unique, 2-5 uppercase letters
- Branch code: unique, alphanumeric
- No duplicate emails across staff entries
- At least one branch marked as "Head Office"

### 2.6 Step 5: User Invites

**Role assignment matrix:**
| Role | Description | Typical Count | Can Hold Multiple? |
|------|-------------|---------------|--------------------|
| CEO | Executive oversight, read-only dashboards | 1 | No (dedicated) |
| CAE | Chief Audit Executive — manages audit plan, approves high-severity findings | 1 | Yes (CEO+CAE in small banks) |
| CCO | Chief Compliance Officer — manages compliance registry | 1 | Yes (CAE+CCO in small banks) |
| Audit Manager | Manages audit team, reviews findings | 1-3 | Yes |
| Auditor | Conducts audits, creates observations | 2-10 | Yes |
| Auditee | Branch/dept staff who respond to findings | 5-50 | No (typically single role) |

**UX:**

- Table/list of users to invite
- Each row: Name, Email, Role(s) multi-select, Branch Assignment(s) multi-select (for AUDITEE role)
- When AUDITEE role is selected, show branch multi-select populated from Step 4 branches
- "Add row" button
- Pre-populate from org structure (if branches have manager emails from Step 4) — auto-link branch manager to their branch as auditee
- For small banks (Tier 1/2), show helper: "In smaller banks, one person often holds multiple roles. You can assign multiple roles to the same user."
- Show warning if no CAE or CCO is assigned
- Show warning if any auditee has no branch assigned: "Auditees need at least one branch assignment to view findings"

**Skip option:** "I'll invite users later" — allows completing onboarding without inviting anyone (they can do it from Settings after onboarding)

### 2.7 State Persistence (ONBD-06)

**Zustand store with localStorage middleware:**

```typescript
interface OnboardingState {
  currentStep: number; // 1-5
  completedSteps: Set<number>; // which steps have valid data

  // Step 1
  bankRegistration: BankRegistrationData | null;

  // Step 2
  tierSelection: TierSelectionData | null;

  // Step 3
  selectedDirections: SelectedDirectionData[];
  notApplicableItems: NotApplicableItem[];

  // Step 4
  orgStructure: OrgStructureData | null;

  // Step 5
  userInvites: UserInviteData[];

  // Meta
  startedAt: string; // ISO timestamp
  lastSavedAt: string;
  onboardingId?: string; // server-side draft ID after first save
}
```

**Save behavior:**

- Auto-save to localStorage on every field change (debounced 500ms)
- On step completion, also save to server (creates/updates onboarding draft record)
- On returning to AEGIS, detect incomplete onboarding → show "Resume onboarding?" prompt
- After 30 days of inactivity, expire draft and clear localStorage

### 2.8 Completion Flow

When admin clicks "Complete Onboarding" on Step 5:

1. **Validate all steps** — show error if any step has validation issues
2. **Create tenant record** from Step 1 + Step 2 data (or update if draft exists)
3. **Create departments** from Step 4
4. **Create branches** from Step 4
5. **Seed compliance registry** — for each selected Master Direction item:
   - Create `ComplianceRequirement` record
   - Link to `RbiCircular` (from global table)
   - Set status to `PENDING`
   - Set `notApplicableReason` for items marked N/A in Step 3
6. **Create invited users** with `status: INVITED` from Step 5
7. **Create UserBranchAssignment** records for auditee users (linking to branches from Step 4)
8. **Queue invitation emails** via notification system (Phase 8)
9. **Create audit log entries** for all created records
10. **Clear localStorage** onboarding state
11. **Redirect to dashboard** with welcome message: "Onboarding complete! Your compliance registry has been seeded with N requirements from M RBI Master Directions."

**Atomicity:** Steps 2-9 should run in a single database transaction. If any step fails, the entire onboarding rolls back.

**S3 note (Phase 7 cross-review confirmation):** No per-tenant S3 setup is needed during onboarding. Phase 7 uses path-based S3 isolation (`/{tenantId}/evidence/...`), so evidence storage works automatically once the tenant ID exists. The S3 bucket is a shared resource configured in Phase 5 infrastructure.

---

## 3. Compliance Registry Seeding Mechanism

### 3.1 Template → Instance Pattern

**Global templates** (stored in `rbi_checklist_templates` table or JSON seed data):

- 10 Master Directions × ~10 items each = ~103 template items
- Maintained by AEGIS team, not per-tenant
- Updated when RBI issues new circulars

**Tenant instances** (created during onboarding in `ComplianceRequirement` table):

- Copied from templates during onboarding Step 3 → completion
- Each instance belongs to a specific tenant (via `tenantId`)
- Admin can modify, mark N/A, or add custom requirements (CMPL-04)

### 3.2 Seeding SQL Pattern

```sql
-- Pseudocode for seeding compliance requirements from templates
INSERT INTO "ComplianceRequirement" (id, "tenantId", requirement, category, status, "rbiCircularId", "nextReviewDate", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  $tenantId,
  t.requirement_text,
  t.category,
  'PENDING',
  rc.id,              -- link to global RbiCircular
  NOW() + INTERVAL '90 days',  -- initial review in 90 days
  NOW(),
  NOW()
FROM rbi_checklist_template t
LEFT JOIN "RbiCircular" rc ON rc."circularNumber" = t.rbi_circular_ref
WHERE t.master_direction_id = ANY($selectedDirectionIds)
  AND t.tier_applicability @> ARRAY[$selectedTier];
```

### 3.3 Custom Requirements (CMPL-04)

After onboarding, admin can add custom compliance requirements from Settings → Compliance:

- Free-text requirement
- Category (select from existing + custom)
- Optional RBI circular reference (autocomplete from global `RbiCircular` table)
- Priority
- Review frequency
- Assigned owner

### 3.4 Not-Applicable Marking (CMPL-03)

**During onboarding (Step 3):**

- Toggle item as "Not Applicable"
- Required: justification text (min 20 characters)
- Item is still created in `ComplianceRequirement` table with `notApplicableReason` populated
- Status set to `PENDING` (not a separate status — admins may revisit)

**After onboarding (from compliance registry page):**

- Admin can mark any requirement as N/A via existing compliance detail dialog
- Same justification requirement
- Audit log records the action with justification

---

## 4. Database Schema Additions

### 4.1 New Models

```prisma
// Auditee-to-branch mapping — tenant-scoped (many-to-many)
// CRITICAL: Phase 7 (AUD-01) requires auditees to see only their branch's observations.
// This table links auditee users to their assigned branch(es).
// Set during onboarding Step 5 and manageable from Settings post-onboarding.
model UserBranchAssignment {
  id       String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId   String @db.Uuid
  user     User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  branchId String @db.Uuid
  branch   Branch @relation(fields: [branchId], references: [id], onDelete: Cascade)
  tenantId String @db.Uuid
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@unique([userId, branchId])
  @@index([tenantId])
  @@index([userId])
  @@index([branchId])
}

// Global template table — not tenant-scoped
model RbiMasterDirection {
  id          String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  shortId     String @unique  // "MD-CAP", "MD-IRAC", etc.
  title       String          // "Prudential Norms on Capital Adequacy"
  description String? @db.Text
  rbiRef      String?         // "RBI/2024-25/09"
  category    String          // "Capital", "Credit Risk", etc.

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  checklistItems RbiChecklistItem[]
}

// Global checklist template items — not tenant-scoped
model RbiChecklistItem {
  id                  String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  masterDirectionId   String @db.Uuid
  masterDirection     RbiMasterDirection @relation(fields: [masterDirectionId], references: [id])

  itemCode     String @unique  // "MD-CAP-001"
  title        String
  description  String @db.Text
  category     String

  // Tier applicability (PostgreSQL array)
  tierApplicability UcbTier[]

  // Tier-specific enhancement text (JSON)
  tierEnhancements Json?

  frequency         String    // "Continuous", "Quarterly", "Annual"
  evidenceRequired  String[]  // Array of evidence types needed
  priority          String    // "critical", "high", "medium", "low"

  // Source reference
  rbiCircularRef String?     // Circular number
  rbiCircularUrl String?     // URL to RBI website

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([masterDirectionId])
}

// Onboarding progress tracking — tenant-scoped
model OnboardingProgress {
  id       String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId String @db.Uuid @unique
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  currentStep    Int @default(1)          // 1-5
  completedSteps Int[] @default([])       // Array of completed step numbers

  // Step data stored as JSON (flexible schema during wizard)
  stepData Json?

  status    String @default("in_progress")  // "in_progress", "completed", "expired"

  expiresAt DateTime?  // 30 days after last activity

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId])
}
```

### 4.2 Modifications to Existing Models

**Tenant model additions:**

```prisma
// Add to existing Tenant model:
  established      DateTime?
  pan              String?
  cin              String?
  registrationNo   String?
  registeredWith   String?

  // Onboarding tracking
  onboardingCompleted Boolean @default(false)
  onboardingCompletedAt DateTime?

  // Relations
  onboardingProgress OnboardingProgress?
```

**ComplianceRequirement model additions:**

```prisma
// Add to existing ComplianceRequirement model:
  title            String?           // Short title for display
  description      String? @db.Text  // Longer description
  priority         String?           // "critical", "high", "medium", "low"
  frequency        String?           // "Continuous", "Quarterly", "Annual"
  evidenceRequired String[]          // What evidence is needed
  isCustom         Boolean @default(false)  // Admin-added vs seeded

  // Source template reference
  sourceItemCode   String?           // "MD-CAP-001" — links back to template
```

**User model additions:**

```prisma
// 1. Change `status String` to proper enum (Phase 7 cross-review feedback):
enum UserStatus {
  INVITED
  ACTIVE
  INACTIVE
  SUSPENDED
}
// Update User model:
  status UserStatus @default(ACTIVE)  // was: String @default("active")

// 2. Invitation fields:
  invitedAt       DateTime?
  invitedBy       String?  @db.Uuid
  inviteTokenHash String?  @unique  // Store bcrypt hash of token, NOT raw token
  inviteExpiry    DateTime?

// 3. Branch assignment relation:
  branchAssignments UserBranchAssignment[]
```

**Note on invite tokens (Phase 7 cross-review feedback):** Use a random 32-byte token (via `crypto.randomBytes(32).toString('hex')`) instead of JWT. Since we do a DB lookup for revocation anyway, JWTs add complexity without benefit. Store only the **bcrypt hash** of the token in `inviteTokenHash` — the raw token is sent in the email link and verified via `bcrypt.compare()` on acceptance. This prevents token theft if the database is compromised.

**Branch and Tenant model additions for UserBranchAssignment:**

```prisma
// Add to Branch model:
  userAssignments UserBranchAssignment[]

// Add to Tenant model:
  userBranchAssignments UserBranchAssignment[]
```

### 4.3 Seed Data for Master Directions

A seed script will populate the `RbiMasterDirection` and `RbiChecklistItem` tables with the 10 Master Directions and ~103 checklist items. This is **global data** (not tenant-scoped) and runs once during initial deployment.

Source data: Derived from existing `src/data/rbi-regulations/compliance-requirements.json` (42 items) expanded to 103 items with proper Master Direction categorization and tier applicability tagging.

---

## 5. API Endpoints / Server Actions

### 5.1 Onboarding Wizard Actions

| Action                  | Type          | Auth  | Description                                            |
| ----------------------- | ------------- | ----- | ------------------------------------------------------ |
| `saveOnboardingStep`    | Server Action | Admin | Save wizard step data to `OnboardingProgress`          |
| `getOnboardingProgress` | Server Action | Admin | Retrieve current wizard state                          |
| `completeOnboarding`    | Server Action | Admin | Atomic: create tenant + seed compliance + create users |
| `validateExcelUpload`   | Server Action | Admin | Parse and validate uploaded Excel org structure        |
| `downloadOrgTemplate`   | Route Handler | Admin | Generate and return .xlsx template file                |

### 5.2 Compliance Management Actions

| Action                 | Type          | Auth      | Description                                          |
| ---------------------- | ------------- | --------- | ---------------------------------------------------- |
| `addCustomRequirement` | Server Action | Admin/CCO | Add custom compliance requirement (CMPL-04)          |
| `markNotApplicable`    | Server Action | Admin/CCO | Mark requirement as N/A with justification (CMPL-03) |
| `revertNotApplicable`  | Server Action | Admin/CCO | Re-activate a previously N/A requirement             |
| `getMasterDirections`  | Server Action | Any       | List available Master Directions with counts         |

### 5.3 User Invitation Actions

| Action                | Type          | Auth   | Description                            |
| --------------------- | ------------- | ------ | -------------------------------------- |
| `sendUserInvitations` | Server Action | Admin  | Create User records + queue emails     |
| `acceptInvitation`    | Server Action | Public | Invitee sets password, status → active |
| `resendInvitation`    | Server Action | Admin  | Resend invitation email                |
| `revokeInvitation`    | Server Action | Admin  | Cancel pending invitation              |

---

## 6. File Structure

```
src/
├── app/
│   ├── (onboarding)/
│   │   └── onboarding/
│   │       ├── layout.tsx              # Minimal layout (no sidebar — dedicated flow)
│   │       ├── page.tsx                # Wizard container + step router
│   │       └── _components/
│   │           ├── onboarding-wizard.tsx     # Main wizard orchestrator
│   │           ├── step-indicator.tsx        # Progress bar (1/5, 2/5, etc.)
│   │           ├── step-navigation.tsx       # Back/Next/Save & Exit buttons
│   │           ├── step-1-registration.tsx   # Bank registration form
│   │           ├── step-2-tier-selection.tsx  # Tier selection + implications
│   │           ├── step-3-rbi-directions.tsx  # Master Direction selection
│   │           ├── step-4-org-structure.tsx   # Departments + branches + Excel upload
│   │           ├── step-5-user-invites.tsx    # User invitation table
│   │           └── completion-summary.tsx     # Post-completion summary
│   │
│   ├── (dashboard)/
│   │   └── settings/
│   │       └── compliance/
│   │           ├── page.tsx             # Compliance management settings
│   │           └── _components/
│   │               ├── add-custom-requirement.tsx
│   │               └── master-direction-browser.tsx
│   │
│   └── accept-invite/
│       └── page.tsx                     # Public invite acceptance page
│
├── actions/
│   ├── onboarding.ts                    # Server actions for wizard
│   ├── compliance-management.ts         # Custom requirement + N/A actions
│   └── user-invitations.ts             # Invitation management actions
│
├── stores/
│   └── onboarding-store.ts             # Zustand store with localStorage persistence
│
├── lib/
│   ├── excel-parser.ts                  # SheetJS parsing utilities
│   └── onboarding-validation.ts         # Zod schemas per step
│
├── data/
│   └── rbi-master-directions/
│       ├── index.ts                     # Barrel export
│       ├── master-directions.json       # 10 Master Direction definitions
│       └── checklist-items.json         # 103 checklist items with tier mapping
│
└── types/
    └── onboarding.ts                    # Onboarding-specific types
```

---

## 7. Task Breakdown

### Wave 1: Foundation (database + seed data)

**Task 10-01: Database schema additions**

- Add `RbiMasterDirection`, `RbiChecklistItem`, `OnboardingProgress` models to Prisma schema
- Add new fields to `Tenant`, `ComplianceRequirement`, `User` models
- Generate migration, apply to database
- **Depends on:** Phase 5 complete (schema exists)

**Task 10-02: Create RBI Master Direction seed data**

- Create `src/data/rbi-master-directions/master-directions.json` with 10 Master Direction definitions
- Create `src/data/rbi-master-directions/checklist-items.json` with ~103 items
- Each item has tier applicability, circular reference, evidence requirements
- Create seed script to populate `RbiMasterDirection` and `RbiChecklistItem` tables
- Map each item to corresponding `RbiCircular` in global table
- **Depends on:** Task 10-01

### Wave 2: Wizard Core

**Task 10-03: Onboarding Zustand store + validation schemas**

- Create `src/stores/onboarding-store.ts` with localStorage persistence
- Create `src/lib/onboarding-validation.ts` with 5 Zod schemas (one per step)
- Create `src/types/onboarding.ts` with TypeScript interfaces
- **Depends on:** Task 10-01

**Task 10-04: Wizard layout + step navigation**

- Create `(onboarding)` route group with minimal layout (no sidebar)
- Create wizard container, step indicator, step navigation components
- Implement step routing via state (not URL — prevent bookmark issues)
- **Depends on:** Task 10-03

**Task 10-05: Step 1 — Bank Registration form**

- Create registration form with all fields from section 2.2
- State-based "Registered With" pre-fill
- RBI License Number format validation
- **Depends on:** Task 10-04

**Task 10-06: Step 2 — Tier Selection**

- Tier selection cards with deposit range display
- Deposit amount input with auto-tier suggestion
- Tier implications panel showing applicable requirements
- Additional tier-specific fields
- **Depends on:** Task 10-04

**Task 10-07: Step 3 — RBI Directions Selection**

- Accordion list of 10 Master Directions
- Auto-selection based on tier from Step 2
- Expand to see individual checklist items
- N/A toggle with justification field
- Summary panel with counts
- **Depends on:** Task 10-02, Task 10-04

### Wave 3: Org Structure + Invites

**Task 10-08: Step 4 — Org Structure (Manual Entry)**

- Department add/edit/remove form
- Branch add/edit/remove form
- Pre-populated suggestions for common departments
- Validation: at least 1 department + 1 branch
- **Depends on:** Task 10-04

**Task 10-09: Step 4 — Org Structure (Excel Upload)**

- Create Excel template generator (route handler)
- Create `src/lib/excel-parser.ts` for SheetJS parsing
- Upload, parse, validate, preview flow
- Error highlighting per row
- **Depends on:** Task 10-08

**Task 10-10: Step 5 — User Invites**

- User invite table with add/remove rows
- Role multi-select per user
- Pre-populate from org structure managers (Step 4)
- "Skip for now" option
- **Depends on:** Task 10-04

### Wave 4: Completion + Server Actions

**Task 10-11: Complete Onboarding server action**

- Atomic transaction: create tenant + departments + branches + seed compliance + create users
- Compliance registry seeding from selected Master Direction items
- Handle N/A items with justification
- Audit log entries for all created records
- Clear onboarding progress on success
- **Depends on:** Tasks 10-05 through 10-10

**Task 10-12: User invitation server actions**

- Create user records with `status: "invited"`, `inviteToken`
- Accept-invite page for password setting
- Resend / revoke invitation actions
- Integration with Phase 8 notification system (or console.log fallback)
- **Depends on:** Task 10-11, Phase 5 (Better Auth)

### Wave 5: Post-Onboarding Compliance Management

**Task 10-13: Custom requirement addition (CMPL-04)**

- Add custom compliance requirement form in Settings → Compliance
- Category selection (existing + custom)
- Optional RBI circular autocomplete
- **Depends on:** Task 10-11

**Task 10-14: N/A marking from compliance registry (CMPL-03)**

- Add "Mark as Not Applicable" action to existing compliance detail dialog
- Justification text field (required, min 20 chars)
- "Revert to Active" action
- Audit trail for both actions
- **Depends on:** Task 10-11

---

## 8. Dependencies

### On Phase 5 (Foundation & Migration)

- Prisma schema and database connection
- Better Auth integration (for user creation + invite acceptance)
- RLS policies (new ComplianceRequirements are tenant-isolated)
- AuditLog infrastructure (onboarding actions logged)

### On Phase 6 (Observation Lifecycle)

- Compliance requirements link to observations via `relatedRequirement` tag
- Observations page references compliance categories for tagging

### On Phase 7 (Auditee Portal)

- Onboarding creates auditee users who access Phase 7's portal
- Branch structure from onboarding determines auditee's scope

### On Phase 8 (Notifications)

- User invitation emails sent via AWS SES infrastructure
- Onboarding completion notification to admin

### On Phase 9 (Dashboards)

- Compliance dashboard consumes seeded compliance data
- Dashboard shows onboarding completion status for new tenants

### Internal to Phase 10

- Wave 1 (schema + seed) blocks Wave 2 (wizard)
- Wave 2 blocks Wave 3 (org structure uses wizard framework)
- Wave 3 blocks Wave 4 (completion needs all steps)
- Wave 4 blocks Wave 5 (post-onboarding features need seeded data)

---

## 9. Requirements Mapping

| Requirement                                  | Task(s)                                         | Acceptance Criteria                                                                  |
| -------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| **ONBD-01** (5-step wizard)                  | 10-04, 10-05, 10-06, 10-07, 10-08, 10-09, 10-10 | Admin navigates all 5 steps with back/forward, progress indicator shows completion   |
| **ONBD-02** (tier-based auto-selection)      | 10-06, 10-07                                    | Selecting Tier 2 auto-selects 10 Master Directions with tier-appropriate items       |
| **ONBD-03** (Excel upload for org structure) | 10-08, 10-09                                    | Admin downloads template, fills in, uploads, sees preview, confirms import           |
| **ONBD-04** (user invites with roles)        | 10-10, 10-12                                    | Admin invites 3+ users with different roles, invitees receive email and can accept   |
| **ONBD-05** (seed compliance registry)       | 10-02, 10-11                                    | After completion, compliance registry shows N requirements from M Master Directions  |
| **ONBD-06** (save and return)                | 10-03                                           | Admin starts wizard, closes browser, returns next day, resumes at same step          |
| **CMPL-01** (10 pre-built checklists)        | 10-02                                           | 10 Master Directions with ~103 checklist items available in Step 3                   |
| **CMPL-02** (linked to RBI circular)         | 10-02                                           | Each checklist item shows RBI circular reference with link to source                 |
| **CMPL-03** (mark N/A with reason)           | 10-07, 10-14                                    | Admin marks item N/A, must enter justification, item appears in registry with reason |
| **CMPL-04** (add custom requirements)        | 10-13                                           | Admin adds custom requirement from Settings, appears in compliance registry          |

---

## 10. UX Considerations for Tier III/IV Banks

AEGIS targets UCBs with **limited IT staff**. The onboarding wizard must be:

1. **Progressive disclosure:** Don't overwhelm with all fields at once. Show only what's needed per step.
2. **Contextual help:** Tooltip icons (?) on every banking-specific field (e.g., "What is CRAR?", "What is PCA status?")
3. **Smart defaults:** Pre-fill common values (e.g., PCA Status = None, Scheduled = No for most target banks)
4. **Familiar language:** Use banking terminology but explain it (e.g., "CRAR (Capital to Risk-weighted Assets Ratio) — your bank must maintain at least 12%")
5. **Minimal required fields:** Only truly required fields are mandatory. Optional fields clearly labeled.
6. **Save early, save often:** Auto-save every step to localStorage + server. Never lose work.
7. **Excel template simplicity:** Template has clear headers, example data row, data validation dropdowns in Excel.
8. **Mobile responsive:** Many UCB staff access from tablets. Wizard must work on iPad-sized screens.
9. **Regional language support:** Step labels and help text should be translatable (integration with existing i18n from Phase 4).
10. **Time estimate:** Show "Typical onboarding takes 15-20 minutes" on welcome screen.

---

## 11. Security Considerations

1. **Onboarding route protection:** Only users with admin/setup role can access `/onboarding`. If already-onboarded admin navigates to `/onboarding`, redirect to dashboard with message "Onboarding already completed." Non-admin users (including auditees) get 403.
2. **Invite tokens:** Random 32-byte tokens with bcrypt-hashed storage, 7-day expiry, single-use. Raw token only exists in the email link — DB stores hash only.
3. **Excel upload validation:** Server-side validation of file type (magic bytes, not just extension), max file size 5MB. File goes to server action (NOT S3) for SheetJS parsing.
4. **Rate limiting:** Max 10 invitation emails per hour per tenant
5. **Tenant isolation:** All onboarding data scoped to tenant via RLS
6. **Audit trail:** Every onboarding action logged (tenant created, users invited, compliance seeded)
7. **No sensitive data in localStorage:** Only wizard form data, no passwords or tokens
8. **Accept-invite route:** Public route (no auth required) but validates token hash + expiry. Rate-limited to prevent brute-force token guessing (max 5 attempts per IP per hour).

---

## 12. Risks and Mitigations

| Risk                                             | Impact                  | Mitigation                                                                      |
| ------------------------------------------------ | ----------------------- | ------------------------------------------------------------------------------- |
| RBI updates Master Directions after launch       | Stale checklists        | Design update mechanism: admin seed script + UI notification for new items      |
| Large UCB has 50+ branches → Excel upload fails  | Broken onboarding       | Server-side streaming parser, 5MB file limit, chunk processing                  |
| Admin abandons wizard at Step 3                  | Orphan tenant draft     | 30-day expiry on `OnboardingProgress`, cron job to clean expired drafts         |
| Phase 8 (email) not ready → invitations fail     | Blocked user activation | Fallback: generate invite link directly (copy-paste) + console.log in dev       |
| Tier reclassification mid-year                   | Wrong checklist items   | Allow re-running tier selection from Settings → Compliance → "Reconfigure Tier" |
| Non-English speaking admin struggles with wizard | Poor adoption           | i18n for wizard labels, contextual help in regional language                    |

---

_Phase 10 plan created: 2026-02-09_
_Author: phase-10 planning agent_
_Status: Updated after Phase 7 cross-review feedback_
_Cross-review by: phase-7 planning agent_
_Changes incorporated: UserBranchAssignment model, UserStatus enum, bcrypt token hashing, Excel upload flow clarification, route protection edge cases, accept-invite rate limiting_
