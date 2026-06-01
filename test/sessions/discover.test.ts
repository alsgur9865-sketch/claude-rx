// File: test/sessions/discover.test.ts
import { describe, it, expect } from "vitest";
import { encodeCwd } from "../../src/sessions/discover.js";

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
