---
status: accepted
date: recorded in openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:382 (day of decision not recorded)
---

# Cleanup Tool Mole

## Context and Problem Statement

The user's Data volume stood at 82% (352 of 460 GiB) on 2026-11-07. `~/CodeProjects` held 186G and `/private/tmp` 27G (266 `probe-*` folders). claudetto needs a disk cleanup tool and should not ship a copy of its own.

## Considered Options

- `tw93/Mole`: 74,154 stars, pushed that day, `brew install mole`, already at `/opt/homebrew/bin/mo` 1.68.0; `mo clean` for caches and logs, `mo purge` for project build artifacts.
- npkill: 9,499 stars, Node only, no formula.
- kondo: 2,579 stars.

## Decision Outcome

Chosen option: Mole, picked by adoption (GitHub star counts, 2026-11-07), because it does both jobs. npkill and kondo are not added.

## Consequences

- `mo purge` default paths miss `~/CodeProjects`, so `~/.config/mole/purge_paths` must name the user's project roots.

Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:382.
