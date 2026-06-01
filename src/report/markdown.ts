// File: src/report/markdown.ts
import type { AdherenceReport, RuleStat, Prescription } from "../types.js";

function pct(rate: number | null): string {
  return rate === null ? "N/A" : `${Math.round(rate * 100)}%`;
}

const SECTIONS: { key: Prescription; title: string }[] = [
  { key: "hook", title: "🔧 hook으로 올려라 (기계검증 가능 + 위반)" },
  { key: "delete", title: "🗑️ 지워도 된다 (적용 0회 — 죽은 규칙)" },
  { key: "reword", title: "✍️ 표현을 강화해라 (주관적 + 자주 깨짐)" },
];

function ruleLine(s: RuleStat): string {
  return `- \`${s.ruleId}\` ${s.text} — 준수율 ${pct(s.rate)} (지킴 ${s.pass}/위반 ${s.violation}/NA ${s.na})`;
}

export function renderMarkdown(r: AdherenceReport): string {
  const sections = SECTIONS.map(({ key, title }) => {
    const rules = r.stats.filter((s) => s.prescription === key);
    const body = rules.length ? rules.map(ruleLine).join("\n") : "_해당 없음_";
    return `## ${title}\n${body}`;
  }).join("\n\n");

  const violations = r.verdicts
    .filter((v) => v.status === "violation")
    .map((v) => `- **${v.ruleId}** (세션 ${v.sessionId}, conf ${v.confidence}): ${v.evidence}`)
    .join("\n");

  const count = (k: Prescription) => r.stats.filter((s) => s.prescription === k).length;
  const summary = `규칙 ${r.stats.length}개 → 🔧hook ${count("hook")} / 🗑️삭제 ${count(
    "delete"
  )} / ✍️강화 ${count("reword")} / ✅유지 ${count("keep")}`;

  return `# claudit 처방 리포트

- 대상: \`${r.claudeMdPath}\`
- 분석 세션: ${r.sessionCount}개

${sections}

## 위반 근거
${violations || "_위반 없음_"}

---
**${summary}**
`;
}
