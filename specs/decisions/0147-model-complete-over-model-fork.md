---
status: accepted
date: recorded in plugins/claudetto/hooks/features/compaction/handoff.ts:48@088a227c (day of decision not recorded)
---

# $.model.complete Over $.model.fork

## Context and Problem Statement

A rebuild that calls a model needs a way to name the model.

## Considered Options

* `$.model.complete`, which names a full model ID.
* `$.model.fork`, whose `ModelForkRequest` is `{prompt}` with no model field (the engine rebuilds the main thread's last request, so the fork runs on the session model).

## Decision Outcome

Chosen: `$.model.complete`. The prompt is a digest with the fixed part in a cache block, one call per check, and "more on an offer" reuses the stored explanation. With no price source, the code states the three bounds (cached fixed block, digest size, maxTokens) and writes no money figure.

### Consequences

`plugins/claudetto/hooks/features/compaction/handoff.ts:48` still uses `model.fork`.

### Confirmation

A test asserts no `$.model.fork` call outside compaction handoff.

## More Information

Basis: read. Status: partial at 088a227c (`plugins/claudetto/hooks/features/compaction/handoff.ts:48` mentions `model.fork`).

Source: plugins/claudetto/hooks/features/compaction/handoff.ts:48@088a227c.
