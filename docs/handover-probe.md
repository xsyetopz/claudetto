# Handover probe: paid run 2 (task 3.3)

Run on 2026-11-09 with Claude Code 2.1.319, a `claude setup-token` login, and `tools/handover-probe` at `fee4378b`, scored by the scorer of `2c419b3c`. The command was `bun tools/handover-probe/probe.ts --paid`, and its raw output is `probe-paid.md` in commit `78673c5b`, which is not in the tree now. That file's recall column comes from the old scorer and is wrong; the recall below rescored the same streams.

Each arm ran 3 times on one scripted 40-turn task. A real run spans about 25,000 to 65,000 tokens of context, so every threshold sits inside that span.

## Result

The default of `handoverThresholdTokens` stays the smaller of 400,000 and half the window. The spec moves it only when a forked handover costs less than the built-in compaction in all 3 runs, and none did. Paired by run number, B53 cost less than C in runs 1 and 2 ($1.56 against $1.66, $1.52 against $1.61) and more in run 3. B45 cost less only in run 2, and B35 only in run 1. C-3 never compacted, so a fourth C run would be needed to settle B53. Recall decided nothing, because every run of every arm kept all 10 decisions.

## Runs

The cost is Claude Code's own `total_cost_usd`: the last value per session, summed over the run. It is an estimate, because the login is a subscription. The token columns are the API's usage summed over every request the relay logged. The peak is the largest main-loop context. Events are listed as turn: tokens.

| Run | Events | Peak | Cache read | Cache write | Input | Output | Cost | Recall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A-1 | clears at 9: 28,041; 19: 46,629; 29: 38,080 | 46,629 | 2,482,843 | 47,043 | 148,678 | 65,880 | $1.59 | 10/10 |
| A-2 | clears at 9: 32,118; 19: 42,982; 29: 36,106 | 42,982 | 2,683,706 | 52,103 | 149,760 | 67,574 | $1.68 | 10/10 |
| A-3 | clears at 9: 31,745; 19: 32,779; 29: 37,545 | 44,016 | 3,351,057 | 75,260 | 154,952 | 74,529 | $1.83 | 10/10 |
| B35-1 | 3 handovers, first at 12: 36,803 | 39,516 | 2,499,331 | 46,336 | 214,844 | 68,702 | $1.55 | 10/10 |
| B35-2 | 7 handovers, first at 11: 36,497 | 43,716 | 3,863,561 | 114,631 | 267,006 | 117,071 | $3.23 | 10/10 |
| B35-3 | 5 handovers, first at 12: 37,454 | 40,815 | 3,180,614 | 67,106 | 223,921 | 87,335 | $2.17 | 10/10 |
| B45-1 | 1 handover at 17: 47,848 | 50,910 | 3,114,425 | 46,308 | 204,940 | 73,877 | $1.76 | 10/10 |
| B45-2 | 1 handover at 19: 45,702 | 46,452 | 2,734,860 | 40,731 | 193,320 | 65,757 | $1.49 | 10/10 |
| B45-3 | handovers at 15: 46,553; 32: 45,595 | 49,678 | 3,160,936 | 54,992 | 210,868 | 75,588 | $1.90 | 10/10 |
| B53-1 | 1 handover at 27: 54,337 | 54,774 | 2,885,314 | 40,351 | 191,852 | 66,742 | $1.56 | 10/10 |
| B53-2 | 1 handover at 25: 53,469 | 54,130 | 2,801,217 | 39,770 | 188,621 | 65,865 | $1.52 | 10/10 |
| B53-3 | 1 handover at 23: 55,235 | 55,852 | 3,111,381 | 47,319 | 190,937 | 74,288 | $1.77 | 10/10 |
| C-1 | compaction at 22: 54,907 | 52,914 | 2,758,940 | 44,969 | 156,322 | 66,650 | $1.66 | 10/10 |
| C-2 | compaction at 24: 54,742 | 52,746 | 2,812,793 | 43,895 | 160,467 | 64,725 | $1.61 | 10/10 |
| C-3 | none: the context peaked under 53,000 | 42,576 | 2,247,243 | 17,900 | 168,262 | 39,798 | $0.88 | 10/10 |
| D-1 | compactions at 11: 37,924; 14: 40,998; handovers at 26: 47,455 and later at 46,370 | 47,935 | 3,619,296 | 72,830 | 216,042 | 96,568 | $3.47 | 10/10 |
| D-2 | compactions at 11: 34,479; 13: 41,893; handover at 23: 45,862 | 46,471 | 2,836,790 | 65,989 | 192,778 | 74,453 | $2.87 | 10/10 |
| D-3 | compactions at 11: 35,826; 13: 41,216; handover at 25: 46,644 | 47,294 | 2,925,417 | 63,277 | 196,827 | 83,162 | $3.12 | 10/10 |

## Caveats

- The model's answer length varies from run to run, and it moves the cost more than the arm does. C-3 wrote 39,798 output tokens against about 65,000 in C-1 and C-2, so its context never reached the threshold and it cost $0.88.
- Each run also sent about 100 side requests that carry no tools; they are part of every total.
- A compaction can start under its threshold, because Claude Code checks an estimate: D compacted at 34,479 for a threshold of 40,000.
- The proxy sink caught 1 `CONNECT api.anthropic.com:443` that bypassed `ANTHROPIC_BASE_URL`. The probe does not record which run sent it. The sink refused it, and every run finished all 40 turns.
