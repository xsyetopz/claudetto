# Verification Requirements

Verified (batch, test-checked requirements): `just verify`, claude 2.1.329, 2026-11-24: exit 0, 834 tests in 102 files, 0 fail; covers REQ-VERIFICATION-059, REQ-VERIFICATION-104; test files `tools/__tests__/check-catch.test.ts`, `tools/__tests__/eval-recipe.test.ts`.

## Probe Harness Pattern

- [x] **REQ-VERIFICATION-030** claudetto shall probe with a real `claude` against a fake Messages API (no paid tokens) with settings in the run's own config dir, a tmux TUI harness for interactive dialogs, and `claude plugin test` (fires real hook events with no session, model, or network; mods since 2.1.287). `claude -p` with a relative `--plugin-dir` silently loads nothing.
  Verified: fake-API probe and plugin test, claude 2.1.327, 2026-11-18, `claude -p hi --plugin-dir <abs path> --output-format stream-json --verbose` with ANTHROPIC_BASE_URL=<http://127.0.0.1:9> and an empty CLAUDE_CONFIG_DIR: init lists claudetto@inline and no paid call is made; `claude plugin test plugins/claudetto`: 25 pass, 0 fail; the same -p run with a missing relative --plugin-dir lists plugins [] and a non-empty plugin_errors (exit 1), so a harness can detect it. The tmux harness is ADR-0187's.
  Acceptance: A probe run against the fake API completes with no paid tokens. Verification: probe.
  Basis: measured. Status: partial at 088a227c.
  Source: tools/fake-api/usage.ts@088a227c; claude 2.1.327: `--plugin-dir` present (chunk-nj3089xn.js@517). Not located: the old-plan lines that gave the harness pattern.
  Verified: probe 2026-11-19, claude 2.1.327, cc-inspect fake API with an absolute --plugin-dir: 3 requests, the claudetto agents listed, no paid call.
  Verified: PASS: probe 2026-11-24, claude 2.1.331, `claude -p hi --plugin-dir <dir> --output-format stream-json --verbose` against the local fake API (tools/measure-tools/fake-api.ts), empty CLAUDE_CONFIG_DIR: with an absolute dir, init lists claudetto@inline, 1 request, no paid call; with a relative dir resolved from another cwd, init lists no claudetto and plugin_errors holds `path-not-found`, and the exit is now 0 (1 on 2.1.327), so a harness must read plugin_errors, not the exit code.
  Verified: 2026-11-24, claude 2.1.329, `bun reports/2026-11-24-research/pin-2-1-329/listing.ts`: against the fake API, `claude -p hi --plugin-dir` with an absolute dir loaded `claudetto@inline` in 1 request, exit 0, no paid token; a relative dir resolved from another cwd exited 0 with `path-not-found` in `plugin_errors`.

## Git Hooks Check

- [x] **REQ-VERIFICATION-032** Moved Out as OUT-3052: the pre-push hook and the hooks-path guard were removed in commit 9fdce2231 (user decision, 2026-11-19).

## Red Baseline and Validator Test

- [x] **REQ-VERIFICATION-059** claudetto shall record the `just check` baseline and shall test `claude plugin validate --strict --json` for `hasCatch:false` and a second gating hook.
  Acceptance: `just verify` fails on a plugin whose `claude plugin validate --json` report has a gating hook with `hasCatch:false`. Verification: test (tools/**tests**/check-catch.test.ts).
  Basis: measured. Status: partial at 088a227c (tools/validator.ts, tools/guard-catch.test.ts exist).
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/tasks.md:38; tools/validator.ts:1@088a227c.
  Verified: claude 2.1.327, 2026-11-18, `claude plugin validate plugins/claudetto --strict` failed on the six gating hooks without `.catch` before commit 67e9597ab and passes after it; `just verify` runs it before each push, so no repo-own validator test is kept.
  Decision: 2.1.327 fact: `claude plugin validate --strict` exits 0 on `hasCatch:false` (it only lists "gating hook without .catch"), so the earlier claim that validate fails was wrong; tools/check-catch.sh reads the JSON report and the justfile runs it per plugin.
  Verified: claude 2.1.327, 2026-11-19, `bun test tools/__tests__/check-catch.test.ts`: 2 pass, 0 fail; a copy of plugins/claudetto with the `.catch` removed from agent.spawn exits 1 and names agent.spawn, the shipped plugin exits 0 (before: no test; validate --strict exited 0 on the copy). Commit with the test; GitHub issue not opened because gh issue create was denied by the permission classifier.

