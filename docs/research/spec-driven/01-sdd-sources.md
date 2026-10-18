# Spec-Driven Development Sources: Research for the Spec Redesign of 1.0.0

## Part A: Sources Read by the Lead (PDF Text via `pdftotext`, Saved under `/tmp/claude-sdd-research/`)

Method note:
`WebFetch` returns a model summary and cannot quote long text, so the PDFs were downloaded with `curl` and converted with `pdftotext -layout`.
All six PDFs and the blog loaded fully.
Quotes below are from the PDF text.
Marks: (S) = source, (I) = inference.

### 0. What `traceSDD` Is (Answer First)

(S) `traceSDD` appears in only one of the seven sources: arXiv 2606.30689 (Panda).
The other five arXiv texts and the blog do not contain the string (checked with `grep -i tracesdd`).
(S) Definition, Abstract: "traceSDD, which enforces mandatory per-line requirement citations using hierarchical REQ-XXX.Y.Z identifiers".
(S) Section 1: "traceSDD enforces mandatory inline citations on every line of code, binding each line to a specific Tier-3 requirement point (REQ-XXX.Y.Z)."
(S) Section 4.2 condition A: "Uses a hierarchical REQ-XXX.Y.Z specification format with mandatory inline citation annotations (# [REQ-XXX.Y.Z]) on every non-trivial line of generated code."
(S) Detection, Section 6.1: "extract all REQ IDs cited in the generated code, subtract the set of valid REQ IDs from the specification, and flag any orphans.
This operation runs in O(1) per file (a single grep)".
(S) Maintenance, Section 7.4: "Operations such as grep REQ-003.1.2 src/ find all code touching a specific requirement instantly."
(S) Comparators, Section 1: Spec Kit has "artifact-level consistency through a spec-plan-tasks chain, but once implementation begins, the citation chain ends"; OpenSpec has "post-hoc external trace maps (YAML sidecar files) that link line ranges to spec IDs".
(S) Spec Kit format, Section 4.2: "user stories, FR-XXX requirements, acceptance scenarios".
(S) OpenSpec format, Section 4.2: "capability/scenario specification format with C-NNN section markers and external trace YAML files".

What the paper does NOT give (verified by reading the whole text, 17 pages):

- No file types or file names for `traceSDD` specs (only the `REQ-XXX.Y.Z` format and the `# [REQ-XXX.Y.Z]` comment).
- No Markdown front matter fields.
  No YAML schema for `traceSDD`.
- No status or state model: no states, no transitions, no actor, no transition evidence.
- No design/task/test artifact kinds for `traceSDD`.
(I) The user's premise that the sources define a `traceSDD` status and state model is not supported by the text.
(I) The only "states" in `traceSDD` are implicit: a REQ ID is either in the spec set (valid) or not (orphan).
(S) "Tier-3" implies a three-tier hierarchy (REQ-XXX = tier 1, XXX.Y = tier 2, XXX.Y.Z = tier 3), but the paper does not define the tiers. (I) Reading of the ID shape only.
(S) Conflicts inside the paper: the abstract says Claude cited-vs-uncited "d = -0.76, p = 0.003", Table 2 says "d = -0.73, p = 0.004". Section 5.2.1 text says "d = -0.73". Report both.
(S) Table 1 vs text: Section 5.2.1 says "All six pairwise comparisons survive Bonferroni-Holm correction except the cited vs OpenSpec and Spec Kit vs OpenSpec comparisons" (internally odd, since cited vs Spec Kit Claude has p = 0.049).
(S) Reference [19] is cited for Levenshtein Set Similarity but is Kaplan et al. "Scaling laws for neural language models". Reference [8] is a casual-contributor study cited as a traceability tool survey. (I) The citations look unreliable, so treat the paper with care.

### 1. arXiv 2606.30689 (traceSDD Source)

- Title (PDF): "Citation Discipline in Spec-Driven Development: A Cross-Model Empirical Study of Output Determinism and Automated Hallucination Detection in LLM-Generated Code".
- Author: Subham Panda (sole author).
  Year: 2026 (submitted 28 Jun 2026). arXiv id: 2606.30689, version v1 [cs.SE].
  URL: <https://arxiv.org/abs/2606.30689>. License on abs page: CC BY 4.0.
