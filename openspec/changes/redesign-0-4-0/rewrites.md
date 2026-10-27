# Rewrites of `statusline`, `jev`, `gate`, and `shell`

The user wants claudetto smaller with no loss of behavior (the user, 2026-10-25).
The weekly usage reset that the work waited for has passed (the user, 2026-10-26).
Each gap that this review finds is part of the plan (the user, 2026-10-25).
A `claudetto:Scoper` read the modules and ran no test. Each line target is an estimate of that report (proposed).
`M` below is `plugins/claudetto/modules`.

## Rules for Each Rewrite

- The current tests must pass with no change. Step 0 of each module runs the baseline.
- Biome sets the line count. Only deleted code saves lines.
- Rewritten code uses `undefined` in place of `null` where the types and the payloads of Claude Code allow it (the user, 2026-10-26).
- The baseline on 2026-10-26, from `cat` of each `.ts` file of the module piped to `wc -l`: `statusline` 1201, `jev` 1173, `shell` 858, and `gate` 1210. `statusline` grew from 1105 in groups 12 and 15.
- The result of task 17.2 on 2026-10-26, by the same count: `statusline` 1204, `jev` 1160, and `shell` 874. Each misses its target, and the measured count replaces the target (the user, 2026-10-26). The countdown gradient adds lines to `statusline`. The exports `operands`, `nameOf`, and `wordSet` add lines to `shell`, and `gate` deletes its copies in task 17.3.
- The result of task 17.3 on 2026-10-26, by the same count: `gate` 1162. The measured count replaces the target, as for task 17.2. The rest of `gate` is one-use rule tables, regexes, and the text of `prompts.ts`.
- The module files of `architecture.md` stay: `limits.ts`, `prompts.ts`, and `state.ts` where it exists.
- `domain/` files import no `node:` and no `Bun` (`hooks-module.md`). `tests/repo/imports.test.ts` enforces the import rules.
- The tests import these paths, so they stay:
  - `M/statusline/{width,format,color,model,limits}.ts`, `M/statusline/adapters/{cli,change,git-cache}.ts`
  - `M/jev/{limits,cli}.ts`, `M/jev/domain/{jev,ask,request}.ts`, `M/jev/adapters/{ask,cli}.ts`
  - `M/gate/limits.ts`, `M/gate/adapters/mod.ts`, `M/gate/domain/{gate,usage,paths,ghtitle,monitors}.ts`
  - `M/shell/limits.ts`, `M/shell/domain/{shell,shellkinds,wrappers}.ts`
- Other pinned imports: `parseModel`, `inTmp`, `baseName` of `M/shell/domain/wrappers.ts`, `MAX_ROWS` (read by `tools/generate/wiki.ts`), and `M/jev/index.ts` (read by `plugins/claudetto/tests/ask.test.ts`).

## Order

1. Step 0 of each module: the baseline, and the tests for behavior that no test covers.
2. `statusline`, `jev`, and `shell` in parallel. Their file sets are apart.
3. `gate` last, because it imports `M/shell/index.ts` and `M/jev/index.ts`.
4. `just check` after each module, and once at the end.

## `statusline` (1105 Lines, Target about 25% Fewer, Proposed)

Where lines go:
- `plugins/claudetto/modules/statusline/segments.ts` writes the error mark at lines `45`, `52`, `84`, and `164`, and the `isNumber` guard at `52`, `93`, `122`, and `163`. Use one typed `segment()` factory, with the limit rows from a table.
- Text built in pieces: `contextText`, `cacheText`, and `limitText`. Use one template each.
- `plugin-option.ts` and `idLabel` each have one caller. Fold them into the caller.
- The colors of the percents and the countdowns are a linear RGB gradient that code makes from 3 stops, in place of 3 fixed styles (the user, 2026-10-26, spec `status-line`, "Usage Gradient" and "Countdown Gradient"). This is a behavior change, so the color tests change with the spec delta.
- `GitPorts` restates fields of `Deps`. Use `Pick<Deps, ...>`. Move `Task` and `SubagentInput` into `subagents.ts`.

Tests to add first:
- `saveRateLimits` and its failed write.
- `CLAUDE_PLUGIN_OPTION_COMPACTION` over `pluginConfigs`.
- A bad `settings.json` that prints its cause.

Check: `bun test tests/claudetto/statusline tests/claudetto/kernel`, then `just check`.

## `jev` (1173 Lines, Target about 20% Fewer, Proposed)

