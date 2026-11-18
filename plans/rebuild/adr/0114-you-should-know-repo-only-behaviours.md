---
status: accepted
date: 2026-11-17
---

# The repo-only Behaviours of You Should Know

## Context and Problem Statement

The plugin has two behaviours the builtin has not: `closeAnswered` closes an offer after an `AskUserQuestion` answer, and a tool-call log feeds the digest. The user asked whether they are needed. The settled rule is that claudetto-you-should-know fully recreates the builtin; the digest goes with `model.fork` (see `prd/README.md` Out).

## Considered Options

* Drop both, matching the builtin.
* Keep `closeAnswered`, drop the log.
* Keep both.

## Decision Outcome

Chosen: drop both, by the check the user asked for on 2026-11-17. Neither is needed: the 2.1.327 builtin manifest hooks only `prompt.submit, command.run, turn.step, ui.render, session.detach, session.end`, with no `tool.call` (chunk-nvx1z6pc.js@6006), and its module has no `AskUserQuestion` reference (search: 0 hits). The log only fed the digest, and the check calls `model.fork` on the live conversation with no digest (`prd/you-should-know.md`, the requirement that calls `model.fork` on the live conversation). `closeAnswered` closed an offer whose call was held by a deny, and the rebuild never denies or holds a call (`prd/you-should-know.md`, the requirement to run on `turn.step` never denying, holding or rewriting a call).

## Consequences

Good: one behaviour, equal to the builtin. Bad: an offer for a question the user just answered stays open until Dismiss or typed past.

Source: chunk-nvx1z6pc.js@6006 (claude 2.1.327 binary, read through cc-inspect on 2026-11-17); plugins/claudetto-you-should-know/hooks/press.ts:84-98@088a227c; plugins/claudetto-you-should-know/hooks/register.ts:267-283@088a227c; plugins/claudetto-you-should-know/hooks/register.ts:267-292@088a227c.
