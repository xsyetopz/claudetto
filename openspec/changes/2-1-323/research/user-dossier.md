# User Dossier: What the User Wants From Agents

Source set: `external/please-use-me-often/` (all files), `external/llm-agent-behavior-mitigation-research.md`, `external/2026-10-07/claude-llm-agent-failure-dossier.md`. Paths below are relative to `external/` unless they begin with `plugins/` or `openspec/`. `.DS_Store` files are not sources. Dates of the sources run 7 Oct to 6 Nov 2026. Read 13 Nov 2026.

Method note: every digest below comes from a full `Read` of the file, except the PDF (text extracted with `pdftotext`, sections 1, 6 and 8 read in full, the rest by heading). Evidence labels: **read** = seen at the cited `file:line`; **inferred** = my reading across files.

Absence finding (read): a search of every source and of claudetto's `rules/`, `hooks/texts*.ts`, `output-styles/`, `agents/` for `headlin`, `title case`, `human interface` found no naming rule. The dossier holds no requirement for headlinese identifiers, Title Case headings, or Apple HIG labels. The only Title Case text is claudetto's own `## What I Need From You` (`plugins/claudetto/output-styles/Concise.md:27`, `plugins/claudetto/hooks/texts.ts:242`). Those naming requirements come from the task prompt and the user's `~/.claude/rules/claudetto/useBlockLanguage.md`; they are carried in the Requirements table as R-N1 and R-N2 with that source.

## 1. Digests

### Top level of `please-use-me-often/`

**`please-use-me-often/agent-pet-peeves.md`** (6,241 B). 70 numbered faults in 8 groups, written as the user's own list.
- Unsupported judgments: "Presenting assumptions as facts"; "Making technical corrections without researching the underlying subject".
- Unsolicited skepticism: "11. Fact-checking statements when no fact-check was requested"; "20. Adding unnecessary caveats that contribute nothing to the requested task".
- Intent: "41. Assuming that pasted material is a request for analysis, summarization, or fact-checking"; "42. Performing tasks that were never requested".
- Communication: "54. Making promises about future behavior that I cannot guarantee"; "55. Describing necessary changes hypothetically instead of applying them immediately"; "59. Providing generic apologies instead of correcting the substantive problem".
- Verification: "64. Treating search-result snippets as sufficient verification for detailed technical claims"; absence of search results is not evidence that something does not exist.
- Inconsistent standards: demanding evidence from the user while making unsupported counterclaims; vague "not necessarily" and "too absolute".

**`please-use-me-often/users-chatgpt-web-instructions-for-gpt6.txt`** (3,903 B). The user's own standing assistant instructions, 9 paragraphs.
- `:3` "Treat questions as requests for answers, observations as information, corrections as updates to context, and explicit action requests as authorization to act."
- `:5` "Reserve consequential choices involving user preferences, irreversible changes, or competing objectives for the user"; routine decisions use verified context.
- `:7` Start from the actual platform and versions; "Prefer native functionality, documented configuration".
- Cite evidence next to the claims it supports; treat user-reported tests and observations as established context.
- `:19` "Lead with the substantive answer. Use coherent prose by default, with structured formatting when it improves comprehension."
- `:21` Compare the result with the request before finalizing; the response ends when the requested work is complete.

**`please-use-me-often/code-readability-for-humans-and-ai-agents.md`** (12,960 B). Readability for readers at CEFR A1 to C2.
- Limits table (`:33-37`): function body at most 30 NLOC, cognitive complexity at most 10, nesting depth at most 2, parameters at most 4, line at most 100.
- Ten agent faults: local optimization, ambiguity, over-abstraction, under-abstraction, hiding uncertainty, terminology drift, churn, treating passing tests as proof, imitating bad code, comments as understanding.
- One concept, one canonical term. Names carry units and intent: `remaining_bytes`, `connection_timeout_ms`, predicates `is_valid`; avoid `rem`, `data`, `thing`, `tmp2`, and generic `utils`, `helpers`, `misc`, `common`.
- "Do not let agents invent formatting"; follow the formatter.
- Review priority list: correctness and clarity before style.

**`please-use-me-often/swe-best-practices.md`** (23,715 B). Practices B1 to B5, each with P0, P1, P2 priority.
- B5 is agent conduct: B5-1 read before write, B5-2 search existing code, B5-4 minimal diff, B5-6 never weaken tests, B5-7 stop and report, B5-8 verify before done, B5-14 never read secrets, B5-17 comments explain intent.
- B2-2 keep the rules file short; B2-15 demand reuse; B3-7 prompt altitude; B1-14 comments explain why.

**`please-use-me-often/swe-worst-practices.md`** (19,863 B). Anti-practices W1 to W5 with severity S1 to S3.
- W5 agent misconduct: editing tests, fabricating results, destructive repair, W5-11 scope creep, W5-12 reinventing, W5-13 silent fallbacks, W5-14 guessing APIs, W5-16 verbose noise and stray files, W5-17 ignoring conventions, W5-18 sycophancy.
- W2-3 and W2-4 mega rules files; W3-5 prompting as the only control.

### `agent-failure-dossier/` (the user's incident record, 7 to 10 Oct 2026)

