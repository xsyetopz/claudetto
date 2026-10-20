# Overview

`claudetto` is a set of plugins that make Claude Code better at software work.
It aims for the best quality at the lowest token cost.
A token is the small piece of text that a model reads or writes, and you pay for each one.

## What You Get

`claudetto` has one core plugin and five add-ons.
Each add-on works without the core plugin.
You install only the parts that you want.

It changes Claude Code only in documented ways.
It never patches the Claude Code program.
For each feature, it picks the first of these that can do the work:

1. The Mod API.
2. A classic hook.
3. A built-in part of Claude Code, such as a setting, an env var, a flag, a skill, or an output style.
4. Nothing.

It writes no code for a feature that Claude Code already has.
Claude Code 2.1.305 or later is the minimum version.

## The Plugins

| Plugin | What it adds | Page |
| --- | --- | --- |
| `claudetto` | The core: settings, the slices below, the output style, and the status line. | This page |
| `claudetto-codegraph` | The `codegraph` skill and the check `claudetto-codegraph-check`. | [Code Graph](Code-Graph) |
| `claudetto-browser` | The `browse` skill, and a headless browser search for each `WebSearch` call. | [Browser](Browser) |
| `claudetto-docs` | The `docs` skill, with current library docs from the CLI `ctx7`. | [Library Docs](Library-Docs) |
| `claudetto-sessions` | The `sessions` skill, with the scripts `audit` and `replay`. | [Sessions](Sessions) |
| `claudetto-lab` | Tools for plugin authors: the sandbox, the capture, the schema, and the eval compare. | [Lab](Lab) |

[Add-Ons](Add-Ons) helps you pick one.

## The Slices of the Core Plugin

A slice is one feature of the core plugin.
The core plugin has 15 slices.

| Slice | What it does |
| --- | --- |
| [`advise`](Advise) | Gives the tool `advise`, an advisor with the model and the effort that you set. |
| [`decide`](Decide) | Lets Jev answer each `AskUserQuestion` call when `TYPESAFE_API_KEY` is set and Jev is sure. |
| [`dry`](Dry) | Merges the config of `jscpd`, and gives the skill `dry`. |
| [`goal`](Goal) | Replaces `/goal` with a loop of checks at the end of each turn. |
| [`ground`](Ground) | Denies a plan file that cites a `file:line` or a convention that the source does not hold. |
| [`guard`](Guard) | Denies a `Bash` command that only prints a file. |
| [`handoff`](Handoff) | Writes a handoff file in place of the summary of a compaction. |
| [`patch`](Patch) | Keeps one patch for each subagent in a worktree, and lands it. |
| [`prompt`](Prompt) | Gives one tailored text for the short system prompt, and cuts built-in parts. |
| [`reply`](Reply) | Adds a `Reply` button under each message of Claude. |
| [`sembr`](Sembr) | Puts each sentence of a Markdown file on its own line. |
| [`setup`](Setup) | Merges the settings snippet into a settings file. |
| [`spec`](Spec) | Ships the OpenSpec schemas `task`, `story`, and `epic`. |
| [`statusline`](Status-Line) | Shows the folder, git, model, context, cost, and limits. |
| [`styles`](Styles) | Gives the output style `claudetto:Concise`. |

## Change the Options

A plugin cannot set permissions, env vars, or models.
So the core plugin gives these as a [settings snippet](Settings-Snippet).
The `setup` slice merges the snippet into your settings file after you say yes.

These `userConfig` options change how the core plugin works:

| Option | Values | Default |
| --- | --- | --- |
| `advisor` | `builtin`, `claudetto` | `builtin` |
| `advisorModel` | an alias or a model ID | `opus` |
| `advisorEffort` | `low`, `medium`, `high`, `xhigh`, `max` | `high` |
| `decide` | `off`, `jev` | `jev` |
| `compaction` | `handoff`, `built-in` | `handoff` |

## See Also

- [Install](Install)
- [Quickstart](Quickstart)
- [Off Switches](Off-Switches)
- [Architecture](Architecture)
- [Decisions](Decisions)
