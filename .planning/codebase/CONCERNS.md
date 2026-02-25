# Codebase Concerns

**Analysis Date:** 2026-02-25

## Tech Debt

**Dual Examination Model (v5 + v6 Coexistence):**

- Issue: Two parallel examination model trees coexist — legacy `ExaminationArea`/`ExaminationItem`/`AuditExaminationResponse` alongside new `ExaminationNode`/`ExaminationResponse`. Both are live in the schema and in active use.
- Files: `src/data-access/rbia-examination.ts`, `src/data-access/audit-execution.ts`, `prisma/schema.prisma`
- Impact: Cognitive overhead on every audit-execution query; risk of writing to the wrong model; duplicated query logic. Schema complexity inflated by ~20 models that will be removed.
- Fix approach: Phase 23 cleanup — remove legacy `ExaminationArea`, `ExaminationItem`, `AuditExaminationResponse`, `AuditSectionInstance` models and migrate any remaining data references.

**Deprecated Seed JSON Still Exported:**

- Issue: `src/data/index.ts` still exports seed JSON arrays with a TODO comment: `// TODO: Remove these exports when all pages use database queries`. Some static data flows may still use these instead of querying the DB.
- Files: `src/data/index.ts`, `src/data/seed/` (directory)
- Impact: Data drift — static JSON can diverge from DB contents. Pages using static data bypass tenant isolation.
- Fix approach: Audit all importers of `src/data/index.ts`, migrate to DAL queries, delete the exports.

**Missing Schema Link: ActionPoint → Observation Promotion:**

- Issue: `src/data-access/rbia-findings.ts` line 77 has `// TODO Phase 20: Add sourceActionPointId to Observation schema for promote-to-observation link`. The foreign key for tracing promoted findings back to their action point origin is absent.
- Files: `src/data-access/rbia-findings.ts`, `prisma/schema.prisma`
- Impact: Audit trail for finding escalation is broken; can't trace an Observation back to its originating ActionPoint.
- Fix approach: Add `sourceActionPointId` field to `Observation` model in Phase 20, with migration.

**Onboarding Store Not Scoped to Tenant:**

- Issue: `src/stores/onboarding-store.ts` line 31: `// TODO: Scope by authenticated user/tenant ID when auth is implemented (Phase 11)`. The Zustand store uses a flat key without tenant scoping.
- Files: `src/stores/onboarding-store.ts`
- Impact: In multi-tenant environments, onboarding state from one session could bleed into another if two tenants onboard on the same browser.
- Fix approach: Key the store by `tenantId` obtained from session.

**Unimplemented ATR Submit:**

- Issue: `src/components/regulatory/atr-form.tsx` line 33 has `// TODO: Implement submit ATR action`. The Action Taken Report submission is a UI stub with no server action wired.
- Files: `src/components/regulatory/atr-form.tsx`, `src/actions/regulatory/submit-atr.ts`
- Impact: Regulatory ATR workflow is non-functional; users cannot submit ATRs from the form.
- Fix approach: Implement and wire `submitAtrAction` server action.

**Deposit Data Source Not Integrated:**

- Issue: `src/lib/investment-compliance.ts` line 111: `// TODO: Integrate with deposit data source`. Investment compliance calculations fall back to placeholder values where deposit data is needed.
- Files: `src/lib/investment-compliance.ts`
- Impact: Investment compliance metrics may be inaccurate.
- Fix approach: Define the deposit data source (DB model or external feed) and integrate the query.

**Analytics Period Selector Missing:**

- Issue: `src/app/(dashboard)/analytics/page.tsx` line 122: `{/* TODO: Period selector using getRbiaAnalyticsByPeriod */}`. The analytics page lacks a period filter UI.
- Files: `src/app/(dashboard)/analytics/page.tsx`, `src/data-access/rbia-analytics.ts`
- Impact: Users can only view default period analytics; no historical comparison.
- Fix approach: Add period selector component wired to `getRbiaAnalyticsByPeriod`.

**BM Response Deadline Hard-Coded:**

- Issue: `src/actions/rbia/freeze.ts` line 279: `const deadlineDays = 15; // TODO Phase 23: read from tenant.settings.bmResponseDeadlineDays`. Deadline is hard-coded instead of per-tenant configurable.
- Files: `src/actions/rbia/freeze.ts`
- Impact: All tenants share the same 15-day deadline regardless of their operational requirements.
- Fix approach: Add `bmResponseDeadlineDays` to `Tenant.settings` JSONB and read from there in Phase 23.

## Known Bugs

**Dashboard PostgreSQL Views Not in Migrations:**