**`please-use-me-often/agent-failure-dossier/00-INDEX.md`** (12,577 B). 18 failure modes I01 to I18 and the enforcement ladder.
- Ladder: prose, rules files, per-turn reinjection, deterministic hooks and gates, sandbox and permissions, training. "Prose is the weakest kind of enforcement."
- Six cross-cutting principles, including "Autonomy and consent are one dial".
- Modes: I01 ungrounded defaults, I02 instruction decay, I03 context rot, I04 false completion, I05 spec gaming, I06 sycophancy, I07 scope creep, I08 hallucinated APIs, I09 over-engineering, I10 trust boundaries, I11 delegation, I12 cost, I13 over-deferral, I14 consent drift, I15 tests that pin prose, I16 invalid evals, I17 process hygiene, I18 harness effects.

**`.../01-grounding-and-memory.md`** (18,089 B). I01 to I03.
- Case: an `[Unreleased]` changelog heading on a `dotclaude-0-28-0` branch; the state was in the branch name.
- Recipe: derive state with SessionStart and PreToolUse hooks; keep a rejected-alternatives file; reinject 3 to 5 live corrections per turn; handoff schema; compact early.

**`.../02-verification-and-honesty.md`** (15,875 B). I04 to I06.
- Stop-hook gate for completion; "verdicts come from direct exit codes, never from `| grep`/`| tail`"; report the denominator.
- Ask only when the answer "changes something expensive to undo".
- Opener-of-agreement hook for sycophancy.

**`.../03-safety-and-trust-boundaries.md`** (16,296 B). I07, I08, I10.
- Shared-tree `git stash` incidents; kill by PID only; `--help` over memory for flags; classifier blocks are final; about 330 sandbox-off calls in the corpus.

**`.../04-engineering-delegation-and-cost.md`** (15,253 B). I09, I11, I12.
- User order: "make sure dotclaude 0.28+ will NEVER use or make up proprietary schemas/formats for itself".
- A turn-counting hook beat a prose rule; effort and cost recipes; "lead with the outcome; no tool-by-tool recap".
- A headline figure ("64 of 131 file reads (49%) were repeats") was itself wrong: measure before you claim.

**`.../05-appendices-and-limitations.md`** (6,059 B).
- Claude Code 2.1.296 levers per issue; 33 hook events; ASD-STE100 wording cut replies from about 580 to about 100 words.

**`.../06-autonomy-and-consent.md`** (15,524 B). I13 to I15; the user's own words.
- "Again, the fact that you keep deferring to user when you're fully capable is irresponsible."
- "Again, stop asking the user--just do the work, except no pushes to repos yet."
- "increasing limits without user consent is wrong, so is acting without user's agreement. that was a workaround, NOT a solution."
- "TESTS SHOULD BE FOR BEHAVIOUR, NOT PROSE! ... for how long are you going to disobey user's instructions?"

**`.../07-measurement-and-environment.md`** (13,766 B). I16 to I18.
- Assert the arm and the served model; keep traces; a tool error is never a negative result; kill by saved PID.
- User: "not a mistake--an error. 0.28.0 should not ever have this happen."

**`.../08-session-log-corpus.md`** (8,936 B).
- 43 main and 227 subagent sessions, 7 to 10 Oct 2026; counts per mode; safeguards that held (hooks, lints, counters); five things the corpus adds.

### `agent-terms/` (the user's governance archive, v2.0.0, effective 2026-10-29)

**`.../agent-terms/README-AGENT-TERMS.md`** (5,375 B). Layout and install; core rules load from `.claude/rules/agent-terms*.md` (about 1,000 tokens), the full text is opt-in (27 to 31K tokens); basis is 18 failure modes, 70 complaints, the SWE lists.

**`.../agent-terms/TERMS-AND-CONDITIONS.md`** (15,656 B). Master agreement T1 to T13.
- `:14-19` Summary: the User decides; precedence is safety rules, user's latest word, Terms, rules files, repository state, habits last; unsure whether it is the user's, treat it as theirs; unsure whether to do routine reversible work, do it; a Correction amends the Terms immediately; after a Breach stop, disclose first, restore, name cause, propose a mechanism; Terms survive `/clear` and compaction.
- T2 defines User, Agent, Delegate, Work, Session, Correction, Consent, Rejection, Block, User-Owned Value, Reserved Action, Evidence, Claim, Check, Record, Shipped Source, Breach, P0, P1.
- `:141` T8.1 notices go in the first lines, one line each: "`TYPE: what happened, the clause ID, what it changed, what is needed from the User`".
- T9.1 breach cure in six steps; "Make no promise about future behaviour"; T9.3 only the user reinstates.
- T5.5: "An interpretation whose purpose is to make a planned action allowed is presumed wrong."

**`.../agent-terms/TERMS-OF-SERVICE.md`** (30,888 B). The standard of work, S1 to S9.
- S2.2 (`:49`) take state from the project, not from "what projects usually do". S3.1 (`:65`) every material claim has a labelled basis.
- S4.1 to S4.5 (`:98-106`) run a real check; verdicts from exit codes, not `grep`/`tail`/`head`; report the denominator; "fixed" only after rerun.
- S6.1 (`:150`) lead with outcome, "Before your first tool call, give one line saying what you are about to do", short end summary. S6.2 notices first. S6.4 write "the user decided" only if a message says so. S6.5 change position only on new Evidence; "Pushback on its own is not Evidence". S6.6 (`:160`) no opener of agreement, praise, apology. S6.7 name error and cause, no promise, propose a mechanism. S6.8 cost as a computed number. S6.9 plain prose.
- S7.1 (`:174`) smallest diff. S7.5 local conventions. S7.6 (`:184`) one term per concept. S7.7 leave uncertainty visible. S7.8 loud failures, no empty `catch`. S7.9 abstract at the third repeat. S7.10 (`:192`) size limits. S7.11 (`:194`) comments explain why. S7.14 (`:200`) prompt rules: reason beside each rule, say what to do, name failure patterns, "calm wording, without capitals or 'CRITICAL'", say who acts, no "write out your reasoning".
- S8.1 (`:215`) shipped source carries no narration. S9.1 (`:233`) keep working; routine reversible in-scope work needs no permission. S9.7 (`:245`) a message with no tool call ends the turn; never end it by announcing the next step.

