# Cost Requirements

## Usage Guard

## Budget Line

## Status Line

- [ ] **REQ-COST-003** claudetto shall print the status line from stdin JSON plus byte-capped reads of named local files (`.git/HEAD`, openspec tasks.md, session window/theme file, transcript tail 256 KiB + first 64 bytes of heartbeat), with no network, no model call and no child process.
  Acceptance: Non-JSON stdin prints `claudetto: no status`; it always exits 0; width = `COLUMNS - 4` (80 when absent or not a positive integer); an unreadable file drops that part. Verification: test.
  Basis: cited. Status: have at 088a227c (statusline/main.ts:11 FALLBACK; plugins/claudetto/statusline/ holds input.ts, local.ts, width.ts).
  Source: openspec/specs/status-line/spec.md:8; openspec/specs/status-line/spec.md:36; openspec/specs/status-line/spec.md:431; plugins/claudetto/statusline/main.ts:11@088a227c.

- [ ] **REQ-COST-004** claudetto shall render the status line with no model call, with segments laid one after another and separated by ` · ` (rows: place, session, limits, cache; at most 4 rows, filled as needed, not 4 fixed rows; countdowns when rows do not suffice). Model part `❖ <name> <effort> think fast`. PR part `⇄ #12 approved`, or `⇄ !12` for `pr.kind` `mr`, with `pr.review_state` after the number, painted `success`, `warning`, `error` or `inactive` for `approved`, `pending`, `changes_requested` or `draft`, `warning` for any other state, and nothing when the number is absent. Cost `$N.NN` and `+added -removed`, with dollars hidden while `rate_limits` reports five_hour or seven_day (subscription: client-side estimate). Limits 5h, 7d and spend as `◷ <label> <pct>%` with the usage gradient green to 20%, amber at 60%, red from 90%; spend part `$used/$limit` with its period, no pace and a dim reset; for the 5h and 7d parts, once 3% of the window has passed, the pace `⇣N%` in `success` for a reserve or `⇡N%` in `warning` for a deficit (N = used% less elapsed%), `⏵<time>` for the projected run-out when use would pass 100% before reset, and `↻<time>` for a reset still in the future.
  Decision: ADR-0190, status line stays minimal (model, context, 5h/7d percent, cache).
  Acceptance: a lab test per row, colour band and pace marker; with few segments the line is one row, with many it spills to at most 4 rows and no row is empty; status-line tests cover the four PR states, an unknown state, an `mr` kind and no number; a part at 60% used with 30% of the window gone shows `⇡30%`, a `⏵` run-out before the reset and a `↻` reset; unreadable usage warns and fails open. Parse notes (reported, one author): a plan with no 5-hour window omits the field (not zero), the weekly percent is a whole number (estimate between points), polled usage goes stale after idle. Verification: test.
  Basis: cited. Status: have at 088a227c (plugins/claudetto/statusline/{segments,limits}.ts; `segments.ts:57` PR, `color.ts:130`, `limits.ts:17` `PACE_MIN_FRACTION = 0.03`, `icons.ts:9-11`, `segments.ts:150`; `git grep -E 'MAX_ROWS|ITEM_GAP' 088a227c` finds `rows.ts` laying items under MAX_ROWS with ITEM_GAP, so the fill-to-4-rows rule exists there).
  Source: openspec/specs/status-line/spec.md:337; openspec/specs/status-line/spec.md:341; openspec/specs/status-line/spec.md:365; openspec/specs/status-line/spec.md:383; openspec/specs/status-line/spec.md:387; plugins/claudetto/statusline/rows.ts@088a227c; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/4c68767f-62e8-43f8-a3c5-95dcd42c18d8.jsonl:1353 (user decision, 2026-11-09).

