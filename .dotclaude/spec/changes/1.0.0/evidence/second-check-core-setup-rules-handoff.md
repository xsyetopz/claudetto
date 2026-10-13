# Second check: core setup, rules, and handoff

Base `ad61fb01`, package P05 of the change `Second-checking`, retry with the findings of review.
Each candidate has a test or a reason for having none.
The setup tests run the generated copy in `plugins/`, so each run used `just generate` first.

| Candidate | Test | Verdict | Fix |
| --- | --- | --- | --- |
| `settings-cmd.ts:97` settings write is not atomic: a symlinked `settings.json` becomes a regular file | `--apply` keeps a symlinked `settings.json` (`settings.test.ts`); `writeAtomic` writes through a symlink (`write-atomic.test.ts`) | confirmed: both tests failed before the fix (the rename replaced the link) and pass now | `writeAtomic` in `src/kernel/node/fs.ts` resolves the link with `realpath` and renames over the real file |
| `settings-cmd.ts:97` settings write drops the file mode: a `0600` file becomes the default mode | `writeAtomic` keeps the mode of the file it replaces (`write-atomic.test.ts`, skipped on Windows) | confirmed: the test failed before the fix and passes now | the temp file takes the mode of the old file before the rename (`src/kernel/node/fs.ts`) |
| A hard link to the old `settings.json` keeps the old text | none: the test that asserted it is dropped, because the break is a cost of the rename and not a wanted result | documented cost: a rename splits a hard link, and the doc comment of `writeAtomic` says so | none |
| Temp file left by the settings write | `--apply` leaves only `settings.json` in the config folder | guard: passes with and without the fix, so it does not show the defect | none |
| `mythosInCatalog` calls `statSync` outside its try block (`files.ts:64-65`) | a dangling link named like the organization beside a valid catalog file, `--apply` exits 0 | confirmed: `ENOENT` in the sort comparator, exit 1, reproduced by hand | `statSync` runs in a try, and the unreadable files are dropped (`files.ts:64-68`) |
| A top-level `[]` or `null` settings file is replaced by the snippet | `--apply` exits 1 and keeps the file (two tests, `settings.test.ts`) | rejected: the file is kept, because `planSettings` throws `The settings are not an object` and the call site catches it | none |
| A settings file with a byte order mark | `--apply` keeps the keys (`settings.test.ts`) | rejected: passes, because `Bun.file().text()` strips the mark and the keys stay | none |
| A settings file with comments | `--apply` exits 1 and keeps the file (`settings.test.ts`) | rejected: passes, the file is not valid JSON and the run stops before a write | none |
| A key that holds a scalar where the snippet has an object (`env`, `permissions`) | `--apply replaces a scalar env and a scalar permissions` (`settings.test.ts`), and `a scalar where the snippet has an object gets its own change line` | rejected: the new test passes, the user gets the objects of the snippet and the other keys stay | none |
| A `statusLine` of another tool | `a status line of another tool stays, and the preview says so` (`settings.test.ts`) | rejected: passes, the own status line is kept and the subagent line is written | none |
| The `availableModels` replace rule | `without Mythos, availableModels takes the list of the snippet` (`settings.test.ts`) | rejected: passes, the list of the snippet replaces the list of the user, as the rule says | none |
| A second `--apply` that changes nothing | `a second apply changes nothing` (`settings.test.ts`) | rejected: passes, the file text is the same after the second run | none |
| `claude auth status` output that is empty, torn, an array, `null`, or a number (`account.ts`) | five tests in `tiers.test.ts` | rejected: all pass, the try block gives the no-login account and setup runs | none |
| Exclude line torn by two runs (`exclude-step.ts:54`) | none | rejected by reading: one `appendFileSync` call writes whole lines | none |
| Exclude duplicate line from read then append (`exclude-step.ts:49,54`) | none | open: no seam between the read and the append, and a test needs a race or a lock, which `design.md` rules out | none |
| `HANDOFF_WAIT_TURNS` (`handoff/limits.ts:34`, `adapters/mod.ts:236`) | `a handoff file that Claude writes at the first path after the retry is resumed` (`lab/resume-flow.test.ts`) | covered, with a gap: the lab test loops over a copy of the bound (`WAIT_TURNS`), so a change of `limits.ts` does not fail it; no test pins the copy to `limits.ts` | none |
| Handoff file that is empty or partial (`adapters/mod.ts:151-156`) | none | open: `resume` accepts the newest name without a size or content check, and the spec does not say what an empty file must do | none |
| Session ends between the write prompt and the resume (`adapters/mod.ts` `settle`) | none | open by design: the pending state is in memory, as `design.md` states | none |
| Bare `JSON.parse` in `drift-cmd.ts:27` | none | rejected by reading: inside a try, exit 2 | none |
| Other `JSON.parse` hits (`files.ts:35,73`, `settings-cmd.ts:28`, `stamp/domain/build.ts`) | none | rejected by reading: `files.ts:35,73` sit in a try, `settings-cmd.ts:28` is called at `settings-cmd.ts:63` inside the try at line 62, and the build parser is guarded | none |
| Backslash path handling (`merge.ts:31-33` regexes, `merge.ts:51` `slashRoot`, `stamp/domain/build.ts:41` `trimmed`) | none | rejected by reading: each handles both separators, and the regexes at `merge.ts:31-33` match `\` and `/` | none |
| Non-atomic write pattern in owned paths | the failed write keeps the old text (`write-atomic.test.ts`, `rename fails without a retry`) | covered: the old file stays and the temp file is removed | none |

## Requirements of `specs/setup-settings.md` that the evidence rejects

- `No torn exclude line`: the torn-line case is rejected, because one append writes whole lines.
  The duplicate-line race is open, and it is not in this requirement.
  The file `specs/setup-settings.md` of the change `Second-checking` holds this requirement.
  The `specs/` folder is outside `owns` of P05, so the parent removes or rewrites the requirement.
- `Atomic settings write`: kept, because the candidate is confirmed and fixed.
