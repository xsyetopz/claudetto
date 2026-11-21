# Spec Requirements

The block ships `plugins/claudetto-spec/` (ADR-0192), a default-on add-in to claudetto for Claude Code 2.1.329: one skill, `spec`, and one deferred tool, `spec_check`. The design and its sources are in `reports/2026-11-21-research/sdd-frameworks.md`; the eval rules are ADR-0193. Every item starts as `missing`, since the baseline plugin registered nothing.

## Spec File Format

- [x] **REQ-SPEC-001** claudetto-spec shall keep one living Markdown spec per capability at `specs/<capability>.md`: `# <Capability>`, then per requirement a `## <ID> <title>` heading (ID such as `AUTH-3`), one sentence of behaviour, at most three scenarios of `Given`/`When`/`Then` lines, and optional `Open: <question>` lines.
  Acceptance: `spec_check` parses a fixture with two capabilities and returns every ID, title, scenario count and open question; a malformed heading is reported with its file and line. Verification: test.
  Basis: inferred (OpenSpec format, minus SHALL and delta folders). Status: done at 9c0f589c1 (`claude plugin test plugins/claudetto-spec`: 7 pass, 2026-11-21).
  Source: reports/2026-11-21-research/sdd-frameworks.md, "File Formats and Schema"; ADR-0192.

