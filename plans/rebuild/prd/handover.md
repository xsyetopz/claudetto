# Handover Requirements

Verified (batch, test-checked requirements): `just verify`, claude 2.1.329, 2026-11-24: exit 0, 834 tests in 102 files, 0 fail; covers REQ-HANDOVER-017, REQ-HANDOVER-018, REQ-HANDOVER-021, REQ-HANDOVER-022, REQ-HANDOVER-023, REQ-HANDOVER-024, REQ-HANDOVER-055, REQ-HANDOVER-063, REQ-HANDOVER-067, REQ-HANDOVER-072; test files `plugins/claudetto/hooks/handover/__tests__/clear.test.ts`, `plugins/claudetto/hooks/handover/__tests__/compact.test.ts`, `plugins/claudetto/hooks/handover/__tests__/renewal.test.ts`.

## Post-Compaction Check

## Review State

## Handoff File

## Decision File Reinjection

## Reinjection Size Cap

## Return Overview

## Lesson Upkeep

## Memory Store Schema

## Handoff Side Behaviors

## Handover Threshold

## Handover Result

## Lesson Extraction

## Context File Drift

## Knowledge Pages Written by Agents

## Package Manager Detection at SessionStart

## State Across Clear

- [x] **REQ-HANDOVER-017** claudetto shall carry state across `/clear` through SessionStart and PreCompact (a user pause was forgotten after `/clear` and the agent began implementing; "71% context left" is no trigger; a session fanned out to a hard stop).
  Acceptance: After `/clear` a recorded pause still holds in the next session. Verification: test.
  Basis: reported. Status: partial at 088a227c (plugins/claudetto/hooks/hooks.json `PreCompact`; plugins/claudetto/hooks/features/compaction).
  Source: plugins/claudetto/hooks/hooks.json (`PreCompact`)@088a227c; plugins/claudetto/hooks/features/compaction@088a227c; claude 2.1.327: `SessionStart` and `PreCompact` are in the hook event list (code search for "PreCompact", chunk-ja5z738t.js@5637, 2.1.327). The old tag for the source of the pause report was not located.
  Verified: test, `claude plugin test plugins/claudetto` -> 59 pass, including "a typed /clear runs and its handover goes out once" (hooks/handover/**tests**/clear.test.ts); the handover's Constraints section carries a recorded pause word for word (2.1.327, 2026-11-19).
  Verified: claude 2.1.327, 2026-11-19, `claude plugin test plugins/claudetto`: 101 pass, 0 fail; test "a recorded pause still holds in the first request after /clear" (hooks/handover/**tests**/clear.test.ts) puts a pause row in `$.session.messages()`, forks nothing, and finds the pause word for word in the `claudetto:handover` block of the first request; it fails if the extract drops the row.

## Cycle Trigger

- [x] **REQ-HANDOVER-018** claudetto shall start a cycle only for the main loop (`e.agentId === undefined`), at a task boundary (RT-027), with the context read from `$.session.usage()` above the break-even size ([ADR-0178](../adr/0178-renewal-at-task-boundaries.md)). Session age, an idle gap and the cache TTL never start a cycle; a cold prefix only makes the next boundary renewal cheaper. claudetto sets no clock timer for renewal.
  Verified: renewal.test.ts covers main-loop boundary over and under the threshold, subagent and background cases; renewal sets no clock timer (`grep -n clock plugins/claudetto/hooks/handover` is empty).
  Acceptance: a main-loop boundary over the threshold starts a cycle; a boundary under it starts none; a prompt that arrives an hour after the last request starts none; a subagent boundary starts none; no `$.clock.after` or `$.clock.every` call serves renewal. Verification: test.
  Basis: decided (ADR-0178, measured break-even from the user's sessions) and measured (the session-cycle probe for `turn.complete` and `agentId`). The earlier `prompt.submit` TTL trigger and idle timers are superseded by ADR-0178. Status: partial (age trigger only, handoff.ts:67-80) at 088a227c.
  Source: adr/0178-renewal-at-task-boundaries.md (Decision Outcome); reports/2026-11-18-research/sessions-scripts/renewal.py; session-cycle probe, claude 2.1.325, 2026-11-16, cc-inspect cli with a --plugin-dir module, one stream-json prompt (recorded in plans/rebuild-curation.md at commit dc499712); plugins/claudetto/hooks/features/compaction/handoff.ts:67-80@088a227c; platform docs prompt-caching page, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5807); observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352); probe G, `claude` 2.1.325, fake API, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:8057).
  Verified: claude 2.1.327, 2026-11-19, `claude plugin test plugins/claudetto`: 101 pass, 0 fail; test "a prompt an hour after the last request starts no cycle, and no clock serves renewal" (hooks/handover/**tests**/renewal.test.ts) sends a turn with no boundary event and 90000 tokens and gets no compaction; no `clock` handler is registered in the test, so a clock call would throw; `grep -n clock plugins/claudetto/hooks/handover` finds only comments.

