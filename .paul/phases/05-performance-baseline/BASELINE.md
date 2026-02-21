# AEGIS Performance Baseline

_Captured: 2026-02-21_
_Build: Next.js 16.1.6 (Turbopack production build)_

## Build Metrics

| Metric                 | Value      |
| ---------------------- | ---------- |
| Build time (Turbopack) | 5.7s       |
| Build time (Webpack)   | 31.9s      |
| Total .next/ output    | 316 MB     |
| Standalone output      | 110 MB     |
| Static assets          | 4.6 MB     |
| Server bundles         | 88 MB      |
| Total routes           | 64         |
| Static pages           | 44         |
| Dynamic routes         | 64 (all ƒ) |

## Client Bundle Composition (10.6 MB stat size)

### Top 15 Client Packages

| Package                        | Size (KB) | Notes                           |
| ------------------------------ | --------- | ------------------------------- |
| next (framework)               | 2,025     | React server components runtime |
| recharts                       | 817       | Dashboard charts                |
| react-dom                      | 533       | React DOM runtime               |
| zod                            | 524       | Schema validation (v4)          |
| @sentry/core                   | 400       | Error tracking SDK              |
| lucide-react                   | 221       | Icon library                    |
| @radix-ui/react-roving-focus   | 145       | UI primitive                    |
| @tanstack/table-core           | 136       | Data tables                     |
| @sentry-internal/browser-utils | 134       | Sentry browser utilities        |
| date-fns                       | 114       | Date formatting                 |
| react-hook-form                | 109       | Form management                 |
| @sentry/browser                | 105       | Sentry browser SDK              |
| @radix-ui/react-tabs           | 96        | UI primitive                    |
| tailwind-merge                 | 95        | CSS class merging               |
| immer                          | 86        | Immutable state (recharts dep)  |

### Largest Client Chunks

| Chunk                | Size (KB) | Content                       |
| -------------------- | --------- | ----------------------------- |
| react-dom-client     | 594 + 524 | React DOM (two copies\*)      |
| @tanstack/table-core | 136       | Data table engine             |
| react-hook-form      | 109       | Form library                  |
| tailwind-merge       | 95        | CSS utility                   |
| governance page      | 82        | RBI inspection pack component |
| @reduxjs/toolkit     | 78        | Redux (recharts dependency)   |
| zod v4 core          | 75        | Schema validation             |
| sonner               | 64        | Toast notifications           |

\*React DOM appears twice: once as Next.js compiled version, once as direct dependency. This is expected in Next.js 16 Webpack builds.

## Server Bundle Composition (40.7 MB stat size)

### Top 15 Server Packages

| Package                             | Size (KB) | Notes                           |
| ----------------------------------- | --------- | ------------------------------- |
| @apm-js-collab/code-transformer     | 10,153    | Sentry source map processing    |
| next                                | 2,645     | Framework server runtime        |
| @sentry/core                        | 2,480     | Error tracking                  |
| better-auth                         | 1,840     | Authentication library          |
| zod                                 | 1,572     | Schema validation               |
| kysely                              | 1,165     | Query builder (better-auth dep) |
| recharts                            | 818       | Charts (server-rendered)        |
| @opentelemetry/semantic-conventions | 806       | Telemetry (Sentry dep)          |
| @sentry/node-core                   | 799       | Node.js error tracking          |
| @sentry/node                        | 719       | Sentry Node SDK                 |
| @sentry/nextjs                      | 697       | Sentry Next.js integration      |
| @opentelemetry/core                 | 387       | OpenTelemetry (Sentry dep)      |
| @better-auth/core                   | 380       | Auth core                       |
| @opentelemetry/api                  | 370       | OpenTelemetry API               |
| @opentelemetry/instrumentation      | 348       | OpenTelemetry instrumentation   |

## Deployment Configuration

| Setting            | Value                              |
| ------------------ | ---------------------------------- |
| Runtime            | Docker standalone (node:22-alpine) |
| Process model      | Single process (node server.js)    |
| Memory limit       | 1 GB (Docker)                      |
| Max memory restart | 400 MB (PM2 legacy config)         |
| Health check       | /api/health (30s interval)         |
| Scaling            | Single instance (pilot phase)      |

## Optimization Opportunities

### High Impact (Recommended)

1. **lucide-react tree-shaking** (221 KB client)
   - Already using barrel import from `@/lib/icons` but Webpack may not tree-shake effectively
   - Turbopack handles this better — verify in production with Turbopack build
   - If needed: switch to direct per-icon imports (`lucide-react/icons/X`)

2. **recharts on dashboard only** (817 KB client)
   - recharts + immer + @reduxjs/toolkit bundle together (~980 KB)
   - Only used on /dashboard and /analytics pages
   - Consider: dynamic import with `next/dynamic` + loading skeleton
   - Impact: Removes ~1 MB from initial page loads for non-dashboard routes

3. **Sentry SDK size** (639 KB client, 5.1 MB server)
   - Client: @sentry/core (400 KB) + browser-utils (134 KB) + browser (105 KB)
   - Server: Sentry + OpenTelemetry stack dominates (10+ MB including source map tooling)
   - Currently optional — only loads when DSN configured
   - Consider: Sentry lazy loading for client SDK

### Medium Impact (Consider Later)

4. **zod v4 client bundle** (524 KB)
   - Zod is used in both server (validation) and client (form schemas)
   - Client-side usage mostly for react-hook-form zodResolver
   - Consider: Pre-validate on server, reduce client-side schema usage

5. **date-fns** (114 KB)
   - Moderate size, used across many components
   - Tree-shaking should work — verify only used functions are bundled

6. **RBI master directions data** (54 KB)
   - `src/data/rbi-master-directions/checklist-items.json` bundled into client
   - Should be fetched from database via DAL, not bundled as static data

### Low Priority (Not Needed for Pilot)

7. **PM2 cluster mode** — Not applicable, using Docker standalone
8. **API caching** — All pages are dynamic with tenant isolation; caching adds complexity without benefit for < 50 users
9. **Edge runtime for API routes** — Node.js runtime needed for pg, pg-boss, Prisma

## Key Observations

- **Build is fast**: 5.7s with Turbopack is excellent for 600+ files
- **Client bundle is reasonable**: 10.6 MB stat size, but gzipped/brotli will be ~2-3 MB
- **Server bundle dominated by Sentry**: @apm-js-collab/code-transformer alone is 10 MB (source maps)
- **No caching configured**: Every page is dynamic — appropriate for multi-tenant data isolation
- **Webpack vs Turbopack**: Webpack build has a type error on async params (Next.js 16 migration artifact), Turbopack handles it correctly
- **React DOM duplication**: Two copies in Webpack build — likely resolved in Turbopack production builds

## Conclusion

The AEGIS bundle is healthy for a 600-file enterprise application. The largest optimization opportunity is dynamic-importing recharts (saves ~1 MB for non-dashboard pages). Sentry's server footprint is large but expected for full observability. No critical performance issues block pilot deployment.

---

_Baseline captured: 2026-02-21_
_Next.js 16.1.6, Node.js 25.6.1, pnpm 10.28.2_
