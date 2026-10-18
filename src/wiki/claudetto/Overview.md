# Overview

This page tells what `claudetto` is and which plugins it has.
It is for a reader who meets `claudetto` for the first time, before the [architecture](Architecture).
`claudetto` 0.1.0 is not built yet, so this page describes the plan, not the shipped code.

## What `claudetto` Is

`claudetto` is a Claude Code plugin marketplace for software engineering.
It is the restart of dotclaude 1.0.0, with a new name and no compatibility with dotclaude 1.0.0.
No setting, file, or command of dotclaude 1.0.0 carries over.
The slices `rules`, `stamp`, `spec`, and `handoff` of dotclaude 1.0.0 go.
A new `handoff` slice replaces the old one, and `minispec` replaces `spec`.

`claudetto` changes Claude Code only through its extension points.
For each feature, it uses the first of these that can do the work:

1. The Mod API.
2. A classic hook.
3. A built-in part of Claude Code: a setting, an env var, a flag, a skill, an agent, or an output style.
4. Nothing.

It does not patch the Claude Code binary or its npm package.

## The Minimum Claude Code Version

`claudetto` is built for Claude Code 2.1.302 or later.

## The Plugins

The marketplace has one core plugin and 6 add-ons.
Each add-on works without the core plugin.

| Plugin | What it adds |
| --- | --- |
| `claudetto` | The core: the handoff, MiniSpec, the prompt profile, the context trim, the status line, the role agents, the guards, and the setup. |
| `claudetto-codegraph` | The `codegraph` CLI and skill, and an opt-in MCP server. |
| `claudetto-browser` | The browser guide and an opt-in `WebSearch` backend. |
| `claudetto-docs` | The current docs of a library or an API, with the Context7 CLI `ctx7`. |
| `claudetto-sessions` | The measure of the start of a session by source, and the usage of each run. |
| `claudetto-lab` | The tools to measure Claude Code: the request capture, the sandbox, the schema build, and the eval compare. |
| `claudetto-you-should-know` | The "you should know" notices of Claude Code, also in `-p`. |

## The Main Features of the Core

- **Handoff.**
  When the context is near full, a handoff replaces the built-in compaction.
  The session continues with one message that has the first user message and a handoff of the work, and the newest messages.
  On each failure, Claude Code does its built-in compaction.
  See [Handoff](Handoff).
- **MiniSpec.**
  A lightweight spec-driven workflow with skills, Markdown files, and the `minispec` CLI.
  See [MiniSpec](MiniSpec).
  The checked tasks of a change are its record, so a handoff keeps the state of the change.
- **Guards.**
  An ask before a call that discards work, weakens a test, or changes a protected file.
  A deny of a command part that only prints a file.
- **Prompt and context.**
  A system prompt for each model, and the switches that turn off built-in parts that `claudetto` does not use.
- **Second opinion.**
  An opt-in tool that settles a choice with a small Claude model or Jev.
  It is off by default.
  See [Decision API](Decision-API).
- **Semantic breaks and output style.**
  A rewrite that puts each sentence of a Markdown file on its own line, and a concise output style.
  See [Semantic Breaks](Semantic-Breaks) and [Output Style](Output-Style).
- **Worktrees.**
  Hooks that make an agent worktree from `HEAD`, copy `.worktreeinclude`, and keep a worktree that holds work.
  See [Worktrees](Worktrees).
- **User checks.**
  A hook that asks for the exact `!` command when a check that only the user can run stays open after a denied call.
  See [User Checks](User-Checks).
- **Turn gate.**
  A gate at the end of each turn that blocks a stop while a background task runs, and a judge that blocks a claim with no check after the last edit.
  See [Turn Gate](Turn-Gate).
- **Read gates.**
  Gates that keep a rejected call rejected, deny a read of an unchanged range that is in the context, and ask for a new read after a rejected write.
  See [Read Gates](Read-Gates).
- **Repo state.**
  The git state at the start, an ask before an edit of `[Unreleased]` for a version with no tag, an ask before a package that the registry lacks, and a mark for a served model that differs from the requested one.
  See [Repo State](Repo-State).
- **Status line.**
  The main and subagent status lines from the input of Claude Code.
  See [Status Line](Status-Line).
- **Reply button.**
  A `Reply` button under each message of Claude.
  A press puts the first lines of that message in the prompt box as a `>` quote, at the cursor, so the text that you typed stays.

## Related Pages

- [Architecture](Architecture): the layers, the slices, and the build of `claudetto`.
