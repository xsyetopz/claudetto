# `claudetto`

claudetto changes Claude Code through its official extension points: settings, hooks, skills, and an output style.
It does not patch the Claude Code binary.
Its goal is the highest quality for the lowest token cost.

The docs of Claude Code itself are on [clawdipedia](https://clawdipedia.cc), which ships the plugins `clawdipedia-docs` and `cc-inspect`, each with a skill and an MCP server.

## Plugins

claudetto is a marketplace with one core plugin and one add-on plugin.
The tree is a rebuild in progress, so the core plugin ships less than the older releases did.

| Plugin | What it gives |
| --- | --- |
| `claudetto` | The core: the hooks of `plugins/claudetto/src/register.ts`, the output style `claudetto:Concise`, the agent `claudetto:main`, the skill `dedupe`, the settings snippet of `just setup`, and the Jev decision tool. |
| `claudetto-you-should-know` | One short note above the prompt when a side check finds something about the work that the person very likely does not understand. It ships off. |

## Install

```bash
# --- CLI -----------------------------
claude plugin marketplace add xsyetopz/claudetto
claude plugin install claudetto@claudetto

# --- TUI -----------------------------
/plugin marketplace add xsyetopz/claudetto
/plugin install claudetto@claudetto
```

Then merge the settings snippet from a checkout of this repository, and restart Claude Code:

```bash
just setup
```

`just setup` runs `bun plugins/claudetto/src/tiers/setup.ts`.
It merges the snippet of your plan tier into `~/.claude/settings.json` and keeps each value you set.
Pass `--settings PATH` to aim at another file, and `--dry-run` to print the report and write nothing.

Requirements:

- Claude Code `2.1.312` or later.
  claudetto is tested on `2.1.312` and `2.1.314`.
- `git`.
- [Bun](https://bun.sh) on `PATH`, for `just setup`.

A plugin cannot set permissions, environment variables, or models.
So the core plugin gives these settings as a settings snippet, which `just setup` applies.
You can also copy the keys that you want into your own `settings.json`.

## What the Core Plugin Changes

| Part | Effect |
| --- | --- |
| Settings snippet | `just setup` writes `permissions.deny`, `agent`, `outputStyle`, `autoMode`, `sandbox`, `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`, `CLAUDE_CODE_SUBAGENT_MODEL`, `autoCompactWindow`, `idleCompaction`, `modelSettings`, `model`, `effortLevel`, and the keys that turn off the bundled skills and most built-in plugins of Claude Code. Together they take the first request of a session from 42,879 characters to 31,861, read with `just capture --shipped`. |
| Handoff | A handoff file is written on a typed `/clear` and before a compaction. The next session reads it back. See "Handoff" below. |
| Compaction | The compaction of Claude Code stays. The `compaction` option `built-in` and `auto` keep it, and `code` is an experimental compaction that code builds with no model request. The option `cheapSummary` set to `on` answers a compaction with one bounded call on `claude-haiku-5-5`. |
| Output style | The plugin ships `claudetto:Concise`, which `just setup` selects. Without setup, set `outputStyle` to `claudetto:Concise` yourself. |
| Permission gate | Stops only a call that loses bytes for good, tampers with the system, or reads a secret. It asks before a `git push` that forces, deletes, or mirrors. |
| Sandbox | `just setup` writes `sandbox.enabled` with `allowUnsandboxedCommands` set to `false`, so a `Bash` command runs inside the sandbox, and `sandbox.filesystem.denyRead` keeps it out of `~/.ssh`, `~/.gnupg`, `~/.aws/credentials`, `~/.netrc`, and `~/.docker/config.json`. It costs 7,254 characters of the first request and repays them: a sandboxed command is auto-allowed before the auto-mode classifier runs, and one classifier call is 140,718 characters. |
| Run limits | Caps the subagents at once and the subagent starts per period, refuses an identical retry after repeated failures, and holds tool calls at heavy context. The plugin options `subagentCap`, `startCap`, `windowSeconds`, `callCap`, `heavyTokens`, and `failLimit` set them. |
| Tool descriptions | A shorter description for a few tools. |

## Handoff

The handoff is written by hooks, with no command to run.

- `classic.SessionEnd` with the reason `clear` writes a handoff when you type `/clear`.
- `classic.PreCompact` writes a handoff before a compaction.
- `classic.SessionStart` reads the newest handoff back into the next session after a `clear` or a `resume`, once.
  A handoff older than seven days is named in one line and not injected.
- A context block on `prompt.context` tells the session to write its own handoff, and where.
  When the session wrote one, the hooks write no file beside it.

The files are in `.claude/claudetto/handoffs`.

## Model and Skills

`just setup` writes `claude-opus-5-5` as the main model, and `CLAUDE_CODE_SUBAGENT_MODEL` as `claude-sonnet-5-5`.

The core plugin has the skill `dedupe`, which finds duplicate code with `jscpd` and decides which clones to merge.
Use openspec for specs: `claudetto` has no spec store.

## Long Work without Compaction

Each model call reads the whole context again, so the size of the context sets the cost of each turn.
Type `/clear` to start a fresh session from the handoff.
A model change rebuilds the prompt cache.
An effort change keeps the prompt cache.

## Jev Pick

With the option `decide` set to `jev`, the core plugin registers the tool `mcp__claudetto__decide`, which asks [TypeSafe Jev](https://docs.typesafe.ai/introduction) for a pick and a confidence.
Claude calls it for a decision that is its own, which is the one way to get a second judgment in an autonomous run.
Export `TYPESAFE_API_KEY` before Claude Code starts, or set it as the plugin option.
Each pick sends the question and the options to the TypeSafe API.
Without a key no tool is registered and nothing leaves the machine.
An `AskUserQuestion` dialog always reaches the user, whatever the option.

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

`just check` runs the lint, the type check, the tests, the validation, and the hook labs.

## License

[MIT](LICENSE)
