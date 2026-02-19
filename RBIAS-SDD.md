RBIAS — Software Design Document

SOFTWARE DESIGN DOCUMENT

Risk-Based Internal Audit System
(RBIAS)

A Comprehensive Web-Based Platform for Bank Branch Internal Audit

Planning • Execution • Reporting • Compliance Tracking

Version 3.0 | February 2026 | Confidential

Prepared for: Naveen Chhikara

Confidential | Page 1

RBIAS — Software Design Document

Table of Contents

Table of Contents ......................................................................................................................... 2

Executive Summary ...................................................................................................................... 6

System Overview .......................................................................................................................... 8

System Context ......................................................................................................................... 8

User Roles and Personas ......................................................................................................... 8

System Modules ........................................................................................................................ 9

System Architecture .................................................................................................................... 11

Technology Stack .................................................................................................................... 11

Architecture Pattern ................................................................................................................ 11

API Design .............................................................................................................................. 12

Database Schema ...................................................................................................................... 13

Core Entity Tables ................................................................................................................... 13

branches .............................................................................................................................. 13

audits ................................................................................................................................... 14

audit_team_members .......................................................................................................... 15

audit_sections ...................................................................................................................... 15

audit_observations .............................................................................................................. 17

loan_reviews ........................................................................................................................ 17

sma_npa_entries ................................................................................................................. 18

cash_checks ........................................................................................................................ 20

RAM and Planning Tables ...................................................................................................... 20

ram_assessments ............................................................................................................... 20

ram_parameters (Reference/Config) ................................................................................... 21

Compliance Tracking Tables ................................................................................................... 22

compliance_items ................................................................................................................ 22

Value Statement / Examination Master Tables ....................................................................... 23

examination_areas .............................................................................................................. 23

examination_items ............................................................................................................... 23

audit_examination_responses ............................................................................................. 24

Supporting Tables ................................................................................................................... 26

Entity Relationship Summary .................................................................................................. 27

User Interface Design ................................................................................................................. 28

Screen Inventory ..................................................................................................................... 28

Key UI Patterns ....................................................................................................................... 30

Audit Execution Interface ..................................................................................................... 30

Confidential | Page 2

RBIAS — Software Design Document

Observation Entry Pattern ................................................................................................... 30

Compliance Tracker UI ........................................................................................................ 31

Dashboard Wireframe Specifications .................................................................................. 31

Feature Specifications ................................................................................................................ 32

M1: Audit Planning Module ..................................................................................................... 32

RAM Computation Engine ................................................................................................... 32

Annual Audit Plan Generator ............................................................................................... 33

M3: Audit Execution Module ................................................................................................... 34

Value Statement Examination Framework .......................................................................... 34

Examination Workflow per Functional Area ......................................................................... 35

Credit / Advances: Deep-Dive Examination ........................................................................ 36

Section Data Structures ....................................................................................................... 37

Smart Features for Field Auditors ........................................................................................ 37

M4: Report Generation Module ............................................................................................... 39

Risk Rating Computation ..................................................................................................... 39

M5: Compliance Tracking Module ........................................................................................... 40

Compliance Workflow .......................................................................................................... 40

Escalation Rules .................................................................................................................. 40

M6: Analytics & Dashboards Module ...................................................................................... 41

Key Analytics Views ............................................................................................................ 41

M8: Enterprise Risk Register & Audit Universe .......................................................................... 42

Audit Universe ......................................................................................................................... 42

Enterprise Risk Register ......................................................................................................... 42

Enhanced Risk-Based Plan Inputs .......................................................................................... 43

M9: Control Library & Standardized Work Programs .................................................................. 44

Control Library ......................................................................................................................... 44

Test Procedures & Work Programs ........................................................................................ 44

Control Effectiveness Analytics ........................................................................................... 45

M10: Continuous Auditing & Data-Driven Testing ...................................................................... 46

Data Integration Layer ............................................................................................................. 46

Rule-Based Analytics Engine .................................................................................................. 46

Data Exceptions & Continuous Monitoring .......................................................................... 47

M11: AI & Advanced Analytics Layer .......................................................................................... 48

Anomaly Detection .................................................................................................................. 48

Text Analytics & Predictive Models ......................................................................................... 48

Smart Suggestions UI ............................................................................................................. 48

Confidential | Page 3

RBIAS — Software Design Document

M12: Issue & Action Management .............................................................................................. 49

Issues Table ............................................................................................................................ 49

Action Plans ............................................................................................................................ 49

Enhanced Planning & Resource Management ........................................................................... 51

Auditor Skills & Capacity ......................................................................................................... 51

Geography-Aware Scheduling ................................................................................................ 51

Multi-Entity Audits ................................................................................................................... 51

GRC Integration & Open API Layer ............................................................................................ 52

Integration Points .................................................................................................................... 52

Shared Taxonomies & Unified Risk View ................................................................................ 52

UX & Mobility Enhancements ..................................................................................................... 53

Mobile Application / PWA ........................................................................................................ 53

Electronic Workpaper Management ........................................................................................ 53

Collaboration Features ............................................................................................................ 53

Multi-Tenant Architecture ............................................................................................................ 54

Tenant Isolation & Configuration ............................................................................................. 54

Deployment Models ................................................................................................................ 54

M13: Quality Management for Internal Audit Function ............................................................... 55

Quality Assessment Framework ............................................................................................. 55

Internal Audit Effectiveness KPIs ............................................................................................ 55

UCB & RBI Regulatory Alignment Framework ........................................................................... 57

M14: Unified Audit Universe & Calendar ................................................................................. 58

Audit Universe Entity Table ................................................................................................. 58

M15: Concurrent Audit Module ............................................................................................... 60

Concurrent Audit Scope Templates ..................................................................................... 60

Concurrent Audit Workbench .............................................................................................. 60

M16: IRAC & Provisioning Engine .......................................................................................... 61

IRAC Computation Pipeline ................................................................................................. 61

M17: Investment & Treasury Audit Controls ........................................................................... 62

M18: EDP / IS Audit Module ................................................................................................... 63

Application Inventory ........................................................................................................... 63

IS Audit Checklists ............................................................................................................... 63

M19: Regulatory Observation & Follow-up Hub ...................................................................... 64

Housekeeping Risk Metrics ..................................................................................................... 65

Inter-bank Exposure Monitoring .............................................................................................. 66

M20: Governance & Board Compliance Module ..................................................................... 67

Confidential | Page 4

RBIAS — Software Design Document

ACB Workspace & Agenda Builder ..................................................................................... 67

Board Review Calendar ....................................................................................................... 67

Policy Library & Review Tracker .......................................................................................... 68

Committee Governance Metadata ....................................................................................... 68

RBI Inspection Support Pack .................................................................................................. 69

Risk Management MIS for RMC / Board ................................................................................. 70

Non-Functional Requirements .................................................................................................... 71

Implementation Roadmap ........................................................................................................... 73

Phase 1: Foundation (Weeks 1-6) .......................................................................................... 73

Phase 2: Audit Execution (Weeks 7-14) ................................................................................. 73

Phase 3: Reporting & Compliance (Weeks 15-20) ................................................................. 73

Phase 4: Planning & Analytics (Weeks 21-26) ........................................................................ 73

Phase 5: Advanced Analytics & Continuous Auditing (Weeks 27-36) .................................... 74

Phase 6: GRC Integration & Issue Management 2.0 (Weeks 37-46) ..................................... 74

Phase 7: Mobility, UX & Productization (Weeks 47-52+) ........................................................ 74

Phase 8: UCB RBIA Core & Governance (Weeks 53-62) ....................................................... 75

Phase 9: IRAC, Treasury, EDP & Risk Analytics (Weeks 63-72) ........................................... 75

Appendix ..................................................................................................................................... 77

A. Glossary .............................................................................................................................. 77

B. Reference Documents ........................................................................................................ 78

C. Data Migration Strategy ...................................................................................................... 79

Confidential | Page 5

RBIAS — Software Design Document

Executive Summary

This Software Design Document (SDD) presents the complete architecture and specifications
for the Risk-Based Internal Audit System (RBIAS), a web-based platform designed to digitize
and streamline the end-to-end internal audit process for Urban Cooperative Banks (UCBs) and
banking institutions operating under RBI regulatory supervision.

RBIAS is designed in strict alignment with (a) the Risk-Based Internal Audit (RBIA) Policy 2018,
(b) RBI’s Master Circular on Inspection & Audit Systems in UCBs, (c) IRAC norms for Income
Recognition, Asset Classification and Provisioning, and (d) RBI directives on Concurrent Audit,
EDP/IS Audit, Investment & Treasury controls, Capital Adequacy (CRAR), and Governance
standards for UCBs. The system replaces the current Excel-based audit workflow with an
integrated digital platform that supports all stakeholders — from field auditors and concurrent
auditors to the Audit Committee of the Board (ACB) and Risk Management Committee (RMC).

Key Objectives:

1. Digitize the standardized 13-16 section audit report format currently maintained in Excel
   workbooks, enabling structured data capture with built-in validations, risk scoring, and real-time
   calculations. The system incorporates the complete IA Format (Internal Audit Examination
   Format) with its 12 functional areas and 220+ value statements as the standardized checklist
   driving audit execution.

2. Automate the Risk Assessment Model (RAM) for computing composite branch risk scores
   across 19 parameters, determining audit frequency, and generating the Annual Audit Plan.

3. Implement the full compliance lifecycle from initial audit observation through Branch Head
   certification, Zonal Audit Committee (ZAC) review, Audit Compliance and Evaluation (ACE)
   department processing, to final closure by the Audit Committee of the Board (ACB).

4. Provide role-based dashboards with real-time analytics for audit management, enabling trend
   analysis across branches, visits, and audit periods.

5. Generate standardized Excel/PDF audit reports matching the existing bank format for
   regulatory submissions and record-keeping.

6. Provide an enterprise-grade platform with continuous auditing via data connectors and
   analytics engine, AI-powered anomaly detection and smart suggestions, unified issue
   management across all assurance sources, a centralized control library with standardized work
   programs, and multi-tenant architecture for commercial deployment across multiple banks.

7. Deliver full UCB regulatory alignment — concurrent audit workbench, IRAC & provisioning
   engine, investment/treasury audit controls, EDP/IS audit module, inter-bank exposure
   monitoring, housekeeping KPIs, RBI observation follow-up hub, and Board/ACB/RMC
   governance dashboards — enabling a UCB to demonstrate comprehensive compliance during
   RBI inspections.

Confidential | Page 6

RBIAS — Software Design Document

Technology Stack: React.js frontend, Node.js/Express backend, PostgreSQL database with
RLS, deployed as a responsive web application with PWA mobile support accessible from
laptops and tablets during branch visits. AI/ML layer for anomaly detection and text analytics.

Confidential | Page 7

RBIAS — Software Design Document

System Overview

System Context

RBIAS operates within the bank’s internal audit ecosystem, interfacing with the Inspection and
Audit Department (IAD), branch operations, zonal offices, and the Board-level audit committee.
The system serves as the central platform for all audit-related workflows.

User Roles and Personas

Role

Description

Key Responsibilities

Access Level

Field Auditor

Audit team members
conducting branch
inspections

Data capture, observation entry,
risk rating, evidence attachment

Assigned audits only

Lead Auditor

Team leader for a
specific audit
engagement

Review team entries, finalize
findings, compute ratings, submit
report

Full audit management

Branch Head Manager of the
audited branch

Zonal Auditor

IAD Manager

ZAC member
reviewing regional
audit compliance

Inspection & Audit
Department
management

Review findings, submit
compliance responses, upload
evidence

Track compliance status,
escalate overdue items, approve
closures

Annual audit planning, team
assignment, RAM computation,
policy config

Own branch audits only

Zone-level oversight

Full system administration

ACE Officer

Audit Compliance &
Evaluation
department staff

Monitor compliance timelines,
prepare ACB reports, manage
escalations

All audit compliance data

ACB
Member

Audit Committee of
the Board

Concurrent
Auditor

External CA firm or
internal concurrent
audit staff

Review quarterly reports,
approve policy changes,
oversight dashboards

Daily/weekly checks on
designated branches and HO
functions, rapid observation
entry, serious irregularity
escalation

Read-only executive view

Assigned concurrent audit
entities only

IS/EDP
Auditor

IT audit specialist
(internal or
outsourced)

IS audit of CBS, channels,
access controls, vendor
management, DR compliance

IS audit engagements and
application inventory

Risk Head /
RMC
Member

Chief Risk Officer or
Risk Management
Committee member

Risk dashboards, KRI monitoring,
capital adequacy tracking, inter-
bank exposure oversight

Read-only risk
management views

System
Admin

Technical
administrator

User management, system
config, master data maintenance Full system configuration

Confidential | Page 8

RBIAS — Software Design Document

System Modules

RBIAS is organized into seven core modules, each addressing a distinct phase of the audit
lifecycle:

Module

Purpose

Key Features

M1: Audit
Planning

Annual audit plan creation
and management

RAM computation, branch risk scoring, audit
frequency determination, team assignment, calendar
management

M2: Pre-Audit

Audit preparation and
requisites

Branch data requisition, previous audit review,
checklist preparation, document collection

M3: Audit
Execution

Field audit data capture and
observation entry

13-section structured data entry, risk categorization,
evidence upload, offline capability, auto-calculations

M4: Report
Generation

Standardized audit report
creation

Excel/PDF export matching existing format, Branch
Head certificate, summary generation, risk rating
computation

M5:
Compliance
Tracking

M6: Analytics &
Dashboards

Post-audit compliance
monitoring

Branch response tracking, timeline management,
escalation workflows, ZAC/ACE/ACB integration

Real-time audit intelligence

Branch scorecards, trend analysis, heat maps, KPI
tracking, management reporting

M7:
Administration

System configuration and
master data

User/role management, branch master, audit
parameters, policy configuration, notification
templates

M8: Enterprise
Risk Register

Audit universe and risk
register

Auditable entities, risk statements, KRIs, risk-plan
linkage, what-if simulation

M9: Control
Library

M10:
Continuous
Auditing

M11: AI
Analytics

Control testing and work
programs

Control library, test procedures, work programs,
control effectiveness analytics

Data-driven testing and
monitoring

Data connectors/ETL, rule-based analytics, exception
management, continuous monitoring dashboards

Machine learning and
predictive insights

Anomaly detection, NLP text analytics, predictive risk
models, smart suggestions

M12: Issue
Management

Unified issue and action
tracking

Cross-source issues, action plans, milestones, partial
closure, consolidated Board reporting

M13: Quality
Management

Audit function quality
assurance

Self-assessments, gap analysis, effectiveness KPIs,
external QA support

M14: Unified
Audit Universe

All mandated audit types in
one calendar

RBIA, internal inspection, concurrent, IS/EDP audits;
surprise scheduling; RBI periodicity compliance

M15:
Concurrent
Audit

