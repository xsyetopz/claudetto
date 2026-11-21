# Instruction Placement Audit (2026-11-21)

REQ-TOOLS-032: each instruction claudetto and claudetto-spec ship is checked against the surface table in `plans/rebuild/prd/tools.md` ("Prompt" section). Result: no line moved. Every line on the wrong surface is either held by ADR-0177 with a measured-gain commit or is not a mechanical move.

## Doc Grounding

Routes are on `code` (code.claude.com/docs/en/), read through the clawdipedia-docs MCP on 2026-11-21.

- `output-styles`: a style "sets Claude's role, tone, and response format for every response"; project knowledge belongs in CLAUDE.md and "something that has to happen every time" in a hook.
- `features-overview`: CLAUDE.md is persistent project context ("Project conventions, always do X rules"); a skill is reusable instructions loaded on use; a hook is "automation that must run on every matching event"; a subagent is an isolated worker with its own context.
- `memory`: CLAUDE.md and rules carry persistent project instructions (matched by search; the page body was not read in full).
- `sub-agents` ("Configure subagents"): the `prompt` field is "the agent's system prompt, equivalent to the markdown body in file-based subagents". An agent body is therefore the subagent's own system prompt, the surface the table names for harness rules, and the output style does not reach it.
- `skills`, `hooks-guide`: matched by search and linked from `features-overview`; their bodies were not read in full.

## Scope and Method

- Output style: 17 paragraphs in `plugins/claudetto/output-styles/claudetto.md`.
- Agents: 19 paragraphs in `plugins/claudetto/agents/{Artemis,Athena,Heracles}.md`.
- Skills: 31 body lines in `plugins/claudetto/skills/review`, `plugins/claudetto-spec/skills/spec` and `spec-review`.
- Hook texts: about 110 model-facing strings under `plugins/*/hooks/**/*.ts`, found by a regex for string literals of seven or more words (tests skipped), plus a read of the files that build them. A string of fewer words, or one assembled from parts, may be missed. The `you-should-know` request prompts were enumerated by the same regex and read in part (`propose-text.ts`, `prompt.ts`, `draft.ts` headings), not line by line.
- Introducing commits for the output style come from `git log --reverse -- <file>` subjects and the commits named in REQ-TOOLS-031.

## Lines Moved

| Line | Old surface | New surface | Reason | Doc route |
| --- | --- | --- | --- | --- |
| none | - | - | No agent, skill or hook line is clearly misplaced without a measured-gain record; see the next tables | - |

## Output Style: Misplaced per Table, Held by ADR-0177

REQ-TOOLS-031 records that each paragraph traces to a measured run on 2.1.327 (ADR-0177). Worker commit a4a62c344 (not merged) shows the cost of dropping them. Nothing here moved.

| Paragraph (opening words) | Table surface | Commit |
| --- | --- | --- |
| "When a choice belongs to the user ... AskUserQuestion" | system prompt (tool use) | 917d88b97 |
| "Before a commit or push, read the check's exit status" | system prompt (task conduct) | ea8a04371 (0 of 15 against 9 of 18) |
| "Background subagents keep running through /clear" | system prompt (task conduct) | 3409889ea (8 of 8 against 8 of 16) |
| "When an action needs an input that no file ... holds" | system prompt (task conduct) | f2804f700; 1b094765a (r497i 6/6 against 0/6) |
| "Uncommitted edits in the working tree" | system prompt (task conduct) | d686402bc (3/3 against 0/3); de184e8ab |
| "A defect you find while working" | system prompt (task conduct) | 57e6bba94 (sib 6/6 against 0/6) |
| "A step that would touch something off-limits runs on a stand-in" | system prompt (task conduct) | bed24d9d1 |
| "A permission or approval prompt belongs to the user" | system prompt (permissions) | 853cd0969 (r171b 6/6 against 0/6) |
| "A test checks what a caller of the public interface can observe" | system prompt (task conduct) | 3d00f59ec (r466b 6/6 against 1/6) |
| "When a function's name and its body disagree" | system prompt (task conduct) | 4228a2d9c; 1b094765a |
| "A command started with `run_in_background` reports the exit status" | system prompt (tool recipe) | 407f41f04 (r451a 6/6 against 2/6) |
| "When the reply depends on the result of a command started with `run_in_background`" | system prompt (tool recipe) | 407f41f04 (r185a 6/6 against 1/6) |
| "Make one change that repeats across several places ... `perl -pi -e`" | system prompt (tool recipe) | 0d90f8c84 (ADR-0097) |
| "Edit files only inside the directory the session started in" | system prompt (task conduct) | 9a8df859d (starting tree, 6/6 against 2/6) |

