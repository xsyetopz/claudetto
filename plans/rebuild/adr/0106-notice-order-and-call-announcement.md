---
status: accepted
date: 2026-11-17
---
# Notice Order and Call Announcement

## Context and Problem Statement

Two conflicts in the user dossier. notices (Breach, Block, Rejection, changed value, narrowed scope, substituted model, unverified claim) lead the next message, one line each, but the Concise rule says open with the outcome and no claudetto text asks for the TYPE line. one line before the first tool call, against "text between calls holds a finding".

## Considered Options

* Notices first, then the outcome
* Outcome first, notices after
* One line before the first call, none between calls

## Decision Outcome

Chosen, call line: no line before the first tool call; text between calls holds only a finding, result, or error (user decision, AskUserQuestion 2026-11-17).

Chosen, notice order: settled by trial, not by argument (user decision, AskUserQuestion 2026-11-17). Trial: the same set of saved prompts that each trigger one notice (Breach, Block, Rejection, changed value, narrowed scope, substituted model, unverified claim) runs under both reply forms, outcome-first and notices-first; the form whose notices the user reads and acts on in more runs wins, and the loser's rule text is removed from the reply block.

## Consequences

* Good, because the call-line clash is gone and the notice order rests on a measured result.
* Bad, because the reply block keeps both notice rules until the trial ends.

Source: openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:292; openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:294.
