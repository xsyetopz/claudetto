# Release 0.15

This page records the notes of the `0.15` release.
It shows how the context note changed for compactions and handoffs.

Released 2026-09-30.
The context note waits for compactions and asks for the handoff before the current step ends.
The 0.14 note asked at the first crossing of 100k tokens, so every long session stopped there.
A version in parentheses marks a later patch of this line.
An entry with no version comes from 0.15.0.

## Changed

- Context note, compaction wait: it waits for four compactions of the main conversation.
  - Before, it asked for a handoff at the first crossing of 100k tokens.
  - A compaction and a handoff both start the next part from about 20k tokens.
    So they cost about the same for each turn.
  - In the local transcripts, compactions 1 to 4 kept 49% to 57% of the facts that Claude used next.
  - Compactions 5 to 8 kept 42%.
  - The note gives the compaction count.
    The constant `COMPACTIONS_BEFORE_HANDOFF` in `hooks/lib/_budget.mjs` sets the count.
- Context note, timing (0.15.1): it asks for the handoff before the current step ends, not after it.
  - The note comes at 100k tokens.
    Compaction comes at about 117k.
    One step can use more than the 17k between them.
  - In one 0.15.0 session, a fifth compaction came right after the handoff.
  - The note now gives the compaction point and says that it does not stop the work.
  - In two 0.15.0 sessions, Claude put off new requests from the user after the note.
  - In two other sessions, it said that the context limit was reached.
  - The prompting best practices of Claude also tell Claude not to stop tasks early because of the token budget.
- Context note, repeats (0.15.1): only the first note after a crossing of 100k tokens asks for the handoff.
  - A later prompt before the next compaction gets a short note with the size.
    Claude updates the handoff only when the state changed.
  - Before, each prompt asked for the handoff again.
    In one 0.15.0 session, Claude updated the handoff instead of starting a new request.
- Status line: measures the main context against 117k, not 150k.
  - Claude Code compacts at 117k with the 150k `autoCompactWindow`.
    The context never reached 150k.
  - `⇊2/4` gives the compactions so far.
    `handoff` shows when the context note asks for one.
  - To count compactions, each refresh reads only the transcript lines added since the last refresh.
- Session note and system prompt: no longer tell Claude to hand off near 150k tokens.
  With `autoCompactWindow` at 150k, Claude Code compacts at about 117k.
  So that point never came.
  Claude started handoffs on its own estimate.
  Claude now waits for the context note.
- `scripts/compaction-report.mjs`: measures the cost and the kept facts of each compaction from the local transcripts.
- `write-session-handoff` skill (0.15.1): records which decision replaced an earlier one.
  It records each request from the user that is not started.
- Hook docs and README: name `claude plugin configure dotclaude@dotclaude` (Claude Code 2.1.285) to list the plugin options.
- Design dossier: notes that Claude Code 2.1.285 removed the second reply after a background report, and why forks stay off.

## Fixed

- Stop message (0.15.1): a check command longer than 200 characters ends with `…`.
  Before, the message cut it with no mark, for example `…; py`.

## Related Pages

- Previous: [Release 0.14](Release-0.14)
- Next: [Release 0.16](Release-0.16)
- [Archive](Archive): the index of the archived pages.
