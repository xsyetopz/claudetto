# Footprint: 0.4.0 against the baseline `62e2fe96`

Measured on 2026-11-06 with Claude Code 2.1.318 and Bun 1.4.4. The baseline tree is `/tmp/claudetto-baseline`.

## Prompt bytes

Command: `just prompt-bytes` and `just prompt-bytes /tmp/claudetto-baseline/plugins/claudetto` (`tools/prompt-bytes.ts`, task 1.3).

| Text | Baseline | 0.4.0 |
| --- | ---: | ---: |
| Root prompt | 5,218 | 4,443 |
| Tool texts | 6,595 (10 tools) | 5,592 (14 tools) |
| `/init` text | 1,144 | 935 |
| Context blocks | 677 | 516 |
| Budget line | 64 | 64 |
| Seven-day slow text | 151 | absent |
| Worktree base line | 354 | absent |
| Bun rule | 349 | 60 |
| `AGENT_ROSTER` | 196 | absent |

The tool-text total is over different sets:

- 0.4.0 rewrites 14 tools.
- `AskUserQuestion` and `ToolSearch` keep the stock text in 0.4.0.
- The baseline `SendMessage` text alone was 2,954 bytes; 0.4.0's is 947.

No row grew.

## Source lines

Command: `sh /tmp/footprint.sh <tree>`. For each plugin it counts with `find … | xargs cat | wc -l`:

- `.ts`/`.tsx` code without tests;
- test files: `*.test.ts`, `*.spec.ts`, `__tests__/` and `tests/`;
- prompt Markdown other than READMEs.

It skips `node_modules`, the generated `.claude-plugin/types`, and the recorded `fixtures/`.

| Plugin | Code, baseline | Code, 0.4.0 | Tests, baseline | Tests, 0.4.0 | Prompt `.md`, baseline | Prompt `.md`, 0.4.0 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `claudetto` | 16,125 | 6,827 | 13,530 | 6,489 | 183 | 93 |
| `claudetto-you-should-know` | 1,257 | 922 | 872 | 1,162 | 0 | 0 |
| `claudetto-openspec` | (upstream CLI) | 2,460 | (none) | 641 | (upstream skills) | 90 |
| Total | 17,382 | 10,209 | 14,402 | 8,292 | 183 | 183 |

`claudetto-openspec` replaces upstream OpenSpec 1.16.0. Upstream has 51,803 lines in `src/**/*.ts` and 95,443 skill bytes (task 1.4). The plugin's six skills are 7,415 bytes.

Total source lines fell from 17,382 to 10,209.

Two counts grew:

- **`claudetto-you-should-know` tests (872 → 1,162):** these are the colocated lab cases that parity rows ask for (7.1).
- **Prompt Markdown (183 → 183 in total):** flat, because the new `claudetto-openspec` skills take the lines the core plugin dropped.

## First request, cached prefix, and hook latency (task 7.5)

Measured on 2026-11-06 against the fake API, so no tokens were paid. The 1.8 transcripts cannot be repeated, because no saved session ran 0.4.0. Token counts and cache read and write per turn need a paid run, which waits on the user (see 7.5 in `tasks.md`). Bytes stand in for tokens here.

Scripts: `/tmp/probe-75/req.ts` reads each run's saved request bodies. `/tmp/probe-75/setup-arms.ts` runs the same one-tool-call session as the hook-latency recipe below with every setup group's settings merged. Both arms get the same settings.

**First request, in bytes (Haiku, `RUN:echo hi`):**

| Run | Baseline | 0.4.0 before the fix | 0.4.0 |
| --- | ---: | ---: | ---: |
| Bare `-p`, no settings | 36,902 | 47,683 | 18,065 |
| Setup's settings | 18,787 | 19,058 | 19,058 |

**Cached prefix:** in every run of both arms, turn 2 sends the same `system` and `tools` as turn 1, and its messages extend turn 1's. The one difference is form: turn 1 sends a message as a text-block array that carries the cache marker, and turn 2 sends the same text as a plain string. Both are the same tokens.

