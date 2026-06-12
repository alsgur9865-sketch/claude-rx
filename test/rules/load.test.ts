// File: test/rules/load.test.ts
import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { loadClaudeMd } from "../../src/rules/load.js";

// CWD 상대경로는 루트 밖에서 실행하면 ENOENT — 테스트 파일 기준 절대경로로 푼다
const FIXTURE = fileURLToPath(new URL("../fixtures/sample-claude.md", import.meta.url));

describe("loadClaudeMd", () => {
  it("내용과 해시를 반환한다", () => {
    const r = loadClaudeMd(FIXTURE);
    expect(r.content).toContain("force-push");
    expect(r.hash).toMatch(/^[a-f0-9]{8,}$/);
  });
});
