# Paid Labs (2026-11-18)

These labs ran Claude Code 2.1.327 on Sonnet 5.5 (and Haiku 5.5 as a subagent), with `claude -p` on subscription auth. Runs used `--setting-sources project --strict-mcp-config` and `CLAUDE_CODE_DISABLE_CLAUDE_MDS=1`, so no user settings, MCP servers or CLAUDE.md files took part. Costs are the `total_cost_usd` figures the CLI reports.

The sandbox blocks the child `claude` from writing session files, so `--resume` fails ("No conversation found"). Multi-turn labs therefore send their turns to one process as stream-json input.

## A/B: Finder Model and Effort (ADR-0117, CTX-732, REQ-DELEGATION-050)

Hypothesis: a Haiku finder subagent answers code lookups as well as a Sonnet finder for less, and effort high costs about 1.9x medium.

Check: `ab/run.py` on `git archive 088a227c plugins` (261 files). The 12 tasks in `ab/tasks.json` ask for a file and line, a constant, the members of a list, or a count. Each task was run 3 times in each of four arms, 144 runs in all.

| Arm | Setup |
|---|---|
| H | Sonnet lead at medium, told to delegate all searching to a `finder` agent (Haiku, Read/Grep/Glob) |
| S | The same, with a Sonnet finder |
| M | Sonnet alone at medium, with Read/Grep/Glob |
| X | Sonnet alone at high, with Read/Grep/Glob |

Grading: every gold string must appear in the reply. Numbers must appear after the reply's `ANSWER:` line, and `_`, `,` and backticks are ignored.

The first answer key for T12 listed 18 hook events and was wrong. Both smoke arms also found `classic.SessionStart` and `classic.StopFailure`, so the key now lists 20 (`smoke3.jsonl` is regraded with it).

| Arm | Correct | Median cost | Median time | Median tokens (cache reads included) | Total |
|---|---|---|---|---|---|
| H | 36/36 | $0.0166 | 8.2 s | 69.1k | $0.60 |
| S | 36/36 | $0.0306 | 10.2 s | 68.1k | $1.12 |
| M | 36/36 | $0.0093 | 3.9 s | 39.4k | $0.43 |
| X | 36/36 | $0.0169 | 4.6 s | 54.7k | $0.71 |

Result:
- The Haiku finder matches the Sonnet finder's accuracy at 54% of its median cost, and it is faster.
- Delegating a single lookup costs more and takes longer than letting the lead search: H costs 1.8x M and takes 2.1x as long.
- Effort high costs 1.8x medium and uses 1.39x the tokens, with no accuracy gain on these tasks.

Limits:
- The tasks are lookups. Harder reasoning and long multi-file work were not graded.
- The lead was Sonnet here. The Opus lead run follows in the next section.

## Concise Line and Thinking Tokens (CTX-498)

Hypothesis: "Be clear and concise." raises thinking tokens, and naming the reader works better.

Check: `concise/concise.py` writes one README install section with `--tools ""`, in three arms: no line, "Be clear and concise.", and a line naming the reader. Each arm ran 5 times at medium and 5 times at high, through `--append-system-prompt`. `usage.output_tokens_details.thinking_tokens` gives the thinking.

| Effort | Arm | Output tokens | Thinking tokens | Median reply chars |
|---|---|---|---|---|
| medium | none | 343-409 | 0 | 821 |
| medium | concise | 289-375 | 0 | 702 |
| medium | reader | 103-110 | 0 | 226 |
| high | none | 379-566 | 56-160 | 938 |
| high | concise | 419-502 | 88-113 | 802 |
| high | reader | 373-465 | 187-269 | 426 |

Result:
- The concise line did not raise thinking.
- Naming the reader raised thinking at high effort, yet gave the shortest replies and the lowest total output.
- At medium effort no arm thought at all.
- Cost: $0.15.

## Compaction Latency (CTX-474)

Hypothesis: large tool outputs make manual compaction take 60-80 s.

