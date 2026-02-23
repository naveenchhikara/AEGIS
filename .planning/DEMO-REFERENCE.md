# AEGIS Demo Reference Guide

> Quick reference for navigating, testing, and demoing the AEGIS platform.

## Access

| Item        | Value                                                                               |
| ----------- | ----------------------------------------------------------------------------------- |
| **URL**     | http://145.223.19.8:8080                                                            |
| **VPS SSH** | `ssh -i ~/.ssh/vps_key root@145.223.19.8`                                           |
| **App Dir** | `/opt/aegis`                                                                        |
| **Service** | `systemctl restart aegis`                                                           |
| **Deploy**  | `SKIP_ENV_VALIDATION=1 pnpm build` then rsync `.next/standalone/` + `.next/static/` |

## Credentials

| Role                | Email                              | Password           |
| ------------------- | ---------------------------------- | ------------------ |
| CAE + Audit Manager | `priya.sharma@apexbank.example`    | `TestPassword123!` |
| CEO                 | `rajesh.deshmukh@apexbank.example` | `TestPassword123!` |
| Auditor             | `amit.joshi@apexbank.example`      | `TestPassword123!` |
| CCO                 | `suresh.patil@apexbank.example`    | `TestPassword123!` |
| Lead Auditor        | `vikram.kulkarni@apexbank.example` | `TestPassword123!` |

## Branch Audit Process Flow

```
Phase 1: RAM Risk Scoring
  /ram → Create assessment for branch
  /ram/[id] → Score 19 parameters → Compute composite score
  Output: Risk category (HIGH/MEDIUM/LOW) + audit frequency (6-18 months)

Phase 2: Annual Audit Planning
  /audit-plans → Generate annual plan from RAM scores
  /audit-plans → Simulate schedule, assign engagement slots
  Output: Engagement calendar with branch assignments

Phase 3: Engagement Setup (Pre-Audit)
  /audit-execution/[id] → Assign audit team (lead + members)
  /audit-execution/[id]/sections → Assign examination sections to auditors
  Output: Ready-to-execute engagement with team assignments

Phase 4: Fieldwork (Execution)
  /audit-execution/[id]/sections → Mark 568 items (Compliant/Non-Compliant/Partial/NA)
  /audit-execution/[id]/cash → Cash verification entry
  /audit-execution/[id]/loans → Loan review entry
  /audit-execution/[id]/sma-npa → SMA/NPA classification entry
  Output: Completed examination with auto-created observations

Phase 5: Observations & Findings
  /findings → View all observations (7-state lifecycle)
  /findings/new → Create manual observation
  /findings/[id] → View/edit observation with timeline
  States: DRAFT → SUBMITTED → ACKNOWLEDGED → RESPONDED →
          RESOLVED → VERIFIED → CLOSED

Phase 6: Reporting
  /audit-execution/[id]/report → Generate audit report
  /reports → Download XLSX (13+ tabs) or PDF summary
  Output: BH Certificate, risk rating, executive summary

Phase 7: Compliance Lifecycle
  /compliance/ace → ACE officer compliance dashboard
  /compliance/acb → ACB board compliance view
  /auditee/[branchId] → Branch response portal
  Escalation: Auto at +15d/+30d/+90d/+180d overdue
  Flow: Branch Response → ZAC Review → ACE Processing → ACB Reporting
```

## All Navigation Links

### Auth

1. http://145.223.19.8:8080/login

### Dashboard & Analytics

2. http://145.223.19.8:8080/dashboard
3. http://145.223.19.8:8080/analytics
4. http://145.223.19.8:8080/audit-trail

### RAM & Planning

5. http://145.223.19.8:8080/ram
6. http://145.223.19.8:8080/audit-plans

### Audit Execution (requires engagement ID)

