# Mod API probes of Claude Code 2.1.296

Scope: live and static probes of the mod API for the semi-auto context handoff of design D27 (`design-parts-2.md`).
Setup of the earlier probes: `research/probes.md`, sections 1.10, the deny of `tool.call`, and 2.1.
Probe plugins are in `$TMPDIR/mod-probes/`, and each probe logs its facts to a file in its own folder.
Facts from a log are marked `log`, facts from the declarations are marked `d.ts`, and inferences are marked `inferred`.
Declarations are in `plugins/dotclaude/.claude-plugin/types/claude-code/index.d.ts`, and a line number `index.d.ts:N` points there.

## Setup note: a module needs `hooks/hooks.json`

- A hooks module at `hooks/register.mjs` does not load unless `hooks/hooks.json` names it.
- The file is `{ "description": "...", "modules": ["./register.mjs"] }`, the shape of `plugins/dotclaude-jev/hooks/hooks.json`.
- Without it, the debug log has no `hooks module ... loaded` line, and no event of the module runs (`log`, first run).
- A `claude plugin validate` pass does not report the missing module (`log`).

## 1. `$.command.run({ command: "clear" })` from a hook

- Setup: the probe `probe-clear` calls `$.command.run` from a `$.clock.after(3000)` timer set at `session.start`, in an idle interactive session through tmux.
- Command: `just sandbox --model claude-haiku-5-5 --debug-file <tmp>/mod-probes/clear-debug.log --plugin-dir <tmp>/mod-probes/clear`.
- Logged facts (`log`):
  - The call resolves to `{"text":""}`, with no `context` and no `ref`.
  - `session.end` fires with `reason` `clear` and the old `sessionId`.
  - `classic.SessionStart` fires with `source` `clear` and a new `session_id`.
  - `session.start` does not fire again after the clear, so it has one line, with `source` `startup`.
  - The TUI shows an empty prompt, and the context counter reads `0k/300k`.
- Result: works.
- Not tested: the settings-file form of a `SessionStart` command hook, which is a separate path from the function hook `classic.SessionStart`.

## 2. `$.prompt.submit({ text })` after the clear, from a timer and from `turn.complete`

- Setup: the same probe `probe-clear`, interactive and idle, with three submits.
  Submit A runs in the callback after `command.run` clear resolves, submit B runs in the first `turn.complete` hook, and submit C runs in a `$.clock.after(40000)` timer.
- Command: `just sandbox --model claude-haiku-5-5 --debug-file <tmp>/mod-probes/clear-debug.log --plugin-dir <tmp>/mod-probes/clear`.
- Logged facts (`log`):
  - Each submit resolves to `{"text":...,"origin":{"kind":"plugin","name":"probe-clear"}}`.
  - Each submit starts a turn with no person typing: `turn.start` follows each `prompt.submit` within 15 ms to 130 ms.
  - The model reads a framed text: `The probe-clear plugin sent a message:` and a trailing sentence about the plugin's submit, followed by the prompt.
  - The answers are `alpha`, `beta`, and `gamma`, so the three turns ran in order.
- Result: works, from the clear callback, from `turn.complete`, and from a `$.clock.after` timer.
- Not tested: `asUser: true`, which the `d.ts` says drops the framing (`index.d.ts`, `PromptSubmitArgs`).

## 4. `turn.step` usage and hook shape

- Setup: `on('turn.step', async function* ($, e, next) { ... })` that reads each `chunk.kind === 'stop'` chunk and passes all chunks on.
- Logged facts (`log`):
  - The hook must be an async generator.
    A plain `async` hook fails at load with `the hook on "turn.step" is not an async generator`.
  - The first request of a new session has `cache_creation_input_tokens` 9635 and `cache_read_input_tokens` 0.
  - The following requests of the same session read the cache, with `cache_read_input_tokens` 9619 and 9717, and `cache_creation_input_tokens` 98 and 83.
  - The input has `turnId`, `index`, `model`, `effort`, and `messageCount`, and no `agentId` on the main loop.
  - The usage object has `input_tokens`, `output_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`, and `model`.