## Paid Runs

- [x] **REQ-VERIFICATION-067** Moved Out as OUT-2400: the part is not in plugins/.

## Probe Launcher Cap

- [x] **REQ-VERIFICATION-068** Moved Out as OUT-2401: the part is not in plugins/.

## Test Practice

- [x] **REQ-VERIFICATION-072** Moved Out as OUT-2402: the part is not in plugins/.

- [x] **REQ-VERIFICATION-073** claudetto shall measure always-on tokens added by skills, agents, and CLAUDE.md with `plugin details` per Claude Code release, compare real invocations to eval cases to find tested-but-never-used skills, and treat a tool the agent never calls as dead weight.
  Verified: `claude plugin details --help`, claude 2.1.327, 2026-11-18: "Show a plugin's component inventory and projected token cost" exists in vanilla, so no claudetto code is needed (it resolves installed plugins only; a path gave "not found"). plugins/claudetto ships three agents and one output style (ADR-0099), so its always-on text is their descriptions.
  Acceptance: the measure lists always-on tokens per release; `claude --plugin-dir <abs path> plugin details claudetto` reports this plugin at about 92 always-on tokens (Agents 3, Skills 0, one SessionStart hook with no model-context cost; 2.1.327, 2026-11-19). Graph-index MCP A/B (measured: 4 runs, both arms perfect, graph arm +40% time on an edit task). A lean-rules plugin of about 650-900 tokens cut cost per task 51% (Opus 5.5 max), 55% (Sonnet 5.5 max), 11% (Opus medium), about 0 (Sonnet medium). Verification: probe.
  Basis: measured. Status: missing at 088a227c.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:697.
  Decision: ADR-0099: the built-in agents are replaced by the Greek agents Artemis, Athena and Heracles shipped in plugins/claudetto/agents; the earlier "no skills, agents or rules" and the 183-token figure described the plugin before that. `plugin details` resolves a loaded plugin with `--plugin-dir`.
  Verified: claude 2.1.327, 2026-11-19, `claude --plugin-dir $PWD/plugins/claudetto plugin details claudetto`: Skills (0), Agents (3) Artemis, Athena, Heracles, always-on ~92 tok (about 30 per agent).
  Verified: claude 2.1.331, 2026-11-24, `claude --plugin-dir $PWD/plugins/claudetto plugin details claudetto`: Skills (0), Agents (4) Artemis, Athena, Hermes, Heracles, one SessionStart hook with no model-context cost, always-on ~128 tok (Hermes ~40, the others ~30 each). The rise from ~92 is the Hermes agent of REQ-TOOLS-005 (3c6a96e66).
  Verified: 2026-11-24, claude 2.1.329, `claude --plugin-dir "$PWD/plugins/claudetto" plugin details claudetto`: Agents 4 (Artemis, Athena, Hermes, Heracles), Skills 0, one SessionStart hook with no model-context cost, always-on ~128 tok (the fourth agent, Hermes, makes it 128 rather than 92).

## Narrow Runs

- [x] **REQ-VERIFICATION-075** Moved Out as OUT-2769: ADR-0177 and ADR-0190: on its fault prompt vanilla 2.1.327 passed in 3 of 3 Sonnet 5.5 runs and the style line tied, so no line ships (reports/2026-11-19-research/conduct).

## Isolated Tests

