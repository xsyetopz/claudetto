# Second check: kernel (P01)

## Question

Does the kernel of 1.0.0 fail on input that 0.28.0 assumed clean, and does any candidate of the second look need a fix?

## Conclusion

The Windows rename retry in `writeAtomic` is fixed, with tests.
The torn line of `events.jsonl` and the shell truncation are confirmed.
The user assigned both fixes to P04, which owns the writer and the asks slice.
Each other candidate has a verdict.
The tests of the first look pin behavior that passes on the current code (no `src/kernel/` change since `ad61fb01`), so they are not regression tests of a fix.

## Method

- The base is the commit `1a4538ce`, which fast-forwards the worktree from `16fb6993`.
- Each candidate was read in the code, then checked with a test or a run on the current code.
- The `external/` dossiers were searched with `grep`, and the `export-*.jsonl` files were excluded.
  No dossier mentions a torn line, a rename retry, or the spec store.
  The candidates concern files that dotclaude writes itself, so no Claude Code claim applies.
- `just test tests/kernel` ran before and after the change.
  Before: 62 pass, 0 fail.
  After: 68 pass, 1 skip, 0 fail, across 10 files.
  The skip is the Windows test of the rename retry, which runs only on Windows.

## Candidates

| Candidate | Code | Test | Verdict | Fix commit |
| --- | --- | --- | --- | --- |
| A torn last line of `events.jsonl` makes the change unreadable | `src/kernel/spec-store.ts:51-57,82` | `tests/kernel/spec-store.test.ts`, `readEvents` names the file and the line | confirmed, fixed in P04 | P04 |
| `writeAtomic` leaves its temp file when the rename fails | `src/kernel/node/fs.ts:12-19` | `tests/kernel/write-atomic.test.ts`, rename onto a folder | rejected | none |
| `writeAtomic` needs a retry on a Windows rename over an open file | `src/kernel/node/fs.ts:15` | `tests/kernel/write-atomic.test.ts`, retry and cleanup tests, and a Windows test | confirmed, fixed | this package (P01) |
| `shell.ts` returns `truncated` past 200,000 characters | `src/kernel/shell.ts:114-115`, `src/kernel/budget.ts:54` | `tests/kernel/shell.test.ts`, `parse` gives `truncated` only past the bound | confirmed, fixed in P04: fail-closed | P04 |
| A bare `JSON.parse` in the owned paths | `src/kernel/stamp.ts:44`, `src/kernel/node/hook-io.ts:41`, `src/kernel/spec-store.ts:53` | none needed | rejected | none |
| A write that is not `writeAtomic` in the owned paths | none in `src/kernel/` or `src/fragments/` | none needed | rejected | none |
| A path split on `\` in the owned paths | `src/kernel/rules.ts:101`, `src/kernel/node/process.ts:47` | none | open | none |

## Verdicts

### A: torn last line of `events.jsonl`

The reader throws on any line that is not JSON, and it names the file and the line.
`CHANGELOG.md` documents this behavior at line 151.

The defect is real, and a run on the current code shows it.
The reader throws for a log whose last line is torn: the header, one event, and then `{"at":` with no line end.
The lane command then appends a line end first (`src/plugins/dotclaude/slices/spec/adapters/store.ts:79`).
The torn line becomes a middle line, and the reader throws again, with the same file and line number.

A fix that skips only a torn last line does not solve the defect.
The next `lane` makes the torn line a middle line, and the change is unreadable again.
A fix that skips every line that is not JSON changes the documented middle-line behavior.
The other fix point is the writer, which would repair a torn tail before the append.
The writer is `src/plugins/dotclaude/slices/spec/adapters/store.ts`, which is outside the `owns` of this package.

The user assigned the fix to P04 on 2026-10-13.
The first-look requirement `specs/spec-store.md` in the change `Second-checking` is kept.
This package does not edit that file, because its path is outside `owns`.

Test added: `readEvents` names the file and the line of a line that is not JSON.
It passes on the current code (no `src/kernel/` change since `ad61fb01`), because it pins the documented middle-line behavior.
It is not a fix test.

### B: `writeAtomic` leaves its temp file when the rename fails

`writeAtomic` removes the temp file in its `catch`, and it rethrows.
The existing test covers only a failed write, which is a folder that is a file.
The rename path had no test.

Test added: the rename onto a folder fails, the call throws, and the folder holds only the folder that the test made.
The test passes on the current code (no `src/kernel/` change since `ad61fb01`), so the cleanup on the rename path holds.
Verdict: rejected.

### C: Windows rename over an open file

On Windows, a rename over a file that another process holds open fails with `EPERM`, `EACCES`, or `EBUSY`.
The user decided on 2026-10-13 to fix it.

The fix is in `writeAtomicWith` in `src/kernel/node/fs.ts`.
It retries the rename on those three codes, with `RENAME_TRIES` tries and `RENAME_WAIT_MS` between two tries.
Both bounds are in `src/kernel/budget.ts`.
After the last try, it removes the temp file and rethrows the error, as before.
`writeAtomic` keeps its signature, and it calls `writeAtomicWith` with `fs.rename`.

Tests, in `tests/kernel/write-atomic.test.ts`:

- The retry test fails twice with `EPERM` and then succeeds.
  The always-fails test rethrows `EBUSY` after `RENAME_TRIES` tries and removes the temp file.
  The other-code test does not retry `ENOENT`.
  All three run on every platform, through the injected rename.
  They failed before the fix, because `writeAtomicWith` and `RENAME_TRIES` did not exist.
- The Windows test holds the target open without delete share, and it checks that `writeAtomic` succeeds.
  It runs only on Windows, so it was skipped on Darwin.
  The Windows CI runs it.

Verdict: confirmed, fixed.

### D: shell output bound

`src/kernel/shell.ts:114-115` returns `truncated: true` when the scanned text passes `SHELL_SCAN_MAX_CHARS`, which is 200,000 characters.
Three callers read `truncated`:

- `src/plugins/dotclaude/slices/asks/domain/writes.ts:154` returns no write ask when `truncated` is true.
- `src/plugins/dotclaude/slices/asks/domain/git.ts:115,132` asks when `truncated` is true, so the git guard fails closed.
- `src/plugins/dotclaude/slices/asks/domain/scripts.ts:130` aggregates `truncated` over the scripts.

So the policy is split: no ask for writes, and an ask for git.
The comment at `writes.ts:16` says that a command over the scan bound gets no write ask here, and the existing behavior applies.
The words "fail-open by design" come from `.dotclaude/spec/changes/Second-checking/design.md:23`, not from the code.

Test added: `parse` gives `truncated` only past the bound.
It passes on the current code (no `src/kernel/` change since `ad61fb01`), so it pins the bound.
No dossier shows a truncated command that hides a destructive write, so design decision 5 applies.
The user assigned the fix to P04 on 2026-10-13, with the verdict fail-closed.
The code is not changed in this package.

### E: bare `JSON.parse`

- `src/kernel/stamp.ts:44` is in a `try` block, and it returns `undefined` on error.
- `src/kernel/node/hook-io.ts:41` is in a `try` block, and it rethrows only a non-`SyntaxError`.
- `src/kernel/spec-store.ts:53` is in `parseLine`, which is candidate A.

Verdict: rejected for the first two.
The third is covered by A.

### F: non-atomic write

The owned paths have one write, `Bun.write` inside `writeAtomic`, which is the atomic path.
The non-atomic write of the settings file is `src/plugins/dotclaude/slices/setup/adapters/settings-cmd.ts:96`.
That file is outside `owns`, so it belongs to the setup package (P05).
Verdict: rejected for the kernel.

### G: path split on `\`

`src/kernel/rules.ts:101` is a regex test, and `src/kernel/node/process.ts:47` is a separator test (`!/[\\/]/.test(file)`).
Neither splits a path on `\`.
Both match `/` and `\` on purpose.
The guard paths of the design, `design.md` line 18, apply the same question to the user.
A POSIX file name with a backslash is the only input that changes.
No test shows a defect, and no change is made.
Verdict: open, a question for the user, as in the guard package.

## Changed files

- `src/kernel/budget.ts`: two bounds, `RENAME_TRIES` and `RENAME_WAIT_MS`.
- `src/kernel/node/fs.ts`: the rename retry in `writeAtomicWith`, and `writeAtomic` on top of it.
- `tests/kernel/spec-store.test.ts`: one test, `readEvents` names the file and the line of a line that is not JSON.
- `tests/kernel/write-atomic.test.ts`: the rename onto a folder test, and the three retry tests and the Windows test of C.
- `tests/kernel/shell.test.ts`: one test, `parse` gives `truncated` only past the bound.
- `.dotclaude/spec/changes/1.0.0/evidence/second-check-kernel.md`: this file.

Only the rename retry changes `src/kernel/`.

## Checks not run

- `just generate --check` was not run, because the brief allows only the read-only check and it is not a test of the kernel.
- `just typecheck` fails in the worktree with `TS2688` and `TS5083`.
  The cause is the local folder `plugins/dotclaude/.claude-plugin/types/`, which the main checkout has and the worktree lacks.
  It is not part of this change.
- `just lab` and `just validate` were not run, because the brief's `verify` is `just test tests/kernel`.
- The Windows test of C did not run, because the platform is Darwin.
