Each task lands its own tests and docs, and each group ends with `just check` passing.

## 1. Setup (`tier-profiles`, `surface-trim`, `version-floor`)

- [x] 1.1 `src/tiers/env.ts` holds the 16 flags of D18 and `CLAUDE_CODE_THRIFTY_SONIC=0` with its unofficial note and source, and the snippet writes them. Verify: a test reads each name and value from the snippet, and `just setup --dry-run` prints them.
- [x] 1.2 `src/tiers/disables.ts` holds `workflowSizeGuideline`, `workflowKeywordTriggerEnabled`, `enableWorkflows`, `enableArtifact`, `remoteControlAtStartup`, and `minimumVersion: "2.1.314"`. Verify: a test checks each value, and the schema key check passes.
- [x] 1.3 `src/tiers/agents.ts` holds the six `Agent(...)` denies, written to `permissions.deny`. Verify: a test, and a merge test that keeps the user's own deny rules.
- [x] 1.4 The snippet writes `$schema`. Verify: a test compares it with the vendored schema's `$id`.
- [x] 1.5 Setup writes no `~/.claude.json`; its only settings file is `~/.claude/settings.json`. Verify: a test runs setup on a temp home and shows `~/.claude.json` unchanged.
- [x] 1.6 `src/tiers/disables.ts` and `src/tiers/agents.ts` hold the keys of D22, and the `env` and `modelSettings` blocks carry its values. Verify: a test checks each value, and the schema key check passes. `src/tiers/disables.ts` gained `SESSION_DISABLES`, `PROMPT_DISABLES`, `BEHAVIOR_KEYS`, the three missing claude.ai keys, `FALLBACK_MODELS`, and `MAX_EFFORT`; `DesignSync` was already in `src/tiers/agents.ts`. Every value was read against the vendored `2.1.314` schema first: each key is a property and each value fits its type or enum. `src/tiers/__tests__/snippet.spec.ts` checks each value per tier, the `maxEffortLevel` ceilings beside the Haiku window, and that `modelProposedGoals` stays unset; the six new cases failed before the change. `tests/claudetto/tiers.test.ts` now matches the Haiku entry of `modelSettings` instead of the whole block. `just check` exits 0 (`1,030`, `140`, and `31` tests pass), `just setup --dry-run` prints the new keys, and `just inventory` reads `46105`, `33684`, and `31356`, so the shipped first request did not move.
- [x] 1.7 `applyTier` of `src/tiers/merge.ts` appends missing `permissions.deny` rules after the user's own (D24). Verify: the failing test of `src/tiers/__tests__/setup.spec.ts` passes, and the `allow` test still keeps a user list whole.
- [x] 1.8 Probe whether a `command.run` hook answers the built-in `/init`, and record the reading in `decisions.md` under D26. Verify: the probe's command and output.
- [ ] 1.9 Build the interview command of D26 as a `skill.prompt` hook on the built-in `init` skill (second probe reading), for its five scopes and the `AGENTS.md` layout. Verify: hook lab cases that the command reaches the model with the interview text, and a run in a temp repo that writes `CLAUDE.md` as `# CLAUDE.md` and `@AGENTS.md`.

## 2. OpenSpec (`openspec-init`)

- [x] 2.1 Setup runs `openspec init` when the CLI is on `PATH` and `openspec/` is absent, and reports a missing CLI. Verify: tests with a stub `openspec` on `PATH` and with none. `src/tiers/openspec.ts` runs `openspec init --tools claude --profile core` (D27) in the working directory with `OPENSPEC_TELEMETRY=0`, skips it when `openspec/` exists, names it under `--dry-run`, and names `bun add -g @fission-ai/openspec` when the CLI is missing. Four cases in `src/tiers/__tests__/setup.spec.ts` (stub on `PATH`, existing `openspec/`, `--dry-run`, no CLI) failed before the change and pass. A run with the real `1.15.0` CLI in a temp folder wrote `openspec/` and the six `core` skills.

## 3. Haiku Summary (`tier-profiles`)

- [ ] 3.1 `src/summary.ts` sends effort `high` on the Haiku call. Verify: the summary test reads `claude-haiku-5-5` and `high` from the call.

## 4. Version Floor (`version-floor`)

- [ ] 4.1 Read the source of the running version from the mod API, and record it in `design.md`. Verify: the command and its output.
- [ ] 4.2 The `SessionStart` rule warns once under `2.1.314`. Verify: hook lab cases for `2.1.311` and `2.1.314`.

## 5. Status Line (`status-line`)

- [ ] 5.1 Read the `2.1.314` status line stdin fields from the docs, and make D1 to D4 and D7 of `/tmp/ccx/report-statusline.md` failing fixtures. Verify: the tests fail for the stated reason.
- [x] 5.2 Build `src/statusline/` and `bin/claudetto-statusline`, stdin only. Verify: the fixtures pass, and a test shows no file, network, or process call.
- [x] 5.3 Setup writes `statusLine` and `subagentStatusLine` and keeps a user value. Verify: merge tests.

