// File: src/report/markdown.ts
import type { AdherenceReport, Prescription, Lang } from "../types.js";
import { strings } from "./i18n.js";

function pct(rate: number | null, na: string): string {
  return rate === null ? na : `${Math.round(rate * 100)}%`;
}

export function renderMarkdown(r: AdherenceReport, lang: Lang = "en"): string {
  const t = strings(lang);
  const sectionDefs: { key: Prescription; title: string }[] = [
    { key: "hook", title: t.secHook },
    { key: "reword", title: t.secReword },
    { key: "observe", title: t.secObserve },
  ];
  const sections = sectionDefs
    .map(({ key, title }) => {
      const rules = r.stats.filter((s) => s.prescription === key);
      const body = rules.length
        ? rules
            .map((s) =>
              t.mdRule(
                s.ruleId,
                s.text,
                pct(s.rate, t.na),
                s.pass,
                s.violation,
                s.na,
              ),
            )
            .join("\n")
        : t.none;
      return `## ${title}\n${body}`;
    })
    .join("\n\n");

  const violations = r.verdicts
    .filter((v) => v.status === "violation")
    .map((v) => t.mdViolLine(v.ruleId, v.sessionId, v.confidence, v.evidence))
    .join("\n");

  const count = (k: Prescription) =>
    r.stats.filter((s) => s.prescription === k).length;

  return `# ${t.mdTitle}

- ${t.mdTarget}: \`${r.claudeMdPath}\`
- ${t.mdSessions(r.sessionCount)}

${sections}

## ${t.mdViolTitle}
${violations || t.mdNoViol}

---
**${t.summary(r.stats.length, count("hook"), count("observe"), count("reword"), count("keep"))}**
`;
}
