# The Vendored Claude Code Types

The mod compiles against the type packages under `plugins/claudetto/.claude-plugin/types/`:
`claude-code`, `claude-code-tools`, and `claude-code-mcp`.

**They came from the installed Claude Code `2.1.312`**, which is the version in
`MIN_CLAUDE_CODE_VERSION` of `tools/limits.ts`. The first line of
`plugins/claudetto/.claude-plugin/types/claude-code/index.d.ts` names the version that wrote it.

Claude Code writes that folder itself: it writes the declarations beside a mod each time it loads
the plugin from a folder the person owns, and it writes them again after an update rather than
editing them. So the folder is not committed, which its own `.gitignore` of `*` states, and the one
line above is the record of which install the checked-in code was typed against.

One consequence: `bun check` needs the folder, so `just typecheck` runs only on a machine that has
loaded the plugin in a session. The `ci` workflow runs every other recipe of `just check` and leaves
the type check out, which the comment on its `check` job states.