- [ ] **REQ-COST-006** claudetto shall write the `statusLine` command at the plugin root with `refreshInterval` 5, keep a user value, and never write `subagentStatusLine` (deprecated, a no-op in 2.1.323; `statusline/subagents.ts` goes). `/statusline` writes claudetto's line to user settings with no model call (0 requests, 32-53 ms against 3.99 s and 55,376 tokens); `/statusline <text>` swaps the built-in prompt through `skill.prompt`. Branch comes from stdin `worktree.branch`, else the HEAD of the repo (follow `.git` `gitdir:`), detached shows 7 hex. It paints the `dark` palette until the line file names a theme, unless `NO_COLOR`. It also shows remaining TTL per cache, a cold mark after 59 minutes since the last request start, billed cost, and per-agent state (working, waiting, blocked on approval, done) with a subagent task list and a usage monitor. One heartbeat clock serves the status line, compaction, and the price step.
  Acceptance: a setup write holds `refreshInterval: 5` and no `subagentStatusLine`; bare `/statusline` makes 0 model requests; a detached HEAD shows 7 hex. Verification: test.
  Basis: measured (probe, deprecated setting seen on claude 2.1.325) and reported. Status: partial at 088a227c (`plugins/claudetto/hooks/features/line-file/`, `plugins/claudetto/statusline/`). claude 2.1.326: `skill.prompt` present (code search `skill.prompt`, chunk-dafpvz32.js@4253 (2.1.327)); verified on 2.1.327: the `subagentStatusLine` setting is present and marked deprecated, "still works" (chunk-ja5z738t.js@257900; `command` @257944, `type` @257926; deprecation text chunk-dfwkett1.js@7698); `/statusline` is a prompt command (chunk-m14bt1pz.js@2538399), so the 2.1.326 "absent" finding was wrong.
  Source: openspec/specs/status-line/spec.md:47; openspec/specs/status-line/spec.md:128; plugins/claudetto/statusline/segments.ts:232@088a227c.

- [ ] **REQ-COST-008** claudetto shall show context against the window the session runs with, and that compaction runs against, not a fixed 1M: after each response a mod writes `context.breakdown.rawMaxTokens` from `$.session.usage({breakdown:"summary"})` (a local estimate, no request) to a session file under `.claude/claudetto/`; the status line reads it. No file: the part is left out.
  Acceptance: on a 1M model with `autoCompactWindow` 300000 and 100k input the line shows `ctx 33% of 300k`, not `ctx 10% of 1M`; a session limited to 300k shows 300k; stdin `context_window_size` is the model window and `used_percentage` is measured against it (2.1.319). The status line shows the context token count from stdin `total_input_tokens` and omits it without the session file. Verification: test.
  Basis: measured. Status: have at 088a227c (hooks/features/line-file/line-file.ts:18 holds `rawMaxTokens`; the statusline file was not re-read; `statusline/format.ts:10` formats `200k` or `1M`, so display of the session window is partial).
  Source: openspec/specs/status-line/spec.md:200; openspec/specs/status-line/spec.md:205; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/4c68767f-62e8-43f8-a3c5-95dcd42c18d8.jsonl:1353 (reported, user, 2026-11-09); observed in transcript, 2026-11-09 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/60a81b6a-7024-4fb4-9f19-6d79c0fd6d65.jsonl:11).

## Heartbeat and Window Files

- [ ] **REQ-COST-009** claudetto shall write clock time at each step to `.claude/claudetto/heartbeat/<session>.txt` and, each measured turn, `.claude/claudetto/statusline/<session>.json` with `window` (`rawMaxTokens` from the local summary breakdown, no request) and `theme` when the config has one, mapping each session-name character outside letters, digits, underscore and hyphen to `_` before the name becomes a file name.
  Acceptance: A failed write costs one refresh; a session name with `/` or a space yields a file name with `_` in place. Verification: test.
  Basis: cited. Status: partial at 088a227c (line-file.ts:18 reads rawMaxTokens; kernel/heartbeat.ts:6 replaces `/[^\w-]/gu` with `_` so the name rule is have; settled by `git grep -n -E 'rawMaxTokens|statusline/' 088a227c -- plugins`, which finds line-file.ts:18 and the test path `statusline/s-1.json`).
  Source: openspec/specs/run-limits/spec.md:274; openspec/specs/run-limits/spec.md:276; openspec/specs/status-line/spec.md:280; plugins/claudetto/hooks/features/line-file/line-file.ts:18@088a227c; plugins/claudetto/hooks/kernel/heartbeat.ts:6@088a227c.

## Price-Step Guard

## Budget Note After a Paid Run

## Window Budget

## Budget Text

## Cost Accounting From Transcripts

## Cache

- [ ] **REQ-COST-015** claudetto shall render the cache segment from stdin `prompt_cache`: `warm==true` shows time left to `expires_at` (unix s), the ttl, and `hit_ratio%` ("4m/5m 91%", success paint); `warm==false` shows "cold +120k" (`recache_tokens_if_cold`, plus hit ratio, inactive paint); an absent or non-boolean `warm`, or `caching_observed` false, shows nothing; a countdown that expired between refreshes shows "0s", never negative; a null expiry shows "warm" with the ttl. When `misses>0` and `last_miss_cause.causes` is a non-empty string[], it shows "miss: <first cause, `_` as space>" capped at 24 chars.
  Acceptance: each listed stdin shape renders the listed text. Verification: test.
  Basis: measured and cited (`/usage` "Prompt cache (main)" line in v2.1.251+, miss-cause naming in v2.1.260+). Status: have at 088a227c (`plugins/claudetto/statusline/segments.ts:232`).
  Source: openspec/specs/status-line/spec.md:128; plugins/claudetto/statusline/segments.ts:232@088a227c.

