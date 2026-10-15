---
schema: dotclaude-spec/2
kind: package
id: P161
title: Worktree base of the implement agents
wave: 6
deps: ["P62","P120","P147"]
owns: ["the worktree key of src/plugins/dotclaude/slices/prompt/slice.ts","tests/dotclaude/prompt/worktree-base.test.ts","wiki/reference/Settings-Snippet-Keys.md","the base lines of src/plugins/dotclaude/slices/spec/skills/implement/SKILL.md"]
satisfies: ["REQ-28"]
verify: just test tests/dotclaude/prompt/worktree-base.test.ts && bun run lint:md
agent: implementer
status: planned
---

## Goal

Each worktree of an agent that `/dotclaude:implement` starts has the `HEAD` of the main checkout as its base.
When the base cannot be `HEAD`, the skill stops before the wave and tells the user.

## Context

- OpenJoystickDriver session `9b38a538-1eff-40af-a324-96d0c7a04511.jsonl`:
  line 120 commits `762a41ee` on `feat/0.6.0-alpha.1`, and lines 145 to 148 start 4 agents with `isolation: worktree`.
  Lines 181 and 182 show each worktree on `d4319931`, which is `origin/main` (`refs/remotes/origin/HEAD`), and not on `762a41ee`.
- `implement/SKILL.md:47` says "The worktree is made from `HEAD`", which is false with the default setting.
- The setting `worktree.baseRef` selects the base: `fresh` (the default) branches from `origin/<default-branch>`, and `head` branches from the local `HEAD`.
  The schema says it applies to `--worktree`, `EnterWorktree`, and agent isolation (`schemas/claude-code-settings.json:336-339`).
- Binary 2.1.296: the `Agent` tool calls the agent worktree function with no `fromHead` (offset 203244255).
  The create function reads `fromHead ?? (no PR && worktree.baseRef === "head")` (offset 196982111).
  A `WorktreeCreate` hook replaces the git worktree (offset 196997040), and dotclaude registers no `WorktreeCreate` hook.
- A plugin can set only `agent` and `subagentStatusLine` (`wiki/claude-code/Settings-Resolution.md:126`), so only the settings snippet of `prompt/slice.ts` can set `worktree.baseRef`.
- `.claude/rules/extension-points.md`: use the setting, and write no runtime code for it.
- dotclaude session `ef21d7f2` of 2026-10-14, on Claude Code 2.1.299: the worktrees of P72, P75, P160, and one more implementer run started on `44e74425`, the commit of the `--v1.0.0` tags, and not on the local `HEAD` `76dc06d7` (8 commits later).
  `dotclaude-spec verify P72` passed on that old base.
  The prompts told each agent to run `git merge --ff-only 76dc06d7` first.

## Steps

1. Add `worktree: { baseRef: "head" }` to the settings of `prompt/slice.ts`, and pin the value in `worktree-base.test.ts`.
2. Add the row of `worktree.baseRef` to `wiki/reference/Settings-Snippet-Keys.md`, with its default and the reason.
3. Replace `implement/SKILL.md:47` with the true rule: the base comes from `worktree.baseRef`, which the settings snippet sets to `head`.

Decision (Jev, 2026-10-14, confidence 0.80): the fix is the snippet key only.
The other options were a check in the skill only (0.01), and the snippet key with a check in the skill (0.12).

## Acceptance

- The verify command passes.
- `just generate` writes the new snippet key to the generated snippet.

## Boundaries

- Do not add a `WorktreeCreate` hook.
- Do not change the front matter of the skill (P147 owns it).
- No test asserts the words of the skill (REQ-17).
