# Home

This wiki is about `claudetto`, a plugin marketplace for Claude Code.
For Claude Code itself, see [Claude Code Docs](#claude-code-docs).

## `claudetto` 0.3.0

`claudetto` is a plugin marketplace for software engineering with Claude Code.
It changes Claude Code with the Mod API, settings, hooks, skills, agents, and output styles.
It does not patch the program.
Its goal is the best quality for the lowest token cost.
`claudetto` needs Claude Code `2.1.309` or later.

For example, the permission gate of the `guard` slice lets a safe command run, asks before a command that can lose work for good, and denies a command that can harm the system.

### Start Here

- [Overview](Overview): what each plugin and each feature is.
- [Install](Install): add the marketplace and the plugins.
- [Quickstart](Quickstart): see what happens in a first session.
- [Troubleshooting](Troubleshooting): fix a symptom.
- [Architecture](Architecture): how the core plugin is built.

### Slices

The core plugin has 13 slices with code and one style.
Each has a page:
[Agents](Agents), [Decide](Decide), [Finish](Finish), [Ground](Ground), [Guard](Guard), [Handoff](Handoff), [Notes](Notes), [Session Hygiene](Hygiene), [Prompt](Prompt), [Setup](Setup), [Spec](Spec), [Status Line](Status-Line), and [Styles](Styles).

### Add-Ons

Each add-on is a separate plugin, and it works without the core plugin.

| Plugin | What it does | Page |
| --- | --- | --- |
| `claudetto-browser` | Drives a browser with `agent-browser`. | [Browser](Browser) |
| `claudetto-docs` | Gets current docs of libraries and APIs. | [Library Docs](Library-Docs) |

The marketplace is on [Add-Ons](Add-Ons).

### More Pages

| Page | What it holds |
| --- | --- |
| [Settings Snippet](Settings-Snippet) | The keys that Claude Code needs. |
| [Bounds](Bounds) | The limits of the runtime, the slices, and the add-ons. |
| [Design](Design) and [Decisions](Decisions) | The design principles, and why each is in force. |
| [Evidence](Evidence) and [Evals](Evals) | The measured facts, and what the evals measure. |
| [Development](Development) and [Sandbox](Sandbox) | How to change `claudetto` and test a checkout. |
| [Attributions](Attributions) | The projects whose ideas `claudetto` reimplements. |
| [Release History](Release-History) | Where the notes of each release are. |

## Claude Code Docs

This wiki does not document Claude Code itself.
The [Claude Code docs](https://xsyetopz.github.io/claude-code-docs/) site holds the reference of how Claude Code works.
It has an optional MCP server, and a lightweight skill that you add with `bunx skills add xsyetopz/claude-code-docs-skills`.

## Sources

The CHANGELOG at [GitHub](https://github.com/xsyetopz/claudetto/blob/main/CHANGELOG.md) lists each release of `claudetto`.
