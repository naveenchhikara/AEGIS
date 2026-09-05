# Claims vs Implementation Matrix

> Wayfinder research ticket #48. Read-only verification of sales/marketing claims
> against the AEGIS codebase. **This document records findings only.** It does not
> reword sales copy and does not decide remediation — that is a separate ticket.

**Verified:** 2026-08-26
**Branch:** `research/claims-audit`
**Method:** static read of source, schema, migrations, deploy assets and in-repo
docs. Nothing was executed against production, the VPS, the live database, or AWS.

> **Note added 2026-09-05.** This document is a dated forensic record and is left
> as written. Several artifacts it cites as evidence have since been deleted from
> the repository — `PROJECT-STATUS.md`, `SECURITY-AUDIT.md`, `deploy/`, `infra/`,
> `docker-compose.prod.yml`, `scripts/setup-s3.sh`, `scripts/ec2-init.sh` — because
> they described a hosted environment that no longer exists. Those citations remain
> resolvable through `git log`. Claim 1 ("zero cloud dependencies") is unaffected:
> S3 and SES are still hard-wired in `src/`. The deployment evidence under claim 4
> now reads differently — AEGIS is not deployed at all, so there is no
> implementation path to time.

> **Note added 2026-09-05 (audit trail).** The audit-coverage finding below is
> also dated. Coverage has since been extended from the 14 tables counted here
> to 24, including the RBIA/GRC scoring tables (`RamAssessment`,
> `RamAssessmentScore`, `ExaminationResponse`, `AuditExaminationResponse`,
> `AccountExamResponse`, `ActionPoint`, `BranchRbiaScore`, `LoanAccount`) in
> #121 and #122, with a build-time guard
> (`src/lib/__tests__/audit-coverage.test.ts`) that fails if a regulated table
> leaves the list. The seed script no longer disables triggers with
> `session_replication_role`; seeds and test fixtures use `withTriggersDetached`
> from `src/lib/audit-triggers.ts`, which is scoped and re-attaches on exit. The
> other caveats in that section have not been re-verified.

## Scope and source caveats

- **The sales/marketing document itself is not in this repository.** Searches
  across the repo root, `docs/`, and the sibling `nexly-advisory/marketing/`
  directory (empty) found no such file. The five claims below are quoted as the
  external code review stated them. Their exact wording in the source document
  could not be confirmed here, so each verdict is on **the claim as phrased in
  the review**, not on verified sales copy.
- The review's own assertions were treated as unverified and re-checked from
  first principles. Where the review is right it is marked so; where it
  understates or overstates, that is noted.
- `CLAUDE.md`, `PROJECT-STATUS.md`, `SUMMARY.md` and `tests/TEST-PLAN.md` carry
  uncommitted working-tree changes. Line numbers for those four files refer to
  the **working tree as read**, not to `HEAD`.
- The in-repo collateral that _does_ make public-facing claims is `README.md`,
  `SUMMARY.md`, `PROJECT-STATUS.md` and `SECURITY-AUDIT.md`. Several of these
  directly contradict the sales claims (see Claim 1) and each other (see
  "Other in-repo collateral" at the end).

---

## Matrix

