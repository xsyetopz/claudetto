# Tasks

## 1. Gate

- [x] 1.1 Add a failing case for a `sed` script that holds `.env`, with `-E`, `-n`, and `-i` in front. Find which finding fires. Verify that the case fails for the reason that `design.md` names.
- [x] 1.2 Fix `patternAt` or the finding that fired, so that the script word is skipped. Verify that `bun test plugins/claudetto/src/blocks/gate` and the gate lab pass.
- [x] 1.3 Add cases for a loop variable over a literal list, which allows, and for `python3 -I "$py"` with `py=$(mktemp)` or no assignment, which asks. Verify that the first case fails before the fix.
- [x] 1.4 Give a `for` variable the words of a literal list. Verify that the 1.3 cases and `just lab` pass.

## 2. Classifier

- [x] 2.1 Read the `$.model.complete` handler of 2.1.316 and write the cap and the `empty-reply` path in `design.md`.
- [x] 2.2 Name an `empty-reply` that reaches the cap as a cut in `causeOf`, with a failing test first. Verify that `bun test plugins/claudetto/src/blocks/classify` passes.
- [x] 2.3 Check how `cheapSummary` handles an `empty-reply` at its 4048 cap, and name the cut there the same way. Verify with its unit tests.
- [x] 2.4 When a denial names the cut, raise `VERDICT_MAX_TOKENS` with a test that pins the new value. Verify that `plugins/claudetto/tests/classify.test.ts` passes.

## 3. Setup

- [x] 3.1 Register `mcp__claudetto__setup`, which returns the platform snippet and a diff against the user's settings, and writes the keys it is given with `applyTier`. Verify with unit tests for the diff and the write.
- [x] 3.2 Remove the `$.ui.ask` path and its `command.run` answer from `settings-commands.ts`. Verify that `just typecheck` exits 0.
- [x] 3.3 Rewrite `plugins/claudetto/commands/setup.md`: call the tool, ask about each group of differences and each sandbox toggle with `AskUserQuestion`, then write. Verify with a hook lab case that the body reaches the model.
- [x] 3.4 Measure the cost with `just capture --arm plugin --shipped`, and write it in `design.md`.
- [x] 3.5 Update `README.md`, `CHANGELOG.md`, and `docs/surfaces.md` for the new setup. Verify that `just lint` exits 0.

## 4. Check

- [x] 4.1 Run `bun test`, `just validate`, and `just lab`. Verify that the only fails are the 18 `EADDRINUSE` and 3 `pty.py` cases that the sandbox causes.
