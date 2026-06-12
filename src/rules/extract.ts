// File: src/rules/extract.ts
import type Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { Rule } from "../types.js";

// SDK 정적 import는 콜드 스타트의 대부분을 차지하고 키 모드에서만 쓰인다 → 동적 로드.
// 클라이언트는 모듈 레벨 lazy 싱글턴으로 재사용한다 (콜마다 new 금지).
let client: Anthropic | null = null;
async function getClient(): Promise<Anthropic> {
  if (!client) {
    const { default: AnthropicSdk } = await import("@anthropic-ai/sdk");
    client = new AnthropicSdk(); // ANTHROPIC_API_KEY 환경변수 사용
  }
  return client;
}

// 캐시는 실행 cwd(= 사용자 프로젝트)가 아니라 홈에 둔다.
// 상대경로 ".claudit"는 남의 repo에 캐시 폴더를 만들어 커밋 오염을 일으켰다.
export const CACHE_DIR = join(homedir(), ".claude-rx", "cache");

export function readCachedRules(hash: string): Rule[] | null {
  const p = join(CACHE_DIR, `rules-${hash}.json`);
  if (!existsSync(p)) return null;
  // 손상된 캐시(JSON 깨짐·배열 아님)는 캐시 미스로 취급 — CLI가 죽지 않게.
  try {
    const parsed: unknown = JSON.parse(readFileSync(p, "utf8"));
    return Array.isArray(parsed) ? (parsed as Rule[]) : null;
  } catch {
    return null;
  }
}

export function writeCachedRules(hash: string, rules: Rule[]): void {
  // 캐시에 CLAUDE.md 유래 규칙이 들어가므로 소유자 전용 권한으로 만든다
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(join(CACHE_DIR, `rules-${hash}.json`), JSON.stringify(rules, null, 2), {
    mode: 0o600, // 디렉토리뿐 아니라 파일도 소유자 전용 — umask에 기대지 않는다
  });
}

/** AI 산출 pattern의 안전 상한 — 비정상적으로 긴 정규식(ReDoS·오작동 위험)은 거부 */
const MAX_PATTERN_LENGTH = 200;

/**
 * AI가 산출한 machine 규칙의 pattern을 검증한다: 컴파일 불가·길이 초과·누락이면
 * pattern을 제거하고 ai 타입으로 강등한다 (규칙 자체는 버리지 않는다).
 * pattern 없는 machine 규칙은 빈 정규식이 되어 모든 세션을 위반으로 오판하므로 강등이 안전하다.
 */
export function sanitizeRules(rules: Rule[]): Rule[] {
  const demote = (rule: Rule): Rule => {
    const demoted: Rule = { ...rule, type: "ai" };
    delete demoted.pattern;
    return demoted;
  };
  return rules.map((rule) => {
    if (rule.type !== "machine") return rule;
    if (!rule.pattern || rule.pattern.length > MAX_PATTERN_LENGTH) return demote(rule);
    try {
      new RegExp(rule.pattern, "i");
      return rule;
    } catch {
      return demote(rule);
    }
  });
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
  if (cached) return sanitizeRules(cached); // 검증 도입 전에 쓰인 캐시도 방어
  const cl = await getClient();
  const res = await cl.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system: SYSTEM,
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "tool", name: "emit_rules" },
    messages: [{ role: "user", content: `다음 CLAUDE.md에서 규칙을 추출하라:\n\n${content}` }],
  });
  const block = res.content.find((b) => b.type === "tool_use");
  const raw = block && "input" in block ? (block.input as { rules?: unknown }).rules : [];
  const rules = sanitizeRules(Array.isArray(raw) ? (raw as Rule[]) : []);
  // 빈 추출 결과는 캐시하지 않는다 — 한 번의 실패가 박혀 이후 영원히 빈 리포트가 되는 캐시 독을 막는다.
  if (rules.length) writeCachedRules(hash, rules);
  return rules;
}
