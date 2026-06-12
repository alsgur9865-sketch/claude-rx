// File: test/rules/builtin.test.ts
import { describe, it, expect } from "vitest";
import { BUILTIN_RULES } from "../../src/rules/builtin.js";

describe("BUILTIN_RULES", () => {
  it("모두 machine 타입이고 유효한 정규식 패턴을 가진다", () => {
    expect(BUILTIN_RULES.length).toBeGreaterThan(0);
    for (const r of BUILTIN_RULES) {
      expect(r.type).toBe("machine");
      expect(r.pattern).toBeTruthy();
      expect(() => new RegExp(r.pattern!, "i")).not.toThrow();
    }
  });

  it("force-push 명령을 잡고, 안전한 push는 안 잡는다", () => {
    const fp = BUILTIN_RULES.find((r) => r.id === "no-force-push")!;
    const re = new RegExp(fp.pattern!, "i");
    expect("git push --force origin main").toMatch(re);
    expect("git push -f").toMatch(re);
    expect("git push origin main").not.toMatch(re);
  });

  it("global install을 -g와 --global 모두 잡고, 로컬 설치는 안 잡는다", () => {
    const gi = BUILTIN_RULES.find((r) => r.id === "no-global-install")!;
    const re = new RegExp(gi.pattern!, "i");
    expect("npm install -g typescript").toMatch(re);
    expect("npm i -g tsx").toMatch(re);
    expect("npm install --global typescript").toMatch(re);
    expect("npm install typescript").not.toMatch(re);
    expect("npm install --save-dev vitest").not.toMatch(re);
  });
});
