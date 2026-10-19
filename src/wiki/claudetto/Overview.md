# Overview

This page tells what `claudetto` is, which plugins it has, and which slices the core plugin has.
A reader who meets `claudetto` for the first time reads it before [Architecture](Architecture) and [Install](Install).

## What `claudetto` Is

`claudetto` is a marketplace of Claude Code plugins for software engineering.
Its goal is the highest quality for the lowest token cost.
It has one core plugin and five add-on plugins.
Each add-on works without the core plugin.

`claudetto` changes Claude Code only through its extension points.
For each feature, it uses the first of these that can do the work:

1. The Mod API.
2. A classic hook.
3. A built-in part of Claude Code: a setting, an env var, a flag, a skill, or an output style.
4. Nothing.

It does not patch the Claude Code binary or its npm package.
It writes no code for a feature that Claude Code has.

## Minimum Claude Code Version

`claudetto` needs Claude Code 2.1.303 or later.
`MIN_CLAUDE_CODE_VERSION` in `tools/limits.ts` sets this version, and CI installs it.

## The Plugins

| Plugin | What it adds | Page |
| --- | --- | --- |
| `claudetto` | The core: the settings snippet, the slices below, the output style, and the status line. | This page |
| `claudetto-codegraph` | The `codegraph` skill and the check `claudetto-codegraph-check`. | [Code Graph](Code-Graph) |
| `claudetto-browser` | The `browse` skill, and a headless browser search for each `WebSearch` call. | [Browser](Browser) |
| `claudetto-docs` | The `docs` skill, with current library docs from the CLI `ctx7`. | [Library Docs](Library-Docs) |
| `claudetto-sessions` | The `sessions` skill, with the scripts `audit` and `replay`. | [Sessions](Sessions) |
| `claudetto-lab` | Tools for plugin authors: the sandbox, the capture, the schema, and the eval compare. | [Lab](Lab) |

[Add-Ons](Add-Ons) tells how to pick an add-on.

## The Slices of the Core Plugin

A slice is one feature, in one folder of `src/plugins/claudetto/slices/`.
The core plugin has 15 slices.

| Slice | What it does |
| --- | --- |
| [`advise`](Advise) | Gives the tool `advise`, an advisor with the model and the effort that the user sets. |
| [`decide`](Decide) | Asks Jev for a pick on each `AskUserQuestion` question that facts settle. |
| [`dry`](Dry) | Merges the config of `jscpd`, and gives the skill `dry`. |
| [`goal`](Goal) | Replaces `/goal` with a loop of checks that run at the end of each turn. |
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

## Options and Settings

A plugin cannot set permissions, env vars, or models.
So the core plugin gives these settings as the [settings snippet](Settings-Snippet).
The `setup` slice merges the snippet into your settings file after you confirm.
See [Settings Snippet Keys](Settings-Snippet-Keys) for the reason of each key.

The core plugin has these `userConfig` options:

| Option | Values | Default |
| --- | --- | --- |
| `advisor` | `builtin`, `claudetto` | `builtin` |
| `advisorModel` | an alias or a model ID | `opus` |
| `advisorEffort` | `low`, `medium`, `high`, `xhigh`, `max` | `high` |
| `decide` | `off`, `jev` | `off` |
| `compaction` | `handoff`, `built-in` | `handoff` |

[Off Switches](Off-Switches) lists how to turn each part off.

## Related Pages

- [Install](Install): add the marketplace and install the plugins.
- [Architecture](Architecture): the layers, the slices, and the build.
- [Decisions](Decisions): the reasons for the design.
