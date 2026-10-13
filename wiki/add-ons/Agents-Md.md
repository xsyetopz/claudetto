# AGENTS.md

The plugin `dcc-plugin-agents-md` loads `AGENTS.md` files in the places where Claude Code loads `CLAUDE.md`.
It replaces the built-in plugin `cc-plugin-agents-md`, so turn that plugin off when you install this one.
It works without the core plugin, and it imports nothing from another plugin.

The source is in `src/plugins/dcc-plugin-agents-md/`.
The one slice is `agents`, and its hooks are in `slices/agents/adapters/mod.ts`.

## Install

1. Install the plugin with `/plugin install dcc-plugin-agents-md@dotclaude`.
2. Turn off the built-in plugin `cc-plugin-agents-md@builtin` in `/plugin`.

The plugin needs no key and no tool on `PATH`.

## The Files That It Loads

| Place | Files | When |
| --- | --- | --- |
| The user folder | `AGENTS.md` in `CLAUDE_CONFIG_DIR`, or in `~/.claude` | At the start of the session |
| Each ancestor of the working directory | `AGENTS.md`, `.claude/AGENTS.md`, and `AGENTS.local.md` | At the start of the session |
| A folder below the session root | The same names as an ancestor | When Claude reads or changes a file there with `Read`, `Edit`, `Write`, or a `Bash` read, or when you mention a file there |
| Each folder of `permissions.additionalDirectories` | The same names as an ancestor | At the start, when `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD` is `1` |

A file at the start goes into the instruction files, as a `CLAUDE.md` file does.
A nested file goes into the result of the tool call or the mention, as one block of context.

## No File Loads Twice

- The plugin skips a file that the instruction files already hold, by its path or by the same trimmed text.
  So a file that a `CLAUDE` file imports or links to does not load again.
- The `@` imports of an `AGENTS` file come from the loader of Claude Code, so the plugin does not resolve them itself.
- A nested file loads once in a session.
  After a compaction, the nested file loads again on the next read, because the compaction removed its text.
  A new session loads each file again.
- `claudeMdExcludes` applies to the `AGENTS` files too.
  As in Claude Code, each `\` of a path and of a glob is a `/` for the match, so a glob with `/` also matches a Windows path.

## What the Files Cost

A sandbox session loaded 5 `AGENTS` files, and then loaded the same text as `CLAUDE` files.
The `count_tokens` API counted the requests.

| Files | As `AGENTS` Files | As `CLAUDE` Files |
| --- | --- | --- |
| The files of the start, in the first request | 16,772 tokens | 16,789 tokens |
| One nested file | 73 tokens | 66 tokens |

So the files of the start cost 17 tokens less than `CLAUDE` files.
Each nested file costs 7 tokens more than a nested `CLAUDE.md`.
Claude Code puts the prefix `tool.call hook additional context:` before the context of a hook, and the plugin cannot remove it.

## Limits

- The mods API does not show the `--add-dir` folders of the CLI.
  The plugin reads only `permissions.additionalDirectories` from the settings.
- The plugin fails open: a failed read loads no file and does not change the tool call.

The evidence is in `.dotclaude/spec/changes/1.0.0/evidence/agents-md.md`.

## Related Pages

- [You Should Know](You-Should-Know): the next add-on page.
- [Add-On Plugins](Add-Ons): the list of the add-on plugins.
