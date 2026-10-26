# Text Audit of Each Surface (D7, Task 7.3)

Sizes and offsets: see the capture file `tests/claudetto/prompt/fixtures/text-defaults-2.1.309.json`.
`bun tools/text-defaults.ts` writes it, and it is the one source of those numbers.

This file lists, for each surface of design D7, the behavior lines of the default text of Claude Code 2.1.309 and the line of the claudetto text that carries each one.
Task 7.4 rewrites the texts from these tables, and a behavior row may change its carrier but not its place in the table (D7 rule 2).

## Method

- Each capture entry has `text`, `page` (the capture page of `claude-code-docs/docs/prompts/` that the text comes from), and `offset` (a byte offset in the binary).
  The capture extends the stub capture `tool-texts-2.1.309.json`, and the stub differs from it for `Bash`.
- A carrier is `file:line` of the claudetto text. "pending" means that no claudetto text exists yet, and task 7.4 writes it.
  "dropped" means that the behavior is not carried, with the reason.
- Module names of the bundle are not in this file, and the coordinator adds them.

## Surfaces

| Surface | Default | Claudetto text | Size test |
| --- | --- | --- | --- |
| `main` | `prompts/default-lean.md`, `system[2]` | `agents/main.md` | longer than the default: `test.failing`, and task 7.5 sets the bound |
| `style` | `prompts/style-concise.md`, the added lines | `output-styles/Concise.md` | passes |
| `agent.worker` | `prompts/subagent-general-purpose.md` | `agents/worker.md` | passes |
| `agent.scout` | `prompts/subagent-explore.md` | `agents/scout.md` | passes |
| `subagent-notes` | `prompts/subagent-custom.md`, the "Notes:" block | none: the engine owns it | none |
| `plan-mode` | `prompts/mode-plan.md`, the added lines | `PLAN_MODE` via `onAttachment` | `texts.test.ts`, `plan-agents.test.ts` |
| `compaction` | `prompts/compact.md`, the last user block | `PRECOMPACT_LINE` via `onCompact` (rank 9) | `texts.test.ts`, `precompact.test.ts` |
| `tool.Agent`, `tool.Bash`, `tool.Edit`, `tool.Read`, `tool.Skill`, `tool.ToolSearch`, `tool.Write` | `prompts/tools.md` | `slices/prompt/prompts.ts` | passes |
| `tool.SendMessage`, `tool.EnterWorktree`, `tool.ExitWorktree` | `prompts/tools.md` | `slices/prompt/prompts.ts` | passes |

The capture holds the other tools too (`CronCreate`, `CronDelete`, `CronList`, `ListAgents`, `NotebookEdit`, `ReportFindings`, `ScheduleWakeup`, `TaskStop`, `WebFetch`, `WebSearch`, `Workflow`) for task 10.10, which decides what a session loads.
Agents with no default: `researcher` and `reviewer` (the built-in set has no match, `research/prompts.md` section 4), and each skill description (the bundled skills are off).
For these the lint test is the only text test.

## `main`

The default is the lean body `system[2]` of `prompts/default-lean.md`. The carrier is `plugins/claudetto/agents/main.md`.