Early-warning concurrent
audit workbench

RBI-aligned scope templates, rapid entry UI, serious
irregularity escalation, de-duplication with RBIA

Confidential | Page 9

RBIAS — Software Design Document

M16: IRAC
Engine

NPA classification &
provisioning cross-check

CBS data ingestion, IRAC recomputation, deviation
detection, auto-exception generation

M17: Treasury
Audit

Investment & treasury audit
controls

SGL/CSGL reconciliation, broker compliance, non-
SLR caps, quarterly certification workflow

M18: IS/EDP
Audit

Technology & cyber audit

Application inventory, IS audit checklists, vendor risk,
DR drill tracking

M19:
Regulatory Hub

RBI/statutory observation
follow-up

Para-to-issue mapping, ATR workflows, multi-source
observation tracking

M20:
Governance

Board/ACB/RMC compliance
support

ACB workspace, agenda builder, Board review
calendar, policy library, committee governance

Confidential | Page 10

RBIAS — Software Design Document

System Architecture

Technology Stack

Layer

Technology

Rationale

React.js 18+ with TypeScript,
Tailwind CSS, shadcn/ui

Component-based UI with type safety,
responsive design for tablet use during branch
visits

Frontend

State
Management

Backend API

Redux Toolkit with RTK Query

Node.js with Express.js,
TypeScript

Database

PostgreSQL 15+

ORM

Prisma

Authentication

JWT with refresh tokens, RBAC
middleware

Centralized state for complex audit forms,
built-in caching and API integration

High-performance REST API with strong
typing, excellent ecosystem for Excel/PDF
generation

ACID compliance critical for audit data
integrity, JSONB for flexible observation
storage, full-text search

Type-safe database access, automated
migrations, excellent PostgreSQL support

Stateless auth suitable for distributed
deployment, fine-grained role-based access
control

File Storage

MinIO (S3-compatible) or local
filesystem

Self-hosted object storage for audit evidence,
documents, and generated reports

Report Engine

ExcelJS for XLSX, PDFKit for
PDF generation

Pixel-perfect reproduction of existing bank
audit report format

Search

PostgreSQL full-text search
(pg_trgm)

Search across observations, borrower names,
account numbers without additional
infrastructure

Notifications

Deployment

Nodemailer + in-app notification
system

Email alerts for compliance deadlines,
assignment notifications, escalation triggers

Docker containers with Docker
Compose

Consistent deployment across environments,
easy scaling, isolated services

Architecture Pattern

RBIAS follows a layered architecture with clear separation of concerns:

Presentation Layer: React SPA with role-based routing. Each audit section (Cash Check,
Loans & Advances, SMA & NPA, etc.) is a self-contained form module with local validation,
auto-save, and progress tracking.

API Gateway Layer: Express.js REST API with JWT authentication middleware, request
validation (Zod schemas), rate limiting, and audit logging. All API endpoints follow RESTful
conventions with versioning (/api/v1/).

Confidential | Page 11

RBIAS — Software Design Document

Business Logic Layer: Service classes encapsulating core business rules — RAM score
computation, risk rating algorithms, compliance timeline calculations, report generation logic,
and escalation rules as defined in the RBIA Policy.

Data Access Layer: Prisma ORM with repository pattern for database operations. All audit data
changes are tracked with full audit trails (who changed what, when).

Infrastructure Layer: PostgreSQL for structured data, MinIO for file storage, Redis for session
caching and job queues (Bull.js for background report generation).

API Design

The REST API is organized by module with consistent endpoint patterns:

Endpoint Group

Methods

Description

/api/v1/audits

GET, POST, PUT,
DELETE

Audit engagement CRUD, status
management, assignment

/api/v1/audits/:id/sections/:section

GET, PUT, PATCH

Section-level data entry (cash-
check, loans, sma-npa, etc.)

/api/v1/audits/:id/observations

GET, POST, PUT,
DELETE

Individual audit observations with
risk categorization

/api/v1/audits/:id/report

GET, POST

/api/v1/compliance

GET, PUT

/api/v1/planning/ram

GET, POST

Report generation and export
(XLSX, PDF)

Compliance tracking, branch
responses, closure requests

RAM score computation and annual
audit plan

/api/v1/branches

GET, POST, PUT

Branch master data management

/api/v1/users

GET, POST, PUT,
DELETE

User management with role
assignment

/api/v1/examination-areas

/api/v1/examination-items

GET

GET

/api/v1/audits/:id/examinations

GET, PUT, PATCH

/api/v1/audits/:id/examinations/:area GET, PUT

/api/v1/analytics

GET

/api/v1/notifications

GET, PUT

Master list of 12 functional areas
with item counts

Value statements master list,
filterable by area

Audit examination responses for all
value statements

Area-specific examination
responses

Dashboard data, KPIs, trend
analytics

Notification management and
preferences

Confidential | Page 12

RBIAS — Software Design Document

Database Schema

The database design captures the complete audit lifecycle from planning through compliance
closure. All tables include standard audit columns (created_at, updated_at, created_by,
updated_by) and soft-delete support (deleted_at).

Core Entity Tables

branches

Master table for all bank branches subject to audit.

Column

Type

Constraints

Description

id

UUID

PK, DEFAULT
gen_random_uuid()

branch_code

VARCHAR(10)

UNIQUE, NOT NULL

branch_name

VARCHAR(100) NOT NULL

Unique branch identifier

Bank’s internal branch
code (e.g., 0001)

Official branch name (e.g.,
Fort Main)

zone

region

city

address

branch_head_id

VARCHAR(50)

VARCHAR(50)

NOT NULL, FK → zones.id Zonal classification for

ZAC reporting

Regional grouping

VARCHAR(50)

NOT NULL

City location

TEXT

UUID

FK → users.id

branch_category

VARCHAR(20)

NOT NULL

business_size_lakhs

DECIMAL(15,2)

staff_strength

INTEGER

is_currency_chest

BOOLEAN

DEFAULT false

is_forex_branch

BOOLEAN

DEFAULT false

last_audit_date

DATE

last_audit_rating

VARCHAR(20)

ram_composite_score

DECIMAL(5,2)

Confidential | Page 13

Full branch address

Current Branch
Head/Manager

Category:
Large/Medium/Small/Very
Small

Total business in Lakhs
for RAM computation

Number of staff at branch

Whether branch has
currency chest

Whether branch handles
forex transactions

Date of most recent
completed audit

Rating from last audit
(Satisfactory/Needs
Improvement/etc.)

Latest RAM composite
risk score

RBIAS — Software Design Document

audit_frequency_months

INTEGER

Derived audit frequency
from RAM score

status

VARCHAR(20)

DEFAULT ‘active’

active/inactive/merged

audits

Central table for each audit engagement. One record per audit visit to a branch.

Column

Type

Constraints

Description

id

UUID

PK

audit_number

VARCHAR(20) UNIQUE, NOT NULL

Unique audit identifier

Sequential audit reference
(e.g., RBIA/2024-25/001)

branch_id

UUID

FK → branches.id, NOT
NULL

Branch being audited

audit_type

VARCHAR(30) NOT NULL

visit_number

INTEGER

DEFAULT 1

audit_period_from

DATE

NOT NULL

audit_period_to

DATE

NOT NULL

planned_start_date

DATE

actual_start_date

planned_end_date

actual_end_date

lead_auditor_id

DATE

DATE

DATE

UUID

FK → users.id

status

VARCHAR(30) NOT NULL, DEFAULT

‘planned’

overall_risk_rating

VARCHAR(30)

overall_risk_score

DECIMAL(5,2)

Type: risk_based / snap /
follow_up / concurrent /
special

1st visit, 2nd visit, etc. for
same audit period

Start of period under audit
(e.g., Dec 2023)

End of period under audit
(e.g., Aug 2024)

Scheduled audit
commencement date

Actual date audit team
arrived at branch

Scheduled completion date

Actual completion date

Lead auditor assigned to
this engagement

planned / in_progress / draft
/ submitted / reviewed /
closed

Computed: Extremely High /
High / Medium / Low / Very
Low

Computed composite risk
score (1-5 scale)

branch_head_certified

BOOLEAN

DEFAULT false

BH Certificate signed off

branch_head_certified_at TIMESTAMP

When BH signed the
certificate

Confidential | Page 14

RBIAS — Software Design Document

report_generated_at

TIMESTAMP

notes

TEXT

When final report was
generated

General audit engagement
notes

audit_team_members

Maps auditors to audit engagements with their roles.

Column

Type

Constraints

Description

id

audit_id

user_id

role

UUID

UUID

UUID

PK

Record identifier

FK → audits.id, NOT
NULL

The audit engagement

FK → users.id, NOT NULL The auditor assigned

VARCHAR(20)

NOT NULL

lead_auditor / team_member /
reviewer

Array of section codes this
member is responsible for

assigned_sections JSONB

audit_sections

Tracks completion status for each of the 13+ standardized audit sections within an engagement.

Column

Type

Constraints

Description

id

audit_id

UUID

UUID

PK

Record identifier

FK → audits.id, NOT NULL

Parent audit engagement

Standardized code:
RISK_RATING, SUMMARY,
CASH_CHECK,
BRANCH_DETAILS,
REGISTER, LOANS_ADV_1,
LOANS_ADV_2, SMA_NPA,
NON_FUND,
HOUSEKEEPING,
STAFF_MATTERS,
FIXED_ASSETS,
OTHER_OBS

Display name matching Excel
sheet tab

not_started / in_progress /
completed / reviewed

Team member responsible for
this section

section_code

VARCHAR(30)

NOT NULL

section_name

VARCHAR(100)

NOT NULL

status

VARCHAR(20)

DEFAULT ‘not_started’

assigned_to

UUID

FK → users.id

Confidential | Page 15

RBIAS — Software Design Document

section_data

JSONB

NOT NULL DEFAULT ‘{}’

Structured section data (format
varies by section type)

completion_pct

INTEGER

DEFAULT 0

0-100 progress percentage

reviewed_by

UUID

FK → users.id

reviewed_at

TIMESTAMP

Lead auditor who reviewed this
section

When section was reviewed

Confidential | Page 16

RBIAS — Software Design Document

audit_observations

Individual audit findings/observations recorded across all sections. This is the core data table
driving risk ratings and compliance tracking.

Column

Type

Constraints

Description

id

audit_id

UUID

UUID

PK

FK → audits.id, NOT
NULL

section_code

VARCHAR(30) NOT NULL

sr_no

INTEGER

NOT NULL

particulars

observation

risk_category

TEXT

TEXT

NOT NULL

NOT NULL

VARCHAR(20) NOT NULL DEFAULT
‘low’

risk_score

INTEGER

CHECK(1-5)

pertains_to

VARCHAR(30)

branch_comments

TEXT

is_repeat

BOOLEAN

DEFAULT false

Unique observation
identifier

Parent audit engagement

Which audit section this
observation belongs to

Sequential number within
the section

Category/area being audited
(e.g., Cash Retention Limit)

Detailed audit
finding/irregularity

extremely_high(5) / high(4) /
medium(3) / low(2) /
very_low(1)

Numeric risk score:
5=Extremely High, 1=Very
Low

Functional area: finance /
operations / legal_recovery /
hr / it

Initial branch response
during audit

Whether this was flagged in
a previous audit

previous_observation_id UUID

FK →
audit_observations.id

Link to prior audit’s related
observation

regulatory_reference

VARCHAR(100)

amount_involved_lakhs DECIMAL(15,2)

RBI circular / bank policy
reference if applicable

Financial impact of the
observation in Lakhs

loan_reviews

Detailed loan account review data from the Loans & Advances sections. Matches the Excel
structure precisely.

Column

Type

Constraints

Description

id

UUID

PK

Record identifier

Confidential | Page 17

RBIAS — Software Design Document

audit_id

UUID

FK → audits.id, NOT
NULL

Parent audit

account_number

VARCHAR(20) NOT NULL

borrower_name

VARCHAR(200) NOT NULL

product_type

VARCHAR(50)

sanction_date

DATE

sanction_amount_lakhs

DECIMAL(15,2)

disbursement_date

DATE

disbursement_amount_lakhs DECIMAL(15,2)

outstanding_amount_lakhs

DECIMAL(15,2)

asset_classification

VARCHAR(20)

days_past_due

INTEGER

DEFAULT 0

audit_observation

TEXT

risk_category

VARCHAR(20)

documentation_status

VARCHAR(20)

collateral_verified

BOOLEAN

Loan account number (14-
digit)

Name of borrower /
company

Loan product (Home Loan,
Personal Loan, LAP, etc.)

Date loan was sanctioned

Sanctioned amount in
Lakhs

Date of disbursement

Disbursed amount in
Lakhs

Current outstanding
balance

Standard / SMA-0 / SMA-1
/ SMA-2 / NPA

DPD count for overdue
classification

Auditor’s finding on this
loan account

Risk rating for this specific
account

complete / incomplete /
missing

Whether collateral/security
was verified

sma_npa_entries

Asset quality tracking data from the SMA & NPA audit section.

Column

Type

Constraints

Description

id

audit_id

UUID

UUID

PK

FK → audits.id, NOT
NULL

Record identifier

Parent audit

category

VARCHAR(20) NOT NULL

total_accounts

INTEGER

total_amount_lakhs

DECIMAL(15,2)

overdue / sma_1 / sma_2 /
npa / loss

Number of accounts in this
category

Total amount in Lakhs

Confidential | Page 18

RBIAS — Software Design Document

audit_observation

TEXT

risk_category

VARCHAR(20)

pertains_to

VARCHAR(30)

legal_notice_issued

BOOLEAN

recovery_action_taken TEXT

recommended_for_abn BOOLEAN

Auditor’s observations on
asset quality

Risk rating for this category

Functional area (typically
Legal & Recovery)

Whether legal notices have
been sent

Details of recovery measures

Whether file recommended for
ABN (write-off)

Confidential | Page 19

RBIAS — Software Design Document

cash_checks

Cash verification data captured during the surprise cash check at audit commencement.

Column

Type

Constraints

Description

id

audit_id

UUID

UUID

PK

Record identifier

FK → audits.id, NOT
NULL, UNIQUE

One cash check per
audit

cash_in_hand

DECIMAL(15,2)

cash_balance_as_per_books DECIMAL(15,2)

difference

DECIMAL(15,2)

atm_cash_balance

DECIMAL(15,2)

atm_retention_limit

DECIMAL(15,2)

retention_limit

DECIMAL(15,2)

excess_cash

DECIMAL(15,2)

soiled_notes

DECIMAL(15,2)

cash_check_time

TIMESTAMP

observations

TEXT

denomination_data

JSONB

RAM and Planning Tables

ram_assessments

Physical cash balance
verified

Cash balance per
CBS/GL

Computed:
cash_in_hand -
book_balance

Cash held in ATM
cassettes

Authorized ATM
retention limit

