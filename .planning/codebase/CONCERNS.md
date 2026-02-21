# Codebase Concerns

**Analysis Date:** 2026-02-21

## Tech Debt

**Application-level Tenant Isolation (No PostgreSQL RLS):**

- Issue: Tenant isolation enforced via WHERE clauses in every DAL function, not via PostgreSQL Row-Level Security policies
- Files: `src/lib/prisma.ts`, `src/data-access/*.ts` (39 files)
- Impact: Risk of bugs in DAL functions omitting WHERE tenantId = ? clauses; single missed WHERE clause exposes data across tenants
- Current status: Validation exists in `prismaForTenant()` to ensure UUID format, but no database-level enforcement
- Fix approach: Implement PostgreSQL RLS policies on all tenant-scoped tables with POLICY statements; enable via SET LOCAL in per-connection transactions (requires rearchitecting transaction handling to prevent P2028 timeouts)

**Removed Transaction Wrapping for Tenant Context:**

- Issue: Previous implementation wrapped every Prisma query in $transaction with SET LOCAL for RLS; removed due to P2028 errors under concurrent load (10+ SSR queries competing for max 25 pool connections)
- Files: `src/lib/prisma.ts` (lines 47-61)
- Impact: Zero database-level tenant isolation enforcement; single-threaded mode OK for MVP, but scaling to 10+ concurrent tenants/VPS will expose this gap
- Current mitigation: Application-level WHERE clauses + UUID validation in `prismaForTenant()`
- Fix approach: Implement middleware to set tenant context per-connection (not per-query), or switch to connection pooler with per-connection local variables (PgBouncer with session pooling)

**Large Prisma Schema (1999 lines, 63 models):**

- Issue: Monolithic schema makes it difficult to navigate relationships and understand data model structure
- Files: `prisma/schema.prisma`
- Impact: Onboarding time for new developers; harder to spot circular relationships or constraint violations
- Fix approach: Split schema into logical domain files (e.g., `prisma/auth.prisma`, `prisma/audit.prisma`, `prisma/compliance.prisma`) with Prisma's `include` directive, or add comprehensive ER diagram documentation

**Insufficient Pagination Implementation:**

- Issue: Only 34 instances of pagination patterns found across 39 DAL files; many list endpoints may return unbounded result sets
- Files: `src/data-access/*.ts`
- Impact: Memory exhaustion on tables with 10k+ records (observations, examination responses, audit logs); slow API responses
- Fix approach: Add take/skip parameters to all DAL functions that return multiple rows; implement cursor-based pagination for large datasets; add database indexes on sort/filter columns

**Missing N+1 Query Prevention:**

- Issue: DAL functions use `include` and `select` heavily (observed in governance.ts), but no query profiling or depth limits enforced
- Files: Multiple DAL files with nested includes
- Impact: Nested includes with multiple levels can fire 50+ queries per page load (e.g., user → roles → permissions → assignments)
- Fix approach: Profile each page with database query logs; add Prisma `select` depth limit; consider DataLoader-style batch loading for related entities

---

## Known Bugs

**Dashboard NaN Values:**

- Symptoms: Risk indicators ("2/8 Audits" text, health score gauge) show "NaN" when no observations exist or aggregation queries return null
- Files: `src/components/dashboard/widgets/risk-indicators.tsx`, `src/components/dashboard/widgets/health-score-gauge.tsx`, `src/data-access/dashboard.ts`
- Trigger: Navigate to `/dashboard` as new user with no audit engagements; or after bulk delete of observations
- Root cause: Aggregation queries (COUNT, SUM, AVG) return null for empty sets; component doesn't handle null → displays NaN
- Current code: Dashboard composer sets empty defaults (e.g., EMPTY_SEVERITY, EMPTY_AGING) but aggregation layer not returning these
- Workaround: Create dummy observation in seed or wait for first audit to start
- Fix approach: Coalesce(COUNT(\*), 0) in aggregation queries; add null checks in dashboard widgets with explicit zero fallback

**SES Sandbox Mode (Email Delivery Restricted):**

