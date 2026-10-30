# Claudetto

Claudetto tunes Claude Code for coding at the lowest token cost.
It works through the official extension points only: settings, hooks, skills, commands, and an output style.
It patches nothing.

Version `0.1.0`. The tree is a rebuild in progress, so the core plugin ships less than the older releases did.
Each capability lands with the measurement that decided its values.

The docs of Claude Code itself are on [clawdipedia](https://clawdipedia.cc), which ships the plugins `clawdipedia-docs` and `cc-inspect`, each with a skill and an MCP server.

## Features

- A first request of 31,237 characters against 46,105 for a stock session, read with `just capture --arm plugin --shipped` and `just capture`. The shipped settings alone read 28,953 with `just capture --arm plain --shipped`.
- A permission gate that stops only a call that loses bytes for good, tampers with the system, or reads a secret.
- A handoff file written on a typed `/clear` and before a compaction, read back into the next session.
- Run limits on subagents, on tool calls at heavy context, and on an identical retry after repeated failures.
- A sandbox that keeps a `Bash` command out of `~/.ssh`, `~/.gnupg`, `~/.aws/credentials`, `~/.netrc`, and `~/.docker/config.json`.

## Requirements

- Claude Code `2.1.314` or later.
- `git`.

Nothing else. Setup runs inside Claude Code, so it needs no checkout of this repository, no [Bun](https://bun.sh), and no `just`.
Those three are for [development](CONTRIBUTING.md) only.

## Install

```bash
# --- CLI -----------------------------
claude plugin marketplace add xsyetopz/claudetto
claude plugin install claudetto@claudetto

# --- TUI -----------------------------
/plugin marketplace add xsyetopz/claudetto
/plugin install claudetto@claudetto
```

Then run the setup command in Claude Code and restart it:

```text
/claudetto:setup
```

It asks which groups of settings to keep, writes the ones you keep to your user settings file, and names every key it wrote and every key it skipped.
A value you already set keeps your value.
The keys take effect in the next session, because Claude Code reads them when it starts.

The command is answered in code and tells the model nothing of its output, so running it costs no tokens.
A `claude -p "/claudetto:setup"` run against a fake Messages API on `127.0.0.1` sent that API no request at all, so the measurement is zero and not an estimate.
Its row in the command listing costs 48 characters of the first request, which is the whole price of having the command.

### The Four Groups

| Group | What keeping it writes |
| --- | --- |
| Smaller prompt | `disableBundledSkills`, `enabledPlugins`, `permissions.deny`, `permissions.allow`, `agent`, `outputStyle`. The deny list holds the measured tool denies, `DesignSync`, and the six built-in agents. The `allow` list is `Bash(git status *)` and the bare `Bash(git diff)`, `Bash(git log)`, and `Bash(git show)`, so those calls run without a prompt. |
| Sandbox and auto mode | `sandbox`, with `allowUnsandboxedCommands` set to `false`, and `autoMode`. The sandbox costs characters of the first request and repays them, because a sandboxed command is auto-allowed before the auto-mode classifier runs. `autoMode` replaces the built-in classifier rule lists with claudetto's shorter suite, which judged the scripted classifier cases as well as the built-in lists at about half the price per call. |
| Models and windows | `model`, `effortLevel`, `autoCompactWindow`, `fallbackModel` (`claude-sonnet-5-5`), `modelSettings` (the Haiku window and the `maxEffortLevel` ceilings `high` for `claude-opus-5-5`, `medium` for `claude-sonnet-5-5`, and `high` for `claude-haiku-5-5`), `idleCompaction`, the `env` entries `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` and `CLAUDE_CODE_SUBAGENT_MODEL`, and the status line keys `statusLine` and `subagentStatusLine`. |
| Features off | `$schema`, the five `/config` switches (`workflowSizeGuideline`, `workflowKeywordTriggerEnabled`, `enableWorkflows`, `enableArtifact`, `remoteControlAtStartup`), the seven claude.ai and notification keys (`disableClaudeAiConnectors`, `syncClaudeAiSkills`, `syncClaudeAiPlugins`, `autoUploadSessions`, `disableRemoteControl`, `inputNeededNotifEnabled`, `agentPushNotifEnabled`), the session features (`autoMemoryEnabled`, `autoDreamEnabled`, `promptSuggestionEnabled`, `awaySummaryEnabled`, `spinnerTipsEnabled`, `feedbackDrafts`, `feedbackSurveyRate`, `todoFeatureEnabled`, `voiceEnabled`), the prompt keys (`includeGitInstructions`, `showThinkingSummaries`, `attribution`), the behaviors (`autoContinueAtUsageLimit`, `switchModelsOnFlag`, `precomputeCompactionEnabled`, `showClearContextOnPlanAccept`, `useAutoModeDuringPlan`, `crossSessionInbound`, `prefersReducedMotion`), `minimumVersion`, and the feature `env` flags of `plugins/claudetto/src/tiers/env.ts`. |

The dialog prints each group's measured figures from `plugins/claudetto/src/cuts.ts` and `plugins/claudetto/src/deny.ts`, and `just inventory` checks them against a reading taken now.
`minimumVersion` keeps the updater from moving below the version claudetto is checked on; it does not stop an older Claude Code from starting.

A group you discard writes none of its keys, and a key of that group you already have stays as it is.

The `autoMode` suite holds no fact of this repository, so its `environment` list names only how the classifier tells a trusted host from an external one.

A plugin's own settings reach only `agent` and `subagentStatusLine`, so a settings file is the one way claudetto can give you permissions, environment variables, and models.
A `settings.read` hook that answers them instead was built and dropped: it read 61,353 characters against 31,861 for the file, so the readers that build the first request do not take its answer.

### Setup from a Checkout

`just setup` does the same work from a checkout of this repository, for every group at once, and takes `--settings PATH` to aim at another file and `--dry-run` to print the report and write nothing.

## What the Core Plugin Changes

| Part | Effect |
| --- | --- |
| Settings | `/claudetto:setup` writes the keys of the four groups above. |
| Handoff | A handoff file is written on a typed `/clear` and before a compaction. The next session reads it back. See [Handoff](#handoff). |
| Compaction | The compaction of Claude Code stays, with a handoff written before it. The option `cheapSummary` set to `on` answers a compaction with one bounded call on `claude-haiku-5-5`. |
| Output style | The plugin ships `claudetto:Concise`, which the Smaller prompt group selects. |
| Permission gate | Stops only a call that loses bytes for good, tampers with the system, or reads a secret. It asks before a `git push` that forces, deletes, or mirrors. |
| Run limits | Caps the subagents at once and the subagent starts per period, refuses an identical retry after repeated failures, and holds tool calls at heavy context. |
| Tool descriptions | A shorter description for a few tools. |
| Agents | `claudetto:main` as the thread's own body, plus four subagents: `claudetto:Artemis` searches many files read-only and returns paths and lines, `claudetto:Athena` reviews a diff in a fresh context and reports each defect, `claudetto:Hephaestus` makes one edit whose goal, files, and check are known and runs the check, and `claudetto:Hermes` answers a question from the web with its sources. `Artemis`, `Athena`, and `Hermes` write no file. |
| Skills | `dedupe` finds duplicate code with `jscpd` and decides which clones to merge. `docs` looks up current library docs with the Context7 CLI: `bunx ctx7 library`, then `bunx ctx7 docs`. |
| Status line | Setup writes `statusLine` and `subagentStatusLine`: the folder, the branch, the pull request, the model, the context, the cost, the 5-hour and 7-day limits, and the cache countdown. A line you already set is kept. |
| Hygiene | `just hygiene` removes the stale temp folders and old handoffs that Claude Code never removes, and takes `--dry-run`. The same sweep runs at each startup. |
| `/goal` | `/goal <cmd>` blocks a stop while the command fails. An applied change's `tasks.md` with an open box blocks a stop too. Five blocked stops in a row with no file change let the stop through. |
| `/init` | The interview reads the repository, asks only what it does not show, and writes the memory files after a yes to each draft. |
| Plan mode | A shorter plan mode reminder that names `claudetto:Artemis` for a search over many files. |
| Version warning | One line at startup when Claude Code is older than `2.1.314`. |

## Plugins

claudetto is a marketplace with one core plugin and one add-on.

| Plugin | What it gives |
| --- | --- |
| `claudetto` | Everything above. |
| `claudetto-you-should-know` | One short note above the prompt when a side check finds something about the work that the person very likely does not understand. It ships off. |

Turning the add-on on with its `enabled` option makes one model call every sixth step of a turn, on `claude-haiku-5-5` at `high` effort.
No price per token of that model sits in any file of this repository, so this page states the bounds of the call instead of a figure in money: a fixed instruction block sent with `cache: true`, a digest of at most 8,000 characters built by the plugin rather than the session window, and a reply bounded at 512 tokens.
Its `model` and `effort` options move the first two of those.

## Configuration

The core plugin's options are set in the plugin dialog of Claude Code, and `/config` lists them.

| Option | What it does |
| --- | --- |
| `decide` | `jev` registers the tool `mcp__claudetto__decide`, which asks [TypeSafe Jev](https://docs.typesafe.ai/introduction) for a pick and a confidence. `off` registers nothing. |
| `TYPESAFE_API_KEY` | The key of Jev, for `decide` and `classifier`. Claude Code keeps it in secure storage, not in a settings file. Without a key no tool is registered and nothing leaves the machine. |
| `CONTEXT7_API_KEY` | Optional. The key the `docs` skill's `ctx7` CLI sends to Context7 for higher rate limits. Claude Code keeps it in secure storage, and it reaches the CLI through the env, never through the context. |
| `cheapSummary` | `on` answers a compaction with one bounded call on `claude-haiku-5-5` at `high` effort, held to 4,000 characters. |
| `classifier` | `haiku` or `sonnet` judges each tool call that is not read-only with claudetto's own rules, in place of the auto mode classifier: Jev first when a key is set, then `claude-haiku-5-5` at `high` or `claude-sonnet-5-5` at `medium`. Each call is paid, and a failed check denies. It ships `off`. |
| `subagentCap`, `startCap`, `windowSeconds`, `callCap`, `heavyTokens`, `failLimit` | The run limits. |

Claude calls the decision tool for a decision that is its own, which is the one way to get a second judgment in an autonomous run.
Each pick sends the question and the options to the TypeSafe API.
An `AskUserQuestion` dialog always reaches the user, whatever the option.

## Handoff

The handoff is written by hooks, with no command to run.

- `classic.SessionEnd` with the reason `clear` writes a handoff when you type `/clear`.
- `classic.PreCompact` writes a handoff before a compaction.
- `classic.SessionStart` reads the newest handoff back into the next session after a `clear` or a `resume`, once.
  A handoff older than seven days is named in one line and not injected.
- A context block on `prompt.context` tells the session to write its own handoff, and where.
  When the session wrote one, the hooks write no file beside it.

The files are in `.claude/claudetto/handoffs`.

Each model call reads the whole context again, so the size of the context sets the cost of each turn.
Type `/clear` to start a fresh session from the handoff.
A model change rebuilds the prompt cache, and an effort change keeps it.

Use OpenSpec for specs: `claudetto` has no spec store.
When `openspec` is on `PATH` and the project has no `openspec/`, `just setup` runs `openspec init --tools claude --profile core`, which writes OpenSpec's six `core` workflow skills. Install the CLI with `bun add -g @fission-ai/openspec`.

## Update

```bash
claude plugin marketplace update claudetto
claude plugin update claudetto@claudetto
```

Run the `claude plugin update` line again for each add-on that you installed, with its name in place of `claudetto`.
Then restart Claude Code, and read the [changelog](CHANGELOG.md).

To try an unreleased checkout, run:

```bash
claude --plugin-dir /path/to/claudetto/plugins/claudetto
```

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md).
`just check` runs the lint, the type check, the tests, the validation, and the hook labs.
`just capture` reads the first request of a session against a fake API on `127.0.0.1`, with no model call, which is where the character figures above come from.
`just window-report` prints the cost per rate-limit window from the measured rows, or "not measured" when there are too few.
`just hygiene` removes stale temp folders and handoffs.
`just claude-version` prints the supported Claude Code version, and a version argument moves every line that declares it.

## License

[MIT](LICENSE)