## Session-State View

## Context and Budget Display

- [ ] **REQ-COST-018** claudetto shall show context share, weekly and 5h limit percentages, the idle time since the last turn and cache time left in the status line, and show cold-cache resume cost at the current context size.
  Acceptance: the line shows both percentages and the idle time, so that cache expiry is visible (a long session consumed 27% of the weekly budget in one 5 h window); the user compacts while warm; a hook injects before each message a short block with remaining 5h and weekly limits, reset times, context fill, and a rule turning numbers into behaviour; a brake asks once near a limit and refuses at the edge; a hook that, past a context threshold, appends a focused compaction instruction at the end of responses. A 5-line skill that stops at 90% of the 5h window reportedly works. Claude Code has no model-callable compact (this install has `$.session.compact`). Verification: demonstration.
  Basis: reported, hook author and one replicating user. Status: partial at 088a227c (`plugins/claudetto/statusline/limits.ts`, `plugins/claudetto/hooks/features/budget/budget-run.ts`; context share line and cache countdown missing). claude 2.1.327: `/context` and `/usage` (chunk-271f7twe.js@1000-4200 command table), `$.session.usage` (chunk-dafpvz32.js@2968) and `$.session.compact` (chunk-ecn8g7cy.js@2843) present (code search); `/statusline` verified on 2.1.327 (chunk-m14bt1pz.js@2538399); `$.session.usage` and `$.session.compact` verified on 2.1.327 (claude-code.d.ts@139400, @141519).
  Source: external/2026-09-30/export-Claude can't see its own limits or context. Fix that, and it can work on its own for weeks.jsonl:13 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wt9ss3/>); external/2026-10-07/export-I don't remember a single 5 hour window using 27% of a weekly budget... this seems a bit extreme lat.jsonl:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wzpe0y/i_dont_remember_a_single_5_hour_window_using_27/>).

- [x] **REQ-COST-021** claudetto shall report a startup-context baseline: run the `/context` split in a fresh session, cut unused MCP servers, unused tools by `permissions.deny`, unused skills by `skillOverrides`, and measure per task type once.
  Verified: fake-API probe, claude 2.1.327, 2026-11-18, cc-inspect cli `-p /context`: prints Model, Tokens, and a category table (system prompt, skills, messages, free space, autocompact buffer) from count_tokens calls only, no model request; MCP tools, memory files and agents rows appear when present. `permissions.deny` and `skillOverrides` are vanilla settings.
  Acceptance: a baseline report lists system prompt, system tools, MCP tools, memory files, custom agents, messages. Reports: 66k start = system tools 35.6k + MCP 16.6k + skills 5.9k + system prompt 5.2k + MCP instructions 2.3k + memory 1.5k; other users 45k, 27k, 10-11k, 9.5-11.6k; a missing `.gitignore` leaked node_modules, cutting startup from about 40,000 chars to about 1,236; autocompact buffer about 33k; skill descriptions under about 200 chars. Reason: Haiku price steps above 100k. Verification: demonstration.
  Basis: reported. Status: partial at 088a227c (`plugins/claudetto/hooks/features/hygiene/`, `budget-run.ts`; baseline report missing). claude 2.1.327: `/context` and `/skill-doctor` present (chunk-271f7twe.js@1000-4200 command table); `/doctor` verified on 2.1.327 (prompt command, alias `checkup`, chunk-3z330av7.js@165730).
  Source: external/2026-10-12/export-claude code 66k system prompt.jsonl:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x0fli2/claude_code_66k_system_prompt/>); external/please-use-me-often/agent-failure-dossier/judged/cache.jsonl:59; external/please-use-me-often/agent-failure-dossier/judged/setting.jsonl:8.

## Decider

## Decision Log And Plan

## Measuring Cost

## Cache and Token Use

