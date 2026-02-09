# Research Summary: AEGIS v2.0 Working Core MVP

**Domain:** Internal Audit Management SaaS for Urban Cooperative Banks (India)
**Researched:** 2026-02-08
**Overall Confidence:** HIGH

---

## Executive Summary

AEGIS v2.0 transforms a clickable Next.js prototype (v1.0, shipped 2026-02-08) into a working multi-tenant SaaS product serving Urban Cooperative Banks. The research covers four dimensions: technology stack, architecture patterns, feature requirements, and domain pitfalls.

**The core finding:** v2.0 is architecturally feasible and the existing frontend requires minimal rewrites. The prototype's component structure is sound -- components need their data sources replaced (JSON → PostgreSQL), not redesigned. The critical path is: Foundation (PostgreSQL + Auth + RLS) → Observation Lifecycle → Auditee Portal → Notifications → Board Report.

**Key risks identified:**

1. **Data import trap** — ~20 client components currently import JSON directly; all need server-fetch → client-render refactoring
2. **Prisma RLS impedance** — Requires Prisma Client Extensions to set tenant context per-query; default pattern leaks data
3. **Auth middleware conflict** — Auth.js + next-intl cookie coordination must be tested rigorously

**Competitive moat validated:**

- Pre-built RBI compliance checklists (27 Master Directions) — competitors offer generic templates
- Regional language support (EN/HI/MR/GU) — TeamMate+, AuditBoard are English-only
- Price point (Rs 3-4L/year vs Rs 50L+ for enterprise tools) — targets ignored Tier III/IV market

**The v2.0 feature set is table stakes + 3 differentiators.** Must-ship: observation lifecycle, RBAC, auditee portal, maker-checker, email notifications, audit trail, PDF board report, Excel export, onboarding wizard, evidence upload. Differentiators: RBI compliance checklists, repeat finding detection, multi-dimensional tagging. Total estimated effort: 14-18 weeks for 1 technical lead with AI-assisted development.

---

## Key Findings

### Stack: Better Auth + Prisma 7 + PostgreSQL

**Recommendation:** Replace NextAuth.js with Better Auth 1.4.18 for authentication. Auth.js joined Better Auth in Sept 2025; new projects should use Better Auth, not Auth.js v5 (perpetual beta). Better Auth has built-in organization/RBAC plugin, TOTP MFA, and first-class Next.js 16 support.

**Database:** PostgreSQL 16 with Prisma 7.3.0 (Rust-free version, ESM-first). Row-Level Security for tenant isolation. `@prisma/adapter-pg` for connection pooling. Drizzle rejected due to Better Auth adapter maturity and UCB market ecosystem (more Prisma hires/tutorials available).

**File storage:** AWS S3 (Mumbai region) with presigned URLs. **Email:** AWS SES (Mumbai). **PDF generation:** React-PDF 4.3.0 (pure React, no headless browser). **Excel export:** ExcelJS 4.4.0 (XLSX with formatting).

**No changes** to existing frontend stack: Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui, next-intl, Recharts. Validated in v1.0.

**Confidence:** HIGH — all versions verified via npm registry and official documentation.

### Architecture: Observation-Centric Bottom-Up Data Model

**Core insight:** Individual audit observations are the atomic units; all macro views (dashboard widgets, compliance status, board reports) are aggregations. This avoids dual-entry (auditor enters finding, manager manually updates dashboard).

**Multi-tenancy approach:** Shared database, shared schema with `tenant_id UUID` on every table. PostgreSQL Row-Level Security policies enforce isolation. Prisma Client Extensions wrap every query in a transaction that sets `app.current_tenant_id` session variable. This is cost-effective (single database) and safe (RLS prevents cross-tenant leaks even if application code has bugs).

**Deployment:** Single AWS Lightsail instance (Docker Compose: Next.js standalone + PostgreSQL). Nginx on host for SSL termination. Budget target: Rs 4,000-6,000/month.

**Data access pattern:** Server components fetch from Data Access Layer (`src/lib/dal/`, marked `'use server'`), pass data as props to client components. Replaces current pattern of client components importing `@/data` JSON barrel.

**Confidence:** HIGH — verified against Prisma RLS extension examples, AWS multi-tenant guides, Next.js 16 best practices.

### Critical Pitfall: Avoid "Everything in Parallel" Migration

