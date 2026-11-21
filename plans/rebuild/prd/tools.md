# Tools Requirements

claudetto shapes the tool pool every request carries, because each tool's schema and description is resent with every request and each call is a model turn. Claude Code 2.1.330 vanilla sends 29,825 characters of tools in a `-p hi` request (tools/measure-tools.ts, fake API, 2026-11-21; the earlier 31,215 was not reproduced, see reports/2026-11-21-tool-bytes). The 2026-11-21 user ruling sets the pool: Write, Edit and NotebookEdit give way to one `patch` tool; WebSearch and WebFetch give way to claudetto's own `web_search` and `web_fetch`; SendMessage is off; Monitor, TaskStop and the task-list tools stay, trimmed; every kept tool's description is at most 200 characters. A cut ships only with a check that measures it (ADR-0177); the system prompt and output style name the tools that replace the removed ones.

## Pool

- [x] **REQ-TOOLS-001** claudetto shall keep Write, Edit, NotebookEdit and SendMessage from every model loop through `tool.offer` `{ isOffered: false }`, alongside the existing deny list (Workflow, ScheduleWakeup, ReportFindings, Cron*, EnterPlanMode).
  Acceptance: a `-p` request with claudetto loaded lists none of them, a subagent's request lists none of them, and the request's tool bytes are measured before and after. Verification: test; probe.
  Status: done at 6b2fb4a34 for the `tool.offer` hook and its test (`claude plugin test plugins/claudetto`: 170 pass, 2026-11-21); the hook now lives in `hooks/pool/offer.ts`, and the probe ran after the last change (2026-11-21).
  Verified: PASS: `hooks/pool/__tests__/offer.test.ts` hides the set in the main loop and a subagent's; probe: `tools/measure-tools.ts` against a fake API shows none of the four in the main or the subagent request, and the tool bytes before and after (reports/2026-11-21-tool-bytes/README.md).

- [x] **REQ-TOOLS-002** claudetto shall decide ListAgents, EnterWorktree and ExitWorktree on measured cost: the tool bytes each adds per request against the calls and bytes the Bash or Agent-isolation path takes for the same job.
  Acceptance: a report gives both numbers per tool and the decision (off, or kept with a description of at most 200 characters). Verification: probe.
  Status: done (2026-11-21): ListAgents off, EnterWorktree and ExitWorktree kept at 177 and 188 characters.
  Verified: PASS: probe in reports/2026-11-21-tool-bytes/README.md gives the tool bytes per tool; `hooks/pool/__tests__/offer.test.ts` covers the decisions. Not measured: the calls and bytes of the Bash path for the same job, which is reasoned only.

- [ ] **REQ-TOOLS-003** claudetto shall describe each kept built-in tool in at most 200 characters through `tool.describe`, keeping the facts a model needs to call it right (Bash, Read, Glob, Grep, Agent, Skill, ToolSearch, AskUserQuestion, Monitor, TaskStop, TodoWrite, TaskCreate, TaskGet, TaskList, TaskUpdate, ExitPlanMode, ListAgents if kept).
  Acceptance: a test renders each description and asserts the length; the request's tool bytes are measured before and after; a trivial and a feature eval show no lower score. Verification: test; eval.
  Status: partial (2026-11-21): 16 descriptions in `hooks/pool/describe.ts`; the eval leg is open. Glob and Grep do not exist in 2.1.330, and Bash renders at 915 characters because the claudetto git block follows the 199-character base.
  Verified: PASS: `hooks/pool/__tests__/describe.test.ts` asserts at most 200 characters per description; probe: default-mode tool bytes 16,730 to 8,887 and tools-upfront 43,131 to 24,443 (reports/2026-11-21-tool-bytes/README.md).

## Patch

- [x] **REQ-TOOLS-010** claudetto shall register one `patch` tool that creates, replaces, edits and deletes files, many files and hunks per call, in a context-anchored format with no line numbers, so an edit carries its unchanged context once instead of in both `old_string` and `new_string`.
  Acceptance: tests cover add, update with several hunks, delete, move, a hunk whose context matches only after trailing-whitespace folding, a hunk whose context is missing or ambiguous (the whole patch is refused and nothing is written), a path outside the session directory refused, and the reply naming each file changed. The reply also carries, once per session, the text of the path-scoped rules (`paths` globs, project rules relative to the directory holding `.claude`, user rules relative to the primary cwd) and the nested CLAUDE.md or CLAUDE.local.md that match a patched file, with frontmatter and block comments stripped, because Claude Code loads those only for Read, Write and Edit (ENGINE v2.1.330); a patch to `src/api/x.ts` appends the matching rule once, not again, and not a non-matching rule. Verification: test.
  Status: done at 6b2fb4a34 (`claude plugin test plugins/claudetto`: 170 pass, 2026-11-21). The tool is `mcp__claudetto__patch`, not deferred, description under 200 characters; `tool.check` folds the Edit and Write verdicts for every path, so their deny and ask rules hold.
  Verified: PASS: the three test files under `hooks/patch/__tests__/`; `bun check -p plugins/claudetto`, `just typescript::lint plugins/claudetto`, `claude plugin validate plugins/claudetto --strict` and `tools/check-catch.sh plugins/claudetto` clean, 2026-11-21.

