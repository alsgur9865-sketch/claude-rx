// File: src/rules/load.ts
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

export function loadClaudeMd(path: string): { content: string; hash: string } {
  const content = readFileSync(path, "utf8");
  const hash = createHash("sha256").update(content).digest("hex").slice(0, 16);
  return { content, hash };
}
