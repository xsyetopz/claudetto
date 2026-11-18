---
status: superseded by ADR-0099
date: 2026-11-04
---

# Agent Override Files in the User Agents Folder

## Context and Problem Statement

How does claudetto replace the built-in agents Explore, Plan, and general-purpose? A same-named file in the user or project agents folder replaces a built-in; a plugin agent cannot, because its name gets the plugin prefix.

## Considered Options

- `claudetto:setup` writes `general-purpose.md`, `Explore.md`, and `Plan.md` into the user or project agents folder on a cheaper model, with no deny rule for general-purpose.
- Deny rules on the built-ins. A deny on general-purpose leaves the Agent tool sentence naming it.

## Decision Outcome

Chosen: the setup writes the three files on a cheaper model and writes no deny rule for general-purpose. Replaced by the Mod route.

## Consequences

The files stay after uninstall and clash with a user's own `Explore.md`.

Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2046; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1900; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1895; user decision, 2026-11-04.
