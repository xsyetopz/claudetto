---
schema: dotclaude-spec/2
kind: change
id: 1.1.0
size: large
status: implementing
verify: just check
---

# 1.1.0: fixes from the sessions of 1.0.0

## Why

1.0.0 is tagged for each of the 8 plugins, and the sessions after the tag show defects that the tests do not catch.
dotclaude 0.28.0 built 1.0.0 with much Haiku 5.5 work at `medium`, and the review change `Second-checking` did not find what the sessions of the user found.
Claude asks the user in plain text more often than with `AskUserQuestion` (5 plain-text questions against 2 tool calls).
Replies open with apologies and agreement.
A signed `git commit` fails in the sandbox with `Couldn't load public key ~/.ssh/id_ed25519.pub`.
"Prompt is too long" stops 10 of 43 sessions.
A subagent got the text "Commit your work first, then report" in its tool results, and it read the text as an injection.
The source of that text is the `handoff` slice of dotclaude (`slices/handoff/domain/context.ts:41`).
The status line uses green and red for state only, and the identity items have no color of their own.
`dcc-plugin-you-should-know` does not have the UX of the built-in plugin.
`dotclaude-sessions` cannot tell the user what went wrong in a session.
The `rm` ask rules and the file-print deny stop commands that they do not target.
The spec CLI has no way back from `planned`, and `validate` does not run the checks of the plan gate.

## Decisions of the user (2026-10-14)

- The change is `1.1.0`, a minor version.
- The local-only `.dotclaude/` paths stay in `.git/info/exclude`, not in `.gitignore`.
  dotclaude writes the exclude at each `SessionStart`, and the write is idempotent.
- `dcc-plugin-agents-md` stays, because the built-in `cc-plugin-agents-md` does not cover each `AGENTS.md` place.
  1.1.0 does no comparison work on it.
- `dcc-plugin-you-should-know` copies the UX of the built-in `cc-plugin-you-should-know` of Claude Code 2.1.296 where the mod API permits it.
- No patch of the Claude Code binary.
  dotclaude uses only documented extension points and the mod API that it already uses.
