---
schema: dotclaude-spec/2
kind: design
id: 1.1.0
---

# 1.1.0 design

The architecture of [1.0.0](../1.0.0/design.md) stays: slices with ports and adapters, a generated composition root, and the bounds in `src/kernel/budget.ts`, `slices/<s>/limits.ts`, and `tools/limits.ts`.
Each package edits `src/` and runs `just generate`, and no package edits `plugins/` by hand.

## Review wave (P83 to P134)

dotclaude 0.28.0 built 1.0.0 with much Haiku 5.5 work at `medium`, and the review change `Second-checking` did not find what the sessions of the user found.
So wave 1 has one `reviewer` run (Opus 5.5, `high`) for each target, and wave 2 has one fix package for each review.
The `reviewer` agent cannot write (`agents/agents/reviewer.md:4-5`), so the main session writes its report to `evidence/review-<target>.md`.
A finding is confirmed only when a command in the workspace shows it.
The fix package writes the failing test of each confirmed finding first, runs it to show the failure, and then fixes the code.
The foundation of 1.0.0 stays, and a fix changes the code at the cause (decision of the user, 2026-10-14).
A fix adds no wrapper, shim, compatibility layer, or extra guard around defective code.
When a slice is mostly wrong, its fix package can rewrite the slice inside the same contract.
A fix removes the dead code that it makes.
A fix package with no confirmed finding is dropped with `drop --reason "no confirmed finding"`.
Each feature package of a slice depends on the review and the fix of that slice.

| Target | Review | Fix | Target | Review | Fix |
| --- | --- | --- | --- | --- | --- |
| `agents` | P83 | P109 | `styles` | P97 | P123 |
| `asks` | P84 | P110 | `surface` | P98 | P124 |
| `attribution` | P85 | P111 | `trim` | P99 | P125 |
| `checks` | P86 | P112 | `dcc-plugin-agents-md` | P100 | P126 |
| `decide` | P87 | P113 | `dcc-plugin-you-should-know` | P101 | P127 |
| `guard` | P88 | P114 | `dotclaude-browser` | P102 | P128 |
| `handoff` | P89 | P115 | `dotclaude-codegraph` | P103 | P129 |
| `prompt` | P90 | P116 | `dotclaude-docs` | P104 | P130 |
| `rules` | P91 | P117 | `dotclaude-lab` | P105 | P131 |
| `sembr` | P92 | P118 | `dotclaude-sessions` | P106 | P132 |
| `setup` | P93 | P119 | `src/kernel/` | P107 | P133 |
| `spec` | P94 | P120 | `tools/` | P108 | P134 |
| `stamp` | P95 | P121 | | | |
| `statusline` | P96 | P122 | | | |

Known defects of the spec CLI for P94, from 2026-10-14:

- `cd src && dotclaude-spec status Second-checking` prints "The change \`Second-checking\` does not exist" and exits 1.
  From the repository root, the same command prints 9 `done` packages.
  So the CLI finds `.dotclaude/spec/changes` from the cwd, not from the repository root.
- `Second-checking/events.jsonl:29` moves P07 to `verified` with the note "Converted from schema 1, which had no verify record", so P07 is `done` with no verify record.
- `spec/domain/states.ts:73` has a move from `specified` to `planned` by `specify`, next to the move by `plan` at `:72`.

## Close-out of 1.0.0

`dotclaude-spec status` gives `1.0.0 implementing 52/61` on 2026-10-14.
These are proposals, and P55 runs them only after the user approves them (D9).

