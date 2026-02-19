---
phase: final
plan: 1
type: standard
wave: 1
depends_on: []
files_modified:
  - src/actions/auditee.ts
autonomous: true
must_haves:
  truths:
    - "auditee.ts has zero TypeScript errors"
    - "evidence.observation nullable access is properly guarded"
  artifacts:
    - path: "src/actions/auditee.ts"
      provides: "Fixed nullable observation access on evidence"
---

## Objective

Fix the 2 pre-existing TypeScript errors in `src/actions/auditee.ts` where `evidence.observation` is possibly null. These are the only remaining TS errors in the codebase.

## Context

@AEGIS/src/actions/auditee.ts — lines 487, 489
Error: `TS18047: 'evidence.observation' is possibly 'null'`
The code already uses optional chaining on line 487 (`evidence.observation?.branchId`) but line 489 accesses `evidence.observation.branchId` without the guard.

## Tasks

<task type="auto">
  <name>Task 1: Fix nullable evidence.observation access</name>
  <files>src/actions/auditee.ts</files>
  <action>
  Line 489 uses `evidence.observation.branchId` inside a block that already checked `evidence.observation?.branchId` on line 487. The issue is TypeScript doesn't narrow through the `&&` with optional chaining.

**Fix:** Add explicit null check before accessing:

```typescript
// Replace lines 487-491:
if (userRoles.includes("AUDITEE") && evidence.observation?.branchId) {
  const branchIds = await getUserBranches(session);
  const obsBranchId = evidence.observation.branchId;
  if (obsBranchId && !branchIds.includes(obsBranchId)) {
    return { success: false as const, error: "Evidence not found." };
  }
}
```

This stores the branchId in a local variable after the optional chain narrows, giving TypeScript proper type narrowing.
</action>
<verify>

```bash
cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit 2>&1 | grep -c "error TS"
```

Must output `0`.
</verify>
<done>

- `pnpm exec tsc --noEmit` produces zero errors
- evidence.observation access is properly null-guarded
- No behavioral change — same logic, just type-safe
  </done>
  </task>

## Success Criteria

1. `pnpm exec tsc --noEmit` exits with 0 errors (was 2)
2. No functional regression in auditee evidence download