- Symptoms: Emails only deliver to verified addresses in AWS SES; all other recipients receive bounce notifications
- Files: `src/lib/ses.ts`, `src/jobs/notification-processor.ts`
- Trigger: Send audit assignment or escalation email to unverified address
- Impact: Demo/testing blocked; production email delivery awaits AWS SES production access request
- Current status: Code path works; SES API accepts requests; verified addresses receive emails correctly
- Workaround: Add test addresses to SES verified identities in AWS console, or test with `--dry-run` flag
- Fix approach: Request SES production access from AWS; implement fallback logger if SES unavailable (set `SKIP_SES=1` to disable)

**Missing Index Pages (404 Errors):**

- Symptoms: `/audit-execution` and `/admin` return 404 Not Found
- Files: `src/app/(dashboard)/audit-execution/page.tsx` and `src/app/(dashboard)/admin/page.tsx` do not exist
- Trigger: Navigate directly to root URL; only nested routes exist (e.g., `/audit-execution/[id]/sections`)
- Impact: Users must know specific engagement/user IDs to access nested pages; no index to browse all engagements/users
- Workaround: Redirect to first accessible resource or build search page
- Fix approach: Create index pages at `src/app/(dashboard)/audit-execution/page.tsx` and `src/app/(dashboard)/admin/page.tsx` with table views and search

**Dashboard Views Not Applied After Fresh Deployment:**

- Symptoms: Dashboard aggregation queries return empty/null after `prisma db push` on fresh instance
- Files: `prisma/migrations/*.sql`, `src/data-access/dashboard.ts`
- Trigger: Fresh database setup; `prisma db push` executes Prisma migrations but custom SQL views are not applied
- Root cause: 4 PostgreSQL views/functions (`v_compliance_summary`, `v_observation_severity`, `v_audit_coverage_branch`, `fn_dashboard_health_score`) created via standalone SQL migration files, not in `schema.prisma`
- Current status: Views are in migration SQL files but not tracked as Prisma native objects
- Fix approach: Refactor to Prisma views using `view` keyword in schema (Prisma v7 supports views), or document manual SQL application step in deployment runbook

**Seed Data Mismatch (Production vs. Local):**

- Symptoms: Production database has minimal seed (2 tenants, 4 users); local dev database has comprehensive seed (10 users, full RBI directories)
- Files: `prisma/seed.ts` (comprehensive), production deployment script (minimal)
- Trigger: Switching between local dev and production environments
- Impact: Features work in dev with full seed data but fail in production (e.g., RAM parameters, examination areas)
- Workaround: Manually run `pnpm db:seed` on production or ensure seed script runs post-deploy
- Fix approach: Audit production DB to confirm all required seed data exists; add verification script to post-deploy checklist

---

## Security Considerations

**Tenant Isolation via Application Code Only (No Database-Level Enforcement):**

- Risk: If a single WHERE tenantId = ? clause is omitted from any DAL function, data from other tenants leaks (cross-tenant exposure)
- Files: `src/data-access/*.ts` (39 files), `src/actions/*.ts` (81 files)
- Current mitigation:
  - UUID validation in `prismaForTenant()` ensures only session tenantId is passed
  - Manual code review of every DAL/action function
  - Only `getRequiredSession()` provides tenantId (not from URL/body)
  - Audit log captures all data access
- Recommendations:
  - Add database-level RLS policies to enforce tenant boundaries at storage layer
  - Implement automated linting rule to detect missing WHERE tenantId checks (e.g., custom ESLint rule)
  - Quarterly security audit of all DAL functions
  - Consider leveraging Prisma's new schema-based tenant context feature (when released)

**Environment Variable Validation Bypassed in Docker Builds:**