| #   | Claim                                                              | Verdict                                                         | Current truth (file:line)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Gap                                                                                                                                                                                                                                                                                                                                                | Severity     |
| --- | ------------------------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 1   | "Single-tenant on-premise deployment with zero cloud dependencies" | **FALSE**                                                       | Product describes itself as a **multi-tenant SaaS** in every in-repo doc: `README.md:5`, `SUMMARY.md:5`, `CLAUDE.md:5`, `PROJECT-STATUS.md:126`; vendor-hosted instance at `README.md:7` / `CLAUDE.md:10`. AWS S3 is hard-wired, not pluggable: `src/lib/s3.ts:16` (region literal `"ap-south-1"`), `src/lib/s3.ts:18`, imported directly by 9 call sites with no storage interface. AWS SES is the **only** email transport: `src/lib/ses-client.ts:15-16`, `src/jobs/notification-processor.ts:2,107,158`; no SMTP/nodemailer path exists anywhere in the repo. AWS endpoints are baked into the CSP: `next.config.ts:12,14`. AWS credentials and region are required by the production stack: `docker-compose.prod.yml:60-65`. An AWS CDK stack ships in-repo: `infra/lib/aegis-stack.ts:1-7,57-60`, plus `scripts/setup-s3.sh` and `scripts/ec2-init.sh`. Sentry is the one genuinely optional dependency — DSN-gated at runtime (`sentry.client.config.ts:9-11`, `sentry.server.config.ts:9-11`, `sentry.edge.config.ts:9-11`) — but it is still a hard build dependency (`next.config.ts:58`, `package.json:57`).                                                                                                                                                                                                   | Every element of the claim fails: the architecture is multi-tenant, the reference deployment is vendor-hosted, and two of the three cloud services are hard-wired with no abstraction seam or fallback. Removing S3/SES is a code change, not configuration.                                                                                       | **Critical** |
| 2   | "Hash chain integrity" for the audit log                           | **FALSE**                                                       | `AuditLog` has **no hash, previous-hash, signature or MAC field** — `prisma/schema.prisma:1861-1894` (full field list). The only integrity affordance is `sequenceNumber BigInt @default(autoincrement())` at `prisma/schema.prisma:1863`, and the migration comment states the intent plainly: "Sequence numbers enable gap detection (Decision D9)" — `prisma/migrations/20260209015123_audit_trigger/migration.sql:9`. Immutability is DB permissions, not cryptography: `CREATE RULE ... DO INSTEAD NOTHING` on UPDATE/DELETE and `REVOKE UPDATE, DELETE ... FROM aegis_app` — `prisma/migrations/add_audit_log_rules.sql:15-16,21`. Writes come from `AFTER` row triggers — `.../20260209015123_audit_trigger/migration.sql:13-84`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | No cryptographic chaining exists, so nothing detects modification or reordering of retained rows. **The gap is worse than the review states** — see the four caveats below.                                                                                                                                                                        | **Critical** |
| 3   | "6 roles documented, 17 implemented"                               | **MISLEADING** (second half TRUE, first half unverifiable here) | 17 roles are implemented: `prisma/schema.prisma:17-35`. All 17 have permission entries in `src/lib/permissions.ts:127-393`, but `BOARD_OBSERVER` maps to `[]` and is annotated "Reserved — no permissions yet (DE9)" (`src/lib/permissions.ts:244`, also `:124`) and is excluded from the assignable list, which enumerates 16 (`src/lib/permissions.ts:449-468`). **In-repo documentation says 17, not 6**: `README.md:15`, `README.md:160`, `PROJECT-STATUS.md:129`, `CLAUDE.md:121`. The figure "6" appears nowhere in the repo; the closest small role count is `README.md:119` ("E2E tests authenticate as 5 roles").                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | "17 implemented" is correct but slightly overstated — 16 are assignable and 15 carry non-trivial permissions. The "6 documented" figure cannot be sourced from this repo and must come from the external sales document, which is unavailable here. Documenting 6 while shipping 17 would be a real gap; it just cannot be confirmed against code. | **Medium**   |
| 4   | "2-hour implementation"                                            | **FALSE**                                                       | Nothing in the repo supports a 2-hour setup, and several documented steps have multi-day external dependencies. Required: one-time server bootstrap via git bundle + `sudo` scripts (`deploy/README.md:33-43`); Nginx + Certbot TLS (`PROJECT-STATUS.md:139`, `deploy/nginx-aegis.conf`); out-of-git secrets file (`deploy/README.md:11`); S3 bucket + IAM provisioning (`scripts/setup-s3.sh:1-18`); **SES domain verification with DKIM/SPF/DMARC DNS records plus an AWS production-access request** (`.env.example:43-44`) — still unresolved in production (`PROJECT-STATUS.md:146`, "SES Sandbox Mode ... Production access pending"). At least four SQL files must be applied **by hand, outside the Prisma migration flow**: `prisma/migrations/add_rls_policies.sql:7-8`, `prisma/migrations/add_audit_log_rules.sql:7-8`, `prisma/migrations/20260222_rbia_db_guards.sql:9-10`, `prisma/migrations/20260209_dashboard_views.sql`; confirmed as a live defect at `PROJECT-STATUS.md:147` and `CLAUDE.md:218`. Then a 4-script sequential seed pipeline with documented failure modes and manual SQL cleanups (`docs/SEED-PROCESS-MANUAL.md:16-76`, `:88-129`), plus a known trigger bug that must be re-patched by hand if the DB is recreated (`PROJECT-STATUS.md:149`, `docs/SEED-PROCESS-MANUAL.md:105-116`). | The documented fresh-environment path is a multi-step manual runbook, not a 2-hour install. SES production access alone is an AWS support ticket on the critical path for notifications. No installer, bootstrap wizard, or single-command provisioning exists.                                                                                    | **High**     |
| 5   | "AES-256 at rest"                                                  | **MISLEADING**                                                  | The project's own security audit does not assert this as verified. **DSEC-03 (S3) is "PARTIALLY VERIFIED"** — `SECURITY-AUDIT.md:40-57`: SSE-S3 is inferred from a source comment, and the deny-unencrypted bucket policy is explicitly unverified. That comment is `src/lib/s3.ts:112-116`, which states `ServerSideEncryption` is **deliberately omitted from the presigned PUT**, so object encryption depends entirely on an unverified bucket default. **DSEC-04 (VPS disk) is "REQUIRES VPS VERIFICATION"** — `SECURITY-AUDIT.md:61-75`: LUKS has never been confirmed, and the PostgreSQL data lives in a plain local Docker volume (`docker-compose.prod.yml:23-24,87-89`). **DSEC-02 (PostgreSQL SSL) is "REQUIRES PRODUCTION CONFIG"** — `SECURITY-AUDIT.md:22-38`. There is no application-level column or field encryption anywhere in `src/`. The only occurrences of "AES-256" in the codebase are questionnaire items AEGIS asks _its customers_ — `src/components/is-audit/cyber-security-checklist.tsx:81,142`.                                                                                                                                                                                                                                                                                          | At best the claim is true only for S3 evidence objects (SSE-S3 is AES-256) and even there it is unverified. For the PostgreSQL database — which holds the audit findings, observations and compliance records, i.e. the actual regulated data — at-rest encryption is **asserted but never verified**, by the project's own audit document.        | **High**     |

