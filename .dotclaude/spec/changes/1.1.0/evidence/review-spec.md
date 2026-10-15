# Review of the Spec Slice (P94)

A `reviewer` run did the review on 2026-10-14, read only.
The main session wrote this file from its report.
Scope: `src/plugins/dotclaude/slices/spec/`, `src/kernel/spec-store.ts`, and `tests/dotclaude/spec/`.
The fix package is P120.
The context bound stopped the run early, so the dossier check is partial.

## Known Defects

- Confirmed, the store root is the cwd:
  `cd src && dotclaude-spec status 1.0.0` exits 1 and says that the change does not exist.
  From the repository root, the same command exits 0.
  The cause is `cli.ts:98,109`.
  `Second-checking` is archived now, so the probe used `1.0.0`.
- Confirmed, `done` with no verify record:
  a replay of the archived log of `Second-checking` against `PACKAGE_TRANSITIONS` gives `verifiedWithoutRecord: 9` and `illegalMoves: 10`.
  One example is `P01` from `verified` to `done`.
- Confirmed, `states.ts:73`:
  the size rule is in `specify.ts:163`, not in the table, and `plan.ts:33-43` has no size check.
  The impact is low.

## Confirmed Findings

### F1. I04 and I05: `validate` does not replay the log

`validate` does not replay `events.jsonl`, so a move with no verify record or no approve passes.
Probe A, in a store under `$TMPDIR`, logs `doing`, then `verified` with no verify record, then `done`.
`dotclaude-spec validate c1` prints `Valid.` and exits 0.

Failing test, in `tests/dotclaude/spec/cli/validate.test.ts`:

- Input: a change whose log moves a package to `verified` with no verify record, and then to `done`.
- Expected: exit status 1, with a problem line for the move.
- Actual: exit status 0 and `Valid.`

### F2. I05: no guard stops a direct write to `events.jsonl`

No hook stops a `Write` or `Edit` to `events.jsonl`, so an agent can change the state of a package with no command.
`grep` finds no reference to `events.jsonl` outside `slices/spec` and the kernel.

Failing test, in the guard tests:

- Input: a `PreToolUse` event for `Write` to `.dotclaude/spec/changes/c1/events.jsonl`.
- Expected: a deny.
- Actual: no decision.

### F3. I04: `validate` does not check that a `verify` field can run

Five packages of 1.1.0 (P60, P69, P79, P80, and P82) have prose in `verify`.
`dotclaude-spec validate 1.1.0` prints `Valid.`
`just --show 'check,'` exits 1, so such a field fails when `verify` runs it.

Failing test, in `tests/dotclaude/spec/cli/validate.test.ts`:

- Input: a package with `verify: just check, and the user approves the push`.
- Expected: exit status 1, with a problem line for the field.
- Actual: exit status 0 and `Valid.`

### F4. I18: the fixtures take the global git config

The fixture repositories of `tests/dotclaude/spec/cli/run-phase.ts:47-55` read the global git config of the user.
With commit signing on, `bun test tests/dotclaude/spec` gives 159 failures with "Couldn't load public key".
With `GIT_CONFIG_GLOBAL=/dev/null`, the same command gives 283 passes.
`tests/support/eval-patterns.ts:52-53` already sets `GIT_CONFIG_GLOBAL`.

Failing test: the current suite with commit signing on in the global config.

- Expected: 0 failures.
- Actual: 159 failures.

### F5. Smell: a package file with no `id` drops out silently

`spec-store.ts:133-157` skips a package file with no `id`, so it drops out of `packageStates`.
Probe B: `status` gives `1/1`, and `activeProgress` gives `null`.
`validate` does report the file.

Failing test, in `tests/kernel/spec-store.test.ts`:

- Input: a change with one package file that has no `id`.
- Expected: an error that names the file.
- Actual: the package is not counted, and `activeProgress` returns `null`.

### F6. I04: the release does not accept the change

`tools/release.ts` has no spec code, so `accept` does not run in the release flow.
1.0.0 stays `implementing 57/57` after the tag `dotclaude--v1.0.0`.

Failing test, in the release tests:

- Input: a release of a version whose change has all packages `done`.
- Expected: the change is `accepted`.
- Actual: the change stays `implementing`.

### F7. Smell: bounds outside `limits.ts`

`verify.ts:25` has `TAIL_LINES`, and `git.ts:16` has `RUN_MAX_MS`.
Neither is in `slices/spec/limits.ts`.

Failing test: import each bound from `slices/spec/limits.ts`.

- Expected: the import gives the value.
- Actual: the import fails.

### F8. Nit: `activeProgress` sorts ids as text

With `1.9.0` and `1.10.0` open, `activeProgress` picks `1.9.0`, because it sorts the ids as text.

Failing test, in `tests/kernel/spec-store.test.ts`:

- Input: open changes `1.9.0` and `1.10.0`.
- Expected: `1.10.0`.
- Actual: `1.9.0`.

## Refuted Leads

- `close-phase.test.ts:75,301-302`: `### REQ-n:` is the parsed data format, not prose.
- `spec-store.ts:65`: `isJson` is a predicate, not a silent `catch`.
- `verify` needs `doing`: this agrees with the table at `states.ts:48`.
- The progress count: `done/total` agrees with the contract at `spec-store.ts:162`.
  Probe E shows that `status` prints a count for each state.
  The statusline shows only `done`, which is a design choice.
- An unknown state: `validate` reports it (probe C).

## Unconfirmed Findings

- `validate.ts:155` uses `.catch(() => null)`, so a bad log can read as open packages.
- `package-ids.test.ts:72` checks a negative of the wording (I15) and has no exit-code assertion.
- `git.ts:65-68` can read a git error as "not linked" (I17).

## Dossier Check

- I04: F1, F3, and F6.
- I05: F1 and F2.
- I15: see the unconfirmed findings.
- I17: see the unconfirmed findings.
- I18: F4.
- I01 to I03, I06 to I14, and I16: not checked, because the context bound stopped the run.

The run read the files above, ran `status` and `validate` from the repository root, and ran a probe under `$TMPDIR/p94/`.
It ran `bun test` three times, replayed the archived log, and searched `tools/release.ts` with `grep`.
