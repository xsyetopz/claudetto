---
status: accepted
date: 2026-11-10
---
# Deny with the Exact Form, Do Not Rewrite Tool Input

## Context and Problem Statement

In 2.1.319 a changed tool input voids auto mode's server review of every call in the response (`serverClassifierInputRewritten`) and each comes back "gave no verdict". One plan mapped built-in agents by rewrite; another denied with the exact form.

## Considered Options

- Rewrite the input (built-in agent mapping).
- Deny with a reason naming the exact form.

## Decision Outcome

Chosen: deny with a reason naming the exact form. A call needing no change reaches `next(e)` as `e` itself; no hook rewrites a `ToolSearch` query or result; each `tool.check` and `tool.call` return that sets `input` is checked. D323 later drops the whole Agent deny.

## Consequences

- `serverClassifierInputRewritten` is present on 2.1.327 (verified on 2.1.327: chunk-270tbjq0.js@41884 returns `server_input_rewritten`, @44187 sets the flag; also chunk-m14bt1pz.js@3583438); a rewritten input skips the server verdict; the string is absent from plugins/ at 088a227c.
- `plugins/claudetto/hooks/input-unchanged.test.ts` covers part of it.

Source: openspec/specs/low-hitl/spec.md:249; openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/low-hitl/spec.md:46. Basis: measured.
