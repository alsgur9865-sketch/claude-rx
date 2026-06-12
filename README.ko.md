<p align="center">
  <img src="assets/banner.png" alt="claude-rx" width="640">
</p>

<p align="center">
  <img src="assets/demo.gif" alt="claude-rx 실행 화면 — 키 없이 한 번에 규칙 위반 5개 포착" width="760">
</p>

<p align="center">
  <a href="README.md">English</a> · <b>한국어</b>
</p>

# claude-rx

> 당신의 CLAUDE.md 규칙은 권고일 뿐이고 — Claude는 종종 그걸 무시합니다. **claude-rx**는 실제 Claude Code 세션 로그를 감사해 어떤 규칙이 *실제로* 지켜졌는지 보고, 각 규칙에 대해 **무엇을 할지 처방합니다.**

**퍼센트 보고서가 아닙니다. 처방전입니다.**

---

## 문제

CLAUDE.md는 계약이 아니라 위시리스트입니다. 규칙은 컨텍스트에 로드되지만 [Claude가 안정적으로 따르지 않고](https://github.com/anthropics/claude-code/issues/34132) — 규칙이 깊이 묻힐수록 compaction 과정에서 조용히 버려질 가능성이 큽니다. 오늘날 사람들은 위반을 세션마다 손으로 추적합니다.

## claude-rx가 하는 일

과거 Claude Code 세션을 읽고, 각 규칙에 대해 **무엇을 할지** 알려줍니다:

- 🔧 **hook으로 승격** — 기계검증이 가능한데 위반된 규칙 (예: `git push --force`). claude-rx는 *어떤* 규칙을 강제할 가치가 있는지 짚어주고, hook 자체는 Claude Code가 작성합니다.
- ⚪ **관망** — 이번 세션 묶음에선 나타나지 않은 규칙. "죽은" 게 아니라 표본이 작아 아직 판단할 수 없을 뿐이라, claude-rx는 멀쩡한 규칙을 지우라 하지 않고 보류합니다.
- ✍️ **표현 강화** — 자꾸 깨지는 주관적 규칙.

준수율 %는 각 처방의 근거일 뿐, 그 자체가 제품은 아닙니다.

## 빠른 시작 (API 키 불필요)

```bash
npx claude-rx
```

기본적으로 claude-rx는 **5개의 내장 기계검증** — force-push, `reset --hard`, `.env` 커밋, 하드코딩된 시크릿, 글로벌 설치 — 을 최근 세션에 돌립니다. **완전 무료, 키 불필요.**

```
claude-rx 처방 — ~/.claude/CLAUDE.md (세션 5개)

🔧 hook으로 올려라 (기계검증 + 위반)
   0%  no-force-push   (위반 1/NA 1)

규칙 5개 → 🔧1 / ✍️0 / ⚪0 / ✅4
```

## 더 깊은 분석 (자기 키 사용)

당신의 CLAUDE.md에 있는 **주관적** 규칙(예: "코딩 전 질문", "한국어로 답변")까지 감사하려면 claude-rx가 Claude Haiku를 judge로 씁니다. 자기 키를 제공하세요:

```bash
export ANTHROPIC_API_KEY=sk-ant-...     # mac / linux
$env:ANTHROPIC_API_KEY="sk-ant-..."     # windows powershell

npx claude-rx --path ~/.claude/CLAUDE.md
```

비용은 아주 작습니다 — Haiku, 관련 발췌만, 최근 세션만. 보통 **세션 20개에 커피 한 잔 값 이하**입니다. *당신의* 키이고 *당신의* 지출이며, claude-rx는 Anthropic API 외 어디로도 키를 보내지 않습니다.

> **프라이버시 안내:** API 키 모드에서는 세션 대화 발췌가 채점을 위해 Anthropic API로 전송됩니다. 생성되는 리포트(`claude-rx-report.md`)에는 대화 인용이 포함되므로 `.gitignore`에 추가하고 공개 저장소에 커밋하지 마세요.

## 작동 방식

하이브리드 채점:

- **기계검증** (무료) — 세션의 도구 실행을 파싱해 정규식으로 매칭합니다. 채팅에서 *말한* 것이나 소스 파일에 *쓴* 것이 아니라, *실제로 실행된* `Bash` 명령을 봅니다.
- **AI judge** (키 필요) — Haiku가 근거 우선 추론과 2단계 적용성 확인으로 관련 발췌를 읽고 `pass` / `violation` / `na` + 신뢰도를 반환합니다.

모든 판정은 근거 인용(세션 id + 발췌)을 달고 나와서 직접 검증할 수 있습니다.

## 한계 (정직하게)

측정은 휴리스틱이지 진리가 아닙니다. 예를 들어 명령 문자열을 파일에 써넣는 `cat`/heredoc은 여전히 오탐을 낼 수 있습니다(완전히 풀려면 셸 파싱이 필요). 바로 그래서 **모든 처방이 세션 근거로 다시 링크됩니다** — 믿되, 검증하세요.

## 옵션

| 플래그 | 기본값 | 의미 |
|---|---|---|
| `-p, --path <file>` | `~/.claude/CLAUDE.md` | 감사할 CLAUDE.md (키 모드) |
| `-c, --cwd <dir>` | 현재 디렉토리 | 세션을 분석할 프로젝트 |
| `-l, --limit <n>` | `20` | 최근 세션 수 |
| `-o, --out <file>` | `claude-rx-report.md` | 마크다운 리포트 경로 |
| `--lang <lang>` | `en` | 리포트 언어 (`en` 또는 `ko`) |
| `--json` | — | Claude Code 스킬이 사용하는 기계용 출력 — 채점 생략, 기계검증 처방 원자료 + 세션 발췌를 JSON으로 stdout 출력 (API 키 불필요) |

## 로드맵

- `--emit-hook <rule>` — 추천만이 아니라 hook 코드까지 생성
- 주관적 규칙 표현 제안 (judge가 위반 패턴을 읽고 규칙을 다시 씀)
- 저신뢰도 에스컬레이션 (Haiku → Sonnet), 미니 앙상블, 골든셋 캘리브레이션
- CI 통합 — PR마다 자동 감사

## 버전 정책

npm CLI(`claude-rx`)와 Claude Code 플러그인/스킬은 독립적으로 버전이 매겨집니다 — 현재 npm `0.1.1`, plugin `0.2.0`.

## 라이선스

MIT © 2026 MIN
