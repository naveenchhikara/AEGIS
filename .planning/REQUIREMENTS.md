# Requirements: AEGIS - UCB Internal Audit & Compliance Platform

**Defined:** February 7, 2026
**Core Value:** UCB audit teams can demonstrate complete compliance coverage to RBI and their board with clear evidence, while CEOs get real-time visibility into audit status and risk exposure.

## v1 Requirements (Clickable Prototype Milestone)

Requirements for the clickable prototype (Phase 0, Weeks 1-3). This milestone establishes a demo-able product to secure pilot commitments.

### Authentication & Access

- [ ] **AUTH-01**: User sees login screen with logo, email/password fields, and MFA prompt UI
- [ ] **AUTH-02**: User can select language (EN/HI/MR/GU) from login screen dropdown
- [ ] **AUTH-03**: Demo login accepts any valid email format and redirects to dashboard (no real auth)

### Navigation & Layout

- [ ] **NAV-01**: Sidebar navigation shows all 7 main screens
- [ ] **NAV-02**: Top bar shows user profile dropdown, language switcher, notifications bell
- [ ] **NAV-03**: Layout is responsive — sidebar collapses to hamburger menu on mobile
- [ ] **NAV-04**: All screens load without page refresh (client-side routing)

### Dashboard

- [ ] **DASH-01**: Compliance health score displayed (0-100) with color indicator (red/yellow/green)
- [ ] **DASH-02**: Donut chart showing audit coverage (audited entities / total entities)
- [ ] **DASH-03**: Count cards: Total findings, Critical findings, Open findings, Overdue findings
- [ ] **DASH-04**: Risk indicator panel (Overall risk level with contributing factors)
- [ ] **DASH-05**: Regulatory calendar widget showing upcoming compliance deadlines
- [ ] **DASH-06**: Quick action buttons: New Finding, New Compliance Task, View Audit Plan

### Compliance Registry

- [ ] **COMP-01**: Filterable table showing 50+ RBI compliance requirements
- [ ] **COMP-02**: Sortable columns: Requirement ID, Category, Description, Status, Due Date, Evidence Count, Assigned To
- [ ] **COMP-03**: Status badges: Compliant (green), Partial (yellow), Non-Compliant (red), Pending (gray)
- [ ] **COMP-04**: Category filter dropdown: Risk Management, Governance, Operations, IT, Credit, Market Risk
- [ ] **COMP-05**: Click on requirement row opens detail modal with full description and evidence list
- [ ] **COMP-06**: Compliance health trend chart (last 6 months)

### Audit Planning

- [ ] **AUDT-01**: Annual plan calendar view showing planned audits by month
- [ ] **AUDT-02**: Engagement cards showing: Audit name, branch/department, planned dates, assigned team, status
- [ ] **AUDT-03**: Status indicators: Not Started (gray), In Progress (blue), On Hold (orange), Complete (green)
- [ ] **AUDT-04**: Filter by audit type: Branch Audit, IS Audit, Credit Audit, Compliance Audit, Revenue Audit
- [ ] **AUDT-05**: Progress bar for each engagement showing completion percentage
- [ ] **AUDT-06**: Click on engagement opens workspace with audit program linkages

### Finding Management

- [ ] **FIND-01**: Findings list table with severity badges: Critical (red), High (orange), Medium (yellow), Low (green)
- [ ] **FIND-02**: Filterable columns: Finding ID, Title, Category, Severity, Status, Assigned Auditor, Age (days)
- [ ] **FIND-03**: Status dropdown filter: Draft, Under Review, Response Pending, Action Planned, Closed
- [ ] **FIND-04**: Click on finding opens detail page with all fields and timeline
- [ ] **FIND-05**: Finding detail shows: Observation, Root Cause, Risk Impact, Auditee Response, Action Plan, Evidence attachments
- [ ] **FIND-06**: Timeline view showing status change history with dates and actors

### Board Report

- [ ] **RPT-01**: Executive summary section with key metrics and risk summary
- [ ] **RPT-02**: Audit coverage table: Planned vs Actual audits by category
- [ ] **RPT-03**: Key findings summary: Top 10 critical findings with brief descriptions
- [ ] **RPT-04**: Compliance scorecard: Overall score plus category breakdowns
- [ ] **RPT-05**: Recommendations section with prioritized action items
- [ ] **RPT-06**: Print/PDF preview mode with clean formatting

### RBI Circulars & Common Observations

- [ ] **RBI-01**: Compliance requirements sourced from provided RBI circular PDFs
- [ ] **RBI-02**: Common audit observations populated from RBI examination patterns
- [ ] **RBI-03**: Findings dataset includes realistic RBI-style observations

### Multi-Language

- [ ] **I18N-01**: All UI labels translated to Hindi, Marathi, Gujarati
- [ ] **I18N-02**: Language switcher in top bar persists preference
- [ ] **I18N-03**: Banking terminology correctly translated (verified by domain expert)

### Demo Data