- Claim: "citation annotations trade determinism for verifiability".
- Method: two studies. Claude Sonnet 4.6 (N=20 tasks, 4 conditions, 240 implementations). GLM-5-turbo (N=50 tasks, 600 implementations). 3 cold-start sessions per task and condition. Conditions: traceSDD cited, traceSDD uncited (same REQ spec, no citations), Spec Kit, OpenSpec. Python only.
- Metrics: LSS (`difflib.SequenceMatcher.ratio()` on comment-stripped code), TDR (injected hallucinations detected), TPR, FPR.
- Hallucination types injected: H-SCOPE (out-of-scope functions), H-PRIOR (unauthorized imports such as `logging`, `os`), H-OVER (unauthorized decorators such as `@lru_cache`).
  Injected lines cite fake IDs (REQ-099.1.1, REQ-098.1.1, REQ-097.1.1).
- Numbers (Table 1, mean LSS): Claude cited 0.535, uncited 0.745, Spec Kit 0.460, OpenSpec 0.487. GLM cited 0.510, uncited 0.644, Spec Kit 0.434, OpenSpec 0.480.
- Detection (Table 3): TDR 86.4% (Claude), 88.0% (GLM) for cited, 0% for every other condition.
  FPR 0.0% (60 checks Claude, 150 checks GLM).
- Functional correctness: "All conditions achieve 100% TPR".
- Key quote, Section 4.4: "all injected hallucinations pass functional test suites ... confirming that test-based validation alone cannot substitute for citation-based traceability checks."
- Failure mode, Section 6.5 and 8: tasks T17-T20 had TDR 66.7%, 25.0%, 66.7%, 20.0% "because some hallucinations were implemented as uncited nontrivial lines rather than citing fake REQ IDs".
  Paper says the check "should be supplemented with an uncited-line check".
- Subgroup (Section 5.5): citation determinism penalty d = -1.85 for easy tasks, not significant for hard (d = -0.34) or large (d = -0.21) tasks.
- Mechanism claim, Section 7.1: "citation placement variability".
- Recommendations (Section 7.3): use citations for regulated domains; for prototypes use REQ-format spec without citations; future work "integrating the orphan-REQ check into CI/CD pipelines as an automated quality gate".
- Limits: injected (not organic) hallucinations, Python only, N=20 underpowered for Claude comparisons, no measured maintenance benefit ("measures this advantage only indirectly").
- Adoptable by an SDD tool: stable hierarchical requirement IDs; a cheap `grep` orphan check (set difference between IDs cited in code and IDs in spec); an uncited-line check; run as CI gate; keep REQ-format spec even without per-line citations (uncited REQ spec had the best determinism).

### 2. arXiv 2610.07534 (EPIC)

- Title: "The EPIC Framework for Spec-Driven Development".
- Authors: Bruno Claudino, Ruizhe Xing, Yuanhao Zuo, Tyler Menezes, Anita Sarma, Kostadin Damevski, Zixuan Feng.
- Year 2026 (submitted 6 Oct 2026). arXiv 2610.07534 v1 [cs.SE].
  URL <https://arxiv.org/abs/2610.07534>. License: CC BY 4.0 (abs page).
  Note: PDF running head says "Trovato et al." (template residue).
- Claim, abstract: "SDD frameworks provide templates for these artifacts, but the templates do not help developers judge whether they have written enough or clearly enough."
- Method: 114 open-source SDD repositories (850 candidates, 206 screened) scored 0-3 on 10 quality dimensions (ISO/IEC/IEEE 29148 based) by 2 raters (kappa_w 0.82 and 0.78). 40 practices from top-20% exemplars (5,675 coded segments). 30 grey-literature sources. 15 practitioner interviews.
  SonarQube on 100 repos, GitHub metrics on 109.
