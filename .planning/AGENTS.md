# GSD Agent → Model + Skill Mapping for RBIAS v3.0

## Pipeline Roles

| GSD Agent                   | Primary Model | Fallback 1 | Fallback 2 | Skills                                                  | Spawns            |
| --------------------------- | ------------- | ---------- | ---------- | ------------------------------------------------------- | ----------------- |
| **Orchestrator**            | Opus 4.6      | GPT-5.2    | GLM-5      | architecture-patterns, cc-godmode                       | All agents        |
| **gsd-roadmapper**          | Opus 4.6      | GPT-5.2    | GLM-5      | architecture-patterns, idea-coach                       | Once at init      |
| **gsd-codebase-mapper**     | Sonnet 4.5    | GLM-5      | GPT-4.2    | nextjs-expert, senior-backend                           | Once + on-demand  |
| **gsd-planner**             | Opus 4.6      | GPT-5.2    | GLM-5      | architecture-patterns, nextjs-expert                    | Per phase         |
| **gsd-plan-checker**        | GPT-5.2       | GLM-5      | Opus 4.6   | test-patterns, security-audit                           | Per phase         |
| **gsd-executor:schema**     | Sonnet 4.5    | GLM-5      | GPT-4.2    | prisma, sql-toolkit, data-validation                    | Schema tasks      |
| **gsd-executor:backend**    | Sonnet 4.5    | GLM-5      | GPT-4.2    | senior-backend, nodejs-patterns, api-dev                | Server actions    |
| **gsd-executor:frontend**   | Sonnet 4.5    | GLM-5      | GPT-4.2    | nextjs-expert, ui-ux-pro-max, anthropic-frontend-design | Pages/components  |
| **gsd-executor:seed**       | Sonnet 4.5    | GLM-5      | GPT-4.2    | data-validation, sql-toolkit                            | Seed data scripts |
| **gsd-verifier**            | GPT-5.2       | GLM-5      | Opus 4.6   | test-patterns, typescript-pro, security-audit           | Per phase         |
| **gsd-debugger**            | Opus 4.6      | GPT-5.2    | GLM-5      | senior-backend, nextjs-expert                           | On failure        |
| **gsd-integration-checker** | GPT-5.2       | GLM-5      | Sonnet 4.5 | test-patterns, architecture-patterns                    | Phase boundaries  |

## Specialist GSD Agents (from `.claude/agents/`)

| Agent File                  | Use For                                        | Model                               |
| --------------------------- | ---------------------------------------------- | ----------------------------------- |
| `database-administrator.md` | Schema design, migration strategy, indexing    | Opus (planning), Sonnet (execution) |
| `nextjs-developer.md`       | App Router pages, layouts, server components   | Sonnet                              |
| `react-specialist.md`       | Complex UI components, forms, state management | Sonnet                              |
| `fintech-engineer.md`       | Banking domain logic (RAM, compliance, IRAC)   | Opus                                |
| `risk-manager.md`           | Risk assessment models, scoring algorithms     | Opus                                |
| `business-analyst.md`       | Requirement validation, domain accuracy        | GPT-5.2                             |
| `security-engineer.md`      | RBAC, RLS policies, data isolation             | GPT-5.2                             |
| `sql-pro.md`                | Complex queries, analytics views, performance  | Sonnet                              |
| `typescript-pro.md`         | Type safety, generic patterns, validation      | GPT-5.2 (verification)              |
| `documentation-engineer.md` | API docs, seed data documentation              | Sonnet                              |

## Why Different Models

1. **Opus** for reasoning-heavy roles (planning, debugging, orchestration, domain logic)
   - Sees the full picture, handles complex dependencies
   - Used sparingly — only where depth matters
   - Paired with: architecture-patterns, fintech-engineer, risk-manager agents

