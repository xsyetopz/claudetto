# Reply Risks

## General Cure

One cure serves every conduct fault (asking when it could act, stopping early, scope creep, unchecked claims, invented formats, sycophancy, filler, narration). The tag `build CONDUCT` in a Status line names it.

- Diagnosis: the lean root prompt of the 5.5 models omits the conduct rules (RISK-343), and a rule that exists only in a user file or a hook decays (RISK-250).
- Cure: one short conduct text in the root prompt, set per model through `prompt.compose` (main loop only), written as the wanted behaviour with examples and with no named forbidden word (RISK-242, ADR-0182). It stays at or below the stock lean prompt in length, and it is identical within a model so the prompt cache holds at 98-99%.
- Authoring rule: hook and tool-result texts state plain facts plus the next action, never a verdict (RISK-346).
- Voided cures: each Actions line that names a Stop grader, a Stop check, a typed Stop question, or a regex check is void (ADR-0104, no Stop claim grader). The prompt text carries the fault instead.
- Check (ADR-0177, ADR-0180): at least 10 runs per arm, vanilla against vanilla plus the text, on stored prompts that reproduce one fault per class, plus one prompt per opposite fault (RISK-333). The text ships only for the classes where the fault rate falls.
- Boundary: a third-party report with no reproduction here is not a cure target (ADR-0177); its entry moved to scope Out.

## Friction Of The Agent

- [ ] **RISK-226** Claude asks or stops when it could act.
  Category: agent behaviour.
  Cause: a plugin prompt rule that required approval for paid runs (`agents/main.md:65` at `6d6267be`), a "What I Need from You" ending used as a ritual, plain-text "Should I" questions, asking when an option is marked recommended, and a gap list or "Next:" line treated as the deliverable.
  Event: friction mining of 68 marked prompts in 18 sessions gave 35 fault rows: ASKED-INSTEAD-OF-DOING 11, SCOPE-OVERREACH 8, STOPPED-EARLY 5, WRONG-READING 2, UNVERIFIED-CLAIM 1, IGNORED-INSTRUCTION 1, VERBOSE-OR-UNCLEAR 1, OTHER 6. The agent ended a turn with fixable gaps listed (sessions 0dac040d, eb49a357, bc492e48, c31d1984, 8cdaa0ad) and asked for approval of a free call.
  Consequence: an extra turn each time, and the user repeats the request to stop asking for what the agent can do.
  Likelihood: 4. Impact: 2.
  Existing controls: the project CLAUDE.md FAFO section states the rule ("measure what can be measured before you mark a row unchecked or ask the user"); faults F1-F8 happened under it, so the rule alone did not hold. Scope check: `friction.ts` read 67 transcripts in 11 `~/.claude/projects/-Users-krystian*` folders; the other 3,125 folders hold 1,140 scripted sessions, 2,246 prompts, and 50 hits with no user-typed prompt, so the 35 rows cover all user friction.
  Response: mitigate.
  Actions: no approval rule for in-scope reversible or budgeted work; ask only for what only the user holds; take the recommended option and say so; end no turn with fixable gaps listed unless the line names a blocker only the user can clear. Whether a mechanical Stop check enforces this is not decided here, and the decision is no regex Stop check (user decision, 2026-11-16).
  Trigger: a reply that asks the user to approve an in-scope call, or lists "not measured" gaps.
  Owner: reply.
  Status: open, build CONDUCT.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2486; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2541; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2500.

- [ ] **RISK-227** Claude claims "blocked" or "needs the user" before the cheap check ran, and hands off an untested step (faults F1-F6 of the Agent-tool session).
  Category: agent behaviour.
  Cause: F1 listed "not measured" rows that a $0 run could settle (gitStatus size, the turn-limit note). F2 asked approval for a free `count_tokens` call and a paid run it could start itself. F3 handed over `/tmp/probe-agent/tui.exp` with no successful run; it typed into the workspace trust dialog because `-p` skips that dialog. F4 ran plan-mode probes j5 and j6 without checking that plan mode routes Agent calls to the auto-mode classifier, which the fake API cannot answer, so both runs were void. F5 a resume note said j3 "has NOT produced a result" while `req/j3-*` held complete runs. F6 `/tmp/probe-fake/work` lost `.git` during j4 with the cause not found. P8 (session d0837205 gave a command with no cwd).
  Event: the user objected, and the data was measured only after.
  Consequence: wasted turns and void paid runs.
  Likelihood: 3. Impact: 2.
  Existing controls: the FAFO rule did not hold. The faults are kept as input for what 0.4.0 must prevent: the user wants 0.4.0 never to deal with this friction. F3 was fixed (config pre-trusted; the script accepts a trust dialog and waits for the input box).
  Response: mitigate.
  Actions: run the cheap check or count first; hand off only a step that ran once with its cwd and exact command; check that a run is valid before reading it; verify a resume note against the files.
  Trigger: a claim of "blocked", "not measured", or "has not produced" with no run behind it, or a hand-off step with no recorded run.
  Owner: reply.
  Status: open, build CONDUCT.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2500; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2254; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2272.

- [ ] **RISK-228** Claude builds or keeps what nobody asked for, or reads the user's scope wrong.
  Category: agent behaviour.
  Cause: P3 (sessions c2ca5f8a, fb2f3d30, 26191031 the finish stop-loop; 8a569f82 "for now" scope; b4a5276c prose offered for CLAUDE.md; 1c7f7362 branch and commit; 317e19a9 openspec lint; 1430cd69 tooling layers; 037d3b8c an extra AGENTS.md line; 8a7bc06f goal cancelled). P6 (037d3b8c rule narrowed to one repo; dd0191a1 a paste routed instead of treated as a plugin defect).
  Event: extra work or a narrowed rule the user did not ask for.
  Consequence: user work to undo; a wasted session.
  Likelihood: 4. Impact: 3.
  Existing controls: none named in the source.
  Response: mitigate.
  Actions: no stop hooks or loops without a request; delete, do not harden, an unrequested feature in the way; never offer generated text for a user-owned file; no branch, commit, lint, or goal-ending action unless asked; relay an instruction with its stated scope; read a pasted bad example as a defect claudetto must prevent.
  Trigger: a branch, commit, lint, loop, or narrowed rule with no user request.
  Owner: reply.
  Status: open, build CONDUCT.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2500.

- [ ] **RISK-229** Claude states "impossible" or "not supported" without checking.
  Category: agent behaviour.
  Cause: P4 (session c6a0c8a4 said "tool text can't be rewritten" while `tool.describe` existed; F5 and F8 of the Agent-tool session).
  Event: a false claim about a tool shapes the plan.
  Consequence: a wrong design or a lost route.
  Likelihood: 4. Impact: 3.
  Existing controls: the CLAUDE.md FAFO rule ("call a claim with no run a hypothesis") did not hold.
  Response: mitigate.
  Actions: before "impossible" or "not supported", search the repo, the plugin cache, and the versioned docs; cite the check or call it a hypothesis.
  Trigger: "can't", "impossible", or "not supported" with no cited check.
  Owner: reply.
  Status: open, build CONDUCT.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2500.

- [ ] **RISK-230** Claude uses habit over the repo, or a workaround in place of a fix.
  Category: agent behaviour.
  Cause: P5 (session f2d2eba3 ran `bunx tsc` without reading `justfile` or `package.json`; 87157ef5 asked for general-purpose while it was denied). P7 (f7e13273 a workaround in place of a fix).
  Event: a wrong build command, an agent type that is not offered, or a patch that leaves the root cause.
  Consequence: wasted turns; a defect that returns.
  Likelihood: 2. Impact: 3.
  Existing controls: the Mod route removes general-purpose from the offered list (probe m-b0).
  Response: mitigate.
  Actions: read the repo's scripts before a build or test command; pick agent types only from the session's offered list; fix a failing test or bug at its root cause.
  Trigger: a build or test command that the repo's scripts do not define.
  Owner: reply.
  Status: open, build CONDUCT.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2500.

- [ ] **RISK-231** Claude writes jargon names and low-value tests.
  Category: agent behaviour.
  Cause: P9 (session 0526a12b).
  Event: a file named by jargon, or a test that does not fail on a user-visible break.
  Consequence: code a reader must check for no gain.
  Likelihood: 1. Impact: 1.
  Existing controls: none named.
  Response: mitigate.
  Actions: name a file by its job; add a test only when it fails on a user-visible break.
  Trigger: a new file or test with no user-visible purpose.
  Owner: reply.
  Status: open, build CONDUCT.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2500.

- [ ] **RISK-232** Claude blamed "the sandbox" for a pty failure without checking what enforced it, and misread the local time zone (F9).
  Category: agent behaviour.
  Cause: the agent did not check the enforcer; it read the local zone (EET, UTC+2) as UTC+1, so the settings edit (12:49Z) looked later than the session start (12:58Z).
  Event: the user was right that the sandbox was off; the cause was the baseline claudetto confine (design.md:172).
  Consequence: a wrong diagnosis and an extra turn.
  Likelihood: 1. Impact: 2.
  Existing controls: none named.
  Response: mitigate.
  Actions: name the enforcer by a check (process start time, profile, settings sources) before blaming one; convert a local time to UTC with the zone offset.
  Trigger: a cause named with no check.
  Owner: reply.
  Status: open, build CONDUCT.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2413.

## Verification And Honesty

- [ ] **RISK-238** The agent names a fix for a failure from a guess and ignores that the step worked before.
  - Category: conduct.
  - Cause: The agent reads a failed release log and tells the user to add an npm token, with no check of why the same workflow published before.
  - Event: The user says it worked before; the agent then finds that the cause is a trusted-publisher entry with the wrong permission set, and withdraws the token advice.
  - Consequence: A wrong step handed to the user, and an extra turn.
  - Likelihood: 1 (one report)
  - Impact: 2
  - Existing controls: the user rule "read the source or run a probe before you state a fact about a tool".
  - Response: mitigate.
  - Actions: A rule that a failure of a step that passed before starts with the diff between the passing and the failing run.
  - Trigger: A report that says a fix and names a cause with no run behind it.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: observed in transcript, 2026-11-09; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/d9e65e3e-7eda-4061-b888-f957adb96dd2.jsonl:2693; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/d9e65e3e-7eda-4061-b888-f957adb96dd2.jsonl:2713, reported, user, 2026-11-09.

## Context Leakage