- Risk: `SKIP_ENV_VALIDATION=1` allows builds without secret validation; secrets passed at runtime could be missing, causing silent failures
- Files: `src/env.ts`, `Dockerfile`
- Current usage: Docker builds for CI/CD skip validation to avoid needing secrets at build time
- Impact: Production builds could ship without DATABASE_URL, BETTER_AUTH_SECRET, or S3 credentials and fail silently at startup
- Recommendations:
  - Add startup health check that verifies critical env vars before binding to port
  - Log clear error messages if required secrets are missing at boot time
  - Consider separating build-time (optional) and runtime (critical) validation layers

**Account Lockout Plugin Allows Brute Force on Multiple IPs:**

- Risk: Rate limiting and account lockout are per-IP; attacker can brute force from multiple IPs simultaneously
- Files: `src/lib/auth-lockout-plugin.ts`, `src/lib/auth.ts` (lines 56-81)
- Current config: 10 login attempts per IP per 15 minutes; 5 failures lock account for 30 minutes
- Impact: Account lockout only effective if attacker from single IP; multi-IP attack bypasses limits
- Current mitigation: Email address + strong password requirement, but no active detection of distributed brute force
- Recommendations:
  - Implement challenge/captcha after 2-3 failed attempts (per-email, not per-IP)
  - Add suspicious login detection (flagging new IP/device combinations)
  - Implement exponential backoff per email (not just per IP)
  - Log all failed attempts to centralised logging for SOC analysis

**No Input Validation on API Search Parameters:**

- Risk: API endpoints accept raw search parameters without validation; potential for injection or bypass
- Files: `src/app/api/is-audit/checklist/route.ts`, `src/app/api/dashboard/route.ts`, `src/app/api/download/route.ts`
- Example: `const category = searchParams.get("category")` used directly without schema validation
- Impact: Malformed queries could cause database errors or expose error messages with sensitive info
- Recommendations:
  - Add Zod schema validation to all search parameter parsing
  - Return 400 Bad Request with schema error details (not full stack traces)
  - Add request/response logging to API handlers for audit trail

---

## Performance Bottlenecks

**Concurrent SSR Queries Causing Connection Pool Exhaustion:**

- Problem: Dashboard SSR fires 10-15 parallel Prisma queries; with max pool size 25, heavy concurrent user load (20+ users) can exhaust connections
- Files: `src/lib/prisma.ts` (line 13: max 25 connections), `src/app/(dashboard)/layout.tsx`
- Cause: Each query holds a connection for the duration of the query + rendering
- Current symptom: None observed in current 4-user production; would emerge at 10+ concurrent users
- Improvement path:
  - Monitor `pg.Pool.waitingCount` metric; alert if > 5
  - Reduce parallel query depth (fetch data in two phases: essential + lazy-loaded)
  - Increase pool size to 50 for mid-tier deployments (requires increased VPS RAM)
  - Implement query caching (Redis) for frequently-accessed data (compliance summaries, risk indicators)
  - Use Prisma batch queries (`$transaction` with all queries in one call) to reduce round trips

**Inefficient Aggregation Queries for Dashboard Widgets:**

- Problem: Each dashboard widget independently queries database for aggregation (compliance count, severity distribution, aging buckets); could fire 20+ queries per page
- Files: `src/data-access/dashboard.ts`, individual widget components
- Cause: Widgets designed to fetch only their own data; no shared aggregation query
- Improvement path:
  - Consolidate all dashboard aggregations into single query with multiple GROUP BY and COUNT DISTINCT operations
  - Cache dashboard data with 5-minute TTL (using Redis or Upstash)
  - Consider materialized view for frequently-accessed metrics (requires PostgreSQL 12+)
  - Use database query profiling (EXPLAIN ANALYSE) to identify slow GROUP BY operations

**Large JSON Serialization in API Responses:**

- Problem: API endpoints return full nested objects (e.g., `/api/dashboard` with all widget data); responses can exceed 1MB for large tenants
- Files: `src/app/api/dashboard/route.ts`, export APIs
- Cause: No response compression or field limiting
- Improvement path:
  - Add gzip compression middleware to Next.js (default in production, but may not apply to all endpoints)
  - Implement field selection (e.g., `?fields=healthScore,compliance` to reduce payload)
  - Paginate large arrays (observations, compliance items) instead of returning all at once
  - Consider GraphQL to allow clients to specify exact fields needed

