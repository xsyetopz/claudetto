---
status: accepted
date: 2026-11-17
---

# The userConfig switch replaces the builtin gate

## Context and Problem Statement

Claude Code 2.1.326 makes the builtin available only when `tengu_jolly_dewdrop` is on and no hipaa, zdr or ldr taint is set: `Pn=()=>(nEe()||!1)&&!Eo("hipaa")&&!Eo("zdr")&&!Eo("ldr")&&b(Wo(),Rn)` with `Rn=!1`, used as `isAvailable` (chunk-na8s6d5h.js@89696). The taints come from server org policy (`deniedUnder` lists, chunk-sh5w59dr.js@28843) with no documented plugin access; the gate value lives only in the undocumented `cachedGrowthBookFeatures` of `~/.claude.json`. The plugin has only the userConfig switch `sideCheckEnabled`, tested at the top of `register`. The plan asks whether the switch replaces the gate. The settled rule is that claudetto-you-should-know fully recreates the builtin. The user asked which option works without the builtin coming back.

## Considered Options

* The userConfig switch replaces the gate.
* The plugin reads the feature gate and the taint at run time.
* The userConfig switch and the gate together.

## Decision Outcome

Chosen: the userConfig switch replaces the gate, by the investigation the user asked for on 2026-11-17. The switch works whether the gate is on or off. Reading the gate would leave the plugin off wherever the server gate is off, and would depend on an undocumented cache; the taints have no plugin read path. Whether the builtin stays off is set by the separate `@builtin` disable, not by either option.

Acceptance probe: with `/plugin disable you-should-know@builtin` run and `sideCheckEnabled` on, the builtin does not reappear and only claudetto-you-should-know shows notes.

## Consequences

Good: the plugin runs wherever the user turns it on. Bad: a user under a taint can turn it on although the builtin would be absent.

Source: chunk-na8s6d5h.js@89696 and chunk-sh5w59dr.js@28843 (claude 2.1.326 binary, read through cc-inspect on 2026-11-17); plugins/claudetto-you-should-know/hooks/register.ts:252@088a227c; plugins/claudetto-you-should-know/.claude-plugin/plugin.json:11-20@088a227c; chunk-na8s6d5h.js@15618 (claude 2.1.326 binary, found by searching `tengu_jolly_dewdrop`; chunk-jc1ynf6x.js@92500 and @92000-94036 of 2.1.325 name a module that 2.1.326 renamed, and relocate found no hit).
