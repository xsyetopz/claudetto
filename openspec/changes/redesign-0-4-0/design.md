## Context

The proposal names the changes, and the specs `plugin-architecture` and `repo-tooling` state the new rules.
`architecture.md` holds the system decisions A1-A8, and the measures are in `research/core.md` and `research/tooling.md`.
This file says how to do the move in steps that each pass `just check`.

The work tree holds uncommitted work of the user and of other sessions: the archive of alpha.2, edits to 8 files of `openspec/specs/`, `slices/finish/domain/reply.ts`, `tests/claudetto/prompt/texts.test.ts`, and 12 deleted files of `.claude/rules/` (edit ledger and `git status`, 2026-10-25).

## Decisions

### D1: Move Order

Each group ends with `just check` green, so a stop between groups leaves a working tree (proposed).

1. Move each slice folder to its module folder with `git mv`, and change only the imports. No code changes in this group.
2. Split the kernel: move each shared kernel file to its owner module of D2, and leave in the kernel only the files of the spec "Kernel Scope".
3. Merge each duplicate of the spec "One Parser for Each Fact" into one function of its owner.
4. Give each `on` call of `register.ts` a rule name, and rename the keys of `evals/hooks.json` to the rule names.
5. Add the `state.ts` files, the state references, and the contract type test.
6. Replace the five import-rule tests and the three Biome blocks with one test (D4).
7. Fold `claudetto-docs` into core (D7).
8. Split `tools/` into `tools/` and `dev/`, add `tools/check.ts`, and delete the tools and tests with no use (D8, D9).
9. Generate `openspec/schemas/` from the presets.
10. Write the docs, the rules of `.claude/rules/`, the architecture page test, the version, and the changelog.

Why: group 1 is a rename that a reviewer reads as a list of moves, and each later group changes one thing.
Alternative: one big commit, which hides a behavior change inside 300 moves.

### D2: Module Map

| Module | From the slices | From the kernel |
| --- | --- | --- |
| `shell` | none | `shell.ts`, `shellkinds.ts`, `wrappers.ts`, `shell/*` |
| `project` | the root of `finish` and `handoff`, the task read of `spec` | `change.ts`, `checks.ts`, `apply.ts`, `ledger.ts`, `tmp.ts`, `paths.ts` |
| `jev` | `decide` | `jev.ts`, the TypeSafe values of `budget.ts` |
| `session` | `handoff`, `prompt`, `hygiene` | `usage.ts`, `compaction.ts`, the bands of `budget.ts` |
| `work` | `finish`, `ground`, `notes` | `notes.ts` |
| `gate` | `guard` | the shell bounds of `budget.ts` |
| `agents` | `agents` | none |
| `statusline` | `statusline` | `model.ts`, `plugin-option.ts` |
| `setup` | `setup` | the values of `budget.ts` for `setup` |
| `spec` | `spec` | none |

The kernel keeps `text.ts` (with `titleCase` of `title.ts`), `errors.ts`, `ports.ts`, `slice.ts` (renamed `hooks.ts`), `node/*`, and one options read.
The rows of the kernel come from the `export` lines of each kernel file and the `kernel/` imports of each slice (`grep`, 2026-10-25).
The empty folder `slices/styles/` goes.
The split of `budget.ts` in task 2.2 differs from the table in three places, because of the module order (proposed, 2026-10-25).
The shell bounds go to `shell/limits.ts`, because `shell` reads them and comes before `gate`.
The compaction values go with the handoff trigger to `session/limits.ts`, and `setup` reads them there.
The rename bounds of `writeAtomic` go to `kernel/node/limits.ts`.
`kernel/apply.ts` does not exist, so the `project` row moves 5 kernel files.
A module that gets more than one slice keeps each slice in a sub-folder, such as `modules/session/handoff/`, so group 1 stays a list of moves (Jev for the user, 2026-10-25, confidence 0.98).

Why: this map gives the order of `architecture.md` with no cycle for each current import.
Alternative: `shell` and `project` inside the kernel, which keeps shared code with no owner (A1).

### D3: Rule Shape

