# 18.5: read-guard adherence

Hypothesis: the plugin's read guard (`hooks/surface.ts` `tool.call` on `Read`, option `readGuardEnabled`, default on) denies a `Read` with no `limit` on a lock file, a `.min.js`/`.map` file, or a file under `node_modules`, so fewer sessions land a whole read of a large file than without the plugin. The model still tries: the denial comes after the call.
Prediction (written before any paid run):

- Sessions that call `Read` with no `offset` on a large file (20,000 bytes or more) ("attempts"): no significant difference between the arms, Fisher p > 0.05.
- Sessions in which such a call is not denied ("landed"), on the four heavy-file tasks: fewer with the plugin, Fisher p < 0.05.
- The two control tasks (large files the guard does not name) show no difference in either count.

Arms: `base` runs with no plugin; `change` runs with `--plugin-dir plugins/claudetto` (copied per session, so `armDiff` checks the init frame for the `claudetto` plugin and the model). Both use `--no-session-persistence`, `claude-sonnet-5-5`, a fresh `CLAUDE_CONFIG_DIR`, setting sources `project,local`, and `--permission-mode acceptEdits` with a short Bash allow list. A session is killed past 300,000 tokens.
Tasks (`probe.ts`, generated from fixed seeds): six questions that need one fact from one large file: `lock` (package-lock.json, 600 packages), `bunlock` (bun.lock, 1,500 lines), `minjs` (vendor/dash.min.js, 400 lines), `nodemod` (node_modules/legacy-util/lib/index.js, 3,000 lines), and the controls `bigsrc` (src/engine.ts, 3,500 lines) and `biglog` (logs/app.log, 6,000 lines). The prompts do not mention `offset`, `limit`, or search tools.
Count: a session counts when its stream holds a `Read` tool call whose input has no `offset`, whose path is in the session's workspace, and whose file is at least 20,000 bytes. "Landed" is the same call with a tool result that is not an error.

Free check first: `bun probe.ts --n 5` printed `plan: 60 sessions, bound 18000000 tokens` (the bound is 300,000 per session; real sessions use far less). A dry run on the fake API (`--dry --n 1`) ran 12 sessions at no cost and showed the plumbing: with the plugin, a fake whole `Read` of each heavy file was denied (landed 0/4 against 4/4).

Pilot, 4 paid sessions on Sonnet (`--only '^(lock|bigsrc)$' --n 1`, $0.2169, kept out of the counts below, its ledger rows are in `ledger.jsonl`).

Command (the probe is run from the repo root; the paid run was started twice by mistake, see below):

```sh
bun --env-file=.env openspec/changes/release-0-4-0/evidence/18-5/probe.ts --run --n 5 --model claude-sonnet-5-5
bun openspec/changes/release-0-4-0/evidence/18-5/probe.ts --report --out /tmp/probe-18-5/out   # report.txt
```

`harness.ts` imports the runner from `/tmp/claudekit-leftovers/claudekit` (the removed tool) by absolute path; `sessions.jsonl` has one row per session and `report.txt` is recomputed from it.
Sample: 60 sessions per arm (6 tasks × 10), because the first launch was started as a shell background job, kept running after its shell ended, and the relaunch ran the same plan again. Both runs are the same design and are pooled; no row was dropped. Arm check passed for all 120 sessions.

Result: the prediction failed. The plugin arm called `Read` without `offset` on a large file far more often, and landed more whole reads, not fewer.

| Arm | Attempts (sessions) | Wilson 95% | Landed (sessions) | Wilson 95% |
| --- | --- | --- | --- | --- |
| base | 2/60 | 0.009–0.114 | 2/60 | 0.009–0.114 |
| change | 50/60 | 0.720–0.907 | 22/60 | 0.256–0.493 |

Fisher two-sided: attempts p < 0.0001, landed p < 0.0001 (both printed as 0.0000).
Heavy-file tasks (lock, bunlock, minjs, nodemod, 40 sessions per arm): attempts 2/40 (0.014–0.165) against 33/40 (0.681–0.913), p < 0.0001; landed 2/40 against 9/40 (0.123–0.375), Fisher p = 0.0476, in the direction against the prediction.
Control tasks (bigsrc, biglog, 20 per arm): attempts 0/20 (0.000–0.161) against 17/20 (0.640–0.948), p < 0.0001; landed 0/20 against 13/20 (0.433–0.819), p < 0.0001.
The guard itself worked as written: in the change arm, 33 tool errors read "This is a lock, generated, or build file..." (counted over every change-arm run folder, pilot included), and the heavy-file reads that landed all carried a `limit` (50, 60, or 80).
Why the plugin arm reads more is a hypothesis, not a measurement: the change arm shows 62 tool errors "Permission to use Bash denied by plugins claudetto, cc-plugin-privacy: Use `Read` to read a file, not the shell", and the base arm shows none; the base arm used `Bash` 86 times and `Read` 14 times, the change arm `Read` 132 times and `Bash` 79 times (all run folders, pilot included). So the guard cannot lower attempts when the plugin moves file reads from `grep` to `Read`.
Cost and size: base 2,503,888 tokens, $1.1892, largest session 119,822 tokens; change 4,538,953 tokens, $5.4144, largest 227,848 tokens. No session was capped. Total $6.6036 for the 120 sessions; with the 4-session pilot, $6.8205 (`ledger.jsonl`).
Caveat: one model (Sonnet), synthetic files, a prompt that asks one question per session.

Process check after the runs: `ps -axo pid,ppid,command | grep probe-18-` showed no process under `/tmp/probe-18-5` or `/tmp/probe-18-6`, and no `fake/server.ts` of ours. The harness stops each fake in a `finally`.