## Manual Clear Handover

- [x] **REQ-HANDOVER-020** claudetto shall write a handover on a typed `/clear` through a `command.run` hook on `{command:'clear'}`, keep it, then return `next(e)` so the clear runs unchanged, and inject it through a `prompt.context` block into the first request after the clear, with no extra request.
  Verified: probe as RT-041: the clear ran unchanged, the fork is the only extra request, request 3 opens with the handover block once.
  Acceptance: after `/clear`, request 2 opens with the handover block, holds no earlier text, and the clear ran unchanged; the fork is the only extra request. The fork runs with effort low; the handover goes out on a `prompt.context` pass once per compaction and not again, since the pass fires again after a compaction and a re-sent filler cost $0.24 in one probe. Verification: probe.
  Basis: measured. Status: missing at 088a227c.
  Source: handover probe A, claude 2.1.325, 2026-11-16, cc-inspect cli on a fake API, stream-json prompts `first one`, `/clear`, `after clear`, plugin under --plugin-dir (recorded in plans/rebuild-curation.md at commit 434bf4cb); user decision, 2026-11-16 19:00 UTC, handover mimics the compaction settings; a manual /clear gets a handover first (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6412); probe A, `claude` 2.1.325, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6738); live probe F, Haiku 5.5, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:7297).
  Verified: not re-run 2026-11-19 beyond the re-verification: /clear probe on 2.1.327 (cc-inspect fake API): 3 requests, request 2 fork has "effort":"low", request 3 opens with the claudetto:handover block and has no "first one"; clear.test.ts passes.
  Verified: 2026-11-24, claude 2.1.331, cc-inspect cli on the fake API, plugin under --plugin-dir. Prompts `first one`, `second one`, `/clear`, `third prompt`: 4 requests; request 3 is the fork with `"output_config":{"effort":"low"}`; request 4 opens with the `claudetto:handover` block, then the `/clear` command record and `third prompt`, and a search for `first one` matches requests 1 to 3 only. Prompts `first one`, `/clear`, `second prompt`: 2 requests, no fork, as writer.ts skips the fork for a one-prompt conversation (#64); request 2 opens with the handover block. `claude plugin test plugins/claudetto`: 333 pass, including "a typed /clear runs and its handover goes out once".
  Verified: probe, claude 2.1.329, 2026-11-24: cc-inspect cli, `--plugin-dir plugins/claudetto`, prompts `first one`, `second one`, `/clear`, `third prompt`: 4 requests; request 3 is the fork with `"effort":"low"`; request 4 opens with `<system-reminder>` and `# claudetto:handover` and holds no `first one`; the clear ran and the fork is the only extra request.

- [x] **REQ-HANDOVER-021** claudetto shall show a status line through `$.ui.status` while the fork runs, because the clear waits on it: 2.4 s on Haiku 5.5 over a 67k-token cached prefix. Hook time stops during `$` calls, so the 10 s hook budget does not cut the fork.
  Acceptance: a status line "Writing handover…" shows from the start of the fork until it returns, also when the fork throws; the pending `/clear` handover is kept in `$.store`, because module state is lost on reload. Verification: test.
  Basis: measured. Status: missing at 088a227c.
  Source: handover probe E, claude 2.1.325, 2026-11-16, live paid run, `claude -p` stream-json (recorded in plans/rebuild-curation.md at commit 0e987414); observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6738); (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:7297).
  Verified: test, "a status line shows while the fork writes and clears after" (hooks/handover/**tests**/compact.test.ts) (2.1.327, 2026-11-19). Agent decision (ADR-0190): the fork shows `$.ui.status("Writing handover…")` until it returns, because a toast lasts 4 s by default and a fork can run longer; the pending `/clear` handover sits in `$.store` (hooks/handover/clear.ts).
  Decision: ADR-0190: a toast lasts 4 s by default and the fork can run longer, so the status line stays until the fork returns; the 2.4 s fork time stays as the measured reason for showing it (probe E).
  Verified: claude 2.1.327, 2026-11-19, `claude plugin test plugins/claudetto`: 101 pass, 0 fail; "a status line shows while the fork writes and clears after" and "a throwing fork bills no fork cost and the status line still clears" (hooks/handover/**tests**/compact.test.ts) assert the status sequence ["Writing handover…", undefined]; "a typed /clear runs and its handover goes out once" (clear.test.ts) reads the pending text from `$.store`.

