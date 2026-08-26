import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const MIGRATIONS_DIR = join(ROOT, "prisma", "migrations");

function readMigration(relativePath: string): string {
  const fullPath = join(MIGRATIONS_DIR, relativePath);
  expect(existsSync(fullPath), `Missing migration file: ${relativePath}`).toBe(
    true,
  );
  return readFileSync(fullPath, "utf-8");
}

describe("RLS enforcement model", () => {
  it("keeps aegis_app as NOLOGIN grant target", () => {
    const sql = readMigration("add_rls_policies.sql");

    expect(sql).toMatch(/\bCREATE ROLE aegis_app NOLOGIN;/);
    expect(sql).not.toContain("CREATE ROLE aegis_app LOGIN");
  });

  it("forces RLS for OnboardingProgress and uses tenant GUC UUID policy", () => {
    const sql = readMigration("20260209_onboarding_models.sql");

    expect(sql).toContain('ALTER TABLE "OnboardingProgress" FORCE ROW LEVEL SECURITY;');
    expect(sql).toContain(
      `USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);`,
    );
  });
});
