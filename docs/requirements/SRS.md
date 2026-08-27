# Software Requirements Specification

**System:** AEGIS — Risk-Based Internal Audit System for Urban Cooperative Banks
**Version:** derived from `main` @ 2424f6f2, 27 August 2026
**Status:** reconstructed from implementation

---

## 0. About this document, and what it is not

**This specification was reverse-engineered from the shipped code, not carried
forward from an original requirements register.** That distinction matters and is
stated up front deliberately.

The repository has never contained a requirements register. Milestone documents
cite requirement identifiers — R31, D9, DE6, OBS-07 and similar — and those
identifiers appear as comments in the source, but the register that defines them
is not here and could not be consulted. Where this document uses such an
identifier it is quoting a code comment, not a specification.

Consequently:

- A requirement below is evidence that the system **behaves** this way. It is not
  evidence that anyone **asked** for it.
- Absence from this document means the behaviour was not found in code. It does
  not mean it was not required.
- Every requirement cites the file that implements it. Where an obligation is
  claimed but unimplemented, it is recorded in §8 rather than omitted.

For an independent check of external claims against this codebase, see
`docs/claims-vs-implementation.md`. Where that document and this one disagree,
that one was written to be adversarial and should be preferred.

---

## 1. Purpose and scope

AEGIS manages the internal audit function of an Urban Cooperative Bank under
Reserve Bank of India supervision: risk assessment, audit planning, fieldwork,
observation management, compliance escalation, and board reporting.

**In scope:** multi-tenant SaaS delivery; the audit lifecycle from risk scoring
to board committee closure; role-based access for 17 roles; an append-only audit
trail with ten-year retention.

**Out of scope:** core banking integration; general ledger; customer-facing
banking; statutory audit as distinct from internal audit; single-tenant
on-premise deployment (see §8.1).

### 1.1 Definitions

Terms are defined in `CONTEXT.md` at the repository root. The ones load-bearing
here: **tenant** (one bank), **actor** (who a change is attributed to — a user or
the system), **audited action** (a mutation recorded in the audit trail),
**justification** (mandatory free text on sensitive actions), **observation** (an
audit finding), **action point** (a remediation item assigned to a branch).

---

## 2. Tenancy and isolation

| ID | Requirement | Implemented in |
|---|---|---|
| TEN-1 | Every tenant-owned row carries `tenantId`; deleting a tenant cascades to its rows. | `prisma/schema.prisma` |
| TEN-2 | The acting tenant is derived from the authenticated session and never from client input — URL, body, header or query. | `src/data-access/session.ts` |
| TEN-3 | Tenant isolation is enforced in application code, not PostgreSQL row-level security. The RLS migration files exist but are deliberately not applied — with one accidental exception, see below. | `prisma/migrations/add_rls_policies.sql` (unapplied) |
| TEN-4 | Data-access functions scope queries by tenant; `prismaForTenant(tenantId)` is the sanctioned helper. | `src/lib/prisma.ts` |
| TEN-5 | A file download is authorised by matching the key's tenant segment exactly against the session tenant. Prefix matching is rejected, so tenant `abc` cannot reach `abcdef/…`. | `src/lib/authorize-download.ts` |

> **TEN-3 is a standing risk.** Isolation depends on every query being written
> correctly. There is no database-level backstop, so a single unscoped query is a
> cross-tenant disclosure. This was a deliberate decision, not an oversight.

**Verified against production, 27 August 2026.** Row-level security is enabled on
exactly **one of 75 tables** — `ObservationRbiCircular` — carried in as a side
effect of `add_observation_lifecycle_indexes.sql`, which is on the required
bootstrap list and happens to contain an `ENABLE ROW LEVEL SECURITY` statement
alongside its indexes. Nobody chose this.

That lone policy is **inert**. The application connects as role `aegis`, which is
a superuser holding `BYPASSRLS`, so the policy is never evaluated. It is dead
security code: it looks like a tenant control, and enforces nothing.

Two consequences worth acting on separately from this document:

1. The policy's predicate casts `current_setting('app.current_tenant_id', true)`
   to `uuid` with no `NULLIF`. It carries the same empty-string hazard fixed in
   the audit trigger (AUD-8). Were the app ever moved off a bypassing role, that
   policy would begin throwing on pooled connections.
