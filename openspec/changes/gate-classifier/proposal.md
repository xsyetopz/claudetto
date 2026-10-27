## Why

The gate asked a person for many routine calls, and the user called the prompts "unacceptable" (the user, 2026-10-27).
The rules of the gate stay broad on purpose: "it's supposed to be broad. that's what claudetto's auto-mode + lightweight classifier is to resolve" (the user, 2026-10-27).
The user asked for "a low-cost auto-mode equivalent with classifier using first-class Jev or fallback low-cost Haiku5-5 at high reasoning" (the user, 2026-10-27).

The auto mode of Claude Code runs its classifier after the rules and hooks, only for a call that would ask (`configure/permissions/auto-mode.md` of the Claude Code Docs).
Its system prompt block `system[1]` has 140,015 characters (`prompts/auto-classifier.md` of the Claude Code Docs), and `setup` turns the mode off (`disableAutoMode`).
The mod API gives what a copy needs: `$.model.complete` with `model`, `system`, `effort`, `maxTokens`, and `timeoutMs`, which never throws, and `$.session.messages()` for the requests of the user (`extend/mod-api/types/model.md` and `types/session.md`).

## What Changes

- Each `ask` of the gate goes to a classifier stage in `modules/gate/adapters/classifier.ts`.
- Jev answers first, for each `ask`, not only for a delete or local `git` work. A `P(yes)` of `JEV_YES_MIN` (0.8) or more allows the call.
- Else `claude-haiku-5-5` at the `high` effort reads a short rule prompt, the newest 3 requests of the user, the call, and the reason of the gate. `<block>no</block>` allows the call, and `<block>yes</block>` denies it with the reason.
- A failure, a timeout, or an answer with no single `<block>` tag leaves the `ask` to a person.
- A breaker sends the next `ask` to a person after 3 denials in a row, and each `ask` after 20 denials in a session.
- `classic.PermissionRequest` reads the verdict of `tool.check` for the same call, so one call costs one classification.
- The option `classifier` (`haiku` by default, or `off`) turns off the model step. Jev follows the `decide` option.
- The `jev` flag of a gate verdict goes away, because each `ask` goes to Jev.

## Capabilities

### New Capabilities

- `gate-classifier`: the classifier stage of the gate, its order, its failure path, and its breaker.

## Impact

- Code: `plugins/claudetto/modules/gate/` (`adapters/classifier.ts`, `adapters/mod.ts`, `domain/classifier.ts`, `domain/gate.ts`, `limits.ts`, `prompts.ts`) and `.claude-plugin/plugin.json`.
- Docs: `src/wiki/claudetto/slices/Guard.md`, `reference/Bounds-Slices.md`, `reference/Off-Switches.md`, and `Overview.md`.
- Cost: each `ask` that Jev is not sure about makes one Haiku call on the login of the user. A live check of the prompt is a paid run, and it runs only after the user approves it with its cost.