| Package | Proposal | Evidence |
| --- | --- | --- |
| P16 release check | done | `tools/rebuild-pending.txt` and `tests/support/rebuild-list.test.ts` are gone. `evidence/release-check.md` has the sandbox session of `/spec`, `/ship`, `/hotfix`, a decision, and a handoff. The `*--v1.0.0` tags exist. |
| P18 history | cancel, moved to P78 | The tags of older versions still exist, such as `dotclaude-jev--v0.22.0` to `dotclaude-sessions--v0.28.0`. |
| P38 session stamp | done | `slices/stamp/`, `tests/kernel/stamp.test.ts`, `evidence/session-stamp.md`, and `evidence/session-stamp-resume.md`. |
| P39 attribution | done | `slices/attribution/` with `lab/attribution.test.ts`, and `evidence/attribution.md`, "Sandbox Check". P55 confirms that `surface/texts.ts/tool-bash.md` has no attribution rule. |
| P40 `dcc-agents-md` | done | `src/plugins/dcc-plugin-agents-md/`, `tests/dcc-plugin-agents-md/`, and `evidence/agents-md.md`. |
| P41 `dcc-you-should-know` | done | `evidence/you-should-know.md`, "Interactive Session". P59, P68, and P69 replace the UX. |
| P43 resume mandate | cancel, moved to P79 | No `slices/agents/hooks/` and no `evidence/resume-mandate.md`. |
| P45 agent choices | cancel, moved to P81 | No `src/wiki/dotclaude/Agent-Choices.md`. |
| P47 agent prompts | cancel, moved to P80 | No `evidence/agent-prompts.md`. The agent bodies already have XML tags. |
| `Second-checking` | accept, then archive, with the audit facts in `evidence/close-out.md` | Each of its 9 packages is `done`. The audit of 2026-10-14 found that its 9 `verified` events have no verify record, and its 9 `done` events have no `approved` step before them. |

A moved package gets a new ID, because `dotclaude-spec validate` refuses one package ID that is open in two changes (`spec/adapters/validate.ts:148-171`).

## Model routes (D11, P135 to P138)

| Agent | 1.0.0 | 1.1.0 |
| --- | --- | --- |
| `implementer` | Sonnet 5.5 `medium` | Opus 5.5 `medium` |
| `researcher` | Sonnet 5.5 `medium` | Opus 5.5 `medium` |
| `investigator` | Haiku 5.5 `medium` | Opus 5.5 `low` |
| `debugger` | Opus 5.5 `medium` | Opus 5.5 `high` |
| `planner`, `reviewer` | Opus 5.5 `high` | Opus 5.5 `high` |
| `searcher` (new, read-only, pure file search) | none | Haiku 5.5 `high` |

The evidence:

- The `claude-api` skill: Opus by default, cheaper workers for read-heavy work, and at least `high` for judgment.
- `external/2026-10-14/export-I tested Haiku 5.5, Sonnet 5.5 and Opus 5.5 as subagents on 6 real tasks.jsonl`: code search Haiku 44 of 48 and Opus 45, wrong facts in web research Haiku 10, Sonnet 3, Opus 1, and false flags in a fact check Haiku 30, Sonnet 6, Opus 0.
  Sonnet stays behind Opus on judgment, also at `high`.
- `external/2026-10-14/export-DO NOT USE Haiku 5.5 on Medium effort.jsonl`.
- The migration guide of Anthropic: Sonnet 5.5 starts at `medium` for agentic work and at `low` for search, and Opus 5.5 at `low` comes near Opus 5 at `high` on some coding evals at a much lower cost.
- `wiki/archive/Evals-0.28.0-Ported-Suite.md`: Sonnet 1.00 on 15 cases, and Haiku 12 of 16.
- Dossier `07`, I16: the cheaper-pair table of 1.0.0 came from cases too easy to separate the models (SL 1213c32c), and I18: a silent model fallback (SL 00bfd354).

P136 (wave 1) runs 4 arms on the `investigator` and `researcher` eval cases: Sonnet 5.5 `medium`, Sonnet 5.5 `high`, Opus 5.5 `low`, and Opus 5.5 `medium`.
It compares the cost of each finished task and the quality, and it asserts the model that served each arm (I18).
P135 sets the routes of D11, or for `investigator` and `researcher` the arm that P136 picks.
P137 runs `just eval` on the routes before the release.
`CLAUDE_CODE_SUBAGENT_MODEL` is `claude-sonnet-5-5` at `prompt/slice.ts:63`, and P135 records which agents it reaches.
The wiki drifts (P138): `wiki/evidence/Usage-Evidence.md:28` gives `debugger` as Sonnet `high`, and `wiki/claude-code/Subagents.md:71` and `:136` say that each agent sets `maxTurns`, but no agent does (D2).

