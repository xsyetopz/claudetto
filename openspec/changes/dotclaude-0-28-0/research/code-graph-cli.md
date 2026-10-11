# CodeGraph CLI runs for dotclaude 0.28.0 (task 17.1)

Part of [code-graph.md](code-graph.md).
The sections below hold the runs of the real CLI.

## 17.1 results

Run date: 2026-10-08.
Every fact here is **confirmed** by a command run in the sandbox, unless it has another label.
The LSP comparison of task 17.1 is in the last section of this file (run 2026-10-09).

### Install

- Package `@colbymchenry/codegraph` 1.6.2, MIT.
  Command: `bun install --prefix "$TMPDIR/codegraph" --cache "$TMPDIR/npmcache" @colbymchenry/codegraph`.
  The default npm cache failed with EPERM on root-owned files, so a cache in `$TMPDIR` was needed.
- Host used: `registry.npmjs.org` only.
- It installs 2 packages (the wrapper and `@colbymchenry/codegraph-darwin-arm64`, 284 MB on disk).
  There was no native build and no model download.
  Binary: `node_modules/.bin/codegraph`.
- Test copy: `rsync` of the repository without `node_modules`, `external`, `.git`, and `.env*` (468 files, 175 `.mjs`) to `$TMPDIR/repocopy`.
  `tar` stopped at `.env` and `rsync` did not.

### Flags

Global: `-V/--version`, `--color`, `--no-color`.
Other commands exist: `uninit`, `context <task...>`, `daemon`, `unlock`, `telemetry`, `upgrade`, `install`, `uninstall`.

| Command | Options |
| --- | --- |
| `init [path]` | `-y/--yes`, `-f/--force`, `-v/--verbose`, `-i/--index` (deprecated, indexing is the default) |
| `index [path]` | `-f`, `-q/--quiet`, `-v` (full rebuild) |
| `sync [path]` | `-q/--quiet` only |
| `status [path]` | `-j/--json` |
| `query <search>` | `-p/--path`, `-l/--limit` (10), `-k/--kind`, `-j/--json` |
| `callers <symbol>` | `-p`, `-f/--file`, `-l/--limit` (20), `-j` |
| `callees <symbol>` | same as `callers` |
| `impact <symbol>` | `-p`, `-f/--file`, `-d/--depth` (2), `-j` |
| `affected [files...]` | `-p`, `--stdin`, `-d/--depth` (5), `-f/--filter <glob>`, `-j`, `-q` |
| `files` | `-p`, `--filter`, `--pattern`, `--format tree/flat/grouped`, `--max-depth`, `--no-metadata`, `-j` |
| `explore <query...>` | `-p`, `--max-files`, no `--json` |
| `node [name]` | `-p`, `-f`, `--offset`, `--limit`, `--symbols-only`, no `--json` |

- `-p/--path` makes `query` and the others work from any cwd.
  `init`, `index`, `sync`, and `status` take the path as an argument.
- `codegraph query -j -- -foo` works, so the pattern can follow `--`.
- `query` is a fuzzy search.
  A pattern with no match gives `[]`, but a junk pattern such as `-foo` returned unrelated hits with scores.
  A hook must filter by `score` or by exact `name`.

### `--json` shapes

Types only, `(n)` is the array length in the sample.

- `query`: an array of `{node, score}`.
  `node` is `{id, kind, name, qualifiedName, filePath, language, startLine, endLine, startColumn, endColumn, docstring?, signature?, visibility, isExported, isAsync, isStatic, isAbstract, updatedAt}`.
  It can include a whole file docstring, so one hit can be large.
  The `kind` values seen: `file`, `function`, `import`, `constant`, `variable`, `method`, `class`, `property`.
  No match: `[]` and exit 0.
- `callers`: `{symbol, targets[{name, kind, filePath, startLine, id, qualifiedName, language}], ambiguous, aggregation, filteredOut, definitions[{definition, roots[], callers[{id, name, kind, filePath, startLine, relationships[]}], edges[{source, target, kind, metadata{confidence, resolvedBy, refName}, line, column, provenance}], total, limit, truncated}], callers[{name, kind, filePath, startLine, relationships[]}], total, limit, truncated}`.
  The top-level `callers` is the union, and it is the field to read.
  `callees` has the same shape (**inferred**, not run).
