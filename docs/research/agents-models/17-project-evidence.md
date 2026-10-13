# R17: Project Evidence on the dotclaude Agents

## Sources

- `wiki/dotclaude/Agents.md`: the roster table and the turn bounds.
- `src/plugins/dotclaude/slices/agents/limits.ts` and `src/plugins/dotclaude/slices/agents/agents/*.md`.
- `src/plugins/dotclaude/slices/handoff/limits.ts`: `SUBAGENT_CONTEXT_MAX`, `HAIKU_CONTEXT_MAX`, `TURNS_LEFT_AT`.
- `wiki/evidence/Usage-Evidence.md`: prices and the measured Max 20x week.
- Git history: commits `f7710bc8`, `c940923f`, `2df8299f`, `ba249cb8`, `547f1f4f`.
- Archived `research/subagent-usage.md` of the 0.28.0 change, seen in commit `e1dc9984`.
- Project capture, 2026-10 (`external/capture/`): 11 request bodies and 3 reports.
- Project session log, 2026-10-13: 5549 lines, 30 finished agent runs.

## Findings

### The captures hold no subagent runs

- All 11 request bodies come from the settings snippet probes (`vanilla`, `snippet`, `snippet-applied`).
- Models seen: `claude-opus-5-5` (3 requests), `claude-sonnet-5-5` (8 requests).
- Effort seen: `medium` in all 11. `thinking` is `adaptive`, or absent for the 3 structured-output calls.
- `max_tokens` is 128000 in all 11.
- Body sizes: 38 KB (Opus), 57 to 62 KB (Sonnet main call), 17 to 26 KB (Sonnet with a JSON schema).
- Each body has 2 messages, or 4 for the schema calls.
- The captures give no request count, token count, or turn count per agent.
  They cannot answer the question of cost per agent.
- No `haiku` request is in the captures.

### The recorded reasons for each choice

- `reviewer` and `debugger` moved to Sonnet 5.5 at `high` in commit `f7710bc8` (2026-10-02).
  Reason: in the 0.17.1 evals Sonnet at `high` passed `t5-review` 20 of 20 and the debug cases 40 of 40.
  The cost per pass was 52% to 56% of Opus 5.5.
  The commit says the cases are at the ceiling, so harder reviews are not tested.
- In 1.0.0 `reviewer` is Opus 5.5 `high` again.
  The commit log gives no reason for this change.
  Commit `c940923f` ("WIP the `agents` slice with seven agents") sets all values at once.
- `implementer` went to Sonnet in 0.5.0 (`wiki/evidence/Usage-Evidence.md`).
  No recorded eval is tied to that move.
- `investigator` is Haiku 5.5 because of cost.
  The Haiku price is $0.10 per million input tokens up to 100K prompt tokens, and $0.50 above.
  `HAIKU_CONTEXT_MAX` is 85,000 tokens, so the report turn stays below the step.
- `maxTurns` has no recorded measurement for 61, 41, and 31.
  The archived 0.28.0 note says `maxTurns: 60` did not bound 3 investigator runs.
  Those runs made 64 to 66 requests.
  The note says the count unit of `maxTurns` is not verified.
- `test-runner` (Haiku 5.5, 16 turns) was removed in commit `2df8299f`.
  A CLI, `dotclaude-run-checks`, replaced it.
- `TURNS_LEFT_AT` is 4: two turns to commit, one to report, one spare (commit `ba249cb8`).
  It must stay below the smallest `maxTurns`.

### Measured cost and calls

- The Max 20x week (2026-09-21 to 09-28) cost $1,854, with Opus 5.5 at 98.7%.
  It ran under the 0.x config, so it does not describe the 1.0.0 roster.
- `implementer`: 30.7% of cost, 155 runs, median 68 calls per run.
  The median is above the 61-turn bound.
  Most of these runs were on Opus 5.5.
- `general-purpose`: 17.6%, 87 runs, median 51 calls.
- Calls with a context over 150K carried 74.7% of cost.
- A fresh subagent writes about 14K tokens (p50) to the cache before its first tool call.
- The investigator runs of 2026-10-07 made 16 to 66 requests, ended at 110K to 223K context, and sent 0.8M to 8.9M input tokens each.
  One investigator ran 40% of the usage of one day.
- No per-agent figures exist for `planner`, `researcher`, or `debugger`.

### Turn and context limits in the session of 2026-10-13

- 30 agent runs finished: 23 messages came from `implementer` and 7 from `reviewer`.
  The `dotclaude:implementer` type was started 11 times and `dotclaude:reviewer` 4 times by name.
  No other type ran.
- `implementer` stopped for a context limit 3 times in the first wave: P05, P03, and P06.
  Each run reported "my context reached its bound" or "ran out of context".
- `implementer` stopped for the 61-turn limit about 4 times: P02 (twice, the first as a harness notice after 5m 45s), the P06a half, and P04.
  The harness notice said "stopped at its 61-turn limit (partial result)".
  The agent sent no report in the P02 case, so the parent inspected the worktree.
- `reviewer` hit no limit. Its runs took 41s to 2m 32s.
- The last 5 lines of "Context limit reached" at the end of the log follow agent reports.
  They most likely come from the root session, not from a subagent (inference).
- Work lost: no committed work was lost.
  Each stopped run left uncommitted edits in its worktree.
  A new `implementer` finished the same package in the same worktree each time.
  The cost was the repeated start (about 14K cache write) and a rereading of the brief and the files.
- Cause: each stopped package was too large for one run (P04, P06, P02 had many parts).
  The root agent split them (P06 into P06a and P06b, P04 into P04 and P08).
  The stopped runs were on track, not stuck.
  Their notes list done commits, verified tests, and the exact next steps.

## Implications for the dotclaude agents

- `implementer` and `debugger` at 61 turns: the limit cut on-track work at least 4 times, and it did no useful stopping.
  The one-way cost was a retry run.
  Recommend: remove `maxTurns` from `implementer`, and bound it by the context note (`SUBAGENT_CONTEXT_MAX`) and by a smaller brief.
  Keep `TURNS_LEFT_AT` only for agents that keep a limit.
- `investigator` at 31 turns: the only direct stuck-run evidence (paging a file in 30 KB steps for 66 requests) shows the context bound and the Haiku step at 100K matter more than turns.
  Keep a turn limit here, because stuck paging is the known failure.
  The size is unproven, so measure before a change.
- `reviewer`: no limit was hit in 4 to 7 runs.
  A limit costs nothing, but it gives no measured gain.
  The model has no recorded 1.0.0 reason.
  The 0.17.1 evals favor Sonnet `high` at about half the cost, with the ceiling caveat.
- `planner`, `researcher`: no run in any source.
  Keep the current values until a measurement exists.
- A turn limit that returns no report loses the report, not the work.
  A report-now note at 4 turns left did not prevent the stops at 61 turns (it ships in `ba249cb8` after the first P02 stop).
  Whether it works is not measured.

## Open questions

- Do the P02 and P04 stops happen after the note of `ba249cb8`, and did the note fire?
  The log does not say.
- Is `maxTurns` counted in model requests or in tool turns?
  The 0.28.0 note says it is not verified.
- Which real runs used `planner`, `researcher`, and `debugger`?
  A scan of `~/.claude/projects/` with `just usage` would give per-type calls and cost.
- Why did `reviewer` return to Opus 5.5 in `c940923f`?
  No eval or note is recorded.
- Are the Haiku 5.5 investigator runs below 100K context in 1.0.0?
  No 1.0.0 measure exists.
