# Tooling, Tests, Generation, and Add-Ons

Source: a `claudetto:Scoper` map of 2026-10-25 (read only, with no shell), and the checks of the main thread below it.
The counts of the tool groups come from `cat <files> | wc -l` in `tools/` on 2026-10-25. The other counts come from the grep counts of the map and are estimates.

## Checks of the Main Thread (2026-10-25)

- `git ls-files --error-unmatch .jscpd.json` finds the file, so `.jscpd.json` is tracked, and the `/.jscpd.json` line in `.gitignore:34` is stale.
- `git ls-files wiki | wc -l` gives `78`, so the generated `wiki/` mirror is committed.
- `ls plugins/claudetto-*/kernel` finds no folder, so `tests/kernel/copies.test.ts` runs 0 cases.
- `bunx jscpd` with the console report: most of the 91 clones are in the eval cases of `plugins/claudetto/evals/` (18 lines in `bad-runs`, 12 in `reference-runs`, 7 in `accusation-warranted`). 6 are in `slices/spec`, 3 in `tools/preflight`, and 2 in `tools/capture`.

## Inventory of `tools/`

82 files and about 7,250 lines: 77 `.ts`, 1 `.py`, 1 `.sh`, 1 `.grit`, and Dockerfiles.

| Tool | Job | Lines | Caller |
| --- | --- | --- | --- |
| `recipes.ts` | shared `Bun.$` helpers | 62 | lint, lab, release, wiki, update, docker, sandbox |
| `lock.ts` | file lock around long runs | 205 | `check`, `docker`, `eval*` |
| `limits.ts` | test and tool bounds | 64 | many |
| `telemetry.ts` | `claude` with telemetry off | 21 | validate, lab |
| `lint.ts`, `lint/arrow-functions.grit` | Biome and a Grit rule | 31 | `package.json:11` |
| `validate.ts`, `case-checks.ts`, `transcript-grade.ts` | `claude plugin validate --strict` and eval-case checks | 512 | `just validate`, `run-budget.ts` |
| `lab.ts` | `claude plugin test` for each plugin | 10 | `just lab` |
| `types.ts` | copies the Claude Code types | 66 | `just typecheck` |
| `generate/*` | `src/wiki/` to `wiki/` | 160 | `test`, `generate`, `gate` |
| `wiki.ts` | publishes `wiki/` | 35 | `just wiki` |
| `bump-version.ts`, `release.ts`, `preflight.ts`, `findings-check.ts` | release | 353 | `bump`, `release`, `release-check` |
| `update.ts` | refreshes the marketplace | 13 | `just update` |
| `claude-code-release.ts` | finds a newer Claude Code | 94 | `eval-new-claude-code.yml:54` |
| `docker*`, `unsandboxed.ts` | container check, eval guard | 110 | `docker`, `eval` |
| `sandbox/**/*.ts` | sandbox sessions | 666 | `sandbox*`, `debug-agents` |
| `capture/**/*.ts` | logging proxy | 524 | `just capture` |
| `schema/**/*.ts` | settings schemas from the bundle | 916 | `just schema` |
| `stats/*`, `eval-compare/*`, `run-budget.ts`, `tuning-cases.ts`, `eval-variant.ts` | eval statistics and arms | 1,183 | `eval-*` |
| `compare-builtins.ts`, `compare/without-goal.ts` | goal engine against the built-in `/goal` | 321 | none |
| `builtins.ts`, `builtins/*` | built-in prompt diff | 1,271 | none (own test only) |
| `text-defaults.ts` | default texts fixture | 162 | none (manual) |
| `yolo/*` | YOLO settings and a second Jev copy | 270 | none |
| `vanilla.py` | vanilla inventory | 169 | none |

The map says that about 2,100 lines have no recipe and no CI caller.

## Recipes

- `just check` (`justfile:39`) takes the lock and runs `gate` (`justfile:44`): `lint`, `typecheck`, `generate --check`, `test`, `validate`, `lab`, `dry`.
- `ci` (`justfile:47`) repeats the list with no `typecheck`.
- `test` runs the wiki generator (`justfile:9`), and `gate` runs `generate --check` again.
- Likely slow steps, not measured: the `claude` runs of `validate` and `lab`, the stub-API `claude` runs of `tests/support/settings-pin.ts` and `tests/claudetto/setup/pin-effect.test.ts` (6 at a time, 180 s cap, `tools/limits.ts:16`), and `jscpd`.

