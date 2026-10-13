# Second check: kernel (P01)

## Question

Does the kernel of 1.0.0 fail on input that 0.28.0 assumed clean, and does any candidate of the second look need a fix?

## Conclusion

No code change is made in this package.
Each candidate has a verdict.
Two candidates need a decision of the user before a fix: the torn line of `events.jsonl`, and the shell truncation.
The Windows rename retry is open because no test can show it on this platform.
Three tests are added.
They pin behavior that holds on `ad61fb01`, so they are not regression tests of a fix.

## Method

- The base is the commit `1a4538ce`, which fast-forwards the worktree from `16fb6993`.
- Each candidate was read in the code, then checked with a test or a run on the current code.
- The `external/` dossiers were searched with `grep`, and the `export-*.jsonl` files were excluded.
  No dossier mentions a torn line, a rename retry, or the spec store.
  The candidates concern files that dotclaude writes itself, so no Claude Code claim applies.
- `just test tests/kernel` ran before and after the change.
  Before: 62 pass, 0 fail.
  After: 65 pass, 0 fail, across 10 files.

## Candidates

| Candidate | Code | Test | Verdict | Fix commit |
| --- | --- | --- | --- | --- |
| A torn last line of `events.jsonl` makes the change unreadable | `src/kernel/spec-store.ts:51-57,82` | `tests/kernel/spec-store.test.ts`, `readEvents` names the file and the line | open | none |
| `writeAtomic` leaves its temp file when the rename fails | `src/kernel/node/fs.ts:12-19` | `tests/kernel/write-atomic.test.ts`, rename onto a folder | rejected | none |
| `writeAtomic` needs a retry on a Windows rename over an open file | `src/kernel/node/fs.ts:15` | none | open | none |
| `shell.ts` returns `truncated` past 200,000 characters | `src/kernel/shell.ts:114-115`, `src/kernel/budget.ts:54` | `tests/kernel/shell.test.ts`, `parse` gives `truncated` only past the bound | open | none |
| A bare `JSON.parse` in the owned paths | `src/kernel/stamp.ts:44`, `src/kernel/node/hook-io.ts:41`, `src/kernel/spec-store.ts:53` | none needed | rejected | none |
| A write that is not `writeAtomic` in the owned paths | none in `src/kernel/` or `src/fragments/` | none needed | rejected | none |
| A path split on `\` in the owned paths | `src/kernel/rules.ts:101`, `src/kernel/node/process.ts:47` | none | open | none |

## Verdicts

### A: torn last line of `events.jsonl`

The reader throws on any line that is not JSON, and it names the file and the line.
`CHANGELOG.md` documents this behavior at line 151.
`.claude/rules/tests.md` documents it too.

The defect is real, and a run on the current code shows it.
The reader throws for a log whose last line is torn: the header, one event, and then `{"at":` with no line end.
The lane command then appends a line end first (`src/plugins/dotclaude/slices/spec/adapters/store.ts:79`).
The torn line becomes a middle line, and the reader throws again, with the same file and line number.

A fix that skips only a torn last line does not solve the defect.
The next `lane` makes the torn line a middle line, and the change is unreadable again.
A fix that skips every line that is not JSON changes the documented middle-line behavior.
The other fix point is the writer, which would repair a torn tail before the append.
The writer is `src/plugins/dotclaude/slices/spec/adapters/store.ts`, which is outside the `owns` of this package.

The choice between the two fix points changes documented behavior, so it is a decision of the user.
The first-look requirement `specs/spec-store.md` in the change `Second-checking` is kept.
This package does not edit that file, because its path is outside `owns`.

Test added: `readEvents` names the file and the line of a line that is not JSON.
It passes on `ad61fb01`, because it pins the documented middle-line behavior.
It is not a fix test.

### B: `writeAtomic` leaves its temp file when the rename fails

`writeAtomic` removes the temp file in its `catch`, and it rethrows.
The existing test covers only a failed write, which is a folder that is a file.
The rename path had no test.

Test added: the rename onto a folder fails, the call throws, and the folder holds only the folder that the test made.
The test passes on `ad61fb01`, so the cleanup on the rename path holds.
Verdict: rejected.

### C: Windows rename over an open file

The retry is a guess of the first look.
No dossier cites the behavior, and the test platform is Darwin, so no test can show the failure here.
Design decision 3 says that a claim with no citation leaves the code as it is.
Verdict: open.
A fix needs a Windows run, which is outside this package.

### D: shell output bound

`src/kernel/shell.ts:114-115` returns `truncated: true` when the scanned text passes `SHELL_SCAN_MAX_CHARS`, which is 200,000 characters.
`src/plugins/dotclaude/slices/asks/domain/writes.ts:154` returns no write ask when `truncated` is true.
The comment at `writes.ts:16` says that this behavior is fail-open by design.

Test added: `parse` gives `truncated` only past the bound.
It passes on `ad61fb01`, so it pins the bound.
No dossier shows a truncated command that hides a destructive write, so design decision 5 applies.
Verdict: open, a policy decision for the user.
The code is not changed.

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

`src/kernel/rules.ts:101` and `src/kernel/node/process.ts:47` match both `/` and `\` on purpose.
The guard paths of the design, `design.md` line 18, apply the same question to the user.
A POSIX file name with a backslash is the only input that changes.
No test shows a defect, and no change is made.
Verdict: open, a question for the user, as in the guard package.

## Changed files

- `tests/kernel/spec-store.test.ts`: one test, `readEvents` names the file and the line of a line that is not JSON.
- `tests/kernel/write-atomic.test.ts`: one test, `writeAtomic` leaves no temp file when the rename fails.
- `tests/kernel/shell.test.ts`: one test, `parse` gives `truncated` only past the bound.
- `.dotclaude/spec/changes/1.0.0/evidence/second-check-kernel.md`: this file.

No file in `src/` changed.

## Checks not run

- `just generate --check` was not run, because the brief allows only the read-only check and it is not a test of the kernel.
- `just typecheck` fails in the worktree with `TS2688` and `TS5083`.
  The cause is the local folder `plugins/dotclaude/.claude-plugin/types/`, which the main checkout has and the worktree lacks.
  It is not part of this change.
- `just lab` and `just validate` were not run, because the brief's `verify` is `just test tests/kernel`.
