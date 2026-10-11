# Audit of the repository outside `plugins/`

Date: 2026-10-09.
Branch: `dotclaude-0-28-0`.
"Measured" means a command or a fetched page gave the fact.
"Inferred" means the fact follows from measured facts and a judgment.
Sources: the [Claude Code plugin docs](https://code.claude.com/docs/en/plugins-reference),
the [marketplace docs](https://code.claude.com/docs/en/plugin-marketplaces),
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
[Open Source Guides](https://opensource.guide/starting-a-project/),
the [GitHub community health files](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions),
the [OpenSSF Scorecard](https://github.com/ossf/scorecard/blob/main/docs/checks.md),
and the [Bun docs](https://bun.sh/docs/runtime/env).

## What is sound (measured)

- `claude plugin validate --strict` passes on the marketplace and on all 5 plugins.
- `openspec validate dotclaude-0-28-0 --strict` prints `Change 'dotclaude-0-28-0' is valid`.
- The script in `$TMPDIR/links.mjs` checked 655 Markdown links (wiki pages and relative files) and found 0 broken.
- All 5 plugins have the version `0.28.0`, the same `author`, `repository`, and `license` (4 of 5 have an SPDX `license`: all have `MIT`).
- Entry `name` equals manifest `name` in all 5 plugins.
- CI pins both actions to a commit SHA and uses `permissions: contents: read`.
- `.gitattributes` forces LF, and `.env` is ignored and not tracked.

## Findings, by weight

### F1. CI does not run `just check` (high, measured)

Practice: CI must run the same gate as the local gate, so a merge cannot skip a check.
Source: the project's own rule in `AGENTS.md` ("`just check` ... must pass before done"), and the OpenSSF "CI-Tests" idea.
Evidence: `.github/workflows/ci.yml` runs only `bunx @biomejs/biome@2.5.13 ci plugins tests tools` and `bun test ./tests/`.
`just check` is `lint test validate lab`.
So CI skips `claude plugin validate --strict` (6 runs), `claude plugin test plugins/dotclaude` (the hook lab), and `markdownlint-cli2` (no script, recipe, or CI step runs it, although `AGENTS.md` lists `bunx markdownlint-cli2 README.md`).
The CI runs `biome` from `bunx` at 2.5.13, but `package.json` `lint` calls a bare `biome` that no dependency installs (measured: `package.json` has no `dependencies` or `devDependencies`).
Fix: add a Linux job that installs Claude Code at a pinned version and runs `just check`.
Keep the Windows and macOS matrix for `bun test` only.
Add `@biomejs/biome` as a pinned `devDependency` and a `bun.lock` file, then run `bun run lint` in CI.
Add a `lint:md` script and run it in `just check`.

### F2. No Node pin, and an unpinned Claude Code (high, measured)

Practice: pin every runtime that the build needs, in one place that tools read.
Evidence: `AGENTS.md` says Node.js 22.18 or later.
No `.nvmrc`, `.node-version`, `.tool-versions`, or `engines.node` exists.
`package.json` has `engines.bun >=1.4.2` only.
CI pins Bun `1.4.2` but sets no Node (the runners ship their own Node).
The local Node is v26.10.0, so CI and local differ.
The hook lab needs the `claude` binary, and no file records a minimum version (the research folder says 2.1.296).
Fix: add `engines.node` (`>=22.18`), a `.node-version` file, and a `claude` minimum in `Development.md`.
Test with Node 22.18 in CI, because the runtime scripts target that version (inferred).

### F3. Missing community files (high, measured)

Practice: a public project needs `CONTRIBUTING`, `SECURITY`, `CODE_OF_CONDUCT`, issue and PR templates (GitHub community standards, Open Source Guides).
Evidence: `git ls-files` shows `LICENSE` only.
`.github/` holds `workflows/ci.yml` and nothing else.
`wiki/core/Contributions.md` exists, but GitHub shows no "Contributing" link without a root, `docs/`, or `.github/` file (inferred from the GitHub docs).
This repository ships hooks that run shell commands on user machines.
A `SECURITY.md` with a private report path matters most (inferred).
Fix: add `.github/SECURITY.md`, `.github/CONTRIBUTING.md` (link to the wiki), `.github/CODE_OF_CONDUCT.md`, `.github/ISSUE_TEMPLATE/*.yml`, `.github/PULL_REQUEST_TEMPLATE.md`, and `.github/dependabot.yml` for the Actions SHAs.

### F4. The release scheme does not match the marketplace (medium, measured)

Practice: tag every released artifact in one scheme, and keep the changelog links in step with it.
Evidence: `git tag --list` shows 85 tags: 56 `dotclaude--v*`, 12 `dotclaude-browser--v*`, 12 `dotclaude-jev--v*`, 5 `dotclaude-modder--v*`.
The tag format `<plugin>--v<version>` is the format of `claude plugin tag` (the `justfile` `release` recipe uses it), so the scheme is right.
Gaps:

- `dotclaude-modder` has 5 tags but no plugin by that name exists (it was removed).
- `dotclaude-codegraph` and `dotclaude-docs` have 0 tags (new in 0.28.0, so this is expected until the release).
- `CHANGELOG.md` has one link reference (`[unreleased]`), so the headings `## [0.28.0]` and `## [0.27.0]` are not links.
  Keep a Changelog says each version heading links to a diff (measured: `grep -n '^\[' CHANGELOG.md` gives line 282 only).
- One `CHANGELOG.md` for 5 plugins mixes their changes, and the tags are per plugin.
  A reader cannot tell which plugin got a release (inferred).
- No GitHub Releases are in evidence (not measured: `gh` was not run).
Fix: add the link references with `just bump`, state in the changelog header that all plugins share the version, and delete the `dotclaude-modder--*` tags or note them.

### F5. Marketplace and plugin manifests: thin metadata (medium, measured against the docs)

Practice: the docs list `homepage`, `keywords`, `displayName`, `$schema`, and (for the directory) `supportUrl`, `documentationUrl` as optional fields.
Evidence:

- Only `plugins/dotclaude/.claude-plugin/plugin.json` has `$schema` and `keywords`.
  The other four have neither, and no plugin has `homepage` or `documentationUrl`.
- `marketplace.json` has no `metadata.version`, `metadata.description`, or `strict` field, and its entries have no `version`, `homepage`, `tags`, or `keywords`.
  The docs allow all of these (the marketplace page names `name`, `owner`, `plugins` as the required fields only).
- The marketplace `description` is a top-level field here.
  The docs example also puts `description` at the top level, so this is fine.
- The `description` of an entry differs from the `description` of its `plugin.json` for `dotclaude`, `dotclaude-browser`.
  The marketplace text for `dotclaude-browser` omits "with CloakBrowser when its binary is present".
  Two texts can drift (measured: they differ now).
- `dotclaude-browser` is the only plugin with `userConfig`.
  Its `backend` has no `options` list, although the values are a closed set (`agent-browser`, `cloakbrowser`).
  The docs offer `options` (needs Claude Code 2.1.271 or later) for this case.
- Version is in `package.json`, 5 `plugin.json` files, and the changelog.
  The docs say the manifest `version` wins and pins users, so the bump must change all of them together.
  `just bump` does this (inferred from its comment "in both manifests", which is stale: there are 6 manifests).
Fix: add `homepage` and `keywords` to all plugins, `$schema` to all manifests, `options` to `backend`, and drop `description` duplication (the entry may omit it when the manifest has one, inferred).
Update the `bump` recipe comment.

### F6. Stray and local-tool folders at the root (medium, measured)

Practice: the root holds project files only, and `.gitignore` covers tool state.
Evidence (`ls -A`, `git check-ignore -v`):

- `.DS_Store` at the root, in `docs/`, and in `external/`: ignored by `.gitignore` line 1, and none is tracked.
- `.pytest_cache/` at the root: ignored, but no Python test exists (inferred: `git ls-files '*.py'` finds none in the tests; the folder is old, dated Oct 6).
- `.tgrep/` (a tool index): ignored only by the user's global ignore file `~/.config/git/ignore`, not by the repository.
  A contributor without that global rule sees an untracked folder.
- `.dotclaude/` (empty): ignored only by `.git/info/exclude`, so also local.
- `.codegraph/` holds `codegraph.db` and `daemon.log`: ignored by its own inner `.gitignore` (tracked).
  That file is the only tracked file in the folder, and it is the tool's own file.
- `.claude/commands/opsx/*` and `.claude/skills/openspec-*` (12 files) are tracked.
  They are generated by `openspec update`, which is fine, but `.claude/settings.local.json` exists beside them and is untracked (it is user state, good).
Fix: add `.tgrep/`, `.dotclaude/`, `.codegraph/` to the repository `.gitignore`.
Remove `.pytest_cache/` (and its entry if Python is gone).
Keep the tracked OpenSpec files only if the project wants contributors to share them (question Q3).

### F7. The `.env` at the root (medium, measured plus inferred)

Practice: keep secrets outside the work tree, or load them on demand.
Evidence: `.env` exists (589 bytes, 3 keys by the name list in `.env.example`: `CLAUDE_CODE_OAUTH_TOKEN`, `TYPESAFE_API_KEY`, `CONTEXT7_API_KEY`).
The values were not read.
It is ignored (`.gitignore` line 10) and untracked, so there is no leak in git.
Why `bun` reads it: Bun loads `.env` from the working directory on every `bun` run, unless `--no-env-file` or `bunfig.toml` `env = false` is set (Bun docs).
`bunfig.toml` has no such setting (measured: 2 sections, `[install]` and `[test]`).
So every `bun test` and `bun tools/*.mjs` run puts the 3 tokens into the process and into every child it starts.
Tests run guarded commands as strings only, but `tests/` may start `node` children that inherit the env (inferred, not traced).
What reads the file on purpose: `tools/sandbox.mjs:49` reads `CLAUDE_CODE_OAUTH_TOKEN` from `process.env`, which relies on Bun's auto-load (measured).
The other two keys are for plugin use at run time, not for the repository (inferred).
Risk: a sandboxed agent session in this folder can read the token (the sandbox in this audit denies `**/.env`, which shows the risk is known).
Fix: set `env = false` in `bunfig.toml` and let `tools/sandbox.mjs` read `.env` itself with `process.loadEnvFile` for the one key.
Or move the token to the OS keychain and drop the file.
Remove `TYPESAFE_API_KEY` and `CONTEXT7_API_KEY` from the repository `.env.example`, because the repository does not use them (inferred).

### F8. Root clutter and duplicate configs (low to medium, measured)

| File | Used by | Verdict |
| :- | :- | :- |
| `AGENTS.md` | Claude Code (via `CLAUDE.md`), other agents | Keep |
| `CLAUDE.md` | symlink to `AGENTS.md` | Keep (Claude Code reads `CLAUDE.md`) |
| `GEMINI.md` | symlink to `AGENTS.md` | Question Q4: nothing in the repo uses Gemini |
| `skills-lock.json` | `{"version":1,"skills":{}}`, 35 bytes, empty | Delete: it holds no data (no reader found in `tools/`, `justfile`) |
| `.markdownlint.jsonc` and `markdownlint-cli2.jsonc` | the second only `extends` the first | Merge into one: `.markdownlint-cli2.jsonc` with the rules inline |
| `tsconfig.json` | extends `plugins/dotclaude/.claude-plugin/types/tsconfig.json`, includes `plugins/*/hooks` | Keep, but see F9 |
| `biome.json` | `biome ci` | Keep |
| `bunfig.toml` | `isolated` linker, test preload | Keep (add `env = false`, F7) |
| `docs/README.md` | links to the wiki only (AGENTS.md rule) | Question Q5: a 16 KB folder for one link list |
| `external/` | 231 MB, 153 entries, ignored | Keep (local sources), but see F10 |
| `schemas/` | 2 generated files, 1329 and 1188 lines | Keep |
| `.codegraph/`, `.tgrep/`, `.dotclaude/`, `.pytest_cache/` | local tools | See F6 |

### F9. Toolchain config details (low, measured)

- `package.json` `validate` repeats the 6 plugin paths by hand.
  A 7th plugin needs a manual edit (inferred).
  A loop over `plugins/*/` would be right (the `update` recipe already does this).
- `justfile` recipes `test`, `lint`, `validate` only wrap `package.json` scripts or `bun test`.
  `check` runs them.
  This is a duplicate layer: the scripts and the recipes both define "lint" and "validate" (inferred).
  Pick one front door.
- CI runs `bun test ./tests/` and `biome ci` directly, so CI is a third copy of the commands.
- `tsconfig.json` includes only `plugins/*/hooks`.
  `tests/` and `tools/` are not type-checked, and no script runs `tsc` (measured: no `tsc` in `package.json`, `justfile`, or CI).
  The `types` folder is a Claude Code mod type set, so the check may run through `claude plugin validate` (inferred, not traced).
- `biome.json` enables `css` and `html` linters although no `.css` or `.html` file is in scope (inferred from `files.includes`, which lists JS, TS, and JSON only).
- `biome.json` `$schema` is `2.5.13`, and CI pins `2.5.13`: they match.
- `.gitattributes` is `* text=auto eol=lf`: fine.

### F10. `external/` and repository weight (low, measured)

`external/` is 231 MB and untracked (ignored), so it does not enter the clone.
A fresh contributor cannot rebuild it (no `just` recipe fetches it).
Docs and the research files cite sources in `external/` (inferred: `AGENTS.md` says "holds local sources").
Fix: add a manifest of the sources (URL and commit) so the folder is reproducible, or cite URLs only.

### F11. OpenSpec state (medium, measured)

Practice: the OpenSpec guide wants a small, short-lived change that ends in `archive`, with specs in `openspec/specs/`.
Evidence:

- `openspec/` has `config.yaml`, `changes/`, and no `specs/` folder.
  `config.yaml` is the unedited template: only `schema: spec-driven` is active, and the rest is comment lines.
- `openspec/changes/archive/` holds a `.gitkeep` only: no change was ever archived.
- `openspec/changes/cli-tool-routes/` holds only `.openspec.yaml`, with no `proposal.md`: an empty change (measured: the folder lists `{}` for content).
- `dotclaude-0-28-0` has 30+ files: `proposal.md` 175 lines, `design.md` 299, `design-parts.md` 285, `design-parts-2.md` 257, `design-parts-3.md` 88, `tasks.md` 256, `tasks-done.md` 144, 18 spec deltas, and `research/` with 29 items (452 KB, 4614 lines).
  `tasks.md` has 161 done and 10 open items, so 94 percent is done but the change is not archived.
  The design is split by size only (`design-parts*.md`), not by concern, which breaks the repository rule "split into files that each hold one concern" (inferred from the names).
- Stale deltas: `specs/model-router/spec.md` says "dotclaude has no router", and `specs/settings-profile/` and `specs/vanilla-surface/` exist too.
  The README says 0.28.0 "removes the setup profile, the router, and the handoff skill".
  A delta spec for a removed feature should be a `REMOVED` requirement or a deleted folder (inferred).
- There are no `## MODIFIED` or `## REMOVED` deltas against a base spec, because no base spec exists (inferred from the missing `openspec/specs/`).
  Every spec is an `ADDED` pile, which does not describe a change from a baseline.
- Git status shows `bundle-2.1.295.md` deleted and `bundle-2.1.296.md` and `schema-2.1.295.md` coexist: the research names two Claude Code versions.
Fix: finish the 10 open tasks, run `openspec archive dotclaude-0-28-0` at release, delete `cli-tool-routes`, fill `config.yaml` `context` with the 5 constraints in `AGENTS.md`, move `research/` into the wiki or into a `docs/research` folder that is not an active change.

### F12. Docs and wiki (medium, measured)

- `README.md` 129 lines: sound, links to the wiki, has install, update, development, and license sections.
  It has no badge, no screenshot of the status line, and no "Requirements" section (Claude Code version, Node).
  The Update section says "0.27.0 is a rebuild ... 0.28.0 removes ..." in the body, which is release-note text in a README (inferred).
- `wiki/` has 71 pages, 7724 lines.
  27 are old-release pages (`Release-0.1-0.2` to `Release-0.26`), 252 lines for `Release-0.20.md` alone.
  The changelog is the single record of a release (Keep a Changelog), and these pages repeat it for 0.1 to 0.26 (inferred from the `CHANGELOG.md` "Older Releases" table that links to them).
  The pages are not broken (0 broken links), but they sit in the same index as live docs.
- `wiki/` has `Evals-0.28.0.md`, `Evals-History.md`, `Evals.md`, and six `Decisions-*.md` pages: the split looks done by size (inferred).
- The sidebar has 51 lines.
- `docs/README.md` links the wiki by full URL, and the `wiki/` pages link each other by bare page name: both forms work (measured).
- The wiki lives in a second repository (`dotclaude.wiki`), published with `just wiki` (`rsync --delete`).
  A PR cannot review wiki edits there, and the clone step fails until a first page exists (the `justfile` comment says so).
  Contributors cannot send wiki fixes by PR (inferred).
Fix: collapse the 27 release pages into the changelog or into one `Release-History` page.
Or move `wiki/` to `docs/` in the repository, and let a CI job publish it.

### F13. Git history and branches (low, measured)

- 2 of the last 200 commit subjects start with `wip:`, and one (`a513934`) is a 'tree before the wipe' commit in the release line.
- Branches `worktree-agent-*` (3), `reset/0.20.0`, `v0.27`, and `origin/v0.27` remain.
  Stale agent worktree branches are clutter (inferred).
- The commit subjects use a style (`dotclaude 0.28.0: ...`) that is not Conventional Commits.
  This is fine if documented: `wiki/core/Contributions.md` was not checked.
- 19 files in `git status` are modified and not committed.
  This audit did not touch them.

### F14. File-size bound (low, measured)

`AGENTS.md` says 300 lines per file and 500 per test file, with `schemas/` out of scope.
Files over 300 lines outside `plugins/`: `schemas/claude-code-managed-settings.json` (1329), `schemas/claude-code-settings.json` (1188), `tests/dotclaude/status-render.test.mjs` (364, under the 500 bound), `tests/dotclaude/imports.test.mjs` (301, under the 500 bound), `.claude/skills/openspec-explore/SKILL.md` (354, generated by OpenSpec).
No violation of the rule as written, except that the generated `.claude/` file is not named as out of scope (inferred).

## Questions for the user

- Q1: Should CI install Claude Code and run `just check`? This needs a pinned `claude` version and a login-free path for `claude plugin test` (not measured: whether the lab needs a token).
- Q2: Should `bunfig.toml` set `env = false`, with `tools/sandbox.mjs` loading only the one token it needs?
- Q3: Do contributors share the tracked `.claude/commands` and `.claude/skills` files from OpenSpec, or should they be ignored?
- Q4: Is `GEMINI.md` wanted?
- Q5: Should `docs/` go, so that the wiki is the only doc home? Or should the wiki move into the repository?
- Q6: Do you want the 27 `Release-*` wiki pages and the `dotclaude-modder--*` tags kept?
- Q7: Is one shared version for all 5 plugins a decision, or would each plugin version alone (the tags already work per plugin)?