## Handover Writer

- [x] **REQ-HANDOVER-022** claudetto shall fall back to a `$.session.messages()` extract, at zero model cost, when the fork returns `reason:'nothing-to-fork'`, throws, or returns empty text.
  Verified: compact.test.ts "a failed fork falls back to the transcript extract"; writer.ts takes the extract on nothing-to-fork, a throw or empty text; clear.ts skips a clear whose origin is plugin.
  Acceptance: a handover is written from `$.session.messages()` rows `{role,text,toolUses}` in each of the three cases and no fork cost is billed for the fallback. A clear whose origin is plugin is skipped; an API error from the fork also takes the fallback. Verification: test.
  Basis: measured (probe B for the extract); the three trigger cases are the old plan's design. Status: partial (handoff.ts:44-56 returns undefined on a failed fork and takes the built-in summary instead) at 088a227c.
  Source: handover probe B, claude 2.1.325, 2026-11-16, cc-inspect cli on a fake API, stream-json prompts `first one`, `/clear`, `after clear`, plugin under --plugin-dir (recorded in plans/rebuild-curation.md at commit 434bf4cb); plugins/claudetto/hooks/features/compaction/handoff.ts:44-56@088a227c; user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:7297); probe B, `claude` 2.1.325, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6738).
  Verified: claude 2.1.327, 2026-11-19, `claude plugin test plugins/claudetto`: 101 pass, 0 fail; compact.test.ts: "a failed fork falls back to the transcript extract" (nothing-to-fork), "a throwing fork leaves one debug line and still hands over", "a fork that returns empty text takes the extract and bills no fork cost" and "a throwing fork bills no fork cost" (usage equals four zeros); clear.test.ts "a clear that a plugin started writes no handover". Breaking the plugin-origin skip in clear.ts failed that test.

## Core Auto Compaction

