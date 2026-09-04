# AEGIS Documentation

## Authoritative Sources

**For development, deployment, and operations, start with [`../CLAUDE.md`](../CLAUDE.md).** It is the single source of truth for:
- Production deployment (Coolify, merge-to-main, VPS config)
- Environment contract and secrets management
- Code style, patterns, and gotchas
- Tenant isolation and audit attribution

---

## Start here

| Document | What it is |
|---|---|
| [`../CLAUDE.md`](../CLAUDE.md) | **Production guide** — deployment, environment, code patterns, operations (primary reference). |
| [`architecture.md`](architecture.md) | How the system is put together and the invariants that hold it together — layering, audit lifecycle data flow, tenant isolation, audit attribution, authorization, the pure engines, jobs. Hand-written; read it before changing code. |

## Specification

| Document | What it is |
|---|---|
| [`requirements/SRS.md`](requirements/SRS.md) | Software requirements specification. **Reverse-engineered from the shipped code** — the original requirement register is not in this repository. Records known gaps alongside implemented behaviour. |
| [`claims-vs-implementation.md`](claims-vs-implementation.md) | Independent check of external claims against the codebase. Read before writing anything customer-facing. |

## Reference — generated, never hand-edited

Produced by `scripts/generate-reference-docs.mjs` from `prisma/schema.prisma` and
the `src/` tree. Regenerate with `pnpm docs:reference`; `pnpm docs:check` fails if
they have drifted.

| Document | What it is |
|---|---|
| [`reference/data-dictionary.md`](reference/data-dictionary.md) | All 75 tables and 21 enumerations: columns, types, keys, defaults, tenant scoping. |
| [`reference/routes.md`](reference/routes.md) | All 65 pages and 12 HTTP endpoints. |
| [`reference/api-reference.md`](reference/api-reference.md) | HTTP endpoints and the server-action surface, with the tables each module touches. |
| [`reference/data-flows.md`](reference/data-flows.md) | Which processes read and write which tables, a domain→hub access graph, plus the observation lifecycle and audited write path as diagrams. |

## Operations

| Document | What it is |
|---|---|
| [`ops/runbook.md`](ops/runbook.md) | **Day-to-day operations** — Coolify health checks, VPS access, deployment, rollback, container inspection. Refers to [`CLAUDE.md`](../CLAUDE.md#operational-commands) for full procedures. |
| [`ops/release-checklist.md`](ops/release-checklist.md) | **Pre-release checks** — Merge-to-main model (no tags); SQL migrations; deployment verification. |
| [`ops/repository-hygiene.md`](ops/repository-hygiene.md) | Repository conventions and cleanup. |
| [`SEED-PROCESS-MANUAL.md`](SEED-PROCESS-MANUAL.md) | Loading demonstration data and its failure modes. |
| [`agents/`](agents/) | Issue tracking, triage labels, domain-doc conventions. |

## Elsewhere in the Repository

- [`../CLAUDE.md`](../CLAUDE.md) — **PRIMARY REFERENCE** — deployment, environment contract, code patterns, known traps. Start here for any production or deployment question.
- [`../AGENTS.md`](../AGENTS.md) — Quick reference for commands and code style (see CLAUDE.md for authoritative details).
- [`../CONTEXT.md`](../CONTEXT.md) — Glossary of RBI/audit domain terms.
- [`../SECURITY-AUDIT.md`](../SECURITY-AUDIT.md) — Security review and verified/unverified items.
- `src/data-access/README.md` — Tenant-scoped query patterns, in detail.
- `deploy/README.md` — **⚠️ LEGACY** — old tag-driven deployment (do not use; see CLAUDE.md instead).
- `tests/TEST-PLAN.md` — manual verification script.
