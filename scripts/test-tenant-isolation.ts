/**
 * AEGIS Tenant Isolation Test Script (D18, DE4)
 *
 * Tests that Row-Level Security (RLS) policies enforce tenant isolation
 * on all tenant-scoped tables. Generates a compliance report suitable
 * for RBI inspection artifacts.
 *
 * Usage: npx tsx scripts/test-tenant-isolation.ts
 *
 * Prerequisites:
 *   1. PostgreSQL running with AEGIS database
 *   2. Prisma migrations applied
 *   3. RLS policies applied (add_rls_policies.sql)
 *   4. Seed data loaded (pnpm prisma db seed)
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as fs from "fs";
import * as path from "path";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Tables to test (all tenant-scoped tables)
const TENANT_SCOPED_TABLES = [
  { model: "Tenant", idField: "id", tenantField: "id" },
  { model: "User", idField: "id", tenantField: "tenantId" },
  { model: "Observation", idField: "id", tenantField: "tenantId" },
  { model: "ObservationTimeline", idField: "id", tenantField: "tenantId" },
  { model: "Evidence", idField: "id", tenantField: "tenantId" },
  { model: "ComplianceRequirement", idField: "id", tenantField: "tenantId" },
  { model: "Branch", idField: "id", tenantField: "tenantId" },
  { model: "AuditArea", idField: "id", tenantField: "tenantId" },
  { model: "AuditPlan", idField: "id", tenantField: "tenantId" },
  { model: "AuditEngagement", idField: "id", tenantField: "tenantId" },
  { model: "AuditLog", idField: "id", tenantField: "tenantId" },
];

interface TestResult {
  table: string;
  tenantACount: number;
  tenantBCount: number;
  crossTenantBlocked: boolean;
  passed: boolean;
  detail: string;
}

async function queryWithTenantContext(
  tenantId: string,
  tableName: string,
): Promise<number> {
  // Use raw SQL to set tenant context and query, simulating what prismaForTenant does
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, TRUE)`;
    const count: Array<{ count: bigint }> = await tx.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "${tableName}"`,
    );
    return Number(count[0].count);
  });
  return result;
}

async function testCrossTenantAccess(
  tenantAId: string,
  tenantBId: string,
  tableName: string,
  tenantField: string,
): Promise<boolean> {
  // Set context to Tenant A, try to query Tenant B's data
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantAId}, TRUE)`;
    const count: Array<{ count: bigint }> = await tx.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "${tableName}" WHERE "${tenantField}" = $1`,
      tenantBId,
    );
    return Number(count[0].count);
  });
  // If RLS is working, this should return 0 (Tenant B data not visible to Tenant A)
  return result === 0;
}

async function main() {
  console.log("=".repeat(70));
  console.log("  AEGIS Tenant Isolation Test");
  console.log("  " + new Date().toISOString());
  console.log("=".repeat(70));
  console.log();

  // Get tenant IDs from database
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "asc" },
  });

  if (tenants.length < 2) {
    console.error(
      "ERROR: Need at least 2 tenants. Run seed first: pnpm prisma db seed",
    );
    process.exit(1);
  }

  const tenantA = tenants[0];
  const tenantB = tenants[1];

  console.log(`  Tenant A: ${tenantA.name} (${tenantA.id})`);
  console.log(`  Tenant B: ${tenantB.name} (${tenantB.id})`);
  console.log();

  const results: TestResult[] = [];
  let allPassed = true;

  for (const table of TENANT_SCOPED_TABLES) {
    process.stdout.write(`  Testing ${table.model}... `);

    try {
      // Count records visible to Tenant A
      const tenantACount = await queryWithTenantContext(
        tenantA.id,
        table.model,
      );

      // Count records visible to Tenant B
      const tenantBCount = await queryWithTenantContext(
        tenantB.id,
        table.model,
      );

      // Test cross-tenant access (Tenant A context, query Tenant B data)
      const crossTenantBlocked = await testCrossTenantAccess(
        tenantA.id,
        tenantB.id,
        table.model,
        table.tenantField,
      );

      const passed = crossTenantBlocked;
      if (!passed) allPassed = false;

      const result: TestResult = {
        table: table.model,
        tenantACount,
        tenantBCount,
        crossTenantBlocked,
        passed,
        detail: passed
          ? `A=${tenantACount}, B=${tenantBCount}, cross-tenant blocked`
          : `FAIL: cross-tenant access NOT blocked!`,
      };

      results.push(result);
      console.log(passed ? "PASS" : "FAIL");
      console.log(
        `    Tenant A rows: ${tenantACount}, Tenant B rows: ${tenantBCount}`,
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      results.push({
        table: table.model,
        tenantACount: -1,
        tenantBCount: -1,
        crossTenantBlocked: false,
        passed: false,
        detail: `ERROR: ${detail}`,
      });
      allPassed = false;
      console.log("ERROR");
      console.log(`    ${detail}`);
    }
  }

  // Generate report
  console.log();
  console.log("=".repeat(70));
  console.log(
    allPassed ? "  RESULT: ALL TESTS PASSED" : "  RESULT: SOME TESTS FAILED",
  );
  console.log("=".repeat(70));

  // Write report file
  const reportLines: string[] = [
    "========================================================================",
    "AEGIS TENANT ISOLATION TEST REPORT",
    "========================================================================",
    "",
    `Date: ${new Date().toISOString()}`,
    `Tenant A: ${tenantA.name} (${tenantA.id})`,
    `Tenant B: ${tenantB.name} (${tenantB.id})`,
    "",
    "Test: Row-Level Security (RLS) tenant isolation verification",
    "Method: Set tenant context via set_config, query each table,",
    "        verify cross-tenant data is not accessible.",
    "",
    "------------------------------------------------------------------------",
    "RESULTS",
    "------------------------------------------------------------------------",
    "",
  ];

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  for (const r of results) {
    reportLines.push(`  ${r.passed ? "PASS" : "FAIL"}  ${r.table}`);
    reportLines.push(`        ${r.detail}`);
    reportLines.push("");
  }

  reportLines.push(
    "------------------------------------------------------------------------",
  );
  reportLines.push(
    `SUMMARY: ${passedCount} passed, ${failedCount} failed out of ${results.length} tables`,
  );
  reportLines.push(`OVERALL: ${allPassed ? "PASS" : "FAIL"}`);
  reportLines.push(
    "------------------------------------------------------------------------",
  );
  reportLines.push("");
  reportLines.push(
    "This report serves as a compliance artifact for RBI inspections.",
  );
  reportLines.push(
    "RLS policies ensure tenant data isolation at the database level,",
  );
  reportLines.push(
    "preventing cross-tenant data leaks even if application code has bugs.",
  );
  reportLines.push("");

  const reportPath = path.join(process.cwd(), "tenant-isolation-report.txt");
  fs.writeFileSync(reportPath, reportLines.join("\n"), "utf-8");
  console.log(`\n  Report saved to: ${reportPath}`);

  if (!allPassed) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("Test script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