---

## Fragile Areas

**Observation Lifecycle State Machine (7 States, Multiple Transitions):**

- Files: `src/data-access/observations.ts`, `src/actions/observations/*.ts`, `prisma/schema.prisma` (enum ObservationStatus)
- Why fragile: Observation can transition between DRAFT → SUBMITTED → REVIEWED → ISSUED → RESPONSE → COMPLIANCE → CLOSED; missing validation in any action allows invalid state transitions
- Safe modification: Always check current status before allowing transition; document valid transitions in code; add state machine diagram to docs
- Test coverage: 2 E2E tests cover full lifecycle (observation-lifecycle.spec.ts), but no unit tests for individual transitions
- Risk: New features adding transitions (e.g., ESCALATED state) could break existing workflow

**Escalation Router (4-Level Priority Logic):**

- Files: `src/lib/escalation-router.ts`, `src/jobs/overdue-escalation.ts`
- Why fragile: Complex routing logic assigns escalations to L1-L4 users based on role hierarchy; single buggy condition could route to wrong person
- Safe modification: Add unit tests for each escalation rule; document role hierarchy explicitly; add data validation to ensure target users have required roles
- Test coverage: Permission guards tested (permission-guards.spec.ts), but no unit tests for escalation logic itself
- Risk: Adding new roles or permission levels could break escalation routing

**Concurrent Session Management:**

- Files: `src/lib/auth.ts` (multiSession plugin, max 2 sessions), `src/lib/auth-lockout-plugin.ts`
- Why fragile: Enforces max 2 sessions per user; if new session exceeds limit, oldest session is invalidated, but user doesn't know
- Safe modification: Log session invalidation event to user's audit trail; add notification when session expires
- Test coverage: No unit tests for session limit enforcement
- Risk: Users losing work if 3rd browser tab causes session 1 to invalidate without warning

**Referential Integrity with Cascading Deletes:**

- Files: `prisma/schema.prisma` (20+ relations with onDelete: Cascade)
- Why fragile: Deleting a Tenant cascades to all users, observations, engagements, etc.; single delete query can wipe 100k+ records
- Safe modification: Use soft deletes (add `deletedAt` column) instead of hard delete; add archive tables for compliance; implement restore functionality
- Test coverage: No tests for delete cascades
- Risk: Accidental tenant delete wipes all data; no recovery path beyond database backup

**Investigation Template and IS Audit Checklist Coupling:**

- Files: `src/actions/investment/manage-is-audit.ts`, `src/app/(dashboard)/is-audit/page.tsx`
- Why fragile: IS Audit checklist generation depends on pre-configured templates; if templates are missing or malformed, checklist generation fails silently
- Safe modification: Add validation to check template existence before allowing checklist creation; add fallback default template; log template not found errors
- Test coverage: No tests for template-less scenario
- Risk: Users unable to create IS audit checklists if templates deleted or corrupted

---

## Scaling Limits

**Connection Pool Exhaustion at 10-20 Concurrent Users:**

- Current capacity: pg.Pool max 25 connections; supports ~8-10 concurrent SSR page loads (each firing 10-15 queries)
- Limit: 10+ concurrent users → connection queue → 30+ second page load times → 504 Gateway Timeout
- Scaling path:
  1. Monitor pool utilization (log when waitingCount > 5)
  2. Increase pool to 50 (requires 1GB+ additional VPS RAM for connection buffers)
  3. Implement query caching (Redis) to reduce per-request queries
  4. Move to PgBouncer connection pooler to share connections across Node.js workers
  5. Split reads to read replica (requires managed PostgreSQL)

**Dashboard Aggregation Queries Slow at 10k+ Observations:**

- Current performance: Completes in <500ms with 1k observations
- Limit: At 10k+ observations, GROUP BY queries slow to 2-5 seconds (blocks page rendering)
- Scaling path:
  1. Add database indexes: `CREATE INDEX idx_observations_status_tenant ON "Observation"(tenantId, status)`
  2. Implement materialized view with 5-minute refresh
  3. Archive old observations (6+ months closed) to separate table
  4. Consider time-series database (ClickHouse, TimescaleDB) if observation volume exceeds 1M