- [x] **REQ-VERIFICATION-076** claudetto shall test in isolation at the real layer: recorded data over hand-written fakes; never a live cluster; a clean env without inherited git-hook variables; no real secrets in the clone; the harness tested at the user-visible layer; both hook tests and evals kept. No test shells out to `git` (a trap `git` stub first on PATH plus `GIT_CONFIG_GLOBAL=/dev/null` showed the log never created); hooks start no process that outlives the hook.
  Verified: trap git stub first on PATH plus GIT_CONFIG_GLOBAL=/dev/null, claude 2.1.327, 2026-11-18, `claude plugin test plugins/claudetto`: 25 pass, the stub log was never created, so no test shells out to git.
  Acceptance: a test run creates no `git` call and no leftover process. Verification: test.
  Basis: reported (of 97 testable harnesses 60% have neither hook tests nor evals, 21% test themselves, 27% version evals, 7 do both). Status: partial at 088a227c.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/design.md:93; openspec/changes/2-1-325-rearchitecture/design.md:176.
  Verified: probe 2026-11-19, claude 2.1.327: a git stub first on PATH with GIT_CONFIG_GLOBAL=/dev/null; its log was never created across a full `claude plugin test plugins/claudetto`.
  Verified: 2026-11-24, claude 2.1.329, a git stub first on PATH plus GIT_CONFIG_GLOBAL=/dev/null, `claude plugin test` on the three plugins: 332, 54 and 172 pass; the stub log was never created and no test process was left running.

## Mod Rebuild Tests

- [x] **REQ-VERIFICATION-080** claudetto shall test a rebuild as a mod with `claude plugin test` (`plugin.json`, `hooks/hooks.json` naming its module, own tests), where an unanswered model call throws and names the event so nothing reaches a provider; the model-call test asserts the fork request the handover sends: its prompt and `effort: "low"`, with no model, because a fork inherits the session's model and cache. `claude plugin validate` and `claude plugin test` do not write `.claude-plugin/types`; a print run with `CLAUDE_CODE_PLUGIN_DIR_WATCH=1` does, so an orphan guard covers it.
  Verified: `claude plugin test plugins/claudetto`, claude 2.1.327, 2026-11-18: 25 pass, 0 fail. With the model.fork mock removed from a copy of clear.test.ts, the run fails with "claudetto: no implementation for session.messages", naming the event, so nothing reaches a provider. The four-field request assertion (model, effort, maxTokens, cache:true) is not built: it would be a needless test (ADR-0087).
  Acceptance: an unanswered model call fails the test with the event name; a request test checks the fields the request carries (prompt, effort, no model) and no provider is reached. Verification: test.
  Basis: measured (2.1.319; `CLAUDE_CODE_PLUGIN_DIR_WATCH` is present in 2.1.326, code search chunk-2ew0jg68.js@16837 (2.1.327)). Status: partial at 088a227c (`plugins/claudetto-you-should-know/hooks/register-check.test.ts` asserts `maxTokens`).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/design.md:186; openspec/specs/builtin-rebuild/spec.md:136; openspec/specs/builtin-rebuild/spec.md:143.
  Decision: REQ-HANDOVER-053 and ADR-0087: `$.model.fork` takes only a prompt and an effort, so `maxTokens` and `cache:true` are not fields of any request claudetto sends; the four-field list described a `$.model.complete` call that claudetto does not make.
  Verified: claude 2.1.327, 2026-11-19, `claude plugin test plugins/claudetto`: 101 pass, 0 fail; compact.test.ts "the handover fork asks for low effort and names no model" asserts effort low, no model key and the Constraints prompt; changing effort to "high" in writer.ts made it fail; a missing model.fork mock throws naming the event.
  Verified: 2026-11-24, claude 2.1.329, `claude plugin test plugins/claudetto`: with effort "low" changed to "high" in `hooks/handover/writer.ts`, "the handover fork asks for low effort and names no model" fails; with the model.fork mock removed from `clear.test.ts`, the ui log reads "claudetto handover fork failed: no implementation for model.fork", naming the event, and no provider is reached.

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
  Verified: not re-run 2026-11-19: `just bump` edits plugin.json, which this session may not change; static evidence: justfile:25-26 (release = bump then verify).
  Verified: demonstration, 2026-11-24: `just bump claudetto </dev/null` took plugin.json 0.1.0 to 0.1.1 with no ask and exit 0; the file was then restored; `project.just` recipe `release` runs `bump` before `verify`.
  Verified: demonstration, claude 2.1.329, 2026-11-24: `just bump claudetto </dev/null` took plugin.json 0.1.0 to 0.1.1 with no ask and exit 0; the file was restored afterwards.

