-- Enable pg_trgm extension for repeat finding detection
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Composite index for repeat finding detection (OBS-09)
-- Filters to CLOSED observations in same branch + audit area
CREATE INDEX IF NOT EXISTS idx_observation_repeat_detection
ON "Observation" ("tenantId", "branchId", "auditAreaId", status)
WHERE status = 'CLOSED';

-- Trigram GIN index for title similarity matching (OBS-09)
CREATE INDEX IF NOT EXISTS idx_observation_title_trgm
ON "Observation" USING gin (title gin_trgm_ops);

-- Optimized index for timeline queries (ordered by creation time)
CREATE INDEX IF NOT EXISTS idx_timeline_observation_ordered
ON "ObservationTimeline" ("observationId", "createdAt");

-- Index for observation version lookups (optimistic locking)
CREATE INDEX IF NOT EXISTS idx_observation_version
ON "Observation" (id, version);

-- RLS policy for ObservationRbiCircular (new junction table)
ALTER TABLE "ObservationRbiCircular" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ObservationRbiCircular" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_obs_rbi ON "ObservationRbiCircular"
USING (
  "observationId" IN (
    SELECT id FROM "Observation"
    WHERE "tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid
  )
);

-- Grant permissions to aegis_app role
GRANT SELECT, INSERT, UPDATE, DELETE ON "ObservationRbiCircular" TO aegis_app;
