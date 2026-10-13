# Second-checking: design

## Context

- Target: `/Users/krystian/CodeProjects/xsyetopz/dotclaude` at `ad61fb01`, version 1.0.0, 50 packages in `.dotclaude/spec/changes/1.0.0/packages/`.
  Every path below is relative to that repository.
- `just check` there runs lint, typecheck, `generate --check`, test, validate, and lab (`justfile:29-32`).
  In the sandbox of the first look, lint, typecheck, and `generate --check` passed, `test` ran 2018 tests with 2009 pass and 9 fail, and `validate` and `lab` pass when run alone.
- The 9 failures are in `tests/lab/capture` (`proxy.test.ts`, `sizing.test.ts`): `Failed to start server. Is port 0 in use?` with `EADDRINUSE`.
  A one-line `Bun.serve({port:0})` fails the same way, so the cause is most likely that the sandbox denies a local listen.
  A run outside the sandbox (`just test tests/lab`, 2026-10-13) gave 109 pass, 0 fail across 14 files, so the cause is the sandbox and not the repo.
- Candidates seen in code (the line was read, the impact is not proven):
  - `src/kernel/spec-store.ts:82` `parseLine` throws on a non-JSON line, so one torn last line of `events.jsonl` makes a change unreadable.
  - `src/kernel/node/fs.ts:12-19` `writeAtomic` removes its temporary file and rethrows on failure (seen); a retry for a Windows rename over an open file is the only open point (guessed).
  - `src/plugins/dotclaude-sessions/slices/usage/domain/parse.ts:117-122` a `null` line throws at `entry.type`, while `transcript.ts:84-93` skips non-objects.
  - `src/plugins/dotclaude/slices/setup/adapters/settings-cmd.ts:96` writes the user settings with no `writeAtomic`.
  - `src/plugins/dotclaude/slices/setup/adapters/exclude-step.ts:49,54` reads the file and then appends whole lines with one `appendFileSync`; the race is read then append, which can add a duplicate line.
  - `src/plugins/dotclaude/slices/guard/domain/paths.ts:3,10,13` treat `/` and `\` both as separators by design, and `paths.ts:25-36` handle `C:foo`. Reading `\` as a filename character on POSIX would weaken a deny, so it is a question for the user, not a requirement.
  - `JSON.parse` at `statusline/adapters/cli.ts:56-62`, `git-cache.ts:99-105`, and `setup/adapters/account.ts:11-21` is already wrapped in a try/catch that returns null or undefined (the second look read it); the packages confirm with a test and do not change it.
  - `lab/capture/report.ts:196` parses the HTTP reply of `count_tokens` after a `res.ok` check (line 194); the risk is a 200 reply whose body is not JSON.
  - `slices/spec/adapters/store.ts:81` appends the lane event with no fsync.
  - `src/kernel/shell.ts:114-115` returns `truncated` past 200,000 characters, and asks `writes.ts:154` then returns no ask.
    The file says this is fail-open by design (`writes.ts:16`), so it is a decision to check, not a defect.
- The spec of 1.0.0 itself overlaps: P01b1 owns `tools/generate/`, P01b3 owns `tools/generate/emit/snippet.ts`, P01b4 owns `tools/generate/emit/register.ts`, and P13 also owns `tools/generate/`.
- Not read yet: the content of the `external/` dossiers.
  Folders: `agent-failure-dossier`, `capture`, `cc-2.1.296`, `cc-extract`, `dossier`, `summaries`, and 17 dated folders from `2026-09-29` to `2026-10-13`.
  The mapping of a dossier to an area is a guess of the first look.

## Decisions

1. Six disjoint review areas, then one docs package, in three waves.
   Wave 1 runs P01, P02, P03, P05, and P06.
   Wave 2 runs P04, because its `validate` output for a torn line uses the reader that P01 changes.
   Wave 3 runs P07, because it regenerates `plugins/`, which every earlier package can change.
2. Test first.
   A package may change code only after a test that fails on `ad61fb01` shows the defect.
   A candidate that no test can show goes to the evidence file as rejected.
   This keeps a guess of a 0.28.0 reader from becoming a change of 1.0.0 behavior.
3. A dossier decides a Claude Code behavior, and the code of the repo decides the rest.
   Where a package says that Claude Code behaves in some way (hook input, settings merge, sandbox, status line stdin), it cites the dossier file and line.
   With no citation, the package leaves the code as it is and records the question.
4. The sandbox port failure is not a defect of the repo: the run outside the sandbox passed (109 pass, 0 fail).
   The package that owns `tests/lab` (P06) does not skip, loosen, or mock the test, and records the result in its evidence file.
5. The fail-open of the asks slice (`writes.ts:16`) stays as it is unless a dossier shows a case where a truncated command hides a destructive write.
   Then P04 reports it to the user, because it is a policy decision and not a bug fix.
6. Each package writes `.dotclaude/spec/changes/1.0.0/evidence/second-check-<area>.md` with a table: candidate, test, verdict (`confirmed`, `rejected`, `open`), and fix commit.
7. The delta files under `specs/` hold the requirements that the first look already supports.
   A package that rejects a requirement removes it from its delta file, so `specs/` ends with confirmed behavior only.

## Risks

- A candidate of this list is a reading of code by one run, with no execution.
  A fix with no failing test would be a guess, and decision 2 blocks it.
- `P01` changes the kernel that every slice imports.
  A change of a public signature breaks the other areas, so P01 keeps signatures and adds behavior only.
- `just generate` rewrites `plugins/`, and a package that runs it in wave 1 would collide with the others.
  Only P07 runs it, and the others run `just generate --check` read-only.
- The tests of `tests/lab` cannot run in the sandbox, so `just check` cannot pass there.
  The report must say that the check did not run and name the cause.
- The dossiers are large and dated.
  A behavior from `cc-2.1.296` can have changed in a later Claude Code, so a package cites the version with each claim.
- The exclude append (P05) already writes whole lines, so a torn line is not the risk; a duplicate line from the read-then-append race is.
  A lock file can go stale on a crash, which is worse than a duplicate line, so P05 first re-checks the file just before the append and adds no lock.
