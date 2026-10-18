# Decisions: Tools and Features

This page holds the decisions D6, D8, D9, D22, and D26.
Read it to learn why claudetto uses each tool, file, and feature in the form that it has.
The index is [Decisions](Decisions).

Each decision gives the problem, the choice, the alternatives, and the evidence.
Each number has a source in the code, in an evidence file, or in a binary fact with its version.

## D6 Status Line

The problem is that the status line shows the session state under the prompt.
It must stay small.
It must read no file of Claude Code that the docs do not name.

The choice is one `statusLine` command.
It is the documented extension point.
The code is in `src/plugins/claudetto/slices/statusline/`.
Its files import only `src/kernel/` and their own folder.

The command reads the status object from stdin.
It reads the active change of MiniSpec from `minispec/changes/<name>/tasks.md` (`adapters/change.ts`).
It makes one `git status` call (`GIT_ARGS` in `domain/git.ts`).
It caches the result of that call in a `claudetto-git-<key>.jsonl` file in a folder of the temp folder of the user (`adapters/git-cache.ts`).
The cache holds the result for `GIT_CACHE_MS`.

The alternatives are the old state files of the status line, the reset credits segment, and the `/context` breakdown.
They are removed.
The code has no word `credit` and no word `breakdown` in the slice.
So no segment reads them.

The bounds are in `slices/statusline/limits.ts`:

- `MAX_ROWS` is 3.
- `REFRESH_SECONDS` is 1.
- `GIT_TIMEOUT_MS` is 1500.
- `GIT_CACHE_MS` is 3000.
- `DEFAULT_COLUMNS` is 120, and `COLUMNS_MARGIN` is 4.
- `SUBAGENT_ROWS_MAX` is 20.

The bounds in `src/kernel/budget.ts` are these:

- `CONTEXT_WINDOW` is 300000 tokens.
  It is the upper bound of the window that the status object reports.
- `USAGE_LEVELS` is 75 and 90 percent (`paintOf` in `color.ts`).

`renderRows` in `domain/rows.ts` fits the segments into at most `MAX_ROWS` rows of `COLUMNS` width.
`NO_COLOR` turns off each color, and the icons stay (`colorOff` in `color.ts`).
The status line has no progress bars.
That choice is the user's decision of 2026-10-12 in the dotclaude 1.0.0 change.

The basis of the slice changed in 0.1.0: it was rebuilt, and it now shows the limit windows with a pace, the prompt cache, and the change of MiniSpec.
See `openspec/changes/claudetto-0-1-0/features.md` and the page [Status Line](Status-Line).
Also see [Undocumented Reads](Undocumented-Reads).

## D8 Context7 Skill

The problem is that the model needs the API of a library version that the project does not show.

The choice is the `docs` skill of the add-on `claudetto-docs`.
The model invokes it.
The code is in `src/plugins/claudetto-docs/slices/docs/skills/docs/SKILL.md`.
The skill runs `ctx7@0.6.1` through `bunx -y`, with `CTX7_TELEMETRY_DISABLED=1`.
Its `allowed-tools` rule allows only the two read forms, `library` and `docs`.
The skill makes at most 3 `ctx7` calls for one question.

The alternative is an unpinned `ctx7@latest`.
The pin keeps the allowed command the same until a release changes it.
The settings snippet for the add-on has the same runner and version, and it allows the two hosts `context7.com` and `registry.npmjs.org` (see [Settings Snippet](Settings-Snippet)).

See [Library Docs](Library-Docs).

## D9 Evals Through `claude plugin eval`

The problem is that claudetto needs checks that run the plugin in a real session.

The choice is the `claude plugin eval` command of Claude Code.
Claude Code owns the case format, so claudetto keeps no harness of its own.
Each case has a `case.yaml` and a `scaffold.sh`.
`src/plugins/claudetto/evals/` holds 3 cases.
The `evals/` folders of the slices of the core plugin hold 10 more.
The add-on `claudetto-you-should-know` holds 1.
The recipe `eval` in `justfile` runs `claude plugin eval plugins/claudetto` on the path of the checkout.
It uses `--max-cost-usd 5`, `--keep-temp`, and a lock from `tools/lock.ts`, and it needs `--model`.
The recipe `eval-variant` compares the checkout with a variant at a git ref.
The add-on `claudetto-lab` has the `eval-compare` slice.
That slice runs `claude plugin eval` on two plugin folders in turn.
The type in `src/kernel/slice.ts` says that a hook that runs a model names its `claude plugin eval` case in `eval`.

