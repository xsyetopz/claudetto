# Handover and renewal on Claude Code 2.1.327

Date: 2026-11-18. Program: claude 2.1.327 (cc-inspect). Probes: `handover-probes/probe-a|probe-c` (plugin `p/`, log `probe.log`).
Attribution: `[probe X]` = cc-inspect `code cli` run, 2026-11-18; `[mod@off]` = chunk-m14bt1pz.js@offset unless named; `[url, 2026-11-18]` = fetched page.
Caveat: the mod-API type file in the binary is zstd-compressed; signatures come from `get_schema name=types` (docs mirror, possibly 2.1.319). Marked `(docs)`.

## Verdict

Block: claudetto does NOT replace built-in compaction by default. Built-in /compact already reuses the cached prefix, so a fork handover costs about the same in tokens. A custom layer wins only on content quality (evidence, verifying commands, git state), not on a measured cost number. No cost win is measured, so the layer is limited to: (a) a `session.compact` hook that replaces the summary text (no clear, no session restart); (b) an optional task-boundary clear+handover, only above the break-even context size below.
Wall-clock age (59 min) is dropped as a trigger. Cache TTL depends on idle gap, not session age (ADR-0070); a 1h TTL is refreshed on every request.

## Q1 Mod API (docs)
- `$.model.fork({prompt, effort?})`: tool-less completion over the session's cached prefix. `$.model.complete`: named model, maxTokens default 1024, cap min(model limit, 64000), timeoutMs. `$.model.classify`.
- `$.command.run({command})`: queued, runs when idle, origin `{kind:'plugin'}`; rejects inside a hook the turn waits on.
- `$.session.compact`: trigger `plugin`, between turns, rejects while a turn runs. A `session.compact` hook may return `{messages:[...]}` replacing the summary.
- `prompt.context` blocks: injected into the first user message after clear or compaction. `$.store` JSON 4 MiB. `$.clock.after/every`.
- Task events: `classic.TaskCreated`, `classic.TaskCompleted` (surface mod-api name=task; d.ts offsets 636106, 635709). Hook events (surface hook-event, ja5z738t.js:5436): PreCompact, PostCompact, SessionStart, SessionEnd, Stop, TaskCompleted, TaskCreated, UserPromptSubmit, PostToolUse, SubagentStop, CwdChanged (33 total).

## Q2 Mod-triggered clear + handover (RT-024..026)
- Hypothesis: a plugin forks, stores, runs `/clear`, injects on `prompt.context`. Probe A, user-typed `/clear` after the mod's fork: RT-024 holds (fork works with `effort:"low"`, answer captured), RT-026 holds (store persists, `handover` block present in first request after clear).
- Hypothesis: `$.command.run({command:"clear"})` from `turn.complete` works under `-p` stream-json. Result: refuted, three runs. Probe A (`probe-a/probe.log`, 3 sessions): the awaited plugin clear threw "the command was removed from the queue before it ran" every time; the only clear that ran was the stream-json `/clear` prompt (origin `{"kind":"sdk"}`). Probe F (`probe-f/probe.log`, prompts `first one`, `second one`): an unawaited clear after turn 2 threw "the host has ended its input". Code: discards come from the queue's `commandsDiscarded` signal (`clearCommandQueue`, chunk-m14bt1pz.js@740648; rejection in the subscriber @5989824). Probe C (`$.clock.after(300)` deferral): the timer did not fire before the harness exited.
- Hypothesis: `$.session.compact` is a plugin-side renewal path under `-p`. Result: refuted. Probe F threw "not available in a headless (-p / SDK) session yet: compaction here runs inside a turn (a /compact prompt); catch it and carry on". Code: the headless composer binds `compact:()=>Promise.reject(tcl())` (chunk-rap1tzf6.js@763945; message at chunk-m14bt1pz.js@63563). The interactive composer binds `compact:(R)=>this.requireHost().compact(R)` (chunk-cfxefa64.js@230853). The host runs `compactManually` with `trigger:"plugin"` and `customInstructions`, throws "a turn is in flight; the conversation compacts between turns" while a turn runs, and replaces the transcript with the summary and kept messages (chunk-cfxefa64.js@500556).
- Conclusion: under `-p`, renewal is the caller's job. The driver sends `/clear` or `/compact <instructions>` as the next stream-json prompt, and a mod injects the stored handover through `prompt.context`, which works after an sdk-origin clear (Probe A). In interactive sessions, `$.session.compact` between turns is the plugin path by code reading. It is not runtime-probed, because cc-inspect drives `-p` only and a TUI run would need the user's live login.
- Interactive probe procedure (for the user, live login, costs a few cents): install a mod whose `turn.complete` handler schedules `$.session.compact({instructions:"handover"})` with `$.clock.after(1)` once a turn ends, plus a `session.compact` hook that logs `trigger`. Then type one prompt in `claude` and check that the log shows `trigger=plugin` and that the next request carries the summary.
- Request counts and sizes: see `probe-a/probe.log`. Cache markers in main-loop request: messages[2], system[1], system[2]; tools 30470 B, system 6274 B (bytes, not tokens) [probe, request=N].

