---
description: Write or update the spec for a behaviour change, then stop for review before any test or code.
argument-hint: <request>
disable-model-invocation: true
---

# Specify

Request: $ARGUMENTS

Formats: the `spec` skill's `references/FORMAT.md`. Glob `specs/*.md` first and read the specs the request touches.

## Clarify

- Read `ARCHITECTURE.md` or `DESIGN.md` at the repo root, if present. Never create a constitution file.
- Interactive session: ask each expensive unknown through AskUserQuestion.
- No one to answer (non-interactive `-p` run): write each unknown as an `Open:` line in the spec, also when you take a cheap default.

## Spec

- Edit the capability's existing `specs/<capability>.md`, or add one. Never create a proposal, plan or tasks file.
- Per requirement: `## <ID> <title>` (`[A-Z][A-Z0-9]*-\d+`, such as `CART-1`), one sentence of behaviour, at most 3 scenarios of `Given`/`When`/`Then`/`And` lines.

## Stop

- Write no tests and no implementation in this turn.
- Reply with the spec path, each new or changed requirement ID with its sentence, and each `Open:` line.
- End with: review or edit the spec, then run `/claudetto-spec:implement`.
