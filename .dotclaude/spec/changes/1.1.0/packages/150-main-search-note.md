---
schema: dotclaude-spec/2
kind: package
id: P150
title: Search tools of the main session in setup and the wiki (I18)
wave: 4
deps: ["P56"]
owns: ["src/plugins/dotclaude/slices/setup/adapters/cli.ts","tests/dotclaude/setup/search-note.test.ts","wiki/claude-code/Search-Tools.md"]
satisfies: ["REQ-19"]
verify: just test tests/dotclaude/setup/search-note.test.ts && bun run lint:md && just lab
agent: implementer
status: planned
---

## Goal

The user learns from the setup output and the wiki to start Claude Code with `--allowedTools Grep Glob`, because a plugin cannot give the main session `Grep`.

## Context

- `design.md`, "Search tools": "An allow rule in a settings file doesn't have this effect", and only the CLI sets `launchOptions.searchToolsOptIn()`.
- The setup CLI: `setup/adapters/cli.ts`.
- No `DOTCLAUDE_` env var is added (`CLAUDE.md`, "Rules").

## Steps

1. Add one line to the output of `dotclaude-setup settings`: start Claude Code with `--allowedTools Grep Glob` to get the search tools in the main session.
2. Write `wiki/claude-code/Search-Tools.md` with the facts and their sources, and the two kinds of `grep`.
3. Test `search-note.test.ts`: the setup output has the flag `--allowedTools Grep Glob` as a literal, which is a command and not prose.

## Acceptance

- The verify command passes.

## Boundaries

- Do not write a user setting, an alias, or a shell file.
- Do not run `just wiki`, which P82 does.
