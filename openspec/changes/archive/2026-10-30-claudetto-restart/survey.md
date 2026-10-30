# Survey for Groups 13 To 16

Read-only. Line counts equal `wc -l`. Imports come from a relative-import graph over every `.ts` file under `plugins/`, `tools/`, `dev/`, `tests/` (no `archive/`, no `node_modules/`, no `.d.ts`). An importer is a distinct file with `from "./x"` or `import("./x")` of the member; test files count. "Other mentions" are files outside `openspec/` that name `<stem>.ts` in a string, comment, or config without importing it.

## Files as Directories

A cluster is sibling files that share a name prefix (or the marked suffix). Member cell: `lines L / outside importers i (of which tests t)`. Rows are sorted cheapest first by distinct outside importing files. `plugins/claudetto-you-should-know/src/` has no cluster (17 flat files, no shared prefix), and `dev/` has none at its top (five folders already).

| Proposed folder | Files | Lines | Outside importers | Other mentions | Members |
|---|---|---|---|---|---|
| `dev/compaction-cost/report/ (weak)` | 2 | 283 | 1 | 0 | `report-cost` 194L/1i(0t); `report-work` 89L/1i(0t) |
| `gate/findings/ (suffix cluster)` | 10 | 695 | 1 | 0 | `finding` 33L/1i(0t); `bash-findings` 168L/1i(0t); `delete-findings` 42L/0i(0t); `fed-findings` 94L/0i(0t); `file-findings` 35L/1i(0t); `git-findings` 71L/0i(0t); `protected-findings` 38L/0i(0t); `secret-findings` 97L/0i(0t); `system-findings` 63L/0i(0t); `upload-findings` 54L/0i(0t) |
| `sandbox/` | 2 | 299 | 1 | 2 | `sandbox` 177L/1i(1t); `sandbox-faults` 122L/1i(1t) |
| `secrets/tables/` | 2 | 208 | 1 | 0 | `table-high` 112L/1i(0t); `table-low` 96L/1i(0t) |
| `tools/capture/ (file beside its folder)` | 4 | 387 | 1 | 13 | `capture` 211L/0i(0t); `fake-api` 83L/1i(1t); `score` 66L/1i(1t); `settings` 27L/1i(1t) |
| `tools/gitleaks/ (file beside its folder)` | 3 | 488 | 1 | 8 | `gitleaks` 194L/0i(0t); `build` 206L/0i(0t); `translate` 88L/1i(1t) |
| `tools/openings/ (weak: suffix)` | 2 | 197 | 1 | 2 | `openings` 46L/1i(1t); `reply-openings` 151L/0i(0t) |
| `automode/` | 3 | 366 | 2 | 2 | `automode` 105L/2i(2t); `automode-environment` 170L/1i(1t); `automode-faults` 91L/1i(1t) |
| `tools/rebuild/` | 3 | 302 | 3 | 2 | `rebuild-constants` 64L/2i(2t); `rebuild-own` 177L/1i(1t); `rebuild-silent` 61L/1i(1t) |
| `compaction/ (weak: shared stem only)` | 2 | 80 | 4 | 5 | `compaction` 33L/3i(3t); `compact-hook` 47L/1i(0t) |
| `secrets/gitleaks/` | 3 | 317 | 5 | 6 | `gitleaks` 229L/2i(1t); `gitleaks-data` 55L/3i(0t); `gitleaks-rules` 33L/0i(0t) |
| `tools/ (tools + tool-texts)` | 2 | 176 | 7 | 7 | `tools` 126L/5i(2t); `tool-texts` 50L/4i(2t) |
| `window/` | 3 | 478 | 8 | 2 | `window` 225L/5i(3t); `window-hooks` 139L/2i(0t); `window-report` 114L/2i(2t) |
| `tiers/ (tiers + tier-*)` | 6 | 391 | 12 | 1 | `tiers` 104L/11i(7t); `tier-keys` 60L/1i(1t); `tier-merge` 112L/1i(1t); `tier-read` 38L/3i(1t); `tier-report` 29L/1i(1t); `tier-snippet` 48L/3i(3t) |

Hard-coded paths that a cluster move must update: `tools/no-narration.ts:57` (names `plugins/claudetto/src/tools.ts`); `tools/source-text.ts:107-113` (lists `src/` recursively and builds `src/<name>` paths); `tools/gitleaks.ts:21,31` (name `secrets/gitleaks-data.ts` and `gitleaks-rules.ts`); `tools/gitleaks/build.ts:15,23` (name `secrets/gitleaks.ts` and `gitleaks-data.ts`); `biome.jsonc:80` and `justfile:34` (name `secrets/gitleaks-rules.ts`). `plugins/*/hooks/hooks.json:3` names only `../src/register.ts`, which is in no cluster.

Folders that already exist. The convention in place is one folder per concern with flat files inside and no `index.ts`:

| Root | Existing folders (`.ts` files inside, recursive) |
|---|---|
| `plugins/claudetto/src/` | `gate/` 23, `jev/` 7, `project/` 5, `run-limits/` 10, `secrets/` 8, `shell/` 16 |
| `plugins/claudetto-you-should-know/src/` | none |
| `tools/` | `capture/` 3, `evals/` 10, `gitleaks/` 2 |
| `dev/` | `compaction-cost/` 14, `compaction-price/` 2, `haiku-growth/` 1, `probe/` 16, `summary-cost/` 8 |

## Test Layout