- A review wave comes first, and the feature packages of a slice wait for the review of that slice.
- The model routes of D11 in [design](design.md#decisions-of-the-user-pending-verification).
- The decisions D1 to D8 and D11 in [design](design.md#decisions-of-the-user-pending-verification).
- Each decision is final only when its check passes.
  When a check disagrees with a decision, the implementer tells the user and asks, and does not go on.

## Scope

- A review of each slice of the core plugin, of each add-on plugin, of `src/kernel/`, and of `tools/`, with a fix package for each review.
- The close-out of the open packages of 1.0.0 and of the change `Second-checking`, after the user approves it ([design](design.md#close-out-of-100)).
- The exclude write at each `SessionStart`.
- Questions to the user through `AskUserQuestion`, in the prompt text only.
- No social padding in replies, in the prompt text only.
- Signed commits in the sandbox, with the private keys still unreadable.
- Session diagnosis commands in `dotclaude-sessions`.
- A status line palette with one source.
- The UX of the built-in you-should-know plugin.
- The failures I01 to I18 of `external/agent-failure-dossier/`.
- The report-now note of the `handoff` slice, and a survey of instruction-shaped text in tool results.
- The model routes of the agents, a new `searcher` agent, and their measurement.
- The `rm` ask rules, the file-print deny, and the search tools.
- The spec CLI: a way back from `planned`, and the plan-gate checks in `validate`.
- Each text that Claude reads from dotclaude, rewritten to the guidance of Anthropic, with evals that show the change.
- The work of 1.0.0 that moves here: P18 history, P43 resume mandate, P45 agent choices page, and P47 agent prompts.
- The docs, the CHANGELOG, `just bump`, `just generate`, and `just check`.

## Out of scope

- A patch of the Claude Code binary or its npm package.
- A comparison of `dcc-plugin-agents-md` with the built-in plugin.
- A migration path or a compatibility layer.

## Requirements

### REQ-1: Close-out of the open work of 1.0.0

Each open package of 1.0.0 MUST end as `done`, or as `canceled` with a note that names the 1.1.0 package that takes its work.
The change `Second-checking` MUST be accepted and archived.
No status changes before the user approves the list of proposals.

### REQ-2: Local exclude at each session start

At each `SessionStart` in a git repository, dotclaude MUST add each missing pattern of `GIT_EXCLUDE_PATTERNS` to `.git/info/exclude`.
A second run MUST add nothing, and a failure MUST NOT stop the session.

### REQ-3: Questions go through `AskUserQuestion`

The always-on prompt and the skills MUST name `AskUserQuestion` for a question to the user.
The always-on prompt MUST tell Claude to try first, to ask only when the answer changes a costly or irreversible step, and to bundle its questions in one call (I13).
The fix is in the prompt only: no hook acts on a text pattern of the prose of Claude (decision of the user, 2026-10-14).
A `just eval` case that a model judges MUST fail on 1.0.0 and pass after the change.

### REQ-4: No social padding

The always-on prompt MUST tell Claude to start with the answer, with no apology, agreement opener, flattery, preamble, or self-narration.
It MUST tell Claude that an agreement names the fact or the check that shows it (I06).
The fix is in the prompt surface only: no hook, regex, or text detector acts on an opener, an apology, a preamble, or self-narration (decision of the user, 2026-10-14).
A `just eval` case that a model judges MUST fail on 1.0.0 and pass after the change, and one case MUST start from a correction of the user.

### REQ-5: Signed commits in the sandbox

A `git commit` with ssh or gpg signing MUST work in the sandbox when the key is in an agent.
The `Read` tool and a sandboxed command MUST NOT read a private key.
A test MUST show that a sandboxed read of a private key fails.

### REQ-6: Session diagnosis

`dotclaude-sessions` MUST have a command that reads the transcripts and tells the user what went wrong in a session, with each finding mapped to a dossier ID.
Each signal MUST have a known-good and a known-bad fixture.

### REQ-7: Status line palette

Each identity item of the status line MUST have a stable hue of its own, and only state items use green, yellow, and red, for health, as the lights of REQ-26.
The palette MUST have one source.

### REQ-8: The UX of the built-in you-should-know

`dcc-plugin-you-should-know` MUST copy the trigger, the side agent, the band, the buttons, the feedback row, and the bounds of the built-in plugin of Claude Code 2.1.296, where the mod API permits.
The check MUST run on `turn.step` at step 0 and at each 6th step.
The side agent MUST be a `$.model.fork` call with no tools, with a prompt in the words of dotclaude (D5).
The band MUST be on `AbovePrompt`, with a `hotkey` on each `Button` and the theme color `suggestion`.
The plugin MUST NOT call `$.telemetry`, and it uses `$.ui.log` in its place.
No band is expected on mobile and in vscode.
Each gap MUST be in the evidence file, with its bundle line or its types line.

### REQ-9: Dossier failures

dotclaude MUST address each of I01 to I18 of `external/agent-failure-dossier/00-INDEX.md` with a hook, a setting, a check, or a recorded decision of the user.
Each ID that stays open MUST be in the evidence file with its reason.
A tool error MUST NOT count as a negative result.

### REQ-10: Instruction text in tool results

Each text that a dotclaude hook adds to a tool result MUST name its source and fit the role of the agent that gets it.
It MUST NOT repeat on each tool call of the same agent.
A survey MUST find which files and transcripts hold instruction-shaped text in tool results.

### REQ-11: Moved work of 1.0.0

The history cleanup, the resume mandate, the agent prompts, and the agent choices page of 1.0.0 MUST be done in 1.1.0.

### REQ-12: Release

The CHANGELOG, the wiki, and the versions MUST show 1.1.0, and `just check` MUST pass.

### REQ-13: Review wave

A `reviewer` run MUST review each slice of the core plugin, each add-on plugin, `src/kernel/`, and `tools/` against `external/agent-failure-dossier/` and for code smells.
Each confirmed finding MUST get a failing test first, and then a fix.
A fix MUST change the code at the cause, and MUST NOT add a layer around defective code.
A fix MAY rewrite a slice inside the same contract, and it MUST remove the code that it makes unused.
The feature packages of a slice MUST wait for the review of that slice.

### REQ-14: Model routes of the agents

Each shipped agent MUST have the model and the effort of D11.
No shipped agent runs on Sonnet 5.5, until a measurement shows a better route.
A new read-only `searcher` agent MUST do pure file search.
Each route change MUST pass `just eval`, with the method and the results in an evidence file, before the release.

### REQ-15: Ask on changes to tests, hooks, and checks (I05)

A change to a test, a hook file, or a check MUST ask the user before it runs, unless it is on the safe list of its kind.

### REQ-16: User-owned values (I14)

A user-owned value that exists in the code, such as a bound, a budget, a baseline, or a test expectation, MUST change only after the user names the new value.
The ask MUST name the old value and the new value.
A new value in a plan is a decision of REQ-25, so Jev picks it when Jev is available (the user, 2026-10-14).

### REQ-17: No tests of prose (I15)

A test or a grader of 1.1.0 MUST NOT assert the words of a prompt, a hook reason, or a doc.
A grader of a behavior that exists only as reply text, such as an opener, MUST be a model judge in a `just eval` case, and it MUST pass a known-good reply and fail a known-bad reply before its first run (I15 recipe 2).
A hook MUST NOT act on a text pattern of the prose of Claude.

### REQ-18: Known-good and known-bad fixtures (I16)

Each count that the plan relies on MUST come from a counter that has a known-good and a known-bad fixture.

### REQ-19: Search tools (I18)

The agents that need no shell MUST get the `Grep` and `Glob` tools.
A raw search in `Bash` MUST get at most one deny for each agent in a session, and the reason names the tool to use.
The user MUST learn how to give the main session `Grep` and `Glob`.

### REQ-20: Spec CLI gate checks

The spec CLI MUST have a command that takes a `planned` change back to `specified`, with a reason in `events.jsonl`.
The command MUST refuse a change that has a package past `planned`.
`dotclaude-spec validate` MUST run the coverage and unknown-ID checks of the plan gate.

### REQ-21: `rm` ask rule

An `rm` command MUST ask only when it removes recursively.
A wildcard rule of the settings MUST NOT match a command that it does not target.

### REQ-22: File-print deny

The file-print deny MUST fire only when the whole command prints a file.

### REQ-23: Prompt surface to Anthropic guidance

Each text that Claude reads from dotclaude MUST follow the current guidance of Anthropic for Opus 5.5 and Fable 5.1:
the output styles, the prompt and surface texts, the agent prompts and descriptions, the skill descriptions and bodies, the plugin descriptions, the hook texts, `src/fragments/`, and the `userConfig` descriptions.
Each text MUST keep the STE rules of `.claude/rules/ste-messages.md`.
A surface that misses an override point MUST use it, documented or not, and the wiki MUST document each undocumented point (the user, 2026-10-14).
`just eval` cases MUST fail on 1.0.0 and pass after the rewrite, for agreement openers, apologies, preambles, and self-narration, for a plain-text question where `AskUserQuestion` fits, and for the routing to the right agent.

### REQ-24: The agents know the usage and the context

The main session MUST get one usage note when a `five_hour` or `seven_day` window of the saved `rate_limits` sample crosses into a band of `USAGE_BANDS`, and one when the window goes into deficit.
A deficit is a positive pace: the used percent minus the elapsed percent of the window, as `statusline/domain/pace.ts` computes it.
Each signal MUST have a state of the traffic light of REQ-26, and the note gives the numbers and the instruction of that light.
The light of a usage window comes from the gauge of REQ-26.
A note goes again only when the light of a signal drops.
A subagent MUST get the active usage note in its start context through `agent.spawn`, and a new note on its next tool call when the state changes during its run.
A subagent MUST get one soft note when its context passes `AGENT_CONTEXT_SOFT_PERCENT` of its bound.
No note goes while each window is under its mark and not in deficit, so the cost when usage is normal is zero tokens.
The context of the main session is the work of P70: the trigger in the middle of a turn, and the hard bound that keeps room for the handoff.
The values are `USAGE_BANDS` 60, 80, and 90, and `AGENT_CONTEXT_SOFT_PERCENT` 70 (70,000 tokens of the 100,000 bound, 59,500 of the Haiku bound of 85,000), from D13.
Each note MUST come only from structured facts: the usage of the model requests and the saved `rate_limits` sample.
The prompt of each agent MUST say that a context or usage number is not a reason to stop a task early, and that the handoff saves the state (P80, P153).
The env of dotclaude MUST set `CLAUDE_CODE_TOTAL_TOKENS_REMINDER` to `countdown` (D14), and a test MUST pin it.
No note, bound, or trigger of dotclaude MUST depend on that reminder, so a Claude Code release that removes it costs only the countdown.
A check of `just check` MUST read the installed Claude Code bundle and fail when an item of `wiki/claude-code/Undocumented-Settings.md` that dotclaude sets is missing or has another mode list.
Each undocumented item of Claude Code that dotclaude uses or sets MUST be on a wiki page: `wiki/claude-code/Undocumented-Reads.md` for a read, and `wiki/claude-code/Undocumented-Settings.md` for a setting.
A sample older than `USAGE_SAMPLE_MAX_MS` (10 minutes, `spec/limits.ts:13`) gives no note.
The facts that Claude Code gives a subagent are the facts of the bundle read in `design.md` ("Context facts in Claude Code 2.1.296").
A test in `tests/dotclaude/handoff/` MUST pin the env value that dotclaude sets for the `totalTokensReminder` of Claude Code, so that the hook note and the Claude Code reminder do not give the same fact.
A new Claude Code version MUST get the bundle read again before the release.

### REQ-26: One traffic light for each bound

Each bound of dotclaude that an agent or the user must see MUST show as a gauge of the room left, as a fuel gauge does: a step from 10 (full) to 0 (the limit), one step for each 10% of room, rounded up.
The color of a step comes from the marks of its signal, and each signal has six lights in this order: green, green blinking, yellow, yellow blinking, red, and red blinking.
A blinking light has one meaning only: the light is about to drop to the next band.
It shows on the last step of a band, and when a trend points down, such as a pace deficit or a late handoff file.
Red blinking is the exception: it means that the limit is reached or passed.
The red mark is a limit line, as the red radial line of an aircraft gauge (14 CFR 25.1549), and not a step of the scale.
The gauge and the light MUST have one source in `src/kernel/light.ts`, and the notes of REQ-24, the handoff of P70, and the status line of REQ-7 MUST use it.

| Steps of room left | Usage window, percent used | Light |
| --- | --- | --- |
| 10 to 6 | under 50 | green |
| 5 | 50 to 59 | green blinking |
| 4 and 3 | 60 to 79 | yellow |
| 2 | 80 to 89 | yellow blinking |
| 1 | 90 to 99 | red |
| 0 | 100, or extra usage | red blinking |

A pace deficit makes a green or yellow light blink, and it does not change red.

| Light | Meaning | Note to the agent |
| --- | --- | --- |
| green | normal | none |
| green blinking | normal, but about to drop to yellow | none, status line only |
| yellow | caution | take the less costly path |
| yellow blinking | near red | also start no new parallel subagents, save the state, and ask the user before a large run |
| red | stop new work | finish the current step, write the handoff, and start no new work |
| red blinking | the limit is reached or passed | stop, and tell the user the state |

The signals:

- Usage window: the table above, with the marks `USAGE_BANDS` of REQ-24.
- Context of the main session: green under 50% used, green blinking from 50%, yellow from `CONTEXT_PERCENT` 60 (the handoff starts), yellow blinking from 80% or when the handoff file is late, red from `HANDOFF_HARD_PERCENT` (tool calls stop), and red blinking above the compaction mark (compaction runs and counts as a failure).
- Context of a subagent, in percent of its bound: green under 60, green blinking from 60, yellow from `AGENT_CONTEXT_SOFT_PERCENT` 70, yellow blinking from 90, and red at the bound (report now).
  A Haiku 5.5 subagent is red blinking from 100,000 tokens, where its price steps up.
- A signal that has no state for a light skips it.

The status line MUST show the step and the light of each state item, such as `▮4` in yellow.
A blinking light uses the SGR blink code when Claude Code renders it, or a marker when it does not.
The note to an agent gives the step, the light, and the numbers.

D15 holds this form: Jev picked it on 2026-10-14 with a confidence of 0.15, before the aircraft model (three bands and a red line, 0.32 against 0.36).
The live check of P61 shows it to the user before the release.

### REQ-25: Decisions go to Jev first, then to the user

When Jev is available, Claude MUST send each decision that facts can settle to Jev with the `second_opinion` tool before it asks the user.
The question MUST be neutral, each option MUST have one fact for it and one fact against it, and the state MUST leave out the lean of Claude, the user, and the notes.
Claude MUST NOT game Jev: no option shaped to get a pick, no second ask of the same decision without a new fact, and no pick taken from a fallback model as the pick of Jev.
Claude MUST follow the pick, or tell the user the reason when it does not.
When Jev is not available for any reason, such as no `TYPESAFE_API_KEY`, a timeout, an error, or no answer, Claude MUST ask the user with `AskUserQuestion`.
The fallback model MUST NOT answer a decision in place of Jev.
Goals, preferences, and approvals of an action that is hard to undo or that other people see stay with the user.

### REQ-27: Context budget of the first turn

Each text that dotclaude adds to the context of a session MUST have a budget in characters: the system prompt texts, the output styles, the skill and agent descriptions, the hook texts, and the fragments.
A test MUST fail when a text goes over its budget.
The evidence MUST give the size and the source of each part of the first turn of a fresh session.
Each part that Claude Code adds MUST have its override points, documented or not, or a note that it has none.
dotclaude MUST use an undocumented override point when it makes a part smaller, and the wiki MUST document each undocumented point that the search finds, also one that dotclaude does not use (the user, 2026-10-14).
A budget value is a decision of REQ-25.

## Evidence

The evidence of each item is in [design](design.md), with the file and line of each fact.