## Q3 Built-in compaction
- Shape: same tools and system as the main loop (cache-read prefix) plus an appended summarizer prompt; `max_tokens` 128000, adaptive thinking, effort medium, stream [probe `["first one","/compact"]` request=2]. Code: `GO({querySource:"compact", forkLabel:"compact", skipCacheWrite:true})` gated by `tengu_compact_cache_prefix` default true [m14bt1pz@2958807]; reactive path @2604125. If the gate is off or stripNonEssential, the prefix is not reused (not probed).
- Cost: cache read of the whole context + summary output + a new cache write of system+tools+summary. Equivalent to the fork handover.
- Knobs (env-places/setting): DISABLE_AUTO_COMPACT, CLAUDE_AUTOCOMPACT_PCT_OVERRIDE, CLAUDE_CODE_AUTO_COMPACT_WINDOW, DISABLE_COMPACT; settings autoCompactEnabled, autoCompactWindow, idleCompaction, precomputeCompactionEnabled; also COLD_COMPACT, IDLE_COMPACT_MIN_TOKENS, SLEEP_COMPACT(_AFTER_MS).
- Hooks: PreCompact, PostCompact, SessionStart. SessionStart source values probed on 2.1.327 (probe-i): startup, compact (after /compact, with model), clear (after /clear); PreCompact trigger manual.
- 2.1.326 -> 327 (release notes action=notes, 2026-11-18): compaction after a reply cut at max output no longer loses the tool call (chunk-4xhk2fyb.js:8257); Edit "File has not been read yet" after compaction fixed (p47p1nn1.js:35142); completed-subagent reminder points to SendMessage; stalls on compaction replies with many unclosed tags fixed (m14bt1pz@2714576); teammates on another model compact at their own limit (@2530073). All four remove failure modes a custom handover would otherwise have to work around; this lowers the case for replacing compaction.

