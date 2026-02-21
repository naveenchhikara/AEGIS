# AEGIS - UCB Internal Audit & Compliance Platform

## Description

A multi-tenant SaaS platform for Urban Cooperative Banks (UCBs) in India to manage the full internal audit lifecycle — from risk assessment and audit planning through execution, reporting, compliance tracking, and board governance — in compliance with RBI regulations. Auditors conduct branch/unit/process audits and record observations that flow through a structured 7-state lifecycle (Draft → Submitted → Reviewed → Issued → Response → Compliance → Closed), automatically aggregating into macro-level views for management and the board.

## Core Value

**Individual audit observations flow upward through a structured lifecycle to form the complete risk and compliance picture — from a single branch finding to the board report.**

## Current State

| Attribute    | Value                   |
| ------------ | ----------------------- |
| Version      | v4.0 Platform Hardening |
| Status       | Production (hardened)   |
| Last Updated | 2026-02-21              |

**Production URLs:**

- https://aegis.nexlyadvisory.com — Live platform

## Requirements

### Validated (Shipped)

- [x] v1.0 — Clickable prototype: 7 screens, multi-language (EN/HI/MR/GU), demo data (2026-02-08)
- [x] v2.0 — Working MVP: PostgreSQL, Better Auth, multi-tenancy, 7-state observation lifecycle, S3 evidence, email notifications, PDF/XLSX reports, 5 role-based dashboards, onboarding wizard (2026-02-10)
- [x] v3.0 — Full RBIAS platform: all 104 RBI requirements across 18 modules, production hardening (IDOR, XSS, typed sessions, N+1), CI/CD, Docker deployment (2026-02-21)
- [x] v4.0 — Platform hardening: automated backups, security headers, Docker hardening, test suite (108 unit + E2E), Sentry error tracking, health monitoring, performance baseline (2026-02-21)

### Active (In Progress)

- [ ] To be defined during next milestone planning

### Planned (Next)

- [ ] Pilot deployment with real UCBs
- [ ] User acceptance testing with actual bank staff
- [ ] Iterative improvements based on pilot feedback

### Out of Scope

- TOTP/MFA — Deferred to pre-Pilot B
- CBS integration (Finacle/Flexcube) — Requires vendor cooperation
- DAKSH API integration — Manual export for now
- Real-time continuous monitoring — Batch-based for now
- Mobile app — Web-first responsive design
- On-premise deployment — SaaS-only
- Load testing — Deferred, not needed for pilot scale (< 50 users)

## Target Users

**Primary:** Internal Audit departments of Tier III/IV Urban Cooperative Banks

- Limited IT resources and budget
- Cannot afford enterprise audit software (Rs 50L+/year)
- Need RBI RBIA compliance without spreadsheet chaos
- Staff comfortable in regional languages (Hindi, Marathi, Gujarati)

**Secondary:** RBI supervisory teams (via formatted DAKSH exports)

## Context

**Business Context:**
RBI circular RBI/2023-24/117 mandates UCBs implement compliance monitoring technology. Deadline passed — urgency for UCBs to adopt. Competition (TeamMate, AuditBoard) too expensive and complex. Our moat is domain expertise + affordable pricing (Rs 3-4 Lakh/year vs Rs 50L+).

**Technical Context:**
Next.js 16 + TypeScript + PostgreSQL 16 + Prisma 7 stack. 248K LOC across 563 files. Deployed on VPS with Docker + Nginx. AI-assisted development (Claude Code) enables 2-3 person team to build enterprise-grade platform.

**Pilot Strategy:** Pilot A (sandbox, free) → Pilot B (real data, LOI + Rs 50K deposit) → Paid subscription

## Constraints

### Technical Constraints

- Next.js 16, TypeScript, shadcn/ui, Tailwind CSS v4, PostgreSQL, Better Auth, Prisma — stack locked
- Data must remain in India (AWS Mumbai region ap-south-1)
- Server body size limit 5MB (Next.js config)

### Business Constraints

