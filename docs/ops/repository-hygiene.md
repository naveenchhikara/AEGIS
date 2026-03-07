# Repository Hygiene

AEGIS production baselines are preserved outside the repo so the shipping tree stays small and reproducible.

## What Stays In Git

- Application source, configs, migrations, scripts, and CI workflows
- Durable product and operations documentation
- Deployment automation that is required to rebuild or recover production

## What Moves To Archive

- Planning scratchpads and execution logs
- Marketing collateral, pitch decks, and one-off sales material
- Extracted research dumps, office exports, and temporary report files
- Local assistant caches, worktrees, and generated browser/test artifacts

## Archive Locations

- VPS production freeze: `/Users/admin/Developer/_archive/VPS/modernization-baseline-20260307`
- AEGIS repo cleanup archive: `/Users/admin/Developer/_archive/AEGIS/repo-cleanup-20260307`
- AEGIS local drift snapshot: `/Users/admin/Developer/_archive/AEGIS/local-drift-2026-03-07-baseline`

## Working Rules

- Deploy only from tagged git commits after green CI
- Keep production secrets in `/opt/aegis/shared/.env.production`, never in git
- Do not copy developer workspaces to the VPS
- If a file is not required to rebuild, run, or recover production, archive it instead of keeping it in the repo
