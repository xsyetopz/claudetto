# Audit of `tools/` and `justfile` recipes

Date: 2026-10-09.
Claude Code: 2.1.296.
Scope: report only.
No file other than this one changed.
Labels: **measured** (a command or a source shows it) and **inferred** (a reasoned step).

## 1. Inventory

Line counts are from `wc -l` (measured).
The `tools/` tree has 23 files and 2,819 lines.
No file is above 300 lines.

| File | Lines | What it does | Repo-specific parts |
| --- | --- | --- | --- |
| `tools/measure.mjs` | 127 | Reads a transcript and prints first-request tokens, tool sizes, system blocks, attachments, subagent runs, tool-result sizes, repeat reads. Exit 1 above a bound. | `START_TOKENS` (`:16`, `:114`), `FIRST_REQUEST_*_BYTES` via `sizes.mjs`, default session search by `cwd` (`:32-42`) |
| `tools/measure/start.mjs` | 96 | Pure readers: first request, `prompt_snapshot` sizes. | none found |
| `tools/measure/transcript.mjs` | 63 | Reads `.jsonl` entries. | none found |
| `tools/measure/usage.mjs` | 125 | Subagent runs, tool results, repeat reads. | none found |
| `tools/usage-report.mjs` | 146 | CLI of the usage report (`--days`, `--root`, `--runs`, `--json`, `--verdicts`). | `CONTEXT_WINDOW` import from `plugins/dotclaude/lib/budget.mjs` (`:32`), `verdicts.jsonl` path of plugin `dotclaude-dotclaude` (`:54-64`) |
| `tools/usage/report.mjs` | 265 | One pass over all transcripts: cost, agent share, cache rewrites, entrypoints, rate limits, `Skill` calls. | `CONTEXT_WINDOW` (`:5`, `:203`), `maxTurns(type)` of `dotclaude:*` agents (`:60`) |
| `tools/usage/summary.mjs` | 114 | Builds the report object from the sums. | `verdictsFile` (`:30`, `:77`) |
| `tools/usage/parse.mjs` | 147 | Price table, cost of a call, brief stats, verdict counts. | `PRICES` is a copy of list prices (`:7-12`), `verdictRule` parses dotclaude guard reasons (`:119-140`) |
| `tools/usage-lib.mjs` | 74 | `maxTurns` from `plugins/dotclaude/agents/<n>.md`, `reserve`, `tokens`, turn parsing. | reads `plugins/dotclaude/agents` (`:8-15`) through `import.meta.dir` |
| `tools/capture.mjs` | 115 | Local logging proxy to `api.anthropic.com`. Writes request bodies, no headers. Sizes the first request with `count_tokens`. | default out dir `$TMPDIR/dotclaude-capture` (`:36`), `Bun.serve` (`:60`) |
| `tools/capture/report.mjs` | 209 | Splits a request into tools, blocks, sections. Calls `count_tokens`. | none found beyond `UPSTREAM` |
| `tools/sandbox.mjs` | 206 | Runs `claude` with `CLAUDE_CONFIG_DIR`, `HOME`, and a trusted empty git project in `$TMPDIR`. Loads each `plugins/*` with `--plugin-dir`. Reads the login token (Keychain or `~/.claude/.credentials.json`). | `REPO` and `plugins/` scan (`:33`, `:171-177`), `DOTCLAUDE_SANDBOX*` env names, `Bun.which` (`:152`), `import.meta.dir` (`:33`) |
| `tools/start-run.mjs` | 71 | Chains `sandbox --clean`, `capture`, `sandbox`, then `measure`. | `REPO` (`:17`), `DOTCLAUDE_SANDBOX` (`:23`), spawns `bun` (`:25-37`), `ENABLE_TOOL_SEARCH` (`:50`) |
| `tools/debug-agents.mjs` | 49 | Runs one headless sandbox session with `--debug-file`, greps for unknown-field lines. | `REPO` (`:15`), spawns `bun tools/sandbox.mjs` (`:21-26`) |
| `tools/eval-variant.mjs` | 63 | Runs `claude plugin eval` on the checkout and on a git ref in a worktree. | `plugins/dotclaude` (`:53`, `:55`, `:58`), `--allow-tools Bash,Write,Edit` (`:44`), `--max-cost-usd 5` |
| `tools/schema.mjs` | 138 | Writes the settings JSON Schema from the installed bundle. | default out `../schemas` (`:121`), `TYPES` table per bundle version |
| `tools/schema/scan.mjs` | 203 | Brace scanner for the minified bundle. | none |
| `tools/schema/types.mjs` | 174 | Type-helper table per version, to JSON Schema. | version table (measured: changes each build) |
| `tools/schema/spans.mjs` | 121 | Puts code items of descriptions in backticks. | the house rule of `AGENTS.md` |
| `tools/schema/managed.mjs` | 35 | Marks managed-only keys. | none |
| `tools/bump-version.mjs` | 119 | Edits `package.json`, `plugins/*/.claude-plugin/plugin.json`, `CHANGELOG.md`. | all (`:3`, `:47`) |
| `tools/sizes.mjs` | 109 | Size checks of `CLAUDE.md`, skill metadata, first request. | all bounds in `limits.mjs` |
| `tools/limits.mjs` | 50 | Repository bounds incl. `START_TOKENS = 13_308`. | all |

