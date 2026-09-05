# AEGIS Documentation

## Authoritative Sources

**For development, deployment, and operations, start with [`../CLAUDE.md`](../CLAUDE.md).** It is the single source of truth for:

- Deployment status (there is none) and the merge-to-main integration model
- Environment contract and secrets management
- Code style, patterns, and gotchas
- Tenant isolation and audit attribution

---

## Start here

| Document                             | What it is                                                                                                                                                                                                                             |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`../CLAUDE.md`](../CLAUDE.md)       | **Primary reference** — deployment status, environment, code patterns, operations.                                                                                                                                                     |
| [`architecture.md`](architecture.md) | How the system is put together and the invariants that hold it together — layering, audit lifecycle data flow, tenant isolation, audit attribution, authorization, the pure engines, jobs. Hand-written; read it before changing code. |

## Specification

| Document                                                     | What it is                                                                                                                                                                                           |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`requirements/SRS.md`](requirements/SRS.md)                 | Software requirements specification. **Reverse-engineered from the shipped code** — the original requirement register is not in this repository. Records known gaps alongside implemented behaviour. |
| [`claims-vs-implementation.md`](claims-vs-implementation.md) | Independent check of external claims against the codebase. Read before writing anything customer-facing.                                                                                             |

## Reference — generated, never hand-edited

Produced by `scripts/generate-reference-docs.mjs` from `prisma/schema.prisma` and
the `src/` tree. Regenerate with `pnpm docs:reference`; `pnpm docs:check` fails if
they have drifted.

| Document                                                       | What it is                                                                                                                                 |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| [`reference/data-dictionary.md`](reference/data-dictionary.md) | All 76 tables and 22 enumerations: columns, types, keys, defaults, tenant scoping.                                                         |
| [`reference/routes.md`](reference/routes.md)                   | All 65 pages and 11 HTTP endpoints.                                                                                                        |
| [`reference/api-reference.md`](reference/api-reference.md)     | HTTP endpoints and the server-action surface, with the tables each module touches.                                                         |
| [`reference/data-flows.md`](reference/data-flows.md)           | Which processes read and write which tables, a domain→hub access graph, plus the observation lifecycle and audited write path as diagrams. |

## Operations

| Document                                                 | What it is                                                                                                                              |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| [`ops/runbook.md`](ops/runbook.md)                       | **Day-to-day operations** — local setup, health check, applying SQL, and what restoring a deployment would take. AEGIS is not deployed. |
| [`ops/release-checklist.md`](ops/release-checklist.md)   | **Pre-merge checks** — the merge-to-main model (no tags, no release) and the hand-applied SQL sequence.                                 |
| [`ops/repository-hygiene.md`](ops/repository-hygiene.md) | What belongs in the repository and what does not.                                                                                       |
| [`SEED-PROCESS-MANUAL.md`](SEED-PROCESS-MANUAL.md)       | Loading demonstration data and its failure modes.                                                                                       |
| [`agents/`](agents/)                                     | Issue tracking, triage labels, domain-doc conventions.                                                                                  |

## Elsewhere in the Repository

- [`../CLAUDE.md`](../CLAUDE.md) — **PRIMARY REFERENCE** — deployment status, environment contract, code patterns, known traps. Start here for any deployment or operations question.
- [`../AGENTS.md`](../AGENTS.md) — Quick reference for commands and code style (see CLAUDE.md for authoritative details).
- [`../CONTEXT.md`](../CONTEXT.md) — Glossary of RBI/audit domain terms.
- `src/data-access/README.md` — Tenant-scoped query patterns, in detail.
- `tests/TEST-PLAN.md` — manual verification script.

> Removed on 2026-09-05: `SECURITY-AUDIT.md` (a February 2026 review of a hosted
> environment that no longer exists), `PROJECT-STATUS.md`, `deploy/` and `infra/`.
> Git history retains them.
