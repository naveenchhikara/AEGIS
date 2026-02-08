# UCB Internal Audit & Compliance Monitoring Platform

## Project Plan — 16-Week Execution Calendar

**Version:** 1.0
**Start Date:** Monday, 9 February 2026
**Target Completion:** Monday, 1 June 2026
**Team:** 2–3 Domain Experts | AI-Assisted Development
**Infrastructure:** AWS Mumbai (ap-south-1)

---

## Executive Summary

This project plan translates the Bootstrap Execution Plan into a week-by-week actionable calendar. The platform is a multi-tenant SaaS for UCB (Urban Cooperative Bank) internal audit and compliance monitoring, built to comply with RBI circular RBI/2023-24/117. Development is AI-assisted (Claude Code, Cursor, GitHub Copilot) with a lean 2–3 person team.

---

## Phase Overview

| Phase   | Name                | Weeks        | Dates           | Key Deliverable                                  |
| ------- | ------------------- | ------------ | --------------- | ------------------------------------------------ |
| Phase 0 | Clickable Prototype | Weeks 1–3    | Feb 9 – Feb 27  | Interactive demo deployed to AWS Mumbai          |
| Phase 1 | Working Core MVP    | Weeks 4–10   | Mar 2 – Apr 17  | 4 core modules with real database                |
| Phase 2 | Pilot-Ready         | Weeks 11–14  | Apr 20 – May 15 | Production-quality platform ready for real users |
| Phase 3 | First Pilots        | Weeks 15–16+ | May 18 – Jun 1+ | 2–3 UCBs onboarded and running pilots            |

---

## Milestones

| #   | Milestone                    | Target Date       | Success Criteria                                                         |
| --- | ---------------------------- | ----------------- | ------------------------------------------------------------------------ |
| M1  | Project Skeleton Live        | Feb 13 (Fri W1)   | Next.js project deployed to AWS Lightsail with login page and navigation |
| M2  | 3 Key Screens Complete       | Feb 20 (Fri W2)   | Dashboard, compliance registry, audit plan screens with dummy data       |
| M3  | **Clickable Prototype Live** | Feb 27 (Fri W3)   | All 7 screens deployed; demo script ready; 3 client demos scheduled      |
| M4  | Auth + Multi-Tenancy Working | Mar 13 (Fri W4–5) | Users can register, login with MFA, see only their tenant data           |
| M5  | Compliance Registry Module   | Mar 20 (Fri W6)   | CRUD for compliance requirements; task assignment; status tracking       |
| M6  | Audit Planning Module        | Mar 27 (Fri W7)   | Audit universe, annual plan, engagement setup functional                 |
| M7  | Finding Management Module    | Apr 10 (Fri W8–9) | Full finding lifecycle: create, review, respond, track, filter           |
| M8  | **Working MVP Complete**     | Apr 17 (Fri W10)  | All 4 modules live; dashboards connected; PDF reports generating         |
| M9  | Pilot-Ready Features Added   | May 1 (Fri W12)   | Maker-checker, auditee portal, email notifications, i18n                 |
| M10 | **Pilot-Ready Platform**     | May 15 (Fri W14)  | Full demo dataset; CSV import; deployment hardened; monitoring live      |
| M11 | **First Pilots Running**     | Jun 1 (Mon W16)   | 2–3 UCBs onboarded; training complete; users logging in daily            |

---

## Week-by-Week Execution

### PHASE 0: CLICKABLE PROTOTYPE (Weeks 1–3)

---

#### Week 1: Feb 9 – Feb 13

**Theme:** Project Setup & Core Layout

**Domain Lead (Person 1):**
| Day | Task | Output |
|-----|------|--------|
| Mon | Define all screen layouts with wireframe descriptions | Screen specification document |
| Tue | Write Sahyadri UCB bank profile and org structure dummy data | JSON: bank profile, branches, departments |
| Wed | Write compliance registry dummy data (50 RBI requirements) | JSON: compliance requirements with statuses |
| Thu | Write audit team and audit plan dummy data | JSON: team members, 8-10 planned audits |
| Fri | Review screens built by Person 2; refine layout and data | Feedback document; refined JSON data files |

