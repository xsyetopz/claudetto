## Why

The user asked for an audit of each eval of the repo for legitimacy, because a weak eval is never trustworthy and an expensive eval is also a problem, and for the rebuild to copy or adapt outside evals with a source for each claim (the user, 2026-10-27).
The audit of 2026-10-27 found these defects in `plugins/claudetto/evals/`:

- The cases held 111 `regex` graders: 102 read a file, 5 read the trace, and 4 read the text of the last reply, so those 4 matched English words.
- The 28 `llm` graders name no judge model. `claude plugin eval` has no model key for a grader, only `--judge-model` for the run, and its default is the alias `haiku` (`claude plugin eval --help`).
- 26 cases set `runs: 3`, which cannot separate two arms.
- `just eval-stats` compares the arms with unpaired tests, although both arms run the same cases.

The outside sources are on the wiki page [Eval Sources](../../../src/wiki/claudetto/evidence/Eval-Sources.md), and each claim below names its row there.

## What Changes

- `just eval-stats` reports the paired difference of the arms for each case, with a clustered standard error, a confidence interval, and the number of cases that a power check needs for a given gap (row "A statistical approach to model evals").
- A classifier replay set, `just classifier-replay`, scores the gate on three sets: benign calls from the session logs of the user, the attack cases of InjecAgent, and in-project file edits. It reports the false-positive rate and the miss rate for each stage (rows "How we built Claude Code auto mode", "InjecAgent", and "AmPermBench"). The deterministic stage runs with no model call. The classifier stage is a paid run, and it needs the approval of the user.
- A handoff constraint probe plants constraints, decisions, and artifacts in a recorded session, builds the handoff with code, and checks with code that each one survives (rows "ConstraintRot" and "Evaluating context compression"). The comparison against the built-in `/compact` is a paid run, and it needs the approval of the user.
- The `regex` graders over reply text leave `plugins/claudetto/evals/`. A case with no grader left goes. The recipes `eval` and `eval-variant` require `--judge-model`, so each run names its judge.

## Capabilities

### New Capabilities

- `eval-quality`: the rules that each eval of the repo follows.

## Impact

- `dev/stats/`, a new `dev/classifier-replay/`, a new `dev/handoff-probe/`, `plugins/claudetto/evals/`, the `justfile`, and their tests in `tests/tools/`.
- The wiki pages `Evals`, `Eval-Graders`, and `Eval-Sources`, and `CHANGELOG.md`.
