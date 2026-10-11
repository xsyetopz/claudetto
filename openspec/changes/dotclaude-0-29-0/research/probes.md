# Probes of group 1

Offsets are byte offsets in `external/cc-2.1.296/strings.txt`.
A result marked "bundle" comes from a read of the bundle, and a live probe still has to confirm it.

## 1.14 Default agent of an `Agent` call with no type (bundle)

- The default agent is `general-purpose` (`agentType:"general-purpose"` at 23249200).
  The spawn path takes the type of the call, else that default (near 29179900).
- A check before it throws when the call has no type and the default agent is not available (near 29179695).
  The text is `subagent_type is required: the general-purpose agent is not available in this session` (17245799).
  The check reads the active agent list and `allowedAgentTypes` (29209197), and it does not read deny rules.
- A typed call that a deny rule stops gets `Agent type '<type>' has been denied by permission rule '<rule>' from <source>.` (near 29174300).
- With `Agent(general-purpose)` in `permissions.deny`, a call with no type likely gets that deny text for `general-purpose` (inferred from the code order, not verified).
- A setting, env var, or frontmatter key that changes the default agent: not searched yet.

Live probe: the text that the model gets for a call with no type under the deny rule.

Live result (`just sandbox`, Sonnet 5.5, `permissions.deny` `Agent(general-purpose)`, 2026-10-11):

- A call with no type gets `Agent type 'general-purpose' has been denied by permission rule 'Agent(general-purpose)' from userSettings.`
  The text names the denied default and no agent of the suite, so the model does not learn which type to use.
- A `PreToolUse` hook fires for that call, and its `tool_input` has `description`, `prompt`, and `run_in_background`, with no `subagent_type` key.
- The bundle shows no setting or env var that changes the default agent.
  Two hits of `default_agent` (8737065, 22751453) were not read.

Route for task 4.6: a `PreToolUse` hook on `Agent` denies a call with no `subagent_type` and names the suite.

## 1.2 `SubagentStop` at `maxTurns` (bundle)

- The subagent run passes `maxTurns` to the query loop (near 29116480).
  At the cap, the loop yields `max_turns_reached`, runs the turn-end hook helper, and returns `{reason:"max_turns"}` (29830128, 29840966), before the check of blocking stop hooks.
- The turn-end helper (29721005) runs the hooks in `turn_end_reactions` mode, which picks `SubagentStop` for an agent (24127066).
  In that mode it returns early when no session-function hook exists, so command hooks from settings and plugins likely do not run at the cap (inferred).
  It drops each blocking result with the log `Turn-end reaction hook block discarded`.
- So a blocking `SubagentStop` cannot give a subagent a turn past `maxTurns` (inferred from the order).
  The `SubagentStop` fallback of design D1 cannot ask for a report at the cap, and it can only act before the cap.
- Outside the cap, a blocking stop hook continues the loop, up to `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` blocks (default 8, near 29829990).
- The text that the parent gets for a run at the cap, and the unit of the turn counter, are not verified.

Live probe: an agent with `maxTurns` 3 and a logging, blocking `SubagentStop` command hook.

Live result (`just sandbox`, a project agent `probe` on Haiku 5.5 with `maxTurns` 3 and only `Read`, a task of 8 reads, a logging and blocking `SubagentStop` hook, 2026-10-11):

- The agent made 3 tool calls and stopped with no report.
- `SubagentStop` did not fire: its log is empty.
  The `Stop` hook of the main session fired once.
- The parent got this tool result:
  `NOTE: this agent stopped at its 3-turn limit before finishing. It was still calling tools and had produced no report. Send the agent a message (SendMessage) to let it continue from where it stopped.`
  followed by a note that the agent ended with no `SubagentHandback` report.

So the `SubagentStop` fallback of design D1 cannot act at the cap, and task 4.4 has no fallback route at the cap.
The report must come before the cap, from the note of task 4.1 and a `TURNS_LEFT_AT` that leaves the turns of a full report.

## 1.11 Route of `/goal` (bundle)

- The goal is the app-state field `activeGoal` (near 29700954).
- The check is a session-scoped `Stop` hook of type `prompt`, with the goal condition as its prompt (near 29722506).
  Each result yields `goal_status` with `met` or `not_met` (near 29716292).