---

## Claim 2 — precise integrity property actually provided

The review's characterisation ("sequence-gap detection plus DB-permission
immutability") is directionally right but **too generous**. What the code
actually provides is:

**Append-only-for-the-application-role storage with a monotonic counter, and no
working tamper detector.**

Four findings that weaken it further:

1. **The gap detector is dead code.** `detectAuditGaps()` exists at
   `src/data-access/audit-trail.ts:187-205`, but a repo-wide grep for
   `detectAuditGaps` returns only that definition — no route, action, job,
   dashboard or cron calls it. No gap detection runs in production.
2. **The detector is also incorrect as written.** `sequenceNumber` is a single
   global `autoincrement()` (`prisma/schema.prisma:1863`), shared across all
   tenants, but the query takes `MIN`/`MAX` scoped to one tenant and then reports
   every value in that range not belonging to that tenant as "missing"
   (`src/data-access/audit-trail.ts:192-203`). On any multi-tenant database it
   would report near-continuous false positives. Separately, PostgreSQL sequences
   legitimately skip values on rolled-back transactions, so benign gaps occur by
   design — gap detection is inherently noisy even when scoped correctly.
3. **Immutability does not bind a database administrator.** `CREATE RULE` and
   `REVOKE` (`prisma/migrations/add_audit_log_rules.sql:15-16,21`) constrain the
   `aegis_app` role. The table owner or a superuser can `DROP RULE` and re-`GRANT`
   at will. The file's own header calls this "belt-and-suspenders" (`:13`), which
   is accurate — it is a defence against application compromise, not against
   privileged insider access.