- Symptoms: After a fresh deploy or `db:push`, the four dashboard views (`v_compliance_summary`, `v_observation_severity`, `v_audit_coverage_branch`, `fn_dashboard_health_score`) are missing, causing 500 errors on `/dashboard` and `/analytics`.
- Files: `prisma/migrations/`, `prisma/*.sql`
- Trigger: Any fresh database provisioning — new VPS, Docker rebuild, CI test database.
- Workaround: Manually apply the view SQL files from `prisma/*.sql` after deploy. Not automated.

**AWS SDK v3 Type Mismatch in S3:**

- Symptoms: `getSignedUrl` in `src/lib/s3.ts` requires `as any` casts (lines 106, 121) to work around a type incompatibility between `@aws-sdk/s3-request-presigner` and `@aws-sdk/client-s3`.
- Files: `src/lib/s3.ts`
- Trigger: Present at compile time; suppressed with `eslint-disable` comments.
- Workaround: Cast `S3Client` instance to `any`. Needs AWS SDK version alignment.

**SES Sandbox — Email Only to Verified Addresses:**

- Symptoms: Transactional emails (assignment, escalation, digest) fail silently for unverified recipient addresses.
- Files: `src/lib/ses.ts`, `src/emails/`, `src/jobs/`
- Trigger: Any email sent to a non-verified address in AWS SES sandbox mode.
- Workaround: Add recipient addresses to SES verified list manually. Production SES access pending AWS approval.

## Security Considerations

**Application-Level Tenant Isolation Only:**

- Risk: There are no PostgreSQL Row Level Security (RLS) policies. Tenant isolation is enforced entirely by `WHERE tenantId = ?` clauses in DAL functions. Any DAL function that omits the clause exposes cross-tenant data.
- Files: `src/data-access/prisma.ts`, all `src/data-access/*.ts` files
- Current mitigation: `prismaForTenant(tenantId)` returns the singleton client; DAL functions manually append `tenantId`. Unit test in `src/data-access/__tests__/tenant-isolation.test.ts` spot-checks isolation.
- Recommendations: Add PostgreSQL RLS as a defense-in-depth layer. Audit all 39 DAL files to confirm every query has a `tenantId` filter.

**`tenantId` Must Never Come from URL/Body:**

- Risk: If any server action or API route reads `tenantId` from request body or URL params instead of the session, a malicious user could submit another tenant's ID.
- Files: `src/actions/` (81 files), `src/app/api/` routes
- Current mitigation: CLAUDE.md mandates `getRequiredSession()` always; code review enforces this.
- Recommendations: Add a static analysis rule (ESLint custom rule) that forbids reading `tenantId` from `params` or `body` in server actions.

**Rate Limiting is In-Memory:**

- Risk: The 10-login-attempts-per-IP / 15-minute rate limiter in Better Auth is process-local. Under PM2 cluster mode or multi-container Docker, each process has independent counters, making brute-force attacks possible across processes.
- Files: `src/lib/auth.ts`
- Current mitigation: `FailedLoginAttempt` table in DB provides persistent lockout after 5 attempts per user (not per IP).
- Recommendations: Move IP-level rate limiting to Redis or a DB-backed counter, or enforce at Nginx level.

**NEXT_PUBLIC vars Inlined at Build Time:**

- Risk: `NEXT_PUBLIC_*` environment variables are baked into the client bundle at build time. If a secret is accidentally prefixed with `NEXT_PUBLIC_`, it becomes publicly visible.
- Files: `src/env.ts`, `Dockerfile`
- Current mitigation: Only non-secret values (app URL, region) are `NEXT_PUBLIC_`. Documented in MEMORY.md.
- Recommendations: Periodic audit of `NEXT_PUBLIC_` variable list to ensure no secrets are included.

## Performance Bottlenecks

**`src/data-access/dashboard.ts` — 1,160 Lines, Multiple Heavy Queries:**

- Problem: Dashboard data access layer aggregates 10+ complex queries (compliance summary, observation severity, coverage, health score) in a single file. The dashboard API route at `src/app/api/dashboard/route.ts` runs these sequentially or in batches.
- Files: `src/data-access/dashboard.ts`, `src/app/api/dashboard/route.ts`
- Cause: Dashboard views (`v_compliance_summary` etc.) are PostgreSQL views without indexes. With growing data, full-table scans degrade.
- Improvement path: Materialized views with scheduled refresh; add `DashboardSnapshot` model (already exists in schema) for caching aggregated results.

**`src/components/pdf-report/rbia-report-document.tsx` — 1,366 Lines:**

