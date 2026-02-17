---
phase: 1
plan: 5
type: standard
wave: 5
depends_on: [4]
files_modified:
  - src/lib/ram-engine.ts
  - src/data-access/ram.ts
  - src/actions/ram/schemas.ts
  - src/actions/ram/create-assessment.ts
  - src/actions/ram/save-scores.ts
  - src/actions/ram/compute-assessment.ts
  - src/actions/ram/approve-assessment.ts
autonomous: true
must_haves:
  truths:
    - "computeCompositeScore() correctly calculates weighted average from individual parameter scores"
    - "deriveRiskCategory() maps composite score to HIGH/MEDIUM/LOW per RBIA Policy thresholds"
    - "deriveAuditFrequency() maps risk category to audit interval months (HIGH→12, MEDIUM→18, LOW→24)"
    - "RAM assessment can be created, scored, computed, and approved through server actions"
    - "Server actions follow AEGIS conventions: session auth, Zod validation, tenant-scoped, transaction-wrapped"
  artifacts:
    - path: "src/lib/ram-engine.ts"
      provides: "Pure computation functions: computeCompositeScore, deriveRiskCategory, deriveAuditFrequency"
      exports: ["computeCompositeScore", "deriveRiskCategory", "deriveAuditFrequency"]
    - path: "src/data-access/ram.ts"
      provides: "DAL queries: getRamParameterConfigs, getRamAssessment, getRamAssessments, getRamAssessmentWithScores"
      exports: ["getRamParameterConfigs", "getRamAssessment", "getRamAssessments", "getRamAssessmentWithScores"]
    - path: "src/actions/ram/schemas.ts"
      provides: "Zod schemas for all RAM server actions"
    - path: "src/actions/ram/create-assessment.ts"
      provides: "createRamAssessment server action"
    - path: "src/actions/ram/save-scores.ts"
      provides: "saveRamScores server action"
    - path: "src/actions/ram/compute-assessment.ts"
      provides: "computeRamAssessment server action"
    - path: "src/actions/ram/approve-assessment.ts"
      provides: "approveRamAssessment server action"
  key_links:
    - from: "src/actions/ram/compute-assessment.ts"
      to: "src/lib/ram-engine.ts"
      via: "import { computeCompositeScore, deriveRiskCategory, deriveAuditFrequency }"
    - from: "src/actions/ram/*.ts"
      to: "src/data-access/ram.ts"
      via: "import DAL queries for read operations"
    - from: "src/actions/ram/compute-assessment.ts"
      to: "Branch.ramScore"
      via: "Updates Branch.ramScore and Branch.auditFrequency after computation"
---

## Objective

Build the RAM (Risk Assessment Model) computation engine and server actions. The engine is a pure function library that calculates composite scores from weighted parameter scores and derives risk categories and audit frequencies. Server actions provide the CRUD workflow: create assessment → enter scores → compute → approve. Computing an assessment also updates the Branch's cached ramScore and auditFrequency fields.

## Context

@AEGIS/src/lib/ram-engine.ts — NEW: computation engine
@AEGIS/src/data-access/ram.ts — NEW: DAL queries
@AEGIS/src/actions/ram/ — NEW: server actions directory
@AEGIS/.planning/codebase/CONVENTIONS.md — server action patterns, DAL patterns
@AEGIS/.planning/codebase/ARCHITECTURE.md — data flow, transaction patterns
@AEGIS/.planning/REQUIREMENTS.md — R7, R8

## Tasks