91 test files: 73 run by `bun test`, all under `tests/`, and 18 lab tests under `plugins/*/tests/`, which `claude plugin test` runs and which stay. A `bun test` file is `unit` when its imports, less `tools/installed.ts`, `tools/limits.ts`, and test helpers, fall in one target folder (a cluster folder, a subfolder, a `dev/` tool folder, or one flat file). It is `integration` when they span more than one or when it reads the repo (all of `tests/repo/`). Under this strict rule `tests/dev/haiku-growth.test.ts`, `tests/dev/probe/plan.test.ts`, and `tests/dev/compaction-price/price.test.ts` are integration for one plugin import each.

Result: 43 unit, 30 integration, 18 lab.

The `Test` column below holds the path each file had when this survey was taken, which is before task 13.8 moved the unit tests. Those paths are kept rather than rewritten, because the import counts and the `unit` or `integration` verdict of each row were read at them, and rewriting the column would turn a reading into a guess. A moved file now lives at its `Destination` folder plus `__tests__/`, with the stem unchanged and the suffix `.spec.ts` in place of `.test.ts`. So `tests/claudetto/sandbox.test.ts` of this table is `plugins/claudetto/src/sandbox/__tests__/sandbox.spec.ts` in the tree. A `Destination` under `dev/` reads as `claudekit/`, because task 14.2 renamed that folder after this survey was taken; so `dev/probe/__tests__/fixture.test.ts` of this table is `claudekit/probe/__tests__/fixture.spec.ts` in the tree. The integration and lab rows did not move, except that task 14.4 renamed the folder holding four of them from `tests/dev/` to `tests/claudekit/`.

