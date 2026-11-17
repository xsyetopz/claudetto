---
status: accepted
date: 2026-11-17
---

# Telemetry of You should know

## Context and Problem Statement

The plugin has no telemetry and its `plugin.json` description says "No telemetry". The builtin sends `you_should_know_proposed`, `you_should_know_answered` and `you_should_know_explained`, with props the plan lists in its Algorithm section. Sending them needs `telemetry.log` and `telemetry.mark` calls. The settled rule is that the plugin fully recreates the builtin.

## Considered Options

* Add the three events.
* Send none and keep the "No telemetry" description.

## Decision Outcome

Chosen: send none, by user decision on 2026-11-17 (asked through AskUserQuestion in session `0342617c`). The "No telemetry" description stays true. The three event requirements (`you_should_know_proposed`, `you_should_know_answered`, `you_should_know_explained`) are Out in `prd/README.md`; the requirements that named `left_open`, `off_abandoned`, `ignored_submit`, `turn_off`, `off_failed`, `respond`, `auto_sent` or `ignored_timeout` keep their behaviour without the log call; the telemetry steps of the runtime view are reference only. The answer codes stay where they drive behaviour, such as remembering a line.

## Consequences

Good: no data leaves, and the plugin needs no `telemetry.log` or `telemetry.mark` call, which the 2.1.326 host serves to the `builtin` and `core` tiers only (openspec/specs/builtin-rebuild/spec.md:77). Bad: the plugin differs from the builtin in what it reports.

Source: plugins/claudetto-you-should-know/.claude-plugin/plugin.json:4@088a227c; chunk-na8s6d5h.js@22380 (claude 2.1.326 binary, found by searching `you_should_know_proposed`; the 2.1.325 range @73182-92000 names a module absent from 2.1.325).
