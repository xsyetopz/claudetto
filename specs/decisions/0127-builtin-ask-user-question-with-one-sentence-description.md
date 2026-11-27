---
status: accepted
date: recorded in openspec/specs/low-hitl/spec.md:294 (day of decision not recorded)
---

# Builtin Ask User Question with One Sentence Description

## Context and Problem Statement

The auto-mode classifier adds a popup answer to its transcript as `[User answered AskUserQuestion]: ...` only from the built-in tool and drops every other tool's result.

## Considered Options

* Wrapper: stock tool deferred via `tool.describe isDeferred` (5,196 sent bytes -> 332), a guard denying direct calls, and a `ToolSearch` `tool.call` rewrite for a query naming `AskUserQuestion` (source C)
* Use the built-in tool and cut its description to one sentence with `tool.describe` (source D)

## Decision Outcome

Chosen: the built-in tool with a one-sentence description (D supersedes C). `multiSelect` kept.

## Consequences

Good: the classifier sees the answer. Bad: no wrapper to deny or guide a direct call.

Source: openspec/specs/low-hitl/spec.md:294; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:392; openspec/specs/low-hitl/spec.md:292; openspec/specs/low-hitl/spec.md:201.
