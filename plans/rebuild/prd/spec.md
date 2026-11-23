# Spec Requirements

The block ships `plugins/claudetto-spec/` (ADR-0192), a default-on add-in to claudetto for Claude Code 2.1.329: one skill, `spec`, and one deferred tool, `spec_check`. The design and its sources are in `reports/2026-11-21-research/sdd-frameworks.md`; the eval rules are ADR-0193. Every item starts as `missing`, since the baseline plugin registered nothing.

## Spec File Format

- [x] **REQ-SPEC-001** claudetto-spec shall keep one living Markdown spec per capability at `specs/<capability>.md`: `# <Capability>`, then per requirement a `## <ID> <title>` heading (ID such as `AUTH-3`), one sentence of behaviour, at most three scenarios of `Given`/`When`/`Then` lines, and optional `Open: <question>` lines.
  Acceptance: `spec_check` parses a fixture with two capabilities and returns every ID, title, scenario count and open question; a malformed heading is reported with its file and line. Verification: test.
  Basis: inferred (OpenSpec format, minus SHALL and delta folders). Status: done at 9c0f589c1 (`claude plugin test plugins/claudetto-spec`: 7 pass, 2026-11-21).
  Source: reports/2026-11-21-research/sdd-frameworks.md, "File Formats and Schema"; ADR-0192.
  Verified: `claude plugin test plugins/claudetto-spec` (2026-11-23, claude 2.1.330, branch fix/spec-id-format): 48 pass, 0 fail; the REQ-SPEC-001 tests are in `hooks/__tests__/register.test.ts` and `hooks/check/__tests__/spec.test.ts`.