Branch cash retention
limit

Amount exceeding
retention limit

Value of soiled/mutilated
notes

Exact time of surprise
cash verification

Cash-related audit
observations

Denomination-wise cash
breakdown

Risk Assessment Model (RAM) scores computed for each branch. The 19 parameters from the
RBIA Policy are scored to determine audit frequency.

Column

Type

Constraints

Description

id

branch_id

UUID

UUID

PK

Record identifier

FK → branches.id, NOT
NULL

Branch being assessed

assessment_year

VARCHAR(10) NOT NULL

Financial year (e.g., 2024-25)

Confidential | Page 20

RBIAS — Software Design Document

inherent_risk_scores

JSONB

NOT NULL

control_risk_scores

JSONB

inherent_risk_total

DECIMAL(5,2)

control_risk_total

DECIMAL(5,2)

composite_score

DECIMAL(5,2)

risk_category

VARCHAR(20)

recommended_frequency

INTEGER

computed_by

approved_by

UUID

UUID

FK → users.id

FK → users.id

approved_at

TIMESTAMP

19-parameter scores:
{deposits: 3, advances: 4,
npa: 2, ...}

Control effectiveness scores
per parameter

Weighted total of inherent
risk

Weighted total of control risk

Final composite risk score

Derived: high / medium / low

Audit frequency in months
(12/18/24)

IAD manager who ran the
assessment

Senior approval for the
assessment

Approval timestamp

ram_parameters (Reference/Config)

Configuration table defining the 19 RAM parameters, their weights, and scoring criteria as
specified in the RBIA Policy.

Column

Type

Constraints

Description

id

UUID

PK

Parameter identifier

param_code

VARCHAR(20)

UNIQUE, NOT NULL

param_name

VARCHAR(100)

NOT NULL

category

VARCHAR(30)

NOT NULL

weight

DECIMAL(5,2)

NOT NULL

scoring_criteria

JSONB

NOT NULL

max_score

INTEGER

DEFAULT 5

is_active

BOOLEAN

DEFAULT true

e.g., DEPOSITS, ADVANCES,
NPA, FRAUD, FOREX

Full name: Total Deposits, Total
Advances, etc.

inherent_business /
inherent_control /
control_environment

Percentage weight in composite
score (all must sum to 100)

Scoring rules: {1: ‘<10Cr’, 2: ‘10-
50Cr’, 3: ‘50-100Cr’, ...}

Maximum score (typically 5-point
scale)

Whether this parameter is
currently in use

Confidential | Page 21

RBIAS — Software Design Document

Compliance Tracking Tables

compliance_items

Tracks each audit observation through the full compliance lifecycle: Branch Response → ZAC
Review → ACE Processing → ACB Closure.

Column

Type

Constraints

Description

id

observation_id

audit_id

branch_id

UUID

UUID

UUID

UUID

PK

Compliance item identifier

FK → audit_observations.id,
UNIQUE

Source observation

FK → audits.id, NOT NULL

Parent audit for quick
querying

FK → branches.id, NOT
NULL

Branch responsible for
compliance

status

VARCHAR(30) NOT NULL DEFAULT ‘open’

branch_response

TEXT

branch_response_date DATE

branch_evidence_files JSONB

zac_review_status

VARCHAR(20)

zac_reviewed_by

zac_review_date

zac_comments

UUID

DATE

TEXT

ace_status

VARCHAR(20)

FK → users.id

open / branch_responded /
zac_reviewed /
ace_processed / closed /
escalated

Branch’s detailed
compliance response

When branch submitted
response

Array of uploaded evidence
file references

accepted / rejected /
needs_more_info

ZAC reviewer

ZAC review date

ZAC review comments

processed / pending /
escalated_to_acb

ace_processed_by

UUID

FK → users.id

ACE officer

ace_processed_date

DATE

closure_date

closed_by

DATE

UUID

days_open

INTEGER

ACE processing date

Final closure date

FK → users.id

Who closed the item

is_overdue

BOOLEAN

DEFAULT false

escalation_level

INTEGER

DEFAULT 0

Confidential | Page 22

Computed: days from
observation to closure/today

Computed: whether past
compliance deadline

0=none, 1=ZAC escalated,
2=ACE escalated, 3=ACB
escalated

RBIAS — Software Design Document

due_date

DATE

Compliance deadline per
policy timelines

Value Statement / Examination Master Tables

These tables implement the IA Format (Internal Audit Examination Format) which defines the
standardized value statements that auditors must examine at every branch. The format is
organized by functional areas, each containing numbered examination items with predefined
audit checkpoints.

examination_areas

Master table defining the functional areas of the IA examination format. Each area represents a
major banking function to be audited.

Column

Type

Constraints

Description

id

UUID

PK

area_code

VARCHAR(10)

UNIQUE, NOT NULL

area_name

VARCHAR(100)

NOT NULL

display_order

INTEGER

NOT NULL

description

TEXT

risk_weight

DECIMAL(5,2)

is_active

BOOLEAN

DEFAULT true

version

INTEGER

DEFAULT 1

Unique area identifier

Short code: DEP, REM,
CASH, GOV, BILL, CLR,
CUST, KYC, IT, HR, ADM,
CRD

Full name: Deposits,
Remittances, Cash &
Currency Chest, etc.

Ordering for UI display (1- 12)

Detailed description of what
the area covers

Weight of this area in overall
risk computation

Whether this area is active
in current audit template

Template version for change
tracking

examination_items

Master table of all value statements (examination points) within each functional area. These are
the specific checkpoints auditors evaluate during branch visits. Pre-loaded from the IA Format of
RBG.

Column

Type

Constraints

Description

Confidential | Page 23

RBIAS — Software Design Document

id

area_id

UUID

UUID

PK

FK → examination_areas.id,
NOT NULL

item_number

VARCHAR(10)

NOT NULL

particulars

TEXT

NOT NULL

sub_items

JSONB

default_risk_category VARCHAR(20)

pertains_to

VARCHAR(30)

regulatory_reference

VARCHAR(200)

guidance_notes

TEXT

display_order

INTEGER

NOT NULL

is_active

BOOLEAN

DEFAULT true

version

INTEGER

DEFAULT 1

Unique item identifier

Parent functional area

Display number within
area (e.g., 1, 2, 3 or A1,
A2)

The value statement /
examination point text

Array of sub-points under
this item (for multi-part
questions)

Suggested risk level if
finding detected

Default functional
mapping: Finance /
Operations / Legal &
Recovery / HR / IT

Applicable RBI circular or
bank policy reference

Guidance for auditor on
how to evaluate this item

Ordering within the area

Whether item is active in
current template

Version tracking for
template updates

audit_examination_responses

Runtime table capturing auditor responses for each examination item during a specific audit
engagement. One row per item per audit.

Column

Type

Constraints

Description

id

audit_id

UUID

UUID

PK

Record identifier

FK → audits.id, NOT
NULL

Parent audit
engagement

examination_item_id

UUID

FK →
examination_items.id,
NOT NULL

area_code

VARCHAR(10) NOT NULL

The value statement
being evaluated

Denormalized area
code for efficient
querying

status

VARCHAR(20) DEFAULT ‘not_examined’ not_examined /

compliant /

Confidential | Page 24

RBIAS — Software Design Document

audit_observation

TEXT

risk_categorisation

VARCHAR(20)

pertains_to

VARCHAR(30)

branch_compliance

TEXT

evidence_refs

JSONB

examined_by

UUID

FK → users.id

examined_at

TIMESTAMP

auto_generated_observation_id UUID

FK →
audit_observations.id

non_compliant /
not_applicable /
partially_compliant

Auditor’s detailed
finding for this item

Auditor-assigned risk:
extremely_high / high /
medium / low /
very_low

Functional area (may
override item default)

Branch response /
compliance action
taken

Array of evidence file
references attached to
this item

Auditor who examined
this item

When the examination
was completed

If finding raised, links
to the formal
observation

Composite unique constraint on (audit_id, examination_item_id) ensures each value statement
is examined exactly once per audit.

Confidential | Page 25

RBIAS — Software Design Document

Supporting Tables

Additional tables required for complete system functionality:

Table

Purpose

Key Columns

users

zones

audit_plans

audit_evidence

notifications

audit_logs

All system users with role
assignments

id, employee_id, name, email, role, zone,
is_active

Zonal master for
organizational hierarchy

id, zone_code, zone_name, zonal_manager_id

Annual audit plan with
branch-frequency mapping

id, financial_year, branch_id, planned_quarter,
status

File attachments linked to
observations

id, observation_id, file_name, file_path,
file_type, uploaded_by

In-app and email notification
queue

id, user_id, type, title, message, is_read,
sent_at

Complete system activity
audit trail

id, user_id, action, entity_type, entity_id,
old_value, new_value, ip_address

housekeeping_items

150+ standardized checklist
items for the Housekeeping
section

id, audit_id, sr_no, particular, status,
observation, risk_category

register_checks

branch_details

Register maintenance
verification checklist

id, audit_id, register_name, maintained,
observation

Branch operational data
captured during audit

id, audit_id, staff_data, infra_data,
operational_metrics (JSONB)

fixed_assets

Fixed asset verification data

id, audit_id, asset_type, book_value,
physical_verified, observation

non_fund_facilities

Bank guarantees, LC, non-
fund facility reviews

id, audit_id, facility_type, customer, amount,
observation, risk

report_templates

Configurable section
templates and checklist
items

id, section_code, template_data, version,
is_active

Confidential | Page 26

RBIAS — Software Design Document

Entity Relationship Summary

Key relationships in the database:

branches 1:N → audits (one branch has many audits over time)

audits 1:N → audit_sections (each audit has 13-16 sections)

audits 1:N → audit_observations (each audit has 10-30+ findings)

audits 1:N → loan_reviews (each audit reviews 70-400 loan accounts)

audit_observations 1:1 → compliance_items (every observation must be tracked to closure)

branches 1:N → ram_assessments (annual risk assessment per branch)

Confidential | Page 27

RBIAS — Software Design Document

User Interface Design

The UI follows a responsive dashboard layout optimized for both desktop monitors (audit
management) and tablets (field use during branch visits). The design system uses a sidebar
navigation pattern with contextual breadcrumbs.

Screen Inventory

Screen

Module Primary User

Purpose

Login / SSO

Auth

All

Authentication with role-based redirect

Dashboard - IAD
Manager

Dashboard - Field
Auditor

Dashboard - Branch
Head

M6

M6

M6

IAD Manager

Audit plan status, team utilization, branch
coverage, overdue compliance

Auditor

My assigned audits, in-progress sections,
upcoming schedule

Branch Head

Pending compliance items, audit history,
upcoming audits

Dashboard - ACE/ACB M6

ACE/ACB

Compliance overview, escalations, quarterly
summary

Annual Audit Plan

RAM Computation

M1

M1

IAD Manager

Plan creation, branch-frequency matrix, team
allocation calendar

IAD Manager

19-parameter scoring interface with auto-
computation

Audit Engagement

M2/M3

Lead Auditor

Section: Risk Rating

M3

Auditor

Audit overview, team, progress tracker, section
navigation

Branch metadata, audit period, risk summary
entry

Section: BH Certificate M3/M4

Lead Auditor

Branch Head sign-off form, auditor listing

Section: Summary

M3

Lead Auditor

Section: Cash Check

M3

Auditor

Section: Branch Details M3

Auditor

Section: Register

Section: Loans &
Advances

Section: SMA & NPA

Section: Non-Fund

M3

M3

M3

M3

Auditor

Auditor

Auditor

Auditor

Section: Housekeeping M3

Auditor

Executive findings table with branch response
columns

Cash verification form with denomination
breakdown and calculations

Staff strength, infrastructure, operational data
entry

Register maintenance checklist with observation
fields

Loan review table with account search, bulk
import, risk tagging

Asset quality metrics form with category-wise
entry

Bank guarantees, LC, non-fund facility review

150+ item compliance checklist with status
dropdowns

Confidential | Page 28

RBIAS — Software Design Document

Section: Staff Matters

Section: Fixed Assets

Section: Other
Observations

M3

M3

M3

Auditor

Auditor

Auditor

Examination Checklist

M3

Auditor

Examination Area View M3

Auditor

Report Preview

Report Export

M4

M4

Lead Auditor

Lead Auditor

Compliance Tracker

M5

All

Staff-related audit observations

Asset verification with serial number tracking

Free-form additional findings entry

12 functional areas with 220+ value statements,
status marking, observation entry

Area-specific checklist with compliant/non-
compliant status per item

Full report preview before generation, section
completeness check

Generate XLSX/PDF in standardized bank
format

List of observations with status pipeline, filters,
search

Compliance Detail

Branch Scorecard

Analytics Explorer

User Management

Branch Master

Audit Configuration

M5

M6

M6

M7

M7

M7

Branch/ZAC

Individual observation compliance workflow with
evidence upload

IAD/ACB

IAD/ACE

Admin

Admin

Admin

Historical audit performance, trend charts, risk
evolution

Custom queries: by branch, zone, risk category,
section, time period

CRUD users, role assignment, zone mapping

Branch data management, category
maintenance

Section templates, risk parameters, scoring
criteria, notification rules

Confidential | Page 29

RBIAS — Software Design Document

Key UI Patterns

Audit Execution Interface

The audit execution screen is the primary workspace for field auditors. It uses a tab-based
layout matching the Excel sheet tabs that auditors are already familiar with. Key design
decisions:

Left Sidebar: Section navigation showing all 13+ audit sections with completion status
indicators (not started: gray, in progress: amber, completed: green, reviewed: blue). Clicking a
section loads its form.

Main Content Area: Section-specific form with structured data entry. Each section mirrors the
corresponding Excel sheet layout but with digital enhancements — dropdowns for risk
categories, auto-calculation of totals, inline validation, and auto-save every 30 seconds.

Right Panel (Collapsible): Context panel showing: previous audit’s findings for the same
section (for comparison), relevant policy references, and observation quick-add form.

Top Bar: Audit metadata (branch name, audit period, visit number), overall progress
percentage, and action buttons (Save Draft, Submit for Review, Generate Report).

Observation Entry Pattern

Every audit section uses a consistent observation entry pattern. Each observation row captures:

Field

Input Type

Validation

Source

Sr. No.

Particulars /
Category

Auto-generated

Sequential within section

System

Dropdown + free
text

Required, from section-
specific master list

Template

Audit Observation

Rich text area

Required, min 20 characters Auditor

Risk Categorization Dropdown (5

levels)

Risk Score

Auto-computed

Pertains To

Dropdown

Required: Extremely High /
High / Medium / Low / Very
Low

5/4/3/2/1 mapped from
category

Auditor

System

Finance / Operations / Legal
& Recovery / HR / IT

Auditor

Branch Comments

Text area

Optional during audit,
required for compliance

Branch Head

Amount Involved

Numeric (Lakhs) Optional, auto-formatted

