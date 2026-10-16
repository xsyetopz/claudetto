# Decisions: Settings

This page holds the settings decisions that claudetto 0.1.0 keeps: D1, D2, D5, D10, and D14.
Read it to learn why claudetto sets some keys, writes no managed settings, and leaves other switches alone.
The index is [Decisions](Decisions).

Each decision has the problem, the choice, the alternatives, and the evidence.
Claims about the Claude Code binary cite the version `2.1.296`, unless the text says otherwise.
The minimum version of claudetto 0.1.0 is Claude Code 2.1.301, and these claims are not measured again on it.

## D1 Rule of Least Power

**Problem:** A need of claudetto can be met in many ways in Claude Code.
A way that needs more code breaks more often when Claude Code updates.

**Choice:** Each need takes the first way that works, in this order:

1. No key, because the Claude Code default gives the result.
2. A settings key or an env var in the generated schema ([Settings Schema](Settings-Schema)).
3. A built-in part that the settings turn off ([Off Switches](Off-Switches)).
4. A mod handler.
5. A script.
   This is the last choice.

[Settings Snippet Keys](Settings-Snippet-Keys) gives the reason and the Claude Code default for each key that the snippet sets.
The snippet is plain JSON.
The `claudetto-setup` command merges it into a settings file only with `--apply`.
The code is in `src/plugins/claudetto/slices/setup/adapters/settings-cmd.ts`.

The basis of the order changed in 0.1.0: the decision ladder of the change puts the Mod API first, then a classic hook, then a built-in part.
See `openspec/changes/claudetto-0-1-0/design.md`, decision D2.
This order still holds for a setting that the Claude Code default or a settings key can do.

**Alternatives:** A script or a mod handler first.
Inference: a script or a mod handler has more code that Claude Code can break.
So the order keeps the code small.

**Evidence:**

- `.claude/rules/extension-points.md` says that runtime code is not written for a feature that the latest Claude Code has.
- `tests/claudetto/settings-pin.test.ts` checks each JSON block of [Settings Snippet](Settings-Snippet) against `schemas/claude-code-settings.json`.
  The test fails on a key that the schema lacks, and on a never-set key.
  The never-set lists are in `tests/support/settings-pin.ts`.

## D2 No Guard Route, `settings.json` Only

**Problem:** A managed settings file seats the guard of Claude Code.
A seated guard skips two claudetto parts.
These parts are the shared sections and the model variants of the system prompt (`prompt.compose`), and the `context_management` text (`prompt.section`).

**Choice:** claudetto writes no managed settings file, and it runs no `sudo`.

- It writes no `managed-settings.json` and no `managed-settings.d/` drop-in.
- It runs at tier `user`, so it gets `prompt.section`, `prompt.compose`, and `prompt.context`.
  The guard is not seated on a machine with no managed settings and no Team or Enterprise login.

**Alternatives:** Write a managed drop-in that seats the guard.
That skips the `prompt.section` handlers at tier `user`.
So the prompt text of claudetto does not reach the request.