Where lines go:
- Each `ERROR_*` message takes `{ usage }`, and each caller passes `USAGE`. Append it in `prompts.ts`.
- The bounds 280 and 1,568 are in the text of `plugins/claudetto/modules/jev/prompts.ts:33-34` and `plugins/claudetto/modules/jev/prompts.ts:49-50`, and again in `limits.ts`. Build the text from `limits.ts`.
- `post` at `plugins/claudetto/modules/jev/adapters/cli.ts:197` repeats the request flow of `postJev`. Use one `send` that takes the transport.
- 3 copies of the 0-to-1 check: `plugins/claudetto/modules/jev/domain/answers.ts:24`, `plugins/claudetto/modules/jev/domain/ask.ts:104`, and `plugins/claudetto/modules/jev/domain/jev.ts:119`.
- `render` reads the reply 2 times with `--json` (`plugins/claudetto/modules/jev/adapters/cli.ts:237-239`).
- `adapters/errors.ts` only re-exports. Move `EXIT` and `UsageError` into `adapters/cli.ts`, and keep the re-exports that the CLI tests need.

Tests to add first: the text of `onDescribe` (`plugins/claudetto/modules/jev/adapters/mod.ts:55-58`). Confirm with a mutation.

Check: `bun test tests/claudetto/jev tests/claudetto/gate plugins/claudetto/tests/ask.test.ts`, then `just check`.

## `shell` (858 Lines, Target about 10% Fewer, Proposed)

The reader is a dense parser, and its tests cover the edge cases (F1 to F5, D35). Make only low-risk cuts:
- The callback types and the `frame()` casts in `scan.ts`.
- One-use helpers (`append`, `addRaw`, `arithmeticAt`, `result`).
- `XARGS`, `FEEDS`, and `WRAPPERS` list the same commands in 3 places.
- Export `wordSet`, `nameOf`, and `operands` for `gate`.

Tests to add first: remove each entry of `WRAPPERS`, `DATA`, and `FEEDS` one at a time, and add a test for each entry that survives.

Check: `bun test tests/claudetto/shell tests/claudetto/gate`, then `just check`.

## `gate` (1210 Lines, Target about 25% Fewer, Proposed)

Where lines go:
- 2 copies of `operands`, in `delete.ts` and `git.ts`. Use the one of `shell`.
- `baseName(rest[0] ?? "")` repeats in many places. Use `nameOf` of `shell`.
- 2 copies of the `$.state.get` guard (`plugins/claudetto/modules/gate/adapters/mod.ts:236` and `plugins/claudetto/modules/gate/adapters/mod.ts:249`).
- 4 verdict constructors and the `LOSS` table in `domain/gate.ts`. Use one `verdict` call.
- Merge `delete.ts`, `git.ts`, and `loss.ts` into `domain/loss.ts`. Fold `log.ts` and `domain/jev.ts`.

Tests to add first:
- The handlers `onMonitor` (`plugins/claudetto/modules/gate/adapters/mod.ts:257`), `onTitle` (`plugins/claudetto/modules/gate/adapters/mod.ts:292`), and `onStop` (`plugins/claudetto/modules/gate/adapters/mod.ts:302`), and the allow path of `onPermission` (`plugins/claudetto/modules/gate/adapters/mod.ts:204`).
- Mutation checks of `sharedFinding`, `runsDownload`, `ASK_TRUNCATED`, and the `userEdits` thunk.

Check: `bun test tests/claudetto/gate plugins/claudetto/tests`, then `just check`.

## Gaps to Fix

Each gap gets a test that fails on it before its fix.