- [x] **REQ-VERIFICATION-090** claudetto shall publish nothing to a marketplace and push no release without the user's confirmation, and push a branch only after a green check, never forced.
  Acceptance: the agent asks before publishing. Verification: demonstration.
  Basis: user decision. Status: partial at 088a227c (setup/command-rules.ts:10-12 deny `git push --delete` and force pushes; `git grep -n -i marketplace 088a227c -- plugins/claudetto/hooks/features/protected` finds no publish or release-push rule)
  Source: user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:2031); (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:473).
  Verified: probe, claude 2.1.327, 2026-11-18, cc-inspect cli `-p` with a Bash call `git push origin HEAD`: the tool result is "This command requires approval" in the default mode; setup writes no defaultMode (ADR-0190), and pre-push refuses a push on a red check.
  Verified: probe 2026-11-19, claude 2.1.327, fake API: Bash `git push origin HEAD` gives "requires approval" in request 2.
  Evidence: 2026-11-24, claude 2.1.331, fake API, `bun reports/2026-11-24-research/reverify/push.ts "gh release create v1"`: with claudetto the release command ran with no prompt (RISK-538); the 2.1.327 lines above probed vanilla only. A plain branch push runs with no prompt under claudetto, as REQ-GUARDS-070 sets.
  Status: cured 2026-11-24: ask rules for `gh release create`, `upload` and `edit` (RISK-538).
  Verified: 2026-11-24, claude 2.1.331, `push.ts` on both arms: `gh release create v1`, `git push origin --tags` and `claude plugin tag --push` each ask under claudetto, and the scratch remote gets no tag; `git push origin HEAD` pushes the branch.
  Verified: 2026-11-24, claude 2.1.329, fake API, `bun reports/2026-11-24-research/reverify/push.ts` with its default, then `"gh release create v1"` and `"git push origin --tags"`: `git push origin HEAD` pushed the branch under claudetto and was refused on vanilla's headless call; the release and the tag push were asked under claudetto ("haven't granted it yet"), and the bare remote got no ref from either.

## Goal Prompt