- `impact`: `{symbol, depth, targets[], ambiguous, aggregation, filteredOut, definitions[{definition, roots[], nodeCount, edgeCount, affected[{id, name, kind, filePath, startLine}], edges[]}], nodeCount, edgeCount, affected[{name, kind, filePath, startLine}]}`.
  The top-level `affected` includes the symbol itself and file nodes.
- `affected`: `{changedFiles[string], affectedTests[string], totalDependentsTraversed}`.
  With `-q` it prints one test path per line.
- `status -j`: `{initialized, version, projectPath, indexPath, lastIndexed, fileCount, nodeCount, edgeCount, dbSizeBytes, walSizeBytes, backend, journalMode, nodesByKind{}, languages[], pendingChanges{added, modified, removed}, worktreeMismatch, index{state, reindexRecommended, ...}}`.
  `pendingChanges` is a free stale check.
- Symbol not found: `callers` and `impact` print `ℹ Symbol "x" not found` as text, not JSON, with exit 0, even with `-j`.
  A hook must parse with a guard, and treat a stdout that is not JSON as no result.
- No `.codegraph/`: every command prints `✗ CodeGraph not initialized in <path>` and exits 1.
  It does not create the folder.

### Run time

Machine: macOS arm64, one run each (`/usr/bin/time -p`), 190 indexed files, 2,085 nodes, 5,553 edges.

| Command | Wall time |
| --- | --- |
| `init -y` (cold, full index) | 2.2 s (index 0.87 s) |
| `index -q` (full rebuild) | 1.6 s |
| `query`, `callers`, `impact` (first call and repeat) | 0.30 s each |
| `sync -q`, no change | 0.43 s |
| `sync` after one appended function | 0.55 s, and the next `query` found the new symbol |

- The first `query` is not slower than later ones, so the CLI has no warm-up cost.
  Each call costs about 0.3 s of start time.
- `query` and `sync` ran with and without `CODEGRAPH_NO_DAEMON=1` at the same time.
  The CLI starts no daemon (no new process or file).
- A `PreToolUse` timeout of 2 s to 3 s is enough for `query`.
  `sync` at 0.4 s to 0.6 s is fine for `SessionStart`.

### Files written

- In the project: `.codegraph/codegraph.db` (7.1 MB for 190 files, SQLite in WAL mode) and `.codegraph/.gitignore`.
  The `.gitignore` holds `*` and `!.gitignore`, so git ignores the folder with no edit of the project `.gitignore`.
  `-wal`, `-shm`, and `daemon.log` appear only when a daemon or a writer runs.
  Nothing else in the project changed.
- Outside the project, on every command: `~/.codegraph/telemetry-queue.jsonl` (one line per command, for example `{"v":2,"d":"2026-10-07","k":"cli_command","n":"query","c":1,"e":0}`), plus `telemetry.json`, `update-check.json`, `beta-signup.json`, and `daemons/`.
  `codegraph telemetry status` says "enabled (your saved choice)", and `codegraph telemetry off` turns it off.
  These files existed before this run, so an earlier install had made them.

### Differences from D26 and the spec

1. `init -y` builds the first index, and `index` is a full rebuild.
   The add-on opts in by `.codegraph/`, so the install text for the user is `codegraph init -y`.
1. `sync` has no `--json`, only `-q`.
   `status -j` gives `pendingChanges` for a stale check.
1. `callers`, `callees`, and `impact` print text, not JSON, for an unknown symbol, with exit 0.
   The spec says "no result adds nothing", so the hook needs a JSON guard.
1. `query --json` is fuzzy and returns file and import nodes.
   For the `Grep` hook, keep only `function`, `method`, `class`, and `constant` hits with an exact or prefix name, and cap by `GRAPH_CONTEXT_MAX`.
   Read the top-level `callers` array, which has `name`, `filePath`, `startLine`.
1. D26 says the index refresh data goes to `${CLAUDE_PLUGIN_DATA}`.
   The CLI keeps the index in the project at `.codegraph/`, so the add-on needs no data folder for it.
1. A command with no `.codegraph/` exits 1 and does not create it, so the gate on `.codegraph/` is safe.
1. Telemetry is on and writes to the home folder.
   The wiki should say so, and name `codegraph telemetry off`.
1. The install is 284 MB, not light.
1. The copy held `plugins/dotclaude-modder` files from the working tree, so the graph counted 8 Python files that the commit removes.

## 17.1 re-run on the installed CLI 1.6.0