| Default behavior line | Carrier | Verdict |
| --- | --- | --- |
| Identity: an agent that works toward the goals of the user with its own judgment | none | needed: harness fact |
| `IMPORTANT` security line (authorized security work, refuse destructive use) | none | dropped, neutral (`research/prompts.md` section 1) |
| Text outside a tool call is Markdown in a terminal | `main.md` `<harness>` | needed: harness fact |
| A denied call means the user declined it, so adjust | `main.md` `<harness>`, `main.md` `<blocks>` | needed: harness fact |
| System turns and reminders come from the harness, and a hook output is feedback | `main.md` `<harness>` | needed: harness fact |
| Prefer the dedicated file and search tools over the shell | `TOOL_BASH` (second bullet) | needed: a wrong call fails or wastes a turn |
| Independent tool calls run in parallel in one response | `main.md` `<use_parallel_tool_calls>` | needed: harness fact |
| Reference code as `file_path:line_number` | `main.md` `<harness>` | needed: harness fact |
| Write code that reads like the surrounding code | `main.md` `<least_code>` | needed: harness fact |
| Pronouns: use they/them when not stated, never infer from a name | - | dropped: no use for coding (the user, 2026-10-23) |
| Confirm a hard-to-reverse or outward-facing action, and approval does not carry over | `main.md` `<actions_with_care>` | needed: safety |
| Sending content to an external service publishes it | `main.md` `<actions_with_care>` | needed: safety |
| Look at the target before you delete or overwrite | `main.md` `<actions_with_care>` | needed: safety |
| Report outcomes faithfully (failed tests, skipped steps, verified work) | `main.md` `<actions_with_care>`, `main.md` `<verification>` | needed: safety |
| `/<skill-name>` invokes the skill, and only a listed skill | `TOOL_SKILL` (`/<name>` line, last paragraph) | needed: a wrong call fails or wastes a turn |
| Memory section (file-based memory, `MEMORY.md` index, recall rules) | none | dropped, `autoMemoryEnabled: false` |
| Environment: the model IDs of the Claude 5 family | `main.md` `<session>` | needed: code for an AI application uses the IDs |
| `ultrareview`: `/code-review ultra` starts a billed cloud review | - | cut: changes no coding action (the user, 2026-10-23) |
| Environment: Claude Code runs as a CLI, a desktop app, a web app, and IDE extensions | - | cut: changes no coding action (the user, 2026-10-23) |
| Environment: fast mode keeps Opus and `/fast` toggles it | none | dropped, no task needs it |
| Context management: the summary carries the work, so continue each task | `CONTEXT_MANAGEMENT_BUILT_IN`, `CONTEXT_MANAGEMENT_HANDOFF`, `CONTEXT_MANAGEMENT_OFF` in `slices/prompt/prompts.ts` (`prompt.context`) | needed: harness fact |
| When you have enough information, act | `main.md` `<default_to_action>` | partly carried (finish rules of D8 are pending) |
| Re-derive no fact, re-litigate no decision, narrate no option | `main.md` `<use_parallel_tool_calls>`, `<conflicts>`, `Concise.md:8` | partly carried |
| If you weigh a choice, give a recommendation, not a survey | `Concise.md:8`, `main.md` `<asking>` | needed: the output style of the user |

Behavior lines that `main.md` adds to the default are its own rules (tests, decisions, blocks, verification, actions, tools, counts, working, communication).
Each is a candidate for task 7.4 (rule 3, one rule for one case) and for the content of `research/failures.md` and `research/incidents.md`:

| Content change of D7 | Carrier today | Target |
| --- | --- | --- |
| Failure 1: run each check that a command can run, name a block only for a real block | `main.md` `<verification>`, `Concise.md:18` | `main.md` `<verification>`, and `Concise.md:18` goes (task 7.6) |
| "Fix each defect that you find, also an older one" | `main.md` `<test_first_fix>` | rewrite |
| "Try once, install a missing tool, then give the exact `!` command" | `main.md` `<missing_tool>`, `<verification>` | merge into one rule |
| "Print a file with `Read`" | `slices/prompt/prompts.ts:30` | add |
| "Commit and push when the user gave a standing permission" | `slices/prompt/prompts.ts:35` | add |
| "Keep the text of a task" | none | add |
| Restored `git` rules (C3): `@name` in backticks, branch first, commit when asked | `slices/prompt/prompts.ts:35` | add to `main.md` |

## `style`

The default is the text that `outputStyle: Concise` of Claude Code adds (`prompts/style-concise.md`). The carrier is `output-styles/Concise.md`.