- [ ] **DATA-01**: Sahyadri UCB profile: bank name, branch list, departments, staff directory
- [ ] **DATA-02**: 50+ RBI compliance requirements with categories, due dates, statuses (sourced from provided RBI circular PDFs)
- [ ] **DATA-03**: 8-10 planned audits with team assignments and progress
- [ ] **DATA-04**: 35 open findings with realistic descriptions, severities, root causes, responses (sourced from common RBI observations)
- [ ] **DATA-05**: Compliance calendar with upcoming deadlines

## v2 Requirements (Deferred to Working MVP)

Requirements for Phase 1 (Working Core MVP, Weeks 4-10) — not part of clickable prototype.

### Real Authentication

- **AUTH-MVP-01**: NextAuth.js with email/password authentication
- **AUTH-MVP-02**: TOTP MFA implementation
- **AUTH-MVP-03**: Multi-tenant database with row-level security
- **AUTH-MVP-04**: Role-based access control (5 roles: CEO, CAE, Auditor, Auditee, Admin)

### Backend & Database

- **DB-MVP-01**: PostgreSQL RDS with tenant isolation
- **DB-MVP-02**: S3 bucket for evidence file storage
- **DB-MVP-03**: API routes for all CRUD operations
- **DB-MVP-04**: SES email notifications

### Compliance Module

- **COMP-MVP-01**: CRUD operations for compliance requirements
- **COMP-MVP-02**: Task assignment and tracking workflow
- **COMP-MVP-03**: Evidence upload to S3
- **COMP-MVP-04**: Compliance task review and approval

### Additional Features

- **NOTIF-MVP-01**: Email notifications for deadlines and assignments
- **MAKER-MVP-01**: Maker-checker workflows
- **AUDIT-MVP-01**: Immutable audit trail
- **PDF-MVP-01**: Actual PDF generation for board reports

## Out of Scope

| Feature | Reason |
|---------|--------|
| Role-based views (CAE, Auditor, Auditee) | CEO view only in prototype; other roles added in MVP based on pilot feedback |
| Real authentication in prototype | Demo uses hardcoded login; real auth deferred to MVP (Week 4) |
| Backend/database in prototype | All data from JSON files; MVP adds PostgreSQL and APIs (Week 4) |
| Email notifications | Requires SES integration; deferred to MVP (Week 11) |
| Maker-checker workflows | Pilot-ready feature; deferred to Phase 2 (Week 11) |
| PDF generation | Preview only in prototype; actual PDF export in MVP (Week 10) |
| On-premise deployment | SaaS-only architecture; no single-tenant option |
| Mobile app | Web-first responsive design; native app not planned |
| Advanced analytics | Basic dashboards in prototype; advanced analytics in v2 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| NAV-01 | Phase 1 | Pending |
| NAV-02 | Phase 1 | Pending |
| NAV-03 | Phase 1 | Pending |
| NAV-04 | Phase 1 | Pending |
| DASH-01 | Phase 2 | Pending |
| DASH-02 | Phase 2 | Pending |
| DASH-03 | Phase 2 | Pending |
| DASH-04 | Phase 2 | Pending |
| DASH-05 | Phase 2 | Pending |
| DASH-06 | Phase 2 | Pending |
| DASH-07 | Phase 2 | Pending |
| COMP-01 | Phase 2 | Pending |
| COMP-02 | Phase 2 | Pending |
| COMP-03 | Phase 2 | Pending |
| COMP-04 | Phase 2 | Pending |
| COMP-05 | Phase 2 | Pending |
| COMP-06 | Phase 2 | Pending |
| AUDT-01 | Phase 3 | Pending |
| AUDT-02 | Phase 3 | Pending |
| AUDT-03 | Phase 3 | Pending |
| AUDT-04 | Phase 3 | Pending |
| AUDT-05 | Phase 3 | Pending |
| AUDT-06 | Phase 3 | Pending |
| FIND-01 | Phase 3 | Pending |
| FIND-02 | Phase 3 | Pending |
| FIND-03 | Phase 3 | Pending |
| FIND-04 | Phase 3 | Pending |
| FIND-05 | Phase 3 | Pending |
| FIND-06 | Phase 3 | Pending |
| RPT-01 | Phase 4 | Pending |
| RPT-02 | Phase 4 | Pending |
| RPT-03 | Phase 4 | Pending |
| RPT-04 | Phase 4 | Pending |
| RPT-05 | Phase 4 | Pending |
| RPT-06 | Phase 4 | Pending |
| RBI-01 | Phase 1 | Pending |
| RBI-02 | Phase 1 | Pending |
| RBI-03 | Phase 1 | Pending |
| I18N-01 | Phase 4 | Pending |
| I18N-02 | Phase 4 | Pending |
| I18N-03 | Phase 4 | Pending |
| DATA-01 | Phase 1 | Pending |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 1 | Pending |
| DATA-04 | Phase 1 | Pending |
| DATA-05 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 47 total
- Mapped to phases: 47
- Unmapped: 0 ✓

---
*Requirements defined: February 7, 2026*
*Last updated: February 7, 2026 after initial definition*
