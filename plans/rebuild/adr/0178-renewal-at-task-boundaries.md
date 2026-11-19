---
status: accepted
date: 2026-11-18
---
# Renew the Session at Task Boundaries, Never on a Clock

## Context and Problem Statement

[ADR-0070](0070-handover-trigger-idle-or-size.md) renews on an idle gap or a context size, and [ADR-0143](0143-handover-replaces-auto-compaction.md) has handover replace core auto compaction and keep sessions under one hour. A forced clear on a clock throws away live context mid-task. Each turn of a long session re-reads the whole context, so cost grows with context size; several short sessions per task stay cheaper than one long one.

Measured on the user's sessions under 2.1.327 (11 main sessions, 142 subagent transcripts): main-loop cache hit p50 0.987, p10 0.952; 99 of 104 main-loop cache breaks and 361 of 523 subagent breaks follow an auto compaction; only 4 main-loop breaks follow an idle gap over the TTL; 460 compactions, all automatic, at a median of 140.6k tokens; 20.7% of main-loop cache writes re-create content already written once.

Cost model (prices from the platform pricing and prompt-caching pages, 2026-11-18; read 0.05x, 1h write 2x, output 5x of input on Opus 5.5 and Sonnet 5.5; the ratios are equal on both models, so the threshold does not depend on the model). A renewal costs, once:

- the handover fork's read of the context P;
- the handover's output H;
- the new session's read of the shared prefix;
- the new session's write of its own part plus H.

Its saving comes on every later API request, not every user turn: (P − base) × read, because every tool call is a request that re-reads the whole context. Measured on 51 sessions (2.1.326 and 2.1.327; reports/2026-11-18-research/sessions-scripts/renewal.py):

- A new session's first request reads 32.7k tokens of shared system-and-tools prefix from cache, in 75% of sessions, and writes 9.5k of its own (median).
- A typed prompt spends 35 requests at the median (25th percentile 7, 90th 73; 198 prompts).
- The median request carries 86k tokens of context.

With a 3k handover, renewal pays back within a median task above P = 71k. Without one, it pays back above 54k. Within a 25th-percentile task it pays back above 191k with a handover and 101k without. Built-in `/compact` has the same one-off cost because it reuses the cached prefix (`tengu_compact_cache_prefix`, default true, chunk-m14bt1pz.js@2958807).

The first version of this model assumed a 15k base and counted user turns, not requests. It put the threshold at 300k and kept sessions long, so each request re-read context the next task did not need.

When does claudetto renew a session?

## Considered Options

- Session age of 59 minutes ([ADR-0160](0160-session-age-handoff.md), already superseded).
- An idle gap or a context size ([ADR-0070](0070-handover-trigger-idle-or-size.md)).
- A forced clear every hour.
- A task boundary (a slice commit, all tasks completed, or Stop with no open task) when the context is above the break-even size for the work that remains.
- Do nothing beyond built-in auto compaction and the user's own `/clear`.

## Decision Outcome

Chosen: renewal at a task boundary above break-even. The trigger is a boundary signal (`TaskCompleted`, Stop with no open task, or `PostToolUse` on a Bash `git commit`) and a context above 70k tokens, where renewal with a handover pays back within the median task. Sessions are therefore short bursts: in the user's sessions, 89% of the points where the user typed a new prompt were above 70k (median 138k, 156 boundaries). Below 70k claudetto does nothing. A session is never cleared on a clock, because a clear in the middle of a task throws away context the task still uses and pays the one-off cost without the saving. When auto compaction does run, the `session.compact` hook returns the handover text in place of the core summary, and core makes no summarizer call, so the handover fork over the cached prefix is the only model call (CTX-843). Idle time and session age are never triggers. A cold cache after an idle gap lowers the cost of renewal at the next boundary; it does not trigger renewal on its own. Supersedes the trigger of [ADR-0070](0070-handover-trigger-idle-or-size.md); refines [ADR-0143](0143-handover-replaces-auto-compaction.md).

## Consequences

- STR-002 and QS-011 drop the one-hour and no-auto-compaction targets; QS-011 measures cache breaks after compaction and the share of re-created writes instead.
- The 70k threshold rests on the measured base, the measured requests per prompt and the published price ratios. The handover size H = 3k is the target size of RT-024. The model leaves out two effects:
  - files the next task must read again in the new session, which favour continuing; the handover names the files and commands that matter, which limits them;
  - output quality and latency at long context, which favour renewal.

  The threshold is a `CLAUDETTO_*` knob beside Claude Code's `CLAUDE_CODE_AUTO_COMPACT_WINDOW`, and `renewal.py` recomputes it from the user's own transcripts.
- On a subscription, a 1 h cache write weighs about 1.1 times a 5 min write on the weekly meter, not the list ratio of 1.6 (CTX-846). The renewal's one-off cost is mostly a write, so the threshold on the meter is at or below the list-price threshold. The API figure is the conservative one.
- The boundary-signal payloads are probed on 2.1.327 (CTX-840). `TaskCompleted` names only the finished task, so "work remains" comes from a TaskList call; the commit match reads `tool_input.command` and a non-interrupted `tool_response`, since PostToolUse carries no exit code; Stop carries `background_tasks`, so a stop with background work running is not a boundary.
- On 2.1.327 the Task tools are off for every 5.x model: they load only for a fixed list of 3.x and 4.x model ids, a background job, a `--tools`/`--allowedTools` entry naming one, or `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` (chunk-m14bt1pz.js:195550-195582, CTX-840). Without them no task is ever open, so `TaskCompleted` never fires and every Stop with no background work is a boundary: renewal then runs on a commit or at the end of any answer above 70k. claudetto leaves the gate closed. Opening it costs 26 prompt tokens per request, but it changes how the model plans, and that has no measurement yet. A user who opens the gate gets the full trigger. Recheck the allowlist on each release; once it admits 5.x models, Stop with an open task stops counting as a boundary on its own.
- Strongest counterargument: the built-in compaction already sits near break-even, so the custom trigger saves little money. Its case rests on content: a handover carries the verifying commands and the git state that a generic summary drops ([ADR-0177](0177-pragmatism-gate.md) applies; the trigger ships only if a dogfood session shows fewer re-reads or re-verifications after renewal).

Source: user decisions, 2026-11-18 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl:272, and the later message in the same session that prefers short bursts per task over a forced hourly clear); reports/2026-11-18-research/sessions-scripts/renewal.py (measured base, requests per prompt, thresholds); reports/2026-11-18-research/handover.md:34-54 (cost model) and :72-77 (boundary signals); reports/2026-11-18-research/sessions.md (Cache and Compaction sections; scripts in reports/2026-11-18-research/sessions-scripts/); https://platform.claude.com/docs/en/build-with-claude/prompt-caching (fetched 2026-11-18).