## Q4 Cost model
Prices [https://platform.claude.com/docs/en/about-claude/pricing, 2026-11-18]; multipliers [.../build-with-claude/prompt-caching, 2026-11-18]: write 5m 1.25x, 1h 2x, read 0.05x on Opus 5.5 and Sonnet 5.5 (footnote 2).

| Model | input | write 1h | read | output |
|---|---|---|---|---|
| Sonnet 5.5 | $2 | $4 | $0.10 | $10 |
| Opus 5.5 | $4 | $8 | $0.20 | $20 |
(per MTok)

Model (assumptions, not measured): fresh-session base S = 15k tokens (system+tools; the probe gives bytes only), handover output H = 3k, write at 1h TTL. Per-turn cost of continuing = P x read. Clear+handover one-off = P x read (fork) + H x output + (S+H) x write.

| Context P | Sonnet turn | Opus turn | Sonnet one-off | Opus one-off | Break-even turns (same for both) |
|---|---|---|---|---|---|
| 100k | $0.0100 | $0.020 | $0.112 | $0.224 | 13.7 |
| 300k | $0.0300 | $0.060 | $0.132 | $0.264 | 4.7 |
| 600k | $0.0600 | $0.120 | $0.162 | $0.324 | 2.8 |

Break-even N = one-off / ((P - 18k) x read). Opus doubles every price, so N is identical.
Subscriber token share: plan quotas are not published as token counts; unverified. The cost ratio above is the proxy (relative unit cost: read 0.05x, write 2x, output 5x of input).
Not counted (both worsen the handover): re-reading files the new session needs; quality loss from a lossy handover. Not counted (favours clear): long-context latency.
Result: continuing is cheap in dollars. At 100k, a clear pays back only after about 14 remaining turns; at 600k after about 3. Built-in compaction has the same one-off cost, so the only measured difference is the summary output size.

## Q5 Renewal and TTL
- TTL: subscriber main loop 1h by default; API-key and subagents 5m unless overridden [bGn@2564331, uBe@3210453; probe oauth shows `"ttl"` field, key login none]. Env: CLAUDE_CODE_PROMPT_CACHE_TTL, CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL, CLAUDE_CODE_MESSAGES_PROMPT_CACHE_TTL, ENABLE_PROMPT_CACHING_1H, FORCE_PROMPT_CACHING_5M; settings promptCacheTtl, subagentPromptCacheTtl.
- "60 min" is the TTL of an idle gap, not session age; each request refreshes it (the docs say 5m entries refresh at the read rate; the page does not state this for 1h, so the 1h refresh is unverified).
- Timers: `$.clock.after/every` exist; whether they fire while idle: not reproduced (Probe C). Built-in alternatives: idleCompaction, SLEEP_COMPACT.
- Running turn / background tasks / subagents across /clear: not verified; `$.session.compact` and `$.command.run` both wait for idle, so no clear ever hits a running turn. Subagents and background tasks across /clear: unverified.

## Q6 Handover content
Carry: goal, decisions with source (file:line or message), verified facts with the verifying command and result, open items, paths with `git rev-parse HEAD` and `git status --short`. Re-derive: file contents, test output older than the last edit, anything cheap to re-read. Prior implementation: `git show 088a227c:plugins/claudetto/hooks/features/compaction/handoff.ts`. Built-in summary/session-memory//recap: not checked in 2.1.327 (unverified, time).

## Do nothing (built-in is good enough)
- Auto-compaction at the context limit, including the 2.1.327 fixes above.
- Manual `/clear` between unrelated tasks: free, no summary needed.
- Cache-prefix reuse in /compact: already on by default.
- Model behaviour at 100k contexts: a turn costs $0.01 on Sonnet 5.5.
- Wall-clock renewal.

## Task-boundary signals (surface, 2.1.327)
- `TaskCompleted` / `TaskCreated` hook and mod events: all-done check via the task list. Payload probed on 2.1.327 (probe-g): task_id, task_subject, task_description only; no status, no task list.
- `Stop` (+ no open tasks): exists; "no open items" must be computed by the mod.
- Commit: no dedicated event; `PostToolUse` on Bash with `git commit` in the command. Probed on 2.1.327 (probe-g): tool_input.command and tool_response {stdout, stderr, interrupted, isImage, noOutputExpected}; no exit code.
- Topic change: `UserPromptSubmit` plus `$.model.classify`. Exists; its accuracy is unmeasured.
Recommended trigger: boundary signal AND P above the break-even (about 300k, where N is under 5 turns) AND the user has remaining work. Below that, do nothing.

## RT status
- RT-024: holds (fork, effort low).
- RT-025: refuted under -p (plugin clear always discarded; probes A and F). Replaced by: the driver sends the clear, and interactive renewal uses `$.session.compact` between turns (code-read; live probe procedure above).
- RT-026: holds after a user-typed clear.
- RT-027: unverified.
