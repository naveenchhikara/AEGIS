-- Revert unintended half-RLS state for ObservationRbiCircular.
-- AEGIS uses application-level tenant isolation (DAL tenant filters),
-- so this table must not enforce standalone RLS/FORCE.

DROP POLICY IF EXISTS tenant_isolation_obs_rbi ON "ObservationRbiCircular";
ALTER TABLE "ObservationRbiCircular" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "ObservationRbiCircular" DISABLE ROW LEVEL SECURITY;
