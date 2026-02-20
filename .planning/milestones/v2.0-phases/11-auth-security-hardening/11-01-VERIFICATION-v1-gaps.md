---
phase: 11-auth-security-hardening
verified: 2026-02-10T09:45:00Z
status: gaps_found
score: 3/4 must-haves verified
gaps:
  - truth: "Account is locked after 5 consecutive failed login attempts for that email"
    status: failed
    reason: "accountLockout plugin only implements 'before' hook (lockout enforcement), not 'after' hook (failed attempt tracking + lockout application). Plugin can check if account IS locked but cannot RECORD failures or APPLY lockouts."
    artifacts:
      - path: "src/lib/auth-lockout-plugin.ts"
        issue: "Missing 'after' hook to record failed attempts, count failures, and set lockedUntil timestamp"
    missing:
      - "after hook handler for /sign-in/email endpoint"
      - "Logic to create FailedLoginAttempt record on auth failure"
      - "Logic to count recent failures within observation window"
      - "Logic to set lockedUntil on all email records when threshold (5) exceeded"
      - "Logic to delete FailedLoginAttempt records on successful login"
  - truth: "Successful login clears failed attempt counter for that email"
    status: failed
    reason: "No after hook to handle successful login cleanup"
    artifacts:
      - path: "src/lib/auth-lockout-plugin.ts"
        issue: "Missing success handler in after hook"
    missing:
      - "deleteMany FailedLoginAttempt where email matches on successful sign-in"
  - truth: "Account auto-unlocks after 30 minutes"
    status: partial
    reason: "Lockout check logic uses timestamp comparison (lockedUntil > now), so auto-unlock WOULD work IF lockouts were applied, but since lockouts cannot be applied (no after hook), this is untestable"
    artifacts:
      - path: "src/lib/auth-lockout-plugin.ts"
        issue: "Auto-unlock logic exists (lines 69-70) but is moot without lockout application"
    missing: []
---

# Phase 11: Auth Security Hardening Verification Report

**Phase Goal:** Add rate limiting, account lockout, concurrent session limits, and explicit cookie configuration to Better Auth — closing all 4 HIGH-severity auth security gaps from Phase 5 verification.

**Verified:** 2026-02-10T09:45:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                      | Status     | Evidence                                                                                                      |
| --- | -------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | Login endpoint rejects requests after 10 attempts per IP in 15 min (429)   | ✓ VERIFIED | auth.ts line 58-61: customRules["/sign-in/email"] { window: 900, max: 10 }                                    |
| 2   | Account locked after 5 consecutive failed login attempts for that email    | ✗ FAILED   | Plugin only has 'before' hook (enforcement), no 'after' hook (tracking). Cannot record failures or apply lock |
| 3   | Locked account returns 423 status with informative error message           | ⚠️ PARTIAL | Error handling exists (lines 80-86) but unreachable without after hook to populate FailedLoginAttempt table   |
| 4   | Account auto-unlocks after 30 minutes                                      | ⚠️ PARTIAL | Timestamp check exists (line 69-70: lockedUntil > now) but untestable without lockout application             |
| 5   | Successful login clears failed attempt counter for that email              | ✗ FAILED   | No after hook to handle success case                                                                          |
| 6   | User cannot have more than 2 concurrent sessions                           | ✓ VERIFIED | auth.ts line 71-73: multiSession({ maximumSessions: 2 })                                                      |
| 7   | Session cookies have httpOnly=true, secure=true (production), sameSite=lax | ✓ VERIFIED | auth.ts line 88-92: defaultCookieAttributes correct                                                           |

**Score:** 3/7 truths verified, 2 failed, 2 partial (dependent on failed)

### Required Artifacts