- [x] **REQ-HANDOVER-023** claudetto shall write the handoff by fork and answer a `session.compact` hook with trigger `auto` or `precompute` (or a compaction claudetto starts) and no `agentId` as `{messages:[handover]}`, never as `{skip}`, because a skip on a prompt-too-long leaves the context full and the turn fails. The hook writes the handoff with `$.model.fork` from the live transcript (cached prefix) and answers with it as the one message in the same step, followed by `git rev-parse --short HEAD` and `git status --short` read at that moment; it appends no user message, skips no compaction and writes no file. The `precompute` pass writes the fork ahead of the threshold, so its latency is hidden. A fork failure (throws or no text), a subagent compaction (`agentId` set), trigger `manual` (a user `/compact`), and handover off go to the built-in through `next(e)`. A manual `/clear` writes a handover first. The tail lists the last three tool-using assistant steps (a replayed fork lacked the last two). 2.1.326 release notes: automatic compaction in plan mode uses the model answering the user, so it can cost more.
  Verified: compact.test.ts (auto gets the handover, subagent, manual and auto-off take core); probe as RT-042. RISK-490 found and fixed: the prompt that opened the turn stays after the handover.
  Acceptance: an auto compaction with handover on gets the handover as its one message; a hook that answers with its own `messages` makes no summarizer request and keeps the cached prefix; a subagent compaction, a manual one, and one with handover off take the built-in path. The old file handoff interrupted work, went stale and ended the turn after writing the file (8 injections in one session). The fork replays the main thread's last request through `$.model.fork` and its reply is the handover; when the fork fails or is empty the handover is the free `$.session.messages()` extract (REQ-HANDOVER-022), still with no summarizer request. Verification: test.
  Basis: measured (code read of the compaction module, chunk-wqb2b4v0.js in 2.1.325, chunk-4h798pp0.js in 2.1.326, chunk-m14bt1pz.js in 2.1.327); probe D could not reach it on the fake API. Status: partial at 088a227c (hooks/features/compaction/handoff.ts:48 calls `$.model.fork`; handoff.ts:87-100 answers auto and plugin triggers; precompute is excluded from the clock only, not answered; read of handoff.ts at 088a227c: the `{ messages: [handoff] }` answer sits behind the auto or plugin check).
  Source: chunk-m14bt1pz.js@2628332 (2.1.327; first read in claude 2.1.326, checked location); chunk-m14bt1pz.js@2629952 (2.1.327), @2582776, @2954679 (claude 2.1.326; moved from @2499078, @2498600, @2871600 of 2.1.325 by a relocate and a read that shows the hook's `replaced` messages, the `precompute` path, and the `skipped` branch); handover probe D, claude 2.1.325, 2026-11-16, cc-inspect cli on a fake API, stream-json prompts `first one`, `/clear`, `after clear`, plugin under --plugin-dir (recorded in plans/rebuild-curation.md at commit 434bf4cb); plugins/claudetto/hooks/features/compaction/handoff.ts:44-56,87-100@088a227c; openspec/specs/compaction-path/spec.md:10; openspec/changes/2-1-325-rearchitecture/design.md:63; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:618; <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes); `chunk-wqb2b4v0.js:2497458`, `:2499078`, `:2498600`, `:2871600` (claude 2.1.325 binary) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:7297); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790 (handoff, Compaction tail fix; commit 563c5fcc).
  Decision: ADR-0143 (a failed fork falls back to a `$.session.messages()` extract) and REQ-HANDOVER-022 replace the built-in-compaction fallback; the tool-call listing is not in the `$.model.fork` contract (index.d.ts:3053-3077 names the main thread's last request plus `prompt`), so no claudetto text can promise it.
  Verified: claude 2.1.327, 2026-11-19, `claude plugin test plugins/claudetto`: 101 pass, 0 fail; compact.test.ts: "auto compaction gets the handover and no core call", "a failed fork falls back to the transcript extract", "a subagent compaction takes the core path", "autoHandoverEnabled false leaves auto compaction to core". Auto probe not reachable on the fake API (as RT-042).

## Handover Knobs

- [x] **REQ-HANDOVER-024** claudetto shall read knob settings keys through `$.settings.read()` and env through `$.env.get`. `CLAUDETTO_DISABLE_HANDOVER` shall turn off every handover path; `CLAUDETTO_DISABLE_AUTO_HANDOVER` shall keep the manual `/clear` handover.
  Acceptance: with `CLAUDETTO_DISABLE_HANDOVER` set, no path writes a handover; with `CLAUDETTO_DISABLE_AUTO_HANDOVER` set, only `/clear` does. Each Claude Code compaction knob that a plugin can govern has a handover mirror, "handover" for "compact" and `CLAUDETTO_*` for `CLAUDE_CODE_*`: settings `autoHandoverEnabled`, `autoHandoverWindow`, `precomputeHandoverEnabled`; env `CLAUDETTO_AUTOHANDOVER_PCT_OVERRIDE`, `CLAUDETTO_AUTO_HANDOVER_WINDOW`, `CLAUDETTO_DISABLE_AUTO_HANDOVER`, `CLAUDETTO_DISABLE_HANDOVER`; `$.settings.read()` returns the custom keys and `$.env.get` (async, literal names) reads each env name (probe C and G, claude 2.1.325, fake API, 2026-11-16). Verification: test.
  Basis: measured (probe C). Status: missing (no CLAUDETTO_knob in plugins/claudetto/hooks at 088a227c).
  Source: handover probe C, claude 2.1.325, 2026-11-16, cc-inspect cli on a fake API, stream-json prompts `first one`, `/clear`, `after clear`, plugin under --plugin-dir (recorded in plans/rebuild-curation.md at commit 434bf4cb); `settings.read` and `env.get` are in the 2.1.326 capability list (chunk-dafpvz32.js@3656 (2.1.327)); user decision, 2026-11-16 19:00 UTC, handover mimics the compaction settings; a manual /clear gets a handover first (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6412); probe C and G, `claude` 2.1.325, fake API, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:8057).
  Verified: test, "autoHandoverEnabled false leaves auto compaction to core", "precomputeHandoverEnabled false leaves only the precompute to core", "the autoHandoverWindow setting moves the threshold" and "auto handover off keeps the /clear handover" (2.1.327, 2026-11-19). Knobs read by `$.settings.read({ key })` and `$.env.get` in hooks/handover/writer.ts and renewal.ts. The idle and sleep mirrors moved Out as OUT-2004.
  Decision: OUT-2004: `idleHandover`, `CLAUDETTO_IDLE_HANDOVER_MIN_TOKENS`, `CLAUDETTO_SLEEP_HANDOVER` and `CLAUDETTO_SLEEP_HANDOVER_AFTER_MS` stay unshipped because `session.compact` names no idle or sleep trigger.
  Verified: claude 2.1.327, 2026-11-19, `claude plugin test plugins/claudetto`: 101 pass, 0 fail; compact.test.ts "CLAUDETTO_DISABLE_HANDOVER leaves automatic and manual compaction to core with no fork" (auto and manual reach core, no status line, no fork), clear.test.ts "CLAUDETTO_DISABLE_HANDOVER writes nothing", renewal.test.ts "CLAUDETTO_DISABLE_HANDOVER stops renewal at a boundary", "auto handover off keeps the /clear handover".

## Goal Restore After Clear

## Checked Handover

## Handover Content

## Rules After Compaction

## Dated Rules and Mistakes File

## Live Machine Facts

## Decisions Reachable by Every Agent

## Decision at the Code

## Quote Before Change

## Cold Start From a Doc

## Memory Write Gate

## State Note

## Command Syntax Memory

## Smart Compact Order

## Never Compact

## Short Sessions

## Decisions and Rationale Files

## Unreadable Check Is Not a Pass

## Long Jobs and Multi-Session Work

## Handoff Trigger

## Handoff Artifact

## Compaction Timing

- [x] **REQ-HANDOVER-053** claudetto shall compact on the session model while the cache is warm and shall not switch the compaction model.
  Decision: ADR-0190, no model switch; the ADR-0100 Haiku switch is void.
  Acceptance: a compaction on a cheaper model gets zero cache hits and re-reads history at fresh-input price (posted $0.25/M cache read against $1/M fresh; prices not checked); the rule is to compact before leaving, ask for a handoff before an expected absence, and compare when idle beyond the TTL. Measure by input, output, and cache_read right before, right after, and about 10 turns after a compact. Author measured over 187,978 API calls: all 134 compactions on warm cache against 30 of 121 before; median cold-resume re-read 493k to 255k; next-prompt-correction rate 5.5% against 6.1%; net about 4.7% of spend saved (range 1.8-13%); needs 2.1.284+. `/compact` cannot run mid-turn. 2.1.326 release notes: automatic compaction in plan mode uses the model answering the user, such as Opus with `opusplan`, so it can cost more. Verification: probe.
  Basis: reported / measured by tool author. Status: partial at 088a227c (59-minute age rule in `handoff.ts`; no cold-cache gate and no per-compaction cache measurement). In 2.1.327 code search finds `idleCompaction` (chunk-6ydtrx6k.js@927), `CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS` (chunk-2ew0jg68.js@32646), `CLAUDE_CODE_COLD_COMPACT` (chunk-m14bt1pz.js@2979437), `CLAUDE_CODE_SLEEP_COMPACT` and `CLAUDE_CODE_SLEEP_COMPACT_AFTER_MS` (chunk-2ew0jg68.js@37649), and `precomputeCompactionEnabled` (chunk-6ydtrx6k.js@979).
  Source: external/2026-10-25_p2/reddit.com-r-claudecode-comments-1x0omjh-i-built-conpact-claude-code-co-20261025T162222Z.md:42 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x0omjh/i_built_conpact_claude_code_compacts_its_own/>); external/2026-10-17/export-Got into a debate work about why my token usage was so high yesterday.jsonl:7; external/2026-10-03/export-I fixed save-token-jev for Claude Code 2.1.283 — 70% context reduction in ~1.1s on a real coding ses.jsonl:22; <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes).
  Verified: inspection, hooks/handover/writer.ts calls `$.model.fork({ prompt: FORK_PROMPT, effort: "low" })` with no model, and the fork reuses the main thread's model and cached prefix (types/claude-code/index.d.ts, `model.fork` doc) (2.1.327, 2026-11-19).
  Verified: re-verification 2026-11-19: writer.ts fork call passes only prompt and effort, no model; .claude-plugin/types/claude-code/index.d.ts:3053 documents the fork as over the session's OWN transcript; compact.test.ts "the handover fork asks for low effort and names no model" passes (101 pass, 0 fail, 2.1.327).
  Verified: 2026-11-24, claude 2.1.331: `writer.ts:82` calls `$.model.fork({ prompt: FORK_PROMPT, effort: "low" })` with no model; the 2.1.331 types (`index.d.ts` near line 3307) say the fork sends "The main thread's last request again (its model, system prompt, tools, messages)"; `claude plugin test plugins/claudetto` 333 pass, including "the handover fork asks for low effort and names no model".
  Verified: inspection, claude 2.1.329, 2026-11-24: `writer.ts:82` calls `$.model.fork({ prompt: FORK_PROMPT, effort: "low" })` with no model; the 2.1.329 types (`index.d.ts:3145-3151`) say the fork sends "The main thread's last request again (its model, system prompt, tools, messages)"; the REQ-HANDOVER-020 probe's fork request used the session model.

