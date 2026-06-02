#!/usr/bin/env node
// File: src/cli.ts
import { Command } from "commander";
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { discoverSessions } from "./sessions/discover.js";
import { parseTranscript } from "./sessions/load.js";
import { loadClaudeMd } from "./rules/load.js";
import { extractRules } from "./rules/extract.js";
import { scoreMachine } from "./score/machine.js";
import { scoreAi, transcriptExcerpt } from "./score/ai-judge.js";
import { aggregate } from "./score/aggregate.js";
import { printTerminal } from "./report/terminal.js";
import { renderMarkdown } from "./report/markdown.js";
import { BUILTIN_RULES } from "./rules/builtin.js";
import type { Verdict, Rule } from "./types.js";

const program = new Command();
program
  .name("claude-rx")
  .description("Audit how well Claude Code followed your CLAUDE.md, and prescribe fixes")
  .option("-p, --path <file>", "CLAUDE.md 경로", join(homedir(), ".claude", "CLAUDE.md"))
  .option("-c, --cwd <dir>", "분석할 프로젝트 cwd", process.cwd())
  .option("-l, --limit <n>", "분석 세션 수", "20")
  .option("-o, --out <file>", "마크다운 리포트 저장 경로", "claude-rx-report.md")
  .option("--json", "기계검증 처방 + 세션 발췌를 JSON으로 출력 (skill 백엔드용, 키 불필요)");
program.parse();
const opts = program.opts();

const limit = parseInt(opts.limit, 10);
const files = discoverSessions(opts.cwd, limit);

if (opts.json) {
  // skill(세션 모델 judge) 백엔드용: 키 없이 내장 기계검증 처방 + 세션 발췌만 제공한다.
  // 규칙 추출·주관 규칙 judge는 호출자(세션 Claude)가 수행한다.
  const transcripts = files.map((f) =>
    parseTranscript(readFileSync(f.path, "utf8"), f.sessionId),
  );
  const verdicts: Verdict[] = [];
  for (const t of transcripts) {
    for (const rule of BUILTIN_RULES) verdicts.push(scoreMachine(rule, t));
  }
  const machineReport = aggregate(opts.path, files.length, BUILTIN_RULES, verdicts);
  const sessions = transcripts.map((t) => ({
    sessionId: t.sessionId,
    startedAt: t.startedAt,
    excerpt: transcriptExcerpt(t),
  }));
  process.stdout.write(JSON.stringify({ machineReport, sessions }, null, 2));
} else {
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  let rules: Rule[];
  if (hasKey) {
    const { content, hash } = loadClaudeMd(opts.path);
    rules = await extractRules(content, hash);
  } else {
    console.warn(
      `⚠ ANTHROPIC_API_KEY 없음 → 내장 기계검증 규칙 ${BUILTIN_RULES.length}개만 사용 (주관 규칙 분석은 키 필요)`,
    );
    rules = BUILTIN_RULES;
  }

  const verdicts: Verdict[] = [];
  for (const f of files) {
    const t = parseTranscript(readFileSync(f.path, "utf8"), f.sessionId);
    for (const rule of rules) {
      verdicts.push(rule.type === "machine" ? scoreMachine(rule, t) : await scoreAi(rule, t));
    }
  }

  const report = aggregate(opts.path, files.length, rules, verdicts);
  printTerminal(report);
  writeFileSync(opts.out, renderMarkdown(report));
  console.log(`📄 리포트 저장: ${opts.out}`);
}
