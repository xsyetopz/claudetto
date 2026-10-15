# Review of dotclaude-lab (P105)

A `reviewer` run did the review on 2026-10-14, read only.
The main session wrote this file from its report.
Scope: `src/plugins/dotclaude-lab/` and `tests/lab/`.
The fix package is P131.
The context bound stopped the run early, so some checks are not complete.

## Confirmed Findings

### F1. I16: the frontmatter check passes when no plugin loaded

`report` in `slices/sandbox/domain/frontmatter.ts:14` gives `0` for any log with no unknown-field line.
This includes a log that says that managed settings locked the plugin.

```bash
bun "$TMPDIR/p105/probe.ts"
```

```text
F2 {"lines":["Debug log: l (2 lines)","No unknown frontmatter field."],"code":0}
```

Failing test, in `tests/lab/sandbox/frontmatter.test.ts`:

- Input: a log with `plugin x is locked by managed settings`.
- Expected: exit `1`, and the output names the lock.
- Actual: exit `0`, with `No unknown frontmatter field.`

### F2. I16 and I18: eval-compare reads exit 0 as a valid comparison

`verdict` in `slices/eval-compare/domain/compare.ts:30` checks only the exit codes.
It does not check the arm, the model that ran, or the results.

```text
F3 0 "\nCompare the WITH column of the two tables."
```

Failing test, in `tests/lab/eval-compare/compare-run.test.ts`:

- Input: a fake runner that exits `0` and writes no results.
- Expected: exit `1`, and a message that the arm has no result.
- Actual: exit `0`, with `Compare the WITH column`.

### F3. I18: a count reply with no `input_tokens` gives `NaN`

`countTokens` in `slices/capture/domain/report.ts:196` does not check the reply shape.

```text
F4 undefined NaN
```

Failing test, in `tests/lab/capture/sizing.test.ts`:

- Input: a `count_tokens` reply of `200` with `{}`.
- Expected: the count fails with an error.
- Actual: `full` is `undefined` and `rest` is `NaN`.

### F4. Smell, a bound outside `limits.ts`

```text
capture/domain/report.ts:38:const SPLIT_CHARS = 2000;
schema/domain/types.ts:15:const DEPTH_MAX = 8;
eval-compare/domain/compare.ts:11:    : [...opts, "--max-cost-usd", "5"];
sandbox/adapters/start-run.ts:69 and :84: setTimeout 1500 and 5000
```

Failing test, in a new `tests/lab/limits.test.ts`:

- Input: the source of each slice file that is not `limits.ts`.
- Expected: no numeric bound constant.
- Actual: the four files above have one.

### F5. Smell, a repository tool ships in `plugins/`

`start-run.ts` ships in `plugins/dotclaude-lab/`, and it runs `tools/measure.ts`.
In the shipped copy, `REPO` resolves to the parent folder of the checkout.

```text
F6 /Users/krystian/CodeProjects/xsyetopz false
```

Failing test, in `tests/lab/sandbox/start-run.test.ts`:

- Input: the path of the `MEASURE` constant in the shipped copy.
- Expected: the file exists, or the script is not in `plugins/`.
- Actual: the file does not exist.

## Unconfirmed Findings

- I18: `slices/sandbox/adapters/cli.ts:148` does not check `--model=X` or an alias such as `opus`.
  It also warns and then runs.
  Only a read of the code shows this.
- I17: `--clean` has no lock, so `just start-run` can remove a sandbox that a live session uses.
- Silent tool error: `setup.ts:37` ignores the result of `git init`.
- I16: eval-compare adds no `--json` and no `--keep-temp`, so it keeps fewer traces.
- `bun test tests/lab` gave 103 passes and 10 failures.
  Each failure is `EADDRINUSE`, because the sandbox does not let a test bind a port.

## Dossier Check

- I01: no finding.
- I02: no finding.
- I03: not applicable.
- I04: F2.
- I05: no finding.
- I06: not applicable.
- I07: `--clean` refuses foreign folders, so no finding.
- I08: `claude --help` shows each flag that the code uses.
- I09: `run-program.ts` has two identical copies, which the slice rule allows.
- I10: the capture keeps no headers, so no finding.
- I11: not applicable.
- I12: F4 (the cost bound is not in `limits.ts`).
- I13: not applicable.
- I14: not applicable.
- I15: no test of prose found.
- I16: F1, F2.
- I17: unconfirmed `--clean` lock.
- I18: F2, F3, and the unconfirmed `--model` check.
