# Roadmap: AEGIS Clickable Prototype

**Milestone:** Clickable Prototype (Phase 0)
**Timeline:** 3 weeks (Feb 9 - Feb 27, 2026)
**Target:** Demo-able product with Apex Sahakari Bank dummy data deployed to AWS Mumbai

---

## Phase Overview

| Phase | Name | Requirements | Success Criteria |
|-------|------|--------------|------------------|
| 1 | Project Setup & Demo Data | 12 | Project skeleton running locally with demo data files |
| 2 | Core Screens | 21 | Dashboard, Compliance Registry, Audit Plan screens working |
| 3 | Finding Management & Reports | 8 | Finding detail, Board Report screens working |
| 4 | Polish & Deploy | 5 | Multi-language, responsive design, deployed to AWS |

---

## Phase 1: Project Setup & Demo Data

**Goal:** Initialize Next.js project and create all demo data files for Apex Sahakari Bank

**Requirements:**
- DATA-01, DATA-02, DATA-03, DATA-04, DATA-05
- RBI-01, RBI-02, RBI-03
- AUTH-01, AUTH-02, AUTH-03
- NAV-01, NAV-04

**Success Criteria:**
1. Next.js 14 project runs locally with TypeScript and Tailwind CSS
2. shadcn/ui components installed and configured
3. Login screen displays with logo, language selector, and MFA prompt
4. Sidebar navigation renders with all 7 menu items
5. Clicking navigation items routes to placeholder pages
6. Apex Sahakari Bank profile JSON loads and displays on a test page
7. 50+ RBI compliance requirements load from JSON (sourced from provided RBI circular PDFs)
8. 8-10 planned audits load from JSON
9. 35 findings load from JSON with realistic RBI-style observations
10. Compliance calendar data loads correctly
11. RBI circular PDFs are catalogued for reference
12. Common RBI observations are documented for finding generation

**Plans:**
- [ ] 01-01-PLAN.md — Foundation: Types, RBI circulars index, common observations
- [ ] 01-02-PLAN.md — Initialize Next.js 14 with App Router
- [ ] 01-03-PLAN.md — Install shadcn/ui components and create project structure
- [ ] 01-04-PLAN.md — Create login screen with authentication layout
- [ ] 01-05-PLAN.md — Create dashboard layout with sidebar and top bar
- [ ] 01-06-PLAN.md — Create main feature placeholder pages (Dashboard, Compliance, Audit Plan)
- [ ] 01-07-PLAN.md — Create secondary placeholder pages (Findings, Board Report, Auditee, Settings)
- [ ] 01-08-PLAN.md — Create bank profile and compliance requirements data
- [ ] 01-09-PLAN.md — Create audit plans and findings data
- [ ] 01-10-PLAN.md — Create compliance calendar and connect data to dashboard

**Key Tasks:**
- Initialize Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Install and configure shadcn/ui
- Create app layout with sidebar navigation
- Build login page with language selector
- Catalogue provided RBI circular PDFs
- Extract compliance requirements from RBI circulars
- Document common RBI observations for findings
- Create JSON files for all demo data
- Set up client-side routing

---

## Phase 2: Core Screens

**Goal:** Build the three most important screens: Dashboard, Compliance Registry, and Audit Plan

**Requirements:**
- DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06
- COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, COMP-06
- NAV-02, NAV-03

**Success Criteria:**
1. Dashboard displays all widgets: health score, donut chart, count cards, risk indicator, regulatory calendar
2. Compliance registry table displays 50+ requirements
3. Table is sortable by all columns
4. Table is filterable by category and status
5. Status badges display with correct colors
6. Clicking requirement opens detail modal
7. Compliance trend chart renders with dummy data
8. Audit plan calendar view shows all planned audits
9. Engagement cards display with all required fields
10. Status indicators show correct colors for each audit
11. Filter by audit type works correctly
12. Progress bars show engagement completion
13. Top bar displays user profile dropdown and notifications
14. Layout collapses to hamburger menu on mobile
15. All screens load without page refresh
16. Navigation between all screens works
17. Quick action buttons on dashboard are clickable
18. Data from JSON files populates all screens correctly
19. Empty states display where appropriate
20. Loading states show during navigation
21. Dashboard requirement references updated (removed DASH-07 reference to DAKSH quick action)

**Plans:** 6 plans in 3 waves
- [ ] 02-01-PLAN.md — Install Recharts + react-is + TanStack Table, shadcn chart + 6 UI primitives, expand compliance data to 50+, update icons
- [ ] 02-02-PLAN.md — Dashboard widgets: RadialBarChart gauge with PolarAngleAxis, PieChart donut with ChartContainer, count cards, risk panel, calendar, quick actions
- [ ] 02-03-PLAN.md — Compliance components: TanStack Table with sorting/filtering, detail dialog, AreaChart trend with ChartContainer
- [ ] 02-04-PLAN.md — Audit plan components: FY month-grid calendar, engagement cards with shadcn Progress, type filter, detail Sheet
- [ ] 02-05-PLAN.md — Layout enhancements: responsive top bar, mobile sidebar polish, Suspense loading skeleton
- [ ] 02-06-PLAN.md — Page composition: wire all components into Dashboard, Compliance, and Audit Plan pages with human verification