`justfile` recipes (measured, `justfile` read in full):

| Recipe | Runs | Note |
| --- | --- | --- |
| `test`, `lint`, `validate`, `check` | `bun test`, `biome ci`, `claude plugin validate --strict` | repo only |
| `lab` | `claude plugin test plugins/dotclaude` | repo path |
| `sandbox`, `sandbox-clean` | `tools/sandbox.mjs` | |
| `capture` | `tools/capture.mjs` | |
| `measure` | `tools/measure.mjs` | |
| `usage` | `tools/usage-report.mjs` | |
| `wiki` | inline bash, clones `xsyetopz/dotclaude.wiki.git` | repo only |
| `update` | `claude plugin marketplace update dotclaude`, loops `plugins/*/` | marketplace name hardcoded |
| `bump`, `release` | `bump-version.mjs`, `claude plugin tag` per plugin and atomic push | repo only |
| `schema` | `tools/schema.mjs` | |
| `eval` | `claude plugin eval plugins/dotclaude ...` | repo path |
| `eval-variant` | `tools/eval-variant.mjs` | `ref` is a named param, but the script gets `"$@"` (see section 6) |
| `debug-agents`, `start-run` | the scripts of the same name | |

Callers and tests (measured by `grep -rIn` over the repo, minus `node_modules`, `.git`, `external`):

| Tool | Imported or called by | Tests |
| --- | --- | --- |
| `measure.mjs` + `measure/*` | `justfile`, `start-run.mjs` | `tests/dotclaude/measure.test.mjs` (200 lines) imports `reportOf` and the readers |
| `sizes.mjs` | `measure.mjs` (only `checkFirstRequestBytes`), tests | `tests/support/sizes.test.mjs` (187) |
| `limits.mjs` | `measure`, `sizes`, `tests/support/file-size.test.mjs`, `tests/dotclaude/agents.test.mjs`, `measure.test.mjs` | via those |
| `usage-report.mjs`, `usage/*`, `usage-lib.mjs` | `justfile` | **none** (no match in `tests/` for `usage-report`, `usage/parse`, `callCost`, `usage-lib`) |
| `capture.mjs`, `capture/report.mjs` | `justfile`, `start-run.mjs` | **none** |
| `sandbox.mjs` | `justfile`, `start-run.mjs`, `debug-agents.mjs`, `wiki/plugins/Sandbox.md:16` | **none** |
| `start-run.mjs`, `debug-agents.mjs`, `eval-variant.mjs` | `justfile` only | **none** |
| `schema.mjs` + `schema/*` | `justfile` | `tests/dotclaude/schema.test.mjs` (238), `schema-spans.test.mjs` (88), `status-table.test.mjs` |
| `bump-version.mjs` | `justfile` | **none** (no `bump`/`nextVersion` match in `tests/`) |