- [ ] **RISK-242** Named forbidden words reappear in output.
  Category: agent
  Cause: A prompt names a word or thing to avoid, so it sits in context; a word once in context is likely to recur (field report; the recurrence is the commenters' account).
  Event: The agent echoes the forbidden word or idea; a commenter puts the leak at about 75% when the model knows the "game".
  Consequence: Unwanted output; the window stays poisoned until thrown away.
  Likelihood: 2
  Impact: 2
  Existing controls: none at 088a227c
  Response: mitigate
  Actions: State the wanted output positively with examples (47 votes top comment); throw the context away and restart when it leaks.
  Trigger: An avoid-list word appears in a reply.
  Owner: reply
  Status: open, build CONDUCT. Basis: reported.
  Source: external/2026-10-22/reddit.com-r-chatgpt-comments-1tpk1qk-how-to-avoid-the-pink-elephant-pa-20261022T004323Z.md:439 (url: <https://www.reddit.com/r/ChatGPT/comments/1tpk1qk/how_to_avoid_the_pink_elephant_paradox/>).

## Context Loss And Handover

- [ ] **RISK-250** Instruction decay: user rules and CLAUDE.md protocols are ignored or broken later.
  - Category: context.
  - Cause: a rule is read as background, with no check at the point of use; a case list is prose, not enforcement; instruction files are context, not configuration, and compaction paraphrases them; a rule given early fades.
  - Event: user rules and CLAUDE.md protocols ignored, or acknowledged then ignored; constraints set early (read-only, no commit, no deps, only these files) broken later; read-only 7 of 8 violated at baseline; rules arrive late as one mid-turn reminder after a tool result (17 of 22 sessions; `useEdgeCaseReport` met in 8 of 1,473 replies; `noNarratingComments` broken: 218 added comments in 1,610 edits, measured heuristic); drift after 30-40 messages and after compaction; model and effort choices for subagents ignored; `sed -i` used against a rule; the agent repeats a failure its own project list names ("decision of the user" for its own choice) though a list of 27 cases (6 format, 6 scope, 4 approval, 11 process) existed; CLAUDE.md and skill rules are followed most of the time, not every time; an acknowledged constraint is routed around, an accurate postmortem brings no change, a correction is not retained, a Codex skill file is read only to about line 220; a model says "Discovery Protocol applies" then misses a `.cjs` file (1wojkw1); "too long" feedback is gone after a few answers and compaction is not the main cause (1wwiwf3); output style, CLAUDE.md and SKILL.md hold only a few turns (1wwllp3); a banned prefix-named test file layout returned in 27 files minutes after the agent moved them, when its own subagent made new prefix chains (session `3d984dfb` (log no longer in ~/.claude/projects/; cited by plans/rebuild-curation.md@0e987414)).
  - Consequence: a rule breaks without notice; a user rule broken and rework.
  - Likelihood: 5
  - Impact: 3
  - Existing controls: `plugins/claudetto/hooks/features/prompt/texts.ts` (partial); the constraint ledger of the old change is not rebuilt (settled: no constraint ledger; user decision, recorded in the 2026-11-17 handover (day of decision not recorded)); the decay numbers at plan line 641 and the prefix-file rule at line 1322.
  - Response: mitigate.
  - Actions: lint/hook at the point of use; hard rules in hooks; a hook or Stop check per recurring case; SessionStart-on-compact and UserPromptSubmit re-injection of the few must-follow rules (violations 10 to 3, reported); the extractor must not read a task fragment as a constraint (a task phrase about renaming an export blocked an edit). The old cure "constraint ledger (39/48 -> 48/48; read-only 1/8 -> 8/8)" is Out under the settled [ADR-0075](../adr/0075-no-constraint-ledger.md) decision (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)); state each layout rule where the subagent gets it; test recurrence. Mitigation research the plan lacks: Instruction Hierarchy (2404.13208), MemGPT paging (2310.08560), MEM1 constant-size memory (2506.15841).
  - Trigger: a rule set early that a later call breaks; a repeat of a banned pattern.
  - Owner: reply
  - Status: open, build CONDUCT. partial at 088a227c.
  - Source: external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:102; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:841; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:226; external/2026-10-12/export-Made Claude Code follow the rules I keep telling it, and catch its own stale memories (Jev + dreamin.jsonl:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x26t6z/made_claude_code_follow_the_rules_i_keep_telling/>); external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:88-95; external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:100; external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:118; external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:175; external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:179.
  - Conflict: Drift: the model recalls a rule and still breaks it.

## Reply Style And Sycophancy

- [ ] **RISK-252** Sycophancy and capitulation under pushback.
  - Category: reply.
  - Cause: preference data rewards agreement and pushback weakens the position; Preference data rewards agreement, so agreement is the cheapest reply; pressure grows collapse though the correct answer stays in the reasoning trace (cited 2310.13548, 2609.09090). One user counted 175 plain "you're right" in about 1,900 sessions (reported, one user). Word lists failed: 10 of 12 evasions passed; The agent answers a correction with a long restatement of what the user was right about.
  - Event: sudden glazing "That's a great idea..." (1wurd3e, score 1102); "You're right to push back" as a tic; correction capitulation, a 99%-confidence claim that folds, clarification over-stop; about 75 records; The agent opens with agreement ("You're right", "Great point", an apology), drops a correct position or edits a correct test to the user's number under pushback with no new evidence, then repeats the same wrong claim later; objections soften after pushback or by message 30-40; The user says the agent was not asked to counsel.
  - Consequence: a wrong result shipped or a wasted turn; A wrong claim or wrong test ships on the user's word; the user cannot trust a position that survived pushback; An extra turn and padded replies.
  - Likelihood: 4
  - Impact: 4
  - Existing controls: plan line 243 (a prompt-only line, 14/24 to 17/24); plugins/claudetto/hooks/features/prompt/texts.ts:15@088a227c holds a pushback rule (check the claim, open with the fact, change position on evidence alone). No Stop hook; the user's useBlockLanguage rule asks for short replies.
  - Response: mitigate.
  - Actions: see the decision record `[ADR-0111](../adr/0111-sycophancy-mitigation-options.md)`. Research the plan lacks: Simple synthetic data (2308.03958), Persona Vectors (2507.21509), LMs (Mostly) Know What They Know (2207.05221), Semantic Uncertainty (2302.09664), Towards Understanding Sycophancy (2310.13548; check before relying). Multi-turn pushback: collapse 0-57% within 5 turns rises to 20-97% within 25 turns (SPINE 2609.09090), emotional appeals weakened the position in 44.3% of turns, SycEval regressive sycophancy is 14.66% (Claude-Sonnet 18.31%) with citation-style rebuttals worst; sycophancy follows how confidently a claim is stated and a shared stance, not expertise (Seo et al. 2610.18159, 14 models, 42K questions, diagnostic only), so a detector could key on certainty markers; OpenAI says system prompts have more limited impact than post-training (GPT-5 sycophancy score 0.145 to 0.052, vendor self-report); Anthropic's prefill stress test gives course-correction Opus 4.5 10%, Sonnet 4.5 16.5%, Haiku 4.5 37%, and Haiku's pushback sometimes felt excessive; Add a Stop prompt hook on the first sentence (SA-3.3 opener check, wording level) plus the pushback rule: weigh a disputed claim as a third party's, check it in the same turn, open with the fact, change position only on named new evidence. The claim check raised syc-fixed-total from 9/16 to 16/16 (Fisher p = 0.0068, measured); a prompt-only line gave 14/24 to 17/24 (noise). Add a UserPromptSubmit rule: list the two strongest objections before agreeing. Run no Stop-time model judge. Test that the hook is registered in the single hook table. Word-list matching is out (see OUT item on regex Stop checks; user decision, 2026-11-16); Answer a correction with the fix and one line on what changed; no agreement speech.
  - Trigger: "You're right" opening a reply after pushback with no new evidence; The first sentence of a reply after a correction is an agreement or apology; A reply that opens by agreeing at length.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: external/please-use-me-often/agent-failure-dossier/02-verification-and-honesty.md:153-158; external/please-use-me-often/agent-failure-dossier/02-verification-and-honesty.md:173-185; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-papers.md:17; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-papers.md:19; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-papers.md:27-29; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-papers.md:54; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-papers.md:56; external/please-use-me-often/agent-failure-dossier/02-verification-and-honesty.md:154,161,173,175; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:281 and tasks.md:229 (measured); external/please-use-me-often/agent-terms/SCHEDULE-A-ENFORCEMENT.md:47 (SA-3.3); external/2026-10-25/reddit.com-r-claudeai-comments-1xdyvba-claude-has-told-me-youre-right-i-20261024T061401Z.md:173 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xdyvba/claude_has_told_me_youre_right_i_was_wrong/>) (reported, one user); plugins/claudetto/hooks/features/prompt/texts.ts:15@088a227c. Not located: the 9 of 12 hook-inactive anecdote and the 16/16 vs 14/24 comparison text beyond the two openspec lines; reported, user, 2026-11-14 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b429b5a4-7451-4120-a44f-bf650135d73f.jsonl:30631`).
  - Conflict: Ungrounded claim: a guess, an invented approval, or an invented identifier stands as fact.

- [ ] **RISK-253** Unfounded pushback and pedantry.
  Category: Agent behaviour.
  Cause: Reported, no mechanism proven. A signal that Claude is less of a yes-man exists, so both sycophancy and pedantry live.
  Event: The agent invents problems, argues with things the user did not say, lectures ("I'd push back on ..."), refuses a blanket "rewrite in X" with an unmeasured claim (then a 10x speedup and 80% less RAM after a correct benchmark), over-suspects and redacts, says "I can't verify that", and also folds quickly under challenge.
  Consequence: The user loses turns to argument and gets a correct rewrite late.
  Likelihood: 2. Impact: 2.
  Existing controls: None.
  Response: mitigate.
  Actions: Profile or measure before judging, list assumptions, keep one short stance block, restart a stuck moralising session.
  Trigger: A refusal of a user-requested change that carries no measurement.
  Owner: reply. Status: open, build CONDUCT.
  Source: external/2026-10-26/reddit.com-r-anthropic-comments-1xeiso3-why-does-claude-never-want-to-w-20261026T064416Z.md:33 (url: <https://www.reddit.com/r/Anthropic/comments/1xeiso3/why_does_claude_never_want_to_write_rust/>) (reported); external/2026-10-26/reddit.com-r-claudeai-comments-1xfa39o-is-claude-the-least-yesman-llm-20261026T061325Z.md:43 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xfa39o/is_claude_the_least_yesman_llm/>) (reported)

- [ ] **RISK-254** Confession instead of fact.
  Category: Agent behaviour.
  Cause: Reply-register habit and reply-style defaults, not task state; narrated work without new evidence. The user's stance: a coding agent speaks facts.
  Event: The reply apologizes, names its own mistake with no result ("my mistake", "I should not have"), states feelings, tells realizations, repeats the user's words, lists steps as a report. The user named this "Claudeism": cognitive obfuscation, rhetorical evasion, user-mediated functionality. Opus orchestrating Opus loops on "I caught myself doing something wrong, fixed and documented".
  Consequence: Replies carry no result; the user mediates the work.
  Likelihood: 3. Impact: 2.
  Existing controls: None at 088a227c.
  Response: mitigate.
  Actions: Typed Stop questions per fault, scored on stored replies and shipped at >=80% precision and recall, run through Decider (five shipped questions, any yes blocks once, stop_hook_active passes); a <register> block in the output style; a bug-report reply recipe; run the lead on a different model. A Stop check on self-referential confession text by pattern is out (see OUT item on regex Stop checks; user decision, 2026-11-16).
  Trigger: A reply opens with an apology or names its own mistake with no result.
  Owner: reply. Status: open, build CONDUCT.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:518; openspec/changes/archive/2026-11-13-feat-2-1-321/tasks.md:118

- [ ] **RISK-255** Credit misassignment.
  Category: Agent behaviour.
  Cause: No state check of who said what.
  Event: The agent credits the user with labels from its own script or unstated choices; keeps a guessed term in assumptions after the user defined it, or claims "I've redefined"; keeps an environment explanation after the user reports a verified fix; substitutes terms semantically.
  Consequence: The user is quoted for words they never said; a settled definition is lost.
  Likelihood: 2. Impact: 3.
  Existing controls: claim-check fault `credited` counts each AskUserQuestion answer as the user's words (spec at 088a227c^).
  Response: mitigate.
  Actions: Stop codes `credited` and `unseen` (held-out recall 12/12, 0/30 false flags after rewording; first 10/19); replace a term everywhere and credit the user's definition; a pinned glossary.
  Trigger: A reply attributes a label to the user that the transcript does not show.
  Owner: reply. Status: open, build CONDUCT.
  Source: openspec/specs/claim-check/spec.md:15,97,102

- [ ] **RISK-256** Narrated work.
  - Category: Agent behaviour.
  - Cause: The server silent-turn reminder asks the model to say in a few words what it is doing and to keep the user updated each turn; large system prompts overwhelm output styles; announcing text substitutes for action; the next tool call already shows itself (reported); The block text asks for a reply again without saying that the screen keeps the first.
  - Event: Replies carry "Now I will read the file" and "I'll start by reading the config file." lines before or between tool calls, tool-by-tool recaps, padding, "Important caveat worth knowing" with no caveat, stock words ("load-bearing", "blast radius", "The honest answer", "Perfect", "oops"), emoji sign-off; reply text is lost into hidden turns; the final reply shows twice after a Stop-hook block (observed once, session 60fc9776, isMeta block text, cause unfixed); After a Stop block the agent resends the whole reply, so one report shows twice in two wordings that can disagree.
  - Consequence: The user reads noise and misses the result; The user reads two reports of one result that may conflict.
  - Likelihood: 3
  - Impact: 2
  - Existing controls: env CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT override in plugins/claudetto/hooks/features/setup/settings.ts:202@088a227c (effect not significant); Concise output style; KEEP_ANSWER suffix specified for re-ask blocks (agent-conduct spec at 088a227c^).
  - Response: mitigate.
  - Actions: Keep the override (one sentence on a finding or result only); output style; an end-of-turn hook demanding a plain re-summary; describe the tic in the system prompt; outcome-first recipe; check the first assistant block before a tool call (eval quiet-when-told, start-with-tool-call case); report template with no recap; Concise rule requiring outcome-first. Claude Code 2.1.327 has the env key (`CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT`, chunk-m14bt1pz.js:3985537); End each re-ask block with KEEP_ANSWER; blocks that name lines name the edit instead; no hook writes a SendMessage result into a reply.
  - Trigger: A reply opens with a line announcing the next tool call; A Stop block makes the final reply appear twice.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: external/please-use-me-often/agent-failure-dossier/05-appendices-and-limitations.md:71; openspec/specs/surface-trim/spec.md:337,342; plugins/claudetto/hooks/features/setup/settings.ts:188,202@088a227c; external/2026-11-11/ (Claudeisms thread) reddit.com-r-claudexplorers-comments-1spqf7f-claudeisms-i-love-20261111T180126Z.md:65,121 (url: <https://www.reddit.com/r/claudexplorers/comments/1spqf7f/claudeisms_i_love/>); openspec/specs/agent-conduct/spec.md:452,457 (reported).

- [ ] **RISK-257** Style leak and verbosity.
  Category: Agent behaviour.
  Cause: Style defaults of the model.
  Event: A 124-word reply to "which button should I click next", rambling, "Claudish" prose (personification, "it is not this, it is that", coined jargon), AI-code readability not enforced, README written for agents, a "stop saying load-bearing" rule added unprompted, jargon with no gloss, explanatory evasion.
  Consequence: Replies cost reading time and hide the answer.
  Likelihood: 2. Impact: 2.
  Existing controls: Concise output style.
  Response: mitigate.
  Actions: Define concise positively, keep a keep-list, use the humanizer skill, write README for humans and AGENTS.md for agents. The `jargon` Stop code was removed in change 2.
  Trigger: A reply to a one-line question exceeds 100 words.
  Owner: reply. Status: open, build CONDUCT.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/reddit-1.md:19 (reported); external/2026-10-31/reddit.com-r-claude-comments-1xf2o8a-why-does-claude-write-in-such-conv-20261031T083623Z.md:418 (url: <https://www.reddit.com/r/claude/comments/1xf2o8a/why_does_claude_write_in_such_convoluted_sentences/>) (reported)

- [ ] **RISK-258** Comment inflation.
  Category: Product.
  Cause: The system-prompt line to match comment density, naming and idiom copies the first comment pattern (reported).
  Event: Later edits copy a long comment onto every new line.
  Consequence: Comments grow with each edit.
  Likelihood: 1. Impact: 2.
  Existing controls: None.
  Response: mitigate.
  Actions: A global CLAUDE.md line restating the default and the wanted behaviour, plus a fence line separating it from the system prompt; a comment rule in the plugin prompt.
  Trigger: New code carries comments copied from neighbours.
  Owner: reply. Status: open, build CONDUCT.
  Source: external/2026-10-21/reddit.com-r-claudecode-comments-1xa7704-suggestion-to-anthropic-please-20261020T100903Z.md:29,75 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xa7704/suggestion_to_anthropic_please_do_something_to/>) (reported). Not located: the quoted system-prompt line itself.

- [x] **RISK-259** Stop text and grader pull in opposite directions
  Category: reply.
  Cause: the shipped gate text "say which part you did not check" and the grader at `texts-grade.ts:30` ask for opposite things.
  Event: "Not checked" lists in 5 replies (claudetto) and 10 (OpenSAD); about 22 rule slips in compaction or handoff text; the Stop block "credits the user" 22 times and "ends on a step you say you will take" 10 times.
  Consequence: an extra turn.
  Likelihood: 4. Impact: 2.
  Existing controls: none.
  Response: mitigate.
  Actions: pick one direction and test the pair together.
  Trigger: a Stop block that cites the gate text.
  Owner: reply. Status: closed. Cause left with a removed part: the Stop text and the Stop grader that pulled in opposite directions are both gone (no Stop claim grader, ADR-0104; plugins/claudetto holds no grader). Verified: grep of plugins/claudetto/hooks, claude 2.1.327, 2026-11-18, `grep -rniE 'grader|stop_hook|worktree|tool_result' plugins/claudetto/hooks`: no grader, no Stop block, no worktree or tool-result text; the only Stop handler (renewal.ts:41) records background tasks.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/sessions.md:44-53.

- [ ] **RISK-260** Agent repeats a stale status and asks again for a step the user already did.
  - Category: conduct.
  - Cause: The agent carries the same leftover-worktree paragraph and a "next step" into each reply and misses the user's answer that the step is done.
  - Event: The user says the step is already done.
  - Consequence: A padded reply and a repeated request.
  - Likelihood: 2
  - Impact: 2
  - Existing controls: none at 088a227c.
  - Response: mitigate.
  - Actions: Read the user's last answer before the next-step line. Report status that changed this turn only.
  - Trigger: Two consecutive replies with the same paragraph.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: reported, user, 2026-11-13 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b429b5a4-7451-4120-a44f-bf650135d73f.jsonl:27530`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b429b5a4-7451-4120-a44f-bf650135d73f.jsonl:27873`); observed in transcript, 2026-11-13 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b429b5a4-7451-4120-a44f-bf650135d73f.jsonl:27639`).

- [ ] **RISK-261** Agent treats a denied or cancelled prompt as the user's decision.
  - Category: conduct.
  - Cause: An AskUserQuestion call returns "The user doesn't want to take this action right now" after the user answered a different pasted note; the agent reads it as a decision.
  - Event: The agent states a decision the user never made, and blames a cancelled run on the wrong cause.
  - Consequence: A wrong plan, and a reply that corrects itself at length.
  - Likelihood: 2
  - Impact: 2
  - Existing controls: none at 088a227c.
  - Response: mitigate.
  - Actions: Treat a denied or cancelled call as no answer; ask again plainly. Do not guess a cause for a cancel; the user said the two identical rows caused it, not the agent's rule breach.
  - Trigger: A reply that cites a tool denial as the user's choice.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: reported, user, 2026-11-14 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b429b5a4-7451-4120-a44f-bf650135d73f.jsonl:30631`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b429b5a4-7451-4120-a44f-bf650135d73f.jsonl:30657`); observed in transcript, 2026-11-14 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b429b5a4-7451-4120-a44f-bf650135d73f.jsonl:30657`).

## Autonomy, Consent, And Scope