**Technical Lead (Person 2):**
| Day | Task | Output |
|-----|------|--------|
| Mon | Initialize Next.js 14 (App Router) + TypeScript + shadcn/ui + Tailwind CSS project; set up ESLint, Prettier, project structure | Git repo with project skeleton |
| Tue | Build app shell: sidebar navigation, top bar, responsive layout, theme setup | Layout component with navigation |
| Wed | Build login page with MFA prompt UI, language selector (EN/HI/MR/GU), UCB logo placeholder | Login page component |
| Thu | Set up AWS Lightsail instance (Mumbai); configure PM2, Nginx, domain, SSL (Let's Encrypt) | Deployed skeleton at production URL |
| Fri | Set up GitHub Actions CI/CD pipeline (push to main → build → deploy to Lightsail) | Automated deployment pipeline |

**Deliverable:** Project skeleton with login and navigation deployed to AWS Mumbai

---

#### Week 2: Feb 16 – Feb 20

**Theme:** Core Screens with Dummy Data

**Domain Lead (Person 1):**
| Day | Task | Output |
|-----|------|--------|
| Mon | Refine dashboard layout; specify all widgets, metrics, chart types | Dashboard widget specifications |
| Tue | Create 35 open findings with realistic descriptions, severities, root causes | JSON: findings dataset |
| Wed | Write DAKSH status data and PCA indicator data | JSON: DAKSH and PCA datasets |
| Thu | Specify audit plan view: columns, statuses, team assignments, progress metrics | Audit plan screen specification |
| Fri | QA all screens; verify data consistency across screens | QA checklist completed |

**Technical Lead (Person 2):**
| Day | Task | Output |
|-----|------|--------|
| Mon | Build compliance dashboard (CEO view): health score, donut chart, finding counts, DAKSH indicator, PCA status, regulatory calendar | Dashboard page |
| Tue | Build compliance registry table: filterable, sortable, status badges, evidence count column | Compliance registry page |
| Wed | Build audit plan view: annual plan table, engagement cards, status indicators, team assignments | Audit plan page |
| Thu | Integrate all dummy data from JSON files; wire up navigation between pages | All 3 screens with live dummy data |
| Fri | Responsive design testing; fix mobile layout issues; polish UI spacing and colors | Polished screens |

**Deliverable:** 3 key screens (dashboard, compliance registry, audit plan) with hardcoded data

---

#### Week 3: Feb 23 – Feb 27

**Theme:** Complete Prototype & Deploy

**Domain Lead (Person 1):**
| Day | Task | Output |
|-----|------|--------|
| Mon | Write finding detail content: observation, root cause, auditee response, action plan, evidence | Detailed finding specification |
| Tue | Design board report structure: sections, metrics, layout | Board report template specification |
| Wed | Write DAKSH submission screen content; create demo walkthrough script | DAKSH spec + demo script (15-min and 30-min versions) |
| Thu | Schedule 3 client demos for Week 4; prepare demo environment | 3 confirmed demo appointments |
| Fri | Full end-to-end demo rehearsal; fix data inconsistencies | Demo-ready prototype verified |

**Technical Lead (Person 2):**
| Day | Task | Output |
|-----|------|--------|
| Mon | Build finding detail page: full finding view with all fields, evidence list, timeline, maker-checker status display | Finding detail page |
| Tue | Build board report PDF preview (React-PDF or Puppeteer): executive summary, audit coverage, findings, compliance scorecard | Board report preview page |
| Wed | Build DAKSH submission screen with formatted data display and status indicators | DAKSH screen |
| Thu | Implement language toggle (EN/HI/MR/GU) with i18n framework; translate key UI labels | Multilingual support (UI labels) |
| Fri | Final UI polish; deploy to AWS Lightsail (Mumbai); verify SSL and domain; test all screens on production URL | **CLICKABLE PROTOTYPE LIVE** |

**Deliverable:** All 7 screens deployed to production URL; demo script finalized; 3 demos scheduled

---

### PHASE 1: WORKING CORE MVP (Weeks 4–10)

---

#### Week 4: Mar 2 – Mar 6

**Theme:** Infrastructure + Auth Foundation

**Domain Lead (Person 1):**
| Day | Task | Output |
|-----|------|--------|
| Mon | Run first client demo | Demo feedback notes |
| Tue | Run second client demo | Demo feedback notes |
| Wed | Synthesize demo feedback; prioritize Phase 1 feature adjustments | Prioritized feedback document |
| Thu | Design database schema: tenants, users, roles, permissions tables | Schema specification |
| Fri | Design RBAC matrix: 5 roles × all permissions | Role-permission matrix document |

**Technical Lead (Person 2):**
| Day | Task | Output |
|-----|------|--------|
| Mon | Set up AWS RDS (PostgreSQL, db.t3.micro, Mumbai); configure VPC, security groups | RDS instance running |
| Tue | Set up AWS S3 bucket (Mumbai) with SSE-S3 encryption; configure IAM policies | S3 bucket configured |
| Wed | Set up AWS SES for email notifications (Mumbai region) | SES configured and verified |
| Thu | Implement multi-tenant database schema: tenant_id on all tables, PostgreSQL RLS policies | Database migration scripts |
| Fri | Implement NextAuth.js: email/password + TOTP MFA; session management in RDS | Authentication system working |

**Deliverable:** Working authentication with multi-tenancy; AWS infrastructure provisioned

---

#### Week 5: Mar 9 – Mar 13

**Theme:** Auth Completion + Compliance Registry Start

**Domain Lead (Person 1):**
| Day | Task | Output |
|-----|------|--------|
| Mon | Run third client demo; finalize feedback synthesis | Complete demo feedback synthesis |
| Tue | Write user stories for compliance registry module (CRUD, assignment, tracking) | User stories with acceptance criteria |
| Wed | Map 50 RBI Master Direction requirements to compliance registry fields | Compliance seed data specification |
| Thu | Design compliance task workflow: assignment → tracking → evidence → review → close | Workflow specification with states |
| Fri | Test auth flow end-to-end; verify MFA works; verify tenant isolation | QA report for auth module |

**Technical Lead (Person 2):**
| Day | Task | Output |
|-----|------|--------|
| Mon | Build user management: CRUD operations, role assignment, tenant-scoped user listing | User management API + UI |
| Tue | Build tenant provisioning script: create tenant, admin user, default roles, sample data | Tenant setup automation |
| Wed | Build compliance registry database: requirements table, compliance_tasks table, evidence table | Database schema + migrations |
| Thu | Build compliance registry API: CRUD endpoints with RLS enforcement | API routes |
| Fri | Build compliance registry UI: requirement list, detail view, status badges, filter/sort | Compliance registry front-end |

**Deliverable:** Compliance registry module functional with CRUD and status tracking

---

#### Week 6: Mar 16 – Mar 20

**Theme:** Compliance Task Workflow + Audit Planning Start

**Domain Lead (Person 1):**
| Day | Task | Output |
|-----|------|--------|
| Mon | Design audit planning workflow: universe → annual plan → engagement → execution | Audit planning workflow specification |
| Tue | Write audit program templates for 3 audit types (branch, IS, credit) | Audit program templates |
| Wed | Define audit universe structure: auditable entities, risk rating, last audit date | Audit universe specification |
| Thu | Test compliance registry module thoroughly with realistic scenarios | Bug report + edge case list |
| Fri | Write user stories for audit planning module | User stories with acceptance criteria |

**Technical Lead (Person 2):**
| Day | Task | Output |
|-----|------|--------|
| Mon | Build compliance task assignment: assign to user, set deadline, notification | Task assignment workflow |
| Tue | Build compliance task tracking: status updates, deadline alerts, evidence upload to S3 | Task tracking + evidence upload |
| Wed | Build audit planning database: audit_universe, audit_plans, engagements tables | Database schema + migrations |
| Thu | Build audit planning API: CRUD for audit universe, annual plan creation, engagement setup | API routes |
| Fri | Build audit plan UI: annual plan calendar view, engagement cards, team assignment | Audit planning front-end |

**Deliverable:** Compliance task workflow complete; audit planning module started

---

#### Week 7: Mar 23 – Mar 27

**Theme:** Audit Planning Completion + Finding Management Start

**Domain Lead (Person 1):**
| Day | Task | Output |
|-----|------|--------|
| Mon | Design finding workflow end-to-end: draft → review → auditee response → action plan → closure | Finding lifecycle specification |
| Tue | Define finding severity levels, root cause categories, status transitions | Finding classification taxonomy |
| Wed | Write edge cases for finding workflow: rejected findings, re-opened findings, overdue actions | Edge case specifications |
| Thu | Test audit planning module with realistic scenarios | Bug report + edge case findings |
| Fri | Begin pilot preparation documents: LOI template draft, DPA outline | Draft legal templates |

**Technical Lead (Person 2):**
| Day | Task | Output |
|-----|------|--------|
| Mon | Complete audit planning: engagement workspace, audit program linkage, progress tracking | Audit planning module complete |
| Tue | Build finding management database: findings, finding_responses, action_plans, finding_evidence tables | Database schema + migrations |
| Wed | Build finding management API: create finding, assign severity, link to engagement | API routes (finding CRUD) |
| Thu | Build finding review workflow API: submit for review, approve, reject, return for revision | API routes (finding workflow) |
| Fri | Build finding list UI: filterable table with severity badges, status indicators, assigned auditor | Finding list front-end |

**Deliverable:** Audit planning complete; finding management database and APIs started

---

#### Week 8: Mar 30 – Apr 3

**Theme:** Finding Management Core

**Domain Lead (Person 1):**
| Day | Task | Output |
|-----|------|--------|
| Mon | Design auditee response workflow: view finding → submit response → upload evidence → track deadline | Auditee response specification |
| Tue | Write realistic finding descriptions for demo data (35 findings across 3 audits) | Demo finding dataset |
| Wed | Design action plan tracking: milestones, deadlines, responsible person, evidence | Action plan specification |
| Thu | Test finding creation and review workflow | Bug report |
| Fri | Design dashboard widgets: findings by severity chart, findings aging analysis, open vs closed trend | Dashboard widget specifications |

**Technical Lead (Person 2):**
| Day | Task | Output |
|-----|------|--------|
| Mon | Build finding detail UI: full finding view with all fields, evidence attachments, timeline | Finding detail page |
| Tue | Build auditee response flow: view finding, submit response text, upload evidence | Auditee response UI + API |
| Wed | Build action plan tracking: create action items, set deadlines, track completion | Action plan module |
| Thu | Build finding status lifecycle: state machine for draft → reviewed → responded → action planned → closed | Finding state management |
| Fri | Build finding severity filter, date range filter, engagement filter on finding list | Finding filters and search |

**Deliverable:** Finding management core functionality complete

---

#### Week 9: Apr 6 – Apr 10

**Theme:** Dashboards Start + Finding Polish

**Domain Lead (Person 1):**
| Day | Task | Output |
|-----|------|--------|
| Mon | Define CEO dashboard: metrics, KPIs, visualizations, data sources | CEO dashboard specification |
| Tue | Define CAE dashboard: audit progress, team utilization, finding trends | CAE dashboard specification |
| Wed | Define compliance scorecard: scoring methodology, thresholds, color coding | Compliance scorecard specification |
| Thu | Design board report PDF structure: cover page, sections, charts, tables | Board report template specification |
| Fri | End-to-end testing of all modules; verify data flows correctly between modules | Integration test report |

**Technical Lead (Person 2):**
| Day | Task | Output |
|-----|------|--------|
| Mon | Build CEO dashboard: compliance health score widget, audit progress donut, critical findings counter | CEO dashboard |
| Tue | Build CEO dashboard: regulatory calendar widget, PCA indicator panel, DAKSH status widget | CEO dashboard complete |
| Wed | Build CAE dashboard: audit plan progress, team workload, finding aging chart, overdue items list | CAE dashboard |
| Thu | Build compliance scorecard: overall score calculation, per-category breakdown, trend line | Compliance scorecard |
| Fri | Wire all dashboards to real data; fix data aggregation queries; optimize slow queries | Connected dashboards |

**Deliverable:** Dashboard framework with CEO and CAE views connected to real data

---

#### Week 10: Apr 13 – Apr 17

**Theme:** Reports + MVP Completion

**Domain Lead (Person 1):**
| Day | Task | Output |
|-----|------|--------|
| Mon | Verify all dashboard data accuracy against source records | Data accuracy verification report |
| Tue | Test PDF board report output; verify formatting, data completeness | Board report QA |
| Wed | Create training materials: quick-start guide, feature walkthrough document | Training documentation |
| Thu | Full MVP testing: end-to-end user journey from login to board report | Comprehensive QA report |
| Fri | Finalize MVP demo script; update client-facing materials | Updated demo materials |

**Technical Lead (Person 2):**
| Day | Task | Output |
|-----|------|--------|
| Mon | Build PDF board report generation: executive summary, audit coverage, key findings, compliance scorecard, recommendations | PDF report generator |
| Tue | Build Excel export: findings list, compliance status, audit plan progress as downloadable XLSX | Excel export functionality |
| Wed | Integrate all chart components (Recharts): compliance trend, finding distribution, audit coverage heatmap | Chart integration |
| Thu | Performance optimization: query optimization, lazy loading, pagination for large lists | Performance improvements |
| Fri | Full deployment verification; Sentry error monitoring setup; CloudWatch alarms | **WORKING MVP COMPLETE** |

**Deliverable:** All 4 core modules live with dashboards and report generation

---

### PHASE 2: PILOT-READY (Weeks 11–14)

---

#### Week 11: Apr 20 – Apr 24

**Theme:** Maker-Checker + Auditee Portal

**Domain Lead (Person 1):**
| Day | Task | Output |
|-----|------|--------|
| Mon | Define maker-checker rules: which operations, approval levels, escalation | Maker-checker specification |
| Tue | Design auditee self-service portal: finding view, response submission, evidence upload, deadline tracking | Auditee portal specification |
| Wed | Begin UI string extraction for Hindi, Marathi, Gujarati translation | Translation string list (500+ strings) |
| Thu | Coordinate translations: engage translators, provide banking terminology glossary | Translation coordination |
| Fri | Prepare pilot onboarding checklist: 8-step process from execution plan | Pilot onboarding playbook |

**Technical Lead (Person 2):**
| Day | Task | Output |
|-----|------|--------|
| Mon | Build maker-checker framework: configurable approval workflows, approval request/response API | Maker-checker engine |
| Tue | Apply maker-checker to: finding approval, report release, compliance certification | Maker-checker integrated |
| Wed | Build auditee portal: separate dashboard view for auditees with assigned findings, pending responses, upcoming deadlines | Auditee portal front-end |
| Thu | Build auditee self-service: submit action plans, upload evidence, track deadlines | Auditee self-service features |
| Fri | Build email notification foundation: SES integration, template engine, notification preferences | Email notification system |

**Deliverable:** Maker-checker workflows active; auditee portal functional

---

#### Week 12: Apr 27 – May 1

**Theme:** Notifications + i18n

**Domain Lead (Person 1):**
| Day | Task | Output |
|-----|------|--------|
| Mon | Define all notification triggers and email templates | Notification specification (15+ templates) |
| Tue | Review Hindi translations; verify banking terminology | Hindi translation QA |
| Wed | Review Marathi translations; verify banking terminology | Marathi translation QA |
| Thu | Review Gujarati translations; verify banking terminology | Gujarati translation QA |
| Fri | Test auditee portal with realistic scenarios; test maker-checker flows | QA report |

**Technical Lead (Person 2):**
| Day | Task | Output |
|-----|------|--------|
| Mon | Build email notifications: finding assignment, deadline reminders (7-day, 3-day, 1-day, overdue) | Finding notifications |
| Tue | Build email notifications: escalation alerts, report release, compliance certification | Workflow notifications |
| Wed | Implement i18n framework (next-intl or similar); load Hindi, Marathi, Gujarati translations | i18n integration |
| Thu | Build language switcher; persist preference per user; bilingual report generation | Language switching |
| Fri | Build immutable audit trail: append-only audit_log table, hash chain, no UPDATE/DELETE grants | Audit trail implementation |

**Deliverable:** Email notifications live; Hindi, Marathi, Gujarati UI complete; audit trail active

---

#### Week 13: May 4 – May 8

**Theme:** Demo Dataset + Data Import

**Domain Lead (Person 1):**
| Day | Task | Output |
|-----|------|--------|
| Mon | Finalize complete Sahyadri UCB demo dataset: all entities, relationships, history | Complete demo dataset specification |
| Tue | Create CSV templates: org structure, staff list, compliance requirements, branches | CSV import templates |
| Wed | Prepare Vendor Risk Pack document | Vendor Risk Pack (1-pager) |
| Thu | Prepare LOI template, DPA template, pilot terms document | Legal templates finalized |
| Fri | Prepare board-note kit templates | Board-note templates (5 documents) |

**Technical Lead (Person 2):**
| Day | Task | Output |
|-----|------|--------|
| Mon | Build demo data seeder script: programmatically creates complete Sahyadri UCB tenant with all data | Demo seeder script |
| Tue | Build CSV import: upload and parse CSV for org structure, staff list, compliance requirements | CSV import feature |
| Wed | Build CSV import validation: error reporting, duplicate detection, data type verification | Import validation |
| Thu | Build DAKSH submission preparation screen: formatted data export for manual upload | DAKSH export screen |
| Fri | UI polish: consistent spacing, loading states, error messages, empty states, mobile responsiveness | UI refinements |

**Deliverable:** Complete demo dataset; CSV import working; legal templates ready

---

#### Week 14: May 11 – May 15

**Theme:** Hardening + Pilot Preparation

**Domain Lead (Person 1):**
| Day | Task | Output |
|-----|------|--------|
| Mon | Full platform walkthrough: every feature, every role, every workflow | Comprehensive QA report |
| Tue | Prepare pilot training materials: slide deck, hands-on exercises, FAQ | Training package |
| Wed | Schedule pilot kick-offs with 2–3 committed UCBs | Confirmed pilot schedule |
| Thu | Create support process: issue tracking, escalation path, weekly call template | Support playbook |
| Fri | Final demo rehearsal with complete Sahyadri UCB dataset | Demo sign-off |

**Technical Lead (Person 2):**
| Day | Task | Output |
|-----|------|--------|
| Mon | Security hardening: review all RLS policies, verify MFA enforcement, check S3 bucket policies | Security audit report |
| Tue | Deployment hardening: PM2 cluster mode, Nginx optimization, rate limiting, CORS configuration | Production-ready deployment |
| Wed | Monitoring setup: Sentry error tracking, CloudWatch CPU/memory alarms, uptime monitoring | Monitoring dashboard |
| Thu | Backup verification: test RDS snapshot restore, verify S3 versioning, document recovery procedure | Backup test report |
| Fri | Final deployment; smoke test all features on production; verify SSL, domain, CDN | **PILOT-READY PLATFORM** |

**Deliverable:** Platform hardened, monitored, and ready for real UCB pilot users

---

### PHASE 3: FIRST PILOTS (Weeks 15–16+)

---

#### Week 15: May 18 – May 22

**Theme:** Pilot Onboarding

**Domain Lead (Person 1):**
| Day | Task | Output |
|-----|------|--------|
| Mon | Onboard UCB #1: create tenant, import org structure, load compliance registry | UCB #1 tenant live |
| Tue | UCB #1 training session (2 hours, screen-share) with audit team | Training completed |
| Wed | Onboard UCB #2: create tenant, import org structure, load compliance registry | UCB #2 tenant live |
| Thu | UCB #2 training session (2 hours, screen-share) with audit team | Training completed |
| Fri | Onboard UCB #3 (if ready): create tenant, begin setup | UCB #3 setup started |

**Technical Lead (Person 2):**
| Day | Task | Output |
|-----|------|--------|
| Mon | Support UCB #1 onboarding: resolve data import issues, verify tenant isolation | Technical support log |
| Tue | Monitor system during UCB #1 training; fix any issues found during training | Issue resolution log |
| Wed | Support UCB #2 onboarding: resolve data import issues, verify tenant isolation | Technical support log |
| Thu | Monitor system during UCB #2 training; fix any issues found | Issue resolution log |
| Fri | Deploy fixes for issues found during onboarding; optimize performance for multi-tenant load | Patch deployment |

**Deliverable:** 2–3 UCBs onboarded with trained audit teams

---

#### Week 16: May 25 – May 29

**Theme:** Pilot Support + Iteration

**Domain Lead (Person 1):**
| Day | Task | Output |
|-----|------|--------|
| Mon | Weekly check-in call with UCB #1: collect feedback, document issues | Feedback log |
| Tue | Weekly check-in call with UCB #2: collect feedback, document issues | Feedback log |
| Wed | Prioritize feedback: quick wins vs. deferred; update feature backlog | Prioritized issue list |
| Thu | Begin collecting pilot metrics: usage data, user adoption, workflows completed | Pilot metrics dashboard |
| Fri | Week 16 summary: pilot status, key issues, next week plan | Weekly status report |

**Technical Lead (Person 2):**
| Day | Task | Output |
|-----|------|--------|
| Mon–Tue | Implement quick-win bug fixes and feature requests from pilot feedback | Patch deployments |
| Wed–Thu | Performance monitoring: response times, error rates, database query performance | Performance report |
| Fri | System health check: disk space, database connections, backup verification | Health check report |

**Deliverable:** Pilots running smoothly; first round of feedback-driven improvements deployed

---

## Ongoing Post-Week 16

After Week 16, the project enters a continuous pilot support and iteration cycle:

- **Weekly:** Check-in calls with each pilot UCB; deploy bug fixes and quick wins
- **Week 20 (Mid-Pilot Review):** Share progress against acceptance criteria; address blockers; reconfirm pricing
- **Week 22–23 (Board Note Delivery):** Provide CAE with pre-populated board-note templates
- **Week 24 (Pilot Complete):** End-of-pilot review; document improvements; collect testimonials; present conversion proposal
- **Month 6–7:** Target first paid subscription conversion

---

## Dependencies & Critical Path

```
Week 1–3: Phase 0 (Prototype)
    └── No external dependencies; pure frontend + dummy data

Week 4: AWS Infrastructure Setup
    ├── RDS PostgreSQL → Required for all Phase 1 modules
    ├── S3 Bucket → Required for evidence uploads (Week 6+)
    └── SES → Required for email notifications (Week 11+)

Week 4–5: Auth + Multi-Tenancy
    └── BLOCKING: All subsequent modules depend on working auth and tenant isolation

Week 5–6: Compliance Registry
    └── Dashboard widgets depend on compliance data (Week 9)

Week 6–7: Audit Planning
    └── Finding management depends on engagements existing (Week 7)

Week 7–9: Finding Management
    ├── Auditee portal depends on findings (Week 11)
    ├── Dashboards depend on finding data (Week 9)
    └── Board reports depend on finding data (Week 10)

Week 9–10: Dashboards + Reports
    └── Pilot demos depend on working reports

Week 11–12: Pilot-Ready Features
    └── Pilot onboarding depends on maker-checker, notifications, i18n

Week 13–14: Demo Data + Hardening
    └── Pilot launch depends on complete demo dataset and security verification
```

---

## Risk Register

| Risk                                           | Likelihood | Impact | Mitigation                                                                      | Owner    |
| ---------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------- | -------- |
| Client expects full product at demo            | High       | High   | Set expectations with pilot SKU framework; Pilot A is sandbox only              | Person 1 |
| AI-generated code has bugs                     | High       | Medium | Manual review every feature; RLS prevents data leaks; Sentry monitoring         | Person 2 |
| Client demo feedback requires major pivot      | Medium     | High   | Buffer 2 days in Week 4 for feedback synthesis; Phase 1 priorities adjustable   | Person 1 |
| AWS setup takes longer than expected           | Low        | Medium | Fallback: use Lightsail database instead of RDS for Week 4                      | Person 2 |
| MFA implementation complexity                  | Medium     | Medium | Use proven NextAuth + TOTP library; fallback to email OTP if TOTP delayed       | Person 2 |
| Translation quality for banking terms          | Medium     | Medium | Domain lead reviews all translations; create banking terminology glossary first | Person 1 |
| Pilot UCB IT approval delays                   | High       | High   | Provide Vendor Risk Pack proactively; start paperwork at Pilot A stage          | Person 1 |
| Single server capacity under multi-tenant load | Low        | Medium | Lightsail upgrade path is instant (4GB → 8GB → 16GB); monitor CloudWatch        | Person 2 |

---

## Infrastructure Cost Timeline

| Phase             | Monthly Cost (INR) | Cumulative (INR) | Components                       |
| ----------------- | ------------------ | ---------------- | -------------------------------- |
| Phase 0 (W1–3)    | 3,000–4,000        | 3,000–4,000      | Lightsail instance only          |
| Phase 1 (W4–10)   | 4,000–6,000        | 10,000–15,000    | Lightsail + RDS + S3 + SES       |
| Phase 2 (W11–14)  | 5,000–8,000        | 15,000–23,000    | Same + increased storage         |
| Phase 3 (W15–16+) | 8,000–15,000       | 23,000–38,000    | Production load from pilot users |

---

## Success Metrics

| Milestone               | Metric               | Target                               | Measurement Method               |
| ----------------------- | -------------------- | ------------------------------------ | -------------------------------- |
| Week 3: Prototype Demo  | Client interest      | ≥2 of 3 demos → pilot commitment     | Verbal/email confirmation        |
| Week 10: MVP Complete   | Feature completeness | All 4 modules functional             | Internal acceptance testing      |
| Week 14: Pilot Launch   | UCBs onboarded       | 2–3 UCBs active                      | Tenant + user login verification |
| Week 20: Mid-Pilot      | Daily active usage   | ≥5 users/pilot UCB logging in weekly | Application logs + CloudWatch    |
| Week 24: Pilot Complete | Satisfaction         | ≥1 UCB converts to paid; NPS ≥7      | Survey + subscription signed     |
| Month 9–10              | Revenue              | 3 paying clients; INR 9–12L ARR      | Signed agreements                |

---

_Document generated: February 7, 2026_
_Next review: February 9, 2026 (Sprint 0 kickoff)_
