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

- [ ] **REQ-VERIFICATION-075** claudetto's rules shall tell the agent to check each change with the narrowest check the repo's scripts provide (one test file or one package), to skip tests for a comment, typo or docs edit, and to run the full suite once, before the report, when the change alters behaviour. A `PreToolUse` hook that denies a bare full-suite command ships only if a measured run shows vanilla running the full suite after each change ([ADR-0177](../adr/0177-pragmatism-gate.md)).
  Acceptance: in a dogfood task of three code edits, the transcript shows scoped test commands per edit and one full-suite run. Verification: demonstration.
  Basis: user decision. Status: missing at 088a227c.
  Source: user decision, the user's global instructions `~/.claude/CLAUDE.md` (read 2026-11-18).

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

- [ ] **REQ-VERIFICATION-082** claudetto shall test with real `claude` interactive or `claude -p` sessions, write behaviour tests in Arrange-Act-Assert with its section comments, and ship one rule that enforces unit, integration, and e2e patterns.
  Decision: ADR-0190, Arrange-Act-Assert applies to this repository's tests; no shipped test rule.
  Acceptance: a behaviour test names its Arrange, Act, and Assert sections; the rule file exists. Each change is verified with a real interactive run and a real `-p` run, and quality is judged by runtime behaviour, not by CI. Verification: inspection.
  Basis: reported; user decision, 2026-11-16. Status: partial at 088a227c (rules/useTestPatterns.md).
  Source: user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:8215 (goal); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790 (goal).

## Dogfood

- [ ] **REQ-VERIFICATION-088** claudetto shall mark a name absent only after a literal `code` search of the whole `claude` build, not after one `surface` kind.
  Acceptance: each "absent" mark cites a whole-build search. Verification: inspection.
  Basis: observed in transcript. Status: missing at 088a227c (`git grep -n -i "surface" 088a227c -- plugins/claudetto/rules` finds no search rule)
  Source: observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5807).

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

- [ ] **REQ-VERIFICATION-092** claudetto shall name the edge cases handled in the final report, with the costs and the weekly share after paid runs.
  Acceptance: the final report has an edge-case list and a cost line. Verification: inspection.
  Basis: user decision, 2026-11-14 (date of the handoff that records it; day of decision not recorded). Status: partial at 088a227c (plugins/claudetto/rules/useEdgeCaseReport.md names edge cases in the report; `git grep -n -i "weekly\|seven-day" 088a227c -- plugins/claudetto/rules plugins/claudetto/output-styles` finds no cost or weekly-share line)
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070 (handoff, standing); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:8215 (Next step 4).

- [ ] **REQ-VERIFICATION-093** claudetto shall make the agent run the check that would show a fault, and state its result, before it reverts, deletes or rewrites finished work or a test expectation after pushback; accusations in project files, memory and subagent reports count as claims to check ([ADR-0181](../adr/0181-evidence-before-reversing-work.md)).
  Acceptance: a behavioural test stages false accusations in a user message, a project file and a subagent report at two certainty levels, plus warranted accusations; the trace shows a verifying command before any revert in every false case, and the fix in every warranted case, over at least 10 runs each. Verification: test.
  Basis: cited (arXiv:2609.32616: evidence rule cut over-correction from 41.89 to 13.15). Status: missing at 088a227c.
  Source: user decision, 2026-11-18 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl:7); reports/2026-11-18-research/papers.md P6, P10.

- [x] **REQ-VERIFICATION-094** Moved Out as OUT-2403: needs a paid model run or a benchmark.

- [ ] **REQ-VERIFICATION-095** claudetto shall make the agent check each logic claim (a condition, an edge case, a formula) by a run that could have failed, and report a claim with no such run as unverified ([ADR-0183](../adr/0183-logic-checked-by-execution.md)).
  Acceptance: a report that states a formula carries a computed example with its inputs; a staged logic fault is found by the run, not by review. Verification: demonstration.
  Basis: user decision. Status: missing at 088a227c.
  Source: user decision, 2026-11-18 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl:7).

