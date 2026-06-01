// File: test/rules/load.test.ts
import { describe, it, expect } from "vitest";
import { loadClaudeMd } from "../../src/rules/load.js";

describe("loadClaudeMd", () => {
  it("내용과 해시를 반환한다", () => {
    const r = loadClaudeMd("test/fixtures/sample-claude.md");
    expect(r.content).toContain("force-push");
    expect(r.hash).toMatch(/^[a-f0-9]{8,}$/);
  });
});