## Memory Guard

## Compaction Instructions and Cache

- [x] **REQ-HANDOVER-055** claudetto shall keep `/compact` on and visible: a manual `/compact` settles in about 5 s through `next()`, writes a `compact_boundary` with trigger manual, and survives `--resume`. The surface `OFF_COMMANDS` list had held `compact` against the spec, so the model said "/compact is off".
  Acceptance: a manual `/compact` reaches core through `next()` with trigger manual and the keep line, and no claudetto hook answers or skips it, so core's `compact_boundary` and `--resume` behave as in vanilla. Verification: test.
  Basis: read (the two source designs). Status: have at 088a227c (`hooks/features/surface/surface.ts:12-17` holds `OFF_COMMANDS` with no `compact` in it, by reading the list, which was the defect's source; the `/compact` run is this item's acceptance test).
  Source: openspec/changes/2-1-325-rearchitecture/design.md:63; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:859.
  Verified: test, claude 2.1.327, 2026-11-18, `claude plugin test plugins/claudetto`: 25 pass, including "session.compact > manual compaction keeps core and appends the keep line"; `git ls-files plugins/claudetto` holds no surface file hiding `/compact`.
  Decision: REQ-HANDOVER-067 and ADR-0143: a manual `/compact` keeps core's summary; the boundary and resume are core behavior, which claudetto changes only by not intercepting it. A second-process resume cannot run inside `claude plugin test`.
  Verified: claude 2.1.327, 2026-11-19, `claude plugin test plugins/claudetto`: 101 pass, 0 fail; compact.test.ts "a manual compaction reaches core with trigger manual and is not skipped" and "manual compaction keeps core and appends the keep line" pass.

