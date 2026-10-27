# Decisions: Tools

These decisions explain why `claudetto` ships each tool and feature in its current form.

## Why the Status Line Is Small

**Choice:** One `statusLine` command and one `subagentStatusLine` command.
The code is in `plugins/claudetto/modules/statusline/`.
The command reads the status object from stdin and the active change from `openspec/changes/<name>/tasks.md`.
It makes one `git` call and caches it for `GIT_CACHE_MS`.
`NO_COLOR` turns off colors, and the icons stay.
There are no progress bars (the user, 2026-10-12).

| Bound | Value |
| --- | --- |
| `MAX_ROWS` | 4 |
| `REFRESH_SECONDS` | 1 |
| `GIT_TIMEOUT_MS` | 1500 |
| `GIT_CACHE_MS` | 3000 |
| `DEFAULT_COLUMNS` | 120 |
| `COLUMNS_MARGIN` | 4 |
| `SUBAGENT_ROWS_MAX` | 20 |

**Reason:** Both commands are documented extension points, so no undocumented file is read.
`USAGE_LEVELS` is 40 and 80 percent: green below 40, amber from 40 to 80, and red above 80 (D15 of `release-0-3-0-alpha-2`).
The main session uses the distance to the handoff trigger for its context share.

**Evidence:** `plugins/claudetto/modules/statusline/limits.ts` and `plugins/claudetto/modules/session/limits.ts`.
See [Status Line](Status-Line).

## Why Library Docs Come from a Pinned Skill

**Choice:** The `find-docs` skill of `claudetto` runs `ctx7@0.6.1` through `bunx -y` with `CTX7_TELEMETRY_DISABLED=1`.
Its `allowed-tools` rule allows only the read forms `library` and `docs`.
It makes at most 3 `ctx7` calls for one question.

**Reason:** The model needs the API of a library version that the project does not show.
The pin keeps the allowed command the same until a release changes it.

**Evidence:** `plugins/claudetto/skills/find-docs/SKILL.md`.
See [Library Docs](Library-Docs).

## Why Evals Use `claude plugin eval`

**Choice:** `claudetto` uses the eval command of Claude Code and keeps no harness of its own.
Each case has a `case.yaml` and a `scaffold.sh`.

- `plugins/claudetto/evals/` holds 43 cases and `hooks.json`.
- `just eval` uses `--max-cost-usd 5`, `--keep-temp`, and a lock, and it needs `--model`.
- `just eval-variant` compares the checkout with a git ref.
- `dev/eval-compare/main.ts` runs two plugin folders in turn.
- `just validate` fails on a case that checks only words.

**Reason:** Claude Code owns the case format, so a custom harness adds work for no gain.

**Evidence:** `justfile` and `EVAL_MAX_COST_USD` in `tools/limits.ts`.
See [Evals](Evals).

## Why the Code Graph Uses the CodeGraph CLI

**Status:** Removed in 0.3.0.
The add-on and its setup step went for faults 18, 46, 47, and F17, by the decision of the user (2026-10-21).
claudetto offers no code-intelligence tool in its place (`openspec/changes/archive/2026-10-23-0-3-0/design.md`).

**Choice:** The `claudetto-codegraph` add-on used the `codegraph` CLI and a skill that showed its commands.
It had no hook, because `codegraph` syncs its own index.
`/claudetto:setup` offered `codegraph install --target claude --location global` when the add-on is on, which adds the MCP server.
A missing CLI gives `ENOENT`.
`QUERY_TIMEOUT_MS` is 2000.

**Reason:** A skill with a CLI costs less at session start than an MCP server that the add-on ships.
The comparison with the built-in LSP tool is not in the repository.

**Evidence:** `slices/graph/slice.ts` and `layout.test.ts` of `claudetto-codegraph` at the tag `claudetto-codegraph--v0.2.0`.

## Why Jev Is on When the Key Is Set

**Choice:** Jev is an outside decision service.
The `decide` slice of the core plugin has an option `decide` with the values `off` and `jev` (default, D66).
The key `TYPESAFE_API_KEY` is the trigger, and with no key nothing goes out.
With `jev` and a key, all decisions go to Jev: the hook calls Jev from the mod with `$.http.fetch` to pick an option of each `AskUserQuestion` question (the CLI `claudetto-decide` serves image and `box` questions and the calls of Claude), and a call is answered with no dialog when Jev is sure about each question.
When Jev is not sure, the user sees the dialog.
Approvals stay with the user: each request also asks Jev if the question asks for approval of money, a push, a release, a delete, or a step that cannot be undone.
A yes, or an unsure answer, shows the dialog, and it costs no extra call.
`TYPESAFE_API_KEY` goes in the environment of the CLI, never in its arguments.

**Reason:** The service must not need an add-on install, and it must not send text unless the user sets the key.
The user chose this on 2026-10-20: "when Jev is found, all 'decisions' go to Jev".
The user also chose "Approvals stay with you (Recommended)", because a "(Recommended)" option makes a confident pick likely, and consent is for the user.
A fallback model and a `second_opinion` tool are not in 0.2.0, because no incident needs them.

**Evidence:** `plugins/claudetto/modules/jev/adapters/ask.ts`.
`plugins/claudetto/modules/jev/limits.ts` has `TRIES` 3 and `ATTEMPT_TIMEOUT_MS` 12 seconds.
See [Decide](Decide).

## Related Pages

- [Architecture](Architecture)
- [Plugin Layout](Plugin-Layout)
- [Decisions](Decisions)