**The trap:** Attempting to replace data sources, add auth, implement multi-tenancy, and build new features simultaneously creates a 3-month all-or-nothing migration with no incremental validation.

**The discipline:** Build in phases. Phase 1: PostgreSQL schema + one page migrated from JSON to database (Settings page, simplest). Phase 2: Auth + RBAC on that one page. Phase 3: Multi-tenancy RLS on that page. Test each phase independently. Only after one page works end-to-end, migrate remaining pages.

**Other critical pitfalls:**

- **Superuser bypass of RLS** — tests with `postgres` role give false confidence; use dedicated app role
- **Auth.js + next-intl cookie conflict** — middleware ordering matters; wrong order breaks locale or auth redirects
- **Observation state machine complexity** — 7 states × 5 roles = 35 permission combinations; requires state chart design before coding
- **Email rate limiting** — bulk operations (issuing 20 findings) must batch notifications, not send 20 individual emails

**Confidence:** HIGH — based on codebase analysis, industry post-mortems, and Prisma/Auth.js issue trackers.

---

## Implications for Roadmap

Based on research findings, the recommended phase structure for v2.0 is:

### Phase 1: Foundation (Weeks 1-3)

**Why this order:** Cannot build anything without database and auth. Start with simplest integration point (one page) to validate the data access pattern before scaling to all pages.

**Deliverables:**

1. PostgreSQL 16 schema design with `tenant_id` on all tables, RLS policies
2. Prisma 7 ORM setup with client extensions for tenant-scoped queries
3. Better Auth 1.4.18 integration with email/password + organization plugin
4. Migrate Settings page from JSON to database (simplest page, validates pattern)
5. Immutable audit trail table (`observation_history`) with append-only triggers

**Avoids Pitfall 1** (data import trap) by establishing the server-fetch → client-render pattern on one page before migrating all pages.

**Research flag:** RLS policy testing requires dedicated app role, not superuser. See PITFALLS.md §2.

---

### Phase 2: Observation Lifecycle (Weeks 4-6)

**Why this order:** Observation lifecycle is the core product value. Everything else depends on it. Must be hardened before adding auditee portal or notifications.

**Deliverables:**

1. Observation CRUD with 7-state workflow: Draft → Submitted → Reviewed → Issued → Auditee Response → Final → Compliance → Closed
2. State machine with transition guards (who can move from state X to state Y)
3. Maker-checker approval: Auditor creates, Manager reviews, CAE closes high/critical
4. Multi-dimensional tagging: risk category, RBI requirement, audit area, severity, branch/unit
5. Migrate Findings page from JSON to database

**Addresses Feature TS-01** (observation lifecycle) and TS-04 (maker-checker). See FEATURES.md for state diagram and permission matrix.

**Research flag:** State machine has 35+ permission combinations to test. Use property-based testing or exhaustive state chart validation. See PITFALLS.md §5.

---

### Phase 3: Auditee Portal & Notifications (Weeks 7-9)

**Why this order:** The observation workflow is useless if auditees don't know they have pending items, and auditors don't know when auditees respond.

**Deliverables:**

1. Auditee-scoped dashboard (view findings assigned to my branch/department)
2. Evidence file upload to S3 with presigned URLs
3. Auditee clarification/response submission (immutable once submitted)
4. AWS SES email integration for Mumbai region
5. Notification triggers: assignment, deadline (7d/3d/1d), overdue, response received, closed
6. Rate limiting for bulk notifications (batch digest)

**Addresses Features TS-05** (auditee portal), TS-06 (email notifications), TS-09 (evidence upload).

**Research flag:** SES requires domain verification and spam testing. Allow 3-5 days for DNS propagation and deliverability warm-up. See STACK.md §4.

---

### Phase 4: Dashboards & Reports (Weeks 10-12)

**Why this order:** Dashboards aggregate observation data. Cannot build until observation data is real and workflows are validated.

**Deliverables:**

1. Role-based dashboards: CAE (audit-centric), CCO (compliance-centric), CEO (risk-centric), Auditor (my tasks)
2. Real-time aggregation queries with materialized views for performance
3. PDF board report generation via React-PDF (5 sections: executive summary, audit coverage, key findings, compliance scorecard, recommendations)
4. Excel exports: findings list, compliance status, audit plan progress
5. Migrate Dashboard, Compliance, Audit Plans pages from JSON to database

**Addresses Features TS-03** (role-based dashboards), TS-07 (PDF board report), TS-08 (Excel export).

