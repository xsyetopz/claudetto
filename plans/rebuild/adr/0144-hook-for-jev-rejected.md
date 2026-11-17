---
status: accepted
date: recorded in openspec/changes/archive/2026-11-09-release-2-1-319/design.md:154 (day of decision not recorded)
---

# Jev Check Stays out of a Hook

## Context and Problem Statement

Should a hook, as `Brainwires/jevwire` 0.6.6 does, ask Jev about each gated call?

## Considered Options

- A hook on `PreToolUse`, `PostToolUse`, and `Stop` with a 1,500 ms Jev deadline inside a 5 s hook timeout, as jevwire does (read at `7089374`). It fails open in silence and never answers `allow`, because Jev is not hardened against injection.
- Keep the check out of a hook.

## Decision Outcome

Chosen: Rejected: the hook option. A claudetto hook would add 152-262 ms warm to every gated call, and a first call measured 0.2-1.8 s (live calls, 2026-11-04). Two calls do not show whether the cold cost recurs once per session, per connection, or after idle time. A 1.8 s call misses a 1,500 ms deadline, so a hook in jevwire's shape fails open on it.

## Consequences

Basis: reported, measured. No hook latency is added to gated calls.

Source: openspec/changes/archive/2026-11-09-release-2-1-319/design.md:154.
