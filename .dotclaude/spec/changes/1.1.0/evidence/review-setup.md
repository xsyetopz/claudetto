# Review of the Setup Slice (P93)

A `reviewer` run did the review on 2026-10-14, read only.
The main session wrote this file from its report.
Scope: `src/plugins/dotclaude/slices/setup/` (all files), `tests/dotclaude/setup/` (10 files),
and `src/plugins/dotclaude/slices/setup/lab/drift.test.ts`.
The baseline is green: `bun test tests/dotclaude/setup/` gives 152 pass and 0 fail.
The probes are in `/tmp/claude-501/p93.t2Mh/` (`$P` below).
The fix package is P119.

## Confirmed Findings

### F1. I18: `git ls-files` output is quoted for a non-ASCII path

`adapters/rules-check.ts:12` runs `git ls-files` without `-z`.
With the default `core.quotePath`, git quotes and octal-escapes a non-ASCII path,
so no glob matches it, and the drift check reports a rule that is correct.
This confirms the P91 lead.

```text
$ cd $P/proj && git ls-files
.claude/rules/docs.md
"docs/\305\274\303\263\305\202w.md"
$ bun -e '<print projectRuleProblems(dir)>' $P/proj $P/ctl
proj [{"rule":".claude/rules/docs.md","kind":"no-match","glob":"docs/**"}]
ctl []
```

Failing test, in `tests/dotclaude/setup/rules.test.ts`:

- Input: a git repository with `docs/żółw.md` in the index, and a rule with `paths: ["docs/**"]`.
- Expected: `projectRuleProblems(dir)` gives `[]`.
- Actual: it gives one `no-match` problem for `docs/**`.

### F2. I17: a git failure counts as "no files"

`adapters/rules-check.ts:15-17` gives `[]` when git fails,
and `checkRule` then reports each glob as "matches no tracked file".
When git is not on `PATH`, `Bun.spawnSync` throws, and nothing catches the error.
The drift command then stops with exit 1, which `drift-cmd.ts:13` defines as "a difference".

