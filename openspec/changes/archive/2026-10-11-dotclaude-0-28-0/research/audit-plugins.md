# Audit of `plugins/` (report only)

Date: 2026-10-09.
Branch: `dotclaude-0-28-0`.
Scope: all code in `plugins/`, not `plugins/*/evals/results/`.
Labels: **measured** means a tool or a script printed the number.
**inferred** means I read the code and reasoned, with no run.
Throwaway scripts were in `$TMPDIR` (`imports.mjs`, `unused.mjs`, `fn.mjs`, `probe.mjs`) and are not in the repository.

## 1. Verdict

The claim holds in part.

- The layer rules of `AGENTS.md` hold. **measured** (section 2).
  Nothing here is "no architecture".
- The "bandaid" pattern is real, in four forms:
  1. Hand-written regex parsers of shell text, in three features, with diverged copies (F1, F2).
  2. Two hook runtimes (module and classic command) that implement the same feature twice (F3).
  3. Reads of private or bundle-only data, which break at each Claude Code release (F4).
  4. Failure that is swallowed with no trace (F5).
- The claim does not hold for: import direction, file length, suppression comments, compat shims, legacy readers, feature flags, long parameter lists (section 8).

## 2. Architecture map

Five plugins, no cross-plugin import.
Layers, from inside out:

| Layer | Where | Rule | Result |
| --- | --- | --- | --- |
| `lib/` | `plugins/dotclaude/lib/` (`budget.mjs`, `sembr.mjs`) | imports only `lib/` | 0 imports. **measured** |
| feature | `plugins/*/features/<name>/` | imports `lib/` and itself | 0 violations. **measured** |
| entry | `hooks/register.mjs`, `features/*/cli.mjs`, `skills/setup/scripts/openspec.mjs`, `bin/dotclaude-codegraph-check` | imports `lib/` and features | as allowed |

Entry points:

- Module runtime (`modules` in `hooks.json`): `plugins/dotclaude/hooks/register.mjs` (15 files in its graph), `dotclaude-browser/hooks/register.mjs` (3), `dotclaude-jev/hooks/register.mjs` (5).
- Classic command hooks of `dotclaude`: `guard`, `reads`, `sembr`, `adherence`, `context` (each `cli.mjs`).
  Also `statusline/cli.mjs`, `statusline/subagent-cli.mjs`, and a `Stop` prompt hook.
- Classic command hooks of `dotclaude-codegraph`: `features/graph/cli.mjs` (4 modes) and `bin/dotclaude-codegraph-check`.
- Skill script: `skills/setup/scripts/openspec.mjs`.
  `dotclaude-docs` and the `dotclaude-browser` skill have no code.

Import check output (script `$TMPDIR/imports.mjs`, 66 `.mjs` files):

```text
VIOLATIONS
plugins/dotclaude/hooks/register.mjs bare import claude-code
HOOK GRAPH plugins/dotclaude/hooks/register.mjs 15 files; node imports: none
HOOK GRAPH plugins/dotclaude-browser/hooks/register.mjs 3 files; node imports: none
HOOK GRAPH plugins/dotclaude-jev/hooks/register.mjs 5 files; node imports: none
```

The one "violation" is `import('claude-code').Register` in a JSDoc type tag (`register.mjs:94`).
It is a type, not a runtime import.
`bun test tests/dotclaude/imports.test.mjs` also passes (16 tests).
Hooks-module graphs hold no `node:` import.
`dotclaude-jev` solves this by running its client as a child process (`jev/run.mjs`).

## 3. Lead tools

`file_length.py plugins --json`: code 81 files, 4,670 lines, largest 252, 0 over the 300 limit.
Test 8 files, 945 lines, largest 198, 0 over.
Raw lines: `reads/bounds.mjs` is 297 and the cap is 300.
Total `.mjs` is 5,714 raw lines.

`change_coupling.py --repo . --limit 40` (331 commits):

- The top pairs are `hooks/lib/_io*.mjs`, `hooks/pre-tool-use/*`, and `skills/*`.
  These paths no longer exist.
  They show the 0.27 and 0.28 rebuild, not live coupling.