`tests/dotclaude/imports.test.mjs:97` pins that no `plugins/` file imports `tools/` (measured).
`tools/usage*.mjs` import `plugins/dotclaude/lib/budget.mjs`.
That direction (tools to plugins) is allowed.

## 2. Classification

| Tool | Class | Reason |
| --- | --- | --- |
| `measure` family | (a) universal core, with a repo-only gate | The readers use only the documented transcript format. The `START_TOKENS` gate and `sizes.mjs` bounds are repo-only. |
| `usage-report` family | (a) | Reads `~/.claude/projects`. The `dotclaude:*` `maxTurns` and `verdicts.jsonl` parts are repo-only. |
| `capture` family | (a) | A generic request logger and `count_tokens` sizer. |
| `schema` family | (a) | Extracts the settings schema from any installed bundle. The `TYPES` table is per version, so it needs upkeep. |
| `sandbox` | (a) | A clean config, `HOME`, and trusted project for any plugin. The `plugins/` scan is the repo part. |
| `debug-agents` | (a) | Generic check of a plugin for unknown frontmatter fields. |
| `eval-variant` | (a) | A/B of two git refs through `claude plugin eval`. |
| `start-run` | (a) glue of capture, sandbox, measure | |
| `bump-version`, `release`, `wiki`, `update` recipes | (b) | Name paths, remote, and marketplace of this repo. |
| `sizes.mjs`, `limits.mjs` | (b) | Repository bounds. The first-request byte check could join `measure` as an optional bound (inferred). |
| `lab`, `eval`, `check`, `test`, `lint`, `validate` | (b) | Repo gates. |

### (c) dead or superseded

No whole tool is dead (measured).
Every `tools/*.mjs` file has a caller in `justfile` or in another tool.
The evidence of `grep` found these parts to be dead or weak:

- `tools/sizes.mjs` `checkSizes`, `parseSkill`, `skillMetaBytes` (`:21-98`): measured, only `tests/support/sizes.test.mjs` calls them.
  `measure.mjs:26` imports only `checkFirstRequestBytes`.
  No recipe checks `CLAUDE.md` or skill sizes.
  Class: test-only code, and the check is not part of `just check` except through that test.
- `tools/usage/parse.mjs` `verdictCounts`, `verdictRule` and the `--verdicts` option: measured, they read `plugins/data/dotclaude-dotclaude/verdicts.jsonl`.
  Inferred: a guard that writes that file may be gone.
  Check `grep -rn verdicts plugins/dotclaude` before a port (not run in this audit).
- Superseded in part by built-ins (measured in the bundle, section 3): the cost and limit shares of `usage-report`.
- `tools/usage-lib.mjs:1` header: "The 0.19.1 hook libraries held them."
  Stale comment.
- `justfile` `eval-variant ref *args`: measured, the recipe passes `"$@"`, and `ref` is the first of them, so it works.
  The named `ref` is unused in the body.
  Not a defect.

## 3. Built-ins of Claude Code 2.1.296

Measured with `grep -a -o` over `/Users/krystian/.local/share/claude/versions/2.1.296` (read only):

- `/usage`, aliases `cost` and `stats`: "Show session cost, plan usage, and what's contributing to your limits", with `supportsNonInteractive:!0`.
- `/context`: "Show current context usage", non-interactive mode, plus a colored grid in the interactive form.
- `/insights`: "Generate a report analyzing your Claude Code sessions".
- `--debug-file` appears 18 times.
  `claude plugin eval`, `plugin tag`, `plugin test`, `plugin validate` exist (the repo already calls them in `justfile`).
- `skill-doctor` appears 21 times (the agent list names a `/skill-doctor` report).

Effect (inferred):

