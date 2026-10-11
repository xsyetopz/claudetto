# Wiki page plan for 0.28.0

This plan is task 16.1 of `openspec/changes/dotclaude-0-28-0/`.
It lists each wiki page, its scope, and its state.
It maps each spec requirement to one page, and each design decision to one page.
Task 16.2 writes the pages.
The bound for a page is 300 lines.

## State words

- `keep`: the page stays, with small edits only.
- `rewrite`: the page stays, and the text changes to match the specs.
- `update`: the page is a list, and the entries change.
- `split`: the page is over its safe size once it gets new text, so part of it moves.
- `new`: the page does not exist yet.
- `release`: a frozen page of one release, which the plan does not change.

## Existing pages

| Page | Lines | State | Scope |
| --- | --- | --- | --- |
| `Attributions` | 30 | keep | Licenses and projects. |
| `Auto-Fix` | 59 | keep | Auto-fix at stop. |
| `Browser` | 110 | keep | Browser add-on and web search replacement. |
| `Claude-Mods` | 274 | keep | What a mod is and the mods API facts. **Over 250, watch the bound.** |
| `Code-Graph` | 105 | keep | Code graph add-on. |
| `Contributions` | 64 | keep | Policy ask and contribution steps. |
| `Design` | 274 | split | Overview with D1 to D5. D6 to D30 move to the Decisions pages. **Over 250, watch the bound.** |
| `Development` | 152 | keep | Commands and development frictions. |
| `Evals` | 104 | rewrite | Eval suite: arms, measures, grading, and cost limit. |
| `Evals-History` | 206 | keep | Eval run history. |
| `Guards` | 115 | keep | Guard layers and permission rules. Add the no-managed-file rule. |
| `Handoffs` | 75 | keep | Handoff notes and the handoff command. |
| `Home` | 77 | keep | Overview and position. Update for 0.28.0 text. |
| `Install` | 142 | keep | Install steps for the core plugin and add-ons. |
| `Managed-Drop-In` | 86 | keep | Managed drop-in reference. Review against D2. |
| `Off-Switches` | 128 | rewrite | Switch list: built-in plugins, parts, connectors, MCP servers, and agents off. |
| `Open-Items` | 63 | rewrite | Open items and recorded gaps. |
| `OpenSpec` | 93 | keep | OpenSpec install and delivery. |
| `Parts` | 118 | keep | Core plugin and add-on parts list. Also the part list for agents, commands, and features. |
| `Plans-and-Models` | 245 | keep | Plan detection, models, and cache facts. |
| `Profile-Keys` | 111 | rewrite | Settings keys with reason and scope, backup, dry run, and migration. |
| `Prompt-Surface` | 186 | rewrite | Start-of-session budget and the surface rules. |
| `Prompt-Variants` | 53 | rewrite | Prompt variant for each model. |
| `Quickstart` | 61 | keep | What a user sees at the start of a session. |
| `Release-History` | 30 | update | Index of release pages. Add 0.25 to 0.28 as the CHANGELOG gets them. |
| `Router` | 78 | rewrite | Router routes, cap, table, and explicit choices. |
| `Sandbox` | 222 | keep | Sandbox use and the sandbox text rule. |
| `Second-Opinion` | 116 | keep | Jev second opinion tool. |
| `Status-Line` | 119 | rewrite | Status line segments, rates, and settings. Watch the 300-line bound. |
| `Stop-Prompt-Hooks` | 86 | keep | History of prompt hooks on Stop. |
| `Usage-Evidence` | 163 | keep | Measured usage and the usage report. |
| `_Footer` | 1 | keep | Footer line. |
| `_Sidebar` | 37 | update | Navigation. Add the new pages and drop none. |
| `Release-0.1-0.2` to `Release-0.24` (23 pages) | 2295 total | release | Frozen release pages. Each is under 300 lines (largest: 252). |

No existing page is over 300 lines.
`Design` has 274 lines and is the page to split, so the new `Decisions-*` pages hold D6 to D30.
`Claude-Mods` has 274 lines and `Plans-and-Models` has 245 lines, so a rewrite must not add more than 25 lines to either.

## New pages