- An unrecoverable error removes the hook and clears `activeGoal` (near 29722400).
- The model can propose a goal only through the `ProposeGoal` tool (29699150), which needs the approval of the user, refuses in agents and plan mode, and cannot clear a goal.
  A search for other routes (`setGoal`, `clearGoal`, `goalProposal`) found none, so a skill, a hook output, or a setting cannot set a goal.
- Not verified: the model of the prompt hook, whether `activeGoal` persists across sessions, and the code of `/goal clear`.

Result for design D20: `ProposeGoal` is off (design D9), and a skill cannot set a goal.
So the goal command of dotclaude uses its own `Stop` command hook that reads `tasks.md`, which costs no model request, where the `/goal` check costs one prompt-hook request at each stop.

## 1.13 Opt-in of `Grep` and `Glob` (bundle)

- The gate (21380944) is on by default, and it removes `Glob` and `Grep` from the tool list (29537516) unless the launch opts in (12803699), or the entrypoint is `local-agent`.
- The launch opts in when `--tools` names `Grep` or `Glob`, or when an `--allowedTools` rule names either (flag parser near 29254100 and 29255562).
  A preset value of `--tools` does not opt in.
- A `permissions.allow` rule in settings does not opt in, and no env var or setting changes the gate.
- A second condition of the gate is not resolved, and on Windows with no Bash shell both tools can stay (not verified).

So the opt-in is a launch flag only, and a plugin or a settings file cannot turn it on.
Live probe: the tool list and start cost with `--allowedTools Grep Glob`, with `--tools` that names them, and with neither.

## 1.10 Picker of a mod (bundle)

- A hook can call `$.ui.ask(question, { options, multiSelect: true })` (16522599), and the reply is a string, with the picks joined by `", "`.
  Whether a `tool.call` hook can wait on it during a tool call is not verified.
- `$.ui.open({ id, title, ... })` (16523076) opens a pane, and a `ui.render` hook draws it with `Button` (`hotkey` is one digit or one lowercase letter, so `n` is valid, 10066879), `Select` (10070558), and `Input` (10069085).
- `command.register` exists, so a slash command can likely open a pane (not verified).
- Whether `Select` takes more than one pick is not verified.

Live probe: a mod tool whose `tool.call` hook calls `$.ui.ask` with `multiSelect`, and a check of the tool result.

## 1.15 Variables in the `statusLine` command (bundle)

- The runner (24238100) reads `statusLine` with `type` `command`, and returns early when the workspace is not trusted.
  It runs the command through the shared hook runner (24150689).
- The child env has the session vars (`CLAUDECODE`, `CLAUDE_CODE_SESSION_ID`, `CLAUDE_PID`, and more), `CLAUDE_PROJECT_DIR`, and `COLUMNS` and `LINES` on a TTY.
  `CLAUDE_PLUGIN_ROOT` and `CLAUDE_PLUGIN_DATA` are set only for a plugin root, and the status line runner gives none (inferred from the call).
- In the shell form, the runner makes no substitution, and the shell expands `$CLAUDE_PROJECT_DIR` from the env (inferred).
  In the exec form (`args`), the runner substitutes `${CLAUDE_PROJECT_DIR}`, `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}`, and `${user_config.*}`.
- A command with `${CLAUDE_PLUGIN_ROOT}` and no plugin root throws `not associated with a plugin`, and the status line prints nothing.
- Whether a plugin `settings.json` can set `statusLine` is not verified.

So `${CLAUDE_PLUGIN_ROOT}` does not work in the user `statusLine` (bundle), and design D13 falls back to a stable launcher in `~/.claude`.
Live probe: a `statusLine` command with `${CLAUDE_PLUGIN_ROOT}` in `just sandbox`.

Live result (interactive `just sandbox` through a pseudo-terminal, 2026-10-11):

- A user `statusLine` command with `${CLAUDE_PLUGIN_ROOT}` does not run.
  The debug log says `Status hook failed: Error: Hook command references ${CLAUDE_PLUGIN_ROOT} but the hook is not associated with a plugin. This variable is only available in hooks defined in a plugin's hooks/hooks.json file, not in settings.json.`
