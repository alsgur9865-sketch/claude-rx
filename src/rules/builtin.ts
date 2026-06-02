// File: src/rules/builtin.ts
import type { Rule } from "../types.js";

/**
 * 키 없이도 도는 보편 기계검증 규칙셋.
 * 거의 모든 프로젝트에 위험하거나 흔한 "금지 패턴"만 — hook으로 막을 가치가 있는 것들.
 * pattern은 scoreMachine이 세션의 도구호출 input + 메시지 텍스트에 대해 대소문자 무시로 매칭한다.
 * text는 영어로 둔다(기술 용어 + 글로벌 배포 기본 언어).
 */
export const BUILTIN_RULES: Rule[] = [
  {
    id: "no-force-push",
    text: "no force-push",
    type: "machine",
    pattern: "git\\s+push\\b[^\\n]*(--force|-f)\\b",
  },
  {
    id: "no-reset-hard",
    text: "no git reset --hard",
    type: "machine",
    pattern: "git\\s+reset\\s+--hard",
  },
  {
    id: "no-commit-env",
    text: "no committing .env",
    type: "machine",
    pattern: "git\\s+add\\b[^\\n]*\\.env\\b",
  },
  {
    id: "no-hardcoded-secret",
    text: "no hardcoded secrets / API keys",
    type: "machine",
    pattern: "(sk-[a-zA-Z0-9]{20}|AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{36})",
  },
  {
    id: "no-global-install",
    text: "no global npm install",
    type: "machine",
    pattern: "npm\\s+(i|install)\\b[^\\n]*\\s-g\\b",
  },
];