- Problem: Single React PDF component handles the entire RBIA report layout. PDF generation is synchronous and CPU-bound via `@react-pdf/renderer`, running in the main process.
- Files: `src/components/pdf-report/rbia-report-document.tsx`, `src/actions/reports/generate-pdf.ts`
- Cause: `@react-pdf/renderer` is externalized (`serverExternalPackages`) but still blocks the Node.js event loop during render.
- Improvement path: Move PDF generation to a pg-boss background job; return a signed S3 URL when done.

**Large XLSX Export Queries:**

- Problem: `src/data-access/exports.ts` and `src/data-access/reports.ts` (29 result references) pull full datasets for XLSX generation with no pagination or streaming.
- Files: `src/data-access/exports.ts`, `src/data-access/reports.ts`, `src/actions/reports/generate-xlsx.ts`
- Cause: ExcelJS builds the workbook in memory; large datasets (1000+ rows) can exhaust heap.
- Improvement path: Stream rows using Prisma cursor-based pagination into ExcelJS streaming writer.

**`src/components/rbia/rbia-examination-tree.tsx` — 1,179 Lines:**

- Problem: Single component renders the full examination tree with all interactions. Large trees (depth 0-5, potentially hundreds of nodes) re-render the entire tree on any state change.
- Files: `src/components/rbia/rbia-examination-tree.tsx`
- Cause: No virtualization; React re-renders the full node list on score updates.
- Improvement path: Use `react-virtual` or `@tanstack/react-virtual` for tree virtualization; memoize leaf nodes.

## Fragile Areas

**DB Triggers Applied Outside Prisma Migrations:**

- Files: `prisma/migrations/`, `prisma/*.sql`
- Why fragile: Audit triggers and the `BranchRbiaScore` immutability trigger are applied via standalone SQL files, not tracked in Prisma migrations. They can be lost after `db:push` or a fresh deploy.
- Safe modification: Always apply trigger SQL manually after any schema reset. Document in deploy runbook.
- Test coverage: No automated test verifies trigger presence post-deploy.

**`src/lib/engagement-state-machine.ts` — State Transitions:**

- Files: `src/lib/engagement-state-machine.ts`, `src/lib/state-machine.ts`
- Why fragile: The 8-state engagement lifecycle (`PLANNED → TEAM_ASSIGNED → ... → COMPLETED`) relies on the state machine enforcing valid transitions. The `as any` cast in `engagement-state-machine.ts` bypasses type safety on transition payloads.
- Safe modification: Always run the full E2E flow test after changing transition logic. Do not bypass `transitionEngagement()` with direct DB updates.
- Test coverage: No dedicated unit tests for state machine transition guards.

**`src/jobs/` — pg-boss Job Registration via Instrumentation Hook:**

- Files: `src/instrumentation.ts`, `src/jobs/overdue-escalation.ts`, `src/jobs/weekly-digest.ts`, `src/jobs/rbia-overdue-escalation.ts`, `src/jobs/deadline-reminder.ts`
- Why fragile: Jobs are registered in `src/instrumentation.ts` which runs once on server startup. If the instrumentation hook fails silently, all background jobs stop without error logging to users.
- Safe modification: Wrap job registration in try/catch with explicit pino error logging. Add a health endpoint that checks pg-boss queue status.
- Test coverage: No automated tests for job scheduling or execution.

**Onboarding Multi-Step Wizard State:**

- Files: `src/app/(onboarding)/onboarding/_components/onboarding-wizard.tsx`, `src/stores/onboarding-store.ts`
- Why fragile: Wizard state persists in Zustand (localStorage-backed). If schema evolves (new required step), persisted state from an old onboarding attempt can cause the wizard to skip required steps or crash.
- Safe modification: Add a schema version key to the store; clear and reset if version mismatches.
- Test coverage: No E2E test covers the full 5-step onboarding flow end-to-end.

**`eslint-disable-line react-hooks/exhaustive-deps` in Onboarding:**

- Files: `src/app/(onboarding)/onboarding/_components/onboarding-wizard.tsx:85`, `src/app/(onboarding)/onboarding/_components/step-3-rbi-directions.tsx:131`, `src/app/(onboarding)/onboarding/_components/step-4-org-structure.tsx:153`, `src/app/(onboarding)/onboarding/_components/step-5-user-invites.tsx:131`
- Why fragile: Suppressed exhaustive-deps warnings mask potential stale closure bugs. Effects that depend on functions or values not in the deps array may not re-run when those values change.
- Safe modification: Audit each suppressed effect and add proper deps or use `useCallback` stabilization.

## Scaling Limits

**PostgreSQL Connection Pool — Max 25:**

- Current capacity: `pg.Pool` configured with `max: 25` connections.
- Limit: Under high concurrency (many simultaneous dashboard loads, exports, or job runs), the pool exhausts and requests queue or time out.
- Scaling path: Introduce PgBouncer connection pooler in front of PostgreSQL; increase pool size with caution (VPS has 16GB RAM).

