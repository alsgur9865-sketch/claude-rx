// File: src/sessions/discover.ts
import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

/**
 * "D:\project\claudit" → "D--project-claudit" (Claude Code projects 폴더 규칙)
 * 영숫자가 아닌 문자는 전부 '-'로 치환한다. 연속 '-'는 축약하지 않는다("D:\" → "D--").
 */
export function encodeCwd(cwd: string): string {
  return cwd.replace(/[^a-zA-Z0-9]/g, "-");
}

export interface SessionFile {
  sessionId: string;
  path: string;
  mtime: number;
}

/** 주어진 cwd의 최근 limit개 세션 jsonl 경로 (subagents 하위폴더 제외) */
export function discoverSessions(cwd: string, limit: number): SessionFile[] {
  const dir = join(homedir(), ".claude", "projects", encodeCwd(cwd));
  if (!existsSync(dir)) return [];
  const files: SessionFile[] = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".jsonl")) continue; // 최상위 jsonl만 (서브에이전트는 하위폴더)
    const path = join(dir, name);
    files.push({
      sessionId: name.replace(/\.jsonl$/, ""),
      path,
      mtime: statSync(path).mtimeMs,
    });
  }
  return files.sort((a, b) => b.mtime - a.mtime).slice(0, limit);
}