```text
$ cd $P/nogit && git rev-parse
fatal: not a git repository (or any of the parent directories): .git
$ bun -e '<driftCommand({scope:"project"}) on $P/nogit>'
log:   The rule `.claude/rules/docs.md` has the `paths` glob `docs/**`, which matches no [...]
exit 1
$ env -i PATH=$P/emptybin ... bun plugins/dotclaude/bin/dotclaude-setup drift --scope project
error: Executable not found in $PATH: "git"
exit 1
```

Failing tests, in `tests/dotclaude/setup/rules.test.ts`:

- Input: a folder that is not a git repository, with `docs/turtle.md` and a rule with `paths: ["docs/**"]`.
- Expected: no `no-match` line, because the file list is unknown.
- Actual: a `no-match` line and exit 1.
- Input: the same project, with no `git` on `PATH`.
- Expected: no uncaught error, and an exit status other than 1.
- Actual: an uncaught `Executable not found` error and exit 1.

### F3. I04 and I07: `--apply` writes `.git/info/exclude` before it checks the call

`adapters/cli.ts:38-43` runs `excludeRuntimePaths` before `settingsCommand` checks the scope and the JSON.
With settings that are not valid JSON, `settings-cmd.ts:77` prints "Nothing changed.",
but the step already wrote 17 lines to the exclude file.

```text
$ env -i CLAUDE_CONFIG_DIR=... CLAUDE_PROJECT_DIR=$P/cli/project PATH=/usr/bin:/bin \
    bun plugins/dotclaude/bin/dotclaude-setup settings --apply
# settings.json holds "{ not json"
Added runtime paths to .git/info/exclude: 16.
.../settings.json: JSON Parse error: Expected '}' Nothing changed.
exit 1    (exclude: 6 lines before, 23 lines after)
$ ... settings --scope global --apply
# a new repository, $P/cli2
Added runtime paths to .git/info/exclude: 16.
Unknown scope "global". Use user, project, or local.
exit 2    (exclude: 6 lines before, 23 lines after)
```

`settings.test.ts:237` and `settings.test.ts:243` cannot find this,
because their `PATH` holds no `git` (`settings.test.ts:20`).

Failing test, in `tests/dotclaude/setup/write-count.test.ts`:

- Input: a git repository, and `main(["settings", "--scope", "global", "--apply"])`.
  Do a second run with `{ not json` in the user settings file and `["settings", "--apply"]`.
- Expected: `.git/info/exclude` does not change.
- Actual: the step adds the header and 16 paths, and the second run also prints "Nothing changed.".

### F4. I04: a `null` settings file gives "No difference"

`adapters/drift-cmd.ts:27` casts the parsed JSON to `Json` and does not check the shape.
For `null`, `drift.ts:171` and `drift.ts:177` skip each check,
but `settings` refuses the same file (`domain/settings.ts:93`).

```text
$ bun -e '<driftCommand({scope:"user"}) with settings.json = null, [], {}>'
file: null exit 0   log: No difference from the snippet.
file: [] exit 1     log: Differences:
file: {} exit 1     log: Differences:
```

Failing test, in `tests/dotclaude/setup/drift.test.ts`:

- Input: a user `settings.json` with the text `null`, and `driftCommand({ scope: "user" })`.
- Expected: exit 2 with an error that names the file.
- Actual: exit 0 and "No difference from the snippet.".

### F5. I15, test of prose: assertions on the words of the note

Most assertions at `session-start.test.ts:116-213` check an identifier that the note reports,
such as a plugin ID, a variable, a section ID, or a version.
They check behaviour, so keep them.
Four assertions check fixed prose only:

- `session-start.test.ts:162-163` and `session-start.test.ts:180` check the backticked event names.
- `session-start.test.ts:205` checks the backticked command name.
- `session-start.test.ts:203` checks the colon and comma separators of the sentence.

The words of `:162-163` and `:180` come only from the prose constant `GUARD_SKIPS` (`domain/facts.ts:70`).

```text
$ bun $P/probe-mod.ts
prompt.compose only in GUARD_SKIPS prose: true
```

Failing test, in `tests/dotclaude/setup/session-start.test.ts`:

- Input: a rewrite of `GUARD_SKIPS` that keeps its meaning but drops the event names.
- Expected: the tests pass, because the behaviour is the same.
- Actual: the tests at `:160` and `:172` fail.
  The replacement asserts that the seated-guard line is present, for example as `driftLines` output.

### F6. Test that cannot fail: `session-start.test.ts:181`

`expect(notes[0]).not.toContain("syncClaudeAiSkills")` passes whether the usage read fails or not,
because the default `skills` is `[]`.

```text
$ bun $P/probe-mod.ts     # settings = applied snippet, policy set, version 2.2.0
usageFails true notes 1 has syncClaudeAiSkills false
usageFails false notes 1 has syncClaudeAiSkills false
```

Failing test, in the same file:

- Input: a fake whose `usage`, when it does not fail, lists a `syncedSkills` skill.
- Expected: with `usageFails: true`, the note has no synced-skill line, and the assertion can fail.
- Actual: the assertion gives the same result in both cases.

### F7. Bound outside `limits.ts`

`adapters/exclude-step.ts:22` has `timeout: 10_000`.
`domain/drift.ts:117` has the literal `1000`, which copies `MAX_PATTERNS` of `src/kernel/rules.ts:7`.

```text
$ grep -rn "10_000\|1000" src/plugins/dotclaude/slices/setup
limits.ts:21:export const AUTH_STATUS_TIMEOUT_MS = 10_000;
adapters/exclude-step.ts:22:      timeout: 10_000,
domain/drift.ts:117: ... and Claude Code expands at most 1000, so a pattern ...
```

Failing test, in `tests/dotclaude/setup/exclude.test.ts`:

- Input: the source text of the slice adapters and of `domain/drift.ts`.
- Expected: no numeric `timeout:` literal, and the budget line built from `MAX_PATTERNS`.
- Actual: both literals are present.
  This is a source check, because the timeout cannot be injected.

### F8. Dead code: `SCOPES`

`domain/settings.ts:17` exports `SCOPES`, but no file uses it.
`adapters/files.ts:89-93` has its own list of the scopes.

```text
$ grep -rnw SCOPES src tests tools
src/plugins/dotclaude/slices/setup/domain/settings.ts:17:export const SCOPES = [...]
```

Failing test: none.
The project has no dead-export check (`package.json`, `biome.json`).
The fix is to delete the constant, or to make `settingsFile` use it.

## Unconfirmed Findings

- `adapters/account.ts:12` calls `Bun.spawnSync` and not the kernel `runProgram`.
  On Windows, an npm-installed `claude.cmd` can then fail, and the account becomes `none`, with no picks.
  This could not be run on macOS.
- `lab/drift.test.ts:18-22` and `lab/drift.test.ts:40`: in "no drift adds no text", each settings read throws,
  so the test does not check settings that match the snippet.
  `slice.ts:16` cites it as evidence.
  A mutation run of the lab is not read-only, so this was not run.
- `adapters/mod.ts:72-73`: a failed `turns` read counts as a new session.
  The probe shows one note on a resumed session.
  The comment states that this is on purpose, so this review does not count it as a defect.
- `domain/merge.ts:46` and `domain/automode.ts:13` both have the same `show` helper (nit).

## Dossier Check

- I01: not present.
  `TESTED_VERSION` (`domain/facts.ts:6`) is pinned, and the account comes from `claude auth status` (`adapters/account.ts:12`).
- I02: not present.
  The rule checks are code (`adapters/rules-check.ts`).
- I03: not present.
  The note is added once per new session (`adapters/mod.ts:73`).
- I04: present.
  F3 (`adapters/cli.ts:38`) and F4 (`adapters/drift-cmd.ts:27`).
- I05: not found.
  No test in scope has a weakened assertion or a skip.
- I06: not applicable.
- I07: present.
  F3: a write happens before the call is checked (`adapters/cli.ts:38`).
- I08: not found.
  The snippet equals the wiki (`settings.test.ts:276`).
- I09: present, minor.
  F8 (`domain/settings.ts:17`), and the duplicate `show`.
- I10: not present.
  `addons` runs only fixed commands (`domain/addons.ts:57`).
- I11: not applicable.
- I12: not present.
  The drift check makes no model request (`slice.ts:13-14`).
- I13: not present.
  Global installs are only offered (`domain/addons.ts:4`).
- I14: not present.
  Writes need `--apply` (`adapters/settings-cmd.ts:102`), and the note says not to change the settings (`domain/drift.ts:218`).
- I15: present.
  F5 (`session-start.test.ts:162`).
- I16: present.
  F6 (`session-start.test.ts:181`), and the lab lead, which is unconfirmed.
- I17: present.
  F2 (`adapters/rules-check.ts:15`).
- I18: present.
  F1 (`adapters/rules-check.ts:12`).

The run read all slice files, the 10 test files, `src/kernel/rules.ts`, `src/kernel/node/process.ts`,
and the dossier sections for I15 and I17.
It ran `bun test tests/dotclaude/setup/` and the probes in `$P`:
the `git` repositories, `projectRuleProblems`, `driftCommand`, the CLI with `env -i`, and `probe-mod.ts`.
