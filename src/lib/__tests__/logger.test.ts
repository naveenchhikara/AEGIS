import { describe, expect, it, vi } from "vitest";

import { logger } from "@/lib/logger";

describe("logger error serialization", () => {
  it("serializes Error instances under the error key with message and stack", async () => {
    const writes: string[] = [];
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(
      ((chunk: string | Uint8Array) => {
        writes.push(Buffer.isBuffer(chunk) ? chunk.toString("utf8") : chunk);
        return true;
      }) as typeof process.stdout.write,
    );

    try {
      logger.error({ error: new Error("boom"), action: "test" }, "Failed");
      await new Promise((resolve) => setImmediate(resolve));
    } finally {
      writeSpy.mockRestore();
    }

    const logLine = writes.find((line) => line.includes("\"msg\":\"Failed\""));
    expect(logLine).toBeDefined();
    const parsed = JSON.parse(logLine ?? "{}") as {
      error?: { message?: string; stack?: string };
    };

    expect(parsed.error?.message).toBe("boom");
    expect(parsed.error?.stack).toContain("Error: boom");
  });
});
