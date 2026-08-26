# AEGIS remediation tasks (frozen reference)

Source: security hygiene backlog items tracked outside wayfinder.

- [x] Guard `prisma/seed.ts` against production (`NODE_ENV`/database-name checks with explicit override)
- [x] Run git history secret scan
- [x] Remove auth-secret fallback and harden environment handling
- [x] Guard unguarded server action and improve cron logging hygiene
- [x] Cosmetic repository hygiene (baked-in URLs and leaked IP addresses)

Notes:
- This document is intentionally committed as a static reference.
- The checklist above is preserved from the original backlog wording; the
  linked issue implementation tracks completion status.
- Tenant purge runbook work remains out of scope for this backlog file.