2. **The application connects to production as a database superuser.** No
   requirement calls for this, and it removes the value of any
   privilege-based control.

---

## 3. Identity, roles and authorisation

| ID | Requirement | Implemented in |
|---|---|---|
| SEC-1 | Authentication uses database-backed session cookies; the session cookie is the production auth boundary. | `src/lib/auth.ts` |
| SEC-2 | Cookies are `httpOnly`, `sameSite=lax`, and `secure` whenever the configured base URL is HTTPS. | `src/lib/auth.ts` |
| SEC-3 | Repeated failed sign-ins lock the account. | `src/lib/auth-lockout-plugin.ts` |
| SEC-4 | 17 roles exist; a user may hold several, and permissions are the **union** of all roles held. | `src/lib/permissions.ts` |
| SEC-5 | Permission checks must test membership (`roles.includes()`), never equality on a single role. | `src/lib/permissions.ts` |
| SEC-6 | 16 roles are assignable. `BOARD_OBSERVER` is reserved, carries no permissions, and is excluded from assignment. | `src/lib/permissions.ts` |
| SEC-7 | There is no self-service registration; users are invited by an administrator and set their own password. | `src/actions/user-invitations.ts` |
| SEC-8 | Bulk organisation upload requires `admin:manage_settings`. | `src/actions/onboarding-excel-upload.ts` |

Roles are enumerated in `docs/reference/data-dictionary.md` under `Role`; the
permission vocabulary is `resource:action`, 78 permissions in total.

---

## 4. Audit trail

| ID | Requirement | Implemented in |
|---|---|---|
| AUD-1 | Mutations to audited tables are recorded automatically by an `AFTER` row trigger on 14 tables. | `prisma/migrations/20260209015123_audit_trigger/` |
| AUD-2 | Attribution — tenant, user, action type, justification, IP, session — is carried in PostgreSQL session settings set inside the same transaction. | `src/lib/session-context.ts` |
| AUD-3 | All audited writes route through `withAuditedMutation`, which opens the transaction and sets that context. | `src/data-access/audited-mutation.ts` |
| AUD-4 | Four actions require a written justification: closing a finding, changing a user's role, marking a compliance item not applicable, and changing an observation's status. | `src/lib/session-context.ts` |
| AUD-5 | Scheduled work acts as a **system actor** with a tenant but no user. Audit rows from jobs therefore have a null `userId` by design. | `src/data-access/audited-mutation.ts` |
| AUD-6 | Audit rows are retained ten years (PMLA). | audit trigger function |
| AUD-7 | The application role cannot update or delete audit rows; rules and revoked grants enforce this at the database. | `prisma/migrations/add_audit_log_rules.sql` |
| AUD-8 | Session settings are read with `NULLIF(…, '')`, because a pooled connection returns an empty string rather than NULL once any transaction has set them. | `prisma/migrations/20260826_audit_trigger_null_safe.sql` |
| AUD-9 | A build-failing test asserts that no new unaudited mutation is introduced. | `src/data-access/__tests__/` |

> **AUD-7 is not tamper-proofing.** There is no hash chain and no cryptographic
> signature. Describe the property as **append-only with ten-year retention**,
> never as tamper-evident. See §8.2.

**Verified against production, 27 August 2026.** The immutability rules are
stronger than a privilege check and hold better than expected: `DO INSTEAD
NOTHING` rewrite rules apply to *every* role, superusers included. A `DELETE`
issued as the application's own superuser role reported `DELETE 0` and left the
row count unchanged. AUD-7 therefore holds against the connecting role, not
merely against `aegis_app`.

The residual exposure is unchanged: a superuser may still `DROP RULE` or disable
the trigger, and nothing would detect that after the fact. The control resists
accidental and application-level modification, not a determined administrator.

The trail is live: at the time of writing it holds 105 rows, all written since
deployment by background jobs acting as system actors — confirming AUD-5 in
production.

---

## 5. Functional requirements

### 5.1 Onboarding

