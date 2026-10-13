# Home

dotclaude is a Claude Code plugin marketplace for software engineering.
It changes Claude Code with the Mod API, settings, hooks, skills, agents, and output styles, and it does not patch the binary.
Its goal is the highest intelligence for the lowest token cost.
This wiki describes dotclaude 1.0.0.
The binary facts are for Claude Code `2.1.296`, which is the value of `TESTED_VERSION`.

## What it does

- Gives permission rules and a sandbox in the [settings snippet](Settings-Snippet).
  The rules ask or deny destructive actions, as [Guards](Guards) describes.
- Gives `ask` rules for recursive `rm` calls in the settings snippet.
- Turns off auto compaction (`autoCompactEnabled` is `false`), and sets `CLAUDE_CODE_AUTO_COMPACT_WINDOW` and `CLAUDE_CODE_MAX_CONTEXT_TOKENS` to `300000`.
  See [Context-And-Handoff](Context-And-Handoff).
- Selects the output style `dotclaude:Concise` with the settings snippet.
  The style leads with the result and keeps replies short.
- Changes parts of the built-in system prompt and of the tool descriptions, through the Mod API.
  See [Prompt-Surface](Prompt-Surface).
- Gives Claude six agents, each with a model, an effort, and a turn limit: `reviewer`, `implementer`, `debugger`, `investigator`, `planner`, and `researcher`.
  See [Agents](Agents).
- Writes the packages and the lanes of a change to the spec store with the `dotclaude-spec` CLI.
  See [Spec-Store](Spec-Store).
- Shows the folder, the git state, the spec change, the model and effort, the context, the cost, and the 5-hour limit in a status line.
  See [Status-Line](Status-Line).

## The plugins

The core plugin is `dotclaude`.
Each add-on is a separate plugin, and each add-on works without the core plugin.

| Plugin | What it does | Reference |
| --- | --- | --- |
| `dotclaude` | The core plugin: the output style, the agents, the guards, the status line, the handoff, the drift check, the spec store, and the second opinion from TypeSafe Jev (`second_opinion`). | [Architecture](Architecture), [Second-Opinion](Second-Opinion) |
| `dotclaude-codegraph` | Gives Claude the code graph of a project from the CodeGraph CLI `codegraph`. | [Code-Graph](Code-Graph) |
| `dotclaude-browser` | Drives a browser with `agent-browser`, and answers each `WebSearch` call with a headless browser search. | [Browser](Browser) |
| `dotclaude-docs` | Gets current library and API docs with the Context7 CLI `ctx7`. | [Library-Docs](Library-Docs) |
| `dotclaude-sessions` | Measures the start of a session by source, and the usage of each run. | [Sessions](Sessions) |
| `dotclaude-lab` | Tools for plugin authors: a sandbox for Claude Code, a request capture, the JSON Schema of `settings.json`, and an eval compare. | [Lab](Lab) |
| `dcc-plugin-agents-md` | Loads `AGENTS.md` files where Claude Code loads `CLAUDE.md`. | [Agents-Md](Agents-Md) |

The marketplace and the install steps are in [Add-Ons](Add-Ons) and [Install](Install).

## The principles

The design principles are on [Design](Design).
These are five of them.

- Only documented extension points.
- No model call for a check that a script can make.
- One owner for each bound.
- Jev decides, and the user approves.
- Each plugin works alone.

## Where to read

| Page | Read it to |
| --- | --- |
| [Quickstart](Quickstart) | See what happens in a first session. |
| [Install](Install) | Install the marketplace and the plugins. |
| [Architecture](Architecture) | See how the core plugin is built, from `src/` to `plugins/`. |
| [Guards](Guards) | Learn what asks, what denies, and what the sandbox does. |
| [Settings-Snippet](Settings-Snippet) | Copy the keys that Claude Code needs. See also [Settings-Snippet-Keys](Settings-Snippet-Keys) and [Settings-Schema](Settings-Schema). |
| [Hook-Events](Hook-Events) | See the events that Claude Code sends, and the map to the dotclaude events. |
| [Undocumented-Reads](Undocumented-Reads) | See the settings and env vars that the binary reads and the docs do not name. |
| [Troubleshooting](Troubleshooting) | Fix a symptom. |
| [Development](Development) and [Sandbox](Sandbox) | Change dotclaude and test a checkout. |
| [Attributions](Attributions) | See the projects whose ideas dotclaude reimplements. |

## Concepts and evidence

| Page | What it holds |
| --- | --- |
| [Design](Design) | The principles of dotclaude 1.0.0, and why each is in force. |
| [Decisions](Decisions) | The design decisions `D1` to `D47`. |
| [Usage-Evidence](Usage-Evidence) | The plans, the prices, the models, and the usage of one measured week. |
| [Prompt-Surface](Prompt-Surface) | The output style, the prompt sections, and the tool texts. |
| [Request-Build](Request-Build) | The system prompt sections, the attachments, and the cache of a request. |
| [Evals](Evals) | What the evals measure, and the Claude Code version that they need. |
| [Release-History](Release-History) | What changed in each release, and why. |

The [CHANGELOG](https://github.com/xsyetopz/dotclaude/blob/main/CHANGELOG.md) lists each release.
Its `[Unreleased]` section holds the changes that are not released yet.

## Source labels

The evidence pages label each fact with the source that it comes from.

| Label | Source |
| --- | --- |
| official | Anthropic documentation or support pages |
| binary | read from the installed Claude Code bundle, never patched |
| capture | a request body that Claude Code sent to a local listener |
| measured | a run or a transcript scan on the maintainer's machine |
| reported | user reports |
| inference | a conclusion from the facts above |

The binary facts in this wiki are for Claude Code `2.1.296`.
The extracts of the bundle are in the git-ignored `external/` folder, as [Claude-Code-Internals](Claude-Code-Internals) describes.
