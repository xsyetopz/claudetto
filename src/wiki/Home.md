# Home

This page tells what `claudetto` does and which plugins it has.
It is for new users, who read it before the install steps.
It also shows where to read next for each task.

## What `claudetto` Does

`claudetto` is a Claude Code plugin marketplace for software engineering.
It changes Claude Code through the Mod API, settings, hooks, skills, agents, and output styles.
It does not patch the binary.
Its goal is the highest quality for the lowest token cost.
`claudetto` needs Claude Code 2.1.303 or later.

`claudetto` has 15 slices, and each slice has one page:
[Advise](Advise), [Decide](Decide), [Dry](Dry), [Goal](Goal), [Ground](Ground), [Guard](Guard), [Handoff](Handoff), [Patch](Patch), [Prompt](Prompt), [Reply](Reply), [Sembr](Sembr), [Setup](Setup), [Spec](Spec), [Status Line](Status-Line), and [Styles](Styles).
The [settings snippet](Settings-Snippet) gives the permission rules and the sandbox.

## The Plugins

The core plugin is `claudetto`.
Each add-on is a separate plugin.
Each add-on works without the core plugin.

| Plugin | What it does | Reference |
| --- | --- | --- |
| `claudetto` | The core plugin. It gives the slices above. | [Overview](Overview), [Architecture](Architecture) |
| `claudetto-codegraph` | Gives Claude the code graph of a project from the CodeGraph CLI `codegraph`. | [Code Graph](Code-Graph) |
| `claudetto-browser` | Drives a browser with `agent-browser`. It answers each `WebSearch` call with a headless browser search. | [Browser](Browser) |
| `claudetto-docs` | Gets current library and API docs with the Context7 CLI `ctx7`. | [Library Docs](Library-Docs) |
| `claudetto-sessions` | Audits the setup and replays a hook on past transcripts. | [Sessions](Sessions) |
| `claudetto-lab` | Gives tools for plugin authors: a sandbox for Claude Code, a request capture, the JSON Schema of `settings.json`, and an eval compare. | [Lab](Lab) |

The marketplace and the install steps are in [Add-Ons](Add-Ons) and [Install](Install).

## The Principles

The design principles are on [Design](Design).
These are some of them.

- Only documented extension points.
- No model call for a check that a script can make.
- One owner for each bound.
- Each plugin works alone.

## Where to Read

| Page | Read it to |
| --- | --- |
| [Quickstart](Quickstart) | See what happens in a first session. |
| [Install](Install) | Install the marketplace and the plugins. |
| [Overview](Overview) | See what each plugin and each feature of `claudetto` is. |
| [Architecture](Architecture) | See how the core plugin is built, from `src/` to `plugins/`. |
| [Guard](Guard) | Learn what the guard denies. |
| [Settings Snippet](Settings-Snippet) | Copy the keys that Claude Code needs. See also [Settings Snippet Keys](Settings-Snippet-Keys) and [Settings Schema](Settings-Schema). |
| [Troubleshooting](Troubleshooting) | Fix a symptom. |
| [Development](Development) and [Sandbox](Sandbox) | Change `claudetto` and test a checkout. |
| [Attributions](Attributions) | See the projects whose ideas `claudetto` reimplements. |

## Concepts and Evidence

| Page | What it holds |
| --- | --- |
| [Design](Design) | The design principles of `claudetto`, and why each is in force. |
| [Decisions](Decisions) | The design decisions of `claudetto`, in groups. |
| [Evidence](Evidence) | The measured facts that the decisions use. |
| [Evals](Evals) | What the evals measure, and the Claude Code version that they need. |
| [Prompt](Prompt) | The prompt text of the `prompt` slice. |
| [Release History](Release-History) | Where the notes of each release are. |

The [CHANGELOG](https://github.com/xsyetopz/claudetto/blob/main/CHANGELOG.md) lists each release.
The section of the version in `package.json` holds the changes of the release in progress until that version has a tag.
After the tag, the `[Unreleased]` section holds the new changes.

## Source Labels

The evidence pages label each fact with its source.

| Label | Source |
| --- | --- |
| official | Anthropic documentation or support pages |
| binary | read from the installed Claude Code bundle, never patched |
| capture | a request body that Claude Code sent to a local listener |
| measured | a run or a transcript scan on the maintainer's machine |
| reported | user reports |
| inference | a conclusion from the facts above |

A binary fact names the Claude Code version that it is for.
The extracts of the bundle are in the git-ignored `external/` folder.

## Related Pages

- [Install](Install): install the marketplace and the plugins.
- [Quickstart](Quickstart): see what happens in a first session.
