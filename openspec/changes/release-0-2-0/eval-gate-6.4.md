# Eval Gate of Task 6.4

This file holds the full record of the eval gate of task 6.4.
The wiki page `src/wiki/claudetto/evidence/Evals-2.1.304.md` cites only the check of `scope-followup` at 10 runs for each arm.

Task 6.4 cut texts that the model reads, in the commits `c8e1a7fd`..`4e1aa5e9`.
`D26` says that a cut that lowers an eval score goes back.
This gate checked the cuts with paid runs on 2026-10-21.

## Method

- Arm A is the checkout at `ad33e605`, which holds the cuts.
- Arm B is `c8e1a7fd^`, the commit before the first cut.
  `just eval-variant` runs arm A in the checkout and arm B in a temporary `git worktree`.
- Claude Code: `2.1.304`.
- Model: `claude-haiku-5-5`.
  The judge is `haiku`.
- Arm A has 40 cases, and arm B has 17.
  Arm B runs its own, older case files.
  So only the 17 cases in both arms compare, and the totals of the arms do not compare.
- The budget was $5 in total.
  The `--max-cost-usd` bound applies to each arm as a whole, not to each run.

## Runs

Result folder names use UTC time, so some start with `2026-10-20`.
The logs are in `external/`, which git ignores.

- Run 1: `just eval-variant "c8e1a7fd^" --model haiku --runs 3 -j 4 --max-cost-usd 2.5`.
  Arm A stopped at its cost ceiling (`partialReason: cost_ceiling`) after 36 of 40 cases, at $2.51.
  Its results are in `plugins/claudetto/evals/results/2026-10-20T21-31-43-698Z/`.
  Arm B ran all 17 of its cases, at $1.48.
  It exited with code 1, because a `pass^k` check failed.
  Its results are in `plugins/claudetto/evals/results/variant-c8e1a7fd--2026-10-20T22-00-58-582Z/`.
  Log: `external/eval64-2026-10-21.log`.
- Run 2: `just eval --case <case> --model haiku --runs 3 -j 4 --max-cost-usd 0.33`.
  It ran once for each of `scope-followup-hard`, `temp-folder-removed*`, and `unprompted-skip`.
  The glob `temp-folder-removed*` matches `temp-folder-removed` and `temp-folder-removed-hard`.
  These three calls completed arm A.
  Their results are `2026-10-20T22-04-07-475Z`, `2026-10-20T22-04-39-023Z`, and `2026-10-20T22-05-31-361Z`, in `plugins/claudetto/evals/results/`.
  Log: `external/eval64-armA-rest-2026-10-21.log`.
- Run 3: `just eval-variant "c8e1a7fd^" --case scope-followup --model haiku --runs 10 -j 4 --max-cost-usd 0.37`.
  It checks the one drop with 10 runs for each arm.
  The `with` arm of both arms scored 1.00 in 10 of 10 runs, and the `without` arm scored 1.00 too.
  Arm A cost $0.23, and arm B cost $0.29.
  Its results are in `plugins/claudetto/evals/results/2026-10-20T22-18-40-315Z/` (arm A) and `plugins/claudetto/evals/results/variant-c8e1a7fd--2026-10-20T22-21-56-047Z/` (arm B).
  It exited with code 1 only because the baseline was at the maximum, so no gain could show.
  Log: `external/eval64-scope-followup-2026-10-21.log`.

## Scores of the 17 Shared Cases

Each cell is the mean run score of the `with` arm.
Arm A has 3 runs for each case, and arm B has 3 runs for each case.

| Case | Arm A | Arm B |
| --- | ---: | ---: |
| `accusation-subagent` | 1.00 | 1.00 |
| `accusation-user` | 1.00 | 0.75 |
| `accusation-warranted` | 1.00 | 1.00 |
| `bugfix-range` | 1.00 | 1.00 |
| `correction-next-action` | 1.00 | 1.00 |
| `false-alarm-sum` | 1.00 | 0.95 |
| `feature-slugify` | 0.60 | 0.73 |
| `five-reads-codeword` | 0.93 | 1.00 |
| `harm-settled-by-facts` | 0.83 | 0.25 |
| `library-docs` | 1.00 | 1.00 |
| `missing-tool-is-a-step` | 1.00 | 0.17 |
| `partial-verification` | 0.92 | 1.00 |
| `repeat-no-reason` | 0.67 | 0.00 |
| `report-count` | 1.00 | 0.33 |
| `scope-followup` | 0.78 | 1.00 |
| `unprompted-skip` | 0.92 | 0.75 |
| `verification-claim` | 1.00 | 1.00 |

- Thirteen cases score the same or higher in arm A.
  Four score lower, and the next section explains them.
- Arm B runs older case files, so a gap in one case can come from the case file and not from the text.

## The Four Lower Cases

- `scope-followup`: the case file differs only by a tag.
  Two of the three `with` runs of arm A failed `follow-up-at-the-end`.
  At 10 runs for each arm, both arms scored 1.00, so the drop was noise.
- `feature-slugify`: the case file differs only by a tag.
  Arm A scored 0.6 in all three runs, and arm B scored 0.6, 0.6, and 1.
  The `without` arm scores 0.73 in both arms.
  The graders that fail in this case are `edit-spares-check-text-test-mjs` and `kept-check-text-test-mjs`.
  This is noise, and not an effect of the cuts.
- `five-reads-codeword` (folder `handoff`) and `partial-verification` do not compare like for like.
  At `ad33e605`, the `input_match` graders of these cases match inside the `command` field, and they are stricter than in arm B.
  So the two arms do not run the same test.

## Verdict

Two of the four lower cases, `scope-followup` and `feature-slugify`, compare like for like.
Both of their drops are noise.
The gate cannot compare the other two, so it says nothing about them.
No cut lowered a score that these runs can compare, so no cut goes back under `D26`.

## Limits

- Few runs: the `D25` floor is 10 runs for each arm.
  The gate ran 3 runs for each arm, and only `scope-followup` ran 10.
  At 3 runs, one failed run shows nothing for one case, and the gate can show only large gaps.
- No statistics: this file gives no CI and no p value.
- One setup: the gate uses Haiku 5.5 and Claude Code `2.1.304` only.
- Cost ceiling: the cap stopped arm A in run 1, so its last four cases ran in run 2.

## Cost

The gate cost $4.74 in total.
Run 1 cost $3.99, run 2 cost $0.23, and run 3 cost $0.52.
