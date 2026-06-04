// File: src/report/i18n.ts
// 리포트 출력 문자열의 영/한 묶음. 섹션·헤더·라벨만 번역하고,
// 규칙명(force-push 등)은 기술 용어라 그대로 둔다.
import type { Lang } from "../types.js";

export interface Strings {
  secHook: string;
  secReword: string;
  secObserve: string;
  na: string;
  none: string;
  header: (path: string, n: number) => string;
  count: (violation: number, na: number) => string;
  summary: (total: number, hook: number, del: number, reword: number, keep: number) => string;
  mdTitle: string;
  mdTarget: string;
  mdSessions: (n: number) => string;
  mdRule: (id: string, text: string, rate: string, pass: number, v: number, na: number) => string;
  mdViolTitle: string;
  mdViolLine: (id: string, sid: string, conf: number, ev: string) => string;
  mdNoViol: string;
  noKey: (n: number) => string;
}

const EN: Strings = {
  secHook: "🔧 Promote to a hook (machine-checkable + violated)",
  secReword: "✍️ Strengthen the wording (subjective + often broken)",
  secObserve: "⚪ Didn't come up (na only — sample may be too small to call it dead)",
  na: "N/A",
  none: "_none_",
  header: (p, n) => `claude-rx — ${p}  (${n} ${n === 1 ? "session" : "sessions"})`,
  count: (v, na) => `(violated ${v}/NA ${na})`,
  summary: (t, h, o, r, k) => `${t} rules → 🔧${h} / ✍️${r} / ⚪${o} / ✅${k}`,
  mdTitle: "claude-rx report",
  mdTarget: "Target",
  mdSessions: (n) => `Sessions analyzed: ${n}`,
  mdRule: (id, text, rate, pass, v, na) =>
    `- \`${id}\` ${text} — adherence ${rate} (pass ${pass}/violated ${v}/NA ${na})`,
  mdViolTitle: "Violation evidence",
  mdViolLine: (id, sid, conf, ev) => `- **${id}** (session ${sid}, conf ${conf}): ${ev}`,
  mdNoViol: "_no violations_",
  noKey: (n) =>
    `⚠ No ANTHROPIC_API_KEY — using ${n} built-in machine checks only (subjective-rule analysis needs a key)`,
};

const KO: Strings = {
  secHook: "🔧 hook으로 올려라 (기계검증 + 위반)",
  secReword: "✍️ 표현을 강화해라 (주관 + 자주 깨짐)",
  secObserve: "⚪ 이번엔 안 나타남 (na만 — 표본이 작아 죽었다 단정 못 함)",
  na: "N/A",
  none: "_해당 없음_",
  header: (p, n) => `claude-rx 처방 — ${p}  (세션 ${n}개)`,
  count: (v, na) => `(위반 ${v}/NA ${na})`,
  summary: (t, h, o, r, k) => `규칙 ${t}개 → 🔧${h} / ✍️${r} / ⚪${o} / ✅${k}`,
  mdTitle: "claude-rx 처방 리포트",
  mdTarget: "대상",
  mdSessions: (n) => `분석 세션: ${n}개`,
  mdRule: (id, text, rate, pass, v, na) =>
    `- \`${id}\` ${text} — 준수율 ${rate} (지킴 ${pass}/위반 ${v}/NA ${na})`,
  mdViolTitle: "위반 근거",
  mdViolLine: (id, sid, conf, ev) => `- **${id}** (세션 ${sid}, conf ${conf}): ${ev}`,
  mdNoViol: "_위반 없음_",
  noKey: (n) =>
    `⚠ ANTHROPIC_API_KEY 없음 → 내장 기계검증 규칙 ${n}개만 사용 (주관 규칙 분석은 키 필요)`,
};

export function strings(lang: Lang): Strings {
  return lang === "ko" ? KO : EN;
}
