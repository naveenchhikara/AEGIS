-- Create all tables for AEGIS platform based on Prisma schema
-- This DDL is compatible with PostgreSQL and uses proper quoting

DROP TABLE IF EXISTS "AuditLog" CASCADE;

CREATE TABLE "AuditLog" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sequenceNumber" BIGINT,
  "tenantId" UUID NOT NULL,
  "tableName" VARCHAR NOT NULL,
  "recordId" VARCHAR NOT NULL,
  "operation" VARCHAR NOT NULL,
  "actionType" VARCHAR,
  "oldData" JSON,
  "newData" JSON,
  "userId" UUID,
  justification VARCHAR,
  "ipAddress" VARCHAR,
  "sessionId" VARCHAR,
  "retentionExpiresAt" TIMESTAMP,
  createdAt TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "Tenant" CASCADE;

CREATE TABLE "Tenant" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  shortName VARCHAR NOT NULL,
  rbiLicenseNo VARCHAR UNIQUE NOT NULL,
  tier VARCHAR NOT NULL,
  state VARCHAR NOT NULL,
  city VARCHAR NOT NULL,
  scheduledBankStatus BOOLEAN DEFAULT false,
  nabardRegistrationNo VARCHAR,
  multiStateLicense BOOLEAN DEFAULT false,
  dakshScore DECIMAL(5,2),
  dakshScoreDate TIMESTAMP,
  pcaStatus VARCHAR DEFAULT 'NONE',
  pcaEffectiveDate TIMESTAMP,
  lastRbiInspectionDate TIMESTAMP,
  rbiRiskRating VARCHAR,
  settings JSON,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "User" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  roles VARCHAR[] NOT NULL,
  tenantId UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  status VARCHAR DEFAULT 'active',
  lastLoginAt TIMESTAMP,
  lastLoginIp VARCHAR,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenantId, email)
);

CREATE TABLE "Branch" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenantId UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  code VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  city VARCHAR NOT NULL,
  state VARCHAR NOT NULL,
  type VARCHAR,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenantId, code)
);

CREATE TABLE "AuditArea" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenantId UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description VARCHAR,
  riskCategory VARCHAR,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenantId, name)
);

CREATE TABLE "AuditPlan" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenantId UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  quarter VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'PLANNED',
  startDate TIMESTAMP,
  endDate TIMESTAMP,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenantId, year, quarter)
);

CREATE TABLE "AuditEngagement" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auditPlanId UUID NOT NULL REFERENCES "AuditPlan"(id) ON DELETE CASCADE,
  tenantId UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  branchId UUID REFERENCES "Branch"(id),
  auditAreaId UUID REFERENCES "AuditArea"(id),
  assignedToId UUID,
  status VARCHAR DEFAULT 'PLANNED',
  scheduledStartDate TIMESTAMP,
  completionDate TIMESTAMP,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "Observation" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenantId UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  condition TEXT NOT NULL,
  criteria TEXT NOT NULL,
  cause TEXT NOT NULL,
  effect TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  severity VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'DRAFT',
  assignedToId UUID REFERENCES "User"(id),
  branchId UUID REFERENCES "Branch"(id),
  auditAreaId UUID REFERENCES "AuditArea"(id),
  createdById UUID NOT NULL REFERENCES "User"(id),
  dueDate TIMESTAMP,
  statusUpdatedAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "ObservationTimeline" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observationId UUID NOT NULL REFERENCES "Observation"(id) ON DELETE CASCADE,
  tenantId UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  event VARCHAR NOT NULL,
  oldValue VARCHAR,
  newValue VARCHAR,
  comment TEXT,
  createdById UUID NOT NULL REFERENCES "User"(id),
  createdAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "Evidence" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observationId UUID NOT NULL REFERENCES "Observation"(id) ON DELETE CASCADE,
  tenantId UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  filename VARCHAR NOT NULL,
  s3Key VARCHAR NOT NULL,
  fileSize INTEGER NOT NULL,
  contentType VARCHAR NOT NULL,
  uploadedById UUID NOT NULL REFERENCES "User"(id),
  deletedAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "ComplianceRequirement" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenantId UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  requirement TEXT NOT NULL,
  category VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'PENDING',
  rbiCircularId UUID,
  nextReviewDate TIMESTAMP,
  notApplicableReason VARCHAR,
  ownerId UUID REFERENCES "User"(id),
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "RbiCircular" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circularNumber VARCHAR UNIQUE NOT NULL,
  title VARCHAR NOT NULL,
  issuedDate TIMESTAMP NOT NULL,
  url VARCHAR,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX ON "Tenant"(id);
CREATE INDEX ON "User"(tenantId);
CREATE INDEX ON "User"(tenantId, email);
CREATE INDEX ON "Branch"(tenantId);
CREATE INDEX ON "AuditArea"(tenantId);
CREATE INDEX ON "AuditPlan"(tenantId);
CREATE INDEX ON "AuditEngagement"(tenantId);
CREATE INDEX ON "AuditEngagement"(auditPlanId);
CREATE INDEX ON "Observation"(tenantId);
CREATE INDEX ON "Observation"(severity);
CREATE INDEX ON "Observation"(status);
CREATE INDEX ON "ObservationTimeline"(tenantId);
CREATE INDEX ON "ObservationTimeline"(observationId);
CREATE INDEX ON "Evidence"(tenantId);
CREATE INDEX ON "Evidence"(observationId);
CREATE INDEX ON "ComplianceRequirement"(tenantId);
CREATE INDEX ON "ComplianceRequirement"(status);
CREATE INDEX ON "AuditLog"(tenantId);
CREATE INDEX ON "AuditLog"("tableName", "recordId");
CREATE INDEX ON "AuditLog"("actionType");
CREATE INDEX ON "AuditLog"(createdAt);

SELECT 'All tables and indexes created successfully' as status;
