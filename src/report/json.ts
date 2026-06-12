// File: src/report/json.ts
// --json 모드(skill 백엔드)의 출력 조립.
// ⚠ 출력 JSON 형태(키 이름·구조)는 스킬(SKILL.md)이 소비하는 공개 계약 — 바꾸면 안 된다.
import { readFileSync } from "node:fs";
import { parseTranscript } from "../sessions/load.js";
import { scoreMachine } from "../score/machine.js";
import { transcriptExcerpt } from "../score/ai-judge.js";
import { aggregate } from "../score/aggregate.js";
import { BUILTIN_RULES } from "../rules/builtin.js";
import type { SessionFile } from "../sessions/discover.js";
import type { AdherenceReport, Verdict } from "../types.js";

export interface JsonOutput {
  machineReport: AdherenceReport;
  sessions: { sessionId: string; startedAt: string; excerpt: string }[];
}

/**
 * 세션 파일을 하나씩 읽고→채점→발췌 후 버린다 — 전 세션을 동시에 메모리에
 * 보유하지 않는다(키 모드 분기와 같은 패턴). 규칙 추출·주관 규칙 judge는
 * 호출자(세션 Claude)가 수행하므로 여기서는 내장 기계검증만 돈다.
 */
export function buildJsonReport(claudeMdPath: string, files: SessionFile[]): JsonOutput {
  const verdicts: Verdict[] = [];
  const sessions: JsonOutput["sessions"] = [];
  for (const f of files) {
    const t = parseTranscript(readFileSync(f.path, "utf8"), f.sessionId);
    for (const rule of BUILTIN_RULES) verdicts.push(scoreMachine(rule, t));
    sessions.push({
      sessionId: t.sessionId,
      startedAt: t.startedAt,
      excerpt: transcriptExcerpt(t),
    });
  }
  const machineReport = aggregate(claudeMdPath, files.length, BUILTIN_RULES, verdicts);
  return { machineReport, sessions };
}
