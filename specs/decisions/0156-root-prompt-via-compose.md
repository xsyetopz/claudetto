---
status: accepted
date: recorded in plugins/claudetto/agents/Heracles.md@088a227c (day of decision not recorded)
---

# Root Prompt Only Through prompt.compose

## Context and Problem Statement

Where the root prompt lives.

## Considered Options

* A `prompt.compose` hook, which runs for the main loop only (2.1.317).
* An agent type whose body is the root prompt (`claudetto:main`; superseded, see [ADR-0155](0155-root-prompt-agent-type.md)).

## Decision Outcome

Chosen: `prompt.compose`; the agent listing holds no `claudetto:main`. The 2-1-323 design removed the requirement "No Subagent Type Runs the Root Prompt" and `ROOT_PROMPT`.

### Consequences

A subagent never sees the root prompt; its body is its whole prompt.

### Confirmation

A test asserts `plugins/claudetto/agents/` holds only Artemis, Athena, Heracles, Metis.

## More Information

Basis: measured. Status: have at 088a227c.

Source: plugins/claudetto/agents/Heracles.md@088a227c.
