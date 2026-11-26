---
status: accepted
date: 2026-11-16
---
# One System Prompt per Model

## Context and Problem Statement

One `ROOT_PROMPT` of 5,779 chars went to every model. Anthropic's per-model pages advise against several of its lines.

Transcript record tx-x01b/opus-body-omits-finish-scope: Should the Opus prompt body carry the FINISH and SCOPE lines?

## Considered Options

- Keep one root prompt.
- A `prompt.compose` mod swaps the shared `lean_body` section per model: `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`; any other model gets the default body unchanged.
- Add them (the planner's top pick).
- Leave them out, as the Opus guide says to remove explicit verification instructions.

## Decision Outcome

Chosen: the per-model swap. The shared core is under about 3,500 chars. Opus: no double-check or verification lines, delegation as when and why. Sonnet: shared core, a finish paragraph and a scope-stop paragraph. Haiku: shortest core (about 2,500) plus a delta under 700, no delegation lines. Bounds: Opus delta under 500, Sonnet under 900. The `session` sections (memory, `env_info_simple`, `context_management`) stay; no `session` section comes before a `shared` one, or Claude Code skips the hook.

## Consequences

- Good: probe 1 showed a swap with no default text left over.
- Bad: `prompt.compose` does not reach a built-in subagent, so subagent prompts live in agent files.

Transcript record tx-x01b/opus-body-omits-finish-scope decided: Left out; the docs were corrected to say the git-status restore line reaches Sonnet and Haiku, not Opus. This is the agent's decision citing the guide. Good: matches the guide. Bad: Opus runs lack the finish line.

Source: openspec/changes/archive/2026-11-16-2-1-323/design.md:69; openspec/changes/archive/2026-11-16-2-1-323/design.md:24; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:1092 (state and Decisions); observed in transcript, 2026-11-16.