**Single-Process pg-boss Job Queue:**

- Current capacity: pg-boss runs in-process within the Next.js server. All background jobs compete with HTTP request handling for CPU and memory.
- Limit: Under heavy audit periods (many concurrent XLSX/PDF exports + escalation jobs), the Node.js event loop can stall HTTP responses.
- Scaling path: Extract pg-boss workers to a separate worker process/container with its own `instrumentation.ts` entry point.

**In-Memory Rate Limiting (Login):**

- Current capacity: Per-process counters reset on restart.
- Limit: Multi-container deployments (Docker Swarm / multiple PM2 workers) each maintain independent counters.
- Scaling path: Replace with Redis-backed rate limiter or Nginx `limit_req` module.

## Dependencies at Risk

**`@prisma/adapter-pg` + Prisma 7 (Early Adopter):**

- Risk: Prisma 7 with the `pg` adapter (instead of the default `pg-native` or connection URL) is a relatively new pattern. Breaking changes in minor Prisma releases could break the adapter integration.
- Impact: All database queries would fail.
- Migration plan: Pin Prisma version in `package.json`; monitor Prisma changelog before upgrading.

**`@react-pdf/renderer` — Externalized, No Streaming:**

- Risk: The library has known memory issues with large documents. It's pinned via `serverExternalPackages` but any version bump can change rendering behavior.
- Impact: PDF generation for large RBIA reports could fail with OOM errors.
- Migration plan: Consider `pdf-lib` or server-side Puppeteer rendering as fallback for large reports.

**`better-auth` — Auth Layer:**

- Risk: `better-auth` is a relatively young library (not established like NextAuth/Auth.js). API surface is still evolving; minor version bumps have introduced breaking changes historically.
- Impact: Session invalidation, login failures, or RBAC breakage.
- Migration plan: Pin version; test auth flows after any upgrade. Keep migration path to Auth.js documented.

## Missing Critical Features

**No PostgreSQL RLS:**

- Problem: Tenant isolation relies solely on application-level WHERE clauses. A single missed `tenantId` filter in any of the 39 DAL files exposes cross-tenant data.
- Blocks: SOC2/ISO27001 compliance; enterprise sales to security-conscious banks.

**No Automated DB View / Trigger Deployment:**

- Problem: Dashboard views and audit triggers are applied manually via SQL files after every fresh deploy. There is no migration tracking for these objects.
- Blocks: Reliable CI/CD; automated staging environment provisioning.

**No Background Job Health Endpoint:**

- Problem: There is no `/api/health/jobs` or similar endpoint to verify that pg-boss workers are registered and running.
- Blocks: Operational monitoring; alerts when escalation or digest jobs silently stop.

## Test Coverage Gaps

**State Machine Transitions:**

- What's not tested: Valid and invalid `EngagementStatus` transitions in `src/lib/engagement-state-machine.ts`.
- Files: `src/lib/engagement-state-machine.ts`, `src/lib/state-machine.ts`
- Risk: Regression silently allows invalid status transitions (e.g., `PLANNED → COMPLETED` skipping required steps).
- Priority: High

**Background Jobs:**

- What's not tested: pg-boss job handlers in `src/jobs/overdue-escalation.ts`, `src/jobs/weekly-digest.ts`, `src/jobs/rbia-overdue-escalation.ts`, `src/jobs/deadline-reminder.ts`.
- Files: `src/jobs/`
- Risk: Escalation logic bugs, notification failures, or job crashes go undetected until production users report missing alerts.
- Priority: High

**RBIA Scoring / Roll-up Engine:**

- What's not tested: The weighted score roll-up, critical-item cap, and rating band assignment in `src/data-access/rbia-scoring.ts` and `src/services/`.
- Files: `src/data-access/rbia-scoring.ts`, `src/services/`
- Risk: Wrong RBIA scores silently produced; regulatory compliance scores reported incorrectly to RBI.
- Priority: High

**Server Actions Authorization:**

- What's not tested: Permission checks in the 81 server actions under `src/actions/`. Only tenant isolation is spot-checked in `src/data-access/__tests__/tenant-isolation.test.ts`.
- Files: `src/actions/` (81 files)
- Risk: A role without a required permission could invoke a server action if the permission check is miscoded.
- Priority: Medium

**Onboarding Wizard Full Flow:**

- What's not tested: The 5-step onboarding wizard (`step-1` through `step-5`) has no E2E test covering the complete flow.
- Files: `src/app/(onboarding)/onboarding/_components/`
- Risk: A step regression blocks all new tenant registration.
- Priority: Medium

---

_Concerns audit: 2026-02-25_