Run date: 2026-10-08.
Every fact here is **confirmed** by a command run in the sandbox.
The CLI is `/opt/homebrew/bin/codegraph`, version 1.6.0, not the 1.6.2 of the section above.
Nothing was installed, and no network was used.
`init` and `sync` ran only on a copy of the repository in `$TMPDIR/cgcopy` (`rsync` without `node_modules`, `external`, `.git`, `.env*`).

### Difference from 1.6.2

- `callers --help` in 1.6.0 lists `-p`, `-l`, and `-j` only.
  `codegraph callers -j -f F -- S` fails with `error: unknown option '-f'` and exit 1.
  The `-f/--file` option in the table above is therefore not in 1.6.0.
- The hook passed `-f` to `callers`, so on 1.6.0 it never got callers.
  The fix is in `features/graph/cli.mjs`: the call is `callers -j -l 10 -- <symbol>` with no `-f`.
  A symbol with several definitions then gets the union of their callers.
  The test in `tests/codegraph/hooks.test.mjs` pins the exact arguments.
- `--help` of `sync` (`-q` only), `query` (`-p -l -k -j`), `impact` (`-p -d -j`), `init` (`-i -f -v -y`), and `status` (`-j`) match the table above.

### Shapes and time on 1.6.0

- `query -j`: an array of `{node, score}` with the same `node` fields as above.
- `callers -j`: `{symbol, callers[{name, kind, filePath, startLine}]}`.
  There is no `total`, `truncated`, `targets`, or `definitions` in 1.6.0.
  The hook reads only `callers`, so it works on both versions.
- `impact -j`: `{symbol, depth, nodeCount, edgeCount, affected[]}`.
- An unknown symbol: text `ℹ Symbol "zzznone" not found`, exit 0, with `-j`.
- No index (cwd with no `.codegraph/`): `✗ CodeGraph not initialized in <path>`, exit 1.
- `init -y` on the copy: 1.5 s wall, 206 files, 1,916 nodes, 5,152 edges.
- `query`, `callers`, `impact`: 0.26 s to 0.28 s each.
- `sync -q`: 0.32 s with no change, 0.47 s after one appended function, and `query` then found the function.

### Files written by `init`

- `.codegraph/codegraph.db` (6.8 MB) and `.codegraph/.gitignore` (`*` and `!.gitignore` under comment lines).
- Nothing else in the project.
- In the home folder: `~/.codegraph/` with `telemetry-queue.jsonl`, `telemetry.json`, `update-check.json`, `beta-signup.json`, and `daemons/`.

### Comparison with the built-in LSP tool (run 2026-10-09)

Every fact here is **confirmed** by a headless sandbox run (`tools/sandbox.mjs`), on `claude-opus-5-5` (the model of the sandbox profile) and Claude Code 2.1.295.
The question was "What breaks if I change the signature of `symbolOf`?"

Setup:

- The project was a copy of this repository (`rsync` without `node_modules`, `external`, `.git`, `.env*`, `evals/results`) with `git init` and a `jsconfig.json` that includes `plugins/**/*.mjs`.
- The LSP tool needs `ENABLE_LSP_TOOL=1` and a language server that a plugin declares in `.lsp.json`.
  A plugin field `lspServers` or a `.lsp.json` file at the plugin root does this, with `command`, `args`, and `extensionToLanguage` (a required map of extension to language ID).
  No language server was on `PATH`, so I installed `typescript-language-server` and `typescript@5` into `/tmp/claude-501/dcl/tsls` (not global), and made a scratch plugin outside the repository that holds `.lsp.json`.
  `--plugin-dir` loaded it.
- `typescript@latest` is 7.0.2 and has no `tsserver.js`, so the server failed with "Could not find a valid TypeScript installation".
  The server needs `typescript@5`.
- The code-graph arm loaded `dotclaude` and `dotclaude-codegraph`, with `codegraph init -y` run first and `ENABLE_LSP_TOOL` unset.
  The LSP arms loaded `dotclaude` alone, with `ENABLE_LSP_TOOL=1` and the scratch plugin.
- The tokens are the sums of `usage` over the assistant requests of the session `.jsonl`.
  "Input" is `input_tokens` plus `cache_read_input_tokens` plus `cache_creation_input_tokens`.
- Each arm ran 2 times.

True answer, from reading the code (`rg -n symbolOf`):

- `symbolOf` is defined in `plugins/dotclaude-codegraph/features/graph/rules.mjs:31`.
- It has one call, in `search` at `features/graph/cli.mjs:77`, and one import at `cli.mjs:29`.
- `search` has no call.
  It is a value in the `HOOKS` map (`cli.mjs:118`) that `hooks/hooks.json:21` reaches through `cli.mjs search`.
