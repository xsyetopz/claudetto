# Decisions

This page is the index of the design decisions of claudetto.
Read it to find the page that holds the detail of a decision.
Each row gives the number, the title, and the page with the detail.
[Design](Design) holds the principles.

The ids `D1` to `D47` come from dotclaude 1.0.0 and stay as they were.
The ids from `D48` are new in claudetto 0.1.0.
[Engine Facts](Decisions-Engine) holds the facts of the engine that a change must not break.
A missing id is a removed decision.
The removed ids are `D7`, `D11`, `D19`, `D20`, `D21`, `D32`, `D33`, `D35`, `D36`, `D40`, and `D41`.
They described the removed design of dotclaude 1.0.0, such as the spec store, the append-only event log, and `/dotclaude:handoff`.
A kept decision whose basis changed in 0.1.0 says so in its section and points to `openspec/changes/claudetto-0-1-0/design.md`.

The restart has its own list of decisions in `openspec/changes/claudetto-0-1-0/design.md`.
Its numbers `D1`, `D2`, `D8`, and the others are not the numbers on this page.
This page always writes "(D3 there)" when it cites that file.

| Decision | Title | Page |
| --- | --- | --- |
| D1 | Rule of Least Power | [Settings](Decisions-Settings) |
| D2 | No guard route, `settings.json` only | [Settings](Decisions-Settings) |
| D3 | Tool-description and section cuts by id | [Prompt](Decisions-Prompt) |
| D4 | Measured budget | [Prompt](Decisions-Prompt) |
| D5 | Who invokes what | [Settings](Decisions-Settings) |
| D6 | Status line | [Tools](Decisions-Tools) |
| D8 | Context7 skill | [Tools](Decisions-Tools) |
| D9 | Evals through `claude plugin eval` | [Tools](Decisions-Tools) |
| D10 | Schema extraction | [Settings](Decisions-Settings) |
| D12 | Agent frontmatter search | [Router](Decisions-Router) |
| D13 | No router, the main loop keeps the session choice | [Router](Decisions-Router) |
| D14 | Off switches | [Settings](Decisions-Settings) |
| D15 | claudetto owns the system prompt | [Prompt](Decisions-Prompt) |
| D16 | Request capture and the session start | [Prompt](Decisions-Prompt) |
| D17 | Plugin and marketplace layout | [Layout](Decisions-Layout) |
| D18 | Separation of concerns, size bounds, and bound tiers | [Layout](Decisions-Layout) |
| D22 | Context bound for subagents and the main session | [Tools](Decisions-Tools) |
| D23 | Development frictions | [Layout](Decisions-Layout) |
| D24 | Add-on plugins stay separate | [Layout](Decisions-Layout) |
| D25 | Agent roster | [Router](Decisions-Router) |
| D26 | Code graph through the CodeGraph CLI | [Tools](Decisions-Tools) |
| D27 | Measured facts over model reports | [Evidence](Decisions-Evidence) |
| D28 | Compliance by checks, not by prose | [Prompt](Decisions-Prompt) |
| D29 | Semantic line breaks | [Evidence](Decisions-Evidence) |
| D30 | Hold work that is right under an unsupported claim | [Evidence](Decisions-Evidence) |
| D31 | Guard hooks fail open | [Hook Events](Hook-Events) |
| D34 | Adherence by checks in code, with no new judge (now the `asks` slice, see D43) | [Architecture](Decisions-Architecture) |
| D37 | Ports and adapters inside vertical slices | [Architecture](Decisions-Architecture) |
| D38 | A generated composition root | [Architecture](Decisions-Architecture) |
| D39 | One hook module in place of classic command hooks | [Architecture](Decisions-Architecture) |
| D42 | Zero token cost where a hook, a script, or a CLI can do the work | [Architecture](Decisions-Architecture) |
| D43 | `asks` only on a weaker check or discarded work | [Architecture](Decisions-Architecture) |
| D44 | Jev is a slice of the core plugin, with a small model as the fallback | [Architecture](Decisions-Architecture) |
| D45 | Add-ons import nothing from the core plugin or from each other | [Architecture](Decisions-Architecture) |
| D46 | Bounds in three tiers | [Architecture](Decisions-Architecture) |
| D47 | Arrow functions, plain data, and classes only for state | [Architecture](Decisions-Architecture) |
| D48 | User notices through `$.ui.log`, not a transcript row | [Engine Facts](Decisions-Engine) |
| D49 | No catch-all in a hook that calls `next` first | [Engine Facts](Decisions-Engine) |
| D50 | A marker in `$.env` for each `Bash` call of Claude | [Engine Facts](Decisions-Engine) |
| D51 | The sandbox is the hard stop, and setup writes it | [Engine Facts](Decisions-Engine) |
| D52 | Each adapter keeps its own `$` calls | [Engine Facts](Decisions-Engine) |
| D53 | A plugin verdict only makes a call stricter | [Engine Facts](Decisions-Engine) |
| D54 | The attribution reminder in place of `includeGitInstructions` | [Engine Facts](Decisions-Engine) |
| D55 | No session-wide env through `CLAUDE_ENV_FILE` | [Engine Facts](Decisions-Engine) |
| D56 | Toolchain facts come from the environment, not from model memory | [Engine Facts](Decisions-Engine) |
| D57 | A plugin `bin/` command is named by its path, not by its bare name | [Engine Facts](Decisions-Engine) |
| D58 | `Stop` sees the reply after the user and gives the background tasks | [Engine Facts](Decisions-Engine) |
| D59 | A local background command has no time limit | [Engine Facts](Decisions-Engine) |
| D60 | The built-in read dedup covers only the same range | [Engine Facts](Decisions-Engine) |
| D61 | A `tool.call` hook sees the outcome of the permission dialog | [Engine Facts](Decisions-Engine) |
| D62 | Start context, served model, and fetch timeout come from three documented points | [Session Facts](Decisions-Session) |
| D63 | The cost of the judge comes from its own `usage` | [Session Facts](Decisions-Session) |

## Related Pages

- [Design](Design)
- [Plugin Layout](Plugin-Layout)
