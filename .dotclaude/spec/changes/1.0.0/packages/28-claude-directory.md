---
id: P28
deps: []
owns: [".dotclaude/spec/changes/1.0.0/evidence/claude-directory.md"]
verify: each claim has a source, and each rules answer has one live session in just sandbox
agent: implementer
---

# P28 `.claude/` evidence

## Goal

Write the evidence of each file and folder of `.claude/` and `~/.claude/` in Claude Code 2.1.296.
For each one, the evidence gives what it does, when Claude Code reads it, its cost at the start of a session, and the settings, env vars, and flags that control it.
It also gives its source in the docs and the bundle.

## Context

- The entry: `.dotclaude/spec/changes/1.0.0/packages.md:147-152`.
- For rules, the evidence also answers these questions: can a plugin ship rules, do subagents and worktrees load them, does `claudeMdExcludes` apply to them, and how do they show in the `prompt.compose` input of the Mod API.
- The entry has no `Deps:` line.
  This package has no deps, and the agent reason is P01c (`.dotclaude/spec/changes/1.0.0/packages.md:151`).
- Reading the bundle for evidence is permitted.
  Do not patch the Claude Code binary or its npm package (`CLAUDE.md`).
- The rules of the wave: `.dotclaude/spec/changes/1.0.0/packages.md:7-15`.

## Steps

1. List each file and folder of `.claude/` and `~/.claude/` in Claude Code 2.1.296.
2. For each one, write the facts in the order of the Goal, with a source for each fact.
3. Answer the rules questions of the Context, and run one live session in `just sandbox` for each rules answer.
4. Write the result to `.dotclaude/spec/changes/1.0.0/evidence/claude-directory.md`, with no built-in text.

## Acceptance

- Each claim in the file has a source.
- Each rules answer has one live session in `just sandbox`.
- The file has no built-in text of Claude Code.

## Boundaries

- Change only the path of `owns`.
- Write the text in STE-flavored ASD-STE100, with one sentence on each line.
