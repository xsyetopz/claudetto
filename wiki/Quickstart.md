# Quickstart

This page shows what you see in your first session with `claudetto`.
It is for users who finished [Install](Install).
The install steps are not repeated here.

The core plugin `claudetto` adds an output style, six agents, a status line, and hooks.
The hooks ask, deny, and check.
See [Architecture](Architecture) for the parts.

## What You See at Session Start

After you apply the [settings snippet](Settings-Snippet) with `/claudetto:setup`, you see these parts.

- The status line, with the parts in the next section.
- The output style `claudetto:Concise`.
  It sets how Claude writes its replies.
  See [Prompt](Prompt).
- A drift note, when the active settings differ from the snippet.

Claude receives the drift note at session start.
The note lists each difference.
It states that the user has not seen the difference.
Some lines name `/claudetto:setup` as the fix.
When no difference exists, the note is not added.
See [Settings Snippet](Settings-Snippet) for the keys of the snippet.

## The Status Line

The status line has up to three rows.

- The first row shows the folder, the git state, the pull request, the active change as `◆ name 4/13 ▸5.1`, and the 7-day limit.
- The second row shows the model, the context, the cost with the lines added and removed, and the 5-hour limit.
  The number after `⇥` in the context is the distance to the handoff trigger.
- The third row shows the spend limit and the prompt cache.

The colors follow the theme of Claude Code, and `NO_COLOR` turns the color off.
The width comes from the `COLUMNS` env var.
When `COLUMNS` is unset, the width is 120 columns, and 4 columns stay free at the right edge.
The status line calls no model and no network.
It runs no program except `git`.
See [Status Line](Status-Line).

## The Agents

The plugin adds six agents.
Claude starts an agent with the `Agent` tool, when a task fits the agent.

- `investigator` answers a question from several files, logs, or git history.
  It is read-only.
- `researcher` answers from web pages and official docs, with quotes and sources.
  It is read-only.
- `planner` plans a change across files, and it writes the plan only under `minispec/changes/<name>/`.
- `implementer` implements one scoped slice with a known check, in its own worktree.
- `debugger` finds the root cause of a failure, and it makes the smallest fix.
- `reviewer` reviews code, a plan, or a design.
  It is read-only.

No agent runs the tests.
The `checks` slice has the `claudetto-run-checks` CLI, which replaces a test-runner agent.
See [Agents](Agents).

## MiniSpec and the Handoff

MiniSpec keeps a plan in files in your project.
The folder `minispec/specs/` holds the specs, and the folder `minispec/changes/` holds one folder for each open change.
Run `/claudetto:minispec` to plan a change, `/claudetto:minispec-apply` to do its tasks, and `/claudetto:minispec-review` to review it.
The `minispec` CLI reads and updates the same files.
See [MiniSpec](MiniSpec).

Claude Code does not compact the context in the default setup.
At 225,000 tokens of the 300,000 window, the handoff writes a file with the goal, the state, and the next step.
For Haiku the trigger is 100,000 tokens.
The file goes to `minispec/changes/<name>/handoff.md` when a change is open, and else to `.claudetto/handoff/`.
Then a clean session reads the file.
Run `/handoff` to start it by hand.
See [Handoff](Handoff).

## The Guards

The permission rules, the sandbox, and the hook module guard each call.
See [Guards](Guards) for the full list.

The settings snippet makes Claude Code ask you first for these commands.
It also asks for a force push, `git reset --hard`, and other commands that discard work.

- A package publish, such as `npm publish` or `cargo publish`.
- A write to a pull request or an issue, such as `gh pr create` or `gh issue comment`.
- A recursive `rm`, such as `rm -r` or `rm --recursive`.

A `Bash` command that prints a whole file is denied.
The denial names the `Read` call with the range to use.

The permission rules deny a read of secrets, such as `.env` files and `~/.ssh/**`.
They also deny `rm -rf` of the root or of your home folder.

The destructive floor denies a destructive command.
The floor denies `git reset --hard`, a force push to `main` or `master`, and a forced checkout or removal that drops uncommitted work.
Claude stops, and it does not try the action another way.
The denial gives you the exact command in a block.
Run that command yourself with `!` at the start of your prompt, if you want the action.

## Related Pages

- [Guards](Guards): what asks, what denies, and what the sandbox limits.
- [Handoff](Handoff): how a session ends before the bound.
- [MiniSpec](MiniSpec): the files and the tasks of a change.
- [Troubleshooting](Troubleshooting): what to check when a part does not show.
