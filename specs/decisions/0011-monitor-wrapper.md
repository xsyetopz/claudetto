---
status: superseded by ADR-0031
date: 2026-11-05
---

# Monitor Wrapper Over the Stock Tool

## Context and Problem Statement

The replacement Monitor loses the stock frame, the ws source, and the stock rate stop. Can a claudetto tool front the stock Monitor instead?

## Considered Options

- Replacement tool with polling (mon14-mon20): per event 380 chars, three losses.
- Wrapper: a claudetto `monitor` tool that calls stock Monitor through `$.tool.call`, stock kept deferred and guarded by a `tool.call` guard, with a ToolSearch `tool.call` rewrite that maps "monitor" to `mcp__claudetto__monitor`.

## Decision Outcome

Chosen: the wrapper (mon21-mon31). It keeps stock delivery in a running turn and idle, the stock frame, ws source frames, and the stock rate stop. Loaded bytes 866 against 7,586 stock. `permissions.deny` "Monitor" must not be written, because it would remove the tool the wrapper calls. Task 5.17 is rewritten to this route; the first resume check found the rewrite had not landed in `tasks.md:79` and `builtins-inventory.md:90`, which still held the polling route and the deny rule, and it was fixed after the check.

## Consequences

Per event 620 chars. A nested `$.tool.call` of Monitor is skipped by the classifier, so there is no added classifier cost.

Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3271; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3299; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3326; user decision, 2026-11-05.