## 6. Hygiene and Finish (`session-hygiene`, `finish-loop`)

- [ ] 6.1 Read `~/.claude/` on this machine and the docs for generated paths, and write the path list with a source per row. Verify: the list file and the readings.
- [ ] 6.2 Build hygiene as `just hygiene` with `--dry-run` and a non-blocking `SessionStart` run. Verify: tests on a temp home, and a dry run on this machine.
- [ ] 6.3 Build `/goal <cmd>` and the `tasks.md` Stop loop with its bound. Verify: hook lab cases for fail, pass, open task, and no progress.

## 7. Agents and Docs Lookup (`research-agent`, `docs-lookup`)

- [ ] 7.1 Write `agents/Hermes.md`. Verify: `bun tools/agent-tools.ts`, and `just inventory` for its line.
- [ ] 7.2 Read the standing size of the Context7 MCP server and of our own registered tool with `just capture`, and record both in `decisions.md`. Verify: the two readings.
- [ ] 7.3 Build the lighter option. Verify: a lookup test, and `just capture` matching 7.2.

## 8. Classifier Trim (`low-hitl`)

- [ ] 8.1 `just capture --classifier` records the classifier request. Verify: a reading of the built-in rung near the `140,093` characters of `docs/prompt/machinery.md`.
- [ ] 8.2 Read each `CLAUDE_CODE_AUTO_MODE_*` name in the `2.1.314` binary, and list the ones that change the request text. Verify: the readings in `docs/`.
- [ ] 8.3 Read every rung in characters, and record the table in `docs/`. Verify: the table and its command.

## 9. Auto Mode A/B (`low-hitl`)

- [ ] 9.1 Build arm C, the `PreToolUse` hook with Jev then Haiku 5.5 at `high`, failing closed, off by default. Verify: hook lab cases for allow, deny, unsure, and error.
- [ ] 9.2 Add arms A, C, and the smallest B rungs to `tools/evals/`, and print the plan and the price with `just eval`. Verify: the plan output.
- [ ] 9.3 Ask the user to approve the paid run, with its share of the weekly limit. Run it on approval, record the rows, and write the pick to `decisions.md`.
- [ ] 9.4 Setup writes the picked rung and model, and `src/automode/faults.ts` guards the pick. Verify: setup and fault tests.

## 10. Surfaces (`prompt-footprint`)

- [ ] 10.1 Read every surface of D21 with `just capture` and `just inventory`, and record the baseline. Verify: the readings.
- [ ] 10.2 Cut each surface, one at a time, and read it again. Verify: each reading lower, its tests passing, and `just inventory` passing.
- [ ] 10.3 Decide `session/prompt` by its reading (D12), and record it. Verify: the reading in `decisions.md`.

## 11. You Should Know (`builtin-rebuild`)

- [x] 11.1 The explained view offers `2: Chat in main session`, as `docs/keep/plugins/you-should-know-design.txt:125-126` records. It puts the quoted note in an empty prompt box, sends it as a prompt where the session has no box, and leaves the view and the back-off counters alone on a busy box or a refusal. Verify: `tests/respond.test.ts` and `tests/draft.test.ts` of `plugins/claudetto-you-should-know` failed before the change and pass. The kit strips a refusal cause that a test hook writes, so `tests/refusal.test.ts` calls `press` with plain ports, and breaking each of its two branches fails its case. `claude plugin test plugins/claudetto-you-should-know` reads 41 pass.

## 12. Building Blocks (`building-blocks`)

- [x] 12.1 The block core: the `Block` record, `src/blocks/catalog.ts` with `attachBlocks`, and the `/init` interview as the first block. Verify: `bun test src/blocks` reads 5 pass, and renaming the block's id fails the lab-file and attach-call cases; `claude plugin test plugins/claudetto` reads 144 pass.
- [ ] 12.2 Move each hook of `register.ts` into a block, with its lab cases unchanged and its lab file named after the block. Verify: `claude plugin test plugins/claudetto` reads the same pass count, and `register.ts` holds only `attachBlocks`.
- [ ] 12.3 Move `claudetto-you-should-know`'s hooks into blocks on the same core. Verify: its lab reads the same pass count.
- [ ] 12.4 New blocks by kind from the surface catalog in `.claude/claudetto/research/`: prompts, agents, commands and tool texts, context, screens, and the status line. One worker per kind, each in its own worktree. Verify: each block's lab cases, and an `Athena` review of the merged diff.
- [ ] 12.5 Each base text meets the writing guide in `.claude/claudetto/research/`, and its character count is recorded with its cut. Verify: `just capture --shipped` before and after.

## 13. Release

- [ ] 13.1 Move the four manifests to `0.1.0`. Verify: `just validate`.
- [ ] 13.2 Reinstall from the marketplace, run `/claudetto:setup`, and read `~/.claude/settings.json` with `jq`. Verify: each success measure of `prd.md`.
- [ ] 13.3 `just check` passes, and `just capture --shipped` reads below the `0.0.0` reading.
