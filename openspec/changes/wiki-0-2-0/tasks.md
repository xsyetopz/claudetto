# Tasks

## 1. Claude Code 2.1.303 (Part 2)

- [x] 1.1 Draft the architecture and runtime pages of W2: `Claude-Code` to `Claude-Code-Sessions-And-Storage`, plus `Claude-Code-CLI`, `Claude-Code-Env-Vars`.
- [x] 1.2 Draft the extension pages of W2: settings, permissions, hooks, memory, output styles, status line, tools, subagents, skills, plugins, Mod API, MCP.
- [x] 1.3 Review a sample of facts of each page against the bundle and the docs, and fix each error.
- [x] 1.5 Probe each gate and env var that a draft names with no known effect, on a vanilla `2.1.303` with no login:
  a separate `CLAUDE_CONFIG_DIR`, a fake `ANTHROPIC_API_KEY`, and `ANTHROPIC_BASE_URL` set to a local stub of the Messages API that records each request and sends scripted replies.
  Record the method and each result in an evidence page, and fix the marks and the text of the drafts.
  A probe that needs the real API is a paid run: ask the user first.
- [ ] 1.6 Probe again, as a subscriber, the vars that showed no effect in 1.5: the stub sends each account and flag request to the real API with `CLAUDE_CODE_OAUTH_TOKEN` from `.env` (the user, 2026-10-19), and it still answers each `/v1/messages` call itself, so no model call is made.
  The stub never logs or prints the token. A probe that needs a real model reply is a paid run: ask the user first.
- [ ] 1.4 Write `Claude-Code-Undocumented`, move the drafts to `src/wiki/claude-code/`, remove the old `wiki/claude-code/` pages.
  Check: `just generate && bun run lint:md && bun test tests/support/wiki-links.test.ts`

## 2. claudetto 0.2.0+ (Part 1)

- [x] 2.1 Move each hand-edited page of `wiki/` to `src/wiki/claudetto/`, keep only pages that are true for 0.2.0, and give one page to each slice and add-on (`release-0-2-0` 10.4).
- [x] 2.2 Move each cited fact of `docs/research/` and `wiki/archive/` that a page still needs to an evidence page, then remove both folders.
- [x] 2.3 Remove each mention of `dotclaude` (`release-0-2-0` 2.3).
  Check: `! git grep -qi dotclaude -- ':!openspec' ':!CHANGELOG.md'`
- [ ] 2.4 Write `Home.md` and `_Sidebar.md` for the two parts.
  Check: `just docker check`
- [ ] 2.5 Rewrite each page of both parts to W3 and W5: Simple English Wikipedia look, no internal ids, ✅ and ❌ for yes and no.
  Check: `just docker check` and `! grep -rqE '\bD[0-9]+\b' src/wiki`
- [ ] 2.6 Ask the user before `just wiki`, because it pushes to the public wiki.
