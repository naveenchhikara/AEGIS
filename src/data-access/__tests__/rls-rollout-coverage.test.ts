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
  const tables = ["Tenant"];
  const lines = schema.split("\n");
  let currentModelName: string | null = null;
  let braceDepth = 0;
  let currentModelBody: string[] = [];

  for (const line of lines) {
    if (!currentModelName) {
      const modelStart = line.match(/^model\s+(\w+)\s*\{/);
      if (modelStart) {
        currentModelName = modelStart[1];
        braceDepth = 1;
        currentModelBody = [];
      }
      continue;
    }

    braceDepth += (line.match(/\{/g) || []).length;
    braceDepth -= (line.match(/\}/g) || []).length;
    currentModelBody.push(line);

    if (braceDepth === 0) {
      if (/\btenantId\s+String\b/.test(currentModelBody.join("\n"))) {
        tables.push(currentModelName);
      }
      currentModelName = null;
      currentModelBody = [];
    }
  }

  // ObservationRbiCircular has no tenantId column; it is tenant-scoped
  // through Observation.observationId -> Observation.tenantId.
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