- With `--since 2026-10-01`: live pairs are only the version files.
  `package.json`, the 5 `plugin.json` files, and `CHANGELOG.md` change together at 56 to 91 percent.
  `tools/bump-version.mjs` (`just bump`) handles this on purpose.
- History: 352 commits, 210 since 2026-10-01, and 54 of those 210 subjects match `fix|workaround|restore|revert|probe`.
  This churn is a plausible source of the user's view.

`biome ci plugins tests tools`: 92 warnings, no error.

| Rule | Count | Files |
| --- | --- | --- |
| `noExplicitAny` | 81 | `dotclaude-browser/tests/web-search.test.ts` 39, `dotclaude-jev/tests/second-opinion.test.ts` 26, `dotclaude-jev/tests/ask-user-question.test.ts` 16 |
| `noTemplateCurlyInString` | 8 | `tests/dotclaude/` `guard-shell` 2, `guard-vars` 2, `adherence-spans` 2, `bounds` 1, `sembr-hooks` 1 |
| `noUnusedImports` | 2 | `plugins/dotclaude/features/adherence/cli.mjs` (`path`, line 14), `tests/dotclaude/prompt-variants.test.mjs` |
| `noUnusedVariables` | 1 | `tests/dotclaude/drift.test.mjs` |

The 8 `noTemplateCurlyInString` hits are shell text `"${l}"` in test strings.
They are false positives.
Only 1 of 92 is in shipped code.

## 4. Findings, ranked by cost to the maintainer

### F1. Four diverged hand-written shell parsers (high, measured)

Evidence:

- `guard/shell.mjs:6` (`words`, `PREFIX_OPTS` line 12, `stripPrefix` line 38).
- `guard/vars.mjs` (183 lines, a model of shell variable flow: `readAssignments`, `forgetSetters`, `setNames`).
- `reads/rules.mjs:26` (`words`, a second tokenizer), `reads/split.mjs:29` (`pipelines`), `reads/bounds.mjs:122` (`argvOf` with its own `PREFIXES`, `KEYWORDS`).
- `adherence/git.mjs:7` (`commands`, a fourth tokenizer) with `WRAPPERS` at line 62.
- Together `guard` 571 + `reads` 613 + `adherence/git.mjs` 151 = 1,335 of 5,714 raw `.mjs` lines (23 percent).
- The wrapper lists differ.
  The probe `$TMPDIR/probe.mjs` gave `gitReason` = false for `timeout 5 git reset --hard`, `env -i git reset --hard`, `nice -n 5 git reset --hard`, and `xargs git stash`.
  `guard/shell.mjs` handles `timeout`, `nice`, `env`, and `xargs` in `stripPrefix`.
  So a fix in one parser does not reach the others.
- `rmAsk` also returns false for `find / -delete`, `find ... -exec rm -rf {} +`, `git clean -fdx /h`, `rsync --delete`, and a Python `rmtree`.
  A denylist over shell text cannot be complete.

Why it is a bandaid: each gap gets a new regex or a new set entry (`guard/rules.mjs:71-99` has 7 flags and a `taint` state).
The code grows by case, not by a grammar.

Fix:

1. Short term: one `lib/shell.mjs` (pure, no `node:` import) with one `tokenize(command)` and one `stripWrappers(argv)`.
   `guard`, `reads`, and `adherence` import it.
   `lib/` may hold it, and a feature may import `lib/`.
2. Better: reduce the rule set to what a documented layer cannot do.
   `register.mjs:7-10` already says that permission rules and the sandbox cover the other cases.
   With the sandbox on, the OS refuses a write outside the allowed folders.
   An `ask` rule `Bash(rm -r *)` needs no parser.
   See question Q1.

### F2. `reads/bounds.mjs` rebuilds `bashOutputMaxChars` (high, measured and inferred)

- `lib/budget.mjs:24` sets `BASH_OUTPUT_MAX_CHARS = 4_000`.
  Its comment says that Claude Code saves a longer output to a file and sends a preview.
  So the engine already bounds each `Bash` output.
- `reads/bounds.mjs` (297 lines) denies a command whose output "has no limit" and asks for a retry.
  `kind()` (lines 206-264, 59 lines) is a chain of 13 `if (name === ...)` branches with a regex list for `jq`, `sed`, `awk`, `find -exec`, `git log`, and more.