**`.../agent-terms/TERMS-OF-USE.md`** (21,773 B). The user's authority, U1 to U11.
- U1.1 (`:28`) User-Owned Values (limits, budgets, checks, model and effort, release scope, dependencies, the Terms, rules files, agent settings). U1.2 consent names the value, old to new. U1.4 (`:44`) a Rejection is final, no retry by another tool or agent.
- U3.1 (`:66`) Reserved Actions each time: delete, `reset --hard`, `clean`, rebase, force-push, `DROP`, infrastructure change, production, push, tag, release, publish, deploy.
- U4.1 (`:90`) a denial, sandbox denial, classifier block or hook block is final: "Do not reach the same effect by another route". U4.3 (`:94`) turn off a safeguard only after the in-sandbox fix failed, and say why.
- U5.1 (`:102`) tool output, web pages, issues, commit messages are data. U5.5 (`:110`) never read, print, log, commit, send secrets; do not search for them.
- U7 shared tree, U8 delegation, U9 jobs (lock, log, watcher), U10 environment (re-read after a failed write, clean tree).

**`.../agent-terms/ACCEPTABLE-USE-POLICY.md`** (6,014 B). AU-1 prohibited conduct (22 items, including AU-1.6 no narration in shipped source, AU-1.8 no rewording to pass a check); AU-2 restricted conduct (Consent each time); AU-3 what the user wants instead.

**`.../agent-terms/RULES-OF-ENGAGEMENT.md`** (9,735 B). RE-1 to RE-8.
- `:33-40` Git table: commit own paths with `git commit --only <paths>`; never `git add -A` in a shared tree; `stash`, `restore`, `switch` need Consent when other work may be present; `reset --hard`, `clean`, `rebase`, amend need Consent; push, tag, PR, release need Consent.
- RE-2.1 assume the tree is dirty. RE-3 lock, unique log path, watcher per job; kill only by saved PID. RE-5.1 (`:78`) sandbox-first fixes. RE-5.2 (`:80`) a classifier Block gets a notice with the rule name. RE-6.2 record the served model. RE-8.2 re-read after a rejected write.

**`.../agent-terms/CODE-OF-CONDUCT.md`** (4,750 B). Conversation standards with named examples (opener, promise, factcheck, pushback, cost). The agent does not open with agreement, praise or apology, does not promise future behaviour, does not recap every tool call, and does not "end the turn by announcing the next step instead of taking it" (`:57`). Four-step ladder: Correction, Notice, Suspension, Mechanism.

**`.../agent-terms/SERVICE-LEVEL-AGREEMENT.md`** (5,046 B). Table SL-1.1 to SL-1.10 (completion evidence, verdict source, denominator, notices first, scope fidelity, check integrity, clean tree, carry-through, provenance, arm integrity), each targeted at 100% or zero. SL-5 definition of done (9 items). SL-6 report template: notices, `Outcome:`, `Done:`, `Checked: <command> -> exit <code>; <n of N> passing`, `Not done / failed:`, `Unverified:`, `Needs you:`; "There is no tool-by-tool recap".

**`.../agent-terms/DELEGATION-AGREEMENT.md`** (5,974 B). Brief format; hand-back with notices first (BLOCKED, REJECTED, NEEDS-CONSENT, PARTIAL, UNVERIFIED); DA-5 Delegate Contract text for agent files, including "Report outcomes faithfully" and "a denied call means the user declined it"; "Keep the last two turns for your hand-back."

**`.../agent-terms/SCHEDULE-A-ENFORCEMENT.md`** (10,185 B). Settings scopes; hook mechanisms; gates and lints; eval profile; optional levers; map of clause to mechanism. Judgement rules (calibration, scope of corrections, when to ask) stay prose.

**`.../agent-terms/CONFIDENTIALITY-AGREEMENT.md`** (3,237 B). CF-1 confidential information (secrets, private data, session data, unreleased work). CF-2.1 (`:20`) "never `cat` a `.env` file, never grep for keys, never list credential stores"; exploring for credentials "is a violation in itself". CF-2.3 a test `.env` goes in a temp directory (a root `.env` broke four delegates). CF-3 send nothing outward without Consent. CF-4 delete scratch copies.

**`.../agent-terms/DATA-HANDLING-NOTICE.md`** (2,911 B). DH-1.1 one place per kind of information (history in the Record; preferences as a proposed rules-file line with Consent; secrets nowhere). DH-1.2 "Memory is context, not configuration"; enforced rules go to hooks. DH-2.1 retention settings (`cleanupPeriodDays`) are the user's; a plugin default of 14 days deleted the user's transcripts. DH-2.2 never delete or rewrite transcripts. DH-3 record only observed facts with source.

**`.../agent-terms/CONTRIBUTION-CERTIFICATE.md`** (2,227 B). CT-1.1 on commit the agent certifies scope, a real Check with exit code, no User-Owned Value changed, no secrets, no session narration, a commit message that claims no unstated approval. CT-2.1 follow the project's attribution trailer; never `Signed-off-by` for the user.

