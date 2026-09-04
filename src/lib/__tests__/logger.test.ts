import pino from "pino";
import { describe, expect, it } from "vitest";

import { logger } from "@/lib/logger";

describe("logger error serialization", () => {
  it("serializes Error instances under the error key with message and stack", () => {
    const serializers = (logger as unknown as Record<symbol, unknown>)[
      pino.symbols.serializersSym
    ] as Record<string, (value: unknown) => { message?: string; stack?: string }>;

    const serialized = serializers.error(new Error("boom"));

    expect(serialized.message).toBe("boom");
    expect(serialized.stack).toContain("Error: boom");
  });
});