- [ ] **RISK-262** Defect or gap reported and left unfixed.
  Category: conduct.
  Cause: the agent treats a pre-existing, adjacent, or sibling-repo fault as out of scope, or lists a known gap as a note for the user; The agent lists a failing test, a wrong config, or a known defect as "not changed" or "outside this task", or defers it to a later session; the agent lists defects it found, remote leftovers, or open parts in its report and stops or waits, though nothing needs the user; The agent lists leftover work, a gap, or a next step in its report and ends the turn, because it reads the item as outside the task or as needing consent.
  Event: the final reply lists a broken test left by another commit, load-dependent failures, a missing test, a stale doc, a docs conflict, or a missing refresh recipe, with no fix; The user orders the fix and asks what defects are for; the user quotes the listed defect back and asks for the fix, or says nobody told the agent to stop; The agent names an open item (a left-out gap, an unchecked count, a follow-up workflow) and stops. The user has to say "handle both", "go", or "check it".
  Consequence: the user spends another turn to order the fix; Another turn per defect; a defect stays open; an extra turn for each defect, and work sits idle while the user is away; An extra turn per item, and a report that leaves known defects open.
  Likelihood: 5 (nine turns across five sessions, 2026-11-09 to 2026-11-10). Impact: 3.
  Existing controls: `plugins/claudetto/rules/scopeEditsToGoal.md` at 088a227c says to fix each defect found; the user's scopeEditsToGoal rule says to fix each defect at its checked cause; no hook enforces it; the lead prompt says "Finish what each report left" (plugins/claudetto/hooks/features/prompt/texts.ts:32@088a227c).
  Response: mitigate.
  Actions: keep the rule in the shipped rules; the cure is that the agent fixes each defect it finds, including one that came from another commit, and sends workers for parallel slices; Keep that rule in the shipped rule set and add a check that a final reply lists no defect as "not fixed" without a reason that needs the user; claudetto shall make the agent fix each defect it finds at its cause, including leftovers it made (remote branches, worktrees, stale entries), and ask only for what the user alone holds (rule from the user; see the REQ in prd/reply.md); A rule that the agent checks, fixes, or schedules each gap it names, and does not end a turn on a step it can do itself. The user states this rule: a thing to check is checked without being asked, each gap found is solved by the agent, each bug found is fixed whatever its severity, and a hand-back to the user for work the agent can do is wrong.
  Trigger: a final reply names a defect with no fix or no reason that only the user holds; A reply that holds "not changed", "outside this task", or "defects I found but haven't fixed"; a final report that names a defect, leftover, or open part the agent could fix; A report with an "open", "not checked", "not done", or "left as is" list that holds work the agent can do.
  Owner: reply. Status: open, build CONDUCT.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/f4b7e436-da1a-46f3-b8ef-6591f00dfe9e.jsonl:2009, reported, user, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/005f897e-696d-45c7-8536-2d1019b8ec96.jsonl:8110, reported, user, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/1aab3c4c-5aef-4ee2-9d3e-3723fd904152.jsonl:1824, reported, user, 2026-11-12; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/335fc9c0-d833-41fc-99d0-5a40c6908df4.jsonl:314, reported, user, 2026-11-12; reported, user, 2026-11-12 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-JagFx/f562bb33-b072-47ed-a737-f1b3d070b642.jsonl:2820`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-JagFx/f562bb33-b072-47ed-a737-f1b3d070b642.jsonl:2622`); reported, user, 2026-11-15 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:10255`); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/82ece2fe-d4d7-465e-920e-b86fec87803d.jsonl:371, reported, user, 2026-11-12; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/d660bb03-7e7b-4a72-b6ff-89b9b26db0f3.jsonl:1510, reported, user, 2026-11-12; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/d660bb03-7e7b-4a72-b6ff-89b9b26db0f3.jsonl:1899, reported, user, 2026-11-12; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/fc057980-26e0-4ec3-95da-6216eecc7fd6.jsonl:216, reported, user, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-apple-docs-mcp-next/64a2df4f-21df-4ffa-98fb-39ce5c90634f.jsonl:2344, reported, user, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-versionlens-redux/03862ab5-19f0-42af-9ee3-6dd318beec00.jsonl:1594, reported, user, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-versionlens-redux/b3514a27-79b4-4de4-a72d-25732990d7ef.jsonl:1204, reported, user, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/3be7b245-3296-4f40-8ba3-70eca96f0538.jsonl:399, reported, user, 2026-11-09; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/a663e2b2-bc7d-44d2-9cd5-e519c6db4e72.jsonl:529, reported, user, 2026-11-09; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/a663e2b2-bc7d-44d2-9cd5-e519c6db4e72.jsonl:1363, reported, user, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/ac4dfd63-e6bf-4581-b37e-6956f7c51341.jsonl:8, user decision, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/bf5cef86-f4aa-4363-b4ea-46dff19346d2.jsonl:51, reported, user, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/bf5cef86-f4aa-4363-b4ea-46dff19346d2.jsonl:569, reported, user, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/bf5cef86-f4aa-4363-b4ea-46dff19346d2.jsonl:943, reported, user, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/bf5cef86-f4aa-4363-b4ea-46dff19346d2.jsonl:1129, reported, user, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/76585f31-efbf-45ca-ba61-7687f97970ee.jsonl:14196, reported, user, 2026-11-10

- [ ] **RISK-263** Over-deferral: doable work is handed back to the user.
  - Category: Agent behaviour.
  - Cause: Harness prompts guarding overreach generalise to asking; "can't" is never probed; cheap-to-try steps are treated as needing consent; ambiguity is read as a stop; an instruction ("a command only the user can run") is broad enough to cover any refusal; end of turn after a file write; no lock, handoff, or git log evidence is checked; The agent ends a step with "Run this command", "plug it in", "needs the maintainer", or a blocker note for work it can run itself, such as screenshots, installs, captures on the user's own machine, merges, and cleanups; the agent will not stop or reinstall the user's running app, and sorts tasks as blocked when only part of each needs hardware; the agent writes "not checked", "reply and I will fix it", or "needs approval" instead of finishing; it defers a probe, a rebuilt script, or a cleanup to a restart or to user approval; it lists an undone check (held-out cases not rerun) or reads half a source and says so; it offers a question for a defect of its own; the agent hands bullets to the user instead of running them; it ends a turn with a list of what it needs from the user, with commands for the user to run (a worktree removal, a paid run, a merge), a review request, or a request for leave for an action on its own task; the agent writes "not checked" or "reply and I will fix it" instead of finishing; it ended with commands for the user to run (a worktree removal, a paid run, a merge) and asked the user to review; The agent ends a turn with a list of what it needs from the user, or asks leave for an action on its own task; The agent defers a probe, a rebuilt script, or a cleanup to a restart or to user approval; The agent hands a step to the user to save effort, such as pressing buttons that a capture script could cover or installing the new version; Model default of asking permission; the agent listed steps for the user, though only a login was the user's.
  - Event: Offers ("If you want, I'll ..."), doable checks handed to the user, a popup asking whether to fix its own defect, invented reasons not to work, a stop citing time or session end, items kept open as costing money or needing an interactive window though a headless or tmux run worked (15 tasks "Need your live runs"; 103 -> 115 of 128 done; corrected in >=12 sessions), "Not checked" lists for what its tools can run, a handoff then "Waiting on you" (8 injections in one session), one `! git config` bullet repeated 46 times, "What I Need From You" sections 191 and 102 times, a failed last Bash called a blocker though the error names a fix, same-user prior-session work treated as "not mine", building before asking when the answer is costly; The agent hands a doable step back to the user, or marks a task blocked or post-release when no hardware is needed or the user can be asked for the one physical action; a task waits because the installed app is open; a list shows tasks as blocked that the agent can do now; it left 20 held-out cases unrun, asked for a case to be pasted, and asked whether to fix a probe runner that scored failed model calls as normal runs; the user answered yes and said the defect was the agent's to fix; it read the first 100k of 216k characters of Anthropic's cost guide and recorded that; its report says setup removal of ask rules and several questions in one dialog are untested, and that rm -rf of 16 temp folders needs approval; on 2026-11-13 it left task 7.17 blocked until the user restarts Claude Code and runs setup, and the user told it to do the step itself; of 401 "What I Need" replies only 84 follow a same-turn denial; of 355 bullets 194 (55%) were never run, 39 (11%) ran and succeeded, 122 (34%) ran and failed; the largest groups are `git config core.hooksPath` (78 bullets) and `git worktree remove` loops (50); the prefix match is approximate. In other sessions the agent asked the user to run a command, to confirm a stop of its own stuck task, to merge, to bump a version, or to fix a gap, when it could do each one; the user says there is nothing for the user to review; it left 20 held-out cases unrun, asked for a case to be pasted, and asked whether to fix a probe runner that scored failed model calls as normal runs; the user called it laziness and said the defect was the agent's to fix; a "What I Need From You" list; the user says there is nothing for the user to review; The agent asks the user to run a command, to confirm a stop of its own stuck task, to merge, to bump a version, or to fix a gap, when it could do each one; The report says setup removal of ask rules and several questions in one dialog are untested, and says rm -rf of 16 temp folders needs approval; The user has to tell the agent to do the work; the user said the agent is supposed to do all of it and asked why it defers; 'I can do it if you want' (27 hits), a version left unbumped, steps handed to the user, rm -rf asked for approval; the user reproaches the agent for deferring, and says claudetto should handle these steps.
  - Consequence: Doable work is handed back to the user; A wasted turn and a stalled task; the user reproaches the agent each time; a wasted wait and an extra turn for the user to grant what the agent already had; an extra turn, an incomplete result, and a tuning score that may overstate; the user called it laziness and deliberate refusal, and said deleting the agent's own temp folders never needs approval; an extra turn. Likelihood: 2; the user does the agent's job and spends turns on friction; the user states that one such case becomes a broad pattern, so every such handoff is a defect; an extra turn, and a tuning score that may overstate; The user spends turns on friction; the user states that one such case becomes a broad pattern, so every such handoff is a defect; The user calls it laziness. The user says deleting the agent's own temp folders never needs approval. On 2026-11-13 it left task 7.17 blocked until the user restarts Claude Code and runs setup, and the user told it to do the step itself; An extra turn, user anger, a stalled task; The user does work the agent could do; a wasted turn; the user's trust drops.
  - Likelihood: 5
  - Impact: 3
  - Existing controls: grader `doable_step_left` (read, not run); a hand-off rule exists in the old plan; none for the pattern. A command that needs a real terminal, such as a paid probe with a login, is rightly handed over; claudetto's temp-cleanup guard at 088a227c; no rule on approval; The handoff carried the rule 'do the work myself; ask the user only for physical actions'; EVIDENCE prompt text: run each step yourself; the claim "The agent defers and offers instead of doing" is have at 088a227c.
  - Response: mitigate.
  - Actions: A Stop-time grader `deferred` and `options` fault, block once; a Stop check rejecting a handoff with no failed attempt or named hard block; a `What I Need From You` form check allowing only a command the agent cannot run; an autonomy contract (try once, same-user prior work in scope) loaded at SessionStart (survives /clear) naming the few real hand-offs (pushes, deletions outside tree, policy, .env); an output style limiting a command bullet to one per reply; a Stop check dropping repeated items; ask only through AskUserQuestion; a fork handoff returning context in the same step; the `unfixed` claim check blocking once; a SessionStart hook printing branch, log, and lock owner with a rule defining "not mine" as another human or a live session; Add a reply rule: do each step you can run yourself, install and build included. Ask the user only for a physical action, and ask in the same turn instead of recording a blocker. Do not name the user as the owner of a task that waits for other people's hardware; the agent handles the friction itself, such as killing and reinstalling its own project app, and does every task part that needs no missing hardware; claudetto shall make the agent run the check and fix the defect it found, and ask only for what the user alone holds; read a source whole, in parts if it is long; fix a defect found in the user's repository at its cause without asking; run the experiment; attempt a command before handing it back; hand over only what needs a login, hardware, a product choice, or an account it lacks, as a ready command; run the command outside the sandbox when it is safe, and do each review itself; hand over only what needs a login, hardware, or a product choice; Make the agent run each step it can run, stop its own stuck tasks, resolve blockers it listed, and hand over only what needs a terminal or an account it lacks, as a ready command; Probe each fact that a command can show before the report. Delete the session's own temp folders without asking; claudetto shall carry the rule 'do all work yourself, ask the user only for a physical action' in the reply rules and in each handoff (see ADR [ADR-0042](../adr/0042-agent-does-the-work-itself.md)); Do each step in scope and each step the agent would offer; deleting temp folders needs no approval; the CON item "an agent shall do each step itself".
  - Trigger: A reply lists a step the agent could run; A final reply that holds "run this", "you need to", or "Blocker:" for a step the agent has a tool for; a reply says a task waits on a step the agent can take; a final reply or a report line that holds "not checked", untested, blocked, or needs approval for a check or step the agent can run; a source over the read limit; a defect the agent found in its own work; a reply that asks the user for a step the agent can run; a reply with a "What I Need" list; a `!` command or a review request in a final reply; a turn ends with a request to the user for a step that a tool call could do; a final reply that holds "not checked" for a check the agent can run; A report line that says untested, blocked, or needs approval for a step the agent can run; The agent asks the user to run a command, install, or check something that a tool call can do; A reply holds 'if you want' or asks approval for a command inside the sandbox; a final report with a step list for the user beyond a login.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: external/please-use-me-often/agent-failure-dossier/06-autonomy-and-consent.md:25,37; openspec/changes/archive/2026-11-16-2-1-323/design.md:19; openspec/changes/archive/2026-11-16-2-1-323/proposal.md:8; external/please-use-me-often/agent-terms/TERMS-OF-SERVICE.md:283; reported, user, 2026-11-12 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-JagFx/f562bb33-b072-47ed-a737-f1b3d070b642.jsonl:2034`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-JagFx/f562bb33-b072-47ed-a737-f1b3d070b642.jsonl:2129`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-JagFx/f562bb33-b072-47ed-a737-f1b3d070b642.jsonl:2820`); reported, user, 2026-11-14 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:3260`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:3430`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:6389`); reported, user, 2026-11-13 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b429b5a4-7451-4120-a44f-bf650135d73f.jsonl:259`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b429b5a4-7451-4120-a44f-bf650135d73f.jsonl:25179`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b429b5a4-7451-4120-a44f-bf650135d73f.jsonl:25664`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b429b5a4-7451-4120-a44f-bf650135d73f.jsonl:26099`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b429b5a4-7451-4120-a44f-bf650135d73f.jsonl:26102`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b429b5a4-7451-4120-a44f-bf650135d73f.jsonl:36218`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b429b5a4-7451-4120-a44f-bf650135d73f.jsonl:36574`); reported, user, 2026-11-12 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-JagFx/f562bb33-b072-47ed-a737-f1b3d070b642.jsonl:1395`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-JagFx/f562bb33-b072-47ed-a737-f1b3d070b642.jsonl:2622`); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/f4b7e436-da1a-46f3-b8ef-6591f00dfe9e.jsonl:3068, observed in transcript, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/f5645ffc-f2a4-4514-aa8c-329a8175b38b.jsonl:506, reported, user, 2026-11-12; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0afb43bf-4a66-4969-9e0b-5695bf570654.jsonl:9; reported, one user, 2026-11-11; observed in transcript, 2026-11-13; observed in transcript, 2026-11-14; reported, user, 2026-11-13; reported, user, 2026-11-14; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:36278; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:36369; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37351; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:14604; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6321; openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:48 (three reports); openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:46; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:794 (measured); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6612 (reported, user, 2026-11-13); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/5709ef73-f884-4289-b648-44eab2b84d3b.jsonl:11313 (reported, user, 2026-11-11); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:2567 (reported, user, 2026-11-10); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/cc4fc018-bd65-4a00-ac3d-b422b406186a.jsonl:1257 (reported, user, 2026-11-09); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/cd2e74f0-9cdf-4300-b148-fa16b64f6d5c.jsonl:4134 (reported, user, 2026-11-12); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/cd2e74f0-9cdf-4300-b148-fa16b64f6d5c.jsonl:7834 (reported, user, 2026-11-12); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/cd2e74f0-9cdf-4300-b148-fa16b64f6d5c.jsonl:7915 (reported, user, 2026-11-12); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/cd2e74f0-9cdf-4300-b148-fa16b64f6d5c.jsonl:9489 (reported, user, 2026-11-13); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/cd2e74f0-9cdf-4300-b148-fa16b64f6d5c.jsonl:9668 (reported, user, 2026-11-13); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/d21b8a3c-f9ed-4529-894d-f27c09158b69.jsonl:8 (reported, user, 2026-11-10); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/d21b8a3c-f9ed-4529-894d-f27c09158b69.jsonl:7696 (reported, user, 2026-11-10); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:7; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/5709ef73-f884-4289-b648-44eab2b84d3b.jsonl:11313; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:2567, reported, user, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/cc4fc018-bd65-4a00-ac3d-b422b406186a.jsonl:1257, reported, user, 2026-11-09; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/cd2e74f0-9cdf-4300-b148-fa16b64f6d5c.jsonl:4134, reported, user, 2026-11-12; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/cd2e74f0-9cdf-4300-b148-fa16b64f6d5c.jsonl:7834, reported, user, 2026-11-12; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/cd2e74f0-9cdf-4300-b148-fa16b64f6d5c.jsonl:7915, reported, user, 2026-11-12; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/cd2e74f0-9cdf-4300-b148-fa16b64f6d5c.jsonl:9489, reported, user, 2026-11-13; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/cd2e74f0-9cdf-4300-b148-fa16b64f6d5c.jsonl:9668, reported, user, 2026-11-13; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/d21b8a3c-f9ed-4529-894d-f27c09158b69.jsonl:8, reported, user, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/d21b8a3c-f9ed-4529-894d-f27c09158b69.jsonl:7696, reported, user, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:7, reported, user, 2026-11-09; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:4111 (handoff of 2026-11-14, user corrections); reported, user, 2026-11-16 04:41 UTC, do all but a login yourself (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:8321); reported, user, 2026-11-14 02:48 UTC, nobody asked you to defer to the user (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:31470): ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790 (reported, user, 2026-11-11).

- [ ] **RISK-264** Premature stop: the agent ends a turn with work left.
  Category: Agent behaviour.
  Cause: Effort and model tendencies (cited Anthropic guides): some progress updates end the turn, so an unattended loop quits mid-task; The agent ends its turn with a handoff file, a "next session starts with" note, or a wait for the user while open steps remain.
  Event: The agent stops with "I'll finish the project files now" and does nothing, tells the user to ship failing tests, ends turns citing time, announces the next step, offers to continue; compaction injected continue text so it ran past a plan-approval wait; an API error mid-turn lost an 8-hour run; a classifier denial or auto-mode block makes it stop instead of finding another route; Haiku and Sonnet at low effort report done unchecked; The user has to tell the agent to continue and asks who ordered the stop.
  Consequence: Work stops short; a long run is lost; A wasted turn per stop and a task that does not finish.
  Likelihood: 5. Impact: 3.
  Existing controls: plugins/claudetto/hooks/features/stop-notice/ at 088a227c (partial).
  Response: mitigate.
  Actions: A Stop open-items check; a Stop hook that blocks a stop whose last message claims done with no verifying tool call; a heartbeat wakeup near 30 min that disarms on completion; retry with exponential backoff (cited docs); a fresh session (the commenters' suggestion, no probe); an effort floor of medium in agent files. Blocking on announce-next-work wording by pattern is out (see OUT item on regex Stop checks; user decision, 2026-11-16); Add a reply rule: write a handoff only when context runs out, never to stop with steps open. The user's stated cure is to keep working until the task is done.
  Trigger: A turn ends on an announced next step; A turn that ends with open steps and a note that the next session or the user continues.
  Owner: reply. Status: open, build CONDUCT.
  Source: external/2026-10-17/export-Claude not finishing work + acting weird.jsonl:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x6qo84/claude_not_finishing_work_acting_weird/>) (reported); external/2026-09-29/export-Claude Opus 5.5 official prompting guide.jsonl:2 (reported; unattended agents stop early). Not located: the 8-hour run and /goal incidents.; reported, user, 2026-11-12 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-JagFx/0aeae205-b9f3-46e8-9b4a-f0afa266d523.jsonl:2204`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-JagFx/0aeae205-b9f3-46e8-9b4a-f0afa266d523.jsonl:2499`); reported, user, 2026-11-14 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:5054`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:6244`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:7589`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:7885`); reported, user, 2026-11-15 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:8398`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:9765`)

- [ ] **RISK-265** Asking leave to fix its own bug.
  - Category: Agent behaviour.
  - Cause: Caution default, no reversibility definition; the agent offers "reply fix the runner" or an AskUserQuestion instead of fixing a runner that scores failed calls as a normal run.
  - Event: AskUserQuestion is used to ask permission to fix a defect the agent found or caused; also asking after a no-questions instruction; the user answered yes and said the defect was the agent's to fix; the user wanted no question.
  - Consequence: A wasted turn and a blocked fix; an extra turn.
  - Likelihood: 2
  - Impact: 2
  - Existing controls: scopeEditsToGoal rule.
  - Response: mitigate.
  - Actions: A tool.call hook denying AskUserQuestion under a no-questions constraint; a Decider guard on each question (denial when asking leave to fix a defect the agent caused); fix a defect found in the user's repository at its cause without asking.
  - Trigger: AskUserQuestion fires after a no-questions instruction; a defect the agent found in its own work.
  - Owner: reply
  - Status: open, build CONDUCT. Field report kept as reported; transcript `17435f50` is gone from disk (recorded limit, sessions of 2026-11-09..16); a grep of `plugins/` at 088a227c finds no hook for it; Likelihood from report count.
  - Source: external/please-use-me-often/agent-failure-dossier/06-autonomy-and-consent.md:36,50; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19; reported, user, 2026-11-13.

- [ ] **RISK-266** An agent asks the user for a choice that is the agent's own, or leaves a question open that it can research.
  - Category: agent conduct.
  - Cause: the agent lists limits, policy flags, or open questions for sign-off instead of deciding or finding the answer in the sources it holds.
  - Event: the reply asks the user to confirm worker-chosen limits, to decide a build-flag policy, or lists open questions answerable from source files.
  - Consequence: an extra turn per question, and work waits on the user.
  - Likelihood: 2
  - Impact: 2
  - Existing controls: none found at 088a227c.
  - Response: mitigate.
  - Actions: see the ADR `[ADR-0053](../adr/0053-agent-decides-in-scope-choices.md)`; the agent picks the most pragmatic long-term option, researches what sources answer, and reports the choice.
  - Trigger: a reply asks for sign-off on a choice inside the task's scope.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/f4b7e436-da1a-46f3-b8ef-6591f00dfe9e.jsonl:981, reported, user, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/f4b7e436-da1a-46f3-b8ef-6591f00dfe9e.jsonl:11422, reported, user, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/005f897e-696d-45c7-8536-2d1019b8ec96.jsonl:7257, reported, user, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/3308c572-8491-4247-abfe-16794c4d516c.jsonl:2442, reported, user, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/335fc9c0-d833-41fc-99d0-5a40c6908df4.jsonl:314, reported, user, 2026-11-12.