<task type="auto">
  <name>Task 1: RAM computation engine + DAL queries</name>
  <files>src/lib/ram-engine.ts, src/data-access/ram.ts</files>
  <action>
  **1a. Create `src/lib/ram-engine.ts` — pure computation functions (no DB, no side effects):**

  ```typescript
  /**
   * RAM (Risk Assessment Model) Computation Engine
   *
   * Pure functions for computing branch risk assessments.
   * Based on RBIA Policy 2020 §7.3-7.6 and §9.1.
   *
   * Scoring: 1 (lowest risk) to 5 (highest risk) per parameter.
   * Composite: Weighted average of all parameter scores.
   * Risk Category: HIGH (>3.5), MEDIUM (2.5-3.5), LOW (<2.5)
   * Audit Frequency: HIGH→12mo, MEDIUM→18mo, LOW→24mo
   */

  export interface RamScoreInput {
    paramCode: string;
    score: number;  // 1-5
    weight: number; // 0-1 (sum of all weights ≈ 1.0)
  }

  export interface RamComputationResult {
    compositeScore: number;    // Weighted average, 2 decimal places
    riskCategory: "HIGH" | "MEDIUM" | "LOW";
    auditFrequency: number;   // Months: 12, 18, or 24
  }

  /**
   * Compute composite score as weighted average.
   * Formula: Σ(score_i × weight_i) / Σ(weight_i)
   *
   * Normalizes by total weight to handle cases where weights
   * don't sum exactly to 1.0 (e.g., some params inactive).
   */
  export function computeCompositeScore(scores: RamScoreInput[]): number {
    if (scores.length === 0) {
      throw new Error("Cannot compute composite score with zero parameters");
    }

    const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
    if (totalWeight === 0) {
      throw new Error("Total weight cannot be zero");
    }

    const weightedSum = scores.reduce((sum, s) => sum + s.score * s.weight, 0);
    const composite = weightedSum / totalWeight;

    return Math.round(composite * 100) / 100; // 2 decimal places
  }

  /**
   * Derive risk category from composite score.
   * Per RBIA Policy §7.5:
   *   - > 3.5  → HIGH risk
   *   - 2.5-3.5 → MEDIUM risk
   *   - < 2.5  → LOW risk
   */
  export function deriveRiskCategory(compositeScore: number): "HIGH" | "MEDIUM" | "LOW" {
    if (compositeScore > 3.5) return "HIGH";
    if (compositeScore >= 2.5) return "MEDIUM";
    return "LOW";
  }

  /**
   * Derive audit frequency from risk category.
   * Per RBIA Policy §7.6:
   *   - HIGH   → 12 months (annual)
   *   - MEDIUM → 18 months
   *   - LOW    → 24 months (biennial)
   */
  export function deriveAuditFrequency(riskCategory: "HIGH" | "MEDIUM" | "LOW"): number {
    const FREQUENCY_MAP: Record<string, number> = {
      HIGH: 12,
      MEDIUM: 18,
      LOW: 24,
    };
    return FREQUENCY_MAP[riskCategory] ?? 18; // Default to 18 if unknown
  }

  /**
   * Full RAM computation pipeline.
   * Takes scored parameters, returns composite score + risk category + frequency.
   */
  export function computeRam(scores: RamScoreInput[]): RamComputationResult {
    const compositeScore = computeCompositeScore(scores);
    const riskCategory = deriveRiskCategory(compositeScore);
    const auditFrequency = deriveAuditFrequency(riskCategory);

    return { compositeScore, riskCategory, auditFrequency };
  }
  ```

  **1b. Create `src/data-access/ram.ts` — DAL queries:**

  ```typescript
  import "server-only";
  import { prismaForTenant } from "./prisma";
  import type { Session } from "@/lib/auth";

  /**
   * Get all active RAM parameter configs for the tenant.
   */
  export async function getRamParameterConfigs(session: Session) {
    const tenantId = (session.user as any).tenantId as string;
    const db = prismaForTenant(tenantId);

    return db.ramParameterConfig.findMany({
      where: { tenantId, isActive: true },
      orderBy: { displayOrder: "asc" },
    });
  }

  /**
   * Get RAM assessments for a tenant with optional branch filter.
   */
  export async function getRamAssessments(
    session: Session,
    options?: { branchId?: string; assessmentYear?: string }
  ) {
    const tenantId = (session.user as any).tenantId as string;
    const db = prismaForTenant(tenantId);

    return db.ramAssessment.findMany({
      where: {
        tenantId,
        ...(options?.branchId && { branchId: options.branchId }),
        ...(options?.assessmentYear && { assessmentYear: options.assessmentYear }),
      },
      include: {
        branch: { select: { id: true, code: true, name: true, city: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get a single RAM assessment with all scores and parameter configs.
   */
  export async function getRamAssessmentWithScores(
    session: Session,
    assessmentId: string
  ) {
    const tenantId = (session.user as any).tenantId as string;
    const db = prismaForTenant(tenantId);

    return db.ramAssessment.findFirst({
      where: { id: assessmentId, tenantId },
      include: {
        branch: { select: { id: true, code: true, name: true, city: true } },
        scores: {
          include: {
            paramConfig: {
              select: {
                id: true,
                code: true,
                name: true,
                category: true,
                weight: true,
                maxScore: true,
                scoringCriteria: true,
                displayOrder: true,
              },
            },
          },
          orderBy: { paramConfig: { displayOrder: "asc" } },
        },
      },
    });
  }

  /**
   * Get a single RAM assessment by ID (without scores).
   */
  export async function getRamAssessment(
    session: Session,
    assessmentId: string
  ) {
    const tenantId = (session.user as any).tenantId as string;
    const db = prismaForTenant(tenantId);

    return db.ramAssessment.findFirst({
      where: { id: assessmentId, tenantId },
      include: {
        branch: { select: { id: true, code: true, name: true } },
      },
    });
  }
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit --pretty 2>&1 | grep -E "(ram-engine|data-access/ram)" | head -10
  ```
  No TypeScript errors in these two files. If there are unrelated TS errors elsewhere, that's acceptable.

  Verify computation logic manually:
  ```bash
  cd /root/.openclaw/workspace/AEGIS && node -e "
    // Simulate computeCompositeScore
    const scores = [
      { paramCode: 'BR-01', score: 4, weight: 0.0556 },
      { paramCode: 'BR-02', score: 3, weight: 0.0556 },
      { paramCode: 'CR-01', score: 5, weight: 0.0556 },
    ];
    const totalWeight = scores.reduce((s, x) => s + x.weight, 0);
    const weightedSum = scores.reduce((s, x) => s + x.score * x.weight, 0);
    const composite = Math.round((weightedSum / totalWeight) * 100) / 100;
    console.log('Composite:', composite); // Should be 4.0
    console.log('Category:', composite > 3.5 ? 'HIGH' : composite >= 2.5 ? 'MEDIUM' : 'LOW'); // HIGH
    console.log('Frequency:', composite > 3.5 ? 12 : composite >= 2.5 ? 18 : 24); // 12
  "
  ```
  </verify>
  <done>
  - src/lib/ram-engine.ts exists with 4 exported functions
  - computeCompositeScore handles edge cases (empty array, zero weight)
  - deriveRiskCategory: >3.5→HIGH, 2.5-3.5→MEDIUM, <2.5→LOW
  - deriveAuditFrequency: HIGH→12, MEDIUM→18, LOW→24
  - src/data-access/ram.ts has 4 DAL functions following conventions
  - DAL uses prismaForTenant, accepts Session, includes tenantId in WHERE
  </done>
