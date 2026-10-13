# Second check: core setup, rules, and handoff

Base `ad61fb01`, package P05 of the change `Second-checking`.
Each candidate has a test or a reason for having none.
The tests run the generated copy in `plugins/`, so each run used `just generate` first.

| Candidate | Test | Verdict | Fix |
| --- | --- | --- | --- |
| `settings-cmd.ts:96` settings write is not atomic | `--apply` keeps the old text of a hard link (`settings.test.ts`) | confirmed: the test failed with the old write (the CLI wrote in place) and passes now | `writeAtomic` from `src/kernel/node/fs.ts` |
| Temp file left by the settings write | `--apply` leaves only `settings.json` in the config folder | guard: passes with and without the fix, so it does not show the defect | none |
| `mythosInCatalog` calls `statSync` outside its try block (`files.ts`) | a dangling link named like the organization beside a valid catalog file, `--apply` exits 0 | confirmed: `ENOENT` in the sort comparator, exit 1, reproduced by hand | `stat` each file in a try and drop the unreadable ones |
| A top-level `[]` or `null` settings file is replaced by the snippet | `--apply` exits 1 and keeps the file (two tests) | rejected: the file is kept, because `planSettings` throws `The settings are not an object` and the call site catches it | none |
| A settings file with a byte order mark | `--apply` keeps the keys (`settings.test.ts`) | rejected: passes, because `Bun.file().text()` strips the mark and the keys stay | none |
| A settings file with comments | `--apply` exits 1 and keeps the file | rejected: passes, the file is not valid JSON and the run stops before a write | none |
| `claude auth status` output that is empty, torn, an array, `null`, or a number (`account.ts`) | five tests in `tiers.test.ts` | rejected: all pass, the try block gives the no-login account and setup runs | none |
| Exclude line torn by two runs (`exclude-step.ts:54`) | none | rejected by reading: one `appendFileSync` call writes whole lines | none |
| Exclude duplicate line from read then append (`exclude-step.ts:49,54`) | none | open: no seam between the read and the append, and a test needs a race or a lock, which `design.md` rules out | none |
| Handoff file that is empty or partial (`adapters/mod.ts:151-156`) | none | open: `resume` accepts the newest name without a size or content check, and the spec does not say what an empty file must do | none |
| Session ends between the write prompt and the resume (`adapters/mod.ts` `settle`) | none | open by design: the pending state is in memory, as `design.md` states | none |
| Bare `JSON.parse` in `drift-cmd.ts:27` | none | rejected by reading: inside a try, exit 2 | none |
| Other `JSON.parse` hits (`files.ts:35,73`, `settings-cmd.ts:28`, `stamp/domain/build.ts`) | none | rejected by reading: each sits in a try or a `parseJson` guard | none |
| Backslash path splits (`merge.ts:31-33,51`, `stamp/domain/build.ts:41`) | none | rejected by reading: both separators are handled | none |

## Requirements of `specs/setup-settings.md` that the evidence rejects

- `No torn exclude line`: the torn-line case is rejected, because one append writes whole lines.
  The duplicate-line race is open, and it is not in this requirement.
  The spec owner removes or rewrites the requirement.
- `Atomic settings write`: kept, because the candidate is confirmed and fixed.
