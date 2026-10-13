# Second check of the core guard, asks, and spec

Package P04 of the change `Second-checking`.
Commits: `97c3025c` and `79b38501` (earlier run), `9b4080e2` (red tests), `8eef4a26` (guard fix).

## Method

- Red checks: the parent of each fix commit replaced the fixed `src/` files in the worktree.
  Then `just generate` ran, the tests ran, and `git checkout HEAD -- src/` restored the fix.
- Guard probe: `tests/dotclaude/guard/substitution.test.ts` calls `onBashCall` on each form in the list.
  No command runs.
- Alias evidence: `external/cc-2.1.296/strings.txt`, the shell snapshot function `SMr` and its helper `_Mr`.

## Verdicts

| Candidate | Test | Verdict | Fix commit |
| --- | --- | --- | --- |
| Torn last line: reader throws | `tests/dotclaude/spec/cli/validate.test.ts`, `status reads a change whose log ends in a torn line` | Fixed. Fails on the parent (`status` exits non-zero). | `97c3025c` |
| Torn last line: validate names the file and line | `tests/dotclaude/spec/cli/validate.test.ts`, `validate fails on a torn last line ...` | Kept as a check, not a red test. It passes on the parent, because the parent `parseLine` already names `events.jsonl:<line>`. | `97c3025c` |
| Torn line stays after an append | `tests/dotclaude/spec/cli/append.test.ts`, `kernel`: `an append after a torn last line removes the torn line first` | Fixed. Fails on the parent. | `97c3025c` |
| `fsync` in `appendEvent` (`store.ts:81`) | none | Rejected. The torn-line repair covers a partial last line. A lost last line is not corruption, so no `fsync` is needed for this defect. | none |
| Write guard gives no ask on a command over `SHELL_SCAN_MAX_CHARS` | `tests/dotclaude/asks/shellwrites.test.ts`, `a command over the scan bound gets a write reason ...` | Fixed. The former test used `decideAsk`, and the git guard asks on the same command, so it passed on the parent. The test now calls `shellWriteReasons` and fails on the parent. | `79b38501` (test: `9b4080e2`) |
| `git${IFS}reset${IFS}--hard` allowed | `tests/dotclaude/guard/substitution.test.ts` | Fixed in the guard. `walk.ts` splits a word at an unquoted `$IFS` or `${IFS...}`, as bash does. Fails on the parent. | `8eef4a26` |
| `alias g=git; g reset --hard` allowed | `tests/dotclaude/guard/substitution.test.ts` | Denied. The shell snapshot writes `shopt -s expand_aliases` for a shell that is not zsh (`SMr`), and it sources `.zshrc` for zsh (`_Mr`), so aliases are on. `walk.ts` reads an alias set in the same text. Fails on the parent. | `8eef4a26` |
| `$(echo reset)`, backticks, `$'reset'`, `env git`, `command git`, `xargs git`, `git -c`, `--no-pager`, `env git clean -fd`, `command git stash drop` | `tests/dotclaude/guard/substitution.test.ts` | Denied, before and after the fix. | none |
| Path `\` separator and `C:foo` (`slices/guard/domain/paths.ts`) | `tests/dotclaude/asks/paths.test.ts` (win32 answers pinned, for `C:\\a\\b`, `C:foo\\bar`, and `C:\\a\\..\\b`) | Rejected. The current deny stays, and no change is made to weaken it. | none |
| Bare `JSON.parse` in `slices/asks` | none | Rejected. The three sites are `domain/jsondiff.ts:34`, `domain/content.ts:17`, and `domain/hooks.ts:72`, and each is in a `try` with a `catch`. `slices/sembr` has none. | none |
| Non-atomic write in `slices/asks` and `slices/sembr` | none | Rejected. No write call in either slice. | none |
| Path split on `\` in `slices/asks` and `slices/sembr` | none | Rejected. No such split. | none |

## Requirements of `Second-checking/specs/spec-store.md` that the fix makes wrong

The delta is not edited.

- Scenario "Torn line that is no longer last": the `THEN` says that the torn line stays reported as a middle line.
  The fix removes the torn tail in `appendEvent`, so the torn line is gone after the append, and the new event is read.
  This scenario must change.
- Requirement "Torn JSONL line", first sentence: the reader reports the torn line, and `validate` names it.
  This still holds.
  The reader skips the line and `tornLine` gives its number.

## Outside the brief

- A user alias in `.zshrc` (set outside the command) is not read by the guard.
  The shell snapshot sources `.zshrc`, so such an alias can hide a verb.
- The `${IFS}` split also splits a word in double quotes, which bash does not split.
  This is stricter than bash, so it denies more, not less.
