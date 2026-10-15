# Review of the Checks Slice (P86)

A `reviewer` run did the review on 2026-10-14, read only.
The main session wrote this file from its report.
Baseline: `just test tests/dotclaude/checks/` gives `35 pass`, `0 fail`, and exit `0`.
The probes ran from `$TMPDIR` with a no-op `writeLog`, so they wrote nothing to the repository.

## Confirmed Findings

### 1. I07 and I10: the CLI lets a command get past the guard floor (blocking)

- `src/plugins/dotclaude/slices/checks/adapters/cli.ts:76-81` runs each argument with no guard check.
  The guard does not unwrap `dotclaude-run-checks`, and `src/kernel/wrappers.ts` does not name it.
- Command: a probe sent strings to `mainDeny` from `tests/dotclaude/guard/ports.ts`, and no command ran.
- Output: `git reset --hard` gives `denied`.
  `dotclaude-run-checks "git reset --hard"` gives `ALLOWED (null)`.
- Failing test: in `tests/dotclaude/guard/matrix/floor.test.ts`, add `dotclaude-run-checks "${command}"` to `formsOf`.
  The input is `dotclaude-run-checks "git reset --hard"`.
  The expected result is a deny that holds the command, and the actual result is `null`.

### 2. I04 recipe 2: a pipe gives a false pass (should-fix)

- `cli.ts:76` runs `sh -c` with no `pipefail`, so the last command of a pipe sets the status.
- Command: `bun probe.ts "bun bad.js | tail -5"`, where `bad.js` prints a line with `1 fail` and exits `3`.
- Output: `PASS $ bun bad.js | tail -5`, `exit 0 | ... 2 passed, 1 failed`, and `status: 0`.
- Failing test: `tests/dotclaude/checks/run.test.ts`, with the input `"bun bad.js | cat"`.
  The expected status is `1`, and the actual status is `0` with `PASS`.

### 3. I17: a timeout leaves the child processes running (should-fix)

- `cli.ts:80` with `src/kernel/node/process.ts:74`: the timeout sends `SIGTERM` to `sh` only.
  The command keeps running after the timeout.
- Command: `processRunner.run("sh", ["-c", 'sh -c "sleep 2; echo alive > M"; true'], { timeout: 500 })`, then a wait of 3 seconds.
- Output: `timedOut: true` after `502` ms, the marker is `false` right after the timeout, and it is `true` 3 seconds later.
- Failing test: `tests/kernel/process.test.ts` with the same input.
  The expected result is no marker, and the actual result is a marker.

### 4. I16: `constructor` counts as a count word (nit)

- `src/plugins/dotclaude/slices/checks/domain/counts.ts:36` reads `COUNT_WORDS` (`limits.ts:25`) with no own-key check.
- Command: `parseCounts("=== 2 constructor in 0.1s ===")`.
- Output: `{"passed":0,...,"function Object() { [native code] }":null}`.
  With the word `widgets`, the output is `null`.
- Failing test: `tests/dotclaude/checks/counts.test.ts`.
  The expected result is `null`, and the actual result is a counts object.

### 5. I15: tests of prose (nit)

- `tests/dotclaude/checks/run.test.ts:285` asserts the example `dotclaude-run-checks "bun --version"`, which `cli.ts:110` holds as a fixed string.
  `run.test.ts:186` asserts the word `Usage`.
- Command: `main(["npm","-x"], ...)` with a fake runner.
  Output: `2 true`, so the assertion passes for any flag.
- Failing test: the same file.
  For the input `["npm","-x"]`, the expected result is that the error names `-x`.
  The actual assertion only checks fixed words.

### 6. A copy of a bound in a test (nit)

- `run.test.ts:239` asserts `"timed out after 1800s"`, which copies `COMMAND_TIMEOUT_MS` from `limits.ts:16`.
- Command: `grep -n 1800 tests/dotclaude/checks/run.test.ts`.
  Output: line `239`.
- Failing test: the same test.
  The expected text comes from `COMMAND_TIMEOUT_MS / 1000`.
  The actual test fails when only the bound changes.

## Unconfirmed Findings

- I18: on Windows, `domain/command.ts:30` gives the command to `cmd.exe` with no `windowsVerbatimArguments`.
  So a `"` in the command can arrive as `\"`.
  This was not run, because this host is macOS.
- `cli.ts:123`: when `writeLog` throws, the next commands do not run and no summary prints.
  This was not run.

## Checked With No Finding

- Lead `run.test.ts:65-77`: rejected.
  The lines assert values that the code computes: the exit code, the time from the fake clock, the parsed counts, and the output lines.
  A wrong count makes line `65` fail.
  Line `76` pins the `output:` header of the CLI output, which is the output contract and not prose.
- Clean: I01, I02, I03 (the output bounds), I05 (no suppressions, `grep` exit `1`), I06, I08 (`timedOut` was seen), I09, I11, I12, I13, and I14.
- I17 log paths: each run gets its own `runId`.
- No smells: no dead code, and no copy of kernel code (`src/kernel/text.ts`, `src/kernel/node/fs.ts`).
  The bounds are in `limits.ts`, apart from finding 6.
  The `catch` at `cli.ts:87` gives `127` and the error text, so it is not silent.
  No tool error counts as a negative.

Checked: the brief, `CLAUDE.md`, `.claude/rules/*.md`, dossier `00`, I04, I15, I17, all slice files, both test files, `src/kernel/node/process.ts`, and `src/kernel/wrappers.ts`.
