// File: test/sessions/load.test.ts
import { describe, it, expect } from "vitest";
import { parseTranscript } from "../../src/sessions/load.js";
import { readFileSync } from "node:fs";

// CWD 상대경로는 루트 밖에서 실행하면 ENOENT — 테스트 파일 기준 절대경로로 푼다
const raw = readFileSync(new URL("../fixtures/sample-session.jsonl", import.meta.url), "utf8");

describe("parseTranscript", () => {
  it("메타/비대화 줄은 버리고 대화만 정규화한다", () => {
    const t = parseTranscript(raw, "s1");
    expect(t.sessionId).toBe("s1");
    expect(t.messages.every((m) => m.role === "user" || m.role === "assistant")).toBe(true);
  });

  it("assistant 메시지의 tool_use를 toolUses로 뽑는다 (Bash는 command 보존)", () => {
    const t = parseTranscript(raw, "s1");
    const withTool = t.messages.find((m) => m.toolUses.length > 0);
    expect(withTool?.toolUses[0]).toEqual({ name: "Bash", command: "git status" });
  });

  it("Bash 외 도구는 name만 남긴다 (input 슬림화 — 소비처가 없다)", () => {
    const line = JSON.stringify({
      type: "assistant",
      message: {
        role: "assistant",
        content: [
          { type: "tool_use", id: "t1", name: "Write", input: { file_path: "x.md", content: "비밀" } },
          { type: "tool_use", id: "t2", name: "Bash", input: { command: "ls" } },
        ],
      },
    });
    const t = parseTranscript(line, "s2");
    expect(t.messages[0].toolUses[0]).toEqual({ name: "Write" });
    expect(t.messages[0].toolUses[1]).toEqual({ name: "Bash", command: "ls" });
  });

  it("isMeta 줄과 isSidechain 줄은 제외한다", () => {
    const t = parseTranscript(raw, "s1");
    const allText = t.messages.map((m) => m.text).join(" ");
    expect(allText).toContain("force-push");        // 정상 줄은 포함
    expect(allText).not.toContain("메타주입텍스트");  // isMeta 제외
    expect(allText).not.toContain("서브에이전트텍스트"); // isSidechain 제외
  });

  it("cwd·gitBranch를 메타에서 채운다", () => {
    const t = parseTranscript(raw, "s1");
    expect(t.cwd).toBe("D:\\project\\claudit");
    expect(t.gitBranch).toBe("main");
  });
});
