---
id: P15
deps: [P14, P33, P35, P36]
owns: ["wiki/", "src/wiki/", "README.md", "CHANGELOG.md", "docs/", "tools/wiki.ts", ".claude-plugin/marketplace.json"]
verify: bun run lint:md, just check, and a reviewer pass
agent: implementer
---

# P15 Docs

## Goal

Rebuild the docs for 1.0.0: the wiki, the README, and the `CHANGELOG.md`, with the numbers of P14.
The wiki is easy to navigate and correct against the code.
It gives the rationale of each design choice.
It shows how dotclaude works on Claude Code, and how the Claude Code `2.1.296` binary works.

## Decisions (2026-10-13)

The user delegates each decision to Jev, except a push to `main`.

- A stale claim is removed, not reworded (the user).
- Historical text moves to `wiki/archive/` (the user).
- The `OpenSpec` page is deleted, because 1.0.0 does not use OpenSpec (the user).
  `Spec-Store` replaces it.
- The wiki is rebuilt around the questions of the reader, in the sections below (Jev, 0.98).
- Facts about the binary can come from the git-ignored `external/` folder (Jev, 0.88).
  A page gives the facts in its own words, with the version and the extraction method.
  A page copies no bundle code and no long verbatim prompt text.
- The 27 release pages in `wiki/archive/` stay (Jev, 0.82).
  P18 deletes tags and GitHub releases only.

## Context

- The code is the source of truth: `src/`, `src/kernel/budget.ts`, `slices/*/limits.ts`, `tools/limits.ts`.
- The 1.0.0 design: `change.md`, `design.md`, `workflow.md`, and `evidence/` in this folder.
- The binary facts: `external/cc-2.1.296/`, `external/cc-extract/2.1.296/`, `external/dossier/cc-2.1.296`, `external/capture/`, and the `dotclaude-schema` CLI (`src/plugins/dotclaude-lab/slices/schema/`).
  `TESTED_VERSION` is in `src/plugins/dotclaude/slices/setup/domain/facts.ts`.
- `src/wiki/` holds the sources of generated pages.
  `tools/generate/emit/fill.ts` replaces `{{NAME}}` with a bound, and `{{include X}}` with a fragment of `src/fragments/`.
- Checks that stay green:
  `tests/support/wiki-links.test.ts` (each link resolves, page names are unique across folders, no folder-qualified link),
  `tests/dotclaude/settings-pin.test.ts` (the JSON of `Settings-Snippet.md`),
  `tests/dotclaude/setup/settings.test.ts`,
  `tests/support/file-size.test.ts` (300 lines),
  and `bun run lint:md`.
- A run needs the git-ignored `.claude-plugin/types` folders (`.claude-plugin/types`, `plugins/dotclaude/.claude-plugin/types`, `plugins/dotclaude-browser/.claude-plugin/types`) for `just check`.
  It copies them from the main checkout and does not commit them.

## Page map

A page name is the file name.
The old pages in brackets merge into the new page and are deleted.

Start (wiki root):

- `Home`: what dotclaude is, the plugins, and where to read next.
- `Install`, `Quickstart`, `Troubleshooting` (each "Troubleshooting" part of other pages).
- `Attributions`.

How dotclaude works (`wiki/dotclaude/`):

- `Architecture` [`Core-Plugin`]: the kernel, the slices, the one hook module `register.ts`, the 11 events, and the path from `src/` to `plugins/`.
- `Guards`: the `guard` and `asks` slices.
- `Agents`.
- `Skills`: the six skills.
- `Spec-Store` [`OpenSpec`].
- `Prompt-Surface` [`System-Prompt`]: the output style, the prompt sections, and the tool texts.
- `Context-And-Handoff` [`Context-Bound`]: the context bound of subagents and the `handoff` slice.
- `Status-Line`.
- `Semantic-Line-Breaks`.
- `Second-Opinion`: the `decide` slice.
- `Contributions`.

Add-on plugins (`wiki/add-ons/`): `Add-Ons` (index), `Code-Graph`, `Browser`, `Library-Docs`, `Sessions`, `Lab`.

How Claude Code works (`wiki/claude-code/`), for `2.1.296`:

- `Claude-Code-Internals`: the scope, the version, and how the facts are extracted.
- `Request-Build` [`Claude-Mods`]: the system prompt sections, the attachments, and the cache.
- `Tools-And-Deferral`.
- `Hook-Events` [`Hooks`]: the events, their payloads, and the map to the 11 dotclaude events.
- `Plugin-Loader`.
- `Settings-Resolution`.
- `Subagents`.
- `Compaction-And-Context`.
- `Auto-Mode`.
- `Undocumented-Reads`: the settings and env vars that the binary reads and the docs do not name.

Reference (`wiki/reference/`):

- `Settings-Snippet` (generated), `Settings-Snippet-Keys`, `Off-Switches`, `Settings-Schema`.
- `Bounds` (generated from `src/wiki/`): each bound, its value, and its file.

Rationale (`wiki/rationale/`):

- `Design`: the principles.
- `Decisions` and its group pages: each decision in force, as problem, choice, alternatives, and evidence.
  A decision that 1.0.0 reverses moves to the archive.

Evidence (`wiki/evidence/`): `Evidence` (index), `Handoff-Cost`, `Usage-Evidence` [`Plans-and-Models`], `Prompt-Variants`, `Evals`.

Development (`wiki/development/`): `Development`, `Plugin-Layout`, `Sandbox`, `Release-History`.