- [x] **REQ-VERIFICATION-091** claudetto shall ship a `/goal` prompt of at most 4,000 characters, with the old prompt's external references, for a new vanilla install.
  Verified: `wc -m plans/rebuild/goal.md`, claude 2.1.327, 2026-11-18: 3996 characters, at most 4000.
  Acceptance: `wc -m` on `plans/rebuild/goal.md` prints at most 4000. Verification: test.
  Basis: user decision. Status: missing at 088a227c (`git grep -n -i -E "4,?000" 088a227c -- tools` finds only the STOCK filler at tools/prompt-bytes.ts:16; no /goal prompt)
  Source: user decision, 2026-11-16 21:50 UTC, a goal prompt of at most 4000 characters (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:9249).
  Verified: `wc -m goal.md` prints 3996, 2026-11-19.
  Evidence: `wc -m plans/rebuild/goal.md`, claude 2.1.329, 2026-11-24: 4338 characters (4268 before PR #210), over 4000.
  Status: cured 2026-11-24; goal.md wording tightened, every rule, ADR and reference kept.
  Verified: `wc -m plans/rebuild/goal.md`, claude 2.1.329, 2026-11-24: 3994 characters, at most 4000.

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
  Verified: not re-run 2026-11-19: the trap-flaky arm needs paid runs; static evidence: none beyond the item.
  Verified: 2026-11-24, claude 2.1.329, `reports/2026-11-24-research/r101/run.sh` (cure 6, stream-json traces), 5 runs per arm and model: claudetto ran `test.sh` at least twice and called it flaky in 5 of 5 Sonnet 5.5 and 5 of 5 Opus 5.5 runs; vanilla did in 0 of 10 (reports/2026-11-24-research/r101/README.md).

## Eval Validity

- [x] **REQ-VERIFICATION-104** `just eval <plugin>` shall grant, with `--allow-tools`, every gated tool (outside the read-only set) that a case under `plugins/<plugin>/evals/*/case.yaml` lists in `allowed_tools`, and shall exit nonzero when the run prints `not granted`, so a run without a grant cannot pass as a score (issue #102).
  Acceptance: with a fake `claude` that prints `not granted`, the recipe exits 1 and names the cause; with one that exits 3 and prints nothing else, the recipe exits 3; the command line holds `--allow-tools Bash Edit Write mcp__claudetto__patch`. Verification: test.
  Basis: measured. Source: plugin-evals docs (code.claude.com/docs/en/plugin-evals#grant-tools): gated tools are `Bash`, `Write`, `Edit`, `WebFetch`, `WebSearch`; a tool a case asked for and the run did not grant is listed as `not granted`; a plugin's real MCP tools need `--allow-real-servers` or `--mocks off` plus a grant by name.
  Verified: PASS 2026-11-21, claude 2.1.330: `bun test tools/__tests__/eval-recipe.test.ts` 3 pass, 0 fail (fake `claude`, no paid run): the grant line, exit 1 on `not granted` with exit 0 from the eval, and exit 3 kept. Real run, 2026-11-21, outside the session sandbox: `just eval claudetto --case trivial-typo --runs 1 --max-cost-usd 2 --model claude-sonnet-5-5` printed no `not granted` line (each run before this recipe printed `not granted ... mcp__claudetto__patch`), scored 1.00 in both arms and cost $0.11 (results `2026-11-21T14-35-59-842Z`).
- [x] **REQ-VERIFICATION-105** A claudetto behavior check shall take the free route first (a unit test, a local replay of a saved trace or fixture, the fake-API probe `tools/measure-tools.ts`, or a saved eval result), and a paid eval runs only when no free route can answer the claim: it runs only the arm whose score is in question when the other arm has a saved result on the same Claude Code version, sets `--max-cost-usd`, and keeps a session's paid evals at or under $10, because eval runs spend the user's weekly usage.
  Acceptance: each paid eval named in a REQ's Verified line names the free route it could not replace and its cost, and a session's paid total stays at or under $10. Verification: inspection.
  Basis: reported, user, 2026-11-23: the user asked to limit eval spending because it draws down their weekly usage (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/81a52f28-aef4-4526-97a1-67d539912ef0.jsonl:351), chose a $10 cap per session (same file :362), and asked for a free or fake-API route first, with a paid run only where none exists (same file :379).
  Verified: inspection 2026-11-23. The session's only paid eval (REQ-REPLY-152, `count-after-change`) ran the claudetto arm alone (`--ablation none`, vanilla had a saved result on 2.1.330) with `--max-cost-usd 8`, cost $7.20, and its Verified line names the free route it could not replace. The session total is $7.20, under $10.
  Evidence: 2026-11-24, claude 2.1.329: this session ran the three eval suites the goal named, at $56.81 and $12.16 for two of them, plus the probes, so its paid total is over $10 (RISK-540).

## Bounded Waits

- [x] **REQ-VERIFICATION-103** Moved Out as OUT-2804: ADR-0177: the rule text failed its acceptance, ending the mutant suite in 2 of 5 Opus runs and 0 of 5 Sonnet runs, and caused harm in one interactive run (a perl alarm orphaned the hung test child); the cure needs a project-level limit that no short run reproduces (reports/2026-11-18-research/incident-lab/score7.txt).
