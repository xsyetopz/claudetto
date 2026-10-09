# Decisions: settings

This page holds D1, D2, D5, D10, and D14.
The index is [Decisions](Decisions).

## D1 Rule of Least Power

Each need first looks for no key.
Then it looks for a settings key or an env var in the generated schema ([Settings schema](Settings-Schema)), then a part to turn off, then a mod handler.
A script is the last choice, and only when nothing above works.
[Profile keys](Profile-Keys) lists each key with its reason and the Claude Code default.
A test fails on a profile entry that the list lacks.

## D2 No guard route, `settings.json` only

The user decided that dotclaude does not use managed settings.

- Setup writes no `managed-settings.json` and no `managed-settings.d/` drop-in, and it runs no `sudo`.
- dotclaude runs at tier `user`.
  It gets `prompt.section`, `prompt.compose`, and `prompt.context`, because the guard is not seated on a machine with no managed settings and no Team or Enterprise organization (`research/probes-2.md`).
- With managed settings, the guard is seated and skips the `prompt.section` handlers of tier `user`.
  A managed `enabledPlugins` key also locks the plugin name.
- `maxEffortLevel` and `availableModels` work from user settings, so the profile holds them.

The user accepted one trade-off.
With no guard, an installed mod with a `tool.check` hook can turn a content deny rule into an allow.
A path deny and a whole-tool deny stay enforced.
The guard of dotclaude never weakens a deny.
On a machine with managed settings, the drift check reports that the guard is seated and which dotclaude parts it skips.
See [Off switches](Off-Switches#managed-settings) and [Managed drop-in](Managed-Drop-In).

## D5 Who invokes what

- `setup` is user-invoked only, which keeps it out of the listing.
- `handoff` and the `docs` skill are model-invocable with a short description.
- `skillOverrides` does not apply to a plugin skill on Claude Code 2.1.293, so a plugin skill costs its listing line.
  The cost is about 60 tokens for a description of 190 characters.
- The OpenSpec skills are project skills, so they are `name-only` (17 tokens each against 61).
- The doctor became a drift check at session start.

See [Commands](Commands).

## D10 Schema extraction

`tools/schema.mjs` reads the settings schema out of the installed bundle and writes the schema files.
It writes a managed variant as a reference only (D2).
See [Settings schema](Settings-Schema).

## D14 Off switches

The source is `research/off-switches.md`.
Three lists are in [Off switches](Off-Switches) and in tests:

- Forced off, with no quality cost: the built-in plugins except the plugin-authoring plugin, the claude.ai sync and connectors, feedback and tips, fast mode, and the built-in agents.
- Eval-gated: `DISABLE_TELEMETRY`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, and `subagentPromptCacheTtl: "1h"`.
  The denies of the plan tools and the Task tools and `includeGitInstructions: false` moved into the profile after the eval of 2026-10-08.
- Never set: keys that would disable hooks, defeat the router, or remove context that Claude needs.

A key in the global config scope is not in `settings.json`, so the profile uses the env var for it.
No off switch for the `computer-use` MCP server is known.

## Related pages

- [Profile keys](Profile-Keys)
- [Off switches](Off-Switches)
- [Guards](Guards)
