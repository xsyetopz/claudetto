# Decisions

This page lists the design decisions of dotclaude 1.0.0.
Each row gives the number, the title, and the page with the detail.
A row of a reversed decision also links its section in [Decisions-Reversed](Decisions-Reversed).
[Design](Design) holds the principles and the history.

| Decision | Title | Page |
| --- | --- | --- |
| D1 | Rule of Least Power | [Settings](Decisions-Settings) |
| D2 | No guard route, `settings.json` only | [Settings](Decisions-Settings) |
| D3 | Tool-description and section cuts by id | [Prompt](Decisions-Prompt) |
| D4 | Measured budget | [Prompt](Decisions-Prompt) |
| D5 | Who invokes what | [Settings](Decisions-Settings) |
| D6 | Status line | [Tools](Decisions-Tools) |
| D7 | Auto-fix hook (removed) | [Tools](Decisions-Reversed#tools) |
| D8 | Context7 skill | [Tools](Decisions-Tools) |
| D9 | Evals through `claude plugin eval` | [Tools](Decisions-Tools) |
| D10 | Schema extraction | [Settings](Decisions-Settings) |
| D11 | Spec store | [Tools](Decisions-Tools) |
| D12 | Agent frontmatter search | [Router](Decisions-Router) |
| D13 | No router, the main loop keeps the session choice | [Router](Decisions-Router) |
| D14 | Off switches | [Settings](Decisions-Settings) |
| D15 | dotclaude owns the system prompt | [Prompt](Decisions-Prompt) |
| D16 | Request capture and the 30K start | [Prompt](Decisions-Prompt) |
| D17 | Plugin and marketplace layout | [Layout](Decisions-Layout) |
| D18 | Separation of concerns, size bounds, and bound tiers | [Layout](Decisions-Layout) |
| D19 | Runtimes | [Reversed](Decisions-Reversed#layout) |
| D20 | Remove `dotclaude-modder` | [Layout](Decisions-Layout) |
| D21 | Hand-off order | [Reversed](Decisions-Reversed#layout) |
| D22 | Context bound for subagents and the main session | [Tools](Decisions-Tools) |
| D23 | Development frictions | [Layout](Decisions-Layout) |
| D24 | Add-on plugins stay separate | [Layout](Decisions-Layout) |
| D25 | Agent roster | [Router](Decisions-Router), reversed in part in [Decisions-Reversed](Decisions-Reversed#router) |
| D26 | Code graph through the CodeGraph CLI | [Tools](Decisions-Tools) |
| D27 | Measured facts over model reports | [Evidence](Decisions-Evidence), reversed in part in [Decisions-Reversed](Decisions-Reversed#evidence) |
| D28 | Compliance by checks, not by prose | [Prompt](Decisions-Prompt), item 2 reversed in [Decisions-Reversed](Decisions-Reversed#prompt) |
| D29 | Semantic line breaks | [Evidence](Decisions-Evidence) |
| D30 | Hold correct work under an unsupported claim | [Evidence](Decisions-Evidence) |
| D31 | Guard hooks fail open (`onFailure`) | [Guards](Guards) |
| D32 | Usage awareness, back in 1.0.0 as the saved sample and the context trigger | [Context bound](Context-And-Handoff) |
| D33 | Three-column status line | [Status line](Status-Line) |
| D34 | Adherence by checks in code, with no new judge (now the `asks` slice) | [Core plugin](Architecture) |
| D35 | No proprietary formats | [Reversed](Decisions-Reversed#settings) |
| D36 | Rebuild with no 0.28.0 or 0.29.0 code | [Architecture](Decisions-Architecture) |
| D37 | Ports and adapters inside vertical slices | [Architecture](Decisions-Architecture) |
| D38 | A generated composition root | [Architecture](Decisions-Architecture) |
| D39 | One hook module in place of classic command hooks | [Architecture](Decisions-Architecture) |
| D40 | Spec store in place of OpenSpec | [Architecture](Decisions-Architecture) |
| D41 | An append-only event log in place of `state.json` | [Architecture](Decisions-Architecture) |
| D42 | Zero token cost where a hook, a script, or a CLI can do the work | [Architecture](Decisions-Architecture) |
| D43 | `asks` only on a weaker check | [Architecture](Decisions-Architecture) |
| D44 | Jev is a slice of the core plugin, with a small model as the fallback | [Architecture](Decisions-Architecture) |
| D45 | Add-ons import nothing from the core plugin or from each other | [Architecture](Decisions-Architecture) |
| D46 | Bounds in three tiers | [Architecture](Decisions-Architecture) |
| D47 | Arrow functions, plain data, and classes only for state | [Architecture](Decisions-Architecture) |

## Sources

The decisions of 1.0.0 come from the change folder `.dotclaude/spec/changes/1.0.0/`.
The file `change.md` holds the decisions of the user, and the file `design.md` holds the architecture.
D1 to D35 came from the design of the 0.28.0 change.
Some group pages cite the probes of the 0.28.0 work.

## Related pages

- [Design](Design)
- [Plugin layout](Plugin-Layout)
- [Open items](Open-Items)
