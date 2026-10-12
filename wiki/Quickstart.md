# Quickstart

This page shows what you see in your first session with dotclaude.
It assumes that you finished [Install](Install).

## What you see at session start

| What | When |
| --- | --- |
| Status line | After you set the `statusLine` entry of the [settings snippet](Settings-Snippet). It shows model, effort, context against the 300K window, the spec change, and the usage windows. |
| Drift note | When the active settings differ from the [settings snippet](Settings-Snippet), such as values that setup did not write, a status line of an old plugin version, or a built-in plugin that is on again. The note names `/dotclaude:setup` as the fix. Claude mentions each difference in its first answer. Nothing shows when no difference exists. |
| Output style | After you set the `outputStyle` entry of the [settings snippet](Settings-Snippet) to `dotclaude:Concise`. The style keeps the coding instructions, so you see its effect in the replies. |

On a terminal of about 130 columns, the status line has 3 columns.
The left column shows the model, the spec change, and its done and total packages.
The middle column shows the context against the window.
The right column shows the 5-hour, 7-day, and Fable windows.
A narrower terminal packs the same parts into rows.
The context part turns yellow at 75% and red at 90% of the window.
The usage parts use the same colors.
The spec part shows the last change, in id order, whose packages are not all `done`, as `id done/total`.
The status line calls no model and no network, and it runs no program except `git`.
See [Status line](Status-Line).

## What happens in a session

### A permission rule asks

Claude plans a package publish, or a write to a pull request or an issue.
Claude Code asks you first, because the [settings snippet](Settings-Snippet) has an `ask` rule for it.
It denies a read of secrets and a `rm -rf` of the root or your home.
See [Guards](Guards).

### A destructive command is stopped

Claude plans a force push to a shared or default branch, such as `main`, or a `git reset --hard`.
The destructive floor forbids both, so dotclaude denies them and Claude stops.
Claude does not try the action in another way.
If you want the action, run the exact command that Claude gives you with `!` at the start of your prompt.
See [Guards](Guards).

### A recursive rm asks

Claude plans `rm -r` on a folder.
Claude Code asks you first, because the settings snippet has `ask` rules for each recursive `rm`, also inside the project.
The plugin alone gives no `rm` ask, because a plugin cannot ship `permissions`.
The sandbox stops a write outside the allowed folders.
You decide.

### A policy ask for a repository of another owner

Claude runs `git clone`, `gh`, `curl`, or `wget` on a repository of another owner, or fetches its page.
The repository has a `CLAUDE.md`, `AGENTS.md`, or `AI_POLICY.md`.
The module asks once per session and per repository, and it shows the policy text, cut at 2,000 characters.
See [Contributions](Contributions).

### The context limit

Compaction is off.
At 60% of the window, the default `mainHandover` option of `manual` gives you a hint to run `/handoff`.
`/handoff` writes a handoff file to `.dotclaude/handoff/`, and the work continues from that file in a new session.
When the session reaches 300K tokens, it stops.
The status line turns yellow at 75% and red at 90% of the window.
Without a handoff, run `/clear` and then `dotclaude-spec next <change>`, so the work continues from the lane log.
See [Context bound](Context-Bound) and [Spec store](Spec-Store).

## Next steps

- [Guards](Guards): see what asks, what denies, and what the sandbox does.
- [Context bound](Context-Bound): see how a session ends before the limit.
- [Spec store](Spec-Store): keep the tasks and the lane log of a change.