**Research flag:** React-PDF layout precision requires iteration. Budget 2-3 days for template polish. Puppeteer is fallback if React-PDF cannot achieve pixel-perfect board report format. See STACK.md §5.

---

### Phase 5: Onboarding & Compliance Content (Weeks 13-15)

**Why this order:** Onboarding wizard is the first-run experience but does not block core workflow validation. Build after observation lifecycle is proven.

**Deliverables:**

1. Guided onboarding wizard: Bank registration → UCB tier selection → RBI Master Directions → Org structure (Excel upload or manual forms) → User invitations
2. Pre-built RBI compliance checklists for 10 most common Master Directions (covering 80% of UCBs)
3. Compliance registry CRUD with status tracking (compliant/partial/non-compliant/pending)
4. CCO dashboard with compliance calendar and regulatory deadlines
5. Tenant-scoped RLS validation across all modules

**Addresses Features TS-11** (onboarding wizard) and DIFF-01 (RBI compliance checklists). This is the primary competitive differentiator.

**Research flag:** RBI Master Directions mapping requires domain expert review. 27 Master Directions exist; start with 10 covering capital adequacy, KYC, cyber security, IS audit. See FEATURES.md §DIFF-01.

---

### Phase 6: Differentiators (Weeks 16-18)

**Why this order:** Repeat finding detection and advanced features are valuable but not blocking for pilot usage. Build after MVP is functionally complete.

**Deliverables:**

1. Repeat finding detection: keyword matching algorithm + manual confirmation + auto-escalation (Low→Medium, Medium→High, High→Critical)
2. Repeat findings section in board report
3. DAKSH score visualization with export template (formatted Excel for RBI submission)
4. Bilingual board reports (English + regional language)
5. Performance optimization: database indexes, query analysis, materialized view refresh strategy

**Addresses Features DIFF-02** (repeat finding detection) and DIFF-04 (DAKSH export).

**Research flag:** Repeat finding algorithm needs technical spike. Start with simple keyword matching (branch + audit area + risk category). ML-based similarity is future enhancement. See FEATURES.md §DIFF-02.

---

## Phase Ordering Rationale

**Why Foundation → Observation → Auditee → Dashboards → Onboarding:**

1. **Foundation is non-negotiable.** Cannot build any feature without database, auth, and multi-tenancy.
2. **Observation lifecycle is the product.** If this fails, everything else is irrelevant. Build and harden first.
3. **Auditee portal completes the workflow.** Without auditee participation, the observation lifecycle is half-functional.
4. **Dashboards prove the architecture.** They validate that bottom-up aggregation (observations → macro views) works at acceptable performance.
5. **Onboarding is last because it requires all modules working.** The wizard seeds compliance registry, org structure, and invites users -- cannot build until those features exist.

**Parallel tracks:**

- Phase 2 and Phase 3 can partially overlap: evidence upload (S3 integration) does not depend on observation state machine completion.
- Phase 5 (onboarding wizard UI) can be designed in parallel with Phase 4 (dashboards implementation).

**Critical path:** Foundation → Observation Lifecycle → Auditee Portal → Email Notifications → PDF Board Report. This is the minimum viable workflow for a UCB to conduct one audit cycle.

---

## Research Flags for Phases

Areas where deeper investigation is needed during implementation:

| Phase       | Research Need                                | Why                                                                                       | When to Investigate                                                    |
| ----------- | -------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Phase 1** | RLS policy performance at scale              | PostgreSQL RLS adds overhead on every query; needs benchmark with 1000+ observations      | During schema design; test with synthetic data                         |
| **Phase 2** | State machine validation approach            | 7 states × 5 roles = 35 combinations; manual testing insufficient                         | During state machine design; consider property-based testing           |
| **Phase 3** | SES deliverability to Indian email providers | Gmail/Outlook work reliably; need to test Rediffmail, Yahoo India, etc.                   | During SES setup; allow 1 week for deliverability tuning               |
| **Phase 4** | React-PDF layout precision                   | v1.0 print stylesheet works; React-PDF may require different approach for complex layouts | During board report implementation; Puppeteer is fallback              |
| **Phase 5** | RBI Master Directions legal review           | Compliance content must be accurate; requires domain expert validation                    | Before onboarding wizard; engage banking compliance consultant         |
| **Phase 6** | Repeat finding algorithm accuracy            | Keyword matching may have false positives; needs tuning with real data                    | During repeat detection implementation; test with v1.0 demo data first |