- [x] **REQ-HANDOVER-056** claudetto shall measure whether the summarizer request carries `cache_control` and its TTL before costing a compaction: run `/compact` against a fake API with `--debug-file`; the result settles `skipCacheWrite:true` (2.1.319 fork) against a 5 m write.
  Acceptance: the recorded result names the TTL; it is measured on 2.1.327 (no ttl on the summarizer request, so 5 m). Verification: probe.
  Basis: measured. Status: have at 088a227c (result recorded for 2.1.319). Re-probed on 2.1.327 against the local fake API (`/compact` after one prompt): the summarizer request, the third request of the run, carries `cache_control` at `system[1]`, `system[2]` and `messages[2].content[0]`, so a cache write is requested there. None of those blocks carries a `ttl` field, so the write is the API default 5 m: a fake-API search for `"ttl"` matches no request with an API key, and with a fake claude.ai login matches request 1 (the main turn) but not the summarizer request. Compaction is costed at the 5 m write price for both logins.
  Source: openspec/changes/2-1-325-rearchitecture/design.md:131.
  Verified: re-verification 2026-11-19: /compact probe on 2.1.327 (cc-inspect fake API): cache_control on system[1], system[2] and messages[2]; no "ttl" key in any request.
  Verified: tick-audit rerun 2026-11-19, claude 2.1.327, local stub API, one prompt then `/compact`: both summarizer requests ("CRITICAL: Respond with TEXT ONLY") carry `cache_control` `{type: ephemeral}` at system[1], system[2] and messages[2].content[0], and no request body holds `ttl`, so the write is 5 m -> PASS.
  Verified: 2026-11-24, claude 2.1.331, cc-inspect cli on the fake API, no plugin, prompts `first one` then `/compact`: the two summarizer requests (2 and 3, "CRITICAL: Respond with TEXT ONLY") carry `cache_control` at system[1], system[2] and messages[2].content[0]; a search for `"ttl"` matches no request, so the write is 5 m -> PASS.
  Verified: probe, claude 2.1.329, 2026-11-24: cc-inspect cli, vanilla, prompts `first one` then `/compact`: 3 requests; a query for `"ttl"` finds no request, so the summarizer write is the 5 m default.

## Session Boundary

## Handover Schema

## Idle Compaction

