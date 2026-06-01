// File: src/rules/extract.ts
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Rule } from "../types.js";

const CACHE_DIR = ".claudit";

export function readCachedRules(hash: string): Rule[] | null {
  const p = join(CACHE_DIR, `rules-${hash}.json`);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8")) as Rule[];
}

export function writeCachedRules(hash: string, rules: Rule[]): void {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(join(CACHE_DIR, `rules-${hash}.json`), JSON.stringify(rules, null, 2));
}

const EXTRACT_TOOL = {
  name: "emit_rules",
  description: "Emit the list of checkable rules extracted from a CLAUDE.md file.",
  input_schema: {
    type: "object" as const,
    properties: {
      rules: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            text: { type: "string" },
            type: { type: "string", enum: ["machine", "ai"] },
            pattern: { type: "string", description: "machine일 때 도구호출/텍스트에서 찾을 정규식" },
            applicability: { type: "string", description: "ai일 때 규칙이 적용되는 상황" },
            rubric: { type: "array", items: { type: "string" } },
          },
          required: ["id", "text", "type"],
        },
      },
    },
    required: ["rules"],
  },
};

const SYSTEM = `당신은 CLAUDE.md를 검증 가능한 규칙으로 분해하는 분석기다.
각 규칙을 원자 단위로 쪼개라(하나의 규칙 = 하나의 검증 가능한 행동).
정규식·도구호출로 결정론적 검증이 가능하면 type=machine, pattern을 채워라.
대화 내용을 읽고 판단해야 하면 type=ai, applicability(적용 상황)와 rubric(준수 체크리스트)을 채워라.`;

export async function extractRules(content: string, hash: string): Promise<Rule[]> {
  const cached = readCachedRules(hash);
  if (cached) return cached;
  const client = new Anthropic(); // ANTHROPIC_API_KEY 환경변수 사용
  const res = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system: SYSTEM,
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "tool", name: "emit_rules" },
    messages: [{ role: "user", content: `다음 CLAUDE.md에서 규칙을 추출하라:\n\n${content}` }],
  });
  const block = res.content.find((b) => b.type === "tool_use");
  const rules = block && "input" in block ? (block.input as { rules: Rule[] }).rules : [];
  writeCachedRules(hash, rules);
  return rules;
}