**Audit Log Table Growth:**

- Current: ~500 audit log entries per day (at 4 users); grows at 2.5MB/month with full serialization
- Limit: At 100 users, grows to 125MB/month; after 12 months, 1.5GB table → slow query times
- Scaling path:
  1. Archive audit logs older than 12 months to cold storage (S3)
  2. Implement partitioning by createdAt month
  3. Add TTL policy for log retention (e.g., delete after 2 years)
  4. Consider log aggregation service (Datadog, New Relic) for long-term storage

**S3 Bucket Storage for Evidence Files:**

- Current: ~10 files/tenant (300 files total); estimated 50MB across production
- Limit: At 1000 tenants with 100 files each, 5TB storage cost ~$115/month (not a hard limit, but cost consideration)
- Scaling path:
  1. Implement S3 lifecycle policies (transition to Glacier after 1 year)
  2. Add virus scanning on upload (using Lambda + ClamAV)
  3. Implement storage quota per tenant (e.g., 1GB max)
  4. Consider S3 Intelligent-Tiering for automatic cost optimization

---

## Dependencies at Risk

**Better Auth Framework (Early-Stage):**

- Risk: Better Auth v0.x; API may change; community smaller than Clerk/Auth0
- Files: `src/lib/auth.ts`, `src/lib/auth-lockout-plugin.ts`, entire auth flow
- Impact: Framework update could require significant refactoring; bugs may have slower fixes
- Current mitigation: Custom lockout plugin provides buffer against core framework changes
- Migration plan: If Better Auth development stalls, can migrate to Clerk (manages sessions) or NextAuth.js (open source, slower updates)

**pg-boss for Background Jobs (Requires PostgreSQL):**

- Risk: No external job queue; job failures don't trigger alerts; single database failure stops all async work
- Files: `src/jobs/*.ts`, `src/lib/job-queue.ts`
- Impact: Email notifications, escalations, and digest jobs fail silently if database unavailable
- Current mitigation: Retry logic with exponential backoff; job status persisted to database
- Scaling path:
  1. Add Slack webhook for failed job alerts
  2. Implement job timeout (jobs running >30min auto-fail)
  3. Consider BullMQ (Redis-based) if jobs exceed 1000/day

**Prisma Client Generation (`src/generated/prisma` 39k lines):**

- Risk: Large generated code footprint; regeneration on every schema change; hidden performance cost
- Files: `src/generated/prisma/*.ts` (all @ts-nocheck files)
- Impact: Build time increases; IDE indexing slower
- Current mitigation: Prisma generates types automatically; no manual intervention needed
- Fix approach: Monitor Prisma version for performance improvements; consider Drizzle ORM as alternative (smaller footprint, type-safe)

**ExcelJS and @react-pdf/renderer (Externalized from Bundle):**

- Risk: Both serverExternalPackages; not bundled with app; missing at runtime causes export failures
- Files: `next.config.ts`, `src/lib/excel-export.ts`, `src/components/pdf-report/*.tsx`
- Impact: Export/report features fail silently if packages not in node_modules at deploy time
- Current mitigation: Declared in package.json; included in Docker image
- Fix approach: Add health check at startup to verify packages are importable

---

## Missing Critical Features

**No Backup/Restore Capability:**

- Problem: No self-serve backup functionality; database backups managed externally via VPS snapshots
- Impact: Data loss risk if backup not run; no audit trail of backup success
- Priority: High (regulatory requirement for UCBs to maintain data integrity)
- Fix approach: Implement automatic daily backup to S3; add restore functionality to admin panel; log all backup/restore events

**No Role-Based Export Restrictions:**

- Problem: All users can export full audit plan and findings; no data masking for confidential items
- Impact: Risk of exposing sensitive observations to branch heads or auditees
- Priority: Medium (business logic not fully implemented)
- Fix approach: Add export permission checks per role; mask sensitive data fields for non-auditor roles