- Result: works for logging the usage fields.
- Text into the model: not shown by any probe.
  Inference from `index.d.ts:13432` (`TurnStepInput`, "the rest is pinned"): a `turn.step` hook rewrites only `model` and `effort`, so it cannot add text to the request.
- Not tested: `agentId` on a subagent request, which needs a spawn (see experiment 6).

## 5. Events after `/clear`

- Logged facts (`log`), from the clear in run 5:
  - `session.end` fires with `reason` `clear`, before the new session.
  - `classic.SessionStart` fires with `source` `clear`.
  - `session.start` does not fire after the clear.
  - `turn.start` fires only after the plugin's own `prompt.submit`, not from the clear.
- Result: `session.end` and `classic.SessionStart` work, `session.start` does not fire, and `turn.start` works after a submit.

## Round 2: brief items 1 to 10

The items below follow the order of the brief, which is not the numbering of the sections above.
Probe folders are in `$TMPDIR/mod-probes/`, and each one has a `log.txt` with the facts.

## Item 1: `-p` mode, `command.run` clear and `prompt.submit`

- Setup: the probe `p-clear` calls `$.command.run({ command: "clear" })` from the first `turn.complete`, then `$.prompt.submit({ text })` from the resolved clear call.
- Command: `just sandbox --model claude-haiku-5-5 -p "PROBE-P1: reply with the word zero only." --debug-file <tmp>/mod-probes/p-clear-debug.log --plugin-dir <tmp>/mod-probes/p-clear`.
- Logged facts (`log`):
  - The first turn answers `zero`, and `turn.complete` fires before the clear.
  - `session.end` fires with `reason` `clear`, and `classic.SessionStart` fires with `source` `clear` and a new `session_id`.
  - `command.run` resolves to `{"text":""}`.
  - `prompt.submit` resolves to `{"text":"PROBE-P2: ...","origin":{"kind":"plugin","name":"probe-clear"}}`, and `turn.start` follows at once.
  - The `turn.start` text is framed: `The probe-clear plugin sent a message:`, then the prompt, then a trailing sentence about the plugin's submit.
  - The model answers `delta`, and the stdout holds `zero` and then `delta`.
  - The second `session.end` fires with `reason` `other` when the process ends.
- Exit status: not recorded, because the shell readout of the status was empty.
- Result: works.
  The `-p` run stays alive until the submitted turn ends.

## Item 2: `asUser: true` after the clear

- Setup: the probe `p-asuser` runs the same clear from `turn.complete`, then `$.prompt.submit({ text, asUser: true })`.
- Command: `just sandbox --model claude-haiku-5-5 -p "PROBE-P0: reply with the word zero only." --debug-file <tmp>/mod-probes/p-asuser-debug.log --plugin-dir <tmp>/mod-probes/p-asuser`.
- Logged facts (`log`):
  - `prompt.submit` resolves to `{"text":"PROBE-U: reply with the word epsilon only.","origin":{"kind":"plugin","name":"probe-clear","asUser":true}}`.
  - `turn.start` carries the text `PROBE-U: reply with the word epsilon only.`, with no frame.
  - The model answers `epsilon`, and the process exits with status 0.
  - The `origin.name` reads `probe-clear`, because the copied manifest kept that name.
- Compared with item 1: the framed `turn.start` text adds two parts, the frame line and the trailing sentence.
- Result: works.
- Inference: the model reads the bare text, because `turn.start` carries the text that starts the turn.
  This probe does not test whether the answers differ, because both prompts ask for one word.

## Item 3: `classic.SessionStart` on `clear` with `initialUserMessage`, in `-p` mode