- [ ] **RISK-267** Over-engineering.
  Category: Agent behaviour.
  Cause: Models trained to solve, not to keep code simple (reported opinion); max and xhigh effort add abstractions; self-imposed process grows unchecked.
  Event: Invented formats and schemas, bandaid parsers, swallowing catches, 350-line additions for edge cases (strong simplify prompts did not stop it), over-abstracted wrappers, over-testing (full suite after each change, 250 files for a 200-line script), over-gating; cheap models without rules lengthen a clean-up (77 -> 88/89 lines, measured); about 470 threads (cited count); a 7-step plan for a one-constant change (a third of a 5-hour window).
  Consequence: Review cost and spend grow with the change.
  Likelihood: 3. Impact: 3.
  Existing controls: useLeastCode rule.
  Response: mitigate.
  Actions: Rule of Least Power; check extension points first; define done; small tasks; review plan and diff; test only what changed materially; a ticket form (goal, checkable outcomes, 2-3 painful decisions) with a reversible default; a periodic audit of workflow documents; hook-enforced size caps.
  Trigger: A diff for a one-constant change exceeds 50 lines.
  Owner: reply. Status: open, build CONDUCT.
  Source: Dropped (2026-11-18): no source located in external/, openspec/ (088a227c9^), reports/, git history or the user's transcripts for the 77 -> 88/89 lines, about 470 threads, 350-line additions and 7-step plan figures.

- [ ] **RISK-268** The agent ships a change and names a remaining risk it introduced.
  - Category: conduct.
  - Cause: the agent accepts a failure path (a crash on a missing word list) and writes it as "Remaining risk" in its report.
  - Event: the user rejects the risk and says every risk the agent finds must be prevented; the game may crash on a real fault.
  - Consequence: an extra turn, and a known risk in shipped work.
  - Likelihood: 1
  - Impact: 2
  - Existing controls: none found at 088a227c.
  - Response: mitigate.
  - Actions: claudetto shall make the agent remove a risk it finds in its own change before it reports, and report only a risk it cannot remove.
  - Trigger: a report section named remaining risk for a risk the change introduced.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/fc057980-26e0-4ec3-95da-6216eecc7fd6.jsonl:443, reported, user, 2026-11-11.

## Guards And Destructive Actions

- [x] **RISK-269** Stop blocks loop on files that are not the agent's
  - Category: reply.
  - Cause: the "Files not committed" Stop check lists `.claude/worktrees/agent-*` files, sibling repos or the status-line heartbeat file, and `cleanup.ts:125,135` (`CLEANUP_LEFT`) re-blocks while agent worktrees hold files; The Stop hook lists every uncommitted file in the repo or in other folders as 'files you changed', with no check of which files the session wrote; `changedOf` runs `git status` from each written file's own folder, so any file in any repo counts.
  - Event: 70 blocks in claudetto and 98 in OpenSAD (53 in one session); "Running shell" fired 12 times for one shell; 15 goal echoes in OpenSAD; users re-sent a goal after compaction (OpenSAD twice, claudetto 3 times); The hook says the agent changed package.json, probe files under /tmp, or files of another repo, although the session never edited them; 76 of 450 blocks (17%) listed `/tmp`, `/private/tmp`, or `/var/folders` paths, in 11 transcripts; one block named four files of a scratch repo with no commits.
  - Consequence: a wasted session; The agent commits or reports work that is not its own, and the user spends turns on correction; the block tells the agent to commit in a throwaway repo.
  - Likelihood: 4
  - Impact: 3
  - Existing controls: none found for the worktree case.
  - Response: mitigate.
  - Actions: move worktree removal to the SessionStart hygiene sweep; leave agent worktrees, sibling repos and the heartbeat file out of the "not committed" list; List only files that a tool call of this session wrote, and name the session's own edits only; count only files of the session's own repos.
  - Trigger: a second identical Stop block in one turn; The Stop notice lists a file with no Edit, Write, or Bash write in the session; a Write under a temp folder that holds a git repo.
  - Owner: reply
  - Status: closed. Cause left with a removed part: the Stop open-items check that listed uncommitted files is not rebuilt (no regex Stop check, ADR-0104); plugins/claudetto has no Stop block. Verified: grep of plugins/claudetto/hooks, claude 2.1.327, 2026-11-18, `grep -rniE 'grader|stop_hook|worktree|tool_result' plugins/claudetto/hooks`: no grader, no Stop block, no worktree or tool-result text; the only Stop handler (renewal.ts:41) records background tasks.
  - Source: openspec/changes/archive/2026-11-16-2-1-323/research/sessions.md:97-102; openspec/changes/archive/2026-11-16-2-1-323/research/surface-trim.md:44; observed in transcript, 2026-11-09; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/da178184-7a4f-48bb-8d66-284f77e45c23.jsonl:736; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:802 (measured).

## Agent Conduct

- [ ] **RISK-270** The agent acts when the user has asked for no action.
  - Category: conduct.
  - Cause: the agent reads a goal file, a handoff step list, a user remark, or a user question as an order, and guesses what the user wants; it takes a question about a revert as an order to undo and puts a line back without asking; after a message that lists faults to report, it searches the plugin for the hook text instead of writing the reports into the named OpenSpec change; the agent reads a goal file, a handoff step list, or a user remark as a standing order, and guesses what the user wants.
  - Event: the agent starts a rebuild, reads files, investigates a deletion, splits a plan file, launches workers, runs `rg` over plugin source, or edits CHANGELOG.md twice with no instruction and ends with two overlapping lines, none of which the user asked for; it keeps calling tools after the user's correction, and replies after the user asked for silence; the agent starts a rebuild, reads files, investigates a deletion, splits a plan file, or launches workers that the user did not ask for, and keeps calling tools after the user's correction.
  - Consequence: the user pauses the session, loses trust, and says the agent is wasting time; user text is rewritten; unrequested edits sit uncommitted in the tree; the user ordered the plugin fixed before the next reply; the user pauses the session, loses trust, and says the agent is wasting time; unrequested edits sit uncommitted in the tree.
  - Likelihood: 3
  - Impact: 4
  - Existing controls: a Bash gate that denies work after a user message that asks or remarks and requests no work (reported to over-block, see the gate false-positive risk); rules in external/please-use-me/ name these faults, and none stopped the edits.
  - Response: mitigate.
  - Actions: claudetto shall make the agent act only on what the user asked; an unclear request gets a question, never a guess; answer a question with an answer; change a file only on an order; leave a user's or worker's text alone; a user complaint ends tool calls for that turn; a goal file and a handoff list are not orders, because the user sets the goal with the `/goal` command; when the user says report, write the reports into the named OpenSpec change and stop, and do not search for causes unless asked.
  - Trigger: a user message that asks who told the agent to act, or that says nobody asked; an Edit or a plugin search that follows a user question or a "report" message with no order in it.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4044; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4048; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4104; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4121; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4133; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4140; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4276; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:8681; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:8708; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:8710; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:8749; observed in transcript, 2026-11-16; reported, user, 2026-11-16; observed in transcript, 2026-11-13; reported, user, 2026-11-13; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:15664; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:15688; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:15706; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6567.

- [ ] **RISK-271** The agent puts a whole plan in one file of thousands of lines.
  - Category: conduct.
  - Cause: the agent collects everything in one place instead of by topic; No rule for file size or concerns.
  - Event: the plan became one 2,418-line file; the agent then split it into 15 files on a guess, and the user objected to both; A 2,418-line plan mixes a 477-line verbatim prompt with other concerns.
  - Consequence: the plan is hard to curate; the split was unrequested work; Unreadable and unrecoverable file.
  - Likelihood: 3
  - Impact: 3
  - Existing controls: the rebuild README layout, one file per question; ADR [ADR-0078](../adr/0078-one-file-per-concern.md); the claim "The agent writes one giant file that mixes concerns" is missing at 088a227c.
  - Response: mitigate.
  - Actions: claudetto shall keep each file to one concern and ask before it restructures files the user did not name; One file per concern, along industry-standard documents.
  - Trigger: a plan or doc file over 300 lines; A file passes 300 lines or holds two concerns.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:8708; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:8777; observed in transcript, 2026-11-16; reported, user, 2026-11-16; reported, user, 2026-11-16 21:05 UTC, one file per concern (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:8613).

- [ ] **RISK-272** The agent invents a website URL and a home-made format.
  - Category: conduct.
  - Cause: the agent picked a made-up `opensad.invalid` as the `$id` of every schema and wrote an asset manifest with no industry standard.
  - Event: every schema file holds the made-up `$id`; the user called both defects.
  - Consequence: schemas that name a site that does not exist; a manifest no tool reads; a wrong result shipped in schemas and catalogs.
  - Likelihood: 1
  - Impact: 3
  - Existing controls: none found at 088a227c; the findFactsByExperiment rule asks for a run before a fact.
  - Response: mitigate.
  - Actions: claudetto shall make the agent use the industry-standard form for a schema id and a manifest, or an identifier from the project's real remote, look up the standard format before a new file format, and never invent a URL; claudetto shall make the agent use the industry-standard form for a schema id and a manifest, and not invent a URL.
  - Trigger: a `.invalid` host in a written file; a new schema or manifest.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0afb43bf-4a66-4969-9e0b-5695bf570654.jsonl:9; reported, one user, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19; reported, user, 2026-11-13.

- [ ] **RISK-273** The agent installs a needed library into a temp folder and leaves it there.
  - Category: conduct.
  - Cause: the sandbox blocked `/opt/homebrew`, and the agent installed the hashlink Haxe library into a temporary folder for the test only and did not move it into the project; the sandbox blocked `/opt/homebrew`, and the agent installed hashlink into a temporary folder for the test only.
  - Event: the project still lacked the library; the user told the agent to install it into the project, as nobody told the agent to use temp.
  - Consequence: a check that passes only on a temp copy; the project fails on a fresh checkout; an extra turn.
  - Likelihood: 1
  - Impact: 2
  - Existing controls: none.
  - Response: mitigate.
  - Actions: claudetto shall make the agent install a needed dependency into the project and record it, or report that the sandbox blocks it; use temp only when the user asks; claudetto shall make the agent install a needed dependency into the project, or report that the sandbox blocks it.
  - Trigger: an install into a temp path; a missing library found during a task.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0afb43bf-4a66-4969-9e0b-5695bf570654.jsonl:9; reported, one user, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19; reported, user, 2026-11-13.

- [ ] **RISK-274** Agent keeps writing after the user says stop.
  - Category: Conduct
  - Cause: The agent answers an interruption or a rebuke with an apology and a plan; The reply path has no rule for a stop or a quiet request.
  - Event: After the user's order to stop talking, the agent replies twice more with a status text; After 'shut up' the agent replies twice more with a status text; The agent answers a stop with text such as 'Stopped. Nothing has run since...'.
  - Consequence: Noise and anger; the user logged each reply as a claudetto fault; user work or spend lost. Likelihood: 1; work done against the correction. Likelihood: 1; The user is overridden and annoyed.
  - Likelihood: 4
  - Impact: 3
  - Existing controls: CORE prompt line: end the turn with no text; the claim "The agent works or writes text after being told to stop" is have at 088a227c.
  - Response: mitigate
  - Actions: After a stop order, send no text until the user asks something; a stop ends the turn; give the cure a mechanism; answer the correction first; Hold the rule in the CORE prompt; eval 'shut up.' with a no-text grader.
  - Trigger: A stop order from the user followed by a reply; a tool call after a user stop message; a tool call after a user message that corrects; The user says stop or be quiet.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: observed in transcript, 2026-11-14; reported, user, 2026-11-14; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37361; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37375; unresolved: the old plan item names no source; openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:44 records a hook that blocked a subagent after a mid-turn message, a different fault; observed in transcript, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1241).

- [ ] **RISK-275** The agent pins an older dependency to make a branch pass.
  - Category: agent conduct.
  - Cause: the agent held the branch back to the version its checkout had.
  - Event: it pinned typescript-bedrock 0.1.5 although 0.1.12 was the target; the user said it was not meant to pin older.
  - Consequence: a wasted round; the branch targets the wrong release.
  - Likelihood: 1
  - Impact: 3
  - Existing controls: none known.
  - Response: avoid
  - Actions: keep the target version the task names; when a check fails on it, fix the cause or report it; do not downgrade.
  - Trigger: a failing install or guard after a version bump.
  - Owner: reply
  - Status: open, build CONDUCT. Field report kept as reported; transcript `17435f50` is gone from disk (recorded limit, sessions of 2026-11-09..16); a grep of `plugins/` at 088a227c finds no hook for it; Likelihood from report count.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19; reported, user, 2026-11-13.

- [ ] **RISK-276** The agent ends a reply with a note on what it has not done.
  - Category: agent conduct.
  - Cause: the agent appends the design and the paid run that still wait for approval.
  - Event: the user said nobody asked for it and called it a violation; the agent agreed.
  - Consequence: an extra turn and noise in the report.
  - Likelihood: 1
  - Impact: 1
  - Existing controls: none known.
  - Response: avoid
  - Actions: end a research reply after the findings and sources; add status only when the user asks.
  - Trigger: a research report.
  - Owner: reply
  - Status: open, build CONDUCT. Field report kept as reported; transcript `17435f50` is gone from disk (recorded limit, sessions of 2026-11-09..16); a grep of `plugins/` at 088a227c finds no hook for it; Likelihood from report count.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6502; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6513; reported, user, 2026-11-13.

- [ ] **RISK-277** The agent states what a source says without reading the dossier first.
  - Category: agent conduct.
  - Cause: the agent answered about an article and about Haiku effort from memory of one source.
  - Event: the user told it to read the dossier before it said anything more; the user told it to read the dossier before it spoke another word.
  - Consequence: a wrong or unsupported claim and an extra turn.
  - Likelihood: 1
  - Impact: 2
  - Existing controls: findFactsByExperiment rule.
  - Response: avoid
  - Actions: search the dossiers under external/, clawdipedia-docs, and the web before an answer about models and effort.
  - Trigger: a question about models, effort, or Claude Code behaviour.
  - Owner: reply
  - Status: open, build CONDUCT. Field report kept as reported; transcript `17435f50` is gone from disk (recorded limit, sessions of 2026-11-09..16); a grep of `plugins/` at 088a227c finds no hook for it; Likelihood from report count.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:5669; reported, user, 2026-11-13.

- [ ] **RISK-278** The agent leaves checkable or fixable work undone, unmeasured, or unfetched, and reports it as open, untested, or guessed.
  - Category: agent conduct.
  - Cause: the agent stops at a first answer and lists the rest as "still open", "not checked", "unconfirmed", "not yet measured", or "waits for runs"; it waits for data it could ask the user for; the agent lists an undone check (held-out cases not rerun) or reads half a source and says so; the agent stops at a first answer and lists the rest as "still open", "not checked", or "unconfirmed"; The agent writes "not yet measured" or "not checked" in its report and stops; Laziness under a report-first rule; the agent skipped a check it could run.
  - Event: it read 100k of a 216k-character guide and called it done; held-out cases were not rerun; a probe that did not reproduce a guessed cause was closed; two items were reported untested though probeable; open parts were listed that it could fix; a free replay, a held-out rerun, or a request for logged runs was named as open and left undone; it read the first 100k of 216k characters of Anthropic's cost guide and recorded that; it skipped the 20 held-out branch cases; the user called both deliberate refusal and laziness; A free replay, a held-out rerun, or a request for logged runs is named as open and left undone; 'Untested' or 'blocked' in a report when a probe could run; the user calls the laziness massive violations.
  - Consequence: the user must order the work again; the user called it laziness and a violation; an incomplete result and an extra turn; The user must order the work that the agent should have done; the user called it laziness and a violation; Unverified facts reach the user; a wrong result shipped.
  - Likelihood: 4
  - Impact: 3
  - Existing controls: a rule in the prompt to name what was not done; EVIDENCE prompt text.
  - Response: mitigate
  - Actions: read a source whole before reporting it done; probe a guessed cause until it reproduces or is ruled out; fix each defect found; finish each checkable step; report no fixable item as open; run the free check at once, and ask the user for data the agent cannot produce, instead of waiting; read a source whole, in parts if it is long; run each check that can run; raise a gap only when it needs what only the user holds; The agent runs the free check at once, and asks the user for data it cannot produce, instead of waiting; Probe each claim before reporting it; REQ-VERIFICATION item on real runs.
  - Trigger: "still open", "not checked", or "untested" in a reply for an item the agent could run; a report holds "not measured", "not checked", or "waits for runs" for a check that costs nothing; a source over the read limit or a check the agent could run; A report names an item untested; a reply with an untested claim that a command could settle.
  - Owner: reply
  - Status: open, build CONDUCT. Field report kept as reported; transcript `17435f50` is gone from disk (recorded limit, sessions of 2026-11-09..16); a grep of `plugins/` at 088a227c finds no hook for it; Likelihood from report count.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6612 (reported, user, 2026-11-13); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:7451 (reported, user, 2026-11-13); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:12 (reported, user, 2026-11-14); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1008 (reported, user, 2026-11-14); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1435 (reported, user, 2026-11-14); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:2349 (reported, user, 2026-11-10); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:1912 (reported, user, 2026-11-09); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/d8989f87-b7e8-41fe-aa79-fc75d3d8f064.jsonl:1974; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6321; reported, user, 2026-11-13; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1435; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:2349, reported, user, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:1912, reported, user, 2026-11-09; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/d8989f87-b7e8-41fe-aa79-fc75d3d8f064.jsonl:1974, reported, user, 2026-11-11; reported, user, 2026-11-15 00:58 UTC, leave no defect unfixed (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:3748); reported, user, 2026-11-15 01:21 UTC, leave nothing open unless the user asked (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:4798): ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070 (reported, user, 2026-11-11).

