# Specialized Flows

> Configured: 2026-02-21
> Project: AEGIS — UCB Internal Audit & Compliance Platform

## Project-Level Dependencies

| Work Type              | Skill/Command          | Priority | When Required                         |
| ---------------------- | ---------------------- | -------- | ------------------------------------- |
| Page/API routes        | /nextjs-developer      | required | New pages, API endpoints, SSR changes |
| Type system changes    | /typescript-pro        | optional | Complex generics, type utilities      |
| Database changes       | /postgres-pro          | required | Schema changes, query optimization    |
| E2E test creation      | /playwright-expert     | required | New user flows, auth changes          |
| Test strategy          | /test-master           | required | New modules, refactors                |
| Security changes       | /security-reviewer     | required | Auth, permissions, API endpoints      |
| CI/CD & deployment     | /devops-engineer       | required | Pipeline changes, Docker config       |
| Observability          | /monitoring-expert     | optional | Logging, metrics, alerting            |
| UI/UX design           | /ui-ux-pro-max         | optional | New UI components, redesigns          |
| Architecture decisions | /architecture-designer | optional | Cross-cutting changes, new modules    |

## Phase Overrides

| Phase                          | Additional Skills  | Priority | Notes                                               |
| ------------------------------ | ------------------ | -------- | --------------------------------------------------- |
| 4 (Monitoring & Observability) | /monitoring-expert | required | Core phase focus — error tracking, uptime, alerting |
| 5 (Performance Baseline)       | /postgres-pro      | required | Query optimization, load testing, caching strategy  |

## Templates & Assets

| Asset Type               | Location                                               | When Used                                               |
| ------------------------ | ------------------------------------------------------ | ------------------------------------------------------- |
| RBIA Policy Document     | `RBIA-POLICY-2020.md`                                  | Regulatory compliance validation, audit workflow design |
| Software Design Document | `Project Doc/AEGIS_FINAL Software_Design_Document.pdf` | Architecture reference, requirement traceability        |
| UCB Guidelines (RBI)     | `UCB Guidelines by RBI.pdf`                            | Regulatory compliance checks, domain validation         |
| Prisma Schema            | `prisma/schema.prisma`                                 | Database changes, model relationships, enum definitions |
| Architecture Map         | `.planning/codebase/ARCHITECTURE.md`                   | System design decisions, cross-cutting changes          |
| Codebase Structure       | `.planning/codebase/STRUCTURE.md`                      | File organization, module discovery                     |

---

_SPECIAL-FLOWS.md — Updated when skills or requirements change_
_Last updated: 2026-02-21_
