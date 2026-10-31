# Design

## Context

The `finish` block holds two features that share one `classic.Stop` hook, `onFinishStop`:

- the `/goal` replacement: `goal.ts`, most of `hooks.ts`, and the goal texts in `prompts.ts`;
- the `tasks.md` loop: `loop.ts`, `loopBlock`, and the `LOOP` texts.

`run-limits` holds the bare `classic.Stop` registration, so `finish` matches stops by `hook_event_name`. See `proposal.md` for the reasons.

## Goals / Non-Goals

**Goals:**

- `/goal` reaches the built-in with no claudetto hook in its path.
- The `tasks.md` loop works as before.

**Non-Goals:**

- Extending the built-in `/goal`, such as by rewriting its `args`. A rewrite would change the user's text, which is the defect this change removes.
- The `modelProposedGoals` setting of the tiers. It stays unset, and only the name of its test changes.

## Decisions

- **Delete the goal code, do not disable it.** A switch would keep code that no tier uses. The alternative was a `/goal` block that falls through to the built-in when off, but it keeps the same code with no user.
- **Keep the `finish` block and its `classic.Stop` route.** The loop still needs them. Remove the routes that only the goal used: `command.run`, `command.describe`, `ui.render`, `process.run`, `tool.register`, and `tool.call`. Keep `session.messages`, because `loopBlock` reads the messages.
- **Keep `onFinishStop`'s rule for background tasks.** A stop with a background task in flight is let through, because the task's notice wakes the session. This applies to the loop as well as the goal.
- **Drop the uncommitted mark fix in `goal.ts` and `hooks.ts`.** That fix redrew the mark on clear and showed the age from one second. Its files are deleted.

## Risks / Trade-offs

- [A user's saved goal in `$.state` from 0.1.x stays in the session store] → No code reads the `goal` key any more. The value is session-scoped and ends with the session.
- [The built-in goal's judge is a model call at each stop, with an unmeasured cost] → The user opts in by running `/goal`. claudetto adds no call.