**No Concurrent Edit Conflict Detection:**

- Problem: If two users edit same observation simultaneously, last write wins (data loss)
- Impact: Loss of concurrent edits
- Priority: Medium (low probability in 4-user system, high risk at scale)
- Fix approach: Add version numbers to entities; implement optimistic locking; warn user if entity edited since their load

**No Bulk Action Undo/Rollback:**

- Problem: Bulk convert gaps to issues, bulk mark compliance items — no undo if user clicks wrong button
- Impact: Data cleanup overhead
- Priority: Medium (low frequency but high impact per incident)
- Fix approach: Implement command queue for all bulk actions; add undo button for 5 minutes after bulk action

**No Email Template Management UI:**

- Problem: Email templates hardcoded in `src/emails/*.tsx`; admins cannot customize without code change
- Impact: Email content locked to deployment; no a/b testing capability
- Priority: Low (current templates adequate for MVP)
- Fix approach: Store email templates in database; implement editor in admin panel

---

## Test Coverage Gaps

**No Unit Tests for Business Logic:**

- What's not tested: Risk rating computation, escalation routing, compliance status transitions, investigation effectiveness calculation
- Files: `src/lib/risk-rating-engine.ts`, `src/lib/escalation-router.ts`, `src/services/investigation.ts`, `src/lib/control-effectiveness.ts`
- Risk: Bugs in core business logic undetected until production; no regression tests for future refactoring
- Priority: High (audit logic is core to platform)
- Recommendation: Add 100+ unit tests for business logic; aim for 80%+ coverage of lib/ and services/

**Missing E2E Tests for Multi-Step Workflows:**

- What's not tested: Full observation lifecycle (create → submit → review → issue → respond → close), compliance cascade (branch response → ZAC → ACE → ACB), RAM scoring workflow
- Files: `tests/e2e/observation-lifecycle.spec.ts` (partial), no compliance E2E tests
- Risk: Breaking changes to multi-step workflows only caught in manual QA
- Priority: High (business-critical workflows)
- Recommendation: Add 20+ E2E tests covering primary user journeys (auditor, CAE, CCO, CEO perspectives)

**No Database Constraint Testing:**

- What's not tested: Uniqueness constraints, referential integrity, cascading deletes, foreign key violations
- Files: `prisma/schema.prisma` relations
- Risk: Constraint violations surface in production when user attempts invalid operation
- Priority: Medium
- Recommendation: Add integration tests verifying Prisma schema constraints (e.g., `expect(() => duplicateEmail()).rejects.toThrow("Unique constraint")`)

**No Performance / Load Testing:**

- What's not tested: Dashboard with 10k observations, bulk export with 5k findings, 100+ concurrent users
- Files: No load test suite
- Risk: Performance bottlenecks discovered post-deployment
- Priority: Medium (not critical for 4-user MVP, critical before 100-user scale)
- Recommendation: Add k6 or Artillery load tests simulating 50 concurrent users; set thresholds for 95th percentile response time

**No Security Tests:**

- What's not tested: SQL injection prevention, XSS in user input fields, CSRF on state-changing actions, permission bypass attempts
- Files: No security-focused tests
- Risk: Security vulnerabilities in hidden code paths (e.g., search parameters)
- Priority: High (live production system)
- Recommendation: Add OWASP Top 10 test suite; run security scanner (npm audit, Snyk) in CI pipeline

---

## Architectural Concerns

**No Caching Strategy (All Queries Hit Database):**

- Issue: Every page load re-queries all dashboard metrics, compliance summaries, risk indicators
- Files: `src/data-access/dashboard.ts`, all widget components
- Impact: Database load spikes at peak hours; no staleness acceptable for metrics refreshing every 5-10 minutes
- Fix approach: Implement Redis caching layer with 5-minute TTL for aggregation queries; invalidate cache on mutation

**No Search Index (Brute-Force Database Queries):**

