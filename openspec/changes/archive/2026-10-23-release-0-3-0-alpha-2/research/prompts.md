# Default Claude Code 2.1.309 Prompt Texts Against the Dossiers

A worker agent wrote this report, and the main session saved it, because the `ground` hook blocks the `Write` of a subagent (finding F10).
Raw data: `research/raw/prompts-*.txt` (`index`, `pages`, `tools`, `claudetto-sizes`, `settings`, `dossier`, `calc`).
Sizes are characters from the capture pages of `claude-code-docs/docs/prompts/`.
Token numbers are characters divided by 4, and they are estimates.
This file does not repeat `failures.md`.

## What Is in Force

- `plugins/claudetto/settings.json` sets `"agent": "claudetto:main"`.
- Per `prompts/agent-main.md`, an agent file replaces the body `system[2]`, which drops from 5,627 to 58 characters.
- `agents/main.md` (9,351 characters) takes the place of the `Harness`, `Memory`, `Environment`, and `Context management` sections.
- Still sent from the default: the identity line, the environment message, the tool list, the subagent notes, the system reminders, and the compaction prompt.
- Levers in force: the `SNIPPET` env keys, `permissions.deny`, `disableBundledSkills`, and `autoMemoryEnabled: false`.
- Mods in force: `prompt.context`, `tool.describe`, `prompt.attachment`, and `agent.offer`.
- Few true conflicts remain. Most findings are text that the default carried and the replacement dropped.

## 1. Each Default Text Part

| Part | Chars | Claudetto now | Verdict | Surface |
| --- | --- | --- | --- | --- |
| Billing header | 78 | keeps | keep, fixed | none |
| Identity line | 62 | keeps | keep, fixed | none (`prompts/index.md`) |
| Lean body | 5,627 | replaced by `main.md` 9,351 | the default is at the right altitude (B3-7), and `main.md` is 3,724 longer | `agent` setting, `--system-prompt` |
| Security `IMPORTANT` line | 459 | drops | neutral (I10 warns of over-refusal) | `prompt.compose` |
| Pronoun paragraph | 357 | dropped: no use for coding (the user, 2026-10-23) | cut | - |
| Memory section | 2,061 | drops | keep dropped (B4-10, I02) | `autoMemoryEnabled` |
| `Context management` | 559 | `prompt.context` block, 91 to 140 | keep the replacement, but "act, do not re-derive" is only partly in `main.md` | `prompt.context` |
| Environment bullets | 579 | drops, `main.md` `<session>` keeps only the model IDs | the model IDs are needed for code of an AI application, and the surfaces and `ultrareview` lines are cut (the user, 2026-10-23) | `prompt.compose` |
| Untrusted-download bullet | 475 | keeps | keep, needed: safety (B4-2, B5-15) | none |
| Deferred tool names | 359 | keeps | keep, needed: a deferred tool loads only by its name | `ENABLE_TOOL_SEARCH`, `isDeferred` |
| Agent types list | 1,636 | hidden by `agent.offer` | keep dropped (I11) | deny rules, `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS` |
| Skills list | 5,969 | dropped by `disableBundledSkills` | keep dropped | `disableBundledSkills`, `skillOverrides` |
| Git status reminder | 571 | dropped by the git switch | conflicts with I01, the branch state is lost | `prompt.context`, `SessionStart` hook |
| Attribution reminder | 592 | dropped | keep dropped | `includeGitInstructions` |
| Output style wrapper | 1,451 style body | `claudetto:Concise` | keep, needed: the output style of the user | `outputStyle` |
| Tool text, 7 kept tools | 8,675 | cut to 4,535 | keep, needed: a wrong call fails or wastes a turn, with the faults of section 3 | `tool.describe` |
| Tool schemas, 7 kept tools | 6,366 | keeps | bloat, no lever | only whole-tool removal |
| Subagent notes block | 1,285 | keeps for each agent | conflicts with `researcher` | none in an interactive session |
| Plan mode text | 20,394 against 15,515 | keeps, `ExitPlanMode` denied | conflicts | `prompt.attachment` type `plan_mode` |
| Compaction prompt | 6,361 | the handoff replaces it | keep for the built-in path, needed: it writes the summary | `session.compact` `instructions` |
| Stop prompt hook | 1,478 | not used | fixed text, large | `$.model.complete` in its place |
| Bundled skills `/goal`, `/verify`, `/simplify` | `raw/prompts-index.txt` | off | `/verify` ("runtime observation") matches I04 and is lost | a skill file with the same name |

## 2. Conflicts That Leave the Model with Two Rules

**C1. Subagent notes against `researcher`.**
The default notes in each subagent request (`prompts/subagent-custom.md`) say: "Do NOT Write report/summary/findings/analysis .md files. Return findings directly as your final assistant message".
`agents/researcher.md` says "write the report to the file that you get", with `Write` in `tools`.
This session hit the same clash.
No surface removes the notes in an interactive session, so fix the claudetto side.

