# Claudetto

Claudetto tunes Claude Code for coding at the lowest token cost.
It works through the official extension points only: settings, hooks, skills, commands, and an output style.
It patches nothing.

Version `0.2.0`. The tree is a rebuild in progress, so the core plugin ships less than the older releases did.
Each capability lands with the measurement that decided its values.

The docs of Claude Code itself are on [clawdipedia](https://clawdipedia.cc), which ships the plugins `clawdipedia-docs` and `cc-inspect`, each with a skill and an MCP server.

## Features

- A first request of 24,961 characters against 46,084 for a stock session, read with `just capture --arm plugin --shipped` and `just capture`. The shipped settings alone read 28,809 with `just capture --arm plain --shipped`.
- A permission gate that stops only a call that loses bytes for good, tampers with the system, or reads a secret.
- A `/claudetto:handoff` command that has the session call the `handoff` tool, plus a handoff written before a compaction.
- A handoff reply that compacts the conversation to itself, with no summary call, so the next turn reads the cached prefix.
- Run limits on subagents, on tool calls at heavy context, and on an identical retry after repeated failures.
- A sandbox that keeps a `Bash` command out of `~/.ssh`, `~/.gnupg`, `~/.aws/credentials`, `~/.netrc`, and `~/.docker/config.json`.

## Requirements

- Claude Code `2.1.316` or later.
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

The plugin serves the command in code, with no model turn and no tool. It finds each difference between your user settings file and claudetto's keys, with your value and claudetto's value.
Then it asks you about each group of differences in a dialog of Claude Code's own, and writes only the keys you keep.
A key you keep replaces your value. A key you do not keep stays as it is.
The report names every key it wrote and every key it skipped.
The keys take effect in the next session, because Claude Code reads them when it starts.

Setup also offers two sandbox switches that are not in the groups: `sandbox.enabled: false`, which runs `Bash` outside the sandbox, and `sandbox.network.allowLocalBinding: true`, which lets a sandboxed command listen on a local port.

Setup also offers claudetto's code rules as the file `~/.claude/rules/claudetto-code.md`: write the least code that does the task, guard only at a trust boundary, name the edge cases you handled, and write a comment only for a reason the code cannot show.
Its `paths:` of `**/*` keeps it out of a session until the session reads a file, so a session that only talks does not carry it.
Claude Code does not load a plugin's own `rules/` folder, so the file takes effect only once setup writes it.

A setup run takes no model turn: the dialogs open from the hook, and no tool schema or list of differences enters the request.
A session with no one to ask, such as `claude -p`, writes nothing.
Its row in the command listing costs 48 characters of the first request.

### The Four Groups

| Group | What keeping it writes |
| --- | --- |
| Smaller prompt | `disableBundledSkills`, `enabledPlugins`, `permissions.deny`, `permissions.allow`, `agent`, `outputStyle`. The deny list holds the measured tool denies, `DesignSync`, and the six built-in agents. The `allow` list is `Bash(git status *)` and the bare `Bash(git diff)`, `Bash(git log)`, and `Bash(git show)`, so those calls run without a prompt. |
| Sandbox and auto mode | `sandbox`, with `allowUnsandboxedCommands` set to `false`, and `autoMode`. The sandbox costs characters of the first request and repays them, because a sandboxed command is auto-allowed before the auto-mode classifier runs. `autoMode` replaces the built-in classifier rule lists with claudetto's shorter suite, which judged the scripted classifier cases as well as the built-in lists at about half the price per call. |
| Models and windows | `model`, `effortLevel`, `autoCompactWindow`, `fallbackModel` (`claude-sonnet-5-5`), `modelSettings` (the Haiku window and the `maxEffortLevel` ceilings `high` for `claude-opus-5-5`, `medium` for `claude-sonnet-5-5`, and `high` for `claude-haiku-5-5`), `idleCompaction`, the `env` entries `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` and `CLAUDE_CODE_SUBAGENT_MODEL`, the `env` pins `ANTHROPIC_DEFAULT_MODEL` and `ANTHROPIC_DEFAULT_OPUS_MODEL` (`claude-opus-5-5`), `ANTHROPIC_DEFAULT_SONNET_MODEL` (`claude-sonnet-5-5`), and `ANTHROPIC_DEFAULT_HAIKU_MODEL` (`claude-haiku-5-5`), so that `default` and every alias resolve to these models, and the status line keys `statusLine` and `subagentStatusLine`. |
| Features off | `$schema`, the five `/config` switches (`workflowSizeGuideline`, `workflowKeywordTriggerEnabled`, `enableWorkflows`, `enableArtifact`, `remoteControlAtStartup`), the seven claude.ai and notification keys (`disableClaudeAiConnectors`, `syncClaudeAiSkills`, `syncClaudeAiPlugins`, `autoUploadSessions`, `disableRemoteControl`, `inputNeededNotifEnabled`, `agentPushNotifEnabled`), the session features (`autoMemoryEnabled`, `autoDreamEnabled`, `promptSuggestionEnabled`, `awaySummaryEnabled`, `spinnerTipsEnabled`, `feedbackDrafts`, `feedbackSurveyRate`, `todoFeatureEnabled`, `voiceEnabled`), the prompt keys (`includeGitInstructions`, `showThinkingSummaries`, `attribution`), the behaviors (`autoContinueAtUsageLimit`, `switchModelsOnFlag`, `precomputeCompactionEnabled`, `showClearContextOnPlanAccept`, `useAutoModeDuringPlan`, `crossSessionInbound`, `prefersReducedMotion`), `minimumVersion`, and the feature `env` flags of `plugins/claudetto/src/tiers/env.ts`. |

The tool gives each group's measured figures from `plugins/claudetto/src/cuts.ts` and `plugins/claudetto/src/deny.ts`, and `just inventory` checks them against a reading taken now.
`minimumVersion` keeps the updater from moving below the version claudetto is checked on; it does not stop an older Claude Code from starting.

A key you discard is not written, and the value you already have for it stays as it is.

The `autoMode` suite holds no fact of this repository, so its `environment` list names only how the classifier tells a trusted host from an external one.

A plugin's own settings reach only `agent` and `subagentStatusLine`, so a settings file is the one way claudetto can give you permissions, environment variables, and models.
A `settings.read` hook that answers them instead was built and dropped: it read 61,353 characters against 31,861 for the file, so the readers that build the first request do not take its answer.

### Setup from a Checkout

`just setup` writes every group at once from a checkout of this repository, with no model call. It keeps a value you already set, and takes `--settings PATH` to aim at another file and `--dry-run` to print the report and write nothing.

### Starter Files

On a repo with neither `AGENTS.md` nor `CLAUDE.md`, `just setup` and `/claudetto:setup` offer two new files, built in code with no model call and no system prompt text:

- `AGENTS.md`, under 600 characters, holds the bounded test, build, and lint commands of the language family that the root marker files name, such as `Cargo.toml` or `package.json` with `bun.lock`. The families are JS/TS, Python, Ruby, shell, HTML/CSS, C/C++, Rust, Swift, JVM, .NET, and Go, and `plugins/claudetto/src/tiers/starter/families.ts` holds each table. A command carries only flags read from the tool's `--help` or its docs, and a tool without a confirmed flag is left out.
- `CLAUDE.md` is `# CLAUDE.md`, a blank line, and `@AGENTS.md`.

The dialog shows each file as added lines and writes only after a `Write`. `just setup` asks at the terminal, takes `--yes` to answer for you, and with `--dry-run` prints the files and writes nothing. A file that exists is never replaced, and `/init` stays the interview for the rest.

### Ignore Files

On any git repo, `just setup` and `/claudetto:setup` also offer a block in `.gitignore` and in `.ignore`, in a second dialog that shows the changed lines as a diff and writes after a `Write`. The block sits between these two lines, and a rerun replaces only the text between them:

```text
# >>> claudetto: generated by /claudetto:setup, edit outside this block
# <<< claudetto
```

- `.gitignore` gets the paths no tool should list: `.DS_Store`, `Thumbs.db`, `*.swp`, `.claude/settings.local.json`, `.claude/worktrees/`, `.claude/claudetto/`, and `CLAUDE.local.md`. Each detected language family adds its build, cache, and dependency folders that git does not track.
- `.ignore` has no fixed line. It gets a heavy folder of a detected family when git tracks a file in it, and a lock or minified file of the family when git sees one, because git tracks it and searches should skip it.
- A path that your own lines already name, a negation such as `!path` included, stays out of the block, because the last matching line wins and an appended line would undo your negation. A line outside the block is never changed or reordered, and a rerun on a settled repo changes no byte. A block with no closing line is left as it is.
- `.rgignore` is not written. `rg` reads `.rgignore` and `.ignore` alike, and `fd` and the `@` file picker read `.ignore`, so `.rgignore` adds only an `rg`-only override, which no template line needs.

## What the Core Plugin Changes

| Part | Effect |
| --- | --- |
| Settings | `/claudetto:setup` writes the keys you keep from the four groups above, the sandbox switches, and the code rules file. |
| Handoff | `/claudetto:handoff` has the session call the `handoff` tool, which writes the file, clears, and submits the next prompt. A handoff is also written before a compaction and read back on `resume`. See [Handoff](#handoff). |
| Compaction | A reply that starts with `# Handoff` compacts the conversation to the first message, one assistant line, and that reply, with no model call. A turn that ends at 400,000 tokens of context or more gets its handoff from one fork of the conversation, which the cache serves, compacts the same way, and waits for the user's next prompt. Any other compaction is Claude Code's, with a handoff written before it. The option `cheapSummaryEnabled` set to `true` answers it with one bounded call on `claude-haiku-5-5`. |
| Output style | The plugin ships `claudetto:Concise`, which the Smaller prompt group selects. |
| Permission gate | Stops only a call that loses bytes for good, tampers with the system, or reads a secret. It asks before a `git push` that forces, deletes, or mirrors, and before a push to an address that no remote of the repository names. With `classifierModel` set to `haiku` or `sonnet`, the classifier's allow settles an ask of the gate, except the ask on an address no remote names, which only a person settles. |
| Run limits | Caps the subagents at once and the subagent starts per period, refuses an identical retry after repeated failures, and holds tool calls at heavy context. |
| Tool descriptions | A shorter description for a few tools. |
| Agents | `claudetto:main` as the thread's own body, plus four subagents: `claudetto:Artemis` searches many files read-only and returns paths and lines, `claudetto:Athena` reviews a diff in a fresh context and reports each defect, `claudetto:Hephaestus` makes one edit whose goal, files, and check are known and runs the check, and `claudetto:Hermes` answers a question from the web with its sources. `Artemis`, `Athena`, and `Hermes` write no file. |
| Skills | `docs` looks up current library docs with the Context7 CLI: `bunx ctx7 library`, then `bunx ctx7 docs`. |
| Status line | Setup writes `statusLine` and `subagentStatusLine`: the folder, the branch, read from the checkout's `.git/HEAD` when Claude Code sends none, the pull request, each open OpenSpec change with its ticked and total task boxes, such as `☐ release-0-3-0 4/12`, the model, the context, the cost, the 5-hour and 7-day limits, and the cache countdown. A line you already set is kept. `/statusline` with no text writes the same two keys with no model call, and prints each key it wrote, or `Wrote no key.` |
| Hygiene | `just hygiene` removes the stale temp folders and old handoffs that Claude Code never removes, and takes `--dry-run`. The same sweep runs at each startup. `handoffCleanupPeriodDays`, `sessionTempCleanupPeriodDays`, and `probeCleanupPeriodMinutes` set the age per kind, 0 turns a kind off, and `hygieneEnabled` set to `false` starts no sweep. |
| `/init` | The interview reads the repository, asks only what it does not show, and writes the memory files after a yes to each draft. |
| Plan mode | A shorter plan mode reminder that names `claudetto:Artemis` for a search over many files. |
| Version warning | One line at startup when Claude Code is older than `2.1.316`. |

### Run the Hygiene Sweep by Hand

An installed plugin has no command for the sweep, so call its script by the path in the plugin cache, with `--dry-run` first to list what it would remove and remove nothing:

```sh
~/.claude/plugins/cache/claudetto/claudetto/<version>/bin/claudetto-hygiene --dry-run
```

Replace `<version>` with the installed version. Run it without `--dry-run` to remove. It takes `--handoff-days`, `--session-days`, and `--probe-minutes` to set the age of one kind.

### Model `opusplan`

`opusplan` is opt-in; claudetto does not set it. It uses Opus in plan mode and a cheaper model otherwise, so each change of mode switches the model. A switch of model drops the prompt cache, so the first request after each mode change pays the full input price of the context again. Use it only when the plans are worth that cost.

## Plugins

claudetto is a marketplace with one core plugin and one add-on.

| Plugin | What it gives |
| --- | --- |
| `claudetto` | Everything above. |
| `claudetto-you-should-know` | One short note above the prompt when a side check finds something about the work that the person very likely does not understand. It ships off. |

Turning the add-on on with its `sideCheckEnabled` option makes one model call every sixth step of a turn, on `claude-haiku-5-5` at `high` effort.
No price per token of that model sits in any file of this repository, so this page states the bounds of the call instead of a figure in money: a fixed instruction block sent with `cache: true`, a digest of at most 8,000 characters built by the plugin rather than the session window, and a reply bounded at 512 tokens.
Its `sideCheckModel` and `sideCheckEffortLevel` options move the first two of those.

## Configuration

The core plugin's options are set in the plugin dialog of Claude Code, and `/config` lists them.

| Option | Type, default | What it does |
| --- | --- | --- |
| `decideProvider` | string, `jev` | `jev` registers the tool `mcp__claudetto__decide`, which asks [TypeSafe Jev](https://docs.typesafe.ai/introduction) for a pick and a confidence. `off` registers nothing. |
| `typesafeApiKey` | string, unset | The key of Jev, for `decideProvider` and `classifierModel`. Claude Code keeps it in secure storage, not in a settings file, and the env variable `TYPESAFE_API_KEY` serves when it is unset. Without a key no tool is registered and nothing leaves the machine. |
| `context7ApiKey` | string, unset | Optional. The key the `docs` skill's `ctx7` CLI sends to Context7 for higher rate limits. Claude Code keeps it in secure storage, and it reaches the CLI through the env variable `CONTEXT7_API_KEY`, never through the context. |
| `cheapSummaryEnabled` | boolean, `false` | `true` answers a compaction with one bounded call on `claude-haiku-5-5` at `medium` effort, held to 4,000 characters. |
| `handoverThresholdTokens` | number, unset | The context, in input tokens of the last response, from which a turn's end hands over through a fork. Unset, it is 400,000, or half the context window when that is smaller. |
| `classifierModel` | string, `off` | `haiku` or `sonnet` judges each tool call that is not read-only with claudetto's own rules, in place of the auto mode classifier: Jev first when a key is set, then `claude-haiku-5-5` or `claude-sonnet-5-5`, each at `medium`. Each call is paid, and a failed check denies. Its `allow` also skips the permission prompt in every permission mode, because the hook cannot read the mode. It ships `off`, which leaves the judging to the auto mode classifier. Change it in `/config`. |
| `confineEnabled` | boolean, `false` | `true` confines the writes of every `Bash` command at the operating system level, with `sandbox-exec` on macOS and `bwrap` on Linux. A command can write only the project, `/tmp`, `$TMPDIR`, `~/.bun`, and `~/.cache`, and not `.git/hooks` or `.git/config`. It sets `CLAUDE_CODE_SHELL_PREFIX`, so the permission check, the deny rules, the `PreToolUse` hooks, and the auto mode classifier still judge the command the model wrote. Without `bwrap` on Linux the call is refused, never run unconfined. The built-in `sandbox` must be off. See [docs/confine.md](docs/confine.md). |
| `readGuardEnabled` | boolean, `true` | `false` lets `Read` take a lock file (`bun.lock`, `Cargo.lock`, `yarn.lock`, and the like), a `*.min.js`, `*.min.css`, or `*.map` file, or a file under `node_modules`, `.next`, `DerivedData`, `.build`, `__pycache__`, `.venv`, `.gradle`, `.tox`, or a tool cache whole. With the default, such a `Read` without a `limit` is denied with a hint to pass `offset` and `limit`, to use `rg`, or to use the package command. `Bash` and the sandbox are untouched, and the request grows by no character. |
| `missingToolNoticeEnabled` | boolean, `true` | `false` turns off the one line that a new session shows when `ast-grep` is not on the `PATH`. The line names the install command for the platform (`brew install ast-grep`, or the release zip and the folder to unpack it to) and `/claudetto:setup`, and it is shown once for the pinned version `0.51.1`. The check looks up the `PATH` folders with no process and no model call, and the line never reaches the model, so the request grows by no character. |
| `maxSubagentStarts` | number, 12 | The most subagent starts inside the period of `limitPeriodSeconds`. |
| `limitPeriodSeconds` | number, 600 | The period that `maxSubagentStarts`, `maxHeavyToolCalls`, and `maxIdenticalFailures` count in. |
| `maxHeavyToolCalls` | number, 20 | The most tool calls inside the period while the context holds `heavyContextTokens` or more. |
| `heavyContextTokens` | number, 400,000 | The input tokens of the last response from which the context counts as heavy. |
| `maxIdenticalFailures` | number, 3 | How many times the same call fails with the same error before an identical retry is refused. |
| `maxTestOutputChars` | number, 8,000 | The most characters of a `Bash` test, build, lint, or check run (`bun test`, `just check`, `cargo test`, `go test`, `pytest`, `npm run test`, `make`, `tsc`, and the like) that the model reads. A longer output keeps its head, its tail, and the lines that match a failure, with one line that names the cut count and the file under `.claude/claudetto/output/` that holds the whole output. The exit status and an error result stay as they are. `0` is off. 8,000 is about 2,000 tokens: room for a runner's banner, its summary, and a few failures. |
| `hygieneEnabled` | boolean, `true` | `false` starts no hygiene sweep at a session start. |
| `handoffCleanupPeriodDays` | number, unset | The age in days from which the sweep removes a handoff, except the newest of the project. Unset, it follows `cleanupPeriodDays`. 0 keeps every handoff. |
| `sessionTempCleanupPeriodDays` | number, unset | The age in days from which the sweep removes the temp folder of a session that is not running. Unset, it follows `cleanupPeriodDays`. 0 keeps them all. |
| `probeCleanupPeriodMinutes` | number, 60 | The age in minutes from which the sweep removes an `fswatch-probe-*` folder. 0 keeps them all. |

The add-on `claudetto-you-should-know` has `sideCheckEnabled` (boolean, `false`), `sideCheckModel` (string, `claude-haiku-5-5`), and `sideCheckEffortLevel` (string, `high`).

The most subagents at once is not a claudetto option: Claude Code has `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`, which you set in the `env` setting. claudetto refuses a start at that number too, and without it at the cap of your plan.

The options had other names before this release. A value stored under the old name is read until the new name is set, except for the two keys in secure storage, which Claude Code may not hand over: enter `typesafeApiKey` and `context7ApiKey` again in the plugin dialog, or keep the env variables.

| Before | Now |
| --- | --- |
| `decide`, `TYPESAFE_API_KEY`, `CONTEXT7_API_KEY` | `decideProvider`, `typesafeApiKey`, `context7ApiKey` |
| `cheapSummary` (`on`, `off`) | `cheapSummaryEnabled` (`true`, `false`) |
| `handoverTokens`, `classifier` | `handoverThresholdTokens`, `classifierModel` |
| `startCap`, `windowSeconds`, `callCap`, `heavyTokens`, `failLimit` | `maxSubagentStarts`, `limitPeriodSeconds`, `maxHeavyToolCalls`, `heavyContextTokens`, `maxIdenticalFailures` |
| `subagentCap` | `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` in the `env` setting |
| `enabled`, `model`, `effort` of the add-on | `sideCheckEnabled`, `sideCheckModel`, `sideCheckEffortLevel` |

Claude calls the decision tool for a decision that is its own, which is the one way to get a second judgment in an autonomous run.
Each pick sends the question and the options to the TypeSafe API.
An `AskUserQuestion` dialog always reaches the user, whatever the option.

## Handoff

Claude calls the `handoff` tool or writes the handoff as a reply, and `/claudetto:handoff` asks for the tool call at once.

- A context block on `prompt.context` tells the session to call the tool when the work in hand is done and the conversation has grown long.
- `/claudetto:handoff` is a prompt command whose file tells the session to call the tool, so you can ask for it before the session decides to. Code redacts the fields.
- A typed `/clear` writes no file and reads none back.
- `classic.PreCompact` writes a handoff before a compaction.
- `classic.SessionStart` reads the newest handoff back into the next session after a `resume`, once.
  A handoff older than seven days is named in one line and not injected.
- A main-loop reply that starts with `# Handoff` is saved as a handoff file. Then `/compact` runs, and the hook answers it with the first message, kept whole, one assistant line, and the reply. So no summary call is made. The next request reads the tools and system prompt from cache and writes the rest again, about 4k tokens. Then the next prompt goes in: "Continue from the handoff above: take its next steps."
  Claude Code's own system section that says no handoff is needed is left out.
- A main-loop turn that ends with its context at `handoverThresholdTokens` or more, with no handoff reply, hands over through `$.model.fork`. At idle the fork repeats the last request and adds the final reply and one prompt for the handoff, so the cache serves the context: on the real API the fork read 33,568 tokens from cache and wrote 29. The handover then waits for the user's next prompt, because the turn already answered the user. A reply that starts with `# Handoff` goes the way above. Any other fork reply leaves the compaction to Claude Code, with one log line, and no turn's end forks again until a compaction has run. A turn after a handover that still ends at the size forks nothing, so the session never hands over in a loop.
  Claude Code's own compaction stays for a turn that outgrows the window before it ends.
  When the session wrote a handoff file itself, the hooks write no file beside it.

The files are in `.claude/claudetto/handoffs`.

Each model call reads the whole context again, so the size of the context sets the cost of each turn.
A handoff reply starts a fresh context from the handoff.
A model change rebuilds the prompt cache, and an effort change keeps it.

Use OpenSpec for specs: `claudetto` has no spec store.
When `openspec` is on `PATH` and the project has no `openspec/`, `just setup` runs `openspec init --tools claude --profile core`, which writes OpenSpec's six `core` workflow skills. Install the CLI with `bun add -g @fission-ai/openspec`.

## Update

```bash
claude plugin marketplace update claudetto
claude plugin update claudetto@claudetto
claude plugin update claudetto-you-should-know@claudetto
```

Each plugin updates on its own: `claude plugin update claudetto@claudetto` leaves `claudetto-you-should-know` at its old version. Skip the last line if you did not install it.
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
`just gc` removes the `mkdtemp` folders that the dev tools leave in the temp folder past `--hours` (24 by default, 0 for off). It keeps a folder that is some process's working directory, one with a live `tmux.sock`, and a symlink. It takes `--dry-run`.
`just claude-version` prints the supported Claude Code version, and a version argument moves every line that declares it.

## License

[MIT](LICENSE)