| Default behavior line | Carrier | Verdict |
| --- | --- | --- |
| Keep responses short and direct, as thorough as before | `Concise.md:17` | needed: the output style of the user |
| Lead with the result: the first sentence is what happened | `Concise.md:7` | needed: the output style of the user |
| No preamble ("Let me...") and no closing recap | `Concise.md:7-8` | needed: the output style of the user |
| Cut narration, keep outcomes, decisions, and what the user must act on | `Concise.md:8` | needed: the output style of the user |
| Simple questions: plain prose in a few sentences | `main.md` `<communication>` | needed: the output style of the user |
| Headers, tables, and bullets only for real structure | none | pending, add in task 7.6 |
| State things plainly, a caveat only when it changes the next step | `Concise.md:8` | needed: the output style of the user |
| Give full detail on request | none | pending, add in task 7.6 |
| Keep the full content of errors, test output, security warnings, and destructive confirmations | `Concise.md:17` ("Keep the work thorough") | partly carried |
| These rules win over general formatting guidance | none | dropped, the style is the only reply format after task 7.6 |
| Trailer: "Concise output style is active..." | none | dropped, the header names the style |

Line `Concise.md:4` (`keep-coding-instructions: true`) does nothing on the lean prompt (C6, `prompts/style-custom-keep-lean.md`), and task 7.4 removes it.
Line `Concise.md:18` is the line at fault of "Run the Free Check", and task 7.6 replaces it.

## `agent.worker` and `agent.scout`

The defaults are `general-purpose` (`prompts/subagent-general-purpose.md`) for `worker` and `Explore` (`prompts/subagent-explore.md`) for `scout`.

| Default behavior line | Carrier | Verdict |
| --- | --- | --- |
| Complete the task fully, with no gold-plating and not half-done | `Worker.md:10-12` | needed: safety |
| Report what was done and the key findings, brief for the caller | `Worker.md:16`, `Scout.md:14` | needed: the output style of the user |
| Search broadly, then narrow, and use more than one strategy | `scout.md:10` | partly carried |
| Check several locations and names | none | dropped, the task text carries it |
| Prefer editing a file to creating one | none | dropped, clashes with new test files (`research/prompts.md` section 4) |
| Create a documentation file only when asked | `main.md` `<communication>` | needed: the output style of the user |
| Delegate no part of the task to a single other subagent | none | pending, add to `worker.md` in task 7.4 |
| Explore: read-only, no write, delete, move, or temp files | `Scout.md:6` (`tools: Read, Grep, Glob`), `Scout.md:11` | needed: safety |
| Explore: use `find` and `grep` through `Bash`, `Read` for a known path | `Scout.md:6` | needed: a wrong call fails or wastes a turn |
| Explore: be a fast agent, parallel tool calls | none | pending, add to `scout.md` |
| Explore: set the level of thoroughness from the caller | none | dropped, `effort: low` |
| Notes: absolute paths, since the cwd resets | `TOOL_BASH` (first bullet) | needed: a wrong call fails or wastes a turn |
| Notes: no emojis | none | the engine notes hold it in each request |

## `subagent-notes`

The default is the "Notes:" block that the engine appends to the body of each subagent (`prompts/subagent-custom.md`). No hook can replace it: `_rn` appends it to the agent body in `xd` (`chunk-e6tr0fse.js`, offset 113969) and in the spawn path (`chunk-mc4bx7ph.js`, offset 31527), and neither path calls `composeSections`, the one dispatch of `prompt.compose` (task 11.4).

| Default behavior line | Carrier | Verdict |
| --- | --- | --- |
| The cwd resets between `Bash` calls, so use absolute paths | `slices/prompt/prompts.ts:29` | kept: the engine sends it in each subagent request |
| Final response: share absolute file paths and snippets only when load-bearing | `worker.md:14` | kept: the engine sends it in each subagent request |
| No emojis | none | kept: the engine sends it in each subagent request |
| No colon before tool calls | none | kept: the engine sends it in each subagent request |
| Return findings as the final message, and write no report file | none | pending, conflicts with `researcher.md:10` (C1) |

## `plan-mode`

The default is the attachment `plan_mode` (`prompts/mode-plan.md`). `domain/plan-mode.ts` swaps one line today (`READ_DIRECTLY`).
The target text names `claudetto:Scout` and no `ExitPlanMode` (C2, task 3.10).