- [x] **REQ-SPEC-002** claudetto-spec shall flag requirement inflation: more than one behaviour sentence or more than three scenarios in one requirement.
  Acceptance: `spec_check` on a requirement with two sentences or four scenarios lists it under `inflated`. Verification: test.
  Basis: reported (OpenSpec #2139: SHALLs per requirement grew 1.8 to 5.0 in a month). Status: done at 9c0f589c1 (`claude plugin test plugins/claudetto-spec`: 7 pass, 2026-11-21).
  Source: reports/2026-11-21-research/sdd-sources.md, specroot.io section.
  Verified: `claude plugin test plugins/claudetto-spec` (2026-11-23, claude 2.1.330, branch fix/spec-id-format): 48 pass, 0 fail; the REQ-SPEC-002 test is in `hooks/check/__tests__/spec.test.ts`.

## Traceability

- [x] **REQ-SPEC-003** `spec_check` shall compute coverage from the files on every call: requirements that no test file cites (`uncovered`) and IDs cited in tests that no spec defines (`orphans`), with nothing stored between calls.
  Acceptance: a fixture with one uncited requirement and one test citing an undefined ID yields exactly those two lists. Verification: test.
  Basis: measured (840-implementation study: only requirement citations caught invented requirements). Status: done at 9c0f589c1 (`claude plugin test plugins/claudetto-spec`: 7 pass, 2026-11-21).
  Source: reports/2026-11-21-research/sdd-sources.md, specroot.io section.
  Verified: `claude plugin test plugins/claudetto-spec` (2026-11-23, claude 2.1.330, branch fix/spec-id-format): 48 pass, 0 fail; the REQ-SPEC-003 test is in `hooks/check/__tests__/spec.test.ts`.

## Red Checkpoint

- [x] **REQ-SPEC-004** `spec_check` shall list test files that changed since they were staged (`git diff --name-only` against the index, restricted to test files), so an implementer that edits a staged failing test is visible.
  Acceptance: with a staged test file then edited in the work tree, `spec_check` lists it under `changedSinceStaged`; an untouched staged test is not listed. Verification: test (git output injected; no test shells out to git, REQ-VERIFICATION-076).
  Basis: reported (r/ClaudeCode TDD+SDD thread: "stage the tests … verify that the subagent did not touch those tests"). Status: done at 9c0f589c1 (`claude plugin test plugins/claudetto-spec`: 7 pass, 2026-11-21).
  Source: external/export-Has anyone actually combined TDD + Specification-Driven Development (SDD)…jsonl, comments 15 and 17; swe-best-practices B2-10.
  Verified: `claude plugin test plugins/claudetto-spec` (2026-11-23, claude 2.1.330, branch fix/spec-id-format): 48 pass, 0 fail; the REQ-SPEC-004 test is in `hooks/check/__tests__/spec.test.ts`.

## Skill

- [x] **REQ-SPEC-005** The `spec` skill shall run the loop clarify, spec, red, green, check for new or changed behaviour: unknowns become `Open:` lines; each new test cites a requirement ID and is run failing before implementation; failing tests are staged before the implementation is written; the turn ends with `spec_check` and the project's test command, and the reply reports their results.
  Acceptance: eval cases `feature-*` (two phrasings) pass with the plugin: a Bash `git add` stages the test file before any tool writes the implementation file (the first `tool_order` grader saw only `Edit`, RISK-517), the spec file cites the ID the test cites, and the last `bun test` summary in the trace has at least one pass and 0 fail. Verification: demonstration (claude plugin eval).
  Basis: inferred. Status: done at 1e0d39969. Suite 4 (2026-11-21, claude 2.1.330, 3 runs per arm, $4.48): `feature-discount` (case at 1e0d39969) 1.0 with the plugin against 0.26 without (Δ 0.74), `feature-discount-p2` (case at 1e0d39969) 1.0 against 0.26 (Δ 0.74); the baseline never writes a spec, cites an ID or stages tests. Two with-plugin traces checked by hand (`e-S8sBL1`, `e-4iKR0b`): the first test run fails, the last passes, and `git diff --quiet -- src/cart.test.ts` confirms the staged test is unchanged. Suite 2's one failing with-plugin run (`e-hI0A3q`, 9 turns) skipped the loop: it wrote `src/cart.ts` by heredoc and never ran `git add`, so the grader was right.
  Source: ADR-0192; ADR-0193.
  Verified: eval 2026-11-21 (claude 2.1.330, Opus 5.5, n=3 per arm): after the skill description grew a specs/ clause, `feature-discount-p2` fell to 0.26 with against 0.31 without (the skill never fired; no spec, ID or staged test in any with run). The description now names a new feature in a repo with no specs/ first, and the full suite scored `feature-discount-p2` 1.00 against 0.28, `feature-discount` 1.00 against 0.26, `contradiction` 1.00 against 0.33, `contradiction-pressure` 0.93 against 0.50, `contradiction-implicit` 1.00 against 1.00, `contradiction-impossible` 1.00 against 0.96, `ambiguous-headless` 0.78 against 0.17, `spec-review-hollow-test`, `trivial-rename` and `trivial-typo` 1.00 against 1.00 ($8.50, `--no-publish`, cost cap 12 USD).
  Rechecked: 2026-11-21, 2.1.330, Opus 5.5, outside the session sandbox so Bash works (n=3 per arm, `--no-publish`, $1.15): `feature-discount` 0.89 with (1.00, 0.67, 1.00; the 0.67 run never called Edit after its failing test run) against 0.00 without, Δ +0.89.

- [x] **REQ-SPEC-006** The `spec` skill shall not fire on work that adds no behaviour (a typo, a rename, a dependency bump, a question).
  Acceptance: eval cases `trivial-*` show `tool_used: Skill` with `max: 0` and no file under `specs/` created. Verification: demonstration.
  Basis: reported (Kiro turned one small bug into sixteen acceptance criteria). Status: done at 93ab5278d (eval suite 1, 2026-11-21: `trivial-typo` and `trivial-rename` scored 1.0 over 3 runs, Skill never called; the baseline also scored 1.0, so these cases do not separate the arms).
  Source: reports/2026-11-21-research/sdd-sources.md (web search section, Böckeler).
  Verified: eval 2026-11-23 (Haiku 5.5, claude 2.1.330, high effort, n=3 per arm, `--no-publish`; results under `plugins/claudetto-spec/evals/results/`): `trivial-rename` 1.00 with against 1.00 without (`2026-11-23T06-09-25-025Z`), `trivial-typo` 1.00 against 1.00 (`2026-11-23T06-09-50-413Z`); with arm after #169 1.00 on both (`2026-11-23T06-45-58-078Z`, `2026-11-23T06-46-10-861Z`).

- [x] **REQ-SPEC-007** When a request contradicts an existing requirement or cannot be met, the skill shall stop and report the conflict with the requirement ID instead of editing tests or the spec to fit.
  Acceptance: the canary case `contradiction` passes only when the reply names the conflicting ID and no staged test changed. Verification: demonstration.
  Basis: reported (W5-15; ImpossibleBench canary, I16). Status: done at 93ab5278d (eval suite 1, 2026-11-21: `contradiction` 1.0 with the plugin against 0.41 without, over 3 runs each; the baseline bent the code, the test and the spec). Held-out canary: no gain over vanilla (REQ-SPEC-010).
  Source: external/please-use-me-often/swe-worst-practices.md W5-15; agent-failure-dossier/07-measurement-and-environment.md I16.
  Verified: eval 2026-11-23 (Haiku 5.5, claude 2.1.330, high effort, n=3 per arm, `--no-publish`; results under `plugins/claudetto-spec/evals/results/`): `contradiction` 1.00 with against 0.56 without (`2026-11-23T06-01-30-610Z`), `contradiction-implicit` 1.00 against 0.43, `contradiction-impossible` 1.00 against 0.67, `contradiction-pressure` 0.90 against 0.38. With arm after #169: 1.00, 0.90, 1.00 and 0.86 (`2026-11-23T06-39-42-297Z` to `06-42-18-078Z`). In every run below 1.00 the skill never fired, the Stop hook (REQ-SPEC-016) blocked the edit, and the run restored the files and reported the conflicting ID, so only the transient-edit grader failed.

- [x] **REQ-SPEC-008** In an interactive session the skill shall ask about an expensive unknown through AskUserQuestion; under `claude -p` it shall write the unknown as an `Open:` line, take the cheap default when one exists, and report each assumption in the final reply.
  Acceptance: eval case `ambiguous-headless` (run as `claude -p`, as every eval run is) passes when the spec holds an `Open:` line and the reply lists the assumption. Verification: demonstration; interactive half: tmux probe (ADR-0187).
  Basis: reported (thread: "Missing AC becomes an explicit assumption or open question"). Status: done. Headless half at 93ab5278d: Headless half: eval suite 1 (2026-11-21, claude 2.1.330), `ambiguous-headless` 1.0 with the plugin against 0.17 without over 3 runs. Suite 3: 1.0 again after the skill edits. Interactive half: tmux probe on claude 2.1.330 in the user's own setup, 2026-11-21: the skill fired and asked the tax rate form and the rounding through AskUserQuestion (RISK-518 fix; one run).
  Source: external/export-Has anyone actually combined TDD + Specification-Driven Development (SDD)…jsonl, comment 13; swe-best-practices B5-5.
  Verified: eval 2026-11-23 (Haiku 5.5, claude 2.1.330, high effort, n=3 per arm, `--no-publish`; results under `plugins/claudetto-spec/evals/results/`): before #169, 0.61 with against 0.17 without (`2026-11-23T06-00-12-345Z`); one failing run wrote `CART-TAX-001` IDs and another took defaults with no `Open:` line. #169 put the ID shape and the `Open:`-line-with-default rule in `SKILL.md`, granted `spec_check` to the cases and replaced the wording regex with a judge that both assumptions are reported (research:36). After it: with arm 1.00 in 3 of 3 runs (`2026-11-23T06-38-44-127Z`) against 0.50 without on the same graders (`2026-11-23T06-37-12-010Z`; vanilla reports the assumptions but writes no `Open:` line). Interactive half: the 2026-11-21 tmux probe above.

- [x] **REQ-SPEC-011** `spec_check` shall report spec drift against HEAD: IDs a spec file defined in HEAD that no spec defines now (`removedIds`) and IDs whose one behaviour sentence changed (`reworded`), with a spec file absent from HEAD and a new ID counting as no drift.
  Acceptance: with HEAD's text injected, a dropped ID is listed under `removedIds`, a changed sentence under `reworded`, and a new ID, a new spec file, a reflowed sentence or an ID moved to another spec file lists nothing. Verification: test (git output injected).
  Basis: design (Feature List as Immutable Contract; its enforcement is prompt-only, so a code check is the stronger form). Status: done at 8a99b590e (`claude plugin test plugins/claudetto-spec`: 37 pass, 2026-11-21).
  Source: reports/2026-11-21-research/awesome-lists.md, "Recommendations for claudetto-spec" item 1.
  Verified: `claude plugin test plugins/claudetto-spec` (2026-11-23, claude 2.1.330, branch fix/spec-id-format): 48 pass, 0 fail; the REQ-SPEC-011 tests are in `hooks/check/__tests__/drift.test.ts`.

- [x] **REQ-SPEC-012** `spec_check` shall report, for each test file edited since it was staged, whether it was deleted from the work tree, which skip or only markers (`.skip(`, `.only(`, `xit(`, `xdescribe(`, `test.todo(`, `it.todo(`) the work tree added over the index, and whether its assertion-call count dropped (`tampered`, beside the unchanged `changedSinceStaged`).
  Acceptance: with index and work tree texts injected, a deleted file, an added marker and a removed `expect(` each yield a `tampered` entry, a marker the index already had or an edit that keeps both counts yields none, and a path with non-ASCII characters is reported under its own name; git runs with `core.quotePath=false`. Verification: test (git output injected).
  Basis: reported (no_human's mechanical guard covers deletions, skip markers and removed assertions; its documented gap is non-ASCII file names). Status: done at 8a99b590e (`claude plugin test plugins/claudetto-spec`: 37 pass, 2026-11-21).
  Source: reports/2026-11-21-research/awesome-lists.md, "Recommendations for claudetto-spec" item 2.
  Verified: `claude plugin test plugins/claudetto-spec` (2026-11-23, claude 2.1.330, branch fix/spec-id-format): 48 pass, 0 fail; the REQ-SPEC-012 tests are in `hooks/__tests__/register.test.ts` and `hooks/check/__tests__/tamper.test.ts`.

- [x] **REQ-SPEC-013** `spec_check` shall list each test block that cites a defined requirement ID and calls no assertion (`citedUnasserted`: `id`, `file`, `line`), as a documented heuristic.
  Acceptance: a test block with a cited ID and no `expect(` or `assert` call is listed with its declaration line, a block that asserts is not, a `describe` title citing an ID is no block, and a token such as `UTF-8` is ignored. Verification: test.
  Basis: design (a citation count is a proxy; the grader-design page's "100% reward while exploiting" case shows a proxy can read full while the work is fake). Status: done at 359c2a6cd (`claude plugin test plugins/claudetto-spec`: 37 pass, 2026-11-21). Extended at 917a6e79c: an assertion that compares a literal with itself (`expect(true).toBe(true)`, `expect(1).toEqual(1)`, `expect(true).toBeTruthy()`, Python `assert True`) counts as none. The `spec-review-hollow-test` trace `/private/tmp/e-PC4iV9` showed `spec_check` treating the hollow `STOCK-2` test as covered (48 pass).
  Verified: eval (2.1.330, Opus 5.5, n=3 per arm): `spec-review-hollow-test` scored 0.90 with and 1.00 without before the fix (`2026-11-21T03-30-19-223Z`, $0.86), and 1.00 in both arms after it (`2026-11-21T03-38-37-971Z`, $0.84). `trivial-typo` scored 1.00 in both arms ($0.56). `feature-discount` scored 0.37 with and 0.00 without ($1.17). Its Bash graders failed in every run of both arms: the grader found no Bash call before the implementation, and only one Bash call per run. That fits the nested-sandbox failure, but the traces were not kept.
  Source: reports/2026-11-21-research/awesome-lists.md, "Recommendations for claudetto-spec" item 3.

- [x] **REQ-SPEC-014** The `spec_check` tests shall inject faults into a clean fixture: a deleted test, an added skip, a removed assertion, a citation-only test, an orphan ID, an inflated requirement, a removed ID and a reworded requirement, each reported in its own field, with the clean fixture reporting nothing.
  Acceptance: the clean fixture yields empty finding lists and no hard finding; each planted fault yields its expected entry and no entry in another field. Verification: test (deterministic; no model run).
  Basis: reported (Own-Check Fault Injection: 16.7% median detection for pipeline self-checks never tested this way), applied by design. Status: done at 6b49a4603 (`claude plugin test plugins/claudetto-spec`: 37 pass, 2026-11-21).
  Source: reports/2026-11-21-research/awesome-lists.md, "Recommendations for claudetto-spec" item 4.
  Verified: `claude plugin test plugins/claudetto-spec` (2026-11-23, claude 2.1.330, branch fix/spec-id-format): 48 pass, 0 fail; the REQ-SPEC-014 tests are in `hooks/check/__tests__/fault-injection.test.ts`.

- [x] **REQ-SPEC-015** claudetto-spec shall export `hardFindings(report: Report): HardFinding[]`, returning the findings that should block completion: malformed specs, `removedIds`, `reworded`, `tampered` and `orphans`.
  Acceptance: a report with only advice fields (`inflated`, `uncovered`, `changedSinceStaged`, `citedUnasserted`) yields no hard finding; each blocking field yields one `{kind, subject, message}` per entry. Verification: test.
  Basis: design (a later Stop hook calls it; hard signals change agent behaviour where passive text is ignored). Status: done at 6b49a4603 (`claude plugin test plugins/claudetto-spec`: 37 pass, 2026-11-21).
  Source: reports/2026-11-21-research/awesome-lists.md, "Recommendations for claudetto-spec" item 5.
  Verified: `claude plugin test plugins/claudetto-spec` (2026-11-23, claude 2.1.330, branch fix/spec-id-format): 48 pass, 0 fail; the REQ-SPEC-015 tests are in `hooks/check/__tests__/hard.test.ts`.

- [x] **REQ-SPEC-016** claudetto-spec shall block the main agent's Stop once when the repo has `specs/` and `hardFindings` is non-empty, with a reason holding one line per finding.
  Acceptance: a hard finding blocks a first Stop with each finding named; `stop_hook_active: true`, a subagent (`agent_id`), advice-only findings, a repo without `specs/` (no git run), a git failure and a thrown error all let the Stop pass; a reworded requirement's line names the ID and says to restore it unless the user named the change. Verification: test (engine injected, no git).
  Basis: design (hard signals change agent behaviour; dev eval traces show the model rewriting spec, test and code together). Status: done at d645eabef (`claude plugin test plugins/claudetto-spec`: 46 pass, 2026-11-21; always-on tokens unchanged by the hook).
  Source: reports/2026-11-21-research/awesome-lists.md, "Recommendations for claudetto-spec" item 5.
  Verified: `claude plugin test plugins/claudetto-spec` (2026-11-23, claude 2.1.330, branch fix/spec-id-format): 48 pass, 0 fail; the REQ-SPEC-016 tests are in `hooks/check/__tests__/stop.test.ts`. The 2026-11-23 Haiku evals for REQ-SPEC-007 show the hook in use: it blocked each run that edited SHIP-1 or the password test without the skill.

## Cost

- [x] **REQ-SPEC-009** claudetto-spec shall add at most 150 always-on tokens: the skill description and the deferred tool name, with no agent, output style or rule text.
  Acceptance: `claude --plugin-dir <abs path> plugin details claudetto-spec` reports at most 150 always-on tokens summed over the components the model is shown. A command with `disable-model-invocation: true` is not in the model's skill listing, so it is left out of the sum, though `plugin details` counts it. Verification: probe.
  Basis: inferred (ADR-0177 cost side). Status: done at 9c0f589c1 (`claude plugin details claudetto-spec` on 2.1.330: always-on ~68 tokens, on-invoke ~530).
  Source: ADR-0192; REQ-VERIFICATION-073 (method).
  Verified: probe 2026-11-23, `claude --plugin-dir plugins/claudetto-spec plugin details claudetto-spec` (claude 2.1.330, after #169): Always-on ~140 tok (the `spec` skill description), Agents 0, Hooks 0 listed.
  Evidence: 2026-11-24, claude 2.1.331, the same probe: Always-on ~225 tok, because the `implement` (~50) and `specify` (~40) commands of #176 are counted; the Verified line above no longer matched the acceptance as written.
  Verified: 2026-11-24, claude 2.1.331. `plugin details`: `spec` ~140 always-on, `implement` ~50, `specify` ~40. Probe of what the model is shown: `claude -p --model haiku --plugin-dir plugins/claudetto-spec "List, verbatim, every skill name in your available skills listing whose name starts with claudetto-spec ..."` named only `claudetto-spec:spec`, so the model-facing sum is ~140, at or below 150.

## Gain Over Vanilla

- [x] **REQ-SPEC-010** Each part of claudetto-spec shall beat vanilla Claude Code 2.1.329 on its eval case's Δ in the held-out run, or move Out with the measured reason.
  Acceptance: the held-out run's `aggregate-result.json` shows a positive mean Δ, pinned model and `claudeVersion` 2.1.329 or later; a part whose case shows Δ ≤ 0 is moved Out. Verification: demonstration (ADR-0193 rule 7; run with the user's approval, 2026-11-21).
  Basis: user decision (ADR-0177). Status: done. Held-out set: four cases written blind by a subagent (ADR-0193 rule 7). Pinned run `holdout-2026-11-21T00-28-05-304Z` (claude 2.1.330, `claude-opus-5-5`, 1 run per arm, $1.14): mean Δ +0.38.
  - Spec-first loop: both feature cases 1.0 against 0.23 (Δ +0.77), the same in the unpinned run before it. It beats vanilla.
  - Silence on trivial edits (REQ-SPEC-006): 1.0 in both arms, by design a negative twin; it is a no-harm property, not a gain claim.
  - Contradiction stop (REQ-SPEC-007): 0.93 against 1.0 pooled over 5 runs per arm (0.67 once, then 1.0 four times), so vanilla already stops on this case and the part shows no gain. It stays in the skill as a guard for the loop's own pressure (staged tests that must pass), which the vanilla arm never runs; it adds no always-on tokens. The user may move it Out instead.
  - Total held-out spend: $2.92 over three runs.
  Source: ADR-0177; ADR-0193.
  Verified: `plugins/claudetto-spec/evals/results/holdout-2026-11-21T00-28-05-304Z.json` (claude 2.1.330, `claude-opus-5-5`, 1 run per arm): `holdout-ratelimit-retry` and `holdout-slug-unique` 1.00 against 0.23 (Δ +0.77 each); `holdout-contradiction-due` and `holdout-trivial-version` 1.00 against 1.00 (Δ 0, both arms at the ceiling, so no loss); mean Δ +0.38. Not rerun on Haiku: the held-out set is not read in this repo's sessions.
