// File: src/score/aggregate.ts
import type {
  Rule,
  Verdict,
  AdherenceReport,
  RuleStat,
  Prescription,
} from "../types.js";

/**
 * 측정 결과 → 처방.
 * - 위반 있음:   기계검증=hook 승격 / 주관=표현 강화
 * - 위반 없음:   기계검증(금지형)=keep(안 어김=잘 막는 중) / 주관=적용된 적 있으면 keep, 0회면 delete(죽은 규칙)
 * 금지형 machine 규칙은 안 어겨도 "삭제"가 아니라 "유지"다 (force-push를 안 했다고 규칙을 지울 순 없다).
 */
function prescribe(
  ruleType: Rule["type"],
  pass: number,
  violation: number,
): Prescription {
  if (violation > 0) return ruleType === "machine" ? "hook" : "reword";
  if (ruleType === "machine") return "keep"; // 금지 규칙 안 어김 = 잘 막는 중
  return pass > 0 ? "keep" : "delete"; // 주관: 적용된 적 있으면 유지, 0회면 죽은 규칙
}

export function aggregate(
  claudeMdPath: string,
  sessionCount: number,
  rules: Rule[],
  verdicts: Verdict[],
): AdherenceReport {
  const stats: RuleStat[] = rules.map((rule) => {
    const vs = verdicts.filter((v) => v.ruleId === rule.id);
    const pass = vs.filter((v) => v.status === "pass").length;
    const violation = vs.filter((v) => v.status === "violation").length;
    const na = vs.filter((v) => v.status === "na").length;
    const denom = pass + violation;
    return {
      ruleId: rule.id,
      text: rule.text,
      pass,
      violation,
      na,
      rate: denom === 0 ? null : pass / denom,
      prescription: prescribe(rule.type, pass, violation),
    };
  });
  return { claudeMdPath, sessionCount, stats, verdicts };
}
