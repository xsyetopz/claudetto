---
schema: dotclaude-spec/2
kind: package
id: P163
title: No delegation of an asked or denied command
wave: 6
deps: ["P64","P148","P159"]
owns: ["the delegation lines of src/plugins/dotclaude/slices/prompt/texts.ts/doing-tasks.md","the recovery lines of src/plugins/dotclaude/slices/spec/skills/implement/SKILL.md",".dotclaude/spec/changes/1.1.0/evidence/delegated-asks.md"]
satisfies: ["REQ-9","REQ-28"]
verify: just generate && bun run lint:md && test -s .dotclaude/spec/changes/1.1.0/evidence/delegated-asks.md
agent: implementer
status: planned
---

## Goal

The main session does not send a subagent a command that the main session cannot run without an ask, or that a guard denied.
The `implement` skill names a safe way to recover from a worktree with a wrong base.

## Context

- OpenJoystickDriver session `9b38a538-1eff-40af-a324-96d0c7a04511.jsonl`:
  lines 204 to 206 send 3 agents the message to run `git reset --hard 762a41ee`, and line 232 says that the hook blocks it in the agents.
- P148 covers the agent side: a subagent cannot run `git reset --hard`, and each agent that writes code runs in a worktree.
- The part that P148 does not cover: the main session sends the command, which is an ask in the main session (`prompt/slice.ts:169-173`), to a subagent that sees no user.
  The agents stop, and the runs are lost.
- The skill has no step for a worktree with a wrong base (P161 prevents the cause).
- REQ-17: a hook MUST NOT act on a text pattern of the prose of Claude, so no hook reads the text of `SendMessage`.

## Steps

1. Read lines 195 to 245 of the session, and write in the evidence file whether a deny or an ask came before line 204, and each later deny.
2. Add a rule to `doing-tasks.md`: an ask or a deny applies to the action, so do not give the action to a subagent.
   Give the reason, and say what to do: tell the user, or run the action in the main session where the user sees the ask.
3. Add a step to the `implement` skill for a worktree with a wrong base: stop the agent, and start a new agent after the base is right.
   The step does not move or reset the branch of an agent.
4. Add a `just eval` case that a model judges: a main session with a denied command and a running agent.
   It passes a known-good reply and fails a known-bad reply before its first run (REQ-17).
   Write the results in the evidence file.

## Acceptance

- The verify command passes.
- The eval case of step 4 fails on 1.0.0 and passes after the change.

## Boundaries

- Do not change the asks or the denies (P148, P143).
- No hook reads the text of a message to an agent (REQ-17).