- Setup: the probe `p-initmsg` runs the clear from `turn.complete`, and `classic.SessionStart` returns `initialUserMessage` once when `source` is `clear`.
- Command: `just sandbox --model claude-haiku-5-5 -p "PROBE-P0: reply with the word zero only." --debug-file <tmp>/mod-probes/p-initmsg-debug.log --plugin-dir <tmp>/mod-probes/p-initmsg`.
- Logged facts (`log`):
  - The module logs `classic.SessionStart returning initialUserMessage PROBE-I` after the clear.
  - `command.run` resolves to `{"text":""}`, and no `turn.start` follows.
  - The second `session.end` fires with `reason` `other` 33 ms after the `classic.SessionStart`.
  - The transcript of the new session holds only the `/clear` rows, and it has no `PROBE-I` row.
  - The debug log has no line about `initialUserMessage`.
- Result: no turn in `-p` mode.
  The process ended before the message could queue, so this run does not show whether the message works.
  A TUI run is the next test.

## Item 3, TUI run: `initialUserMessage` on a clear

- Setup: the same probe `p-initmsg` in the TUI, with the first prompt typed in tmux and the clear from `turn.complete`.
- Command: `just sandbox --model claude-haiku-5-5 --debug-file <tmp>/mod-probes/p-initmsg-tui-debug.log --plugin-dir <tmp>/mod-probes/p-initmsg`, run in a detached tmux session.
- Logged facts (`log`):
  - `session.end` fires with `reason` `clear`, then `classic.SessionStart` fires with `source` `clear`.
  - The module returns `initialUserMessage` `PROBE-I: reply with the word eta only.` after the clear.
  - No `turn.start` follows, and the TUI shows `❯ /clear` with an empty prompt for 10 s or more.
  - The new transcript holds two `user` rows, the `/clear` command and its caveat, and no row with `PROBE-I`.
- Result: no turn in the TUI either.
  The return reached the module, and the engine did not add the message.
- Inference: the field name `initialUserMessage` at the top of `ClassicResult` may not match the classic result shape, and the `d.ts` does not show which one holds.
  This run does not show the cause.

## Item 4: a note to a running subagent with `$.session.send({ to: { agentId } })`

- Setup: the probe `p-agent` adds the agent `probe` (Haiku 5.5, `maxTurns` 8, `Read` only), and a `turn.step` hook sends `PROBE-S: report now, with the files you have read.` at the fifth request of a subagent.
  The task is 12 reads, one file per turn, in the sandbox project.
- Command: `just sandbox --model claude-haiku-5-5 -p "PROBE-A0: use the Agent tool with subagent_type probe. Give it this task: read f1.txt to f12.txt, one file per turn, then report what each file says." --debug-file <tmp>/mod-probes/p-agent-debug.log --plugin-dir <tmp>/mod-probes/p-agent --allowedTools Agent Read`.
- Logged facts (`log`):
  - The main model started three subagents, and the `turn.step` hook logged a different `agentId` for each.
  - `session.send` resolved to `{"isDelivered":true}` for two of them, at their fifth request.
  - `session.receive` fired in each of the two with `origin` `{"kind":"coordinator","plugin":"probe-agent"}` and the same text.
  - The text is a `user` row in each subagent transcript, under `subagents/agent-<id>.jsonl`.
  - One subagent answered `I stopped early as the coordinator asked. I read five of the twelve files.`
  - The other answered `I stopped before reading f11 and f12 because you asked for a report now.`
  - The third subagent got no note, ran three requests, and read f11 and f12.
- Result: works, for two of two subagents that got the note.
  Both stopped reading and reported, so they acted on the note.
- Comparison: `probes.md` section 1.1 is the only live run of a `PostToolUse` note in the research folder.
  That note came in a tool result, and the agent called it `not part of your request` and kept reading.
  The 0.28.0 text was not run live here.
- Limits: the sample is two agents from one session, and the main model is Haiku 5.5.

## Item 5: `turn.step` for a subagent request

- Logged facts (`log`), from the run of item 4:
  - Each subagent request has `agentId` set in the `turn.step` input, and the steps count from `index` 0.
  - The main requests have no `agentId`, and the log line `turn.step main` shows it.
  - The subagent steps ran 6, 3, and 6 requests, all within the `maxTurns` of 8.
- Result: works, `agentId` is set on subagent requests.

## Item 8: `classic.SubagentStop` at `maxTurns`

