# Code graph

The plugin `dotclaude-codegraph` gives Claude the code graph of a project.
It runs the `codegraph` CLI of the CodeGraph project.
It adds no MCP server.
It works without the core plugin, and it imports nothing from another plugin.

The source is in `src/plugins/dotclaude-codegraph/`, and its one slice is `graph`.

## What it adds

- The command `dotclaude-codegraph-check`, which prints whether `codegraph` is on `PATH` and whether the project has an index.
- A `SessionStart` hook that syncs the index and adds one line about the graph commands.
- A `PostToolUse` hook that syncs the index after an `Edit`, a `Write`, a `MultiEdit`, or a `NotebookEdit`.
- A `tool.call` handler that syncs the index after a `Bash` command with a `git` command that changes the tree.

The plugin has no skill, no `userConfig`, and no Claude Code setting.

## Install

1. Install the CLI with `npm i -g @colbymchenry/codegraph`.
   The plugin never installs the CLI.
   When `codegraph` is missing, the check prints this command (`INSTALL_COMMAND` in `slices/graph/domain/graph.ts`).
2. Build the index once in the project with `codegraph init -y`.
   The index is the file `.codegraph/codegraph.db` (`INDEX_PATH` in `slices/graph/domain/graph.ts`).
   The plugin never runs `codegraph init`, because the command changes user files (see the header of `slices/graph/adapters/codegraph.ts`).
3. Install the plugin with `/plugin install dotclaude-codegraph@dotclaude`.

The hooks run only in a project that has the index file.
In another project, they run no command and add no text.

The CLI keeps its telemetry in the home folder, `~/.codegraph/` (see the comment in `slices/graph/adapters/codegraph.ts`).
The plugin does not run `codegraph telemetry`, so the setting stays as the user left it.

## How it works

Both classic hooks run `slices/graph/adapters/hook.ts` with Bun.
The first argument selects the mode, `session-start` or `sync`.
The project folder comes from `CLAUDE_PROJECT_DIR`, then from the `cwd` of the hook payload, then from the process folder (`rootOf` in `slices/graph/adapters/codegraph.ts`).

| Trigger | Source | Timeout | What it runs |
| --- | --- | --- | --- |
| `SessionStart` | Classic hook in `hooks/hooks.json`, mode `session-start` | 10 s | `codegraph sync -q`, then adds `SESSION_LINE` |
| `PostToolUse` after `Edit`, `Write`, `MultiEdit`, or `NotebookEdit` | Classic hook in `hooks/hooks.json`, mode `sync`, with `"async": true` | 60 s | `codegraph sync -q` |
| `Bash` call with a `git` command that changes the tree | Mod handler `onTreeChange` in `slices/graph/adapters/mod.ts` | 15 s | `codegraph sync -q` |

- The `SessionStart` hook adds `SESSION_LINE` when the project has an index and the CLI is present.
  It adds the line also when the sync fails for another reason, such as a timeout or a non-zero exit.
- The `PostToolUse` hook is async, so the session does not wait for the sync.
- The `git` handler runs the command first.
  It syncs only when the call is not denied.
  A missing `codegraph` or a timeout leaves the index as it is, and the next sync catches up.
- The git commands that start a sync are `commit`, `merge`, `rebase`, `pull`, `checkout`, `switch`, `reset`, `cherry-pick`, `revert`, `stash`, `apply`, and `am`.
  The pattern is `TREE_CHANGE` in `slices/graph/domain/graph.ts`.
  The mod runtime tests the pattern in process, so a `Bash` call of another kind starts no process.
- The hooks never deny or ask.

On Windows, npm installs `codegraph` as `codegraph.cmd`, which runs only through a shell.
The runner then starts the command through `slices/graph/adapters/run-tree.ts`, which ends the process tree at the time limit.
It also accepts only arguments that match `SHELL_SAFE_ARG` in `slices/graph/adapters/codegraph.ts`.

The check text is built by `checkLines` in `slices/graph/domain/graph.ts`.
The check exits with 0 also when the CLI is missing, because the text then tells the user what to do.

## Bounds

| Bound | Value | File | Use |
| --- | --- | --- | --- |
| `QUERY_TIMEOUT_MS` | 2000 ms | `slices/graph/limits.ts` | `codegraph --version` in the check |
| `START_SYNC_TIMEOUT_MS` | 8000 ms | `slices/graph/limits.ts` | The sync at session start |
| `BACKGROUND_SYNC_TIMEOUT_MS` | 60000 ms | `slices/graph/limits.ts` | The sync after an edit, and the hook `timeout` of 60 s |
| `GIT_SYNC_TIMEOUT_MS` | 15000 ms | `slices/graph/limits.ts` | The sync after a `git` command, which the `git` result waits for |
| `TREE_GRACE_MS` | 3000 ms | `slices/graph/adapters/codegraph.ts` | Time for `run-tree.ts` to start and end the tree after the limit (Windows only) |

The `SessionStart` hook has a `timeout` of 10 s in `slices/graph/slice.ts`.
That value is larger than `START_SYNC_TIMEOUT_MS`.
The `PostToolUse` hook `timeout` is `BACKGROUND_SYNC_TIMEOUT_MS` divided by 1000, which is 60 s.

The line that `SessionStart` adds is `SESSION_LINE` in `slices/graph/domain/graph.ts`.
It names `codegraph impact <symbol> -d 5`.
The comment there says that `impact` has a default depth of 2, and that a run on a comparison fixture missed 2 of 8 affected functions at that depth.
That fixture run has no evidence file in this checkout, so the number is the comment's claim.

## Why

- The `SessionStart` hook and the edit hook are classic hooks.
  They run `codegraph` on Bun with the Windows handling of `slices/graph/adapters/codegraph.ts`.
- The `git` sync is a mod handler.
  A classic hook for each `git` command needs 12 hooks with an `if`.
  One hook without `if` starts a process on each `Bash` call.
  The source is the comment in `slices/graph/slice.ts`.
- The plugin uses the CLI and no MCP server, and it runs only where `.codegraph/` exists.
  See D26 in [Decisions-Tools](Decisions-Tools).
- Each add-on stays a separate plugin.
  See D24 in [Decisions-Layout](Decisions-Layout).
- The plugin never runs `codegraph install` or `codegraph init`, because they change user files.

## Troubleshooting

The symptoms of this plugin and their fixes are on [Troubleshooting](Troubleshooting).