| Default behavior line | Carrier | Verdict |
| --- | --- | --- |
| No edits and no non-read-only tool, except the plan file | none | pending |
| Plan file path, built step by step | none | pending |
| Phase 1: understand the request, search for code to reuse | none | pending |
| Phase 1: launch `Explore` agents in parallel | `domain/plan-mode.ts` (one line) | partly carried, names `claudetto:scout` |
| Phase 2: launch a `Plan` agent to design | none | dropped, `Plan` is off (`research/prompts.md` section 4) |
| Phase 3: read the critical files, check the plan against the request, ask what is open | none | pending |
| Phase 4: write the final plan: Context, one approach, critical files, reuse, verification | none | pending |
| Phase 5: end the turn with `AskUserQuestion` or `ExitPlanMode` | none | changed, `ExitPlanMode` is denied (C2): the user ends plan mode |
| Ask about plan approval only through `ExitPlanMode` | none | dropped with `ExitPlanMode` |
| Ask the user when unsure, and make no large assumption about intent | `main.md` `<asking>` | needed: safety |

## `compaction`

The default is the compaction prompt (`prompts/compact.md`). Claudetto replaces it with the handoff, and the `session.compact` mod hook adds a line to `instructions` on the `built-in` path (`research/prompts.md`, rank 9).

| Default behavior line | Carrier | Verdict |
| --- | --- | --- |
| Reply with text only, no tool call | none | not ours, the engine sends it |
| Write an `<analysis>` block, then a `<summary>` block | none | not ours |
| Summary sections (request, concepts, files, errors, problem solving, user messages, pending tasks, current work, next step) | `slices/handoff/prompts.ts` | needed: harness fact |
| Follow extra instructions found in the context | the default (`compact.md:263-267`) | not ours, the engine sends it |
| Added: keep verbatim each value that the user owns, each rejected option, each step marked RAN, the last passing and failing check with its command | `PRECOMPACT_LINE` via `onCompact` | needed: harness fact |

## Tools

The carrier of a kept tool is the constant in `plugins/claudetto/slices/prompt/prompts.ts`. The pairs of phrases per tool are also in `tests/claudetto/prompt/tool-texts.test.ts` ("Rule Kept").

### `tool.Agent`

| Default behavior line | Carrier | Verdict |
| --- | --- | --- |
| Launch an agent for a multi-step task | `TOOL_AGENT` (first line) | needed: a wrong call fails or wastes a turn |
| Agent types are in the system-reminder messages | `TOOL_AGENT` (second line) | needed: a wrong call fails or wastes a turn |
| Set `subagent_type`, the definition sets the model, effort, and tools | `TOOL_AGENT` (third line) | needed: a wrong call fails or wastes a turn |
| `fork` copies your context and runs on your model | none | dropped, no claudetto agent forks |
| A fresh agent costs more than it looks (handoffs drop detail, it returns confident wrong results) | `slices/prompt/prompts.ts:19` | partly carried, short |
| Delegate parallel work, a side quest, or a read across many files | `TOOL_AGENT` (second paragraph) | needed: a wrong call fails or wastes a turn |
| Do a lookup or a handful of calls yourself, and run an inline check inline | `TOOL_AGENT` (second paragraph) | needed: a wrong call fails or wastes a turn |
| Delegate a review only for a read not anchored on yours, with the code and not your conclusion | none | pending (rank 4 of `research/prompts.md`) |
| After you delegate, wait for the result and do not run it yourself | none | pending |
| Brief it like a peer: goal, what is ruled out, files to read, narrow scope | `TOOL_AGENT` (second paragraph) | needed: a wrong call fails or wastes a turn |
| An agent report is a claim to check before you relay it | none | pending (D7 requires this line) |
| The final report is not shown to the user, so relay it | `TOOL_AGENT` (first bullet) | needed: a wrong call fails or wastes a turn |
| `SendMessage` continues an agent with its context | `main.md` `<background_work>` | needed while the tool is on (task 11.8) |
| Model, effort, and tools come from the agent file | `TOOL_AGENT` (third line) | needed: a wrong call fails or wastes a turn |
| `isolation: "worktree"` | `TOOL_AGENT` (second bullet) | needed: a wrong call fails or wastes a turn |
| Agents run in the background, notify on completion, and no result is predicted | `TOOL_AGENT` (third bullet) | needed: a wrong call fails or wastes a turn |

### `tool.Bash`

