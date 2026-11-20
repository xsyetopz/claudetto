---
status: accepted
date: no source line located (day of decision not recorded)
---

# Effort Defaults and Model Routing

## Context and Problem Statement

Which effort each agent runs, and who picks model and effort per task.

## Considered Options

* Default medium and escalate per task, not per session.
* Route per session or tier by how checkable the output is, not by task difficulty; a blind judge from another vendor decides ticket A/B; the orchestrator picks model and effort from the user budget; a model-advisor agent (`tools: Read, Grep, Glob`, `model: sonnet`, `effort: medium`) reads a prompt file and recommends.
* Haiku 5.5 workflows (the orchestrator rewrites the prompt into explicit subagent instructions with a max agent budget, Haiku high, unit and e2e, then a reviewer sends failures back) against the counter that Haiku total cost is equal or higher with more bugs than Opus 5.5 (reported twice), "40x cheaper only under 100k context, about 4x above", and Haiku told not to modify tests cannot recover.

## Decision Outcome

Chosen: default medium, escalate per task. Opus 5.5 medium with about 7 agents used 24% of a 20x weekly quota in 34 h (reported); medium with subagents disabled beat xhigh with 3 subagents (one xhigh session used 96% weekly); an under-specified task escalates; a parallel test (xhigh, high, medium on cloned worktrees) picks the level; Haiku effort goes high to medium (n=3); Athena runs `claude-fable-5-2` at high only if a paid check confirms (Fable 2/2 against Opus 0/2). Sonnet gets an explicit scope fence ("only modify X"); Opus runs medium early in the week and high later. The routing options stay open for a measured run.

### Consequences

Athena on Fable conflicts with the user decision that Fable is never a subagent model, so that option is rejected.

### Confirmation

A test asserts the effort field of each agent file.

## More Information

Basis: reported. Status: partial at 088a227c (`plugins/claudetto/agents/*.md` effort fields; `plugins/claudetto/hooks/features/agent-model/model.ts`).

Source: openspec/changes/archive/2026-11-16-2-1-323/design.md:87-94@088a227c9^ (effort per agent); openspec/changes/2-1-325-rearchitecture/design.md:358@088a227c9^ (medium effort by default, escalate per task).