| ID | Requirement | Implemented in |
|---|---|---|
| ONB-1 | A bank is configured through a five-step wizard: registration, RBI tier, applicable Master Directions, organisation structure, user invitations. | `src/app/(onboarding)/onboarding/` |
| ONB-2 | Progress is persisted per step and the wizard is resumable. | `src/actions/onboarding.ts` |
| ONB-3 | Zones and branches may be entered directly or uploaded in bulk from a spreadsheet. | `src/actions/onboarding-excel-upload.ts` |
| ONB-4 | Selected Master Directions become the tenant's compliance requirements. | `src/actions/onboarding.ts` |

### 5.2 Risk assessment and planning

| ID | Requirement | Implemented in |
|---|---|---|
| RAM-1 | Branch risk is scored from observations weighted by severity: critical 4, high 3, medium 2, low 1. | `src/services/risk-rating/types.ts` |
| RAM-2 | A repeat finding is multiplied by 1.5. | `src/services/risk-rating/compute.ts` |
| RAM-3 | Scores map to bands: Very Good ≥80, Good ≥65, Satisfactory ≥50, Moderate ≥40, Poor below 40. | `src/services/risk-rating/types.ts` |
| RAM-4 | Weights and bands are tenant-configurable. | `src/app/(dashboard)/admin/ram-config/` |
| RAM-5 | An assessment progresses Draft → Computed → Approved. | `RamAssessmentStatus` |
| PLN-1 | Audit plans progress Planned → In Progress → Completed, and may be put On Hold or Cancelled. | `AuditPlanStatus` |

### 5.3 Engagement and fieldwork

| ID | Requirement | Implemented in |
|---|---|---|
| ENG-1 | An engagement progresses Planned → Team Assigned → Opening Meeting → In Progress → Exit Meeting → Report Draft → Completed. | `EngagementStatus` |
| ENG-2 | RBIA examination answers are Compliant, Non-compliant, Partial or Not Applicable. | `ExaminationStatus` |
| ENG-3 | Specialised fieldwork covers cash verification, loan review, SMA/NPA classification, loan-portfolio sampling and the branch head certificate. | `src/app/(dashboard)/audit-execution/` |
| ENG-4 | A branch score may be frozen once examination is complete; freezing requires `rbia:score_freeze`. | `src/actions/rbia/` |

### 5.4 Observations

| ID | Requirement | Implemented in |
|---|---|---|
| OBS-1 | An observation records the 5C structure — condition, criteria, cause, effect, recommendation — with severity, branch and audit area. | `prisma/schema.prisma` |
| OBS-2 | Lifecycle: Draft → Submitted → Reviewed → Issued → Response → Compliance → Closed. | `ObservationStatus` |
| OBS-3 | Every transition requires a comment and appends an immutable timeline entry. | `src/actions/observations/` |
| OBS-4 | Low and medium findings may be closed by a manager. **High and critical require the CAE.** | `observation:close_high_critical` |
| OBS-5 | An observation resolved during fieldwork is recorded as such with a reason. | `resolvedDuringFieldwork` |
| OBS-6 | Repeat findings are identified and linked. | `src/actions/repeat-findings/` |
| OBS-7 | Concurrent edits are rejected by optimistic locking on `version`. | `prisma/schema.prisma` |

### 5.5 Compliance and escalation

| ID | Requirement | Implemented in |
|---|---|---|
| CMP-1 | Escalation ladder: branch response → zonal (ZAC) → ACE → board committee (ACB) → closed. | `ComplianceStatus` |
| CMP-2 | A branch may reply with a clarification, a compliance action, or a request for extension. | `ResponseType` |
| CMP-3 | Items past their due date are marked overdue automatically. | `src/jobs/overdue-escalation.ts` |
| CMP-4 | An auditee sees only items for their own branch. | `src/data-access/` |
| CMP-5 | Marking a requirement not applicable requires a justification. | AUD-4 |

### 5.6 Reporting

| ID | Requirement | Implemented in |
|---|---|---|
| RPT-1 | Findings, compliance status and audit plans export as spreadsheets, streamed directly to the browser. | `src/app/api/exports/` |
| RPT-2 | A gap analysis report is available. | `src/app/api/reports/gap-analysis/` |
| RPT-3 | A board report is produced as PDF and Excel and **persisted to object storage**. | `src/actions/reports/` |
| RPT-4 | Board report generation is an audited action. | `board_report.generated` |

