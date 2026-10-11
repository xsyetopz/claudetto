# Decisions: tools and features

This page holds D6, D7, D8, D9, D11, D22, and D26.
The index is [Decisions](Decisions).

## D6 Status line

The code is in `features/statusline/`, in small files that import only `lib/` and their own folder.
See [Status line](Status-Line).

- The status line writes no file (D35).
  The burn-rate samples (`state`), the cache for slow reads (`cache`), and the context breakdown state (`breakdown`) are removed.
- `derive` holds pure functions for pace, deficit, run-out time, cache hit, rates, and headroom.
  They use only the status input.
- Reset credits and the Fable window come from a read-only parse of `cachedUsageUtilization` in `.claude.json`.
  The parser accepts one known shape, and any other shape hides the segment.
- The context parts come from the newest `/context` table in a bounded tail of the transcript, read again at each call.
- `paint` takes the look of 0.26: single-column icons, three colors at `USAGE_LEVELS`, a meter bar, and OSC 8 links.
  `NO_COLOR` prints no color.
- `grid` makes 3 columns when they fit, and `layout` packs segments by priority into at most 3 rows of `COLUMNS` width.

## D7 Auto-fix hook (removed)

The first plan had a `PostToolUse` recorder that appended each edited path to a session file, and a `Stop` fixer that ran the project formatters and linters on the recorded files.
The edited-files log is a state file that the feature needs, so rule D35 removed the feature, its hooks, its detection table, and its tests.
The `DOTCLAUDE_AUTOFIX` variable and the setup flag that wrote it are gone too.
The facts stay as evidence:
on 2.1.293 a changed file does not make the next `Edit` fail, but Claude Code tells the model to read a reformatted region again before an `Edit`.
The release notes of 2.1.295 say that `Edit` no longer treats a file as fully read when its contents changed and its modification time did not advance.
An alternative is a `Stop` hook that finds the changed files with `git status` and keeps no log.
It is not built, because it runs project tools on files that Claude did not edit in the turn, and no probe shows it safe.

## D8 Context7 skill

The add-on `dotclaude-docs` holds the `docs` skill.
It runs a pinned `ctx7` through `npx` with telemetry off.
The [settings snippet](Settings-Snippet) names the two network hosts for a user who installs the add-on.
See [Library docs](Library-Docs).

## D9 Evals through `claude plugin eval`

Claude Code owns the eval suite format, and dotclaude owns no harness (D35).
The Bun harness of 0.27.0 and the first 0.28.0 work is deleted, with its case files, its hidden oracle with tamper hashes and a canary, its report files, and its arms for a style, a profile, and a router mode.
A check that `claude plugin eval` cannot express is dropped, and no wrapper adds it back.
A cut that needs an eval gate and has none stays unmade, and the wiki says that no gate exists.
Credentials come from `.env`, so the user starts paid runs from a shell.
See [Evals](Evals).

## D11 OpenSpec

Setup runs `openspec config set delivery skills`, keeps the `core` profile of OpenSpec, turns telemetry off, and runs `openspec update` after the user confirms.
The OpenSpec CLI owns those settings, so dotclaude adds no format.
The [settings snippet](Settings-Snippet) sets each `openspec-*` skill to `name-only`.
See [OpenSpec](OpenSpec).

## D22 Context bound for subagents and the main session

The sources are `research/subagent-usage.md` and `research/session-growth.md`.
Investigator runs used most of the quota, because each run paged files into its context.
The main session grew mostly by repeat reads through `Bash`.
The parts are:

1. A search-first read rule in each agent body.
1. A context bound for each subagent, with a report-now message and no block.
1. `maxTurns` with one spare turn.
1. Delegation text that gives related questions to one subagent.
1. A `Bash` deny for a command that only prints a file.
1. A report bound, and a measured context figure for the main session.
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

- [Core plugin](Core-Plugin)
- [Plugin layout](Plugin-Layout)
