// File: src/types.ts
// 파이프라인 전체가 공유하는 타입. 모듈 간 유일한 결합점.

/** 리포트 출력 언어 */
export type Lang = "en" | "ko";

/** 정규화된 한 메시지 (메타·hook 줄은 제외하고 대화만) */
export interface NormalizedMessage {
  role: "user" | "assistant";
  text: string; // content 안의 text를 이어붙인 것
  toolUses: { name: string; input: unknown }[];
}

/** 한 세션 트랜스크립트 */
export interface SessionTranscript {
  sessionId: string;
  cwd: string;
  gitBranch: string | null;
  startedAt: string; // 첫 메시지 timestamp
  messages: NormalizedMessage[];
}

/** CLAUDE.md에서 추출한 규칙 하나 */
export interface Rule {
  id: string; // 예: "R1", "git-noforce"
  text: string; // 원문 요지
  type: "machine" | "ai";
  pattern?: string; // machine일 때: 도구호출/텍스트에서 찾을 정규식
  applicability?: string; // ai일 때: 이 규칙이 적용되는 상황 설명
  rubric?: string[]; // ai일 때: 준수 판정 체크리스트
}

/** (규칙 × 세션) 판정 결과 */
export interface Verdict {
  ruleId: string;
  sessionId: string;
  status: "pass" | "violation" | "na"; // 지켜짐 / 위반 / 해당없음
  confidence: number; // 0~1 (machine은 항상 1)
  evidence: string; // 근거: 트랜스크립트 인용 또는 매칭된 부분
}

/** 규칙별 집계 */
/** 규칙별 처방: hook 승격 / 표현 강화 / 유지 / 관망(이번 표본에선 적용 0회) */
export type Prescription = "hook" | "reword" | "keep" | "observe";

export interface RuleStat {
  ruleId: string;
  text: string;
  pass: number;
  violation: number;
  na: number;
  rate: number | null; // pass/(pass+violation), 분모 0이면 null
  prescription: Prescription; // 측정 결과로부터 도출한 처방
}

export interface AdherenceReport {
  claudeMdPath: string;
  sessionCount: number;
  stats: RuleStat[];
  verdicts: Verdict[]; // 드릴다운용 전체 판정
}
