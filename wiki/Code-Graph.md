# Code graph

The plugin `dotclaude-codegraph` gives Claude the code graph of a project.
It calls the CLI `codegraph` of [CodeGraph](https://github.com/colbymchenry/codegraph) (MIT, `@colbymchenry/codegraph` 1.6.2).
It adds no MCP server, and it works without the core plugin.

## Install

1. Install the CLI with `npm i -g @colbymchenry/codegraph`.
   The package is 284 MB on disk.
   The plugin never installs it, and never runs `codegraph install`, because that command edits your Claude Code config.
1. Build the index once in the project with `codegraph init -y`.
   The index is the folder `.codegraph/` (7 MB for 190 files).
   Its own `.gitignore` holds `*`, so git ignores it.
1. Install the plugin with `/plugin install dotclaude-codegraph@dotclaude`.

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
| `PreToolUse` on `Grep` and `Glob` | When the pattern is one name, adds the definition and the callers of that name from the graph. |
| `PostToolUse` after `Edit`, `Write`, and a git command that changes the tree | Runs `codegraph sync -q` as an async hook, so the session does not wait. |

- The `PreToolUse` text has at most `GRAPH_CONTEXT_MAX` (1,200) characters.
  A caller that does not fit is counted as "and N more".
- The hook keeps only a `function`, `method`, `class`, or `constant` hit whose name equals the pattern or starts with it.
  `codegraph query` is a fuzzy search and also returns file and import nodes.
- When the name is unknown, the CLI fails, or a call takes more than 2 s, the hook adds nothing.
  The hook never denies or asks.
- `callers` and `impact` print text, not JSON, for an unknown symbol, and exit 0.
  The hook parses with a guard and treats text as no result.
- Git commands that start a sync: `commit`, `merge`, `rebase`, `pull`, `checkout`, `switch`, `reset`, `cherry-pick`, `revert`, `stash`, `apply`, and `am`.

## The CLI against the LSP tool

Task 17.1 of the change `dotclaude-0-28-0` compared the CLI with the built-in LSP tool.
The reason is the rule that the plugin does not add runtime code for a feature that Claude Code has.
The user decided that the plugin ships whatever the comparison shows.

Setup:

- The model was `claude-sonnet-5-5`, in a headless sandbox run (`tools/sandbox.mjs`) with no plugin of dotclaude.
- The project was 9 Python files (`shop/` and `tests/`) of about 80 lines.
- The question was "If I change the signature of `parse_amount`, which functions are affected, directly or through other calls, and in which files?"
- The true answer is 8 functions: `Cart.add`, `load_prices`, `apply_discount`, `build_cart`, `summary`, `main`, `test_parse`, and `test_discount`.
- The LSP tool needs a language server.
  The run used `pyright-langserver` (installed on the machine) through a scratch plugin with a `.lsp.json` file, and `ENABLE_LSP_TOOL=1`.
  I did not test the tool without the variable.
  The tool is deferred, so Claude finds it with `ToolSearch` first.
  A machine with no server for the language has no LSP tool result.
- Input tokens are `input_tokens`, `cache_read_input_tokens`, and `cache_creation_input_tokens`, summed over the requests of the transcript.
  One run for each arm.

| Arm | Correct | Tool calls | Requests | Input tokens | Output tokens |
| --- | --- | --- | --- | --- | --- |
| No graph tool (`Grep`, `Glob`, `Read`) | 8 of 8 | 9 | 5 | 55,752 | 1,003 |
| CLI on `PATH`, index built, no instruction | 8 of 8 | 4, none of `codegraph` | 4 | 43,555 | 601 |
| LSP tool, no instruction | 8 of 8 | 11, none of `LSP` | 4 | 43,750 | 1,152 |
| CLI, told to use `codegraph impact` and `callers` | 6 of 8 | 1 `Bash` | 2 | 17,493 | 204 |
| LSP, told to use the LSP tool | 8 of 8 | 12 `LSP`, 1 `ToolSearch`, 2 `Read` | 8 | 77,004 | 2,351 |

What the result shows:

- With no instruction, Claude used neither tool.
  It read the files of the small project instead.
  This is the reason for the hooks: a tool that Claude does not call saves nothing.
  One run for each arm is not a rate.
- When told to use it, the CLI answered in one call and used 4.4 times fewer input tokens than the LSP tool.
  The LSP tool took one call for each hop of the call chain.
- `codegraph impact` has a default depth of 2.
  It missed `summary` and `main`, which are three calls away.
  The `SessionStart` line gives `-d 5` for this reason.
  The LSP arm was complete, because Claude followed the chain by hand.
- The LSP tool is exact for one symbol, and it works on a project with no index.
  It needs one server for each language, and it gives no impact answer in one call.

The plugin ships, because the CLI gives the impact answer in one call and the LSP tool does not.
The eval of task 17.7 measures the effect of the hooks on the same question.

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