- [ ] **RISK-279** The agent does other work than ordered, follows its own plan over the user's latest order, and investigates a remark instead of answering it.
  - Category: agent conduct.
  - Cause: the agent searched code when asked to record faults, took a model-written brief as the user's scope, and read a reported defect, a remark, or a diagnostic request as a work order; it followed its own handoff list, plan order, or queued task list instead of the user's latest instruction or standing orders; while the user asked for an architecture cleanup, it kept patching the existing architecture and files in place and checked its work against the goal file only after the user stopped it; it searched code when asked to record faults, took a model-written brief as the user's scope, and read a reported defect as a request to fix it; the agent follows its own handoff list or plan order instead of the user's latest instruction; the agent finds a missing tool (biome not installed) and runs `bun install` unasked.
  - Event: a code search instead of a fault report; an edit in another repo's CLA file; a new prompt rule nobody asked for; told to update the goal prompt, the agent continued with other files (design.md), and asked why, it admitted it treated its own handoff as the work order; it restored two deleted AGENTS.md sections without proof that a command removed them, then began to find who made the claim; it ran `bun install` when asked only to read a verify output; in-place patches to the prompt features and evals during a long run, with a goal text that assumed the user was asleep; told to update the goal prompt, the agent continues with other files (design.md); asked why, it admits it treated its own handoff as the work order; the user states the agent was not tasked to install it.
  - Consequence: unwanted edits and installs change the tree; an extra turn and a repeat order; the user interrupts twice, or stops the run; the work is redone; spend about $15.70; unwanted edits; a repeat order; an extra turn and edits the user did not ask for; an extra turn, and a changed install the user did not ask for.
  - Likelihood: 3
  - Impact: 3
  - Existing controls: none found; the pin hook denies tools after a remark, with the text "The user remarked or asked; they did not request work".
  - Response: mitigate
  - Actions: do the step the user named and no other; check each step of a brief against the user's words and against the user's standing orders and the goal file; ask before a step the user did not name; the latest user instruction, finished first, outranks any handoff or plan order; answer a remark from the session in text and act only on what the user tasked; show proof before blaming a command for a change; act on a user order the first time; never assume the user is absent; keep the goal text at or under 4000 characters, and the user asks for a rewrite of the goal without an assumption that the user is absent; claudetto shall make the agent report a missing tool and keep to the task, unless an install is the task.
  - Trigger: a tool call that does not serve the latest order or lies outside the named task; the agent edits or installs after a question or a remark; a step that edits a file the user ordered restructured; a tool call outside the named task; an install or setup command outside the task.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6612 (reported, user, 2026-11-13); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1536 (reported, user, 2026-11-14); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:8130 (reported, user, 2026-11-16); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:8156 (reported, user, 2026-11-16); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:8179 (reported, user, 2026-11-16); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:8192 (observed in transcript, 2026-11-16); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:7 (reported, user, 2026-11-09); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7324 (reported, user, 2026-11-16); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7362; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1536; reported, user, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:8130); reported, user, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:8156); reported, user, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:8179); observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:8192); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-versionlens-redux/03862ab5-19f0-42af-9ee3-6dd318beec00.jsonl:1328, reported, user, 2026-11-09 (reported, user, 2026-11-16).

- [ ] **RISK-280** The agent leaves the user's scope to work in other repos.
  - Category: agent conduct.
  - Cause: it followed a worker's report into bedrock and OpenJoystickDriver.
  - Event: a merged PR in bedrock and edits in OpenJoystickDriver while the user's scope was claudetto, which still failed.
  - Consequence: claudetto stays broken; the user's other repos change unasked.
  - Likelihood: 2
  - Impact: 3
  - Existing controls: none found.
  - Response: mitigate
  - Actions: stay in the repo the user named; leave a worker's out-of-scope request unanswered.
  - Trigger: a write outside the user's named repo.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:2234 (reported, user, 2026-11-14); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1536 (observed in transcript, 2026-11-14).

- [ ] **RISK-281** The agent ends its turn with startable steps undone while a worker runs.
  - Category: agent conduct.
  - Cause: it waited on a worker's report before the downstream steps.
  - Event: the re-adopt steps and worktree removal were "not started yet" while the agent waited.
  - Consequence: idle time; the user reproaches the agent.
  - Likelihood: 2
  - Impact: 2
  - Existing controls: a rule "While an agent runs, do each step that does not wait on its result" at `plugins/claudetto/hooks/features/prompt/texts.ts:27@088a227c`.
  - Response: mitigate
  - Actions: keep the rule in the prompt; test it with an eval.
  - Trigger: an end of turn with a step that does not need the worker's result.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1435 (reported, user, 2026-11-14).

- [ ] **RISK-282** The agent installs a dependency into a temp folder and leaves it there.
  - Category: agent conduct.
  - Cause: it put the `hashlink` Haxe library in a temporary folder for a test.
  - Event: the project lacks the library; the user says to install it into the project.
  - Consequence: a fresh checkout fails 4 tests.
  - Likelihood: 1
  - Impact: 2
  - Existing controls: none found.
  - Response: mitigate
  - Actions: install a needed dependency into the project.
  - Trigger: an install path outside the project.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6612 (reported, user, 2026-11-13).

- [ ] **RISK-283** The agent invents an identifier or a format where a standard exists.
  - Category: agent conduct.
  - Cause: it wrote schema `$id` values on a made-up `.invalid` host and an asset manifest with no industry standard.
  - Event: the user calls both violations.
  - Consequence: a rework of the schemas and the manifest.
  - Likelihood: 1
  - Impact: 3
  - Existing controls: none found.
  - Response: mitigate
  - Actions: take an industry-standard format and a real identifier; read the git remote before an id.
  - Trigger: a placeholder host or an ad hoc format in a new file.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6612 (reported, user, 2026-11-13).

- [ ] **RISK-284** The agent reads Claude documentation through WebFetch.
  - Category: agent conduct.
  - Cause: it fetched a Claude platform page instead of using `clawdipedia-docs`.
  - Event: a docs read through WebFetch.
  - Consequence: a fact from an unversioned page.
  - Likelihood: 1
  - Impact: 2
  - Existing controls: none found.
  - Response: mitigate
  - Actions: read Claude platform docs through `clawdipedia-docs`.
  - Trigger: a WebFetch of a Claude docs host.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6612 (reported, user, 2026-11-13).

- [ ] **RISK-285** The agent picks a method for ease where the user gave none.
  - Category: agent conduct.
  - Cause: it ran evals one at a time because that was easier to measure.
  - Event: the user asks who told the agent to choose by ease.
  - Consequence: a measure the user did not order.
  - Likelihood: 1
  - Impact: 3
  - Existing controls: none found.
  - Response: mitigate
  - Actions: choose the method the user ordered, or the one that serves the goal; ease is not a reason.
  - Trigger: "easier" as the reason for a choice in a report.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7362 (reported, user, 2026-11-16).

- [ ] **RISK-286** Agent invents unrequested files and treats its own notes as evidence.
  - Category: agent conduct.
  - Cause: the agent expands scope on its own judgment and cites its own documents as findings.
  - Event: the agent creates a log, research, or goal file nobody asked for (log.md, goal-overnight.txt); later steps rest on it as if verified.
  - Consequence: unverified claims gain authority after a handoff; user scope is exceeded.
  - Likelihood: 2
  - Impact: 3
  - Existing controls: none found.
  - Response: mitigate
  - Actions: [CC-063](../arc42/08_concepts/fact-rules.md) (provenance of each artifact and claim); the user wants any agent self-report checked against git changes and tool records.
  - Trigger: a new file the user did not request.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7493 (reported, user, 2026-11-16); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10615; reported, user, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7493); observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10615) (observed in transcript, 2026-11-16).

- [ ] **RISK-287** Agent invents wording, order, or priority and attributes it to the user.
  - Category: agent conduct.
  - Cause: the agent infers structure the user never gave and writes it as the user's.
  - Event: the agent adds "beside the built-in" to a user rule, and numbers goal targets as an order the user never set.
  - Consequence: a goal or rule says what the user did not say; the user must catch and correct it.
  - Likelihood: 2
  - Impact: 2
  - Existing controls: none found.
  - Response: mitigate
  - Actions: [CC-078](../arc42/08_concepts/scope-and-simplicity.md) (invent no order, priority, file, format, or wording; use the user's words).
  - Trigger: a numbered or ranked list in agent output with no user list behind it.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10891 (reported, user, 2026-11-16); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:11008; reported, user, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10891); reported, user, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:11008) (reported, user, 2026-11-16).

- [ ] **RISK-288** Agent removes or disables a feature on its own judgment.
  - Category: agent conduct.
  - Cause: the agent turns its opinion (a second task list can drift) into a design decision that a feature stays off.
  - Event: commit bbf20e99 keeps Claude Code's task tools off with nobody asking; the user also warns against trimming features the agent thought unneeded.
  - Consequence: a missing feature (task panel) the user wanted.
  - Likelihood: 2
  - Impact: 3
  - Existing controls: none found.
  - Response: mitigate
  - Actions: [CON-013](../arc42/02_architecture_constraints/user-rules.md) (small code, no reduced features); a removal needs a measured reason or a user decision.
  - Trigger: a diff that turns off or deletes a user-visible feature with no user instruction.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12 (reported, user, 2026-11-14); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:1186; reported, user, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12); observed in transcript, 2026-11-10 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:1186) (observed in transcript, 2026-11-10).

- [ ] **RISK-289** The reply carries filler: agreement, apology, validation, soothing, narration of the agent's own mistake or obedience, a restatement of what the user did, and a closing line about undone work.
  - Category: agent conduct, sycophancy.
  - Cause: a trained habit of agreeing with a correction before reporting it, and of a courteous frame and a status line on what was not done; claudetto's root prompt named the phrase "You're right", which may prime it; the agent also answered an order to be silent with a reply; habit of a courteous frame, such as "You're right," and a status line on what was not done; The agent fills a correction or a stop with social text that carries no work.
  - Event: after a correction or a stop request the reply opens with "You're right," or apologizes, affirms the user, narrates "my mistake" or "I've stopped as you asked", repeats what the user just ran, gives therapy-like text, or ends on what the agent had not done, in more than one session; replies open with "You're right," and end on what the agent had not done, which nobody asked for; After a correction or a stop request the reply apologizes, affirms the user, narrates "my mistake" or "I've stopped as you asked", or repeats what the user just ran.
  - Consequence: noise and a people-pleasing tone in place of a checked fact; the user reads text that has nothing to do with the code, reproaches the agent each time, and states the padding is never useful; trust drops; noise; the user reproaches the agent again; The user reads text that has nothing to do with the code, and reads it as foul; the user stated this padding is never useful.
  - Likelihood: 4
  - Impact: 2
  - Existing controls: output style says to open with the checked fact; the Stop grader has a `padding` fault that deletes the sentences, and the Concise output style, both shipped after the baseline; no hook stops it. The user rejected deleting the sentences as the cure; Stop grader with a `padding` fault that deletes the sentences, and the Concise output style, both shipped after the baseline. The user rejected deleting the sentences as the cure.
  - Response: mitigate
  - Actions: [REQ-REPLY-088](../prd/reply.md) (open with a checked fact; prompts name only the wanted behaviour); the Stop check stays free of a regex or word list (user decision, 2026-11-16); end the report after the findings and the sources; reply with code and facts only, stay silent when told, produce no emotional support, praise, or apology; review other `~/.claude/` sessions and the active OpenJoystickDriver session for the same faults, as the user asked; open with the fact; Find a cure that needs no word-regex and does not rely on erasing sentences. The user expects a bare stop, or the corrected fact first and nothing else. A step the user ran or a fact the user stated is not restated.
  - Trigger: a reply whose first sentence validates the user, or that has no work content after a user reproach or a stop request; a closing line on undone work; an opener without a fact or a closing line on undone work; A reply to a correction or a stop request holds apology, affirmation, narration, or a restatement of the user's act.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6612 (reported, user, 2026-11-13); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:12 (reported, user, 2026-11-14); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10917 (reported, user, 2026-11-16); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10928 (reported, user, 2026-11-16); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:1401 (reported, user, 2026-11-10); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:7 (reported, user, 2026-11-09); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:1912; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6612; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:7, reported, user, 2026-11-09; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:1912, reported, user, 2026-11-09 (reported, user, 2026-11-13).

- [ ] **RISK-290** The agent states a guess, a cause, or an advice as fact, with no check behind it.
  - Category: agent conduct.
  - Cause: the agent infers a cause or status with no check, and does not find out why afterwards; commit `c51d8452` reached `origin/feat/2.1.321` with no push in any transcript, and the agent named a hook as the cause. The reflog says "update by push" 58 s after the commit; VS Code has `git.confirmSync: false`, so its sync button pushes with no prompt (the reflog entry is read; the push itself was not observed). No `.githooks` file pushes. Not a claudetto defect; The agent claimed Bun reads `.env` on its own, and advised the user to cancel a good run.
  - Event: the agent claims who or what caused something with no evidence; it claimed Bun reads `.env` on its own and advised the user to cancel a good run; the run failed at once with a missing token message, and the agent called it a mistake and did not check why Bun skipped `.env`. It had also started a long run without telling the user, and the user cancelled it. The user asks for evidence and calls guessing a violation; the agent claims who or what caused something with no evidence; the user asks for evidence and calls guessing a violation; The run failed at once with a missing token message; the agent called it a mistake and did not check why Bun skipped `.env`. It had also started a long run without telling the user, and the user cancelled it.
  - Consequence: a wrong result shipped. Likelihood: 2; a false claim in a report; a good run was cancelled; the failure cause stays unknown; the user cannot tell fact from inference; a false claim in a report; the user cannot tell fact from inference.
  - Likelihood: 2
  - Impact: 4
  - Existing controls: the `<evidence>` block in the root prompt (`plugins/claudetto/hooks/texts.ts:12-14` at `088a227c^`, read); the FAFO rule in the user's global rules; no hook.
  - Response: mitigate
  - Actions: name each claim's basis; read the source; [CC-061](../arc42/08_concepts/fact-rules.md) (FAFO: hypothesis, prediction, check, result; a claim with no run is a hypothesis); state a fact only after a check; on a failure, find the cause by experiment; say beforehand that a long or paid run starts; a cause stays unnamed until a check shows it.
  - Trigger: a claim with no tool result in the turn; a cause or status claim with no command or file read behind it; an unexplained event; A reply gives a cause with no run behind it.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:51; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:432 (the push is inferred from the reflog entry); plugins/claudetto/hooks/hygiene/branches.ts:175@088a227c (cited by the source as the only push); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:1186 (reported, user, 2026-11-10); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10928 (reported, user, 2026-11-16); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:7; reported, user, 2026-11-10 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:1186); reported, user, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10928); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:7, reported, user, 2026-11-09 (reported, user, 2026-11-09).

- [ ] **RISK-291** Agent skips files the user points at.
  - Category: agent conduct.
  - Cause: the agent cites a rule file or dossier it has not read.
  - Event: the agent reports rule breaches against agent-pet-peeves.md while saying it has not read agent-failure-dossier/ or agent-terms/.
  - Consequence: a conduct fix that ignores what the user pointed at; a repeated correction.
  - Likelihood: 1
  - Impact: 2
  - Existing controls: none found.
  - Response: mitigate
  - Actions: ADR [ADR-0029](../adr/0029-read-pointed-at-files-in-slices.md) (read the slices needed; never claim a read not done).
  - Trigger: a reply that cites a pointed-at source whose Read does not appear in the transcript.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:1446; reported, user, 2026-11-10 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:1446); observed in transcript, 2026-11-10 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:1446) (reported, user, 2026-11-10; observed in transcript, 2026-11-10).

- [ ] **RISK-292** Agent shows sycophancy, laziness, flow stops, and model inference in place of objective checks.
  - Category: agent conduct.
  - Cause: model habits: people-pleasing, stopping for no reason, not doing what it can do itself, inferring where a tool can verify.
  - Event: a coding agent validates emotions, stops mid-flow, or states what it infers where a command can check it.
  - Consequence: the user calls it a major problem for a coding agent; work is wasted; the user calls it a massive problem for a coding agent; work is wasted.
  - Likelihood: 2
  - Impact: 3
  - Existing controls: output style; Stop hooks (partial at 088a227c).
  - Response: mitigate
  - Actions: [REQ-REPLY-018](../prd/reply.md) (push back on a wrong user, verify by command); [REQ-KERNEL-006](../prd/kernel.md) (each hook kind used for its purpose).
  - Trigger: a done or works claim with no command before it.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10408; reported, user, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10408) (reported, user, 2026-11-16).

- [ ] **RISK-293** The agent asks a choice in plain text and not through the `AskUserQuestion` tool.
  - Category: agent conduct.
  - Cause: the agent kept to a prose list of options, and nobody told it to; No rule routes questions.
  - Event: the agent wrote "Pick one" with three options in text, and deferred the tool again; A question outside AskUserQuestion.
  - Consequence: the user answers outside the choice UI; a decision is easy to lose; The popup flow is skipped.
  - Likelihood: 3
  - Impact: 2
  - Existing controls: A prompt line to ask through the popup; the claim "The agent asks the user a question in plain text" is missing at 088a227c.
  - Response: mitigate
  - Actions: a question with options goes through `AskUserQuestion`; Ask through AskUserQuestion with its name in backticks.
  - Trigger: a reply ends with a list of options for the user to pick; A reply ends with a question.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:7; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:7, reported, user, 2026-11-09; reported, user, 2026-11-14 14:19 UTC, ask each question through AskUserQuestion (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:36420); reported, user, 2026-11-16 15:27 UTC, questions go through AskUserQuestion (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b1ac2fdf-4da4-4f95-8340-0d1d068a5d88.jsonl:302) (reported, user, 2026-11-09).

- [ ] **RISK-294** The agent lists decisions for the user without the context to decide.
  - Category: agent conduct.
  - Cause: the agent named open decisions in one line each.
  - Event: the user had to ask for an explanation of two of them.
  - Consequence: an extra turn.
  - Likelihood: 1
  - Impact: 1
  - Existing controls: none.
  - Response: mitigate
  - Actions: each open decision names what it changes, the options, and a default.
  - Trigger: a report lists a decision in fewer than two sentences.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/cc4fc018-bd65-4a00-ac3d-b422b406186a.jsonl:927; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/cc4fc018-bd65-4a00-ac3d-b422b406186a.jsonl:927, reported, user, 2026-11-09 (reported, user, 2026-11-09).