| Default behavior line | Carrier | Verdict |
| --- | --- | --- |
| Working directory persists, use absolute paths, `cd` can prompt | `TOOL_BASH` (first bullet) | needed: a wrong call fails or wastes a turn |
| Shell state does not persist | `TOOL_BASH` (first bullet) | needed: a wrong call fails or wastes a turn |
| Use a dedicated tool in place of `cat`, `head`, `tail`, `sed`, `awk`, `echo` | `TOOL_BASH` (second bullet) | needed: a wrong call fails or wastes a turn |
| Output is shown to you, not reliably to the user | `TOOL_BASH` (third bullet) | needed: a wrong call fails or wastes a turn |
| `timeout` default and maximum for a foreground command | `TOOL_BASH` (fourth bullet) | needed: a wrong call fails or wastes a turn |
| `run_in_background`: detached, re-invokes you, its own timeout bounds, no `&` | `TOOL_BASH` (fifth bullet) | needed: a wrong call fails or wastes a turn |
| Foreground `sleep` is blocked, use `Monitor` with an until-loop | `TOOL_BASH` (sixth bullet) | needed: a wrong call fails or wastes a turn |
| Git: no interactive flags | `TOOL_BASH` (Git bullet) | needed: a wrong call fails or wastes a turn |
| Git: use `gh` for GitHub | `TOOL_BASH` (Git bullet) | needed: a wrong call fails or wastes a turn |
| Git: a bare `@name` notifies the owner, put roles and code in backticks | none | pending (C3, rank 1) |
| Git: commit or push only when asked, branch first on the default branch, attribution lines | `TOOL_BASH` (Git bullet) | needed: a wrong call fails or wastes a turn |

With the git switch on, the swap rule of `tool.describe` leaves the claudetto text dead when it is longer than the default without the git section (C4 of `research/prompts.md`). Task 7.4 cuts it below that bound.

### `tool.Edit`, `tool.Read`, `tool.Write`

| Default behavior line | Carrier | Verdict |
| --- | --- | --- |
| `Edit`: read the file first | `TOOL_EDIT` (first bullet) | needed: a wrong call fails or wastes a turn |
| `Edit`: `old_string` is unique, strip the `Read` line prefix | `TOOL_EDIT` (second bullet) | needed: a wrong call fails or wastes a turn |
| `Edit`: `replace_all` | `TOOL_EDIT` (third bullet) | needed: a wrong call fails or wastes a turn |
| `Read`: absolute path | `TOOL_READ` (first bullet) | needed: a wrong call fails or wastes a turn |
| `Read`: lines by default, offset and limit for a part | `TOOL_READ` (second bullet) | needed: a wrong call fails or wastes a turn |
| `Read`: `cat -n` format | `TOOL_READ` (third bullet) | needed: a wrong call fails or wastes a turn |
| `Read`: images, notebooks, PDFs, `pages` for a long PDF | `TOOL_READ` (fourth bullet) | needed: a wrong call fails or wastes a turn |
| `Read`: a folder is an error, an empty file is a reminder | `TOOL_READ` (fifth bullet) | needed: a wrong call fails or wastes a turn |
| `Read`: a file you just edited needs no new read | `TOOL_READ` (sixth bullet) | needed: a wrong call fails or wastes a turn |
| `Write`: overwrites, and a file not read fails | `TOOL_WRITE` | needed: a wrong call fails or wastes a turn |
| `Write`: prefer `Edit` for a part | `TOOL_WRITE` | needed: a wrong call fails or wastes a turn |

### `tool.Skill` and `tool.ToolSearch`

