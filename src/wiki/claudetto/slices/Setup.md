# Setup

The `setup` slice puts the right settings into your Claude Code settings file.
A plugin cannot set permissions or env vars by itself, so this slice does it for you.
Run `/claudetto:setup` once, and again after each update.
The cleanup of the 0.1.0 settings is on [Setup Cleanup](Setup-Cleanup).

## Why You Need It

A plugin settings file can set only `agent` and `subagentStatusLine`.
So the slice ships a settings snippet and a tool that merges it into a file that you pick.

## How to Use It

Only you can start the skill `setup`, because it has `disable-model-invocation: true`.
Its `argument-hint` is `[user|project|local]`.
It may run only `claudetto-setup *` and `codegraph install --target claude --location global`.

1. It takes the scope from the argument, or it asks you.
2. It runs `claudetto-setup --scope <scope> --advisor <advisor>` and shows the list of changes.
3. It asks you once whether to apply them.
4. After a yes, it runs the same command with `--apply`.
5. It gives you the `alias` line for `Glob` and `Grep`.
6. It runs `claudetto-setup --addons` and asks you about each step that the command prints.
7. It lists the files that changed and tells you to restart Claude Code.

The skill never edits a settings file itself.
The command is the checked path.

## The Command

```text
claudetto-setup [--scope user|project|local] [--advisor builtin|claudetto] [--apply]
claudetto-setup --addons
```

| Option | Meaning |
| --- | --- |
| `--scope` | The settings file to change. The default is `user`. |
| `--advisor` | The `advisor` option of the `advise` slice. The default is `builtin`. |
| `--apply` | Write the changes. Without it, the command only prints them. |
| `--addons` | Print the optional step of each enabled add-on. It writes nothing. |
| (an unknown option) | Print the usage to `stderr` and exit with code 2. |

| Scope | Settings file | Markdown file for the cleanup |
| --- | --- | --- |
| `user` | `settings.json` in `CLAUDE_CONFIG_DIR`, or `~/.claude` | `CLAUDE.md` in the same folder |
| `project` | `.claude/settings.json` in `CLAUDE_PROJECT_DIR`, or the current folder | `CLAUDE.md` in the project |
| `local` | `.claude/settings.local.json` in the same folder | `CLAUDE.local.md` in the project |

| Exit code | Meaning |
| --- | --- |
| 0 | Good run |
| 1 | A settings file is not a JSON object |
| 2 | Bad option |

The command changes nothing when it fails.
A second run with the same options changes nothing.

## The Merge

The command first runs the [cleanup](Setup-Cleanup).
It then merges the settings snippet into the result.
The snippet is the sum of the `settings` of all slices.
See [Settings Snippet](Settings-Snippet) for each key.

| Kind of value | What the merge does |
| --- | --- |
| Object | Merges key by key. |
| Array | Adds the entries that are missing. Your entries stay. `availableModels` is the one exception, because the snippet replaces it. |
| Scalar | Takes the value of the snippet. |
| Key that the snippet does not name | Stays as it is. |

The preview prints one line for each key that differs, as `path: old -> new`.
It prints `Settings match the snippet.` when nothing differs.
`<plugin folder>` in a status line command becomes the folder of the installed plugin.
That folder holds the version, so run the skill again after an update.

The `setup` slice adds these keys:

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

With `--advisor claudetto`, the snippet also sets `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1`.
Claude then sees one advisor.
The skill passes its `advisor` option to the command, because a CLI that you run gets no `CLAUDE_PLUGIN_OPTION_*` env var.

## Status Lines

The `project` scope gets no status line keys, because the command holds an absolute path of one computer.
Use the `user` or `local` scope for the status line.
If your `statusLine` or `subagentStatusLine` runs another tool, the merge keeps it.
The preview then prints `Kept your <key>, because it runs another tool.`

## The Tools `Glob` and `Grep`

The native build of Claude Code hides `Glob` and `Grep` unless the CLI tool list names them.
A plugin cannot set a CLI flag.
So the skill gives you this line for your shell startup file, such as `~/.zshrc`:

```sh
alias claude='claude --allowedTools Glob,Grep'
```

The skill does not edit the file, because it is outside Claude Code.

## The `.gitignore` Lines

With `--apply`, in a project that has a `.git/` folder, the command adds these lines to `.gitignore`:

```text
/.claudetto/
/.jscpd.json
/.claude/settings.local.json
```

It adds a line only when the file lacks it.
It creates `.gitignore` when the file is missing.
It changes nothing in a project with no `.git/`.
A file that a team shares, such as an OpenSpec change, is not in the list.

## See Also

- [Setup Cleanup](Setup-Cleanup)
- [Settings Snippet](Settings-Snippet)
- [Settings Apply](Settings-Apply)
- [Install](Install)