**Key Tasks:**
- Build CEO dashboard with all widgets
- Implement Recharts for visualizations
- Build compliance registry table with filters
- Build audit plan calendar view
- Implement responsive layout
- Connect all screens to JSON data

---

## Phase 3: Finding Management & Reports

**Goal:** Build finding detail and board report preview screens

**Requirements:**
- FIND-01, FIND-02, FIND-03, FIND-04, FIND-05, FIND-06
- RPT-01, RPT-02, RPT-03, RPT-04, RPT-05, RPT-06
- DATA-02 (partial), DATA-04 (partial), RBI-02, RBI-03

Note: AUDT-01 through AUDT-06 are covered by Phase 2 plans (02-04, 02-06).

**Success Criteria:**
1. Findings list table displays all 35 findings
2. Severity badges show correct colors (Critical=red, High=orange, etc.)
3. Filterable by severity, status, category
4. Clicking finding opens detail page
5. Finding detail shows all fields: observation, root cause, risk, response, action plan
6. Timeline view displays status history
7. Board report preview shows executive summary
8. Compliance scorecard displays with category breakdowns
9. Print/PDF preview mode formats correctly
10. All finding-related data loads from JSON
11. Board report data aggregates correctly
12. 50 compliance requirements in demo data
13. 35 findings with realistic RBI-style observations

**Plans:** 5 plans in 3 waves
- [ ] 03-01-PLAN.md — Expand demo data: 35 findings + 50 compliance requirements
- [ ] 03-02-PLAN.md — Board report utilities and components: ExecutiveSummary, AuditCoverageTable, KeyFindingsSummary
- [ ] 03-03-PLAN.md — Enhanced findings list with TanStack Table sorting/filtering
- [ ] 03-04-PLAN.md — Finding detail page with status timeline
- [ ] 03-05-PLAN.md — Board report composition: ComplianceScorecard, Recommendations, print styles

**Key Tasks:**
- Expand findings to 35 and compliance requirements to 50
- Build findings list table with advanced filters
- Build finding detail page with timeline
- Build complete board report with print mode

---

## Phase 4: Polish & Deploy

**Goal:** Add multi-language support, finalize responsive design, and deploy to AWS Mumbai

**Requirements:**
- I18N-01, I18N-02, I18N-03
- RPT-06

**Success Criteria:**
1. All UI labels have Hindi, Marathi, Gujarati translations
2. Language switcher in top bar persists preference
3. Switching language updates all visible labels immediately
4. Banking terminology is correctly translated
5. All screens are mobile-friendly
6. No horizontal scrolling on any screen size
7. Touch targets are large enough on mobile
8. Application deployed to AWS Lightsail Mumbai
9. SSL certificate configured and valid
10. Custom domain configured
11. Production URL loads all screens correctly
12. Demo works on mobile devices
13. Demo works on tablets
14. Demo script is ready (15-min and 30-min versions)

**Plans:** 7 plans in 3 waves
- [ ] 04-01-PLAN.md — i18n foundation: install next-intl, cookie-based locale, Noto Sans fonts, English messages
- [ ] 04-02-PLAN.md — Translation content: Hindi, Marathi, Gujarati message files with banking terminology
- [ ] 04-03-PLAN.md — Language switcher wiring, translate all components, print stylesheet
- [ ] 04-04-PLAN.md — Responsive design polish: mobile/tablet layouts, touch targets, adaptive grids
- [ ] 04-05-PLAN.md — AWS infrastructure: deployment configs, Lightsail instance provisioning
- [ ] 04-06-PLAN.md — Server setup: Node.js/PM2/Nginx installation, repo clone, SSL decision
- [ ] 04-07-PLAN.md — Application deployment, end-to-end verification, demo scripts

**Key Tasks:**
- Set up i18n framework (next-intl) with cookie-based locale
- Switch fonts to Noto Sans family for multi-script support
- Create translation files for EN/HI/MR/GU
- Wire language switcher to next-intl cookie mechanism
- Replace all hardcoded strings with translation calls
- Responsive design testing and fixes across breakpoints
- Set up AWS Lightsail instance (Mumbai ap-south-1)
- Configure PM2, Nginx, SSL
- Deploy application to production
- End-to-end testing on production URL
- Prepare 15-min and 30-min demo scripts

---

## Milestone Success Criteria

**Clickable Prototype Complete When:**
- [ ] All 6 screens are accessible via navigation
- [ ] All 47 v1 requirements are implemented
- [ ] Demo data (Apex Sahakari Bank) loads correctly on all screens
- [ ] Application is deployed to AWS Mumbai with valid SSL
- [ ] Demo works on desktop, tablet, and mobile
- [ ] All 4 languages (EN/HI/MR/GU) work
- [ ] Demo script is ready for client presentations
- [ ] 3 client demos are scheduled

---

*Roadmap created: February 7, 2026*
*Updated: February 7, 2026 — Phase 1 plans created*
*Updated: February 7, 2026 — Phase 4 plans created*
*Updated: February 7, 2026 — Phase 3 plans created*
*Updated: February 8, 2026 — Phase 2 plans created (6 plans in 3 waves)*
*Updated: February 8, 2026 — Phase 4 plans finalized (7 plans in 3 waves)*
