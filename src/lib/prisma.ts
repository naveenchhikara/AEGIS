import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const adapter = new PrismaPg({ connectionString });
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

/**
 * Tenant-scoped Prisma client with transaction-scoped RLS.
 *
 * CRITICAL SECURITY NOTES (Decision D6, Skeptic S2):
 * - tenantId MUST come from authenticated session ONLY
 * - NEVER pass tenantId from URL params, request body, or query string
 * - DAL functions should accept a session object, not a raw tenantId string
 * - This function provides RLS-level isolation; DAL functions should ALSO
 *   add explicit WHERE tenantId clauses (belt-and-suspenders, Skeptic S1)
 */
export function prismaForTenant(tenantId: string) {
  return prisma.$extends({
    query: {
      $allOperations: async ({
        args,
        query,
      }: {
        operation: string;
        model?: string;
        args: Record<string, unknown>;
        query: (args: Record<string, unknown>) => Promise<unknown>;
      }) => {
        // Wrap ALL queries in transaction with tenant context
        return prisma.$transaction(async (tx) => {
          // SET LOCAL parameter (transaction-scoped only — safe for connection pooling)
          await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, TRUE)`;
          return query(args);
        });
      },
    },
  });
}
