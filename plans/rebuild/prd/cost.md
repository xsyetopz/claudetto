# Cost Requirements

## Usage Guard

## Budget Line

## Status Line

## Heartbeat and Window Files

## Price-Step Guard

## Budget Note after a Paid Run

## Window Budget

## Budget Text

## Cost Accounting from Transcripts

## Cache

## Session-State View

## Context and Budget Display

- [x] **REQ-COST-021** claudetto shall report a startup-context baseline: run the `/context` split in a fresh session, cut unused MCP servers, unused tools by `permissions.deny`, unused skills by `skillOverrides`, and measure per task type once.
  Verified: fake-API probe, claude 2.1.327, 2026-11-18, cc-inspect cli `-p /context`: prints Model, Tokens, and a category table (system prompt, skills, messages, free space, autocompact buffer) from count_tokens calls only, no model request; MCP tools, memory files and agents rows appear when present. `permissions.deny` and `skillOverrides` are vanilla settings.
  Acceptance: a baseline report lists system prompt, system tools, MCP tools, memory files, custom agents, messages. Reports: 66k start = system tools 35.6k + MCP 16.6k + skills 5.9k + system prompt 5.2k + MCP instructions 2.3k + memory 1.5k; other users 45k, 27k, 10-11k, 9.5-11.6k; a missing `.gitignore` leaked node_modules, cutting startup from about 40,000 chars to about 1,236; autocompact buffer about 33k; skill descriptions under about 200 chars. Reason: Haiku price steps above 100k. Verification: demonstration.
  Basis: reported. Status: partial at 088a227c (`plugins/claudetto/hooks/features/hygiene/`, `budget-run.ts`; baseline report missing). claude 2.1.327: `/context` and `/skill-doctor` present (chunk-271f7twe.js@1000-4200 command table); `/doctor` verified on 2.1.327 (prompt command, alias `checkup`, chunk-3z330av7.js@165730).
  Source: external/2026-10-12/export-claude code 66k system prompt.jsonl:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x0fli2/claude_code_66k_system_prompt/>); external/please-use-me-often/agent-failure-dossier/judged/cache.jsonl:59; external/please-use-me-often/agent-failure-dossier/judged/setting.jsonl:8.

## Decider

## Decision Log and Plan

## Measuring Cost

## Cache and Token Use

- [x] **REQ-COST-037** claudetto shall never switch the model mid-conversation: a switch rereads the whole session uncached because the cache is per model; `--model opusplan` and plan mode change only the top-level `model` (measured on CC 2.1.316); keep context under 500k even with 1M.
  Verified: grep of plugins/claudetto/hooks, claude 2.1.327, 2026-11-18, `grep -rn -E 'model[:=]|setModel' hooks`: no hit; the only model call is `$.model.fork({prompt, effort})` at handover/writer.ts:42, which names no model and so runs on the session model. No claudetto code switches the model.
  Acceptance: no claudetto feature switches the model inside a session. The opusplan-then-Sonnet switch in one session was costly (reported); `/opusplan` called redundant now that subagent handoff works (reported opinion; not checkable locally because it judges usefulness). claude 2.1.327: the `opusplan` alias is in the model list (code search, chunk-jtw26wbb.js@963). Verification: inspection.
  Basis: measured (top-level `model` only), reported. Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xrutks-how-to-keep-costs-down-20261110T100242Z.md:57 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xrutks/how_to_keep_costs_down/>); external/please-use-me-often/agent-failure-dossier/judged/setting.jsonl:20.

- [x] **REQ-COST-040** Moved Out as OUT-2353: the item needs a paid model run.

## Cache and Tokens

- [x] **REQ-COST-042** claudetto shall avoid re-reading unchanged files.
  Verified: cc-inspect code search, claude 2.1.327, 2026-11-18, "File unchanged since last read": vanilla Read returns "File unchanged since last read. The content from the earlier Read tool_result in this conversation is still current" (chunk-krf585s9.js@973), so a second Read of an unchanged file is served short with no claudetto code.
  Acceptance: a second Read of an unchanged file in one session is refused or served short. Verification: test.
  Basis: reported. Status: partial at 088a227c (features/repeat; see risk on withheld Read).
  Source: reported, user, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10408).

## Paid Calls

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
