---
status: accepted
date: 2026-11-17
---
# Rebuilt Feature Default Off

## Context and Problem Statement

A rebuilt feature costs tokens per session. When does it turn on?

## Considered Options

* Off by default; on for a tier only where its window-budget rows show its cost per session; with no rows every tier row leaves it off and the user enables it by hand
* On by default

## Decision Outcome

Chosen option: off by default until its cost is measured (user decision, AskUserQuestion 2026-11-17). Each rebuilt feature gets window-budget rows of its cost per session first; a tier turns it on only where those rows show the cost; with no rows every tier leaves it off and the user enables it by hand.

## Consequences

* Good, because no tier pays a cost that has no window-budget row.
* Bad, because a user has to enable a feature by hand until rows exist.

Source: openspec/specs/builtin-rebuild/spec.md:127.
