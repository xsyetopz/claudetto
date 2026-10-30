## Why

Claudetto should lower the usage cost of Claude Code by overriding the harness where a mod or hook can, and by scaling per subscription tier. The reasons and the evidence are in `prd.md`.

## What Changes

- **BREAKING**: Add hooks that run before context is lost (`SessionEnd`, `PreCompact`), and remove the Stop-time trigger and timer queue once they pass.
- **BREAKING**: Replace the single setup snippet with a tier table.
- **BREAKING**: `PermissionRequest` for an ungated input is no longer answered `allow` (fail closed).
- **BREAKING**: Remove the wiki steps from `just check`, and delete `archive/tools/generate/`, `archive/tools/wiki.ts`, and `src/wiki/`.
- **BREAKING**: Remove claudetto's seven `minispec` skills and stop setup from removing OpenSpec. Vanilla OpenSpec stays, and the integration becomes an opt-in.
- Add a byte budget for each prompt piece and each injected hook string.
- Add stuck-agent termination and a start cap per window.
- Choose handover or compaction by a cheap-model probe, after the user approves it. Until then the default is the built-in path with a handoff safety net.
- **BREAKING**: Turn off every non-CLI surface that a key or a deny rule reaches, and golf the request down. A reading against a local fake API took the first request of a plain run from 42,676 to 18,191 characters with no model call (`docs/surfaces.md`).
- Add measurement of the usage windows, so that every later saving is shown in window points and not assumed.
- Add the golf score, characters of the first request split into `system`, `tools`, and `messages`, as a free check that every change reports.
- Leave to the earlier plan (`epic-a-complete-restart-sunny-conway.md`): the `status-line` rewrite and the OpenSpec workflow skills. The `autoMode` lists are now in `low-hitl`. The `status-line` shows the window rows that `window-budget` records, and `window-budget` counts the permission classifier as a source of spend. A full spec of each waits for the user's word on scope (see `review.md`).

## Capabilities

### New Capabilities

- `tier-profiles`: a table of cost settings for each subscription tier.
- `session-handoff`: a handoff written before a `/clear`, an exit, or a compaction, and read back once.
- `compaction-path`: the choice of built-in compaction, code compaction, or handover, by a stated cost rule.
- `prompt-footprint`: size budgets for the prompt text that claudetto adds.
- `run-limits`: a cap on subagent starts and the end of stuck agents.
- `permission-policy`: a fail-closed answer to a permission request that no rule settles.
- `repo-gate`: the checks of `just check` with no wiki step.
- `low-hitl`: tuning of auto mode and its classifier (`autoMode` lists, narrow allow rules, the sandbox, the denial circuit breaker) so that safe work runs with no prompt and the classifier is called less. It uses documented keys only. See `references.md`.
- `builtin-rebuild`: our own replacement for `cc-plugin-you-should-know@builtin`, read from the kept `2.1.310` bundle and the readable module of `2.1.311`, with no telemetry, no artifact path, our own code and our own observer prompt under claudetto's `MIT` while the interface strings may match the original, and one bounded `$.model.complete` call on a named cheap model in place of a fork of the whole window on the session's model.
- `surface-trim`: Claude Code golfing. Every non-CLI surface off by a verified key or a deny rule, and the request scored in characters by a free reading against a local fake API.
- `window-budget`: a measured record of the points that each task costs in the five-hour and weekly windows, the real weight of each token kind for this login, and rules that spend the window by what is left. This is the long-term answer to the unknown plan quotas and the unknown weight of a cache read.

### Modified Capabilities

None. `openspec/specs/` does not exist, so each capability is new.

## Impact

- New plugin: `plugins/claudetto-you-should-know/`, a third entry in `.claude-plugin/marketplace.json`, off by default and checked by `claude plugin test` with no model call.
- Code: `archive/plugins/claudetto/modules/session/handoff/`, `archive/plugins/claudetto/modules/setup/`, `archive/plugins/claudetto/modules/gate/adapters/mod.ts`, `archive/plugins/claudetto/hooks/register.ts`, `archive/plugins/claudetto/agents/*.md`, `archive/plugins/claudetto/output-styles/Concise.md`, `archive/tools/check.ts`, `justfile`.
- Removed: `archive/tools/generate/`, `archive/tools/wiki.ts`, `src/wiki/`, and the tests that read generated pages.
- User settings: the tier table changes the `env` and settings keys that `/claudetto:setup` writes.
- Cost: the paid probe needs approval, with its share of the weekly limit stated first.