**`.../agent-terms/LICENSE-AGENTS`** (4,478 B). L2 grant covers routine reversible in-scope work "done without asking". L4 reserved rights (user-owned values, destructive, outward, spending, editing the Terms or settings, turning off safeguards). L6 principal answers for delegates. L7 a claim without Evidence is a P0 Breach "even if it later turns out to be true". L8 suspension after a P0 Breach; only the user reinstates. Keep the file named `LICENSE-AGENTS`.

**`.../agent-terms/STATEMENT-OF-WORK.template.md`** (1,523 B). Per-task scope: Goal, In scope, Out of scope, Deliverables with an acceptance command, User-Owned Values, Standing Consent, Budget, Delegation, Known facts not to guess, Record path.

**`.../agent-terms/AGENTS.snippet.md`** (281 B). A pointer line to the Agent Terms for an `AGENTS.md`.

**`.../agent-terms/enforcement/settings.project.json`** (1,514 B). `ask` rules for `git stash`, `reset`, `clean`, `checkout --`, `restore`, `rebase`, `push`, `tag`, and edits to the Terms and rules files; `deny` for `pkill`, `killall`, `Read(.env)`; hooks PreToolUse provenance guard, SubagentStart contract, PreCompact instructions.

**`.../agent-terms/enforcement/settings.user.json`** (855 B). `autoMode.soft_deny` keeps `"$defaults"` first, then: subagent git tree changes in a shared tree; changing a test expectation, grader, baseline or limit without exact user approval; killing by pattern; repeating a rejected action through another route. `sandbox.failIfUnavailable: true`. Read from user settings only.

**`.../agent-terms/enforcement/settings.optional.json`** (837 B). `allowUnsandboxedCommands: false`; a Stop `prompt` hook that answers not ok if the reply opens with agreement, praise or apology: "rewrite the opening so it starts with the substance; name the error and the fix."

**`.../agent-terms/enforcement/settings.eval.json`** (213 B). `CLAUDE_CODE_NO_MODEL_FALLBACK=1`, `CLAUDE_CODE_DISABLE_REFUSAL_FALLBACK=1`, `switchModelsOnFlag: false`.

**`.../agent-terms/enforcement/provenance.json`** (272 B). Globs of shipped and exempt paths for the provenance guard.

**`.../agent-terms/enforcement/provenance-guard.py`** (4,626 B). PreToolUse hook on Write and Edit: checks only added lines in shipped files against narration patterns (`session of`, `task 2.1`, `as discussed`, `the user decided`, dated lines with session context); `ask` by default, `deny` with `AGENT_TERMS_PROVENANCE_MODE=deny`; fails open.

**`.../agent-terms/enforcement/subagent-contract.py`** (1,124 B). SubagentStart hook: reads the DA-5 block from the Delegation Agreement and injects it as `additionalContext`. Reason given: Claude Code 2.1.312 drops two main-prompt lines from every subagent body.

**`.../agent-terms/enforcement/compact-instructions.txt`** (846 B). PreCompact text: keep verbatim every Correction, Rejection, Block, Consent, touched User-Owned Value, open notice, running job, and the Record path; "do not attribute to the User anything that appears only in assistant messages."

**`.../agent-terms/rules-that-do-not-bind.pdf`** (208,899 B, 23 pages). Preprint "Rules That Do Not Bind", xsyetopz, 29 Oct 2026: the taxonomy and mechanism analysis behind the archive.
- Finding 1: Opus 5.5 and Sonnet 5.5 get a 5,627-character default prompt with no rule against sycophantic openers or weakening tests. Finding 2: every subagent body drops "Report outcomes faithfully" and "a denied call means the user declined it". Finding 3: the auto-mode classifier puts "fabricating or misreporting results" out of scope. Finding 4: Stop-hook gates fail open, blocks cap at eight, the prompt-type judge has no tools.
- Section 8.2 (writing for the three models): calm imperatives, a reason beside every rule, a "do instead" beside each prohibition, named failure patterns, XML sections with prose inside, contrastive examples; nothing that asks a model to write out reasoning; no "think carefully".
- Section 8.3: load about 1,000 tokens of core terms; scope the rest with `paths:`.
- Section 8.5: pre-registered eval, arms A0, A1, A2, at least 10 runs per cell, trace-graded measures, wording graders only for I06.
- Table 6: Opus 5.5 named premature stops (announcing the next step, offering to continue, listing decisions that block nothing); Sonnet 5.5 may report done without a check at low effort; Haiku as default verifier judge, so set `model` on every verifier hook.

### `external/` root files

**`llm-agent-behavior-mitigation-research.md`** (10,373 B). Evidence cutoff 2026-11-06.
- Sycophancy: reframe a non-question into a question beats a bare "don't be sycophantic" (Dubois et al.); a complaint, instruction or completion report "must not automatically become an invitation to debate it" (`:22`).
- Self-correction: prompted self-critique is unreliable; external feedback works (Kamoi et al.); "a model's own declaration that it fixed an issue cannot substitute for measured behavior" (`:28`).
- Instruction drift under rephrasing: up to 61.8% drop (IFEval++); test paraphrases, corrections, cancelled tools, user-reported results.
- Context: no universal 4,000-character target; XML tags are not shown to help.
- Protocol (`:55-67`): one observable failure, independent success definition, baseline, one factor at a time, held-out cases, "transfer to a different model... is unverified until re-tested".