- Probe: `unbounded()` returns `null` (allowed) for `docker logs c`, `kubectl get pods -o yaml`, `npm test`, `pytest -v`, `journalctl -u x`, and `tail -f x.log`.
  The list names 22 producers and cannot name the rest. **measured**
- Cost: each hit is a denied call and a retry (inferred), and the rules need 297 lines to keep.
- Fix: remove the unbounded-output deny, and keep only the file-print to `Read` rule (`reads/rules.mjs`, a documented stub on re-read) if Q2 confirms it.
  The setting already limits the damage.

### F3. Two hook runtimes implement one feature twice (high, measured)

- `guard`: the module `tool.check` (`register.mjs:142-147`) and the classic `guard/cli.mjs` both call `rmAsk`.
  The classic copy exists because "the classifier can approve" a module ask in auto mode.
  Its own header says "measured in a live session, and not repeated on 2.1.296" (`guard/cli.mjs:3`).
  So a second implementation stands on a measure that is not valid for the tested version.
- `sembr`: the module `tool.call` on `Edit` (`register.mjs:137-141`, `repairEdit`) and the classic `sembr/cli.mjs` (`rewriteContent`, `rewriteEdit`, `rewriteCommand`) both rewrite text.
  `research/mods-api.md` says `tool.call` "may rewrite input" and that `tool.call` is not rerouted by the guard.
  So one `tool.call` handler could do `Write`, `Edit`, and `Bash`. **inferred**
- `context`, `reads`, `adherence` are classic only.
  `guard`, `drift`, `prompt`, `surface` are module only.
  There is no written rule for which runtime a feature takes.
- Glue copy: 7 `if (import.meta.main) { try { ... JSON.parse(readFileSync(0)) ... } catch {} }` blocks.
  Files: `guard/cli.mjs:37`, `reads/cli.mjs:60`, `sembr/cli.mjs:51`, `adherence/cli.mjs:66`, `context/cli.mjs:111`, `codegraph graph/cli.mjs:120`, `jev/cli.mjs:176`.
  Also 7 builders of `hookSpecificOutput` (`guard/cli.mjs:29`, `reads/cli.mjs:53`, `sembr/cli.mjs:47`, `adherence/rules.mjs:113`, `context/rules.mjs:54`, `context/cli.mjs:92`, `graph/cli.mjs:57`).
- Fix: pick a rule ("rewrite and ask in the module, observe in a classic hook"), re-probe auto mode on 2.1.296, and delete the duplicate path.
  Move the stdin, stdout, and fail-open glue to one `lib/classic-hook.mjs`.

### F4. Reads of data that Claude Code does not document (high, measured)

Each item breaks at a Claude Code release, and the drift check (F4h) is the bandage for them.

- a. `statusline/credits.mjs:1-9,67`: reads `cachedUsageUtilization` in `~/.claude.json`, key `cedar_ember`.
  The header says "not a documented interface".
  Source: "CodexBar 0.69.0".
- b. `statusline/input.mjs:3-19`: comments cite byte offsets in `external/cc-2.1.296/strings.txt` (`QPo at 22993209`).
  `external/` is git-ignored, so a maintainer cannot follow the evidence.
- c. `statusline/context-table.mjs:10,28`: scrapes the Markdown table that `/context` wrote into the transcript, with a regex (`ROW`) and a name map (`PARTS`).
  **inferred**: `$.session.usage({ breakdown: "summary" })` (used in `drift/hooks.mjs:24`) has the same data in a module, but the status line is a separate process.
  See Q4.
- d. `drift/data.mjs:29-63`: `ENGINE_SECTIONS`, 33 internal ids (`heron_brook`, `tengu_silent_harbor`, `willow_tern`) from the bundle.
  `OFF_PLUGINS` lists 9 internal `cc-plugin-*@builtin` names.
- e. `surface/data.mjs:41-76` (`TOOL_TEXT`) holds hand copies of the `Agent`, `Bash`, and `Read` descriptions.
  `surface/rules.mjs:38-40` does exact-string replacement (`AGENT_NOTE_FULL`) and a regex on the git status block (`RECENT_COMMITS`).
  A changed Claude Code text makes the replacement a silent no-op, and `next.length < text.length` hides it.
