# Rules slice findings

The findings of P29, step 4.
The P29 implementer wrote them on `dotclaude-1-0-0` on 2026-10-12.

Step 4 is open: this run converts no part, and the main session decides.

Facts that decide each part (Claude Code 2.1.296, live checks):

- A rule with no `paths` loads in the main session and in a `general-purpose` subagent.
- A rule with `paths` loads after a matching `Read`.
- A `--worktree` session loads the rules of its worktree.
- A `rules/` folder at a plugin root does not load, and the manifest has no `rules` key.
  So a plugin cannot ship a rule.
  A rule helps only the repository of a project, and never a user of a plugin.

No slice part adds guidance text for some files only at runtime.
Each part that reacts to a kind of file or tool does a different work, and a rule cannot do that work.

| Part | What it does for some files | Can a `paths:` rule do the same work? |
| - | - | - |
| `sembr` `tool.call` (`Write`, `Edit`, `Bash`) | Rewrites the content of a Markdown file so that each sentence has its own line. | No. It changes the input of the call, and a rule only adds text. A rule for `**/*.md` could add a reminder, but the rewrite is still needed, because a rule does not enforce. |
| `asks` `tool.check` (`Bash`, `Write`, `Edit`, `MultiEdit`) | Asks the user before a change to a test file, a limits file, a lint config, a CI file, or a hook file. | No. It is a permission decision, not guidance. |
| `guard` `tool.call` (`Bash`) | Denies a command by its text. | No. It is not tied to a file, and it denies. |
| `dotclaude-codegraph` `graph` `PostToolUse` (`Edit`, `Write`, `MultiEdit`, `NotebookEdit`) | Syncs the index after an edit. It adds no text. | No. It runs a command. |
| `dotclaude-codegraph` `graph` `SessionStart` | Adds one line about the graph when `.codegraph/codegraph.db` exists. It is for the whole session, not for some files. | No. The condition is a file in the project, and a plugin cannot ship a rule. |
| `dotclaude` `hooks/PostToolUse/context.ts` | Tells a subagent over its context bound to report now. The condition is the size of the context. | No. A rule has no condition on the context size. |
| `surface` `tool.describe` (`Read` and others) | Shortens the description of a tool for every file. | No. It replaces the text of a tool description. |

The only candidate for a rule is guidance that lives in `AGENTS.md` for some files.
P31 moves it to `.claude/rules/` for this repository.
