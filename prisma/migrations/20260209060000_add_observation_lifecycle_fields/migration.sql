-- Add observation lifecycle fields for CRUD actions and state machine support

-- Optimistic locking version
ALTER TABLE "Observation" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- Fieldwork resolution (OBS-07)
ALTER TABLE "Observation" ADD COLUMN "resolvedDuringFieldwork" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Observation" ADD COLUMN "resolutionReason" TEXT;

-- Auditee response fields
ALTER TABLE "Observation" ADD COLUMN "auditeeResponse" TEXT;
ALTER TABLE "Observation" ADD COLUMN "actionPlan" TEXT;

-- Risk categorization
ALTER TABLE "Observation" ADD COLUMN "riskCategory" TEXT;