Archive (`wiki/archive/`): `Archive` (index), the release pages, `Archive-0.28`, `Jev-Plugin-0.28`, the 0.28 eval pages, `OpenSpec-History`, `Stop-Prompt-Hooks`, `Open-Items`, and each reversed decision.

## Steps

1. Skeleton (one run): move each kept page to its folder, and add each new page as a stub with its title and a one-line scope.
   Move the `src/wiki/` sources with their pages.
   Write `_Sidebar.md` and the navigation part of `Home.md` for the map above.
   `just check` passes.
2. Fill: one run for each page, on its own branch `p15-page-<Page>`, merged into `p15`.
   A run of five pages wrote one page before its 61-turn limit, so a run gets one page.
   A run does not run `bun install` or `just check`.
   The main session runs `just check` after each merge.
   A checked box is a page that is merged into `p15`.
   - [x] `Guards`, `Auto-Mode`, `Handoff-Cost`, `Usage-Evidence` (with `Plans-and-Models`), `Prompt-Variants`
   - [x] `Architecture` (with `Core-Plugin`), `Agents`, `Skills`, `Spec-Store`, `Hook-Events` (with `Hooks`), `Tools-And-Deferral`, `Settings-Resolution`
   - [x] `Status-Line`, `Semantic-Line-Breaks`, `Contributions`
   - [x] `Prompt-Surface`, `Context-And-Handoff`, `Second-Opinion`, `Claude-Code-Internals`, `Subagents`, `Plugin-Loader`
   - [x] `Code-Graph`, `Browser`, `Library-Docs`, `Sessions`
   - [x] `Add-Ons`, `Lab`
   - [ ] `Claude-Code-Internals`, `Request-Build` (with `Claude-Mods`), `Tools-And-Deferral`, `Hook-Events` (with `Hooks`), `Plugin-Loader`
   - [ ] `Settings-Resolution`, `Subagents`, `Compaction-And-Context`, `Undocumented-Reads`
   - [x] `Settings-Snippet`, `Settings-Snippet-Keys`, `Off-Switches`, `Settings-Schema`, `Bounds`, `Request-Build` (with `Claude-Mods`), `Compaction-And-Context`
   - [ ] `Design`, `Decisions` and its six group pages, `Decisions-Reversed`
   - [x] `Evidence`, `Evals`, `Development`, `Plugin-Layout`, `Sandbox`, `Release-History`
   - [ ] `Archive`, `Undocumented-Reads`
   - [ ] `Home`, `Install`, `Quickstart`, `Troubleshooting`, `Attributions`, `README.md`, `docs/README.md`, the check of `CHANGELOG.md`
3. Join the branches, run `just generate`, `bun run lint:md`, and `just check`.
4. A reviewer pass for each section, then one run that fixes the list.

## Findings outside the docs

The page runs found these in code and config.
P15 does not own them, so they go to P16 or a new package.

- `tools/generate/order.ts` and `slices/handoff/slice.ts` say that the mod runtime refuses an unfiltered `tool.call` handler, but `register.ts` registers the unfiltered `guard` handler.
- `slices/handoff/domain/context.ts` says that a run at its turn limit returns no report, but the docs and the binary say that partial output returns.
- `slices/handoff/limits.ts` `AGENT_MAX_TURNS` copies `slices/agents/limits.ts` `MAX_TURNS`, against the rule of one place for each bound.
- `slices/statusline/limits.ts` says that `USAGE_REWRITE_MS` is half of an age that `dotclaude-spec runs` trusts, and no such bound is in `src/`.
- `slices/setup/domain/facts.ts`, `slices/handoff/limits.ts`, and `Decisions-Tools` cite `research/` files that are not in the repository.
- `tests/support/plugin-hooks-exist.test.ts` reads only the `hooks` key, so it does not check that `register.ts` exists.
- The `homepage` of `plugin.json` points to `Core-Plugin`, which P15 merges into `Architecture`.
- `package.json` and `plugin.json` say `0.28.0` until `just bump` in P16.
- `slices/styles/slice.ts` sets `outputStyle` in the plugin `settings`, but Claude Code `2.1.296` takes only `agent` and `subagentStatusLine` from plugin settings (the docs, and the strings of the bundle).
  Only the `outputStyle` of the snippet selects the style.
- `slices/agents/domain/turns.ts` `withinTurnBound` has no caller outside the tests.
- `tests/support/import-rules.ts` names `lib` and `features` in `ENTRY_TARGETS` and in its Rule 3.
- `design.md` names `ports.ts` in each slice, `adapters/hook.ts`, and `texts/`, and the tree has `ports.ts` in some slices only, no `adapters/hook.ts`, and `texts.ts` files.
- `slices/asks/weak-limits.ts` holds two bounds that `limits.ts` re-exports.
- `slices/trim/domain/removed.ts` `REMOVED_PARTS` has no importer.
- The `dotclaude-lab` slices have no `limits.ts`: `5` in `slices/eval-compare/domain/compare.ts`, `DEPTH_MAX` in `slices/schema/domain/types.ts`, and `SPLIT_CHARS` in `slices/capture/domain/report.ts`, and the `eval` recipe of `justfile` has `--max-cost-usd 5`.
- Under the load of the full suite, `tests/tools/generate/texts.test.ts` timed out once at 5,000 ms.

## Acceptance

- `bun run lint:md` and `just check` pass.
- Each number has a source: a code path, an `evidence/` file, or a binary fact with its version.
- A reviewer finds no stale claim and no claim without a source.
- No page outside `wiki/archive/` presents 0.x as current.

## Boundaries

- Write the docs in STE-flavored ASD-STE100, with one sentence on each line.
- Put each code item in inline code.
- Do not run `just wiki` and do not push without a decision.
