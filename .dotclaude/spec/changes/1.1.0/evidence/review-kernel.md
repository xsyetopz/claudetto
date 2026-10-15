# Review of the Kernel (P107)

A `reviewer` run did the review on 2026-10-14, read only.
The main session wrote this file from its report.
Scope: `src/kernel/` without `spec-store.ts`, and `tests/kernel/`.
The parser was reviewed first: `shell.ts`, `shell/scan.ts`, `shellkinds.ts`, and `wrappers.ts`.
The fix package is P133.
Before the review, `bun test tests/kernel` gave 78 pass, 1 skip, and 0 fail.

The probe `$TMPDIR/p107/cmds.sh` runs `parse`, `stripWrappers`, and `gitReason` from `asks/domain/git.ts` on each input.
`gitReason("git reset --hard")` gives an ask.

```bash
bash "$TMPDIR/p107/cmds.sh"
```

```text
"env -S 'git reset --hard'" [[]] none
"env -P /usr/bin git reset --hard" [["/usr/bin","git","reset","--hard"]] none
"noglob git reset --hard" [["noglob","git","reset","--hard"]] none
"coproc git reset --hard" [["coproc","git","reset","--hard"]] none
"caffeinate -i git reset --hard" [["caffeinate","-i","git","reset","--hard"]] none
"echo $'a\\'b'; git reset --hard" [["echo","$a\\b; git reset --hard"]] none
"{git,reset,--hard}" [["{git,reset,--hard}"]] none
"$(echo git) reset --hard" [["echo","git"],["","reset","--hard"]] none
"cat <<E\"OF\"\nx\nEOF\ngit reset --hard" [["cat","OF"]] none
```

Real shells run each form.
The check used `echo` in place of `git`.

```bash
env -S 'echo RAN-S'; env -P /bin echo RAN-P; zsh -c 'noglob echo RAN-NOGLOB'
bash -c "echo \$'a\\'b'; echo RAN-ANSI"; bash -c '{echo,RAN-BRACE}'
bash -c '$(echo echo) RAN-SUBST'; caffeinate -i echo RAN-CAFFEINATE
printf 'cat <<E"OF"\nx\nEOF\necho RAN-HEREDOC\n' | bash
```

```text
RAN-S
RAN-P
RAN-NOGLOB
a'b
RAN-ANSI
RAN-BRACE
RAN-SUBST
RAN-CAFFEINATE
x
RAN-HEREDOC
```

## Confirmed Findings

### F1. I07, I18: `env -S` and BSD `env -P` hide the command

In `src/kernel/wrappers.ts:26`, `-S` takes the whole script as its value, and `stripWrappers` drops that value.
`-P`, the BSD option of macOS `env`, is not in the set, so its value becomes the command name.
The command is shown by the probe output above.

Failing test, in `tests/kernel/shell.test.ts`:

- Input: `env -S 'git reset --hard'` and `env -P /usr/bin git reset --hard`.
- Expected: `parse` gives a command that `stripWrappers` reduces to `["git","reset","--hard"]`.
- Actual: `[]`, and `["/usr/bin","git","reset","--hard"]`.

### F2. I07: an ANSI-C quote hides the next commands

`src/kernel/shell/scan.ts:127` reads `$'` as a plain single quote.
In it, `\'` ends the quote, so the text after it becomes one word.
The command is shown by the probe output above.

Failing test, in `tests/kernel/shell.test.ts`:

- Input: `echo $'a\'b'; git reset --hard`.
- Expected: the commands contain `["git","reset","--hard"]`.
- Actual: `[["echo","$a\\b; git reset --hard"]]`.

### F3. I07: a heredoc delimiter with a quote inside it

The regex in `src/kernel/shell/scan.ts:134` takes only `E` from `E"OF"`, but bash uses `EOF`.
So the reader takes the text after the real end of the heredoc as body.
The command is shown by the probe output above.

Failing test, in `tests/kernel/shell.test.ts`:

