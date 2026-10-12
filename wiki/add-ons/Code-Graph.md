# Code graph

The plugin `dotclaude-codegraph` gives Claude the code graph of a project.
It calls the CLI `codegraph` of [CodeGraph](https://github.com/colbymchenry/codegraph) (MIT, `@colbymchenry/codegraph` 1.6.2).
It adds no MCP server, and it works without the core plugin.

## At a glance

| Item | Value |
| --- | --- |
| Install | `/plugin install dotclaude-codegraph@dotclaude`, with the CLI and an index ([Install](#install)) |
| Bin | `bin/dotclaude-codegraph-check` prints whether `codegraph` is on `PATH` and whether the project has an index |
| Skills | None |
| Hooks | Two classic command hooks, on `SessionStart` and `PostToolUse`, and one `tool.call` handler for a `git` command that changes the tree, all in `slices/graph/` ([Hooks](Hooks)) |
| Options | None. The plugin has no `userConfig` and sets no Claude Code setting |
| Limits | See [Limits](#limits) |
| Problems | See [Troubleshooting](#troubleshooting) |

## Install

1. Install the CLI with `npm i -g @colbymchenry/codegraph`.
   The package is 284 MB on disk.
   The plugin never installs it, and never runs `codegraph install`, because that command edits your Claude Code config.
2. Build the index once in the project with `codegraph init -y`.
   The index is the folder `.codegraph/` (7 MB for 190 files).
   Its own `.gitignore` holds `*`, so git ignores it.
3. Install the plugin with `/plugin install dotclaude-codegraph@dotclaude`.

The hooks run only in a project that has `.codegraph/codegraph.db`.
In another project they run no command and add no text.
The script `bin/dotclaude-codegraph-check` prints the install command when `codegraph` is not on `PATH`.

## Telemetry

The CLI has telemetry on by default.
It writes one line for each command to `~/.codegraph/telemetry-queue.jsonl`.
The plugin does not change your config.
To turn it off, run `codegraph telemetry off`.

## What the hooks do

| Event | What it does |
| --- | --- |
| `SessionStart` | Runs `codegraph sync -q`, and adds one line that names `codegraph impact`, `callers`, and `callees`. |
| `PostToolUse` after `Edit`, `Write`, `MultiEdit`, and `NotebookEdit` | Runs `codegraph sync -q` as an async hook, so the session does not wait. |
| `tool.call` on a `Bash` command | After a `git` command that changes the tree, runs `codegraph sync -q`. |

- The hooks never deny or ask.
- Git commands that start a sync: `commit`, `merge`, `rebase`, `pull`, `checkout`, `switch`, `reset`, `cherry-pick`, `revert`, `stash`, `apply`, and `am`.

## Limits

All bounds are in `plugins/dotclaude-codegraph/slices/graph/limits.ts`.

| Bound | Value | Use |
| --- | --- | --- |
| `QUERY_TIMEOUT_MS` | 2,000 ms | The time for `codegraph --version` in the check. |
| `START_SYNC_TIMEOUT_MS` | 8,000 ms | The sync at session start. The hook `timeout` is 10 s. |
| `BACKGROUND_SYNC_TIMEOUT_MS` | 60,000 ms | The background sync after an edit or a git change. |

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| The hooks add nothing | The project has no `.codegraph/codegraph.db`, or `codegraph` is not on `PATH`. Run `bin/dotclaude-codegraph-check`, then `codegraph init -y`. |
| The index is out of date | The sync runs after an edit and after a git command that changes the tree. Run `codegraph sync -q` by hand after a change outside Claude Code. |

See also [Troubleshooting](Troubleshooting).

## CLI facts

Measured on a macOS arm64 machine for 190 files, 2,085 nodes, and 5,553 edges.

| Command | Wall time |
| --- | --- |
| `init -y` (first index) | 2.2 s |
| `query`, `callers`, `impact` | 0.30 s each |
| `sync -q` with no change | 0.43 s |
| `sync -q` after one edit | 0.55 s |

- `sync` has the option `-q` only and no `--json`.
- A command in a folder with no `.codegraph/` prints an error and exits 1.
- The CLI starts no daemon.