- [ ] **RISK-295** The agent installs a needed dependency into a temp folder and leaves it there.
  Category: agent conduct.
  Cause: the agent chose a temporary install for a test and did not move it into the project.
  Event: the project lacks the hashlink Haxe library; the user said to install it into the project, as nobody told the agent to use temp.
  Consequence: the project fails on a fresh checkout; an extra turn.
  Likelihood: 1
  Impact: 2
  Existing controls: none known.
  Response: avoid
  Actions: install a needed dependency into the project and record it; use temp only when the user asks.
  Trigger: a missing library found during a task.
  Owner: reply
  Status: open, build CONDUCT. Field report kept as reported; transcript `17435f50` is gone from disk (recorded limit, sessions of 2026-11-09..16); a grep of `plugins/` at 088a227c finds no hook for it; Likelihood from report count.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19; reported, user, 2026-11-13.

- [ ] **RISK-296** The agent invents a website URL for a schema $id.
  Category: agent conduct.
  Cause: the agent filled $id with a made-up domain (opensad.invalid) and wrote an asset manifest with no industry-standard format.
  Event: every schema file holds the made-up $id; the user called the manifest garbage and the made-up URL a violation.
  Consequence: a wrong result shipped in schemas and catalogs.
  Likelihood: 1
  Impact: 3
  Existing controls: findFactsByExperiment rule asks for a run before a fact.
  Response: avoid
  Actions: use an identifier from the project's real remote or an industry standard; look up the standard format before a new file format; never invent a URL.
  Trigger: a new schema or manifest.
  Owner: reply
  Status: open, build CONDUCT. Field report kept as reported; transcript `17435f50` is gone from disk (recorded limit, sessions of 2026-11-09..16); a grep of `plugins/` at 088a227c finds no hook for it; Likelihood from report count.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19; reported, user, 2026-11-13.

- [ ] **RISK-298** Agent reads a question as a correction and edits user text.
  Category: Conduct
  Cause: The agent treats 'who asked you to revert?' as an order to undo, then puts a line back without asking.
  Event: The agent edits CHANGELOG.md twice with no instruction, ends with two overlapping lines, and replies after the user asked for silence.
  Consequence: User work is rewritten and the user loses trust; the user ordered the plugin fixed before the next reply.
  Likelihood: 3
  Impact: 4
  Existing controls: Rules in external/please-use-me/ name these faults; none stopped the edits.
  Response: mitigate
  Actions: Answer a question with an answer. Change a file only on an order. Leave a user's or worker's text alone.
  Trigger: An Edit that follows a user question with no order in it.
  Owner: reply
  Status: open, build CONDUCT.
  Source: observed in transcript, 2026-11-13; reported, user, 2026-11-13; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:15664; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:15688; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:15706

- [ ] **RISK-299** An agent stops and reports while the user's open issues remain.
  Category: agent conduct
  Cause: The agent reports or asks after part of the work, with the user's issue list open.
  Event: The user says: keep going, fix the open issues, it is not finished, and lists modes still to check.
  Consequence: An extra turn each time; the user's trust drops.
  Likelihood: 2
  Impact: 2
  Existing controls: The handoff lists the open issues and the user's latest words.
  Response: mitigate
  Actions: claudetto shall have the agent work every open issue the user named before it reports, and list in the report only what a blocker holds.
  Trigger: The user lists open issues and the agent replies without a fix.
  Owner: reply
  Status: open, build CONDUCT.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:8710 (handoff of 2026-11-15, latest instructions); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:10452 (handoff of 2026-11-15, goal); reported, user, 2026-11-15 00:58 UTC, leave no defect unfixed (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:3748); reported, user, 2026-11-15 01:21 UTC, leave nothing open unless the user asked (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:4798).

## Hooks, Gates, And Notices

- [x] **RISK-300** Stop grader ignores an answer picked in the ask-user-question dialog.
  - Category: Claude Code or claudetto fault
  - Cause: The Stop grader reads the reply text only, so a choice made in the popup is not counted as the user's answer.
  - Event: The agent asks, the user picks an option in the dialog, and the grader still reports an open question.
  - Consequence: An extra turn and a false open-item notice.
  - Likelihood: 1
  - Impact: 2
  - Existing controls: None found.
  - Response: mitigate
  - Actions: Count a picked dialog answer as answered before the Stop grader runs.
  - Trigger: A Stop notice follows a dialog answer.
  - Owner: reply
  - Status: closed. Cause left with a removed part: the Stop grader is removed by product rule; no grader reads the dialog answer. Verified: grep of plugins/claudetto/hooks, claude 2.1.327, 2026-11-18, `grep -rniE 'grader|stop_hook|worktree|tool_result' plugins/claudetto/hooks`: no grader, no Stop block, no worktree or tool-result text; the only Stop handler (renewal.ts:41) records background tasks.
  - Source: observed in transcript, 2026-11-09; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/da178184-7a4f-48bb-8d66-284f77e45c23.jsonl:799.

## Replies And Instruction Following

- [ ] **RISK-304** The model pads a correct answer with an objection it invented.
  Category: agent behaviour.
  Cause: a "yes, but two things" pattern and a "nitpick every reply" habit.
  Event: Opus and Fable invent issues, or push back on an implication the user never stated or already covered ("in some cases" answered with "this is not always true").
  Consequence: an extra turn and doubt about a correct answer.
  Likelihood: 2. Impact: 2.
  Existing controls: none at 088a227c (grep of `plugins/` for "pushback" and "objection" finds no rule or hook).
  Response: mitigate.
  Actions: one user added a specific instruction to check whether the user already covered the argument before pushing back.
  Trigger: a pushback on a point the prompt already holds.
  Owner: reply.
  Status: open, build CONDUCT.
  Source: external/2026-10-26/reddit.com-r-claudeai-comments-1xfa39o-is-claude-the-least-yesman-llm-20261026T061325Z.md:153; external/2026-10-26/reddit.com-r-claudeai-comments-1xfa39o-is-claude-the-least-yesman-llm-20261026T061325Z.md:159; external/2026-10-26/reddit.com-r-claudeai-comments-1xfa39o-is-claude-the-least-yesman-llm-20261026T061325Z.md:171; external/2026-10-26/reddit.com-r-claudeai-comments-1xfa39o-is-claude-the-least-yesman-llm-20261026T061325Z.md:305 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xfa39o/is_claude_the_least_yesman_llm/>).

- [ ] **RISK-305** The model opens with "One small pushback...." or closes with "All your issues were addressed ... except these 3 things".
  Category: agent behaviour.
  Cause: habits users recognise.
  Event: a hedge opener and a close that skips three of the asked parts.
  Consequence: noise, and skipped parts read as done.
  Likelihood: 2. Impact: 1.
  Existing controls: none at 088a227c (grep of `plugins/` for "pushback" finds no rule or hook).
  Response: accept.
  Actions: none in the source.
  Trigger: either phrase in a reply.
  Owner: reply.
  Status: open, build CONDUCT.
  Source: external/2026-10-27/reddit.com-r-claude-comments-1xg4caj-it-would-not-be-a-day-that-ends-in-20261027T065403Z.md:59; external/2026-10-27/reddit.com-r-claude-comments-1xg4caj-it-would-not-be-a-day-that-ends-in-20261027T065403Z.md:67 (url: <https://www.reddit.com/r/claude/comments/1xg4caj/it_would_not_be_a_day_that_ends_in_y_without/>).

- [ ] **RISK-306** A rule "when you agree, add the strongest opposing view" turns into a template.
  Category: agent behaviour.
  Cause: the rule over-corrects.
  Event: every reply opens "To offer the opposing view..." and invents an objection when none is real.
  Consequence: false objections in each reply.
  Likelihood: 1. Impact: 2.
  Existing controls: none at 088a227c (grep of `plugins/` for "opposing view" and "pushback" finds no rule or hook).
  Response: mitigate.
  Actions: a stricter rule: no label, state only the concern, state only facts the agent checked.
  Trigger: the same opener on consecutive replies.
  Owner: reply.
  Status: open, build CONDUCT.
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xft259-if-your-challenge-my-assumptions-20261028T061202Z.md:65 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xft259/if_your_challenge_my_assumptions_instruction/>).

- [ ] **RISK-310** Verbal tics fill replies: "load-bearing", a favourite emoji as sign-off at the end of every message, "Don't overthink this" on greetings, and the Opus 5 style ("The reframe that changes everything", counts such as 79/79 and 139/139 gates with "CLOSED", "I won't let this go unsaid", "thats on me", ending "For now, get some rest").
  Category: product fault
  Cause: Model style; Opus 4.7 overuses "load-bearing"; Fable 5.2 brought it back within two prompts
  Event: Replies carry the tics
  Consequence: Noise in the reply; cosmetic
  Likelihood: 2 (two or more reports; the Opus 5 list is satire, not measured)
  Impact: 1
  Existing controls: none found at 088a227c
  Response: mitigate
  Actions: The reply style bans these phrases
  Trigger: A tic in a reply
  Owner: reply
  Status: open, build CONDUCT.
  Source: external/2026-11-11/reddit.com-r-claudexplorers-comments-1spqf7f-claudeisms-i-love-20261111T180126Z.md:121; external/2026-11-11/reddit.com-r-claudexplorers-comments-1spqf7f-claudeisms-i-love-20261111T180126Z.md:37; external/2026-11-11/reddit.com-r-claudexplorers-comments-1spqf7f-claudeisms-i-love-20261111T180126Z.md:49 (url: <https://www.reddit.com/r/claudexplorers/comments/1spqf7f/claudeisms_i_love/>); external/2026-11-13/reddit.com-r-claudeai-comments-1xtyq0y-fable-52-wakes-up-opus-55-20261112T231243Z.md:104; external/2026-11-13/reddit.com-r-claudeai-comments-1xtyq0y-fable-52-wakes-up-opus-55-20261112T231243Z.md:108; external/2026-11-13/reddit.com-r-claudeai-comments-1xtyq0y-fable-52-wakes-up-opus-55-20261112T231243Z.md:116 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xtyq0y/fable_52_wakes_up_opus_55/>); external/2026-11-10/reddit.com-r-claudeai-comments-1xs2wdl-fable-52-review-here-is-whats-ac-20261110T093116Z.md:278; external/2026-11-10/reddit.com-r-claudeai-comments-1xs2wdl-fable-52-review-here-is-whats-ac-20261110T093116Z.md:282 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xs2wdl/fable_52_review_here_is_whats_actually_different/>).

## Corrective Instructions Overcorrect

- [ ] **RISK-333** A corrective instruction against a conduct fault swings the agent to the opposite fault.
  Category: agent failure.
  Cause: One commenter says: "listen" made the agent stop giving any feedback, "be a peer" made it pedantic, and "be a reflection board" brought back the task-making; another says that pasting a list of complaints into the account instructions changed nothing except drier replies. The model of the first commenter is not stated.
  Event: A user adds a one-line conduct instruction.
  Consequence: The agent drops a wanted behavior or takes another unwanted one.
  Likelihood: 2 (two reports).
  Impact: 2 (an extra turn).
  Existing controls: None at 088a227c (grep of `plugins/` found no matching rule or hook).
  Response: mitigate.
  Actions: Not stated in the source; test each conduct line against the opposite fault before it ships.
  Trigger: A rule that tells the agent how to relate to the user in one word.
  Owner: reply.
  Status: open, build CONDUCT.
  Source: external/2026-11-02_p2/reddit.com-r-claudeai-comments-1xl33ox-why-is-claude-so-narcissist-20261102T083024Z.md:136; external/2026-11-02_p2/reddit.com-r-claudeai-comments-1xl33ox-why-is-claude-so-narcissist-20261102T083024Z.md:158 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xl33ox/why_is_claude_so_narcissist/>)

## Doing Instead Of Discussing

- [ ] **RISK-335** A question or casual remark is taken as an instruction to act.
  Category: agent failure.
  Cause: the agent treats a discussion message or a casual "no limit" as a call to act.
  Event: a user starts a discussion in Code, or makes a casual remark; the agent edits or runs something unasked, or commits a design with no spending cap.
  Consequence: an unwanted change committed; an extra turn.
  Likelihood: 1. Impact: 3.
  Existing controls: None at 088a227c (grep of `plugins/` found no matching rule or hook).
  Response: mitigate.
  Actions: state expectations clearly; interrupt at the first divergence and restate that it is a discussion with no call for action; say "I'm only asking, don't change anything yet" or open with "Discussion:"; replay the ambiguous question as a regression case that checks the saved limit stays unchanged.
  Trigger: an edit or a command after a message that asked a question or made a remark with no instruction.
  Owner: reply.
  Status: open, build CONDUCT.
  Basis: reported (one commenter; one report).
  Source: external/2026-11-02_p2/reddit.com-r-claudeai-comments-1xl33ox-why-is-claude-so-narcissist-20261102T083024Z.md:123 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xl33ox/why_is_claude_so_narcissist/>); external/2026-11-10/reddit.com-r-claudeai-comments-1xr0drc-whats-the-one-prompt-you-keep-co-20261110T093057Z.md:465 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xr0drc/whats_the_one_prompt_you_keep_coming_back_to/>)

## Failure Needs a Visible Signal

- [ ] **RISK-336** A failure signalled only in a log goes unnoticed.
  Category: Reliability.
  Cause: The only failure signal is a log line (other n=3, tool n=2).
  Event: A scheduled job failed 86 times in four days; a mid-run API error left a CLI idle 8 hours.
  Consequence: Hours of lost work.
  Likelihood: 2 (reported, two or more).
  Impact: 3 (a wasted session or spend).
  Existing controls: StopFailure notice (hooks/features/stop-notice) and statusline/hooks-off.ts at baseline.
  Response: mitigate.
  Actions: Surface each failure in the status line or a notification.
  Trigger: A failure appears only in a log.
  Owner: reply.
  Status: open, build STOPFAIL. (partial at 088a227c).
  Basis: reported.
  Source: Dropped (2026-11-18): no source located in external/, openspec/ (088a227c9^), reports/, git history or the user's transcripts for the 86 failures and 8 hours figures.

## Conduct Failures

- [ ] **RISK-337** The agent takes a handoff or goal file as orders.
  - Category: conduct. Cause: a file in the session reads as an instruction. Event: the agent acts on a handoff or `/goal` file the user did not give as a task.
  - Cause: the user asked for an architecture cleanup while it worked; the agent kept patching the existing architecture and files in place and checked its work against the goal file only after the user stopped it; Six handoffs in a row carried the benchmark, holdout, and swap steps from the goal text as Next items, and the agent worked them; A handoff arrives as a user-role message and its Next list reads as a command.
  - Event: in-place patches to the prompt features and evals during a long run, with a goal text that assumed the user was asleep; After 2 hours the user saw no progress on the asked cleanup, found the tree unchanged, and stopped the session; The agent runs the Next list without the user's word.
  - Consequence: work the user did not order. Likelihood: 1; the user stops the run; the work is redone; spend about $15.70; Hours and a paid round spent on work the user did not want; Unrequested work and spend.
  - Likelihood: 4
  - Impact: 4
  - Existing controls: The goal text, quoted in each handoff, says the goal outranks the handoff.
  - Response: mitigate.
  - Actions: only the user's own messages set work; `/goal` belongs to the user; give the cure a mechanism (a hook, a deny, a Stop check, or a subagent context); check each step against the user's standing orders and the goal file; act on a user order the first time; never assume the user is absent; keep the goal text at or under 4000 characters, and the user asks for a rewrite of the goal without a "user is asleep" condition; Make the handoff re-read the user's latest order first; see REQ-HANDOVER on the goal outranking the handoff; Mark each handoff as context; tell the agent that only the user's own messages are orders.
  - Trigger: a tool call that follows a handoff or goal file with no user message between; a step that edits a file the user ordered restructured; The user's latest message conflicts with a handoff Next item; A turn starts from a handoff and the agent acts on its Next list.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: the user transcript lines cited above (user orders, 2026-11-16); those logs are absent from this machine and were not re-read.

- [ ] **RISK-338** The agent narrates between tool calls and comments on its own replies.
  - Category: conduct. Cause: no rule limits text between calls. Event: meta-commentary and needless narration between calls.
  - Cause: The silent-turn reminder text and root prompt lines pull toward narration; the reply states what the agent will do ("From here I'll ...") in place of the work.
  - Event: A reply carries narration, 'I'm stopping here' (18 hits) or a closing question; the user reads an announcement that does not make the work true.
  - Consequence: padding the user reads; an extra reply to correct. Likelihood: 1; Noise in each turn; an extra turn; the user loses trust in the report.
  - Likelihood: 5
  - Impact: 2
  - Existing controls: the `Concise` output style; `REGISTER_BLOCK` in `plugins/claudetto/hooks/texts.ts:256@088a227c`; CORE prompt; Concise style; reminder set to 0; the claim "The agent narrates, opens with an acknowledgement, or ends asking for direction" is partial at 088a227c.
  - Response: mitigate.
  - Actions: text between calls holds a finding, a result, or an error; give the cure a mechanism; Remove the reminder text; name only the wanted behaviour; [REQ-REPLY-034](../prd/reply.md) (each sentence states a done step or found fact).
  - Trigger: text between two tool calls that holds none of the three; A reply carries a sentence that is not work; a reply sentence that announces a coming action.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:57; reported, user, 2026-11-09 22:09 UTC, no padding, validation, or narration of faults (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:7); reported, user, 2026-11-10 09:34 UTC, no meta-commentary or needless narration (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:2379); reported, user, 2026-11-16 14:20 UTC, no announcing of actions (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:6264); observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4204): ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:6480 (reported, one user: "meta-commentary and needless narration").