The alternative is a Bun harness with its own case format, its own oracle, and its own reports.
It is not in 0.1.0, because the command of Claude Code covers the cases (inference).

The binary fact is that the strings of the 2.1.296 bundle name the `plugin eval` subcommand.
A text search of the bundle found this fact.

See [Evals](Evals).

## D22 Context Bound for Subagents and the Main Session

The problem is that each read adds text to the context of a subagent or of the main session.
The context grows with each read.
The bound is a choice.
No measured figure in the repository supports its value (inference).

The parts are these:

1. A search-first read rule.
   The fragments `src/fragments/search-route.md` and `src/fragments/read-from-project.md` are included in the agent bodies.
   The agent bodies are in `src/plugins/claudetto/slices/agents/agents/`.
2. A context bound for each subagent, with a report-now message.
   `slices/agents/limits.ts` gives `SUBAGENT_CONTEXT_MAX` (100000 tokens) and `HAIKU_CONTEXT_MAX` (85000 tokens).
   The hook tells the run to report now when the bound is reached.
3. No `maxTurns` in an agent file.
   A run at its turn limit returns no report, and a test checks that no agent file has `maxTurns` (`tests/claudetto/agents/roster.test.ts`).
4. Delegation text.
   The `description` of the investigator agent says when to delegate a question that spans several files.
5. A `Bash` deny for a command that only prints a file.
   `slices/guard/domain/reads.ts` parses the print.
   `deny.ts` turns it into a deny.
6. A report bound.
   `REPORT_MAX_WORDS` is 400 in `slices/agents/limits.ts`.
   The `report-size` fragment states it.
7. `bashOutputMaxChars` at 16000.
   `BASH_OUTPUT_MAX_CHARS` in `src/kernel/budget.ts` gives the value.
   `slices/prompt/slice.ts` sets it in the settings.
   The settings schema of Claude Code 2.1.302 clamps the key to a range of 4000 to 128000, with a default of 30000.
   An output above the cap goes to a file.
   Claude gets a preview and the path.
   The comment of `BASH_OUTPUT_MAX_CHARS` says that 16000 brings 196 of 240 saved outputs inline.
   The dotclaude 1.0.0 value was 4000, its lowest value.
   0.1.0 changed it, and `openspec/changes/claudetto-0-1-0/design.md` has the basis of the sweeps.

The alternatives are these:

- A lower `BASH_MAX_OUTPUT_LENGTH` was the first choice.
  It cut build output.
  No evidence file in the repository checks this reason.
- A filter in `updatedInput` for test output is not built for now.
  No evidence file in the repository checks the reason.
  The reason is that test output was small.

`bashOutputMaxChars` replaces the first choice, because it keeps the full output in a file.

See [Handoff](Handoff).

## D26 Code Graph Through the CodeGraph CLI

The problem is that Claude needs a code graph of the project, such as the callers of a function.

The choice is the add-on `claudetto-codegraph`.
It uses the `codegraph` CLI and a skill that shows its commands.
The code is in `src/plugins/claudetto-codegraph/slices/graph/`.
The add-on has no hook, because `codegraph` syncs its own index (D51).
The earlier hooks synced the index at `SessionStart`, after an edit, and after a `git` command, and they are removed.
`/claudetto:setup` offers `codegraph install --target claude --location global` when the add-on is on, and that command adds the MCP server.

The add-on runs `codegraph` by its name, and a missing CLI gives `ENOENT` in `adapters/codegraph.ts`.
The bounds are in `slices/graph/limits.ts`.
`QUERY_TIMEOUT_MS` is 2000.

The alternatives are these:

- An MCP server.
  It is not the default, because a skill with a CLI costs less at the start of a session.
  The MCP server comes from `codegraph install`, which setup offers ([Code Graph](Code-Graph#install)).
- The built-in LSP tool.
  The comparison with it is not in the repository.
  So the page cannot say which one to ship.
  This is open.

See [Code Graph](Code-Graph).

## Related Pages

- [Core Plugin](Architecture)
- [Plugin Layout](Plugin-Layout)
- [Decisions](Decisions)
