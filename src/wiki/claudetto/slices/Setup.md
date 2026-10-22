# Setup

The `setup` slice puts the right settings into your Claude Code settings file.
A plugin cannot set permissions or env vars by itself, so this slice does it for you.
Run `/claudetto:setup` once, and again after each update.
The cleanup of the settings of 0.1.0 and 0.2.0 is on [Setup Cleanup](Setup-Cleanup).

## Why You Need It

A plugin settings file can set only `agent` and `subagentStatusLine`.
The plugin of claudetto sets `agent` to `claudetto:main`.
So the slice ships a settings snippet and a tool that merges it into a file that you pick.

## How to Use It

Only you can start the skill `setup`, because it has `disable-model-invocation: true`.
Its `argument-hint` is `[user|project|local]`.
It may run only `claudetto-setup *`.

1. It takes the scope from the argument, or it asks you.
2. It runs `claudetto-setup --scope <scope>` and prints the list of changes as text.
3. It asks you once whether to apply them.
4. After a yes, it runs the same command with `--apply`.
5. It gives you the `alias` line for `Glob` and `Grep`.
6. It lists the files that changed and tells you to restart Claude Code.

The skill never edits a settings file itself.
The command is the checked path.

## The Command

```text
claudetto-setup [--scope user|project|local] [--apply]
```

| Option | Meaning |
| --- | --- |
| `--scope` | The settings file to change. The default is `user`. |
| `--apply` | Write the changes. Without it, the command only prints them. |
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
| 2 | Bad option or unknown scope |

The command changes nothing when it fails.
A second run with the same options changes nothing.

## The Order of Work

The command works in this order:

1. It removes what 0.1.0 wrote ([Setup Cleanup](Setup-Cleanup)).
2. It removes what 0.2.0 wrote and 0.3.0 does not set ([Setup Cleanup](Setup-Cleanup#the-020-keys)).
3. It removes the `claudetto` block of 0.1.0 from the `CLAUDE.md` file of the scope.
4. It merges the settings snippet.

## The Merge

The snippet is in `plugins/claudetto/slices/setup/prompts.ts`.
See [Settings Snippet](Settings-Snippet) for the value of each key and [Snippet Keys](Settings-Snippet-Keys) for the reason.

| Kind of value | What the merge does |
| --- | --- |
| Object | Merges key by key. |
| Array | Adds the entries that are missing. Your entries stay. |
| Scalar | Takes the value of the snippet. |
| Key that the snippet does not name | Stays as it is. |

The preview prints one line for each key that differs, as `path: old -> new`.
It prints `Settings match the snippet.` when nothing differs.
`<plugin folder>` in a status line command becomes the folder of the installed plugin.
That folder holds the version, so run the skill again after an update.

## Subagent Cap

The snippet does not set `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`, because the right value depends on your plan.
The command reads `oauthAccount.organizationRateLimitTier` and `organizationType` from `.claude.json` (in `CLAUDE_CONFIG_DIR`, or in your home folder).
It writes the cap of the plan into `env` of the `user` and `local` scopes:

| Plan tier | Cap |
| --- | --- |
| `claude_pro` | 2 |
| `default_claude_max_5x` | 4 |
| `default_claude_max_20x` | 6 |

For any other tier, the command writes no cap and names the tier in its output.
The `project` scope gets no cap, because a plan belongs to one login.

## Context7 Notice

The command looks in `~/.claude` and in `<project>/.claude` for the official Context7 `find-docs` skill and for a Context7 rule file.
It prints each one that it finds with the characters that it adds to each session.
The skill `claudetto-docs:find-docs` of the add-on uses the same `ctx7` CLI with 155 characters, so keep one of the two.

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

## Related Pages

- [Setup Cleanup](Setup-Cleanup)
- [Settings Snippet](Settings-Snippet)
- [Settings Apply](Settings-Apply)
- [Install](Install)
