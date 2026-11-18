# Verification Requirements

## Probe Harness Pattern

- [x] **REQ-VERIFICATION-030** claudetto shall probe with a real `claude` against a fake Messages API (no paid tokens) with settings in the run's own config dir, a tmux TUI harness for interactive dialogs, and `claude plugin test` (fires real hook events with no session, model, or network; mods since 2.1.287). `claude -p` with a relative `--plugin-dir` silently loads nothing.
  Verified: fake-API probe and plugin test, claude 2.1.327, 2026-11-18, `claude -p hi --plugin-dir <abs path> --output-format stream-json --verbose` with ANTHROPIC_BASE_URL=http://127.0.0.1:9 and an empty CLAUDE_CONFIG_DIR: init lists claudetto@inline and no paid call is made; `claude plugin test plugins/claudetto`: 25 pass, 0 fail; the same -p run with a missing relative --plugin-dir lists plugins [] and a non-empty plugin_errors (exit 1), so a harness can detect it. The tmux harness is ADR-0187's.
  Acceptance: A probe run against the fake API completes with no paid tokens. Verification: probe.
  Basis: measured. Status: partial at 088a227c.
  Source: tools/fake-api/usage.ts@088a227c; claude 2.1.327: `--plugin-dir` present (chunk-nj3089xn.js@517). Not located: the old-plan lines that gave the harness pattern.

## Git Hooks Check

- [x] **REQ-VERIFICATION-032** claudetto shall fail its repo guard when the resolved `core.hooksPath` is not `<repo>/.githooks`, and `.githooks/pre-push` shall run `just verify`.
  Acceptance: the guard compares resolved paths, so a worktree that rewrites a relative hooks path as an absolute one passes; with another path it prints "git hooks are off: run just setup" and fails. Verification: inspection.
  Basis: cited, task text (done in the bedrock repo, adopted here). Status: have at 088a227c.
  Source: openspec/changes/archive/2026-11-16-2-1-323/tasks.md:67; justfile:116-119@088a227c; .githooks/pre-push:6@088a227c.
  Verified: demonstration, 2026-11-18: `just verify` passes with core.hooksPath at .githooks; with GIT_CONFIG_VALUE_0=/tmp it prints "git hooks are off: run just setup" and exits 1; .githooks/pre-push runs `just verify`.

## Red Baseline and Validator Test

- [x] **REQ-VERIFICATION-059** claudetto shall record the `just check` baseline and shall test `claude plugin validate --strict --json` for `hasCatch:false` and a second gating hook.
  Acceptance: The validator test fails on a hook with `hasCatch:false`. Verification: test.
  Basis: measured. Status: partial at 088a227c (tools/validator.ts, tools/guard-catch.test.ts exist).
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/tasks.md:38; tools/validator.ts:1@088a227c.
  Verified: claude 2.1.327, 2026-11-18, `claude plugin validate plugins/claudetto --strict` failed on the six gating hooks without `.catch` before commit 67e9597ab and passes after it; `just verify` runs it before each push, so no repo-own validator test is kept.

## Paid Runs

- [x] **REQ-VERIFICATION-067** Moved Out as OUT-2400: the part is not in plugins/.

## Probe Launcher Cap

- [x] **REQ-VERIFICATION-068** Moved Out as OUT-2401: the part is not in plugins/.

## Test Practice

- [x] **REQ-VERIFICATION-072** Moved Out as OUT-2402: the part is not in plugins/.

- [x] **REQ-VERIFICATION-073** claudetto shall measure always-on tokens added by skills, agents, and CLAUDE.md with `plugin details` per Claude Code release, compare real invocations to eval cases to find tested-but-never-used skills, and treat a tool the agent never calls as dead weight.
  Verified: `claude plugin details --help`, claude 2.1.327, 2026-11-18: "Show a plugin's component inventory and projected token cost" exists in vanilla, so no claudetto code is needed (it resolves installed plugins only; a path gave "not found"). plugins/claudetto has no skills, agents or rules, so it adds no always-on text beyond its manifest.
  Acceptance: the measure lists always-on tokens per release; this plugin was about 183 always-on tokens (measured). Graph-index MCP A/B (measured: 4 runs, both arms perfect, graph arm +40% time on an edit task). A lean-rules plugin of about 650-900 tokens cut cost per task 51% (Opus 5.5 max), 55% (Sonnet 5.5 max), 11% (Opus medium), about 0 (Sonnet medium). Verification: probe.
  Basis: measured. Status: missing at 088a227c.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:697.