## Output Style: On Surface

| Paragraph (opening words) | Table surface | Why it stays |
| --- | --- | --- |
| "Report "passes" or "done" after a run that could have failed" | output style (claudetto reporting rule) | REQ-TOOLS-031 names reporting rules as style content; b45f181ac, 393e360a7 |
| "Write a list of controls, buttons, or steps ... in backticks" | output style (format) | f2804f700 |
| "When the user tells you to stop ... "Stopped."" | output style (voice and length) | 9a8df859d (5/5 against 1/6) |

## Lines Left in Place Outside the Style

| Surface and lines | On the table's surface? | Why it stays |
| --- | --- | --- |
| Agent bodies (Artemis 6, Athena 5, Heracles 8 paragraphs): search method, report shape, permission prompt rule, Heracles git and test conduct, Heracles perl recipe | Yes | The body is the subagent's system prompt (`sub-agents`); subagents have their own system prompt and the output style does not reach them, so rules for tools, permissions, task conduct and report format can live only here. The permission paragraph repeats in each agent by design; the style copy covers the main loop. |
| `skills/review` body (6 lines): scope, defect report format, `!` shell injections | Yes | One task kind loaded on use (`skills`). The agent `claudetto:Athena` supplies the system prompt. |
| `skills/spec` (16 lines), `skills/spec-review` (9 lines) | Yes | One task kind each, loaded on use; the loop and the report line format are the task. |
| `spec` hook texts (`texts.ts`, `check/stop.ts`: amend rule, blocking-problems list) | Yes | Fire at stop and on `spec_check`, so they hold what must happen every time. The amend rule also appears in the `spec` skill; the hook copy is the enforcement and was not removed because the skill may not be loaded. |
| `guards/shell/notes.ts`, `guards/wall`, `guards/denial.ts`, `guards/memory.ts`, `delegation/{spawn,limit}.ts`, `git/trailer.ts`, `edit/perl.ts`, `goal/evidence.ts`, `goal/state.ts`, `goal/command.ts`, `patch/*` errors, `web/fetch.ts` replies, `notice/stop.ts` | Yes | Tool results, denials and reminders fired by a specific event; hooks per the table. |
| `handover/text.ts` fork prompt, `statusline/command.ts` prompt, `you-should-know/hooks/request/*` prompts | Yes | Each is the task prompt of a separate call, not session-wide instruction. |
| `prompt/compose.ts` tool-preference text | Yes | Rewrites the system prompt through `prompt.compose` (REQ-TOOLS-030). |
| `git/instructions.ts` `gitBlock` (4 rules plus attribution lines) | Not on the table | Task conduct (git rules) delivered in the Bash tool description, where Claude Code's stock git block sits, with the attribution lines the stock block carries (b1c9665a0). The table has no tool-description row. Moving it to the system prompt means a new `prompt.compose` edit that changes `system[2]`, which is not mechanical, so it is listed. |
| `pool/describe.ts`, `web/register.ts`, `goal/tools.ts`, `patch/texts.ts` tool descriptions | Not on the table | Per-tool usage recipes in tool descriptions, the surface the harness uses for tool schemas. The table has no row for it. Listed, not moved. |
| `settings/defaults.ts` `RETIRED_REMINDER_TEXTS` | Not shipped | Data for removing old env entries, not an instruction the model reads. |

## Result

- Lines checked: 17 style paragraphs, 19 agent paragraphs, 31 skill lines, about 110 hook strings.
- Moved: 0.
- Held per ADR-0177: 14 style paragraphs. On surface: 3 style paragraphs, all agent and skill lines, and the hook strings except the two groups below.
- Listed, neither moved nor held by a measured record: the Bash-description git block and the tool descriptions, because the table has no row for tool descriptions.

REQ-TOOLS-032 stays unticked: the table needs a tool-description row (or a decision that these groups belong in the system prompt) before every line is on its surface or held with evidence, and the 14 held paragraphs wait on a 2.1.330 eval.