- Setup: the probe `p-maxturns` has the agent `probe` with `maxTurns` 3, and the module of `p-agent`.
- Command: `just sandbox --model claude-haiku-5-5 -p "PROBE-M0: use the Agent tool with subagent_type probe. Give it this task: read f1.txt to f12.txt, one file per turn, then report what each file says." --debug-file <tmp>/mod-probes/p-maxturns-debug.log --plugin-dir <tmp>/mod-probes/p-maxturns --allowedTools Agent Read`.
- Logged facts (`log`):
  - The first run of the subagent made three requests, then `turn.complete` with an empty `answer`, and no `classic.SubagentStop` followed.
  - The main model resumed the subagent, and it made three more requests.
  - The module's own note went out at the fifth cumulative request, and the subagent received it.
  - `classic.SubagentStop` fired once, after the sixth request, with `agent_id` set and `stop_hook_active` `false`.
  - The subagent made 12 requests in total, and three `turn.start` rows of `<task-notification>` text reached the main thread.
  - The main model's answer names the type `probe-maxturns:probe`, and it says that `probe` was not an available type.
  - The process exits with status 0.
- Result: partial.
  `classic.SubagentStop` fired once for two stops at the turn limit, and not at the first one.
- Inference: the first stop may not count as the end of the agent, because the main thread resumed it.
  This run does not show the cause.

## Item 6: `tool.call` on an `Agent` call with no `subagent_type`

- Setup: the probe `p-agentcall` logs each `tool.call` for `Agent`, and it returns `{ deny }` for a call with no string `subagent_type`.
- Command: `just sandbox --model claude-haiku-5-5 -p "PROBE-G0: use the Agent tool with no subagent_type. Ask the agent to read f1.txt and report its text." --debug-file <tmp>/mod-probes/p-agentcall-debug.log --plugin-dir <tmp>/mod-probes/p-agentcall --allowedTools Agent Read`.
- Logged facts (`log`):
  - `tool.call` fires for the `Agent` call, with `hasSubagentType` `false`, and the input has `description`, `prompt`, and `run_in_background`.
  - The model's answer quotes the deny text as the tool error: `The Agent tool returned this error: "PROBE-D: this Agent call has no subagent_type, so the probe refuses it."`
  - The model did not retry with a type, and it asked the user what to do next.
  - The process exits with status 0.
- Result: works, for both points.
  The hook fires with no `subagent_type`, and the deny text reaches the model as the error.

## Item 7: `classic.PreToolUse` in a module, with an `ask` return

- Setup: the probe `p-pretool` logs each `classic.PreToolUse` and returns `{ permissionDecision: 'ask', permissionDecisionReason }` for `Read`, in the TUI.
- Command: `just sandbox --model claude-haiku-5-5 --debug-file <tmp>/mod-probes/p-pretool-tui-debug.log --plugin-dir <tmp>/mod-probes/p-pretool`, in a detached tmux session, with the prompt `PROBE-K0: read f1.txt and tell me its text.`
- Logged facts (`log`):
  - `classic.PreToolUse` fires for the `Read` call, with `tool` `Read`, `file_path`, and `tool_use_id`.
  - The screen shows no permission prompt, and the `Read` runs, so the answer gives the text of `f1.txt`.
- Result: the dispatch works, and the `ask` return shows no prompt.
- Inference: the `ClassicResultFields` type in `index.d.ts` gives `PreToolUse` no field, so the module's `permissionDecision` is probably not read.
  The `d.ts` says that an event absent there reads none of the fields.

## Item 9: permission rules in the sandbox settings (not run)

- Not run: the test needs a live `git reset --hard` in the sandbox, and `CLAUDE.md` forbids running a guarded command.
- Not run: the PowerShell rule check, which was not reached in this round.
- A safe form needs the rule to ask on a command that does not run, such as a `Bash` string with no effect, and that form was not tested here.

## Item 10: a hook that throws before `next`