- `usage-report` overlaps `/usage` for the totals.
  It still adds a cross-session, multi-day view by agent type, cache rewrites, and delegation share.
  I did not run `/usage` to compare fields, so the overlap size is open.
- `measure` overlaps `/context` for one live session.
  It adds the per-request transcript view after the fact, per-subagent context, and repeat reads.
- `capture` has no built-in.
  `--debug-file` writes a log, and I found no request body dump in it (not tested).
- `sandbox` has no built-in.
  `CLAUDE_CONFIG_DIR` is the documented lever (used already).
- `debug-agents` is a thin case of `claude --debug-file` plus a grep.
  `claude plugin validate --strict` already reports unknown manifest fields (docs: "reports each unrecognized top-level field as a warning").
  It does not cover agent frontmatter (inferred, not tested).
- `eval-variant` has no built-in A/B of git refs.

## 4. Delivery forms

Docs (fetched this session from `code.claude.com/docs/en/plugins-reference` and `/skills`):

- `bin/`: "Files here are on the Bash tool's `PATH` while the plugin is enabled, so Claude runs them as bare commands."
  claude.ai and Cowork do not install a plugin that has `bin/`.
- Skills: "Skills can bundle and run scripts in any language."
  `${CLAUDE_SKILL_DIR}` resolves in the skill body and in `allowed-tools`.
  Example: `allowed-tools: Bash(${CLAUDE_SKILL_DIR}/scripts/render.sh *)` runs with no prompt.
- `disable-model-invocation: true` stops Claude from loading a skill on its own.
  Use it for tools with side effects.
- `${CLAUDE_PLUGIN_ROOT}` is not in the environment of Bash commands.
  A skill body must write `${CLAUDE_SKILL_DIR}` inline.
- Commands: "Prefer `skills/` for new plugins."
- Existing shapes (measured): `plugins/dotclaude-codegraph/bin/dotclaude-codegraph-check` is `#!/usr/bin/env node`, imports `../features/graph/cli.mjs`.
  `plugins/dotclaude-docs/skills/docs/SKILL.md` has `allowed-tools: Bash(... *)` and one `npx` call, no script.
  Both manifests have only `name`, `version`, `description`, `author`, `repository`, `license`.

| Tool | Proposed form | Reason |
| --- | --- | --- |
| usage report | Skill `usage` with `scripts/usage.mjs`, `disable-model-invocation: true`, plus a `bin/` wrapper | Read-only, on demand. The user asks, Claude runs and explains. |
| measure | Skill `measure` with `scripts/measure.mjs` | The output is long. Claude reads it and answers. |
| capture | `bin/dotclaude-capture` (a long-running proxy that needs its own terminal) with a skill that tells the user how to run it | A skill cannot hold a foreground server. The Bash tool of an agent sandbox may block a local listen (`wiki/design/decisions/Decisions-Layout.md:56`, measured). |
| schema extract | `bin/` executable, no skill | A maintainer tool for plugin and editor authors. Few users. |
| sandbox | `bin/dotclaude-sandbox` | A shell tool the user runs outside a session. `PATH` of the Bash tool is what `bin/` gives, so Claude could run it, but the sandbox opens an interactive TUI. A headless `-p` use works. |
| debug-agents | Fold into the sandbox tool as `--check-frontmatter` | 49 lines, one grep on a debug log. |
| eval-variant | Skill `eval-compare` with a script | Claude can pick the ref and read the two tables. Costs money, so `disable-model-invocation: true`. |
| start-run | Repo only, or a `measure --run` flag | It needs a TTY and two tools. |
| bump, release, wiki, update | Repo only | See section 6. |

Constraints that apply (from `AGENTS.md`, measured):

- Runtime plugin code is `.mjs`, Node 22.18+, `node:` modules only.
- An add-on plugin imports nothing from another plugin.
  So `measure` and `usage` cannot both import one shared `transcript.mjs` across two plugins.
  Put them in one plugin, or copy the parser (inferred: one plugin is simpler).
