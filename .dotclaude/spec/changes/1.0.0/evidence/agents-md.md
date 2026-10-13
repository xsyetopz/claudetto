# Evidence of `dcc-plugin-agents-md` (P40)

This file holds the facts that the plugin rests on.
The first run of step 1 gathered them, and the facts came from the mods API type file.
The type file is `plugins/dotclaude/.claude-plugin/types/claude-code/index.d.ts`, and the lines are cited below.

## Facts

- A `prompt.context` hook can add entries to `instructionFiles` (type lines 8478 to 8511).
  The engine renders an added entry as it renders a `CLAUDE.md` file.
  The `InstructionFile` type (lines 5532 to 5550) has `path`, `kind`, `content`, and the optional `parent`.
  The `parent` field names the file whose `@` import brought the entry.
- `$.fs.ancestors` (lines 4838 to 4862 and 7093) returns `parts`, in which the engine's loader has already followed the `@` imports.
  The plugin uses `content` for the `@` handling, and it does not resolve imports itself.
- `claudeMdExcludes` applies only to the user, project, and local files of Claude Code.
  The plugin filters its own entries with `$.settings.read()`.
- `tool.call` (lines 3962 and 12740) and `prompt.mention` (lines 4217 and 8840) can return `context`.
  Each entry of `context` is one block that the model reads, and it carries a nested file.
- The mods API does not expose the `--add-dir` folders of the CLI.
  Only `permissions.additionalDirectories` from settings is reachable.
  The gap stays open, and the wiki page of the add-on records it.

## Not verified in this run

- The label, cache, and compaction handling of a `prompt.context` entry are not verified against the engine.
  The facts above cover only the render of such an entry.
- The token cost of one `AGENTS.md` at the start and on each later turn is not measured.
  The coordinator measures it in `just sandbox` after the merge.
  Token cost: not measured.

## Decisions that the facts support

- The plugin loads `AGENTS.md` and `AGENTS.local.md` in each ancestor of the working directory, and `.claude/AGENTS.md` too.
- It loads the `AGENTS.md` of the user folder, and of each folder of `permissions.additionalDirectories` when `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD` is set.
- It loads a nested `AGENTS.md` for a `Read`, `Edit`, `Write`, or `Bash` read of a file in that folder, and for a `prompt.mention` of such a file.
- It skips a file that the instruction files already hold, by path or by the same trimmed text.
- It filters each entry with `claudeMdExcludes`.
