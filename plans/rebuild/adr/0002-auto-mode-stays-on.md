---
status: accepted
date: 2026-11-04
---

# Auto Mode Stays On

## Context and Problem Statement

Should claudetto turn auto mode off (`disableAutoMode`) or keep it (`defaultMode` "auto")?

## Considered Options

- `disableAutoMode` true.
- Auto mode on: `disableAutoMode` unset, `defaultMode` "auto". If it works badly, claudetto builds its own auto approval on manual mode (item C8).

## Decision Outcome

Chosen (2026-11-04): auto mode stays on. `dontAsk` cannot be removed by a setting and is accepted.

## Consequences

The auto-mode classifier cost applies (see section 3).

Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:774; user decision, 2026-11-04.