Auditor

Evidence

File upload

Repeat Finding

Toggle + link

Max 10MB,
PDF/Image/Excel

If yes, link to previous
observation

Auditor

System/Auditor

Confidential | Page 30

RBIAS — Software Design Document

Compliance Tracker UI

The compliance tracking interface uses a Kanban-style pipeline view showing observations
moving through stages:

Stage

Color

Actions Available

SLA

Open

Red

View finding details, assign to
branch

Report submission date

Branch Responded Orange Review response, accept/reject,

request more info

30 days from audit report

ZAC Reviewed

Yellow

ZAC approval/rejection, escalation Next ZAC meeting

ACE Processed

Blue

ACE verification, ACB report
preparation

Quarterly cycle

Closed

Escalated

Green

View closure details, audit trail

N/A

Dark
Red

Escalation reason, escalation level,
re-assignment

Per policy escalation timelines

Dashboard Wireframe Specifications

Each role-based dashboard contains the following widget areas:

IAD Manager Dashboard:

Top row: 4 KPI cards (Audits in Progress, Overdue Compliance Items, Branches Pending Audit,
Average Risk Score). Middle row: Audit Plan Calendar (Gantt-style showing team assignments
across months) + Branch Risk Heat Map (color-coded by zone/risk level). Bottom row:
Compliance Aging Chart (bar chart by days open) + Recent Audit Reports table with status
badges.

Field Auditor Dashboard:

Top row: 3 KPI cards (My Active Audits, Sections Completed This Week, Pending Reviews).
Main area: Current audit engagement card with section-wise progress bars. Below: Upcoming
audit assignments with branch details and preparation status.

Branch Head Dashboard:

Top row: 3 KPI cards (Open Compliance Items, Overdue Items, Days Since Last Audit). Main
area: Compliance items list sorted by due date with action buttons (Respond, Upload Evidence).
History: Previous audit ratings trend chart.

Confidential | Page 31

RBIAS — Software Design Document

Feature Specifications

M1: Audit Planning Module

RAM Computation Engine

The Risk Assessment Model (RAM) engine implements the 19-parameter scoring system
defined in the RBIA Policy to compute branch-level composite risk scores and determine audit
frequency.

RAM Parameters (from RBIA Policy):

Parameter

Category

Weight

Scoring Basis

#

1

2

Total Deposits

Business Risk

Total Advances

Business Risk

3 Gross NPA Ratio

Asset Quality

4 Net NPA Ratio

Asset Quality

5 SMA-2 Accounts

Asset Quality

6

Fraud Cases

Operational Risk

7 Staff Accountability

Operational Risk

8 Customer Complaints Operational Risk
9 Previous Audit Rating Control

Environment

10 Compliance of
Previous Audit

11 Forex Transactions
12 Cash Handling
Volume

Control
Environment

Business Risk

IT/Cyber Incidents

13
14 Regulatory Penalties Control

Operational Risk

15 Staff Strength
Adequacy

16 Revenue per Branch
17 Off-Balance Sheet

Exposure

18 New Product Lines
19 KYC/AML

Compliance

Computation Logic:

8%

10%

8%

5%

5%

7%

3%

4%

8%

6%

3%

Absolute size of deposit portfolio

Size and complexity of loan portfolio

NPA as percentage of total advances

Net NPA after provisions

Accounts 61-90 days past due

Number and value of fraud incidents

Pending accountability cases

Volume and severity of complaints

Last RBIA rating (1-5 scale)

% of previous observations closed

Volume of forex operations

Operational Risk

4%

Daily cash throughput

Environment

Control
Environment

Business Risk

Business Risk

Business Risk

3%

5%

3%

4%

4%

3%

Technology-related incidents

RBI penalties or strictures

Actual vs sanctioned staff ratio

Profitability indicator

BG, LC, and contingent liabilities

Complexity from new offerings

Regulatory Risk

7%

KYC adherence and STR filing

Confidential | Page 32

RBIAS — Software Design Document

Step 1: Each parameter is scored on a 1-5 scale (1 = Very Low Risk, 5 = Extremely High Risk)
based on predefined thresholds configured in ram_parameters table.

Step 2: Weighted scores are computed: Parameter Score multiplied by Parameter Weight.

Step 3: Composite Risk Score = Sum of all weighted scores (range: 1.00 to 5.00).

Step 4: Audit frequency is derived from composite score: Score above 3.5 = Annual audit (12
months), Score 2.5 to 3.5 = 18-month cycle, Score below 2.5 = 24-month cycle.

Annual Audit Plan Generator

Based on RAM scores, the system generates the Annual Audit Plan mapping each branch to a
target quarter. Features include: automatic scheduling based on last audit date and frequency,
team workload balancing across quarters, drag-and-drop re-scheduling with conflict detection,
export to Excel format for Board approval, and version tracking for plan revisions.

Confidential | Page 33

RBIAS — Software Design Document

M3: Audit Execution Module

This is the largest module, providing structured data capture for all 13 standardized audit
sections. The design mirrors the existing Excel workbook structure to minimize auditor
retraining. At the core of audit execution is the Value Statement Examination Framework
derived from the IA Format of RBG, which defines the specific checkpoints auditors must
evaluate at every branch.

Value Statement Examination Framework

The IA Format defines 12 functional areas, each containing numbered value statements
(examination points) that auditors must evaluate. These serve as the standardized checklist
driving the entire audit execution process. The system pre-loads all value statements when an
audit is initiated, and auditors mark each as Compliant, Non-Compliant, Partially Compliant, or
Not Applicable, with mandatory observation text for any non-compliant findings.

# Functional Area Code

Scope of Examination

Approx.
Items

1 Deposits

DEP

2 Remittances

REM

3 Cash & Currency

Chest

CASH

4 Government
Business

GOV

5 Bills

BILL

6 Clearing

CLR

Verification of deposit accounts, interest
rates, TDS compliance, nomination,
dormant accounts, unclaimed deposits,
DICGC cover, deposit mobilization practices

NEFT/RTGS operations, demand drafts,
pay orders, collection of outstation cheques,
remittance charges, reconciliation of
suspense accounts

Cash retention limits, ATM cash
management, soiled note remittance,
denomination management, currency chest
operations (if applicable), surprise cash
verification

Government account operations, pension
payments, PPF/SSA transactions, revenue
collection, stamp duty, GST collections,
compliance with government scheme
guidelines

Bill purchase, bill discounting, documentary
credits, bills for collection, usance bills,
return of dishonoured bills, follow-up
procedures

Clearing operations, CTS compliance,
return memo handling, clearing settlement,
NACH mandates, ECS processing,
dishonour management

7 Customer Service CUST Complaint handling, turnaround time for
services, account opening procedures,

25-30

15-20

20-25

15-20

10-15

10-15

15-20

Confidential | Page 34

RBIAS — Software Design Document

8 KYC / AML

KYC

9

IT & Cyber
Security

IT

10 Human

Resources

HR

11 General

Administration

ADM

12 Credit / Advances CRD

nomination updates, standing instructions,
locker operations, customer education

Customer due diligence, periodic KYC
updates, suspicious transaction reporting
(STR), cash transaction reporting (CTR),
risk categorization of customers, FATCA
compliance, PEP screening

CBS operations, password management,
user access controls, phishing/vishing
awareness, cyber incident reporting,
BCP/DR readiness, ATM/POS security,
digital banking controls

Staff rotation, leave management, staff
accountability, training attendance,
disciplinary proceedings, staff meetings,
dual control compliance, succession
planning

Premises maintenance, record
management, safe deposit vault operations,
stationery control, insurance coverage,
vendor management, fire safety,
accessibility compliance

Loan sanctioning process, documentation
verification, disbursement controls,
security/collateral valuation, NPA
identification, provision adequacy, CERSAI
registration, recovery actions, restructuring
compliance, SARFAESI proceedings

20-25

20-25

10-15

15-20

40-50

Total Value Statements: Approximately 220-280 examination points across all 12 functional
areas, pre-loaded as a master checklist for each audit engagement.

Examination Workflow per Functional Area

For each functional area, the auditor follows this workflow:

Step 1 — Area Selection: Auditor selects a functional area from the left sidebar. The system
displays all pre-loaded value statements for that area in a scrollable checklist format.

Step 2 — Item Examination: For each value statement, the auditor selects a status: Compliant
(green check), Non-Compliant (red cross), Partially Compliant (amber warning), Not Applicable
(gray dash), or Not Examined (default).

Step 3 — Observation Entry: For Non-Compliant or Partially Compliant items, the system
requires a detailed audit observation, risk categorization (Low/Medium/High/Extremely High),
and the functional area it pertains to (Finance/Operations/Legal & Recovery/HR/IT).

Confidential | Page 35

RBIAS — Software Design Document

Step 4 — Evidence Attachment: Auditor can attach photos, documents, or screenshots as
evidence for any finding. Files are linked directly to the specific examination item.

Step 5 — Branch Response: Branch Head can enter compliance comments or corrective
action for each non-compliant finding directly against the examination item.

Step 6 — Auto-Observation Creation: When an auditor marks an item as Non-Compliant, the
system automatically generates a formal audit_observation record linked to the examination
response, feeding into the Summary sheet, risk scoring, and compliance tracking pipeline.

Credit / Advances: Deep-Dive Examination

The Credit/Advances area (Code: CRD) is the most extensive functional area, with
approximately 40-50 value statements covering the entire credit lifecycle. Given its complexity,
this area is further sub-divided into examination groups:

Sub-Group

Focus Area

Key Examination Points

CRD-A: Pre-
Sanction

Loan origination and
appraisal

CRD-B: Sanction &
Documentation

Approval and legal
documentation

CRD-C:
Disbursement

CRD-D: Post-
Disbursement

Fund release controls

Ongoing monitoring

Credit proposal documentation, CIBIL/CRIF score
verification, income assessment, limit computation
methodology, deviation authority compliance

Sanction letter terms, security creation, CERSAI
registration, title verification, legal opinion, mortgage
creation, insurance of assets

Pre-disbursement conditions, end-use verification,
stage-wise disbursement for housing loans, margin
maintenance, tie-up verification

Annual review, stock audit, QIS/QOS submission,
collateral re-valuation, loan covenant monitoring,
drawing power computation

CRD-E: NPA
Management

Stressed asset
handling

CRD-F: Special
Products

Product-specific
checks

NPA identification accuracy, provision adequacy,
SARFAESI notice compliance, OTS proposals, write-off
procedures, recovery suit filing, NCLT references

Gold loan LTV compliance, education loan moratorium,
MSME restructuring, agriculture KCC renewal, SHG-
BLP linkage, PMAY subsidies

Confidential | Page 36

RBIAS — Software Design Document

Section Data Structures

Section

Data Type

Key Fields

Auto-Computations

Branch name, audit period,
team, visit number

Metadata
form
Sign-off form Auditor names, designations,

Overall risk score from all
observations

Risk Rating

BH Certificate

Summary

Cash Check

Findings
table

Verification
form

Branch Details

Data form

Register

Checklist

visit dates, BH acknowledgment Days spent on audit
Sr No, Irregularity description,
Branch comments

Count by risk level, section-wise
rollup

Cash in hand, book balance,
ATM balance, retention limit,
denominations

Staff strength, infrastructure,
CBS details, operational hours

Register name, maintained
(Y/N), observation,
recommendation

Difference, excess over limit,
shortage

Staff adequacy ratio

Compliance percentage

Loans &
Advances I

Loans &
Advances II

SMA & NPA

Non-Fund

Housekeeping

Staff Matters

Fixed Assets

Detail table

Account, borrower, product,
sanction, disbursement,
outstanding
Review table Account, borrower, dates,
amounts, observation, risk

Summary +
Category-wise counts, amounts,
detail
actions taken, recommendations
Review table Facility type, customer, amount,
expiry, observation

Checklist
Particular, status, observation,
(150+)
risk, pertains to
Observations Staff meetings, rotation, training,
leave management

Verification
table

Asset type, description, book
value, physical status,
observation

Portfolio totals, concentration
analysis

Risk distribution, amount at risk

Total stressed assets, migration
analysis

Exposure totals by facility type

Section-wise compliance score

Compliance count

Total book value, discrepancy
amount

Other
Observations

Free form

Sr No, observation, risk, pertains
to, recommendation

Additional risk score
contribution

Smart Features for Field Auditors

Auto-Save: Form data is saved locally every 30 seconds and synced to server when
connected. Works offline with IndexedDB storage, syncing when back online.

Previous Audit Comparison: Side-by-side view of current vs. previous audit findings for the
same section. Repeat findings are automatically flagged.

Confidential | Page 37

RBIAS — Software Design Document

Bulk Loan Import: CSV upload for Loans & Advances section — auditors can export loan data
from CBS and import directly, then add observations per account.

Risk Score Calculator: As observations are entered, the system dynamically computes
section-wise and overall risk scores using the weighted average methodology defined in RBIA
Policy.

Template-Driven Checklists: The IA Format’s 12 functional areas and 220+ value statements
are pre-loaded as an examination checklist when each audit is initiated. Housekeeping,
Register, and other section-specific checklists are also pre-populated from configurable
templates. All checklist items can be customized by administrators as policy evolves.

Photo Evidence: Direct camera integration on tablets for capturing evidence photos during
branch visit, automatically linked to the relevant observation.

Confidential | Page 38

RBIAS — Software Design Document

M4: Report Generation Module

Generates the standardized audit report in the exact format currently used (matching the
uploaded Excel workbooks). This ensures compatibility with existing bank processes and
regulatory submissions.

Excel Report (Primary): Multi-sheet XLSX workbook with 13-16 tabs matching the current
structure. Each sheet reproduces the exact column layout, merged headers, and formatting.
Formulas are embedded for auto-calculations (e.g., Cash Check totals, Loan summaries).

PDF Report: Formatted PDF version with table of contents, section headers, and page
numbers. Designed for printing and archival. Includes the Branch Head Certificate page with
signature lines.

Summary Report: Condensed 2-3 page executive summary with key findings, risk rating, and
recommendations. Suitable for ZAC/ACB presentations.

Risk Rating Computation

The overall branch audit risk rating is computed as follows, aligned with the RBIA Policy 5-point
scale:

Rating

Extremely High
Risk

Score
Range

4.1 - 5.0

High Risk

3.1 - 4.0

Medium Risk

2.1 - 3.0

Low Risk

1.1 - 2.0

Very Low Risk

0.0 - 1.0

Description

Implication

Critical deficiencies requiring
immediate corrective action

Special audit within 3
months, ACB escalation

Significant weaknesses in
internal controls

Moderate issues requiring
management attention

Follow-up audit within 6
months

Standard audit cycle
continues

Minor issues with generally
adequate controls
Robust controls, minimal findings Audit cycle may be extended

Audit cycle may be extended

further

