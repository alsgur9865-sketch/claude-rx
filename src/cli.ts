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
import { scoreAi } from "./score/ai-judge.js";
import { aggregate } from "./score/aggregate.js";
import { printTerminal } from "./report/terminal.js";
import { renderMarkdown } from "./report/markdown.js";
import { buildJsonReport } from "./report/json.js";
import { BUILTIN_RULES } from "./rules/builtin.js";
import { strings } from "./report/i18n.js";
import type { Verdict, Rule, Lang } from "./types.js";

async function main(): Promise<void> {
  const program = new Command();
  program
    .name("claude-rx")
    .description("Audit how well Claude Code followed your CLAUDE.md, and prescribe fixes")
    .option("-p, --path <file>", "path to the CLAUDE.md to audit", join(homedir(), ".claude", "CLAUDE.md"))
    .option("-c, --cwd <dir>", "project cwd whose sessions are analyzed", process.cwd())
    .option("-l, --limit <n>", "number of recent sessions to analyze", "20")
    .option("-o, --out <file>", "markdown report output path", "claude-rx-report.md")
    .option("--json", "print machine-check prescriptions + session excerpts as JSON (skill backend, no API key needed)")
    .option("--lang <lang>", "report language: en|ko", "en");
  program.parse();
  const opts = program.opts();
  const str = strings(opts.lang as Lang);

  const limit = parseInt(opts.limit, 10);
  if (Number.isNaN(limit) || limit < 1) {
    throw new Error(`Invalid --limit "${opts.limit}" — expected a positive integer.`);
  }
  const files = discoverSessions(opts.cwd, limit);

  if (opts.json) {
    // skill(세션 모델 judge) 백엔드용: 키 없이 내장 기계검증 처방 + 세션 발췌만 제공한다.
    process.stdout.write(JSON.stringify(buildJsonReport(opts.path, files), null, 2));
    return;
  }

  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  let rules: Rule[];
  if (hasKey) {
    let loaded: { content: string; hash: string };
    try {
      loaded = loadClaudeMd(opts.path);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") {
        throw new Error(`CLAUDE.md not found at ${opts.path}. Use -p <path>.`);
      }
      throw e;
    }
    rules = await extractRules(loaded.content, loaded.hash);
  } else {
    console.warn(str.noKey(BUILTIN_RULES.length));
    rules = BUILTIN_RULES;
  }

  const machineRules = rules.filter((r) => r.type === "machine");
  const aiRules = rules.filter((r) => r.type === "ai");
  const verdicts: Verdict[] = [];
  for (const f of files) {
    const t = parseTranscript(readFileSync(f.path, "utf8"), f.sessionId);
    for (const rule of machineRules) verdicts.push(scoreMachine(rule, t));
    // ai 규칙은 세션당 1콜로 배치 판정 (규칙별 1콜 → 비용·지연 절감)
    if (aiRules.length) verdicts.push(...(await scoreAi(aiRules, t)));
  }

  const report = aggregate(opts.path, files.length, rules, verdicts);
  printTerminal(report, opts.lang as Lang);
  writeFileSync(opts.out, renderMarkdown(report, opts.lang as Lang));
  console.log(str.saved(opts.out));
  console.log(str.privacy);
}

main().catch((e: unknown) => {
  // 사용자용 CLI — 스택트레이스 대신 읽을 수 있는 메시지 한 줄만
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
