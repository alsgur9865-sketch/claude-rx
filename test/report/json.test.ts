// File: test/report/json.test.ts
import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { buildJsonReport } from "../../src/report/json.js";
import { BUILTIN_RULES } from "../../src/rules/builtin.js";

const FIXTURE = fileURLToPath(new URL("../fixtures/sample-session.jsonl", import.meta.url));

describe("buildJsonReport (--json 출력 계약)", () => {
  // ⚠ 이 형태(키 이름·구조)는 스킬(SKILL.md)이 소비하는 공개 계약이다 — 깨지면 스킬이 죽는다.
  it("최상위·중첩 키 이름과 구조를 유지한다", () => {
    const out = JSON.parse(
      JSON.stringify(
        buildJsonReport("CLAUDE.md", [{ sessionId: "s1", path: FIXTURE, mtime: 0 }]),
      ),
    );
    expect(Object.keys(out).sort()).toEqual(["machineReport", "sessions"]);
    expect(Object.keys(out.machineReport).sort()).toEqual([
      "claudeMdPath",
      "sessionCount",
      "stats",
      "verdicts",
    ]);
    expect(out.machineReport.claudeMdPath).toBe("CLAUDE.md");
    expect(out.machineReport.sessionCount).toBe(1);
    expect(out.machineReport.stats).toHaveLength(BUILTIN_RULES.length);
    expect(Object.keys(out.machineReport.stats[0]).sort()).toEqual([
      "na",
      "pass",
      "prescription",
      "rate",
      "ruleId",
      "text",
      "violation",
    ]);
    expect(out.machineReport.verdicts).toHaveLength(BUILTIN_RULES.length);
    expect(Object.keys(out.machineReport.verdicts[0]).sort()).toEqual([
      "confidence",
      "evidence",
      "ruleId",
      "sessionId",
      "status",
    ]);
    expect(out.sessions).toHaveLength(1);
    expect(Object.keys(out.sessions[0]).sort()).toEqual(["excerpt", "sessionId", "startedAt"]);
    expect(out.sessions[0].sessionId).toBe("s1");
    expect(typeof out.sessions[0].excerpt).toBe("string");
  });

  it("픽스처(Bash 실행 있음 + 금지 패턴 없음)는 전부 pass — machine rate가 N/A에서 벗어난다", () => {
    const out = buildJsonReport("CLAUDE.md", [{ sessionId: "s1", path: FIXTURE, mtime: 0 }]);
    expect(out.machineReport.verdicts.every((v) => v.status === "pass")).toBe(true);
    expect(out.machineReport.stats.every((s) => s.rate === 1)).toBe(true);
  });
});
