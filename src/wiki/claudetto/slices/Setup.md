# Setup

This page tells what the `setup` slice of the core plugin `claudetto` does.
It covers the `/claudetto:setup` skill, the CLI `claudetto-setup`, the merge of the settings snippet, and the `.gitignore` lines.
A user who installs or updates `claudetto` and a contributor who edits the slice read it.
The cleanup of the 0.1.0 settings is on [Setup Cleanup](Setup-Cleanup).

## Why the Slice Exists

A plugin settings file can set only `agent` and `subagentStatusLine`.
A plugin cannot set permissions, env vars, or model settings.
So the slice ships a settings snippet and a tool that merges the snippet into a settings file that the user picks.
Run `/claudetto:setup` after each install and each update of the plugin.

## The Skill

The skill `setup` has `disable-model-invocation: true`, so only the user starts it.
Its `argument-hint` is `[user|project|local]`.
It may run only `claudetto-setup *` and `codegraph install --target claude --location global`.
The skill does these steps:

1. It picks the scope from the argument, or it asks the user.
2. It runs `claudetto-setup --scope <scope> --advisor <advisor>` and shows the list of changes.
3. It asks the user once whether to apply the changes.
4. After a yes, it runs the same command with `--apply`.
5. It gives the user the `alias` line for `Glob` and `Grep`.
6. It runs `claudetto-setup --addons` and asks the user about each step that the command prints.
7. It lists the files that changed and tells the user to restart Claude Code.

The skill never edits a settings file itself, because the command is the checked path.

## The CLI

`claudetto-setup [--scope user|project|local] [--advisor builtin|claudetto] [--apply]`

`claudetto-setup --addons`

| Option | Meaning |
| --- | --- |
| `--scope` | The settings file to change. The default is `user` |
| `--advisor` | The `advisor` option of the `advise` slice. The default is `builtin` |
| `--apply` | Write the changes. Without it, the command only prints them |
| `--addons` | Print the optional step of each enabled add-on, and write nothing |
| (an unknown option) | Prints the usage to `stderr` and exits with code 2 |

| Scope | Settings file | Markdown file for the cleanup |
| --- | --- | --- |
| `user` | `settings.json` in `CLAUDE_CONFIG_DIR`, or `~/.claude` | `CLAUDE.md` in the same folder |
| `project` | `.claude/settings.json` in `CLAUDE_PROJECT_DIR`, or the current folder | `CLAUDE.md` in the project |
| `local` | `.claude/settings.local.json` in the same folder | `CLAUDE.local.md` in the project |

The exit status is 0 for a good run, 1 when a settings file is not a JSON object, and 2 for a bad option.
The command changes nothing when it fails.
A second run with the same options changes nothing.

## The Merge

The command first runs the [cleanup](Setup-Cleanup) on the settings.
It then merges the settings snippet into the result.
The snippet is the sum of the `settings` of the slices.
See [Settings Snippet](Settings-Snippet) for each key.

The merge follows these rules:

- An object merges key by key.
- An array gains the entries that it lacks, and the entries of the user stay.
  The one exception is `availableModels`, which the snippet replaces.
- A scalar takes the value of the snippet.
- A key that the snippet does not name stays as it is.

The preview prints one line for each key path that differs, as `path: old -> new`.
The text `Settings match the snippet.` shows when nothing differs.
`<plugin folder>` in a status line command becomes the folder of the installed plugin.
That folder holds the version, so run the skill again after an update.

The `setup` slice adds these keys to the snippet:

| Key | Value |
| --- | --- |
| `env.CLAUDE_CODE_DISABLE_CRON` | `1` |
| `env.CLAUDE_CODE_DISABLE_FAST_MODE` | `1` |
| `env.CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT` | `1` |
| `includeGitInstructions` | `false` |
| `autoMemoryEnabled` | `false` |
| `disableClaudeAiConnectors` | `true` |
| `syncClaudeAiSkills` | `false` |
| `syncClaudeAiPlugins` | `false` |
| `worktree.baseRef` | `head` |
| `sandbox.network.allowLocalBinding` | `true` |
| `sandbox.filesystem.allowWrite` | The package caches `~/.bun/install/cache`, `~/.npm`, `~/.cache/pip`, `~/.cargo/registry`, `~/go/pkg/mod` |

With `--advisor claudetto`, the snippet also sets `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1`, so Claude sees one advisor.
The skill passes its `advisor` option to the command, because a CLI that the user runs gets no `CLAUDE_PLUGIN_OPTION_*` env var.

## Status Lines

The `project` scope gets no status line keys, because the command holds an absolute path of one computer.
Use the `user` or `local` scope for the status line.
When the settings already have a `statusLine` or a `subagentStatusLine` whose command is not `claudetto-statusline`, the merge keeps it.
The preview then prints `Kept your <key>, because it runs another tool.`

## The `Glob` and `Grep` Tools

The native build of Claude Code hides `Glob` and `Grep` unless the CLI tool list names them.
A plugin cannot set a CLI flag.
So the skill gives the user this line for the shell startup file, such as `~/.zshrc` or `~/.bashrc`:

```sh
alias claude='claude --allowedTools Glob,Grep'
```

The skill does not edit the startup file, because it is outside Claude Code.

## The `.gitignore` Lines

With `--apply`, in a project that has a `.git/` folder, the command appends these lines to `.gitignore` under one comment header:

```text
/.claudetto/
/.jscpd.json
/.claude/settings.local.json
```

The command adds a line only when the file lacks it, so a second run adds nothing.
It creates `.gitignore` when the file is missing.
It changes nothing in a project with no `.git/`.
A file that a team shares, such as `jscpd.local.json` or an OpenSpec change, is not in the list.

## Add-On Steps

`claudetto-setup --addons` reads `enabledPlugins` of the three settings files.
A later file wins, as in Claude Code.
It prints one step for each add-on that is enabled and has a step, and nothing for the others.
Today only `claudetto-codegraph` has a step:
the command `codegraph install --target claude --location global`, which writes the MCP server, its permissions, and a short block in `~/.claude/CLAUDE.md`.
The skill asks the user before it runs a step, because the step changes files outside the project.

## Related Pages

- [Setup Cleanup](Setup-Cleanup)
- [Settings Snippet](Settings-Snippet)
- [Settings Apply](Settings-Apply)
- [Install](Install)