---

## Confidence Assessment

| Area             | Confidence  | Rationale                                                                                                                                                                                                             |
| ---------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stack**        | HIGH        | All versions verified via npm registry. Better Auth, Prisma 7, React-PDF confirmed compatible with Next.js 16.                                                                                                        |
| **Features**     | MEDIUM-HIGH | Table stakes features validated via competitor analysis (TeamMate+, AuditBoard, Audit360, LaserGRC). RBI RBIA framework confirms observation lifecycle states. Audit360 feature details LIMITED (no public API docs). |
| **Architecture** | HIGH        | Prisma RLS extension pattern verified via official examples. Bottom-up observation model confirmed via PROJECT.md domain logic. Single-instance Lightsail deployment standard for MVP SaaS.                           |
| **Pitfalls**     | HIGH        | RLS superuser bypass verified via Bytebase article. Auth.js + next-intl conflict confirmed via GitHub issues. "Use client" data import trap observed in codebase analysis.                                            |

**Low confidence areas requiring validation:**

- **Audit360 exact features** — limited public documentation; need vendor demo or user interviews
- **DAKSH export format** — RBI documentation not publicly available; needs domain expert with recent DAKSH submission experience
- **UCB staff computer literacy** — Tier III/IV bank user testing needed to validate auditee portal UX assumptions

---

## Gaps to Address

**Before roadmap finalization:**

1. **RBI Master Directions structure** — Confirm the 27 Master Directions list is current and complete. Verify which apply to each UCB tier. Requires legal/compliance expert review.
2. **DAKSH format specifics** — Obtain sample DAKSH upload template to design export mapping. RBI may provide this during licensing or via existing UCB contact.
3. **Repeat finding algorithm** — Prototype keyword matching vs. text similarity on v1.0 demo data. Determine acceptable false positive rate.

**During implementation:**

1. **Observation state machine exhaustive testing** — 35+ state transitions need systematic validation. Consider state chart visualization tool or property-based testing library.
2. **AWS SES deliverability** — Test email delivery to Indian email providers (Rediffmail, Yahoo India, UCB staff Outlook accounts). Build sender reputation gradually.
3. **Performance at scale** — RLS adds query overhead. Benchmark with 10,000 observations to validate materialized view strategy.

**Post-MVP (validate with pilot clients):**

1. **Auditee portal UX for low-literacy users** — Tier III/IV bank staff may struggle with complex forms. User testing needed.
2. **Board report format preferences** — RBI RBIA framework is guidance, not prescription. Board members may prefer different layouts.
3. **Excel import for bulk data** — Clients may request bulk finding import from existing Excel trackers. Not in v2.0 scope; validate demand first.

---

## Competitive Positioning

### AEGIS Differentiators Validated

| Differentiator                          | Competitor Gap                                                                                               | AEGIS Advantage                                                        | Confidence                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Pre-built RBI compliance checklists** | TeamMate+/AuditBoard have generic templates; Audit360 claims banking focus but no public RBI content library | 27 Master Directions pre-mapped to UCB tiers; select-applicable wizard | HIGH (this is the stated moat in PROJECT.md)                |
| **Regional language support**           | TeamMate+, AuditBoard, LaserGRC are English-only                                                             | EN/HI/MR/GU UI labels + bilingual board reports                        | HIGH (v1.0 already shipped next-intl)                       |
| **Price point (Rs 3-4L/year)**          | TeamMate+ Rs 50L+, AuditBoard $50K+ USD                                                                      | 10x cheaper; targets Tier III/IV UCBs enterprise tools ignore          | HIGH (bootstrap plan budget confirms)                       |
| **Guided onboarding**                   | Enterprise tools assume IT staff available for configuration                                                 | Wizard-based setup with pre-seeded compliance registry                 | MEDIUM (no competitor explicitly offers this; UX advantage) |
| **Repeat finding auto-escalation**      | TeamMate+/AuditBoard require manual tagging                                                                  | Auto-suggest repeat + severity escalation rules                        | MEDIUM (innovation; needs validation with pilot clients)    |

### Competitor Gaps AEGIS Fills

1. **No affordable solution for small UCBs** — Tier III/IV banks have 5-8 person audit teams and cannot justify Rs 50L/year software spend
2. **No India-specific compliance content** — Generic audit tools lack RBI Master Directions knowledge base
3. **No regional language support** — English-only alienates UCB staff more comfortable in Hindi/Marathi/Gujarati
4. **Over-engineered for small teams** — Enterprise tools offer too much customization; small UCBs need opinionated defaults