| Artifact                         | Expected                                         | Status     | Details                                                                                 |
| -------------------------------- | ------------------------------------------------ | ---------- | --------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`           | FailedLoginAttempt model                         | ✓ VERIFIED | Line 828: model exists with all required fields                                         |
| `src/lib/auth-lockout-plugin.ts` | Custom lockout plugin with before AND after hook | ⚠️ PARTIAL | 101 lines, exports accountLockout, but only has before hook (line 53-92), no after hook |
| `src/lib/auth.ts`                | Hardened config with all 4 security features     | ✓ VERIFIED | 99 lines, has rateLimit, multiSession, accountLockout, defaultCookieAttributes          |
| `src/lib/auth-client.ts`         | Auth client with multiSession plugin             | ✓ VERIFIED | 72 lines, imports and registers multiSessionClient (line 15)                            |

**Score:** 3/4 artifacts verified, 1 partial

### Key Link Verification

| From                   | To                         | Via                             | Status     | Details                                                             |
| ---------------------- | -------------------------- | ------------------------------- | ---------- | ------------------------------------------------------------------- |
| auth.ts                | auth-lockout-plugin.ts     | plugin import                   | ✓ WIRED    | Line 6: import { accountLockout }                                   |
| auth-lockout-plugin.ts | prisma/schema.prisma       | FailedLoginAttempt table access | ⚠️ PARTIAL | Line 66: prisma.failedLoginAttempt.findFirst (read-only, no writes) |
| auth.ts                | better-auth/plugins        | multiSession plugin             | ✓ WIRED    | Line 3: import, line 71: multiSession({ maximumSessions: 2 })       |
| auth-client.ts         | better-auth/client/plugins | multiSessionClient plugin       | ✓ WIRED    | Line 2: import, line 15: plugins: [multiSessionClient()]            |

**Score:** 3/4 links wired, 1 partial (read-only, missing write operations)

### Requirements Coverage

No requirements explicitly mapped to Phase 11 in REQUIREMENTS.md (this is tech debt closure from Phase 5 verification).

Phase 11 addresses 4 HIGH-severity gaps from Phase 5:

1. ✓ Rate limiting — SATISFIED
2. ✗ Account lockout — BLOCKED (only enforcement, no tracking)
3. ✓ Concurrent session limits — SATISFIED
4. ✓ Cookie security — SATISFIED

**Score:** 3/4 Phase 5 gaps closed, 1 incomplete

### Anti-Patterns Found

| File                   | Line  | Pattern            | Severity   | Impact                                                                       |
| ---------------------- | ----- | ------------------ | ---------- | ---------------------------------------------------------------------------- |
| auth-lockout-plugin.ts | 93-98 | TODO comment       | 🛑 BLOCKER | "TODO (Phase 14): Implement after hook" — deferred critical security feature |
| auth-lockout-plugin.ts | 52-99 | Missing after hook | 🛑 BLOCKER | Plugin has before hook only; cannot track failures or apply lockouts         |

### Gaps Summary

**Root Cause:** The accountLockout plugin was only partially implemented. The PLAN (lines 150-157) explicitly required the plugin to implement `after` hooks for:

1. Recording failed login attempts
2. Counting recent failures
3. Applying lockout (setting lockedUntil) when threshold exceeded
4. Clearing failed attempts on successful login

**What Exists:**

- ✓ FailedLoginAttempt schema model with all required fields
- ✓ `before` hook that checks if account is CURRENTLY locked and throws error
- ✓ Rate limiting config
- ✓ Multi-session config
- ✓ Cookie security config

**What's Missing:**

- ✗ `after` hook on sign-in failure to create FailedLoginAttempt records
- ✗ Logic to count recent failures (within 15-min observation window)
- ✗ Logic to set lockedUntil timestamp when 5 failures reached
- ✗ `after` hook on sign-in success to delete FailedLoginAttempt records

**Impact:**

- **HIGH:** Account lockout cannot function end-to-end. Users who fail login 5+ times will NOT be locked out.
- The before hook can enforce existing lockouts BUT nothing can create those lockouts in the first place.
- This is like building a door lock checker without building the mechanism that turns the lock.
- Rate limiting provides SOME brute-force protection (10 attempts per 15 min per IP), but account-level lockout (5 failures per email) is non-functional.

**Phase Goal Achievement:** 75% (3 of 4 success criteria met). SC-2 (account lockout) is FAILED.

---

_Verified: 2026-02-10T09:45:00Z_  
_Verifier: Claude (gsd-verifier)_