**Growth found and fixed.** 0.4.0 defers `Skill`, and with `Skill` gone from the upfront tools, the stock `Workflow` text grows to 20,256 chars (the baseline's `deny.ts:31` records the same jump). The feature-map row "Unused built-in tools" says to defer `Workflow`, `ScheduleWakeup`, and `ReportFindings`. 0.4.0 only denied them through setup, so a session without setup sent all three. `hooks/surface.ts` now defers them too, tested by "${tool} goes behind ToolSearch with its stock text".

**Growth kept, with its reason.** Under setup's settings, 0.4.0 is 271 bytes larger (1.4%):

- task 5.21 keeps `Agent` sent (review L17 item 3), where the baseline deferred it;
- `ToolSearch` keeps its stock text (953 chars against the baseline's 234; see above);
- the system prompt (−777) and messages (−1,002) are smaller.

A probe that deferred `ListAgents` gave 18,383 bytes, and on 2026-11-06 `DEFERRED_TOOLS` took `ListAgents` (lab 1062 pass); the paid +180 tokens below were measured before that change. `Agent` stays sent whatever `DEFERRED_TOOLS` holds, because no 0.4.0 `tool.describe` hook matches it.

**Hook latency.** `just hook-latency` (`tools/hook-latency.ts`, removed under task 17.13 with the probing tool whose fake API it ran on; the results below stay) on 0.4.0, then on `/tmp/claudetto-baseline/plugins/claudetto`, then on 0.4.0 again, 3 runs each:

| Measure | Baseline | 0.4.0 (two passes) |
| --- | ---: | ---: |
| Session start to first API request, ms | 574, 547, 567 | 466, 469, 515 / 467, 477, 495 |
| `tool.call` mean | 152.5 | 146.1 / 145.9 |
| `session.start` mean | 48.1 | 90.5 / 79.4 |
| `classic.SessionStart` mean | 11.6 | 32.5 / 32.5 |
| `prompt.submit` mean | 14.7 | 12.2 / 12.6 |
| `tool.check` mean | 10.5 | 6.3 / (below 7) |

Session start reaches the API about 80 ms sooner. Two hooks grew; each was tested on a copy with one part removed:

- **`session.start` (+30–40 ms):** 0.4.0 registers `ask-user-question` and `monitor` in `register.ts`. Without that hook it measured 46.0 ms.
- **`classic.SessionStart` (+21 ms):**
  - the setup start check (version floor, tool notice, rule report) and the hygiene sweep start each pay one shared first-call cost;
  - with either removed it measured 28.1 or 29.8 ms, and with both removed 3.2 ms;
  - both are kept: they are features of 0.4.0 (5.x), and the whole start is still faster.

## Paid run for task 7.5: tokens and cache per request, 2026-11-06

Hypothesis: 0.4.0's first request is about 180 tokens larger than the baseline's under setup's settings (the +271 bytes above), and the second request keeps the first as its cached prefix. Check: `/tmp/probe-75p/paid.ts LABEL PLUGIN_DIR WORKDIR` under `bun --env-file=<repo .env>`, 2 repeats per arm, `claude -p` on `claude-haiku-5-5`, setup's merged settings, `--setting-sources project,local --strict-mcp-config --no-session-persistence --max-budget-usd 0.5`, prompt "Run `echo hi` with the Bash tool, then reply with the word done." Each session made 2 API requests. Raw rows: `/tmp/probe-75p/{base1,base2,new1,new2}.jsonl`.

| Run | Request | Input | Cache write | Cache read | Output |
| --- | --- | ---: | ---: | ---: | ---: |
| baseline 1 | 1 | 2 | 9,048 | 0 | 16 |
| baseline 1 | 2 | 2 | 265 | 9,048 | 3 |
| 0.4.0 1 | 1 | 2 | 9,228 | 0 | 16 |
| 0.4.0 1 | 2 | 2 | 258 | 9,228 | 3 |
| baseline 2 | 1 | 2 | 4,075 | 4,972 | 16 |
| baseline 2 | 2 | 2 | 266 | 9,047 | 3 |
| 0.4.0 2 | 1 | 2 | 3,864 | 5,366 | 17 |
| 0.4.0 2 | 2 | 2 | 261 | 9,230 | 3 |

Session totals: baseline 18,384 and 18,383 tokens ($0.00130, $0.00072); 0.4.0 18,737 and 18,745 tokens ($0.00132, $0.00070). Total paid: 74,249 tokens, about $0.004.

Result: the first request (cache write plus read) is 9,228 against 9,048 tokens, +180 (+2.0%), as predicted; the second request reads the whole first request in all four sessions and writes 258-266 new tokens in both arms. Growth is kept for the reason recorded above (`Agent` and `ListAgents` stay sent, task 5.21). Cost per session is equal within the cache-warm variation between repeats. Hook latency was measured free (table above).
