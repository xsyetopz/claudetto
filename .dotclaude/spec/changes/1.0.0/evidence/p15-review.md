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

## `rationale/` and `Decisions-Reversed`

1. `wiki/rationale/Decisions-Architecture.md:220-221` (D45) says that no test checks an import between two add-ons.
   `tests/support/import-rules.ts:47-51` (`checkPluginBoundary`, Rule 4) flags each import that leaves its plugin, and `tests/dotclaude/imports.test.ts:2` runs the rules over `plugins/`.
   Fix: remove the "Gap" bullet, and cite Rule 4 and `imports.test.ts`.
2. `Decisions-Architecture.md:158-166` (D43) and the D43 row of `Decisions.md` say that the `asks` slice asks only on a weaker check.
   `asks/slice.ts:1-3` also asks for discarded work, as `Design.md:175-179` says.
   Fix: "a weaker check or discarded work", in the heading and the row.
3. `Decisions-Settings.md:128` (D14) says that `OFF_PLUGINS` is all built-in plugins except `cc-plugin-plugin-authoring`.
   `facts.ts:9-19` also leaves `cc-plugin-sec-default` alone.
   Fix: name both.
4. `Decisions-Settings.md:140-154` (D14, "Eval of 2026-10-08") holds 0.x eval figures that no `evidence/` file backs.
   The figures came from the old `Off-Switches` page.
   Fix: move the table to `wiki/archive/Evals-0.28.0.md` (or the archive page of the 0.28 evals), with its source as the old `Off-Switches` page.
   In D14, keep the three lists, say that 1.0.0 did not measure them again, and link the archive page.
   `Settings-Snippet-Keys.md` holds some of the same figures: give them the same treatment.
5. The D16 heading (`Decisions-Prompt.md:99`) and its row in `Decisions.md` say "the 30K start".
   `Decisions-Prompt.md:118-120` says that "30K" has no source.
   Fix: drop "30K" from both. Keep the anchor `#d16-request-capture-and-the-30k-start` working, or change each link to it (`Decisions-Layout.md` links it).
6. Minor: `Decisions-Tools.md:170` (D26) says that the sync runs after `Edit` or `Write`. The matcher is `Edit|Write|MultiEdit|NotebookEdit`.
7. Minor: `Decisions-Settings.md:111` says line 32 of `schema/domain/build.ts`. The names are at lines 30-33.

## `dotclaude/`

The reviewer did not read `Contributions.md` and `Semantic-Line-Breaks.md`.
The reviewer found no 0.28.0 text in `Context-And-Handoff`, `Guards`, `Status-Line`, or `Architecture`.

1. `wiki/dotclaude/Skills.md:263-265` says that a size above a high bound fails.
   `tools/sizes.ts:99-108`: above `SKILL_META_TOTAL_HIGH_BYTES` (8 KB) is a report only, and above `SKILL_META_TOTAL_MAX_BYTES` (15 KB) fails.
2. `Skills.md:31-32` says that `allowed-tools` limits the tools of a skill.
   In Claude Code, `allowed-tools` pre-approves the listed tools. It does not deny others.
   Fix: "pre-approves".
3. `Context-And-Handoff.md:54`, `Agents.md:77`, and `Agents.md:86` say that a run at `maxTurns` returns no report.
   `Agents.md:76` and the binary say that partial output returns.
   Fix: partial output returns, marked as incomplete.
4. `Architecture.md:10-23` ("Layers") conflicts with D37 and does not describe a slice.
   Fix: describe the parts of a slice (`domain/`, `adapters/`, the ports of `src/kernel/ports.ts`), and keep kernel, slices, and plugins as the folder map.
5. `Architecture.md:147` says "A model-invocable skill has 150 to 300 bytes".
   Each skill sets `disable-model-invocation: true`, and `tools/sizes.ts:75-95` applies the bound to each `SKILL.md`.
   Fix: remove "model-invocable".
6. `Prompt-Surface.md:60-63` ties the variants to "Opus 5.5", "Fable 5.1", and "Mythos 5.1".
   `variantKey` in `slices/prompt/domain/apply.ts:35-40` matches by family.
   Fix: say that the match is by family, and correct line 68.
7. `Status-Line.md:23` says "the counts of dirty, ahead, and behind files".
   Fix: "dirty files, and commits ahead and behind" (`statusline/domain/git.ts`).
8. `Status-Line.md:80` omits the fallbacks `input.cwd` and the process folder (`statusline/adapters/cli.ts:126-127`).
9. `Context-And-Handoff.md:64` says `/handoff`. Fix: `/dotclaude:handoff`.
   `Guards.md:4` says that the print deny is for a large file, but `Guards.md:55` says that each file print is denied. Make `Guards.md:4` agree with the code.

## `claude-code/`

1. `wiki/claude-code/Undocumented-Reads.md:38` and `:180-181` give the wrong login read of the sandbox.
   `src/plugins/dotclaude-lab/slices/sandbox/adapters/login.ts:12-35` tries `CLAUDE_CODE_OAUTH_TOKEN` first, then on macOS the Keychain entry `Claude Code-credentials`, then `~/.claude/.credentials.json` from `os.homedir()`, not from the config folder.
   Fix: the order, the Keychain read, and the path. The "Break" line also names a changed Keychain entry name.
2. `Tools-And-Deferral.md:120` says "9,301 for 10 tools, including 530 for the MCP tool".
   `external/capture/snippet/report-2026-10-11T03-06-19-303Z-1.json` has 11 tool rows that sum to 9,301.
   Fix: "11 tools".
3. `Request-Build.md:33` gives 29197 and 14847 bytes of tool JSON, with no method.
   The `tools` arrays of `external/capture/vanilla/request-*-1.json` and `-2.json` give 28546 and 14474 bytes as compact JSON, and 29221 and 14865 bytes with spaced separators.
   Fix: measure again and name the method, or remove the numbers.
4. `Compaction-And-Context.md:41-52` gives the threshold as `window - 13000` with the percent override, but the strings also have a `precomputeBufferFraction` path that takes the minimum with it.
   Fix: one line that a second, earlier trigger exists and is not examined.
5. `Compaction-And-Context.md:19` and `:66-67` say "not checked", but the strings show that `CLAUDE_CODE_MAX_CONTEXT_TOKENS` is read only when `DISABLE_COMPACT` is set.
   Fix: give that binary fact with the version.
