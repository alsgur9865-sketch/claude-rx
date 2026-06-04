// File: test/report/markdown.test.ts
import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../../src/report/markdown.js";
import type { AdherenceReport } from "../../src/types.js";

const report: AdherenceReport = {
  claudeMdPath: "CLAUDE.md",
  sessionCount: 2,
  stats: [
    { ruleId: "R1", text: "기계규칙", pass: 1, violation: 1, na: 0, rate: 0.5, prescription: "hook" },
    { ruleId: "R2", text: "안나타난규칙", pass: 0, violation: 0, na: 2, rate: null, prescription: "observe" },
  ],
  verdicts: [
    { ruleId: "R1", sessionId: "b", status: "violation", confidence: 0.9, evidence: "여기서 위반" },
  ],
};

describe("renderMarkdown", () => {
  it("준수율과 위반 근거를 담는다 (ko)", () => {
    const md = renderMarkdown(report, "ko");
    expect(md).toContain("50%");
    expect(md).toContain("여기서 위반");
  });

  it("처방 섹션으로 분류하고 요약을 낸다 (ko)", () => {
    const md = renderMarkdown(report, "ko");
    expect(md).toContain("hook으로 올려라");
    expect(md).toContain("이번엔 안 나타남");
    expect(md).toContain("🔧1");
  });

  it("기본은 영어로 출력한다 (en)", () => {
    const md = renderMarkdown(report);
    expect(md).toContain("Promote to a hook");
    expect(md).toContain("Didn't come up");
  });
});
