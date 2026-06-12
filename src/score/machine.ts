// File: src/score/machine.ts
import type { Rule, SessionTranscript, Verdict } from "../types.js";

/**
 * heredoc 본문(`cat > f <<'EOF' ... EOF`로 파일에 쓰는 내용)은 "실행"이 아니라 "기록"이다.
 * Bash command 문자열에는 heredoc 본문까지 통째로 들어오므로, 그 안의 명령 문자열이
 * 위반으로 오인된다(예: 데모 스크립트에 적은 "git push --force"). 본문을 잘라내 막는다.
 * (완전한 셸 파싱은 MVP 범위 밖 — heredoc 안에서 *실제 실행*되는 명령은 드물어 무시 가능.)
 */
const STRIP_HEREDOC = /<<-?\s*(['"]?)([\w-]+)\1\r?\n[\s\S]*?\r?\n\2\b/g;

/**
 * evidence 마스킹: 공백 없는 8자 초과 토큰은 앞 6자 + "…"만 남긴다.
 * 시크릿(PAT·API 키)은 긴 단일 토큰이라 원문이 보고서에 박히는 걸 막고,
 * "git push --force" 같은 짧은 토큰 명령은 읽을 수 있게 남긴다.
 */
function maskEvidence(matched: string): string {
  return matched
    .split(/(\s+)/)
    .map((tok) => (/\s/.test(tok) || tok.length <= 8 ? tok : `${tok.slice(0, 6)}…`))
    .join("");
}

/**
 * 세션에서 실제로 "실행된 셸 명령"만 한 덩어리 문자열로.
 * - 메시지 텍스트(말로 "force-push 해줘"라고 언급한 것)는 제외
 * - 파일 쓰기 도구(Write/Edit)의 내용은 "실행"이 아니라 "기록"이므로 제외
 *   (소스코드·픽스처에 "git push --force" 문자열을 써도 그건 위반이 아니다)
 * - Bash 안의 heredoc 파일 쓰기 본문도 "기록"이므로 제외
 * 오직 Bash 도구의 command만 본다 — "언급/기록"과 "실행"을 구분해 false positive를 막는다.
 */
function haystack(session: SessionTranscript): string {
  const parts: string[] = [];
  for (const m of session.messages) {
    for (const t of m.toolUses) {
      if (t.name !== "Bash") continue;
      if (typeof t.command === "string") parts.push(t.command.replace(STRIP_HEREDOC, ""));
    }
  }
  return parts.join("\n");
}

export function scoreMachine(rule: Rule, session: SessionTranscript): Verdict {
  const re = new RegExp(rule.pattern ?? "", "i");
  const hay = haystack(session);
  const match = hay.match(re);
  // 금지형 패턴 가정: 매치=위반. 검사 대상(Bash 실행)이 아예 없으면 na, 있는데 안 걸리면 pass(준수).
  return {
    ruleId: rule.id,
    sessionId: session.sessionId,
    status: match ? "violation" : hay.trim() ? "pass" : "na",
    confidence: 1,
    evidence: match ? `matched: "${maskEvidence(match[0])}"` : "not found",
  };
}