- Structure: 4 categories (Expressive, Precise, Interpretable, Compartmentalized), 10 dimensions: Unambiguous, Singular, Verifiable, Dependency Control, Complete, Conforming, Consistent, Comprehensible, Scope Discipline, Implementation-Planning Information.
- Numbers (Table 1, top band >=23 vs bottom <=18): bug-fix commit rate 11.8% vs 20.4% (p=0.034); complexity/KLOC 137.2 vs 162.3 (p=0.001); vulnerabilities/KLOC 0.092 vs 0.178 (p=0.016); contributors 12.5 vs 3.0. Bugs/KLOC top-vs-bottom not significant (p=0.101). Authors: "observational ... hypothesis-generating", "cannot establish causation".
- Practitioner agreement counts (Fig. 2, out of 15): I1.2 "Stable, Unique Requirement Identifiers" 13/15; I1.3 "Explicit Template Declaration & Enforcement" 13/15; E1.1 "Explicit Clarification-Seeking" 12/15; E1.4 "Normative & Structural Consistency" 14/15; E3.4 "Verification Completion & Readiness" 13/15; P2.2 and P2.3 14/15; C2.3 "Requirements-to-Implementation Traceability" 11/15 (4 disagreed); I2.3 "Cross-Artifact Alignment & Traceability" 12/15.
- Quotes (Section 4.1): "Markers such as [NEEDS CLARIFICATION] identify unresolved decisions" (E1.1).
  "stable, unique identifiers allow individual requirements to be referenced across documents (I1.2)".
  "one OpenSpec repository declared schema: spec-driven (R72)" (I1.3).
  Retired requirements: P4's team "kept retired requirements visible so that a changed requirement 'does not silently disappear'".
  P7: "The checks that you mechanize and make blockers on your process are the ones that actually get followed".
  P2 on completion: an agent "stopped and announced that it had finished while leaving work incomplete".
  P9: developers should provide a "go signal or no go signal".
  P9 on traceability: "nobody will be interested in reading all the things that agents created".
  P5 used "a custom agent skill to identify requirements that a codebase had not yet implemented".
- File names observed (Section 3.1.2): `spec.md`, `requirement.md`, `PRD.md`; Spec Kit `.specify/`, `plan.md`, `constitution.md`, task files; OpenSpec `openspec/changes`, `proposal.md`, `design.md`.
  Pipelines: Kiro "requirements, design, and tasks"; Spec Kit "Specify -> Plan -> Tasks -> Implement"; OpenSpec "proposals, specifications, designs, tasks, and archives".
- Packaged as skill (Section 5): `SKILL.md` with review mode (scores each dimension 0-3, cites passages) and authoring mode; "does not penalize" non-applicable practices.
  Authors say the skill was NOT measured for reliability.
- Failure modes (participants): agents fill gaps with assumptions, bundle requirements, declare incomplete work finished, copy the database as the data model, use different names for one concept.
- Adoptable: `[NEEDS CLARIFICATION]` marker as a blocking state; MUST/SHALL normative wording lint; stable IDs; named schema declaration; completion conditions with a runnable verify command; "retired" status that keeps IDs visible; a review skill that scores artifacts 0-3.
- Gap: EPIC defines no states and no transitions.

### 3. arXiv 2602.00180 (Piskala)

- Title: "Spec-Driven Development: From Code to Contract in the Age of AI Coding Assistants".
- Author: Deepak Babu Piskala (sole).
  Year 2026 (submitted 30 Jan 2026). arXiv 2602.00180 v1 [cs.SE, cs.AI].
  URL <https://arxiv.org/abs/2602.00180>. License CC BY 4.0. Abs page: submitted to AIWare 2026, 8 pages (the PDF is 13 pages).
- Claim: practitioner guide.
  "In spec-driven development, code is the implementation detail of the specification".
- Method: no experiments. Three case studies, one of which gives a number: "75% reduction in integration cycle time" (API-first financial services, no source cited, anecdotal). "controlled studies showing error reductions of up to 50%" is cited to practitioner posts [5], [6] (InfoQ, Red Hat). (I) Treat both as weak evidence.
- Design elements: three rigor levels (spec-first, spec-anchored, spec-as-source); four phases Specify, Plan, Implement, Validate with "Human review" at each checkpoint (Fig. 2); "Refine spec if needed" loop; plan "encodes constraints"; tasks as "discrete, reviewable tasks"; validate decision: "fix the code or revise the spec ... the spec remains the authority".
- Pitfalls named (Section IX): over-specification, specification rot ("automated enforcement through tests that fail when spec and code diverge"), specification as bureaucracy, tooling complexity, false confidence ("A passing spec test doesn't guarantee correct software").
- Adoptable: a per-project rigor level setting; the "fix code or revise spec" decision recorded on a failed verify; drift detection by tests.
- Gap: no IDs, no states, no front matter.

### 4. arXiv 2608.20341 (SDAD)

- Title: "SDAD: Spec-Driven Agentic Development for the AI-Native SDLC".
- Authors: Vu Hung Nguyen, Thanh Nguyen.
  Year 2026 (submitted 5 May 2026 per abs page; the PDF is dated "May 2026"). arXiv 2608.20341 v1 [cs.AI].
  URL <https://arxiv.org/abs/2608.20341>. License: CC BY-SA 4.0 (PDF footnote: "Licensed under CC BY-SA 4.0").
  Note: the id prefix 2608 does not match a May 2026 date. (I) Report as the abs page states it.
