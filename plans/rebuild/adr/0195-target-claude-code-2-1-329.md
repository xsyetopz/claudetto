---
status: accepted
date: 2026-11-21
---

# Target Claude Code 2.1.329

## Context and Problem Statement

ADR-0176 targeted 2.1.327. On 2026-11-21 the user asked for claudetto to be adjusted for 2.1.329, with the interactive `claude` first and `claude -p` second; clawdipedia-docs and cc-inspect track that version, and 2.1.330 is installed. Which version does the plan verify against?

## Considered Options

- Stay on 2.1.327.
- Move to 2.1.329.

## Decision Outcome

Chosen: 2.1.329 as the floor (`engines.claude-code: ">=2.1.329"` in each plugin manifest, commit 30edb0e9f); probes run on the installed 2.1.330 and say so.

The 2.1.328 and 2.1.329 release notes (cc-inspect `release notes 2.1.327..2.1.329`, 142 lines: 86 matched to code, 44 unmatched, 12 gated) touch these claudetto seams:

- Compaction: a freeze of several minutes after compacting a very long conversation is fixed, which further weakens the cost case for a custom handover ([ADR-0178](0178-renewal-at-task-boundaries.md)); RISK-507's fork cache shape was rechecked on 2.1.328 and 2.1.329 (commit e65f12518).
- Headless: environment variables written by a SessionStart hook now survive `claude -p --continue`, and `claude -p` exits 1 with an error on a full disk instead of 0.
- Skills: a skill with a `model` setting, other than a `context: fork` skill, leaves subagents, forks and compaction on the session's model. `claudetto-spec` sets no `model`, so it is unaffected.
- Hooks: prompt hooks accept model aliases such as `haiku` in `model`.
- Rules: a long pause in Code Mode with path-scoped rules is fixed; claudetto ships no rule files ([CC-085](../arc42/08_concepts/instruction-files.md)).

## Consequences

- ADR-0176 is superseded. A fact measured on 2.1.327 stays valid until a 2.1.329 or later probe or code read confirms it, following literal anchors because minified names differ between versions.
- The `claudetto-spec` evals (ADR-0193) ran on 2.1.330: suite 3 and suite 4 score 1.0 with the plugin, in both the interactive tmux probe and `claude -p` eval runs (REQ-SPEC-005, REQ-SPEC-008).

Source: the user's goal message, 2026-11-21 (session 058ea2d3-793b-495e-912a-323a9453747d); cc-inspect `release notes` 2.1.327 to 2.1.329, read 2026-11-21.
