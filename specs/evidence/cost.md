# Cost Requirements

## Usage Guard

## Budget Line

## Status Line

## Heartbeat and Window Files

## Price-Step Guard

## Budget Note After a Paid Run

## Window Budget

## Budget Text

## Cost Accounting From Transcripts

## Cache

## Session-State View

## Context and Budget Display

- [x] **COST-021** Moved Out as OUT-2950: not built and no measured check shows a claudetto baseline report beats vanilla `/context` (ADR-0177).
  Verified: claude 2.1.329 pin, inspection of main at b6e9cb49c, 2026-11-24: the 2.1.329 binary carries the built-in `context` command ("Show what fills the context", `binary/bgrep.ts` on ~/.local/share/claude/versions/2.1.329), and plugins/claudetto holds no baseline report, so vanilla covers the split.

## Decider

## Decision Log and Plan

## Measuring Cost

## Cache and Token Use

- [x] **COST-037** claudetto shall never switch the model mid-conversation: a switch rereads the whole session uncached because the cache is per model; `--model opusplan` and plan mode change only the top-level `model` (measured on CC 2.1.316); keep context under 500k even with 1M.
  Verified: grep of plugins/claudetto/hooks, claude 2.1.327, 2026-11-18, `grep -rn -E 'model[:=]|setModel' hooks`: no hit; the only model call is `$.model.fork({prompt, effort})` at handover/writer.ts:42, which names no model and so runs on the session model. No claudetto code switches the model.
  Acceptance: no claudetto feature switches the model inside a session. The opusplan-then-Sonnet switch in one session was costly (reported); `/opusplan` called redundant now that subagent handoff works (reported opinion; not checkable locally because it judges usefulness). claude 2.1.327: the `opusplan` alias is in the model list (code search, chunk-jtw26wbb.js@963). Verification: inspection.
  Basis: measured (top-level `model` only), reported. Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xrutks-how-to-keep-costs-down-20261110T100242Z.md:57 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xrutks/how_to_keep_costs_down/>); external/please-use-me-often/agent-failure-dossier/judged/setting.jsonl:20.
  Verified: PASS: no model switch in plugins; only model.fork in handover/writer.ts; agents pin models. Binary 2.1.327, 2026-11-19, re-checked from the B-setup report.
  Verified: inspection, 2026-11-24, claude 2.1.329: no hook or setting in plugins/claudetto switches the model.

- [x] **COST-040** Moved Out as OUT-2353: the item needs a paid model run.
  Verified: claude 2.1.329, 2026-11-24, probe (`reports/2026-11-24-research/pin-2-1-329/cache/cache.ts` over the Sonnet 5.5 ask and conduct runs): plugin requests after the first read 96.8% to 99.2% from cache; the first request's 0% came from runs started together, and of two plugin sessions run in sequence the second read all 16,396 prefix tokens from cache (`cache/results.txt`), so no cache fault is open.

## Cache and Tokens

- [x] **COST-042** Moved Out as OUT-3051: ADR-0177: vanilla 2.1.327 already serves a second Read of an unchanged file short ("File unchanged since last read", present in the 2.1.327 binary, checked 2026-11-19), so claudetto adds no code.
  Verified: 2026-11-24, claude 2.1.329 binary (`reports/2026-11-24-research/pin-2-1-329/binary/result.txt`): the string "File unchanged since last read. The content from the earlier Read tool_result in this conversation is still current" is present, so vanilla still serves the short second Read.

## Paid Calls

