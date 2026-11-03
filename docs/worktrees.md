# Worktree Base

A worktree that Claude Code makes for `EnterWorktree` or for an `Agent` call with `isolation: "worktree"`
starts at `origin/<default branch>`, not at the branch the session is on. On a branch ahead of `origin/main`,
such as `release/0.3.0`, the worktree lacks every commit of that branch, and an agent that works in it
edits old code.

## The Cause

Claude Code `2.1.317` picks the base in the function that creates the worktree. It bases the worktree on
local `HEAD` only when the call asks for it or when the setting `worktree.baseRef` is `"head"`:

```js
b = s?.fromHead ?? (!s?.prNumber && settings().worktree?.baseRef === "head")
```

Otherwise the base is `refs/remotes/origin/<default branch>`, fetched first when `FETCH_HEAD` is old. Only
when that ref is missing and the fetch fails does it fall back to local `HEAD`. The settings schema documents
the key with the default `"fresh"` (`https://clawdipedia.cc/schemas/claude-code-managed-settings.json`).
claudetto does not pick the base: it registers no `WorktreeCreate` hook.

## The Fix

Setup writes the key, in the "Worktrees" group of its dialog, which names the key and what it does:

```json
{ "worktree": { "baseRef": "head" } }
```

A user who already set `worktree.baseRef` keeps that value. `just setup` writes it only when it is unset,
and the `/claudetto:setup` dialog does not offer it.

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
Measured on 2026-11-03 with `2.1.317`, where the commits differ per run:

| Run | Worktree start | Guard line |
| --- | --- | --- |
| `agent` | `origin/main` | none, no plugin |
| `agent --plugin-dir plugins/claudetto` | `origin/main` | present |
| `enter --plugin-dir plugins/claudetto` | `origin/main` | present |
| `agent head --plugin-dir plugins/claudetto` | the `feat` tip | none |
| `enter head --plugin-dir plugins/claudetto` | the `feat` tip | none |
