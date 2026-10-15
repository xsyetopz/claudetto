# Review of dotclaude-codegraph (P103)

A `reviewer` run did the review on 2026-10-14, read only.
The main session wrote this file from its report.
Scope: `src/plugins/dotclaude-codegraph/`, its lab test in `slices/graph/lab/`, and `tests/codegraph/`.
The review used the dossier `external/agent-failure-dossier/` (I09 and I18 first), `CLAUDE.md`, and `.claude/rules/*.md`.
`just test tests/codegraph` gives 33 pass and 0 fail, so each finding below is a gap that the tests do not catch.
The probes ran in `$TMPDIR/p103/` with fake `codegraph` scripts.
The fix package is P129.

## Confirmed Findings

### F1. I17: the check reads a failed CLI call as a missing CLI

`adapters/cli.ts:15` gives `version.ok` to `checkLines`, and `domain/graph.ts:63-68` reads `ok: false` as "not on `PATH`".
A non-zero exit or a timeout of `codegraph --version` gives `ok: false` with no `ENOENT`.
The check then tells the user to install a CLI that is installed.
`hook.ts:34` tests `error?.code === "ENOENT"`, so the hooks get this right, but the check does not.
Severity: should-fix. Confidence: high.

```bash
# $D/bin/codegraph is a sh script that writes to stderr and exits 2
cd "$D/proj" && PATH="$D/bin:/usr/bin:/bin" bun --no-env-file \
  "$REPO/plugins/dotclaude-codegraph/bin/dotclaude-codegraph-check"
```

```text
`codegraph` is not on `PATH`, so the code-graph hooks do nothing.
To install it, run `bun i -g @colbymchenry/codegraph`.
The add-on does not install it.
exit=0
```

Failing test, in `tests/codegraph/layout.test.ts`:

- Input: a fake `codegraph` on `PATH` that exits 2 for `--version`.
  The fake in `tests/codegraph/fake-cli.ts:40-46` always exits 0, so `setUp` needs an option for this.
- Expected: the output does not say "is not on `PATH`" and does not give the install command.
- Actual: the output says both.

### F2. I09 and I12: `TREE_CHANGE` is a second shell parser that misses forms

`domain/graph.ts:43-45` parses `Bash` text with a regex.
`src/kernel/shell.ts` (`parse`) and `src/kernel/wrappers.ts` (`stripWrappers`) already do this work, and `dcc-plugin-you-should-know` uses them.
The regex anchor at `graph.ts:44` has no newline and no `(`, and the regex skips no wrapper.
This is the same failure as the I09 field evidence: a parser that missed `timeout 5 git reset --hard`.
The regex also matches `git stash list`, and `mod.ts:49` makes the `git` result wait for the sync, for up to `GIT_SYNC_TIMEOUT_MS` (15 s).
Severity: should-fix. Confidence: high.

```bash
bun "$TMPDIR/p103/regex.ts"   # tests TREE_CHANGE and kernel commands() + stripWrappers
```

```text
"bun test\ngit commit -m x" TREE_CHANGE: false kernel: [["bun","test"],["git","commit","-m","x"]]
"timeout 5 git reset --hard" TREE_CHANGE: false kernel: [["git","reset","--hard"]]
"(cd sub && git pull)" TREE_CHANGE: false kernel: [["cd","sub"],["git","pull"]]
"env GIT_DIR=.git git checkout main" TREE_CHANGE: false kernel: [["git","checkout","main"]]
"git stash list" TREE_CHANGE: true kernel: [["git","stash","list"]]
```

Failing test, in `tests/codegraph/sync.test.ts` and `slices/graph/lab/tree-change.test.ts`:

- Input: the four `Bash` commands above that are not `git stash list`, and then `git stash list`.
- Expected: each of the four commands syncs once, and `git stash list` syncs nothing.
- Actual: the four commands do not match, and `git stash list` matches.

### F3. I17 and I04: the background hook timeout does not cover the sync

`limits.ts:18` says "The hook timeout in `slice.ts` is longer", but `slice.ts:38` makes it equal (60 s).
On Windows `codegraph.ts:111` adds `TREE_GRACE_MS`, so the sync can run 63 s inside a 60 s hook.
Claude Code can end the hook while `codegraph sync` runs, so that sync can continue as an orphan.
`tests/codegraph/sync.test.ts:95` uses `>=`, so the test lets equality through.
Severity: should-fix. Confidence: high for the bounds, low for the orphan.

```bash
bun -e 'import * as L from "./src/plugins/dotclaude-codegraph/slices/graph/limits.ts"
import { slice } from "./src/plugins/dotclaude-codegraph/slices/graph/slice.ts"
const h = slice.hooks.find((h) => h.event === "PostToolUse")
console.log("hook timeout ms", h.timeout * 1000, "sync ms", L.BACKGROUND_SYNC_TIMEOUT_MS,
  "win sync+grace ms", L.BACKGROUND_SYNC_TIMEOUT_MS + L.TREE_GRACE_MS)'
```

```text
hook timeout ms 60000 sync ms 60000 win sync+grace ms 63000
```

Failing test, in `tests/codegraph/timeouts.test.ts`:

- Input: the `PostToolUse` hook of `slice.ts`, and `BACKGROUND_SYNC_TIMEOUT_MS + TREE_GRACE_MS`.
- Expected: the hook timeout in ms is at least the sync, plus the grace, plus 1000 (64000).
- Actual: 60000.

### F4. I17: two syncs run on one index at the same time

