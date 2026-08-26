import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Increase pool size to handle concurrent RLS transactions
  // Default pg.Pool max is 10; dashboard SSR fires 10-15 parallel queries
  // each wrapped in a transaction for tenant isolation
  const adapter = new PrismaPg({ connectionString, max: 25 });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
};

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = new Proxy(
  {} as ReturnType<typeof prismaClientSingleton>,
  {
    get(_target, prop) {
      const instance = globalThis.prismaGlobal ?? prismaClientSingleton();
      if (process.env.NODE_ENV !== "production") {
        globalThis.prismaGlobal = instance;
      }
      return Reflect.get(instance, prop);
    },
  },
);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Tenant-scoped Prisma client helper.
 *
 * ARCHITECTURE NOTE:
 * The DB rollout uses PostgreSQL RLS with FORCE ROW LEVEL SECURITY and
 * policies keyed on app.current_tenant_id. This helper currently performs
 * tenantId format validation and returns the shared Prisma client; DAL
 * functions still include explicit tenantId filters for defense-in-depth.
 *
 * If query-level tenant GUC wiring is expanded beyond audit-context
 * transactions, prefer connection-safe middleware over per-query wrappers.
 *
 * SECURITY:
 * - tenantId MUST come from authenticated session ONLY
 * - NEVER pass tenantId from URL params, request body, or query string
 */
export function prismaForTenant(tenantId: string) {
  if (!UUID_REGEX.test(tenantId)) {
    throw new Error(`Invalid tenantId format: ${tenantId}`);
  }
  // Return the singleton client. Tenant filtering is still required in DAL
  // queries as defense-in-depth.
  return prisma;
}