The score is computed as: weighted average of all observation risk scores across sections,
where weights are determined by the section’s relative importance (configurable in admin
settings). Repeat findings receive a 1.5x weight multiplier as per RBIA Policy guidance.

Confidential | Page 39

RBIAS — Software Design Document

M5: Compliance Tracking Module

Implements the full post-audit compliance lifecycle as mandated by the RBIA Policy. Every audit
observation automatically creates a compliance tracking item that must progress through
defined stages before closure.

Compliance Workflow

Stage

Actor

SLA

System Action

1. Observation
   Raised

System

On report submission Auto-create compliance_item, set

due_date, notify Branch Head

2. Branch
   Response

Branch Head 30 days from report
date

3. ZAC Review

Zonal Auditor Next ZAC meeting

4. ACE Processing ACE Officer Quarterly cycle

5. ACB Reporting

ACB
Member

Board meeting cycle

Branch uploads evidence, enters
response. Overdue triggers L1
escalation

ZAC reviews response: Accept, Reject
(with reasons), Request More Info

ACE verifies closure, prepares ACB
report. Unresolved items escalated

Consolidated compliance status
presented. Policy decisions on
persistent issues

6. Closure

ACE/Lead
Auditor

On satisfactory
resolution

Item marked closed with full audit trail.
Impacts next RAM score computation

Escalation Rules

Automated escalation based on RBIA Policy timelines:

Trigger

Escalation Level

Action

Branch response overdue by 15
days

Level 1: Reminder

Email reminder to Branch Head with CC to
Zonal Manager

Branch response overdue by 30
days

Level 2: ZAC
Escalation

Auto-escalate to ZAC, flag on Zonal
Manager dashboard

Compliance open > 90 days

Compliance open > 180 days

Repeat finding (same issue in
consecutive audits)

Level 3: ACE
Escalation

Level 4: ACB
Escalation

Priority Flag

Escalated to ACE department for
intervention

Included in ACB exception report for Board
attention

Marked as persistent issue, 1.5x risk weight
in next RAM computation

Confidential | Page 40

RBIAS — Software Design Document

M6: Analytics & Dashboards Module

Provides real-time audit intelligence through interactive dashboards and reporting. All analytics
are role-filtered and support drill-down from summary to individual observations.

Key Analytics Views

Analytics View

Visualization

Data Source

Drill-Down

Branch Risk Heat
Map

Color-coded
map/grid by zone

ram_assessments + latest
audit ratings

Click branch → Branch
Scorecard

Audit Plan Progress

Gantt chart with
completion status

audit_plans + audits

Click audit → Audit
Engagement

Compliance Aging

Stacked bar chart
(by days open)

compliance_items grouped
by aging bands

Click band → filtered
compliance list

Risk Category
Distribution
Section-wise Findings Horizontal bar chart audit_observations grouped

audit_observations grouped
by risk_category

Pie/Donut chart

by section_code

Click category →
observation list

Click section → section
findings

Trend Analysis

Line chart
(quarterly)

audits + observations over
time

Click point → quarterly
details

Top Observations

Ranked table

Most frequent observations
across branches

Click observation →
occurrences list

Team Productivity

Bar chart per
auditor

audits + sections completed
per auditor

Click auditor → audit
history

NPA Movement

Waterfall chart

sma_npa_entries across
audit periods

Click category →
account details

Compliance SLA
Performance

Gauge + trend

compliance_items vs. due
dates

Click zone → zone-level
SLA

Confidential | Page 41

RBIAS — Software Design Document

M8: Enterprise Risk Register & Audit Universe

Beyond branch-level RAM scoring, RBIAS maintains a comprehensive audit universe and
enterprise risk register linking all auditable entities with risks, controls, and past audit
engagements. This aligns with RBI’s RBIA circular which expects the audit function to cover all
material risk areas and not be limited to transaction testing at branch level.

Audit Universe

The audit universe captures every entity subject to internal audit, organized by type and linked
to the risk register and past audit history.

Entity Type

Examples

Risk Linkage

Branches

Fort Main, Bhandup, Goregaon East,
Chembur, etc.

RAM scores, branch risk rating,
operational risk profile

Zones / Regions Western Zone, Central Zone, etc.

Aggregated branch risk, management
effectiveness

Products

Processes

IT Systems

Projects

Home Loan, Gold Loan, KCC, MSME,
Personal Loan, etc.

Product-level credit risk, process maturity,
regulatory compliance

Cash Ops, Retail Lending, Treasury,
Trade Finance, etc.

Process risk assessment, control
effectiveness ratings

CBS, LOS/LMS, Internet Banking,
UPI, ATM Switch

Cyber risk, system availability, access
control maturity

Core banking migration, digital
lending rollout, etc.

Project risk, timeline, budget, governance

Vendors /
Outsourced

IT vendors, BPO partners, cash
management agencies

Third-party risk, SLA compliance,
regulatory oversight

Enterprise Risk Register

Each auditable entity is linked to a risk register containing structured risk statements with
inherent and residual risk assessments.

Column

Type

Description

id

UUID

Risk register entry identifier

entity_type

VARCHAR(30)

branch / zone / product / process / it_system / project /
vendor

entity_id

risk_statement

UUID

TEXT

risk_category

VARCHAR(30)

FK to the specific entity

Descriptive risk statement (e.g., ‘Inadequate KYC due
diligence leading to regulatory penalty’)

credit / operational / compliance / strategic / reputational /
cyber / liquidity

Confidential | Page 42

RBIAS — Software Design Document

inherent_risk_score

DECIMAL(5,2)

Pre-control risk rating (1–5 scale)

control_effectiveness VARCHAR(20)

strong / adequate / weak / non_existent

residual_risk_score

DECIMAL(5,2)

Post-control residual risk (1–5 scale)

risk_owner

kri_definition

UUID

TEXT

FK → users.id — accountable risk owner

Key Risk Indicator definition and threshold

kri_current_value

DECIMAL(10,2)

Latest KRI measured value

kri_breach_status

VARCHAR(20)

within_threshold / warning / breached

linked_controls

last_audited

next_review_due

JSONB

DATE

DATE

Array of control_library IDs mapped to this risk

When this risk area was last covered by an audit

When the risk assessment should be refreshed

Enhanced Risk-Based Plan Inputs

RBI expects risk assessment to consider factors beyond RAM parameters, including past audit
results, external inspections, management changes, and environmental factors. The planning
module is extended with:

Extended RAM Inputs: Parameters for external audit / regulatory findings, IT and cyber
assessments, fraud trends, and market / macro indicators feed into the audit plan prioritization
engine alongside the existing 19-parameter RAM model.

Configurable Weighting Layer: IAD managers can tune how much weight RAM scores,
external inspection results, thematic risk inputs, and KRI breaches carry in determining audit
frequency and scope. Weights are versioned and approval-controlled.

Plan Simulation (‘What-If’ Analysis): Scenario modeling that shows the impact on audit
frequency and schedule when a risk parameter worsens. For example, simulating a 20%
increase in NPA at 5 branches shows how many additional audits would be triggered, enabling
proactive resource planning.

Audit Engagement → Risk Linkage: Each audit engagement can be linked to one or more
auditable entities beyond the branch and to specific risk themes from the risk register (e.g.,
‘Credit underwriting quality at Branch X’ or ‘KYC lapses across Western Zone’), enabling
thematic audit coverage tracking.

Confidential | Page 43

RBIAS — Software Design Document

M9: Control Library & Standardized Work Programs

Following global best practices (COSO, IIA Standards, ISO 31000), RBIAS maintains a
centralized control library with test procedures and work programs. This shifts the audit
approach from being purely observation-focused to one grounded in systematic control testing
and effectiveness assessment.

Control Library

Column

Type

Description

id

UUID

Control identifier

control_code

VARCHAR(20)

Unique code (e.g., CRD-CTL-001, CASH-CTL-012)

process_area

VARCHAR(50)

Mapped process: deposits, lending, cash_ops, kyc_aml,
it_security, etc.

control_objective

TEXT

What the control aims to achieve

control_description

TEXT

How the control operates — activity, frequency,
responsible party

control_type

VARCHAR(20)

preventive / detective / corrective / directive

control_frequency

VARCHAR(20)

per_transaction / daily / weekly / monthly / quarterly /
annual

control_owner

VARCHAR(100)

Role or position responsible for operating this control

key_control

BOOLEAN

Whether this is a key control — key controls receive
mandatory testing

framework_mapping

JSONB

Mapping to frameworks: COSO, ISO 31000, etc.

linked_risks

is_active

JSONB

Array of risk_register IDs this control mitigates

BOOLEAN

Whether the control is currently active

Test Procedures & Work Programs

Standardized test procedures define how each control should be evaluated. A work program is
the set of procedures assigned to a specific audit engagement, with completion and review
tracking. When an audit is initiated, the system generates a default work program which the
Lead Auditor can customize.

Table

Key Columns

Purpose

test_procedures

work_program_items

id, control_id, procedure_code, description,
sample_methodology, expected_evidence,
pass_criteria

id, audit_id, test_procedure_id, assigned_to,
status, actual_sample_size, result,
workpaper_ref, reviewed_by

Standard test templates
linked to controls

Runtime work program
per audit engagement

Confidential | Page 44

RBIAS — Software Design Document

Control Effectiveness Analytics

The Analytics module is extended with control effectiveness views: trends across time showing
whether controls are improving or degrading, heatmaps by process area and branch, and drill-
down from aggregate scores to individual test results.

Confidential | Page 45

RBIAS — Software Design Document

M10: Continuous Auditing & Data-Driven Testing

Modern internal audit practice emphasizes data analytics and continuous monitoring, testing
100% of significant transactions rather than relying solely on periodic sampling. This module
provides data connectors, a rule-based analytics engine, and continuous monitoring
dashboards.

Data Integration Layer

Read-only connectors and ETL pipelines bring operational data into RBIAS for automated
analysis:

Source System

Data Feed

Frequency

Key Data Points

Core Banking
(CBS)

Account and
transaction data

Daily

Account master, transaction ledger, interest
rates, balance movements

Loan Origination
(LOS/LMS)

General Ledger

AML / KYC
System

ATM / POS
Switch

Loan lifecycle data

Daily

Applications, sanctions, disbursements,
repayments, overdue, NPA flags

GL balances and
entries

Daily

Suspense balances, reconciliation status,
P&L items, off-balance sheet

Compliance alerts

Real-time

STR flags, CTR reports, risk categorization
changes, PEP matches

Device and
transaction data

Daily

ATM cash levels, failed transactions,
reconciliation gaps

HR / Payroll

Staff data

Weekly

Transfers, leave patterns, accountability
cases, training records

Rule-Based Analytics Engine

Configurable rule sets that run automatically against ingested data to detect exceptions and
anomalies:

Rule Category

Example Rules

Severity

Credit Anomalies

EMI debited but no matching loan in CBS master;
Sanction exceeds delegated authority; Incomplete
documentation flags

Cash
Irregularities

KYC/AML Red
Flags

NPA Early
Warning

Cash exceeding retention limit 3+ days; Large deposits
just below CTR threshold (structuring); Denomination
imbalance

Multiple accounts on same PAN with high turnover;
Dormant account large reactivation; PEP without
enhanced DD

SMA-1 not migrated to SMA-2 despite DPD breach;
Provision shortfall vs RBI norms; Recovery suits not
filed timely

High

High

Critical

High

Confidential | Page 46

RBIAS — Software Design Document

Operational Gaps

Aged suspense balances > 30 days; Reversed entries
without supervisor approval; Pending inter-branch
reconciliation

Medium

Staff-Related

Single user as maker and checker; Excessive override
usage; High-value transactions without rotation

Medium

Data Exceptions & Continuous Monitoring

Exceptions detected by rules are stored in a data_exceptions table with severity, status tracking,
and linkage to audit engagements and formal observations. Continuous monitoring dashboards
provide real-time KPIs, early warning lists of branches breaching thresholds, coverage metrics,
and exception-to-audit pipeline views.

Confidential | Page 47

RBIAS — Software Design Document

M11: AI & Advanced Analytics Layer

RBIAS embeds AI and machine learning capabilities to enhance anomaly detection, provide
intelligent suggestions during audit execution, and enable predictive risk modeling.

Anomaly Detection

Domain

Model Type

Application

Loan Portfolio

Isolation Forest /
Autoencoder

Detect outlier loan accounts deviating from branch or
product norms by size, tenure, repayment pattern

Cash Operations Statistical Process Control

- DBSCAN

Identify unusual cash inflow/outflow patterns,
denomination anomalies, and timing irregularities

NPA Movement

Time-series anomaly
detection

Flag branches where NPA classification timing or
provision patterns deviate from regulatory norms

Transaction
Monitoring

Clustering (k-means /
HDBSCAN)

Surface structuring, round-tripping, or unusual
counterparty concentration patterns

Staff Behavior

Behavioral scoring models

Identify staff with unusual override patterns,
transaction timing, or access behavior

Text Analytics & Predictive Models

NLP Clustering: Group similar observations across branches and audit periods using text
embeddings and topic models, revealing recurring themes.

Auto-Suggest References: When drafting observations, the system suggests applicable RBI
circulars, bank policy references, and similar past findings using semantic similarity search.

RAM Category Prediction: Predict probability of a branch moving to higher risk category based
on historical patterns of exceptions, fraud incidents, and audit ratings.

Compliance Risk Scoring: Predict which open compliance items are likely to breach SLA
deadlines based on response patterns and historical closure times.

Smart Suggestions UI

A context-aware sidebar during observation entry provides: suggested risk category/severity
based on text analysis, top 5 similar past findings from prior audits, pre-drafted root cause
analysis and recommended corrective actions, and emerging risk theme alerts from the latest
audit cycle.

Confidential | Page 48

RBIAS — Software Design Document

M12: Issue & Action Management

Global best practice treats an ‘issue’ as a reusable concept across all assurance activities —
not only internal audit but also regulatory inspections, external audit, and internal control testing.
RBIAS extends the compliance tracking model with a unified issue management framework and
granular action plan tracking.

Issues Table

Column

Type

Description

id

issue_code

source

title

description

issue_type

severity

root_cause

risk_theme

owner

linked_controls

UUID

Issue identifier

VARCHAR(20)

Auto-generated code (e.g., ISS-2026-0042)

VARCHAR(30)

internal_audit / regulatory_inspection / external_audit
/ control_testing / risk_event / self_assessment

VARCHAR(200) Concise issue title

TEXT

Detailed issue description

VARCHAR(30)

control_deficiency / policy_violation /
regulatory_breach / process_gap / system_weakness

VARCHAR(20)

critical / high / medium / low

TEXT

Root cause analysis

VARCHAR(50)

Linked risk theme from risk register taxonomy

UUID

JSONB

FK → users.id — issue owner responsible for
remediation

Array of control_library IDs related to this issue

linked_compliance_item_id UUID

FK → compliance_items.id (if sourced from audit)

