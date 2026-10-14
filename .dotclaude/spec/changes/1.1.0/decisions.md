# Decisions of 1.1.0

This file is a part of [`design.md`](design.md).

## Decisions of the User, Pending Verification

The user chose D1 to D6 and D11 on 2026-10-14.
D7 and D8 had nothing left to decide after the drops of P63 and P65.
A decision is final only when its check passes.
When a check disagrees with a decision, the implementer tells the user and asks, and does not go on.

| Decision | Check |
| --- | --- |
| D4 | P60: a signed commit works in the sandbox, and a sandboxed read of a private key fails |
| D11 | P136: the 4-arm `just eval` measurement |
| I18 design | P142: whether a hook can tell that `Grep` is in the session, and the `just sandbox-alone` check with and without `--allowedTools Grep Glob` |
| P70 handover | the `just lab` replay of `d87f7ed2`, and one live handover |
| REQ-8 UX | P69: one live session that shows the band |
| Review wave | a failing test before each fix |

- D1, I03 compaction: compaction is on as a last resort after the handoff (P70, P151).
  The handoff is the first path, with the default `auto`, a trigger in the middle of a turn, and a hard bound near 85%.
  Compaction starts only above the hard bound, such as at 95%, and only when the handoff failed (decision of the user, 2026-10-14).
  No acceptance criterion, measurement, or design depends on compaction, and each compaction counts as a handoff failure in `dotclaude-diagnose` (P66, P67).
- D2, `maxTurns`: no agent has a `maxTurns`, as the user decided on 2026-10-13.
  P71 is dropped, and P57 handles the handbacks.
- D3, `allowUnsandboxedCommands`: it stays `true`.
  P76 adds an ask, with the reason, to each call with `dangerouslyDisableSandbox`.
- D4, signing route: option (a).
  `allowRead` for the public key files and `allowUnixSockets` for the ssh-agent and gpg-agent sockets (P60).
  Both deny rules stay, and `excludedCommands` gets no `git commit`.
- D5, the text of the side agent of you-should-know: the UX of the built-in, with prompt text in the words of dotclaude.
  No text of the built-in is copied.
- D6, instruction-shaped text in tool results: origin tags and role-aware text only (P57, P58).
  P73 is dropped.
- D11, model routes: the table of "Model routes".
  No shipped agent runs on Sonnet 5.5 until P136 shows a better arm.
  P136 can change the front matter of `investigator` and `researcher` through P135 before the release, and it changes no requirement.

- D13, the marks of P158 (REQ-24), from Jev on 2026-10-14 at the direction of the user:
  `USAGE_BANDS` 60, 80, and 90 (Jev: bands, 0.83, against one mark at 90 and a pace-only note).
  `AGENT_CONTEXT_SOFT_PERCENT` 70 (Jev: 0.37, not sure, against 85 at 0.37 and 50).
  `USAGE_READ_MIN_MS` 60,000, only if step 2 of P158 needs a process run.
  No source gives a band value, so the live check of P158 verifies them.
- D15, the form of the lights (REQ-26), from Jev on 2026-10-14: the gauge of room left from 10 to 0 (0.15, not sure: 0.36 against 0.32 for the aircraft model of three bands and a red line, 0.24 for railway aspects, and 0.08 for the six states by percent used).
  The `researcher` run of 2026-10-14 found no standard with a 10-step color scale.
  14 CFR 25.1549 gives the green arc, the yellow arc, and the red line, and the meaning of a blink differs in each system that it read.
  So the blink of dotclaude has one meaning, and the live check of P61 shows the form to the user.
- D14, the Claude Code reminder, from Jev on 2026-10-14: `countdown` (0.61, against `off` and the default).
  Each agent sees its live room to the window after each tool result.
  The env var is `@internal`, so `wiki/claude-code/Undocumented-Settings.md` lists it, and a test pins it.
  The live check of P158 confirms the bundle facts before the release.

### Research for REQ-24 (2026-10-14)

A `researcher` run gave these facts, each from the source named:

- Opus 4.7 and later, Sonnet 5.5, Fable 5.1, and Haiku 5.5 get no context-awareness tags from the API (`platform.claude.com/docs/en/build-with-claude/context-windows`).
  So the models of dotclaude see no context number except the reminder of Claude Code and the notes of dotclaude.
- The prompting guide of Anthropic says that Claude "may sometimes naturally try to wrap up work as it approaches the context limit", and its sample prompt says "do not stop tasks early due to token budget concerns".
- Cognition saw Sonnet 4.5 take shortcuts "when it believed it was near the end of its window", and underestimate the tokens left (`cognition.com/blog/devin-sonnet-4-5-lessons-and-challenges`).
- Budget Tracker (`arxiv.org/abs/2511.17006`) put numbers after each tool result with one instruction line, and the scores went up, for example Claude Sonnet 4 on HLE-Search from 20.5 to 23.0.
  It reports no threshold study.
- Hooks get no `rate_limits` (the hooks reference), so a status line cache is the only path, as in P158.
- Two community plugins send usage to the model on each user prompt, with marks at 80% and 98%.
  Neither reports results, and a note on each user prompt only goes stale in a long turn.
- No source gives the band values or the pace formula, so the live check of P158 tests them.

- D10, a state move of the spec CLI that the model runs, from Jev on 2026-10-14: the CLI refuses a state move with no marker of the user (0.96, against dropping `disable-model-invocation`).
  P147 adds the marker, and the marker must be one that the model cannot write by itself.
  Fact: the skills set `disable-model-invocation: true`, and the agent still ran `dotclaude-spec plan` through `Bash`.
- D12, `reviewer` without `Bash` (P149), from Jev on 2026-10-14: drop `Bash` (0.30, not sure: 0.65 against 0.35).
  The reviewer gets the real `Grep` and `Glob`, and it cannot run a test to confirm a finding (`reviewer.md:19`).
  The failing test of each finding stays with the implementer (REQ-13).

- D9, the close-out list of 1.0.0 in `design.md`, "Close-out of 1.0.0": the user approved all 10 lines on 2026-10-14, in an `AskUserQuestion` answer.
  The audit of the spec slice of 2026-10-14 is in, and it changed only the facts of the `Second-checking` line.
  Jev on that line, 2026-10-14: accept and archive, with the audit facts in the evidence file (0.25, not sure: 0.44 against 0.29 for accept and archive with no note, 0.17 for keeping it open until P77, and 0.10 for a drop).
