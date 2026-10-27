## Why

The `learn:` note of claudetto is a port of the built-in mod `cc-plugin-you-should-know` (`external/cc-bundle/2.1.310/ysk.named.js`), but the port asks the main agent to write the note, with a line in `agents/main.md`.
The user does not write such notes and asked where they came from (the user, 2026-10-26, answer A8 in `.claude/claudetto/prompt-questions.txt`).
The line costs bytes of `main.md`, which the user wants cut toward the 5,627-char lean prompt of Claude Code `2.1.310` (the user, 2026-10-26, answer A3).
Jev picked a side model at turn end, with a Jev gate and Haiku text, at 0.89 (2026-10-26).

The built-in mod calls `$.model.fork` on `turn.step`, which sends the whole main transcript again on the main model.
On a long Opus session each fork bills that prefix as cache reads, so this change uses `$.model.complete` on Haiku with the last turn only, behind a Jev gate that skips most turns.

## What Changes

- At the end of a main turn, Jev answers one yes/no question: does the last turn hold a fact that the user should know, outside the work of the session, that is relevant and consequential.
- On yes, Haiku writes the note at effort `high` (the user, 2026-10-26), in the format of the built-in mod: `learn:`, `tag:` (`Heads up` or `You should know`), and `explain:`.
- With no Jev key, Haiku answers alone and may answer `learn: none`.
- A note whose `learn:` line was shown before in the session is not shown again.
- The `learn:` line leaves `<communication>` in `agents/main.md`. The parser of a `learn:` block in a reply stays, for a reply that still holds one.

## Capabilities

### Modified Capabilities

- `side-notes`: "No Model Request" becomes "Turn-End Side Model", and "Learn Block" no longer asks the main agent for the block.

## Impact

- Code: `plugins/claudetto/modules/work/notes/` (domain, adapter, `prompts.ts`, `limits.ts`), with the `jev` module through its `index.ts`.
- Text: `plugins/claudetto/agents/main.md`.
- Cost: one Jev request per main turn with a Jev key, and one `claude-haiku-5-5` request at effort `high` on each yes, or on each turn with no Jev key. Each Haiku request stays at or under 100,000 tokens, because Haiku costs 5x above that (the user, 2026-10-26).
