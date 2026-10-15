# Costs of the Paid Tasks

Each paid task of [tasks.md](tasks.md) has an expected cost.
Ask the user before each paid run, with the cost and the current weekly share.
The weekly share was 54% on 2026-10-15.

| Task | Run | USD | Source of the estimate |
| --- | --- | --- | --- |
| 1.10 | 4 `-p` runs with a `Stop` agent hook | 0.10 | `live-checks.md`: `c3` 0.0234, `c3b` 0.0260, `c3c` 0.0193 |
| 3.2 | 1 `--resume` run with `/compact` | 0.03 | `handover-eval-300.md`: `p6` 0.0169 |
| 3.9 | 1 handover run | 0.02 | `handover-eval-300.md`: `p5` 0.0129 |
| 3.11 | 2 arms of 5 runs | 0.15 | `handover-edge-300.md`: v3 0.0714 for 5 runs |
| 3.13 | 5 runs with a wrong fact | 0.08 | `handover-edge-300.md`: v3-corrupt 0.0738 for 5 runs |
| 3.14 | 5 v3 and 5 native runs at 150k, then 5 v3 runs | 2.60 | `handover-edge-300.md`: v3 0.836, native 0.905 for 5 runs |
| 4.4 | 1 sandbox run | 0.02 | `p5` |
| 8.3 | about 6 cases with and without the style | 3.00 | past `claude plugin eval` runs: 0.53 to 0.72 USD for each case |
| 9.4 | 1 medium change, also for 9.5 | 3.00 | `external/sdd/eval/results.md`: `delta` arm 0.39 (Sonnet) to 2.79 (Fable) |
| 13.1 | 1 sandbox run | 0.02 | `p5` |
| 14.2 | 1 sandbox run | 0.02 | `p5` |
| 17.1 | the TUI and `stream-json` handover runs | 0.10 | `p5`, `p6` |
| 17.2 | the sessions of each plugin | 0.12 | `p5` |
| **Total** | | **about 9.26** | |

The ceiling is about 9.3 USD.
The big sweep cost 38.97 USD and the `zod` re-run cost 14.87 USD.
About 54 USD moved the weekly share from about 40% to 54%, so the total is about 2 to 3 points.
That ratio is a rough figure.