| Default behavior line | Carrier | Verdict |
| --- | --- | --- |
| `Skill`: call it first when a listed skill covers the task | `TOOL_SKILL` (second paragraph) | needed: a wrong call fails or wastes a turn |
| `Skill`: some skills run in a subagent, and a background skill returns later | `TOOL_SKILL` (second paragraph) | needed: a wrong call fails or wastes a turn |
| `Skill`: `/<name>` of the user starts the skill | `TOOL_SKILL` (second paragraph) | needed: a wrong call fails or wastes a turn |
| `Skill`: `skill` is the exact name, `plugin:skill`, `apps/web:deploy` | `TOOL_SKILL` (`skill`) | needed: a wrong call fails or wastes a turn |
| `Skill`: `args` | `TOOL_SKILL` (`args`) | needed: a wrong call fails or wastes a turn |
| `Skill`: built-in commands are no skills, and a `<command-name>` block means the skill is loaded | `TOOL_SKILL` (last paragraph) | needed: a wrong call fails or wastes a turn |
| `ToolSearch`: deferred tools are named in reminders and cannot be called before the schema loads | `TOOL_TOOL_SEARCH` (first paragraph) | needed: a wrong call fails or wastes a turn |
| `ToolSearch`: the result is a `<functions>` block | `TOOL_TOOL_SEARCH` (first paragraph) | needed: a wrong call fails or wastes a turn |
| `ToolSearch`: `select:`, keyword, and `+name` queries | `TOOL_TOOL_SEARCH` (query forms) | needed: a wrong call fails or wastes a turn |

### `tool.SendMessage`, `tool.EnterWorktree`, `tool.ExitWorktree` (deferred)

The carriers are `TOOL_SEND_MESSAGE`, `TOOL_ENTER_WORKTREE`, and `TOOL_EXIT_WORKTREE` in `plugins/claudetto/slices/prompt/prompts.ts`.
`EnterWorktree` and `ExitWorktree` stay deferred, and `tool.describe` fires for them (`plugins/claudetto/tests/tool.test.ts`, "Deferred Text").
`SendMessage` stays on the base prompt.