| Test | Lines | Runner | Covers | Destination |
|---|---|---|---|---|
| `plugins/yskn/tests/answer.test.ts` | 169 | lab | `Y:constants.ts` | stays |
| `plugins/yskn/tests/bar.test.ts` | 212 | lab | hooks through `register.ts` | stays |
| `plugins/yskn/tests/call.test.ts` | 86 | lab | `Y:constants.ts` | stays |
| `plugins/claudetto/tests/agent-offer.test.ts` | 33 | lab | hooks through `register.ts` | stays |
| `plugins/claudetto/tests/compaction.test.ts` | 35 | lab | hooks through `register.ts` | stays |
| `plugins/claudetto/tests/decide.test.ts` | 312 | lab | `C:jev/limits.ts` | stays |
| `plugins/claudetto/tests/denials.test.ts` | 69 | lab | hooks through `register.ts` | stays |
| `plugins/claudetto/tests/handoff.test.ts` | 367 | lab | `C:handoff.ts`, `C:read-back.ts` | stays |
| `plugins/claudetto/tests/limits-calls.test.ts` | 133 | lab | hooks through `register.ts` | stays |
| `plugins/claudetto/tests/limits-failures.test.ts` | 122 | lab | hooks through `register.ts` | stays |
| `plugins/claudetto/tests/limits-spawn.test.ts` | 151 | lab | hooks through `register.ts` | stays |
| `plugins/claudetto/tests/limits-stop.test.ts` | 73 | lab | hooks through `register.ts` | stays |
| `plugins/claudetto/tests/permission.test.ts` | 206 | lab | `C:gate/gate.ts` | stays |
| `plugins/claudetto/tests/prompt-quiet.test.ts` | 74 | lab | `C:handoff.ts` | stays |
| `plugins/claudetto/tests/read-back.test.ts` | 222 | lab | `C:handoff.ts`, `C:read-back.ts` | stays |
| `plugins/claudetto/tests/summary.test.ts` | 140 | lab | hooks through `register.ts` | stays |
| `plugins/claudetto/tests/tool-describe.test.ts` | 48 | lab | `C:tool-texts.ts` | stays |
| `plugins/claudetto/tests/window.test.ts` | 220 | lab | `C:window.ts` | stays |
| `tests/claudetto-you-should-know/observer-off.test.ts` | 89 | bun | `Y:options.ts`, `C:tiers.ts` | integration (spans 2 modules/folders) |
| `tests/claudetto-you-should-know/shape.test.ts` | 57 | bun | `tools/source-text.ts` | integration (reads the plugin tree) |
| `tests/claudetto/agents.test.ts` | 39 | bun | none | integration (reads `plugins/claudetto/agents`) |
| `tests/claudetto/always-loaded.test.ts` | 105 | bun | `tools/always-loaded.ts` | `tools/__tests__/always-loaded.test.ts` |
| `tests/claudetto/automode-environment.test.ts` | 96 | bun | `C:automode-environment.ts`, `C:automode.ts` | `C:automode/__tests__/automode-environment.test.ts` |
| `tests/claudetto/automode.test.ts` | 187 | bun | `C:automode-faults.ts`, `C:automode.ts` | `C:automode/__tests__/automode.test.ts` |
| `tests/claudetto/compaction.test.ts` | 43 | bun | `C:compaction.ts` | `C:compaction/__tests__/compaction.test.ts` |
| `tests/claudetto/cuts.test.ts` | 80 | bun | `C:cuts.ts`, `C:deny.ts` | integration (spans 2 modules/folders) |
| `tests/claudetto/deny.test.ts` | 85 | bun | `C:deny.ts` | `C:__tests__/deny.test.ts` |
| `tests/claudetto/gate/denied.test.ts` | 44 | bun | `C:gate/prompts.ts` | `C:gate/__tests__/denied.test.ts` |
| `tests/claudetto/gate/gate.test.ts` | 219 | bun | `C:gate/gate.ts`, `C:shell/limits.ts` | integration (spans 2 modules/folders) |
| `tests/claudetto/gate/wrapped.test.ts` | 63 | bun | `C:shell/shell.ts` | `C:shell/__tests__/wrapped.test.ts` |
| `tests/claudetto/gitleaks.test.ts` | 150 | bun | 4 modules of `C:secrets/`, `tools/gitleaks/` | integration (spans 2 modules/folders) |
| `tests/claudetto/jev.test.ts` | 231 | bun | 4 modules of `C:jev/` | `C:jev/__tests__/jev.test.ts` |
| `tests/claudetto/keys.test.ts` | 91 | bun | `C:keys.ts`, `C:threshold.ts` | integration (spans 2 modules/folders) |
| `tests/claudetto/prompt-budget.test.ts` | 201 | bun | `tools/prompt-budgets.ts` | `tools/__tests__/prompt-budget.test.ts` |
| `tests/claudetto/pure-prompts.test.ts` | 56 | bun | `tools/pure-prompts.ts` | `tools/__tests__/pure-prompts.test.ts` |
| `tests/claudetto/redact.test.ts` | 174 | bun | `C:handoff.ts`, `C:secrets/mask.ts`, `C:secrets/redact.ts` | integration (spans 2 modules/folders) |
| `tests/claudetto/refused.test.ts` | 96 | bun | `C:keys.ts`, `C:refused.ts` | integration (spans 2 modules/folders) |
| `tests/claudetto/rule-scope.test.ts` | 82 | bun | `tools/rule-scope.ts` | `tools/__tests__/rule-scope.test.ts` |
| `tests/claudetto/run-limits.test.ts` | 104 | bun | 5 modules of `C:run-limits/` | `C:run-limits/__tests__/run-limits.test.ts` |
| `tests/claudetto/sandbox.test.ts` | 305 | bun | `C:sandbox-faults.ts`, `C:sandbox.ts` | `C:sandbox/__tests__/sandbox.test.ts` |
| `tests/claudetto/skill-flags.test.ts` | 133 | bun | `tools/skill-flags.ts` | `tools/__tests__/skill-flags.test.ts` |
| `tests/claudetto/summary.test.ts` | 189 | bun | `C:summary.ts`, `C:tiers.ts` | integration (spans 2 modules/folders) |
| `tests/claudetto/threshold.test.ts` | 104 | bun | `C:threshold.ts` | `C:__tests__/threshold.test.ts` |
| `tests/claudetto/tier-keys.test.ts` | 80 | bun | 4 modules of `C:keys.ts`, `C:tiers/` | integration (spans 2 modules/folders) |
| `tests/claudetto/tier-merge.test.ts` | 137 | bun | 5 modules of `C:tiers/`, `C:window/` | integration (spans 2 modules/folders) |
| `tests/claudetto/tiers.test.ts` | 178 | bun | 5 modules of `C:threshold.ts`, `C:tiers/`, `C:tools/` | integration (spans 3 modules/folders) |
| `tests/claudetto/tools.test.ts` | 114 | bun | `C:tool-texts.ts`, `C:tools.ts` | `C:tools/__tests__/tools.test.ts` |
| `tests/claudetto/window.test.ts` | 247 | bun | `C:window-report.ts`, `C:window.ts` | `C:window/__tests__/window.test.ts` |
| `tests/dev/compaction-cost/control.test.ts` | 75 | bun | `dev/compaction-cost/rereads.ts`, `dev/compaction-cost/transcripts.ts` | `dev/compaction-cost/__tests__/control.test.ts` |
| `tests/dev/compaction-cost/flags.test.ts` | 43 | bun | `dev/compaction-cost/flags.ts` | `dev/compaction-cost/__tests__/flags.test.ts` |
| `tests/dev/compaction-cost/load.test.ts` | 72 | bun | `dev/compaction-cost/transcripts.ts` | `dev/compaction-cost/__tests__/load.test.ts` |
| `tests/dev/compaction-cost/replay.test.ts` | 78 | bun | `dev/compaction-cost/fit.ts`, `dev/compaction-cost/replay.ts`, `dev/compaction-cost/transcripts.ts` | `dev/compaction-cost/__tests__/replay.test.ts` |
| `tests/dev/compaction-price/main.test.ts` | 101 | bun | `dev/compaction-price/main.ts`, `dev/probe/events.ts` | integration (spans 2 modules/folders) |
| `tests/dev/compaction-price/price.test.ts` | 83 | bun | `dev/compaction-price/price.ts`, `C:window.ts` | integration (spans 2 modules/folders) |
| `tests/dev/haiku-growth.test.ts` | 108 | bun | `dev/haiku-growth/main.ts`, `C:tiers.ts` | integration (spans 2 modules/folders) |
| `tests/dev/probe/fixture.test.ts` | 126 | bun | `dev/probe/fixture.ts` | `dev/probe/__tests__/fixture.test.ts` |
| `tests/dev/probe/floor.test.ts` | 57 | bun | `dev/probe/floor.ts` | `dev/probe/__tests__/floor.test.ts` |
| `tests/dev/probe/forks.test.ts` | 59 | bun | `dev/probe/forks.ts` | `dev/probe/__tests__/forks.test.ts` |
| `tests/dev/probe/main.test.ts` | 327 | bun | 5 modules of `dev/probe/` | `dev/probe/__tests__/main.test.ts` |
| `tests/dev/probe/measure.test.ts` | 238 | bun | `dev/probe/events.ts`, `dev/probe/fixture.ts`, `dev/probe/measure.ts` | `dev/probe/__tests__/measure.test.ts` |
| `tests/dev/probe/plan.test.ts` | 130 | bun | `dev/probe/cost.ts`, `dev/probe/plan.ts`, `C:threshold.ts` | integration (spans 2 modules/folders) |
| `tests/dev/probe/round.test.ts` | 23 | bun | `dev/probe/round.ts` | `dev/probe/__tests__/round.test.ts` |
| `tests/dev/probe/saved.test.ts` | 73 | bun | `dev/probe/saved.ts` | `dev/probe/__tests__/saved.test.ts` |
| `tests/dev/probe/verdict.test.ts` | 241 | bun | `dev/probe/fixture.ts`, `dev/probe/verdict.ts` | `dev/probe/__tests__/verdict.test.ts` |
| `tests/dev/summary-cost/arena.test.ts` | 180 | bun | `dev/summary-cost/arena.ts`, `dev/summary-cost/main.ts` | `dev/summary-cost/__tests__/arena.test.ts` |
| `tests/dev/summary-cost/lock.test.ts` | 119 | bun | `dev/summary-cost/lock.ts` | `dev/summary-cost/__tests__/lock.test.ts` |
| `tests/dev/summary-cost/log.test.ts` | 140 | bun | `dev/summary-cost/log.ts` | `dev/summary-cost/__tests__/log.test.ts` |
| `tests/dev/summary-cost/proxy.test.ts` | 226 | bun | `dev/summary-cost/log.ts`, `dev/summary-cost/proxy.ts` | `dev/summary-cost/__tests__/proxy.test.ts` |
| `tests/dev/summary-cost/stub.test.ts` | 70 | bun | `dev/summary-cost/json.ts`, `dev/summary-cost/stub.ts` | `dev/summary-cost/__tests__/stub.test.ts` |
| `tests/dev/summary-cost/trust.test.ts` | 98 | bun | `dev/summary-cost/trust.ts` | `dev/summary-cost/__tests__/trust.test.ts` |
| `tests/repo/compaction-default.test.ts` | 56 | bun | `C:compaction.ts` | integration (repo check) |
| `tests/repo/file-lines.test.ts` | 93 | bun | `tools/file-lines.ts` | integration (repo check) |
| `tests/repo/gate.test.ts` | 100 | bun | none | integration (repo check) |
| `tests/repo/keep-pages.test.ts` | 71 | bun | `C:tiers.ts`, `tools/keep-pages.ts` | integration (repo check) |
| `tests/repo/manifests.test.ts` | 56 | bun | `C:compaction.ts` | integration (repo check) |
| `tests/repo/no-wiki.test.ts` | 89 | bun | none | integration (scans the repo for wiki files) |
| `tests/repo/rebuild-constants.test.ts` | 73 | bun | `Y:constants.ts`, `tools/rebuild-constants.ts` | integration (repo check) |
| `tests/repo/rebuild-own.test.ts` | 170 | bun | `tools/rebuild-constants.ts`, `tools/rebuild-own.ts`, `tools/source-text.ts` | integration (repo check) |
| `tests/repo/rebuild-silent.test.ts` | 71 | bun | `tools/rebuild-silent.ts`, `tools/source-text.ts` | integration (repo check) |
| `tests/repo/source-text.test.ts` | 84 | bun | `tools/source-text.ts` | integration (repo check) |
| `tests/repo/thin-claims.test.ts` | 60 | bun | `tools/thin-claims.ts` | integration (repo check) |
| `tests/tools/capture.test.ts` | 114 | bun | `tools/capture/fake-api.ts`, `tools/capture/score.ts`, `tools/capture/settings.ts` | `tools/capture/__tests__/capture.test.ts` |
| `tests/tools/evals-cli.test.ts` | 206 | bun | 4 modules of `tools/evals/` | `tools/evals/__tests__/evals-cli.test.ts` |
| `tests/tools/evals-fixture.test.ts` | 202 | bun | `tools/evals/execute.ts`, `tools/evals/fixture.ts` | `tools/evals/__tests__/evals-fixture.test.ts` |
| `tests/tools/evals-grade-i13.test.ts` | 114 | bun | `tools/evals/fixtures/I13/grade.ts` | `tools/evals/__tests__/evals-grade-i13.test.ts` |
| `tests/tools/evals-plan.test.ts` | 110 | bun | `tools/evals/main-rules.ts`, `tools/evals/plan.ts` | `tools/evals/__tests__/evals-plan.test.ts` |
| `tests/tools/evals-session.test.ts` | 125 | bun | 4 modules of `C:prompts.ts`, `tools/evals/` | integration (spans 2 modules/folders) |
| `tests/tools/main-rules.test.ts` | 124 | bun | `tools/evals/main-rules.ts` | `tools/evals/__tests__/main-rules.test.ts` |
| `tests/tools/md-table.test.ts` | 37 | bun | `tools/md-table.ts` | `tools/__tests__/md-table.test.ts` |
| `tests/tools/no-narration.test.ts` | 131 | bun | `tools/no-narration.ts` | integration (scans the repo tree) |
| `tests/tools/openings.test.ts` | 42 | bun | `tools/openings.ts` | `tools/__tests__/openings.test.ts` |