2. **Sonnet** for execution roles (mapping, coding, UI, seed data)
   - Fast, follows patterns well, good at bulk code generation
   - Multiple instances run in parallel for independent tasks
   - Paired with specialist skills per task type (schema/backend/frontend/seed)

3. **GPT-5.2** for all verification roles (plan-checker, verifier, integration, security)
   - Different model family = genuinely different perspective
   - Catches errors that Anthropic models share blind spots on
   - Via Codex OAuth = no per-token cost
   - Paired with: test-patterns, security-audit, typescript-pro

4. **GLM-5** as universal fallback
   - Fast, capable, different training data = third perspective
   - Via z.ai = independent provider from Anthropic + OpenAI

## Execution Pattern Per Phase (Validated Pipeline)

**Rule: NOTHING moves forward without validation from a different model.**

```
Phase Start
    │
    ├── 1. PLAN (Opus + architecture-patterns + fintech-engineer)
    │      Creates PLAN.md files (2-3 tasks, specific files, verify criteria)
    │      Uses: gsd-planner agent definition + relevant .claude/agents/
    │
    ├── 2. VALIDATE PLAN ✋ (GPT-5.2 + test-patterns + security-audit)
    │      Goal-backward: will these plans achieve phase success criteria?
    │      Checks: requirement coverage, RBAC, dependency wiring, context budget
    │      ❌ Fails → back to step 1 with feedback (max 2 revision rounds)
    │      ✅ Passes → proceed to execution
    │
    ├── 3. EXECUTE (Sonnet × N parallel, each with specialist skills)
    │      executor:schema → prisma, sql-toolkit, data-validation
    │      executor:backend → senior-backend, nodejs-patterns, api-dev
    │      executor:frontend → nextjs-expert, ui-ux-pro-max
    │      executor:seed → data-validation, sql-toolkit
    │      Atomic commit per task. SUMMARY.md per plan.
    │
    ├── 4. VERIFY ✋ (GPT-5.2 + typescript-pro + test-patterns)
    │      Goal-backward: does the CODE achieve what the plan promised?
    │      Runs: typecheck, reviews files, tests edge cases
    │      ❌ Gaps → gsd-debugger (Opus) fixes, then re-verify
    │      ✅ Passes → proceed to integration check
    │
    ├── 5. INTEGRATION CHECK ✋ (GPT-5.2 + architecture-patterns)
    │      Cross-plan wiring: do components connect correctly?
    │      Checks: imports, data flow, RBAC consistency, tenant isolation
    │      ❌ Fails → targeted fix + re-check
    │      ✅ Passes → phase complete
    │
    └── 6. PHASE COMPLETE
           Update STATE.md, re-map codebase if significant changes
           Commit + push. Ready for next phase.
```

### Validation Rules

- Plans validated by **different model family** than planner (Opus plans → GPT-5.2 checks)
- Code verified by **different model family** than executor (Sonnet writes → GPT-5.2 verifies)
- Max **2 revision rounds** per gate before escalating to orchestrator
- Integration check at **every phase boundary** — no exceptions
- **No code merges to main without passing verification gate**

## Fallback Strategy

| Scenario              | Action                                                               |
| --------------------- | -------------------------------------------------------------------- |
| Sonnet fails/timeout  | → GLM-5 (z.ai, fast, good code gen) → GPT-4.2                        |
| Opus fails/timeout    | → GPT-5.2 (Codex OAuth) → GLM-5                                      |
| GPT-5.2 fails/timeout | → GLM-5 (different perspective) → Opus (same family ok for fallback) |
| All providers down    | → Queue task, retry on next heartbeat                                |

**Provider diversity ensures resilience:**

- Anthropic: Opus 4.6, Sonnet 4.5
- OpenAI Codex: GPT-5.2, GPT-4.2
- Z.AI: GLM-5

Three independent providers = at least one always available.

## Context Management

