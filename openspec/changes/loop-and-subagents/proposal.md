## Why

The built-in `/loop` has no turn or usage bound, does not restore a self-paced loop on `--resume`, and ends a recurring task after 7 days (https://code.claude.com/docs/en/scheduled-tasks).
User reports say that subagents spend tokens on work that is already done and that the model forgets running subagents after `/clear` (Reddit threads of 2026-10-26, which the user gave as input). The user picked four items for 0.4.0-alpha.1 (the user, 2026-10-26).

## What Changes

- A claudetto `/loop` answers in place of the built-in command, as `/goal` does. It keeps a bound of turns and a bound from the usage bands, picks a wait inside the prompt cache TTL, waits with `Monitor` where a command output can end the wait, and keeps its state in `.claude/claudetto/loop.json`, so `--resume` restores it.
- A paid probe measures the tokens of one task in a `claudetto:Hephaestus` agent on Sonnet and on Opus. The result decides whether the model pins of the agents stay as they are.
- After a check of the docs, `claudetto:main` gets one line that says whether subagents and background tasks survive `/clear` and `/compact`.
- Before an `Agent` call, a hook gives the model the tasks of the open change that are already ticked and the files that the ledger shows as changed by this session, so no agent starts on work that is done.

## Capabilities

### New Capabilities

- `loop`: the claudetto `/loop` command, its bounds, its waits, and its state.
- `spawn-check`: the facts that a hook adds before an `Agent` call.

### Modified Capabilities

- `prompt-base`: the line on subagents after `/clear` and `/compact`.
- `agent-roster`: the model pins, when the probe shows a change.

## Impact

- Code: `modules/work/` (`/loop` next to `/goal`), `modules/agents/` (the spawn check), `agents/main.md`, and `hooks/register.ts` with new rule names and `evals/hooks.json` keys.
- Cost: one paid probe, which the user approves before the run.
- Depends on the change `state-folders` for `.claude/claudetto/`.
