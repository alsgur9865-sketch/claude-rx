// File: src/sessions/load.ts
import type { SessionTranscript, NormalizedMessage } from "../types.js";

interface RawLine {
  type?: string;
  message?: { role?: string; content?: unknown };
  cwd?: string;
  gitBranch?: string | null;
  timestamp?: string;
  isSidechain?: boolean;
  isMeta?: boolean;
}

/** content(문자열 또는 블록 배열)에서 text와 tool_use를 분리 추출 */
function extractContent(content: unknown): {
  text: string;
  toolUses: NormalizedMessage["toolUses"];
} {
  if (typeof content === "string") return { text: content, toolUses: [] };
  if (!Array.isArray(content)) return { text: "", toolUses: [] };
  let text = "";
  const toolUses: NormalizedMessage["toolUses"] = [];
  for (const block of content as Array<Record<string, unknown>>) {
    if (block.type === "text" && typeof block.text === "string")
      text += block.text;
    else if (block.type === "tool_use" && typeof block.name === "string") {
      // 슬림화: 소비처(machine 채점)가 쓰는 건 Bash의 command뿐 — 다른 도구 input은 보존하지 않는다
      const cmd =
        block.name === "Bash"
          ? (block.input as { command?: unknown } | null | undefined)?.command
          : undefined;
      toolUses.push(
        typeof cmd === "string" ? { name: block.name, command: cmd } : { name: block.name },
      );
    }
  }
  return { text, toolUses };
}

export function parseTranscript(
  raw: string,
  sessionId: string,
): SessionTranscript {
  const lines = raw.split("\n").filter(Boolean);
  const messages: NormalizedMessage[] = [];
  let cwd = "";
  let gitBranch: string | null = null;
  let startedAt = "";

  for (const line of lines) {
    let obj: RawLine;
    try {
      obj = JSON.parse(line);
    } catch {
      continue; // 깨진 줄 스킵
    }
    if (obj.cwd && !cwd) cwd = obj.cwd;
    if (obj.gitBranch && !gitBranch) gitBranch = obj.gitBranch;
    if (obj.timestamp && !startedAt) startedAt = obj.timestamp;
    if (obj.isMeta) continue; // 시스템 주입 메타 메시지 제외
    if (obj.isSidechain) continue; // 서브에이전트 제외
    if (obj.type !== "user" && obj.type !== "assistant") continue;
    const role = obj.message?.role;
    if (role !== "user" && role !== "assistant") continue;
    const { text, toolUses } = extractContent(obj.message?.content);
    messages.push({ role, text, toolUses });
  }
  return { sessionId, cwd, gitBranch, startedAt, messages };
}
