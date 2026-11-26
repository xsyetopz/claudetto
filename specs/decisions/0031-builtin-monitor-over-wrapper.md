---
status: accepted
date: 2026-11-12
---
# Use the Built-In Monitor Under a Trimmed Text

## Context and Problem Statement

claudetto rebuilt `Monitor` as `mcp__claudetto__monitor` and hid the built-in tool. Does it keep that wrapper and the plugin `Monitor` deferral?

## Considered Options

- Keep the wrapper `mcp__claudetto__monitor`.
- Call the built-in `Monitor` under a `tool.describe` text of 200 chars or fewer, and delete the wrapper.

## Decision Outcome

Chosen: the built-in `Monitor`, trimmed to 200 chars or fewer. The wrapper, its tests, the denial of the built-in call, the in-flight counter, and the `ToolSearch` result rewrite go. The wrapper added no effect. Cost: about 500 chars, once per context window that watches something (trimmed built-in about 1,300 against the rebuild's 825; stock definition 7,588).

## Consequences

- The plugin registers no monitor tool and has no `tool.call` hook on `ToolSearch`.

Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:400-406; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:525 (user decision, 2026-11-12); openspec/changes/archive/2026-11-13-feat-2-1-321/tasks.md:137.