`C:` is `plugins/claudetto/src/`, `Y:` is `plugins/claudetto-you-should-know/src/`, `yskn` is `claudetto-you-should-know`. Destinations use the cluster folders of the first section; if a cluster stays flat, its tests go to a `__tests__/` beside the flat files.

Helpers in `tests/` that are not tests: `tests/claudetto/gate/facts-stub.ts` (2 importers), `tests/dev/compaction-cost/fixture.ts` (2 importers), `tests/dev/probe/fixture.ts` (4 importers), `tests/support/tmp-root.ts` (0 importers), `tests/tools/evals-stub.ts` (2 importers). `plugins/claudetto-you-should-know/tests/lab-kit.ts` serves the lab only.

15 `bun test` files locate files with `import.meta.dir` and a `..` climb, so a move changes their depth: `claudetto-you-should-know/shape.test.ts`, `claudetto/agents.test.ts`, `claudetto/gitleaks.test.ts`, `dev/summary-cost/arena.test.ts`, `repo/file-lines.test.ts`, `repo/gate.test.ts`, `repo/keep-pages.test.ts`, `repo/no-wiki.test.ts`, `repo/rebuild-constants.test.ts`, `repo/rebuild-own.test.ts`, `repo/rebuild-silent.test.ts`, `repo/source-text.test.ts`, `repo/thin-claims.test.ts`, `tools/evals-fixture.test.ts`, `tools/no-narration.test.ts`. Every moved file also needs its relative imports of sources rewritten.