- Issue: Finding observations or compliance items by name requires full table scan
- Files: `src/data-access/observations.ts` (includes @db.Gin for text search), no search UI
- Impact: Search slow on large datasets; no typeahead autocomplete
- Fix approach: Add PostgreSQL full-text search index (already enabled with pg_trgm extension); implement typeahead API with ILIKE queries limited to top 20 results

**Monolithic Next.js App (52 pages, 213 components):**

- Issue: Single codebase handles auth, dashboard, audit execution, compliance, reporting, admin panels; hard to split for independent scaling
- Files: `src/app/`, `src/components/`
- Impact: Cannot scale frontend independently; large bundle size (report features add @react-pdf/renderer overhead)
- Fix approach: Long-term: split into micro frontends (separate repos for auditor app, CAE app, CEO app); near-term: implement route-based code splitting and lazy load report components

**No API Rate Limiting Per User:**

- Issue: Rate limiting is per IP; single user can DOS system by polling `/api/dashboard` 1000x/sec
- Files: `src/lib/auth.ts` (login rate limit only), no per-endpoint user limits
- Impact: DOS attack vector
- Fix approach: Add Upstash rate limiting (Redis-backed) with per-user token bucket (100 requests/minute default)

---

## Database Concerns

**No Soft Delete Implementation:**

- Issue: Hard deletes cascade (tenant delete wipes 100k+ records); no audit trail of deleted data
- Files: `prisma/schema.prisma` (onDelete: Cascade on multiple relations)
- Impact: Data recovery impossible; regulatory concern for UCBs required to retain audit data
- Fix approach: Add `deletedAt` DateTime optional field to all entities; add scope middleware to hide soft-deleted records; implement restore functionality

**Missing Database Indexes on Foreign Keys:**

- Issue: Many foreign key columns lack explicit indexes; join queries slow on large tables
- Files: `prisma/schema.prisma`
- Impact: Slow queries on observation.engagementId, complianceItem.auditeeId when millions of records exist
- Fix approach: Audit schema to identify all FK columns; add `@db.Index` annotations; run EXPLAIN ANALYSE on slow queries to verify indexes are used

**No Partitioning for Time-Series Data:**

- Issue: AuditLog and other time-series tables grow unbounded; single-partition queries scan entire table
- Files: `src/data-access/audit-trail.ts`
- Impact: Queries for "logs from last week" slow as table grows to 1GB+
- Fix approach: Partition tables by month or quarter; implement archive table for old records; update queries to use partition pruning

---

## Operational Concerns

**No Monitoring/Alerting on Live System:**

- Issue: No health checks, APM, or error tracking in production; failures discovered by user report
- Files: `src/app/api/health/route.ts` exists but not monitored
- Impact: Extended downtime; no visibility into system health; slow incident response
- Fix approach: Deploy Datadog or New Relic APM; set up alerts for 500 errors, slow queries (>2sec), and pod restarts

**Manual Database Migration Process:**

- Issue: Deploying schema changes requires `prisma db push` + manual SQL migrations + view re-application
- Files: `prisma/migrations/`, `prisma/*.sql`
- Impact: Deployment errors if steps missed; no rollback path
- Fix approach: Automate deployment with Helm chart that runs migrations in init container before pod starts; implement zero-downtime schema changes

**No Automated Testing in CI/CD:**

- Issue: No test suite blocks merged commits; only manual QA before production deploy
- Files: `tests/e2e/*.spec.ts` exist but not required to pass for merge
- Impact: Regressions slip into production; no safety net for future development
- Fix approach: Add GitHub Actions workflow requiring E2E tests to pass; add ESLint and type checking gates

**Environment Variable Sprawl:**

- Issue: 15+ environment variables required; no documentation of which are optional vs. critical
- Files: `src/env.ts`, `.env.example`
- Impact: Missing critical var (BETTER_AUTH_SECRET) causes silent auth failure at boot
- Fix approach: Split env vars into tiers (tier-0: critical, tier-1: optional for dev, tier-2: optional); add startup validation logging

---

_Concerns audit: 2026-02-21_
