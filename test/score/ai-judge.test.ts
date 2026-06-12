// File: test/score/ai-judge.test.ts
import { describe, it, expect } from "vitest";
import {
  buildJudgePrompt,
  parseVerdicts,
  transcriptExcerpt,
} from "../../src/score/ai-judge.js";
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
  it("규칙·적용조건·rubric·대화를 모두 담는다 (배치: 규칙 배열)", () => {
    const p = buildJudgePrompt([rule], transcriptExcerpt(session));
    expect(p).toContain("한국어로 답해");
    expect(p).toContain("응답이 한국어인가");
    expect(p).toContain("Hello there");
  });

  it("트랜스크립트 발췌를 <transcript> 태그로 구분한다 (인젝션 가드)", () => {
    const p = buildJudgePrompt([rule], "EXCERPT-BODY");
    expect(p).toContain("<transcript>\nEXCERPT-BODY\n</transcript>");
  });
});

describe("parseVerdicts (judge 응답 검증)", () => {
  it("status는 whitelist로 검증한다 (그 외 → na)", () => {
    const [v] = parseVerdicts(
      { verdicts: [{ ruleId: "ko", status: "hacked", confidence: 1, evidence: "x" }] },
      [rule],
      "s1",
    );
    expect(v.status).toBe("na");
  });

  it("정상 status는 그대로 통과한다", () => {
    const [v] = parseVerdicts(
      { verdicts: [{ ruleId: "ko", status: "violation", confidence: 0.8, evidence: "x" }] },
      [rule],
      "s1",
    );
    expect(v).toEqual({
      ruleId: "ko",
      sessionId: "s1",
      status: "violation",
      confidence: 0.8,
      evidence: "x",
    });
  });

  it("confidence를 0~1로 클램프한다", () => {
    const over = parseVerdicts(
      { verdicts: [{ ruleId: "ko", status: "pass", confidence: 7, evidence: "x" }] },
      [rule],
      "s1",
    );
    expect(over[0].confidence).toBe(1);
    const under = parseVerdicts(
      { verdicts: [{ ruleId: "ko", status: "pass", confidence: -3, evidence: "x" }] },
      [rule],
      "s1",
    );
    expect(under[0].confidence).toBe(0);
  });

  it("필드 누락·응답에서 빠진 규칙은 na/0/빈 evidence로 채운다", () => {
    const other: Rule = { id: "r2", text: "x", type: "ai" };
    const vs = parseVerdicts({ verdicts: [{ ruleId: "ko" }] }, [rule, other], "s1");
    expect(vs[0]).toEqual({ ruleId: "ko", sessionId: "s1", status: "na", confidence: 0, evidence: "" });
    expect(vs[1]).toEqual({ ruleId: "r2", sessionId: "s1", status: "na", confidence: 0, evidence: "" });
  });

  it("verdicts가 배열이 아니거나 input이 null이어도 죽지 않는다", () => {
    expect(parseVerdicts({ verdicts: "nope" }, [rule], "s1")[0].status).toBe("na");
    expect(parseVerdicts(null, [rule], "s1")[0].status).toBe("na");
  });
});

describe("transcriptExcerpt", () => {
  it("8000자 이하면 그대로 반환한다", () => {
    expect(transcriptExcerpt(session)).toBe("[assistant] Hello there");
  });

  it("8000자 초과면 끝(최근 메시지)에서 8000자만 남긴다 (경계)", () => {
    const long: SessionTranscript = {
      ...session,
      messages: [
        { role: "user", text: "A".repeat(9000), toolUses: [] },
        { role: "assistant", text: "TAIL-MARKER", toolUses: [] },
      ],
    };
    const ex = transcriptExcerpt(long);
    expect(ex.length).toBe(8000);
    expect(ex).toContain("TAIL-MARKER"); // 최근 메시지 보존
    expect(ex.startsWith("[user]")).toBe(false); // 앞부분이 잘림
  });
});