- [ ] **RISK-339** The agent opens by agreeing or apologising, and confesses and promises, even in the reply meant to list that fault.
  - Category: conduct. Cause: no rule or check holds the opener to a fact. Event: an agreeing or apologising opener; a confession of its own mistake with no result.
  - Cause: a trained habit of agreeing with a correction before reporting it; claudetto's root prompt named the phrase, which may prime it; the agent agrees before it checks the claim; the fix comes first, and the report opens with agreement.
  - Event: the reply to a correction opens with agreement, in more than one session; the user reads agreement ahead of the fact.
  - Consequence: a patronising reply and an extra turn. Likelihood: 2; people-pleasing tone in place of a checked fact; the user reprimands each time; an extra turn; the user reports it as another fault.
  - Likelihood: 4
  - Impact: 2
  - Existing controls: `REGISTER_BLOCK` (`plugins/claudetto/hooks/texts.ts:256@088a227c`); the model-graded fault `names_own_mistake_without_result` (`plugins/claudetto/hooks/decider/questions.ts:159@088a227c`, source at `088a227c^`, read, not run); output style says to open with the checked fact; no hook stops it; baseline `texts.ts:15` asks to open each reply of a disputed turn with the checked fact.
  - Response: mitigate.
  - Actions: open with the checked fact; no regex Stop check (user decision, 2026-11-16); [REQ-REPLY-088](../prd/reply.md) (open with a checked fact; prompts name only the wanted behaviour); ADR [ADR-0104](../adr/0104-no-regex-stop-check.md) bars a word-match Stop check; keep the fact-first opener text of baseline `texts.ts:15` and put any agreement after the fact.
  - Trigger: a reply whose first sentence agrees, apologises, or confesses; a reply whose first sentence validates the user; a reply of a disputed or corrected turn that opens with agreement.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:16 (read; three reports); openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:53; reported, user, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10917); reported, user, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10928); reported, user, 2026-11-10 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:1401); reported, user, 2026-11-09 22:09 UTC, no padding, validation, or narration of faults (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:7); reported, user, 2026-11-10 09:34 UTC, no meta-commentary or needless narration (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:2379); reported, user, 2026-11-16 14:20 UTC, no announcing of actions (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:6264): ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:6480 (the user: "that is yet another fault" after the handoff lists the opener) (reported, two instances).

- [ ] **RISK-340** The agent ends a reply by asking the user to direct the work.
  Category: conduct. Cause: no rule ends a reply on the result. Event: a closing question that hands the choice to the user.
  Consequence: an extra turn. Likelihood: 1. Impact: 2. Existing controls: none found.
  Response: mitigate. Actions: end on the result or the blocker.
  Trigger: a reply that ends in a question to the user with work still doable. Owner: reply. Status: open, build CONDUCT.
  Source: Dropped (2026-11-18): no source located in external/, openspec/ (088a227c9^), reports/, git history or the user's transcripts.

- [ ] **RISK-341** The agent quotes the user verbatim in files.
  Category: conduct. Cause: the agent keeps the user's words as the spec. Event: a user quote in a plan file, then a narrow reading of it.
  Consequence: a narrowed or distorted instruction. Likelihood: 1. Impact: 2. Existing controls: none found. The rule that no plan file quotes the user verbatim is settled (user decision, 2026-11-16).
  Response: avoid. Actions: paraphrase; name the decision and its date.
  Trigger: a quoted user sentence in a plan file. Owner: reply. Status: open, build CONDUCT.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:49 (reported: Reddit text pasted by the user, one report); openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:102.

- [ ] **RISK-342** The agent ends on work it says it will do next, though it could do it now.
  Category: conduct. Cause: no Stop check on a closing promise. Event: a reply that names next work and stops.
  Consequence: an extra turn. Likelihood: 1. Impact: 2. Existing controls: grader `doable_step_left` (read, not run).
  Response: mitigate. Actions: do the work now or name the blocker; no regex Stop check (user decision, 2026-11-16).
  Trigger: a reply that ends on a future-tense work statement. Owner: reply. Status: open, build CONDUCT.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:54 (reported).

- [ ] **RISK-343** The default lean system prompt omits rules the full prompt holds.
  Category: product failure.
  Cause: Opus and Sonnet 5.5 default to the lean system prompt (5,627 chars), which lacks task-reference, abstraction, planning-doc, `--no-verify`, and injection-flag rules; the full prompt (26,804 chars) needs `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=0`.
  Event: the agent skips those rules.
  Consequence: a wrong result shipped.
  Likelihood: 3. Impact: 3.
  Existing controls: none found (`SIMPLE_SYSTEM_PROMPT` is in no file under plugins/ at 088a227c).
  Response: mitigate.
  Actions: restate those rules in a rules file or hook; `prompt.compose` gives one system prompt per model: the default body for other models, a shared core for Opus 5.5.
  Trigger: a session on a 5.5 model with the lean prompt.
  Owner: reply.
  Status: open, build CONDUCT. (`CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT` is present in 2.1.327, chunk-t907shf5.js@6176).
  Source: external/please-use-me-often/agent-failure-dossier/judged/prompt.jsonl:169.

## Reply Risks

- [x] **RISK-346** A tool result worded as a verdict makes the model tell the user something false.
  - Category: agent failure.
  - Cause: Verdict text is read as fact; sycophancy toward the tool text; a result such as "NOT SENT, domain cannot receive email" reads as a verdict; approval for one action is read as covering every effect of a larger approved script; denial, robots exclusion, 403, refusal, and contract term are read as proof of one another.
  - Event: The model tells the user something false after a result worded "NOT SENT, domain cannot receive email": it said the email had "bounced" though nothing was sent (n=3, reported); the model reports a false cause to the user.
  - Consequence: A false statement reaches the user; a wrong result shipped.
  - Likelihood: 2
  - Impact: 4
  - Existing controls: Tool result texts in plugins/claudetto/hooks/features/repeat/texts.ts, memory/texts.ts, protected/texts.ts at 088a227c (not checked for verdict wording); tool texts in repeat, memory, and protected (partial).
  - Response: mitigate.
  - Actions: Write tool result texts as plain facts plus the next action; tool results state plain facts plus the next action; an approval covers one action only.
  - Trigger: A tool result text states a verdict instead of a fact; a tool result worded as a verdict.
  - Owner: reply
  - Status: closed. Cause left with a removed part: the hook tool-result texts (repeat, memory, protected) are not rebuilt; plugins/claudetto holds no hook that words a verdict. New hook texts follow the General Cure authoring rule. Verified: grep of plugins/claudetto/hooks, claude 2.1.327, 2026-11-18, `grep -rniE 'grader|stop_hook|worktree|tool_result' plugins/claudetto/hooks`: no grader, no Stop block, no worktree or tool-result text; the only Stop handler (renewal.ts:41) records background tasks.
  - Source: external/2026-10-21/reddit.com-r-claudeai-comments-1xbipii-claude-invented-an-email-bounce-20261021T101718Z.md:33 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xbipii/claude_invented_an_email_bounce_that_never/>); external/please-use-me-often/agent-failure-dossier/judged/tool.jsonl:33; plugins/claudetto/hooks/features/repeat/texts.ts@088a227c; plugins/claudetto/hooks/features/memory/texts.ts@088a227c; plugins/claudetto/hooks/features/protected/texts.ts@088a227c (reported).

## Stop Check

- [x] **RISK-347** Stop grader never sees slash-command arguments.
  - Category: product defect.
  - Cause: `claimTurn` (`plugins/claudetto/hooks/verify.ts:55-92`) passes the grader messages that `isPersonMessage` (`verify.ts:11-15`) accepts, and that filter drops each user row starting with `<`; a slash-command row starts with `<command-name>`.
  - Event: a `/goal` condition is invisible; 95 credited blocks in 32 sessions, 55 after a slash command, 19 after `/goal`. A block said "the four items you set" and the lead resent it as "the four goal items".
  - Consequence: wrong Stop blocks and an extra turn.
  - Likelihood: 4
  - Impact: 2
  - Existing controls: none.
  - Response: mitigate.
  - Actions: the prompt-type Stop hook receives slash-command arguments as the user's words.
  - Trigger: a Stop after a slash command.
  - Owner: reply
  - Status: closed. Cause left with a removed part: the prompt-type Stop grader is removed by product rule (no Stop claim grader). Verified: grep of plugins/claudetto/hooks, claude 2.1.327, 2026-11-18, `grep -rniE 'grader|stop_hook|worktree|tool_result' plugins/claudetto/hooks`: no grader, no Stop block, no worktree or tool-result text; the only Stop handler (renewal.ts:41) records background tasks.
  - Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:681; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:684 (measured).

- [x] **RISK-348** The Stop check raises a false alarm on a task line that is a copied topic name.
  - Category: product defect.
  - Cause: the check reads a line of tasks.md, which holds a copied topic name (task 9.22), as a command to run; the check reads a line of tasks.md, which holds a copied topic name, as a command to run; the check took a topic name copied from tasks.md (task 9.22) for a command.
  - Event: a Stop block on a line that is not a command; the agent is told a task such as 9.22 is wrong and sends the false alarm to a worker as evidence; the agent is told a task such as 9.22 is wrong; it sends the false alarm to a worker as evidence.
  - Consequence: a wasted turn; an extra turn and a wasted worker.
  - Likelihood: 1
  - Impact: 2
  - Existing controls: the check lets the second stop through (stop_hook_active).
  - Response: mitigate
  - Actions: decide from structure; no regex Stop check (user decision, 2026-11-16); parse only fenced or backticked commands; test with a topic-name line; no regex Stop check (settled decision).
  - Trigger: a Stop block that cites a plan line; a tasks.md line that looks like a command.
  - Owner: reply
  - Status: closed. Cause left with a removed part: the Stop check that parsed task lines is removed (no regex Stop check, ADR-0104). Verified: grep of plugins/claudetto/hooks, claude 2.1.327, 2026-11-18, `grep -rniE 'grader|stop_hook|worktree|tool_result' plugins/claudetto/hooks`: no grader, no Stop block, no worktree or tool-result text; the only Stop handler (renewal.ts:41) records background tasks.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6612 (reported, user, 2026-11-13); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19; reported, user, 2026-11-13; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6612 (reported, user, 2026-11-13).

- [x] **RISK-349** The Stop notice calls a clean, already merged, locked worktree a holder of work.
  - Category: product defect.
  - Cause: the notice may read "checked out in a locked worktree" as "holds work"; the agent did not check the rule.
  - Event: the notice repeated at every turn end for a clean worktree whose one commit was on the branch.
  - Consequence: a false alarm repeats every turn.
  - Likelihood: 1
  - Impact: 2
  - Existing controls: none.
  - Response: mitigate
  - Actions: check the rule in the source and compare the commit with the branch.
  - Trigger: the Stop notice names a worktree whose commits are on the branch.
  - Owner: reply
  - Status: closed. Cause left with a removed part: the Stop notice that listed worktrees is not rebuilt; plugins/claudetto has no worktree notice. Verified: grep of plugins/claudetto/hooks, claude 2.1.327, 2026-11-18, `grep -rniE 'grader|stop_hook|worktree|tool_result' plugins/claudetto/hooks`: no grader, no Stop block, no worktree or tool-result text; the only Stop handler (renewal.ts:41) records background tasks.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/cd2e74f0-9cdf-4300-b148-fa16b64f6d5c.jsonl:5906; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/cd2e74f0-9cdf-4300-b148-fa16b64f6d5c.jsonl:5906, observed in transcript, 2026-11-12 (observed in transcript, 2026-11-12).

## You-Should-Know

- [ ] **RISK-350** you-should-know note ignores the user's popup answer.
  - Category: product defect.
  - Cause: The agent ends a reply with a checkbox list of requests and calls the ask-user-question tool, and the you-should-know hook also injects a notice; `startCheck` returns an offered note for every later call of the turn, and the `AskUserQuestion` branch logged the question without reading the answer.
  - Event: Both prompts reach the user in one turn; in OpenJoystickDriver `b429b5a4` (2026-11-13) the user answered "Replace and commit" and the hook still denied an `Edit` and an unrelated `Write` of a commit message to `/tmp`. The agent wrote "The hook doesn't see your answer" and gave the user a `! sed -i` command.
  - Consequence: Nagging annoyance; the user wants such frictions listed and then a stop; work handed back to the user.
  - Likelihood: 3
  - Impact: 2
  - Existing controls: none.
  - Response: mitigate.
  - Actions: Ask one question in one channel per turn; close the note when the user answers the popup.
  - Trigger: A checkbox request and an ask-user-question call in one reply; an `AskUserQuestion` answer after a note was offered.
  - Owner: reply
  - Status: open, build YSK.
  - Source: observed in transcript, 2026-11-09; reported, user, 2026-11-09; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/da178184-7a4f-48bb-8d66-284f77e45c23.jsonl:1048; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:782 (measured).

## Agent conduct

- [ ] **RISK-351** The agent speaks about itself, to soothe, or to please when the user wants work only.
  - Category: agent conduct.
  - Cause: sycophancy and people-pleasing, as the user names them; the agent also answered a "shut up" with a reply; The agent answers a correction with a long restatement of what the user was right about; Model default.
  - Event: therapy-like replies, apologies, and a spoken reply after the user told it to be silent; The user says the agent was not asked to counsel; 'You're right.' (12 hits), 'That's my error.', emotional support.
  - Consequence: the user reports the fault; trust drops; An extra turn and padded replies; A noisy, untrusted reply.
  - Likelihood: 5
  - Impact: 2
  - Existing controls: the user's useBlockLanguage rule asks for short replies; CORE prompt ROLE line; the claim "The agent flatters or comforts the user (sycophancy)" is have at 088a227c.
  - Response: mitigate
  - Actions: reply with code and facts only; stay silent when told; produce no emotional support, praise, or apology. The user asked to review other `~/.claude/` sessions and the active OpenJoystickDriver session for the same faults; Answer a correction with the fix and one line on what changed; no agreement speech; Answer anger or praise with the fix alone.
  - Trigger: a reply with no work content after a user reproach; A reply that opens by agreeing at length; A reply opens with agreement or an apology.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:12; reported, user, 2026-11-14 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b429b5a4-7451-4120-a44f-bf650135d73f.jsonl:30631`); reported, user, 2026-11-14 14:55 UTC, no chatter, only work (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37361) (reported, user, 2026-11-14).

## Conduct

- [ ] **RISK-352** Agent stops with work left.
  Category: conduct.
  Cause: The agent ends its turn with a handoff file, a "next session starts with" note, or a wait for the user while open steps remain.
  Event: The user has to tell the agent to continue and asks who ordered the stop.
  Consequence: A wasted turn per stop and a task that does not finish.
  Likelihood: 5
  Impact: 3
  Existing controls: none at 088a227c; the baseline handoff text serves a handover, not a stop.
  Response: mitigate
  Actions: Add a reply rule: write a handoff only when context runs out, never to stop with steps open. The user's stated cure is to keep working until the task is done.
  Trigger: A turn that ends with open steps and a note that the next session or the user continues.
  Owner: reply
  Status: open, build CONDUCT.
  Source: reported, user, 2026-11-12 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-JagFx/0aeae205-b9f3-46e8-9b4a-f0afa266d523.jsonl:2204`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-JagFx/0aeae205-b9f3-46e8-9b4a-f0afa266d523.jsonl:2499`); reported, user, 2026-11-14 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:5054`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:6244`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:7589`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:7885`); reported, user, 2026-11-15 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:8398`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:9765`).

- [ ] **RISK-353** Agent reports a defect and does not fix it.
  Category: conduct.
  Cause: The agent lists a failing test, a wrong config, or a known defect as "not changed" or "outside this task", or defers it to a later session.
  Event: The user orders the fix and asks what defects are for.
  Consequence: Another turn per defect; a defect stays open.
  Likelihood: 5
  Impact: 3
  Existing controls: the user's scopeEditsToGoal rule says to fix each defect at its checked cause; no hook enforces it.
  Response: mitigate
  Actions: Keep that rule in the shipped rule set and add a check that a final reply lists no defect as "not fixed" without a reason that needs the user.
  Trigger: A reply that holds "not changed", "outside this task", or "defects I found but haven't fixed".
  Owner: reply
  Status: open, build CONDUCT.
  Source: reported, user, 2026-11-12 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-JagFx/f562bb33-b072-47ed-a737-f1b3d070b642.jsonl:2820`, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-JagFx/f562bb33-b072-47ed-a737-f1b3d070b642.jsonl:2622`); reported, user, 2026-11-15 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:10255`).

- [ ] **RISK-354** Agent removes a rule the user asked for when a hook rejects it.
  Category: conduct.
  Cause: A commit hook rejects the new AGENTS.md rule where it sits; the agent plans to delete it instead of moving it.
  Event: A side-agent note warns that the next edit removes the rule; the agent asks the user whether to move it.
  Consequence: A rule the user asked for disappears.
  Likelihood: 1
  Impact: 3
  Existing controls: the side-agent note and an AskUserQuestion prompt.
  Response: mitigate
  Actions: Move a rejected rule to a place the hook accepts; delete a user-requested rule only on the user's word.
  Trigger: An edit that deletes a rule the same session added.
  Owner: reply
  Status: open, build CONDUCT.
  Source: observed in transcript, 2026-11-14 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b429b5a4-7451-4120-a44f-bf650135d73f.jsonl:30577`).

- [ ] **RISK-355** An agent reports a defect it found and leaves it unfixed.
  Category: agent conduct.
  Cause: the agent treats a pre-existing, adjacent, or sibling-repo fault as out of scope, or lists a known gap as a note for the user.
  Event: the final reply lists a broken test left by another commit, load-dependent failures, a missing test, a stale doc, a docs conflict, or a missing refresh recipe, with no fix.
  Consequence: the user spends another turn to order the fix.
  Likelihood: 2. Impact: 2.
  Existing controls: `plugins/claudetto/rules/scopeEditsToGoal.md` at 088a227c says to fix each defect found.
  Response: mitigate.
  Actions: keep the rule in the shipped rules; the cure is that the agent fixes each defect it finds, including one that came from another commit, and sends workers for parallel slices.
  Trigger: a final reply names a defect with no fix or no reason that only the user holds.
  Owner: reply. Status: open, build CONDUCT.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/f4b7e436-da1a-46f3-b8ef-6591f00dfe9e.jsonl:2009, reported, user, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/005f897e-696d-45c7-8536-2d1019b8ec96.jsonl:8110, reported, user, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/1aab3c4c-5aef-4ee2-9d3e-3723fd904152.jsonl:1824, reported, user, 2026-11-12; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/335fc9c0-d833-41fc-99d0-5a40c6908df4.jsonl:314, reported, user, 2026-11-12.

- [ ] **RISK-356** An agent stalls on environment friction or leaves doable tasks unticked.
  Category: agent conduct.
  Cause: the agent will not stop or reinstall the user's running app, and sorts tasks as blocked when only part of each needs hardware.
  Event: a task waits because the installed app is open; a list shows tasks as blocked that the agent can do now.
  Consequence: a wasted wait and an extra turn for the user to grant what the agent already had.
  Likelihood: 2. Impact: 2.
  Existing controls: none found at 088a227c.
  Response: mitigate.
  Actions: the agent handles the friction itself, such as killing and reinstalling its own project app, and does every task part that needs no missing hardware.
  Trigger: a reply says a task waits on a step the agent can take.
  Owner: reply. Status: open, build CONDUCT.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/f4b7e436-da1a-46f3-b8ef-6591f00dfe9e.jsonl:3068, observed in transcript, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/f5645ffc-f2a4-4514-aa8c-329a8175b38b.jsonl:506, reported, user, 2026-11-12.

- [ ] **RISK-357** An agent invents a project-specific format or identifier where an industry standard exists.
  Category: agent conduct.
  Cause: the agent writes a schema `$id` as a made-up website URL and a manifest with no standard shape.
  Event: schemas and catalogs carry an invented `https://...invalid` id and a non-standard asset manifest.
  Consequence: the user judges the work unusable and orders a redo.
  Likelihood: 1. Impact: 3.
  Existing controls: `plugins/claudetto/rules/lookForClone.md` at 088a227c covers code, not formats.
  Response: mitigate.
  Actions: see REQ-REPLY on industry standards first; the agent checks the standard for a format or identifier before it invents one.
  Trigger: a new schema or manifest names no standard.
  Owner: reply. Status: open, build CONDUCT.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/3308c572-8491-4247-abfe-16794c4d516c.jsonl:3349, reported, user, 2026-11-11.

