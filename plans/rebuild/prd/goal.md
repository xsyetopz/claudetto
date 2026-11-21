# Goal Requirements

claudetto gives the model its own goal tools and keeps the user in control of `/goal`. Claude Code 2.1.330 evaluates a goal with a haiku prompt hook after each stop; the model cannot mark a goal met, the evaluator sees only the transcript, and the ninth consecutive block pauses the goal (reports/2026-11-21-goal). The 2026-11-21 lead ruling: claudetto gives the model goal tools; the built-ins are probed first and, being missing or gated, are turned off through `tool.offer` and replaced by snake_case `get_goal`, `set_goal`, `pause_goal`; the tool that ends a met goal is `clear_goal`, mirroring `/goal clear`; each description is at most 200 characters.

## Probes

Each result is from Claude Code 2.1.330 on a fake API (reports/2026-11-21-goal, section 6).

- **Hypothesis:** `command.run` fires for `/goal` and can rewrite or refuse. **Check:** a logging hook on `-p "/goal ..."`. **Result:** fires with `origin: sdk`; `{ text }` sets no goal; a rewritten `args` reaches the evaluator.
- **Hypothesis:** `tool.call`, `tool.offer`, `tool.describe` see SetGoal, PauseGoal, GetGoal. **Check:** log them. **Result:** the built-ins are absent from the session's tool list (server-gated), so unprobeable; the events fire for plugin tools.
- **Hypothesis:** `$.command.run("goal", "clear")` works from a plugin tool. **Check:** timer started by the tool. **Result:** `Goal cleared: <cond>` once the turn ended.
- **Hypothesis:** `$.env.set` of the stop cap is live. **Check:** set 2, count requests. **Result:** 3 requests against 9 by default. Live.
- **Hypothesis:** `$.env.set` of `CLAUDE_CODE_GOAL_CHECKIN_MINUTES` is live. **Check:** set 7. **Result:** accepted; effect unobservable.
- **Hypothesis:** `classic.Stop` sees what a goal block says. **Check:** log each Stop. **Result:** it sees `stop_hook_active` and the last assistant text, not the verdict; the reason arrives as a `note` row.

## Tools

- [x] **REQ-GOAL-001** claudetto shall register `get_goal`, `set_goal`, `pause_goal` and `clear_goal` for the interactive main loop, and send `isOffered: false` for the built-in `SetGoal`, `PauseGoal` and `GetGoal`.
  Acceptance: each description is at most 200 characters; the built-in names are withdrawn. Verification: test. Status: shipped (`hooks/goal/tools.ts`). Verified: `goal.test.ts`.

- [x] **REQ-GOAL-002** `clear_goal` shall end a goal only with evidence: it is refused when the last cited check failed, or a check cited as passed has no Bash run of that exact command with a result in the transcript, or its newest run errored, and an accepted claim is echoed to the user through `$.ui`.
  Acceptance: tests cover a refusal after a failed check, a refusal for a cited check with no run, an acceptance after a rerun that passed, and an accepted claim with its echo. Verification: test. Status: shipped (`evidence.ts`). Verified: `evidence.test.ts`, `goal.test.ts`.

## Set Time

- [x] **REQ-GOAL-010** `/goal <condition>` that names a path missing from the session directory shall warn the user at set time, and still set the goal.
  Acceptance: a test shows the warning for a missing path and none for an existing one. Verification: test. Status: shipped (`paths.ts`, `command.ts`). Verified: `paths.test.ts`.
  ENGINE(v2.1.330): no hook runs between the typed command and the set, so the check warns; a refusal would hide a goal the user chose.

## Blocks

- [x] **REQ-GOAL-020** claudetto shall count the stop blocks of each goal and add a note to the feedback row two blocks before the cap, naming the cap and that the goal then pauses.
  Acceptance: a test shows the note near the cap and none earlier; the cap comes from `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` (default 8). Verification: test. Status: shipped (`state.ts`, `feedback.ts`). Verified: `state.test.ts`, `goal.test.ts`.
  ENGINE(v2.1.330): no hook sees or moves the cap, so the note informs and never overrides.

## Delegation

- [x] **REQ-GOAL-030** Moved Out as OUT-3063: ADR-0177: delegate-two-files scored 1.00 with and 1.00 without, and trivial-typo 1.00 with and 1.00 without (`just eval claudetto --runs 3 --model claude-opus-5-5`, 2026-11-21, graders read outcomes only), so the note shows no measured gain over vanilla.

## Limits

- A goal command cannot run mid-turn, so `set_goal` and `clear_goal` land after the turn (a timer runs the command).
- Met detection reads the absence of a feedback row after a stop; an evaluator error can look like met.
- The goal tools run only where the session is interactive; end-to-end runs on the fake API with the repo plugin are not done.
- `CLAUDE_CODE_GOAL_CHECKIN_MINUTES` has no test.