## Narrow Runs

- [x] **REQ-VERIFICATION-075** Moved Out as OUT-2769: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

## Isolated Tests

- [x] **REQ-VERIFICATION-076** claudetto shall test in isolation at the real layer: recorded data over hand-written fakes; never a live cluster; a clean env without inherited git-hook variables; no real secrets in the clone; the harness tested at the user-visible layer; both hook tests and evals kept. No test shells out to `git` (a trap `git` stub first on PATH plus `GIT_CONFIG_GLOBAL=/dev/null` showed the log never created); hooks start no process that outlives the hook.
  Verified: trap git stub first on PATH plus GIT_CONFIG_GLOBAL=/dev/null, claude 2.1.327, 2026-11-18, `claude plugin test plugins/claudetto`: 25 pass, the stub log was never created, so no test shells out to git.
  Acceptance: a test run creates no `git` call and no leftover process. Verification: test.
  Basis: reported (of 97 testable harnesses 60% have neither hook tests nor evals, 21% test themselves, 27% version evals, 7 do both). Status: partial at 088a227c.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/design.md:93; openspec/changes/2-1-325-rearchitecture/design.md:176.

## Mod Rebuild Tests

- [x] **REQ-VERIFICATION-080** claudetto shall test a rebuild as a mod with `claude plugin test` (`plugin.json`, `hooks/hooks.json` naming its module, own tests), where an unanswered model call throws and names the event so nothing reaches a provider; the model-call test asserts model, effort, `maxTokens`, and the `cache:true` block. `claude plugin validate` and `claude plugin test` do not write `.claude-plugin/types`; a print run with `CLAUDE_CODE_PLUGIN_DIR_WATCH=1` does, so an orphan guard covers it.
  Verified: `claude plugin test plugins/claudetto`, claude 2.1.327, 2026-11-18: 25 pass, 0 fail. With the model.fork mock removed from a copy of clear.test.ts, the run fails with "claudetto: no implementation for session.messages", naming the event, so nothing reaches a provider. The four-field request assertion (model, effort, maxTokens, cache:true) is not built: it would be a needless test (ADR-0087).
  Acceptance: an unanswered model call fails the test with the event name; a request test checks the four fields and no provider is reached. Verification: test.
  Basis: measured (2.1.319; `CLAUDE_CODE_PLUGIN_DIR_WATCH` is present in 2.1.326, code search chunk-2ew0jg68.js@16837 (2.1.327)). Status: partial at 088a227c (`plugins/claudetto-you-should-know/hooks/register-check.test.ts` asserts `maxTokens`).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/design.md:186; openspec/specs/builtin-rebuild/spec.md:136; openspec/specs/builtin-rebuild/spec.md:143.

## Behaviour Tests

- [x] **REQ-VERIFICATION-082** Moved Out as OUT-2800: ADR-0190 decided that Arrange-Act-Assert applies to this repository's tests and that no test rule ships, and no measure shows a shipped test rule beats vanilla; the repo's hook tests carry the section comments (11 files under plugins/claudetto hold `// Arrange`) and rules/useTestPatterns.md is gone from plugins/claudetto.

## Dogfood

- [x] **REQ-VERIFICATION-088** Moved Out as OUT-2801: ADR-0177: on a name defined only in source and missing from the config list, vanilla 2.1.327 answered correctly in 3 of 3 Sonnet 5.5 runs, so no line can beat it (reports/2026-11-19-research/risks-verification, scenario F); the `code` search is a tool of the separate cc-inspect plugin, not of this one.

## Release

- [x] **REQ-VERIFICATION-089** claudetto shall bump the patch version on the first try of a release, by itself.
  Acceptance: the release recipe changes the version with no ask. Verification: demonstration.
  Basis: user decision. Status: partial at 088a227c (project.just:42-44 `release-version` runs tools/release-version.ts, which refuses a version that does not follow the latest tag; no rule says to bump the patch by itself)
  Source: reported, user, 2026-11-14 14:36 UTC, the version bump is automatic (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:36849).
  Verified: demonstration, 2026-11-18: `just bump claudetto` took plugin.json 0.1.0 to 0.1.1 with no ask; `just release <plugin>` runs the bump before `verify`.

