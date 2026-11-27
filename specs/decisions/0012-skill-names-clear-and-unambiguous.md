---
status: accepted
date: 2026-11-05
---
# Rule K Covers Skill Names Only

## Context and Problem Statement

Rule K as adopted is "no skill named after a built-in command". Readings in the source at lines 1916 and 2123 extended it to agent and command names ("no clash with built-in names"). Which scope holds?

Should claudetto adopt the naming advice K (domain-action-target names) for its skills?

## Considered Options

- Broad reading: no name clashes with any built-in name.
- Skill names only; an intentional override of a built-in agent or command is allowed.
- Adopt the advice as a claudetto style rule.
- Leave the advice out; it has no setting, no token effect, and the binary has no routing code that reads names that way.

## Decision Outcome

Chosen: skill names only. The user said on 2026-11-05 (session 6aee1921, 11:52:22 UTC) that built-in agent overrides and command overrides are fine, and only skill names that could conflict without being meant as overrides are not. The broad readings are superseded. Narrowing further is the user's call.

Same decision, other record: adopted by the user as a claudetto style rule (clear, unambiguous names; no skill named after a built-in command). It is not a Claude Code requirement and has no Claude Code source; it is a style rule, and the revisit check is a clash between a skill name and a name from `cc-inspect surface kind=slash-command`. The built-in names come from `cc-inspect surface kind=slash-command`. It goes into C10.

## Consequences

A same-named agent or command file is allowed when intended; a skill name that clashes with a built-in is not.

Skill names follow the rule; the rule has no enforcement in Claude Code 2.1.318 (a folder named `compact` loads as a skill).

Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3195; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2480; user decision, 2026-11-05; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1691; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1710.
