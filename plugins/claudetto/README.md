# Claudetto

Tunes Claude Code for coding at the lowest token cost. It uses only Claude Code's official extension points (settings, hooks, agents, commands, a skill, and an output style) and patches nothing.

## What It Does

- Gates risky shell commands, and denies an `rm` of a temp base such as `/tmp` or `$TMPDIR` itself.
- Scans every tool result for secrets with `betterleaks`.
- Caps a Bash result and an MCP tool result through the output limits that `/claudetto:setup` writes; Claude Code saves a longer result to its own file.
- Tells each compaction to keep the person's corrections, refusals, and consents word for word.
- Caps subagent starts, heavy tool calls, and identical retries per period.
- Checks each final reply before the turn ends, and sends back one that defers work without naming a blocker.
- Cleans up at the end of a task: the agent's own worktrees and branches, and any background task nothing will read.
- Sweeps idle entries of Claude Code's temp folder and unused build folders, and local branches that `git cherry` finds in the default branch, at each session start, resume, clear, and compaction, in the project and in each folder Mole's `purge_paths` lists, then runs `mo clean` for user caches; `hooks/classic.SessionStart/useHygieneSweep/trash.toml` lists the build folders, and `.claude/claudetto/trash.toml` overrides it per project. `claudetto-hygiene --remote --dry-run` names the `origin` branches whose pull request merged, and `--remote` without `--dry-run` deletes them; no hook passes `--remote`.
- Ships the agents `search` (read-only search), `work` (default worker), `plan` (planning), and `sweep` (read-only defect review on `fable`), the `docs` skill, and the Concise output style.

## Install

```sh
claude plugin install claudetto --marketplace xsyetopz/bedrock
```

## Setup

claudetto needs two tools on the `PATH`:

```sh
brew install betterleaks mole
```

Then run `/claudetto:setup` once per project. It writes claudetto's settings, starter files, ignore blocks, and tools.

## Options

Set the options in `/plugin` → claudetto → Configure. Each `userConfig` field in `.claude-plugin/plugin.json` says what it does and its default.