- f. `context/limits.mjs:36-39`: `CONTEXT_BLOCK_MARGIN = 23_000` "(2.1.296 bundle)".
  A second copy is in `statusline/limits.mjs:33`, and a test pins the two ("A feature imports no other feature").
- g. `context/rules.mjs:38` and `statusline/limits.mjs:53`: model names `haiku-5-5`, `opus-5-5` in regexes and tables.
- h. `drift/data.mjs:5`, `TESTED_VERSION = "2.1.296"`.
  `drift/rules.mjs:52` adds a line to the model context at each session start for any other version.
  Each Claude Code release then costs a code change plus a model-visible nag until the bump.
  `drift/rules.mjs:82` cites "an eval run" where Claude edited settings from this note.
- Fix: keep only data that a documented field gives (`rate_limits` in the status JSON is documented).
  Drop 4a, or hide it behind a settings key.
  Move the drift check (4d, 4h) to a `just` task or `tools/`, out of the shipped session path, since `AGENTS.md` says only `plugins/` ships and drift data is for the maintainer.
  Put the evidence in `wiki/`, not in `external/` offsets.

### F5. Silent failure everywhere (medium-high, measured)

- 38 `catch` sites in `plugins/**/*.mjs`.
  Only `jev/cli.mjs:82` (rethrow as `UsageError`) and `jev/cli.mjs:187` (print the message) report an error.
  The other 36 return `null`, `undefined`, or print nothing.
  Many are `catch {}` (for example `context/cli.mjs:49,115`, `adherence/cli.mjs:70`, `guard/cli.mjs:41`).
- Fail-open is a stated policy in each header, and it is right at the hook process edge (a hook must not block a call).
  The defect is that nothing shows that a guard died.
  A bug in `rmOutside` makes the guard silently ask for nothing.
- `register.mjs:54-64`: `owners` caches an empty list when the first `gh` call fails, because `[]` is truthy.
  The cache never resets for the life of the process. **inferred**
  `checked` (line 67) and `variants` (line 92) are `Map`s keyed by session that never shrink.
- `drift/hooks.mjs:9` `attempt()` hides 7 reads, `browser/hooks/register.mjs` 4 catches, `jev/hooks/register.mjs` 4 catches.
- Fix: a classic hook that fails should write a short message to stderr and exit non-blocking (code 1), which Claude Code shows in verbose mode.
  Do this once in `lib/classic-hook.mjs` (F3).
  Reset `owners` when the result is empty.

### F6. Compaction is off, and `context/` rebuilds what Claude Code has (medium, inferred)

- `AGENTS.md`: "Do not write runtime JavaScript for a feature that the latest Claude Code has."
- The settings turn compaction off (`DISABLE_COMPACT`), and `features/context/` adds its own context-limit warning (`notes.mjs`, `levels.mjs`, `limits.mjs`: `CONTEXT_NOTICE_AT`, `CONTEXT_HANDOFF_AT`, `CONTEXT_BLOCK_MARGIN`, `HANDOFF_RESERVE`), a handoff text (`notes.mjs:12`), and a per-prompt note.
  `register.mjs:112-117` rewrites the `context_management` prompt section for the same case.
  `drift/data.mjs:67` shows the module is skipped by the managed guard, so the feature works only in some setups.
- `HANDOFF_RESERVE = 20_000` is derived from "an eval run of 2026-10-09" (`context/limits.mjs:44`).
- Subagent bounds: `context/cli.mjs` reads the transcript tail (262 KB) and `turns.mjs:40-51` reads `maxTurns` from the agent file with a regex.
  `research/mods-api.md` lists a `turn.step` event with `agentId` and `index`. **inferred**
  A module could count turns and tokens without a file read.
- Fix: decide in Q3 whether the handoff feature stays.
  If it stays, the thresholds should come from one place, and the eval-run comment should become a test.

### F7. Two prompt-change mechanisms (medium, measured)