- Claim: "discipline relocates upstream into specification precision, explicit gates, and auditable provenance".
- Method: conceptual technical report. Own table says: "Numeric entries reflect the author's own observational estimates and are not taken from cited sources" (Table 6, e.g. 480 person-hours vs 4 architect-hours). The "Ambiguity Tax" `H(C) ~ alpha * exp(-beta*C)` is stated as "empirical data is consistent with" and attributed to He et al. [4] (a Cursor velocity/complexity study). The figure uses `H(C) = e^{-0.045 C}`. (I) The formula is not shown to come from [4]. Treat as unsupported.
- Design elements (the useful part):
  - Four phases (Section 8.3): intent capture, formal specification, agentic synthesis, independent verification.
    "merge or release authority remains human".
  - Gate list (Section 3.2): "SRS signed"; "all P1 risks mitigated"; "CI green including policy checks"; "acceptance tests pass"; "runbook & rollback verified".
  - Traceability (Section 3.2): "each SDD subsection traces to SRS identifiers; each deployment checklist traces to tests".
  - Spec Fidelity (Section 7.2): completeness, consistency, unambiguity, verifiability ("every requirement can be mapped to automated tests and objective pass/fail criteria").
  - Separation rule (Section 8.4.1): "keep release authority outside the same model family that authored or repaired tests".
  - Five-artefact loop (Section 13.5): "Intent doc -> Formal spec -> Synthesis output -> Verification report -> Provenance log".
  - Provenance (Section 13.2): "linkage from merged artefacts to specification revision, model route, and gate outcomes".
  - Metrics: first-pass alignment rate, repair multiplier phi.
  - "Agentic Linearism" (Section 6.3): claims one-shot builds from a frozen spec beat interrupted builds. (I) Contradicted in practice by incremental task flows.
    Not measured here.
- Gap: no state machine, no file formats, no front matter, no IDs.

### 5. Blog: Jimmy Song

- Title: "YAML to Markdown: Exploring Specification Driven Development and AI-Native Paradigms" (URL slug `from-yaml-to-markdown-devops-vs-collabops`).
- Author: Jimmy Song.
  Date: Oct 24, 2025 (page also shows "Updated"). arXiv id: none.
  URL <https://jimmysong.io/blog/from-yaml-to-markdown-devops-vs-collabops/>. License: footer lists CC BY 4.0 (stated by the page footer, not in the article body).
- Source basis: the page text was fetched with `WebFetch` (summary) and saved as raw HTML (`blog.html`, 98 KB).
  Quotes below are from the `WebFetch` summary, not verbatim from the HTML. (S, limited.)
- Claims: Spec Kit hierarchy "Constitution, Spec, Plan, and Task"; project rules in `.specify/`, stage tasks in `specs/`; "Intelligence as Specification"; `SKILL.md` progressive disclosure; three layers Prompt, Skill, Spec.
- Evidence: none (opinion essay, three references).
- Adoptable: nothing structural beyond the Spec Kit layout.
  No states, no IDs.

## Part B: Papers Read by a Delegate (Relayed, Not Re-Verified by the Lead)

Marks: (S) = source as relayed by the delegate. (I) = inference.
Page and section numbers come from the delegate. Spot-check them before public use.

### 6. arXiv 2609.00252 (Diaz Et Al.)

- Title: "Spec-Driven Development for Agentic Software Engineering: Harnessing Human-Agent Teamwork".
- Authors: Jessica Diaz, Joaquin Gayoso, Andrea Cimminio, Jorge Perez. Year 2026 (submitted 31 Aug 2026). arXiv 2609.00252 v1 [cs.SE]. URL <https://arxiv.org/abs/2609.00252>.
- License: the abs page links the arXiv non-exclusive distribution license v1.0 (no Creative Commons license stated).
- Claim (abs page): specs are the contract between humans and agents. Five human-agent interaction patterns. A "harness" with a technical part and a team part.
- Method (S): qualitative, mostly grey literature. No own measurements. Figures such as "Faros +98% merged PRs, +91% review time; METR -19%" are cited from other sources.
- Design elements (S): two spec levels, a system spec in the rule file (`AGENTS.md`, `CLAUDE.md`) and a feature spec per change archived after delivery (Section 4.1, p.12). A `proposal`, `apply`, `archive` lifecycle (Section 4.1, p.13). A consultation request that cites a spec clause, with the answer recorded against that clause (Section 5.8, p.21). An evidence pack where each item discharges a spec clause, with five merge-readiness criteria (Section 5.9, p.22). Autonomy per task class as a versioned decision (Section 5.10, p.22). Parallel agents in separate git worktrees (Section 5.6, p.19).
- Gaps (S): no ID scheme, no front matter schema, no state machine.

