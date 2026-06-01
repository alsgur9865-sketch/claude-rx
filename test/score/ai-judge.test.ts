// File: test/score/ai-judge.test.ts
import { describe, it, expect } from "vitest";
import { buildJudgePrompt } from "../../src/score/ai-judge.js";
import type { Rule, SessionTranscript } from "../../src/types.js";

const rule: Rule = {
  id: "ko",
  text: "한국어로 답해",
  type: "ai",
  applicability: "assistant가 답할 때",
  rubric: ["응답이 한국어인가"],
};

const session: SessionTranscript = {
  sessionId: "s1",
  cwd: "x",
  gitBranch: null,
  startedAt: "",
  messages: [{ role: "assistant", text: "Hello there", toolUses: [] }],
};

describe("buildJudgePrompt", () => {
  it("규칙·적용조건·rubric·대화를 모두 담는다", () => {
    const p = buildJudgePrompt(rule, session);
    expect(p).toContain("한국어로 답해");
    expect(p).toContain("응답이 한국어인가");
    expect(p).toContain("Hello there");
  });
});
