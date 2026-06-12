// File: test/sessions/discover.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdirSync, writeFileSync, utimesSync, rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { encodeCwd, discoverSessions } from "../../src/sessions/discover.js";

// discoverSessions는 homedir() 기준으로 찾는다 → homedir만 tmpdir 픽스처로 바꿔치기한다.
// (process.env.HOME 변경은 worker thread의 os.homedir()에 반영되지 않아 못 쓴다)
let mockHome: string | null = null;
vi.mock("node:os", async (importOriginal) => {
  const os = await importOriginal<typeof import("node:os")>();
  return { ...os, homedir: () => mockHome ?? os.homedir() };
});

describe("encodeCwd", () => {
  it("드라이브 경로를 projects 폴더명 규칙으로 인코딩한다 (연속 -- 보존)", () => {
    // C:\Users\test → C--Users-test
    expect(encodeCwd("C:\\Users\\test")).toBe("C--Users-test");
  });

  it("공백·특수문자도 모두 -로 치환한다 (실제 폴더 규칙)", () => {
    // D:\project\HAKATON\Google Cloude → D--project-HAKATON-Google-Cloude
    expect(encodeCwd("D:\\project\\HAKATON\\Google Cloude")).toBe(
      "D--project-HAKATON-Google-Cloude",
    );
  });
});

describe("discoverSessions", () => {
  const CWD = "/tmp/proj";
  const projDir = () => join(mockHome!, ".claude", "projects", encodeCwd(CWD));

  beforeEach(() => {
    mockHome = mkdtempSync(join(tmpdir(), "claude-rx-home-"));
  });

  afterEach(() => {
    if (mockHome) rmSync(mockHome, { recursive: true, force: true });
    mockHome = null;
  });

  it("mtime 내림차순으로 정렬하고 limit개만 반환한다", () => {
    mkdirSync(projDir(), { recursive: true });
    const entries: [string, number][] = [
      ["old.jsonl", 1000],
      ["new.jsonl", 3000],
      ["mid.jsonl", 2000],
    ];
    for (const [name, t] of entries) {
      const p = join(projDir(), name);
      writeFileSync(p, "{}");
      utimesSync(p, t, t); // mtime을 초 단위로 고정
    }
    const r = discoverSessions(CWD, 2);
    expect(r.map((f) => f.sessionId)).toEqual(["new", "mid"]);
  });

  it(".jsonl만 포함한다 (다른 확장자·하위 폴더 무시)", () => {
    mkdirSync(join(projDir(), "subagents"), { recursive: true });
    writeFileSync(join(projDir(), "a.jsonl"), "{}");
    writeFileSync(join(projDir(), "note.txt"), "x");
    const r = discoverSessions(CWD, 10);
    expect(r.map((f) => f.sessionId)).toEqual(["a"]);
  });

  it("프로젝트 디렉토리가 없으면 빈 배열", () => {
    expect(discoverSessions("/no/such/cwd", 5)).toEqual([]);
  });
});
