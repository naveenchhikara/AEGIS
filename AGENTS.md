# AGENTS.md - AEGIS Platform Development Guide

**Last Updated:** September 4, 2026  
**⚠️ Status:** Simplified reference. **For authoritative guidance, see [`CLAUDE.md`](CLAUDE.md).**

Guidelines for agentic coding agents working on the AEGIS UCB audit and
compliance platform. This document highlights key commands and quick references;
full patterns, deployment procedures, and ops details live in CLAUDE.md.

---

## Commands

### Development

```bash
pnpm dev              # Start dev server (http://localhost:3000)
pnpm build            # Production build
pnpm start            # Start production server
```

### Code Quality

```bash
pnpm lint             # Run ESLint
prettier --write .    # Format files
```

### Database

```bash
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Sync schema to local database
pnpm db:migrate       # Create/apply local Prisma migration
pnpm db:seed          # Seed database via prisma/seed.ts
pnpm db:studio        # Open Prisma Studio
```

### Testing

```bash
pnpm test:unit        # Run Vitest unit tests
pnpm test:coverage    # Run unit tests with coverage
pnpm test:e2e         # Run Playwright E2E tests
pnpm test:e2e:ui      # Run Playwright with UI
```

### Seed Utilities

```bash
pnpm seed:master-directions # Seed RBI master directions dataset
pnpm seed:exam-questions    # Seed exam question bank
pnpm seed:lifecycle         # Seed full audit lifecycle demo data
```

### Build Utilities

```bash
pnpm build:analyze    # Build with webpack bundle analysis
```

---

## Code Style Guidelines

⚠️ **See [`CLAUDE.md`](CLAUDE.md#code-style) for the complete style guide.**

This file intentionally duplicates core principles; refer to CLAUDE.md for the authoritative version, including tenant-scoping rules, audited-mutation patterns, and edge-case gotchas.

### Quick Reference

- Use `@/*` path aliases
- Import icons from `@/lib/icons`
- Prefer server components
- Use `cn()` for Tailwind classes
- Semicolons enabled, double quotes
- Route audited writes through `withAuditedMutation()`

See CLAUDE.md § "Code Style" and "Gotchas" for full detail.

---

## File Organization

```text
src/
├── actions/          # Server actions by domain
├── app/              # App Router pages, layouts, and API routes
├── components/       # UI primitives and feature components
├── data/             # RBI reference data and seed assets
├── data-access/      # Tenant-aware queries
├── emails/           # React Email templates
├── hooks/            # Shared hooks
├── jobs/             # pg-boss workers and schedulers
├── lib/              # Utilities, auth, uploads, exports
├── providers/        # React providers
├── services/         # Domain services and engines
├── stores/           # Zustand stores
└── types/            # Shared TypeScript types
tests/
├── e2e/              # Playwright specs
└── auth.setup.ts     # E2E auth bootstrap
deploy/               # VPS deploy, backup, restore, systemd assets
docs/ops/             # Release and recovery docs
```

---

## Project-Specific Notes

### Data and Seed Content

- Runtime pages should query the database through `src/data-access/`
- Seed and reference content belongs in `src/data/seed/`,
  `src/data/rbi-regulations/`, and `src/data/rbi-master-directions/`
- Avoid adding new runtime dependencies on static JSON when the data
  should live in PostgreSQL

### Tenant Safety

- Tenant ID must come from the authenticated session
- Server actions should use `getRequiredSession()`
- DAL queries must scope by tenant explicitly

### Multi-Language Support

- Supported locales: English, Hindi, Marathi, Gujarati
- Banking terminology changes should stay domain-accurate across all
  locales

### Production Deployment

⚠️ **See [`CLAUDE.md`](CLAUDE.md#deployment) for the authoritative production setup.**

The VPS was reprovisioned on 2026-08-23 to run **Coolify** (self-hosted PaaS).
- **Deploy trigger:** Merge to `main` (no tag step)
- **Secrets:** Configured in Coolify UI, not in files
- **Infrastructure:** Coolify-managed Postgres, Traefik TLS via Let's Encrypt
- **Do not reintroduce:** `/opt/aegis/` paths, `docker-compose.prod.yml`, tag-driven pipeline, PM2, or Dockge

See CLAUDE.md § "Deployment" and "Operational Commands" for current procedures.

---

## Quick Reference

### Path Aliases

```typescript
@/components/ui/*     // shadcn/ui components
@/components/layout/* // Layout components
@/lib/*               // Utilities and helpers
@/types/*             // Type definitions
@/data/*              // Reference and seed content
```

### Common Imports

```typescript
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { UserIcon } from "@/lib/icons";
import type { BankProfile } from "@/types";
```

---

## Before Committing

1. Run `pnpm lint`
2. Run `pnpm build` for changes that affect runtime behavior
3. Run the relevant tests for the code you touched
4. Check the browser for obvious regressions when UI flows changed
5. Ensure no secrets or local-only artifacts are staged

---

_Keep this guide aligned with the live product and the documented
production process._