### 7. arXiv 2602.02584 (Marri)

- Title: "Constitutional Spec-Driven Development: Enforcing Security by Construction in AI-Assisted Code Generation".
- Author: Srinivas Rao Marri (sole). Year 2026 (submitted 31 Jan 2026). arXiv 2602.02584 v1 [cs.SE, cs.AI, cs.CR]. URL <https://arxiv.org/abs/2602.02584>. License CC BY 4.0.
- Claim: a versioned "Constitution" of security principles in the spec layer gives code that meets them "by construction".
- Evidence (S): one developer, one banking microservices app. "73%" fewer CWE violations (3 vs 11), 56% faster first secure build, 4.3x compliance documentation (Table 3, p.12). Section 6.6 concedes n=1 and a Hawthorne effect. (I) Anecdote.
- Artifact (S, Section 3.2, p.4): principle ID `SEC-NNN`, CWE reference, enforcement level MUST/SHOULD/MAY (RFC 2119), constraint, implementation pattern, rationale. Trace matrix row: principle, CWE, file, lines, technique (Table 1, p.7). Semantic versions and approval workflow (Lesson 3, p.13).
- Context size (S, Table 5, p.14): the full 15-principle constitution gave 78% compliance, 3-5 relevant principles gave 96%. Regeneration with principle references took 1.4 iterations against 3.2 for manual patching (Lesson 6). Automated traceability 100% vs manual 94% (Lesson 7). (I) The compliance method is undefined.
- Failure modes (S): the constitution is a prompt-injection surface (Lesson 4, p.13-14), silent gaps (6.5 item 4), business-logic flaws (6.5 item 2).
- Gaps (S): no front matter schema, no states.

## Part C: Current Dotclaude Design (Delegate Read, Lead Did Not Re-Read)

Note: the brief said P46 is uncommitted. The first `git status` of the lead showed modified files. The delegate found a clean tree with P46 in HEAD `c14130c3`. Treat the commit state as unconfirmed. The delegate read the working-tree files, which equal HEAD.

- Lanes (S): `planned, doing, review, done, blocked, canceled` (`src/kernel/spec-store.ts:16-23`). Transition table `NEXT_LANES` in `src/plugins/dotclaude/slices/spec/adapters/lane.ts:78-85`.
- `lane <pkg> done` needs no evidence: `NEXT_LANES` allows `done` from `planned`, `doing`, `review`, `blocked` (lane.ts:79-82). Only `canceled` is refused (lane.ts:213-218). (I) `done` can skip `merge` and `approve`.
- `merge` needs `lane === "review"` (`adapters/merge.ts:167-170`) and `approved()` (`domain/events.ts:20-24`). `approve` is only a verdict event (`adapters/review.ts:43-52`). The event type has no commit or SHA field (`spec-store.ts:42-49`), so an approval is not bound to a commit.
- The `turn.complete` hook moves a package to `review` on any end with reason `answer` (`adapters/mod.ts:74-81`). No `Verify:` line is run by any tool (no runner in `adapters/`).
- `retry` moves `review` or `blocked` to `doing` with no finding (`adapters/retry.ts:37-41`). `reject` needs a finding (`review.ts:36-41`).
- No trace links: requirements, tasks, packages, code, and tests share no IDs. `validate` checks only that sections are non-empty (`domain/validate.ts:124-141`), not `file:line` references in `Context`.
- Hook IDs: `BRIEF_ID` needs `P\d+` (`domain/ship-lane.ts:8`).
- `SPEC_SCHEMA` stays `1` (`spec-store.ts:13`) although P46 added `canceled`, `note`, `verdict`, `findings`.
- `archive.ts` has no lane or checkbox check (inferred from absence).
- `docs/research/agents-models/18-spec-commands.md` predates P46: 5 lanes, no read commands.
- `wiki/dotclaude/Spec-Store.md` matches the code on the lane rules checked (lines 99-142).

## Part D: Ranked Proposals for Dotclaude 1.0.0 (No Backward Compatibility)