**C2. Plan mode against the deny list.**
`prompts/mode-plan.md` says "you should always call ExitPlanMode to indicate to the user that you are done planning."
The `SNIPPET` denies `EnterPlanMode` and `ExitPlanMode`.
Only `prompt.attachment` can fix it, because `--plan-mode-instructions` keeps the `ExitPlanMode` footer.

**C3. Git rules lost with the git switch.**
The default `Bash` text has "Commit or push only when the user asks. If on the default branch, branch first." and the `@name` rule.
`CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS=1` removes that section, and `main.md` does not name a commit.

**C4. A tool text that never applies.**
`tool.describe` in `slices/prompt/adapters/mod.ts` swaps the text only when it is shorter than the engine text.
`TOOL_BASH` is 1,048 characters, and the default `Bash` text without the git section is 1,021 (computed from `prompts/tools.md`).
So with the git switch on, the claudetto `Bash` text is dead.

**C5. The reply shape is set in three places.**
`Concise.md`, the end rule of `main.md`, and the style header and trailer of the engine stack.

**C6. `keep-coding-instructions: true` in `Concise.md` does nothing on the lean prompt** (`prompts/style-custom-keep-lean.md`).

## 3. Tool Descriptions That Cost Tokens

| Tool | Default | Claudetto | Status and lever |
| --- | --- | --- | --- |
| `Agent` | 3,227 | 809 | cut, but it dropped dossier lines (rank 4) |
| `Bash` | 1,688 | 1,048 | dead when git is off (C4) |
| `Skill` | 1,417 | 998 | cut |
| `ToolSearch` | 953 | 611 | cut |
| `Read` | 790 | 558 | cut |
| `Edit` | 360 | 280 | cut |
| `Write` | 240 | 231 | nothing to gain |
| `SendMessage` | 4,259 | none | deferred, costs when loaded |
| `EnterWorktree` | 3,220 | none | deferred, costs when loaded |
| `ExitWorktree` | 1,923 | none | deferred, costs when loaded |

`prompts/override.md` says "No" for tool text, but `prompts/tools.md` names the `tool.describe` hook, which claudetto uses.
Open question: does `tool.describe` fire for a deferred tool when `ToolSearch` loads it? One hook lab probe settles it.

## 4. Built-In Subagents Against the Claudetto Agents

| Built-in | Request | Claudetto match | Verdict |
| --- | --- | --- | --- |
| `general-purpose` | 10,929 | `worker` | its "NEVER create files" clashes with new test files, and it is off |
| `Explore` | 11,459 | `scout` | off |
| `Plan` | 11,766 | none, `main` plans | off |
| `statusline-setup` | 15,551 | the claudetto status line | off |
| `claude` | 11,328 | none | catch-all, invites unscoped delegation (I11), deny it and set `disableAgentView` |
| `claude-code-guide` | 29,062 | none | deny |

A custom agent gets its file body plus the notes block only.
All built-in agents are already off through deny rules and `agent.offer`.

## 5. Ranked Changes

1. Put the git rules back in `main.md` `<actions>` (C3): "Commit or push only when the user asks. On the default branch, make a branch first. Write a bare @name only for a person to notify, and put other uses in backticks." Then cut `TOOL_BASH` below 1,021 characters, or drop it (C4).
2. Remove the `researcher` clash (C1): return the report as the final message with the source URL of each claim, drop `Write` from its `tools`, and let `main` write the file.
3. Fix plan mode (C2) with a `prompt.attachment` hook for type `plan_mode`: "Plan mode is on. Read and search only. Write the plan in your reply. The user ends plan mode."
4. Put the dossier lines back into `TOOL_AGENT`: "A report from an agent is a claim. Check it before you relay it. Delegate a review only for a read that is not anchored on yours, and give it the code, not your conclusion."
5. Replace the lost git status with derived state in the `prompt.context` block (X5 of `research/external.md`).
6. Shorten `SendMessage`, `EnterWorktree`, and `ExitWorktree` with `tool.describe`, after the probe of section 3.
7. Probe in a test engine whether `prompt.compose` sees the subagent notes block as a section. Result: it does not, so the "Do NOT Write report" bullet stays (task 11.4).
8. Set `CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS=1` in the env of the print wrappers.
9. Add a `PreCompact` stdout line for the built-in compaction path: "Keep verbatim: each value that the user owns, each option the user rejected, the last passing and failing check with its command, and each step marked RAN."
10. Remove the dead `keep-coding-instructions: true` line from `Concise.md` (C6).

Keep: `disableBundledSkills`, `autoMemoryEnabled: false`, the git switch, the seven `tool.describe` cuts, the deny rules for four tools, and the hidden built-in agents.
