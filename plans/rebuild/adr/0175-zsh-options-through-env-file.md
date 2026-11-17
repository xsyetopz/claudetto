---
status: accepted
date: recorded in openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:560 (day of decision not recorded)
---

# Zsh Options Through the Env File

## Context and Problem Statement

zsh `NOMATCH` fails Bash commands that the model writes for bash: 123 "no matches found" and 36 "= not found" errors in 4 days. 30 of 63 classified words were `grep --include=*.ts`. How does claudetto stop them?

## Considered Options

- Set `setopt no_nomatch no_equals` through `CLAUDE_ENV_FILE`.
- Switch `CLAUDE_CODE_SHELL` to `/bin/bash`.
- Route through `ZDOTDIR`.

## Decision Outcome

Chosen: the `setopt no_nomatch no_equals` line in `CLAUDE_ENV_FILE`.

The `/bin/bash` switch is refuted. macOS bash is 3.2, where `**` matches one level. Of 39,389 Bash commands, 104 used unquoted `**` and 70 ran, so the switch trades loud failures for silent ones.

The source records the `ZDOTDIR` route only as a hypothesis, with no result, so it is not weighed here. The earlier finding that Claude Code still read `$HOME/.zshrc` is unconfirmed in the source.

## Consequences

- The loud zsh errors stop; commands keep their zsh semantics.
- `**` keeps its zsh meaning.

Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:560; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:567; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:569 (measured).
