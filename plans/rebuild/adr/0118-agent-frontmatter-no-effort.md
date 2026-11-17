---
status: superseded by ADR-0117
date: recorded in openspec/specs/subagent-prompts/spec.md:19 (day of decision not recorded)
---
# Agent Frontmatter Without Effort

## Context and Problem Statement

The subagent-prompts spec gives each agent the frontmatter `name`, `description`, `model` and `tools`, with no `effort` and no `omitClaudeMd`. The rebuild plan gives `model`, `effort`, `tools`, `maxTurns` and `autoCompactWindow`.

## Considered Options

* `name`, `description`, `model`, `tools` (old spec)
* `model`, `effort`, `tools`, `maxTurns`, `autoCompactWindow` (baseline agents)

## Decision Outcome

Chosen option: the baseline field set, because the old spec is superseded (see `delegation-agent-frontmatter`).

## Consequences

* Good, because an agent sets its effort and turn limit in one place.
* Bad, because every agent file carries more fields to check.

Source: openspec/specs/subagent-prompts/spec.md:19.