Paths and globs that a move has to update:

| File:line | Content | Change a move needs |
|---|---|---|
| `bunfig.toml:9` | `root = "tests"` | widen so `__tests__/` beside sources is found, while `plugins/*/tests/` (imports `claude-code/testing`) stays out of `bun test` |
| `bunfig.toml:11` | `preload = ["./tests/support/tmp-root.ts"]` | none while `tests/support/` stays; it must still apply to moved tests |
| `bunfig.toml:8` | comment on `root` | reword |
| `justfile:7-9` | comment and `bun test "$@"` | file arguments are paths; no glob in the recipe |
| `justfile:11` | lint comment on test limit | none unless the limit rule changes |
| `justfile:40-41` | `claude plugin test plugins/*` | none (lab stays) |
| `package.json:8` | `"test": "bun test"` | none |
| `tsconfig.json:22-27` | `include`: `plugins/**`, `tests/**`, `dev/**`, `tools/**` | none; already covers `__tests__/` |
| `biome.jsonc:59` | `includes`: `tests/**`, `plugins/*/tests/**`, `**/*.test.ts` | add `**/__tests__/**` for helpers that are not `*.test.ts` |
| `biome.jsonc:69` | `includes`: `plugins/*/tests/**` | none (lab) |
| `.jscpd.json:23-25,34` | `tests/**/...` ignores and `path` list | none for `path` |
| `tools/file-lines.ts:10-15` | `CHECKED_GLOBS` | none; `**` reaches `__tests__/` |
| `tools/file-lines.ts:25-28` | `IN_TESTS = /(^|\/)tests\//`, `NAMED_TEST` | `__tests__/` does not match `IN_TESTS`; a helper there gets the 300 limit |
| `tools/source-text.ts:107-110` | `readdir(src, recursive)` keeps every `.ts` | exclude `__tests__/`, else `rebuild-*` and the comment audit read tests as shipped |
| `tools/no-narration.ts:65` | exemption for `plugins/claudetto/tests/handoff.test.ts` | none (lab stays) |
| `.github/workflows/ci.yml:36,41` | cites `tests/repo/gate.test.ts`; runs `just test` | none (integration stays) |
| 6 source files | `automode.ts`, `sandbox.ts`, `constants.ts`, `tools/no-narration.ts`, `tools/source-text.ts`, `tools/file-lines.ts` name a `tests/` path | update each cited path of a moved test |

## ClaudeKit Candidates

42 files, 4692 lines, five tools. Purposes are the first sentence of each header comment, shortened.