status

due_date

VARCHAR(30)

open / action_in_progress / partially_closed / closed /
accepted_risk

DATE

Target remediation date

residual_risk_accepted

BOOLEAN

Whether residual risk is formally accepted by
management

Action Plans

Each issue can have multiple action items, enabling partial closure and milestone tracking:

Column

Type

Description

id

issue_id

action_description

UUID

UUID

TEXT

Action plan item identifier

FK → issues.id

Specific corrective action to be taken

Confidential | Page 49

RBIAS — Software Design Document

action_owner

UUID

FK → users.id

priority

VARCHAR(20)

immediate / short_term / medium_term / long_term

original_due_date

revised_due_date

milestones

status

DATE

DATE

JSONB

Initial target date

Revised target (with revision history in JSONB)

Array of intermediate milestones with dates and status

VARCHAR(20)

not_started / in_progress / completed / overdue /
cancelled

evidence_files

verified_by

JSONB

UUID

Uploaded evidence file references

FK → users.id — auditor who verified closure

This enables the Board/ACB to receive a consolidated view of all open issues regardless of
source, with severity-based prioritization and partial closure tracking.

Confidential | Page 50

RBIAS — Software Design Document

Enhanced Planning & Resource Management

The Audit Planning module is extended with skill-based resource allocation, capacity
management, and multi-entity audit support aligned with enterprise-grade audit tools.

Auditor Skills & Capacity

Enhancement

Description

Skills Matrix

Each auditor profile includes domain skills (IT audit, cyber, treasury, retail
lending, forex, AML), certifications (CIA, CISA, CFE), and experience levels.
Stored as JSONB in extended user profiles.

Utilization Targets

Annual utilization targets (e.g., 80% productive audit days) tracked against
actual assignments. Prevents over-allocation and burnout.

Skill-Based Auto-
Assignment

System suggests optimal team composition based on branch risk profile and
required skills (e.g., high-NPA branch requires credit specialist).

Conflict Detection

Detects utilization breaches, cooling-off periods between same-branch
audits, and skill coverage gaps beyond simple date conflicts.

Geography-Aware Scheduling

Travel optimization through geography-aware clustering: the system proposes audit trips that
combine nearby branches into efficient travel schedules, reducing cost and time while
maximizing coverage. Branches are geocoded and clustered using proximity algorithms.

Multi-Entity Audits

Support for engagements covering multiple branches or entities under a single audit (e.g.,
thematic audits on ‘Gold Loan Processes across Western Zone’). A single engagement links to
multiple branch_ids with shared findings, consolidated reporting, and cross-entity comparison
analytics.

Confidential | Page 51

RBIAS — Software Design Document

GRC Integration & Open API Layer

RBIAS provides an open integration layer enabling bi-directional data exchange with the bank’s
broader GRC ecosystem and enterprise systems, aligning with RBI’s expectation that RBIA is a
subset of the broader risk management framework.

Integration Points

Integration Point

Direction

Protocol

Purpose

Enterprise ERM
System

Bi-directional REST +

Webhooks

Sync risk register entries, KRI values, and
risk assessment updates

ITSM / Issue Tracker

Bi-directional REST API

Push audit issues to IT remediation queues;
receive resolution updates

HRMS / IAM

Inbound

Regulatory Reporting Outbound

SCIM / LDAP /
SAML

User provisioning, role sync, staff transfer
notifications, SSO

REST / File
Export

Audit summaries and compliance data for
regulatory submissions

CBS / Core Banking

Document
Management

DB connector /
API

Inbound
(read-only)
Bi-directional REST /

WebDAV

Branch, account, and transaction feeds for
continuous auditing

Store and retrieve audit workpapers,
evidence, and reports

Shared Taxonomies & Unified Risk View

RBIAS maintains configurable master dictionaries synchronized with enterprise systems:
common risk categories, process codes, product codes, control objectives, and organizational
hierarchy. A ‘Single View of Risk’ dashboard aggregates data from multiple sources into one
screen per risk theme: showing the risk score, open issues from all assurance sources, pending
action plans, recent audit coverage, and current KRI status.

Confidential | Page 52

RBIAS — Software Design Document

UX & Mobility Enhancements

Building on the responsive web application design, RBIAS includes mobility features, workpaper
management, and collaboration tools to fully replace paper-based audit files and email chains.

Mobile Application / PWA

Feature

Platform

Description

Evidence Capture Mobile /
Tablet

Camera integration for photos, video, and voice-to-text notes linked
to active audit sections

Quick Checklists Mobile

Simplified value statement examination with swipe-based status
marking optimized for one-handed use

Offline-First Sync Mobile /
Tablet

Full offline capability using service workers and IndexedDB;
conflict-free sync on reconnection

Branch Head
Sign-Off

Push
Notifications

Tablet

Digital BH Certificate with signature pad capture and timestamp

Mobile

Real-time alerts for assignments, deadlines, review requests, and
escalation triggers

Electronic Workpaper Management

Workpaper per Test: Each work program item has an associated electronic workpaper with
standardized sections: objective, scope, sample selection, test steps, results, conclusion, and
reviewer sign-off.

Cross-References & Version History: Internal hyperlinks between workpapers, observations,
and evidence files. Full version tracking with diff views.

Export Pack: One-click export of the complete audit file as ZIP/PDF bundle containing all
workpapers, evidence, reports, and sign-offs.

Collaboration Features

Inline Comments & Review Notes: Threaded comments with @-mentions on sections,
observations, and workpapers. Structured review workflow: Reviewer raises query → Auditor
responds → Resolved flag.

Real-Time Presence: See which team members are currently working on which sections during
a live audit engagement, preventing duplicate effort.

Multilingual Support: UI localization framework for Hindi and regional languages, supporting
multi-lingual audit teams.

Confidential | Page 53

RBIAS — Software Design Document

Multi-Tenant Architecture

For deployment across multiple UCBs, NBFCs, or small finance banks, RBIAS supports multi-
tenancy from day one, enabling SaaS-style commercial delivery without major redesign.

Tenant Isolation & Configuration

Aspect

Data Isolation

Tenant
Configuration

White-Label
Branding

Approach

All key tables include tenant_id. PostgreSQL Row-Level Security (RLS) enforces
strict isolation at DB layer.

Per-tenant: RAM parameters, scoring weights, templates, workflow rules, report
branding, SLAs, escalation timelines.

Configurable logo, color palette, report headers/footers, and terminology
overrides per bank.

User Management

Tenant-scoped user creation with tenant-admin role. Per-tenant SSO
(SAML/OIDC) integration.

Data Residency

Support for tenant-specific schemas or dedicated DB instances for strict data
residency requirements.

Billing & Metering

Usage tracking per tenant: active users, audits, storage, API calls. Subscription
and usage-based pricing.

Deployment Models

Model

Description

Suitable For

Shared SaaS

Multi-tenant cloud with RLS isolation. Cost-
effective, centralized updates.

Small UCBs, cooperative banks

Dedicated
Instance

Separate app and DB per bank. Maximum
isolation.

Larger banks, strict data
sovereignty

On-Premise

Deployed in bank’s own data center or private
cloud.

Regulatory mandates for on-
premise

Hybrid

Cloud platform with on-premise data
processing via secure connectors.

Cloud convenience + on-premise
security

Confidential | Page 54

RBIAS — Software Design Document

M13: Quality Management for Internal Audit Function

RBI and IIA both mandate periodic quality assessments of the internal audit function itself.
RBIAS includes a Quality Assessment module for ongoing internal assessments and periodic
external quality reviews.

Quality Assessment Framework

Component

Description

Self-Assessment
Questionnaires

Standardized questionnaires mapped to IIA Standards and RBI RBIA
guidance. Scored against maturity criteria.

Gap Analysis

Automated gap identification. Gaps converted to issues in the Issue
Management module for tracking.

External QA Support

Template for external quality reviews. Findings imported and tracked
alongside self-assessment gaps.

Remediation Tracking

All quality gaps feed into issues and action_plans framework for consistent
follow-up and closure.

Internal Audit Effectiveness KPIs

KPI

Measurement

Target

Plan Completion Rate

% of annual audit plan completed on
schedule

90–100%

Avg Audit Cycle Time

Days from audit start to final report
submission

15–25 days

High-Severity
Resolution

% of critical/high issues resolved
within SLA

Repeat Finding Rate

% of observations that are repeats
from prior audits

Compliance Closure
Rate
Stakeholder Satisfaction Annual survey score from auditees

% of compliance items closed within
policy timelines

and management (1–5)

Auditor Utilization

% of productive audit days vs.
available days

Data Analytics
Coverage

% of key transactions covered by
continuous monitoring

Workpaper Quality
Score

Average reviewer acceptance rate
without rework

Training Hours/Auditor

Annual professional development
hours

Confidential | Page 55

> 85%

< 15%

> 80%

> 3.5

75–85%

> 60%

> 90%

> 40 hrs

RBIAS — Software Design Document

These KPIs are tracked in the Analytics module and presented in a dedicated ‘Audit Function
Health’ dashboard available to IAD management and ACB members.

Confidential | Page 56

RBIAS — Software Design Document

UCB & RBI Regulatory Alignment Framework

RBIAS is designed as a regulatory-aligned Internal Audit & Risk Assurance platform specifically
tailored for Urban Cooperative Banks (UCBs). The following sections detail how the system
implements and supports RBI’s Master Circular on Inspection & Audit Systems in UCBs, IRAC
norms, capital adequacy requirements, investment and treasury controls, and inter-bank
exposure limits. Together, these capabilities ensure that a UCB using RBIAS can demonstrate
full compliance and strong governance during RBI inspections.

Confidential | Page 57

RBIAS — Software Design Document

M14: Unified Audit Universe & Calendar

RBI expects UCBs to maintain a robust framework of internal inspection, concurrent audit, and
EDP/IS audit alongside RBIA. RBIAS extends the audit planning module to cover all mandated
audit types in a single calendar, each tagged with the required periodicity and audit
characteristics.

Audit Type

RBI Requirement

RBIAS Implementation

Branch RBIA

Risk-based frequency (12/18/24
months) per RAM scores

Core module M1–M4. RAM-driven planning
with auto-scheduling

Branch Internal
Inspection

At least once in 12 months;
surprise character mandatory

Separate scope type with surprise scheduling.
Pre-loaded RBI-aligned inspection checklists

Concurrent Audit

Mandatory for large/problem
branches, treasury, sensitive
areas. Daily/weekly checks

Dedicated concurrent audit workbench (see
M15). Scope templates for cash, investments,
advances, off-BS items

EDP / IS Audit

Dedicated EDP audit cell; review
of CBS, channels, access
controls, DR, vendor
management

IS/EDP audit module (see M18) with
application inventory, IS-specific checklists,
and vendor risk tracking

RBI Inspection
Follow-up

Systematic tracking of RBI
observation paras and ATR
submission

Regulatory observation hub (see M19) with
para-to-issue mapping and ATR workflow

Statutory Audit
Follow-up

Track qualifications, emphasis of
matter, and remediation

Statutory observations imported into unified
issue register with action plans

Audit Universe Entity Table

Column

Type

Description

id

entity_type

entity_name

branch_id

risk_score

UUID

Entity identifier

VARCHAR(30)
VARCHAR(100) Name (e.g., ‘Treasury Department’, ‘Internet

branch / ho_department / process / channel / vendor

Banking Channel’)

UUID

FK → branches.id (null for non-branch entities)

DECIMAL(5,2)

Composite risk score from RAM / concurrent issues /
IRAC findings

last_audit_date

last_audit_rating

DATE

Date of last completed audit/inspection

VARCHAR(20)

Rating from last engagement

required_frequency_months

INTEGER

RBI-mandated or risk-derived periodicity

audit_scope_types

JSONB

surprise_required

BOOLEAN

Applicable types: [rbia, internal_inspection,
concurrent, is_audit]

Whether RBI mandates surprise character for this
entity

Confidential | Page 58

RBIAS — Software Design Document

status

VARCHAR(20)

active / inactive / merged

Confidential | Page 59

RBIAS — Software Design Document

M15: Concurrent Audit Module

RBI requires concurrent audit as an early-warning system covering large/problem branches,
treasury, investments, and sensitive areas. RBIAS implements concurrent audit as a first-class
module with its own workbench, scope templates, and escalation mechanisms.

Concurrent Audit Scope Templates

Pre-loaded RBI-aligned scope templates with coverage guidance:

Area

Coverage Level

Key Checks

Cash & Vault

Investments /
Treasury

100% of high-
value
transactions

100% of trades

Retention limit compliance, denomination management, vault
access controls, ATM reconciliation

SGL/CSGL reconciliation, broker compliance (5% cap), non-
SLR limits, HTM/HFT/AFS classification

Advances
(Large/Problem)

100% of specified
accounts

Sanction terms adherence, drawing power, end-use, NPA
identification accuracy, IRAC compliance

Deposits

10–25% sampling

Interest rate compliance, TDS, nomination, dormant account
procedures, unclaimed deposits

Housekeeping

Key items check

Inter-branch/inter-bank reconciliation, suspense/sundry
ageing, clearing differences

Off-Balance
Sheet

KYC/AML

100% of new
items

Risk-based
sample

LC/BG issuance compliance, limits, documentation, expiry
monitoring

Customer due diligence, periodic KYC updates, STR/CTR
filing, PEP screening

EDP Controls

Per CBS change
cycle

Password practices, access logs, CBS parameter changes,
night batch verification

Concurrent Audit Workbench

Rapid Entry UI: Streamlined interface for concurrent auditors (who may be external CA firms)
to record daily/weekly observations under RBI-defined heads. Quick status marking (satisfactory
/ observation raised / serious irregularity) with mandatory detail for observations.

Serious Irregularity Escalation: When a concurrent auditor marks an observation as ‘serious
irregularity’, the system immediately notifies HO/IAD management and flags it on the ACB
dashboard, as RBI requires immediate escalation of serious issues.

De-duplication with RBIA: Findings raised in concurrent audit automatically surface during
RBIA planning for the same branch. Analytics identify branches with persistent concurrent audit
issues for higher RAM risk scoring and more intensive RBIA coverage.

Confidential | Page 60

RBIAS — Software Design Document

M16: IRAC & Provisioning Engine

RBI’s Master Circular on Income Recognition, Asset Classification and Provisioning (IRAC) for
UCBs is detailed and non-negotiable. RBIAS includes an IRAC computation engine that cross-
checks the bank’s own NPA classification and provisioning against regulatory norms.

IRAC Computation Pipeline

Step 1 — Data Ingestion: CBS loan data is imported via file upload (CSV/Excel) or API
connector into a loan_raw_imports staging table. Key fields: account number, borrower, product
type, sanction amount, outstanding balance, overdue days (DPD), current classification, current
provision amount.

