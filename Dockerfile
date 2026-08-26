# =============================================================================
# AEGIS - Multi-Stage Production Dockerfile
# =============================================================================
# Optimized for Next.js 16 standalone output with pnpm
# Target: node:22-alpine for minimal image size
# =============================================================================

# --- Stage 1: Dependencies ---
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

# --- Stage 2: Builder ---
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=1

# NEXT_PUBLIC_* vars are inlined at build time by Next.js.
# Default to production URL; override with --build-arg for other environments.
ARG NEXT_PUBLIC_APP_URL=https://aegis.nexlyadvisory.com
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# Generate Prisma client (only needs schema, not a live DB)
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" pnpm prisma generate

# Build-time placeholders for the server-side auth vars.
#
# SKIP_ENV_VALIDATION=1 makes @t3-oss/env-nextjs skip validation and hand back
# the raw environment — it does NOT supply defaults. So any module that reads a
# property off `env` during the build sees `undefined`. `src/lib/auth.ts` calls
# `env.BETTER_AUTH_URL.startsWith("https://")` at module load, which Next.js
# evaluates while collecting page data, and `undefined.startsWith` throws.
#
# These are placeholders, not configuration: both are server-only, so nothing
# here is inlined into the client bundle, and the container re-evaluates the
# module against the real values injected at runtime. Only NEXT_PUBLIC_* is
# baked in at build time, which is why that one is an ARG above.
ENV BETTER_AUTH_SECRET=build-placeholder-secret-0123456789abcdef0123
ENV BETTER_AUTH_URL=http://localhost:3000

# Dummy DATABASE_URL for build — Next.js collects page data at build time
# and the auth route imports Prisma. The proxy in prisma.ts defers connection,
# but Prisma adapter validation still needs a parseable URL.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" pnpm build

# --- Stage 3: Runner (Production) ---
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
