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
  session([{ role: "assistant", text: "", toolUses: [{ name: "Bash", command: cmd }] }]);

describe("scoreMachine", () => {
  it("금지 패턴이 Bash 실행에 있으면 violation", () => {
    expect(scoreMachine(rule, bash("git push --force origin main")).status).toBe("violation");
  });

  it("Bash 실행이 있는데 패턴이 안 걸리면 pass (준수 — rate 분모에 포함)", () => {
    expect(scoreMachine(rule, bash("git status")).status).toBe("pass");
  });

  it("Bash 실행이 아예 없으면 na (검사 대상 없음)", () => {
    expect(scoreMachine(rule, session([{ role: "user", text: "안녕", toolUses: [] }])).status).toBe(
      "na",
    );
  });

  it("텍스트로 언급만 하고 실행은 안 하면 na (false positive 방지)", () => {
    const s = session([
      { role: "user", text: "git push --force 해줘", toolUses: [] },
      { role: "assistant", text: "위험해서 git push --force는 안 됩니다", toolUses: [] },
    ]);
    expect(scoreMachine(rule, s).status).toBe("na");
  });

  it("Write 도구는 검사 대상이 아니다 (실행 아닌 기록 — input은 load 단계에서 버려짐)", () => {
    const s = session([{ role: "assistant", text: "", toolUses: [{ name: "Write" }] }]);
    expect(scoreMachine(rule, s).status).toBe("na");
  });

  it("Bash heredoc으로 파일에 쓴 본문 속 패턴은 위반 아님 (실행 아닌 기록)", () => {
    const cmd = "cat > demo.mjs <<'EOF'\nconst x = 'git push --force origin main';\nEOF";
    expect(scoreMachine(rule, bash(cmd)).status).toBe("pass"); // 본문 제거 후 남은 실행은 있으므로 pass
  });

  it("하이픈 포함 heredoc delimiter도 본문을 잘라낸다", () => {
    const cmd = "cat > x.txt <<'SOME-DELIMITER'\ngit push --force origin main\nSOME-DELIMITER";
    expect(scoreMachine(rule, bash(cmd)).status).toBe("pass");
  });

  it("heredoc 본문 밖에서 실제 실행된 명령은 여전히 violation (회귀 방지)", () => {
    const cmd = "cat > note.txt <<'EOF'\nharmless text\nEOF\ngit push --force origin main";
    expect(scoreMachine(rule, bash(cmd)).status).toBe("violation");
  });

  it("시크릿 매치는 evidence에서 마스킹된다 — GitHub PAT 원문 노출 금지", () => {
    const secretRule: Rule = {
      id: "no-hardcoded-secret",
      text: "no hardcoded secrets",
      type: "machine",
      pattern: "ghp_[a-zA-Z0-9]{36}",
    };
    const pat = "ghp_" + "A".repeat(36);
    const v = scoreMachine(secretRule, bash(`echo ${pat}`));
    expect(v.status).toBe("violation");
    expect(v.evidence).not.toContain(pat); // PAT 전체가 들어가면 안 된다
    expect(v.evidence).toContain("ghp_AA…"); // 앞 6자 + … 만 남는다
  });

  it("짧은 토큰으로 된 매치 evidence는 읽을 수 있게 남는다 (진단 가치 유지)", () => {
    const v = scoreMachine(rule, bash("git push --force origin main"));
    expect(v.evidence).toContain("git push --force");
  });
});