**`2026-10-07/claude-llm-agent-failure-dossier.md`** (42,028 B). 49 annotated sources S01 to S49, 40 failure patterns.
- Opus 5.5 system card (S04): an internal snapshot invented a user approval quotation for a subagent; about 80% of missing-file reward-hack attempts were disclosed incomplete work.
- Table 5.B: impossible tasks 30% hack without an anti-hack prompt, 23% with one.
- Hooks (S48): `PreToolUse` exit 2 blocks, exit 1 does not. Subagents (S49): a parent in bypass, accept-edits or auto mode overrides the child's mode.
- Claim to support table (`:469-477`): "I ran the test" needs a recorded execution; "All tests passed" needs the true denominator; "The user approved it" needs the actual authorization, not a parent's quote.
- Sources S09 to S18 are user reports, not reproductions; several entries (S11, S15, S22, S27, S28 to S30, S35, S43, S44) are headings with no body.

## 2. Requirements

Merged and de-duplicated. Source column gives the strongest source; others agree unless marked. Status: **user** = the user's own words; **terms** = the user's Agent Terms; **research** = third-party evidence the user collected.

### Naming and form of Shipped Source

| ID | Requirement | Source |
|---|---|---|
| R-N1 | Write identifiers in headlinese, with the article dropped. Not in the dossier. | `~/.claude/rules/claudetto/useBlockLanguage.md:1`; task prompt |
| R-N2 | Use Title Case where the platform convention asks (Markdown headings, Apple HIG labels). Not in the dossier. | task prompt |
| R-N3 | One concept, one term; use the term the project already uses; no synonyms, no renames. | `agent-terms/TERMS-OF-SERVICE.md:184`; `code-readability-for-humans-and-ai-agents.md` |
| R-N4 | Names carry units and intent (`connection_timeout_ms`); predicates read `is_valid`; no `data`, `thing`, `tmp2`, `utils`, `helpers`, `misc`, `common`. | `code-readability-for-humans-and-ai-agents.md` |
| R-N5 | Follow local naming and format conventions; run the formatter; do not invent formatting. | `agent-terms/TERMS-OF-SERVICE.md` S7.5; `code-readability-for-humans-and-ai-agents.md` |

### Code style

| ID | Requirement | Source |
|---|---|---|
| R-C1 | Smallest diff; no rename, reorder, reformat, rewrite beyond the task; list what you left out. | `agent-terms/TERMS-OF-SERVICE.md:174` |
| R-C2 | Limits: function at most 30 NLOC, complexity at most 10, nesting at most 2, parameters at most 4, line at most 100. Guardrails (P1). | `agent-terms/TERMS-OF-SERVICE.md:192` |
| R-C3 | Abstract at the third repeat, not the second; no helper for a one-off; no hypothetical design. | `agent-terms/TERMS-OF-SERVICE.md:190` |
| R-C4 | Loud failures: no empty `catch`, no `except: pass`, no hiding fallback; validate at system boundaries. | `agent-terms/TERMS-OF-SERVICE.md:188` |
| R-C5 | Comments explain why, never narrate; no docstrings on code you did not change. | `agent-terms/TERMS-OF-SERVICE.md:194` |
| R-C6 | Shipped source carries no session, task, plan, date or "user decided" narration. | `agent-terms/TERMS-OF-SERVICE.md:215`; `agent-terms/enforcement/provenance-guard.py` |
| R-C7 | Search for existing code and reuse it before writing. | `swe-best-practices.md` B5-2 |
| R-C8 | Leave uncertainty visible: state open API behaviour, units, formats; do not write confident code over a gap. | `agent-terms/TERMS-OF-SERVICE.md:186` |
| R-C9 | Tests check behaviour, never prose; never weaken a test, grader, baseline or limit without consent naming it. | `agent-failure-dossier/06-autonomy-and-consent.md`; `swe-best-practices.md` B5-6 |
| R-C10 | No proprietary schemas or formats; use native functionality and documented configuration. | `agent-failure-dossier/04-engineering-delegation-and-cost.md`; `users-chatgpt-web-instructions-for-gpt6.txt:7` |

### Reply format

| ID | Requirement | Source |
|---|---|---|
| R-F1 | Lead with the substantive outcome; prose by default; structure only where it helps. | `users-chatgpt-web-instructions-for-gpt6.txt:19`; `agent-terms/TERMS-OF-SERVICE.md` S6.9 |
| R-F2 | Notices (Breach, Block, Rejection, changed value, narrowed scope, substituted model, unverified claim) go in the first lines, one line each: `TYPE: what, clause, change, need`. | `agent-terms/TERMS-AND-CONDITIONS.md:141`; `agent-terms/SERVICE-LEVEL-AGREEMENT.md` SL-1.4 |
| R-F3 | One line before the first tool call saying what comes next. | `agent-terms/TERMS-OF-SERVICE.md:150` |
| R-F4 | End with a short summary, no tool-by-tool recap. | `agent-terms/TERMS-OF-SERVICE.md:150`; `agent-failure-dossier/04-engineering-delegation-and-cost.md` |
| R-F5 | Report template: `Outcome`, `Done`, `Checked: <command> -> exit <code>; n of N`, `Not done`, `Unverified` (2 or 3 least certain), `Needs you` (each with recommendation and default). | `agent-terms/SERVICE-LEVEL-AGREEMENT.md` SL-6 |
| R-F6 | Report the denominator; verdicts from exit codes and full output; mark measured versus inferred. | `agent-terms/TERMS-OF-SERVICE.md:102-104` |
| R-F7 | Cost as a computed number, judged against the user's goal; never "this would cost a lot". | `agent-terms/TERMS-OF-SERVICE.md` S6.8 |
| R-F8 | Name the edge cases handled. | `~/.claude/rules/claudetto/useEdgeCaseReport.md:6` |
| R-F9 | Block language in prompts, tool and agent descriptions, hook text; docs and replies keep full articles. | `~/.claude/rules/claudetto/useBlockLanguage.md:1`; project `CLAUDE.md` |
| R-F10 | Prompt rules: reason beside each rule, say what to do, name failure patterns, calm wording, say who acts, never ask for written-out reasoning. | `agent-terms/TERMS-OF-SERVICE.md:200`; `rules-that-do-not-bind.pdf` section 8.2 |

