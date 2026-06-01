// File: src/report/terminal.ts
import pc from "picocolors";
import type { AdherenceReport, RuleStat, Prescription } from "../types.js";

const SECTIONS: { key: Prescription; title: string }[] = [
  { key: "hook", title: "🔧 hook으로 올려라 (기계검증 + 위반)" },
  { key: "delete", title: "🗑️  지워도 된다 (적용 0회)" },
  { key: "reword", title: "✍️  표현을 강화해라 (주관 + 위반)" },
];

function pctStr(s: RuleStat): string {
  if (s.rate === null) return pc.gray("N/A ");
  const t = `${Math.round(s.rate * 100)}%`.padStart(4);
  return s.rate < 0.5 ? pc.red(t) : pc.green(t);
}

export function printTerminal(r: AdherenceReport): void {
  console.log(
    pc.bold(`\nclaudit 처방 — ${r.claudeMdPath} (세션 ${r.sessionCount}개)\n`),
  );
  for (const { key, title } of SECTIONS) {
    const rules = r.stats.filter((s) => s.prescription === key);
    if (!rules.length) continue;
    console.log(pc.bold(title));
    for (const s of rules) {
      console.log(
        `  ${pctStr(s)}  ${pc.bold(s.ruleId)}  ${s.text}  ${pc.gray(
          `(위반 ${s.violation}/NA ${s.na})`,
        )}`,
      );
    }
    console.log();
  }
  const c = (k: Prescription) =>
    r.stats.filter((s) => s.prescription === k).length;
  console.log(
    pc.bold(
      `규칙 ${r.stats.length}개 → 🔧${c("hook")} / 🗑️${c("delete")} / ✍️${c("reword")} / ✅${c("keep")}`,
    ),
  );
  console.log();
}