- Input: `cat <<E"OF"`, then `x`, `EOF`, and `git reset --hard`, one on each line.
- Expected: the commands contain `["git","reset","--hard"]`.
- Actual: `[["cat","OF"]]`.

### F4. I07, I18: `noglob`, `coproc`, and `caffeinate` are not wrappers

`WRAPPER_OPTS` at `src/kernel/wrappers.ts:5` does not have the zsh word `noglob`, the bash word `coproc`, or the macOS command `caffeinate`.
Claude Code runs the shell of the user, which is zsh on macOS.
The command is shown by the probe output above.

Failing test, in `tests/kernel/shell.test.ts`:

- Input: `stripWrappers` of `noglob`, `coproc`, or `caffeinate -i`, followed by `git reset --hard`.
- Expected: `["git","reset","--hard"]`.
- Actual: the input, with no change.

### F5. I07: a command name that the reader cannot see reads as no command

`src/kernel/shell/scan.ts:69` gives `""` for a word that is only a substitution.
`runsCode` and `hiddenLevel` at `src/kernel/shellkinds.ts:107` and `:147` read `""` as no command, so no reader asks.
The scan at `scan.ts:181` does not expand braces.
The command is shown by the probe output above.

Failing test, in `tests/kernel/shell.test.ts`:

- Input: `$(echo git) reset --hard` and `{git,reset,--hard}`.
- Expected: the command name is marked unreadable, as a `$c` word is, or `parse` expands it to `git`.
- Actual: `["","reset","--hard"]` and `["{git,reset,--hard}"]`, and `gitReason` gives no ask.

### F6. I17: a read error is read as an absent file

`fileReader` at `src/kernel/node/fs.ts:84` and `:92` gives `null` or `[]` for `EACCES`, `EISDIR`, and `ENOTDIR`, because it uses `UNREADABLE` from `src/kernel/errors.ts:5`.
The contract at `src/kernel/ports.ts:22` names only a missing file.

```bash
bun "$TMPDIR/p107/probe3.ts"  # folder `locked` has mode 000
```

```text
list(missing) = []
list(locked)  = []
read(missing) = null
read(locked)  = null
```

Failing test, in `tests/kernel/node.test.ts`, which is skipped for root:

- Input: `list` and `read` of a folder with mode `000`.
- Expected: a rejection with `EACCES`.
- Actual: `[]` and `null`.

### F7. Silent `catch`: each parser error becomes a YAML problem

`src/kernel/rules.ts:79` catches all errors, against the policy at `src/kernel/errors.ts:1`.
`Bun.YAML.parse` throws `SyntaxError`.

```bash
bun "$TMPDIR/p107/probe5.ts"  # parse throws TypeError("parser bug")
```

```text
[{"rule":"r.md","kind":"yaml"}]
```

Failing test, in `tests/kernel/rules.test.ts`:

- Input: `checkRule` with a `parse` that throws `TypeError`.
- Expected: the `TypeError` is thrown again.
- Actual: `[{rule, kind: "yaml"}]`.

### F8. Copy of slice code: `node/paths.ts` has no importer

No file imports `src/kernel/node/paths.ts`.
Domain code cannot import `src/kernel/node/` (`slice-imports.md`), so the slices copy it.
`asks/domain/paths.ts` matches it without `segments`, and `guard/domain/paths.ts` matches its first 40 lines.

```bash
grep -rn --include='*.ts' -E "node/paths(\.ts)?['\"]" src tests tools  # no output
diff k.txt a.txt   # kernel vs asks, from `const DRIVE` to the end
```

```text
6,8d5
< /** The parts of `p`, split on `/` or `\`. */
< export const segments = (p: string): string[] => toSlash(p).split("/");
```

Failing test, in a new `tests/kernel/readers.test.ts`:

- Input: the exports of `src/kernel/`, with readers from `src/` outside `plugins/`.
- Expected: each export has a reader.
- Actual: the file `node/paths.ts` has no reader.

### F9. Dead code: four constants have no reader

