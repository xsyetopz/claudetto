# Design

`claudetto` is a set of Claude Code plugins built on a few simple principles.
They keep the plugins small, cheap, and safe to update.
Each section names a principle, the reason, and where the code applies it.

## Use Only Documented Extension Points

`claudetto` changes Claude Code with the mod API, settings, skills, output styles, and the status line command.
It never patches the Claude Code binary or its npm package.
A patch breaks at each release, and it breaks the terms of service of Anthropic.

- `plugins/claudetto/hooks/hooks.json` names one module, `./register.ts`, and one classic hook, `PreModelSwitch`.
- `register.ts` has 18 `on()` calls for 15 events.
- The output style `Concise` is `plugins/claudetto/output-styles/Concise.md`.

## Use the Least Powerful Part

For each need, `claudetto` picks the cheapest part that works.
The order is: a default of Claude Code, a setting or env var, a mod handler, a classic hook, a script.
A skill adds its description to each session, so only a skill that the user starts has `disable-model-invocation`.

- A slice that a setting can replace is not a slice. The `styles` slice is an empty folder, because the output style needs no code.
- `.claude/rules/plugins.md` forbids new runtime code for a feature that Claude Code already has.

## Do Not Call a Model for a Plain Check

A model call reads the whole context again.
So a check that needs no judgment is code.

- `guard` reads the syntax of a command to tell a delete of build output from a delete of work, and a harmless `git` command from a loss.
- `ground` checks `file:line` claims of a plan against the source.
- `handoff` writes a cold handoff with no model call.

## Put Each Capability in One Slice

A slice holds one capability, from its pure code in `domain/` to its entry points in `adapters/`.
To add a capability, add a slice.
To remove it, remove the slice.
Layers would spread one capability over many folders, and parallel work would conflict.

- `tests/repo/imports.test.ts` checks the imports.
  Two modules never import each other, a kernel file imports no module, and a `domain/` file imports no adapter.

## Write the Joining Files by Hand

`plugins/` is the source, and no generator writes it.
Version 0.2.0 generated `hooks/register.ts`, `hooks.json`, `plugin.json`, and the kernel copies from a `slice.ts` manifest in each slice.
Version 0.3.0 removed the generator and the manifests, because one reader can follow a hand-written `register.ts` with 18 `on()` calls and the generator was more code than it saved.
`just generate` now writes only `wiki/`.

- `register.ts` has one literal `on()` call for each handler, because the mod runtime reads the event name only as a literal.
- `tests/repo/hook-evals.test.ts` fails when an `on()` call has no `// eval:` comment or no entry in `evals/hooks.json`.

## Let Each Plugin Work Alone

A plugin imports nothing from another plugin.
An add-on must work when the user installs it alone, so it cannot need the core plugin.

- An add-on keeps its own copy of each kernel file that it uses, and a test fails on each import that leaves its plugin.
- `.claude/rules/plugins.md` and `tests/repo/addons.test.ts` enforce the rule.

## Give Each Bound One Owner

A number in two places drifts apart.
So a kernel bound is in `plugins/claudetto/kernel/node/limits.ts`, a module bound is in `modules/<m>/limits.ts`, and a repository bound is in `tools/limits.ts`.
Tests pin each copy in code and config.

- `CONTEXT_WINDOW` is `300_000`.
  The snippet sets `autoCompactWindow` to it for each model that is not a Haiku model.
- `MIN_CLAUDE_CODE_VERSION` is `2.1.311`.

## Keep the Prompt Short

Each request sends the system prompt and the tool descriptions again.
Shorter text leaves more context for the work.
Each session runs as the main agent `claudetto:main`, whose body replaces each built-in section, and the `prompt` slice gives shorter texts for seven tools.
The size of the body is on [Prompt Size](Prompt-Size).

- `plugins/claudetto/agents/main.md` is the body.
- Three caps in `tools/limits.ts` pin the size of the first request ([Prompt](Prompt#size)).

## Decide by the State, Not by a List

A rule list cannot tell `rm -rf node_modules` from `rm -rf src`, and a classifier of auto mode is a large request on each call.
The permission gate of the `guard` slice reads the command and the `git` state of its paths.
It allows by default, asks before a loss for good, and denies a danger to the system or a secret read.
Jev can allow an `ask` first, and a person decides the rest.
The snippet keeps a `deny` list as a second layer, and it sets no `allow` list and no `ask` list.

- `plugins/claudetto/modules/gate/domain/gate.ts` holds the rules ([Guard](Guard)).

## Hand Off Instead of Compacting

The `handoff` slice replaces the summary of a compaction with a handoff.
The built-in compaction loses facts that the work needs.
Set the option `compaction` to `built-in` to turn the handoff off.

- `CONTEXT_WINDOW`, `CONTEXT_BLOCK_MARGIN`, and `HANDOFF_TRIGGER_TOKENS` are in `plugins/claudetto/modules/session/limits.ts`.
- The slice registers no `session.compact` hook: the compaction of Claude Code stays as the safety net.

## Record Progress in Checked Tasks

The state of an OpenSpec change is in `tasks.md`, where a checked task is a done task.
The handoff reads the done list from there and from checks that passed, never from model text.
`plugins/claudetto/modules/project/domain/change.ts` holds the shared rules.

## Related Pages

- [Decisions](Decisions)
- [Architecture](Architecture)
- [Controls](Controls)
- [Bounds](Bounds)
- [Handoff](Handoff)
