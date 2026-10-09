# Decisions: tools and features

This page holds D6, D7, D8, D9, D11, D22, and D26.
The index is [Decisions](Decisions).

## D6 Status line

The code is in `features/statusline/`, in small files that import only `lib/` and their own folder.
See [Status line](Status-Line).

- `derive` holds pure functions for pace, deficit, run-out time, cache hit, rates, and headroom.
- `state` keeps one JSON file in the temporary folder for each account window, keyed by a hash of the 5-hour reset time.
  It keeps 50 samples and clears on a new window.
- Reset credits come from a read-only parse of `cachedUsageUtilization` in `.claude.json`.
  The parser accepts one known shape, and any other shape hides the segment.
- `paint` takes the look of 0.26: single-column icons, three colors at `USAGE_LEVELS`, a meter bar, and OSC 8 links.
  `NO_COLOR` prints no color.
- `layout` packs segments by priority into at most 3 rows of `COLUMNS` width.

## D7 Auto-fix hook

Two classic hooks in exec form with a `timeout`, because issue #96831 shows gaps in module dispatch.
`PostToolUse` records the edited file paths and changes nothing.
`Stop` runs each detected tool on the recorded files, and returns one block with at most 20 lines when issues remain.
A fix after each edit costs more than one batch at `Stop`, so that route is rejected.
The hook is off by default and opt-in, because a hook command runs outside the Bash sandbox and a project tool can load a config that a prompt-injected model wrote.
The cost of the opt-in is that a user who skips the setup question gets no auto-fix.
The switch is `env.DOTCLAUDE_AUTOFIX=1`, written by `settings.mjs --with autofix` after the question.
See [Auto-fix](Auto-Fix).

## D8 Context7 skill

The add-on `dotclaude-docs` holds the `docs` skill.
It runs a pinned `ctx7` through `npx` with telemetry off.
Setup adds the two network hosts only when the add-on is installed.
See [Library docs](Library-Docs).

## D9 Eval harness

The harness is Bun code in `tools/eval/`.
Each run uses `claude -p` with `stream-json` output in a Linux container, so the vanilla arm has a clean config.
Each run has a new config folder and work folder, and the oracle is outside both.
Credentials come from `.env`, so the user starts paid runs from a shell.
The statistics are pass^k, cost for each resolved task, and a paired bootstrap.
See [Evals](Evals).

## D11 OpenSpec

Setup runs `openspec config set delivery skills`, keeps the `core` profile, turns telemetry off, and runs `openspec update` after the user confirms.
The profile sets each `openspec-*` skill to `name-only`.
See [OpenSpec](OpenSpec).

## D22 Context bound for subagents and the main session

The sources are `research/subagent-usage.md` and `research/session-growth.md`.
Investigator runs used most of the quota, because each run paged files into its context.
The main session grew mostly by repeat reads through `Bash`.
The parts are:

1. A search-first read rule in each agent body and the output style.
1. A context bound for each subagent, with a report-now message and no block.
1. `maxTurns` with one spare turn.
1. Delegation text that gives related questions to one subagent.
1. A `Bash` deny for a command that only prints a file.
1. A report bound, and a measured context figure for the main session.
1. A `Bash` deny for a command whose output has no limit, with the bounded form in the reason (decision of the user 2026-10-09).
1. `bashOutputMaxChars` at 4000, its lowest value.
   Claude Code 2.1.295 saves a longer output to a file and sends a preview and the path, so build output is not lost.
   In the main session of 2026-10-09, 9 of 164 `Bash` results were above 4000 characters, and the part above was about 13% of all `Bash` result characters.

Two alternatives were rejected, and one of them is now replaced.
A lower `BASH_MAX_OUTPUT_LENGTH` was rejected first, because it cut build output.
`bashOutputMaxChars` replaces it, because it keeps the full output in a file.
An `updatedInput` filter for test output is rejected for now, because test output was small.
See [Context bound](Context-Bound).

## D26 Code graph through the CodeGraph CLI

The add-on `dotclaude-codegraph` uses the `codegraph` CLI and no MCP server.
Each part runs only when `.codegraph/` exists in the project.
The add-on checks that the CLI is on `PATH`, syncs at session start, adds graph context to a `Grep` or `Glob` search, and syncs after an edit.
The add-on ships whatever the comparison with the built-in LSP tool shows, and the comparison goes to the wiki.
See [Code graph](Code-Graph).

## Related pages

- [Parts](Parts)
- [Plugin layout](Plugin-Layout)