- [x] **REQ-HANDOVER-059** Moved Out as OUT-2005: renewal at a task boundary above 70k keeps sessions under the idle-compaction floor of 100k tokens (`Math.max(1e5, CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS ?? 2e5)` in 2.1.327), and an idle compaction that does run reaches the handover hook as an automatic trigger (inferred from the trigger type `manual | auto | plugin | precompute`, not probed); the key has no measured gain (ADR-0177).
  Verified: 2026-11-24, claude 2.1.329 binary (`reports/2026-11-24-research/pin-2-1-329/binary/result.txt`): `var Wds=200000,GGn=1e5` and `Math.max(GGn,s.CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS??Wds)`, so the 100k floor and 200k default hold as on 2.1.327.

## Handover Cost

- [x] **REQ-HANDOVER-060** Moved Out as OUT-2006: the cost comparison needs two paid runs of the same task; the cache-read part is the engine contract of `$.model.fork`.

## Handover in Place of Compaction

- [x] **REQ-HANDOVER-061** claudetto shall replace core auto-compaction's summary with its handover by default, and keep sessions short by renewing at task boundaries (RT-027), not by a session-age bound. The renewal calls `$.session.compact` between turns, and claudetto's `session.compact` hook returns the handover in place of the core summary, so core makes no summarizer call (CTX-843, RT-025). Headless renewal is sent by the driver ([ADR-0184](../adr/0184-headless-renewal-by-driver.md)).
  Acceptance: after a renewal, the first request holds the handover and none of the old messages; a dogfood session renews at each task boundary above the RT-027 threshold and at no other time; the user's own `/clear` stays unbroken. Verification: probe.
  Basis: reported; revised 2026-11-18. The earlier 59-minute bound and the ban on `$.session.compact` are dropped:
  - a clear on a clock throws away context that the running task still uses;
  - the measured break-even (RT-027) renews at about 89% of the user's task boundaries, so sessions stay short without a clock;
  - `$.session.compact` with the handover hook makes the handover fork the only model call. Status: partial at 088a227c (git grep for `.clear`, `session.clear`, `clearAndSubmit` in plugins/claudetto/hooks and scripts at 088a227c finds only `state.clear()` in features/repeat/repeat.ts:181, so no handover clear path; features/compaction/handoff.ts writes a fork handoff at auto-compaction; the 59-minute bound is `HANDOFF_MS = 59 * 60_000` at handoff.ts:68, checked at `turn.complete`, and the requirement drops it).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/4c68767f-62e8-43f8-a3c5-95dcd42c18d8.jsonl:198 (user decision, 2026-11-09); user decision, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10408); plugins/claudetto/hooks/features/compaction/handoff.ts@088a227c; plugins/claudetto-you-should-know/hooks/register.ts:57@088a227c (a clear counter only); user decision, 2026-11-14 02:46 UTC, a cheap handover through /clear instead of auto-compaction (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:31369); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070 (handoff, constraints on auto-handover); [ADR-0143](../adr/0143-handover-replaces-auto-compaction.md); [ADR-0178](../adr/0178-renewal-at-task-boundaries.md); user decision, 2026-11-18, short bursts per task over a forced hourly clear (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl).
  Verified: test, claude 2.1.327, 2026-11-18, `claude plugin test plugins/claudetto`: 25 pass, including "auto compaction gets the handover and no core call", "a finished last task above 70k renews", "a boundary under 70k does nothing" and "a typed /clear runs and its handover goes out once". No live dogfood session was run.
  Verified: test, `claude plugin test plugins/claudetto` -> 59 pass (2.1.327, 2026-11-19). The dogfood check of the acceptance stays with the goal's dogfood session.
  Verified: not re-run 2026-11-19: auto-compaction is unreachable on the fake API (no session.compact with AUTO_COMPACT_WINDOW=100000); static evidence: plugins/claudetto/hooks/handover/compact.ts:13-35, compact.test.ts passes.
  Verified: 2026-11-24, claude 2.1.331: `claude plugin test plugins/claudetto` 333 pass, including "auto compaction gets the handover and no core call", "a finished last task above 70k renews", "a boundary under 70k does nothing" and "a typed /clear runs and its handover goes out once". Probe: cc-inspect cli, plugin loaded, `CLAUDETTO_AUTOHANDOVER_PCT_OVERRIDE=0.000001`, three prompts: no compaction request and no renewal fault in the debug log, because headless renewal is the driver's (ADR-0184). A manual `/compact` with the plugin still makes core's two summarizer requests, as `compact.ts` keeps core's summary for a manual compaction. The live renewal check stays with the dogfood session.
  Verified: claude 2.1.329, 2026-11-24: `claude plugin test plugins/claudetto` 332 pass, 0 fail, including "auto compaction gets the handover and no core call" and "a typed /clear runs and its handover goes out once". Probe: cc-inspect cli, plugin, `CLAUDETTO_AUTOHANDOVER_PCT_OVERRIDE=0.000001`, three prompts: 2 requests and no compaction, since headless renewal is the driver's (ADR-0184); the live renewal check is the dogfood session's.

