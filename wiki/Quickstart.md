# Quickstart

This page shows what you see in your first session with dotclaude 1.0.0.
It is for users who finished [Install](Install).
The install steps are not repeated here.

The core plugin `dotclaude` adds an output style, six agents, a status line, and hooks.
The hooks ask, deny, and check.
See [Architecture](Architecture) for the parts.

## What You See at Session Start

After you apply the [settings snippet](Settings-Snippet) with `/dotclaude:setup`, you see these parts.

- The status line, with the parts in the next section.
- The output style `dotclaude:Concise`.
  It sets how Claude writes its replies.
  See [Prompt-Surface](Prompt-Surface).
- A drift note, when the active settings differ from the snippet.

Claude receives the drift note at session start.
The note lists each difference.
It states that the user has not seen the difference.
Some lines name `/dotclaude:setup` as the fix.
When no difference exists, the note is not added.
See [Settings-Snippet](Settings-Snippet) for the keys of the snippet.

## The Status Line

The status line has up to three rows.

- The first row shows the folder, the git branch with the counts of changed, ahead, and behind files, and the active change as `id done/total`.
- The second row shows the model, the context against the 300K window, and the cost with the lines added and removed.
- The third row shows the 5h and 7d usage windows and the spend limit, each with the time to its reset.

The context part is yellow at 75% of the window and red at 90%.
The usage parts use the same colors.
The active change is the last change in the order of its id that has a package that is not `done`.

The width comes from the `COLUMNS` env var.
When `COLUMNS` is unset, the width is 120 columns, and 4 columns stay free at the right edge.
When a row is too wide, its segments at the right drop first.
Then the row is cut at its end with `…`.

The status line calls no model and no network.
It runs no program except `git`.
It writes the last usage sample to `.dotclaude/rate-limits.jsonl` when the values change.
See [Status-Line](Status-Line).

## The Agents

The plugin adds six agents.
Claude starts an agent with the `Agent` tool, when a task fits the agent.

- `investigator` answers a question from several files, logs, or git history.
  It is read-only.
- `researcher` answers from web pages and official docs, with quotes and sources.
  It is read-only.
- `planner` plans a change across files, and it writes the plan only under `.dotclaude/spec/`.
- `implementer` implements one scoped slice with a known check, in its own worktree.
- `debugger` finds the root cause of a failure, and it makes the smallest fix.
- `reviewer` reviews code, a plan, or a design.
  It is read-only.

No agent runs the tests.
The `checks` slice has the `dotclaude-run-checks` CLI, which replaces a test-runner agent.
See [Agents](Agents).

## The Spec Store and `/dotclaude:handoff`

The spec store is the folder `.dotclaude/spec/`, which the repository tracks.
A change has its own folder under `.dotclaude/spec/changes/`.
Its lane log, `events.jsonl`, moves each package between the lanes `planned`, `doing`, `review`, `done`, and `blocked`.

To start a change, run `/dotclaude:spec <change-id>`.
The skill starts the change with `dotclaude-spec new`.
It fills the files of the change, and it checks them with `dotclaude-spec validate`.
The skill does not start the work.
See [Spec-Store](Spec-Store).

The context has a bound of 300K tokens.
Claude Code does not compact it.
At 60% of the window, the default `mainHandover` value of `manual` gives you a hint to run `/dotclaude:handoff`.
The hint also comes when a package moves to `done`.
The skill writes a handoff file to `.dotclaude/handoff/`, with the goal, the state, the next step, and the constraints.
Then it starts a clean session that reads the file.
See [Context-And-Handoff](Context-And-Handoff).

Without a handoff, run `/clear`, and then `dotclaude-spec next <change-id>`.
The command shows the next package from the lane log.

## The Guards

The permission rules, the sandbox, and the hook module guard each call.
See [Guards](Guards) for the full list.

The settings snippet makes Claude Code ask you first for these commands.

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

Claude runs `git clone`, `gh`, `curl`, or `wget` on a repository of another owner, or it fetches a page of that repository.
If the repository has a `CLAUDE.md`, `AGENTS.md`, or `AI_POLICY.md` file, the guard asks once per session and per repository.
The ask shows the text of each policy file, truncated at 2,000 characters.
See [Contributions](Contributions).

## Related Pages

- [Guards](Guards): what asks, what denies, and what the sandbox limits.
- [Context-And-Handoff](Context-And-Handoff): how a session ends before the bound.
- [Spec-Store](Spec-Store): the tasks and the lane log of a change.
- [Troubleshooting](Troubleshooting): what to check when a part does not show.
