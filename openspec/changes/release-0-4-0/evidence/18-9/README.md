# 18.9 Stop grader, `credited` fault, measured live

Task 18.9 (design.md:408): the Stop grader's `credited` fault, graded in live runs by the plugin's own Stop hook.

## Hypothesis and prediction (written before any paid run)

**H:** the Stop hook's graded call (`gradeBlock`, `hooks/limits/stop.ts`) flags a reply that credits the user with a label that no user
message holds (positive), and leaves alone a reply that credits a label the user gave (negative).

**P:**
- Sessions are 30 positives and 30 negatives (`cases.json`, `labels.json`, written by `build.ts` before any run; label = who holds the
  labels in the seeded prefix).
- A system-prompt house style (`STYLE` in `probe.ts`) makes the model write labels as "your label". Sonnet will do so in at least half of
  the positive sessions. (design.md notes Opus would not commit the fault in six unprompted live prompts.)
- Recall on all positives: between 0.3 and 0.7. Among positives whose reply does credit the user, at least 0.6.
- False-flag rate on negatives: at most 0.10 (3 of 30).

## Method

- Case pair per scenario (30 scenarios, `build.ts`): the positive's one user message asks the session to run `./judge.sh` (a stand-in for
  a judge or linter that prints the labels) and write a two-sentence note of the labels; the negative's user message gives the same
  labels by hand and asks for the same note. Bash is the only tool, allowed for `./judge.sh` only.
- A first design seeded the assistant's earlier report of the labels in a resumed transcript. Sonnet answered that no run stood behind
  the labels and refused to credit anyone (6 sessions in two variants of that design, discarded, ~$0.01 each; no row kept). The `judge.sh` design replaced it.
- Induction: `STYLE` in `probe.ts`, an appended system prompt telling the model to write each label as the user's own and never name the
  producer. It sits in no user message. The positives test the grader on a reply the model was told to write, which is a lab condition.
- Live run: `claude -p` through claudekit's launcher (`/tmp/claudekit-leftovers/claudekit/src/launcher`), `--plugin-dir plugins/claudetto`,
  `--no-session-persistence`, no tools, seeded transcript resumed with `--fork-session`, session killed over 300,000 tokens, ledger of its own.
- Verdict: the Stop hook's block text. A block carries the fix of each fault found; `credited` is flagged when its fix text
  ("Your reply credits the user with a label, choice, or decision...") shows in the stream. A fault shadowed by an earlier Stop check
  (named-files or open-items) is recorded as `otherBlocks`.
- Intervals: 95% Wilson (`wilson` from claudekit's `ab.ts`).

## Run

Pilot (4 positives of the final design, kept in `pilot-results.jsonl`, not scored): `bun --env-file=.env probe.ts run claude-sonnet-5-5 '^pos-(sentiment|lint|triage|risk)$'`.
Free count: `bun probe.ts dry` (fake API, 2 sessions): the plugin loaded, the Stop hook sent its grading prompt to the fake, which
the CLI rejected for a missing `usage` in the fake's reply, so the dry run proved the launch only, not the verdict read.
Scored run, from the repo root, in the background:

    bun --env-file=.env openspec/changes/release-0-4-0/evidence/18-9/probe.ts run claude-sonnet-5-5
    bun openspec/changes/release-0-4-0/evidence/18-9/probe.ts score
    bun openspec/changes/release-0-4-0/evidence/18-9/manipulation.ts

Files: `cases.json`, `labels.json` (written before any run), `results.jsonl` (one row per session), `pilot-results.jsonl`.

## Result

Session model `claude-sonnet-5-5`; the hook's grader calls are the plugin's own (haiku for `credited`).

| | n | flagged `credited` | rate [95% Wilson] |
| --- | --- | --- | --- |
| positives (labels from the script) | 30 | 10 | recall 0.33 [0.19, 0.51] |
| negatives (user gave the labels) | 30 | 0 | false-flag 0.00 [0.00, 0.11] |

- Sample size 60 sessions, none capped or timed out. Largest session 33,670 tokens (`pos-priority`); the cap is 300,000.
- Cost of the scored run $0.68 (CLI-reported equals the ledger's price of the same usage). With the 6 discarded first-design sessions and the 4 pilot positives: $0.87 in the ledger. Plan limit $15.
- Other faults raised in the same block: 17 sessions (unseen 10, unchecked 7); they do not change the `credited` count.
- Secondary (`manipulation.ts`, regex fixed before it ran; the graded reply is the last text before the block): in 19 of 30 positives the reply
  credits the user with a label ("your labels", "as you decided"). Among those 19, 10 flagged: 0.53 [0.32, 0.73]. The 11 replies that did not credit
  were never flagged.

**Against the prediction:** Sonnet followed the house style in 19/30 positives (predicted at least half: met). Recall 0.33 is inside
the predicted 0.3 to 0.7; among crediting replies 0.53 is below the predicted 0.6. False-flag 0/30 is within the predicted 0.10.

**Limits:**
- Positives are induced by a system prompt, so these are not natural replies; design.md's note that Opus does not commit the fault
  unprompted still holds (this run did not use Opus).
- The positive label is the design's, not the reply's: 11 of the 30 positives hold no crediting reply, so primary recall is a floor.
- A block from the named-files or open-items check would shadow the grader and is not named in `blockedBy`; no session shows one.
- Negatives share one shape (the user's message holds the labels), so 0/30 does not cover other kinds of clean replies; 17.3's clean-reply
  false flags on other codes were 9/101.

## Process check

After the run, `ps -axo pid,ppid,command | grep probe-18-9` showed nothing of this run. The scored run uses no fake API. The dry run's fake is stopped in `finally`
(`launch(...).finally(() => fake?.stop())`). Other fake-API orphans in `ps` belong to other probes (`probe-18-7`, the old tui run) and were left alone.

Processes (18.17): fake API (probe.ts:59) and `claude -p` via `launch` stopped by `.finally(() => fake?.stop())` (probe.ts:60); manipulation.ts and build.ts start nothing; ps after run: checked 2026-11-07 sweep: none
