# 18.6: bounded-output benefit

Hypothesis: `bound-output` (`hooks/limits/bound-output.ts`, option `maxTestOutputChars`, default 8000) keeps the head and tail of a long `bun test` output and saves the rest, so the model reads less. Output tokens are what the model writes, so the cut should change them little; the saving is in input tokens.
Prediction (written before any paid run):

- Output tokens per session, `base` against `change`: no significant difference, Mann-Whitney p > 0.05 and permutation test of the mean p > 0.05.
- `change` against `nocut` (the plugin with `maxTestOutputChars` 0, the only arm that isolates `bound-output`): no significant difference in output tokens.
- A cut marker appears in fewer than half of the `change` sessions, because the model often pipes `bun test` through `head` or `tail` itself (seen in a one-session pilot).

Arms: `base` (no plugin), `change` (`--plugin-dir plugins/claudetto`), and `nocut` (the plugin with `pluginConfigs.claudetto.options.maxTestOutputChars = 0`, passed in `--settings`). Same flags as 18.5: `claude-sonnet-5-5`, `--no-session-persistence`, 300,000-token cap per session.
Tasks (`probe.ts`): six Bun projects with 40 functions and 40 tests that each print 3, 8, or 14 lines of 100 characters; one function carries an off-by-one (index 5 or 33). Prompt: run `bun test`, find the cause of the failing test, fix `src/lib.ts`, and name the function in one sentence. Full output is about 13 KB, 35 KB, and 62 KB. Passing is `src/lib.ts` holding no `x + N + 1`.
Count: `output_tokens` of each session's `result` frame (all requests of the session summed). The report also gives input plus cache tokens, cut markers (`[claudetto: cut` in a tool result), fixes, and cost.

Free check first: `bun probe.ts --n 5` printed `plan: 90 sessions, bound 27000000 tokens`; a dry run on the fake API ran 3 sessions at no cost. A one-session paid pilot per arm (`--only noise14-bug33`, $0.1036, kept out of the counts) showed the model piping `bun test` through `head` and `tail` and no cut marker.

Command (started twice by mistake, see below):

```sh
bun --env-file=.env openspec/changes/release-0-4-0/evidence/18-6/probe.ts --run --n 5 --model claude-sonnet-5-5
bun openspec/changes/release-0-4-0/evidence/18-6/probe.ts --report --out /tmp/probe-18-6/out   # report.txt
```

`../18-5/harness.ts` holds the runner and the tests: Mann-Whitney U (ties, normal approximation) and a seeded permutation test of the mean (100,000 shuffles). `sessions.jsonl` has one row per session; `report.txt` is recomputed from it.
Sample: 60 sessions per arm (6 tasks × 10), 180 in all, because the first launch kept running after its shell ended and the relaunch ran the same plan again; the two runs are pooled and no row was dropped. Arm check passed for all 180.

Result: the predictions about `base` against `change` and `nocut` against `change` failed; the plugin arm wrote about three times the output tokens. Bound-output fired in 6 of 60 `change` sessions, so it is not the cause.

| Arm | Output tokens, total | Mean (bootstrap 95%) | Median | Fixed (Wilson 95%) | Cut markers | Input + cache tokens | Cost | Largest session |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| base | 21,897 | 364.9 (359.4–371.4) | 363 | 60/60 (0.940–1.000) | 0 | 3,598,717 | $2.0421 | 81,387 |
| change | 62,980 | 1,049.7 (992.9–1,098.6) | 1,052 | 58/60 (0.886–0.991) | 6 | 4,680,413 | $2.2945 | 105,403 |
| nocut | 50,738 | 845.6 (742.7–936.3) | 986 | 50/60 (0.720–0.907) | 0 | 5,021,912 | $2.2927 | 146,418 |

- `base` against `change`: Mann-Whitney p < 0.0001, permutation p < 0.0001.
- `nocut` against `change` (the arm pair that isolates `bound-output`): Mann-Whitney p < 0.0001, permutation p = 0.0003. `change` wrote more output than `nocut`, so the cut did not lower output tokens; the six cut markers came from 6 sessions, too few to explain a 200-token gap.
- Fixed, `base` against `change`: Fisher p = 0.4958. `nocut` fixed 50/60, which this probe did not examine.
- Input plus cache tokens: `change` 4,680,413 against `nocut` 5,021,912 (7% less); not tested.
No session was capped. Total for the 180 sessions $6.6293; with the 3-session pilot, $6.7330 (`ledger.jsonl`). Together with 18.5 the ledgers sum to $13.55 (307 rows).
The plugin's own difference (about 700 output tokens more than `base` with or without the cut) comes from the plugin, not `bound-output`; its cause was not examined here.
Caveat: one model (Sonnet), synthetic tests, a prompt that names `bun test`; the model often pipes the output through `head` or `tail` itself, which is why the cut rarely fires.

Process check after the runs: `ps -axo pid,ppid,command | grep probe-18-` showed no process under `/tmp/probe-18-5` or `/tmp/probe-18-6`, and no `fake/server.ts` of ours.
