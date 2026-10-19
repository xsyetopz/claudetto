# Evals History

This page keeps the method of older eval runs, and the figures of the compaction bench.
An eval section that had fewer than 10 runs per arm keeps no result numbers (D25).
The runs of 0.1.0 are on [Evals of 0.1.0](Evals-0.1.0).

## Off-Switch Eval of 2026-10-08

**Method:** 12 cases, with an earlier harness.
Each arm had fewer than 10 runs, so this section keeps no result numbers (D25).
The Claude Code version is not stated.
An item was dropped when the resolve rate, over-claim rate, or policy-violation rate got worse beyond noise.
When another measure got worse with a shown interval, the arm ran again, and the item was dropped only if the loss showed again.
The report files are not in the repository.

See [Settings Snippet Keys](Settings-Snippet-Keys) and [Off Switches](Off-Switches).

## Compaction Bench

**Method:** On 2026-09-27, from 28 local transcript points (20 with an answer), with no Claude usage.
A needed token is a path, number, or identifier of 8 or more characters that a tool result introduced and Claude used within 40 calls after the compaction.
A replay of 5 real compactions found 70 needed tokens.
The token label agreed with a blind check 71% of the time.

| Method | Kept size | Kept needed tokens | Kept needed outputs |
| --- | --- | --- | --- |
| Upstream `fast-jev-compaction` | not stated | not stated | 0% of old output |
| `fast-compact` rule | 55% | 52% | 63% |
| Same rule, newest outputs kept whole | 58% | 54% | 63% |

The Jev ranking scored AUC 0.51 to 0.55, near chance.
"Largest first" scored 0.74.

| | Kept | Read again | Neither | Context left |
| --- | --- | --- | --- | --- |
| Built-in `/compact` | 28 (40%) | 26 (37%) | 16 (23%) | 18k to 25k of about 970k tokens |
| `fast-compact` rule | 58 (83%) | 12 (17%) | none | 72% to 91% of characters |

**Result:**

- `fast-compact` keeps 83% of needed tokens, against 40% for the built-in summary.
- It trims only old tool output, so each later turn reads 72% to 91% of the context again.
  For usage, the built-in compaction wins by far (a few thousand tokens per extra read, against about 750k extra on every turn).
- Jev adds no measurable gain.
- Compact while the cache is warm.
  After the TTL, a compaction reads the whole conversation uncached (reported).
- The sample is small.

## Model and Effort Sweep

**Method:** The first run used Claude Code `2.1.287`, a Sonnet 5.5 judge, and 8 `t*` cases.
Each arm had fewer than 10 trials in that run, so it keeps no result numbers (D25).
Effort came from `CLAUDE_CODE_EFFORT_LEVEL`.
The summary files went with the removed harness.

A longer run used 11 cases with 10 trials per arm.
The Claude Code version of the longer run is not stated.

| Arm | Passed first | Cost per pass | Passed after case fixes | Cost per pass |
| --- | --- | --- | --- | --- |
| Sonnet 5.5 medium | 98/110 | $0.12 | 109/110 | $0.10 |
| Sonnet 5.5 high | 99/110 | $0.13 | 107/110 | $0.12 |
| Opus 5.5 medium | 101/110 | $0.22 | 110/110 | $0.19 |
| Opus 5.5 high | 99/110 | $0.24 | 109/110 | $0.21 |

**Result:**

- Opus 5.5 `medium` passed as much as `high` for less.
- Sonnet 5.5 was at the ceiling at 55% to 60% of the Opus 5.5 cost, on tasks that were not hard reviews.

## Full Suite on Claude Code 2.1.296

**Method:** Run `2026-10-10T21-59-53-466Z` on Claude Code `2.1.296`, default model Opus 5.5, 16 cases of an earlier suite.
Each arm had fewer than 10 runs, so this section keeps no result numbers (D25).
The runs used an earlier prompt, so they do not test the text of 0.2.0.

### Sonnet 5.5 and Haiku 5.5

Two full runs of 16 cases used `suite.modelOverride`.
Their results are removed, because this section had fewer than 10 runs per arm (D25).

Three Haiku reruns used `CLAUDE_CODE_EFFORT_LEVEL=high`.
The traces do not show the effort level, so it is not verified that the setting reached the runs.

## See Also

- [Evals](Evals)
- [Evals 0.1.0](Evals-0.1.0)
- [Usage Evidence](Usage-Evidence)
- [Evidence](Evidence)