## Items

The items of the first draft keep their facts:
the exclude step (P56, `setup/adapters/cli.ts:8,39`, `src/kernel/paths.ts:86`),
`AskUserQuestion` (P62, `prompt/texts.ts/doing-tasks.md:5-6,14`, `decide/slice.ts:39-42`),
padding (P64, `prompt/transforms/communication.ts`),
signing (P60, P76, `prompt/slice.ts:104-122,138,140`),
diagnosis (P66, P67),
the palette (P61, `statusline/color.ts`),
and the report-now note (P57, `handoff/domain/context.ts:38-42`, `handoff/adapters/mod.ts:121-131`).
Each brief has its lines.

### Corrections from the dossier

- P64: an agreement names the fact or the check that shows it (I06).
- P70: the automatic handover.
  Session `d87f7ed2` ended with "Prompt is too long" at 273,544 tokens, 91% of the window, after one `manual` hint.
  `DEFAULT_MAIN_HANDOVER` is still `manual` (`handoff/limits.ts:39`), although P14 of 1.0.0 measured $0.0630 for a handoff against $0.2288 for a compaction.
  The trigger runs only at `turn.complete` (`handoff/adapters/mod.ts:249-275`), so a long turn passes the bound with no check.
- P152: the handoff has the seven parts of I03 recipe 2.
  `handoff/domain/text.ts:7` has four, so P152 adds the ruled-out approaches, the decisions and why, the verify command, the files touched, and the last N user prompts.
- P151: it records `CLAUDE_CODE_AUTO_COMPACT_WINDOW` 300000 (`prompt/slice.ts:54`) next to about 200k of I03 recipe 1, and it starts compaction only above the hard bound of P70.
- P72: an ask on `CHANGELOG.md` edits, and `git branch --show-current` and the lockfile versions in the `SessionStart` line.
- P74: a lock file with PID and owner, because the module state cannot see the job of a subagent.
  A tool error is not a negative, and a kill uses the saved PID (I17 recipe 1, 2, and 5).
- P75: a package that does not exist gets a deny, and a new package gets an ask.
  A hooks module has no `node:` (`.claude/rules/hooks-module.md`).
- P76: a hook reads `dangerouslyDisableSandbox` from the tool input.
- P77: a gate on execution, not on claims.
  A package reaches `done` only when its `verified` event has the verify command, the exit status, and the commit SHA (I04 recipe 2).
  The completion rule is in the prompt (P64), and the `reviewer` stays the fresh-context verifier.
  The `endturn` slice never existed, so nothing removes it.
- P80: a `PreToolUse` deny of `git stash`, `git checkout --`, `git reset --hard`, and `git clean` in subagents, and `isolation: worktree` for writers, go to P148.
  P80 adds the rule: never report a substitute check as the real check.
- P57: the note goes once for each agent and names its source.
  The Haiku bound is 85,000 (`handoff/limits.ts:14`).
- P158 (REQ-24): no agent learns the usage of the account.
  The status line saves `rate_limits` (`statusline/adapters/cli.ts:85-96`), and only `dotclaude-spec runs` reads it (`spec/adapters/runs.ts:24-31`).
  A subagent learns its context only from the report-now note over its bound (`handoff/adapters/mod.ts:120-131`).
  P158 adds a `usage` slice that sends a note to the main session and to each subagent only when a window passes its mark or goes into deficit, and a soft context note for subagents.
  The context of the main session stays with P70.
- P58: it reads the structured `hook_additional_context` field.
- P66: only structured signals, by the prose rule: `AskUserQuestion` calls map to I13 (over-asking to I06), and hook records map to I05 and I10.
  The fixtures use the sanitized structure of real transcripts.

### Context facts in Claude Code 2.1.296

The bundle is `~/.local/share/claude/versions/2.1.296`, read from the extract `$TMPDIR/cc/s.txt` (byte offsets below).
Reading the bundle is permitted, and nothing patches it.