- [x] **REQ-SPEC-002** claudetto-spec shall flag requirement inflation: more than one behaviour sentence or more than three scenarios in one requirement.
  Acceptance: `spec_check` on a requirement with two sentences or four scenarios lists it under `inflated`. Verification: test.
  Basis: reported (OpenSpec #2139: SHALLs per requirement grew 1.8 to 5.0 in a month). Status: done at 9c0f589c1 (`claude plugin test plugins/claudetto-spec`: 7 pass, 2026-11-21).
  Source: reports/2026-11-21-research/sdd-sources.md, specroot.io section.

## Traceability

- [x] **REQ-SPEC-003** `spec_check` shall compute coverage from the files on every call: requirements that no test file cites (`uncovered`) and IDs cited in tests that no spec defines (`orphans`), with nothing stored between calls.
  Acceptance: a fixture with one uncited requirement and one test citing an undefined ID yields exactly those two lists. Verification: test.
  Basis: measured (840-implementation study: only requirement citations caught invented requirements). Status: done at 9c0f589c1 (`claude plugin test plugins/claudetto-spec`: 7 pass, 2026-11-21).
  Source: reports/2026-11-21-research/sdd-sources.md, specroot.io section.

## Red Checkpoint

- [x] **REQ-SPEC-004** `spec_check` shall list test files that changed since they were staged (`git diff --name-only` against the index, restricted to test files), so an implementer that edits a staged failing test is visible.
  Acceptance: with a staged test file then edited in the work tree, `spec_check` lists it under `changedSinceStaged`; an untouched staged test is not listed. Verification: test (git output injected; no test shells out to git, REQ-VERIFICATION-076).
  Basis: reported (r/ClaudeCode TDD+SDD thread: "stage the tests … verify that the subagent did not touch those tests"). Status: done at 9c0f589c1 (`claude plugin test plugins/claudetto-spec`: 7 pass, 2026-11-21).
  Source: external/export-Has anyone actually combined TDD + Specification-Driven Development (SDD)…jsonl, comments 15 and 17; swe-best-practices B2-10.

## Skill

- [x] **REQ-SPEC-005** The `spec` skill shall run the loop clarify, spec, red, green, check for new or changed behaviour: unknowns become `Open:` lines; each new test cites a requirement ID and is run failing before implementation; failing tests are staged before the implementation is written; the turn ends with `spec_check` and the project's test command, and the reply reports their results.
  Acceptance: eval cases `feature-*-v3` (two phrasings) pass with the plugin: a Bash `git add` stages the test file before any tool writes the implementation file (v1's `tool_order` saw only `Edit`, RISK-517), the spec file cites the ID the test cites, and the last `bun test` summary in the trace has at least one pass and 0 fail. Verification: demonstration (claude plugin eval).
  Basis: inferred. Status: done at 1e0d39969. Suite 4 (2026-11-21, claude 2.1.330, 3 runs per arm, $4.48): `feature-discount-v3` 1.0 with the plugin against 0.26 without (Δ 0.74), `feature-discount-p2-v3` 1.0 against 0.26 (Δ 0.74); the baseline never writes a spec, cites an ID or stages tests. Two with-plugin traces checked by hand (`e-S8sBL1`, `e-4iKR0b`): the first test run fails, the last passes, and `git diff --quiet -- src/cart.test.ts` confirms the staged test is unchanged. Suite 2's one failing with-plugin run (`e-hI0A3q`, 9 turns) skipped the loop: it wrote `src/cart.ts` by heredoc and never ran `git add`, so the grader was right.
  Source: ADR-0192; ADR-0193.

- [x] **REQ-SPEC-006** The `spec` skill shall not fire on work that adds no behaviour (a typo, a rename, a dependency bump, a question).
  Acceptance: eval cases `trivial-*` show `tool_used: Skill` with `max: 0` and no file under `specs/` created. Verification: demonstration.
  Basis: reported (Kiro turned one small bug into sixteen acceptance criteria). Status: done at 93ab5278d (eval suite 1, 2026-11-21: `trivial-typo` and `trivial-rename` scored 1.0 over 3 runs, Skill never called; the baseline also scored 1.0, so these cases do not separate the arms).
  Source: reports/2026-11-21-research/sdd-sources.md (web search section, Böckeler).

- [x] **REQ-SPEC-007** When a request contradicts an existing requirement or cannot be met, the skill shall stop and report the conflict with the requirement ID instead of editing tests or the spec to fit.
  Acceptance: the canary case `contradiction` passes only when the reply names the conflicting ID and no staged test changed. Verification: demonstration.
  Basis: reported (W5-15; ImpossibleBench canary, I16). Status: done at 93ab5278d (eval suite 1, 2026-11-21: `contradiction` 1.0 with the plugin against 0.41 without, over 3 runs each; the baseline bent the code, the test and the spec). Held-out canary: no gain over vanilla (REQ-SPEC-010).
  Source: external/please-use-me-often/swe-worst-practices.md W5-15; agent-failure-dossier/07-measurement-and-environment.md I16.

- [x] **REQ-SPEC-008** In an interactive session the skill shall ask about an expensive unknown through AskUserQuestion; under `claude -p` it shall write the unknown as an `Open:` line, take the cheap default when one exists, and report each assumption in the final reply.
  Acceptance: eval case `ambiguous-headless` (run as `claude -p`, as every eval run is) passes when the spec holds an `Open:` line and the reply lists the assumption. Verification: demonstration; interactive half: tmux probe (ADR-0187).
  Basis: reported (thread: "Missing AC becomes an explicit assumption or open question"). Status: done. Headless half at 93ab5278d: Headless half: eval suite 1 (2026-11-21, claude 2.1.330), `ambiguous-headless` 1.0 with the plugin against 0.17 without over 3 runs. Suite 3: 1.0 again after the skill edits. Interactive half: tmux probe on claude 2.1.330 in the user's own setup, 2026-11-21: the skill fired and asked the tax rate form and the rounding through AskUserQuestion (RISK-518 fix; one run).
  Source: external/export-Has anyone actually combined TDD + Specification-Driven Development (SDD)…jsonl, comment 13; swe-best-practices B5-5.

## Cost

- [x] **REQ-SPEC-009** claudetto-spec shall add at most 150 always-on tokens: the skill description and the deferred tool name, with no agent, output style or rule text.
  Acceptance: `claude --plugin-dir <abs path> plugin details claudetto-spec` reports always-on tokens at or below 150. Verification: probe.
  Basis: inferred (ADR-0177 cost side). Status: done at 9c0f589c1 (`claude plugin details claudetto-spec` on 2.1.330: always-on ~68 tokens, on-invoke ~530).
  Source: ADR-0192; REQ-VERIFICATION-073 (method).

## Gain Over Vanilla

- [x] **REQ-SPEC-010** Each part of claudetto-spec shall beat vanilla Claude Code 2.1.329 on its eval case's Δ in the held-out run, or move Out with the measured reason.
  Acceptance: the held-out run's `aggregate-result.json` shows a positive mean Δ, pinned model and `claudeVersion` 2.1.329 or later; a part whose case shows Δ ≤ 0 is moved Out. Verification: demonstration (ADR-0193 rule 7; run with the user's approval, 2026-11-21).
  Basis: user decision (ADR-0177). Status: done. Held-out set: four cases written blind by a subagent (ADR-0193 rule 7). Pinned run `holdout-2026-11-21T00-28-05-304Z` (claude 2.1.330, `claude-opus-5-5`, 1 run per arm, $1.14): mean Δ +0.38.
  - Spec-first loop: both feature cases 1.0 against 0.23 (Δ +0.77), the same in the unpinned run before it. It beats vanilla.
  - Silence on trivial edits (REQ-SPEC-006): 1.0 in both arms, by design a negative twin; it is a no-harm property, not a gain claim.
  - Contradiction stop (REQ-SPEC-007): 0.93 against 1.0 pooled over 5 runs per arm (0.67 once, then 1.0 four times), so vanilla already stops on this case and the part shows no gain. It stays in the skill as a guard for the loop's own pressure (staged tests that must pass), which the vanilla arm never runs; it adds no always-on tokens. The user may move it Out instead.
  - Total held-out spend: $2.92 over three runs.
  Source: ADR-0177; ADR-0193.
