---
name: claude-rx
description: Audit how well Claude Code actually followed YOUR CLAUDE.md rules in recent sessions, then prescribe what to do about each rule — promote to a hook, delete dead rules, or strengthen wording. Use this whenever the user wants to check, audit, or review their CLAUDE.md compliance, asks which rules Claude ignored or followed, wonders "am I even following my own rules", mentions rule adherence or rule violations, or wants to clean up and improve their CLAUDE.md. Runs with NO API key — the current session model is the judge.
---

# claude-rx — prescribe fixes for your CLAUDE.md

Your CLAUDE.md is a wish list, not a contract. Some rules get followed; some get silently ignored — especially the ones that sit deep in the file. This skill reads the user's *real* recent session logs and, for each rule, says **what to do about it**, backed by evidence quotes from the actual sessions.

The compliance verdict is just the evidence. The product is the **prescription**.

## How the work is split (and why no API key is needed)

- **The core CLI** (deterministic, no key) parses the session logs and runs the built-in machine checks. You call it once to get session excerpts + machine-rule prescriptions.
- **You, the session model** (no key needed), are the judge for *subjective* rules — the ones that require actually reading the conversation ("answer in Korean", "ask before coding", "no over-engineering"). This is the whole point: the user pays nothing and installs no key, because *you* do the judging right here.

## Procedure

### 1. Pull session excerpts + machine prescriptions from the core

Run this (no API key required):

```bash
node D:\project\claudit\dist\cli.js --json --cwd <PROJECT_DIR> --limit 5
```

- `<PROJECT_DIR>` = the project whose sessions to audit. Default to the user's current working directory unless they name another.
- The local `dist` path above is for development. When this ships, the command becomes `npx claude-rx --json ...`.

It prints JSON:

```json
{
  "machineReport": { "stats": [ { "ruleId": "...", "text": "...", "violation": 0, "na": 5, "prescription": "..." } ] },
  "sessions": [ { "sessionId": "...", "startedAt": "...", "excerpt": "..." } ]
}
```

`machineReport.stats` already carries finished prescriptions for the built-in machine rules (force-push, `reset --hard`, committing `.env`, hardcoded secrets, global installs). Carry those into your final report as-is — don't re-judge them.

The `sessions[].excerpt` strings are the conversation transcripts you'll judge subjective rules against.

### 2. Break the user's CLAUDE.md into atomic rules

Read both, if present:

- global: `~/.claude/CLAUDE.md`
- project: `<PROJECT_DIR>/CLAUDE.md`

Split into **atomic** rules — one rule = one checkable behavior (a numbered block like "R1 완성형 코드" with sub-points may be several rules). For each, classify:

- **machine** — deterministically checkable by a regex on executed commands (forbidden git flags, committing secrets, etc.). These are already handled by `machineReport`; **skip them here** so you don't double-count.
- **subjective** — needs reading the conversation to judge ("ask before coding", "answer in Korean", "no unrequested abstractions"). **These are yours.** For each, hold in mind an *applicability* (when does this rule even come into play?) and a short *rubric* (what does compliance actually look like?).

Spend your effort on the subjective rules — that's the value the core can't provide.

### 3. Judge each subjective rule against each session excerpt

For every (subjective rule × session excerpt), reason in this exact order — it's what keeps false positives down:

1. **Applicability first.** Did a situation where this rule *applies* even occur in this session? If not → `na`. Never punish a rule for simply not having come up.
2. If it applied, check it against the rubric → `pass` or `violation`.
3. **Quote the evidence before you conclude.** Pull the actual line(s) from the excerpt that show it, *then* state the verdict. No quote = no violation.

Be conservative. Only call `violation` when the excerpt clearly shows the rule being broken. A vague feeling is `na`, not a violation. You're building the user's trust — one wrong violation costs more than one missed one.

**Two rule shapes need extra care — they're where judges disagree with each other:**

- **Degree rules** ("restrain emoji", "keep it concise", "don't over-explain") have no hard threshold, so the line is subjective. Only call `violation` on a *clear, repeated pattern* — e.g. emoji littered through body text across several turns — not on a stray one or two. An isolated instance is `na`. When you do flag it, quote 2+ instances so the pattern is visible to the user, and (if useful) suggest a measurable rewrite that would make it hook-able (e.g. "no emoji in body lines, only in `##` headers").

- **Escape-hatch rules** ("always interview before coding, *unless* shared understanding is already reached") carry their own exception. Check the exception *first*: if its condition was met, the rule wasn't broken — it was correctly skipped. Judge the rule's *intent*, not its literal trigger word. When the exception is genuinely ambiguous, prefer `pass`/`na` over `violation` — same conservative bar as above.

### 4. Derive the prescription per rule

Tally each rule's verdicts across the sessions (counts of pass / violation / na), then:

| condition | prescription |
|---|---|
| any violation · machine rule | 🔧 **hook** — promote to an enforced hook |
| any violation · subjective rule | ✍️ **reword** — strengthen the wording |
| no violation · machine rule | ✅ keep (it's holding the line) |
| no violation · subjective · applied at least once | ✅ keep |
| no violation · subjective · `na` only | ⚪ **observe** (default) — see the bar below |

**On `delete` vs `observe` — do NOT over-prescribe deletion.** A rule showing only `na` usually means *that kind of activity simply didn't happen in this batch of sessions* (e.g. a "refactoring Before/After" rule is `na` because there was no refactoring), NOT that the rule is dead. Deleting a healthy rule on a small sample is the fastest way to lose the user's trust. So:

- Default every `na`-only rule to ⚪ **observe**, and say it plainly: *"didn't fire in the last N sessions — sample may be too small to judge."*
- Only escalate to 🗑️ **delete** when the evidence is genuinely strong: the sample is sizable AND a situation where the rule *should* have applied plausibly did arise, yet the rule stayed irrelevant. When in doubt, observe — never delete on a hunch.

### 5. Output a personalized report

Make it *feel like their file*. Lead with the personal headline, then the prescriptions grouped by action, then the evidence.

**Report language.** Default to **English** — that's this tool's distribution language. But if the user has clearly been working in another language (their CLAUDE.md and sessions are predominantly in, say, Korean), write the *whole* report in that language. One language per report — never mix the two.

```
claude-rx — <CLAUDE.md path> (N sessions analyzed)

Your X rules → 🔧 a promote · ✍️ b reword · 🗑️ c delete · ⚪ d observe · ✅ e keep

🔧 Promote to a hook (machine-checkable + violated)
   <rule text>   — violated v/applied

✍️ Strengthen the wording (subjective + keeps breaking)
   <rule text>   — violated v/applied
   ↳ evidence: "<exact quote>"  (session <id>)

🗑️ Safe to delete (strong evidence it's dead — meets the step-4 bar)
   <rule text>

⚪ Didn't come up (na only — sample may be too small to call it dead)
   <rule text>

✅ Holding up (followed wherever it applied)
   <rule text>   — pass p/applied
   ↳ evidence: "<exact quote>"  (session <id>)
```

Every violation line MUST carry an evidence quote and its session id. That's the honesty contract — the user can verify each call for themselves. A prescription without evidence is just an opinion.

## Honest limitation (state it, don't hide it)

Machine checks look at *executed Bash commands*, not chat text. But if a session merely *discusses* a forbidden command — e.g. you and the user talking about `git push --force`, or a doc that contains the string — it can still false-positive, because fully resolving "mentioned vs. executed" needs real shell parsing. So: if a machine violation's evidence is clearly just *talk about* the command rather than a real execution, downgrade it to a likely false positive instead of reporting it as a real violation. This honesty is the point of linking every prescription back to evidence.