- `output-styles/dotclaude.md` (`force-for-plugin: true`) and the `prompt.compose` module (`prompt/variants.mjs`, 146 lines of prose in JS, with `select.mjs`) both change the system prompt.
- `EVIDENCE_LINE` is copied into every variant, every spawn block, and the output style (`variants.mjs:7` says so), pinned by tests.
- `variantKey` (`select.mjs:18`) chooses by `id.includes("opus")`.
- Fix: a documented output style is the idiomatic route.
  Keep the module only for what a style cannot do (per-model text), and generate the style from `variants.mjs` so that one source holds the line.

### F8. `dotclaude-jev` (medium)

- `jev/tool.mjs:4,28-32,139`: without a key, the plugin registers the tool as deferred.
  A call returns text that sends the model to `reviewer`.
  A tool that exists to say "off" is a fallback by design.
  Fix: do not register the tool without a key (`register.mjs:72-80` already reads the key). **inferred**
- Retry and timeout conflict (**measured** from constants): `jev/cli.mjs:22-23` sets `TRIES = 4`, `TIMEOUT_MS = 30000`, backoff `1000 * 2**i` (1 + 2 + 4 = 7 s).
  `jev/limits.mjs:7` sets `JEV_TIMEOUT_MS = 45000` for the whole child process.
  Two slow tries already pass 45 s, so tries 3 and 4 cannot run.
- Rule break: `cli.mjs:20-25` holds `API`, `MODEL`, `TRIES`, `TIMEOUT_MS`, and `LOW_CONFIDENCE = 0.5`.
  `AGENTS.md` says a feature bound lives only in `features/<name>/limits.mjs`.
  `limits.mjs:4` already has `MIN_CONFIDENCE = 0.5`, the same value under another name.
  `cli.mjs` may import `./limits.mjs` (it is `node:` code).
- `jev/ask.mjs:25` and `jev/tool.mjs:100` are long but fine.

### F9. `dotclaude-browser` (medium)

- `hooks/register.mjs:94-103` replaces `WebSearch` with a headless-browser search of the DuckDuckGo HTML page.
  `search.mjs:16` detects a bot check with the regex `/bots use DuckDuckGo too|select all squares/i`.
  Four `catch` blocks fall back to the built-in `WebSearch`.
- `search.mjs:49`: "Only the macOS layout is known" (`Chromium.app/Contents/MacOS/Chromium`) while the plugin has no OS guard.
- `limits.mjs:23` `SESSION_NAME_MAX = 12` has no runtime use (only `tests/browser/search.test.mjs`).
- Fix: Q5.
  A documented route is an MCP server for the browser, or `WebFetch` on a search URL.

### F10. No type check (medium, measured)

- 81 `any` in 3 TypeScript test files (section 3).
  `package.json` `lint` is `biome ci`, and `check` has no `tsc` step.
  The `claude-code` types exist (`plugins/*/.claude-plugin/types`, ignored by git), and the `.mjs` runtime files carry only one JSDoc type (`register.mjs:94`).
- The state objects of the parsers (`known`, `state`, `ctx`, `payload`) have no declared shape.
- Fix: type `$` and `on` from the generated types in the tests (removes 81 warnings), and add `checkJs` through JSDoc `@typedef` for the `ctx` and payload shapes, with `tsc --noEmit` in `just check`.
  Not run here: `bunx tsc` failed in this sandbox with `EPERM` on its temp folder (**unverified**).

### F11. Stale metadata (low, measured)

- `.claude-plugin/marketplace.json:12` lists "secret redaction", "weakened tests", "a handoff note before compaction", and "cache notes".
  `grep -ri redact plugins` finds nothing.
  `plugins/dotclaude/.claude-plugin/plugin.json` has the true list.
- `wiki/design/Open-Items.md:20` says that the auto-mode guard starts for `gh`, `git clone`, `curl`, and `wget`.
  `hooks/hooks.json` has `if` entries only for `rm`, `sudo`, and `xargs`.
- `hooks/hooks.json` `description` (1,400 chars) repeats the wiki and goes stale.
- `dotclaude-codegraph/hooks/hooks.json` is 130 lines, with 12 `if` entries that differ only in the git verb.

Sections 5 to 10 (duplicates, smells, special cases, limits of the claim, ranking, questions) are in `audit-plugins-2.md`.