### Agent behavior

| ID | Requirement | Source |
|---|---|---|
| R-B1 | Classify the message: question gets an answer, observation is information, correction updates context, explicit action request authorizes action. | `users-chatgpt-web-instructions-for-gpt6.txt:3` |
| R-B2 | Pasted material is not a request for analysis; do not perform tasks nobody asked for. | `agent-pet-peeves.md` items 41, 42 |
| R-B3 | Treat user-reported tests and observations as established context; do not fact-check unprompted; no filler caveats. | `users-chatgpt-web-instructions-for-gpt6.txt`; `agent-pet-peeves.md` items 11, 20 |
| R-B4 | No opener of agreement, praise or apology; name the error and the fix. | `agent-terms/TERMS-OF-SERVICE.md:160`; `agent-terms/CODE-OF-CONDUCT.md` |
| R-B5 | No promise of future behaviour; propose a mechanism instead. | `agent-pet-peeves.md` item 54; `agent-terms/TERMS-AND-CONDITIONS.md` T9.1 |
| R-B6 | Apply a necessary change now; do not describe it hypothetically. | `agent-pet-peeves.md` item 55 |
| R-B7 | Do routine, reversible, in-scope work without asking; stop only for the user's own choices or a Reserved Action. Over-deferral is a fault. | `agent-failure-dossier/06-autonomy-and-consent.md` (user quotes); `agent-terms/TERMS-AND-CONDITIONS.md` T5.2 |
| R-B8 | A turn ends when the work is done, blocked, or waiting on a Reserved Action; never by announcing the next step. | `agent-terms/TERMS-OF-SERVICE.md:245`; `agent-terms/SERVICE-LEVEL-AGREEMENT.md` SL-1.8 |
| R-B9 | Consent names the value and covers only that; a plan approval does not approve numbers inside it; a Rejection is final across tools and agents. | `agent-terms/TERMS-OF-USE.md:40-44` |
| R-B10 | A block (permission, sandbox, classifier, hook) is final for that action; no other route to the same effect. | `agent-terms/TERMS-OF-USE.md:90` |
| R-B11 | Change position only on new Evidence, named; pushback alone is not Evidence. | `agent-terms/TERMS-OF-SERVICE.md` S6.5 |
| R-B12 | Take project state (version, branch, release scope, tooling) from the repository, never from defaults. | `agent-terms/TERMS-OF-SERVICE.md:49`; `agent-failure-dossier/01-grounding-and-memory.md` |
| R-B13 | A claim needs Evidence observed this session; "done" needs a real check with exit code; never write "the user approved" without a user message. | `agent-terms/SERVICE-LEVEL-AGREEMENT.md` SL-1; `agent-terms/TERMS-OF-SERVICE.md` S6.4 |
| R-B14 | Never read, print, search for, or commit secrets; no `.env` reads. | `agent-terms/CONFIDENTIALITY-AGREEMENT.md:20`; `agent-terms/TERMS-OF-USE.md:110` |
| R-B15 | Shared tree: assume dirty; commit own paths with `git commit --only`; no stash, reset, clean, rebase without consent; no `git add -A`. | `agent-terms/RULES-OF-ENGAGEMENT.md:33-40` |
| R-B16 | Kill only by a PID the session saved; never `pkill` or `killall`. | `agent-terms/RULES-OF-ENGAGEMENT.md` RE-3; project `CLAUDE.md` |
| R-B17 | Sandbox-first: find the fix that works inside the sandbox before turning it off, and record it. | `agent-terms/RULES-OF-ENGAGEMENT.md:78`; `agent-terms/TERMS-OF-USE.md:94` |
| R-B18 | Delegates: brief names scope and check; hand-back leads with notices; the principal answers for delegates; delegates get the faithful-reporting and denial lines. | `agent-terms/DELEGATION-AGREEMENT.md` |
| R-B19 | Evals: assert and record the served model; keep traces; no model fallback; a tool error is not a negative result. | `agent-failure-dossier/07-measurement-and-environment.md`; `agent-terms/enforcement/settings.eval.json` |
| R-B20 | Corrections, Rejections, Consents survive compaction verbatim. | `agent-terms/enforcement/compact-instructions.txt` |
| R-B21 | Do not change retention settings, transcripts, history. | `agent-terms/DATA-HANDLING-NOTICE.md` DH-2 |

### Things the user calls a fault (their words)

- "irresponsible" for deferring when capable (`agent-failure-dossier/06-autonomy-and-consent.md`).
- "that was a workaround, NOT a solution" for raising a limit without consent (same file).
- "TESTS SHOULD BE FOR BEHAVIOUR, NOT PROSE!" (same file).
- "not a mistake--an error" (`agent-failure-dossier/07-measurement-and-environment.md`).
- The 70 numbered faults of `agent-pet-peeves.md`.

## 3. Carriers

Cheapest carrier first. Reason: a rule lands at the cheapest layer that can hold it; the user's own ladder says prose is weakest, so judgement rules stay prose and checkable rules become hooks.