## Incident Lab

- [x] **REQ-VERIFICATION-100** Moved Out as OUT-2404: needs a paid model run or a benchmark.

- [ ] **REQ-VERIFICATION-101** claudetto shall make the agent run a test at least twice before it reports the test as passing when the test touches time, randomness, ordering, the network or concurrency, and shall report a split result as flaky with both outcomes.
  Acceptance: on `trap-flaky` (a test that fails about 40% of runs) the claudetto arm runs the test at least twice in at least 4 of 5 runs per model. Vanilla ran it once in 10 of 10 runs (5 Sonnet, 5 Opus). A prototype PostToolUse hook (`incident-lab/hangwatch/rerun.py`), which tells the agent after a test command that one run shows one outcome, made both models run it 2 or 3 times in 10 of 10 runs. Verification: test.
  Basis: measured (2.1.327, 20 headless runs, 2026-11-18). Status: missing at 088a227c; the prototype is not in the plugin.
  Source: reports/2026-11-18-research/incident-lab/score6.txt, runs6/flaky-*.jsonl, hangwatch/rerun.py; reports/2026-11-18-research/incident-lab/README.md.

## Bounded Waits

- [ ] **REQ-VERIFICATION-103** claudetto shall make the agent give each test that waits on something a time limit through the test framework, so a hang fails that one test with its name instead of stalling the whole run: Swift Testing `.timeLimit(.minutes(1))` on the test or suite, `pytest-timeout`, `go test -timeout`, Jest `testTimeout`.
  Rationale: the OpenJoystickDriver fix added `@Test(.timeLimit(.minutes(1)))` only after the hang (e82d87d1.jsonl:2056). Swift Testing accepts minutes only: `.seconds` is marked unavailable with "Time limit must be specified in minutes", and the trait is both a test and a suite trait (Testing.swiftmodule arm64-apple-macos.swiftinterface, Command Line Tools on this machine, 2026-11-18). A one-minute floor is still 30 times shorter than the 32 minutes lost.
  Acceptance: on `trap-loop`, `check_loop.py` swaps in a `deliver()` that never returns (a mutant) and runs the agent's own tests with a 120 s cap; in at least 4 of 5 claudetto runs per model the suite ends with a failure instead of hanging, and claudetto hangs in fewer runs than vanilla. Verification: test.
  Basis: measured (incident and interface read; the mutant check hangs a suite with no time limit at the 120 s cap, 2026-11-18). On `trap-loop` the mutant hung vanilla's suite in 10 of 10 runs, so the measure is admitted. The rule text in `bounded.md` fails the acceptance: the mutant ended the suite in 2 of 5 Opus runs, both with a hand-written thread `time_limit` decorator, and in 0 of 5 Sonnet runs (score7.txt). The same rule can also cause harm: in one interactive `trap-hang` run under it, Opus wrapped `make test` in a perl alarm. The alarm killed `make` and orphaned the hung test child, and the agent reported it stopped (runs-tmux/hang-opus-claudetto-4.json). A per-command wall-clock wrapper is therefore not an acceptable bound. Python `unittest` has no built-in time limit, so the agent must write one; a trap on a framework with a built-in limit (Swift Testing, `go test`) tests the cheaper case. The next candidate is a project-level limit set once (a suite trait, `pytest-timeout` in the config, `go test -timeout` in the Makefile) in place of a per-test rule, and the outer bound of REQ-DELEGATION-046 covers the hang meanwhile. Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/e82d87d1-ad1f-491a-ac1a-461bf5c46eb4.jsonl:2056,2063; /Library/Developer/CommandLineTools/Library/Developer/Frameworks/Testing.framework/Versions/A/Modules/Testing.swiftmodule/arm64-apple-macos.swiftinterface:1214-1235; reports/2026-11-18-research/incident-lab/score7.txt, runs7/loop-*.check.json.