Check: `compact/compact.py` runs one stream-json session. The first turn reads either three 80 KB plan files or one 2 KB file, and the second turn is `/compact`. `compact_metadata.duration_ms` comes from the `compact_boundary` event.

| Context | Tokens before / after | Compaction time (3 runs) |
|---|---|---|
| Three 80 KB reads | about 122k / 3.2k | 10.5 s, 9.3 s, 9.8 s |
| One 2 KB read | about 17k / 3.6k | 8.1 s, 7.9 s, 7.5 s |

Result: not reproduced. The large context adds about 2 s. Cost: $1.42.

## Cache Retention on Subscription (CTX-163)

Hypothesis: on subscription auth with no `promptCacheTtl` set, `claude -p` writes a 1-hour cache.

Check: four fresh `claude -p "Reply with the single word OK." --model sonnet` runs with identical flags. Run 1 wrote the cache. The later runs came 436 s, 441 s and 865 s after it, and each came more than 5 minutes after the previous use of the prefix.

Result:
- Run 1 wrote 15,879 tokens, all `ephemeral_1h_input_tokens`. Each later run read 15,879 and wrote 0, at $0.0016 per run against $0.064 for run 1.
- Confirmed: subscription auth gets a 1-hour TTL by default.
- API-key auth was measured on the fake API instead (cost-pricing.md CTX-163): a key login sends no `ttl` (the 5-minute default), and a key with `promptCacheTtl: "1h"` sends `1h`.

## Deny List Visibility (CTX-595)

This check was free: cc-inspect `cli` against the fake API, with `--settings` holding marker deny rules. Pattern rules such as `Bash(zzq:*)` appear in no request, stream or transcript. A bare tool-name rule (`Write`) removes that tool from the tools list.

## Subagent History (RISK-204)

This check was free: cc-inspect `cli` against the fake API. The parent prompt held a marker word and the model called `Agent` with `subagent_type: "general-purpose"`. The marker appears in main-loop requests 1, 2 and 8 and in none of the subagent's requests 3 to 7. A typed subagent gets its brief, not the parent conversation.

## A/B With an Opus Lead (ADR-0117, CTX-731, CTX-732, REQ-DELEGATION-050)

Hypothesis: a Haiku finder pays off when the lead runs on a dearer model.

Check: `ab/run.py` with arms OH (Opus 5.5 lead at medium, Haiku finder), OM (Opus alone, medium) and OX (Opus alone, high). Same 12 tasks, same snapshot (`git archive 088a227c plugins`), 3 runs each. Data: `ab/runs-opus.jsonl`. Cost $5.46.

| Arm | Correct | Median cost | Median time | Median tokens | Total |
|---|---|---|---|---|---|
| OH | 36/36 | $0.0384 | 14.35 s | 54.6k | $1.79 |
| OM | 36/36 | $0.0449 | 7.15 s | 54.5k | $1.78 |
| OX | 36/36 | $0.0430 | 7.25 s | 54.4k | $1.89 |

Result: the OH lead delegated in 36 of 36 runs. The finder cut the median cost to 0.86x and doubled the time, with equal totals. On Opus, high effort costs about the same as medium; on Sonnet it cost 1.8x.

## Seeded Logic Bugs (ADR-0183)

Hypothesis: a review misses logic faults that a reader can see.

Check v1: `logic/run.py`, 8 single-function seeded bugs and 2 clean functions (`logic/cases.py`), Haiku, Sonnet and Opus 5.5 at medium and high, 3 runs each, 180 runs, $1.11. Data: `logic/runs.jsonl`.
Result v1: every arm found 24 of 24 bugs with no extra lines. Clean code: Haiku high 3/6, Haiku medium 5/6, Sonnet and Opus 6/6.