- `totalTokensReminder` (settings schema, offset 14720199) is `@internal`.
  It adds `<total_tokens>N tokens left</total_tokens>` to the system prompt and after each tool result.
  Its modes are `off`, `infinite`, `fixed` (5000000), `countdown` ("the live remaining context-window tokens"), and `padded-countdown` (a task budget).
  The default is `padded-countdown` from `totalTokensReminderBudget` 15000000.
  The env var `CLAUDE_CODE_TOTAL_TOKENS_REMINDER` overrides the mode.
- The reminder goes to each agent, keyed by its agent id (`BLr`, offset 25047064: `s??"main"`).
  In `countdown` mode the number is the context window minus the context used (`dm(r,Xf())-z`).
  It counts down to the window, not to the bound of dotclaude (100,000 or 85,000).
- So by default each agent and the main session see a countdown from 15,000,000 that is not their context.
  This session shows it: the first value was 15000000.
- A spawn with a `totalTokensBudget` gives the subagent a `padded-countdown` reminder of that budget (offset 29350796, `w_n` at 29292123).
- `CLAUDE_CODE_ENABLE_TOKEN_USAGE_ATTACHMENT` adds a `token_usage` attachment with `used`, `total`, and `remaining` (offset 25046619).
  It is off by default (`external/summaries/2026-10-11-162443-context-usage.txt:1560`).
  Its text to the model was not found.
- The `rate_limits` of the account and the `used_percentage` of the context go only to the status line command (offset 23413386).
  No path to the model was found, but the search was not complete.

Neither env var is in the public docs, and `wiki/claude-code/Undocumented-Settings.md` lists them.

### Asks: tests, hooks, checks, and user-owned values (P139, P140)

The `permissions.deny` list at `prompt/slice.ts:125-144` holds credentials only.
The `asks` slice already asks on a weaker test file or limits file (`asks/domain/testdiff.ts:1-9`), and on a lint config, a check config, a CI file, a hook file, a settings file, and a check script (`asks/domain/kinds.ts:1-3`).
So P139 maps I05 recipe 1 and 2 on the `asks` kinds, and adds each gap with a test.
P140 adds the old value and the new value to the ask of a changed bound, baseline, or test expectation (I14 recipe 1 and 2).

### Prose and counts (I15, I16)

P63 and P65 are dropped by the prose rule.
The detectors of P66 get known-good and known-bad fixtures from the sanitized structure of real transcripts.
P64 drops its `padding` eval, because a regex on a reply is a prose grader.
The `plain-question` eval of P62 grades the trace: an `AskUserQuestion` call.
Each count that a plan step relies on (P58, P66, P76, P77, P136) comes from a counter with a known-good and a known-bad fixture.

### Search tools (I18, P142, P149, P150)

On macOS, Linux, and WSL, Claude Code leaves `Glob` and `Grep` out of the default tool set, and `grep` and `find` in `Bash` run the embedded `ugrep` and `bfs` (code.claude.com/docs/en/tools-reference, "Glob tool behavior").
The tools come back only when `--tools` or `--allowedTools` names them, when `Bash` is removed, or when the `tools` of a subagent lists them and leaves out `Bash`.
"An allow rule in a settings file doesn't have this effect."
The gate `mk()` of the 2.1.296 bundle reads a build flag and `launchOptions.searchToolsOptIn()`, which only the CLI sets, and `EMBEDDED_SEARCH_TOOLS` does nothing at run time.
A fixture showed that the shell `grep -r` skips git-ignored files and that `command grep -r` finds them, and ugrep refuses some GNU patterns with "exceeds complexity limits" (dossier `07`, I18).

- P150: a plugin cannot give the main session `Grep`.
  The wiki and the setup output tell the user to start Claude Code with `--allowedTools Grep Glob`, and no `DOTCLAUDE_` env var is added.
- P149: each read-only agent that needs no shell lists `Grep` and `Glob` and leaves out `Bash`: `reviewer` (D12), `searcher`, and each agent that the review shows can work without `Bash`.
  `investigator` and `researcher` keep `Bash` for `git` and `gh`.
  `src/fragments/search-route.md` tells each agent to use the tool that it has.
  With `Bash` only, it uses `grep -n` and then `Read` with `offset` and `limit`, and it knows that `command grep` finds git-ignored and binary files.
