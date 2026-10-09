# Quickstart

This page shows what you see in your first session with dotclaude.
It assumes that you finished [Install](Install).

## What you see at session start

| What | When |
| --- | --- |
| Status line | After you set the `statusLine` entry of the [settings snippet](Settings-Snippet). It shows model, effort, context against the 300K window, the OpenSpec change, and the usage windows. |
| Output style | Always. The plugin forces the `dotclaude` style over the simple system prompt. You do not see it. |

On a terminal of about 130 columns, the status line has 3 columns.
The left column shows the model, the OpenSpec change, and its task count.
The middle column shows the context against the window.
The right column shows the 5-hour, 7-day, and Fable windows.
A narrower terminal packs the same parts into rows.
The context part turns yellow at 75% and red at 90% of the window.
The usage parts use the same colors.
The OpenSpec part shows the newest change with a `tasks.md` that is not archived, as `id done/total`.
The status line calls no model and no network, and it runs no program except `git`.
See [Status line](Status-Line).

## What happens in a session

### A permission rule asks

Claude plans a force push, a `git reset --hard`, a package publish, or a write to a pull request or an issue.
Claude Code asks you first, because the [settings snippet](Settings-Snippet) has an `ask` rule for it.
It denies a read of secrets and a `rm -rf` of the root or your home.
See [Guards](Guards).

### A recursive rm outside the project asks

Claude plans `rm -r` on a folder outside the project root.
The hooks module asks you first and names the target.
A target in the project, in `/tmp`, in `/private/tmp`, or in `$TMPDIR` goes on.
A target with `$` or a backtick counts as outside.
You decide.
The module never approves a command for you.

### A policy ask for a repository of another owner

Claude runs `git clone`, `gh`, `curl`, or `wget` on a repository of another owner, or fetches its page.
The repository has a `CLAUDE.md`, `AGENTS.md`, or `AI_POLICY.md`.
The module asks once per session and per repository, and it shows the policy text, cut at 2,000 characters.
See [Contributions](Contributions).

### The context limit

Compaction is off.
When the session reaches 300K tokens, it stops.
At 60% of the window, a hook tells Claude to start a slice only when it fits in the tokens that are left.
At 80%, the hook tells Claude to stop, to tick the finished tasks in the OpenSpec change, to write the decisions in `design.md`, and to name the command that continues the work.
Then run `/clear` and the command that Claude names, such as `/opsx:apply <change>`.
dotclaude writes no handoff file.
See [Context bound](Context-Bound) and [OpenSpec](OpenSpec).

## Next steps

- [Guards](Guards): see what asks, what denies, and what the sandbox does.
- [Context bound](Context-Bound): see how a session ends before the limit.
- [OpenSpec](OpenSpec): keep the task list in a change.
