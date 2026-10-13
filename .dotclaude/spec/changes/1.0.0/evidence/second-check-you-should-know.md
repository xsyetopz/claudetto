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
- Each button has a no-op `onPress`, because the engine skips a render hook whose `Button` has none.
  A press runs the `ui.press` chain.
- The heads-up press fills the prompt with the quoted topic, and stores a note.
- A `tool.call` hook appends the note to the `context` of the next call of the main agent, once.
  It skips a call of a subagent (`agentId` set) and a denied call.
- A `turn.start` hook clears an ignored band and drops a note that did not reach a call.
- The check skips subagents and runs once per turn, on the first changing call.
- The check starts its model call without waiting for it, so the tool does not wait.

## Checks of the names

Each name was checked against `plugins/dotclaude/.claude-plugin/types/claude-code/index.d.ts`:
`$.ui.resolve`, `$.ui.invalidate("ui.render")`, `$.prompt.fill` (mode `insert`), `$.state.get`/`set`,
the events `ui.render`, `ui.press`, `tool.check`, `tool.call`, and `turn.start`,
the `context` field of a successful `ToolCallResult`, and `agentId` on the loop input.
The removed `ui.press` method was never a `$.ui` member: `ui.press` is an event.

## Review findings

The numbers follow the review of the change.
The tests are in `src/plugins/dcc-plugin-you-should-know/slices/notice/lab/notice.test.ts`.
"Failed before" means that the test failed when the `mod.ts` of `07f26cad` ran with the test of `5d8e9bce`.

| Finding | Test | Failed before | Verdict | Fix commit |
| --- | --- | --- | --- | --- |
| 1. The band was never drawn, because each `Button` had no `onPress`. | `the first changing call of a turn shows the topic in the band` | Yes. | fixed | `5d8e9bce` |
| 2. The heads-up note did not reach the `context` of the next call of the main agent. | `a heads-up stays in the session until the main agent reads it once`, `a subagent's call takes no heads-up note, and the main agent's call does`, and `dismiss clears the band and writes no note` | Yes, all three. | fixed | `5d8e9bce` |
| 3. Unawaited `$` calls may be cancelled or dropped after the hook returns. | None. | Not tested. | open, see the next section | None |
| 4. The tool waited for a model call that was slower than its bound. | `the tool does not wait for a model call that is slower than its bound` | Yes. The test took 5004.60 ms. | fixed | `5d8e9bce` |

The `turn.start` clear has the test `the band is cleared at turn.start`.
It passed before the fix, so it is a guard and not a fix.

## Finding 3: unawaited `$` calls

The question is whether the runtime cancels or drops a `$` call that a hook starts and does not await, after the hook returns.
The bundle answers part of the question.
The line numbers are in `external/cc-2.1.296/strings.txt`.

- Line 230271 and line 251177 hold the messages `its environment was retired by a reload during` and `its environment was unloaded`.
- Line 230313 holds `the op was aborted: the plugin's environment was unloaded`.
  The same text is built by `yas` in the minified dispatch chunk at line 323778.
- The chunk at line 323778 skips a module whose status is not `live` at the start of an event, and it logs `passing on`.
  This check runs before a dispatch, not after a hook returns.
- The dispatch loop at line 323778 stops when the caller's signal is aborted (`g.aborted`).
  No code in the chunk aborts that signal when a hook returns.
- Lines 215287 and 222760 say that an awaited call from a hook waits on the turn that the hook holds.
  They do not say what happens to an unawaited call.

The bundle shows cancellation at environment unload and at an aborted signal.
It does not show cancellation when a hook returns.
Finding 3 stays `open` for the hook-return case, and the code is not changed.
The mod runtime has no test for this case in the lab.

## Lab

- `bunx biome check` passed on the plugin source (8 files) before the fix.
- The lab rejected `bandOf($, ...)` in `band.ts`, because `$` cannot cross an import.
  The band tree moved into `onRender` in `mod.ts`.
- The lab mounts `AbovePrompt`, so the band tests assert the drawn band.
- With the `mod.ts` of `07f26cad`, `claude plugin test plugins/dcc-plugin-you-should-know` gave 16 pass and 5 fail of 21.
- With the fix of `5d8e9bce`, the same command gives 21 pass and 0 fail.

## Timing and model calls

Not measured live.
The separate call has the 5000 ms bound and the fork has the 6000 ms bound.

## Not verified

- The band look in a real session, and whether it interrupts the root orchestrator.
- The heads-up press and the context note in a live session.
  The lab stubs both.
- The builtin's 6-step cadence.
- Finding 3, in a live session.
