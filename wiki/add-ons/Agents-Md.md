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

## The files that it loads

| Place | Files | When |
| --- | --- | --- |
| The user folder | `AGENTS.md` in `CLAUDE_CONFIG_DIR`, or in `~/.claude` | At the start of the session |
| Each ancestor of the working directory | `AGENTS.md`, `.claude/AGENTS.md`, and `AGENTS.local.md` | At the start of the session |
| A folder below the session root | The same names as an ancestor | When Claude reads or changes a file there with `Read`, `Edit`, `Write`, or a `Bash` read, or when you mention a file there |
| Each folder of `permissions.additionalDirectories` | The same names as an ancestor | At the start, when `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD` is `1` |

A file at the start goes into the instruction files, as a `CLAUDE.md` file does.
A nested file goes into the result of the tool call or the mention, as one block of context.

## No file loads twice

- The plugin skips a file that the instruction files already hold, by its path or by the same trimmed text.
  So a file that a `CLAUDE` file imports or links to does not load again.
- The `@` imports of an `AGENTS` file come from the loader of Claude Code, so the plugin does not resolve them itself.
- A nested file loads once in a session.
  After a compaction, the nested file loads again on the next read, because the compaction removed its text.
  A new session loads each file again.
- `claudeMdExcludes` applies to the `AGENTS` files too.

## Limits

- The mods API does not show the `--add-dir` folders of the CLI.
  The plugin reads only `permissions.additionalDirectories` from the settings.
- The plugin fails open: a failed read loads no file and does not change the tool call.
- The token cost of an `AGENTS.md` against the same text in `CLAUDE.md` is not measured yet.

The evidence is in `.dotclaude/spec/changes/1.0.0/evidence/agents-md.md`.
