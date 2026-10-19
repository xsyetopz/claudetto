# Decisions: Tools

These decisions explain why `claudetto` ships each tool and feature in its current form.

## Why the Status Line Is Small

**Choice:** One `statusLine` command and one `subagentStatusLine` command.
The code is in `slices/statusline/`.
The command reads the status object from stdin and the active change from `openspec/changes/<name>/tasks.md`.
It makes one `git` call and caches it for `GIT_CACHE_MS`.
`NO_COLOR` turns off colors, and the icons stay.
There are no progress bars (the user, 2026-10-12).

| Bound | Value |
| --- | --- |
| `MAX_ROWS` | 3 |
| `REFRESH_SECONDS` | 1 |
| `GIT_TIMEOUT_MS` | 1500 |
| `GIT_CACHE_MS` | 3000 |
| `DEFAULT_COLUMNS` | 120 |
| `COLUMNS_MARGIN` | 4 |
| `SUBAGENT_ROWS_MAX` | 20 |

**Reason:** Both commands are documented extension points, so no undocumented file is read.
`USAGE_LEVELS` is 75 and 90 percent.
The main session uses the distance to the handoff trigger for its context share.

**Evidence:** `slices/statusline/limits.ts` and `src/kernel/budget.ts`.
See [Status Line](Status-Line).

## Why Library Docs Come From a Pinned Skill

**Choice:** The `docs` skill of `claudetto-docs` runs `ctx7@0.6.1` through `bunx -y` with `CTX7_TELEMETRY_DISABLED=1`.
Its `allowed-tools` rule allows only the read forms `library` and `docs`.
It makes at most 3 `ctx7` calls for one question.

**Reason:** The model needs the API of a library version that the project does not show.
The pin keeps the allowed command the same until a release changes it.

**Evidence:** `src/plugins/claudetto-docs/slices/docs/skills/docs/SKILL.md`.
See [Library Docs](Library-Docs).

## Why Evals Use `claude plugin eval`

**Choice:** `claudetto` uses the eval command of Claude Code and keeps no harness of its own.
Each case has a `case.yaml` and a `scaffold.sh`.

- `src/plugins/claudetto/evals/` holds 3 cases.
  The slices hold 16 more: `prompt` 11, `styles` 4, `handoff` 1.
- `just eval` uses `--max-cost-usd 5`, `--keep-temp`, and a lock, and it needs `--model`.
- `just eval-variant` compares the checkout with a git ref.
- `eval-compare` in `claudetto-lab` runs two plugin folders in turn.
- `just validate` fails on a case that checks only words.

**Reason:** Claude Code owns the case format, so a custom harness adds work for no gain.

**Evidence:** `justfile` and `EVAL_MAX_COST_USD` in `tools/limits.ts`.
See [Evals](Evals).

## Why the Code Graph Uses the CodeGraph CLI

**Choice:** The `claudetto-codegraph` add-on uses the `codegraph` CLI and a skill that shows its commands.
It has no hook, because `codegraph` syncs its own index.
`/claudetto:setup` offers `codegraph install --target claude --location global` when the add-on is on, which adds the MCP server.
A missing CLI gives `ENOENT`.
`QUERY_TIMEOUT_MS` is 2000.

**Reason:** A skill with a CLI costs less at session start than an MCP server that the add-on ships.
The comparison with the built-in LSP tool is not in the repository.

**Evidence:** `slices/graph/slice.ts` and `tests/claudetto-codegraph/layout.test.ts`.
See [Code Graph](Code-Graph).

## Why Jev Is Off by Default

**Choice:** Jev is an outside decision service.
The `decide` slice of the core plugin has an option `decide` with the values `off` (default) and `jev`.
With `jev`, the `claudetto-decide` CLI picks an option of each `AskUserQuestion` that facts settle.
When Jev gives no pick, the question stays as Claude asked it.
`TYPESAFE_API_KEY` goes in the environment of the CLI, never in its arguments.

**Reason:** The service must not need an add-on install, and it must not send text unless the user chooses.
A fallback model and a `second_opinion` tool are not in 0.2.0, because no incident needs them.

**Evidence:** `slices/decide/adapters/ask.ts`.
`slices/decide/limits.ts` has `JEV_TIMEOUT_MS` 45 seconds, `TRIES` 3, and `ATTEMPT_TIMEOUT_MS` 12 seconds.
See [Decide](Decide).

## See Also

- [Architecture](Architecture)
- [Plugin Layout](Plugin-Layout)
- [Decisions](Decisions)
