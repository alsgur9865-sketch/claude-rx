// File: test/rules/extract.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { readCachedRules, writeCachedRules, CACHE_DIR } from "../../src/rules/extract.js";

describe("규칙 캐시", () => {
  // 캐시는 이제 홈(CACHE_DIR)에 있다 → 사용자 캐시 전체를 지우지 않고 이 테스트가 쓴 파일만 정리한다.
  const cleanup = () => {
    const p = join(CACHE_DIR, "rules-abc123.json");
    if (existsSync(p)) rmSync(p);
  };
  beforeEach(cleanup);
  afterEach(cleanup);

  it("쓴 규칙을 같은 해시로 다시 읽는다", () => {
    writeCachedRules("abc123", [{ id: "R1", text: "x", type: "ai" }]);
    expect(readCachedRules("abc123")?.[0].id).toBe("R1");
    expect(readCachedRules("nope")).toBeNull();
  });
});
