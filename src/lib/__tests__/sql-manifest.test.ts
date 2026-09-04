import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { join } from "path";
import { SQL_MANIFEST, REQUIRED_OBJECTS } from "../../../prisma/sql/manifest";

describe("SQL manifest", () => {
  it("lists files that all exist", () => {
    const missing = SQL_MANIFEST.filter(
      (p) => !existsSync(join(process.cwd(), p)),
    );
    expect(missing).toEqual([]);
  });

  it("applies the audit trigger function before attaching triggers", () => {
    const fn = SQL_MANIFEST.findIndex((p) =>
      p.includes("audit_trigger_null_safe"),
    );
    const attach = SQL_MANIFEST.findIndex((p) =>
      p.includes("attach_audit_triggers"),
    );
    expect(fn).toBeGreaterThanOrEqual(0);
    expect(attach).toBeGreaterThan(fn);
  });

  it("requires the audit trigger on every audited table the migrations cover", () => {
    expect(REQUIRED_OBJECTS.triggers).toHaveLength(14);
    expect(REQUIRED_OBJECTS.triggers).toContain("Observation");
    expect(REQUIRED_OBJECTS.triggers).toContain("NotificationQueue");
    expect(REQUIRED_OBJECTS.triggers).not.toContain("NotificationPreference");
  });

  it("names no superseded file", () => {
    const superseded = SQL_MANIFEST.filter((p) => p.includes("superseded"));
    expect(superseded).toEqual([]);
  });
});
