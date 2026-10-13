# Decisions: Tools and Features

This page holds the decisions D6, D8, D9, D11, D22, and D26.
Read it to learn why dotclaude uses each tool, file, and feature in the form that it has.
D7 is reversed, and it moved to [Decisions-Reversed](Decisions-Reversed#tools).
The index is [Decisions](Decisions).

Each decision gives the problem, the choice, the alternatives, and the evidence.
Each number has a source in the code, in an evidence file, or in a binary fact with its version.

## D6 Status Line

The problem is that the status line shows the session state under the prompt.
It must stay small.
It must read no file of Claude Code that the docs do not name.

The choice is one `statusLine` command.
It is the documented extension point.
See the table in `.dotclaude/spec/changes/1.0.0/design.md`.
The code is in `src/plugins/dotclaude/slices/statusline/`.
Its files import only `src/kernel/` and their own folder.

The command reads the status object from stdin.
It reads the active change of the spec store.
It makes one `git status` call (`GIT_ARGS` in `domain/git.ts`).
It writes one file of its own, `.dotclaude/rate-limits.jsonl`.
That file is the saved usage sample (`RATE_LIMITS_FILE` in `src/kernel/paths.ts`).
The sample is rewritten only when its values change.
It is also rewritten when it is older than `USAGE_REWRITE_MS`.

The alternatives are the old state files of the status line, the reset credits segment, and the `/context` breakdown.
They are removed.
The code has no word `credit` and no word `breakdown` in the slice.
So no segment reads them.
The old pace, deficit, run-out, cache-hit, and headroom functions are not in the code either.

The bounds are in `slices/statusline/limits.ts`:

- `MAX_ROWS` is 3.
- `REFRESH_SECONDS` is 1.
- `GIT_TIMEOUT_MS` is 1500.
- `USAGE_REWRITE_MS` is 5 minutes.
- `DEFAULT_COLUMNS` is 120, and `COLUMNS_MARGIN` is 4.
- `SUBAGENT_ROWS_MAX` is 20.

The bounds in `src/kernel/budget.ts` are these:

- `CONTEXT_WINDOW` is 300000 tokens.
- `USAGE_LEVELS` is 75 and 90 percent.
  The status line shows green below 75.
  It shows yellow from 75, and red from 90 (`paintOf` in `color.ts`).

`renderRows` in `domain/rows.ts` fits the segments into at most `MAX_ROWS` rows of `COLUMNS` width.
`NO_COLOR` turns off each color, and the icons stay (`colorOff` in `color.ts`).
The status line has no progress bars.
That choice is the user's decision of 2026-10-12 in `.dotclaude/spec/changes/1.0.0/change.md`.

See [Status Line](Status-Line) and [Undocumented Reads](Undocumented-Reads).

## D8 Context7 Skill

The problem is that the model needs the API of a library version that the project does not show.

The choice is the `docs` skill of the add-on `dotclaude-docs`.
The model invokes it.
The code is in `src/plugins/dotclaude-docs/slices/docs/skills/docs/SKILL.md`.
The skill runs `ctx7@latest` through `bunx -y`, with `CTX7_TELEMETRY_DISABLED=1`.
Its `allowed-tools` rule allows only that exact form.
The skill makes at most 3 `ctx7` calls for one question.

The alternative is a pinned version through `npx`.
The settings snippet has that form, `npx -y ctx7@0.5.14`.
It allows the two hosts `context7.com` and `registry.npmjs.org` (see [Settings Snippet](Settings-Snippet)).
The skill and the snippet do not agree on the runner or the version.
This is open, and this page does not settle it.

See [Library Docs](Library-Docs).

## D9 Evals Through `claude plugin eval`

The problem is that dotclaude needs checks that run the plugin in a real session.

The choice is the `claude plugin eval` command of Claude Code.
Claude Code owns the case format, so dotclaude keeps no harness of its own.
Each case has a `case.yaml` and a `scaffold.sh`.
`src/plugins/dotclaude/evals/` holds 3 cases.
The `evals/` folders of the slices hold 9 more.
The recipe `eval` in `justfile` runs `claude plugin eval plugins/dotclaude` on the path of the checkout.
It uses `--max-cost-usd 5`, `--keep-temp`, and a lock from `tools/lock.ts`.
The add-on `dotclaude-lab` has the `eval-compare` slice.
That slice runs `claude plugin eval` on two plugin folders in turn.
The type in `src/kernel/slice.ts` says that a hook that runs a model names its `claude plugin eval` case in `eval`.

The alternative is a Bun harness with its own case format, its own oracle, and its own reports.
It is not in 1.0.0, because the command of Claude Code covers the cases (inference).

The binary fact is that the strings of the 2.1.296 bundle name the `plugin eval` subcommand.
A text search of the extract `external/cc-2.1.296/strings.txt` found this fact.

See [Evals](Evals).

## D11 Spec Store

The problem is that the work needs a record of each change and its states.
Two branches must be able to merge that record with no conflict.

The choice is the folder `.dotclaude/spec/changes/`.
It has one folder for each change.
Each change keeps `events.jsonl`, an append-only log with one line for each change.
Its first line is a header with `schema` 1 (`SPEC_SCHEMA` in `src/kernel/spec-store.ts`).
The path is built by `eventsPath` in `src/kernel/spec-store.ts`.
`SPEC_ROOT` in `src/kernel/paths.ts` gives the folder.
The `dotclaude-spec` CLI of the core plugin writes and checks the store (`slices/spec/slice.ts`).
The setup slice has no reference to the spec store.
So setup installs and runs nothing for it.

The alternatives are `state.json` and OpenSpec.
The log replaces `state.json`, because two branches conflict on it.
1.0.0 does not use OpenSpec.
The states come from the log, so a state change is a one-line diff (`change.md`, the spec store decision).

See [Spec Store](Spec-Store).

## D22 Context Bound for Subagents and the Main Session

The problem is that each read adds text to the context of a subagent or of the main session.
The context grows with each read.
The bound is a choice.
No measured figure in the repository supports its value (inference).

The parts are these:

1. A search-first read rule.
   The fragments `src/fragments/search-route.md` and `read-from-project.md` are included in the agent bodies.
   The agent bodies are in `src/plugins/dotclaude/slices/agents/agents/`.
2. A context bound for each subagent, with a report-now message.
   `slices/handoff/limits.ts` gives `SUBAGENT_CONTEXT_MAX` (100000 tokens) and `HAIKU_CONTEXT_MAX` (85000 tokens).
   The hook tells the run to report now when the bound is reached.
3. `maxTurns` in each agent file, with one spare turn.
   `AGENT_MAX_TURNS` in `limits.ts` gives investigator 31, researcher 41, debugger 61, and implementer 61.
   `TURNS_LEFT_AT` is 4.
   Two of those turns commit the work.
   One turn writes the report.
   The last turn is spare.
4. Delegation text.
   The `description` of the investigator agent says when to delegate a question that spans several files.
5. A `Bash` deny for a command that only prints a file.
   `slices/guard/domain/reads.ts` parses the print.
   `deny.ts` turns it into a deny.
6. A report bound.
   `REPORT_MAX_WORDS` is 400 in `limits.ts`.
   The `report-size` fragment states it.
7. `bashOutputMaxChars` at 4000, its lowest value.
   `BASH_OUTPUT_MAX_CHARS` in `src/kernel/budget.ts` gives the value.
   `slices/prompt/slice.ts` sets it in the settings.
   The 2.1.296 settings schema clamps the key to a range of 4000 to 128000, with a default of 30000.
   An output above the cap goes to a file.
   Claude gets a preview and the path.
   The fact was found by reading the settings schema and key list of the bundle.
   The extract is `external/dossier/cc-2.1.296/settings.md`.

The alternatives are these:

- A lower `BASH_MAX_OUTPUT_LENGTH` was the first choice.
  It cut build output.
  No evidence file in the repository checks this reason.
- A filter in `updatedInput` for test output is not built for now.
  No evidence file in the repository checks the reason.
  The reason is that test output was small.

`bashOutputMaxChars` replaces the first choice, because it keeps the full output in a file.

See [Context Bound](Context-And-Handoff).

## D26 Code Graph Through the CodeGraph CLI

The problem is that Claude needs a code graph of the project, such as the callers of a function.

The choice is the add-on `dotclaude-codegraph`.
It uses the `codegraph` CLI and no MCP server.
The code is in `src/plugins/dotclaude-codegraph/slices/graph/`.
Each hook runs only when `.codegraph/codegraph.db` exists (`INDEX_PATH` in `domain/graph.ts`).
The hooks in `hooks/hooks.json` do three things:

- They sync the index at `SessionStart`, and they add one line about the graph.
- They sync the index after an `Edit`, `Write`, `MultiEdit`, or `NotebookEdit`.
- They sync the index after a `git` command that changes the tree.

The add-on checks that the CLI is on `PATH` with `findOnPath` in `adapters/codegraph.ts`.
The bounds are in `slices/graph/limits.ts`.
`QUERY_TIMEOUT_MS` is 2000.
`START_SYNC_TIMEOUT_MS` was 8000 before version 1.0.0.
Version 1.0.0 changed it to 6000.
On Windows the sync also gets `TREE_GRACE_MS` (3000) more, so 8000 plus 3000 ran past the 10 s hook timeout.
At 6000, the total is 9 s, which leaves each platform at least 1 s under the timeout.

The alternatives are these:

- An MCP server.
  It is out of scope for 1.0.0, because a skill with a CLI costs less at the start of a session (`change.md`).
- The built-in LSP tool.
  The comparison with it is not in the repository.
  So the page cannot say which one to ship.
  This is open.

See [Code Graph](Code-Graph).

## Related Pages

- [Core Plugin](Architecture)
- [Plugin Layout](Plugin-Layout)