- The same command with `$CLAUDE_PLUGIN_ROOT` runs, gets an empty value, and gets `CLAUDE_PROJECT_DIR` set to the project folder.

Route for task 9.3: a stable launcher in `~/.claude`, which finds the newest installed copy of the plugin.

## 1.3 Unknown tool name (bundle)

- A call to a tool name that does not exist gets a `tool_result` with `is_error: true` and the text `Error: No such tool available: <name>`, plus a hint suffix that depends on the name (near 23451159, and near 29687700 for the streaming path).
  Whether the suffix is empty for `bash` is not verified.
- That branch returns before the `PreToolUse` call (23455340), so `PreToolUse` does not fire.
- No `PostToolUseFailure` call is in that branch (inferred).

Live probe: a call to `bash` with logging hooks on `PreToolUse` and `PostToolUseFailure`.

Live result (`just sandbox`, Sonnet 5.5, logging hooks on both events with matcher `*`, 2026-10-11):

- The tool result is `<tool_use_error>Error: No such tool available: bash. Tool names are case-sensitive: call Bash instead.</tool_use_error>`
- Neither hook fired: both logs are empty.

So the error text gives the fix, and no hook can act on the call.
Route for task 6.1: no hook, and the wiki records that the error text and the prompt line are the only routes.

## 1.1 Report-now note (live, old text)

Setup: `just sandbox` with a temp copy of `plugins/dotclaude` that adds an agent `probe` (Haiku 5.5, `maxTurns` 8, only `Read`), and a task of 12 reads, one in each turn.
The main session was Sonnet 5.5 (2026-10-11).

- The note came with the `Read` result of turn 6, and again at turns 7 and 8:
  `You made 6 turns, and the limit is 8 turns. A run that reaches its turn limit returns no report. A report of 400 words or fewer is due now, with what is done and what stays open.`
- The agent gave no report.
  Its last text was: `The Read result for f6.txt included a note saying I've hit a turn limit and must report now. That isn't part of your request, so I'm ignoring it and continuing with f7.txt.`
- The parent got `NOTE: this agent stopped at its 8-turn limit before finishing. The text below is PARTIAL output`, and then that text.

So the old note fails as design D1 says: the agent reads it as data in a tool result, and the brief wins.
Task 4.10 runs the same probe with the new text of task 4.1, and records its result here.

The note fires only for agents whose file is in `plugins/dotclaude/agents/` (`maxTurnsOf` in `features/context/turns.mjs`), so the probe needs the agent in a copy of the plugin.

Lab side: the case `at the level, a subagent gets a note` of `tests/dotclaude/context/turn-bound.test.mjs` gives the note at `maxTurns - TURNS_LEFT_AT` turns, which is turn 6 of 8 in the probe.
`just test tests/dotclaude/context/turn-bound.test.mjs`: 10 pass, 0 fail (2026-10-11).
The note is a classic `PostToolUse` hook, not a part of the hooks module, so `claude plugin test` does not run it.

## 1.13 Opt-in of `Grep` and `Glob` (live captures)

Setup: `just sandbox` with all plugins of this checkout and no snippet, `-p "Reply with OK."` on Sonnet 5.5, through `just capture` with `ENABLE_TOOL_SEARCH=true` (2026-10-11).
The total is the `count_tokens` figure of the first request.

| Launch | Tools in the request | Start tokens |
| --- | --- | --- |
| Neither | `Agent`, `Bash`, `Edit`, `Read`, `ReportFindings`, `ScheduleWakeup`, `Skill`, `ToolSearch`, `Workflow`, `Write`, the deferred placeholder, the Jev tool | 18,051 |
| `--allowedTools Grep Glob` | the same, plus `Glob` and `Grep` | 19,604 |
| `--tools Bash Read Edit Write Grep Glob` | `Bash`, `Edit`, `Glob`, `Grep`, `Read`, `Write`, the deferred placeholder, the Jev tool | 9,047 |

