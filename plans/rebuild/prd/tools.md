# Tools Requirements

claudetto shapes the tool pool every request carries, because each tool's schema and description is resent with every request and each call is a model turn. Claude Code 2.1.330 vanilla sends 31,215 bytes of tools in a `-p hi` request (cc-inspect cli, fake API, 2026-11-21). The 2026-11-21 user ruling sets the pool: Write, Edit and NotebookEdit give way to one `patch` tool; WebSearch and WebFetch give way to claudetto's own `web_search` and `web_fetch`; SendMessage is off; Monitor, TaskStop and the task-list tools stay, trimmed; every kept tool's description is at most 200 characters. A cut ships only with a check that measures it (ADR-0177); the system prompt and output style name the tools that replace the removed ones.

## Pool

- [x] **REQ-TOOLS-001** claudetto shall keep Write, Edit, NotebookEdit and SendMessage from every model loop through `tool.offer` `{ isOffered: false }`, alongside the existing deny list (Workflow, ScheduleWakeup, ReportFindings, Cron*, EnterPlanMode).
  Acceptance: a `-p` request with claudetto loaded lists none of them, a subagent's request lists none of them, and the request's tool bytes are measured before and after. Verification: test; probe.
  Status: done at 6b2fb4a34 for the `tool.offer` hook and its test (`claude plugin test plugins/claudetto`: 170 pass, 2026-11-21); the `-p` request listing and the tool-bytes measurement were not run.
  Verified: PASS: `hooks/patch/__tests__/guards.test.ts` hides the four in the main loop and a subagent's through `$.tool.offer` and keeps Bash, Read and patch; the probe leg is pending.

- [ ] **REQ-TOOLS-002** claudetto shall decide ListAgents, EnterWorktree and ExitWorktree on measured cost: the tool bytes each adds per request against the calls and bytes the Bash or Agent-isolation path takes for the same job.
  Acceptance: a report gives both numbers per tool and the decision (off, or kept with a description of at most 200 characters). Verification: probe.

- [ ] **REQ-TOOLS-003** claudetto shall describe each kept built-in tool in at most 200 characters through `tool.describe`, keeping the facts a model needs to call it right (Bash, Read, Glob, Grep, Agent, Skill, ToolSearch, AskUserQuestion, Monitor, TaskStop, TodoWrite, TaskCreate, TaskGet, TaskList, TaskUpdate, ExitPlanMode, ListAgents if kept).
  Acceptance: a test renders each description and asserts the length; the request's tool bytes are measured before and after; a trivial and a feature eval show no lower score. Verification: test; eval.

## Patch

- [x] **REQ-TOOLS-010** claudetto shall register one `patch` tool that creates, replaces, edits and deletes files, many files and hunks per call, in a context-anchored format with no line numbers, so an edit carries its unchanged context once instead of in both `old_string` and `new_string`.
  Acceptance: tests cover add, update with several hunks, delete, move, a hunk whose context matches only after trailing-whitespace folding, a hunk whose context is missing or ambiguous (the whole patch is refused and nothing is written), a path outside the session directory refused, and the reply naming each file changed. The reply also carries, once per session, the text of the path-scoped rules (`paths` globs, project rules relative to the directory holding `.claude`, user rules relative to the primary cwd) and the nested CLAUDE.md or CLAUDE.local.md that match a patched file, with frontmatter and block comments stripped, because Claude Code loads those only for Read, Write and Edit (ENGINE v2.1.330); a patch to `src/api/x.ts` appends the matching rule once, not again, and not a non-matching rule. Verification: test.
  Status: done at 6b2fb4a34 (`claude plugin test plugins/claudetto`: 170 pass, 2026-11-21). The tool is `mcp__claudetto__patch`, not deferred, description under 200 characters; `tool.check` folds the Edit and Write verdicts for every path, so their deny and ask rules hold.
  Verified: PASS: the three test files under `hooks/patch/__tests__/`; `bun check -p plugins/claudetto`, `just typescript::lint plugins/claudetto`, `claude plugin validate plugins/claudetto --strict` and `tools/check-catch.sh plugins/claudetto` clean, 2026-11-21.

- [ ] **REQ-TOOLS-011** The output style shall tell the model to change files with `patch`, and claudetto's Edit fixes (tab strip, perl note) shall be kept only where they still apply.
  Acceptance: a feature eval and a trivial eval score no lower than with Edit and Write, and the turns and output tokens per run are reported. Verification: eval.
  Status: partial at 6b2fb4a34: the tab strip is removed with Edit (REQ-EDIT-003 superseded) and the perl note stays; the output style text and the eval are pending.

## Web

- [ ] **REQ-TOOLS-020** claudetto shall register `web_fetch` that fetches a URL directly, turns HTML into compact Markdown of the main content, falls back to a headless Chrome render when the direct fetch fails or the page needs JavaScript, and opens a visible Chrome for the user when a captcha blocks, saving the cookies for later fetches.
  Acceptance: tests with local fixture pages cover the direct path, the size cap with a saved full copy, the fallback, and the cookie reuse; WebFetch is not offered. Verification: test.

- [ ] **REQ-TOOLS-021** claudetto shall register `web_search` that returns titles, URLs and snippets for a query without an API key, and uses a configured search API when one is set.
  Acceptance: a parser test on a saved results page; WebSearch is not offered. Verification: test.

## Prompt

- [ ] **REQ-TOOLS-030** claudetto's output style shall be rebuilt from Claude Code 2.1.330's own system prompt and its Lean and Proactive styles (taking from Concise), sized at or under the default Proactive style, and name `patch`, `web_fetch` and `web_search` where the stock text names the tools they replace.
  Acceptance: the 2.1.330 stock texts are saved with their sizes, the new style's size is reported against them, and the feature and trivial evals score no lower. Verification: probe; eval.
