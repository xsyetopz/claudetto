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
  It writes only to `external/cc-extract/2.1.296/`, and its report to `.dotclaude/spec/changes/1.0.0/evidence/extract.md`, with no built-in text in the report.
  Owns: `external/cc-extract/`, `.dotclaude/spec/changes/1.0.0/evidence/extract.md`.
  Agent: `implementer`, because the package writes files and runs live sessions, and `investigator` cannot (Jev, confidence 0.51).
  Verify: each id in the report is in the `prompt.compose` or `tool.describe` input of one live session in `just sandbox`.
- [x] P01d Inventory: each built-in part that a setting, an env var, or a mod can turn off, with its cost at the start of a session.
  Owns: `.dotclaude/spec/changes/1.0.0/evidence/inventory.md`.
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

- [x] P03 `spec`: the adapters, the `dotclaude-spec` CLI with each command of [workflow](workflow.md#cli), and the files of this change in the format.
  Deps: P02.
  Owns: the `spec` slice except `domain/` and `skills/`.
  Verify also: `dotclaude-spec validate 1.0.0` passes.
- [x] P05 `guard`: `guard` and `reads` in one slice.
- [x] P06 `asks`: the asks of `adherence`, one file for each ask.
- [x] P07 `sembr`.
- [x] P08 `statusline`: rows of numbers and icons, the color scale, `NO_COLOR`, and the change segment.
  Verify also: a snapshot for each width and for `NO_COLOR`.
- [x] P09 `setup`: the `/setup` skill, its CLI, and the drift check.
  When dotclaude runs in a git repository, it adds each runtime path of `.claude/` that git does not ignore, such as `.claude/worktrees/`, to `.git/info/exclude` (the user, 2026-10-12).
  It adds only the paths that Claude Code does not ignore itself: Claude Code writes `**/.claude/settings.local.json` to the global git ignore file, and its bundle has a `# claude-code-runtime` list (`external/cc-2.1.296/strings.txt:138985-139000`), whose trigger P09 finds first.
  Verify also: a test for a repository with no rule, one with each rule, and a folder that is not a git repository.
- [x] P10 `agents`: the seven agents of [workflow](workflow.md#agents) and the `agent.spawn` handler.
  Verify also: `just validate`, and one spawn of each agent in `just sandbox` that runs on the model of the table.
- [x] P19 `decide`: Jev through the TypeSafe client, and the fallback through `$.model.complete` when the key is missing or not valid, or the account has no balance.
  It moves the `dotclaude-jev` add-on into this slice, and removes the add-on.
  Owns also: `src/plugins/dotclaude-jev/`, `tests/jev/`.
  Verify also: a test for each fallback cause, with a fake `DecisionProvider`.
- [x] P20 `surface`: the transforms of the tool descriptions, the agent listing, and the reminders.
  Deps: P01c.
- [x] P21 `trim`: the settings, env, and mod rules that turn off each part of the inventory that dotclaude does not need.
  Deps: P01d.
- [x] P22 `styles`: `dotclaude:Concise`, from the built-in Concise text of P01c.
  Deps: P01c.
  Verify: `just validate`, and a `reviewer` pass on the text.
- [x] P23 `prompt` transforms: one transform for each built-in section of P01c, and the test that each transform finds its section.
  Deps: P01c.
- [x] P11a `dotclaude-codegraph` with 1 hook.
- [x] P11b `dotclaude-browser`.
- [x] P11d `dotclaude-docs`.
- [x] P11e `dotclaude-sessions`.
- [x] P12 `dotclaude-lab` with `capture`, `sandbox`, `schema`, and `eval-compare`, and no import of another plugin.
  `schema` writes the exact keys and values of `settings.json` and `managed-settings.json` that the pinned binary reads, each with a short description ([workflow](workflow.md#settings-schemas)).
  Verify also: a test fails on a key in `schemas/` that the binary does not read.
  Owns also: `tools/eval-variant.ts`, `tools/lock.ts`, `tools/measure.ts`, `tools/sandbox.ts`, `tools/start-run.ts`, and `tools/unsandboxed.ts`.

Each add-on package owns `src/plugins/<plugin>/` and `tests/<short name>/`.

## Wave 3: integration

- [x] P04 Workflow skills: `/spec`, `/hotfix`, and `/ship`.
  Deps: P03.
  Owns: `src/plugins/dotclaude/slices/spec/skills/`, `tools/bump-version.ts`, `tools/release.ts`, `tools/update.ts`.
  Verify: `just generate`, `just validate`, and a `reviewer` pass on the texts.
- [x] P13 `handoff`: the triggers, the handoff file, `/clear`, the resume, the `/handoff` skill, and `mainHandover`.
  Deps: P03, P05, P06, P07, P32.
  P13 also makes the generator write `plugins/<plugin>/evals/hooks.json` from the eval cases of each slice, because `tests/support/hook-evals.test.ts` needs the file, and wave 2 keeps it hand-written on the rebuild list (P11b, 2026-10-12).
  P13 starts after each other slice package of the core plugin is merged, because the rebuild list makes it the last one: it removes `hooks/legacy.ts`, `lib/`, `features/context/`, and `src/plugins/dotclaude/hooks/`.
  Decisions of the main session (2026-10-12):
  each handler gets an optional field in `src/kernel/slice.ts` that names its eval kinds, and the generator reads it;
  the 0.28.0 `PostToolUse` context bound of subagents (`hooks/PostToolUse/context.ts`) moves into the `handoff` slice, so no behavior is lost;
  a handoff hook has `requests: 0`, because it makes no model call.
  Verify also: one run in `just sandbox` that shows the resume.
- [x] P24 `tiers`: the setup reads the account type and scales from Pro as the baseline, with the same features for each account ([change](change.md), decisions).
  Pro is the baseline, Max 5x and Max 20x get more parallel agents and better model and effort picks, and an API key account gets the picks of its own budget.
  The setup reads `claude auth status --json` for `subscriptionType`, and the rate limit tier only where Claude Code exposes it without the credentials file.
  It does not scale what Claude Code scales itself ([tiers](evidence/tiers.md)).
  Deps: P09.
  Owns: `src/plugins/dotclaude/slices/setup/` (the tier parts), `tests/dotclaude/setup/` (the tier tests).
  Verify also: a test for each account type, with a fake `claude auth status` output.
- [x] P25 `automode`: the setup writes `autoMode` to the user settings, with `$defaults` in each list and one `environment` entry that names the agent worktrees `.claude/worktrees/agent-*` and the Claude Code temp folder `/private/tmp/claude-<uid>/` ([automode](evidence/automode.md)).
  The classifier then allows the removal of those paths, and each default deny rule stays.
  Deps: P09.
  Owns: `src/plugins/dotclaude/slices/setup/` (the `autoMode` parts), `tests/dotclaude/setup/` (the `autoMode` tests).
  Verify also: `claude auto-mode critique` on the entry, and a test that the written lists start with `$defaults`.
- [x] P26 Garbage collection: dotclaude uses the cleanup of Claude Code, such as `cleanupPeriodDays`, and adds no cleanup of its own where Claude Code has one.
  It first answers the open items of [automode](evidence/automode.md#open) on cleanup.
  Deps: P09.
  Owns: `src/plugins/dotclaude/slices/setup/` (the cleanup keys), `tests/dotclaude/setup/` (the cleanup tests).
- [x] P27 `worktrees`: each part of dotclaude that works in a separate checkout uses the worktrees of Claude Code ([change](change.md), decisions, the user, 2026-10-12).
  It first lists the worktree features of Claude Code 2.1.296 and each place in `src/` and `.dotclaude/spec/changes/1.0.0/` that makes or names a worktree of its own, such as `git worktree add` in the `debugger` agent.
  Deps: P25, because both change the setup.
  Owns: `src/plugins/dotclaude/slices/agents/`, `src/plugins/dotclaude/slices/spec/skills/`, `src/plugins/dotclaude/slices/setup/` (the `worktree` keys), and their tests.
  Verify also: `just validate`, and a test that no text in `src/` tells an agent to run `git worktree add`.
- [x] P28 `.claude/` evidence: each file and folder of `.claude/` and `~/.claude/` in Claude Code 2.1.296, with what it does, when Claude Code reads it, its cost at the start of a session, the settings, env vars, and flags that control it, and its source in the docs and the bundle ([change](change.md), decisions, the user, 2026-10-12).
  For rules, it also answers: can a plugin ship rules, do subagents and worktrees load them, does `claudeMdExcludes` apply to them, and how do they show in the `prompt.compose` input of the Mod API.
  It writes `.dotclaude/spec/changes/1.0.0/evidence/claude-directory.md`, with no built-in text.
  Owns: `.dotclaude/spec/changes/1.0.0/evidence/claude-directory.md`.
  Agent: `implementer`, for the reason of P01c.
  Verify: each claim has a source, and each rules answer has one live session in `just sandbox`.
- [x] P29 `rules` slice: dotclaude uses `.claude/rules/`.
  The setup and its drift check know each entry of P28, and `trim` and `surface` count rules as a source of context.
  Each slice part that adds guidance for some files only at runtime becomes a `paths:` rule, when P28 shows that a rule can do the same work.
  Deps: P28, P24, P26, P27, because they change the setup.
  Owns: `src/plugins/dotclaude/slices/rules/` except `skills/`, the rules parts of `setup`, `trim`, and `surface`, and their tests.
- [x] P30 `/rules-creator` skill: based on the `skill-creator` skill of Anthropic, short, and with each needed area: scope, `paths` globs and their limits, user or project folder, the split of a large `CLAUDE.md`, a check that each glob matches files, and the start cost.
  Deps: P28.
  Owns: `src/plugins/dotclaude/slices/rules/skills/`, `tests/dotclaude/rules/` (the skill tests).
  Verify: `just validate`, and a `reviewer` pass on the text.
- [x] P31 Repository rules: each rule of `AGENTS.md` that applies to some files only moves to a `paths:` rule in `.claude/rules/`.
  `AGENTS.md` keeps the rules for each file, and links to `.claude/rules/`, so that a tool that reads only `AGENTS.md` can find them.
  Owns: `AGENTS.md`, `.claude/rules/`, and the tests that pin `AGENTS.md`.
  Verify: `just check`, and a glob check that each `paths:` entry matches at least one file.
- [x] P32 `.dotclaude/`: each file that dotclaude writes moves to `.dotclaude/` in the project, or to `~/.dotclaude/` for the user, with a layout based on `.claude/` ([change](change.md), decisions, the user, 2026-10-12).
  It first lists each file that dotclaude writes, with its scope (project or user), whether git tracks it, and whether `.gitignore` or `.git/info/exclude` gets its rule.
  The setup adds the rules, in the same way as the `.git/info/exclude` rules of P09.
  The paths go in one kernel module, so that each slice reads them from one place.
  P13 writes the handoff file to `.dotclaude/`, so P13 starts after P32.
  Deps: P28, P24, P26, P27.
  Owns: `src/kernel/` (the path module), the path parts of each slice, the exclude parts of `setup`, and their tests.
  Verify: `just check`, a test for each rule in a repository with no rule, one with the rule, and a folder that is not a git repository, and a `git status` after one session in `just sandbox` that shows no untracked dotclaude file.
- [x] P34 Spec store events: an append-only `events.jsonl` with one line for each lane change replaces `state.json` ([change](change.md), decisions, the user, 2026-10-12).
  The lanes come from the last line of each package, so no lane map can drift from the log.
  `schema` goes in a header line, and the handoff path follows P32.
  Each reader and writer changes: `src/kernel/spec-store.ts`, `lane`, `status`, `next`, `validate`, `new`, and the status line.
  This repository's store gets a one-time conversion, with no reader for the old format.
  `.gitattributes` sets `merge=union` for `events.jsonl`.
  Deps: P32, because P32 moves the store to `.dotclaude/spec/changes/`.
  Owns: `src/kernel/spec-store.ts`, the store adapters of the `spec` slice, `.gitattributes`, and their tests.
  Verify: `just check`, a test that the lanes of a log equal the last line of each package, a test that two appends from two branches merge with no conflict, and `dotclaude-spec status 1.0.0` gives the same counter before and after the conversion.
- [x] P33 Zero token cost: each task that dotclaude or its workflow gives to Claude, and that a hook, a script, a setting, or a status line command can do, moves to that form ([change](change.md), decisions, the user, 2026-10-12).
  It first lists each such task, with its token cost now: for example a lane change after a tick or a merge, a sync of `packages.md` and `state.json`, and each skill step that only runs a command.
  The lanes change with no model call, from a hook or from the `dotclaude-spec` CLI that a skill or a commit runs.
  Deps: P19, P28, P34.
  Owns: the parts that the list names, and their tests.
  Verify: `just check`, and the token cost of each moved task before and after, with `dotclaude-usage`.
- [x] P36 `asks` on weaker checks: the `asks` slice asks only when a change weakens a check, and never for a read ([change](change.md), decisions, the user, 2026-10-12).
  A change to a protected file that keeps or adds checks gets no ask, for `Edit`, `MultiEdit`, `Write`, and a shell edit in place.
  Deps: P06.
  Owns: the `asks` slice and its tests.
  Verify: `just check`, `just lab`, and a test for each kind of protected file with one change that weakens a check and one that does not.
- [x] P37 Destructive floor: the setup writes `autoMode.hard_deny` to the user settings, with `$defaults` in the list, so that a destructive `git`, system, database, or cloud action is blocked for each user request ([change](change.md), decisions, the user, 2026-10-12).
  A stopped action is not retried another way: the agent stops and asks the user to run the exact command with a `!` command, then waits.
  Deps: P25, and P35, because a subagent that stops puts the command in its report.
  Owns: `.dotclaude/spec/changes/1.0.0/evidence/destructive-floor.md` (the critique evidence), `src/kernel/policy/` (the rule catalog), `tests/kernel/policy.test.ts`, `src/plugins/dotclaude/slices/setup/domain/automode.ts` (the block from the catalog), `src/plugins/dotclaude/slices/prompt/texts.ts/tools.md` (the stop rule), `tests/dotclaude/setup/floor.test.ts`, and `tests/dotclaude/setup/settings.test.ts`.
  Verify: `just check`, and `claude auto-mode critique` on the new block, with its output in the evidence file.
- [x] P14 Handoff cost: one handoff against one compaction on the same session, with `dotclaude-usage`.
  It only reports, in `.dotclaude/spec/changes/1.0.0/evidence/handoff-cost.md`.
  Deps: P13.
  Agent: `investigator`.

## Wave 4: release

- [x] P35 Worker lessons: the subagent runs of dotclaude use the lessons of the Bun port to Rust, at the scale of a subscription ([change](change.md), decisions, the user, 2026-10-12).
  A subagent that nears its `maxTurns` commits its work and hands back a report, so no run ends with no report.
  `/ship` runs one `reviewer` on the diff of each package before the merge, and gives it no report of the implementer.
  The `guard` slice denies a git command that changes shared state in a subagent, such as `git stash`, `git reset --hard`, and `git checkout <rev> -- .`.
  `/ship` starts each wave with a count of runs from the tier cap of P24 and the 5h and weekly usage now, not from one fixed value.
  Deps: P13, because P13 adds the note near the turn limit, and P33, because P33 changes `/ship`.
  Owns: the `guard`, `agents`, and `statusline` slices, the `/ship` skill, the turn bound of `handoff`, and their tests.
  Verify: `just check`, a lab test for each denied git command in a subagent, and a lab test that a subagent gets the note before its last turn.
- [x] P15 Docs: rebuild the wiki around the questions of the reader, the README, and the CHANGELOG, with the numbers of P14 ([package](packages/15-docs.md), decisions of 2026-10-13).
  Deps: P14, and P33, P35, and P36, because they change what the docs describe.
  Owns: `wiki/`, `src/wiki/`, `README.md`, `CHANGELOG.md`, `docs/`, `tools/wiki.ts`, `.claude-plugin/marketplace.json`.
  Verify: `bun run lint:md`, `just check`, and a `reviewer` pass.
- [x] P38 Session stamp: each session records the dotclaude version and the short commit SHA of the build at 0 model tokens, and `dotclaude-usage` groups the sessions by build ([package](packages/38-session-stamp.md), decisions, the user, 2026-10-13).
  Deps: P33, because the record must cost 0 tokens.
  Owns: `src/kernel/stamp.ts`, the `stamp` slice, `dotclaude-sessions`, their tests, and `evidence/session-stamp.md`.
  Verify: `just check`, `just lab`, and the probe of step 1 with its output in the evidence file.
- [x] P39 Attribution: a hook adds the attribution of Claude Code to each commit and pull request that Claude makes, at 0 model tokens ([package](packages/39-attribution.md), decisions, the user, 2026-10-13).
  Deps: P33, because the hook replaces prompt text.
  Owns: the `attribution` slice, its tests, `evidence/attribution.md`, and the attribution rule of `surface/texts.ts/tool-bash.md`.
  Verify: `just check`, `just lab`, and one commit and one PR body in `just sandbox` that carry the attribution.
- [x] P40 `dcc-plugin-agents-md`: a new add-on gives `AGENTS.md` the support of `CLAUDE.md` in each of its places, at the token cost of the same text in `CLAUDE.md` ([package](packages/40-dcc-agents-md.md), decisions, the user, 2026-10-13).
  Deps: none.
  Owns: `src/plugins/dcc-plugin-agents-md/`, its tests, its marketplace entry and wiki page, and `evidence/agents-md.md`.
  Verify: `just check`, `just lab`, and one session in `just sandbox` that loads each supported `AGENTS` file.
  Each nested `AGENTS` file costs 7 tokens more than a nested `CLAUDE.md`, and the wiki page says so (the user accepts it, 2026-10-13).
- [x] P41 `dcc-plugin-you-should-know`: a new add-on shows one thing that the user should know before Claude acts on it, at one model call per turn at most: a small Haiku call, and a fork of the conversation only after an HTTP 429 ([package](packages/41-dcc-you-should-know.md), decisions, the user, 2026-10-13).
  Deps: none.
  Owns: `src/plugins/dcc-plugin-you-should-know/`, its tests, its marketplace entry and wiki page, and `evidence/you-should-know.md`.
  Verify: `just check`, `just lab`, and one session in `just sandbox` where a notice shows before the action that it is about.
  The HTTP 429 on a subscription came from `CLAUDE_CODE_ATTRIBUTION_HEADER=0`, so the plugin uses `complete` on each account, and `fork` only after a 429 ([evidence](evidence/you-should-know.md), the user, 2026-10-13).
- [ ] P16 Release check: `tools/rebuild-pending.txt` is empty and deleted with its check, a `reviewer` pass on the full diff, `just check`, and one session in `just sandbox` that runs `/spec`, `/ship`, `/hotfix`, a decision, and a handoff.
  Deps: each package above.
  Verify: the user approves the version 1.0.0 and the push.
- [ ] P18 History: delete the tags and the GitHub releases of each older version.
  The wiki release pages stay in `wiki/archive/` (Jev, 2026-10-13).
  Deps: P16.
  Verify: the user approves each deletion before it runs, because a deleted tag or release is public and hard to restore.
