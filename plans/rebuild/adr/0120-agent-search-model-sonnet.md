---
status: superseded by ADR-0117
date: recorded in openspec/specs/agent-conduct/spec.md:338 (day of decision not recorded)
---
# Search and Plan Agents Run Sonnet 5.5

## Context and Problem Statement

The agent-conduct spec sets `model: claude-sonnet-5-5` with tools Read, Grep and Glob on the search and plan agents; the work agent sets neither. Bodies are two plain paragraphs: search ends with one `path:line` plus excerpt per finding, plan returns steps, files, risks and a check command, work ends with did, checked, left. The rebuild plan names the search agent as haiku-5-5 (effort high, `autoCompactWindow` 100000) and only the plan and sweep agents as sonnet-5-5.

## Considered Options

* Sonnet 5.5 for search and plan (the old spec)
* Haiku 5.5 for search (the baseline agent files)

## Decision Outcome

Chosen option: the baseline agent files, because the old spec is superseded (see `delegation-agent-frontmatter`). The two-paragraph body and the report-end forms are kept as the shape of each body.

## Consequences

* Good, because one frontmatter decision covers every agent.
* Bad, because the old spec and the plan disagree on the search model until the spec is retired.

Source: openspec/specs/agent-conduct/spec.md:338.
