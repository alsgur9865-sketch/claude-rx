// File: test/rules/extract.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { rmSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  readCachedRules,
  writeCachedRules,
  sanitizeRules,
  extractRules,
  CACHE_DIR,
} from "../../src/rules/extract.js";
import type { Rule } from "../../src/types.js";

// extractRules가 동적 import하는 SDK를 모킹 — 추출 결과를 테스트마다 주입한다 (실 API 호출 없음)
let mockRules: unknown = [];
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = {
      create: async () => ({
        content: [{ type: "tool_use", id: "t1", name: "emit_rules", input: { rules: mockRules } }],
      }),
    };
  },
}));

describe("규칙 캐시", () => {
  // 캐시는 이제 홈(CACHE_DIR)에 있다 → 사용자 캐시 전체를 지우지 않고 이 테스트가 쓴 파일만 정리한다.
  const HASHES = ["abc123", "bad999", "empty1"];
  const cleanup = () => {
    for (const h of HASHES) {
      const p = join(CACHE_DIR, `rules-${h}.json`);
      if (existsSync(p)) rmSync(p);
    }
  };
  beforeEach(cleanup);
  afterEach(cleanup);

  it("쓴 규칙을 같은 해시로 다시 읽는다", () => {
    writeCachedRules("abc123", [{ id: "R1", text: "x", type: "ai" }]);
    expect(readCachedRules("abc123")?.[0].id).toBe("R1");
    expect(readCachedRules("nope")).toBeNull();
  });

  it("손상된 캐시(JSON 깨짐·배열 아님)는 null — 캐시 미스 취급", () => {
    mkdirSync(CACHE_DIR, { recursive: true });
    const p = join(CACHE_DIR, "rules-bad999.json");
    writeFileSync(p, "{not valid json");
    expect(readCachedRules("bad999")).toBeNull();
    writeFileSync(p, JSON.stringify({ rules: [] })); // 배열이 아닌 형태
    expect(readCachedRules("bad999")).toBeNull();
  });

  it("빈 추출 결과는 캐시하지 않는다 (캐시 독 방지 — 회귀 고정)", async () => {
    mockRules = [];
    const rules = await extractRules("# 빈 CLAUDE.md", "empty1");
    expect(rules).toEqual([]);
    expect(existsSync(join(CACHE_DIR, "rules-empty1.json"))).toBe(false);
  });
});

describe("sanitizeRules (AI 산출 pattern 검증)", () => {
  it("컴파일 불가·200자 초과·pattern 누락 machine 규칙은 ai로 강등한다 (규칙은 버리지 않음)", () => {
    const rules: Rule[] = [
      { id: "ok", text: "x", type: "machine", pattern: "git\\s+push" },
      { id: "broken", text: "x", type: "machine", pattern: "([unclosed" },
      { id: "huge", text: "x", type: "machine", pattern: "a".repeat(201) },
      { id: "missing", text: "x", type: "machine" },
      { id: "subjective", text: "x", type: "ai" },
    ];
    const out = sanitizeRules(rules);
    expect(out).toHaveLength(5); // 규칙 자체는 모두 보존
    expect(out.find((r) => r.id === "ok")).toEqual(rules[0]); // 유효 패턴은 그대로
    for (const id of ["broken", "huge", "missing"]) {
      const r = out.find((x) => x.id === id)!;
      expect(r.type).toBe("ai");
      expect(r.pattern).toBeUndefined();
    }
    expect(out.find((r) => r.id === "subjective")!.type).toBe("ai"); // ai 규칙은 손대지 않음
  });
});