| Page | State | Scope |
| --- | --- | --- |
| `Agents` | new | Roster of five agents, description rules, pins, and body rules. |
| `Commands` | new | User-invoked commands, small listing, setup, drift check, and script before model. |
| `Context-Bound` | new | Context bound for subagents and the main session, report length, and bounds. |
| `Library-Docs` | new | Docs skill add-on, free tier, call count, and failure rules. |
| `Plugin-Layout` | new | Plugin and marketplace layout, features, dependency rule, add-ons, and modder removal. |
| `Runtime-Rules` | new | Runtime rules: Node 22.18 and Bun, no `node:` import in the module graph, three bound tiers. |
| `Semantic-Line-Breaks` | new | Sentence-split formatter, rewrite points, and chat rule. |
| `Settings-Schema` | new | Generated settings schema, keys, managed-only keys, and pin. |
| `System-Prompt` | new | System prompt ownership, byte budget, stability, and no-loss rules. |
| `Decisions` | new | Index of D1 to D30 with one line each and the page of each. |
| `Decisions-Settings` | new | D1, D2 and its detail, D5, D10, and D14. |
| `Decisions-Prompt` | new | D3, D4, D15, D16, and D28. |
| `Decisions-Router` | new | D12, D13, and D25. |
| `Decisions-Tools` | new | D6, D7, D8, D9, D11, D22, and D26. |
| `Decisions-Layout` | new | D17, D18, D19, D20, D21, D23, and D24. |
| `Decisions-Evidence` | new | D27, D29, and D30. |

## Requirement map

Each row maps one requirement to one page.
The same title can occur in two specs, so a row has the spec name as well.

