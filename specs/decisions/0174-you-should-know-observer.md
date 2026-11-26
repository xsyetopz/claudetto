---
status: accepted
date: recorded in openspec/changes/2-1-325-rearchitecture/items.json:122 (day of decision not recorded)
---

# You-Should-Know Observer on Model Call Only

## Context and Problem Statement

The old you-should-know port started on `tool.call`, awaited the check, denied a noted call, and ordered the agent to wait. It blocked read-only `git status`; the note landed after work stopped and the retry was denied again.

## Considered Options

* Keep the blocking port.
* Observe before the main-loop call, skip read-only tools, and never deny a call (see the you-should-know requirement).

## Decision Outcome

Chosen: the observer without a block. The blocking port is gone.

### Consequences

A note can arrive one call late; it never stops a call.

### Confirmation

A test asserts no `tool.call` denial from the observer.

## More Information

Basis: read. Status: have at 088a227c (`plugins/claudetto-you-should-know/`).

Source: openspec/changes/2-1-325-rearchitecture/items.json:122.
