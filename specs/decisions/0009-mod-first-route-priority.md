---
status: accepted
date: 2026-11-05
---

# Mod First, Then Classic Hook, Skill, Settings

## Context and Problem Statement

claudetto can cut or replace a built-in through a Mod, a classic hook, a skill, or a `settings.json` key. Which route is canonical?

## Considered Options

- Priority order Mod, classic hook, skill, `settings.json` (route A, "the Mod way").
- Trim only the stock text and keep the built-in.

## Decision Outcome

Chosen (2026-11-05): route A with the priority Mod, classic hook, skill, `settings.json`. A route is canonical when it works with no compromise and costs fewer tokens or chars than stock. A built-in that a Mod or hook can fully recreate is rebuilt cheaper, not only trimmed. The agents Explore, Plan, and general-purpose map to Artemis, Metis, and Heracles. `keybindings-map` is dropped. Release 0.4.0 is Mods plus classic hooks where they fit, skills or small MCP tools elsewhere (user, 2026-11-04).

## Consequences

Each built-in cut needs a Mod, a hook, a skill, or a settings key, and a cost comparison with stock. The Monitor choice shows the rule can conflict with an earlier user answer.

Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2586; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2046; user decision, 2026-11-05.