- The opt-in with `--allowedTools` costs 1,553 tokens at each start, for a `Grep` description of 477 characters and a `Glob` description of 140 characters.
- The `Bash` description (849 characters with dotclaude) and the system prompt do not change with the opt-in.
- `--tools` keeps only the tools that it names, so it is a separate choice of the whole tool set, not only an opt-in.
- The opt-in is a launch flag only (bundle, above), so a plugin or a settings file cannot set it, and a user who wants it needs a shell alias or a launcher.
- Whether a subagent gets `Grep` and `Glob` when the main session opts in is not verified.

## 1.8 Cost of the `Stop` prompt hook (live captures)

Setup: `just capture` and `just sandbox`, `-p "Reply with OK."` on Sonnet 5.5, all plugins of this checkout, no snippet (2026-10-11).

| Run | `/v1/messages` requests | Tokens |
| --- | --- | --- |
| With the `Stop` prompt hook | 2: the turn, and a Sonnet 5.5 request with no tools and the evaluator text (2,258 characters of system text) | turn 18,051, evaluator request 6,914 |
| Without it (a plugin copy with no `Stop` entry in `hooks.json`) | 1: the turn | not counted again |

So the hook adds one Sonnet 5.5 request of about 6,900 input tokens at the end of each turn, also on a one-word reply.
The extra request goes away without the hook.

## 1.9 Resume of a trimmed session JSONL (live)

Setup: a `just sandbox` session on Opus 5.5 at `max` effort with 3 thinking blocks, 3 tool calls, and 41 rows (138,544 bytes) (2026-10-11).
A trim script kept only the `user` and `assistant` rows, linked each `parentUuid` past the dropped rows, cut each tool result to 40 characters, removed `toolUseResult`, and wrote the copy under a new session id in the same project folder.

| Copy | Rows | Bytes | `claude --resume <id> -p` |
| --- | --- | --- | --- |
| Thinking blocks kept unchanged | 14 | 25,901 | Loads, and the answer uses the earlier turns |
| Thinking rows dropped | 11 | 15,939 | Loads, and the answer uses the earlier turns |

- Neither copy gave an API error, so a trim that keeps each thinking block unchanged, or drops whole thinking rows, keeps the signatures valid.
- In both copies, the model said that its earlier claims were wrong, because the cut tool results no longer held the lines that its earlier text quoted.
  So the handoff keeps the tool results that the final assistant text cites, or adds a line to the continuation prompt that the tool results are cut and that the earlier text is the record.

Route for task 10.3: `claude --resume` on the trimmed file, with the prompt route as the fallback.

## 1.5 `/config` with the forced style (live)

Setup: interactive `just sandbox` through a pseudo-terminal, all plugins of this checkout, `/config` filtered to `output` (2026-10-11).

| `outputStyle` in the sandbox settings | `Output style` row of `/config` |
| --- | --- |
| not set | `default` |
| `dotclaude:dotclaude` | `dotclaude:dotclaude` |

The session uses the forced plugin style in both cases (bundle, `research/snippet.md`), so with no key `/config` shows `default` for a style that is not active.
The key makes `/config` show the active style, so task 8.1 adds it.

## 1.10 Picker of a mod tool (live)

Setup: a probe plugin whose hooks module registers a tool `pick` at `session.start`, and whose `tool.call` hook returns the reply of `$.ui.ask("Probe: tick items", { options, multiSelect: true })`.
Interactive `just sandbox` through a pseudo-terminal, Haiku 5.5, with the plugin through `--plugin-dir` (2026-10-11).

- The picker shows inside the tool call, in the frame of `AskUserQuestion`: a checkbox row for each option, a `Type something` row for free text, a `Submit` tab, and `Chat about this`.
  Enter ticks a row, and the right arrow then Enter submits.
- With `alpha` and `charlie` ticked, the tool result is `PICKS="alpha, charlie"`: one string, with the picks joined by `", "`.
- With nothing ticked, `$.ui.ask` throws `$.ui.ask: no answer (The user did not answer the questions.)`.
  The tool must catch this error and return an explicit empty list, else the model reads a ticked-nothing reply as no answer.
  This agrees with the lost multi-select answers of 2026-10-11 (`research/issues.md`).
- A note for each item through the `n` key is not in `$.ui.ask`.
  The `Type something` row gives one free-text note for the whole question.
  A note for each item needs a pane (`$.ui.open` with a `Button` of `hotkey` `n`), which is not probed.

