# Second check: you-should-know band (P06)

## The builtin

The builtin `cc-plugin-you-should-know@builtin` is defined in `external/cc-2.1.296/strings.txt`, line 351768.
Its choices are at line 351789: `1` Learn more, `2` Knew this already, `0` Dismiss, and `4` Disable.
Line 351778 gives the `model.fork` call and the `turn.step` hook of the plugin.
The step counter that runs the check every 6 model steps was not found in this pass, so that claim is not verified.

## Ours before this change

The notice used `$.ui.toast`, which draws a truncated element in the top-right corner.
Its check ran on the first changing call of a turn through `tool.check`.

## Ours after this change

- The notice is a band above the prompt, drawn by a `ui.render` hook on the `AbovePrompt` component.
- The band has two choices: `heads_up` (`1`) and `dismiss` (`0`).
- The heads-up press fills the prompt with the quoted topic, and stores a note.
- A `tool.call` hook gives the note to the next call of the main agent that runs, once.
  It skips a call of a subagent (`agentId` set) and a denied call.
- A `turn.start` hook drops a note that did not reach a call.
- The check skips subagents and runs once per turn, on the first changing call.

## Checks of the names

Each name was checked against `plugins/dotclaude/.claude-plugin/types/claude-code/index.d.ts`:
`$.ui.resolve`, `$.ui.invalidate("ui.render")`, `$.prompt.fill` (mode `insert`), `$.state.get`/`set`,
the events `ui.render`, `ui.press`, `tool.check`, `tool.call`, and `turn.start`,
the `context` field of a successful `ToolCallResult`, and `agentId` on the loop input.
The removed `ui.press` method was never a `$.ui` member: `ui.press` is an event.

## Lab

- `bunx biome check` passed on the plugin source (8 files).
- The lab rejected `bandOf($, ...)` in `band.ts`, because `$` cannot cross an import.
  The band tree moved into `onRender` in `mod.ts`.
- `just lab` cannot mount `AbovePrompt` (`no implementation for ui.render`), and test bodies have no `$.state`.
  The lab test therefore asserts that no toast is drawn, and the model calls and verdicts.
  The old assertion (`seen.toasts` equal to the topic) now fails on the toast code, by reasoning.
  It was not run against the old code.

## Timing and model calls

Not measured live.
The separate call has the 5000 ms bound and the fork has the 6000 ms bound.

## Not verified

- The band look in a real session, and whether it interrupts the root orchestrator.
- The heads-up press and the context note in the lab.
  They need a live session.
- The builtin's 6-step cadence.
