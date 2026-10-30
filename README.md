# Claudetto

Claudetto tunes Claude Code for coding at the lowest token cost.
It works through the official extension points only: settings, hooks, skills, commands, and an output style.
It patches nothing.

Version `0.0.0`. The tree is a rebuild in progress, so the core plugin ships less than the older releases did.
Each capability lands with the measurement that decided its values.

The docs of Claude Code itself are on [clawdipedia](https://clawdipedia.cc), which ships the plugins `clawdipedia-docs` and `cc-inspect`, each with a skill and an MCP server.

## Features

- A first request of 31,909 characters against 42,879 for a stock session, read with `just capture --arm plugin --shipped`.
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
Its row in the command listing costs 48 characters of the first request.

### The Three Groups

| Group | What keeping it writes |
| --- | --- |
| Smaller prompt | `disableBundledSkills`, `enabledPlugins`, `permissions.deny`, `permissions.allow`, `agent`, `outputStyle`. Together they take the first request from 42,879 characters to 31,909, and the tool schemas from 12 tools to 9. The `allow` list is `Bash(git status *)` and the bare `Bash(git diff)`, `Bash(git log)`, and `Bash(git show)`, so those calls run without a prompt. |
| Sandbox | `sandbox`, with `allowUnsandboxedCommands` set to `false`. It costs 7,254 characters of the first request and repays them, because a sandboxed command is auto-allowed before the auto-mode classifier runs and one classifier call is 140,718 characters. |
| Models and windows | `model`, `effortLevel`, `env`, `autoCompactWindow`, `modelSettings`, `idleCompaction`. |

A group you discard writes none of its keys, and a key of that group you already have stays as it is.

The command writes no `autoMode`, whatever you answer.
Its `environment` facts are readings of this repository, and the auto-mode classifier would read them as facts about your machine and decide from them whether a command runs without asking.
Keeping all three groups costs the same 31,909 characters as the full snippet does, so leaving the key out costs nothing measured.

A plugin's own settings reach only `agent` and `subagentStatusLine`, so a settings file is the one way claudetto can give you permissions, environment variables, and models.
A `settings.read` hook that answers them instead was built and dropped: it read 61,353 characters against 31,861 for the file, so the readers that build the first request do not take its answer.

### Setup from a Checkout

`just setup` does the same work from a checkout of this repository, for every group at once, and takes `--settings PATH` to aim at another file and `--dry-run` to print the report and write nothing.
It also writes `autoMode`, which the command does not, because inside this checkout the environment facts are true.

## What the Core Plugin Changes

| Part | Effect |
| --- | --- |
| Settings | `/claudetto:setup` writes the keys of the three groups above. |
| Handoff | A handoff file is written on a typed `/clear` and before a compaction. The next session reads it back. See [Handoff](#handoff). |
| Compaction | The compaction of Claude Code stays, with a handoff written before it. The option `cheapSummary` set to `on` answers a compaction with one bounded call on `claude-haiku-5-5`. |
| Output style | The plugin ships `claudetto:Concise`, which the Smaller prompt group selects. |
| Permission gate | Stops only a call that loses bytes for good, tampers with the system, or reads a secret. It asks before a `git push` that forces, deletes, or mirrors. |
| Run limits | Caps the subagents at once and the subagent starts per period, refuses an identical retry after repeated failures, and holds tool calls at heavy context. |
| Tool descriptions | A shorter description for a few tools. |
| Agents | `claudetto:main` as the thread's own body, plus two subagents: `claudetto:Artemis` searches many files read-only and returns paths and lines, and `claudetto:Athena` reviews a diff in a fresh context and reports each defect. Neither writes a file. |
| Skills | `dedupe` finds duplicate code with `jscpd` and decides which clones to merge. |

## Plugins

claudetto is a marketplace with one core plugin and one add-on.

| Plugin | What it gives |
| --- | --- |
| `claudetto` | Everything above. |
| `claudetto-you-should-know` | One short note above the prompt when a side check finds something about the work that the person very likely does not understand. It ships off. |

## Configuration

The core plugin's options are set in the plugin dialog of Claude Code, and `/config` lists them.

| Option | What it does |
| --- | --- |
| `decide` | `jev` registers the tool `mcp__claudetto__decide`, which asks [TypeSafe Jev](https://docs.typesafe.ai/introduction) for a pick and a confidence. `off` registers nothing. |
| `TYPESAFE_API_KEY` | The key of Jev. Claude Code keeps it in secure storage, not in a settings file. Without a key no tool is registered and nothing leaves the machine. |
| `cheapSummary` | `on` answers a compaction with one bounded call on `claude-haiku-5-5`. |
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

Use openspec for specs: `claudetto` has no spec store.

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
`just claude-version` prints the supported Claude Code version, and a version argument moves every line that declares it.

## License

[MIT](LICENSE)