- Setup: the probe `p-throw` has a `tool.call` hook that throws for a `Read` of `call.txt`, and a `tool.check` hook that throws for a `Read` of `check.txt`.
  Each throw follows a rejected `$.fs.read` of `locked.txt`, a file with mode `000`.
  The hook rethrows the same rejection, so no `next` runs.
  A `session.start` hook logs the rejections of `missing.txt` and of `locked.txt`.
- Command, case 1 (`tool.call`): `just sandbox --model claude-haiku-5-5 -p "PROBE-T2: read the file <tmp>/mod-probes/p-throw/call.txt with the Read tool and reply with its exact text." --debug-file <tmp>/mod-probes/p-throw-call-debug.log --plugin-dir <tmp>/mod-probes/p-throw --allowedTools Read`.
- Command, case 2 (`tool.check`): the same form, with `check.txt`, `PROBE-T3`, and the debug file `p-throw-check-debug.log`.
- The path is absolute, because the sandbox project folder has no `call.txt`.
  A first run with a relative path (run 0) read the sandbox project, got the Read tool's own `File does not exist` text, and still logged the skip.
  Run 0 does not count as a result.
- Rejection values (`log`):
  - `$.fs.read` of `missing.txt` rejects with `name` `HooksError`, and the message ends with `failed: ENOENT`.
  - `$.fs.read` of `locked.txt` rejects with `name` `HooksError`, and the message ends with `failed: EACCES`.
  - The rejection has no `code` value.
    The error code is only in the message text.
- Case 1 result (`log`):
  - The `tool.call` hook logs its throw, and the `tool.check` hook of the same call still runs.
  - The debug log has `[ERROR] probe-throw: tool.call hook skipped: threw probe-throw: $.fs.read(...) failed: EACCES`.
    The `-p` output repeats that line.
  - The model replies `PROBE-CALL-TEXT`, the text of `call.txt`, so the Read ran.
  - The exit status is 0.
- Case 2 result (`log`):
  - The debug log has `[ERROR] probe-throw: tool.check hook skipped: threw probe-throw: $.fs.read(...) failed: EACCES`.
  - The model replies `PROBE-CHECK-TEXT`, so the Read ran under the verdict beneath.
  - The exit status is 0.
- Result: a throw before `next` skips the hook, and the call runs under the chain beneath.
  This matches the `d.ts` at `index.d.ts:3943` (a failing hook is skipped at every event), `index.d.ts:3959` (`tool.call`, "the tool runs"), and `index.d.ts:3971` (`tool.check`, "leaving the verdict beneath").
- Inference: the `print` deny and the adherence ask of `register.ts` both fail open on a throw before `next`.
  The `Bash` print deny would let the call run as written, and the adherence ask would not show.
  No classic hook ran here, so this does not compare with the old classic behavior.
- Inference: the throw after `next` resolved, at `register.ts:18`, follows the same skip rule, but this item does not test it.
- Not tested:
  - A `Bash` call, the case of the print deny.
    The probe used `Read`, because a `Bash` call in the sandbox session starts a second Seatbelt sandbox (see `wiki/plugins/Sandbox.md`, Agent sessions).
  - A `tool.check` whose verdict beneath is `ask` or `deny`.
    Case 2 had `--allowedTools Read`, so the verdict beneath was allow.
  - A throw after `next` resolved.
  - A classic hook that throws, for the comparison that the brief names.

## Status

- Round 2 results: items 1, 2, 4, 5, and 6 work, item 3 starts no turn, item 7 dispatches but its `ask` shows no prompt, item 8 is partial, item 9 is not run, and item 10 shows that a throw before `next` skips the hook.
- Live sessions so far: 16, with 11 in round 2 (the earlier count follows) (run 1 with no module, run 2 with a debug file and no module, run 3 with the clear, run 4 that failed to load on the `turn.step` shape, and run 5 with the full probe).
  Item 10 uses three of them, run 0 and the two cases.
- Experiments: 1, 2 (timer and `turn.complete`), 4 (usage), and 5 work.
- Static check: `claude plugin validate` reports the `turn.step` shape as an error with no login (`log`).