- Each sub-agent gets **targeted context only** (specific files, not full codebase)
- Plans reference files with `@path/to/file` syntax
- Codebase docs (STACK.md, CONVENTIONS.md) provide patterns without full code
- Fresh context per agent = no accumulated rot
- Max 50% context budget per plan execution

## Lessons Learned (RBIAS Build — 2026-02-18)

### Executor Prompt Template (Required Footer)

Every executor sub-agent MUST receive this conventions block:

```
CONVENTIONS:
- Icons: import from `@/lib/icons` (Pencil not Edit, CheckCircle, AlertTriangle)
- Forms: `zodResolver(Schema as any)` for Zod v4 compatibility
- DB: `prismaForTenant(tenantId)` from `@/data-access/prisma`, NEVER raw prisma
- Session: `getRequiredSession()` from `@/data-access/session`
- Permissions: check `src/lib/permissions.ts` for valid Permission values
- Fields: READ `prisma/schema.prisma` for actual field names before writing queries
- UI: check `src/components/ui/` for available components before importing
- Dates: AuditEngagement uses scheduledStartDate/completionDate, NOT startDate/endDate
- Periods: use periodFrom/periodTo, NOT periodStart/periodEnd
```

### Model Selection Rules (Validated)

| Role      | Model                 | Why                                                  |
| --------- | --------------------- | ---------------------------------------------------- |
| Planner   | Opus                  | Deep reasoning, sees dependencies                    |
| Executor  | **Sonnet** (NOT Opus) | Opus fails within ~1min on file-heavy executor tasks |
| Validator | GPT-5.2               | Different model family catches blind spots           |
| Security  | GLM-5                 | Third perspective on tenant isolation                |

### Batch Execution Rules

- **maxChildrenPerAgent = 6** (not 8 — hard limit)
- Fill slots as agents complete, don't wait for full batch
- Main agent handles ALL cross-agent TS fixes after each wave
- Never restart gateway while sub-agents have active exec sessions

### Validation Discipline (NON-NEGOTIABLE)

1. Wave executes → sub-agents write code
2. Main agent runs `tsc --noEmit` → fixes cross-agent conflicts
3. **Spawn per-phase GPT-5.2 validator** → wait for results
4. Fix validator findings
5. THEN commit + push
6. ❌ NEVER: commit → then validate → then fix in next commit

### Common Cross-Agent TS Errors (Fix Checklist)

- [ ] Missing Permission type values → add to `src/lib/permissions.ts`
- [ ] Missing icon exports → add alias to `src/lib/icons.ts`
- [ ] Missing UI components → create in `src/components/ui/`
- [ ] `asChild` prop → component needs Radix-style `asChild` support
- [ ] Prisma `include` vs `select` mixing → use one or the other
- [ ] Global `prisma` usage → replace with `prismaForTenant`
- [ ] EscalationLevel type cast → `as ComplianceItemForEscalation["escalationLevel"]`

### What Went Wrong This Build

1. **Deferred validation** — Committed 2 waves without validation. Naveen called it out.
2. **Wrong field names in plans** — Plans copied SDD field names, not actual Prisma fields.
3. **Opus as executor** — Failed 3 times, wasted slots. Should've used Sonnet from start.
4. **Gateway restart mid-wave** — Killed 6 running agents. Had to redo verification.
5. **Mock data shipped** — 8+ pages had `any[] = []`. Root cause: rushed initial implementation.
6. **Global prisma leaks** — Some DAL/action files use raw prisma. Security vulnerability.

### What Went Right

1. **Parallel sub-agents** — 6 agents × 3 waves = 21 plans executed, 31K+ lines in ~45 min wall time.
2. **Cross-agent TS fix pattern** — Main agent consolidating fixes after each wave works well.
3. **Separate validator model** — GPT-5.2 catches things Sonnet/Opus miss.
4. **Schema-first approach** — 63 models built before any logic = clean parallel execution.
5. **Fresh context per agent** — No context rot, each agent reads only what it needs.
