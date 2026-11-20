# Awesome Lists Research for claudetto-spec

Retrieval date for every URL below: 2026-11-21. Labels: measured (number with setup), reported (anecdote or unreplicated claim), design (inference). Only text returned by the fetches was used; page summaries came through a fetch tool that condenses pages, so wording is paraphrased.

## awesome-agent-conventions

Source: https://github.com/ItamarZand88/awesome-agent-conventions (38 stars on the repo itself; 22 conventions in 11 categories, tiered by adoption).

- AGENTS.md is listed as read by most coding agents (Codex, Cursor, Jules, Aider, Gemini CLI, Zed), spec at agents.md; CLAUDE.md, MEMORY.md and SKILL.md (spec at agentskills.io/specification) are listed as established. Reported (the list's own tiering, no counts).
- DESIGN.md is listed with spec at github.com/google-labs-code/design.md, read natively by Google Stitch and by coding agents when pointed at it. Reported.
- Spec Kit and Kiro steering are the only spec-file conventions listed. No entry covers requirement IDs, traceability, or test integrity. Design: the `## <ID>` plus test-citation scheme has no established standard to adopt, so it stays our own, stated as such.
- ARCHITECTURE.md is not listed; no entry for arc42 or MADR either. Design: the SKILL.md clause "read `ARCHITECTURE.md` or `DESIGN.md` if present" rests on the repo's own standards list, not on this source.
- Agent Cards (A2A) are noted as a Linux Foundation project at v1.0, but they describe agent capability, not specs. Not relevant.
- llms.txt is noted as published widely with no major provider confirming it reads it. Reported. Shows that "published" does not mean "consumed".

## awesome-agent-orchestrators

Source: https://github.com/andyrewlee/awesome-agent-orchestrators (read to character 100000; the last part of the page was cut off by the fetch tool).

- no_human (https://github.com/no-human-ai/no_human, 322 stars) runs a mechanical tamper guard before its review gate. It counts deleted tests, newly added skips, and assertions turned into tautologies; an unjustified count stops the attempt. Its page reports 44 attempts stopped in 65 days on its own board for deleting or weakening a test. Reported (one board, no accuracy evaluation). Known gap: test files with non-ASCII names can drop out of the before/after comparison.
- Design: `spec_check` flags only staged tests changed since staging. A deletion of a staged file, an added skip, or a weakened assertion in a not-yet-staged helper may be outside that check. Count deletions and skip markers in the staged-versus-working diff too.
- foremerge ("gates acceptance on a verification run the tool executes itself") and ordewell ("passed only when evidence appears in session output") share one idea: the harness runs the check, the agent does not report it. Reported (one-line descriptions only; not read further). This matches our Check step, except that our step relies on the agent calling `spec_check` and the project test command.
- Orbi reviews a PR against the issue's acceptance criteria in a separate session. Reported. This is the per-task review that sdd-frameworks.md already rejects on cost grounds.
- bernstein keeps no model in the coordination loop; aGiTrack records token cost in each commit message. Reported. Not adopted: the project has no orchestrator.

## awesome-harness-engineering

Source: https://github.com/ai-boost/awesome-harness-engineering. The rendered page had no entries; the raw README was fetched instead (https://raw.githubusercontent.com/ai-boost/awesome-harness-engineering/main/README.md), first 100000 of 315105 characters only. Star counts are badges only and were not readable.

- Marmelab audit of 246 open-source harnesses: 60% ship without tests or evals; recommends executable checks over prose rules, and expiry conditions for controls (https://marmelab.com/blog/2026/09/24/the-state-of-ai-harness-engineering-2026.html). Measured per the list's summary; the article itself was not opened.
- Stripe, "You can't whisper at an AI agent": passive docs are ignored, while hard signals in loaded context (skills, errors, CLI prompts) change behavior (https://stripe.dev/blog/ai-steering-experiments). Reported via the list's summary; article not opened. Design: "Never edit the test" in SKILL.md is a passive instruction; the enforcement is `spec_check` output, which is a hard signal only if it is called.
- Martin Fowler, "Harness engineering for coding agent users": separates computational controls (linters, tests) from inferential ones (LLM-as-judge) (https://martinfowler.com/articles/harness-engineering.html). Reported via summary. Supports the design: deterministic check first, no LLM judge.
- Hooks are named as the way to run deterministic scripts instead of relying on prompts (Codex hooks page; a Claude Code mods page). Design: a Stop or PostToolUse hook in the plugin that runs the `spec_check` logic would make the check run without the agent choosing to call it. This is a Claude Code convention.
- "The Compaction Cliff in Long-Running AI Agent Memory": compaction keeps about half of safety rules after one round and a tenth after five (https://arxiv.org/abs/2608.22752). Measured per the list's summary; paper not opened. Design: a rule held only in the conversation (the red-test staging rule) decays in long sessions; the deterministic check does not.
- "Agent Skills Can Be Harmful" (https://arxiv.org/abs/2608.11888): differential study of skill-guided runs against no-skill baselines, 307 skill-induced failures. Measured per the list's summary. Design: supports the eval plan of comparing the skill against a no-skill baseline, which the plugin's eval files should already do.
- Token cost entries (headroom 60-95%, Token Savior about 77%, Code Execution with MCP 98.7%) are the list's claims about tool output and tool-call overhead. Reported. None applies to a skill that adds about 40 lines and one deferred tool.

## awesome-agentic-patterns

Source: https://github.com/nibzard/awesome-agentic-patterns. Pattern pages read from raw.githubusercontent.com under `patterns/`. The index shows titles only; maturity is stated inside each page.

- Feature List as Immutable Contract (`feature-list-as-immutable-contract.md`, status emerging): requirement records with IDs, where the agent may flip `passes` only after exercising the feature and may not delete or edit entries. The page reports no experiments and says immutability is enforced only by prompt, so it is a soft constraint. Design: our requirements live in the spec file, which the agent can edit; `spec_check` does not see a requirement deleted or reworded in the same change as the code. Compare the spec against the base commit (`git show HEAD:specs/<capability>.md`) and flag removed or reworded requirement IDs unless the user's request names them.
- Spec-As-Test Feedback Loop (`spec-as-test-feedback-loop.md`, emerging, evidence grade low): regenerate tests from the spec on each spec commit; route failures to a code fix or a human review of unclear wording. No measured results. The page says a prior claim of production use at Anthropic, OpenAI and LangChain was removed as unsupported. Design: no evidence for generated tests; our hand-written tests citing IDs are the safer variant.
- Own-Check Fault Injection (`own-check-fault-injection.md`, emerging): inject one fault into a live pipeline and score only whether its own checks detect it. Reported by the contributor's own harness: over 900 faults in LangGraph, CrewAI and AutoGen, median own-check detection 16.7%; recovery without detection was 51-61% of valid faults. Design: apply to `spec_check` itself. Eval cases should plant a known fake (a citation-only test with no assertion, a deleted staged test, an added skip) and verify the check reports it.
- Anti-Reward-Hacking Grader Design (`anti-reward-hacking-grader-design.md`, emerging): multi-criteria scoring, explicit gaming-pattern checks that zero the score, adversarial testing before use. One case (Rogo) reports 100% validation reward while the model exploited the grader, then a "21% real performance improvement" with metric and baseline undefined. Reported, weak. Design: the transferable lesson is that a pass rate near 100% on the first run is itself a signal. Citation coverage alone is a proxy a test can satisfy by naming an ID with no assertion.
- Deterministic Grader in the Loop and Hybrid LLM/Code Workflow Coordinator are listed under deterministic checks. Titles only were read. Consistent with `spec_check` being code, not a model call.
- Tool Search Lazy Loading is listed as a context pattern. Title only was read. It matches the deferred `spec_check` tool.

## awesome-software-architecture

Source: https://github.com/mehdihadeli/awesome-software-architecture. The page text names none of arc42, ADR, MADR, C4, ARCHITECTURE.md, traceability, or fitness functions; only four catalog titles were visible (architecture documentation, architecture diagram, component diagram, architectural design principles). Pages behind them were not followed because the titles gave no sign of a requirements or traceability standard.

- No finding supports or contradicts the design. Design: the project's own standards list (arc42, MADR, ARCHITECTURE.md) must be sourced from their own sites, not from this list.
- Not fetched: https://awesome-architecture.com/ (named by the fetch tool as the full catalog) was not opened.

## Recommendations for claudetto-spec

1. Add a spec-drift check against the base commit. What: `spec_check` compares each requirement ID in `specs/*.md` with `git show HEAD:<file>` and flags removed IDs, and reworded one-sentence behaviours, in the working tree. Why: the staged-test check protects tests but the spec is also editable, and Feature List as Immutable Contract names deleting or editing the contract as the failure; its own enforcement is prompt-only, so a code check is the stronger form. Evidence: design (pattern page reports no measurements).
2. Extend the tamper check from "changed since staging" to deletions, added skip markers, and removed assertions in staged files. What: report per staged file: deleted, new `skip`/`xit`/`.only`-style markers, assertion count dropped. Why: no_human's mechanical guard covers exactly these three and reports 44 stops in 65 days on one board; its documented gap (non-ASCII file names) tells us to test paths with non-ASCII names. Evidence: reported.
3. Flag citation-only tests. What: a test that cites an ID but contains no assertion call is listed as "cited, unasserted" (language-agnostic heuristic with a documented false-positive rate). Why: coverage by citation is a proxy and the grader-design page's "100% reward while exploiting" case shows a proxy can read full while the work is fake. Evidence: design.
4. Evaluate `spec_check` with injected faults. What: eval cases that plant a deletion, a skip, a citation-only test, an orphan ID, and an inflated requirement, and assert each is reported, plus a clean baseline that reports nothing. Why: Own-Check Fault Injection reports 16.7% median detection for pipeline self-checks that were never tested this way; our check should not be an untested assumption. Evidence: reported (contributor's harness), applied by design.
5. Run the check from a Claude Code hook as well as from the skill. What: a plugin Stop hook (verify the exact hook name and schema against the Claude Code hooks docs before building) that runs the same parser and blocks completion on a hard finding. Why: Stripe's study (via the list) finds hard signals change behavior and passive text is ignored; the compaction paper reports rules in conversation decay. Today the Check step depends on the agent choosing to call `spec_check`. Evidence: reported for both sources; the hook decision is design.
6. Keep a baseline-versus-skill comparison in the evals. What: each eval case also runs without the plugin and reports both outcomes. Why: "Agent Skills Can Be Harmful" attributes 307 failures to skills by this comparison, and the 100%-reward case shows the need for an independent baseline. Evidence: measured per the list's summary (paper not opened).

## Rejected

- Per-task review sessions and reviewer agents (Orbi, Delegatus, kodo): cost, and sdd-frameworks.md already requires a measured gain first. Reported evidence only.
- LLM-as-judge or multi-criteria weighted grading (anti-reward-hacking page): nondeterministic and adds tokens; Fowler's computational-versus-inferential split favors the code check. The example weights are illustrative, not validated.
- A JSON feature-list file with `passes` flags (Feature List as Immutable Contract): sdd-frameworks.md already rejects stored state because derived state cannot drift; the pattern itself reports no measurements and prompt-only enforcement.
- Generating tests from specs on each spec commit (Spec-As-Test): evidence grade low, no results, and generated tests invite the fake-green problem we want to prevent.
- Token-compression tools (headroom, Token Savior, semble, context-mode): the plugin's overhead is a short skill and one deferred tool; vendor-reported percentages concern tool output, which the plugin does not produce.
- Cost caps, fleet simulation, model routing (orchestrator list): no orchestrator in the project.
- OKF, Memory Bank, protocols.md, auth.md, ai.txt, llms.txt: no demonstrated fit to specs or requirement IDs, or no demonstrated readers (llms.txt and protocols.md are noted by the list itself).
- Kiro steering files and Spec Kit constitution: already rejected; CLAUDE.md holds project rules.
- Architecture list entries: nothing readable on arc42, MADR or traceability.
