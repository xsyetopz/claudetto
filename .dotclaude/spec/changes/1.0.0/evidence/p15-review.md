# P15 reviewer pass

The findings of step 4 of [P15](../packages/15-docs.md), one section for each reviewer.
The fix run works through this list.
A finding in code goes to the "Findings outside the docs" list of P15, not to a wiki edit.

## Start pages, `README.md`, and `add-ons/`

1. `wiki/Install.md:68` says the merge "keeps your other keys".
   The merge replaces `availableModels` (`plugins/dotclaude/skills/setup/SKILL.md:34`, `wiki/reference/Settings-Snippet.md:19`).
   Fix: "keeps your other keys, except that it replaces `availableModels`".
   The same claim is at `README.md:44-45`.
2. `wiki/Install.md:18` and `:72` are each correct, but the `docs` skill runs `bunx` and the `addons` check reads `npx`.
   Code finding, already recorded in P15.
   Add a note on `Install` that the check reads `npx`.
3. `README.md:60` says `/handoff`.
   Fix: `/dotclaude:handoff`, as `README.md:79` and `wiki/Quickstart.md:80` say.
4. `wiki/add-ons/Add-Ons.md:21` says each add-on command starts with `#!/usr/bin/env -S bun`.
   The line is `#!/usr/bin/env -S bun --no-env-file`, and `dotclaude-docs` has no command.
   Fix: "The commands of the add-ons run on Bun".
5. The `plugin.json` files say `0.28.0`.
   P16 runs `just bump`, so no wiki edit.

## `development/`, `CHANGELOG.md`, and `archive/`

1. `wiki/development/Plugin-Layout.md:173` says four slices have no `limits.ts`.
   Thirteen slices have none: the core slices `prompt`, `rules`, `sembr`, `styles`, `surface`, and `trim`, `docs`, the four slices of `dotclaude-lab`, and `start-cost` and `usage`.
   Fix: name examples and give no count.
2. `wiki/development/Development.md:43,185` and `wiki/development/Release-History.md:8` say that `just bump` changes the version in the manifests.
   `tools/bump-version.ts:1-8` writes only `package.json` and two `CHANGELOG.md` lines, and `just generate` writes the `plugin.json` versions.
   The release steps (`Development.md:166-188`) need `just generate` and a commit between `just bump` and `just release`.
   The `justfile` comment of `bump` ("in both manifests") is stale too, which is a code finding.
3. `docs/README.md:6` lists `Evals-History` and `Open-Items` under "Evidence", as live pages.
   Both are in `wiki/archive/`, and `Open-Items.md:3` and `Archive.md:62` say "still open after 0.28.0".
   Fix: move both links to a history line, and write "open at 0.28.0".
   The same live links are at `wiki/_Sidebar.md:66`, `wiki/rationale/Decisions.md:69`, and `wiki/evidence/Evals.md:178`.
4. `CHANGELOG.md:44` says "The `/ship` command".
   Fix: "The `/ship` skill".

## `reference/` and `evidence/`

The reviewer ran out of turns, so `wiki/evidence/Usage-Evidence.md` and most of `wiki/evidence/Evals.md` are not reviewed yet.

1. `wiki/reference/Off-Switches.md:106` says "The five dotclaude agents".
   Fix: "six".
2. `Off-Switches.md:143-147` and `Settings-Snippet-Keys.md:76` disagree on `skillOverrides` for `plugin-authoring`.
   No source settles the effect on `2.1.296` (`Decisions-Settings.md:88` says it is unmeasured).
   Fix: Keys:76 says that the entry asks Claude Code to list the skill by name only, not re-checked on `2.1.296`, with a link to `Off-Switches#skilloverrides`.
3. `Off-Switches.md:161` says "dotclaude sets none of the items".
   `setup --apply` writes the snippet.
   Fix: "the snippet sets none of the items".
4. `Settings-Snippet-Keys.md:95` says "dotclaude writes no launcher stub".
   Not verified, and `setup` writes the plugin path into `statusLine`.
   Check it, and remove it if no source supports it.
5. `Off-Switches.md:84` says "No code imports that list", but `tests/dotclaude/trim/removed.test.ts:6` imports `REMOVED_PARTS`.
   Fix: "No shipped code imports that list".
6. `Off-Switches.md:33` says "dotclaude reads only `DISABLE_COMPACT`", but the code also reads `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` (`spec/adapters/runs.ts:35`), `CLAUDE_CODE_EFFORT_LEVEL`, and `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` (`setup/adapters/mod.ts:39-40`).
   Fix: "of the entries of this table".
7. `wiki/evidence/Prompt-Variants.md` says "The first request has no byte bound of its own", but `START_TOKENS` (9,960 tokens, `tools/limits.ts`) bounds it through `tools/measure.ts --bound`.
   Fix: name `START_TOKENS`.
