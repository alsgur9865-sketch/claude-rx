// File: test/rules/extract.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { rmSync, existsSync } from "node:fs";
import { readCachedRules, writeCachedRules } from "../../src/rules/extract.js";

describe("규칙 캐시", () => {
  beforeEach(() => {
    if (existsSync(".claudit")) rmSync(".claudit", { recursive: true });
  });

  it("쓴 규칙을 같은 해시로 다시 읽는다", () => {
    writeCachedRules("abc123", [{ id: "R1", text: "x", type: "ai" }]);
    expect(readCachedRules("abc123")?.[0].id).toBe("R1");
    expect(readCachedRules("nope")).toBeNull();
  });
});
