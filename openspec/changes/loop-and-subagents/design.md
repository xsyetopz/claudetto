## Context

claudetto `/goal` already answers in place of the built-in command with a `command.run` hook, saves its state, and blocks a `Stop` with a check command (`modules/work/finish/adapters/mod.ts:279-300`).
The built-in `/loop` schedules with `CronCreate` or `ScheduleWakeup`, re-sends the full context each turn, ends recurring tasks after 7 days, and does not restore a self-paced loop on `--resume` (https://code.claude.com/docs/en/scheduled-tasks).
A plugin cannot call `ScheduleWakeup` or `CronCreate` itself. It can only ask the model to call them (https://code.claude.com/docs/en/tools-reference).
The edit ledger and the task parse of the open change are in the module `project`.

## Decisions

- **`/loop` next to `/goal`.** The command lives in `modules/work/` and reuses the `command.run` and `Stop` paths of `/goal`. Alternative: a new module, which would copy the state and the stop handling.
- **The model schedules, the mod bounds.** The mod tells the model to call `ScheduleWakeup` with a wait, and a `tool.call` hook on `ScheduleWakeup` changes a wait that breaks the TTL rule and denies a call when a bound is hit. Alternative: a mod timer with `$.clock.after` and `$.prompt.submit`, which runs only while the mod lives and sends a prompt with no model choice.
- **TTL in effect.** The TTL comes from `CLAUDE_CODE_PROMPT_CACHE_TTL`, `promptCacheTtl`, and the login type, as the status line reads it now. Alternative: a fixed 5 minutes, which wastes the 1-hour TTL of a subscription.
- **Spawn facts, not a block.** The spawn check adds context and never denies, because the model may need an agent for a ticked task, such as a review. Alternative: a deny, which a false match would turn into a stop of real work.
- **Probe first.** The model pins change only after the paid probe and the approval of the user.

## Risks / Trade-Offs

- [Risk] The model does not call `ScheduleWakeup`, and the loop ends. -> The `Stop` hook of the loop blocks one time with a reason that asks for the call, and the loop state keeps the count.
- [Risk] The built-in `/loop` changes its behavior in an update. -> A pin test checks that `command.run` of `/loop` reaches the claudetto hook.
- [Risk] The probe of one task is too small to settle the pins. -> The evidence page names the size of the probe, and the pins change only with the approval of the user.