> RPT-3 depends on S3. Where object storage is unconfigured, board reports fail
> while RPT-1 and RPT-2 continue to work. See §8.3.

### 5.7 Notifications and scheduled work

| ID | Requirement | Schedule | Implemented in |
|---|---|---|---|
| JOB-1 | Queued notifications are dispatched continuously. | every minute | `src/jobs/notification-processor.ts` |
| JOB-2 | Deadline reminders are issued 7, 3 and 1 days ahead. | 06:00 IST | `src/jobs/deadline-reminder.ts` |
| JOB-3 | Overdue items are escalated. | 06:00 IST | `src/jobs/overdue-escalation.ts` |
| JOB-4 | A weekly digest goes to the CAE and CCO. | Mon 10:00 IST | `src/jobs/weekly-digest.ts` |
| JOB-5 | Dashboard metrics are snapshotted for trend display. | 01:00 IST | `src/jobs/snapshot-metrics.ts` |
| JOB-6 | Notifications are claimed per tenant; a failed claim leaves that tenant's rows pending for the next run rather than stranding them. | — | `src/jobs/notification-processor.ts` |

---

## 6. Non-functional requirements

| ID | Requirement | Notes |
|---|---|---|
| NFR-1 | India-resident infrastructure. | Object storage and mail default to `ap-south-1`. |
| NFR-2 | A health endpoint reports database, job-queue and memory status. | `/api/health`, polled twelve-hourly. |
| NFR-3 | Uploads are capped at 10 MB. | `src/lib/s3.ts` |
| NFR-4 | Download URLs are presigned and expire in five minutes. | `src/lib/s3.ts` |
| NFR-5 | A single Prisma client is reused process-wide; per-access construction exhausts the connection pool. | `src/lib/prisma.ts` |
| NFR-6 | Object storage and mail are optional; absent credentials degrade uploads and email rather than preventing start-up. | `src/env.ts` |
| NFR-7 | Four environment variables are mandatory: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`. | `src/env.ts` |

---

## 7. Interfaces

- **Human:** 65 pages — see `docs/reference/routes.md`.
- **Programmatic:** 12 HTTP endpoints and the server-action surface — see
  `docs/reference/api-reference.md`.
- **Data:** 75 tables and 21 enumerations — see `docs/reference/data-dictionary.md`.
- **Process-to-table map:** see `docs/reference/data-flows.md`.

---

## 8. Known gaps

Recorded rather than omitted, because a specification that lists only what works
is a sales document.

### 8.1 Deployment model
The system is multi-tenant SaaS with object storage and mail hard-wired to AWS.
There is no storage abstraction and no SMTP path, so a single-tenant on-premise
deployment is a code change, not configuration.

### 8.2 Audit integrity
No hash chain and no cryptographic signature (see AUD-7). Additionally
`detectAuditGaps()` is defined but never invoked, and as written scopes
`MIN`/`MAX` per tenant over a globally shared sequence, so it would report
continuous false positives on a shared database. Treat gap detection as absent.

### 8.3 Storage-dependent features
Evidence upload, evidence download and board-report generation require S3
credentials. Where these are unset, those features fail while the rest of the
system operates normally.

### 8.4 Localisation
Dictionaries exist for Hindi, Marathi and Gujarati, but only 8 of 371 interface
files read from them and no language switcher is exposed. The delivered
interface is English.

### 8.5 Incomplete work
The queued board-report job handler only logs. Sample-based account examination
is under active development.

### 8.6 Deployment safety
Merging to `main` deploys to production automatically, and `main` carries no
branch protection, so no review or passing check is required before a release.
Loose `.sql` files in `prisma/migrations/` are applied by hand and do **not**
travel with a deployment.

---

## 9. Traceability

Identifiers here are introduced by this document. They are not the R-, D- and
DE- identifiers found in source comments, whose defining register is not in this
repository (see §0). Any future mapping between the two must be established
against that register, not inferred from the code.