Check v2: `logic/v2.py`, one 66-line module holding 4 bugs (lines 19, 27, 53, 64), a design-only prompt and a correctness prompt, Haiku, Sonnet and Opus medium plus Opus high, 3 runs each, 24 runs, $0.76. Data: `logic/runs-v2.jsonl`.
Result v2: a keyword grade on each bug cause shows every reply naming all 4 bugs under both prompts. The script's line-citation grade understates Opus because Opus cites lines as bold numbers in tables. Opus high added a correctness section to a design review.

Check Fable (approved 2026-11-18): v1 at `claude-fable-5-2:high`, 30 runs, $0.66, data `logic/runs-fable.jsonl`; v2 at Fable medium and high, 12 runs, $1.19, data `logic/runs-v2-fable.jsonl`. Two smoke calls (`Reply with OK.`) on `claude-fable-5-2` and `claude-mythos-5-2` at high, $0.061 and $0.057.
Result Fable: v1 24 of 24 bugs, 0 extra lines, clean 6 of 6. v2: all 12 replies name all 4 bugs under both prompts; the line grade gives one high design reply 2 of 4 because it cites lines 27 and 64 as table cells (`| 27 |`), which the regex does not read. The user-reported Fable pattern (more bad ideas caught, less bad logic) is not reproduced on these cases.

Limits: the bugs are single-function and seeded; real multi-file faults are not covered.

## Plain English (ADR-0182)

Hypothesis: "Reply in plain English." makes replies score better on the ADR-0182 parse features.

Check: `plain/run.py`, 6 explanation prompts x 2 runs, Sonnet and Opus 5.5 at medium, the line appended to the system prompt against nothing; `plain/score.py` with spaCy en_core_web_sm. $1.00. Data: `plain/runs.jsonl`. Medians:

| Model | Arm | Words | Sentence length | FK grade | Long clusters /100 | Passive /100 | Reduced relatives /100 | Dependency distance |
|---|---|---|---|---|---|---|---|---|
| Opus | none | 488 | 13.7 | 8.4 | 0.8 | 0.8 | 0.2 | 2.5 |
| Opus | plain | 484 | 13.6 | 7.9 | 0.4 | 0.6 | 0.3 | 2.4 |
| Sonnet | none | 478 | 14.3 | 8.5 | 0.7 | 0.6 | 0.0 | 2.6 |
| Sonnet | plain | 474 | 13.6 | 8.5 | 0.6 | 1.0 | 0.2 | 2.5 |

Result: per prompt, Opus had fewer long noun clusters on 6 of 6 and fewer passives on 4 of 6. Sonnet showed no consistent change. Both baselines already read at grade 8.5. Only the phrase was tested, not the full rule with its features.

## Rule Adherence by Context Size (OUT-120)

Hypothesis: system rules hold less well as the context grows.

Check: `adherence/run.py`, Sonnet 5.5 medium, two appended system rules (the last line reads END-OF-REPLY; no lists). Turn 1 pastes plan text; turns 2-4 ask list-inviting questions, each sent after the previous result. 3 sessions per size. Cost $6.09 (`runs.jsonl` and `smoke.jsonl`; the first session of each size pays the cache write).

| Size | Context | END kept | No-lists kept (question replies) |
|---|---|---|---|
| short | about 29k | 9/9 | 9/9 |
| mid | about 410k | 9/9 | 8/9 (one reply, 11 list lines) |
| long | about 714k | 8/9 | 7/9 (12 and 10 list lines, both on the first question) |

Result: confirmed. Rule loss grows with context. In every long session auto-compaction fired after the first question and cut the context to 4k-6k; one reply after that dropped END.

## MCP Spill at a 10,000 Cap (ADR-0179, REQ-SETUP-055)

Free fake-API probe, recorded in `../handover-probes/mcp-spill/`. A 20,000-character result enters whole; a 200,000-character result becomes a file notice that tells the model to read the whole file.

## Policy Tier (CTX-441)

Free fake-API probe, recorded in `../handover-probes/probe-l/`. Remote managed settings that disable `privacy` and `agents-md` win over `--settings`, and any policy source seats `sec-default`.
