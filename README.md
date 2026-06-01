<p align="center">
  <img src="assets/banner.png" alt="claude-rx" width="640">
</p>

# claude-rx

> Your CLAUDE.md rules are advisory — and Claude often ignores them. **claude-rx** audits your real Claude Code session logs to see which rules were *actually* followed, then **prescribes what to do** about each one.

**Not a percentage report. A prescription.**

---

## The problem

CLAUDE.md is a wish list, not a contract. Rules are loaded into context but [Claude doesn't reliably follow them](https://github.com/anthropics/claude-code/issues/34132) — and the deeper a rule sits, the more likely it's silently dropped on compaction. Today people track violations by hand, session by session.

## What claude-rx does

It reads your past Claude Code sessions and, for each rule, tells you **what to do**:

- 🔧 **Promote to a hook** — machine-checkable rules that got violated (e.g. `git push --force`). claude-rx tells you *which* rules are worth enforcing; Claude Code writes the hook.
- 🗑️ **Delete** — rules that never triggered once. Dead weight burning your context budget.
- ✍️ **Strengthen wording** — subjective rules that keep getting broken.

The compliance % is just the evidence behind each prescription, not the product.

## Quick start (no API key needed)

```bash
npx claude-rx
```

Out of the box, claude-rx runs **5 built-in machine checks** — force-push, `reset --hard`, committing `.env`, hardcoded secrets, global installs — against your recent sessions. **Completely free, no key.**

```
claude-rx 처방 — ~/.claude/CLAUDE.md (세션 5개)

🔧 hook으로 올려라 (기계검증 + 위반)
   0%  no-force-push   (위반 1/NA 1)

규칙 5개 → 🔧1 / 🗑️0 / ✍️0 / ✅4
```

## Deeper analysis (bring your own key)

To audit the **subjective** rules in your own CLAUDE.md (e.g. "ask before coding", "answer in Korean"), claude-rx uses Claude Haiku as a judge. Provide your own key:

```bash
export ANTHROPIC_API_KEY=sk-ant-...     # mac / linux
$env:ANTHROPIC_API_KEY="sk-ant-..."     # windows powershell

npx claude-rx --path ~/.claude/CLAUDE.md
```

Cost is tiny — Haiku, only the relevant excerpts, recent sessions only. Typically **under a coffee for 20 sessions**. It's *your* key and *your* spend; claude-rx never sends it anywhere except Anthropic's API.

## How it works

Hybrid scoring:

- **Machine checks** (free) — parse the session's tool executions and regex-match. Looks at *what was actually run* (the `Bash` command), not what was *said* in chat or *written* into a source file.
- **AI judge** (BYOK) — Haiku reads the relevant excerpts with evidence-first reasoning and a two-step applicability check, returning `pass` / `violation` / `na` + confidence.

Every verdict carries an evidence quote (session id + excerpt) so you can verify it yourself.

## Limitations (honest)

Measurement is a heuristic, not truth. For example, a `cat`/heredoc that writes a command string into a file can still produce a false positive (fully resolving it would need shell parsing). That's exactly why **every prescription links back to the session evidence** — trust, but verify.

## Options

| flag | default | meaning |
|---|---|---|
| `-p, --path <file>` | `~/.claude/CLAUDE.md` | CLAUDE.md to audit (key mode) |
| `-c, --cwd <dir>` | current dir | project whose sessions to analyze |
| `-l, --limit <n>` | `20` | number of recent sessions |
| `-o, --out <file>` | `claude-rx-report.md` | markdown report path |

## Roadmap

- `--emit-hook <rule>` — generate the hook code, not just the recommendation
- Wording suggestions for subjective rules (judge reads violation patterns, rewrites the rule)
- Low-confidence escalation (Haiku → Sonnet), mini-ensemble, golden-set calibration
- CI integration — audit on every PR

## License

MIT © 2026 MIN
