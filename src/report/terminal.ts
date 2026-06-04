// File: src/report/terminal.ts
import pc from "picocolors";
import type {
  AdherenceReport,
  RuleStat,
  Prescription,
  Lang,
} from "../types.js";
import { strings } from "./i18n.js";

function pctStr(s: RuleStat, na: string): string {
  if (s.rate === null) return pc.gray(na.padEnd(4));
  const t = `${Math.round(s.rate * 100)}%`.padStart(4);
  return s.rate < 0.5 ? pc.red(t) : pc.green(t);
}

export function printTerminal(r: AdherenceReport, lang: Lang = "en"): void {
  const t = strings(lang);
  const sections: { key: Prescription; title: string }[] = [
    { key: "hook", title: t.secHook },
    { key: "reword", title: t.secReword },
    { key: "observe", title: t.secObserve },
  ];
  console.log(pc.bold(`\n${t.header(r.claudeMdPath, r.sessionCount)}\n`));
  for (const { key, title } of sections) {
    const rules = r.stats.filter((s) => s.prescription === key);
    if (!rules.length) continue;
    console.log(pc.bold(title));
    for (const s of rules) {
      console.log(
        `  ${pctStr(s, t.na)}  ${pc.bold(s.ruleId)}  ${s.text}  ${pc.gray(
          t.count(s.violation, s.na),
        )}`,
      );
      const ev = r.verdicts.find(
        (v) => v.ruleId === s.ruleId && v.status === "violation" && v.evidence,
      );
      if (ev) console.log(pc.gray(`        ↳ ${ev.evidence}`));
    }
    console.log();
  }
  const c = (k: Prescription) =>
    r.stats.filter((s) => s.prescription === k).length;
  console.log(
    pc.bold(
      t.summary(
        r.stats.length,
        c("hook"),
        c("observe"),
        c("reword"),
        c("keep"),
      ),
    ),
  );
  console.log();
}
