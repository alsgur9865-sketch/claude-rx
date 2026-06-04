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
 * - 위반 없음:   기계검증(금지형)=keep(안 어김=잘 막는 중) / 주관=적용된 적 있으면 keep, na만이면 observe(관망)
 * 주관 규칙이 이번 표본에서 한 번도 적용 안 됨(na만)은 "죽은 규칙"이 아니라 "표본이 작아 아직 판단 불가"다.
 * 표본만으로 delete를 자동 단정하면 멀쩡한 규칙을 지우라는 오처방이 된다(도그푸딩에서 실증) → observe로 보류한다.
 * (delete는 "적용됐어야 할 상황이 실제 왔는데도 안 걸림"을 확인해야 정당한데, 코드는 그걸 판정 못 한다 → 사람/skill의 몫.)
 * 금지형 machine 규칙은 안 어겨도 "삭제"가 아니라 "유지"다 (force-push를 안 했다고 규칙을 지울 순 없다).
 */
function prescribe(
  ruleType: Rule["type"],
  pass: number,
  violation: number,
): Prescription {
  if (violation > 0) return ruleType === "machine" ? "hook" : "reword";
  if (ruleType === "machine") return "keep"; // 금지 규칙 안 어김 = 잘 막는 중
  return pass > 0 ? "keep" : "observe"; // 주관: 적용된 적 있으면 유지, na만이면 관망(삭제 단정 금지)
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