`register.ts` keeps one literal `on("<event>", <handler name>)` call for each rule, in the current order, with a `// rule: <module>.<job>` comment above it, such as `gate.check` or `work.goal-stop`.
The test of `tests/support/hook-evals.ts` reads the rule names from these comments in place of the `// eval:` comments.
The mod runtime accepts no other form of the call: lab probes of `on(r.event, r.handler)` and `on("agent.offer", r.handler)` failed to load, with "the event name passed to on() is not a string literal" and "the hook is not a function literal or the name of one" (2026-10-25). So the event files and the `rule()` type of the first design go (Jev for the user, 2026-10-25, confidence 1.00).
The classic hooks of `hooks.json`, such as `PreModelSwitch`, keep their ids `<event> <command>`.
The values of each `evals/hooks.json` entry stay, and only the keys change.

The four `classic.Stop` rules stay next to each other, in the order of `register.ts` now: `finish`, `handoff`, `guard`, `notes`.
A test compares the order of `on` calls of the new `register.ts` with a list of the old order, which it holds for this change and then deletes.

Why: the order stays a fact that a reader sees in one file, and no rule changes its decision.
Alternative: one handler for each event that calls the module functions in order, which joins the error handling of four rules.

### D4: One Import Test

`tests/repo/imports.test.ts` reads each import line of `plugins/`, builds the graph, and fails for:

- a `bin/` import other than the `adapters/cli.ts` of a module or the kernel,
- a cycle between modules,
- a kernel import of a module,
- a `register.ts` import other than a module `adapters/*.ts` file or the kernel,
- an `on(` call outside `register.ts`,
- a `node:` or `bun:` import or a `Bun` name in the import graph of `register.ts` (rule `hooks-module.md`),
- an import of another plugin, `tools/`, `dev/`, or `tests/` from `plugins/` (rule `plugin-imports.md`).

The three Biome `noRestrictedImports` blocks (`biome.json:88,108,128`) go, because a glob cannot say "another module".
Until task 6.2, the blocks allow the files of another module, so the moves of group 2 pass `just check` (Jev for the user, 2026-10-25, confidence 1.00).
The five import-rule test files of `research/tooling.md` merge into this one, and each case that they test stays as a case.

Why: one graph check finds a cycle, which a path pattern cannot.
Alternative: keep the Biome blocks for editor feedback, with a second copy of each rule.

### D5: State References

Each owner has `state.ts` with `STATE_KEYS`, the list of the keys that it owns, and the type of each value.
Each file that calls `$.state` keeps its own literal ref, such as `{ plugin: "claudetto", key: "usage" }`, because the mod runtime takes only a ref "whose plugin and key are string literals ... written there or in a const of this file" (lab probe, 2026-10-25).
The import test fails for a ref key that no `STATE_KEYS` lists (Jev for the user, 2026-10-25, confidence 1.00).
`tests/claudetto/state-contract.ts` assigns each owner type to the contract type and back, so `just typecheck` fails on drift (`tsconfig.json:26` includes `tests/**/*.ts`).

Why: the contract stays a file with no import, as its header says, and the compiler checks the copy.
Alternative: generate `types/index.d.ts` (A3).

### D6: Merged Facts

| Fact | Owner function | Callers now |
| --- | --- | --- |
| edits of the user | `project` `userEdits` | `guard`, `notes` |
| `git status -z` | `project` `statusPaths` | `kernel/ledger.ts`, `finish/domain/record.ts` |
| a running agent | `project` `runningAgents` | `guard`, `finish`, `handoff` |
| project root | `project` `rootOf` | `finish`, `handoff` |
| cost report | `session` `costReport` | `finish` `costOf`, `handoff` `reportOf` |
| Jev key | `jev` `jevKey` | `guard`, `handoff`, `decide` |
| temp folders | `project` `tempDirs` | `hygiene`, `guard` |
| task lines and open change | `project` `countTasks`, `openChange` | `kernel/change.ts`, `spec`, `handoff`, `prompt`, `statusline` |

The callers come from `research/core.md`, "Coupling" item 3. The names of the new functions are proposed.
When two copies differ, the merged function returns the fuller result, and each caller keeps its own decision on it.
Before a merge, the task runs each test of each caller, and after the merge, the same tests pass with no edit other than imports.
An owner function takes ports, such as `{ git, read }`, and not `$`, because the mod runtime follows `$` past an import only into a `function` declaration, which the arrow rule forbids (Jev for the user, 2026-10-25, confidence 0.98).
The temp folders already have one `tempDirs`, so the merged fact of task 3.1 is the folder of the edit ledger, `ledgerTmp`. The `gate` read the ledger at `/claudetto/ledger/` when `TMPDIR` is empty, and the writer in `hygiene` uses `/tmp`.

