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

The `ZDOTDIR` route is not chosen. On 2.1.327 the shell snapshot pre-check scans the home rc files (`.zshenv`, `.zprofile`, `.zshrc`, `.zlogin`, and the bash files) and takes the slow path when `ZDOTDIR` is set (chunk-m14bt1pz.js@3701357-3701639); the alias installer writes `${ZDOTDIR||home}/.zshrc` (chunk-y8q079sf.js@5042); the sandboxed helper sets its own `ZDOTDIR` (chunk-bpr7n093.js@52155); and `ZDOTDIR` is on the dangerous-env lists. So Claude Code honours `ZDOTDIR` in some paths and reads `$HOME` rc files in others, and moving the option line there gains nothing over `CLAUDE_ENV_FILE`. Basis: read from code (2.1.327).

## Consequences

- The loud zsh errors stop; commands keep their zsh semantics.
- `**` keeps its zsh meaning.

Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:560; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:567; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:569 (measured).
