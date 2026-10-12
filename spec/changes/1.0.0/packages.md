# 1.0.0 packages

This list starts the format before the CLI exists.
P03 turns each package into a file in `packages/` with the front matter of [workflow](workflow.md#formats), and writes `state.json`.
Before each wave, the main session writes the brief of each package of the wave.

Rules of each wave:

- No `owns` entry is under `plugins/`.
  After each merge, the main session runs `just generate` and commits `plugins/`.
- Two packages of one wave have no overlapping `owns`.
- A wave starts when each package of the wave before it is `done` and `just check` passes on the merge.
- Each package removes the 0.28.0 and 0.29.0 files, tests, and tools of its capability, and their lines in `tools/rebuild-pending.txt`.
  A tool that [tree](tree.md) keeps by name is rebuilt too, because no 0.28.0 or 0.29.0 code stays (the user, 2026-10-12).
- Each slice package owns `src/plugins/<plugin>/slices/<s>/` and `tests/<plugin>/<s>/`, has the agent `implementer`, and verifies with `just test tests/<plugin>/<s>` and `just lab`, unless its entry says otherwise.

Critical path: P01a, P01b1 to P01b4, P05 and P06, P13, P14, P15, P16.

## Wave 0: main session

- [x] P00 The user reviews [tree](tree.md), and the main session writes the briefs of wave 1.

## Wave 1: foundation

- [x] P01a Kernel: `src/kernel/slice.ts` with the phases, `ports.ts`, the split of `src/kernel/` and `src/kernel/node/`, `budget.ts`, and `spec-store.ts` with the store types and the reader.
  Owns: `src/kernel/`, `tests/kernel/`.
  Verify: `just test tests/kernel`.
- [x] P01b1 Generator core: the gate of `claude plugin validate` on a handler in a slice file, then `tools/generate/` with discover, order, closure, and the emitters of `register.ts`, `hooks.json`, `plugin.json`, and the texts, and `tools/rebuild-pending.txt`.
  P01b was split in four, because one agent filled its context with the reads of the full package (the user, 2026-10-12, Jev, confidence 0.79).
  Deps: P01a.
  Owns: `tools/generate/`, `tools/generate.ts`, `tools/rebuild-pending.txt`, `tests/tools/`, `tests/support/generate.test.ts`, `justfile`.
  Verify: `just test tests/tools` and `just check`.
- [x] P01b2 The `prompt` slice, as the proof of the generator, with the 0.28.0 handlers that are not ported in `plugins/dotclaude/hooks/legacy.ts`.
  P01b2 changed `checkEntries` in `tests/support/import-rules.ts`, because P01b4 owns it but comes later, and `just check` failed on the new layout.
  P01b4 replaces that rule with the Biome overrides of `design.md`.
  Deps: P01b1.
  Owns: `src/plugins/dotclaude/plugin.ts`, `src/plugins/dotclaude/slices/prompt/`, `tests/dotclaude/prompt/`.
  Verify: `just test tests/dotclaude/prompt`, `just lab`, and `just check`.
- [x] P01b3 The settings snippet in schema order, and `src/shared/` to `src/fragments/`.
  Deps: P01b2.
  Owns: `tools/generate/emit/snippet.ts`, `src/shared/`, `src/fragments/`.
  Verify: `just test tests/tools` and `just check`.
- [x] P01b4 The checks: `useArrowFunction` at `error`, `tools/lint/arrow-functions.grit`, the import overrides, `src` in the lint and the type check, `just generate --check` in `just check`, the file-size rule in `just validate`, `AGENTS.md`, and `GEMINI.md` as a symlink to `AGENTS.md`.
  Deps: P01b3.
  Owns: `biome.json`, `tools/lint/`, `tools/generate/emit/register.ts`, `tools/validate.ts`, `tools/limits.ts`, `tools/lab.ts`, `tools/recipes.ts`, `tools/sizes.ts`, `tests/support/`, `tests/dotclaude/settings-pin.test.ts`, `package.json`, `tsconfig.json`, `AGENTS.md`, `GEMINI.md`.
  Verify: `just check`, and `bunx biome lint` fails on a fixture with a `function` declaration and on one with a `function` expression.
- [x] P01c Extract: the full texts and sizes of each built-in system prompt section, tool description, output style, compaction prompt, reminder, and listing of Claude Code 2.1.296, the prompt of `CLAUDE_CODE_SIMPLE` and `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT`, and the id that the Mod API gives each part.
  It writes only to `external/cc-extract/2.1.296/`, and its report to `spec/changes/1.0.0/evidence/extract.md`, with no built-in text in the report.
  Owns: `external/cc-extract/`, `spec/changes/1.0.0/evidence/extract.md`.
  Agent: `implementer`, because the package writes files and runs live sessions, and `investigator` cannot (Jev, confidence 0.51).
  Verify: each id in the report is in the `prompt.compose` or `tool.describe` input of one live session in `just sandbox`.
- [x] P01d Inventory: each built-in part that a setting, an env var, or a mod can turn off, with its cost at the start of a session.
  Owns: `spec/changes/1.0.0/evidence/inventory.md`.
  Agent: `implementer`, for the reason of P01c.
  Verify: `dotclaude-start --compare` on one start with the switches and one start without them.
- [x] P02 Spec formats: the parser, the validator, and the delta rules as pure code in `slices/spec/domain/`.
  It has no dep, because the types of `state.json` stay in `src/kernel/spec-store.ts` (P01a), and P02 holds only the Markdown formats.
  Owns: `src/plugins/dotclaude/slices/spec/domain/`, `tests/dotclaude/spec/domain/`.
  Verify: `just test tests/dotclaude/spec/domain`, on a fixture for each format and each delta rule.
- [x] P11 Removal: `openspec/` and `.claude/skills/openspec-*`.
  The OpenSpec code of 0.28.0 goes with the package of its slice: setup in P09, the status line in P08.
  The main checkout already has the deletions of `openspec/` and `.claude/skills/openspec-*`, not committed (2026-10-12).
  P11 commits them after its Verify passes.
  Deps: P01b4.
  Owns: `openspec/`, `.claude/skills/`.
  Verify: `just check`, and `grep -ri openspec src tests tools` finds only the 0.28.0 files that `tools/rebuild-pending.txt` names.

## Wave 2: slices, in parallel

Each package depends on P01b4.

- [ ] P03 `spec`: the adapters, the `dotclaude-spec` CLI with each command of [workflow](workflow.md#cli), and the files of this change in the format.
  Deps: P02.
  Owns: the `spec` slice except `domain/` and `skills/`.
  Verify also: `dotclaude-spec validate 1.0.0` passes.
- [ ] P05 `guard`: `guard` and `reads` in one slice.
- [ ] P06 `asks`: the asks of `adherence`, one file for each ask.
- [ ] P07 `sembr`.
- [ ] P08 `statusline`: rows of numbers and icons, the color scale, `NO_COLOR`, and the change segment.
  Verify also: a snapshot for each width and for `NO_COLOR`.
- [ ] P09 `setup`: the `/setup` skill, its CLI, and the drift check.
  When dotclaude runs in a git repository, it adds each runtime path of `.claude/` that git does not ignore, such as `.claude/worktrees/`, to `.git/info/exclude` (the user, 2026-10-12).
  It adds only the paths that Claude Code does not ignore itself: Claude Code writes `**/.claude/settings.local.json` to the global git ignore file, and its bundle has a `# claude-code-runtime` list (`external/cc-2.1.296/strings.txt:138985-139000`), whose trigger P09 finds first.
  Verify also: a test for a repository with no rule, one with each rule, and a folder that is not a git repository.
- [ ] P10 `agents`: the seven agents of [workflow](workflow.md#agents) and the `agent.spawn` handler.
  Verify also: `just validate`, and one spawn of each agent in `just sandbox` that runs on the model of the table.
- [ ] P19 `decide`: Jev through the TypeSafe client, and the fallback through `$.model.complete` when the key is missing or not valid, or the account has no balance.
  It moves the `dotclaude-jev` add-on into this slice, and removes the add-on.
  Owns also: `src/plugins/dotclaude-jev/`, `tests/jev/`.
  Verify also: a test for each fallback cause, with a fake `DecisionProvider`.
- [ ] P20 `surface`: the transforms of the tool descriptions, the agent listing, and the reminders.
  Deps: P01c.
- [ ] P21 `trim`: the settings, env, and mod rules that turn off each part of the inventory that dotclaude does not need.
  Deps: P01d.
- [ ] P22 `styles`: `dotclaude:Concise`, from the built-in Concise text of P01c.
  Deps: P01c.
  Verify: `just validate`, and a `reviewer` pass on the text.
- [ ] P23 `prompt` transforms: one transform for each built-in section of P01c, and the test that each transform finds its section.
  Deps: P01c.
- [ ] P11a `dotclaude-codegraph` with 1 hook.
- [ ] P11b `dotclaude-browser`.
- [x] P11d `dotclaude-docs`.
- [ ] P11e `dotclaude-sessions`.
- [ ] P12 `dotclaude-lab` with `capture`, `sandbox`, `schema`, and `eval-compare`, and no import of another plugin.
  `schema` writes the exact keys and values of `settings.json` and `managed-settings.json` that the pinned binary reads, each with a short description ([workflow](workflow.md#settings-schemas)).
  Verify also: a test fails on a key in `schemas/` that the binary does not read.
  Owns also: `tools/eval-variant.ts`, `tools/lock.ts`, `tools/measure.ts`, `tools/sandbox.ts`, `tools/start-run.ts`, and `tools/unsandboxed.ts`.

Each add-on package owns `src/plugins/<plugin>/` and `tests/<short name>/`.

## Wave 3: integration

- [ ] P04 Workflow skills: `/spec`, `/hotfix`, and `/ship`.
  Deps: P03.
  Owns: `src/plugins/dotclaude/slices/spec/skills/`, `tools/bump-version.ts`, `tools/release.ts`, `tools/update.ts`.
  Verify: `just generate`, `just validate`, and a `reviewer` pass on the texts.
- [ ] P13 `handoff`: the triggers, the handoff file, `/clear`, the resume, the `/handoff` skill, and `mainHandover`.
  Deps: P03, P05, P06, P07.
  Verify also: one run in `just sandbox` that shows the resume.
- [ ] P14 Handoff cost: one handoff against one compaction on the same session, with `dotclaude-usage`.
  It only reports, in `spec/changes/1.0.0/evidence/handoff-cost.md`.
  Deps: P13.
  Agent: `investigator`.

## Wave 4: release

- [ ] P15 Docs: the wiki, the README, and a new CHANGELOG that starts at 1.0.0, with the numbers of P14.
  Deps: P14.
  Owns: `wiki/`, `README.md`, `CHANGELOG.md`, `docs/`, `tools/wiki.ts`.
  Verify: `bun run lint:md`, and a `reviewer` pass.
- [ ] P16 Release check: `tools/rebuild-pending.txt` is empty and deleted with its check, a `reviewer` pass on the full diff, `just check`, and one session in `just sandbox` that runs `/spec`, `/ship`, `/hotfix`, a decision, and a handoff.
  Deps: each package above.
  Verify: the user approves the version 1.0.0 and the push.
- [ ] P18 History: delete the tags, the GitHub releases, and the wiki release pages of each older version.
  Deps: P16.
  Verify: the user approves each deletion before it runs, because a deleted tag or release is public and hard to restore.
