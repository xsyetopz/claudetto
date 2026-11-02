# Worktree Base

A worktree that Claude Code makes for `EnterWorktree` or for an `Agent` call with `isolation: "worktree"`
starts at `origin/<default branch>`, not at the branch the session is on. On a branch ahead of `origin/main`,
such as `release/0.3.0`, the worktree lacks every commit of that branch, and an agent that works in it
edits old code.

## The Cause

Claude Code `2.1.316` picks the base in the function that creates the worktree. It bases the worktree on
local `HEAD` only when the call asks for it or when the setting `worktree.baseRef` is `"head"`:

```js
b = s?.fromHead ?? (!s?.prNumber && settings().worktree?.baseRef === "head")
```

Otherwise the base is `refs/remotes/origin/<default branch>`, fetched first when `FETCH_HEAD` is old. Only
when that ref is missing and the fetch fails does it fall back to local `HEAD`. The settings schema documents
the key with the default `"fresh"` at `docs/keep/settings/claude-code-managed-settings.schema.json:1132`.
claudetto does not pick the base: it registers no `WorktreeCreate` hook. The setup before the `0.0.0`
restart wrote `worktree: { baseRef: "head" }`, from commit `cb709ac5`. The `0.1.0` setup leaves the
`worktree` setting unset, because none of its keys turns worktrees on or off, and since then nothing in
claudetto sets the key.

## The Fix

Set the key in the settings of a repo whose work happens on a long-lived branch:

```json
{ "worktree": { "baseRef": "head" } }
```

The `worktree-base` block catches the case when the key is not set. When an agent starts in a folder under
`.claude/worktrees/`, and when `EnterWorktree` returns one, it runs four `git` commands with no model call.
If the worktree's `HEAD` lacks the tip of the branch checked out in the main checkout, it does two things:

- It adds a line to the model's context that names both commits and the command
  `git merge --ff-only <tip>`, to run before the first edit when the task is about that branch.
- It shows one line to the user through the UI log, naming the setting.

A worktree that holds the tip, a folder outside `.claude/worktrees/`, and a `git` that fails add no text.

## Reproduction

`just worktree-base enter|agent [BASE_REF] [--plugin-dir DIR]` builds a repo whose `feat` is one commit
ahead of `origin/main`, makes one worktree against the fake API, with no paid call, and prints its start.
Measured on 2026-11-03 with `2.1.316`:

| Run | Worktree start | `feat` tip | Guard line |
| --- | --- | --- | --- |
| `agent` | `f79e1a7`, `origin/main` | `f9132ae` | none, no plugin |
| `agent --plugin-dir plugins/claudetto` | `7e4284a`, `origin/main` | `23f671d` | present |
| `enter --plugin-dir plugins/claudetto` | `467336d`, `origin/main` | `494fb94` | present |
| `agent head --plugin-dir plugins/claudetto` | `d2febcd`, the tip | `d2febcd` | none |