| Spec | Requirement | Page |
| --- | --- | --- |
| `agent-definitions` | Description length | `Agents` |
| `agent-definitions` | Description content | `Agents` |
| `agent-definitions` | Model and effort from the router | `Agents` |
| `agent-definitions` | Pins in one place | `Agents` |
| `agent-definitions` | Rules repeated in the agent body | `Agents` |
| `agent-definitions` | Keep the work under an unsupported claim | `Agents` |
| `agent-definitions` | Roster of five agents | `Agents` |
| `agent-definitions` | Built-in agents off | `Off-Switches` |
| `auto-fix` | Fix at stop | `Auto-Fix` |
| `auto-fix` | Project tools only | `Auto-Fix` |
| `auto-fix` | Edited files only | `Auto-Fix` |
| `auto-fix` | Report only what remains | `Auto-Fix` |
| `auto-fix` | Block once | `Auto-Fix` |
| `auto-fix` | Fail quiet | `Auto-Fix` |
| `code-graph` | Add-on plugin | `Code-Graph` |
| `code-graph` | Opt-in for each project | `Code-Graph` |
| `code-graph` | CLI only | `Code-Graph` |
| `code-graph` | Session start | `Code-Graph` |
| `code-graph` | Graph context at a search | `Code-Graph` |
| `code-graph` | Fresh index | `Code-Graph` |
| `code-graph` | Measured effect | `Code-Graph` |
| `commands` | User invokes only what needs consent | `Commands` |
| `commands` | Small listing | `Commands` |
| `commands` | Setup | `Commands` |
| `commands` | Handoff | `Handoffs` |
| `commands` | Drift check | `Commands` |
| `commands` | Script before model | `Commands` |
| `commands` | No third-party skills | `Commands` |
| `context-bound` | File reads through Read | `Context-Bound` |
| `context-bound` | Bash file prints denied | `Context-Bound` |
| `context-bound` | Subagent report at the bound | `Context-Bound` |
| `context-bound` | Report length | `Context-Bound` |
| `context-bound` | Context figure from the measure | `Context-Bound` |
| `context-bound` | No model-made context figures | `Context-Bound` |
| `context-bound` | Bounds in one place | `Context-Bound` |
| `context-bound` | Usage report | `Usage-Evidence` |
| `eval-suite` | Two arms | `Evals` |
| `eval-suite` | Runs in a container | `Evals` |
| `eval-suite` | Same conditions | `Evals` |
| `eval-suite` | Hidden outcome check | `Evals` |
| `eval-suite` | Tamper check | `Evals` |
| `eval-suite` | Effectiveness measures | `Evals` |
| `eval-suite` | Efficiency measures | `Evals` |
| `eval-suite` | Behavior measures | `Evals` |
| `eval-suite` | Paired comparison | `Evals` |
| `eval-suite` | LLM grader as last resort | `Evals` |
| `eval-suite` | Credentials from a local file | `Evals` |
| `eval-suite` | Router search | `Evals` |
| `eval-suite` | Variant arms | `Evals` |
| `eval-suite` | No-delegation arm | `Evals` |
| `eval-suite` | Cost limit | `Evals` |
| `eval-suite` | Private cases | `Evals` |
| `library-docs` | Docs skill in an add-on | `Library-Docs` |
| `library-docs` | Free tier first | `Library-Docs` |
| `library-docs` | Few calls | `Library-Docs` |
| `library-docs` | Honest failure | `Library-Docs` |
| `library-docs` | No secrets in queries | `Library-Docs` |
| `library-docs` | Pinned and quiet | `Library-Docs` |
| `model-router` | Deterministic router | `Router` |
| `model-router` | Applied per request | `Router` |
| `model-router` | Router cap | `Router` |
| `model-router` | Router respects explicit choices | `Router` |
| `model-router` | Roster | `Router` |
| `model-router` | Table from evals | `Router` |
| `model-router` | Cache care in the main loop | `Plans-and-Models` |
| `model-router` | Open items recorded | `Open-Items` |
| `openspec-integration` | One delivery | `OpenSpec` |
| `openspec-integration` | Name-only listing | `OpenSpec` |
| `openspec-integration` | Core workflows | `OpenSpec` |
| `openspec-integration` | Telemetry off | `OpenSpec` |
| `openspec-integration` | User consent | `OpenSpec` |
| `plugin-layout` | Documented plugin and marketplace layout | `Plugin-Layout` |
| `plugin-layout` | Bounds in three tiers | `Runtime-Rules` |
| `plugin-layout` | Runtimes | `Runtime-Rules` |
| `plugin-layout` | Modder removed | `Plugin-Layout` |
| `plugin-layout` | General-purpose roles | `Plugin-Layout` |
| `plugin-layout` | Feature layout and dependency rule | `Plugin-Layout` |
| `plugin-layout` | Add-on plugins | `Plugin-Layout` |
| `prompt-surface` | Start-of-session budget | `Prompt-Surface` |
| `prompt-surface` | Deferred tools stay on | `Prompt-Surface` |
| `prompt-surface` | Prompt mod shapes the prompt | `Prompt-Surface` |
| `prompt-surface` | Sandbox text matches enforcement | `Sandbox` |
| `prompt-surface` | Human stays in the loop | `Prompt-Surface` |
| `prompt-surface` | Output style size | `Prompt-Surface` |
| `prompt-surface` | First request captured | `Prompt-Surface` |
| `prompt-surface` | Same start on every surface | `Prompt-Surface` |
| `prompt-surface` | Tool descriptions cut by id | `Prompt-Surface` |
| `second-opinion` | Second-opinion tool | `Second-Opinion` |
| `second-opinion` | Neutral questions | `Second-Opinion` |
| `second-opinion` | Jev with a key | `Second-Opinion` |
| `second-opinion` | Reviewer fallback | `Second-Opinion` |
| `second-opinion` | Question pick only with a key | `Second-Opinion` |
| `second-opinion` | Browser skill in its own add-on | `Browser` |
| `second-opinion` | Browser replaces web search | `Browser` |
| `semantic-line-breaks` | Sentence-split formatter | `Semantic-Line-Breaks` |
| `semantic-line-breaks` | Silent rewrite before a write | `Semantic-Line-Breaks` |
| `semantic-line-breaks` | Commit and pull request text | `Semantic-Line-Breaks` |
| `semantic-line-breaks` | No rewrite after a write | `Semantic-Line-Breaks` |
| `semantic-line-breaks` | Chat measure and prompt rule | `Semantic-Line-Breaks` |
| `semantic-line-breaks` | Probes first | `Semantic-Line-Breaks` |
| `settings-profile` | Session retention left to the user | `Profile-Keys` |
| `settings-profile` | Each key has a reason | `Profile-Keys` |
| `settings-profile` | Scope of each key | `Profile-Keys` |
| `settings-profile` | Backup before write | `Profile-Keys` |
| `settings-profile` | Dry run | `Profile-Keys` |
| `settings-profile` | Migration from 0.27.0 | `Profile-Keys` |
| `settings-profile` | Git instructions | `Profile-Keys` |
| `settings-profile` | Effort cap and model list | `Profile-Keys` |
| `settings-profile` | Schema reference | `Settings-Schema` |
| `settings-profile` | Subagent cache lifetime | `Plans-and-Models` |
| `settings-schema` | Generated from the installed version | `Settings-Schema` |
| `settings-schema` | Complete keys | `Settings-Schema` |
| `settings-schema` | Managed-only keys | `Settings-Schema` |
| `settings-schema` | Shipped and pinned | `Settings-Schema` |
| `status-line` | Vanilla order | `Status-Line` |
| `status-line` | Public status data | `Status-Line` |
| `status-line` | Core segments | `Status-Line` |
| `status-line` | Pace of each limit | `Status-Line` |
| `status-line` | Run-out time | `Status-Line` |
| `status-line` | Burn rate | `Status-Line` |
| `status-line` | Reset credits | `Status-Line` |
| `status-line` | Cache segment | `Status-Line` |
| `status-line` | Rates | `Status-Line` |
| `status-line` | Place segments | `Status-Line` |
| `status-line` | OpenSpec segment | `Status-Line` |
| `status-line` | Look | `Status-Line` |
| `status-line` | Fit to width | `Status-Line` |
| `status-line` | Subagent status line | `Status-Line` |
| `status-line` | Settings | `Status-Line` |
| `status-line` | No side effects | `Status-Line` |
| `system-prompt` | dotclaude owns the system prompt | `System-Prompt` |
| `system-prompt` | One variant for each model | `Prompt-Variants` |
| `system-prompt` | Byte budget for each variant | `System-Prompt` |
| `system-prompt` | Stable inside a session and an agent | `System-Prompt` |
| `system-prompt` | Commit attribution in the prompt | `System-Prompt` |
| `system-prompt` | Human stays in the loop | `System-Prompt` |
| `system-prompt` | Evidence before undoing finished work | `System-Prompt` |
| `system-prompt` | No loss against the default prompt | `System-Prompt` |
| `system-prompt` | Compact prompt gap recorded | `Open-Items` |
| `vanilla-surface` | Built-in plugins off | `Off-Switches` |
| `vanilla-surface` | Forced-off parts | `Off-Switches` |
| `vanilla-surface` | Never-set list | `Off-Switches` |
| `vanilla-surface` | No managed file, guard not seated | `Guards` |
| `vanilla-surface` | claude.ai sync off | `Off-Switches` |
| `vanilla-surface` | claude.ai connectors off | `Off-Switches` |
| `vanilla-surface` | Built-in MCP servers off | `Off-Switches` |
| `vanilla-surface` | No binary change | `Off-Switches` |