- Nothing in `plugins/` imports `tools/` (pinned by `imports.test.mjs:97`).
  A moved tool must take its `limits`, `CONTEXT_WINDOW`, and `PRICES` into its own plugin `lib/`.
- A file in the import graph of `hooks/register.mjs` has no `node:` import.
  The new tools are not hooks, so this rule does not bind them (inferred).
- "No runtime JavaScript for a feature that Claude Code has": `/usage` and `/context` cover part of `usage` and `measure`.
  The port must state what it adds beyond them (multi-day, per-agent-type, after-the-fact, per-request).

## 5. Proposed grouping

Existing add-ons are named `dotclaude-<noun>` (`codegraph`, `docs`, `browser`, `jev`).
Proposal (inferred):

1. **`dotclaude-sessions`** (new add-on).
   - Skills `usage` and `measure` over one shared `lib/transcript.mjs`.
   - `bin/dotclaude-usage` and `bin/dotclaude-measure` as thin wrappers.
   - Removes: `CONTEXT_WINDOW` import (take it as `--window N`, default read from the `model` name or `200000`), `START_TOKENS`, `sizes.mjs` bounds (make `--bound N` required to fail), `maxTurns` of `dotclaude:*` agents (read `maxTurns` from any plugin's `agents/*.md` under `--agents-dir`, or drop), `verdicts.jsonl`.
1. **`dotclaude-lab`** (new add-on, "plugin development kit").
   - `bin/dotclaude-sandbox`, `bin/dotclaude-capture`, `bin/dotclaude-schema`.
   - Skill `eval-compare`.
   - A flag `--check-frontmatter` for the old `debug-agents`.
   - Capture and sandbox use `node:http` and `fetch`, so no Bun.
1. **Stay in the repository**: `bump`, `release`, `wiki`, `update`, `lab`, `check`, `test`, `lint`, `validate`, `sizes.mjs`, `limits.mjs`, `start-run` (as a thin recipe that calls the two bins).
1. **Self-management by the marketplace** (optional): a skill `dotclaude-release` is possible, but it names this repo's files, so it is a doc in `wiki/development/Development.md` and not a plugin (inferred).

Why two plugins and not one: the session readers need no network and no TTY.
The lab tools open a proxy and a TUI and need the login token.
A user who wants only the report should not install a proxy (inferred).

## 6. Bun-only APIs and repository assumptions to remove

Bun-only (measured by `grep -nE`):

| Where | Item | Node 22.18 replacement |
| --- | --- | --- |
| `tools/capture.mjs:60` | `Bun.serve({hostname,port,idleTimeout,fetch})` | `node:http` `createServer`, stream the body, set `server.requestTimeout = 0` |
| `tools/sandbox.mjs:152` | `Bun.which("claude")` | a `PATH` walk with `node:fs` `accessSync`, or `spawnSync("which")` |
| `tools/sandbox.mjs:33`, `start-run.mjs:17`, `debug-agents.mjs:15`, `eval-variant.mjs:17`, `bump-version.mjs:93`, `usage-lib.mjs:11` | `import.meta.dir` | `import.meta.dirname` (Node 20.11+). `schema.mjs:121` already uses it. |
| `usage-report.mjs:40`, `measure.mjs:111`, `schema.mjs:138`, `bump-version.mjs:89` | `import.meta.main` | Node added it in 24.2 and 22.18 (inferred from memory, not run). Pin and test on 22.18, else compare `process.argv[1]` with `import.meta.filename`. |
| all `tools/*.mjs` line 1 | `#!/usr/bin/env bun` | `#!/usr/bin/env node` |
| `start-run.mjs:25-37`, `debug-agents.mjs:21-24`, `eval-variant.mjs` (the `justfile` recipe uses `bun --no-env-file`) | spawns `bun` | `process.execPath`. The `--no-env-file` flag also exists in Node 22 (`--env-file` is the opt-in, so the flag has no meaning there). Drop it. |
| `tests/**` | `bun:test` | stays, tests are not shipped (`tools/`, tests run on Bun per `AGENTS.md`) |

`import.meta.main` is the only item I did not test on Node.
The rest is plain reading of the source.

Repository assumptions:

| Where | Assumption |
| --- | --- |
| `tools/usage-report.mjs:32`, `tools/usage/report.mjs:5` | imports `plugins/dotclaude/lib/budget.mjs` (`CONTEXT_WINDOW`) |
| `tools/usage-report.mjs:54-64` | `plugins/data/dotclaude-dotclaude/verdicts.jsonl` |
| `tools/usage-lib.mjs:8-15` | `plugins/dotclaude/agents/<name>.md` and `maxTurns` |
| `tools/usage/report.mjs:60` | `type === "main" ? null : maxTurns(type)` |
| `tools/usage/parse.mjs:7-12` | price table with no date or source (add a "list prices as of" note and an override file) |
| `tools/measure.mjs:16`, `:114` | `START_TOKENS` default bound |
| `tools/measure.mjs:26`, `:59-62` | `checkFirstRequestBytes` with `FIRST_REQUEST_*_BYTES` from `limits.mjs` |
| `tools/measure.mjs:32-42` | newest session by `cwd`, with `CLAUDE_CONFIG_DIR` fallback (fine, but document it) |
| `tools/capture.mjs:36` | out dir name `dotclaude-capture` and `process.env.TMPDIR` (use `os.tmpdir()`, which reads `TMPDIR` already) |
| `tools/sandbox.mjs:33`, `:171-177` | `REPO/plugins/*` with `.claude-plugin/plugin.json`. Replace with `--plugin-dir` flags or the current directory. |
| `tools/sandbox.mjs:9`, `:23`, `:35`, `:170` | env names `DOTCLAUDE_SANDBOX`, `DOTCLAUDE_SANDBOX_PLUGINS` |
| `tools/sandbox.mjs:60-69` | reads the Keychain item `Claude Code-credentials`. Measured in source. Inferred: this reads a credential beyond the task, so a public tool needs an explicit `--login` flag and a clear note. |
| `tools/sandbox.mjs:79-95` | the `SESSION_VARS` list is a copy of variables of one Claude Code version. It needs a test against the bundle. |
| `tools/start-run.mjs:23`, `:50` | `DOTCLAUDE_SANDBOX`, `ENABLE_TOOL_SEARCH=true` |
| `tools/eval-variant.mjs:44`, `:53-58` | `plugins/dotclaude` path, `Bash,Write,Edit` tools, `evals/results/` note |
| `tools/debug-agents.mjs:25` | the regex `unknown (frontmatter )?field\|unrecognized field` has no test and no sample of a real log line |
| `tools/schema.mjs:121` | default out `../schemas`. `TYPES` in `schema/types.mjs` needs a table for each new version, so a port fails closed (measured: the script says so). |
| `tools/schema/spans.mjs` | a list of tool names and the house rule of backticks, needed only for this repo |
| `justfile` | `bun`, `just`, marketplace `dotclaude`, remote `xsyetopz/dotclaude.wiki.git` |

## 7. Open questions for the user

1. One new plugin (`dotclaude-sessions`) or two (`-sessions`, `-lab`)? The proposal is two.
1. Is a read of the login token (Keychain or `.credentials.json`) in a shipped `sandbox` acceptable? If not, the tool needs `CLAUDE_CODE_OAUTH_TOKEN` or `/login` in the sandbox.
1. Keep `usage-report` and `measure` beside `/usage`, `/context`, and `/insights`? The `AGENTS.md` rule bars code for a feature that exists. I did not compare field by field.
1. Drop the dotclaude-only parts (`verdicts.jsonl`, `maxTurns` brief stats) or keep them behind an option?
1. Is `import.meta.main` safe on your minimum Node (22.18)? I did not run it.
1. Should `bump` and `release` stay in `justfile` only? Proposed yes.
1. Tests: the usage, capture, sandbox, start-run, debug-agents, eval-variant, and bump tools have none (measured). Add tests before a port, or after?
