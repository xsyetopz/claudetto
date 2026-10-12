# Decisions

This page lists the design decisions of dotclaude 0.28.0.
Each row gives the number, the title, and the page with the detail.
[Design](Design) holds the principles and the history.

| Decision | Title | Page |
| --- | --- | --- |
| D1 | Rule of Least Power | [Settings](Decisions-Settings) |
| D2 | No guard route, `settings.json` only | [Settings](Decisions-Settings) |
| D3 | Attachment and tool-description cuts by id | [Prompt](Decisions-Prompt) |
| D4 | Measured budget | [Prompt](Decisions-Prompt) |
| D5 | Who invokes what | [Settings](Decisions-Settings) |
| D6 | Status line | [Tools](Decisions-Tools) |
| D7 | Auto-fix hook (removed) | [Tools](Decisions-Reversed#tools) |
| D8 | Context7 skill | [Tools](Decisions-Tools) |
| D9 | Evals through `claude plugin eval` | [Tools](Decisions-Tools) |
| D10 | Schema extraction | [Settings](Decisions-Settings) |
| D11 | Spec store | [Tools](Decisions-Tools) |
| D12 | Agent frontmatter search | [Router](Decisions-Router) |
| D13 | No router | [Router](Decisions-Router) |
| D14 | Off switches | [Settings](Decisions-Settings) |
| D15 | dotclaude owns the system prompt | [Prompt](Decisions-Prompt) |
| D16 | Request capture and the 30K start | [Prompt](Decisions-Prompt) |
| D17 | Plugin and marketplace layout | [Layout](Decisions-Layout) |
| D18 | Separation of concerns, size bounds, bound tiers | [Layout](Decisions-Layout) |
| D19 | Runtimes | [Reversed](Decisions-Reversed#layout) |
| D20 | Remove `dotclaude-modder` | [Layout](Decisions-Layout) |
| D21 | Hand-off order | [Reversed](Decisions-Reversed#layout) |
| D22 | Context bound for subagents and the main session | [Tools](Decisions-Tools) |
| D23 | Development frictions | [Layout](Decisions-Layout) |
| D24 | Add-on plugins stay separate | [Layout](Decisions-Layout) |
| D25 | Agent roster | [Router](Decisions-Router) |
| D26 | Code graph through the CodeGraph CLI | [Tools](Decisions-Tools) |
| D27 | Measured facts over model reports | [Evidence](Decisions-Evidence) |
| D28 | Compliance by checks, not by prose | [Prompt](Decisions-Prompt) |
| D29 | Semantic line breaks | [Evidence](Decisions-Evidence) |
| D30 | Hold correct work under an unsupported claim | [Evidence](Decisions-Evidence) |
| D31 | Guard hooks fail open (`onFailure`) | [Guards](Guards) |
| D32 | Usage awareness, removed by D35 | [Context bound](Context-And-Handoff) |
| D33 | Three-column status line | [Status line](Status-Line) |
| D34 | Adherence by checks in code, with no new judge (now the `asks` slice) | [Core plugin](Architecture) |
| D35 | No proprietary formats | [Settings](Decisions-Settings#d35-no-proprietary-formats) |

The source of each decision was the design of the 0.28.0 change, in the OpenSpec flow of that release.
The spec store (D11) replaced that flow, so the change folder is no longer in the repository.
The facts behind the decisions were in the `research/` folder of that change.

## Related pages

- [Design](Design)
- [Plugin layout](Plugin-Layout)
- [Open items](Open-Items)