4. **The audit trigger can be switched off, and this is already done in-repo.**
   `SET session_replication_role = 'replica'` disables all triggers including the
   audit trigger; the lifecycle seed script does exactly this at
   `scripts/seed-full-audit-lifecycle.ts:544` (restored at `:2481`), and the
   practice is documented at `docs/SEED-PROCESS-MANUAL.md:116`. Mutations
   performed in that window leave no audit record at all.

**Coverage is also partial.** Audit triggers are attached to **14 distinct
tables** out of **75 Prisma models** — `prisma/migrations/20260209015123_audit_trigger/migration.sql:75-84`,
`prisma/migrations/20260209220425_add_remaining_audit_triggers/migration.sql`,
`prisma/migrations/add_notification_tables.sql`. Audited: `Tenant`, `User`,
`Branch`, `AuditArea`, `AuditPlan`, `AuditEngagement`, `Observation`,
`ObservationTimeline`, `Evidence`, `ComplianceRequirement`,
`UserBranchAssignment`, `AuditeeResponse`, `NotificationQueue`, `EmailLog`.
Not audited: `ExaminationResponse`, `ActionPoint`, `BranchRbiaScore`,
`RamAssessment`, `LoanAccount`, `AccountExamResponse`, `BoardReport` and ~54
other models — including most of the RBIA v6.0/v7.0 scoring surface.

Restating the claim honestly, the property is: _for the 14 audited tables, and
only while the application connects as `aegis_app` and triggers are enabled, audit
rows cannot be updated or deleted by the application, and each row carries a
globally monotonic sequence number that no shipped code verifies._ That is not
hash-chain integrity, and it is not tamper-evident.

---

## Claim 1 — note on "graceful degradation"

`src/env.ts:34-44` marks the AWS variables optional with the comment "features
requiring S3 degrade gracefully when not configured". **No such degradation is
implemented.** `src/lib/s3.ts:18` falls back to the string literal
`"aegis-evidence-dev"` — a bucket name, not a local-storage path — so an
unconfigured deployment issues presigned URLs against a bucket it does not own and
evidence upload fails at runtime rather than falling back. `src/lib/ses-client.ts:53`
does the same for `SES_FROM_EMAIL`. The optional-env markings therefore make the
build pass; they do not make the cloud services optional.

---

## Other in-repo collateral checked

Searched: `README.md`, `SUMMARY.md`, `PROJECT-STATUS.md`, `SECURITY-AUDIT.md`,
`CLAUDE.md`, `AGENTS.md`, `deploy/README.md`, `docs/ops/*`, `docs/SEED-PROCESS-MANUAL.md`.