- No test or other plugin names `symbolOf`.
  Only prose in `research/bundle-2.1.296.md:101` and `research/code-graph-cli.md` names it.
- The impact set is therefore `search` (depth 1) and nothing at depth 2.
  This question is small, so it does not test the depth limit of `impact`.

| Arm | Run | Correct | Tools used | Requests | Input tokens | Output tokens |
| --- | --- | --- | --- | --- | --- | --- |
| Code graph, question only | cg1 | yes, `search` | `codegraph impact -d 5`, `grep`, 2 `Read` | 5 | 86,708 | 1,909 |
| Code graph, question only | cg2 | yes, `search` | `codegraph impact -d 5`, `grep`, 2 `Read` | 4 | 66,150 | 1,396 |
| LSP tool, question only | lsp1 | yes, `search` | `grep` and `Read`, no `LSP` | 5 | 94,254 | 2,074 |
| LSP tool, question only | lsp2 | yes, `search` | `grep` and `Read`, no `LSP` | 6 | 109,218 | 1,369 |
| LSP tool, told "use the LSP tool, not grep" | lspt1 | yes, `search` | `ToolSearch`, 5 `LSP`, 2 `Read` | 9 | 161,539 | 2,208 |
| LSP tool, told "use the LSP tool, not grep" | lspt2 | yes, `search` | `ToolSearch`, 7 `LSP`, 3 `Read` | 9 | 167,874 | 2,607 |

Findings:

- All 6 answers named `search` as the only caller, and none named a wrong function.
  Each also named the `PreToolUse` hook, and the 4 unasked or code-graph answers named the note in `bundle-2.1.296.md:101`.
  The two answers of the LSP tool found the `HOOKS` map by `findReferences` on `search`, and the other four found `hooks.json` by `grep`.
- The code-graph arm used the `SessionStart` line without being told.
  Both runs ran `codegraph impact symbolOf -d 5` as the first call.
  It listed `search` and the `cli.mjs` module.
  The answer still used `grep` and 2 `Read` calls to check the tests and the hook wiring.
- The LSP arm did not use the `LSP` tool when only asked the question.
  It never searched for the deferred tool with `ToolSearch`, and used `grep`.
  This repeats the Python result of `wiki/plugins/Code-Graph.md`.
- Told to use the LSP tool, the arm needed `ToolSearch`, then `workspaceSymbol`, `findReferences`, and `incomingCalls`, one hop at a time.
  It used 2.1 to 2.5 times the input tokens of the code-graph arm, and 9 requests.
  The sessions have a fixed context of about 40,000 tokens or more, so the figures compare the runs and not the cost of the question alone.
- The told LSP answers said "Not verified" for `tests/`, because the language server did not index it (my `jsconfig.json` includes only `plugins/`).
  This is a setup limit and not a defect of the tool, but it shows that the answer depends on the project config of the server.
- Failure modes found on the way: a server that does not start (TypeScript 7, no `tsserver.js`) gave a `ToolSearch` and one failed `LSP` call, and then Claude asked the user to install a package.
  The code graph needs the CLI and an index, and a missing index gives no hook output.

Limits of the result:

- 2 runs for each arm, on a question with one caller.
  It is not a rate, and it does not test `impact` on a chain (the earlier fixture missed 2 of 8 at depth 2, and the line gives `-d 5` for this reason).
- The code-graph arm still read files and ran `grep`, so its token gain over the no-instruction LSP arm is 8% to 40% (66,150 to 86,708 against 94,254 to 109,218) and could be run noise.
- The model is `claude-opus-5-5`, and the earlier Python run used `claude-sonnet-5-5`.

Recommendation: ship the add-on as it is.

- The hook line makes Claude use the graph on the first call with no instruction.
  The LSP tool is deferred and a language server is needed, and Claude did not use it unasked in 4 of 4 neutral runs (2 here, 2 in the Python run).
- The answers match the LSP answers in quality, and the code-graph arm used fewer tokens in both pairs of runs (87K and 66K against 94K and 109K for the LSP tool unasked, and 162K and 168K for it asked).
- The LSP tool is exact for one symbol and needs no index, but it needs a matching server per language and a working project config, and it answers an impact question one hop for each call.
  The add-on does not replace it.
  Both can be on at once.
