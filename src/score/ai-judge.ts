// File: src/score/ai-judge.ts
import Anthropic from "@anthropic-ai/sdk";
import type { Rule, SessionTranscript, Verdict } from "../types.js";

/** judge에 넣을 대화 발췌 (길이 제한: 최근 메시지 위주 8000자) */
function transcriptExcerpt(session: SessionTranscript): string {
  const lines = session.messages.map(
    (m) =>
      `[${m.role}] ${m.text}${
        m.toolUses.length
          ? " (도구: " + m.toolUses.map((t) => t.name).join(",") + ")"
          : ""
      }`,
  );
  const joined = lines.join("\n");
  return joined.length > 8000 ? joined.slice(-8000) : joined;
}

export function buildJudgePrompt(
  rule: Rule,
  session: SessionTranscript,
): string {
  return `규칙: ${rule.text}
적용 상황: ${rule.applicability ?? "(미지정)"}
준수 체크리스트:
${(rule.rubric ?? []).map((r) => `- ${r}`).join("\n")}

아래 대화에서 이 규칙을 판정하라. 반드시 순서대로:
1. 이 규칙이 적용될 상황이 대화에 있었나? 없으면 status="na".
2. 적용됐다면 체크리스트로 준수/위반 판정.
3. 근거가 되는 대화 부분을 먼저 인용한 뒤 결론을 내려라.

대화:
${transcriptExcerpt(session)}`;
}

const JUDGE_TOOL = {
  name: "emit_verdict",
  description: "Emit the adherence verdict for one rule against one session.",
  input_schema: {
    type: "object" as const,
    properties: {
      evidence: {
        type: "string",
        description: "근거가 된 대화 인용 (먼저 작성)",
      },
      status: { type: "string", enum: ["pass", "violation", "na"] },
      confidence: { type: "number", description: "0~1" },
    },
    required: ["evidence", "status", "confidence"],
  },
};

export async function scoreAi(
  rule: Rule,
  session: SessionTranscript,
): Promise<Verdict> {
  const client = new Anthropic();
  const res = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    tools: [JUDGE_TOOL],
    tool_choice: { type: "tool", name: "emit_verdict" },
    messages: [{ role: "user", content: buildJudgePrompt(rule, session) }],
  });
  const block = res.content.find((b) => b.type === "tool_use");
  const out = (block && "input" in block ? block.input : {}) as {
    evidence?: string;
    status?: Verdict["status"];
    confidence?: number;
  };
  return {
    ruleId: rule.id,
    sessionId: session.sessionId,
    status: out.status ?? "na",
    confidence: out.confidence ?? 0,
    evidence: out.evidence ?? "",
  };
}