## Tests

About 20.2k lines in 206 files in `tests/`, and 3,406 lines in 20 files of hook lab tests in `plugins/claudetto/tests/`.

| Layer | Where | Size |
| --- | --- | --- |
| Slice unit tests | `tests/claudetto/<slice>/` | about 9k |
| Kernel | `tests/kernel/` | about 1.1k |
| Tools | `tests/tools/` | about 5.5k |
| Repository rules | `tests/support/` | about 3k |
| Hook lab | `plugins/claudetto/tests/` | 3,406 |
| Parity with OpenSpec | `tests/claudetto/spec/parity/` | about 670 |

Tests that pin text, size, or a constant, and not behavior:

- `tests/claudetto/prompt/texts.test.ts`: bans `not` and `never`, and caps text length against a fixture.
- `tests/support/skill-tokens.test.ts`: 5,000 tokens for each `SKILL.md`.
- `tests/support/wiki-links.test.ts`, `tests/tools/wiki-generate.test.ts`: wiki shape.
- `tests/tools/search-engine-pin.test.ts`, `tests/tools/justfile-gate.test.ts`: one constant equals another.
- `tests/claudetto-docs/docs.test.ts:25-39`: file equality of descriptions and manifests.

Likely duplicates:

- `tests/tools/sandbox-clean.test.ts` and `tests/tools/sandbox/clean.test.ts`.
- `tests/tools/yolo/jev.test.ts` (a second Jev in `tools/yolo/jev.ts`) and `tests/kernel/jev.test.ts`.
- Five files for import rules: `tests/claudetto/imports.test.ts`, `tests/claudetto/import-rules.test.ts`, `tests/kernel/imports.test.ts`, `tests/kernel/importers.test.ts`, `tests/support/import-rules.ts`.
- `tests/claudetto/setup/memory-files.test.ts` and `tests/support/memory-files.test.ts` (not compared).
- `tests/tools/docker-missing.test.ts:9` keeps a known fault as a `test.failing`.

## Generation and Copies

- 3 `schema.yaml` files and 14 templates in `openspec/schemas/` say "Generated by `just generate` from `src/plugins/claudetto/slices/spec/skills/spec/schemas/...`". That source does not exist, and nothing checks these 17 files.
- `src/wiki/` has 78 files and 7,614 lines, and `wiki/` is the committed mirror with `{{NAME}}` values filled from `kernel/budget.ts`, `slices/statusline/limits.ts`, and `plugins/claudetto/snippets.ts`. History pages (`Evals-2.1.304.md` 499 lines, `Builtin-Comparisons.md` 340, `Jev-Images.md` 311) are evidence, not docs.
- `tests/kernel/copies.test.ts` and `.jscpd.json:21` refer to add-on kernel copies that do not exist.
- One Claude Code version is in three places. `tests/tools/claude-code-release.test.ts` holds the pin of `ci.yml` equal to `tools/limits.ts`.

## Add-Ons

- `claudetto-browser`: `slices/browse/` (about 110 lines), `bin/claudetto-browser-guide`, and `skills/browse/SKILL.md`. It runs `agent-browser skills get core` and caps the output.
- `claudetto-docs`: `skills/find-docs/SKILL.md` (47 lines) and `slices/docs/limits.ts`, with no code and no hooks. Its value is two `ctx7` permission rules, an MCP config with an optional key, and a cap of 3 calls.
- A separate plugin gives an opt-in install and a separate permission scope. The cost is three manifests and descriptions that tests keep equal, and tests that import `limits.ts` across the plugin boundary.

## Target Layouts of the Map (Estimates)

- A. Trim in place: remove the tools with no caller, fix or drop the `openspec/schemas` headers, delete the empty copies test, merge `gate` and `ci`, and stop committing `wiki/`. About -3,500 lines in `tools/` and `tests/tools/`, and -7.6k lines of `wiki/`. Low risk.
- B. Split dev tooling from the product: a `dev/` folder for paid and manual tools, one `check` script, tests next to the code in `plugins/*/tests/`, docs as a core skill, browser stays an add-on. About -6,000 to -9,000 lines. Medium risk: large churn, and the import rules need a rewrite.
- C. One plugin, evidence outside the repository: `browse` and `find-docs` become core skills, and evidence and research leave `src/wiki/`. About -12,000 to -15,000 lines. Highest risk: users reinstall, and each user pays the prompt size of both skills.
