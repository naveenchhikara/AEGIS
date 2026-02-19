---
phase: 17-critical-security-quality
plan: "02"
subsystem: ui
tags: [xss, security, zod, validation, governance, policy]

# Dependency graph
requires: []
provides:
  - documentUrl protocol validation at server-action level (Zod)
  - documentUrl protocol validation at client form level (Zod + type="url")
  - render-side guard preventing stored XSS from existing bad DB data
affects:
  - any future governance/policy feature that renders documentUrl

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Defense-in-depth XSS: server-side Zod, client-side Zod, render-guard triple layer"
    - "Protocol allowlist: /^https?:\/\//i regex blocks javascript:, data:, vbscript:"

key-files:
  created: []
  modified:
    - src/actions/governance/manage-policy.ts
    - src/components/governance/policy-table.tsx

key-decisions:
  - "Used .url().refine() chaining rather than just .refine() alone — .url() validates URL structure first, .refine() enforces protocol allowlist"
  - "Added .or(z.literal('')) to allow clearing the field without triggering validation error"
  - "Render guard uses regex test rather than URL parsing — simpler and covers all edge cases for the XSS vector"

patterns-established:
  - "Defense-in-depth: validate at server action + client form + render layer for URL fields"

requirements-completed: []

# Metrics
duration: 2min
completed: 2026-02-19
---

# Phase 17 Plan 02: Stored XSS Fix — documentUrl Protocol Validation Summary

**Three-layer XSS fix: Zod protocol validation on server and client, plus render-side guard blocking javascript:/data:/vbscript: in policy documentUrl links**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-19T16:52:53Z
- **Completed:** 2026-02-19T16:54:41Z
- **Tasks:** 4 (2.1, 2.2, 2.3, 2.4 — 2.1-2.3 committed together, 2.4 verified)
- **Files modified:** 2

## Accomplishments

- Server action `ManagePolicySchema` now rejects `javascript:`, `data:`, `vbscript:`, `blob:` and any non-http/https protocol via `.url().refine()` chain with `.or(z.literal(""))` to allow field clearing
- Client `policySchema` has identical validation plus `type="url"` on the Input for browser-native enforcement and inline error display
- Render guard in `policy-table.tsx` applies `/^https?:\/\//i` check before rendering `<a href>` — prevents existing bad DB records from producing clickable XSS links

## Task Commits

Each task was committed atomically:

1. **Tasks 2.1–2.3: Server validation + client validation + render guard** - `9689632` (fix)
2. **Task 2.4: TypeScript verification** - verified inline (no errors in modified files)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/actions/governance/manage-policy.ts` - `documentUrl` Zod field updated from bare `z.string().optional()` to `z.string().url().refine(https?://).optional().or(z.literal(""))`
- `src/components/governance/policy-table.tsx` - `policySchema` updated identically; `<Input>` gained `type="url"` and error display; render guard added to `<a href>` link

## Decisions Made

- Used `.url().refine()` chain: `.url()` validates URL structure first, `.refine()` enforces protocol allowlist — double validation for robustness
- Used `.or(z.literal(""))` to allow field clearing (empty string passes as "no URL set") without requiring special undefined handling
- Render guard uses simple regex rather than URL object parsing — avoids potential edge-case parsing differences across environments

## Deviations from Plan

None — plan executed exactly as written. Added inline error display for `documentUrl` field (minor enhancement consistent with existing pattern in the form for `name` field error display).

## Issues Encountered

- Pre-existing TypeScript errors in `src/data-access/session.ts` and `src/lib/auth.ts` from missing generated Prisma client (`@/generated/prisma`) — unrelated to this fix, confirmed no errors in modified files.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- XSS vector for `documentUrl` fully closed at all three layers
- Pattern is reusable: any future URL fields should apply the same `.url().refine(https?://).optional().or(z.literal(""))` chain
- No blockers for subsequent plans

---

_Phase: 17-critical-security-quality_
_Completed: 2026-02-19_

## Self-Check: PASSED
