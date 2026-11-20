# Spec Requirements

The block ships `plugins/claudetto-spec/` (ADR-0192), a default-on add-in to claudetto for Claude Code 2.1.329: one skill, `spec`, and one deferred tool, `spec_check`. The design and its sources are in `reports/2026-11-21-research/sdd-frameworks.md`; the eval rules are ADR-0193. Every item starts as `missing`, since the baseline plugin registered nothing.

## Spec File Format

- [ ] **REQ-SPEC-001** claudetto-spec shall keep one living Markdown spec per capability at `specs/<capability>.md`: `# <Capability>`, then per requirement a `## <ID> <title>` heading (ID such as `AUTH-3`), one sentence of behaviour, at most three scenarios of `Given`/`When`/`Then` lines, and optional `Open: <question>` lines.
  Acceptance: `spec_check` parses a fixture with two capabilities and returns every ID, title, scenario count and open question; a malformed heading is reported with its file and line. Verification: test.
  Basis: inferred (OpenSpec format, minus SHALL and delta folders). Status: missing at 088a227c.
  Source: reports/2026-11-21-research/sdd-frameworks.md, "File Formats and Schema"; ADR-0192.

- [ ] **REQ-SPEC-002** claudetto-spec shall flag requirement inflation: more than one behaviour sentence or more than three scenarios in one requirement.
  Acceptance: `spec_check` on a requirement with two sentences or four scenarios lists it under `inflated`. Verification: test.
  Basis: reported (OpenSpec #2139: SHALLs per requirement grew 1.8 to 5.0 in a month). Status: missing at 088a227c.
  Source: reports/2026-11-21-research/sdd-sources.md, specroot.io section.

## Traceability

- [ ] **REQ-SPEC-003** `spec_check` shall compute coverage from the files on every call: requirements that no test file cites (`uncovered`) and IDs cited in tests that no spec defines (`orphans`), with nothing stored between calls.
  Acceptance: a fixture with one uncited requirement and one test citing an undefined ID yields exactly those two lists. Verification: test.
  Basis: measured (840-implementation study: only requirement citations caught invented requirements). Status: missing at 088a227c.
  Source: reports/2026-11-21-research/sdd-sources.md, specroot.io section.

## Red Checkpoint

- [ ] **REQ-SPEC-004** `spec_check` shall list test files that changed since they were staged (`git diff --name-only` against the index, restricted to test files), so an implementer that edits a staged failing test is visible.
  Acceptance: with a staged test file then edited in the work tree, `spec_check` lists it under `changedSinceStaged`; an untouched staged test is not listed. Verification: test (git output injected; no test shells out to git, REQ-VERIFICATION-076).
  Basis: reported (r/ClaudeCode TDD+SDD thread: "stage the tests … verify that the subagent did not touch those tests"). Status: missing at 088a227c.
  Source: external/export-Has anyone actually combined TDD + Specification-Driven Development (SDD)…jsonl, comments 15 and 17; swe-best-practices B2-10.

## Skill

- [ ] **REQ-SPEC-005** The `spec` skill shall run the loop clarify, spec, red, green, check for new or changed behaviour: unknowns become `Open:` lines; each new test cites a requirement ID and is run failing before implementation; failing tests are staged before the implementation is written; the turn ends with `spec_check` and the project's test command, and the reply reports their results.
  Acceptance: eval cases `feature-*` (two phrasings) pass with the plugin: `tool_order` puts `git add` of the test file before the first edit of the implementation file, the spec file cites the ID the test cites, and the test passes at the end. Verification: demonstration (claude plugin eval).
  Basis: inferred. Status: missing at 088a227c.
  Source: ADR-0192; ADR-0193.

- [ ] **REQ-SPEC-006** The `spec` skill shall not fire on work that adds no behaviour (a typo, a rename, a dependency bump, a question).
  Acceptance: eval cases `trivial-*` show `tool_used: Skill` with `max: 0` and no file under `specs/` created. Verification: demonstration.
  Basis: reported (Kiro turned one small bug into sixteen acceptance criteria). Status: missing at 088a227c.
  Source: reports/2026-11-21-research/sdd-sources.md (web search section, Böckeler).

- [ ] **REQ-SPEC-007** When a request contradicts an existing requirement or cannot be met, the skill shall stop and report the conflict with the requirement ID instead of editing tests or the spec to fit.
  Acceptance: the canary case `contradiction` passes only when the reply names the conflicting ID and no staged test changed. Verification: demonstration.
  Basis: reported (W5-15; ImpossibleBench canary, I16). Status: missing at 088a227c.
  Source: external/please-use-me-often/swe-worst-practices.md W5-15; agent-failure-dossier/07-measurement-and-environment.md I16.

- [ ] **REQ-SPEC-008** In an interactive session the skill shall ask about an expensive unknown through AskUserQuestion; under `claude -p` it shall write the unknown as an `Open:` line, take the cheap default when one exists, and report each assumption in the final reply.
  Acceptance: eval case `ambiguous-headless` (run as `claude -p`, as every eval run is) passes when the spec holds an `Open:` line and the reply lists the assumption. Verification: demonstration; interactive half: tmux probe (ADR-0187).
  Basis: reported (thread: "Missing AC becomes an explicit assumption or open question"). Status: missing at 088a227c.
  Source: external/export-Has anyone actually combined TDD + Specification-Driven Development (SDD)…jsonl, comment 13; swe-best-practices B5-5.

## Cost

- [ ] **REQ-SPEC-009** claudetto-spec shall add at most 150 always-on tokens: the skill description and the deferred tool name, with no agent, output style or rule text.
  Acceptance: `claude --plugin-dir <abs path> plugin details claudetto-spec` reports always-on tokens at or below 150. Verification: probe.
  Basis: inferred (ADR-0177 cost side). Status: missing at 088a227c.
  Source: ADR-0192; REQ-VERIFICATION-073 (method).

## Gain Over Vanilla

- [ ] **REQ-SPEC-010** Each part of claudetto-spec shall beat vanilla Claude Code 2.1.329 on its eval case's Δ in the held-out run, or move Out with the measured reason.
  Acceptance: the held-out run's `aggregate-result.json` shows a positive mean Δ, pinned model and `claudeVersion` 2.1.329 or later; a part whose case shows Δ ≤ 0 is moved Out. Verification: demonstration (user-run, ADR-0193 rule 7).
  Basis: user decision (ADR-0177). Status: missing at 088a227c.
  Source: ADR-0177; ADR-0193.