- P142: a `PreToolUse` hook on `Bash` acts on `grep`, `rg`, `ugrep`, `find`, and `bfs` (decision of the user, 2026-10-14):
  (a) the session has `Grep`: deny, and the reason names `Grep` or `Glob`.
  (b) the hook cannot tell: deny the first raw search of each agent once, with a reason to use `Grep` or `Glob` if the agent has them, else to run the same command again.
  The same command from the same agent then runs, and the hook denies no more raw searches for that agent.
  (c) the session has no `Grep`: no deny, and one note on the first search of each agent that the shell `grep` skips git-ignored files and `command grep` finds them.
  The bound of one deny for each agent in a session is an assumption that the user did not confirm, and it goes in `guard/limits.ts`.
  The live check in `just sandbox-alone` with and without `--allowedTools Grep Glob` stays with the user, as an unchecked item in `evidence/search-tools.md`.

### Command rules (P143, P144)

- `prompt/slice.ts:175-178` asks on `Bash(rm -*r*)`, `Bash(rm -*R*)`, `Bash(rm * -*r*)`, and `Bash(rm * -*R*)`.
  A `*` spans spaces, so `rm -f "$TMPDIR/x"` asks.
  P143 replaces the four globs with an ask hook that parses the `rm` flags, and audits each wildcard rule of `slice.ts`.
- `guard/domain/deny.ts:44-60` denies the first file print in a command (`printReason`), so a compound command with `git status`, `grep -rln`, `wc`, or `ls` gets the deny.
  It fired 11 or more times in session `d87f7ed2`, 4 times in the main session, and 3 times in the planner run of this plan.
  P144 denies only a command that is a file print as a whole.

### Spec CLI (P145 to P147)

In session `d87f7ed2` of OpenJoystickDriver (23:41 to 23:43), a change went to `planned` with an open coverage problem, and no command takes it back.
The agent then wrote its own `check.ts`, printed "plan gate: PASS", and reported that as the gate.
`validate` checks the formats only (`spec/adapters/validate.ts:173-201`), and `plan` checks the coverage (`spec/adapters/plan.ts:47-57`).
The spec skills set `disable-model-invocation: true`, but the agent ran `dotclaude-spec specify` and `plan` itself through `Bash` (D10).

### Dossier map

| ID | Package | ID | Package |
| --- | --- | --- | --- |
| I01 | P72 | I10 | P57, P58, P76 |
| I02 | P66 (signal), P141 | I11 | P79, P57 (D2) |
| I03 | P70, P152, P151, P158 | I12 | P74, P136 (D2) |
| I04 | P77, P80 | I13 | P62, P64 |
| I05 | P139 | I14 | P140 |
| I06 | P64 | I15 | P64, P157 |
| I07 | P80, P148 | I16 | P136, P66 |
| I08 | P75 | I17 | P74 |
| I09 | P83 to P108 (smells) | I18 | P142, P149, P150 |

P141 writes the evidence file of REQ-9 with each ID, its package, and each ID that stays open.

## Packages

| Wave | Packages |
| --- | --- |
| 1 | P55, P58, P59, P78, P83 to P108, P136, P160 |
| 2 | P109 to P134 |
| 3 | P56, P57, P60, P61, P66, P68, P72, P74, P75, P135, P139, P144 to P146, P157 |
| 4 | P62, P64, P67, P69, P79, P80, P142, P143, P150, P152, P153, P158 |
| 5 | P70, P76, P77, P140, P147 to P149, P159, P165 |
| 6 | P81, P137, P138, P141, P151, P155, P156, P161 to P164 |
| 7 | P82 |

No two open packages of one wave own the same path.
P63 and P65 (the prose rule), P71 (D2), and P73 (D6) are dropped, and P55 runs `drop` on them after the plan gate.
They cover no requirement.
P76, P77, and P147 run only as their decision says.

## Decisions

The decisions, with their checks and the research for REQ-24, are in [`decisions.md`](decisions.md).
