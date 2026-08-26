-- =============================================================================
-- AEGIS Full RLS Rollout (Issue #53)
-- =============================================================================
-- Enables and forces RLS for every tenant-scoped table and creates
-- tenant-isolation policies using app.current_tenant_id.
--
-- This migration is idempotent: it checks for existing policies before
-- creating them, so it can be safely re-run.
-- =============================================================================

-- Tenant-scoped tables covered: 66

ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tenant" FORCE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Observation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Observation" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ObservationTimeline" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ObservationTimeline" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Evidence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Evidence" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ComplianceRequirement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ComplianceRequirement" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Branch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Branch" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Zone" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Zone" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditArea" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditArea" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditPlan" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditEngagement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditEngagement" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditTeamMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditTeamMember" FORCE ROW LEVEL SECURITY;
ALTER TABLE "RamParameterConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RamParameterConfig" FORCE ROW LEVEL SECURITY;
ALTER TABLE "RamAssessment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RamAssessment" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ExaminationArea" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExaminationArea" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ExaminationItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExaminationItem" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditExaminationResponse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditExaminationResponse" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditSectionInstance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditSectionInstance" FORCE ROW LEVEL SECURITY;
ALTER TABLE "CashCheck" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CashCheck" FORCE ROW LEVEL SECURITY;
ALTER TABLE "LoanReview" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoanReview" FORCE ROW LEVEL SECURITY;
ALTER TABLE "SmaNpaEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SmaNpaEntry" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ComplianceItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ComplianceItem" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ReportTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReportTemplate" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditCalendar" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditCalendar" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditUniverseEntity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditUniverseEntity" FORCE ROW LEVEL SECURITY;
ALTER TABLE "RiskRegister" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RiskRegister" FORCE ROW LEVEL SECURITY;
ALTER TABLE "KeyRiskIndicator" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KeyRiskIndicator" FORCE ROW LEVEL SECURITY;
ALTER TABLE "RiskAuditLinkage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RiskAuditLinkage" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ControlLibrary" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ControlLibrary" FORCE ROW LEVEL SECURITY;
ALTER TABLE "TestProcedure" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TestProcedure" FORCE ROW LEVEL SECURITY;
ALTER TABLE "WorkProgramItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkProgramItem" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Issue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Issue" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ActionPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActionPlan" FORCE ROW LEVEL SECURITY;
ALTER TABLE "QaSelfAssessment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QaSelfAssessment" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ConcurrentAuditTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConcurrentAuditTemplate" FORCE ROW LEVEL SECURITY;
ALTER TABLE "RegulatoryObservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RegulatoryObservation" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PolicyDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PolicyDocument" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Committee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Committee" FORCE ROW LEVEL SECURITY;
ALTER TABLE "CommitteeMeeting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommitteeMeeting" FORCE ROW LEVEL SECURITY;
ALTER TABLE "HousekeepingMetric" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HousekeepingMetric" FORCE ROW LEVEL SECURITY;
ALTER TABLE "InvestmentRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvestmentRecord" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ApplicationInventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApplicationInventory" FORCE ROW LEVEL SECURITY;
ALTER TABLE "VendorRiskAssessment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VendorRiskAssessment" FORCE ROW LEVEL SECURITY;
ALTER TABLE "IsAuditChecklist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IsAuditChecklist" FORCE ROW LEVEL SECURITY;
ALTER TABLE "UserBranchAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserBranchAssignment" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditeeResponse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditeeResponse" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
ALTER TABLE "NotificationQueue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationQueue" FORCE ROW LEVEL SECURITY;
ALTER TABLE "EmailLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailLog" FORCE ROW LEVEL SECURITY;
ALTER TABLE "NotificationPreference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationPreference" FORCE ROW LEVEL SECURITY;
ALTER TABLE "BoardReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BoardReport" FORCE ROW LEVEL SECURITY;
ALTER TABLE "DashboardSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DashboardSnapshot" FORCE ROW LEVEL SECURITY;
ALTER TABLE "OnboardingProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OnboardingProgress" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ExaminationNode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExaminationNode" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ExaminationResponse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExaminationResponse" FORCE ROW LEVEL SECURITY;
ALTER TABLE "BranchRbiaScore" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BranchRbiaScore" FORCE ROW LEVEL SECURITY;
ALTER TABLE "EngagementModuleSelection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EngagementModuleSelection" FORCE ROW LEVEL SECURITY;
ALTER TABLE "EngagementMeeting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EngagementMeeting" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ActionPoint" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActionPoint" FORCE ROW LEVEL SECURITY;
ALTER TABLE "BmResponseBatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BmResponseBatch" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PositiveObservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PositiveObservation" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ExaminationQuestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExaminationQuestion" FORCE ROW LEVEL SECURITY;
ALTER TABLE "LoanAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoanAccount" FORCE ROW LEVEL SECURITY;
ALTER TABLE "SamplingConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SamplingConfig" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AccountExamResponse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccountExamResponse" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ObservationRbiCircular" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ObservationRbiCircular" FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'Tenant'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "Tenant"
      USING ("id" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("id" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'User'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "User"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'Observation'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "Observation"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ObservationTimeline'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "ObservationTimeline"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'Evidence'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "Evidence"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ComplianceRequirement'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "ComplianceRequirement"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'Branch'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "Branch"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'Zone'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "Zone"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'AuditArea'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "AuditArea"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'AuditPlan'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "AuditPlan"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'AuditEngagement'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "AuditEngagement"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'AuditTeamMember'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "AuditTeamMember"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'RamParameterConfig'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "RamParameterConfig"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'RamAssessment'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "RamAssessment"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ExaminationArea'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "ExaminationArea"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ExaminationItem'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "ExaminationItem"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'AuditExaminationResponse'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "AuditExaminationResponse"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'AuditSectionInstance'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "AuditSectionInstance"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'CashCheck'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "CashCheck"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'LoanReview'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "LoanReview"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'SmaNpaEntry'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "SmaNpaEntry"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ComplianceItem'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "ComplianceItem"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ReportTemplate'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "ReportTemplate"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'AuditCalendar'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "AuditCalendar"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'AuditUniverseEntity'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "AuditUniverseEntity"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'RiskRegister'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "RiskRegister"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'KeyRiskIndicator'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "KeyRiskIndicator"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'RiskAuditLinkage'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "RiskAuditLinkage"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ControlLibrary'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "ControlLibrary"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'TestProcedure'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "TestProcedure"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'WorkProgramItem'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "WorkProgramItem"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'Issue'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "Issue"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ActionPlan'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "ActionPlan"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'QaSelfAssessment'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "QaSelfAssessment"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ConcurrentAuditTemplate'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "ConcurrentAuditTemplate"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'RegulatoryObservation'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "RegulatoryObservation"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'PolicyDocument'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "PolicyDocument"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'Committee'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "Committee"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'CommitteeMeeting'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "CommitteeMeeting"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'HousekeepingMetric'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "HousekeepingMetric"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'InvestmentRecord'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "InvestmentRecord"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ApplicationInventory'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "ApplicationInventory"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'VendorRiskAssessment'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "VendorRiskAssessment"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'IsAuditChecklist'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "IsAuditChecklist"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'UserBranchAssignment'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "UserBranchAssignment"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'AuditeeResponse'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "AuditeeResponse"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'AuditLog'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "AuditLog"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'NotificationQueue'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "NotificationQueue"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'EmailLog'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "EmailLog"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'NotificationPreference'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "NotificationPreference"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'BoardReport'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "BoardReport"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'DashboardSnapshot'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "DashboardSnapshot"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'OnboardingProgress'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "OnboardingProgress"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ExaminationNode'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "ExaminationNode"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ExaminationResponse'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "ExaminationResponse"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'BranchRbiaScore'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "BranchRbiaScore"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'EngagementModuleSelection'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "EngagementModuleSelection"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'EngagementMeeting'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "EngagementMeeting"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ActionPoint'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "ActionPoint"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'BmResponseBatch'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "BmResponseBatch"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'PositiveObservation'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "PositiveObservation"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ExaminationQuestion'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "ExaminationQuestion"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'LoanAccount'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "LoanAccount"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'SamplingConfig'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "SamplingConfig"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'AccountExamResponse'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "AccountExamResponse"
      USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid)
      WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ObservationRbiCircular'
      AND policyname = 'tenant_isolation_policy'
  ) THEN
    CREATE POLICY tenant_isolation_policy ON "ObservationRbiCircular"
      USING (EXISTS (
      SELECT 1 FROM "Observation"
      WHERE "Observation"."id" = "ObservationRbiCircular"."observationId"
        AND "Observation"."tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid
    ))
      WITH CHECK (EXISTS (
      SELECT 1 FROM "Observation"
      WHERE "Observation"."id" = "ObservationRbiCircular"."observationId"
        AND "Observation"."tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid
    ));
  END IF;
END
$$;

-- Verification
-- SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class
-- WHERE relname IN ('Tenant', 'User', 'Observation', 'ObservationTimeline', 'Evidence', 'ComplianceRequirement', 'Branch', 'Zone', 'AuditArea', 'AuditPlan', 'AuditEngagement', 'AuditTeamMember', 'RamParameterConfig', 'RamAssessment', 'ExaminationArea', 'ExaminationItem', 'AuditExaminationResponse', 'AuditSectionInstance', 'CashCheck', 'LoanReview', 'SmaNpaEntry', 'ComplianceItem', 'ReportTemplate', 'AuditCalendar', 'AuditUniverseEntity', 'RiskRegister', 'KeyRiskIndicator', 'RiskAuditLinkage', 'ControlLibrary', 'TestProcedure', 'WorkProgramItem', 'Issue', 'ActionPlan', 'QaSelfAssessment', 'ConcurrentAuditTemplate', 'RegulatoryObservation', 'PolicyDocument', 'Committee', 'CommitteeMeeting', 'HousekeepingMetric', 'InvestmentRecord', 'ApplicationInventory', 'VendorRiskAssessment', 'IsAuditChecklist', 'UserBranchAssignment', 'AuditeeResponse', 'AuditLog', 'NotificationQueue', 'EmailLog', 'NotificationPreference', 'BoardReport', 'DashboardSnapshot', 'OnboardingProgress', 'ExaminationNode', 'ExaminationResponse', 'BranchRbiaScore', 'EngagementModuleSelection', 'EngagementMeeting', 'ActionPoint', 'BmResponseBatch', 'PositiveObservation', 'ExaminationQuestion', 'LoanAccount', 'SamplingConfig', 'AccountExamResponse', 'ObservationRbiCircular');
--
-- SELECT tablename, policyname FROM pg_policies WHERE policyname = 'tenant_isolation_policy';
