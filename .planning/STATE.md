# RBIAS v3.0 — Project State

## Current Position
- **Phase:** 1 (Core Audit Domain)
- **Status:** PLANNING (codebase mapping + plan creation)
- **Last Updated:** 2026-02-18T01:30:00+05:30

## Project Context
- Expanding AEGIS v2.0 (live at aegis.nexlyadvisory.com) into RBIAS v3.0
- Stack: Next.js 16 + PostgreSQL + Prisma 7 + Better Auth + S3/SES
- SDD specifies React+Express — we stay on AEGIS stack (Next.js)
- 6 reference documents converted (37K+ lines total)
- GPT-5.2 plan review completed — 5 blockers identified and addressed

## Accumulated Decisions
1. **Stick with AEGIS stack** — Next.js App Router, not SDD's React+Express
2. **Defer Wave 5 (M10+M11)** — continuous auditing + AI analytics
3. **Defer M16 IRAC** — complex computation engine
4. **Incremental roles** — add roles per phase, not all 11 upfront
5. **RAM config vs scores split** — separate tables (per review)
6. **AuditSection = Excel tabs, ExaminationArea = value statements** — two concepts (per review)
7. **Evidence model generalized** — attachable to observations AND examination items
8. **ComplianceItem separate from ComplianceRequirement** — different lifecycle concepts (per review)
9. **Zone model required** — needed for ZAC compliance workflow
10. **GSD workflow** — use GSD agent pipeline with multi-model execution
11. **Model assignments** — Opus (planning/debug), Sonnet (execution), GPT-5.2 (verification)

## Blockers
- None currently

## Reference Documents
| Doc | Path | Lines |
|-----|------|-------|
| SDD | RBIAS-SDD.md | 7,193 |
| RBIA Policy | RBIA-POLICY-2020.md | 9,567 |
| CA Policy | CONCURRENT-AUDIT-POLICY-2020.md | 2,538 |
| IS Policy | IS-AUDIT-POLICY-2020.md | 4,484 |
| IA Format | IA-FORMAT-RBG.md | 5,255 |
| CRM Values | RFIA-CRM-VALUE-STATEMENTS.md | 3,617 |
| Audit Handbook | BANK-BRANCH-AUDIT-HANDBOOK-2025.md | 4,310 |

## Phase Progress
| Phase | Status | Plans | Executed | Verified |
|-------|--------|-------|----------|----------|
| 1 | Planning | 0/? | 0/? | No |
| 2 | Not started | - | - | - |
| 3 | Not started | - | - | - |
| 4 | Not started | - | - | - |
| 6 | Not started | - | - | - |