1. `claudetto-decide ask` changes an object `state` to `""` (`plugins/claudetto/modules/jev/adapters/cli.ts:98`). The API takes an object, and the TypeSafe guidance says named fields work better.
2. The mod sends Jev a joined string, `Question i: ...` (`plugins/claudetto/modules/jev/domain/ask.ts:35-38`). Send named fields.
3. `yes`, `pick`, and `box` send one question. The API answers many questions on one state in one request.
4. The mod sends no image and no `box`. There is no model flag. Only `noul`, `choice`, and `box` are in use, and the API also has `score`. The plan agent found no local copy of the Jev API reference, so check these against the live docs.
   The live docs on 2026-10-26 confirm each claim, so no paid probe is necessary:
   - The kinds are `noul`, `choice`, `score`, and `box`. `score` takes an ordered list of 1 to 10 levels, and it answers `score`, `confidence`, `legend`, and `probabilities` (https://docs.typesafe.ai/api/system-one.md, https://docs.typesafe.ai/primitives/score.md).
   - An image is PNG or JPEG, 280 to 1568 px on each side. The docs give no fixed count for each request. "A Box question needs an image in the request", and the request needs the header `TypeSafe-Danger-Zone-Images: true` (https://docs.typesafe.ai/go/images, https://docs.typesafe.ai/primitives/box.md).
   - `model` is a required request field: `jev-1.14.0`, `jev-1.13.0`, or the aliases `jev-latest` and `jev-preview`. "Box questions need Jev 1.14" (https://docs.typesafe.ai/models.md). The code sends `JEV_MODEL` (`jev-latest`) of `plugins/claudetto/modules/jev/domain/jev.ts:12`, and `BOX_MODEL` (`jev-1.14.0`) of `plugins/claudetto/modules/jev/adapters/cli.ts:44` for `box`. The CLI has no flag that picks the model.
   - "Each request evaluates one state against one or more questions." `state` can be a string, an object, or an array, and the docs say: "Use an object for most requests so each part of the state has a descriptive name" (https://docs.typesafe.ai/concepts/state.md). This supports gaps 1 to 3.
   - `https://docs.typesafe.ai/models.md` says that Jev reads text only, and the image and `box` pages say the opposite. This record follows the image and `box` pages, because `jev-1.14.0` answered a `box` question live (`plugins/claudetto/modules/jev/domain/answers.ts:99`).
5. `.claude/claudetto/builtins/` comes from 2.1.305, and it says `replace` for 8 sections that `dev/builtins/verdicts/others.ts` now sets to `off`. This fault is in the generated pages, not in the verdicts. The fix goes in the new change for 2.1.310.
6. 2.1.310 has a section `opus5_reduced_delegation` with no verdict. The `pronouns` text also changed in 2.1.310.

Gaps 5 and 6 go to the change `support-2-1-310` (the name is proposed). No such change is in `openspec/changes/` on 2026-10-26, so `/claudetto:propose support-2-1-310` makes it after this release.
7. `dev/builtins/prompt.ts` counts the bytes of a section but keeps no text. The Jev review of sections needed a separate script. Make `just builtins` write the text of each section. Done (task 18.3): `just builtins` also writes `Sections.md` in the output folder, with a heading and the static text of each section.
8. The script found no text for 13 of the 36 sections: `actions`, `brief`, `brook_heron` (a remote flag), `doing_tasks`, `endconv_deferred_hint`, `env_info_static`, `focus_mode`, `memory_static`, `repl_working`, `tone`, `tools`, `user_pays`, and `willow_tern`. Result for 2.1.310 (the evidence is the strings of the installed binary `~/.local/share/claude/versions/2.1.310`, read only, with the minified names of that release):
   - `actions`, `doing_tasks`, `tone`, `tools`, and `user_pays` have text, and `Sections.md` now holds it. The functions `cur()`, `uur()`, `hur()`, `pur()`, and `fur()` hold the strings. `user_pays` is `"The user pays per token for your turns, and wants the job done for what it needs and no more."` and shows only when the flag `tengu_wobbly_dahl` is on.
   - `willow_tern` has text in the bundle. `our(e)` returns the constant `nur`, which starts `# Writing for the user`. The section shows when `CLAUDE_CODE_WILLOW_TERN` is set or the client data says so. The extractor follows one level of names, so `Sections.md` shows only the flag name `tengu_willow_tern_applied`.
   - `focus_mode` has text in the bundle. `Our(e,n)` returns `bYs`, `Mur`, or `Pur`, and each starts `# Focus mode`. It shows only in the focus view mode. `Sections.md` lacks it for the same reason as `willow_tern`.
   - `brief` has text in the bundle. `Aur(e)` returns `Idr`, which is `BRIEF_PROACTIVE_SECTION` of `chunk-xrby53gn.js`. The text starts `## Talking to the user` and names `SendUserMessage`. `Sections.md` lacks it because the name comes from a re-export in another chunk.
   - `env_info_static` has the same text as `env_info_simple`. One call, `Rur(be,b)`, builds both, and the name is `env_info_static` when `excludeDynamicSections` is set.
   - `brook_heron` has no text in the bundle. `sur(e)` calls `Ddn(e,n)`, which reads the remote flag `nd()?.[Tdr]` with `Tdr="tengu_brook_heron"` and trims the string, by model and effort. The bundle holds only the key and the event `tengu_brook_heron_applied`.
   - `endconv_deferred_hint` has no text in the strings. `getDeferredHintSection` is in `chunk-kh0htae4.js`, which ships as bytecode, so the strings list only its names (`getDeferredHintSection`, `END_CONVERSATION_*`). The section shows only when the `EndConversation` tool is in the tool list, behind the flag `tengu_umber_kestrel`.
   - `memory_static` has no static text. `n9s(e)` returns `null` unless memory is on, and else builds the text at run time from the memory directory with `bo(wo,null,{skipIndex:!1})`.
   - `repl_working` has no text in any case. The function is `function vur(e){return null}`.

## Rebuild of `main.md` and Audit of Each Text

The request (the user, 2026-10-23, session `abdec4c8`): "they can take from the actual claude code system prompts, and heavily build off of them by trimming and rewording where needed, or doing a full-blown xml-recommended overhaul here and there."
The records lost it for `main`: D7 of alpha-2 audits the other default texts, and `main.md` became a custom body (A9, spec `prompt-base`).
The default texts of Claude Code, its instructions, prompts, and descriptions, break the prompting best practices and the model-specific guidance, so each text that claudetto sends gets the audit, also the output styles and the global `CLAUDE.md` (the user, 2026-10-25).
The weekly usage reset that the work waited for has passed (the user, 2026-10-26).

Steps:
1. Change the requirement "Main Agent" of `openspec/specs/prompt-base/spec.md`: the body of `main.md` comes from the real sections of the supported Claude Code version, trimmed and reworded, and each XML tag has the name of its section.
2. Get the text of each section with a script that reads the installed program (gap 7). For each section, keep it, reword it, or drop it, with the reason. The Jev answers of 2026-10-25 are one input (`covered`, `coding`, `harness` for 24 sections).
3. Audit each text against `research/prompting.md`: `agents/*.md`, `output-styles/*.md`, the skills, the `prompts.ts` of each module, the tool texts, and the global `CLAUDE.md` that `claudetto-setup` writes. Record the result for each text in `research/text-audit.md`.
4. Decide `act_dont_rederive`, `delivering_work_max`, and `overcorrection` here, because a new `main.md` changes what it covers (the user, 2026-10-25).
5. Keep the `<security>` block of `main.md` and its test (the user, 2026-10-25).
6. Keep the name `main`: the built-in `claude` agent of Claude Code is a catch-all agent that appends to the default prompt, not the main thread (`chunk-ha9a4121.js` of 2.1.310).
7. Use `research/stock-failures/` and `research/prompt-examples.md` as the references for each reword, and test each change by the "Trial-and-Error Protocol" of `prompt-examples.md`.
8. Verification for all work, not only UI work (the user, 2026-10-26). The stock `doing_tasks` asks for a check only for a UI change (`research/stock-failures/01-sections.md` SF-S-21). The new body keeps a check rule for each behavior change, with the command and its output, as the current `<verification>` block does.
9. No stall when no user can answer (the user, 2026-10-26). claudetto works in the TUI and in CLI headless mode, so `-p` counts (the user, 2026-10-26). Each text of the rebuild works in both modes. The TUI-only lines now are `plugins/claudetto/agents/main.md:31` (`AskUserQuestion`), `:45` (the permission dialog), and `:63` (a `!` command), and `plugins/claudetto/output-styles/Concise.md:15` and `:16`. The stock `actions` says "when in doubt, ask before acting" (SF-S-16). The current `<asking>` and `<actions_with_care>` blocks say to ask with `AskUserQuestion`, but a `claude -p` capture of a claudetto session (2.1.310, stub with a fake key, `.claude/claudetto/probe/out/claudetto-2.1.310/`) offers no `AskUserQuestion` tool. The stock `autonomy_append` does not cover it: it fires only on the model flag `fable_5_mitigations` or the flag `amber_astrolabe` (`CLAUDE_CODE_AMBER_ASTROLABE`), behind `tengu_amber_sextant` (function `iur` of 2.1.310), not on `-p`. The new body says what to do when `AskUserQuestion` is not in the tools: decide, state the assumption, and stop only for an action that cannot be undone. The stub probe in `-p` mode shows that the rule is in the request. A test of the behavior needs a paid run, which the user approves first.

Check: `bun test tests/claudetto/session/prompt`, then `just check`.

## Faults of the Threads of 2026-10-26

A `claudetto:Scout` read 6 threads of `external/2026-10-26/` and found 20 faults, of which 8 have a rule in `main.md` or `Concise.md`.
These gaps get a change in 0.4.0 (the user, 2026-10-26):
- Task 19.7: 3 rules in `<doing_tasks>` of `main.md`. They are targeted edits (4 reports), no edit scars (2 reports), and a `git diff` before a claim that nothing changed (2 reports).
- Task 19.8: a size warning on a large prompt (1 report, 10,000 pasted lines).

These gaps have code already, so they get no change:
- A context that grows (8 reports): `session/handoff/limits.ts` starts a handover at `HANDOVER_CONTEXT_TOKENS`, 150k tokens.
- A cache that expires after idle time (2 reports): `onPrompt` of `session/handoff/adapters/mod.ts` offers a handover after `CACHE_TTL_MS` (`isCold`).
- A compaction that loses the state (1 report): `onCompact` of `session/prompt/adapters/mod.ts` adds `PRECOMPACT_LINE`, and the path `handoff-then-compact` writes the handoff file first.

A usage log for each session (18 reports of usage that drains with no cause shown) overlaps `/context`, `/cost`, and the usage line of `session/prompt`, so it gets no code (`.claude/rules/plugins.md`).
Python as the default language (2 reports) and the cost of the MCP schemas (1 report, a figure of a tool author) are user settings, not plugin code.
