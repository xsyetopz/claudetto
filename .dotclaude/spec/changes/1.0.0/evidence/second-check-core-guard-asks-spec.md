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
| `alias g=git; g reset --hard` allowed | `tests/dotclaude/guard/substitution.test.ts` | Denied. The shell snapshot writes `shopt -s expand_aliases` for a shell that is not zsh (`SMr`), and it sources `.zshrc` for zsh (`_Mr`), so aliases are on. Bash does not expand an alias on the line that defines it, so this command runs `g` as a command that is not found. The guard keeps the deny anyway (the same-line form is the safe side), so the verdict does not depend on the line timing. | `07e64460` |
| `alias git=echo; git reset --hard` allowed (the commit `8eef4a26` rewrote the raw words to `echo reset --hard`), `alias git=echo; unalias git; git reset --hard` allowed, `alias g=git` then a newline then `g reset --hard`, `alias b=git` / `alias a=b` / `a reset --hard` (an alias chain) | `tests/dotclaude/guard/substitution.test.ts`, `an alias or a nested split that hides a guarded git verb ...` | Denied. Bash runs the real `git reset --hard` in the first two forms, because the alias set on one line does not hide the verb from the next command. The guard now checks the raw words of each command and also the alias-expanded words, so the raw `git reset --hard` is denied. The alias chain is expanded in a loop, as bash expands it. The test fails on the parent (`8eef4a26`) for the list, and the first two forms are the cases that it allowed. | `07e64460` |
| `git${x:-$IFS}reset --hard` allowed (split to `git${x:-`, `}reset`, `--hard`), and `bash -c 'git${IFS}reset --hard'` (a nested shell reads the quoted text as code) | `tests/dotclaude/guard/substitution.test.ts` | Denied. The `${...}` that names `IFS` is a separator in the reading of the text, so the split gives `git`, `reset`, `--hard`. The quoted `$IFS` is also marked in a second reading of the text, which a nested shell uses. | `07e64460` |
| `git commit -m '$IFS'` loses `-m` | `tests/dotclaude/guard/substitution.test.ts`, `a quoted $IFS stays one argument of git ...` | Fixed. The split marks only an unquoted `$IFS` in the first reading, so the argv keeps `["git","commit","-m","$IFS"]` and the command is allowed. The second reading, which splits quoted text too, does not match a guarded form. | `07e64460` |
| `command alias g=git`, `builtin alias g=git`, and `al\ias g=git`, each followed by a newline and `g reset --hard`, allowed | `tests/dotclaude/guard/substitution.test.ts`, `an alias set behind a wrapper or a spelled-out name ...` | Denied. The alias reader read the head word without its wrapper, so `command` hid the `alias` command. The text gate that read only a text with the word `alias` missed `al\ias`, so that gate is removed. `builtin` was already stripped by `stripWrappers`. The test fails on `33280fe9` and lists the three forms. | this commit |
| `alias g='true; git'`, `alias g='echo; git'`, and the bodies with `&&`, `\|\|`, and `\|`, each followed by a newline and `g reset --hard`, allowed | `tests/dotclaude/guard/substitution.test.ts`, `an alias body with a separator ...` | Denied. The alias body was split on whitespace only, so `true;` became the head word. The body is now read with `commandsOf`, and the arguments of the use go to the last command of the body, as bash puts them there. The test fails on `33280fe9` and lists the five forms. | this commit |
| `git$9 reset --hard`, `$9 git reset --hard`, `git$@ reset --hard`, and `git$* reset --hard` allowed | `tests/dotclaude/guard/substitution.test.ts`, `an empty positional or special parameter ...` | Denied. Bash removes an empty parameter from the word, so `git$9` runs `git`, and `$9 git` runs `git`. The walker adds a reading with `$1` to `$9`, `${N}`, `$@`, `$*`, and `$!` removed, in unquoted text, in double quotes, and in the nested-shell reading. The literal reading stays, so the new reading only adds a deny. The test fails on `33280fe9` and lists four forms. | this commit |
| `git$IFS$9reset --hard` (the form named by the review) | same test as above | Denied on `33280fe9` already. The walker reads `$9reset` as an unknown verb word, and the verb-word rule denies it, so this form does not fail before the fix. It is kept as a regression test. | none |
| Normal commands near each fix: `alias ll='ls -l'`, `command ls`, `echo $9`, `echo $9 $1`, `git commit -m 'a; b'`, `git commit -m '$9'` | `tests/dotclaude/guard/substitution.test.ts`, `a normal command near each alias, parameter, and quote fix is allowed` | Allowed, before and after the fix. | none |
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
- A git command with a `$1`-style word before its verb, such as `git $1 status`, is denied on `33280fe9`.
  The verb-word rule treats the unknown word as a possible verb, so this is a false deny of a rare command.
  The rule is not changed in this package.
