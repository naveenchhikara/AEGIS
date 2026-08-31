# AEGIS documentation

## Start here

| Document | What it is |
|---|---|
| [`architecture.md`](architecture.md) | How the system is put together and the invariants that hold it together — layering, tenant isolation, audit attribution, authorization, the pure engines, jobs. Hand-written; read it before changing code. |

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
| [`reference/data-flows.md`](reference/data-flows.md) | Which processes read and write which tables, plus the observation lifecycle and audited write path as diagrams. |

## Operations

| Document | What it is |
|---|---|
| [`SEED-PROCESS-MANUAL.md`](SEED-PROCESS-MANUAL.md) | Loading demonstration data and its failure modes. |
| [`ops/runbook.md`](ops/runbook.md) | Day-to-day operations. |
| [`ops/release-checklist.md`](ops/release-checklist.md) | Pre-release checks. |
| [`ops/repository-hygiene.md`](ops/repository-hygiene.md) | Repository conventions. |
| [`agents/`](agents/) | Issue tracking, triage labels and domain-doc conventions. |

## Elsewhere in the repository

- `CLAUDE.md` — how the project is built and deployed; the environment contract and known traps.
- `src/data-access/README.md` — the tenant-scoped query pattern, in detail.
- `CONTEXT.md` — glossary of domain terms.
- `SECURITY-AUDIT.md` — security review, including items marked unverified.
- `tests/TEST-PLAN.md` — manual verification script.