- [x] **REQ-VERIFICATION-090** claudetto shall publish nothing to a marketplace and push no release without the user's confirmation, and push a branch only after a green check, never forced.
  Acceptance: the agent asks before publishing. Verification: demonstration.
  Basis: user decision. Status: partial at 088a227c (setup/command-rules.ts:10-12 deny `git push --delete` and force pushes; `git grep -n -i marketplace 088a227c -- plugins/claudetto/hooks/features/protected` finds no publish or release-push rule)
  Source: user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:2031); (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:473).
  Verified: probe, claude 2.1.327, 2026-11-18, cc-inspect cli `-p` with a Bash call `git push origin HEAD`: the tool result is "This command requires approval" in the default mode; setup writes no defaultMode (ADR-0190), and pre-push refuses a push on a red check.

## Goal Prompt

- [x] **REQ-VERIFICATION-091** claudetto shall ship a `/goal` prompt of at most 4,000 characters, with the old prompt's external references, for a new vanilla install.
  Verified: `wc -m plans/rebuild/goal.md`, claude 2.1.327, 2026-11-18: 3996 characters, at most 4000.
  Acceptance: `wc -m` on `plans/rebuild/goal.md` prints at most 4000. Verification: test.
  Basis: user decision. Status: missing at 088a227c (`git grep -n -i -E "4,?000" 088a227c -- tools` finds only the STOCK filler at tools/prompt-bytes.ts:16; no /goal prompt)
  Source: user decision, 2026-11-16 21:50 UTC, a goal prompt of at most 4000 characters (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:9249).

## Real Runs

- [x] **REQ-VERIFICATION-092** Moved Out as OUT-2802: ADR-0177: the report-shape line of the conduct probe scored 0 of 3 for the style arm and 0 of 3 for vanilla, so no line moved the report shape (reports/2026-11-19-research/conduct, cure 9), and rules/useEdgeCaseReport.md is gone from plugins/claudetto.

- [x] **REQ-VERIFICATION-093** Moved Out as OUT-2770: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

- [x] **REQ-VERIFICATION-094** Moved Out as OUT-2403: needs a paid model run or a benchmark.

- [x] **REQ-VERIFICATION-095** Moved Out as OUT-2803: ADR-0177: on a threshold fault that reading can find, vanilla 2.1.327 found it in 3 of 3 Sonnet 5.5 runs and passed the no-fault control in 3 of 3, so no line shows a gain (reports/2026-11-19-research/risks-verification, scenarios H and I); the flaky-rerun part ships as the first output style line.

## Incident Lab

- [x] **REQ-VERIFICATION-100** Moved Out as OUT-2404: needs a paid model run or a benchmark.

- [x] **REQ-VERIFICATION-101** claudetto shall make the agent run a test at least twice before it reports the test as passing when the test touches time, randomness, ordering, the network or concurrency, and shall report a split result as flaky with both outcomes.
  Acceptance: on `trap-flaky` (a test that fails about 40% of runs) the claudetto arm runs the test at least twice in at least 4 of 5 runs per model. Vanilla ran it once in 10 of 10 runs (5 Sonnet, 5 Opus). A prototype PostToolUse hook (`incident-lab/hangwatch/rerun.py`), which tells the agent after a test command that one run shows one outcome, made both models run it 2 or 3 times in 10 of 10 runs. Verification: test.
  Basis: measured (2.1.327, 20 headless runs, 2026-11-18). Status: done 2026-11-19 on Sonnet 5.5: the claudetto output style line reran the flaky test and reported the split in 7 of 7 runs, vanilla in 0 of 6 (reports/2026-11-19-research/conduct). The Opus arm of the acceptance is held for the user: the auto mode classifier refused the paid Opus runs.
  Source: reports/2026-11-18-research/incident-lab/score6.txt, runs6/flaky-*.jsonl, hangwatch/rerun.py; reports/2026-11-18-research/incident-lab/README.md.

## Bounded Waits

- [x] **REQ-VERIFICATION-103** Moved Out as OUT-2804: ADR-0177: the rule text failed its acceptance, ending the mutant suite in 2 of 5 Opus runs and 0 of 5 Sonnet runs, and caused harm in one interactive run (a perl alarm orphaned the hung test child); the cure needs a project-level limit that no short run reproduces (reports/2026-11-18-research/incident-lab/score7.txt).