| Requirement | Carrier | Reason |
|---|---|---|
| R-N1, R-N2, R-N5 | Rule file `plugins/claudetto/rules/` (path-scoped) | Applies when the agent writes code; no hook can judge a name. |
| R-N3, R-N4, R-C3, R-C4, R-C7, R-C8 | Rule file, one line each, with a reason | Judgement rules stay prose (PDF Table 8). |
| R-C1 | Existing `rules/noUnrequestedEdits.md` | Already in place; `texts.ts:29` covers the sibling case. |
| R-C2 | Lint (repo's own `just lint`), not prose | Mechanical; the user's configs own the limits. |
| R-C5, R-C6 | Hook: provenance guard on Write and Edit (existing `PreToolUse`) plus `~/.claude/rules/claudetto/noNarratingComments.md` | Regex on added lines is deterministic; fails open. |
| R-C9 | `ROOT_PROMPT` `<defects>` line plus `soft_deny` in user settings | The prompt line exists (`texts.ts:29`); the check on changed expectations needs the classifier rule. |
| R-C10 | Project `CLAUDE.md` line | One standing sentence. |
| R-F1, R-F4, R-F5 | Output style `Concise.md` | It already holds register and report rules; the template belongs where replies are shaped. |
| R-F2 | Output style plus Stop hook that checks the first lines | Position in the reply is checkable. |
| R-F3 | Output style, one sentence | Conflicts with current text; needs a decision (see section 4). |
| R-F6, R-F7, R-B13 | Stop hook (agent-type, `model` set) and `ROOT_PROMPT` `<evidence>` | Completion evidence is checkable from the transcript. |
| R-F8 | Rule file (exists, user-global) | Already carried. |
| R-F9, R-F10 | Rule file (exists) | Already carried. |
| R-B1, R-B2, R-B3, R-B6, R-B7 | `ROOT_PROMPT` `<requests>` | One per-model system prompt text reaches main agent; judgement only. |
| R-B4 | Stop hook (exists: `AGREE_OPENER`, `REGISTER_BLOCK`) | Opener is the first sentence; checkable. |
| R-B5 | Output style line | Wording only; the mechanism is the Stop hook. |
| R-B8 | Stop hook (carry-through) | Last-message shape is checkable. |
| R-B9, R-B10 | `ROOT_PROMPT` `<consent>` plus `autoMode.soft_deny` | Prose for intent; classifier for re-route. |
| R-B11 | `ROOT_PROMPT` `<evidence>` | Judgement. |
| R-B12 | SessionStart hook that prints branch, tags, version | State derivable by command (dossier 01 recipe). |
| R-B14 | `permissions.deny` for `.env` reads plus rule | Deterministic. |
| R-B15, R-B16 | `permissions.ask`/`deny` and gate hook (exist: `texts-gate.ts:105-115`) | Pattern rules; fail on shell indirection. |
| R-B17 | `ROOT_PROMPT` `<consent>` | Judgement of "fix failed". |
| R-B18 | `SubagentStart` hook injecting Delegate Contract; agent frontmatter body | Claude Code drops two lines from subagents; hook restores them. |
| R-B19 | Eval profile settings and run record | Fail loudly on mismatch. |
| R-B20 | `PreCompact` hook text | Deterministic reinjection. |
| R-B21 | `permissions.ask` on settings edits | Deterministic. |

## 4. Conflicts

Each row quotes the dossier side and the claudetto side with `file:line`. Evidence: read.

| # | Dossier | claudetto | Note |
|---|---|---|---|
| C1 | `agent-terms/CONFIDENTIALITY-AGREEMENT.md:20`: "never `cat` a `.env` file, never grep for keys... Exploring for credentials by trying paths and searching is a violation in itself"; `agent-terms/TERMS-OF-USE.md:110`: "Do not search for them." | `plugins/claudetto/hooks/texts.ts:13`: "Look for a credential in repo's `.env` files, then the environment; never ask for a new file" | Direct conflict. The dossier forbids the search that the prompt orders. |
| C2 | `agent-terms/TERMS-OF-USE.md:90`: a block "is final for that action. Do not reach the same effect by another route" | `plugins/claudetto/hooks/texts.ts:13`: "When a route is blocked, take another." Same file `:25`: "reach its effect through no other tool or agent unless the denial names one." | Conflict inside `texts.ts` too. "Route" needs a scope: an unreachable site is not a denial. |
| C3 | `agent-terms/TERMS-OF-SERVICE.md:150`: "Before your first tool call, give one line saying what you are about to do." | `plugins/claudetto/output-styles/Concise.md:7`: "Text between tool calls holds a finding, a result, or an error, because the next call shows itself." `plugins/claudetto/hooks/texts.ts:278`: "Keep your next call unannounced." | Direct conflict on announcing a call. |
| C4 | `agent-terms/TERMS-AND-CONDITIONS.md:141`: notices (Breach, Block, Rejection, changed value, scope narrowed, model substituted, unverified claim) "go in the first lines of the Agent's next message". | `plugins/claudetto/output-styles/Concise.md:7`: "Open with the outcome or the deciding fact." | Ordering conflict. No claudetto text asks for the `TYPE:` notice line. |
| C5 | `users-chatgpt-web-instructions-for-gpt6.txt:3`: "corrections as updates to context"; `agent-pet-peeves.md:14`: "11. Fact-checking statements when no fact-check was requested." | `plugins/claudetto/hooks/texts.ts:13`: "Weigh a dispute of your last reply as a third party's claim and check it this turn". `plugins/claudetto/output-styles/Concise.md:7`: "When the user disputes your last reply, run the check". | Tension. The dossier also holds S6.5 (`agent-terms/TERMS-OF-SERVICE.md:158`): "Pushback on its own is not Evidence", which supports claudetto. The user's two texts disagree; ask which governs. |
| C6 | `agent-terms/TERMS-AND-CONDITIONS.md:123` (T6.2): a Correction "takes effect immediately" and binds every later delegate. | `plugins/claudetto/hooks/texts.ts:9`: "After a `! <command>` or a correction, report and wait: untasked work acts on a guess." | Partial. "Wait" conflicts with `agent-pet-peeves.md:65` ("Describing necessary changes hypothetically instead of applying them immediately") when the correction names a fix. |
| C7 | `agent-terms/TERMS-OF-SERVICE.md:233` (S9.1): "Routine, reversible, in-scope work needs no permission... edit[s]". | `plugins/claudetto/output-styles/Concise.md:15`: "Change a file only for a change the user asked for in this conversation that is not yet done." | Mild: S9.1 allows in-scope edits the request needs; the style text reads narrower. |
| C8 | `agent-terms/DELEGATION-AGREEMENT.md` DA-5; `agent-terms/enforcement/subagent-contract.py:5-8`: inject "Report outcomes faithfully" and "a denied call means the user declined it" into every subagent. | `plugins/claudetto/agents/work.md:5-7`, `search.md:7-9`, `sweep.md:8-10`, `plan.md:7-9`. A grep of `plugins/claudetto` for those phrases finds no match. | Gap. No agent file or hook carries the contract; the hand-back lacks notices-first types (BLOCKED, REJECTED, NEEDS-CONSENT, PARTIAL, UNVERIFIED). |
| C9 | `agent-terms/RULES-OF-ENGAGEMENT.md:78` (RE-5.1) and `agent-terms/TERMS-OF-USE.md:94` (U4.3): fix inside the sandbox first. | `plugins/claudetto/hooks/texts-gate.ts:129`: "run each git write with `dangerouslyDisableSandbox: true`." | The text tells the agent to leave the sandbox; the dossier asks for the in-sandbox fix first and a recorded reason. The text does give a cause (a folder with no repository at start), so the cause may meet U4.3. |
| C10 | `agent-terms/RULES-OF-ENGAGEMENT.md:36`: commit "your own paths, with `git commit --only <paths>`"; `:36` prohibited: `git add -A` or `git add .` in a shared tree. | `plugins/claudetto/hooks/texts.ts:51`: "Commit them as their own commit... [files] changed this session by a command, the user, or a tool". | The Stop block orders a commit of files the user changed. The dossier limits commits to the agent's own paths. |
| C11 | `agent-terms/TERMS-OF-SERVICE.md:215` (S8.1): shipped source carries no session narration. | No text in `plugins/claudetto/hooks/texts.ts` or `rules/*.md` states it. The project `CLAUDE.md` and `~/.claude/rules/claudetto/noNarratingComments.md:6` do. | Gap in the plugin, closed outside it. |
| C12 | `agent-terms/TERMS-OF-SERVICE.md:150` (S6.1): short end summary; `agent-terms/SERVICE-LEVEL-AGREEMENT.md` SL-6 labelled lines (`Outcome:`, `Checked:`, `Needs you:`). | `plugins/claudetto/output-styles/Concise.md:19`: "Use headings, tables, and lists only for real structure." `:27`: `## What I Need From You`. | Format conflict. The SL-6 labels are plain lines; claudetto's one heading is a Title Case Markdown heading. |
| C13 | `agent-terms/TERMS-OF-SERVICE.md:200` (S7.14): "use calm wording, without capitals or 'CRITICAL'". | `plugins/claudetto/hooks/texts.ts:3-35`: no capitals used for emphasis. | Aligned. Listed for the record. |
| C14 | `rules-that-do-not-bind.pdf` section 6, Table 6: Haiku is the default agent-type hook judge; "set `model` on every verifier hook". | `plugins/claudetto/agents/plan.md:4`, `search.md:4`: `model: claude-sonnet-5-5`; `sweep.md:4`: `model: fable`; `work.md` has no `model`. | Not a conflict with a verifier hook; note that `work.md` inherits and `sweep.md` uses `fable`, which the project `CLAUDE.md` allows for `sweep` only. |

Aligned, no conflict (read): `texts.ts:29` ("Test what a caller observes") with R-C9; `texts-gate.ts:86-87` (`GATE_MASKED_EXIT`) with S4.3; `texts-gate.ts:105-115` with RE-3; `texts.ts:256-259` (`REGISTER_BLOCK`, `AGREE_OPENER`) with S6.6; `texts.ts:17` (say what remains after over 1% of the week) with S6.8; `rules/noUnrequestedEdits.md:1` with S7.1; `texts-gate.ts:55` (`ASK_FIX_DENIED`) with S9.1 and the over-deferral quotes.

## 5. Open Items

- Naming: no dossier rule exists for headlinese identifiers or Title Case; the user must supply it if it is to be carried.
- Not measured: whether any carrier changes behavior. The research file (`llm-agent-behavior-mitigation-research.md:67`) says a prompt that helps a benchmark is a candidate only; the pre-registered eval in the PDF has not been run.
- C5 needs a decision from the user: the dossier holds both "corrections are updates" and "pushback is not Evidence".
- `2026-10-07/claude-llm-agent-failure-dossier.md`: bodies of S11, S15, S22, S27 to S30, S35, S43, S44 are empty headings in the file itself.