7. http://145.223.19.8:8080/audit-execution/create
8. http://145.223.19.8:8080/audit-execution/[engagementId]
9. http://145.223.19.8:8080/audit-execution/[engagementId]/sections/[sectionCode]
10. http://145.223.19.8:8080/audit-execution/[engagementId]/cash-verification
11. http://145.223.19.8:8080/audit-execution/[engagementId]/loan-review
12. http://145.223.19.8:8080/audit-execution/[engagementId]/sma-npa
13. http://145.223.19.8:8080/audit-execution/[engagementId]/report
14. http://145.223.19.8:8080/audit-execution/[engagementId]/bh-certificate

### Findings

15. http://145.223.19.8:8080/findings
16. http://145.223.19.8:8080/findings/new
17. http://145.223.19.8:8080/findings/[observationId]

### Compliance

18. http://145.223.19.8:8080/compliance/ace
19. http://145.223.19.8:8080/compliance/acb
20. http://145.223.19.8:8080/auditee/[branchId]

### GRC (Governance, Risk, Compliance)

21. http://145.223.19.8:8080/risk-management
22. http://145.223.19.8:8080/issues
23. http://145.223.19.8:8080/work-program
24. http://145.223.19.8:8080/qa-assessment
25. http://145.223.19.8:8080/controls/[controlId]

### Regulatory & Governance

26. http://145.223.19.8:8080/regulatory
27. http://145.223.19.8:8080/concurrent-audit
28. http://145.223.19.8:8080/governance
29. http://145.223.19.8:8080/investments
30. http://145.223.19.8:8080/is-audit
31. http://145.223.19.8:8080/calendar
32. http://145.223.19.8:8080/housekeeping

### Reports

33. http://145.223.19.8:8080/reports

### Admin

34. http://145.223.19.8:8080/admin/users
35. http://145.223.19.8:8080/admin/branches
36. http://145.223.19.8:8080/admin/zones
37. http://145.223.19.8:8080/admin/templates
38. http://145.223.19.8:8080/admin/ram-config

### Settings

39. http://145.223.19.8:8080/settings

### API Endpoints

40. http://145.223.19.8:8080/api/health
41. http://145.223.19.8:8080/api/auth/get-session
42. http://145.223.19.8:8080/api/exports/compliance
43. http://145.223.19.8:8080/api/exports/findings
44. http://145.223.19.8:8080/api/exports/audit-plans

## Sample Dynamic Route IDs (from production DB)

| Entity      | ID                                     | Route                 |
| ----------- | -------------------------------------- | --------------------- |
| Engagement  | `10c5b607-e464-4d67-b2eb-2dfa7b2d9af0` | /audit-execution/{id} |
| Engagement  | `48adcefa-4954-4214-8b97-97e317c9912b` | /audit-execution/{id} |
| Observation | `e53c9834-e525-44a5-a2fa-8de46f6ab66c` | /findings/{id}        |
| Observation | `5a7fb7a8-8e24-4369-b416-f29bb91dd18c` | /findings/{id}        |
| Branch      | `075a9607-7a5d-4a25-9b20-0a1102575d95` | /auditee/{id}         |
| Branch      | `81ccb1f0-9123-4a74-88e4-787ccfbbd872` | /auditee/{id}         |
| Control     | `b0000000-0000-0000-0000-000000000061` | /controls/{id}        |

## Link Validation Results

> Last validated: 2026-02-20 01:00 IST
> Method: Authenticated curl (session cookie as Priya Sharma/CAE) on VPS localhost:3000, 1.5s delay between each request

**All 44 routes return HTTP 200.** Three original paths had wrong names (corrected below).

