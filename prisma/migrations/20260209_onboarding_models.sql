-- Phase 10: Onboarding & Compliance Schema Additions
-- Adds RbiMasterDirection, RbiChecklistItem, OnboardingProgress models
-- Extends User (UserStatus enum + invite fields), Tenant (onboarding fields),
-- ComplianceRequirement (extended fields)

-- ─── UserStatus Enum ──────────────────────────────────────────────────────

CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'INACTIVE', 'SUSPENDED');

-- Migrate existing User.status from string to enum
ALTER TABLE "User" ALTER COLUMN "status" TYPE "UserStatus" USING (
  CASE "status"
    WHEN 'active' THEN 'ACTIVE'::"UserStatus"
    WHEN 'inactive' THEN 'INACTIVE'::"UserStatus"
    WHEN 'suspended' THEN 'SUSPENDED'::"UserStatus"
    WHEN 'invited' THEN 'INVITED'::"UserStatus"
    ELSE 'ACTIVE'::"UserStatus"
  END
);
ALTER TABLE "User" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"UserStatus";

-- ─── User: Invitation Fields ──────────────────────────────────────────────

ALTER TABLE "User" ADD COLUMN "invitedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "invitedBy" UUID;
ALTER TABLE "User" ADD COLUMN "inviteTokenHash" TEXT;
ALTER TABLE "User" ADD COLUMN "inviteExpiry" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_inviteTokenHash_key" ON "User"("inviteTokenHash");

-- ─── Tenant: Onboarding Fields ────────────────────────────────────────────

ALTER TABLE "Tenant" ADD COLUMN "established" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN "pan" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "cin" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "registrationNo" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "registeredWith" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

-- ─── ComplianceRequirement: Extended Fields ───────────────────────────────

ALTER TABLE "ComplianceRequirement" ADD COLUMN "title" TEXT;
ALTER TABLE "ComplianceRequirement" ADD COLUMN "description" TEXT;
ALTER TABLE "ComplianceRequirement" ADD COLUMN "priority" TEXT;
ALTER TABLE "ComplianceRequirement" ADD COLUMN "frequency" TEXT;
ALTER TABLE "ComplianceRequirement" ADD COLUMN "evidenceRequired" TEXT[] DEFAULT '{}';
ALTER TABLE "ComplianceRequirement" ADD COLUMN "isCustom" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ComplianceRequirement" ADD COLUMN "sourceItemCode" TEXT;

-- ─── RbiMasterDirection (Global — no tenant scope) ────────────────────────

CREATE TABLE "RbiMasterDirection" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "shortId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "rbiRef" TEXT,
  "category" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RbiMasterDirection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RbiMasterDirection_shortId_key" ON "RbiMasterDirection"("shortId");

-- ─── RbiChecklistItem (Global — no tenant scope) ──────────────────────────

CREATE TABLE "RbiChecklistItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "masterDirectionId" UUID NOT NULL,
  "itemCode" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "tierApplicability" "UcbTier"[] DEFAULT '{}',
  "tierEnhancements" JSONB,
  "frequency" TEXT NOT NULL,
  "evidenceRequired" TEXT[] DEFAULT '{}',
  "priority" TEXT NOT NULL,
  "rbiCircularRef" TEXT,
  "rbiCircularUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RbiChecklistItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RbiChecklistItem_itemCode_key" ON "RbiChecklistItem"("itemCode");
CREATE INDEX "RbiChecklistItem_masterDirectionId_idx" ON "RbiChecklistItem"("masterDirectionId");

ALTER TABLE "RbiChecklistItem"
  ADD CONSTRAINT "RbiChecklistItem_masterDirectionId_fkey"
  FOREIGN KEY ("masterDirectionId") REFERENCES "RbiMasterDirection"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── OnboardingProgress (Tenant-scoped, one-to-one) ──────────────────────

CREATE TABLE "OnboardingProgress" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "currentStep" INTEGER NOT NULL DEFAULT 1,
  "completedSteps" INTEGER[] DEFAULT '{}',
  "stepData" JSONB,
  "status" TEXT NOT NULL DEFAULT 'in_progress',
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OnboardingProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OnboardingProgress_tenantId_key" ON "OnboardingProgress"("tenantId");
CREATE INDEX "OnboardingProgress_tenantId_idx" ON "OnboardingProgress"("tenantId");

ALTER TABLE "OnboardingProgress"
  ADD CONSTRAINT "OnboardingProgress_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── RLS Policies ─────────────────────────────────────────────────────────

-- OnboardingProgress: tenant-scoped RLS
ALTER TABLE "OnboardingProgress" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "OnboardingProgress"
  USING ("tenantId"::text = current_setting('app.current_tenant_id', true));

-- No RLS on RbiMasterDirection and RbiChecklistItem — global shared data
-- These tables are read-only for tenants, managed by system admin/seed scripts

-- ─── Audit Trigger on OnboardingProgress ──────────────────────────────────

CREATE OR REPLACE FUNCTION audit_onboarding_progress()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "AuditLog" (
    "tenantId", "tableName", "recordId", "operation",
    "actionType", "oldData", "newData", "userId", "createdAt",
    "retentionExpiresAt"
  )
  VALUES (
    COALESCE(NEW."tenantId", OLD."tenantId"),
    'OnboardingProgress',
    COALESCE(NEW."id", OLD."id")::text,
    TG_OP,
    CASE TG_OP
      WHEN 'INSERT' THEN 'onboarding.started'
      WHEN 'UPDATE' THEN 'onboarding.step_completed'
      WHEN 'DELETE' THEN 'onboarding.deleted'
    END,
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
    current_setting('app.current_user_id', true),
    NOW(),
    NOW() + INTERVAL '10 years'
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "audit_onboarding_progress_trigger"
  AFTER INSERT OR UPDATE OR DELETE ON "OnboardingProgress"
  FOR EACH ROW EXECUTE FUNCTION audit_onboarding_progress();