## Handover Currency

- [x] **REQ-HANDOVER-063** claudetto shall write a handover that is current to the working tree and never interrupts ongoing work abruptly.
  Acceptance: a resumed agent finds committed and uncommitted state as it is; a handover does not cut a running task. Verification: test.
  Basis: reported. Status: partial at 088a227c.
  Source: reported, user, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12); reported, user, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:8192); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:6530 (handoff turn; the user said the handoff abruptly interrupts ongoing work, as read in the earlier pass).
  Verified: test and probe, claude 2.1.327, 2026-11-18, `claude plugin test plugins/claudetto` (renewal: "an open task is no boundary", "background work holds the boundary") and `bun -e` compose("body","",""): git HEAD and status lines follow the body.
  Verified: renewal.test.ts "an open task is no boundary" and "background work holds the boundary" pass, claude 2.1.327, 2026-11-19 (101 pass, 0 fail).

## Resume From an Earlier Session

## Conflicts with Settled Decisions

- [x] **REQ-HANDOVER-067** claudetto shall append "Keep the user's corrections, refusals, and consents word for word." after the existing instructions of each compaction, through `next({...e, instructions})` (the summarizer reads it as `Additional Instructions:` ending the request; the hook module has no `process`, so the text is a constant; a failing hook logs `session.compact hook skipped`), then stored constraints as `-` lines. A classic `PreCompact` command hook prints one keep line (manual and automatic; no model call, no read of earlier messages). Keep verbatim: every user correction, every rejection or block (never retried), a consent with its named value, a user-owned value change (old, new, approved), open notices and unverified claims, running jobs with ID, log and lock, the Record or SOW path; never attribute to the user what only the assistant said.
  Acceptance: the compaction request ends with the instruction; the built-in summary keeps only security constraints verbatim and corrections only lossily, and one summary form caps at 2,000 words. Verification: test.
  Basis: measured (Claude Code 2.1.322). Status: have at 088a227c (hooks/hooks.json PreCompact; hooks/features/compaction/texts.ts "word for word").
  Source: openspec/specs/compaction-path/spec.md:83; openspec/changes/archive/2026-11-13-feat-2-1-321/specs/compaction-path/spec.md:5; openspec/changes/archive/2026-11-16-2-1-323/tasks.md:35.
  Conflicts with: The advisor tool stays disabled; no constraint ledger (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)). The spec line at openspec/specs/compaction-path/spec.md:83 adds the stored constraints from the constraint ledger.
  Verified: test, claude 2.1.327, 2026-11-18, `claude plugin test plugins/claudetto`: "session.compact > manual compaction keeps core and appends the keep line" passes; automatic compactions are answered by the handover, whose Constraints section keeps words verbatim.
  Verified: compact.test.ts "manual keeps core and appends the keep line" passes, claude 2.1.327, 2026-11-19 (101 pass, 0 fail).

## Handoff Content

- [x] **REQ-HANDOVER-072** claudetto shall carry one explicit requirement through three successive compactions with its own re-injected text present, and shall keep that text no larger after the third compaction than after the first.
  Acceptance: a fixture run against a fake API states one requirement, forces three compactions, and checks that the requirement is still stated in the context after the last one and that claudetto's injected bytes per compaction do not grow. Autocompact thrash (context refilled within 3 turns, 3 times in a row) is the failure the size check guards against. Verification: test.
  Basis: reported (one user hit thrash from instruction files re-injected after each compact with no large file involved; a second commenter suggested the regression case, n=1 repro on 2.1.325). Status: missing at 088a227c.
  Source: external/2026-11-18/reddit.com-r-claudecode-comments-1xyer2z-autocompact-is-thrashing-in-cl-20261117T225157Z.md:95,103 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xyer2z/autocompact_is_thrashing_in_claude_code/>); reports/2026-11-18-research/dossier.md:40.
  Verified: test, "three compactions in a row carry a stated requirement and inject no growing text" (hooks/handover/**tests**/compact.test.ts) -> pass (2.1.327, 2026-11-19). Before the fix in text.ts the third handover was larger than the first, because the free fallback nested the prior handover and cut it to 500 characters.
  Verified: the named test passes in `claude plugin test plugins/claudetto`, claude 2.1.327, 2026-11-19 (101 pass, 0 fail).
