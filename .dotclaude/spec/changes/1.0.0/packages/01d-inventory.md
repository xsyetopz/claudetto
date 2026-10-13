---
schema: dotclaude-spec/2
kind: package
id: P01d
title: Inventory
wave: 1
deps: []
owns: [".dotclaude/spec/changes/1.0.0/evidence/inventory.md"]
satisfies: []
verify: dotclaude-start --compare on one start with the switches and one start without them
agent: implementer
status: done
---

## Goal

List each built-in part of Claude Code 2.1.296 that a setting, an env var, or a mod can turn off or make smaller, with its cost at the start of a session.
The `trim` slice (P21) turns off each part of this list that dotclaude does not need, so each switch must be exact and each cost must be measured.

## Context

- Your worktree has no git-ignored file, such as `external/` and `node_modules/`.
  Run `bun install` in the worktree before the first `just` command.
- The goal of the lowest token cost: `.dotclaude/spec/changes/1.0.0/change.md:10-17`.
- The settings keys of the pinned binary: `schemas/claude-code-settings.json` and `schemas/claude-code-managed-settings.json`.
- The strings of the binary: `/Users/krystian/CodeProjects/xsyetopz/dotclaude/external/cc-2.1.296/strings.txt` (59 MB).
  Search it with `grep -n`, for example for `CLAUDE_CODE_` and `DISABLE_`, and read a range, because a full read fills your context.
- The mod API types: `/Users/krystian/CodeProjects/xsyetopz/dotclaude/.claude-plugin/types/claude-code/index.d.ts`.
  Search it with `grep -n` for the events that can drop a part, such as `prompt.section`, `prompt.attachment`, `agent.offer`, and `tool.describe`.
- The settings snippet of 0.28.0, which turns off some parts already: `src/shared/snippet.json`.
- The start-cost CLI: `bun plugins/dotclaude-sessions/bin/dotclaude-start --help`.
  `--compare BASE.jsonl OTHER.jsonl` prints the difference of two starts by source.
- The sandbox: `wiki/plugins/Sandbox.md`.
  `just sandbox -p "prompt"` runs one headless turn in a config apart from the config of the user.

## Steps

1. Find each built-in part that a switch can turn off or make smaller: tools, system prompt sections, reminders, attachments, listings, the auto memory, the git status, the telemetry calls, and the other parts that the binary names.
2. For each part, record the switch (a settings key, an env var, or a mod event and the field it changes), its default, and the source: a key in `schemas/`, a line in `strings.txt`, or a line in the types.
3. Run one headless start in `just sandbox` with no switch, and one with each switch of step 2 that is a setting or an env var.
   Run `dotclaude-start --compare` on the two transcripts.
4. Write `.dotclaude/spec/changes/1.0.0/evidence/inventory.md` in STE-flavored ASD-STE100, with semantic line breaks and no semicolons:
   a table with the part, the switch, the default, the cost at the start in tokens from the compare, and the source.
   Mark each cost that the compare did not measure as an estimate, with its method.
   Give the command and the totals of the compare.

## Acceptance

- The report has the output of `dotclaude-start --compare` for the two starts.
- Each switch in the report names its source.
- `bunx markdownlint-cli2 .dotclaude/spec/changes/1.0.0/evidence/inventory.md` passes.

## Boundaries

- Write only `.dotclaude/spec/changes/1.0.0/evidence/inventory.md`, and the sandbox config that `just sandbox` makes.
  Remove the sandbox with `just sandbox-clean` at the end.
- Do not decide which parts dotclaude turns off, because P21 does that.
- Do not change the settings of the user or `~/.claude/`.
- Run at most 4 headless sessions, because each one costs money.
- Commit the work in one commit on the branch of your worktree, with the subject `dotclaude 1.0.0: P01d <summary>`.
  The main session merges it.