Strength scale: strong = measured with numbers and a control. moderate = measured but weak design or observational. weak = anecdote or opinion.

1. Evidence-gated transitions, with a bound approval.
   - Change: `done` needs a recorded `verify` result (command, exit code, commit SHA). `approve` stores the SHA. `merge` refuses when HEAD differs from the approved SHA. Remove the `turn.complete` auto-move to `review` unless `verify` passed.
   - Source: 2610.07534 Section 4.2.1 (agents "declaring incomplete work finished", E3.4 13/15, P7 "checks that you mechanize and make blockers"). 2608.20341 Sections 3.2, 8.3 (gates, human merge authority). 2606.30689 Section 4.4 (hallucinations pass tests, so tests alone are not enough).
   - Strength: moderate (practitioner interviews plus design argument, no direct trial).
   - Replaces: `NEXT_LANES` allowing `done` from four lanes, hook auto-move, SHA-less `approve`.
2. Stable requirement IDs and a trace check.
   - Change: each requirement gets an ID (for example `REQ-003.1`). Tasks and packages list the IDs they satisfy. Code and tests may cite IDs in comments. `validate` runs the orphan check (cited IDs minus spec IDs) and a coverage check (spec IDs with no package or test).
   - Source: 2606.30689 Sections 6.1, 6.3 (TDR 86.4% and 88.0%, FPR 0%). 2610.07534 I1.2 (13/15).
   - Strength: strong for the orphan check (two models, 840 runs, but injected hallucinations, Python only). Moderate for coverage reports.
   - Replaces: no trace links today, `validate` that checks only non-empty sections.
3. Add an uncited-line check as the second half of item 2.
   - Change: per-line citation is optional and costs determinism. Prefer citations per function or per file, and flag changed files that cite nothing.
   - Source: 2606.30689 Sections 5.2.1, 6.5, 8 (determinism penalty d about -0.72, detection gap when the model omits citations).
   - Strength: moderate (the penalty is measured, the per-file variant is untested). (I) The per-file variant is an inference.
   - Replaces: nothing today. Avoid copying the per-line rule.
4. A blocking clarification state.
   - Change: a `[NEEDS CLARIFICATION: ...]` marker (or an `open_questions` field) blocks `planned -> doing`. `validate` fails while any marker remains.
   - Source: 2610.07534 Section 4.1 (E1.1), 9 of 15 strongly agreed.
   - Strength: moderate.
   - Replaces: free-text open questions with no gate.
5. Normative-wording and template lint, with a declared schema name.
   - Change: a `schema:` front matter key with a version. Lint MUST/SHALL wording and require one obligation per requirement, with a verify command.
   - Source: 2610.07534 E1.4 (14/15), E2, E3.2, I1.3 ("schema: spec-driven"). Association only: top vs bottom spec quality bug-fix share 11.8% vs 20.4%, observational.
   - Strength: moderate for the practice, weak for the outcome claim.
   - Replaces: `SPEC_SCHEMA` constant that stayed `1` after P46.
6. Fix-code-or-revise-spec decision on a failed verify.
   - Change: a failed `verify` forces an event `decision: fix-code | revise-spec` with a note. `retry` requires it.
   - Source: 2602.00180 Section III.D. 2610.07534 (retired requirements stay visible).
   - Strength: weak (practitioner guide).
   - Replaces: `retry` with no required finding.
7. Provenance log per package.
   - Change: each event records spec revision, commit SHA, model, and gate outcome.
   - Source: 2608.20341 Sections 13.2, 13.5 (provenance log). 2609.00252 Section 5.9 (evidence pack).
   - Strength: weak (conceptual, no measurement).
   - Replaces: events without SHA or model fields.
8. Context slicing: give an agent only the relevant requirement slice.
   - Change: `show` or the brief includes only the linked requirement IDs and rules, not the whole spec or constitution.
   - Source: 2602.02584 Table 5 (78% vs 96%, single study, n=1).
   - Strength: weak.
   - Replaces: whole-spec context.
9. Treat spec files as an injection surface.
   - Change: the spec store marks spec text as untrusted input to agents, and `validate` flags instruction-like text in non-instruction fields.
   - Source: 2602.02584 Lesson 4 (relayed, the cited statistic was not checked).
   - Strength: weak.
   - Replaces: no such check.
10. Do not adopt: a `traceSDD` status model, "Agentic Linearism", the SDAD "Ambiguity Tax" formula.
    - Reason: `traceSDD` has no state model in the source. The other two have no supporting data in the text.
