# Audit of `plugins/`, part 2

Part 1 is `audit-plugins.md` (sections 1 to 4).
Labels are the same: **measured** and **inferred**.

## 5. Duplicated logic (inventory, measured)

| Item | Places | Fix |
| --- | --- | --- |
| Test for `DISABLE_COMPACT` | `register.mjs:114`, `context/rules.mjs:62` (comment says "the same test") | `lib/budget.mjs` or `lib/env.mjs` |
| Window clamp `min(size \|\| CONTEXT_WINDOW, CONTEXT_WINDOW)` | `statusline/render.mjs:20`, `segments.mjs:161`, `subagents.mjs:21` | one `windowOf(size)` |
| Read the end of a file | `adherence/cli.mjs:33`, `context/cli.mjs:36`, `statusline/context-table.mjs:64` | `lib/tail.mjs` (classic code, so `node:` is allowed outside the hooks graph) |
| Line count | `adherence/text.mjs:59`, `reads/cli.mjs:14` | one function |
| `isMarkdown` | `adherence/rules.mjs:14`, `sembr/rules.mjs:7` (differ: one checks `typeof`) | `lib/` |
| Model-id regex | `statusline/format.mjs:5`, `segments.mjs:13`, `context/rules.mjs:38`, `prompt/select.mjs:20` | one `parseModel(id)` returning `{family, major, minor}` |
| `CONTEXT_BLOCK_MARGIN` | `context/limits.mjs:39`, `statusline/limits.mjs:33` | `lib/budget.mjs` (a "shared runtime bound") |
| Confidence bound | `jev/cli.mjs:25`, `jev/limits.mjs:4` | import `limits.mjs` |
| Wrapper-command lists | `guard/shell.mjs:12`, `reads/bounds.mjs:98,108`, `adherence/git.mjs:62` | F1 |
| `AGENTS_DIR` strip `dotclaude:` | `context/turns.mjs:41`, `statusline/subagents.mjs:18` (`/^[^:]+:/`) | one helper |

## 6. Smells named by the refactor skill

If-else chains on one value (use a lookup table or `switch`):

- `reads/bounds.mjs:206-264` `kind()` on `name` (13 branches).
  Fix: a table `{ git: gitKind, ls: lsKind, jq: jqKind, yq: jqKind, find: findKind, fd: findKind, ... }`.
- `adherence/git.mjs:99-129` `movesWork` on `sub` (`stash`, `checkout`, `restore`, `reset`).
  Fix: `switch (sub)` with one function for each case.
- `surface/rules.mjs:30-42` `attachmentText` on `type` (4 branches).
  Fix: a table `{ sandbox_instructions: ..., auto_mode: ..., session_context: ..., agent_listing_delta: ... }`.
- `reads/split.mjs:49-85` `pipelines` on the character `c` (12 branches in a loop).
  Fix: a small state machine with one function for each state.
- `adherence/git.mjs:23-57` `commands` on `c` (8 branches, nesting depth 4, the deepest in `plugins/`).

Flag (boolean) arguments:

- `guard/vars.mjs:13` `plain(rest, glob = false)`.
- `reads/bounds.mjs:171,186,206` `jqKind(name, args, first)`, `findKind(args, first)`, `kind(stage, first)`, called with `first || xargs`.
- `adherence/spans.mjs:23,53,109` `blankBlocks(text, fenced)`, `prose(text, fenced)`, `bareItems(text, fenced)`.
- `sembr/rules.mjs:78` `rewriteBody(lines, keepFirst)`.
- `statusline/segments.mjs:86` `limitText(..., span)` where `span = 0` means "no pace" (`fableText` passes `0`).
  Fix for each: two functions or a named option.

Mutable out-parameters (output arguments):

- `guard/vars.mjs:59,85,165` `readAssignments`, `forgetAssigned`, `forgetSetters` mutate `known` and `state.taint`.
  `guard/rules.mjs:66-77` calls all three in a fixed order.
  Fix: return a new `{ known, taint }`.

Deep nesting and long functions (**measured** with `$TMPDIR/fn.mjs`, which over-counts `kind()` because of `{` in regex text):

- `adherence/git.mjs` `commands` 54 lines, depth 4.
- `guard/rules.mjs:56` `rmOutside` 47 lines, depth 3, 7 locals.
- `statusline/grid.mjs:64` `gridRows` 70 lines.
- `lib/sembr.mjs:97,170` `protectedLines` 56 lines and `format` 48 lines with 5 mutable flags (`listOpen`, `listIndent`, `listCode`, `esm`, and `skip`).
  Fix: split on the state, not on the length.

Primitive obsession:

- `reads/bounds.mjs`: `{ type: "bounded" | "filter" | "producer" | "other" }` as string literals in many places.
  Fix: a frozen `Kind` object.
- `statusline/place.mjs:39-85` and `segments.mjs:143-190`: `add(priority, text, id)` with bare numbers 1 to 10.
  Fix: `PRIORITY.folder`, and so on, in `limits.mjs`.
- `context/levels.mjs:14`: `step: "notice" | "handoff"` strings.
- `dotclaude-browser/.claude-plugin/plugin.json`: `userConfig.backend` is a free `string` with two valid values.

Single-use or test-only abstractions:

- `statusline/credits.mjs:88` `readCredits` is a forwarding wrapper with no caller in `plugins/` (tests only).
- `prompt/variants.mjs:139` `variantText` (tests only).
- `context/levels.mjs` (17 lines, one function, one caller), `statusline/render.mjs` (27 lines), `prompt/data.mjs` (9 lines).
- Dead constants (no reader in code): `statusline/limits.mjs:5` `REFRESH_SECONDS`, `lib/budget.mjs:24` `BASH_OUTPUT_MAX_CHARS` (docs only), `context/limits.mjs:49,52` `NOTE_MAX_BYTES`, `RESULT_MAX_CHARS`, `adherence/limits.mjs:5` `HOOK_TIMEOUT_S`, `browser limits.mjs:23` `SESSION_NAME_MAX`.
  They are bounds that exist so that a test can pin them.
  This is allowed by `AGENTS.md` ("Tests pin the copies"), but `REFRESH_SECONDS` has no pin and no reader.
- Unused import: `adherence/cli.mjs:14` (`path`).

Comments:

- Restating: `browser/search.mjs:35` ("The URL of the search page for a query"), `jev/tool.mjs:83` ("The name of the tool for the model"), `context/turns.mjs:9` ("The folder of the agent files of this plugin").
- Broken sentence: `sembr/rules.mjs:1` ends with a comma and the next line starts a new topic.
- Pointers to planning documents that do not ship: 38 references (`design D22`, `task 18.14`, `probe 2.29`, `case S2`, `research/...`) in 26 files.
  The change under `openspec/changes/` will archive, and `plugins/` ships alone.
  Fix: keep the reason in the comment and drop the id, or point to a `wiki/` page.

Long parameter lists: none above 4 (`buildBody`, `closeSession`, `readAssignments`, `limitText`, `codegraph`, `runClient` all have 4).
The skill threshold is "about 4", so this smell is absent.

## 7. Special cases for one test or one eval (inferred)

- Test seams in shipped signatures: `context/cli.mjs:62-66,80-83` (`read`, `readAll`, `agentsDir`, `env`), `adherence/cli.mjs:50` (`io`), `reads/cli.mjs:26` (`count`).
  Comments say "replaces the read in a test".
  This is ordinary injection and low cost, but `readCredits`, `variantText`, and the six constants in section 6 are exports with a test as the only user.
- Tuned to one observation: `context/limits.mjs:44` ("an eval run of 2026-10-09"), `drift/rules.mjs:82` ("In an eval run, Claude changed `/config/settings.json`").
- `agents/*.md`: `maxTurns` is 61, 61, 31, 41, 16.
  `wiki/design/Open-Items.md` says the model and effort come from a search in a removed harness.

## 8. Where the claim does not hold

- Import rules: 0 violations in 66 files, and `imports.test.mjs` enforces them.
- File length: 0 files over 300 code lines.
  `reads/bounds.mjs` is 297 raw lines, 3 under the cap.
  I could not tell if the cap caused the split `bounds`, `split`, `advice`. **inferred**
- Suppressions: 0 `biome-ignore`, `@ts-ignore`, or `eslint-disable` in `plugins/`, `tests/`, `tools/` (1 hit is a regex in `tests/support/code-items.mjs`).
- Compat code: no `legacy`, no polyfill, no deprecated alias, no stored-format reader, no `utils` or `helpers` module, no feature flag.
  Version branches: `TESTED_VERSION` (F4h) and `OPENSPEC_MIN` (`setup/openspec.mjs:14`, a real minimum).
- Retries: one (`jev/cli.mjs:153`).
- Biome: 1 warning in shipped code.
- Live change coupling: only the version files.
- Plugin separation: `dotclaude-jev`, `dotclaude-browser`, `dotclaude-codegraph` each work alone.
  The `reviewer` mention in `jev/tool.mjs:124` is text, not an import.

## 9. Ranking

| Rank | Finding | Basis |
| --- | --- | --- |
| 1 | F1 four shell parsers, 23 percent of runtime lines, diverged | measured |
| 2 | F3 two hook runtimes, duplicate features, 7 glue copies | measured |
| 3 | F4 reads of private data and the drift nag | measured |
| 4 | F2 `bounds.mjs` against `bashOutputMaxChars` | measured and inferred |
| 5 | F5 36 silent catches, cached empty `owners` | measured, cache inferred |
| 6 | F6 context handoff after compaction off | inferred |
| 7 | F7 style plus variants | measured |
| 8 | F10 no type check, 81 `any` | measured |
| 9 | F8 jev retry/timeout, bound rule break | measured |
| 10 | F9 browser `WebSearch` override | inferred |
| 11 | Section 5 duplicates | measured |
| 12 | F11 stale metadata | measured |

## 10. Questions for the user

- Q1. Is the `rm` outside the project guard (about 430 lines in `guard/`) worth keeping, when the sandbox and an `ask` rule `Bash(rm -r *)` exist?
  The cost of the rule is more prompts inside the project.
- Q2. Do you accept that the engine setting `bashOutputMaxChars` replaces the unbounded-output deny (`reads/bounds.mjs`)?
  The file-print to `Read` rule can stay.
- Q3. Does the context handoff feature (`features/context/`) stay, now that compaction is off by choice?
- Q4. Is a status line segment from `~/.claude.json` (`cedar_ember`) and from the `/context` table scrape worth a break at each release?
- Q5. Is the DuckDuckGo `WebSearch` override wanted, or do you prefer an MCP browser server?
- Q6. Should the drift check move out of the session path into `tools/`?