| Tool | File | Lines | Purpose |
|---|---|---|---|
| `compaction-cost` | `counts.ts` | 15 | Counts names against a set, for the work mix and the re-read measure |
| `compaction-cost` | `derive.ts` | 101 | A fine sweep of the threshold and the settings a chosen value implies |
| `compaction-cost` | `fit.ts` | 140 | What a compaction leaves behind, measured instead of assumed |
| `compaction-cost` | `flags.ts` | 29 | The flag parse of `main.ts`, apart so a test reaches it |
| `compaction-cost` | `format.ts` | 22 | Printing primitives that both report modules use |
| `compaction-cost` | `main.ts` | 109 | What compaction costs this login and what another threshold would; free, reads transcripts |
| `compaction-cost` | `price.ts` | 79 | The published `claude-opus-5-5` price row and the measured cost mix |
| `compaction-cost` | `replay.ts` | 146 | Replay the real turn sequence against another threshold |
| `compaction-cost` | `report-cost.ts` | 194 | Printing only: the tables about the bill |
| `compaction-cost` | `report-work.ts` | 89 | Printing only: the tables about the work a compaction costs |
| `compaction-cost` | `rereads.ts` | 118 | Share of what a session re-reads, at boundaries and at control points |
| `compaction-cost` | `stats.ts` | 74 | Idle gaps between requests and what each real compaction moved |
| `compaction-cost` | `transcripts.ts` | 191 | The request stream of this login's transcripts, read only |
| `compaction-cost` | `work.ts` | 139 | Explore/edit mix by distance from a compaction and the lost-work charge |
| `compaction-price` | `main.ts` | 168 | Paid half of the compaction price: `claude -p` steps with a pinned low threshold; no call without `--run` |
| `compaction-price` | `price.ts` | 91 | Price of one compaction from the window recorder rows (pure half) |
| `haiku-growth` | `main.ts` | 220 | Growth of a Haiku 5.5 prompt from response to response in transcripts; free |
| `probe` | `claude.ts` | 35 | The one place that starts `claude`, so the only place a paid request can begin |
| `probe` | `cost.ts` | 31 | Expected cost of a round, sized before any call |
| `probe` | `events.ts` | 170 | Stream-json events of a `claude -p` step and the validity checks of a run |
| `probe` | `fixture.ts` | 263 | Fixture: a git project with an openspec change of 6 tasks and three planted constraints |
| `probe` | `flags.ts` | 147 | The command line of the probe |
| `probe` | `floor.ts` | 37 | The two run floors of the probe and the line saying which a count meets |
| `probe` | `forks.ts` | 60 | Cost of each fork, per arm and size |
| `probe` | `main.ts` | 145 | The probe of the compaction threshold: two arms forked from one base session |
| `probe` | `measure.ts` | 83 | The measures of one fork from the events of its steps |
| `probe` | `ordered.ts` | 30 | Async work one item after another |
| `probe` | `plan.ts` | 133 | The forks of the probe: two arms, one base session per size |
| `probe` | `result.ts` | 52 | The measures of one fork (types) |
| `probe` | `round.ts` | 145 | The round: bases, then forks per size, under a cost cap |
| `probe` | `saved.ts` | 93 | Forks saved to `results.jsonl`, read back for a free report |
| `probe` | `session.ts` | 113 | Paid steps: the base session of a size and one fork (only on `--run`) |
| `probe` | `verdict.ts` | 188 | Decision rule of the `compaction-path` spec, read against the bars in `docs/` |
| `summary-cost` | `arena.ts` | 133 | One arm: an interactive session under a pty, summarizer on or off |
| `summary-cost` | `json.ts` | 19 | Reading untyped JSON as `unknown` and narrowing it |
| `summary-cost` | `lock.ts` | 112 | The lock that guards `~/.claude.json`, compatible with `proper-lockfile` |
| `summary-cost` | `log.ts` | 124 | What an arm did, read from the debug log and the proxy JSONL |
| `summary-cost` | `main.ts` | 169 | Measures what the agent status-line summarizer costs and whether workarounds stop it |
| `summary-cost` | `proxy.ts` | 228 | Local HTTP proxy that answers the summarizer request itself |
| `summary-cost` | `pty.py` | 71 | Runs one Claude Code session on a pty and writes what it drew to a file |
| `summary-cost` | `stub.ts` | 125 | The proxy answer in place of the API and the test for a summarizer request |
| `summary-cost` | `trust.ts` | 61 | Marks an arm folder trusted before the session and unmarks it after |

Per tool: `compaction-cost` 14 files, 1446 lines; `compaction-price` 2 files, 259 lines; `haiku-growth` 1 files, 220 lines; `probe` 16 files, 1725 lines; `summary-cost` 9 files, 1042 lines.

Seams a toolkit extraction must keep working:

1. Imported from outside `dev/`: 28 `dev/` files, by 23 files, all under `tests/dev/` (none from `plugins/`, `tools/`, or `justfile`). Files: `compaction-cost/fit.ts` (1), `compaction-cost/flags.ts` (1), `compaction-cost/replay.ts` (1), `compaction-cost/rereads.ts` (1), `compaction-cost/transcripts.ts` (3), `compaction-price/main.ts` (1), `compaction-price/price.ts` (1), `haiku-growth/main.ts` (1), `probe/cost.ts` (2), `probe/events.ts` (2), `probe/fixture.ts` (3), `probe/floor.ts` (2), `probe/forks.ts` (1), `probe/main.ts` (1), `probe/measure.ts` (1), `probe/plan.ts` (2), `probe/result.ts` (1), `probe/round.ts` (2), `probe/saved.ts` (1), `probe/verdict.ts` (1), `summary-cost/arena.ts` (1), `summary-cost/json.ts` (1), `summary-cost/lock.ts` (1), `summary-cost/log.ts` (2), `summary-cost/main.ts` (1), `summary-cost/proxy.ts` (1), `summary-cost/stub.ts` (1), `summary-cost/trust.ts` (1). The helper `tests/dev/probe/fixture.ts` imports `dev/probe/result.ts`.
2. `justfile` recipes that run a `dev/` file: `compaction-cost` (`:52`, `dev/compaction-cost/main.ts`), `compaction-probe` (`:56`, `dev/probe/main.ts`), `compaction-price` (`:60`, `dev/compaction-price/main.ts`), `summary-cost` (`:64`, `dev/summary-cost/main.ts`), `summary-proxy` (`:68`, `dev/summary-cost/proxy.ts`). `dev/haiku-growth/main.ts` has no recipe, and only `tests/dev/haiku-growth.test.ts` runs it. `just check` runs none of them. `dev/summary-cost/arena.ts:120` finds `pty.py` through `import.meta.dir`.
3. Imports between `dev/` tools: `compaction-price/main.ts` -> `probe/claude.ts`; `compaction-price/main.ts` -> `probe/events.ts`; `compaction-price/main.ts` -> `probe/ordered.ts`; `compaction-price/main.ts` -> `probe/plan.ts`; `summary-cost/main.ts` -> `probe/ordered.ts`. The tools are not independent: `probe/` is a library of `compaction-price/` and `summary-cost/`.
4. `dev/` files that import from `plugins/` (7 imports in 6 files): `compaction-price/main.ts` -> `C:window.ts`; `compaction-price/price.ts` -> `C:window.ts`; `haiku-growth/main.ts` -> `C:threshold.ts`; `haiku-growth/main.ts` -> `C:tiers.ts`; `probe/flags.ts` -> `C:threshold.ts`; `probe/plan.ts` -> `C:threshold.ts`; `probe/session.ts` -> `C:threshold.ts`. All reach only `plugins/claudetto/src/{threshold,window,tiers}.ts`. `dev/probe/plan.ts:36` also builds the path `../../plugins/claudetto` at run time. A separate package would need those three modules published or injected.
5. `dev/` files that import from `tools/`: `probe/floor.ts` -> `tools/limits.ts` (the run floor `EVAL_MIN_RUNS_PER_ARM`).

