# SDD, TDD and BDD Frameworks: What Works and What claudetto-spec Takes

Date: 2026-11-21. Sources: `sdd-sources.md` (web summaries of github/spec-kit, Fission-AI/OpenSpec, obra/superpowers, specroot.io, one web search), `external/export-Has anyone actually combined TDD + Specification-Driven Development (SDD)…jsonl` (r/ClaudeCode thread), `external/please-use-me-often/` (swe-best-practices B2-4, B2-10, B3-2, B3-15, B3-22; swe-worst-practices W2-11, W3-15, W5-1, W5-2; agent-failure-dossier I05, I16, I18), `external/llm-agent-behavior-mitigation-research.md`, and `dossiers.md` (the 2026-11-18 to 2026-11-21 Reddit dossiers).

Basis tags: **measured** (a number from a run someone reports with its setup), **reported** (anecdote), **design** (our inference).

## What GitHub Spec Kit Gets Right

- A fixed pipeline with gates: constitution, specify, clarify, plan, tasks, implement, with human approval of spec and plan. The approval points stop a wrong approach before code (reported; same as B2-5 "plan, then execute").
- An explicit clarify step that turns ambiguity into questions before planning (reported).
- Broad agent support and a large community, so its vocabulary is known (reported).

Its costs: about twice OpenSpec's tokens in one benchmark (57,740 vs 120,947 and 91,729 vs 181,040 tokens, GPT-5.2, measured by one author); about ten times slower than iterative prompting in Scott Logic's run (reported); "way too much boilerplate to review"; a feature folder kept as history, so no whole-system view and drift by default.

## What OpenSpec Gets Right

- Living specs: `openspec/specs/` is the current truth; a change carries ADDED, MODIFIED and REMOVED deltas that merge on archive, which suits existing codebases (reported).
- A checkable format: `### Requirement:` with SHALL, `#### Scenario:` with WHEN and THEN, and a `validate` command (reported).
- Half Spec Kit's tokens in the benchmark above (measured, one author).

Its costs: SHALL inflation from 1.8 to 5.0 per requirement within a month of agent writing (issue #2139, reported); documentation "hard to review" that "did not scale"; 347 change folders in 24 days for one user; no repair of a change after apply; no hierarchy.

## What the Others Get Right

- **Superpowers**: strict red-green TDD, a fresh subagent per 2–5 minute task, a two-stage review (spec compliance, then quality), and verification before completion. Cost: about $361 against $143 per merged ticket in one user's logs (reported, not controlled).
- **Kiro**: three files per spec and hooks that check spec compliance on save, so the check runs without being asked (reported). It also turned one small bug into four stories with sixteen acceptance criteria (Böckeler, reported).
- **BMAD**: scales ceremony to project size, but overscopes (reported).
- **The r/ClaudeCode TDD+SDD thread**: spec, acceptance criteria, failing tests, implement, verify. Stage (`git add`) or commit the failing tests before an implementer runs, so any change to them shows in `git diff`. A separate no-context agent checks for fake tests. Missing acceptance criteria become an explicit assumption or open question, and a new case updates the spec before it becomes a failing test (reported, several commenters).

## What the Research Says

- An 840-implementation study: Spec Kit and OpenSpec both passed every functional test; only requirement citations caught invented requirements automatically (measured; specroot.io summary).
- Spec Kit on five repositories: spec, plan and task files barely changed judged quality; reading the repository at each step did (measured; same source).
- 21 practitioner interviews: almost nobody used an SDD tool as published (reported; same source).
- Self-correction fails without external evidence; external feedback (tests, exit codes, diffs) works (Kamoi et al., survey).
- Instruction following drops up to 61.8% under paraphrase, so an eval needs paraphrases and held-out cases (Dong et al., measured over 46 models).
- Optimising a proxy invites gaming; tests the implementer can edit get edited (I05; W5-1, W5-2).

## Which Cons a Default-On Add-In Can Fix

| Con in the field | Fix in claudetto-spec | Basis |
| --- | --- | --- |
| Token and review overhead (Spec Kit 2x, Kiro's 16 criteria) | One spec file per capability, no proposal, plan or tasks files; a requirement is one heading, one sentence and at most three Given/When/Then scenarios | design; measured cost gap above |
| SHALL inflation (#2139) | `spec_check` counts behaviours per requirement and flags more than one sentence or more than three scenarios | design |
| Drift between spec and code | The coverage table is computed from the files every time (requirement IDs cited in tests), never written by the agent | measured: citations alone caught invented requirements |
| Invented requirements | `spec_check` lists test citations of IDs that no spec defines, and requirements no test cites | measured, same study |
| Test tampering to get green | Red checkpoint: failing tests are staged before implementation; `spec_check` lists test files changed since staging | reported (thread); B2-10 |
| Fake or tautological tests | A red run is required: each new test must fail before the implementation and pass after it | design; standard TDD |
| Ambiguity guessed through | Unknowns become `Open:` lines in the spec; interactive sessions ask through AskUserQuestion, `claude -p` stops and reports them | reported (thread); B5-5, B5-7 |
| Ceremony on trivial work | The skill fires on new behaviour only; a typo or rename gets no spec | design; eval cases check it does not fire |
| Delta folders piling up (347 in 24 days) | Git is the change log: the spec diff in the commit is the delta; no archive folder | design |

Not taken, with reason: per-task subagents and two-stage review (Superpowers' 2.5x cost report, and ADR-0177 requires a measured gain first); a constitution file (CLAUDE.md already holds project rules); OpenAPI or `.feature` files as the spec (language- and tool-specific; a project that has them cites their IDs the same way).

## File Formats and Schema

- **Specs: `.md`, not `.mdx`.** MDX adds a JSX parser and nothing a spec needs; Claude reads Markdown natively, the repo already lints it, and GitHub renders it for reviewers.
- **No `.feature` (Gherkin) files.** Given/When/Then lines inside the Markdown give the BDD shape without a Cucumber runner; the tests stay in the project's own framework.
- **No YAML spec schema.** Frontmatter costs tokens on every read and agents rewrite free-form fields; the only YAML is what `claude plugin eval` requires in eval files.
- **No JSON or JSONL state.** B3-15 asks for structured task records because agents rewrite Markdown lists. Here the record is derived: requirement IDs from specs, citations from tests, and the red checkpoint from the git index. Nothing derived is stored, so nothing drifts.
- **Schema** (checked by `spec_check`): `specs/<capability>.md`; `# <Capability>`; each requirement `## <ID> <behaviour in a few words>`, ID `[A-Z][A-Z0-9]*-\d+` (such as `AUTH-3`); one sentence of behaviour; up to three scenarios of `Given`, `When`, `Then` lines; optional `Open: <question>` lines. Tests cite an ID anywhere in the test file, usually in the test name.