| #   | Path                                       | HTTP | Size  | Notes                  |
| --- | ------------------------------------------ | ---- | ----- | ---------------------- |
| 1   | /login                                     | 200  | 30KB  | Entry point            |
| 2   | /dashboard                                 | 200  | 119KB | KPI widgets            |
| 3   | /analytics                                 | 200  | 98KB  | Charts & trends        |
| 4   | /audit-trail                               | 200  | 62KB  | Activity log           |
| 5   | /ram                                       | 200  | 60KB  | RAM assessments list   |
| 6   | /audit-plans                               | 200  | 96KB  | Annual audit planning  |
| 7   | /audit-execution/create                    | 200  | 70KB  | Create engagement      |
| 8   | /audit-execution/{engId}                   | 200  | 69KB  | Engagement detail      |
| 9   | /audit-execution/{engId}/sections/PENSION  | 200  | 93KB  | Section examination    |
| 10  | /audit-execution/{engId}/cash-verification | 200  | 74KB  | Cash verification      |
| 11  | /audit-execution/{engId}/loan-review       | 200  | 70KB  | Loan review            |
| 12  | /audit-execution/{engId}/sma-npa           | 200  | 59KB  | SMA/NPA entry          |
| 13  | /audit-execution/{engId}/report            | 200  | 72KB  | Audit report           |
| 14  | /audit-execution/{engId}/bh-certificate    | 200  | 61KB  | BH Certificate         |
| 15  | /findings                                  | 200  | 155KB | Observations list      |
| 16  | /findings/new                              | 200  | 54KB  | Create observation     |
| 17  | /findings/{obsId}                          | 200  | 103KB | Observation detail     |
| 18  | /compliance/ace                            | 200  | 61KB  | ACE dashboard          |
| 19  | /compliance/acb                            | 200  | 54KB  | ACB board view         |
| 20  | /auditee/{branchId}                        | 200  | 55KB  | Branch response portal |
| 21  | /risk-management                           | 200  | 120KB | Risk register          |
| 22  | /issues                                    | 200  | 111KB | Issue management       |
| 23  | /work-program                              | 200  | 60KB  | Work programs          |
| 24  | /qa-assessment                             | 200  | 108KB | QA assessment          |
| 25  | /controls/{ctrlId}                         | 200  | 62KB  | Control detail         |
| 26  | /regulatory                                | 200  | 54KB  | Regulatory hub         |
| 27  | /concurrent-audit                          | 200  | 54KB  | Concurrent audit       |
| 28  | /governance                                | 200  | 55KB  | Governance module      |
| 29  | /investments                               | 200  | 55KB  | Investment tracking    |
| 30  | /is-audit                                  | 200  | 54KB  | IS/EDP audit           |
| 31  | /calendar                                  | 200  | 224KB | Audit calendar         |
| 32  | /housekeeping                              | 200  | 54KB  | Housekeeping tasks     |
| 33  | /reports                                   | 200  | 73KB  | Report downloads       |
| 34  | /admin/users                               | 200  | 74KB  | User management        |
| 35  | /admin/branches                            | 200  | 54KB  | Branch management      |
| 36  | /admin/zones                               | 200  | 70KB  | Zone management        |
| 37  | /admin/templates                           | 200  | 65KB  | Template config        |
| 38  | /admin/ram-config                          | 200  | 115KB | RAM parameter config   |
| 39  | /settings                                  | 200  | 72KB  | User settings          |
| 40  | /api/health                                | 200  | —     | Health check           |
| 41  | /api/auth/get-session                      | 200  | —     | Session API            |
| 42  | /api/exports/compliance                    | 200  | —     | Compliance XLSX        |
| 43  | /api/exports/findings                      | 200  | —     | Findings XLSX          |
| 44  | /api/exports/audit-plans                   | 200  | —     | Audit plans XLSX       |

### Corrected Route Names

| Originally Listed              | Correct Path                                 | Issue                    |
| ------------------------------ | -------------------------------------------- | ------------------------ |
| /audit-execution/[id]/sections | /audit-execution/[id]/sections/[sectionCode] | Needs section code param |
| /audit-execution/[id]/cash     | /audit-execution/[id]/cash-verification      | Wrong name               |
| /audit-execution/[id]/loans    | /audit-execution/[id]/loan-review            | Wrong name               |
| (missing)                      | /audit-execution/[id]/bh-certificate         | Was not listed           |
| (missing)                      | /audit-execution/create                      | Was not listed           |

**Note:** Dynamic routes require valid IDs. Use the sample IDs table above.
Sample section codes: `PENSION`, `GENERAL_ADMINISTRATION`, `REMITTANCES`