**Trade-off, accepted by the user:** With no guard, an installed mod with a `tool.check` hook can turn a content deny rule into an allow.
A path deny and a whole-tool deny stay enforced.
The guard of claudetto never weakens a deny.
See [Off Switches](Off-Switches#managed-settings).

**Evidence:**

- `src/plugins/claudetto/slices/setup/domain/drift.ts` has `isSeated`.
  It says that the guard is seated when the managed source has a key.
  The drift check reports it.
- `src/plugins/claudetto/slices/setup/domain/facts.ts` has `GUARD_SKIPS`, which lists the two skipped parts.
- `src/plugins/claudetto/slices/setup/adapters/mod.ts` runs the drift check at `session.start`.
- The `prompt` slice keeps the `prompt.section` handler on `context_management` (`slices/prompt/adapters/mod.ts`).
  So the trade-off still applies.
- The probe reports for tier `user` are not in the repository.
  The tier claim is not re-run on `2.1.296`.
- Not re-checked on `2.1.296`: a managed `enabledPlugins` key also locks the plugin name.
  The built-in plugin `cc-plugin-sec-default` is in the 2.1.296 bundle.
  The extract `external/cc-2.1.296/strings.txt` shows it.
- Inference: `availableModels` is read from user settings, so the snippet holds it.
  [Settings Resolution](Settings-Resolution) says that managed `availableModels` replaces the user list.

## D5 Who Invokes What

**Problem:** A skill that the model can invoke adds a line to the skill listing of each request.
A skill that the user runs by hand has no reason to be in that listing.

**Choice:** A skill that only the user runs sets `disable-model-invocation: true` in its `SKILL.md`.
These skills are `setup` and `gc` of the core plugin, `start-cost` and `usage` of `claudetto-sessions`, and `eval-compare` of `claudetto-lab`.
Evidence: the `SKILL.md` files under `src/plugins/`.

The three MiniSpec skills of the core plugin (`minispec`, `minispec-apply`, and `minispec-review`) are model-invocable, because the model starts a plan or a review when the task needs one.
The `docs` skill of the `claudetto-docs` add-on is model-invocable, because a task needs its docs.
Its description has 155 characters.
The file is `src/plugins/claudetto-docs/slices/docs/skills/docs/SKILL.md`.
This run did not measure its token cost.

The drift check runs at `session.start`.
It reports the settings and skill problems of each session.
Evidence: `src/plugins/claudetto/slices/setup/adapters/mod.ts`.

**Cost of a plugin skill:** `skillOverrides` did not remove the listing line of a plugin skill.
This is the result of the probe of Claude Code 2.1.293.
The probe report is not in the repository.
The cost is not re-measured on `2.1.296`.
Measure it with `/context` in `just sandbox`.
See [Off Switches](Off-Switches).

**Alternatives:** Model-invocable skills for all of them.
Inference: each model-invocable skill costs a listing line in each request.
So a skill that only the user runs stays user-invoked.

## D10 Schema Extraction

**Problem:** The settings schema must match the installed Claude Code version.
A schema that is typed by hand goes stale when Claude Code updates.

**Choice:** `claudetto-schema` reads the settings schema out of the installed bundle.
It is the CLI of the `claudetto-lab` add-on.
It writes two files:

- `schemas/claude-code-settings.json`, the keys of `settings.json`.
- `schemas/claude-code-managed-settings.json`, the keys of `managed-settings.json`.
  This file is a reference only, because claudetto writes no managed settings (see [D2](#d2-no-guard-route-settingsjson-only)).

**Code:** `src/plugins/claudetto-lab/slices/schema/domain/build.ts` builds the schema from the bundle text.
The file names have no version, so the `$schema` links stay the same.
The CLI is in `src/plugins/claudetto-lab/slices/schema/adapters/cli.ts`.
`just schema` runs it.

**Evidence:** The `$comment` of `schemas/claude-code-settings.json` says that the file was extracted from Claude Code `2.1.301`.

See [Settings Schema](Settings-Schema).

## D14 Off Switches

**Problem:** Some built-in parts of Claude Code add tokens or noise that claudetto does not use.
Some switches also cost quality, so each switch needs a test.

**Choice:** Three lists hold the switches.
Each key is in one list.

1. Forced off, with no quality cost:
   - The built-in plugins of `OFF_PLUGINS` in `src/plugins/claudetto/slices/setup/domain/facts.ts`.
     The list leaves out `cc-plugin-plugin-authoring` and `cc-plugin-sec-default`.
   - The claude.ai skill and plugin sync and the connectors.
     These keys are `disableClaudeAiConnectors`, `syncClaudeAiSkills`, and `syncClaudeAiPlugins`.
     They are in `src/plugins/claudetto/slices/trim/domain/removed.ts`.
   - The feedback and tips switches, fast mode, and the built-in agents.
     See [Off Switches](Off-Switches).
2. Not in the snippet, because the eval of `2026-10-08` showed a loss or no saving:
   - `DISABLE_TELEMETRY` and `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`.
     Both showed a loss on the second run.
   - `subagentPromptCacheTtl` set to `"1h"`.
     It showed no saving.
   The plan-mode denies, the task-tool denies, and `includeGitInstructions: false` are in the snippet.
   The eval showed no loss for them.
   The lists were not measured again for 0.1.0.
   The figures of the eval are in the archive.
   See [Eval of 2026-10-08](Evals-0.28.0#eval-of-2026-10-08-off-switches).
3. Never set: keys that disable hooks, that defeat the `model` and `effort` of the agent files, or that remove context that Claude needs.
   The lists are `NEVER_SET_KEYS` and `NEVER_SET_ENV` in `tests/support/settings-pin.ts`.

A key of the global config (`~/.claude.json`) is not in `settings.json`.
The snippet sets the env var for it, such as `CLAUDE_CODE_AUTO_CONNECT_IDE`.
See [Settings Snippet Keys](Settings-Snippet-Keys).

No off switch for the `computer-use` MCP server is known.
The snippet holds a deny rule for it, `mcp__computer-use`.
See [Off Switches](Off-Switches#computer-use).

**Alternatives:** Turn off all telemetry and all non-essential traffic.
The eval rejected that choice for the two keys in list 2.

The `claudetto-setup` command has no `--with` flag.

## Related Pages

- [Settings Snippet](Settings-Snippet)
- [Settings Snippet Keys](Settings-Snippet-Keys)
- [Off Switches](Off-Switches)
- [Settings Resolution](Settings-Resolution)
- [Guards](Guards)
- [Decisions](Decisions)