## Decision map

Each row maps one design decision to one page.
`Design` keeps the summary of all decisions and links to `Decisions`.

| Decision | Title | Page |
| --- | --- | --- |
| D1 | Rule of Least Power | `Decisions-Settings` |
| D2 | No guard route, `settings.json` only | `Decisions-Settings` |
| D3 | Attachment and tool-description cuts by id | `Decisions-Prompt` |
| D4 | Measured budget | `Decisions-Prompt` |
| D5 | Who invokes what | `Decisions-Settings` |
| D6 | Status line | `Decisions-Tools` |
| D7 | Auto-fix hook | `Decisions-Tools` |
| D8 | Context7 skill | `Decisions-Tools` |
| D9 | Eval harness | `Decisions-Tools` |
| D10 | Schema extraction | `Decisions-Settings` |
| D11 | OpenSpec | `Decisions-Tools` |
| D12 | Router table search | `Decisions-Router` |
| D13 | Router routes and cap | `Decisions-Router` |
| D14 | Off switches | `Decisions-Settings` |
| D15 | dotclaude owns the system prompt | `Decisions-Prompt` |
| D16 | Request capture and the 30K start | `Decisions-Prompt` |
| D17 | Plugin and marketplace layout | `Decisions-Layout` |
| D18 | Separation of concerns, size bounds, bound tiers | `Decisions-Layout` |
| D19 | Runtimes | `Decisions-Layout` |
| D20 | Remove `dotclaude-modder` | `Decisions-Layout` |
| D21 | Hand-off order | `Decisions-Layout` |
| D22 | Context bound for subagents and the main session | `Decisions-Tools` |
| D23 | Development frictions | `Decisions-Layout` |
| D24 | Add-on plugins stay separate | `Decisions-Layout` |
| D25 | Agent roster | `Decisions-Router` |
| D26 | Code graph through the CodeGraph CLI | `Decisions-Tools` |
| D27 | Measured facts over model reports | `Decisions-Evidence` |
| D28 | Compliance by checks, not by prose | `Decisions-Prompt` |
| D29 | Semantic line breaks | `Decisions-Evidence` |
| D30 | Hold correct work under an unsupported claim | `Decisions-Evidence` |

## Navigation

`Home` and `_Sidebar` stay in the plan.
`_Sidebar` gets these changes:

- Under Reference, add `Agents`, `Commands`, `Settings-Schema`, and `System-Prompt`.
- Under Guides, add `Library-Docs` and `Semantic-Line-Breaks`.
- Under Develop, add `Plugin-Layout` and `Runtime-Rules`.
- Under Concepts and evidence, add `Context-Bound` and `Decisions`, and list the `Decisions-*` pages under `Decisions`.
- Keep every current entry.

`Home` gets a short list of the 0.28.0 changes and links to `Decisions` and `Plugin-Layout`.

## Counts

- Existing pages: 56, with 23 release pages.
- New pages: 16.
- Requirements mapped: 147.
- Decisions mapped: 30.
