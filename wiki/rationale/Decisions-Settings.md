# Decisions: settings

This page holds the settings decisions that 1.0.0 keeps: D1, D2, D5, D10, and D14.
D35 is reversed by 1.0.0, and it moved to [Decisions-Reversed](Decisions-Reversed#settings).
The index is [Decisions](Decisions).

Each decision has the problem, the choice, the alternatives, and the evidence.
Claims about the Claude Code binary cite the version `2.1.296`, unless the text says otherwise.

## D1 Rule of Least Power

Problem: a need of dotclaude can be met in many ways in Claude Code.
A way that needs more code breaks more often when Claude Code updates.

Choice: each need takes the first way that works, in this order:

1. No key, because the Claude Code default gives the result.
2. A settings key or an env var in the generated schema ([Settings-Schema](Settings-Schema)).
3. A built-in part that the settings turn off ([Off-Switches](Off-Switches)).
4. A mod handler.
5. A script.
   This is the last choice.

[Settings-Snippet-Keys](Settings-Snippet-Keys) gives the reason and the Claude Code default for each key that the snippet sets.
The snippet is plain JSON.
The `setup` command merges it into a settings file only with `--apply` (`src/plugins/dotclaude/slices/setup/adapters/settings-cmd.ts`).

Alternatives: a script or a mod handler first.
Inference: a script or a mod handler has more code that Claude Code can break, so the order keeps the code small.

Evidence:

- `.claude/rules/extension-points.md` says that runtime code is not written for a feature that the latest Claude Code has.
- `tests/dotclaude/settings-pin.test.ts` checks each JSON block of [Settings-Snippet](Settings-Snippet) against `schemas/claude-code-settings.json`.
  The test fails on a key that the schema lacks, and on a never-set key.
  The never-set lists are in `tests/support/settings-pin.ts`.

## D2 No guard route, `settings.json` only

Problem: a managed settings file seats the guard of Claude Code.
A seated guard skips two dotclaude parts: the shared sections and the model variants of the system prompt (`prompt.compose`), and the `context_management` text (`prompt.section`).

Choice: dotclaude writes no managed settings file, and it runs no `sudo`.
- It writes no `managed-settings.json` and no `managed-settings.d/` drop-in.
- It runs at tier `user`, so it gets `prompt.section`, `prompt.compose`, and `prompt.context`.
  The guard is not seated on a machine with no managed settings and no Team or Enterprise login.


Alternatives: write a managed drop-in that seats the guard.
That skips the `prompt.section` handlers at tier `user`, so the prompt text of dotclaude does not reach the request.

Trade-off, accepted by the user: with no guard, an installed mod with a `tool.check` hook can turn a content deny rule into an allow.
A path deny and a whole-tool deny stay enforced.
The guard of dotclaude never weakens a deny.
See [Off-Switches](Off-Switches#deny-override-trade-off).

Evidence:

- `src/plugins/dotclaude/slices/setup/domain/drift.ts` has `isSeated`, which says that the guard is seated when the managed source has a key.
  The drift lines at about line 163 report it.
- `src/plugins/dotclaude/slices/setup/domain/facts.ts` has `GUARD_SKIPS`, which lists the two skipped parts.
- `src/plugins/dotclaude/slices/setup/adapters/mod.ts` runs the drift check at `session.start`.
- `.dotclaude/spec/changes/1.0.0/packages/01b2-prompt-slice.md` keeps the `prompt.section` handler on `context_management` in 1.0.0.
  So the trade-off still applies.
- The probe reports for tier `user` are not in the repository.
  The tier claim is not re-run on `2.1.296`.
- Not re-checked on `2.1.296`: a managed `enabledPlugins` key also locks the plugin name.
  The built-in plugin `cc-plugin-sec-default` is in the 2.1.296 bundle, which the extract `external/cc-2.1.296/strings.txt` shows.
- Inference: `maxEffortLevel` and `availableModels` are read from user settings, so the snippet holds them.
  [Settings-Resolution](Settings-Resolution) says that managed `availableModels` replaces the user list.

## D5 Who invokes what

Problem: a skill that the model can invoke adds a line to the skill listing of each request.
A skill that the user runs by hand has no reason to be in that listing.

Choice: the core skills are user-invoked only, with `disable-model-invocation: true` in each `SKILL.md`.
These are `setup`, `handoff`, `spec`, `ship`, `hotfix`, and `rules-creator`.
Evidence: `src/plugins/dotclaude/slices/setup/skills/setup/SKILL.md` and the other skills of `src/plugins/dotclaude/slices/`.

The `docs` skill of the `dotclaude-docs` add-on is model-invocable, because a task needs its docs.
Its description has 155 characters (`src/plugins/dotclaude-docs/slices/docs/skills/docs/SKILL.md`).
This run did not measure its token cost.

The drift check runs at `session.start`, and it reports the settings and skill problems of each session.
Evidence: `src/plugins/dotclaude/slices/setup/adapters/mod.ts`.

Cost of a plugin skill: `skillOverrides` did not remove the listing line of a plugin skill, when the probe of Claude Code 2.1.293 was run.
The probe report is not in the repository.
Not re-measured on `2.1.296`.
Measure it with `/context` in `just sandbox`.
See [Off-Switches](Off-Switches).

Alternatives: model-invocable skills for all of them.
Inference: each model-invocable skill costs a listing line in each request, so the core skills stay user-invoked.

See [Architecture](Architecture#skills).

## D10 Schema extraction

Problem: the settings schema must match the installed Claude Code version.
A schema that is typed by hand goes stale when Claude Code updates.

Choice: `dotclaude-schema`, the CLI of the `dotclaude-lab` add-on, reads the settings schema out of the installed bundle.
It writes two files:

- `schemas/claude-code-settings.json`, the keys of `settings.json`.
- `schemas/claude-code-managed-settings.json`, the keys of `managed-settings.json`, as a reference only, because dotclaude writes no managed settings (see [D2](#d2-no-guard-route-settingsjson-only)).


Code: `src/plugins/dotclaude-lab/slices/schema/domain/build.ts` builds the schema from the bundle text.
The file names are at line 32, and the version title is at line 79.
The CLI is in `src/plugins/dotclaude-lab/slices/schema/adapters/cli.ts`.

Evidence: the `$comment` of `schemas/claude-code-settings.json` says that the file was extracted from `2.1.296`.
The bundle extract `external/cc-2.1.296/strings.txt` is git ignored.

See [Settings-Schema](Settings-Schema).

## D14 Off switches

Problem: some built-in parts of Claude Code add tokens or noise that dotclaude does not use.
Some switches also cost quality, so each switch needs a test.

Choice: three lists.
Each key is in one list.

1. Forced off, with no quality cost:
   - the built-in plugins of `OFF_PLUGINS` in `src/plugins/dotclaude/slices/setup/domain/facts.ts`, which are all built-in plugins except `cc-plugin-plugin-authoring`.
   - the claude.ai skill and plugin sync and the connectors (`disableClaudeAiConnectors`, `syncClaudeAiSkills`, `syncClaudeAiPlugins`), in `src/plugins/dotclaude/slices/trim/slice.ts`.
   - the feedback and tips switches, fast mode, and the built-in agents.
     See [Off-Switches](Off-Switches).
2. Not in the snippet, because the eval of `2026-10-08` showed a loss or no saving:
   - `DISABLE_TELEMETRY` and `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, which both showed a loss on the second run.
   - `subagentPromptCacheTtl` set to `"1h"`, which showed no saving.
   The plan-mode denies, the task-tool denies, and `includeGitInstructions: false` are in the snippet, because the eval showed no loss.
   The table is at [Off-Switches](Off-Switches#eval-of-2026-10-08).
   The eval reports are not in the repository, so the table holds the figures.
3. Never set: keys that disable hooks, that defeat the `model` and `effort` of the agent files, or that remove context that Claude needs.
   The lists are `NEVER_SET_KEYS` and `NEVER_SET_ENV` in `tests/support/settings-pin.ts`.

A key of the global config (`~/.claude.json`) is not in `settings.json`.
The snippet sets the env var for it, such as `CLAUDE_CODE_AUTO_CONNECT_IDE`.
See [Settings-Snippet-Keys](Settings-Snippet-Keys).

No off switch for the `computer-use` MCP server is known.
The snippet holds a deny rule for it, `mcp__computer-use`.
See [Off-Switches](Off-Switches#computer-use).

Alternatives: turn off all telemetry and all non-essential traffic.
The eval rejected that choice for the two keys in list 2.

The `setup` command has no `--with` flag.

## Related pages

- [Settings-Snippet](Settings-Snippet)
- [Settings-Snippet-Keys](Settings-Snippet-Keys)
- [Off-Switches](Off-Switches)
- [Settings-Resolution](Settings-Resolution)
- [Guards](Guards)
- [Decisions-Reversed](Decisions-Reversed)