## Comment Audit

Scope: 190 shipped `.ts` files (19325 lines) under `plugins/*/src/`, `tools/`, `dev/`; tests, `.d.ts`, `.tpl`, and `pty.py` excluded. Only whole-line comments are counted; a trailing `//` after code is not. Comment lines include the delimiter lines of a block. "Exports" are top-level `export const|function|interface|type|class|enum` declarations; re-exports (`export {}`, `export *`) are excluded. A JSDoc block counts as directly above only when its closing line is the line before the declaration (a `biome-ignore` line may sit between).

| Folder | Files | Lines | JSDoc lines | `//` lines | Other block lines | Exports | Exports without JSDoc |
|---|---|---|---|---|---|---|---|
| `dev/compaction-cost` | 14 | 1446 | 93 | 60 | 0 | 77 | 39 |
| `dev/compaction-price` | 2 | 259 | 24 | 14 | 0 | 8 | 2 |
| `dev/haiku-growth` | 1 | 220 | 6 | 12 | 0 | 2 | 1 |
| `dev/probe` | 16 | 1725 | 288 | 53 | 0 | 87 | 15 |
| `dev/summary-cost` | 8 | 971 | 143 | 88 | 0 | 39 | 8 |
| `plugins/claudetto-you-should-know/src` | 17 | 1258 | 149 | 64 | 0 | 67 | 19 |
| `plugins/claudetto/src` | 28 | 3081 | 548 | 238 | 0 | 203 | 45 |
| `plugins/claudetto/src/gate` | 23 | 2333 | 219 | 55 | 0 | 118 | 45 |
| `plugins/claudetto/src/jev` | 7 | 559 | 66 | 25 | 0 | 47 | 13 |
| `plugins/claudetto/src/project` | 5 | 227 | 24 | 10 | 0 | 18 | 0 |
| `plugins/claudetto/src/run-limits` | 10 | 414 | 58 | 29 | 0 | 24 | 6 |
| `plugins/claudetto/src/secrets` | 8 | 849 | 127 | 104 | 0 | 28 | 2 |
| `plugins/claudetto/src/shell` | 16 | 2167 | 199 | 44 | 0 | 80 | 20 |
| `tools` | 20 | 2250 | 260 | 87 | 0 | 107 | 20 |
| `tools/capture` | 3 | 176 | 23 | 12 | 0 | 7 | 2 |
| `tools/evals` | 10 | 1096 | 92 | 25 | 0 | 49 | 20 |
| `tools/gitleaks` | 2 | 294 | 41 | 30 | 0 | 2 | 0 |
| **Total** | **190** | **19325** | **2360** | **950** | **0** | **963** | **257** |

257 exports have no JSDoc block directly above (150 in `plugins/`, 42 in `tools/`, 65 in `dev/`). The 40 in the largest files (ties by path), with the file's line count. A path under `dev/` in the table reads as `claudekit/`, renamed by task 14.2 after this count was taken, and the line numbers are of that reading: group 15 has to re-take the count rather than work the list, because the moves of group 13 and the seam of task 14.3 changed line numbers in the files they touched, and `dev/compaction-cost/report-cost.ts`, which holds 10 of the 40 rows below, was split and no longer exists under any name.

