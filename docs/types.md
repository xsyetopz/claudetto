# The Vendored Claude Code Types

The mod compiles against the type packages under `plugins/claudetto/.claude-plugin/types/`:
`claude-code`, `claude-code-tools`, and `claude-code-mcp`.

**They came from Claude Code `2.1.312`**, which the first line of
`plugins/claudetto/.claude-plugin/types/claude-code/index.d.ts` names.

That is not `MIN_CLAUDE_CODE_VERSION` of `tools/limits.ts`, and the two numbers
are allowed to differ. The minimum is the version whose documented behavior the code rests on; the
number above is the version whose engine last wrote the declarations on this machine. The one
addition `2.1.314` makes to the surface is the call `$.ui.place` and the event `ui.place`
(`clawdipedia` route `extend/mod-api`, read 2026-10-30), and nothing here calls either, so the older
declarations type this tree without a gap. The engine rewrites the folder on its own, so the number
moves when it does and not when a person edits this page.

Claude Code writes that folder itself: it writes the declarations beside a mod each time it loads
the plugin from a folder the person owns, and it writes them again after an update rather than
editing them. So the folder is not committed, which its own `.gitignore` of `*` states, and the one
line above is the record of which install the checked-in code was typed against.

One consequence: `bun check` needs the folder, so `just typecheck` runs only on a machine that has
loaded the plugin in a session. The `ci` workflow runs every other recipe of `just check` and leaves
the type check out, which the comment on its `check` job states.
