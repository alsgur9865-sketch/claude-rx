// File: test/score/aggregate.test.ts
import { describe, it, expect } from "vitest";
import { aggregate } from "../../src/score/aggregate.js";
import type { Rule, Verdict } from "../../src/types.js";

const v = (ruleId: string, status: Verdict["status"]): Verdict => ({
  ruleId,
  sessionId: "s",
  status,
  confidence: 1,
  evidence: "",
});

describe("aggregate", () => {
  it("준수율은 na를 분모에서 제외한다 (1/2 = 0.5)", () => {
    const rules: Rule[] = [{ id: "R1", text: "규칙1", type: "ai" }];
    const verdicts: Verdict[] = [v("R1", "pass"), v("R1", "violation"), v("R1", "na")];
    const r = aggregate("CLAUDE.md", 3, rules, verdicts);
    expect(r.stats[0].rate).toBe(0.5);
    expect(r.stats[0].na).toBe(1);
  });
});

describe("처방 분류", () => {
  const rules: Rule[] = [
    { id: "hookR", text: "기계규칙", type: "machine" },
    { id: "rewordR", text: "주관규칙", type: "ai" },
    { id: "observeR", text: "안나타난규칙", type: "ai" },
    { id: "keepR", text: "잘지킴", type: "machine" },
    { id: "safeR", text: "force-push금지(안어김)", type: "machine" },
  ];
  const verdicts: Verdict[] = [
    v("hookR", "violation"),
    v("rewordR", "violation"),
    v("observeR", "na"),
    v("keepR", "pass"),
    v("safeR", "na"),
    v("safeR", "na"),
  ];
  const r = aggregate("X", 1, rules, verdicts);
  const byId = (id: string) => r.stats.find((s) => s.ruleId === id)!;

  it("기계검증 + 위반 → hook", () => expect(byId("hookR").prescription).toBe("hook"));
  it("주관 + 위반 → reword", () => expect(byId("rewordR").prescription).toBe("reword"));
  it("주관 + 적용 0회(na만) → observe (삭제 단정 X)", () =>
    expect(byId("observeR").prescription).toBe("observe"));
  it("기계 + 위반 없음(지킴) → keep", () => expect(byId("keepR").prescription).toBe("keep"));
  it("기계 + 안 어김(na만) → keep (삭제 아님)", () =>
    expect(byId("safeR").prescription).toBe("keep"));
});