| Path:line | Kind | Name | File lines |
|---|---|---|---|
| `tools/evals/main-rules.ts:30` | type | `Grader` | 296 |
| `tools/evals/main-rules.ts:32` | interface | `RuleCase` | 296 |
| `tools/evals/main-rules.ts:52` | const | `RULE_CASES` | 296 |
| `plugins/claudetto/src/shell/shell.ts:285` | const | `commands` | 285 |
| `plugins/claudetto/src/register.ts:190` | const | `register` | 275 |
| `plugins/claudetto/src/gate/paths.ts:82` | const | `pathOf` | 274 |
| `plugins/claudetto/src/gate/paths.ts:104` | const | `isSystem` | 274 |
| `plugins/claudetto/src/gate/paths.ts:271` | const | `codeSecret` | 274 |
| `dev/probe/fixture.ts:12` | const | `PIN` | 263 |
| `dev/probe/fixture.ts:13` | const | `UNTOUCHED` | 263 |
| `dev/probe/fixture.ts:14` | const | `PORT` | 263 |
| `plugins/claudetto/src/gate/loss.ts:68` | const | `DELETES` | 260 |
| `plugins/claudetto/src/gate/loss.ts:129` | const | `gitCall` | 260 |
| `plugins/claudetto/src/gate/loss.ts:248` | const | `remoteRewrite` | 260 |
| `plugins/claudetto/src/shell/handlers.ts:32` | const | `arithAt` | 239 |
| `plugins/claudetto/src/shell/handlers.ts:48` | const | `ansiAt` | 239 |
| `plugins/claudetto/src/shell/handlers.ts:71` | const | `dquoteAt` | 239 |
| `plugins/claudetto/src/shell/handlers.ts:213` | const | `unquotedAt` | 239 |
| `dev/summary-cost/proxy.ts:27` | const | `UPSTREAM` | 228 |
| `dev/summary-cost/proxy.ts:189` | interface | `Proxy` | 228 |
| `dev/summary-cost/proxy.ts:195` | const | `start` | 228 |
| `plugins/claudetto/src/shell/git.ts:8` | interface | `GitCall` | 221 |
| `dev/haiku-growth/main.ts:102` | interface | `Growth` | 220 |
| `tools/capture.ts:35` | interface | `Reading` | 211 |
| `dev/compaction-cost/report-cost.ts:11` | const | `sample` | 194 |
| `dev/compaction-cost/report-cost.ts:21` | const | `compactions` | 194 |
| `dev/compaction-cost/report-cost.ts:33` | const | `costMix` | 194 |
| `dev/compaction-cost/report-cost.ts:52` | const | `replayTable` | 194 |
| `dev/compaction-cost/report-cost.ts:85` | const | `chargedTable` | 194 |
| `dev/compaction-cost/report-cost.ts:110` | const | `keptFit` | 194 |
| `dev/compaction-cost/report-cost.ts:125` | const | `crossTableOf` | 194 |
| `dev/compaction-cost/report-cost.ts:152` | const | `sweepTable` | 194 |
| `dev/compaction-cost/report-cost.ts:181` | const | `derived` | 194 |
| `dev/compaction-cost/report-cost.ts:189` | const | `footer` | 194 |
| `dev/compaction-cost/transcripts.ts:15` | const | `isRecord` | 191 |
| `dev/compaction-cost/transcripts.ts:55` | type | `Item` | 191 |
| `dev/probe/verdict.ts:10` | interface | `Verdict` | 188 |
| `dev/probe/verdict.ts:28` | const | `mean` | 188 |
| `plugins/claudetto/src/shell/frames.ts:41` | const | `frame` | 182 |
| `plugins/claudetto/src/shell/frames.ts:74` | const | `ANSI_DROP` | 182 |

Full list: rerun the scan; the remaining 217 sit in files of 182 lines or fewer. There are 0 non-JSDoc block comments in the scope, so the comment style is JSDoc plus `//` only.

20 comments that restate the declaration below them (a one-line JSDoc that repeats the name, with no reason). Found by a word-overlap scan, then picked by hand; the scan found 35 candidates and no line-comment restatement:

| Path:line | Comment | Declaration below |
|---|---|---|
| `dev/compaction-cost/transcripts.ts:185` | `/** The requests of `sessions`, flat and in order. */` | `requestsOf` |
| `dev/compaction-cost/transcripts.ts:189` | `/** The boundaries of `sessions`, flat and in order. */` | `boundariesOf` |
| `dev/probe/forks.ts:50` | `/** The report lines of the cost of each fork. */` | `costLines` |
| `dev/probe/measure.ts:47` | `/** The measures of one fork from its steps. */` | `measure` |
| `dev/probe/verdict.ts:186` | `/** The report line of a verdict. */` | `report` |
| `dev/summary-cost/log.ts:49` | `/** One row of the log of the proxy. */` | `Row` |
| `dev/summary-cost/main.ts:21` | `/** What one run of one arm produced. */` | `Run` |
| `plugins/claudetto-you-should-know/src/cadence.ts:28` | `/** The two counters of the back-off. */` | `Counters` |
| `plugins/claudetto/src/gate/denials.ts:13` | `/** The denials of the session by the key of the call. */` | `Denials` |
| `plugins/claudetto/src/gate/ports.ts:11` | `/** The `stat` of a file. */` | `FileStat` |
| `plugins/claudetto/src/handoff.ts:46` | `/** What one transcript tail yields. */` | `Tail` |
| `plugins/claudetto/src/jev/api.ts:14` | `/** A reply of the API with an error status. */` | `ApiError` |
| `plugins/claudetto/src/keys.ts:14` | `/** The key is a settings key of its own. */` | `SETTING` |
| `plugins/claudetto/src/project/ledger.ts:55` | `/** The key of the ledger of the project at `root` in the store. */` | `ledgerKey` |
| `plugins/claudetto/src/shell/shellkinds.ts:27` | `/** The name of the command of `argv` after the wrappers. */` | `nameOf` |
| `tools/capture/score.ts:45` | `/** The score of one captured request body. */` | `scoreOf` |
| `tools/evals/plan.ts:38` | `/** Whether `value` is one of the arms. */` | `isArm` |
| `tools/evals/session.ts:28` | `/** The argv of one `claude -p` session for `arm`. */` | `sessionArgv` |
| `tools/file-lines.ts:34` | `/** The limit of `path`. */` | `limitOf` |
| `tools/prompt-budgets.ts:41` | `/** The page that holds the budgets. */` | `BUDGET_PAGE` |

## Counts

- Files as Directories: 14 clusters, 47 files; cheapest first: `dev/compaction-cost/report/` (1), `gate/findings/` (1), `sandbox/` (1).
- Test Layout: 91 test files = 43 unit + 30 integration + 18 lab.
- ClaudeKit Candidates: 42 `dev/` files, 4692 lines, 5 tools, 28 imported from outside `dev/`, 6 importing `plugins/`.
- Comment Audit: 2360 JSDoc lines, 950 `//` lines, 0 other block lines; 257 of 963 exports lack JSDoc; 20 restating comments listed.