**Validation strategy:** Pilot A (free sandbox) and Pilot B (LOI + Rs 50K deposit) will confirm these gaps are real and AEGIS fills them. If pilot clients request features from competitor tools, re-evaluate differentiation strategy.

---

## Ready for Roadmap

Research complete. Findings support the v2.0 Working Core MVP scope defined in PROJECT.md:

**Must-ship features:**

- Multi-tenant PostgreSQL with RLS (TS-01)
- Better Auth email/password + RBAC (TS-02)
- Observation lifecycle with maker-checker (TS-04)
- Auditee self-service portal (TS-05)
- Email notifications via SES (TS-06)
- PDF board report via React-PDF (TS-07)
- Excel exports (TS-08)
- Evidence file upload to S3 (TS-09)
- Immutable audit trail (TS-10)
- Guided onboarding wizard (TS-11)
- Pre-built RBI compliance checklists (DIFF-01)

**Should-ship differentiators:**

- Repeat finding detection (DIFF-02)
- Multi-dimensional tagging (DIFF-03)

**Defer to post-MVP:**

- DAKSH export (DIFF-04) — valuable but not blocking pilot usage
- Indian language audit content (DIFF-06) — UI i18n exists; content-level i18n can wait
- CBS integration, TOTP/MFA, mobile app, on-premise deployment — explicitly out of scope per PROJECT.md

**Estimated effort:** 14-18 weeks for 1 technical lead with AI-assisted development (Claude Code, Cursor, GitHub Copilot). Aligns with bootstrap execution plan timeline (Weeks 4-20 of 16-week plan).

**Confidence:** HIGH — Architecture is feasible, stack is validated, pitfalls are identified with mitigations, and feature set matches competitor table stakes + 3 defensible differentiators.

Proceeding to roadmap creation.

---

## Sources

### Competitive Analysis

- [TeamMate+ Audit Management | Wolters Kluwer](https://www.wolterskluwer.com/en/solutions/teammate/teammate-audit)
- [AuditBoard Reviews 2026 | G2](https://www.g2.com/products/auditboard/reviews)
- [LaserGRC Internal Audit Management](https://www.lasergrc.com/lars.asp)
- [Audit360 Banking Software](https://www.audit360.in/domains/audit-solution-for-banks)

### Technology Stack

- [Better Auth Official Site](https://www.better-auth.com/)
- [Auth.js joins Better Auth (Sept 2025)](https://www.better-auth.com/blog/authjs-joins-better-auth)
- [Prisma RLS Extension Example](https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security)
- [React-PDF Documentation](https://react-pdf.org/)

### Multi-Tenancy & Security

- [AWS Multi-Tenant Data Isolation with PostgreSQL RLS](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/)
- [Bytebase: PostgreSQL RLS Footguns](https://www.bytebase.com/blog/postgres-row-level-security-footguns/)
- [Immutable Audit Trails Guide | HubiFi](https://www.hubifi.com/blog/immutable-audit-log-basics)

### Regulatory Framework

- [RBI Master Directions for UCBs (2025)](https://www.indiancooperative.com/co-op-news-snippets/rbi-issues-master-directions-27-for-ucbs-26-for-rural-co-op-banks/)
- [RBI RBIA Guidelines for UCBs and NBFCs](https://www.riskpro.in/blogs/rbi-issues-guidelines-risk-based-internal-audit-nbfc-and-ucb-step-forward-towards-quality-and)
- [RBI Urban Co-operative Banks Lending Directions 2025](https://taxguru.in/rbi/rbi-urban-co-operative-banks-lending-related-parties-directions-2025-draft.html)

### Domain Practices

- [Maker-Checker in Banking Domain](https://medium.com/@vdharam/implementation-of-maker-checker-flow-in-banking-domain-projects-17068cd05d73)
- [Audit Finding Management](https://sgsystemsglobal.com/glossary/audit-finding-management/)
- [Audit Reporting Process Steps 2026](https://www.compliancequest.com/bloglet/audit-reporting-process/)

---

_Last updated: 2026-02-08_
_Researcher: GSD Project Researcher (Claude Opus 4.6)_
_Mode: Ecosystem Research — Features, Stack, Architecture, Pitfalls_
