import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const SCHEMA_PATH = join(process.cwd(), "prisma/schema.prisma");
const RLS_MIGRATION_PATH = join(
  process.cwd(),
  "prisma/migrations/20260826_full_rls_rollout.sql",
);

function getTenantScopedTablesFromSchema(): string[] {
  const schema = readFileSync(SCHEMA_PATH, "utf-8");
  const modelMatches = schema.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g);

  const tables = ["Tenant"];

  for (const [, modelName, modelBody] of modelMatches) {
    if (/\btenantId\s+String\b/.test(modelBody)) {
      tables.push(modelName);
    }
  }

  tables.push("ObservationRbiCircular");

  return [...new Set(tables)];
}

describe("RLS rollout coverage", () => {
  const sql = readFileSync(RLS_MIGRATION_PATH, "utf-8");
  const tenantScopedTables = getTenantScopedTablesFromSchema();

  it("covers every tenant-scoped table with ENABLE/FORCE RLS", () => {
    for (const table of tenantScopedTables) {
      expect(sql).toMatch(
        new RegExp(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`),
      );
      expect(sql).toMatch(
        new RegExp(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`),
      );
    }
  });

  it("creates tenant isolation policies for every tenant-scoped table", () => {
    for (const table of tenantScopedTables) {
      expect(sql).toMatch(
        new RegExp(`CREATE POLICY tenant_isolation_policy ON "${table}"`),
      );
    }
  });

  it("uses app.current_tenant_id for policy enforcement", () => {
    expect(sql).toContain("current_setting('app.current_tenant_id', TRUE)");
  });
});