Route for task 9.6: a mod tool with `$.ui.ask`, which returns `[]` when nothing is ticked, and the free-text row as the note.
A note for each item, if the user wants one, needs a pane in `configure`.
The tool costs its description at each start, which task 9.6 measures against `AskUserQuestion`.

## Deny from a mod `tool.call` hook (live, for the architecture of group 2)

- The bundle lists `{ deny }` as the refusal shape of `tool.call` (16319669).
- A probe module returned `{ deny: "Probe deny: this command is not allowed." }` for a `Bash` call with `marker` in the command (`just sandbox`, Haiku 5.5, 2026-10-11).
  The model got `<tool_use_error>Probe deny: this command is not allowed.</tool_use_error>`, and `marker.txt` was not created.

So the `Bash`, `Write`, and `Edit` checks can run in the hooks module, in process, in place of a new process for each call.

## 2.1 Ask from a mod `tool.call` hook (live)

Setup: a probe module returned `{ ask: "Probe ask: confirm this command." }` for a `Bash` call with `marker` in the command (interactive `just sandbox`, Haiku 5.5, 2026-10-11).

- Claude Code showed `probe-ask: tool.call hook skipped: returned the wrong shape (neither { result } nor { deny })`.
- No permission dialog showed, the command ran, and `marker.txt` was created.

So a `tool.call` hook can only deny, rewrite, or answer a call, and a hook that returns another shape fails open.
The asks of `features/adherence/` stay classic `PreToolUse` hooks with `ask`.
A module could show its own question with `$.ui.ask` and then deny or pass the call, but that route is not probed, and with no UI, as in `-p`, `$.ui.ask` has no answer.

## 2.2 Ask from a mod `tool.check` hook (live)

Setup: a probe module `p-toolcheck` logged each `tool.check` and returned `{ decision: "ask", reason }` for `Read`, after `next` (interactive `just sandbox` in a detached `tmux` session, Haiku 5.5, 2026-10-11).
The prompts were `PROBE-T0: read f1.txt and tell me its text.` and `PROBE-T1: read f2.txt and tell me its text.`

- Auto mode: `tool.check` fired with the verdict `allow` beneath, and the debug log shows `allow -> ask by plugins probe-toolcheck, dotclaude: PROBE-T: the probe asks for this Read.`
  Then `Skipping auto mode classifier for Read: would be allowed in acceptEdits mode`, and the `Read` ran with no prompt.
- Manual mode (the mode that asks): the same `ask` showed the permission prompt `Do you want to proceed?` for the `Read`, which the engine had allowed.
  The screen did not show the reason text.
  The answer `No` ended the turn with `Interrupted`, and the debug log shows `Read tool permission denied`.

So a `tool.check` hook can ask, and Claude Code then handles the ask as it handles the ask of a permission rule in the current mode.
The asks of `features/adherence/` can move into the hooks module as a `tool.check` hook.
Not verified: the ask in `-p` mode, and whether a classic `PreToolUse` ask gets a prompt in auto mode.

## 2.16 Bun in the mod runtime (live)

Setup: two probe modules as `hooks/register.ts` in `$TMPDIR/mod-probes/`, one headless run of each (`just sandbox --model claude-haiku-5-5 -p "PROBE-216: reply with the word zero only." --plugin-dir <probe>`, 2026-10-11).

- `p-bun-static` with `import { $ } from "bun"` did not load: `cannot import "bun" (from hooks/register.ts): a hooks module imports its own files by relative path and "claude-code", nothing else`.
- `p-bun` with `await import(spec)` did not load: the loader refuses a dynamic `import()` in a hooks module.
- `p-bun` with no import logged at `session.start`: `typeof Bun=undefined`, `typeof process=undefined`, `typeof require=undefined`.
  The globals are the language globals and `atob`, `btoa`, `structuredClone`, `crypto`, `performance`, the timers, and `console`.

So the mod runtime gives no `Bun` global and no `bun:` or `node:` module, and a hooks module imports only relative files and `"claude-code"`.
The hooks module graph keeps the rule of design D11, and the "Hooks module graph" test refuses `bun`, each `bun:` module, and a read of `Bun`.