`CONTEXT_BLOCK_MARGIN` at `src/kernel/budget.ts:29` has no reader in code, but 5 wiki pages document it.
`SPECS_TEMP`, `SPECS_OLD`, and `HOTFIX_DIR` at `src/kernel/paths.ts:53-59` have no reader.
`archive.ts` imports only `ARCHIVE_DIR` and `SPECS_DIR`.
`DOTCLAUDE_LOCAL_PATHS` at `paths.ts:80-81` excludes folders that nothing writes.

```bash
grep -rnw --include='*.ts' -e SPECS_TEMP -e SPECS_OLD -e HOTFIX_DIR \
  -e CONTEXT_BLOCK_MARGIN src tools tests
```

```text
src/kernel/budget.ts:29:export const CONTEXT_BLOCK_MARGIN = 23_000;
src/kernel/paths.ts:53:export const SPECS_TEMP = `${SPEC_DIR}/.specs-new`;
src/kernel/paths.ts:56:export const SPECS_OLD = `${SPEC_DIR}/.specs-old`;
src/kernel/paths.ts:59:export const HOTFIX_DIR = `${SPEC_DIR}/hotfixes`;
```

Failing test: the F8 test, which gives these 4 exports.

### F10. Bound outside `budget.ts`: `MAX_PATTERNS`

`MAX_PATTERNS` is at `src/kernel/rules.ts:7`.
Its copy at `rules-creator/scripts/check-globs.ts:11` has no pin, because `tests/kernel/rules.test.ts:14` imports only `expansions` from that script.

```bash
grep -rn --include='*.ts' -E '^export const [A-Z_]+ = [0-9]' src/kernel | grep -v budget.ts
```

```text
src/kernel/spec-store.ts:11:export const SPEC_SCHEMA = 2;
src/kernel/rules.ts:7:export const MAX_PATTERNS = 1000;
```

Failing test, in `tests/kernel/rules.test.ts`:

- Input: the numeric exports of `src/kernel/` apart from `budget.ts`.
- Expected: none. `SPEC_SCHEMA` is a version and P94 has it.
- Actual: `MAX_PATTERNS`.

## Unconfirmed Findings

- `src/kernel/shell/scan.ts:82-83` has the same comment line two times (`uniq -d`). This is a nit with no behavior, so no failing test applies.
- `zsh` `nocorrect`, `gtimeout`, `watch`, `su -c`, and `find -exec` were not probed.
- `tests/kernel/shell.test.ts:126` checks only that the result is an array. It fails only on a throw.

## Dossier Check

- I01: Bounds cite the `2.1.296` bundle. `CONTEXT_BLOCK_MARGIN` has wiki docs but no code (F9).
- I02: Biome enforces the import rules. The `node/` location of pure code caused copies (F8).
- I03: No defect. `CONTEXT_WINDOW` and `windowOf` are tested.
- I04: The tests pass but do not encode F1 to F5.
- I05: F7 swallows defects. No weaker assertion was found.
- I06: Not applicable to the kernel.
- I07: F1 to F5 get past the guard. See `03-safety-and-trust-boundaries.md` Residual risk, line 77.
- I08: The `env` options are GNU only, so the BSD `-P` is missing (F1).
- I09: Two copies of `node/paths.ts`, and dead constants (F8, F9).
- I10: `runHook` fails open on a crash by design (`hook-io.ts:5`). `truncated` makes the guard ask. No defect.
- I11: Not applicable.
- I12: `SHELL_SCAN_MAX_CHARS` keeps the scan linear. No defect.
- I13: Not applicable.
- I14: F10 is a bound outside `budget.ts` with an unpinned copy.
- I15: `policy.test.ts:45` checks the classifier payload, not wording. No defect.
- I16: The test at `shell.test.ts:126` is weak (unconfirmed).
- I17: F6 reads a tool error as a negative. See `07-measurement-and-environment.md` Recipe 2, line 114.
- I18: F1 and F4 are shell differences between zsh and BSD. See `07-measurement-and-environment.md` Recipe 4, line 160.
