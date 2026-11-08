# claudetto

Tunes Claude Code for coding at the lowest token cost. It uses only Claude Code's official extension points (settings, hooks, agents, commands, a skill, and an output style) and patches nothing.

## What it does

- Gates risky shell commands and asks for a marker file in each folder a session makes under `/tmp`.
- Scans every tool result for secrets with `betterleaks`.
- Cuts long test, build, and lint output to its head, tail, and failures, and keeps the whole run in `.claude/claudetto/output/`.
- Hands a long session over to a fresh one through a handoff file; `/claudetto:handoff` does it by hand.
- Caps subagent starts, heavy tool calls, and identical retries per period.
- Checks each final reply before the turn ends, and sends back one that defers work without naming a blocker.
- Cleans up at the end of a task: the agent's own marked temp folders, worktrees, and branches, and any background task nothing will read.
- Sweeps old temp folders, handoffs, and unused build folders at session start; `hooks/hygiene/trash.toml` lists the build folders, and `.claude/claudetto/trash.toml` overrides it per project.
- Ships the agents Artemis (read-only search), Heracles (default worker), and Metis (planning), the `docs` skill, and the Concise output style.

## Install

```sh
claude plugin install claudetto --marketplace xsyetopz/claudetto
```

## Setup

claudetto needs two tools on the `PATH`:

```sh
brew install betterleaks mole
```

Then run `/claudetto:setup` once per project. It writes claudetto's settings, starter files, ignore blocks, and tools.

## Options

Set the options in `/plugin` → claudetto → Configure. Each `userConfig` field in `.claude-plugin/plugin.json` says what it does and its default.
