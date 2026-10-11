# Home

dotclaude is an opinionated Claude Code plugin marketplace for software engineering.
It keeps only the parts that Claude Code does not cover, and it optimizes for the most quality per unit of usage quota, not for speed.
Since 0.27 the core plugin uses only official extension points: settings, permission rules, the sandbox, one output style, agents, skills, and one hooks module.
If Claude does something because of dotclaude and you ask "why did you do that?", the answer is in these pages.

## What it does

- Gives permission rules and a sandbox in the [settings snippet](Settings-Snippet), so that Claude Code asks before destructive, public, and secret-reading actions.
- Gives an `ask` rule for each recursive `rm` in the settings snippet (the plugin alone gives none), and asks before the first contact with a repository of another owner that has an AI policy file.
- Gives settings in the snippet that turn off compaction and set a 300K context window, so that a session stops at the limit and you start fresh with `/clear`.
  The plugin itself ships an empty `settings.json`.
- Forces one output style (role, tone, and format) and puts the working rules in the system prompt.
- Gives Claude five agents with a model, an effort, and a turn limit each ([Agents](Agents)).
- Works with [OpenSpec](OpenSpec) for the task list, so work continues after `/clear` with the `openspec-apply-change` skill.
- Shows model, effort, context, the OpenSpec change, and the 5-hour limit in a status line.

## The plugins

Each plugin has one reference page.
The page says what the plugin does, how to install it, and what it holds: skills, bins, hooks, options, and limits.
Each add-on works without the core plugin.

| Plugin | What it does | Reference |
| --- | --- | --- |
| `dotclaude` | The core: output style, system prompt rules, agents, guards, status line, and drift check. | [Core plugin](Core-Plugin) |
| `dotclaude-codegraph` | Gives Claude the code graph of a project from the `codegraph` CLI. | [Code graph](Code-Graph) |
| `dotclaude-browser` | Drives a browser and answers `WebSearch` in the headless browser. | [Browser](Browser) |
| `dotclaude-jev` | A second opinion on a decision from TypeSafe Jev. | [Second opinion](Second-Opinion) |
| `dotclaude-docs` | Current library docs from Context7. | [Library docs](Library-Docs) |
| `dotclaude-sessions` | Measures the start of a session and the usage of each run. | [Sessions](Sessions) |
| `dotclaude-lab` | Tools for plugin authors: sandbox, capture, schema, and eval compare. | [Lab](Lab) |

## New in 0.28.0

- A [system prompt](System-Prompt) variant for each model.
- A [context bound](Context-Bound) for subagents.
- [Semantic line breaks](Semantic-Line-Breaks) in written text, with no model token.
- A new [plugin layout](Plugin-Layout), and the plugins `dotclaude-sessions` and `dotclaude-lab`.
- Evals through `claude plugin eval` ([Evals](Evals)), with a suite of 16 cases in `plugins/dotclaude/evals/` and `just eval` to run it.
- The [decisions](Decisions) D1 to D35 with their evidence.
- Removed: the setup profile, the router, the handoff skill, usage state, the Bun eval harness and the root `evals/` folder (design D35), and `dotclaude-modder`.
  The [settings snippet](Settings-Snippet) replaces the profile.

## The position

| Position | What it means |
| --- | --- |
| Quality per quota over speed | Usage limits stop work. dotclaude spends quota where it buys quality, and it locks fast mode off. |
| Quality over quantity | One checked change is worth more than several unchecked changes. Claude reproduces a bug before it fixes it, and it reports what it did not check. |
| Official points over runtime code | When Claude Code has a setting, a rule, or a hook for a need, dotclaude uses it and writes no runtime code. |
| Evidence over habit | Each bound comes from a measurement, an official source, or a reverse-read of the Claude Code binary. |
| The user decides | Rules ask before hard-to-reverse or public actions, and they never approve anything. The setup skill shows every step before it runs. |

## Where to read

| Page | Read it to |
| --- | --- |
| [Quickstart](Quickstart) | See what happens in a first session. |
| [Install](Install) | Install the marketplace and the plugins. |
| [Settings snippet](Settings-Snippet) | Copy the keys that Claude Code needs. See also [snippet keys](Settings-Snippet-Keys) and [schema](Settings-Schema). |
| [Hooks](Hooks) | See each hook of each plugin, its event, and what it does. |
| [Troubleshooting](Troubleshooting) | Fix a symptom. |
| [Undocumented reads](Undocumented-Reads) | See what dotclaude reads that Claude Code does not document, and how it breaks. |
| [Guards](Guards) | Learn what asks, what denies, and what the sandbox does. |
| [Development](Development) and [Sandbox](Sandbox) | Change dotclaude and test a checkout. |
| [Attributions](Attributions) | See the projects whose ideas dotclaude reimplements. |

## Concepts and evidence

| Page | What it holds |
| --- | --- |
| [Design](Design) | The 0.27 rebuild, design principles, and rejected alternatives. |
| [Decisions](Decisions) | The design decisions D1 to D35. |
| [Usage evidence](Usage-Evidence) | Where one Max 20x week of usage went, and what that means on Pro. |
| [Plans and models](Plans-and-Models) | Prices, model fit, and effort. |
| [Prompt surface](Prompt-Surface) | What a request contains, the simple prompt, and the forced style. |
| [Eval history](Evals-History) | The eval runs of the 0.4 to 0.28 releases. |
| [Claude mods](Claude-Mods) | The plugin hooks modules of Claude Code, and the gaps. |
| [Open items](Open-Items) | Work still to measure or decide. |
| [Release history](Release-History) | What changed in each older release, and why. |

The [CHANGELOG](https://github.com/xsyetopz/dotclaude/blob/main/CHANGELOG.md) lists the current release.

## Source labels

The evidence pages give the proof for each choice, and each fact there has one of these labels.
A choice with no label is the maintainer's decision, and the page says so.

| Label | Source |
| --- | --- |
| official | Anthropic documentation or support pages |
| binary | read from the installed Claude Code bundle, never patched |
| capture | a request body that Claude Code sent to a local listener |
| measured | a run or a transcript scan on the maintainer's machine |
| reported | user reports, weighed by score and agreement |
| inference | a conclusion from the facts above |

The 0.27 facts date from Claude Code 2.1.292.
The older evidence dates from 2026-09-26 to 2026-10-04 and Claude Code 2.1.283 to 2.1.289.
Dollar figures are API-equivalent list prices.
How a subscription weights cache reads against output is not published.
