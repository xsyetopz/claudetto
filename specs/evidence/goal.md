# Goal Requirements

Target: Claude Code 2.1.329 only (ADR-0198). A Verified line on another version is history; each item below is settled by a 2.1.329 check.

claudetto gives the model its own goal tools and keeps the user in control of `/goal`. Claude Code 2.1.330 evaluates a goal with a haiku prompt hook after each stop; the model cannot mark a goal met, the evaluator sees only the transcript, and the ninth consecutive block pauses the goal (reports/2026-11-21-goal). The 2026-11-21 lead ruling: claudetto gives the model goal tools; the built-ins are probed first and, being missing or gated, are turned off through `tool.offer` and replaced by snake_case `get_goal`, `set_goal`, `pause_goal`; the tool that ends a met goal is `clear_goal`, mirroring `/goal clear`; each description is at most 200 characters.

Verified (batch, test-checked requirements): `just verify`, claude 2.1.329, 2026-11-24: exit 0, 834 tests in 102 files, 0 fail; covers REQ-GOAL-001, REQ-GOAL-002, REQ-GOAL-003, REQ-GOAL-010, REQ-GOAL-020; test files `plugins/claudetto/hooks/goal/__tests__/evidence.test.ts`, `plugins/claudetto/hooks/goal/__tests__/goal.test.ts`, `plugins/claudetto/hooks/goal/__tests__/paths.test.ts`, `plugins/claudetto/hooks/goal/__tests__/state.test.ts`.

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

- [x] **REQ-GOAL-003** `get_goal`, `pause_goal` and `clear_goal` shall run without the engine's ask for an MCP tool, unless a settings rule decides; `pause_goal` shall sit in the prompt; and a Stop-hook block of a goal the model paused or cleared shall end the main turn.
  Acceptance: on a goal whose last step only the user holds, claudetto ends the turn in fewer blocks than vanilla, and on a goal the agent can finish it calls no `pause_goal`. Verification: test and probe. Status: shipped 2026-11-24 (`tools.ts`, `feedback.ts`). Verified: `goal.test.ts` (the check verdicts, an abort after a pause and none before); the RISK-520 probe on claude 2.1.331, Sonnet 5.5: 3 blocks in 3 of 3 runs against vanilla's 9 in 4 of 4, and no pause on two finishable goals in 3 of 3.
  ENGINE(v2.1.331): a queued `/goal clear` lands only after the turn, so without the abort the evaluator keeps judging the paused condition until the cap.
  Evidence: held-out, claude 2.1.329, 2026-11-24, `just eval-holdout claudetto claude-opus-5-5 -j 4 --max-cost-usd 40`, result `plugins/claudetto/evals/results/holdout-2026-11-24T06-48-49-510Z.json` (local, gitignored): model `claude-opus-5-5`, not partial, 11 cases (5 before, 6 added blind by a fresh Sonnet subagent), mean Δ +0.036, $10.05; only the aggregate was read (ADR-0193), so the figure backs claudetto as a whole, not this part alone (CON-059).

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
  Verified: 2026-11-24, claude 2.1.329, Opus 5.5, delegate-two-files restored from 1197c2fef^ into an untracked --eval-dir (`reports/2026-11-24-research/pin-2-1-329/suite/removed-cases.txt`, $3.28 for the three cases): 1,1,1 with and 1,1,1 without, so vanilla still passes and the Out holds.

## Limits

- A goal command cannot run mid-turn, so `set_goal` and `clear_goal` land after the turn (a timer runs the command).
- Met detection reads the absence of a feedback row after a stop; an evaluator error can look like met.
- The goal tools are registered in `-p` sessions too and ran there in the 2026-11-24 RISK-520 probe; no end-to-end run covers an interactive session.
- The note `/goal` returns at set time did not reach the model under `-p` (the 2026-11-24 traces hold no copy of it), so a headless model learns of the deferred goal tools only from the cap note.
- `CLAUDE_CODE_GOAL_CHECKIN_MINUTES` has no test.