Why: a merge that changes a decision is a behavior change, which the PRD excludes.
Alternative: merge to the simplest copy, which can change a decision of the gate.

### D7: `find-docs` in Core

`plugins/claudetto-docs/skills/find-docs/SKILL.md` moves to `plugins/claudetto/skills/find-docs/SKILL.md`, and the steps that name the MCP tools `mcp__plugin_claudetto-docs_context7__*` go, so the skill runs the `ctx7` CLI only.
Its call cap moves from `slices/docs/limits.ts` to the bounds file of the `work` module, or to the skill text when no code reads it.
`plugins/claudetto-docs/`, its marketplace entry, its tests, and its description go.
The `setup` inventory names an enabled `claudetto-docs` as removed (spec `setup`).

### D8: `tools/` and `dev/`

- `tools/`: `recipes.ts`, `lock.ts`, `limits.ts`, `telemetry.ts`, `lint*`, `validate.ts`, `case-checks.ts`, `transcript-grade.ts`, `lab.ts`, `types.ts`, `generate/*`, `wiki.ts`, the release tools, `update.ts`, `claude-code-release.ts`, and the new `check.ts`.
- `dev/`: `sandbox/`, `capture/`, `schema/`, `stats/`, `eval-compare/`, `run-budget.ts`, `tuning-cases.ts`, `eval-variant.ts`, `docker*`, `unsandboxed.ts`, `builtins*`, and `text-defaults.ts`.
- Deleted: `compare-builtins.ts`, `compare/`, `yolo/`, `vanilla.py`, and their tests (A7).

A file of `dev/` can import `tools/`, and not the other way (spec `repo-tooling`).
`transcript-grade.ts` stays in `tools/`, because `validate.ts` imports `case-checks.ts`, which imports it (`tools/case-checks.ts:20`).
`tsconfig.json` gets `dev/**/*.ts` in its `include` list, which now holds `plugins/`, `tests/`, and `tools/` (`tsconfig.json:24-28`).

### D9: Gate Script

`tools/check.ts` holds the step list: lint, the type check, `generate --check`, test, validate, lab, and `dry`.
A step that needs a file that CI does not have carries a flag, and CI skips it with a line that names it.
The type check is such a step now, because CI has no `.claude-plugin/types/` (`justfile:46`).
`just check` takes the lock and runs `bun tools/check.ts`, and CI runs `bun tools/check.ts --ci`.
`just test` runs `bun test` only, and the wiki is written only by `just generate`.
The test step writes a JUnit report to the temp folder with `bun test --reporter=junit --reporter-outfile`, and `tools/check.ts` fails and names each test file with 0 cases in it (proposed, and task 8.4 checks the flag on the installed Bun first).

### D10: Version

Each manifest goes to `0.4.0-alpha.1`, and `CHANGELOG.md` gets a section for it with the breaking changes of the proposal (proposed).
The change `release-0-3-0-alpha-3` is discarded, so no `0.3.0-alpha.3` release comes before `0.4.0` (the user, 2026-10-25).

## Risks / Trade-Offs

- [The move touches the files that other sessions and the user changed and did not commit] -> Group 1 starts only after the user commits or stashes that work, and the apply step asks the user before it starts.
- [A rename loses the history of a file] -> Each move uses `git mv` with no content change in the same group, so `git log --follow` finds the history.
- [A merge of a duplicate changes a decision] -> D6: the tests of each caller run before and after, with no edit other than imports, and the hook lab runs at the end of group 3.
- [The new rule order differs from the old order] -> D3: a test holds the old order of `on` calls during the change.
- [The hook evals keep values that were measured on the old code] -> Only the keys change in this change. A new measure is a paid run, which needs the approval of the user.
- [A `claudetto-docs` user loses the `context7` MCP tools] -> The changelog and the `setup` inventory name the removal, and the skill still works with the `ctx7` CLI.
- [A deleted tool was used by hand] -> The deleted tools have no recipe, script, workflow, or importer (`research/tooling.md`), and git history keeps them.
- [Large churn for a release with no new feature] -> The success measures of `prd.md` show the drop in lines and copies, and each group is small enough to undo alone.