| Default behavior line | Carrier | Verdict |
| --- | --- | --- |
| `SendMessage`: your plain text is not seen by other agents, call the tool | `TOOL_SEND_MESSAGE` (first line) | needed while the tool is on (task 11.8) |
| `SendMessage`: address by name, `main` for the main conversation (background subagent only), a `[ref]` only when a listing or an error shows one | `TOOL_SEND_MESSAGE` (`to`) | needed while the tool is on (task 11.8) |
| `SendMessage`: a name stays valid after the agent ends, and a send resumes it from its transcript | `TOOL_SEND_MESSAGE` (first paragraph) | needed while the tool is on (task 11.8) |
| `SendMessage`: the raw `agentId` only when the agent has no name or a newer agent took the name (latest wins) | `TOOL_SEND_MESSAGE` (first paragraph) | needed while the tool is on (task 11.8) |
| `SendMessage`: a bare name wins over an in-process agent of the same name | `TOOL_SEND_MESSAGE` (first paragraph) | needed while the tool is on (task 11.8) |
| `SendMessage`: teammate messages arrive with no inbox, relay in your own words | `TOOL_SEND_MESSAGE` (second paragraph) | needed while the tool is on (task 11.8) |
| `SendMessage`: a listed peer is alive, messages queue to its next tool round | `TOOL_SEND_MESSAGE` (third paragraph) | needed while the tool is on (task 11.8) |
| `SendMessage`: a send that arrives is not a read; another permission mode holds, expires, or refuses | `TOOL_SEND_MESSAGE` (third paragraph) | needed while the tool is on (task 11.8) |
| `SendMessage`: the `[Cross-session delivery notice]`, and the silence of Remote Control, cloud, and Desktop | `TOOL_SEND_MESSAGE` (third paragraph) | needed while the tool is on (task 11.8) |
| `SendMessage`: reply with the `from` attribute as `to`; a subagent sends under the parent address | `TOOL_SEND_MESSAGE` (fourth paragraph) | needed while the tool is on (task 11.8) |
| `SendMessage`: an `@path` or `@server:resource` attaches nothing, send the text or a file with its own tool | `TOOL_SEND_MESSAGE` (`message`) | needed while the tool is on (task 11.8) |
| `SendMessage`: `notify_when_idle` from the main conversation only (the one-shot semantics are in the schema) | `TOOL_SEND_MESSAGE` (`notify_when_idle`) | needed while the tool is on (task 11.8) |
| `SendMessage`: wait for a reply, send no polling loop of `ListAgents` and no "are you done?" message | `TOOL_SEND_MESSAGE` (fifth paragraph) | needed while the tool is on (task 11.8) |
| `SendMessage`: ask no peer for an action that your session denied or that your settings would block (permission laundering) | `TOOL_SEND_MESSAGE` (last line) | needed while the tool is on (task 11.8) |
| `SendMessage`: `summary` is a 5-10 word label for your own transcript | `TOOL_SEND_MESSAGE` (`summary`) | needed while the tool is on (task 11.8) |
| `EnterWorktree`: use it only when the user, `CLAUDE.md`, or memory says "worktree"; use `git` for branch, bug, and feature requests | `TOOL_ENTER_WORKTREE` (first line) | needed while the tool is on (task 11.8) |
| `EnterWorktree`: needs a git repository or `WorktreeCreate` and `WorktreeRemove` hooks, and creating with `name` needs a session outside a worktree | `TOOL_ENTER_WORKTREE` (first bullet) | needed while the tool is on (task 11.8) |
| `EnterWorktree`: creates `.claude/worktrees/<name>` on a new branch from `worktree.baseRef` | `TOOL_ENTER_WORKTREE` (second bullet) | needed while the tool is on (task 11.8) |
| `EnterWorktree`: `path` enters an existing worktree, `name` creates one, they exclude each other, a first entry needs `git worktree list` | `TOOL_ENTER_WORKTREE` (`name`, `path`) | needed while the tool is on (task 11.8) |
| `EnterWorktree`: `path` from inside a worktree leaves the previous one untouched, and only the new one is tracked for exit | `TOOL_ENTER_WORKTREE` (paragraph after the bullets) | needed while the tool is on (task 11.8) |
| `EnterWorktree`: a pinned agent can use `path`, and the switch affects only that agent | `TOOL_ENTER_WORKTREE` (paragraph after the bullets) | needed while the tool is on (task 11.8) |
| `EnterWorktree`: the target is under `.claude/worktrees/` of the same repository; earlier worktrees are no longer writable, so give `path` again | `TOOL_ENTER_WORKTREE` (paragraph after the bullets) | needed while the tool is on (task 11.8) |
| `EnterWorktree`: `ExitWorktree` leaves, and a path-entered worktree needs `keep`; on session exit the user chooses keep or remove | `TOOL_ENTER_WORKTREE` (last paragraph) | needed while the tool is on (task 11.8) |
| `ExitWorktree`: acts only on a worktree that `EnterWorktree` made in this session, and does nothing outside such a session | `TOOL_EXIT_WORKTREE` (first line) | needed while the tool is on (task 11.8) |
| `ExitWorktree`: call it only when the user asks to exit, leave, or go back | `TOOL_EXIT_WORKTREE` (first line) | needed while the tool is on (task 11.8) |
| `ExitWorktree`: `action` is `keep` (return later, preserve changes) or `remove` (clean exit, work done or abandoned) | `TOOL_EXIT_WORKTREE` (`action`) | needed while the tool is on (task 11.8) |
| `ExitWorktree`: `discard_changes` is needed to remove uncommitted files or commits not on the original branch, and the user confirms first | `TOOL_EXIT_WORKTREE` (`discard_changes`) | needed while the tool is on (task 11.8) |
| `ExitWorktree`: restores the directory and clears the caches that depend on it | `TOOL_EXIT_WORKTREE` (last paragraph) | needed while the tool is on (task 11.8) |
| `ExitWorktree`: a tmux session is killed on `remove`, left running on `keep` with its name returned; `EnterWorktree` works again after the exit | `TOOL_EXIT_WORKTREE` (last paragraph) | needed while the tool is on (task 11.8) |

## Hook Messages and Skills

The hook messages are the `prompts.ts` of each slice: `decide`, `finish`, `ground`, `guard`, `handoff`, `hygiene`, `notes`, `prompt`, and `setup`.
They have no default text, because they are claudetto's own, so the size test does not apply, and the lint test covers them (`tests/claudetto/prompt/text-lint.test.ts`).
The lint test finds the negative-framed rules of the skill files: `skills/update/SKILL.md:9`, `skills/explore/SKILL.md:11`, `:17`, `:23`, `:36`, and `skills/sync/SKILL.md:18`.
Task 7.4 rewrites those lines.