- [x] **REQ-COST-037** claudetto shall never switch the model mid-conversation: a switch rereads the whole session uncached because the cache is per model; `--model opusplan` and plan mode change only the top-level `model` (measured on CC 2.1.316); keep context under 500k even with 1M.
  Verified: grep of plugins/claudetto/hooks, claude 2.1.327, 2026-11-18, `grep -rn -E 'model[:=]|setModel' hooks`: no hit; the only model call is `$.model.fork({prompt, effort})` at handover/writer.ts:42, which names no model and so runs on the session model. No claudetto code switches the model.
  Acceptance: no claudetto feature switches the model inside a session. The opusplan-then-Sonnet switch in one session was costly (reported); `/opusplan` called redundant now that subagent handoff works (reported opinion; not checkable locally because it judges usefulness). claude 2.1.327: the `opusplan` alias is in the model list (code search, chunk-jtw26wbb.js@963). Verification: inspection.
  Basis: measured (top-level `model` only), reported. Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xrutks-how-to-keep-costs-down-20261110T100242Z.md:57 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xrutks/how_to_keep_costs_down/>); external/please-use-me-often/agent-failure-dossier/judged/setting.jsonl:20.

- [ ] **REQ-COST-040** claudetto shall hold a consistent prompt-cache hit rate of 98-99%.
  Decision: ADR-0190, kept as the cache-hit check in place of a transcript cost report.
  Acceptance: measured hit rate over a run is 98% or more. Verification: probe.
  Basis: user decision. Status: missing at 088a227c (`tools/bench/report.ts:130-142` reports cache hit per benchmark run, a measure outside the plugin; no plugin check holds 98%).
  Source: user decision, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10408); user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12).

## Cache and Tokens

- [x] **REQ-COST-042** claudetto shall avoid re-reading unchanged files.
  Verified: cc-inspect code search, claude 2.1.327, 2026-11-18, "File unchanged since last read": vanilla Read returns "File unchanged since last read. The content from the earlier Read tool_result in this conversation is still current" (chunk-krf585s9.js@973), so a second Read of an unchanged file is served short with no claudetto code.
  Acceptance: a second Read of an unchanged file in one session is refused or served short. Verification: test.
  Basis: reported. Status: partial at 088a227c (features/repeat; see risk on withheld Read).
  Source: reported, user, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10408).

## Paid Calls

- [ ] **REQ-COST-043** claudetto shall make the agent ask the user before a paid run, state the cost, and do free work only once 25% of the seven-day limit is used.
  Acceptance: no paid arm runs without an answer. Verification: demonstration.
  Basis: user decision. Status: partial at 088a227c (plugins/claudetto/hooks/features/budget/budget-run.ts:9 says to report the budget after a paid run; `git grep -n "25%" 088a227c -- CLAUDE.md plugins` finds no 25% free-work rule and no enforced ask).
  Source: user goal set through `/goal`, 2026-11-16 06:24 UTC, past 25 percent of the seven-day limit, free work only (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:11); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (handoff Next: paid rounds, ask first, report cost and weekly share after); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:3175 (round 6 cost reported to the user).

- [x] **REQ-COST-047** claudetto shall cut context only by dropping repeated content after the cached prefix (re-reads, repeated tool output), and shall never minify, dedent or rewrite a file the agent reads to edit.
  Verified: grep of plugins/claudetto/hooks, claude 2.1.327, 2026-11-18, `grep -rn -E 'tool\.result|tool\.call' hooks`: no hit; the registered modules (builtins, handover compact/renewal/clear) touch no Read result and add no text before the cache breakpoint.
  Acceptance: no hook transforms a `Read` result of a source file; a token-saving hook changes no byte before the last cache breakpoint, shown by an unchanged prefix in a captured request. Verification: test.
  Basis: cited (arXiv:2606.01326: dedent and identifier shortening cut resolved tasks from 46% to 36% and from 47% to 27%; the paper counts input tokens only, so its savings ignore cache reads). Status: missing at 088a227c.
  Source: reports/2026-11-18-research/papers.md P5 implications 1 and 3; https://arxiv.org/pdf/2606.01326.

- [x] **REQ-COST-048** claudetto shall return a hook or tool result that fits under Claude Code's inline limit in the reply itself, and shall not write it to a file the agent must read back.
  Verified: grep of plugins/claudetto/hooks, claude 2.1.327, 2026-11-18, `grep -rn -E 'writeFile|appendFile|mkdir' hooks`: no hit; the one `$.fs.write` (builtins/builtins.ts:55) repairs user settings, and handover returns text through `prompt.context`, not a file.
  Acceptance: no claudetto hook writes a result file under 4,000 characters for the agent to read; the old file handoff stays removed (REQ-HANDOVER-023). Verification: test.
  Basis: cited (arXiv:2605.15184: moving small results to files cut one harness and model pair from 93.1 to 55.2; one run). Status: missing at 088a227c.
  Source: reports/2026-11-18-research/papers.md P7 implication 2; https://arxiv.org/pdf/2605.15184.