`hook.ts:39-50` starts `codegraph sync -q` after each edit, with no lock and no check for a sync that is still running.
Each `Edit` starts an async hook, and `mod.ts:33` can start one more sync after a `git` command.
`codegraph` 1.6.0 uses SQLite WAL with busy timeouts (`dist/db/index.d.ts:192`), so an overlapping writer can get "database is locked".
Severity: should-fix. Confidence: medium, because the harm depends on how `codegraph` handles locks.

```bash
# $D/bin/codegraph logs "start $$", sleeps 1 s, and logs "end $$"
for i in 1 2
do (echo "{\"cwd\":\"$D/proj\"}" | PATH="$D/bin:/usr/bin:/bin" bun --no-env-file "$H" sync &)
done
sleep 3 && cat "$D/log"
```

```text
start 32540
start 32539
end 32539
end 32540
```

Failing test, in `tests/codegraph/sync.test.ts`:

- Input: two `sync` hook runs that start together on one indexed project, with a fake that sleeps 1 s.
- Expected: the second `start` comes after the first `end`, or the second run skips.
- Actual: `start`, `start`, `end`, `end`.

### F5. I15: a test checks the words of the session line

`tests/codegraph/session.test.ts:22-29` checks substrings of `SESSION_LINE`, such as `-d 5`, and that it has no newline.
The `codegraph` help shows `-d, --depth <number>`, so `--depth 5` has the same behavior and fails the test.
Severity: nit. Confidence: high.

```bash
grep -n '"-d 5"\|line.includes' tests/codegraph/session.test.ts
codegraph impact --help | grep depth
```

```text
22:  expect(!line.includes("\n"), line).toBeTruthy();
27:    "-d 5",
29:    expect(line.includes(command), line).toBeTruthy();
  -d, --depth <number>  Traversal depth (default: "2")
```

Failing test, in `tests/codegraph/session.test.ts`:

- Input: `SESSION_LINE` with `--depth 5` in place of `-d 5`.
- Expected: the test passes, because the hook behavior is the same.
- Actual: the test fails at line 29.
  A check that `text(r)` equals `SESSION_LINE` tests the behavior.

### F6. Bound outside `limits.ts`: the 1 s hook margin

`tests/codegraph/timeouts.test.ts:12` defines the margin, and `limits.ts:11` gives it only as words ("1 s under").
`CLAUDE.md` puts each slice bound only in `slices/<s>/limits.ts`.
Severity: nit. Confidence: high.

```bash
grep -n "SAFETY_MS = " tests/codegraph/timeouts.test.ts
```

```text
12:const SAFETY_MS = 1000;
```

Failing test, in `tests/codegraph/timeouts.test.ts`:

- Input: an import of the margin from `slices/graph/limits.ts`.
- Expected: `limits.ts` exports the margin.
- Actual: `limits.ts` exports no margin.

## Unconfirmed Findings

- U1 (I18): `mod.ts:33` runs `codegraph` through `$.process.run`, which uses no shell.
  `codegraph.ts:10` says that on Windows the CLI is `codegraph.cmd`, which runs only through a shell.
  So the sync after a `git` command can fail on each Windows call.
  The silent `catch` at `mod.ts:37-39` hides the failure.
  No Windows host was available to confirm it.
- U2 (I17): `run-tree.ts:92` ignores the result of `taskkill`.
  When `taskkill` fails, the back stop at `codegraph.ts:111` ends only `run-tree.ts`, and the `codegraph` child can continue.
  This is Windows only, and was not run.
- U3 (silent catch): the `catch` at `mod.ts:37` sends nothing to a log.
  The `$.process.run` contract (`index.d.ts:3511-3512`) says that it rejects only for a failed start or a timeout, so the catch is narrow.
  Thus the only cost is that the session never sees a failure, as in U1.

## Dossier Check

- I01: No finding.
  The hooks read the project state from `.codegraph/codegraph.db` and `CLAUDE_PROJECT_DIR`.
- I02: F6 breaks the `CLAUDE.md` rule for bounds.
  The plugin keeps the import rules: `plugin-imports.md`, `slice-imports.md`, and `hooks-module.md`.
  `register.ts` imports only `mod.ts`, which uses no `node:` or `Bun`.
- I03: Not applicable.
  The plugin adds one line at session start.
- I04: F3, because the comment at `limits.ts:18` states a bound that the code does not have.
- I05: F3, because `sync.test.ts:95` uses `>=` and lets the defect through.
  U3 is the one catch that adds no trace.
- I06: Not applicable.
- I07: No finding.
  No hook runs `install` or `init`, and `layout.test.ts:92` checks this.
- I08: No finding.
  `codegraph` 1.6.0 help shows `sync -q`, `init -y`, `impact -d`, and `callers`.
- I09: F2 makes a second shell parser next to `src/kernel/shell.ts`.
- I10: No finding.
  `codegraph.ts:12` refuses a shell character in an argument on Windows, and each argument is fixed in code.
- I11: Not applicable.
- I12: F2, because `git stash list` waits for a sync of up to 15 s.
  F4 starts more CPU work than necessary.
- I13: No finding.
  The check gives the install command and does not run it, because the install is the decision of the user.
- I14: Not applicable.
  The review changed no value.
- I15: F5.
- I16: Not applicable as an eval.
  `windows.test.ts:50` names "fails or times out" but runs only a failed start, so the timeout path has no test.
- I17: F1, F3, and F4, and U2.
- I18: U1.
  The hooks use `bun --no-env-file`, which avoids the `.env` deny of the sandbox.
