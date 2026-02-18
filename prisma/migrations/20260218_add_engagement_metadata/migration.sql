-- R71: Add metadata JSON field to AuditEngagement for surprise audit details
ALTER TABLE "AuditEngagement" ADD COLUMN "metadata" JSONB;