</task>

<task type="auto">
  <name>Task 2: RAM server actions (create, save scores, compute, approve)</name>
  <files>src/actions/ram/schemas.ts, src/actions/ram/create-assessment.ts, src/actions/ram/save-scores.ts, src/actions/ram/compute-assessment.ts, src/actions/ram/approve-assessment.ts</files>
  <action>
  **2a. Create `src/actions/ram/schemas.ts`:**

  ```typescript
  import { z } from "zod";

  export const CreateRamAssessmentSchema = z.object({
    branchId: z.string().uuid("Invalid branch ID"),
    assessmentYear: z
      .string()
      .regex(/^\d{4}-\d{2}$/, "Assessment year must be in format YYYY-YY (e.g., 2025-26)"),
  });

  export type CreateRamAssessmentInput = z.infer<typeof CreateRamAssessmentSchema>;

  export const SaveRamScoresSchema = z.object({
    assessmentId: z.string().uuid("Invalid assessment ID"),
    scores: z.array(
      z.object({
        paramConfigId: z.string().uuid("Invalid parameter config ID"),
        score: z.number().min(1, "Score must be 1-5").max(5, "Score must be 1-5"),
        remarks: z.string().max(500).optional(),
      })
    ).min(1, "At least one score is required"),
  });

  export type SaveRamScoresInput = z.infer<typeof SaveRamScoresSchema>;

  export const AssessmentIdSchema = z.object({
    assessmentId: z.string().uuid("Invalid assessment ID"),
  });
  ```

  **2b. Create `src/actions/ram/create-assessment.ts`:**

  ```typescript
  "use server";

  import { revalidatePath } from "next/cache";
  import { getRequiredSession } from "@/data-access/session";
  import { prismaForTenant } from "@/data-access/prisma";
  import { setAuditContext } from "@/data-access/audit-context";
  import { hasPermission, type Role } from "@/lib/permissions";
  import { logger } from "@/lib/logger";
  import { CreateRamAssessmentSchema, type CreateRamAssessmentInput } from "./schemas";

  /**
   * Create a new RAM assessment for a branch/year.
   * Security: Requires ram:create permission.
   * Atomicity: Creates assessment record in transaction.
   */
  export async function createRamAssessment(input: CreateRamAssessmentInput) {
    const session = await getRequiredSession();
    const userRoles = ((session.user as any).roles ?? []) as Role[];
    const tenantId = (session.user as any).tenantId as string;

    if (!hasPermission(userRoles, "ram:create")) {
      return { success: false as const, error: "You do not have permission to create RAM assessments." };
    }

    const parsed = CreateRamAssessmentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0].message };
    }
    const validated = parsed.data;

    const db = prismaForTenant(tenantId);

    try {
      const result = await db.$transaction(async (tx: any) => {
        await setAuditContext(tx, {
          actionType: "ram_assessment.created",
          userId: session.user.id,
          tenantId,
          sessionId: session.session.id,
        });

        // Check branch exists and belongs to tenant
        const branch = await tx.branch.findFirst({
          where: { id: validated.branchId, tenantId },
        });
        if (!branch) {
          throw new Error("Branch not found");
        }

        // Check for existing assessment for same branch/year
        const existing = await tx.ramAssessment.findFirst({
          where: {
            tenantId,
            branchId: validated.branchId,
            assessmentYear: validated.assessmentYear,
          },
        });
        if (existing) {
          throw new Error(`Assessment already exists for ${branch.name} in ${validated.assessmentYear}`);
        }

        return tx.ramAssessment.create({
          data: {
            tenantId,
            branchId: validated.branchId,
            assessmentYear: validated.assessmentYear,
            status: "DRAFT",
          },
        });
      });

      revalidatePath("/ram");
      return { success: true as const, data: { id: result.id } };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create RAM assessment.";
      logger.error({ error, action: "create_ram_assessment", tenantId }, message);
      return { success: false as const, error: message };
    }
  }
  ```

  **2c. Create `src/actions/ram/save-scores.ts`:**

  ```typescript
  "use server";

  import { revalidatePath } from "next/cache";
  import { getRequiredSession } from "@/data-access/session";
  import { prismaForTenant } from "@/data-access/prisma";
  import { setAuditContext } from "@/data-access/audit-context";
  import { hasPermission, type Role } from "@/lib/permissions";
  import { logger } from "@/lib/logger";
  import { SaveRamScoresSchema, type SaveRamScoresInput } from "./schemas";

  /**
   * Save/update individual parameter scores for a RAM assessment.
   * Security: Requires ram:create permission.
   * Atomicity: Upserts all scores in a single transaction.
   */
  export async function saveRamScores(input: SaveRamScoresInput) {
    const session = await getRequiredSession();
    const userRoles = ((session.user as any).roles ?? []) as Role[];
    const tenantId = (session.user as any).tenantId as string;

    if (!hasPermission(userRoles, "ram:create")) {
      return { success: false as const, error: "You do not have permission to score RAM assessments." };
    }

    const parsed = SaveRamScoresSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0].message };
    }
    const validated = parsed.data;

    const db = prismaForTenant(tenantId);

    try {
      await db.$transaction(async (tx: any) => {
        await setAuditContext(tx, {
          actionType: "ram_assessment.scores_saved",
          userId: session.user.id,
          tenantId,
          sessionId: session.session.id,
        });

        // Verify assessment exists, belongs to tenant, and is in DRAFT status
        const assessment = await tx.ramAssessment.findFirst({
          where: { id: validated.assessmentId, tenantId },
        });
        if (!assessment) {
          throw new Error("Assessment not found");
        }
        if (assessment.status !== "DRAFT") {
          throw new Error("Can only save scores for DRAFT assessments");
        }

        // Upsert each score
        for (const scoreInput of validated.scores) {
          await tx.ramAssessmentScore.upsert({
            where: {
              assessmentId_paramConfigId: {
                assessmentId: validated.assessmentId,
                paramConfigId: scoreInput.paramConfigId,
              },
            },
            update: {
              score: scoreInput.score,
              remarks: scoreInput.remarks ?? null,
            },
            create: {
              assessmentId: validated.assessmentId,
              paramConfigId: scoreInput.paramConfigId,
              score: scoreInput.score,
              remarks: scoreInput.remarks ?? null,
            },
          });
        }
      });

      revalidatePath("/ram");
      return { success: true as const, data: { assessmentId: validated.assessmentId } };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save RAM scores.";
      logger.error({ error, action: "save_ram_scores", tenantId }, message);
      return { success: false as const, error: message };
    }
  }
  ```

  **2d. Create `src/actions/ram/compute-assessment.ts`:**

  ```typescript
  "use server";

  import { revalidatePath } from "next/cache";
  import { getRequiredSession } from "@/data-access/session";
  import { prismaForTenant } from "@/data-access/prisma";
  import { setAuditContext } from "@/data-access/audit-context";
  import { hasPermission, type Role } from "@/lib/permissions";
  import { logger } from "@/lib/logger";
  import { computeRam, type RamScoreInput } from "@/lib/ram-engine";
  import { AssessmentIdSchema } from "./schemas";

  /**
   * Compute composite score for a RAM assessment.
   * Reads all saved scores, runs computation engine, updates assessment + branch.
   * Security: Requires ram:create permission.
   * Side effects: Updates Branch.ramScore and Branch.auditFrequency.
   */
  export async function computeRamAssessment(input: { assessmentId: string }) {
    const session = await getRequiredSession();
    const userRoles = ((session.user as any).roles ?? []) as Role[];
    const tenantId = (session.user as any).tenantId as string;

    if (!hasPermission(userRoles, "ram:create")) {
      return { success: false as const, error: "You do not have permission to compute RAM assessments." };
    }

    const parsed = AssessmentIdSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0].message };
    }

    const db = prismaForTenant(tenantId);

    try {
      const result = await db.$transaction(async (tx: any) => {
        await setAuditContext(tx, {
          actionType: "ram_assessment.computed",
          userId: session.user.id,
          tenantId,
          sessionId: session.session.id,
        });

        // Load assessment with scores and param configs
        const assessment = await tx.ramAssessment.findFirst({
          where: { id: parsed.data.assessmentId, tenantId },
          include: {
            scores: {
              include: {
                paramConfig: { select: { code: true, weight: true } },
              },
            },
          },
        });

        if (!assessment) {
          throw new Error("Assessment not found");
        }
        if (assessment.status === "APPROVED") {
          throw new Error("Cannot re-compute an approved assessment");
        }
        if (assessment.scores.length === 0) {
          throw new Error("No scores entered. Please score all parameters before computing.");
        }

        // Prepare score inputs for engine
        const scoreInputs: RamScoreInput[] = assessment.scores.map((s: any) => ({
          paramCode: s.paramConfig.code,
          score: Number(s.score),
          weight: Number(s.paramConfig.weight),
        }));

        // Compute
        const { compositeScore, riskCategory, auditFrequency } = computeRam(scoreInputs);

        // Update assessment
        const updated = await tx.ramAssessment.update({
          where: { id: assessment.id },
          data: {
            compositeScore,
            riskCategory,
            auditFrequency,
            status: "COMPUTED",
            computedById: session.user.id,
            computedAt: new Date(),
          },
        });

        // Update branch cached fields
        await tx.branch.update({
          where: { id: assessment.branchId },
          data: {
            ramScore: compositeScore,
            auditFrequency,
          },
        });

        return updated;
      });

      revalidatePath("/ram");
      return {
        success: true as const,
        data: {
          id: result.id,
          compositeScore: Number(result.compositeScore),
          riskCategory: result.riskCategory,
          auditFrequency: result.auditFrequency,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to compute RAM assessment.";
      logger.error({ error, action: "compute_ram_assessment", tenantId }, message);
      return { success: false as const, error: message };
    }
  }
  ```

  **2e. Create `src/actions/ram/approve-assessment.ts`:**

  ```typescript
  "use server";

  import { revalidatePath } from "next/cache";
  import { getRequiredSession } from "@/data-access/session";
  import { prismaForTenant } from "@/data-access/prisma";
  import { setAuditContext } from "@/data-access/audit-context";
  import { hasPermission, type Role } from "@/lib/permissions";
  import { logger } from "@/lib/logger";
  import { AssessmentIdSchema } from "./schemas";

  /**
   * Approve a computed RAM assessment.
   * Security: Requires ram:approve permission (CAE only).
   * Maker-checker: Approver cannot be the same as the computer.
   */
  export async function approveRamAssessment(input: { assessmentId: string }) {
    const session = await getRequiredSession();
    const userRoles = ((session.user as any).roles ?? []) as Role[];
    const tenantId = (session.user as any).tenantId as string;

    if (!hasPermission(userRoles, "ram:approve")) {
      return { success: false as const, error: "You do not have permission to approve RAM assessments." };
    }

    const parsed = AssessmentIdSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0].message };
    }

    const db = prismaForTenant(tenantId);

    try {
      const result = await db.$transaction(async (tx: any) => {
        await setAuditContext(tx, {
          actionType: "ram_assessment.approved",
          userId: session.user.id,
          tenantId,
          sessionId: session.session.id,
        });

        const assessment = await tx.ramAssessment.findFirst({
          where: { id: parsed.data.assessmentId, tenantId },
        });

        if (!assessment) {
          throw new Error("Assessment not found");
        }
        if (assessment.status !== "COMPUTED") {
          throw new Error("Only computed assessments can be approved");
        }
        // Maker-checker: approver ≠ computer
        if (assessment.computedById === session.user.id) {
          throw new Error("The person who computed the assessment cannot approve it");
        }

        return tx.ramAssessment.update({
          where: { id: assessment.id },
          data: {
            status: "APPROVED",
            approvedById: session.user.id,
            approvedAt: new Date(),
          },
        });
      });

      revalidatePath("/ram");
      return { success: true as const, data: { id: result.id, status: "APPROVED" } };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to approve RAM assessment.";
      logger.error({ error, action: "approve_ram_assessment", tenantId }, message);
      return { success: false as const, error: message };
    }
  }
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit --pretty 2>&1 | grep -E "(actions/ram|ram-engine|data-access/ram)" | head -20
  ```
  No TypeScript errors in RAM-related files. Check files exist:
  ```bash
  ls -la src/lib/ram-engine.ts src/data-access/ram.ts src/actions/ram/
  ```
  Should show all 5 action files + schemas.
  </verify>
  <done>
  - src/lib/ram-engine.ts: 4 pure functions (computeCompositeScore, deriveRiskCategory, deriveAuditFrequency, computeRam)
  - src/data-access/ram.ts: 4 DAL functions (getRamParameterConfigs, getRamAssessments, getRamAssessmentWithScores, getRamAssessment)
  - src/actions/ram/schemas.ts: 3 Zod schemas (CreateRamAssessment, SaveRamScores, AssessmentId)
  - src/actions/ram/create-assessment.ts: creates DRAFT assessment, checks uniqueness
  - src/actions/ram/save-scores.ts: upserts scores, validates DRAFT status
  - src/actions/ram/compute-assessment.ts: runs engine, updates assessment + branch cached fields
  - src/actions/ram/approve-assessment.ts: maker-checker enforced, sets APPROVED status
  - All actions follow AEGIS conventions (session auth, Zod, tenant-scoped, transaction, audit context)
  </done>
</task>

## Success Criteria

1. `pnpm exec tsc --noEmit` has no errors in RAM-related files
2. ram-engine.ts exports 4 functions with correct TypeScript types
3. computeCompositeScore correctly handles: equal weights, unequal weights, empty array (throws)
4. Risk category thresholds: >3.5→HIGH, 2.5-3.5→MEDIUM, <2.5→LOW
5. Frequency mapping: HIGH→12, MEDIUM→18, LOW→24
6. All 4 server actions follow convention: session→permission→zod→transaction→revalidate→return
7. Maker-checker: approve action rejects if computedById === approving userId
8. compute action updates Branch.ramScore and Branch.auditFrequency