Step 2 — NPA Identification: The engine applies RBI IRAC norms to recompute classification:
Standard, Sub-standard, Doubtful (D1/D2/D3 by age buckets), Loss. Special rules for CC/OD
accounts (out-of-order criteria), agricultural loans (crop season norms), and restructured assets.

Step 3 — Provision Computation: Required provisioning is calculated per asset class,
secured/unsecured status, and age. Results are compared against the bank’s actual provisions.

Step 4 — Exception Generation: Mismatches (under-provisioning, mis-classification, delayed
NPA recognition) are automatically generated as audit exceptions linked to the branch RBIA
and the unified issue register, visible to ACB.

Table

Key Columns

loan_raw_imports

id, audit_id, batch_id, account_no, borrower, product,
outstanding, dpd, bank_classification, bank_provision

irac_computed_positions

id, import_id, account_no, computed_classification,
computed_provision, bank_classification,
bank_provision, deviation_type, deviation_amount

Purpose

Staging table for
CBS loan data
imports

Engine output
with per-account
IRAC
recomputation
and deviation
flags

Confidential | Page 61

RBIAS — Software Design Document

M17: Investment & Treasury Audit Controls

RBI has strong expectations on investment management in UCBs, including SGL/CSGL
reconciliation, broker intermediation controls, non-SLR investment caps, and quarterly
certification requirements.

Control Area

RBI Requirement

RBIAS Implementation

SGL/CSGL
Reconciliation

Regular reconciliation of
government securities holdings

Broker
Compliance

Max 5% of annual trade volume
per broker; no broker
intermediation in inter-bank G-
sec trades

Non-SLR
Investments

Cap at 10% of total deposits;
rating and prudential criteria

Checklist items in concurrent and periodic
audits verifying SGL/CSGL match with bank
records

Analytics engine calculates per-broker volume
percentage and flags breaches with reason-
capture for ACB review

Dashboard tracking non-SLR exposure vs cap
with drill-down to individual holdings and rating
compliance

HTM/HFT/AFS
Classification

Proper classification per RBI
investment norms

Audit checklist verifying classification
correctness and compliance with shifting limits

Quarterly
Certification

Concurrent/internal auditor
certifies that reported
investments are actually held

Workflow for auditor certification with sign-off,
upload, and ‘sent to RO’ status tracking

The HO treasury is treated as an auditable entity in the audit universe, with dedicated
concurrent audit and periodic IS audit coverage.

Confidential | Page 62

RBIAS — Software Design Document

M18: EDP / IS Audit Module

RBI explicitly requires dedicated EDP/IS audit capability in UCBs, covering all critical
applications, vendor management, and technology controls.

Application Inventory

Column

Type

Description

id

UUID

Application identifier

app_name

VARCHAR(100)

CBS, Internet Banking, Mobile Banking, ATM Switch,
Card Host, UPI, LOS/LMS, etc.

vendor

version

hosting

sla_ref

VARCHAR(100)

Technology vendor name

VARCHAR(30)

Current version deployed

VARCHAR(30)

on_premise / cloud / managed_service

VARCHAR(50)

Reference to vendor SLA document

visitorial_rights

BOOLEAN

Whether contract includes RBI visitorial rights clause

last_is_audit_date

DATE

Date of last IS/EDP audit

criticality

VARCHAR(20)

critical / high / medium / low

dr_tested_date

DATE

Last DR drill date for this application

IS Audit Checklists

Pre-loaded RBI-aligned IS audit checklists covering: user access management and segregation
of duties, change management and release controls, backup and disaster recovery drills,
security controls (firewall, encryption, endpoint protection), parallel run and cut-over processes
for system changes, CBS parameter audit (interest rates, product masters, user privileges), and
outsourced processing arrangement oversight including vendor SLA compliance.

For branches with heavy digital channel usage, RBIA automatically includes IS control
verification items (password practices, CBS access log sampling) to complement the HO-level
IS audit.

Confidential | Page 63

RBIAS — Software Design Document

M19: Regulatory Observation & Follow-up Hub

RBI expects systematic, timely follow-up of all assurance source observations with ACB
oversight. RBIAS provides a unified hub for tracking observations from RBI inspections,
statutory audits, concurrent audits, and internal inspections.

Column

Type

Description

id

source

UUID

Regulatory observation identifier

VARCHAR(30)

rbi_inspection / statutory_audit / concurrent_audit /
nabard_inspection / other

reference_no

VARCHAR(50)

RBI letter number, audit report reference, etc.

para_no

VARCHAR(20)

Para/observation number within the source report

observation_text

TEXT

Full text of the regulatory observation

severity

date_received

response_due_date

atr_status

atr_text

VARCHAR(20)

critical / major / minor / procedural

DATE

DATE

Date observation was received by the bank

Deadline for ATR/response submission

VARCHAR(20)

draft / submitted / rbi_accepted / further_info_required

TEXT

Action Taken Report content

linked_issue_ids

JSONB

Array of issue IDs mapped to this observation for internal
tracking

Each RBI inspection para is mapped to one or more internal issues with action plans, owners,
and deadlines. The system tracks ATR preparation, submission to Regional Office, and closure
evidence. ACB receives a consolidated view of all regulatory observations and their rectification
status.

Confidential | Page 64

RBIAS — Software Design Document

Housekeeping Risk Metrics

RBI repeatedly flags poor housekeeping as a systemic risk in UCBs. RBIAS maintains branch-
level housekeeping KPIs that feed into RAM scoring and trigger more intensive audit coverage:

Metric

Source

Impact

Inter-branch unreconciled
entries (count & age)

CBS reconciliation data /
audit verification

High unreconciled counts increase RAM
score; oldest entry age triggers escalation

Inter-bank unreconciled
entries

Suspense/sundry balance
& age

Clearing differences count
& resolution time

Treasury/accounts
reconciliation
GL data / audit verification Large/aged suspense balances increase

Feeds inter-bank risk dashboard; aged items
flagged to ACB

operational risk score

Clearing department data

Persistent differences flagged in concurrent
and RBIA reports

Off-BS register
completeness (LC/BG)

Concurrent audit / RBIA
checks

Incomplete registers flagged as control
deficiency

These metrics are stored in a housekeeping_metrics table (branch_id, as_of_date, metric
values) updated during audits and optionally via data feeds. A dedicated ‘Housekeeping Health’
dashboard is available for CEO and ACB.

Confidential | Page 65

RBIAS — Software Design Document

Inter-bank Exposure Monitoring

RBI caps inter-bank exposures for UCBs and requires Board oversight:

Limit

RBI Norm

RBIAS Monitoring

Total inter-bank
placements

≤ 20% of total deposits

Real-time dashboard showing current
placement vs cap; breach alerts to treasury
and ACB

Per-bank exposure

≤ 5% of total deposits per
counterparty

Per-counterparty exposure tracker with breach
flags

Exposures to
weak/AID banks

Phased provisioning and
exposure reduction

Separate tracking of exposures to banks under
RBI directions with provisioning compliance
checks

UCB-to-UCB deposits Specific RBI restrictions

apply

Tagged separately in exposure dashboard with
applicable limit calculations

Audit checklists for HO/treasury audits include standardized tests checking compliance with all
inter-bank limits. Any breaches are directly linked to the issue register and ACB dashboard.

Confidential | Page 66

RBIAS — Software Design Document

M20: Governance & Board Compliance Module

RBI lays down explicit expectations for Board, ACB, and (for larger UCBs) Risk Management
Committee governance. RBIAS supports these governance requirements with:

ACB Workspace & Agenda Builder

A dedicated ACB view that consolidates:

Audit Status Overview: Status of all internal inspections, concurrent audits, EDP audits, and
RBIA engagements in one dashboard.

Unrectified Irregularities: Ageing analysis of all open issues across assurance sources, with
drill-down by severity and source.

ACB Agenda Builder: Auto-generate quarterly ACB meeting packs containing: summary of
serious irregularities, fraud/vigilance cases, long-outstanding inter-branch/inter-bank items,
compliance status on RBI/statutory/concurrent observations, and IRAC deviation summaries.

Board Review Calendar

Maintains RBI’s suggested list of items to be placed before Board/ACB with required frequency:

Review Item

Frequency

Status Tracking

Asset quality and NPA
review

Quarterly

Auto-populated from IRAC engine; presentation and
minutes upload

Investment portfolio review

Quarterly

Data from treasury audit module; non-SLR compliance
status

Audit follow-up status

Quarterly

Consolidated from issue register across all sources

Risk management review

Quarterly

RAM scores, KRI dashboard, inter-bank exposure
status

Policy review status

Annual / As
due

Policy library flags overdue reviews; minutes linkage

IT/Cyber security review

Half-yearly

IS audit findings, incident reports, DR drill status

Fraud cases and vigilance

As they arise

- Quarterly
  summary

Linked to issue register with fraud case tracking

Confidential | Page 67

RBIAS — Software Design Document

Policy Library & Review Tracker

Column

Type

Description

id

UUID

Policy identifier

policy_name

VARCHAR(200)

category

VARCHAR(30)

Credit Policy, Investment Policy, IRAC Policy, Internal
Audit Policy, IS/IT Policy, ALM Policy, etc.

credit / investment / audit / risk / it / compliance / hr /
operations

approval_date

last_review_date

next_review_due

owner

file_ref

DATE

DATE

DATE

UUID

Date of last Board/ACB approval

Date of last review

System-calculated or manually set next review date

FK → users.id — department head responsible

VARCHAR(200)

Reference to uploaded policy document

board_minutes_ref

VARCHAR(100)

Reference to Board/ACB meeting where policy was
approved

RBIA and ACB views flag policies overdue for review. The system maintains version history so
auditors can verify which policy version was in effect during a specific audit period.

Committee Governance Metadata

RBIAS tracks Board committee composition and meeting records to demonstrate RBI-compliant
governance:

Table

Key Columns

Purpose

board_committees

id, name (ACB / RMC / ALCO / Credit
Committee), composition_requirements, active

committee_members

committee_id, user_id, role
(chair/member/secretary), appointed_date,
qualification_notes

committee_meetings

committee_id, meeting_date, agenda_ref,
minutes_ref, reports_presented (JSONB)

Master list of governance
committees with RBI-
mandated composition rules

Tracks membership
including RBI requirement
for at least one CA/finance
expert on ACB

Meeting records linked to
RBIAS-generated reports
and issues reviewed

Confidential | Page 68

RBIAS — Software Design Document

RBI Inspection Support Pack

A one-click report generation feature producing a comprehensive documentation pack for RBI
inspection teams:

Report Component

Data Source

Content

Annual Internal Audit Plan
Summary

annual_plans +
audit_universe_entities

Planned vs completed audits by type, with
deviation explanations

Serious & Long-Pending
Findings

issues (severity =
critical/high, age > 90
days)

All high-severity open issues with ageing,
owner, and remediation status

IRAC & Provisioning
Deviations

irac_computed_positions

Branch-wise summary of classification and
provisioning mismatches

Investment & Inter-bank
Compliance

Treasury audit module +
inter-bank exposure

Non-SLR cap compliance, broker volume
analysis, inter-bank limit adherence

Concurrent Audit
Summary

concurrent audit
observations

Trend of concurrent audit findings by
category and severity

Follow-up on Previous RBI
Observations

regulatory_observations +
issues

Para-by-para status of previous RBI
inspection findings with ATR evidence

Housekeeping Health
Summary

housekeeping_metrics

ACB Meeting Records

committee_meetings

Policy Review Status

policy_documents

Branch-wise reconciliation status,
suspense/sundry ageing, clearing
differences

Dates, attendance, key decisions, reports
reviewed

All key policies with last review date and
next due date

Confidential | Page 69

RBIAS — Software Design Document

Risk Management MIS for RMC / Board

Pre-configured risk dashboards aligned to RBI’s risk management expectations for UCBs:

Dashboard

Key Metrics

RBI Alignment

Capital Adequacy

CRAR vs 9% Tier-1, 12% overall; Net
Worth progression vs phase-in
requirements

Asset Quality

Liquidity Risk

Gross NPA %, Net NPA %, SMA
pipeline, sector/borrower
concentration

SLR position, LCR (if applicable),
deposit concentration, inter-bank
dependence

Investment Risk

Portfolio composition (SLR/non-SLR),
MTM impact, broker exposure,
duration risk

Master Circular on Capital Adequacy

IRAC norms; Large exposure framework

ALM guidelines for UCBs

Investment guidelines for UCBs

Operational Risk

Credit
Concentration

Fraud cases, housekeeping health,
staff-related issues, IT incident count Operational risk framework
Top 10/20 borrowers exposure,
sector-wise concentration, group
exposure vs limits

Exposure norms for UCBs

These dashboards can ingest data from the bank’s MIS via read-only feeds into a
regulatory_metrics table, or be populated during the audit cycle. The Risk Management
Committee (for UCBs with assets ≥ Rs 5000 crore) and the Board receive these as pre-
configured report packs.

Confidential | Page 70

RBIAS — Software Design Document

Non-Functional Requirements

Category

Requirement

Specification

Performance Page Load Time

All pages load within 2 seconds on standard broadband
connection

Performance Form Auto-Save

Local save within 500ms, server sync within 3 seconds

Performance Report Generation

Excel report generated within 10 seconds for standard audit (400
loan records)

Performance Dashboard Refresh Analytics queries execute within 5 seconds for 3-year data range

Scalability

Concurrent Users

Support 100+ simultaneous users (auditors, branch heads,
management)

Scalability

Data Volume

Handle 500+ branches, 2000+ audits/year, 50,000+ observations

Security

Authentication

Security

Authorization

Security

Data Encryption

SSO via SAML/OIDC integrated with bank’s IAM; JWT tokens
with 15-min access, 7-day refresh; HTTPS only; MFA for
sensitive operations

Row-level security (RLS) in PostgreSQL; RBAC middleware;
auditors see only assigned audits; branches see only their data;
just-in-time provisioning via SCIM/LDAP

AES-256 for data at rest; TLS 1.3 in transit; field-level encryption
for PAN, Aadhaar, account numbers; configurable data masking
by role

Security

Audit Trail

Immutable audit log for all data modifications with user,
timestamp, IP address; shipped to centralized SIEM

Security

Password Policy

Minimum 12 characters, complexity requirements, 90-day
rotation (or SSO-delegated)

Security

Change
Management

Versioned configuration for RAM parameters, risk scoring,
templates, reports; approval workflow for critical settings with full
history

Availability

Uptime SLA

99.5% availability during business hours (8 AM - 8 PM IST)

Availability

Backup

Daily automated backups with 30-day retention, tested quarterly

Availability

Disaster Recovery

RPO: 1 hour, RTO: 4 hours; active–passive or active–active
deployment options across data centers

Observability Monitoring

Centralized logs, metrics via Prometheus/Grafana, alert
thresholds for error rates and performance; health dashboards

Usability

Offline Support

Audit execution forms work offline with auto-sync when
connected