- Self-funded; target Rs 4,000-6,000/month infrastructure during MVP phase
- Team: 2-3 people part-time with AI-assisted development
- Must demonstrate value before pilot banks commit real data

### Compliance Constraints

- RBI data localization (all data in India)
- RBI RBIA policy compliance (104 requirements implemented)
- Security baseline: rate limiting, account lockout, session limits, IDOR protection, CSP, HSTS

## Key Decisions

| Decision                           | Rationale                                                       | Date       | Status |
| ---------------------------------- | --------------------------------------------------------------- | ---------- | ------ |
| SaaS multi-tenant architecture     | Single codebase, zero client IT dependency                      | 2026-02-07 | Active |
| AI-assisted development            | Budget constraint; domain expertise is differentiator           | 2026-02-07 | Active |
| Application-level tenant isolation | WHERE clauses via prismaForTenant — simpler than PostgreSQL RLS | 2026-02-20 | Active |
| VPS + Docker deployment            | Simpler than AWS for single-tenant pilot phase                  | 2026-02-21 | Active |
| Defense-in-depth URL validation    | Server Zod + client Zod + render guard for XSS prevention       | 2026-02-20 | Active |
| Sentry for error tracking          | Industry standard, free tier sufficient for pilot               | 2026-02-21 | Active |
| Optional external services pattern | S3/SES/Sentry degrade gracefully when unconfigured              | 2026-02-21 | Active |

## Success Metrics

| Metric                  | Target            | Current           | Status      |
| ----------------------- | ----------------- | ----------------- | ----------- |
| RBIAS requirements      | 104/104           | 104/104           | Achieved    |
| Production deployment   | Live              | Live              | Achieved    |
| Platform hardening      | 5 phases          | 5/5 complete      | Achieved    |
| Unit test coverage      | Core modules      | 108 tests passing | Achieved    |
| Pilot UCB onboarded     | 1 bank            | 0                 | Not started |
| User acceptance testing | Pass              | Not started       | Not started |
| SES email delivery      | Production access | Sandbox only      | At risk     |

## Tech Stack

| Layer      | Technology                             | Notes                            |
| ---------- | -------------------------------------- | -------------------------------- |
| Framework  | Next.js 16 (App Router)                | Turbopack dev server             |
| Frontend   | shadcn/ui + Radix UI + Tailwind CSS v4 | new-york style variant           |
| Language   | TypeScript 5.9                         | Strict mode                      |
| Database   | PostgreSQL 16 + Prisma 7               | 63 models, 16 enums              |
| Auth       | Better Auth                            | bcrypt, RBAC, 17 roles           |
| i18n       | next-intl                              | EN/HI/MR/GU                      |
| Storage    | AWS S3 (ap-south-1)                    | Evidence upload                  |
| Email      | AWS SES                                | Sandbox mode                     |
| Reports    | React-PDF + ExcelJS                    | PDF + XLSX                       |
| Jobs       | pg-boss                                | Background processing            |
| Monitoring | Sentry + pino                          | Error tracking + structured logs |
| Testing    | Playwright + Vitest                    | E2E + unit (108 tests)           |

## Links

| Resource   | URL                             |
| ---------- | ------------------------------- |
| Repository | GitHub (private)                |
| Production | https://aegis.nexlyadvisory.com |
| VPS        | 145.223.19.8                    |

## Specialized Flows

See: .paul/SPECIAL-FLOWS.md

Quick Reference:

- /nextjs-developer → Page/API routes (required)
- /postgres-pro → Database changes (required)
- /playwright-expert → E2E test creation (required)
- /test-master → Test strategy (required)
- /security-reviewer → Security changes (required)
- /devops-engineer → CI/CD & deployment (required)
- /monitoring-expert → Observability (optional, required in Phase 4)
- /ui-ux-pro-max → UI/UX design (optional)
- /typescript-pro → Type system changes (optional)
- /architecture-designer → Architecture decisions (optional)

---

_PROJECT.md — Updated when requirements or context change_
_Last updated: 2026-02-21 after v4.0 Platform Hardening_
