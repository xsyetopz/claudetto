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

- [x] **REQ-COST-021** Moved Out as OUT-2950: not built and no measured check shows a claudetto baseline report beats vanilla `/context` (ADR-0177).

## Decider

## Decision Log and Plan

## Measuring Cost

## Cache and Token Use

- [x] **REQ-COST-037** claudetto shall never switch the model mid-conversation: a switch rereads the whole session uncached because the cache is per model; `--model opusplan` and plan mode change only the top-level `model` (measured on CC 2.1.316); keep context under 500k even with 1M.
  Verified: grep of plugins/claudetto/hooks, claude 2.1.327, 2026-11-18, `grep -rn -E 'model[:=]|setModel' hooks`: no hit; the only model call is `$.model.fork({prompt, effort})` at handover/writer.ts:42, which names no model and so runs on the session model. No claudetto code switches the model.
  Acceptance: no claudetto feature switches the model inside a session. The opusplan-then-Sonnet switch in one session was costly (reported); `/opusplan` called redundant now that subagent handoff works (reported opinion; not checkable locally because it judges usefulness). claude 2.1.327: the `opusplan` alias is in the model list (code search, chunk-jtw26wbb.js@963). Verification: inspection.
  Basis: measured (top-level `model` only), reported. Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xrutks-how-to-keep-costs-down-20261110T100242Z.md:57 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xrutks/how_to_keep_costs_down/>); external/please-use-me-often/agent-failure-dossier/judged/setting.jsonl:20.
  Verified: PASS: no model switch in plugins; only model.fork in handover/writer.ts; agents pin models. Binary 2.1.327, 2026-11-19, re-checked from the B-setup report.

- [x] **REQ-COST-040** Moved Out as OUT-2353: the item needs a paid model run.

## Cache and Tokens

- [x] **REQ-COST-042** Moved Out as OUT-3051: ADR-0177: vanilla 2.1.327 already serves a second Read of an unchanged file short ("File unchanged since last read", present in the 2.1.327 binary, checked 2026-11-19), so claudetto adds no code.

## Paid Calls

- [x] **REQ-COST-047** claudetto shall cut context only by dropping repeated content after the cached prefix (re-reads, repeated tool output), and shall never minify, dedent or rewrite a file the agent reads to edit.
  Verified: grep of plugins/claudetto/hooks, claude 2.1.327, 2026-11-18, `grep -rn -E 'tool\.result|tool\.call' hooks`: no hit; the registered modules (builtins, handover compact/renewal/clear) touch no Read result and add no text before the cache breakpoint.
  Acceptance: no hook transforms a `Read` result of a source file; a token-saving hook changes no byte before the last cache breakpoint, shown by an unchanged prefix in a captured request. Verification: inspection.
  Decision: no claudetto hook reads or rewrites a tool result, so there is no transform to test; the inspection is the registered hook list.
  Basis: cited (arXiv:2606.01326: dedent and identifier shortening cut resolved tasks from 46% to 36% and from 47% to 27%; the paper counts input tokens only, so its savings ignore cache reads). Status: missing at 088a227c.
  Source: reports/2026-11-18-research/papers.md P5 implications 1 and 3; <https://arxiv.org/pdf/2606.01326>.
  Verified: inspection 2026-11-19: the hook list printed by claude 2.1.327 plugin test plugins/claudetto registers no tool.result hook; classic.PostToolUse (handover/renewal.ts:38) only marks a commit as a task boundary and passes the event on unchanged, and grep of hooks/ for updatedToolOutput and tool.result finds no hit.

- [x] **REQ-COST-048** claudetto shall return a hook or tool result that fits under Claude Code's inline limit in the reply itself, and shall not write it to a file the agent must read back.
  Verified: grep of plugins/claudetto/hooks, claude 2.1.327, 2026-11-18, `grep -rn -E 'writeFile|appendFile|mkdir' hooks`: no hit; the one `$.fs.write` (builtins/builtins.ts:55) repairs user settings, and handover returns text through `prompt.context`, not a file.
  Acceptance: no claudetto hook writes a result file under 4,000 characters for the agent to read; the old file handoff stays removed (REQ-HANDOVER-023). Verification: inspection.
  Decision: claudetto writes no result file, so there is no write to test; the inspection is a search of the hooks for file writes.
  Basis: cited (arXiv:2605.15184: moving small results to files cut one harness and model pair from 93.1 to 55.2; one run). Status: missing at 088a227c.
  Source: reports/2026-11-18-research/papers.md P7 implication 2; <https://arxiv.org/pdf/2605.15184>.
  Verified: inspection 2026-11-19: grep of plugins/claudetto/hooks for fs.write, writeFile and appendFile finds only the settings fill; no hook writes a result file.