- [x] **COST-047** claudetto shall cut context only by dropping repeated content after the cached prefix (re-reads, repeated tool output), and shall never minify, dedent or rewrite a file the agent reads to edit.
  Verified: grep of plugins/claudetto/hooks, claude 2.1.327, 2026-11-18, `grep -rn -E 'tool\.result|tool\.call' hooks`: no hit; the registered modules (builtins, handover compact/renewal/clear) touch no Read result and add no text before the cache breakpoint.
  Acceptance: no hook transforms a `Read` result of a source file; a token-saving hook changes no byte before the last cache breakpoint, shown by an unchanged prefix in a captured request. Verification: inspection.
  Decision: no claudetto hook reads or rewrites a tool result, so there is no transform to test; the inspection is the registered hook list.
  Basis: cited (arXiv:2606.01326: dedent and identifier shortening cut resolved tasks from 46% to 36% and from 47% to 27%; the paper counts input tokens only, so its savings ignore cache reads). Status: missing at 088a227c.
  Source: reports/2026-11-18-research/papers.md P5 implications 1 and 3; <https://arxiv.org/pdf/2606.01326>.
  Verified: inspection 2026-11-19: the hook list printed by claude 2.1.327 plugin test plugins/claudetto registers no tool.result hook; classic.PostToolUse (handover/renewal.ts:38) only marks a commit as a task boundary and passes the event on unchanged, and grep of hooks/ for updatedToolOutput and tool.result finds no hit.
  Verified: inspection, 2026-11-24 (types of claude 2.1.329): no hook of the three plugins registers on a tool result or on Read; the only `tool.run` hooks serve the plugins' own MCP tools (spec_check, goal tools, patch, web_fetch, web_search).

- [x] **COST-048** claudetto shall return a hook or tool result that fits under Claude Code's inline limit in the reply itself, and shall not write it to a file the agent must read back.
  Verified: grep of plugins/claudetto/hooks, claude 2.1.327, 2026-11-18, `grep -rn -E 'writeFile|appendFile|mkdir' hooks`: no hit; the one `$.fs.write` (builtins/builtins.ts:55) repairs user settings, and handover returns text through `prompt.context`, not a file.
  Acceptance: no claudetto hook writes a result file under 4,000 characters for the agent to read; the old file handoff stays removed (HANDOVER-023). Verification: inspection.
  Decision: claudetto writes no result file, so there is no write to test; the inspection is a search of the hooks for file writes.
  Basis: cited (arXiv:2605.15184: moving small results to files cut one harness and model pair from 93.1 to 55.2; one run). Status: missing at 088a227c.
  Source: reports/2026-11-18-research/papers.md P7 implication 2; <https://arxiv.org/pdf/2605.15184>.
  Verified: inspection 2026-11-19: grep of plugins/claudetto/hooks for fs.write, writeFile and appendFile finds only the settings fill; no hook writes a result file.
  Verified: inspection, 2026-11-24, claude 2.1.329: `web_fetch` returns its text inline and saves only a copy for paging.

- [x] **COST-049** claudetto shall send each model request at effort medium or lower, and shall raise no request.
  Acceptance: a step the session sends at high, xhigh or max reaches the engine at medium; a step at low or medium,
  a numeric budget and a step with no level reach it unchanged; on `just eval claudetto` the plugin arm scores at or
  above vanilla at a lower cost and in fewer turns. Verification: test and eval.
  Basis: measured (thinking is about 4,200 of 6,300 output tokens a claudetto run on the eval suite; RISK-553).
  Decision: the cap is a `turn.step` hook (hooks/effort/step.ts). Haiku 5.5 takes effort per message, so the level on
  the step with the user's input holds for the turn (`reports/2026-11-26-research/step-effort/probe.ts`).
  Source: RISK-553; user decision 2026-11-25 (step effort: adaptive, measured).
  Status: done 2026-11-26.
  Verified: 2026-11-26, claude 2.1.329, `claude plugin test plugins/claudetto`: 438 pass, 0 fail, with
  `hooks/effort/__tests__/step.test.ts` driving `$.turn.step` at each level.
  Verified: 2026-11-26, claude 2.1.329, Haiku 5.5 high, `just eval claudetto -j 4`, run 2026-11-25T22-10-32-289Z,
  23 cases x 3 runs per arm (correction-opener left out: its vanilla runs ended on autocompact thrashing): plugin
  mean score 0.93, cost $0.40, 421 turns; vanilla 0.82, $1.64, 535 turns. The uncapped plugin on the same suite
  (run 2026-11-25T21-46-31-261Z) took $0.55 and 535 turns at 0.95.
