# Tools Requirements

claudetto shapes the tool pool every request carries, because each tool's schema and description is resent with every request and each call is a model turn. Claude Code 2.1.330 vanilla sends 31,215 bytes of tools in a `-p hi` request (cc-inspect cli, fake API, 2026-11-21). The 2026-11-21 user ruling sets the pool: Write, Edit and NotebookEdit give way to one `patch` tool; WebSearch and WebFetch give way to claudetto's own `web_search` and `web_fetch`; SendMessage is off; Monitor, TaskStop and the task-list tools stay, trimmed; every kept tool's description is at most 200 characters. A cut ships only with a check that measures it (ADR-0177); the system prompt and output style name the tools that replace the removed ones.

## Pool

- [ ] **REQ-TOOLS-001** claudetto shall keep Write, Edit, NotebookEdit and SendMessage from every model loop through `tool.offer` `{ isOffered: false }`, alongside the existing deny list (Workflow, ScheduleWakeup, ReportFindings, Cron*, EnterPlanMode).
  Acceptance: a `-p` request with claudetto loaded lists none of them, a subagent's request lists none of them, and the request's tool bytes are measured before and after. Verification: test; probe.

- [ ] **REQ-TOOLS-002** claudetto shall decide ListAgents, EnterWorktree and ExitWorktree on measured cost: the tool bytes each adds per request against the calls and bytes the Bash or Agent-isolation path takes for the same job.
  Acceptance: a report gives both numbers per tool and the decision (off, or kept with a description of at most 200 characters). Verification: probe.

- [ ] **REQ-TOOLS-003** claudetto shall describe each kept built-in tool in at most 200 characters through `tool.describe`, keeping the facts a model needs to call it right (Bash, Read, Glob, Grep, Agent, Skill, ToolSearch, AskUserQuestion, Monitor, TaskStop, TodoWrite, TaskCreate, TaskGet, TaskList, TaskUpdate, ExitPlanMode, ListAgents if kept).
  Acceptance: a test renders each description and asserts the length; the request's tool bytes are measured before and after; a trivial and a feature eval show no lower score. Verification: test; eval.

## Patch

- [ ] **REQ-TOOLS-010** claudetto shall register one `patch` tool that creates, replaces, edits and deletes files, many files and hunks per call, in a context-anchored format with no line numbers, so an edit carries its unchanged context once instead of in both `old_string` and `new_string`.
  Acceptance: tests cover add, update with several hunks, delete, move, a hunk whose context matches only after trailing-whitespace folding, a hunk whose context is missing or ambiguous (the whole patch is refused and nothing is written), a path outside the session directory refused, and the reply naming each file changed. Verification: test.

- [ ] **REQ-TOOLS-011** The output style shall tell the model to change files with `patch`, and claudetto's Edit fixes (tab strip, perl note) shall be kept only where they still apply.
  Acceptance: a feature eval and a trivial eval score no lower than with Edit and Write, and the turns and output tokens per run are reported. Verification: eval.

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

- [ ] **REQ-TOOLS-030** claudetto's output style shall be rebuilt from Claude Code 2.1.330's own system prompt and its Lean and Proactive styles (taking from Concise), sized at or under the default Proactive style, and name `patch`, `web_fetch` and `web_search` where the stock text names the tools they replace.
  Acceptance: the 2.1.330 stock texts are saved with their sizes, the new style's size is reported against them, and the feature and trivial evals score no lower. Verification: probe; eval.