- [ ] **REQ-TOOLS-011** The output style shall tell the model to change files with `patch`, and claudetto's Edit fixes (tab strip, perl note) shall be kept only where they still apply.
  Acceptance: a feature eval and a trivial eval score no lower than with Edit and Write, and the turns and output tokens per run are reported. Verification: eval.
  Status: partial at 6b2fb4a34: the tab strip is removed with Edit (REQ-EDIT-003 superseded) and the perl note stays; the output style text and the eval are pending.

## Web

- [x] **REQ-TOOLS-020** claudetto shall register `web_fetch` that fetches a URL directly, turns HTML into compact Markdown of the main content, falls back to a headless Chrome render when the direct fetch fails or the page needs JavaScript, and opens a visible Chrome for the user when a captcha blocks, saving the cookies for later fetches.
  Acceptance: tests with local fixture pages cover the direct path, the size cap with a saved full copy, the fallback, and the cookie reuse; WebFetch is not offered. Verification: test.
  Basis: ruled (2026-11-21 user ruling: claudetto ships its own web_fetch and web_search). Status: done at 68c0fe623 (`claude plugin test plugins/claudetto`: 201 pass, 2026-11-21).
  Verified: tests on local fixture pages (extraction, size cap with saved copy and offset paging, fallback on 403, 429, 503, a failed request and a JS shell, challenge detection, per-host cookie jar, offer refusal); live probe 2026-11-21: `fetchPage` on `https://example.com` returned 174 characters of Markdown by the direct path with no Chrome render. The captcha window is covered by a scripted Chrome in tests, not run live.

- [x] **REQ-TOOLS-021** claudetto shall register `web_search` that returns titles, URLs and snippets for a query without an API key, and uses a configured search API when one is set.
  Acceptance: a parser test on a saved results page; WebSearch is not offered. Verification: test.
  Basis: ruled (2026-11-21 user ruling). Status: done at 68c0fe623 (`claude plugin test plugins/claudetto`: 201 pass, 2026-11-21).
  Verified: parser test on a hand-written DuckDuckGo results fixture, Brave API tests with a stub, offer refusal; live probe 2026-11-21: `searchWeb("bun runtime")` returned 4 results (1,531 characters) from DuckDuckGo by plain request, with no Chrome render. An earlier probe the same day got DuckDuckGo's 202 bot check, so the render and key paths remain the fallback.

## Prompt

The system prompt and the output style are separate surfaces with separate hooks, so each gets its own requirement. Placement follows Claude Code's docs (code.claude.com/docs/en/output-styles, /memory, /agent-sdk/modifying-system-prompts; clawdipedia how-it-works/system-prompt, 2.1.330):

| Surface | Holds | Reaches | Where the request carries it | Plugin lever |
| --- | --- | --- | --- | --- |
| System prompt | harness rules: tools, permissions, safety, task conduct | every loop; subagents have their own | `system[2]`; Opus and Sonnet 5.5 get the short `lean_body` (~5.7k chars) | `prompt.compose` (all sections, `lean_body` included), `prompt.section` (session sections only) |
| Output style | voice, length, format, role for every response | main loop and forks, not other subagents | a `system`-role entry in `messages[]` | `output-styles/*.md`, `force-for-plugin: true`; `keep-coding-instructions` does nothing on the short prompt |
| CLAUDE.md | project facts held every session: commands, conventions, layout | every loop that loads instruction files | first user message, `claudeMd` block | `prompt.context` (`blocks`, `instructionFiles`) |
| `.claude/rules/*.md` | one topic per file; `paths:` scopes it to matching files | as CLAUDE.md; a scoped rule loads on a Read, Write or Edit of a match | as CLAUDE.md | `prompt.context`; `patch` loads scoped rules itself (REQ-TOOLS-010) |
| Hooks | what must happen every time | the loops they fire in | tool results, `additionalContext`, reminders | `tool.*`, `prompt.attachment`, `classic.*` |
| Skills | one kind of task, loaded on use | on invocation or match | a skill listing, then the body | `skill.prompt` |

- [ ] **REQ-TOOLS-030** claudetto shall rewrite the system prompt through `prompt.compose`: replace `lean_body`, and in the full prompt the `tools` section, with text that names `patch`, `web_fetch` and `web_search` where the stock text names the tools they replace, drop rules for tools that are off, and keep every safety and permission rule.
  Acceptance: the 2.1.330 stock sections are saved with their sizes, a `-p` capture shows the rewritten body and its size against stock, the shared sections stay ahead of session ones (cache), and the feature and trivial evals score no lower. Verification: test; probe; eval.

- [ ] **REQ-TOOLS-031** claudetto's output style shall hold only voice, length, format and the claudetto reporting rules, sized at or under the stock Proactive style plus those rules, built from the Proactive and Concise styles; tool recipes move to the system prompt (REQ-TOOLS-030) or hooks, and project facts stay out (CLAUDE.md).
  Acceptance: the stock Proactive and Concise texts are saved with their sizes, the new style's size is reported against them, `keep-coding-instructions` is set only if a full-prompt model needs it, and the feature and trivial evals score no lower. Verification: probe; eval.

- [ ] **REQ-TOOLS-032** claudetto shall place each instruction it ships on the surface the table names: every line in the output style, agents, skills and hook texts is checked against it, and a line on the wrong surface moves.
  Acceptance: a report lists each moved line with its old and new surface. Verification: inspection.
