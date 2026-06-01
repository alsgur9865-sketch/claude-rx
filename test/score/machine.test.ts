// File: test/score/machine.test.ts
import { describe, it, expect } from "vitest";
import { scoreMachine } from "../../src/score/machine.js";
import type { Rule, SessionTranscript } from "../../src/types.js";

const rule: Rule = {
  id: "git-noforce",
  text: "force-push 금지",
  type: "machine",
  pattern: "git push.*--force",
};

const session = (messages: SessionTranscript["messages"]): SessionTranscript => ({
  sessionId: "s1",
  cwd: "x",
  gitBranch: null,
  startedAt: "",
  messages,
});

const bash = (cmd: string): SessionTranscript =>
  session([{ role: "assistant", text: "", toolUses: [{ name: "Bash", input: { command: cmd } }] }]);

describe("scoreMachine", () => {
  it("금지 패턴이 Bash 실행에 있으면 violation", () => {
    expect(scoreMachine(rule, bash("git push --force origin main")).status).toBe("violation");
  });

  it("Bash 실행에 패턴이 없으면 na", () => {
    expect(scoreMachine(rule, bash("git status")).status).toBe("na");
  });

  it("텍스트로 언급만 하고 실행은 안 하면 na (false positive 방지)", () => {
    const s = session([
      { role: "user", text: "git push --force 해줘", toolUses: [] },
      { role: "assistant", text: "위험해서 git push --force는 안 됩니다", toolUses: [] },
    ]);
    expect(scoreMachine(rule, s).status).toBe("na");
  });

  it("Write 도구로 코드에 패턴 문자열을 써도 na (실행 아닌 기록)", () => {
    const s = session([
      {
        role: "assistant",
        text: "",
        toolUses: [
          { name: "Write", input: { file_path: "x.md", content: "규칙: git push --force 금지" } },
        ],
      },
    ]);
    expect(scoreMachine(rule, s).status).toBe("na");
  });

  it("Bash heredoc으로 파일에 쓴 본문 속 패턴은 na (실행 아닌 기록)", () => {
    const cmd = "cat > demo.mjs <<'EOF'\nconst x = 'git push --force origin main';\nEOF";
    expect(scoreMachine(rule, bash(cmd)).status).toBe("na");
  });

  it("heredoc 본문 밖에서 실제 실행된 명령은 여전히 violation (회귀 방지)", () => {
    const cmd = "cat > note.txt <<'EOF'\nharmless text\nEOF\ngit push --force origin main";
    expect(scoreMachine(rule, bash(cmd)).status).toBe("violation");
  });
});
