# Decisions: settings

This page holds D1, D2, D5, D10, D14, and D35.
The index is [Decisions](Decisions).

## D1 Rule of Least Power

Each need first looks for no key.
Then it looks for a settings key or an env var in the generated schema ([Settings schema](Settings-Schema)), then a part to turn off, then a mod handler.
A script is the last choice, and only when nothing above works.
[Settings snippet keys](Settings-Snippet-Keys) lists each key with its reason and the Claude Code default.
A test checks each JSON block of the [settings snippet](Settings-Snippet) against the generated schema, and fails on a key that the schema lacks and on a key of the never-set list.
dotclaude writes no setting (D35), so the snippet is plain JSON that you copy.

## D2 No guard route, `settings.json` only

The user decided that dotclaude does not use managed settings.

- dotclaude writes no `managed-settings.json` and no `managed-settings.d/` drop-in, and it runs no `sudo`.
- dotclaude runs at tier `user`.
  It gets `prompt.section`, `prompt.compose`, and `prompt.context`, because the guard is not seated on a machine with no managed settings and no Team or Enterprise organization (`research/probes-2.md`).
- With managed settings, the guard is seated and skips the `prompt.section` handlers of tier `user`.
  A managed `enabledPlugins` key also locks the plugin name.
- `maxEffortLevel` and `availableModels` work from user settings, so the snippet holds them.

The user accepted one trade-off.
With no guard, an installed mod with a `tool.check` hook can turn a content deny rule into an allow.
A path deny and a whole-tool deny stay enforced.
The guard of dotclaude never weakens a deny.
On a machine with managed settings, the drift check reports that the guard is seated and which dotclaude parts it skips.
See [Off switches](Off-Switches#managed-settings).
The managed drop-in of the first plan was used for probes only, and 0.28.0 removed it.

## D5 Who invokes what

- `setup` is user-invoked only, which keeps it out of the listing.
- The `docs` skill is model-invocable with a short description.
  The `handoff` skill is removed (D35).
- `skillOverrides` does not apply to a plugin skill on Claude Code 2.1.293, so a plugin skill costs its listing line.
  The cost is about 60 tokens for a description of 190 characters.
- The OpenSpec skills are project skills, so they are `name-only` (17 tokens each against 61).
- The doctor became a drift check at session start.

See [Core plugin](Core-Plugin#skills).

## D10 Schema extraction

`dotclaude-schema` of the plugin `dotclaude-lab` reads the settings schema out of the installed bundle and writes the schema files.
It writes a managed variant as a reference only (D2).
See [Settings schema](Settings-Schema).

## D14 Off switches

The source is `research/off-switches.md`.
Three lists are in [Off switches](Off-Switches) and in tests:

- Forced off, with no quality cost: the built-in plugins except the plugin-authoring plugin, the claude.ai sync and connectors, feedback and tips, fast mode, and the built-in agents.
- Not in the snippet, with no gate: `DISABLE_TELEMETRY`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, and `subagentPromptCacheTtl: "1h"`.
  The eval of 2026-10-08 showed a loss for each.
  The denies of the plan tools and the Task tools and `includeGitInstructions: false` moved into the snippet after that eval.
  The setup `--with` flag that added these items is removed.
- Never set: keys that would disable hooks, defeat the `model` and `effort` of the agent files, or remove context that Claude needs.
  The list is a constant in `tests/dotclaude/settings-pin.test.mjs`.

A key in the global config scope is not in `settings.json`, so the snippet uses the env var for it.
No off switch for the `computer-use` MCP server is known.

## D35 No proprietary formats

dotclaude 0.28.0 and later never make up a schema or a format of their own (rule of the user 2026-10-09).
dotclaude takes only what Claude Code provides: settings, env vars, hooks and the other documented extension points, the API, and the Agent SDK.
A format is proprietary when dotclaude defines it and no Claude Code surface reads or defines it.
The test of the rule: a feature that must write its own file so that a later call reads it back is not built.
A feature that works from its input is built.
The input is the hook input, the status line input, the transcript, or a file of Claude Code.

0.28.0 removed each earlier format with its tests, with no migration and no kept copy.
Git history is the only record, and no code deletes a file of the user.
The removed formats are the setup profile with its merge, diff, backups, and migration, the rules file, the router table, the status line and usage state files, the context markers, the handoff carry and the `handoff` skill, the guard state file, auto-fix, the `sembr-chat.jsonl` log, `tools/baseline.json`, the eval harness, and the `x-claude-code-version` key.
The rule was chosen over documented formats of our own, because a format of our own cannot be proven to work against Claude Code updates.

## Related pages

- [Settings snippet](Settings-Snippet)
- [Settings snippet keys](Settings-Snippet-Keys)
- [Off switches](Off-Switches)
- [Guards](Guards)