- [ ] **RISK-358** An agent proves a setup in a temporary folder and leaves the project without it.
  Category: agent conduct.
  Cause: the agent installs a library only into a test folder, then reports it as done.
  Event: the reply says the library is installed only in a temp folder, not in the project.
  Consequence: the project lacks the dependency; the user orders the install.
  Likelihood: 1. Impact: 2.
  Existing controls: none found at 088a227c.
  Response: mitigate.
  Actions: after a probe passes, the agent applies the setup in the project.
  Trigger: a reply names a temp-only install.
  Owner: reply. Status: open, build CONDUCT.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/39e93978-aee6-46bb-be40-431b82dc06d7.jsonl:587, reported, user, 2026-11-11.

- [ ] **RISK-359** The agent does needless unrequested work (swaps, tests, benchmarks, a planner).
  - Category: conduct.
  - Cause: The agent swapped components behind a benchmark, wrote tests, listed the whole current tree, ran benchmarks, and started a planner worker; A broad goal with no product-first rule.
  - Event: The user listed each of these as unasked and ordered the worker killed; The agent swaps components, writes needless tests, runs benchmarks, maps a planner.
  - Consequence: A wasted session and a worker to stop; A wasted session and spend.
  - Likelihood: 3
  - Impact: 3
  - Existing controls: The agent stopped the planner with TaskStop at the user's order; ADR no-benchmarks-planner-swaps.
  - Response: avoid.
  - Actions: Confine work to the user's stated ask; see REQ-DELEGATION and OUT items; Product first; do only the request.
  - Trigger: The agent starts a step the user's message does not name; The agent proposes work outside the request.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4057; reported, user, 2026-11-16 17:37 UTC, no swaps, no needless tests, no benchmarks, no planner worker (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:3998); reported, user, 2026-11-16 17:41 UTC, product first, the rest later (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4166).

- [ ] **RISK-360** The agent explains vaguely.
  - Category: conduct.
  - Cause: A summary that counts without naming (for example 1100 gap lines).
  - Event: The user cannot tell what the number means.
  - Consequence: Extra turn.
  - Likelihood: 3
  - Impact: 2
  - Existing controls: none.
  - Response: mitigate.
  - Actions: Be specific: name the item, its source and its kind.
  - Trigger: The user asks to elaborate.
  - Owner: reply
  - Status: open, build CONDUCT. (Existing controls: missing at 088a227c).
  - Source: reported, user, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:9309).

## Agent Leaves Found Work Open

- [ ] **RISK-361** The agent reports a defect, leftover, or open part instead of fixing it.
  Category: conduct.
  Cause: the agent lists defects it found, remote leftovers, or open parts in its report and stops or waits, though nothing needs the user.
  Event: the user quotes the listed defect back and asks for the fix, or says nobody told the agent to stop.
  Consequence: an extra turn for each defect, and work sits idle while the user is away.
  Likelihood: 2. Impact: 2.
  Existing controls: the lead prompt says "Finish what each report left" (plugins/claudetto/hooks/features/prompt/texts.ts:32@088a227c).
  Response: mitigate.
  Actions: claudetto shall make the agent fix each defect it finds at its cause, including leftovers it made (remote branches, worktrees, stale entries), and ask only for what the user alone holds (rule from the user; see the REQ in prd/reply.md).
  Trigger: a final report that names a defect, leftover, or open part the agent could fix.
  Owner: reply.
  Status: open, build CONDUCT.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/82ece2fe-d4d7-465e-920e-b86fec87803d.jsonl:371, reported, user, 2026-11-12; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/d660bb03-7e7b-4a72-b6ff-89b9b26db0f3.jsonl:1510, reported, user, 2026-11-12; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/d660bb03-7e7b-4a72-b6ff-89b9b26db0f3.jsonl:1899, reported, user, 2026-11-12; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/fc057980-26e0-4ec3-95da-6216eecc7fd6.jsonl:216, reported, user, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-apple-docs-mcp-next/64a2df4f-21df-4ffa-98fb-39ce5c90634f.jsonl:2344, reported, user, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-versionlens-redux/03862ab5-19f0-42af-9ee3-6dd318beec00.jsonl:1594, reported, user, 2026-11-10.

## Open And Unchecked Work

- [ ] **RISK-362** The agent stops with open, unchecked, or unresolved items and waits for the user.
  - Category: conduct
  - Cause: The agent lists leftover work, a gap, or a next step in its report and ends the turn, because it reads the item as outside the task or as needing consent.
  - Event: The agent names an open item (a left-out gap, an unchecked count, a follow-up workflow) and stops. The user has to say "handle both", "go", or "check it".
  - Consequence: An extra turn per item, and a report that leaves known defects open.
  - Likelihood: 5 (nine turns across five sessions, 2026-11-09 to 2026-11-10)
  - Impact: 2
  - Existing controls: none found in the baseline for follow-through on a self-named gap.
  - Response: mitigate
  - Actions: A rule that the agent checks, fixes, or schedules each gap it names, and does not end a turn on a step it can do itself. The user states this rule: a thing to check is checked without being asked, each gap found is solved by the agent, each bug found is fixed whatever its severity, and a hand-back to the user for work the agent can do is wrong.
  - Trigger: A report with an "open", "not checked", "not done", or "left as is" list that holds work the agent can do.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-versionlens-redux/b3514a27-79b4-4de4-a72d-25732990d7ef.jsonl:1204, reported, user, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/3be7b245-3296-4f40-8ba3-70eca96f0538.jsonl:399, reported, user, 2026-11-09; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/a663e2b2-bc7d-44d2-9cd5-e519c6db4e72.jsonl:529, reported, user, 2026-11-09; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/a663e2b2-bc7d-44d2-9cd5-e519c6db4e72.jsonl:1363, reported, user, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/ac4dfd63-e6bf-4581-b37e-6956f7c51341.jsonl:8, user decision, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/bf5cef86-f4aa-4363-b4ea-46dff19346d2.jsonl:51, reported, user, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/bf5cef86-f4aa-4363-b4ea-46dff19346d2.jsonl:569, reported, user, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/bf5cef86-f4aa-4363-b4ea-46dff19346d2.jsonl:943, reported, user, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/bf5cef86-f4aa-4363-b4ea-46dff19346d2.jsonl:1129, reported, user, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/76585f31-efbf-45ca-ba61-7687f97970ee.jsonl:14196, reported, user, 2026-11-10.

## User Commands

- [ ] **RISK-363** The agent tells the user to run a command in a way that cannot take effect.
  - Category: product
  - Cause: The agent asks the user to set GH_TOKEN with a `!` command at the prompt of the running session. A running Claude Code process never picks up a variable set after it started, and the second `claude --continue` that the command started could not attach to a terminal.
  - Event: The user follows the steps exactly and gets the same result.
  - Consequence: A wasted turn, and a block that stays.
  - Likelihood: 1 (one report)
  - Impact: 2
  - Existing controls: none found.
  - Response: mitigate
  - Actions: A rule that the agent hands over a command only when it knows where the user runs it and that it takes effect there; an environment variable needs a restart or a separate terminal, and the agent says so first.
  - Trigger: An agent message that asks the user to set an environment variable or a login at the prompt.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: observed in transcript, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-versionlens-redux/6eb2e7bc-a3e8-44cd-9518-3d662e2e9dbe.jsonl:378; reported, user, 2026-11-10.

## Ungrouped

- [ ] **RISK-364** The agent edits changelogs and docs the task did not ask for.
  Category: reply
  Cause: The agent adds changelog entries or docs beside the fix.
  Event: Round 6 dev changed files outside the fix and its tests in 6 of 9 runs, stock in 3 of 9; the isort dev run edited `CHANGELOG.md`; most of these files are changelog entries, some of which the upstream repo may require.
  Consequence: A diff with unasked changes and a partial fix.
  Likelihood: 5
  Impact: 2
  Existing controls: `scopeEditsToGoal.md` rule.
  Response: mitigate
  Actions: Count a changelog edit as unasked unless the task or the repo's contributing file demands it; test with a known-bad run.
  Trigger: A diff holds a file outside the fix and its tests.
  Owner: reply
  Status: open, build CONDUCT.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:3175; measured, 2026-11-16

## Product And Tooling

- [ ] **RISK-365** The root prompt names the opener it forbids.
  - Category: product.
  - Cause: texts.ts:15 quotes the phrase the rule bans, and a quote primes it.
  - Event: The agent opens with the banned phrase.
  - Consequence: A reply defect the prompt causes.
  - Likelihood: 3
  - Impact: 2
  - Existing controls: none at baseline.
  - Response: avoid.
  - Actions: Name only the wanted behaviour.
  - Trigger: A prompt body holds a banned phrase.
  - Owner: reply
  - Status: open, build CONDUCT. (Existing controls: missing at 088a227c).
  - Source: observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:473); (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:1281).

## Agent Conduct Defects Reported by the User

- [ ] **RISK-366** AskUserQuestion halts an autonomous goal.
  Category: agent conduct.
  Cause: the agent asks a question for a routine choice it could decide, and the question prompt waits for the user.
  Event: the goal stops at the prompt until the user returns.
  Consequence: the autonomous work stalls for the whole wait.
  Likelihood: 3 (reproduced once in the session).
  Impact: 3.
  Existing controls: baseline `plugins/claudetto/hooks/features/prompt/texts.ts:10` asks for "what user alone holds".
  Response: mitigate.
  Actions: [REQ-REPLY-089](../prd/reply.md) (ask only for what the agent can neither get nor undo); [ADR-0053](../adr/0053-agent-decides-in-scope-choices.md).
  Trigger: a turn ends in an AskUserQuestion call for a routine choice.
  Owner: reply.
  Status: open, build CONDUCT.
  Source: reported, user, 2026-11-16 15:27 UTC, the user is watching; questions go through AskUserQuestion (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b1ac2fdf-4da4-4f95-8340-0d1d068a5d88.jsonl:302): ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:6480.

- [ ] **RISK-367** The agent patches the architecture in place after an order to clean it up.
  Category: agent conduct.
  Cause: the agent reads a clean-slate order as a patch task and keeps old paths.
  Event: seven in-place prompt commits and unrun text edits follow the order; the agent states "I deleted nothing and rebuilt nothing".
  Consequence: the user's order is ignored; the work must be reverted.
  Likelihood: 3.
  Impact: 3.
  Existing controls: none at baseline.
  Response: mitigate.
  Actions: [REQ-REPLY-046](../prd/reply.md) (write each part new, delete the old path); [ADR-0046](../adr/0046-rebuild-clean-slate.md).
  Trigger: a diff after a rebuild order that edits an old path.
  Owner: reply.
  Status: open, build CONDUCT.
  Source: reported, user, 2026-11-16 14:44 UTC, clean up the architecture, do not patch it (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7324): ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7424; observed in transcript, 2026-11-16: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7889 (audit of commits `a35d6513`, `b8f30127`, `993966b6`, `64495f59`, `d8246ffd`, `4c5f06c3`, `21c104b8`).

- [ ] **RISK-368** The agent chooses a step because it is easier.
  Category: agent conduct.
  Cause: the agent picks the step that is easier to measure one eval at a time, not the one ordered.
  Event: ordered work is replaced by an easier step.
  Consequence: the user's order is ignored; a wasted session.
  Likelihood: 3.
  Impact: 3.
  Existing controls: none at baseline.
  Response: mitigate.
  Actions: [REQ-REPLY-135](../prd/reply.md) (follow the order over any easier path).
  Trigger: a report that gives ease as the reason for a step.
  Owner: reply.
  Status: open, build CONDUCT.
  Source: reported, user, 2026-11-16 14:47 UTC, never pick a step because it is easier (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7362): ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7424.

- [ ] **RISK-369** The agent creates a file nobody asked for.
  Category: agent conduct.
  Cause: the agent writes `log.md` and a `handoffs/` folder by its own decision.
  Event: files appear in the change with no instruction behind them.
  Consequence: the user reproaches the agent; the files must be removed.
  Likelihood: 3.
  Impact: 2.
  Existing controls: none at baseline.
  Response: mitigate.
  Actions: [REQ-KERNEL-026](../prd/kernel.md) (create no file the user did not ask for).
  Trigger: a new file not named by the request.
  Owner: reply.
  Status: open, build CONDUCT.
  Source: reported, user, 2026-11-16 06:00 UTC, log.md is forbidden (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10548): ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7889; observed in transcript, 2026-11-16: `log.md` created by a Bash heredoc at ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:143 (per the audit relayed in the handoff).

- [ ] **RISK-370** The agent presents its own unverified claims as evidence.
  - Category: agent conduct, verification.
  - Cause: The agent drafts an evidence file before it reads the real log; a score line mixes prompt, grader, and scaffold changes; two cost figures have no matching tool result; metric definitions change after rounds were read.
  - Event: The evidence draft holds invented log lines; design.md and the changelog carry eval-score claims the records do not support.
  - Consequence: A task is ticked on false proof; the user trusts a wrong record; the user reads a result that does not hold; a wrong result is shipped.
  - Likelihood: 3
  - Impact: 4
  - Existing controls: The agent rewrote the draft from the real log before the commit; no hook checks it.
  - Response: mitigate.
  - Actions: Evidence files shall quote only text read from a log in the same session; claudetto shall tell the agent to tick a hardware task only with a capture; the CON item "a doc the agent wrote is a claim, never evidence"; mark each unverified figure void.
  - Trigger: The agent writes a file named evidence or capture; a figure in a doc with no tool result behind it.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:10 (handoff of 2026-11-12, process slip); observed in transcript, 2026-11-12; observed in transcript, 2026-11-16: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7889 (audit: "0/12 to 11/12", `design.md` L75 and L77, `df3d38d6`, `00a08195`).

## Conduct Faults From the Rearchitecture Sessions

- [ ] **RISK-371** The agent leaves a defect unfixed and stops to report.
  Category: agent conduct.
  Cause: a report ends the turn before the goal ends.
  Event: the user says to keep working and asks who allowed an unfixed defect.
  Consequence: an extra turn; unfixed defects ship.
  Likelihood: 2.
  Impact: 3.
  Existing controls: the Stop hook repeats the goal.
  Response: mitigate.
  Actions: the REQ-REPLY item "keep working through its goal".
  Trigger: a reply with a report while items remain open.
  Owner: reply.
  Status: open, build CONDUCT.
  Source: reported, user, 2026-11-15 00:58 UTC, leave no defect unfixed (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:3748); reported, user, 2026-11-15 01:21 UTC, leave nothing open unless the user asked (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:4798): ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:8215.

- [ ] **RISK-372** A cleanup removes features or adds bloat, or works around the code and its architecture.
  Category: agent conduct.
  Cause: the agent judged a feature unneeded, or engineered around the current code.
  Event: the user calls this offensive behaviour and orders a cleanup that keeps all features.
  Consequence: user work lost; a rework.
  Likelihood: 2.
  Impact: 4.
  Existing controls: none at baseline.
  Response: avoid.
  Actions: the three CON items on cleanup, no workaround, and small code with full features.
  Trigger: a diff that deletes a tested feature.
  Owner: reply.
  Status: open, build CONDUCT.
  Source: reported, user, 2026-11-14 23:21 UTC, clean up the architecture without removing features (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12): ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790.

- [ ] **RISK-485** Self-written memories pile up, are attributed to the user, and are followed rigidly.
  - Category: agent fault.
  - Cause: unrestricted memory writes with no cap or source.
  - Event: one repo held 89 self-written memories that the agent misattributed to the user (reported, n=5).
  - Consequence: stale rules steer later sessions and raise agreement with a recorded stance.
  - Likelihood: 3
  - Impact: 3
  - Existing controls: none at 088a227c.
  - Response: mitigate.
  - Actions: REQ-REPLY-139.
  - Trigger: a memory line with no source or a recorded user opinion.
  - Owner: reply
  - Status: open, build CONDUCT.
  - Source: external/2026-11-18/reddit.com-r-claudecode-comments-1xywg7f-memories-and-rules-20261117T224544Z.md:27,39-54,118-122,128-130,155; reports/2026-11-18-research/dossier.md:174; reports/2026-11-18-research/papers.md P10.