Usability

Usability

Browser Support
Responsive Design Full functionality on tablets (1024px+), read-only on mobile

Chrome 90+, Edge 90+, Firefox 90+, Safari 15+

(768px+)

Compliance Data Retention

Audit data retained for 8 years per RBI guidelines; concurrent
audit records for 10 years; IRAC computation logs retained for
regulatory examination periods

Confidential | Page 71

RBIAS — Software Design Document

Compliance

Export Capability

Compliance Regulatory
Auditability

Compliance

Function-Level
RBAC

Compliance RBI Reporting

All data exportable in CSV/Excel/PDF format for regulatory
submissions; RBI-friendly report packs (inspection support pack,
ATR, concurrent audit summaries) available as one-click exports

Complete audit trail for every observation, classification, and
provisioning computation; immutable logs for IRAC engine
inputs/outputs; concurrent audit timestamp integrity for RBI
examination

Granular permission model aligned to RBI-expected segregation:
field auditors, concurrent auditors, IS/EDP auditors, ACB
members, and RMC members each see only their authorized
modules and data

Pre-configured report templates for ATR submissions,
concurrent audit summaries, IRAC deviation reports, inspection
support packs, and regulatory observation follow-up status

Confidential | Page 72

RBIAS — Software Design Document

Implementation Roadmap

The implementation follows an agile methodology with 2-week sprints, organized into nine
phases. Phases 1–4 (6 months) deliver the core RBIA platform; Phases 5–7 (additional 6–9
months) deliver advanced GRC modules; Phases 8–9 (additional 4–6 months) deliver UCB-
specific regulatory alignment modules including concurrent audit, IRAC engine, treasury
controls, EDP/IS audit, governance dashboards, and the RBI inspection support pack.

Phase 1: Foundation (Weeks 1-6)

Sprint

Sprint 1-2

Sprint 3

Deliverables

Priority

Project setup: database schema, Prisma models, Express API skeleton,
React scaffold, authentication system with JWT and RBAC middleware Critical
Branch Master module, User Management, Zone hierarchy, base
dashboard layout with role-based routing

Critical

Phase 2: Audit Execution (Weeks 7-14)

Sprint

Sprint 4-5

Sprint 6-7

Sprint 8

Deliverables

Priority

Audit Execution Module: section framework, Cash Check, Branch
Details, Register sections with form validation and auto-save

Loans & Advances sections (I and II) with bulk import, SMA & NPA
section, observation entry pattern with risk categorization

Remaining sections (Non-Fund, Housekeeping, Staff Matters, Fixed
Assets, Other Observations), section review workflow

Critical

Critical

High

Phase 3: Reporting & Compliance (Weeks 15-20)

Sprint

Sprint 9-10

Deliverables

Priority

Report Generation Module: Excel export matching existing bank format,
PDF report, Summary report, BH Certificate

Critical

Sprint 11-12 Compliance Tracking Module: full lifecycle workflow, Branch response
portal, ZAC/ACE/ACB review screens, escalation engine

Critical

Phase 4: Planning & Analytics (Weeks 21-26)

Sprint

Deliverables

Priority

Sprint 13-14 RAM Computation Engine with 19 parameters, Annual Audit Plan

generator, plan approval workflow

High

Confidential | Page 73

RBIAS — Software Design Document

Sprint 15-16 Analytics dashboards, Branch Scorecards, trend analysis, management

reporting, notification system

Sprint 17

UAT, performance optimization, offline support, data migration from
existing Excel reports, documentation

High

Critical

Phase 5: Advanced Analytics & Continuous Auditing (Weeks 27-36)

Sprint

Sprint 18-19

Sprint 20-21

Deliverables

Priority

Data Integration Layer: CBS, LOS/LMS, GL connectors with ETL
pipelines; staging tables for key domains; data quality validation
framework

Rule-Based Analytics Engine: configurable rule sets for credit, cash,
KYC/AML, NPA, operational, and staff-related domains;
data_exceptions table and management UI

High

High

Sprint 22-23

Continuous Monitoring Dashboards: real-time exception KPIs, early
warning lists, coverage metrics; AI anomaly detection models (isolation
forest, clustering); Smart Suggestions sidebar for observation entry

Medium

Phase 6: GRC Integration & Issue Management 2.0 (Weeks 37-46)

Sprint

Deliverables

Priority

Sprint 24-25 Enterprise Risk Register & Audit Universe (M8): auditable entities, risk
statements, KRIs, risk-plan linkage, what-if simulation

Sprint 26-27

Sprint 28-29

Sprint 30

Control Library & Work Programs (M9): control_library,
test_procedures, work_program_items tables; standard work program
generation per audit; control effectiveness analytics

Issue & Action Management (M12): unified issues table, action_plans,
multi-source ingestion (regulatory, external audit, self-assessment);
consolidated Board reporting views

GRC Integration APIs: REST/webhook connectors for ERM, ITSM,
HRMS/IAM; shared taxonomy management; unified risk view
dashboard

Medium

High

High

High

Phase 7: Mobility, UX & Productization (Weeks 47-52+)

Sprint

Sprint 31-32

Sprint 33-34

Deliverables

Priority

Mobile PWA: evidence capture (photo/video/voice), quick checklists,
offline-first sync, push notifications; electronic workpaper management
system

Collaboration features: inline comments, review notes workflow, real-
time presence; Quality Management module (M13): self-assessments,
KPIs, external QA support

Medium

Medium

Confidential | Page 74

RBIAS — Software Design Document

Sprint 35-36

Multi-tenant architecture: tenant_id RLS, per-tenant config, white-label
branding, deployment model support; NLP text analytics and predictive
risk models

Medium

Phase 8: UCB RBIA Core & Governance (Weeks 53-62)

This phase delivers the foundational UCB regulatory alignment modules, establishing the audit
universe, concurrent audit workbench, and governance framework mandated by RBI.

Sprint

Sprint 37-38

Sprint 39-40

Sprint 41-42

Sprint 43

Deliverables

Priority

Unified Audit Universe & Calendar (M14): auditable entity registry
(branches, HO depts, channels, vendors), risk-tagged calendar with
audit-type periodicity (RBIA, concurrent, IS/EDP, statutory), Board-
approved plan generation

Concurrent Audit Module (M15): scope templates for cash, investments,
advances, off-BS items; rapid observation entry workbench; serious
irregularity escalation with automatic routing; de-duplication logic
against RBIA findings

Governance & Board Compliance (M20): ACB agenda builder with
auto-populated packs (serious irregularities, frauds, compliance status,
IRAC deviations); Board review calendar; policy document library with
version control and periodic review reminders

Regulatory Observation Follow-up Hub (M19): unified tracker for RBI
inspection, statutory audit, concurrent audit, and internal audit
observations; ATR workflow with drafting, review, and submission
tracking; ageing analysis and escalation triggers

Critical

Critical

Critical

High

Phase 9: IRAC, Treasury, EDP & Risk Analytics (Weeks 63-72)

This phase delivers the specialized computation engines and regulatory control modules that
enable a UCB to demonstrate full IRAC compliance, investment governance, technology audit
readiness, and risk management maturity during RBI inspections.

Sprint

Sprint 44-45

Sprint 46-47

Sprint 48-49

Deliverables

Priority

IRAC & Provisioning Engine (M16): CBS data ingestion pipeline, NPA
recomputation engine (sub-standard/doubtful D1-D3/loss classification),
provisioning cross-check, deviation detection with auto-exception
generation, branch-wise deviation dashboard

Critical

Investment & Treasury Audit Controls (M17): SGL/CSGL reconciliation,
broker intermediation controls, non-SLR cap monitoring,
HTM/AFS/trading portfolio analysis, quarterly auditor certification
workflow

EDP/IS Audit Module (M18): application inventory with risk scores, IS
audit checklist engine (CBS, channels, access, BCP/DR, vendor,
change management), technology control evidence collection and gap
analysis

High

High

Confidential | Page 75

RBIAS — Software Design Document

Sprint 50-51

Risk Management MIS & Inspection Pack: housekeeping KPI
dashboards, inter-bank exposure monitoring, 9-component RBI
inspection support pack generator, RMC/Board risk dashboards (credit,
market, operational, liquidity concentration)

High

Confidential | Page 76

RBIAS — Software Design Document

Appendix

A. Glossary

Term

RBIA

RAM

IAD

ZAC

ACE

ACB

Definition

Risk-Based Internal Audit — the methodology where audit scope and frequency
are determined by risk assessment

Risk Assessment Model — the 19-parameter framework for computing branch-
level risk scores

Inspection and Audit Department — the bank’s central audit function

Zonal Audit Committee — zonal-level committee reviewing audit compliance

Audit Compliance and Evaluation — department responsible for tracking audit
compliance to closure

Audit Committee of the Board — Board-level committee with oversight of audit
function

IA Format

Internal Audit Examination Format — the standardized checklist of 12 functional
areas and 220+ value statements defining what must be examined during each
branch audit

Value Statement

A specific examination point/checkpoint within a functional area that auditors must
evaluate during a branch audit (e.g., ‘Whether nomination is obtained in all deposit
accounts’)

SMA

NPA

DPD

Special Mention Account — accounts showing early signs of stress (SMA-0: 1-30
DPD, SMA-1: 31-60 DPD, SMA-2: 61-90 DPD)

Non-Performing Asset — account classified as substandard (90+ DPD), doubtful,
or loss

Days Past Due — number of days a loan payment is overdue

BH Certificate

Branch Head Certificate — formal acknowledgment by branch manager of audit
findings

CBS

ABN

KYC/AML

Core Banking Solution — the bank’s centralized banking software system

Abandonment — write-off recommendation for irrecoverable accounts

Know Your Customer / Anti-Money Laundering — regulatory compliance
requirements

Lac/Lakh

Indian numbering: 1 Lakh = 100,000 (displayed as financial amounts in reports)

GRC

KRI

COSO

IIA

ETL

Governance, Risk, and Compliance — integrated framework for managing
organizational governance, risk management, and regulatory compliance

Key Risk Indicator — a metric used to signal increasing risk exposure requiring
management attention

Committee of Sponsoring Organizations — framework for internal control and
enterprise risk management

Institute of Internal Auditors — global professional body setting standards for
internal audit practice

Extract, Transform, Load — data pipeline process for ingesting data from source
systems into RBIAS for analytics

Confidential | Page 77

RBIAS — Software Design Document

RLS

PWA

UCB

IRAC

CRAR

ATR

Row-Level Security — PostgreSQL feature enforcing data isolation at the database
query level

Progressive Web Application — web app with native-like mobile capabilities
including offline support

Urban Cooperative Bank — cooperative bank operating in urban/semi-urban areas,
regulated by RBI and the respective State Registrar of Cooperative Societies

Income Recognition, Asset Classification and Provisioning — RBI norms governing
NPA identification, classification (Sub-standard, Doubtful D1/D2/D3, Loss), and
mandatory provisioning percentages

Capital to Risk-weighted Assets Ratio — capital adequacy measure mandated by
RBI for UCBs (minimum 9%)

Action Taken Report — formal report submitted to RBI detailing compliance actions
taken against inspection observations

SGL/CSGL

RMC

Subsidiary General Ledger / Constituent SGL — RBI’s securities holding and
settlement system; UCBs hold government securities via CSGL accounts

Risk Management Committee — Board-level committee required for UCBs with
assets ≥ Rs 5000 crore, overseeing credit, market, operational, and liquidity risk

Concurrent Audit

A real-time or near-real-time audit of transactions at branches/HO functions,
mandated by RBI for large/problem branches, treasury, and sensitive areas in
UCBs

EDP/IS Audit

Electronic Data Processing / Information Systems Audit — technology audit
covering CBS, digital channels, access controls, vendor management, and IT
governance

SLR

ALM

MTM

Statutory Liquidity Ratio — minimum percentage of net demand and time liabilities
that banks must maintain in liquid assets (government securities, cash, gold)

Asset-Liability Management — framework for managing risks arising from
mismatches between assets and liabilities across time buckets

Mark-to-Market — revaluation of investment portfolio to current market prices,
impacting P&L for trading/AFS categories

B. Reference Documents

1. Risk Based Internal Audit Policy 2018 (RBIA Policy) — the governing policy document
   defining audit methodology, RAM framework, risk scoring, reporting requirements, and
   compliance tracking procedures.

2. Internal Audit Format of RBG (IA Format) — the detailed examination checklist defining 12
   functional areas and 220+ value statements that auditors must evaluate at each branch. Areas
   covered: Deposits, Remittances, Cash & Currency Chest, Government Business, Bills, Clearing,
   Customer Service, KYC/AML, IT & Cyber Security, Human Resources, General Administration,
   and Credit/Advances.

3. Existing Audit Report Excel Workbooks (11 files analyzed) — actual branch audit reports from
   Fort, Bhandup, Goregaon, Chembur, Mulund East, Borivli, and Andheri branches, used as the
   definitive reference for report format and data structure.

Confidential | Page 78

RBIAS — Software Design Document

4. RBI Guidelines on Risk-Based Internal Audit for Banks — regulatory framework mandating
   RBIA adoption.

5. Global Internal Audit Best Practices — guidance from IIA Standards, COSO Internal Control
   Framework, ISO 31000, and leading GRC platforms (AuditBoard, MetricStream, Diligent,
   Centraleyes) informing the advanced modules (M8–M13) including control library, continuous
   auditing, AI analytics, and multi-tenant architecture.

6. RBI Master Circular on Inspection & Audit Systems in Urban Cooperative Banks — regulatory
   framework governing RBIA, concurrent audit, EDP/IS audit, and governance expectations for
   UCBs, informing modules M14–M20.

7. RBI Master Circular on Income Recognition, Asset Classification and Provisioning (IRAC) for
   UCBs — norms for NPA identification, classification, and provisioning percentages driving the
   IRAC engine (M16).

8. RBI Guidelines on Investment by UCBs — SLR/non-SLR limits, SGL/CSGL requirements,
   broker intermediation controls, and quarterly certification requirements informing investment
   audit controls (M17).

9. RBI Guidelines on Capital Adequacy (CRAR) for UCBs — minimum 9% CRAR requirement,
   risk-weight calculation, and capital planning framework referenced in risk management
   dashboards.

10. RBI Framework on Inter-Bank Exposure Limits for UCBs — single-bank, aggregate, and
    UCB-to-UCB exposure limits informing the inter-bank exposure monitoring module.

C. Data Migration Strategy

Existing Excel audit reports (11 files) can be migrated into RBIAS using an automated import
utility. The migration process involves: parsing each Excel workbook’s 13-16 sheets, mapping
data to the database schema, handling legacy XLS format conversion, validating imported data
against schema constraints, and generating a migration report showing imported records,
skipped records, and data quality issues. The bulk import for Loans & Advances sections
supports CSV format, which can be extracted from CBS.

Confidential | Page 79