| Claim                                                                                                          | Verdict                  | Current truth (file:line)                                                                                                                                                                                                                                                                                                                                                                                                       | Severity |
| -------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `README.md:157` — "536 source files"                                                                           | **FALSE**                | 628 `.ts`/`.tsx` files outside `src/generated/`; 663 files total outside it; 746 including the generated Prisma client. No counting method yields 536. `SUMMARY.md:36` says 746 — i.e. the two documents disagree, and SUMMARY's figure counts generated code as source.                                                                                                                                                        | Low      |
| `README.md:159` — "54 pages"                                                                                   | **FALSE**                | 65 `page.tsx` routes under `src/app`. `SUMMARY.md:40` and `PROJECT-STATUS.md:133` both say 65; README is stale.                                                                                                                                                                                                                                                                                                                 | Low      |
| `SUMMARY.md:43` / `PROJECT-STATUS.md:131` — "53 data access files"                                             | **MISLEADING**           | 52 files in `src/data-access/`. Off by one.                                                                                                                                                                                                                                                                                                                                                                                     | Low      |
| `README.md:14` — "75 models, 21 enums"; "2,500-line Prisma schema"                                             | **TRUE**                 | 75 `model` declarations and 21 `enum` declarations in `prisma/schema.prisma`; file is exactly 2,500 lines.                                                                                                                                                                                                                                                                                                                      | —        |
| `README.md:46` — "Branch Scoring — Frozen immutable snapshots with **DB-level trigger protection**"            | **MISLEADING**           | The guard exists but is **not applied by the migration flow** — `prisma/migrations/20260222_rbia_db_guards.sql:9-10` says "Apply manually after schema push". On any environment where that step is skipped, the advertised protection is simply absent.                                                                                                                                                                        | Medium   |
| `SECURITY-AUDIT.md:107` + `CLAUDE.md:217` — "Tenant isolation is application-level ... **not PostgreSQL RLS**" | **CONTRADICTED IN-REPO** | The repo ships RLS policies for tenant-scoped tables: `prisma/migrations/add_rls_policies.sql:1-9`, `prisma/migrations/add_notification_tables.sql:6-11`, `prisma/migrations/add_auditee_portal_schema.sql:5-12`. Either RLS is applied (and the docs are wrong) or it is not (and dead security code ships as if it were active). Unresolvable by static reading — requires a DB inspection that this ticket is scoped out of. | Medium   |
| `SECURITY-AUDIT.md:82` — DSEC-05 "All DAL functions use `WHERE tenantId = ?` (39 files verified)"              | **MISLEADING**           | There are 52 files in `src/data-access/`. 39 of 52 verified is 75% coverage, presented under a "VERIFIED" status heading (`SECURITY-AUDIT.md:80`).                                                                                                                                                                                                                                                                              | Medium   |
| `PROJECT-STATUS.md:20,89,106` — v5.0/v6.0/v7.0 "COMPLETE ✅"                                                   | **NOT ASSESSED**         | Requirement-level completion was outside this ticket's scope; the requirement register was not located in-repo. Flagged as unverified rather than accepted.                                                                                                                                                                                                                                                                     | —        |

---

## Resolution of the open RLS question (added 2026-08-27)

The matrix records the RLS contradiction as "unresolvable by static reading —
requires a DB inspection that this ticket is scoped out of." That inspection has
since been performed against the production database. The answer is neither horn
of the dilemma:

- Row-level security is enabled on **exactly one of 75 tables**,
  `ObservationRbiCircular`, and it is **forced**. It arrived as a side effect of
  `add_observation_lifecycle_indexes.sql`, which is on the required bootstrap
  list and contains an `ENABLE ROW LEVEL SECURITY` statement alongside its
  indexes. The three files that exist to apply RLS deliberately were never
  applied.
- That single policy is **inert**. The application connects as role `aegis`,
  a superuser holding `BYPASSRLS`, so the policy is never evaluated.

So the documentation is right that RLS is not the isolation mechanism, and the
review is right that dead security code ships. The severity is **Medium**, as
recorded — the misleading part is that the artefact reads as a tenant control
while enforcing nothing.

A related finding, not previously recorded: **the application connects to
production as a database superuser.** No requirement calls for this, and it
nullifies any privilege-based control. It does not, however, defeat the audit-log
immutability rules — `DO INSTEAD NOTHING` rewrite rules bind every role, and a
`DELETE` issued as that superuser returned `DELETE 0` with the row count
unchanged.

---

## Summary by severity

- **Critical** — Claim 1 (single-tenant / on-premise / zero cloud), Claim 2 (hash chain).
- **High** — Claim 4 (2-hour implementation), Claim 5 (AES-256 at rest).
- **Medium** — Claim 3 (role count), branch-score trigger protection, RLS
  documentation contradiction, DSEC-05 coverage.
- **Low** — file/page/DAL count drift in `README.md` and `SUMMARY.md`.

Claims 1 and 2 are the material ones: both are addressed to banks under RBI
supervision, both are stated as architectural properties, and neither is
supported by the code.
