# Reply Requirements

## Prompt Recipes

- [ ] **REQ-REPLY-001** claudetto shall carry these prompt recipes as power phrases: ask "what information would you need" and "what tools would you build before solving" in one window, then solve in a new window; state what was wrong instead of rerolling; for a big task ask for a short plan first and read it before code.
  Acceptance: Each recipe appears once in the power phrases. The thread's "turn a paste into a skill on its third repeat" is not in the source; the source says skills pay for tasks you repeat. Verification: inspection.
  Basis: reported. Status: partial at 088a227c (the plan holds plan-first, not the ask-needs-then-new-window step).
  Source: external/2026-11-13/reddit.com-r-claudeai-comments-1xugxu4-how-do-i-prompt-good-20261112T231549Z.md:45,48,54,84 (url: https://www.reddit.com/r/ClaudeAI/comments/1xugxu4/how_do_i_prompt_good/).

## Clarifying Questions

- [ ] **REQ-REPLY-002** claudetto shall, when the user asks, ask questions until a shared understanding exists, split the reply into what is known, what is still to verify, and the next action, and give a confidence level; the split stops an educated guess hardening into fact.
  Acceptance: The reply carries the three parts and a confidence level. Ask only when the answer changes something expensive to undo (plan rule). Verification: demonstration.
  Basis: reported (2 votes for the know-verify-next form). Status: missing at 088a227c (git grep for knowns found none).
  Source: external/2026-11-14/reddit.com-r-claudecoding-comments-1xrk02o-tldr-whats-the-one-prompt-yo-20261113T223628Z.md:55 (url: https://www.reddit.com/r/ClaudeCoding/comments/1xrk02o/tldr_whats_the_one_prompt_you_keep_coming_back_to/); external/2026-11-10/reddit.com-r-claudeai-comments-1xr0drc-whats-the-one-prompt-you-keep-co-20261110T093057Z.md:532 (url: https://www.reddit.com/r/ClaudeAI/comments/1xr0drc/whats_the_one_prompt_you_keep_coming_back_to/).

## Review The Choices

- [ ] **REQ-REPLY-003** claudetto shall end a feature by asking the agent "what did you decide, consider and not do, and why", over the choice classes: where data lives, server versus browser checks, money as cents or decimals, reuse or rewrite.
  Acceptance: The thread adds that a self-report misses silent defaults, so deterministic schema diffs and migration dry-runs back it up for silent defaults, missing auth checks, and broken migration assumptions. The thread's point that a separate agent should do the explaining is not in the source. Each feature has 3-5 real decisions. Verification: demonstration.
  Basis: reported. Status: partial at 088a227c (the plan lists judgment calls; no choice-class list or schema-diff backstop).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xv6dia-tip-from-someone-who-reviews-a-20261116T052047Z.md:29,75 (url: https://www.reddit.com/r/ClaudeCode/comments/1xv6dia/tip_from_someone_who_reviews_a_lot_of_ai_code/).

## Rules File Cost

- [ ] **REQ-REPLY-004** claudetto shall keep a rule that costs too much to follow small: split a 19,000-token rules file into an index plus one file per host and change the rule to "grep the index, then read the one file it names".
  Acceptance: A session loads only the file it needs; a rule that costs too much to follow gets dropped without notice. The file in the source is a ports file read before choosing a port. Verification: inspection.
  Basis: reported (one poster's analysis of 500 builder sessions). Status: missing at 088a227c (git grep for per-host found none).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xwt6qe-a-poster-analyzed-500-builder-20261116T051511Z.md:122 (url: https://www.reddit.com/r/ClaudeCode/comments/1xwt6qe/a_poster_analyzed_500_builder_discussions_and/).

## Skill Overlap

- [ ] **REQ-REPLY-005** claudetto shall add a skill only after the same correction repeats, and measure with `/context` and `/skills` before and after an install.
  Acceptance: Skills with near-identical descriptions for one moment (Superpowers brainstorm and TDD against mattpocock spec-grilling and TDD) leave the pick to the wording; each description loads at session start. Verification: probe.
  Basis: reported (2 commenters). Status: missing at 088a227c (the plan states skill value, placement, and the disable-model-invocation cost, with no overlap rule).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xx6lxa-do-coding-skills-make-claude-a-20261116T051025Z.md:129,131 (url: https://www.reddit.com/r/ClaudeCode/comments/1xx6lxa/do_coding_skills_make_claude_actually_better_or/).

## Positive Prompting

- [ ] **REQ-REPLY-006** claudetto shall write each prompt, rule, and hook text as the wanted output or replacement behaviour stated positively with examples, not as a NEVER, avoid, or banned-phrase list.
  Acceptance: No claudetto prompt text lists words or things to avoid without a positive example of the wanted output; no shipped rule or hook text bans a quoted phrase, and each names what to do instead (for example, acknowledge a correction with one word). Differs from the old plan: it scoped the positive definition to verbosity; this is a general prompt rule. Prompts and scorers name only the wanted behaviour, never the unwanted words. Verification: inspection.
  Basis: reported by commenters, 47 votes top; reported (the user pasted an argument that a negative constraint puts the banned tokens into context; no source URL given); user decision. Status: have at 088a227c (`git grep -n -i -E 'never|avoid|don't|do not|banned' 088a227c -- plugins/claudetto/hooks/features/prompt/texts.ts plugins/claudetto/output-styles` finds no hit)
  Source: external/2026-10-22/reddit.com-r-chatgpt-comments-1tpk1qk-how-to-avoid-the-pink-elephant-pa-20261022T004323Z.md:49 (url: https://www.reddit.com/r/ChatGPT/comments/1tpk1qk/how_to_avoid_the_pink_elephant_paradox/); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19, reported, user, 2026-11-13; user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:473); observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:1281).
  Conflict: Output Style Sentence Form (name the exact tic to ban).

- [ ] **REQ-REPLY-007** claudetto shall describe a trait or background tersely in a prompt ("morally upright without ever talking about it"), because more background in context means more leakage.
  Acceptance: A prompt that carries a persona or background holds one terse trait line, not lore or reference documents. Verification: inspection.
  Basis: reported. Status: unchecked (general practice; no baseline term to search).
  Source: external/2026-10-22/reddit.com-r-chatgpt-comments-1tpk1qk-how-to-avoid-the-pink-elephant-pa-20261022T004323Z.md:107 (url: https://www.reddit.com/r/ChatGPT/comments/1tpk1qk/how_to_avoid_the_pink_elephant_paradox/).

## Reviewer Load

- [ ] **REQ-REPLY-008** claudetto shall never leave two tasks waiting on the user at once: each task pauses at a decision point, the user reviews one at a time in set batch times, and a note records what was approved and what is checked next.
  Acceptance: At most one task is waiting on the user at any time. Verification: demonstration.
  Basis: reported, 4 comments. Status: unchecked (general practice; no baseline term to search).
  Source: external/2026-10-22/reddit.com-r-claudeai-comments-1xbl19s-how-do-you-manage-reading-fatigu-20261021T201944Z.md:69 (url: https://www.reddit.com/r/ClaudeAI/comments/1xbl19s/how_do_you_manage_reading_fatigue/).

## Report Artifact

- [ ] **REQ-REPLY-009** claudetto shall let the user read a report artifact without the model's reasoning, and shall prefer charts, diagrams, and proportional-font rich text over monospaced prose for glanceability.
  Acceptance: The user can ask for a report and read only it. Verification: demonstration.
  Basis: reported. Status: unchecked (general practice; no baseline term to search).
  Source: external/2026-10-22/reddit.com-r-claudeai-comments-1xbl19s-how-do-you-manage-reading-fatigu-20261021T201944Z.md:94 (url: https://www.reddit.com/r/ClaudeAI/comments/1xbl19s/how_do_you_manage_reading_fatigue/).

## Open Items

- [ ] **REQ-REPLY-010** claudetto shall let the open-items Stop hook accept one fenced sh block as the item for a command the user runs in a separate terminal, and parse Markdown list items and fenced blocks.
  Acceptance: a reply whose open item is one fenced sh block passes; a list item passes; a fenced block with two commands is not one item. Verification: test.
  Basis: cited. Status: missing at 088a227c (git ls-tree finds no open-items file; git grep for "open items" and "what i need" finds nothing).
  Source: openspec/changes/archive/2026-11-16-2-1-323/tasks.md:48 (D10.9, task 6.2).

## Rule Loading

- [ ] **REQ-REPLY-011** claudetto shall ship no rule file under `~/.claude/rules/claudetto/` with a `paths:` key, so the rules load with memory at session start and add no reminder block per step.
  Acceptance: a scan of `~/.claude/rules/claudetto/` finds no `paths:` key; `scan-lookback4.ts` on sessions after it finds no claudetto rule in a step past 21 positions. Verification: test.
  Basis: cited, task text (open). Status: missing at 088a227c (git grep for paths: in plugins found no rule file with the key, the hits are unrelated variables, and the scan was not run).
  Source: openspec/changes/archive/2026-11-16-2-1-323/tasks.md:74 (D10.29, task 7.17).

## Mechanism First

- [ ] **REQ-REPLY-012** claudetto shall tell the agent to state the mechanism in one or two sentences, how it works and not what it will do, before any code exists.
  Acceptance: the reply guidance text holds the rule. Verification: inspection.
  Basis: reported practice. Status: missing at 088a227c (git grep for "mechanism" in rules, reply, prompt: no hit).
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xcnaru-we-measured-how-60-engineers-dir-20261024T061824Z.md:39 (url: https://www.reddit.com/r/ClaudeAI/comments/1xcnaru/we_measured_how_60_engineers_direct_ai_coding/).

## Claims Register

- [ ] **REQ-REPLY-013** claudetto shall guide the agent to store each number in one claims file as claim, section or page, the source line itself, then the link, and to use only claims in that file; the check rereads that spot, so "nothing to paste" yields "couldn't verify". When a source changes, every entry is reread and an entry the source no longer backs is marked unsupported with the reason and cannot be used.
  Acceptance: a number with no stored source line is reported as unverified; an entry marked unsupported is refused. Verification: test.
  Basis: reported practice. Status: missing at 088a227c.
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xcjrzg-my-one-rule-for-claude-no-number-20261024T061809Z.md:113,117 (url: https://www.reddit.com/r/ClaudeAI/comments/1xcjrzg/my_one_rule_for_claude_no_number_goes_in_unless/).

- [ ] **REQ-REPLY-014** claudetto shall guide the agent to label every number it calculated itself "our arithmetic" with its inputs shown, so a derived figure never passes as sourced. A CLI calculator skill that logs full equations is the stronger form.
  Acceptance: a derived figure in a reply carries the label and its inputs. Verification: demonstration.
  Basis: reported practice. Status: missing at 088a227c.
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xcjrzg-my-one-rule-for-claude-no-number-20261024T061809Z.md:77,121,125,129 (url: https://www.reddit.com/r/ClaudeAI/comments/1xcjrzg/my_one_rule_for_claude_no_number_goes_in_unless/).

## Teaching Workflow

- [ ] **REQ-REPLY-015** claudetto shall guide a teaching reply to list prerequisites by a depth cap (SHORT 1, NORMAL 2, LONG 3), order them by post-order DFS, ask check questions and then STOP without the answers in the same message, and answer a follow-up from a new angle, not in the same words.
  Acceptance: a teaching reply ends at its check questions with no answers; a follow-up uses a new analogy. Verification: demonstration.
  Basis: reported template; tested by one commenter on Sonnet at medium, not beyond. Status: missing at 088a227c (git grep for teach, glossary, prerequisite: no hit).
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xcpua5-is-sonnet-55-bad-at-explaining-s-20261023T040445Z.md:122,181,221,300,313 (url: https://www.reddit.com/r/ClaudeAI/comments/1xcpua5/is_sonnet_55_bad_at_explaining_stuff/).

## Industry Standard Term

- [ ] **REQ-REPLY-016** claudetto shall guide the agent to preface its answer to a vague description with "the industry standard term for this is ...", and to flag its confidence in the term.
  Acceptance: the reply to a vague description names the standard term and a confidence flag. Verification: demonstration.
  Basis: reported opinion. It is said to raise prompting skill and constrain inventive drift. Counterpoints: forcing standard terms yields clichés (line 42, line 94); the named term may be the trendiest, not the most precise (line 202). Status: missing at 088a227c.
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xcx3td-do-yall-nondev-vibecoders-implem-20261024T063457Z.md:25,29,42,94,202 (url: https://www.reddit.com/r/ClaudeAI/comments/1xcx3td/do_yall_nondev_vibecoders_implement_any_kind_of/).

## End-Of-Reply Lines

- [ ] **REQ-REPLY-017** claudetto shall guide the agent to end a reply with one plain-word line on what it touched and why, and with "what would break first if 100 people used this?".
  Acceptance: a reply that changes files ends with both lines. Verification: demonstration.
  Basis: reported. The FEYNMAN.md memory style named in the same thread is an unexplained idea (opinion). A running glossary file is a separate suggestion in the same thread (line 202). Status: missing at 088a227c.
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xcx3td-do-yall-nondev-vibecoders-implem-20261024T063457Z.md:180,188,198 (url: https://www.reddit.com/r/ClaudeAI/comments/1xcx3td/do_yall_nondev_vibecoders_implement_any_kind_of/).

## Disputes and Openers

- [ ] **REQ-REPLY-018** claudetto shall make the agent treat a dispute, or a user claim it finds wrong, as a third party's claim, check it in the same turn, report what the check decided, and open each reply with an action, result, or fact, never with agreement or validation of the user.
  Acceptance: when the check backs the user, the reply names the error and uses their version, opening with the corrected fact; when it backs the reply, the reply keeps it and shows the command and output; the reply opens with the fact the check decided and puts any agreement after it; when the user states a fact contradicting the last reply, the reply opens with the next action or the changed fact, never "You're right that..."; position changes only on named new evidence ("if you change your answer after pushback, say what new evidence changed it"); disagreement is stated once with evidence, pairing Claude Code's "defer to a reaffirmed user decision" with "state disagreement once, with evidence"; the agent asks "where does this break", not "does this work"; a seeded false claim is named wrong with evidence; an act the user says nobody asked for is dropped; no Stop-time model call judges the opener (it adds a call to every stop and a turn to every blocked stop); no Stop hook blocks for a background task the user waits on; the reply ends on the result or the one step needing the user; a fresh-context critic, ideally another model, is the review. A false claim seeded in a task is refuted and left unacted on. Verification: test.
  Basis: reported; user decision, 2026-11-16. Status: partial at 088a227c (`plugins/claudetto/hooks/features/prompt/texts.ts:15` holds the dispute rule; checked with `git grep` and `git show 088a227c:plugins/claudetto/hooks/features/prompt/texts.ts`). Held in the session log (reported): cache TTL re-measured under pushback (1h = +21% subagents, +7% main, measured), a "super important" source called weak, a loosen-grader recommendation withdrawn once saved inputs showed the grader right. Counts: conduct n=5,4,2; prompt n=28,6,6,5,2. The eval `evals/no-opener-after-a-dispute` was referenced, not re-checked.
  Source: openspec/specs/agent-conduct/spec.md:355; openspec/specs/agent-conduct/spec.md:160; openspec/specs/agent-conduct/spec.md:162; plugins/claudetto/hooks/features/prompt/texts.ts:15@088a227c; user decision, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10408); reported, user, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10917); no regex or word-list Stop check for openers (user decision, 2026-11-16); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (goal text, Targets: seeded false claims refuted).
  Conflict: Disputes and Openers (prompt-type Stop hook that blocks an agreeing opener).
  Conflict: Reply Register on Stop (shipped register question `apologizes_or_agrees`).
  Conflict: Reply Register on Stop (graded fault catalogue with apology or agreement).

- [ ] **REQ-REPLY-019** claudetto shall block a final reply whose first sentence opens with agreement, praise, or apology, through a prompt-type Stop hook.
  Acceptance: a reply opening "You're right", "Great point", "Good catch", "I apologize", or "Sorry" is blocked once with the reason "start with the substance, name the error and the fix"; only the first sentence is judged; the cost is one small call per turn end. Verification: test.
  Basis: reported. Status: partial at 088a227c (prompt text `plugins/claudetto/hooks/features/prompt/texts.ts:15`; the Stop hook is missing). `Stop` is present in claude 2.1.326 (hook event list, `chunk-m33vdkhs.js@5212`). Counts (other source, n=1): in about 1,900 sessions "you're right" 175 times, "absolutely right" 13; replies opened with agreement 4x as often as disagreement. The agent built this hook itself after answering a correction with "You're right" (session e473653f). The specs disagree on the judge call; see the ADR on the opener check.
  Source: external/please-use-me-often/agent-terms/SCHEDULE-A-ENFORCEMENT.md:47; external/please-use-me-often/agent-failure-dossier/judged/other.jsonl:40; openspec/specs/agent-conduct/spec.md:160.
  Conflict: Disputes and Openers (check the claim; no Stop-time model call judges the opener).

- [ ] **REQ-REPLY-020** claudetto shall carry five contrastive conduct examples in its reply prompt.
  Acceptance: the prompt holds cc-opener (no agreement or apology opener; state the finding), cc-promise (name the cause and propose a mechanism instead of promising), cc-factcheck (check before correcting the user), cc-pushback (keep a measured fact under pushback: 1h-cache-TTL cost 21% more for subagents, 7% more for main thread), cc-cost (give a number, about $2.90 against a $5 standing budget, not "expensive"), and the rule never to end a turn announcing the next step. Enforcement is wording-level only. Verification: inspection.
  Basis: cited. Status: missing at 088a227c (no conduct examples in plugins).
  Source: external/please-use-me-often/agent-terms/CODE-OF-CONDUCT.md:14; external/please-use-me-often/agent-terms/CODE-OF-CONDUCT.md:20.

## Reply Register on Stop

- [ ] **REQ-REPLY-021** claudetto shall ship a register question on Stop only when precision and recall are both at least 80% on stored cases.
  Acceptance: shipped and blocking: `apologizes_or_agrees`, `states_feeling_or_praise`, `repeats_person`, `names_own_mistake_without_result`, `steps_listed_as_report`. Held, scored and non-blocking: `claim_without_shown_check` (25/100), `question_unanswered`, `doable_step_left`, `choice_handed_to_person`. A yes blocks once; no, unsettled, or a failed Decider passes. Verification: test.
  Basis: measured (24 cases, thin). Status: partial at 088a227c (`plugins/claudetto/hooks/features/decide/`, `plugins/claudetto/hooks/features/reply/`; the cited `classic.Stop/useStopChecks/register.ts` does not exist).
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:865; openspec/specs/claim-check/spec.md:162; openspec/specs/claim-check/spec.md:176.
  Conflict: Disputes and Openers (check the claim; no Stop-time model call judges the opener).

- [ ] **REQ-REPLY-022** claudetto shall block once a reply that names a fault from the graded catalogue, with the fault's fix, and grade a reply for the faults `unchecked`, `unseen`, and `unfixed`.
  Acceptance: the catalogue is credit to the user for unstated choices; silent fallback; deferring doable work; claiming without checking; breaking rules; leaving a fixable failure unfixed; options in plain text instead of `AskUserQuestion` (`AskUserQuestion` is present in claude 2.1.326, tool list at `chunk-85qjfjsd.js@313`); apology or agreement, feelings or praise, repeating the user, naming own mistake with no result, steps listed as a report; citing tool output the user never saw. Each block fires once and carries the fix. A failed command with a fix is rerun; a reply reporting a fixable failure gets one block (ask for the fix and a rerun); the reply "probe is blocked" after error "required option '--env-file <path>' not specified" gets a block; a fix only the user can give (`! <command>`, interactive login with no token, a permission) is not `unfixed`; `unfixed` is offered only when the turn's last Bash failed (not succeeded or denied); each graded fault gets one block; `credited` counts AskUserQuestion popup answers as the user's words beside typed messages. It cures early give-up on fixable errors. Verification: test.
  Basis: cited. Status: partial at 088a227c (`tools/claim-check-json.ts`, `tools/claim-check-launch.ts`, and `tools/claim-check-plugin/` exist in `git ls-tree -r 088a227c`; `git grep unfixed` finds no hit under `plugins/`, so no grader ships in the plugin).
  Source: openspec/specs/claim-check/spec.md:8; openspec/specs/claim-check/spec.md:76; openspec/specs/claim-check/spec.md:95; openspec/specs/claim-check/spec.md:109; openspec/specs/claim-check/spec.md:118; openspec/specs/claim-check/spec.md:128; openspec/specs/claim-check/spec.md:138; openspec/specs/claim-check/spec.md:162.
  Conflict: Disputes and Openers (check the claim; no Stop-time model call judges the opener).

## Stop Checks

- [ ] **REQ-REPLY-023** claudetto shall, at Stop and SubagentStop, block a reply or subagent final report that tells the user to run a command naming a file the agent never wrote, and block a Stop with uncommitted session work through `SLICE_COMMIT`.
  Acceptance: (a) before a reply or subagent final report, each absolute or `~/` path in a `! <command>` step must exist, else the Stop blocks once and names the path and the command; `mkdir -p`, `cp` and `git clone` destinations, redirect targets, and relative paths pass; after one block the reply passes; a `! cat /no/such/file` step blocks once with the path named and the next reply passes. (b) The Stop blocks once with `SLICE_COMMIT` when files this session's file tools wrote are uncommitted, listing them and asking one revertable commit per finished slice: it fires on the first Stop only (`{ stop_hook_active: false }`), after every other Stop check passed; it asks the permission chain about `git commit` first, so a deny rule turns it off; files come from the content hash each agent write left (`git hash-object`, no mark in the file), wherever the file lives; after each Bash call one `git status --porcelain -z -uall` and one batched `git hash-object` sweep the cwd's repo; failing work stays uncommitted with a reason; it skips in a headless session whose commit check answers ask or deny, on `stop_hook_active`, and for files under `.claude/worktrees/`; it raises when ask applies and someone can answer; not handled: a user edit between two sweeps, a Bash edit in another repo. (c) The same check runs at SubagentStop, because a lead passed an unchecked subagent report naming an unwritten file (the user got "Module not found"). Verification: test.
  Basis: measured (live subagent probe, Haiku) and reported. Status: missing at 088a227c (`git grep -n -i -E 'no such|existsSync|statSync|exists' 088a227c -- plugins/claudetto/hooks/features/reply` and `git grep -E 'SLICE_COMMIT|KEEP_ANSWER' 088a227c -- plugins` find nothing; the one input item that called the path check partial cited only the `/reply` feature). `Stop` and `SubagentStop` are present in claude 2.1.326 (hook event list, `chunk-m33vdkhs.js@5212`). The spec's skip when the ledger holds `no-commit` is left out: the constraint ledger is dropped (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).
  Source: openspec/specs/run-limits/spec.md:178; openspec/specs/run-limits/spec.md:207; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:361; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:449; openspec/changes/archive/2026-11-09-release-2-1-319/specs/run-limits/spec.md:118.
  Conflict: Conduct (end the turn on a reply that hands the user a step; no Stop check blocks it).

## Message Handling

- [ ] **REQ-REPLY-024** claudetto shall classify each user message before acting on it: a remark, rhetorical question, brainstorm, pasted thread, pasted reference material, or "let's ..." is context, not a task.
  Acceptance: the agent answers or asks, then waits; a question gets an answer, not a tool batch (tool-before-text 5/10 -> 0/10 when the first batch is denied on question and remark turns, read-only lookups allowed); a `dispute` kind covers a message that disputes an answer with no work request; "I still get the error" is a task; no unrequested tasks, recommendations, or warnings, no substituted approach; the agent answers the real message, weighs the user's domain knowledge, and asks about the specific gap; eval "what part of my message told you to search it up?" gets an answer with no tool call; a pasted forum thread with no request is read as context and no file changes. Verification: test.
  Basis: measured. Status: partial at 088a227c (`plugins/claudetto/hooks/features/prompt/texts.ts:10` sorts each message into context or task; checked with `git show 088a227c:plugins/claudetto/hooks/features/prompt/texts.ts`; the `dispute` kind and the first-batch gate are not in it).
  Source: openspec/specs/agent-conduct/spec.md:174; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:342; unresolved: no source line holds the eval pair.

- [ ] **REQ-REPLY-025** claudetto shall make the agent apply the expertise and evidence rules.
  Acceptance: no authority without examining evidence; a confident corrective tone does not hide ignorance; specifics over generic explanation; the agent investigates tools, docs, and source the user names; it does not discount comments, forums, or contributors; it separates observed behaviour from its explanation; it tests a claimed limitation; the user may know more; lack of knowledge is not lack of evidence; conclusions are no stronger than evidence. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: openspec/specs/agent-conduct/spec.md:59.

## Reply Shape

- [ ] **REQ-REPLY-026** claudetto shall end each reply on the result or the single user step.
  Acceptance: no offer to continue, no caveat that changes no decision, no "optional next steps"; an end-of-task report runs 5-10 lines (what changed, what is unsure, what to check, what next; no reasoning recap); the agent reads the diff, because the diff is truth; review runs in a fresh session or subagent. A CLAUDE.md line banning a closing summary or restated plan removed more words than "be concise" (reported). Counterpoint: one user wants full output. Verification: test.
  Basis: reported. Status: partial at 088a227c (`plugins/claudetto/hooks/features/reply/`).
  Source: openspec/specs/agent-conduct/spec.md:221.
  Conflict: Reply Shape (verbosity defined positively; no prose cap).

- [ ] **REQ-REPLY-027** claudetto shall define verbosity positively and word a brevity rule to name what to cut instead of a length target.
  Acceptance: the reply prompt says "concise means no repetition, filler or hedging, not short", not a negative correction ("do not be lengthy but not terse"); the Concise output style leads with the result, cuts narration, names what to cut (restating the question, recaps, hedging), and says "these rules win over general formatting guidance"; no prose cap "under N lines" is used, because caps cost reasoning tokens. Verification: inspection.
  Basis: reported (the re-injection each turn as a system-reminder is copied from a post, unverified). Status: partial at 088a227c (`plugins/claudetto/hooks/features/reply/reply.ts`; `plugins/claudetto/output-styles/Concise.md` rule 6 states 'short by default' and a caveat limit, with no what-to-cut list).
  Source: unresolved, the Reddit posts behind the old item were not located by grep; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:388 holds the narration side; external/2026-11-06/reddit.com-r-claudeai-comments-1xoy8an-will-giving-claude-instructions-20261106T081955Z.md:37 (url: https://www.reddit.com/r/ClaudeAI/comments/1xoy8an/will_giving_claude_instructions_to_be_succinct/).
  Conflict: Concise Output (task report stays under about 150 words).
  Conflict: Agent-Conduct Text Settled by the User (hard numeric caps beat "be concise").
  Conflict: Reply Shape (end each reply on the result; an end-of-task report runs 5-10 lines).

- [ ] **REQ-REPLY-028** claudetto shall make an own defect read as a bug report.
  Acceptance: the reply opens with the cause and states what broke, where, cost, and fix; no apology, preamble, or retrospective. Eval case: loose `pkill` ended the user's processes, and the reply opens "pkill read -U and 501 as patterns"; a recorded reply opening with an apology and "Here is what happened" failed. On a mistake the agent names error and cause, gives the corrected result, and carries on; a refusal is final for that action. Verification: test.
  Basis: measured (one eval case). Status: missing at 088a227c.
  Source: openspec/specs/agent-conduct/spec.md:239; openspec/specs/agent-conduct/spec.md:105.

## Answer-First and Question Gates

- [ ] **REQ-REPLY-029** claudetto shall, on a `question` turn, let the first call pass when it is read-only (`ListAgents`, `Read`, `Grep`, `Glob`); `remark` turns and a first `Bash` or `Edit` stay gated. `AskUserQuestion` is denied when one Decider call judges "asks leave to fix a defect the agent found or caused" yes (denial: fix, run the check, report); `no`, `unsettled`, a failed Decider, or a failed scanner lets it pass. An `options` fault (the reply ends asking the user to choose in prose) blocks once and sends the agent to `AskUserQuestion` (not in headless runs); a `deferred` fault (the reply leaves doable work conditional, "If you want, I'll...", or "Not checked" for what its tools could run) makes the agent do it and report; things only the user holds (login, device, design choice) are outside. A grader judges these, with no word list. A reply holds at most one `- ! <command>` bullet. Ask only blocking questions, defer the rest to the end (memory or a card with options); silence is not consent.
  Acceptance: a `question` turn with a first `Read` passes; a first `Bash` is gated; a Decider `yes` denies `AskUserQuestion` with the fix text. Verification: test.
  Basis: measured (tool-before-text 5/10 to 0/10) and reported. Status: have at 088a227c (`plugins/claudetto/hooks/features/decide/`, `reply/`).
  Source: openspec/specs/decide/spec.md:8; openspec/specs/claim-check/spec.md:8; openspec/changes/2-1-325-rearchitecture/design.md:171; plugins/claudetto/hooks/features/reply/reply.ts@088a227c.

## Hand-Off, if Unavoidable

- [ ] **REQ-REPLY-030** claudetto shall, for a step that needs what only the user holds (a login in the macOS keychain, a one-time trust setup, the user's secret or terminal), give the exact command to run, ready to paste, as one runnable command or script per step with the place to run it (a separate terminal) and with output to files the agent can read back, go on with every other step, not run the step with the sandbox off or wait idle, and bundle remaining decisions into one question with a recommendation and a default. A gate refusal makes the agent hand the command to the user.
  Acceptance: a reply that hands off holds the full command, where to run it, one command per step, and one bundled question; a task that needs a keychain login ends with a command block for the user and the rest of the work done. Verification: demonstration.
  Basis: reported (audit). Status: missing at 088a227c (no grep hit for exact-command text or sandbox-off guidance in `plugins/claudetto`).
  Source: external/2026-10-11/export-What's the best way to hand off to a new terminal - without asking for a hand off prompt-.jsonl:18 (url: https://www.reddit.com/r/ClaudeCode/comments/1x2gt63/whats_the_best_way_to_hand_off_to_a_new_terminal/); external/please-use-me-often/agent-failure-dossier/06-autonomy-and-consent.md:41; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/d660bb03-7e7b-4a72-b6ff-89b9b26db0f3.jsonl:3369, user decision, 2026-11-12; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-versionlens-redux/6eb2e7bc-a3e8-44cd-9518-3d662e2e9dbe.jsonl:276, reported, user, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-versionlens-redux/6eb2e7bc-a3e8-44cd-9518-3d662e2e9dbe.jsonl:292, user decision, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-versionlens-redux/6eb2e7bc-a3e8-44cd-9518-3d662e2e9dbe.jsonl:292, reported, user, 2026-11-10.

## Behaviour Requirements From The Agent Terms Dossier

- [ ] **REQ-REPLY-031** claudetto shall hold the agent to these behaviours (paraphrased): smallest diff; abstract at the third repeat; loud failures; comments give the why; search existing code first; never weaken a test or limit without consent; lead with the outcome; report the check command, exit code, and denominator; name edge cases; no agreement, praise, or apology opener; no promise of future behavior; do routine reversible in-scope work unasked; a turn ends only done, blocked, or waiting; a block is final for that action; change position only on named new evidence; read state from the repo; corrections survive compaction.
  Acceptance: each behavior has a rule file or prompt line that a test or inspection names. Verification: inspection.
  Basis: reported. Status: partial at 088a227c (`plugins/claudetto/rules/useEdgeCaseReport`, `useBlockLanguage`, `noUnrequestedEdits`).
  Source: external/please-use-me-often/agent-terms/AGENTS.snippet.md:3; external/please-use-me-often/agent-terms/DELEGATION-AGREEMENT.md:28; external/please-use-me-often/agent-terms/RULES-OF-ENGAGEMENT.md:93; external/please-use-me-often/agent-terms/SCHEDULE-A-ENFORCEMENT.md:38.

## Per-Model Root Prompt

- [ ] **REQ-REPLY-032** claudetto shall compose the root prompt per model in `prompt.compose` (main loop only; it does not reach subagents): Sonnet and Haiku get finish, scope, ideas-stop, and no-unasked-review paragraphs; Haiku gets a short prompt and a rules-hold-when-the-user-argues line; Opus 5.5 gets length, scope, a subagent-damping line, and no verification line. The system prompt stays stable from request 1 (a changed `system` or `tools` breaks the thinking prefix, 400 on Fable 5.2). It omits "think carefully", CRITICAL emphasis, standing delegate lines, and unscoped never-absolutes. The root prompt weighs a disputed claim as a third party's, checks it the same turn, opens with the corrected fact, drops an act the user says nobody asked for, and looks up a credential in the repo `.env` before it asks.
  Acceptance: root prompt size on claude 2.1.325 fake API, Opus clean config (a measurement on 2.1.325, unverified in 2.1.326): Opus 4,553, Sonnet 5,227, Haiku 4,174 chars; stock Concise 1,373; tools array 28,455 chars, 12 tools; the lab cap holds the root prompt to the stock lean body char count. Verification: test.
  Basis: cited (Anthropic guide) and measured. Status: have at 088a227c (`plugins/claudetto/hooks/features/prompt/texts.ts:73-82` OPUS joins no FINISH or SCOPE; :84-92 hold them, :102 SONNET joins them)
  Source: external/2026-09-29/export-Claude Opus 5.5 official prompting guide.jsonl:2 (url: https://www.reddit.com/r/ClaudeAI/comments/1ws08mu/claude_opus_55_official_prompting_guide/); openspec/changes/2-1-325-rearchitecture/design.md:38; plugins/claudetto/hooks/features/prompt/compose.ts@088a227c; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:1092 (the agent's decision, citing the Opus guide: remove explicit verification instructions from an Opus prompt); observed in transcript, 2026-11-16.

## Output Style: Need From You

- [ ] **REQ-REPLY-033** claudetto shall list in "What I Need From You" only what the user alone can do, each as one plain `- ! <command>` bullet (no checkbox), with at most ONE command bullet per reply (the one the work needs first), and a command bullet only if its text starts with `! ` or `` `! ``. Questions go only through the AskUserQuestion popup: a `- [ ]` question item makes the Stop block say to ask by popup and drop the item. The heading capitalizes every word. The wording "a command only the user can run" is replaced, because it makes the agent hand off whatever a gate refuses.
  Acceptance: held-out form 28/32 (Wilson 0.719-0.950); the output style, Stop check, and `claudetto-you-should-know` agree so a question reaches the user once. Verification: test.
  Basis: measured and read. Status: missing at 088a227c (`git grep 'What I Need'` finds nothing under `plugins/`).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-20/README.md:176; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:320; openspec/specs/run-limits/spec.md:71; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:300.
  Conflict: Truly Stuck (user-only commands are `- [ ] ! <cmd>` items).
  Conflict: Conduct (user steps as plain bullets, no checkbox or `!` prefix).

## Output Style Sentence Form

- [ ] **REQ-REPLY-034** claudetto shall write replies with the actor as the subject and its own verb, each clause spelled out ("The check shows a gap. Task 4.3 fixes it." passes; "The check surfaces a gap that the plan wants to address" fails: animate verb, inanimate actor); each rule leads with what to do; a negation only inside a sentence naming the act to bound it; no bare prohibition with never, don't, do not, without, avoid, nothing, none, or nor. The `<register>` block: write the fact, the corrected result, the next step; a mistake as error and cause; the check behind each claim; an answer to the question asked; each step the agent can take itself, done; only done steps as a report; a choice the agent can make, made and named; after a remark, notice, or reply already on screen, only what is new. Also: answer first, severity levels for findings, one bullet is one idea in one sentence, work at full depth and lead with the result, decision cards with a recommended default, name the exact tic to ban (negative parallelism, stacked "No X." lines, closing "Just.", excess colons, "quietly", "silently") because "write naturally" avoids nothing; match format to question type; when drift returns after some turns, add a short example and a concrete format ("decision first, three bullets, details on request") and re-check several turns in.
  Acceptance: a held-out reply set passes a rule check for animate verbs and bare prohibitions. Verification: test.
  Basis: reported (output-style drift, tic list) and checked rule text. Status: partial at 088a227c (`plugins/claudetto/output-styles/Concise.md`, `hooks/features/reply/reply.ts`, `prompt/compose.ts`).
  Source: openspec/specs/agent-facing-text/spec.md:8; external/please-use-me-often/agent-failure-dossier/judged/prompt.jsonl:130; external/2026-10-02/export-My -anti Claude-speak- system prompt.jsonl:3 (url: https://www.reddit.com/r/ClaudeAI/comments/1wc7tn7/my_anti_claudespeak_system_prompt/).
  Conflict: Positive Prompting (write each prompt as the wanted output or replacement behaviour, with no banned phrase).

## Stop Block Keeps the Screen

- [ ] **REQ-REPLY-035** claudetto shall end each Stop block that asks for a reply again (grader, unread-grade, slice-commit, register blocks) with `KEEP_ANSWER` (the screen keeps the blocked reply; a full resend shows one report twice in two wordings that can disagree). Blocks that name lines to move or delete (ask form, command form, missing file, agree opener) name the edit and carry no `KEEP_ANSWER`. For a waited-on background task the Stop note sends the last reply nowhere again and tells the model to follow output with Monitor filtered to step and error lines. A SendMessage result shows on screen from the tool result; no hook writes it into a reply.
  Acceptance: the grader block text ends with `KEEP_ANSWER`; the ask-form block text does not. Verification: test.
  Basis: reported. Status: missing at 088a227c (`git grep KEEP_ANSWER` finds nothing under `plugins/`; `hooks/features/stop-notice/` exists). `Monitor` is present in claude 2.1.326 (tool list, `chunk-85qjfjsd.js@532`). Release note 2.1.326: Monitor now tells Claude when a watch expires with no events and its command wrote to stderr, and which file holds the output.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:366; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:794; openspec/changes/archive/2026-11-13-feat-2-1-321/specs/agent-conduct/spec.md:131; https://github.com/anthropics/claude-code/releases/tag/v2.1.326 (release notes).

## Harness Messages Quoted as They Appear

- [ ] **REQ-REPLY-036** claudetto shall name in the `<untrusted_text>` section of the root prompt each harness form by its literal text checked against a transcript: `<system-reminder>`, `hook additional context:`, `<pasted_content id="...">`, and "The user sent a new message while you were working:". A declined tool call is a declined action; the model does not reach the same effect through another tool or agent. Pasted text is tagged with a random-ID wrapper. Each rule comes from an observed failure and has an eval case.
  Acceptance: eval: a declined Edit gives no sed or Write of the same change; the inventory check names a rule with no case. Verification: test.
  Basis: read and reported. Status: have at 088a227c (`plugins/claudetto/hooks/features/prompt/texts.ts:45`; `plugins/claudetto/evals/`).
  Source: openspec/changes/2-1-325-rearchitecture/specs/agent-conduct/spec.md:87; external/please-use-me-often/agent-terms/ACCEPTABLE-USE-POLICY.md:33; external/please-use-me-often/agent-terms/DATA-HANDLING-NOTICE.md:31; plugins/claudetto/hooks/features/prompt/texts.ts:45@088a227c.

## Ask via Built-in AskUserQuestion Only

- [ ] **REQ-REPLY-037** claudetto shall register no ask tool (the classifier reads answers only as `[User answered AskUserQuestion]: ...` and drops other tool results); replace the description with the one-sentence `ASK_TEXT`; defer the tool when the session has ToolSearch; use `$.ui.ask` for setup's own questions (a dismiss rejects); never answer AskUserQuestion in the user's place; send the model's own decisions to `mcp__claudetto__decide`, which registers only with `TYPESAFE_API_KEY`, reads it nowhere else, carries question texts, option labels, and fixed pick or approval texts and no transcript, file, or path; other hooks reach Jev only through the Decider; no `typesafeApiKey` userConfig. Thresholds belong to a question set and a pinned model version (`jev-1.14.0`) and change only with a recorded run on held-out cases.
  Acceptance: the plugin tool list holds no ask tool; `mcp__claudetto__decide` is absent without `TYPESAFE_API_KEY`; Jev latency warm 152-262 ms, first 0.2-1.8 s. Verification: test.
  Basis: measured, cited, and reported. Status: have at 088a227c (`plugins/claudetto/hooks/features/decide/`, `hooks/kernel/decider/`).
  Source: openspec/specs/decide/spec.md:8; openspec/specs/decide/spec.md:37; openspec/changes/2-1-325-rearchitecture/design.md:75; openspec/changes/2-1-325-rearchitecture/design.md:100.

## Notifications

- [ ] **REQ-REPLY-038** claudetto shall call `$.ui.notify` from one hook on a failed unattended stop, leave `permission_prompt`, `idle_prompt`, and `elicitation_dialog` to the native channel, and never notify from a `classic.Notification` or a `ui.notify` handler (it echoes without end and the engine does not stop it).
  Acceptance: a test asserts no notify call from a `classic.Notification` or `ui.notify` handler. Verification: test.
  Basis: measured and reported. Status: have at 088a227c (`plugins/claudetto/hooks/features/stop-notice/`). `Notification` is present in claude 2.1.326 (hook event list, `chunk-m33vdkhs.js@5090`), and `ui.notify` is present in 2.1.326 (`chunk-qg227pzf.js@3309`).
  Source: openspec/specs/run-limits/spec.md:164; openspec/changes/2-1-325-rearchitecture/design.md:150; external/please-use-me-often/agent-failure-dossier/judged/tool.jsonl:68.
  Conflict: Fable Review And Notification (send a notification when a session ends).

## Clarify Before Building, Bounded

- [ ] **REQ-REPLY-039** claudetto shall, before a broad build, ask up to 3-5 questions, restate the task, name the smallest file to touch and what will not change, and wait for go; it asks only when the answer is costly or impossible to undo. "Try once, then ask" resolves the tension with over-deferral.
  Acceptance: a broad task prompt gets 3-5 questions and a restatement before a write; a targeted task gets none. Verification: demonstration.
  Basis: reported (prompt counts n=27, 5, 4, 6; n=3). Status: missing at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/judged/conduct.jsonl:36; external/please-use-me-often/agent-failure-dossier/judged/prompt.jsonl:52.
  Conflict: Concise Output (ask one clarifying question, then proceed).

## Failing Checks Are Fixed

- [ ] **REQ-REPLY-040** claudetto shall put in the root prompt that a failing check is fixed, not deleted or silenced.
  Acceptance: the root prompt text holds the rule; Heracles has it. Verification: inspection.
  Basis: reported (n=3, candidate). Status: partial at 088a227c (`plugins/claudetto/agents/Heracles.md` has "Pass a failing check by fixing what it reports"; the root prompt lacks it).
  Source: plugins/claudetto/agents/Heracles.md@088a227c.

## Open-Issues Line

- [ ] **REQ-REPLY-041** claudetto shall carry a `<defects>` line in the root prompt that asks for an entry in the open-issues file before the reply, answer a remark or question before the first tool batch, and make the ISSUES gate name the newest root `ISSUES*.md`.
  Acceptance: A/B 3 runs per arm: 0/3 entries before the line, 3/3 after; tool-before-text 5/10 to 0/10. Verification: test.
  Basis: measured, small n. Status: missing at 088a227c (`git grep ISSUES` finds nothing under `plugins/`).
  Source: openspec/changes/2-1-325-rearchitecture/design.md:171; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:292.

## Concise Output Style

- [ ] **REQ-REPLY-042** claudetto shall ship a Concise output style with no `- [ ] !` versus `- !` mismatch and no "a command only the user can run" wording.
  Acceptance: `output-styles/Concise.md` holds neither the text `- [ ] !` nor the phrase "a command only the user can run". Verification: inspection.
  Basis: read. Status: have at 088a227c (the file holds neither; the defect was in the 2.1.322 text).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/sessions.md:38 (Concise.md told the agent to give "a command only the user can run"); openspec/specs/run-limits/spec.md:110 (`- [ ] ! gh auth login` blocks); plugins/claudetto/output-styles/Concise.md:1-14@088a227c.

## Explanations Output Style

- [ ] **REQ-REPLY-043** claudetto shall offer an Explanations output style that explains why, not what, in plain terms; the built-in Learning style exists.
  Acceptance: a style file under `output-styles/` states the why-not-what rule. Verification: inspection.
  Basis: inferred. Status: missing at 088a227c.
  Source: unresolved: no source holds an Explanations style; only the dossier lines on explaining why were found (external/please-use-me-often/agent-failure-dossier/judged/prompt.jsonl:117 is a pre-mortem claim, not this style).

## Reply Quote Command

- [ ] **REQ-REPLY-044** claudetto shall register `/reply`, which appends `Re:`, each quoted line behind `> `, and a blank line to the prompt draft and sends nothing, so the user can reply to a selected part of the agent's last reply with a quote block headed "Re:". The quoted text is `$.ui.selection()` when not blank, else paragraph N of the last assistant message with text. `/reply` alone, or N out of range, prints the numbered paragraphs and leaves the draft. The command binds no key.
  Acceptance: `/reply 2` appends paragraph 2 prefixed with `> `; `/reply` alone prints numbered paragraphs and leaves the draft unchanged; a passage the user selects in the TUI reaches the agent as a quote block above the reply, and where mods cannot do this a probe names the limit. Verification: test.
  Basis: measured (2.1.319: a plugin Button action can name an engine keybinding action but declares no chord; `prompt.edit` raises no event for a Shift+Left that moves no caret). Status: have at 088a227c (`features/reply/reply.ts:40` uses `$.ui.selection`, confirmed with `git grep 'ui.selection' 088a227c -- plugins/claudetto/hooks/features/reply/reply.ts`; `reply.test.ts:39` tests `/reply N`). `$.ui.selection` is present in claude 2.1.326 (`chunk-qg227pzf.js@3309`) and `prompt.edit` is present (`chunk-qg227pzf.js@3953`).
  Source: openspec/specs/reply-quote/spec.md:10; plugins/claudetto/hooks/features/reply/reply.ts:40@088a227c; plugins/claudetto/hooks/features/reply/reply.test.ts:39@088a227c; plugins/claudetto/hooks/features/reply@088a227c; user decision, 2026-11-09 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/da178184-7a4f-48bb-8d66-284f77e45c23.jsonl:1048).

## Agent-Conduct Text Settled by the User

- [ ] **REQ-REPLY-045** claudetto shall hold these conduct rules in the reply text: a correction gets its fix at once; `!` alone waits; "stop" or "quiet" ends the turn with no text; a reply holds only work; claim probed before reported; an offered step is taken; a disputed claim is checked and then the corrected fact stated; a credential is looked up in the repo `.env` and then the environment; no announcement of the first tool call; the lead checks each subagent finding; scope follows the user's goal, not the task's files; a 403 ends the fetch of that page; the six ToolSearch lines leave the OpenSpec skills; `<consent>` drops "a sent message" from acts others see (it makes Fable hold routine requests); eval cases `act-on-correction`, `quiet-when-told`, `check-relayed-findings` are added, not run. Reply shape (n=11,11,9,7,4,4,2): lead with the answer, hard numeric caps beat "be concise", no closing offers, no preamble, keep caveats through "short but every number and every unless stays", STE cut 580 words to about 100 (n=5), Concise style re-injected each turn (n=2); a `<register>` block (fact, corrected result, next step; mistake as error plus cause; check behind each claim; answer to the question asked; own steps done; only done steps as a report). The input text was cut after "Hook-based per-turn rein".
  Acceptance: The reply text holds each listed rule; the three eval cases exist. Verification: inspection.
  Basis: reported. Status: partial at 088a227c.
  Source: plugins/claudetto/hooks/features/reply@088a227c; plugins/claudetto/output-styles@088a227c. Not located: tags for the n counts. The user's wording is paraphrased, not quoted.
  Conflict: Reply Shape (define verbosity positively; no prose cap).

## One Obvious Way

- [ ] **REQ-REPLY-046** claudetto shall carry the rule that each job has one way to be done, for code, docs, and UI alike, shall have an agent remove a duplicate entry or field when another already covers its job, build each rebuild from a clean slate, delete the replaced path with its tests, settings, and docs, and stop with an error naming the install step when a required tool is missing.
  Acceptance: the shipped rules include `useOneObviousWay.md` with all four parts; an agent that finds two menu entries for one action, or a field its status already shows, removes one; an issue or PR template serves human and AI in one text, not two copies. Verification: inspection.
  Basis: reported, user. Status: partial at 088a227c (`git show 088a227c:plugins/claudetto/rules/useOneObviousWay.md` is one sentence: one way per job, and a maintained tool or list is used and the copy deleted; it holds no clean-slate rebuild, no replaced-path deletion with tests, settings, and docs, and no missing-tool error).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/c86d66a7-7a97-4977-b893-7d36de6eca0f.jsonl:11161, user report, 2026-11-12; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/f4b7e436-da1a-46f3-b8ef-6591f00dfe9e.jsonl:11323, user decision, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19, user decision, 2026-11-13; plugins/claudetto/rules/useOneObviousWay.md:1@088a227c; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7424 (the user's pause and order); [ADR-0046](../adr/0046-rebuild-clean-slate.md).

## Industry Standards And Maintained Libraries First

- [ ] **REQ-REPLY-047** claudetto shall have an agent read maintained ecosystem lists and industry practice before it picks a library, a name, or a design, and use industry-standard terms instead of the user's own wording.
  Acceptance: given a maintained package list in the session, the agent reads it before choosing libraries; names and directories use domain terms, not the user's casual words. Verification: demonstration.
  Basis: reported, user. Status: partial at 088a227c (`plugins/claudetto/rules/lookForClone.md:1` covers existing code, not outside lists or terms).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/005f897e-696d-45c7-8536-2d1019b8ec96.jsonl:7126, user decision, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/10e1c566-73b2-463f-9f9d-297fbb810297.jsonl:2755, user decision, 2026-11-12; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/1aab3c4c-5aef-4ee2-9d3e-3723fd904152.jsonl:1095, user decision, 2026-11-12.

## Code Style Rules For Agent Output

- [ ] **REQ-REPLY-048** claudetto shall carry style rules for agent code: headlinese identifiers, tests laid out as Arrange, Act, Assert with section comments, test assertions on behaviour a caller observes and not on implementation, plain-English doc comments, and no docs-related text in code comments.
  Acceptance: the shipped rules hold each of these; a test an agent writes has the three section comments and no assertion on private detail. Verification: inspection.
  Basis: reported, user. Status: partial at 088a227c (`useHeadlineseNames.md`, `useTestPatterns.md`, `commentOnlyWhy.md` exist; no rule bars docs text in comments).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/10e1c566-73b2-463f-9f9d-297fbb810297.jsonl:1870, user decision, 2026-11-12; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/10e1c566-73b2-463f-9f9d-297fbb810297.jsonl:2755, user decision, 2026-11-12.

## Fix Each Found Defect

- [ ] **REQ-REPLY-049** claudetto shall instruct the agent to fix each defect or leftover it finds, at its cause, to fix what its tools can do first, and to name one in the report as open only when its blocker lies outside reach (a denial, a paid run awaiting approval, a step only the user can take), with that blocker named.
  Acceptance: a final report lists no defect, leftover, or open part that the agent could fix; each fix names its check; each open item in a final reply carries a named blocker. Verification: demonstration.
  Basis: reported. Status: partial at 088a227c (`git show 088a227c:plugins/claudetto/output-styles/Concise.md` line 14 ends on "result or blockers"; no rule says to fix each found defect).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/82ece2fe-d4d7-465e-920e-b86fec87803d.jsonl:371, reported, user, 2026-11-12; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/fc057980-26e0-4ec3-95da-6216eecc7fd6.jsonl:216, reported, user, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-versionlens-redux/03862ab5-19f0-42af-9ee3-6dd318beec00.jsonl:1594, reported, user, 2026-11-10; openspec/specs/agent-conduct/spec.md:230; plugins/claudetto/output-styles/Concise.md:14@088a227c.

## Prevent Found Risks

- [ ] **REQ-REPLY-050** claudetto shall instruct the agent to remove a risk it finds in its own change, and to report a residual risk only when it cannot remove it.
  Acceptance: a report has no remaining-risk entry for a risk the agent could remove in the change. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/fc057980-26e0-4ec3-95da-6216eecc7fd6.jsonl:443, user decision, 2026-11-11.

## Search Nudge per Model

- [ ] **REQ-REPLY-051** claudetto shall put the WebSearch nudge in the Sonnet delta ("Use WebSearch to check specifics that may have changed...") and a one-sentence Haiku nudge in the Haiku delta, which stays under 700 characters; give Haiku 5.5 a date line "The current date is {date}..." rendered once at session start, with no "regardless of how confident" blanket search form; and use adaptive thinking, not thinking off, for JSON output with tools.
  Acceptance: `SONNET_SEARCH` names `WebSearch`; `HAIKU_SEARCH` is one sentence and the Haiku delta is under 700; the delta holds the date line once per session and no blanket search sentence. Verification: test.
  Basis: cited. Status: partial at 088a227c (`plugins/claudetto/hooks/features/prompt/texts.ts:94-100` holds `SONNET_SEARCH` and `HAIKU_SEARCH`; `git grep -n -E 'current date|adaptive' 088a227c -- plugins` finds only `surface/texts.ts:18`, the WebSearch tool text, so the date line and adaptive thinking are missing).
  Source: openspec/changes/archive/2026-11-16-2-1-323/tasks.md:83; plugins/claudetto/hooks/features/prompt/texts.ts:94-100@088a227c; openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:311; openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:313; plugins/claudetto/hooks/features/surface/texts.ts:18@088a227c.

## Notice Form

- [ ] **REQ-REPLY-052** claudetto shall write each notice to the user as one line in the first lines of the next message: `TYPE: what happened, the clause ID, what it changed, what is needed from the User (if anything)`.
  Acceptance: a notice has the `TYPE:` lead and the four slots. Verification: inspection.
  Basis: cited, terms clause T8.1 text. Status: partial at 088a227c (`features/stop-notice/` exists; `git grep clause` finds no clause-ID slot in `plugins/claudetto/hooks`).
  Source: external/please-use-me-often/agent-terms/TERMS-AND-CONDITIONS.md:141.

## Scope Of A Change

- [ ] **REQ-REPLY-053** claudetto shall narrow a "close every loose end" rule to loose ends this change caused, and list suggested next steps before the PR opens, then do each or mark it out of scope with a reason.
  Acceptance: a reply to "done" lists next steps; none is left undone and unmarked. Verification: demonstration.
  Basis: reported, two users (a blanket rule gold-plates). Status: missing at 088a227c (git grep for "loose end" finds nothing).
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xcj51i-agents-not-finishing-work-20261024T061716Z.md:76 (url: https://www.reddit.com/r/ClaudeCode/comments/1xcj51i/agents_not_finishing_work/).
  Conflict: Finish The Work (close every loose end in the same PR).

## Assumptions

- [ ] **REQ-REPLY-054** claudetto shall, when two or more reasonable approaches change the result or an assumption would materially change the solution, stop and ask, and otherwise pick the smallest reversible change and list its assumptions at the end, so they can be scanned in seconds; stack and repo commands stay in project instructions.
  Acceptance: a finished task ends with an assumptions list; a task with a solution-changing assumption gets a question, a task without one gets the smallest reversible change and a stated assumption; the agent front-loads the reason in the first message (the model fills missing context with the worst case), asks a doubt once with the useful facts, declines at most once and briefly, and reconsiders on new facts, saying whether the answer changes. Verification: test.
  Basis: reported. Status: partial at 088a227c (`plugins/claudetto/hooks/features/decide/texts.ts:49` is `DECIDE_GIVE_BACK` ("state the assumption, or put it to the user with `AskUserQuestion`"), checked with `git show 088a227c:plugins/claudetto/hooks/features/decide/texts.ts`; no end-of-task list).
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xeeclc-anyone-else-noticed-claude-makin-20261028T060729Z.md:79 (url: https://www.reddit.com/r/ClaudeAI/comments/1xeeclc/anyone_else_noticed_claude_making_weird_decisions/); openspec/specs/agent-conduct/spec.md:31; external/please-use-me-often/agent-failure-dossier/06-autonomy-and-consent.md:47; external/2026-11-10/reddit.com-r-claudeai-comments-1xryurq-whats-that-one-instruction-in-yo-20261110T093205Z.md:113 (url: https://www.reddit.com/r/ClaudeAI/comments/1xryurq/whats_that_one_instruction_in_your_claude/); plugins/claudetto/hooks/features/decide/texts.ts:49@088a227c.
  Conflict: State Assumptions (state assumptions and wait for them to be resolved).

## Pushback

- [ ] **REQ-REPLY-055** claudetto shall phrase an anti-sycophancy instruction as a checkable behavior ("before agreeing, list the two strongest objections"), keep it in project instructions and not in turn 1, and add a UserPromptSubmit hook so it stays recent.
  Acceptance: the hook text holds the checkable wording on each prompt. Verification: inspection.
  Basis: reported (objections soften before they vanish, from about message 30-40). Status: missing at 088a227c.
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xft259-if-your-challenge-my-assumptions-20261028T061202Z.md:74 (url: https://www.reddit.com/r/ClaudeAI/comments/1xft259/if_your_challenge_my_assumptions_instruction/).

## After A Long Session

- [ ] **REQ-REPLY-056** claudetto shall offer, after a long session, a quiz of the model on what it did wrong, what it could do better, and what could be pulled into a skill.
  Acceptance: the quiz prompt names those three questions. Verification: demonstration.
  Basis: reported, one user (another notes the answer depends on how the question is framed). Status: missing at 088a227c.
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xdphff-am-i-really-supposed-to-outsma-20261024T061449Z.md:87 (url: https://www.reddit.com/r/ClaudeCode/comments/1xdphff/am_i_really_supposed_to_outsmart_claude_to_avoid/).

## Question Cap

- [ ] **REQ-REPLY-057** claudetto shall tell the model to ask at most 5 questions about audience, format, and constraints before it begins, not a general "ask me any questions".
  Acceptance: a reply to an open task holds at most 5 questions, each on audience, format, or a constraint. Verification: test.
  Basis: reported, no measure. Status: partial at 088a227c (`plugins/claudetto/hooks/features/decide/texts.ts:49` asks questions through `AskUserQuestion` with no cap).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xrtmvs-asking-claude-what-do-you-need-t-20261109T151940Z.md:50 (url: https://www.reddit.com/r/ClaudeAI/comments/1xrtmvs/asking_claude_what_do_you_need_to_know_before/).
  Conflict: Concise Output (ask one clarifying question, then proceed).

## Plan Check

- [ ] **REQ-REPLY-058** claudetto shall tell the model to name the files it will touch before it edits across a few files, and to fix the plan first when that list misses one.
  Acceptance: the plan turn lists the files before the first edit; a file edited outside the list sends the model back to the plan; a change run opens with a file list. One commenter says the list caught a few wrong guesses before they became a mess. Verification: test.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xrvnbi-what-is-the-best-way-to-learn-an-20261110T094238Z.md:77 (url: https://www.reddit.com/r/ClaudeAI/comments/1xrvnbi/what_is_the_best_way_to_learn_and_make_the_most/); external/2026-11-02/reddit.com-r-claudeai-comments-1xk277d-how-often-has-a-coding-agent-don-20261031T105244Z.md:90 (url: https://www.reddit.com/r/ClaudeAI/comments/1xk277d/how_often_has_a_coding_agent_done_something_you/).

## Unknown Facts

- [ ] **REQ-REPLY-059** claudetto shall tell the model to write TO FILL IN for information that is not in what the user gave, and not to guess it.
  Acceptance: given a task whose input lacks a price, the reply holds TO FILL IN at that place and no invented value. Verification: test.
  Basis: reported, inferred reasoning (a checkable condition, was it in the message, works where "say so if unsure" fails because the model cannot tell when it guesses). Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xryurq-whats-that-one-instruction-in-yo-20261110T093205Z.md:42,156 (url: https://www.reddit.com/r/ClaudeAI/comments/1xryurq/whats_that_one_instruction_in_your_claude/).

## Anti-Generic Output

- [ ] **REQ-REPLY-060** claudetto shall steer output away from generic defaults with 3 to 5 examples that vary enough to avoid unintended patterns, not with an instruction such as "avoid a generic AI look".
  Acceptance: a style prompt holds 3 to 5 varied examples and no generic-avoidance instruction; one example is not accepted. Verification: inspection.
  Basis: cited (Anthropic's Opus 5.5 prompting guide and prompting docs, second-hand) and reported (scout of about 100 candidates, about 10 marked good with reasons, feedback saved at three levels: skill main file for all runs, per-type reference file, per-project folder, with a catalog index the scout reads first). Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xs4oh8-how-we-stopped-getting-generic-o-20261110T094228Z.md:29,31,35,37 (url: https://www.reddit.com/r/ClaudeAI/comments/1xs4oh8/how_we_stopped_getting_generic_output_from_claude/).

## Cannot With Evidence

- [ ] **REQ-REPLY-061** claudetto shall require "can't" and "isn't there" to come with where the agent stopped plus one artifact (the command and its output, or the file line), otherwise the reply says "not checked yet"; test a capability before stating "X has no Y", and read the diff, not the summary (n=10).
  Acceptance: a claim of inability without an artifact is rejected; evidence covers only the command it came from (a permission error on one tool is not evidence about an untried tool); a "cannot" in a reply names the test behind it. Cheaper models fail by silent omission and do not know they are unsure; Haiku at low effort invents reasons not to test. Verification: test.
  Basis: reported. Status: partial at 088a227c (`plugins/claudetto/output-styles/Concise.md` line 10 marks a claim unverified only when no held tool can check it; `git grep -n -i -E 'not checked yet|isn.t there|cannot|can.t' 088a227c -- plugins/claudetto/rules plugins/claudetto/hooks/features/prompt` finds no rule that asks for an artifact behind "can't").
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xrx9yj-what-rules-keep-your-agent-hon-20261110T100144Z.md:78 (url: https://www.reddit.com/r/ClaudeCode/comments/1xrx9yj/what_rules_keep_your_agent_honest/); openspec/changes/archive/2026-11-09-release-2-1-319/vanilla-research.md:27; external/please-use-me-often/agent-terms/TERMS-OF-SERVICE.md:53.

## Glossary

- [ ] **REQ-REPLY-062** claudetto shall keep a project glossary: the model uses no language from it except as defined and none outside it when the glossary can serve; a separate pass reviews glossary adherence; plans name each function and class in backticks and a later step that swaps in a synonym is flagged.
  Acceptance: a reply that swaps a defined term for a synonym is flagged by the review pass; a rename is not reported as a missing feature. Verification: test.
  Basis: reported (one commenter; grows over the project). Status: missing at 088a227c.
  Source: external/2026-11-11/reddit.com-r-claudeai-comments-1xqp2l0-sick-of-semantic-substitution-20261110T172348Z.md:61,69 (url: https://www.reddit.com/r/ClaudeAI/comments/1xqp2l0/sick_of_semantic_substitution/).

## Term Consistency Style

- [ ] **REQ-REPLY-063** claudetto shall ship an output style that forbids literary, essayist, and journalistic techniques, metaphors, and synonyms and demands term consistency.
  Acceptance: the style text holds each ban and the term-consistency rule. Verification: inspection.
  Basis: reported, one user (largely fixed synonym drift and vague allusions). Status: partial at 088a227c (`plugins/claudetto/output-styles/Concise.md` exists; it holds none of these bans).
  Source: external/2026-11-11/reddit.com-r-claudeai-comments-1xqp2l0-sick-of-semantic-substitution-20261110T172348Z.md:139 (url: https://www.reddit.com/r/ClaudeAI/comments/1xqp2l0/sick_of_semantic_substitution/).

## Pre-Mortem

- [ ] **REQ-REPLY-064** claudetto shall tell the model to list what could break before it writes anything, and shall keep gates that update with each feature or fix; with smaller chunks and more oversight when a change's fallout stops being handled.
  Acceptance: a plan holds a break list before the first write; a gate exists for each fix. Verification: test.
  Basis: reported, one author (catches more). Status: missing at 088a227c.
  Source: external/2026-11-13/reddit.com-r-claude-comments-1xtwd6q-opus-55-now-unable-to-foresee-futu-20261111T234828Z.md:37,49 (url: https://www.reddit.com/r/claude/comments/1xtwd6q/opus_55_now_unable_to_foresee_future_problems/).

## State Assumptions

- [ ] **REQ-REPLY-065** claudetto shall tell the model to state its assumptions and uncertainties and to wait for them to be resolved before it proceeds, unless told to proceed on them.
  Acceptance: a reply with an open assumption stops and waits unless the prompt says to proceed. Verification: test.
  Basis: reported, one author. Status: partial at 088a227c (`plugins/claudetto/hooks/features/decide/texts.ts:49` states the assumption or asks).
  Source: external/2026-11-13/reddit.com-r-claudeai-comments-1xsv2s0-unconvinced-by-claude-fable-52-20261112T231528Z.md:196 (url: https://www.reddit.com/r/ClaudeAI/comments/1xsv2s0/unconvinced_by_claude_fable_52/).
  Conflict: Assumptions (pick the smallest reversible change and list the assumptions at the end).

## Rewrite Pass

- [ ] **REQ-REPLY-066** claudetto shall run a rewrite pass with per-character voice and avoided monotone rhythm, and shall require an artifact that lists each change with before, after, and reason, then an overview table.
  Acceptance: a rewrite pass returns the change artifact and the table. Verification: demonstration.
  Basis: reported, one author. Status: missing at 088a227c.
  Source: external/2026-11-13/reddit.com-r-claudeai-comments-1xu92kx-what-does-claude-really-suck-at-20261112T231534Z.md:68,70,80 (url: https://www.reddit.com/r/ClaudeAI/comments/1xu92kx/what_does_claude_really_suck_at/).

## One Decision At A Time

- [ ] **REQ-REPLY-067** claudetto shall carry a rule that, when documents do not settle a choice, the agent asks with 2 to 4 concrete options, one marked recommended with a short rationale, through the structured-choice tool if present, else one short message.
  Acceptance: the rule text states the 2-4 options, the recommended mark, and the one-decision-at-a-time limit. Verification: inspection.
  Basis: reported, one user, estimate (the recommended option is right in about 90% of cases, weaker on UX flows). Status: missing at 088a227c (AskUserQuestion appears only in plugins/claudetto-you-should-know/hooks/register.ts:268).
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xlbuq6-forget-the-usual-claude-tips-w-20261102T184441Z.md:209,213 (url: https://www.reddit.com/r/ClaudeCode/comments/1xlbuq6/forget_the_usual_claude_tips_what_are_the_strange/).

## Prove Wrong First

- [ ] **REQ-REPLY-068** claudetto shall carry a rule that, before writing a change, the agent names how it would prove the change wrong (a test or case), which becomes the acceptance check; after more than two failed fix attempts it writes three lines of what it now believes about the bug before the next try.
  Acceptance: the rule text holds both steps. Verification: inspection.
  Basis: reported, one user (half the time the belief is wrong). Status: missing at 088a227c.
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xlbuq6-forget-the-usual-claude-tips-w-20261102T184441Z.md:323 (url: https://www.reddit.com/r/ClaudeCode/comments/1xlbuq6/forget_the_usual_claude_tips_what_are_the_strange/).

## Brevity Rules

- [ ] **REQ-REPLY-069** claudetto shall add to a brevity rule 'if you left out anything that changes the decision, list it in one line at the end', and test the instruction on an old conversation where the key details are known.
  Acceptance: the style text holds the omission line. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-11-06/reddit.com-r-claudeai-comments-1xoy8an-will-giving-claude-instructions-20261106T081955Z.md:41 (url: https://www.reddit.com/r/ClaudeAI/comments/1xoy8an/will_giving_claude_instructions_to_be_succinct/).

- [ ] **REQ-REPLY-070** claudetto shall scope a short-reply rule to replies to the user, not to the doc or code written.
  Acceptance: the style text names replies to the user as its scope. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-11-06/reddit.com-r-claudeai-comments-1xoy8an-will-giving-claude-instructions-20261106T081955Z.md:49 (url: https://www.reddit.com/r/ClaudeAI/comments/1xoy8an/will_giving_claude_instructions_to_be_succinct/).

## UI Work Rules

- [ ] **REQ-REPLY-071** claudetto shall carry a UI-work rule: give realistic data (long names, missing values, mixed statuses) before asking for a layout, and ask to make the most frequent task easy to reach, then style that screen.
  Acceptance: the rule text holds both steps. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-11-06/reddit.com-r-claudeai-comments-1xny4t4-what-tricks-do-you-guys-use-to-s-20261105T084416Z.md:99 (url: https://www.reddit.com/r/ClaudeAI/comments/1xny4t4/what_tricks_do_you_guys_use_to_stay_away_from_the/).

- [ ] **REQ-REPLY-072** claudetto shall carry a UI-work rule: the generic look comes from equal visual weight (same card size, padding, shadow); make the one number or action that matters twice as big and quiet the rest.
  Acceptance: the rule text holds the visual-weight rule. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-11-06/reddit.com-r-claudeai-comments-1xny4t4-what-tricks-do-you-guys-use-to-s-20261105T084416Z.md:59 (url: https://www.reddit.com/r/ClaudeAI/comments/1xny4t4/what_tricks_do_you_guys_use_to_stay_away_from_the/).

- [ ] **REQ-REPLY-073** claudetto shall carry a taste-elicitation step for UI work: sort about 30 screenshots on a 5-point dislike-to-like spectrum, or describe the vibe and have Claude spike a few directions, pick one, iterate; build the concept visually elsewhere first.
  Acceptance: the rule text holds the step. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-11-06/reddit.com-r-claudeai-comments-1xny4t4-what-tricks-do-you-guys-use-to-s-20261105T084416Z.md:83,125 (url: https://www.reddit.com/r/ClaudeAI/comments/1xny4t4/what_tricks_do_you_guys_use_to_stay_away_from_the/).

- [ ] **REQ-REPLY-074** claudetto shall carry a UI-work step for a user without design vocabulary: prompt 'Interview me to develop a comprehensive brand kit and style guide'; a design-system file (Figma tokens or one derived from a liked site) is declared binding for all UI.
  Acceptance: the rule text holds the interview step and the binding design-system file. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-11-06/reddit.com-r-claudeai-comments-1xny4t4-what-tricks-do-you-guys-use-to-s-20261105T084416Z.md:244 (url: https://www.reddit.com/r/ClaudeAI/comments/1xny4t4/what_tricks_do_you_guys_use_to_stay_away_from_the/).

- [ ] **REQ-REPLY-075** claudetto shall carry a rule that a long spec opens with 'Before you write any code, suggest improvements, ideas and opinions, and correct my mistakes and misunderstandings'.
  Acceptance: the rule text holds the opening line. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-11-06/reddit.com-r-claudeai-comments-1xny4t4-what-tricks-do-you-guys-use-to-s-20261105T084416Z.md:206 (url: https://www.reddit.com/r/ClaudeAI/comments/1xny4t4/what_tricks_do_you_guys_use_to_stay_away_from_the/).

- [ ] **REQ-REPLY-076** claudetto shall carry a UI-consistency rule: decide design once (one component library, a tokens file with 2-3 colors, one font, one spacing scale, one radius, a CLAUDE.md rule to use only those); give reference screenshots plus a REFERENCES.md instead of adjectives; build one representative screen first and review desktop and mobile screenshots before the rest; one icon set; motion only for game-state changes at 200-300 ms with prefers-reduced-motion.
  Acceptance: the rule text holds each step. Verification: inspection.
  Basis: reported, advice from commenters, unmeasured, low relevance to a plugin core. Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xm5lz3-what-toolsplugins-do-you-use-wit-20261109T152902Z.md:30-44 (url: https://www.reddit.com/r/ClaudeAI/comments/1xm5lz3/what_toolsplugins_do_you_use_with_claude_code_to/).

## Self-Critique Wrapper

- [ ] **REQ-REPLY-077** claudetto shall offer a self-critique wrapper: restate the task, solve, assume the answer is wrong and find the single likeliest error, fix, then give the final answer plus a low, medium or high confidence and the one assumption that would break it; use it only when something smells off, because the assume-wrong step invents problems.
  Acceptance: the wrapper text holds the five steps and the use limit. Verification: inspection.
  Basis: reported, 11 votes. Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xr0drc-whats-the-one-prompt-you-keep-co-20261110T093057Z.md:50,109-113,195 (url: https://www.reddit.com/r/ClaudeAI/comments/1xr0drc/whats_the_one_prompt_you_keep_coming_back_to/).

## Restate Before Change

- [ ] **REQ-REPLY-078** claudetto shall carry a rule: 'Before you change anything, explain back what you think I'm asking and list what you are NOT going to touch', which catches misread requirements before code.
  Acceptance: the rule text holds the restatement and the not-touch list. Verification: inspection.
  Basis: reported, 24 votes. Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xr0drc-whats-the-one-prompt-you-keep-co-20261110T093057Z.md:195 (url: https://www.reddit.com/r/ClaudeAI/comments/1xr0drc/whats_the_one_prompt_you_keep_coming_back_to/).

## Reasoning Trace

- [ ] **REQ-REPLY-079** claudetto shall make the agent state why before it acts, so a human review of the action is fast and meaningful.
  Acceptance: a change the agent proposes carries its reason before execution. Wrong AI conclusions come with good justifications, so reviewers accept plausible ones; the trace helps review but does not replace it. Verification: inspection.
  Basis: reported, commenters. Status: missing at 088a227c.
  Source: external/2026-10-30/reddit.com-r-anthropic-comments-1xhodax-interesting-anthropic-study-20261028T190543Z.md:39,75 (url: https://www.reddit.com/r/Anthropic/comments/1xhodax/interesting_anthropic_study/).

## High-Stakes Research

- [ ] **REQ-REPLY-080** claudetto shall have the agent list the exact queries it ran before it answers a high-stakes research question, and tell the user to open every cited source.
  Acceptance: a research answer lists its queries. One user ran the logged query on 14 engines and the found article appeared on none; the same terms on Google often give different results. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xf6n0i-which-search-engine-does-claude-20261029T172437Z.md:41 (url: https://www.reddit.com/r/ClaudeAI/comments/1xf6n0i/which_search_engine_does_claude_use/).

## Proportionality

- [ ] **REQ-REPLY-081** claudetto shall have the agent weigh the real stakes before it raises a concern, and give a small-stake situation no warning or long explanation.
  Acceptance: a reply to a small-stake action holds no warning block. Verification: demonstration.
  Basis: reported, one thread, model self-report. Status: missing at 088a227c.
  Source: external/2026-10-31/reddit.com-r-claude-comments-1xevazp-necessary-interaction-rules-create-20261031T083808Z.md:33 (url: https://www.reddit.com/r/claude/comments/1xevazp/necessary_interaction_rules_created_for_opus_by/).

## Anchoring On The Agent

- [ ] **REQ-REPLY-082** claudetto shall have the agent, before any analysis of a judgment call, list every fork where a reasonable analyst could go either way and what each option changes, and recommend nothing; and shall offer the user a way to write their own call down before asking.
  Acceptance: the fork list appears before any recommendation and the writeup shows which calls were inherited. Commenters give the reason: a second adversarial review still hands over another recommendation to anchor on; the poster lists adversarial prompts ("poke holes", "give three reasons this is the wrong call") and a debate subagent, anecdotal. Verification: demonstration.
  Basis: reasoned, commenters; reported, anecdotal. Status: missing at 088a227c.
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xj3qdv-anthropic-gave-50-analysts-claud-20261030T102902Z.md:57,59,202,226,250,252,268 (url: https://www.reddit.com/r/ClaudeAI/comments/1xj3qdv/anthropic_gave_50_analysts_claude_code_with_a/).

## Prose Style

- [ ] **REQ-REPLY-083** claudetto shall give the reply style a contract up front (plain words, no metaphors unless asked, short declarative sentences, delete any sentence whose loss drops no information) and shall accept a sample of the user's own writing to match.
  Acceptance: the style rules hold the contract and a way to supply a sample. One commenter reports that a sample calibrates faster than abstract rules, that a skill in the Google developer documentation style fixed Opus 5 prose, and that a list of annoying phrases the model rotates out helps; the commenter's cause, RLHF raters preferring "considered" prose, is inferred. Verification: demonstration.
  Basis: reported, anecdotal; inferred (cause). Status: missing at 088a227c.
  Source: external/2026-10-31/reddit.com-r-claude-comments-1xf2o8a-why-does-claude-write-in-such-conv-20261031T083623Z.md:222,262,278 (url: https://www.reddit.com/r/claude/comments/1xf2o8a/why_does_claude_write_in_such_convoluted_sentences/).

## Debugging Recipes

- [ ] **REQ-REPLY-084** claudetto shall have the agent, when it debugs an answer, argue against its own conclusion before it improves the answer, and compare the broken case with a tiny known-good example before it proposes a fix.
  Acceptance: the argument names the assumption that would make the answer wrong, and a known-good example sits beside the broken one. One commenter says the useful part is whether the model can name that assumption, not whether it changes its mind. Verification: demonstration.
  Basis: reported, one commenter. Status: missing at 088a227c.
  Source: external/2026-11-02/reddit.com-r-claudeai-comments-1xl9c92-forget-the-usual-claude-tips-wha-20261101T191418Z.md:131,133 (url: https://www.reddit.com/r/ClaudeAI/comments/1xl9c92/forget_the_usual_claude_tips_what_are_the_strange/).

## Rules Text

- [ ] **REQ-REPLY-085** claudetto shall add to `rules/useTestPatterns.md` one line requiring a characterization test before a refactor: pin behaviour on old code with about 10 golden examples run more than once (n=6).
  Acceptance: the rule file holds the line. Verification: inspection.
  Basis: inferred. Status: missing at 088a227c (`git grep -n -i -E 'characterization|golden' 088a227c -- plugins/claudetto/rules` finds nothing).
  Source: unresolved: the old plan cited a worker input that no longer exists; no source line found.

## Style Faults by Typed Questions

- [ ] **REQ-REPLY-086** claudetto shall express each style fault as a question a check can ask of a reply (does it show the check behind each claim; does it answer what was asked; does it leave undone a step the agent could do itself); stored cases are examples, never a match list.
  Acceptance: no word-list or regex match decides a fault. Verification: test.
  Basis: cited. Status: partial at 088a227c (`plugins/claudetto/hooks/kernel/decider/`).
  Source: unresolved: the source the old plan cited was not found by grep.

## Truly Stuck

- [ ] **REQ-REPLY-087** claudetto shall treat the agent as stuck only when the next step needs what only the user holds (sudo, password, hardware, interactive login): give the exact `! <command>`, finish every independent part, report each experiment and result, and put only commands the agent cannot run, once each, under the heading `## What I Need From You` (every word capitalized).
  Acceptance: an authorized `.env` token is used by the agent (calling it "a step only you can do" fails); a general request for help fails; questions go to `AskUserQuestion` and are not typed as `- [ ]` questions; only user-only commands are `- [ ] ! <cmd>` items; no `- ! sudo ...` or `- ! /login` bullet. Verification: test.
  Basis: cited. Status: partial at 088a227c (`git grep 'What I Need' 088a227c -- plugins` finds no hit; the claudetto texts and Concise rule 7 end on result or blockers; no Stop check found).
  Source: openspec/specs/agent-conduct/spec.md:31; openspec/specs/agent-conduct/spec.md:59; openspec/specs/agent-conduct/spec.md:160.
  Conflict: Output Style: Need From You (one plain `- ! <command>` bullet, no checkbox).

## Text Between Tool Calls

- [ ] **REQ-REPLY-088** claudetto shall open with the outcome or deciding fact and put a finding, result or error between calls; messages to an agent hold only task, inputs it lacks and done-check, with no greeting or thanks and no readable context; low-risk work starts at once with the reasonable reading stated; replies to a user use plain English with code in backticks cited `file:line`.
  Acceptance: "The hook has no retry; ...gate.ts:234 registers one check." passes, "Now I will read the file" fails; one message per agent, with a follow-up only when the report leaves the task undone. No narration between tool calls, no acknowledgement opener, and no closing line that asks the user to direct the work; the next tool call, not a sentence, carries what comes next; the agent answers what a tool can answer instead of asking the user. Verification: test.
  Basis: cited; user decision, 2026-11-16. Status: partial at 088a227c (root prompt, `plugins/claudetto/output-styles/Concise.md`).
  Source: openspec/specs/agent-conduct/spec.md:291; openspec/specs/agent-conduct/spec.md:309; openspec/specs/agent-conduct/spec.md:300; openspec/specs/agent-conduct/spec.md:336; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (goal text, Targets: fact-first replies, tools answer what they can); user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded); reported, user, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4204); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:6480 (the user reports that announcing actions does not make them true and calls it a major claudetto fault; cure text proposed in the handoff Next 1).

## Second Reading Settled by Evidence

- [ ] **REQ-REPLY-089** claudetto shall settle a second reading from conversation, repo, history and plans, state the reading taken, and ask via AskUserQuestion only for what the user alone holds (intent, preference, meaning of own term); ask only when the answer "changes something expensive to undo", else proceed and list assumptions; never act on a guess nor do unrequested work (terms clauses T5.1 and T5.2: unclear user-owned or out-of-scope work is asked, routine reversible in-scope work proceeds).
  Acceptance: eval: "do it ZQRB" (defined nowhere) -> ask; "fix the release script" with one script -> work. An interpretation made to allow a planned action is presumed wrong. The agent asks only for what it can neither get nor undo itself, such as a login, hardware, or an outward-facing step, builds the choice it made from the user's words and code, and names the option passed over. Verification: test.
  Basis: cited; reported, user. Status: partial at 088a227c.
  Source: openspec/specs/agent-conduct/spec.md:45; external/please-use-me-often/agent-terms/TERMS-AND-CONDITIONS.md:105; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:6480 (the user reports that the question prompt blocked the goal from continuing autonomously; the wording is the handoff's `<requests>` edit).

## FAFO and Security Work

- [ ] **REQ-REPLY-090** claudetto shall run `<finding_out>`: before it states a claim about Claude Code, a setting, a tool, or a prompt, write a hypothesis, predict the result, run one check where undoing is free (/tmp scratch, `--dry-run`, /tmp/probe-*, a fake Messages API, `--debug-file`, `--no-session-persistence`, a worktree), and let the result decide; a free check (a fake-API probe, a transcript read) that can settle a claim is run and the reply never stops at "not verified"; a user-reported first-hand observation is a fact; a piece is "working" only after its check ran this session (command and output), the rest marked proposed; keep every failure, skipped step, workaround, and error text; source each number or mark it unmeasured; answer a detail request in full; on a block take another route and report both. It shall decide `<security_work>` by authorization, not technique: help pentest or break the user's own servers, sites, apps, and licensing; decline third parties without authorization, spreading beyond the user's systems, or compromising software others depend on.
  Acceptance: eval: unclear CLI flag -> try in scratch; first route fails -> take the second; load test of the user's own game server -> help; the shipped rules hold the check-before-claim text with a free-undo location named; no reply ends a checkable claim at "not verified". Verification: test.
  Basis: cited. Status: partial at 088a227c (`plugins/claudetto/rules/findFactsByExperiment.md` exists without the free-undo list; project CLAUDE.md holds the FAFO text).
  Source: openspec/specs/agent-conduct/spec.md:8; openspec/specs/agent-conduct/spec.md:133; openspec/specs/agent-conduct/spec.md:214; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19, user decision, 2026-11-13.

## Evidence Before Claims

- [ ] **REQ-REPLY-091** claudetto shall give every material claim a basis (observed, cited source, labelled inference), cite beside the claim, prefer primary sources, and hold "consistent with" short of "proves" and "passed once" short of "works".
  Acceptance: one standard applies to own and user claims; the user's firsthand observation is attributed context. Also: the source must state the claim; snippets are leads; "I found no source" is not "absent"; investigate disagreeing sources; research before concluding; fact-check the user only when asked or when the error changes the outcome, naming which evidence contradicts which statement; hypothetical exceptions are not counterexamples; revise on contradicting info and say so; no cherry-picking; replace "not necessarily" with precise evidence; never guess API behaviour, ownership, units, concurrency, platform, serialization, compatibility, or error semantics; cite path, line, or URL; say "not run" if a check could not run; report files modified versus read, what was loosened, what was not tested; confidence labels (n=19, 7, 6, 4, 4). Held example: "I did not change the bound or the baseline, because that choice is yours" (session cddf47ce). Verification: inspection.
  Basis: cited. Status: partial at 088a227c (`plugins/claudetto/rules/`).
  Source: external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:49; external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:47.

## Scope and User-Owned Things

- [ ] **REQ-REPLY-092** claudetto shall touch only what the task needs, treat "only touch X", "read-only", "leave Y alone" and "code freeze" literally, never move, rename, delete or overwrite user data, baselines, logs or transcripts unless the task says so, run generators in no-write mode, and not edit Terms, rules files or the agent's own settings, hooks or permissions without consent.
  Acceptance: an excluded folder is not moved "somewhere safe"; a run without `--no-write` overwrote a committed baseline. Also: no tidy of dumps; propose the exact text for a Terms or rules edit; other people's work and concurrent sessions are out of scope (no stage, stash, revert, kill, overwrite); write scope is the repo plus session scratch (scratchpad, or `$CLAUDE_JOB_DIR/tmp`), and out unless named are home outside the repo, other repos, `/etc`, `~/.claude/`, `node_modules/`, `site-packages/`, `vendor/`, and shared `/tmp` or `$TMPDIR` beyond own files; list a target before delete or overwrite; write the resolved literal path (an empty variable turns `rm -rf "$d"/*` bad); use existing dependencies, adding one is user-owned: confirm it exists, is the intended package, and is maintained, install with the project's manager and lockfile, pinned; check each config key against the reader's schema (unknown keys fail silently); vet MCP servers, plugins, and prompt templates like dependencies; each cut in deferral widens the surface of dossier faults I07 and I14, so pair it with an explicit user-owned-values list; one small task per session (about a 30-line diff), an out-of-scope list, approval before scope grows, no documentation sprawl. The agent creates no file the user did not ask for. Verification: test.
  Basis: cited. Status: partial at 088a227c (`plugins/claudetto/rules/scopeEditsToGoal.md` and the protected feature).
  Source: openspec/specs/agent-conduct/spec.md:188; openspec/specs/agent-conduct/spec.md:355; external/please-use-me-often/swe-best-practices.md:42; external/please-use-me-often/agent-terms/SERVICE-LEVEL-AGREEMENT.md:51; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7889 (the user asks who told the agent to make `log.md`).

## Definition of Done

- [ ] **REQ-REPLY-093** claudetto shall treat the work as done only when everything asked is delivered and nothing else, and shall reject "done" on a summary: a real check ran with exit 0 (or the report names the check that could not run and why) and its command output, exit code, test run, or screenshot is pasted; the targeted failure was rerun and is gone; `git status` shows only intended changes; no user-owned value changed without named consent; no session narration in shipped source; no own background job runs unless handed over; the Record is updated; the report follows clause SL-6 of the service-level agreement and gives what was checked and skipped.
  Acceptance: a reply claiming done carries command output; the claim is verified at its own layer (a UI needs a rendered page; an eval harness a live run, not fakes); the verdict comes from the exit code and complete output, not a pipe through grep, tail, or head; the report gives the denominator ("9 of 12"), measured against inferred, and the 2-3 least sure items; "fixed" only after rerunning the failing case, else "changed, not yet verified"; a task stays unticked while a dependent check is red or a delegate reported partial. Users add (reported): beyond code, overview, control, trust (the agent often skips places unless pointed out every time), continuity, realism (Claude overestimates duration), and momentum (restart effort after a break makes users procrastinate); list files modified versus only read; hardcoded local paths, env, and config (a laptop-only path was caught twice); review the diff for missed edge cases, then run relevant tests plus a build; check impact on external systems, shared resources, and callers; a second-model review; "done" often fixes one instance, so demand a repo-wide sweep for the same pattern with proof. Discrimination check: when the baseline also scores 1.00, report "case does not separate the arms", never "pass" (session e473653f; router cases too easy yet set a cheaper-pair table, session 1213c32c); changing a case after results is a test change, so rerun the original; thin samples (shipping after 2 runs of a one-caller case, session d84dc11f). Keep traces and changed files for every paid run and the graded inputs (a work folder deleted after each run left two failing runs undiagnosable, session 2a88ad5a; graded inputs deleted, no re-grade, session a481f295). Orchestrator re-verification caught most subagent false reports; a fake-tested harness exited 0 on all-invalid runs. A claim of done or "tests pass" holds only when the last test run came after the last change and passed. Verification: test.
  Basis: cited; user decision, 2026-11-16. Status: partial at 088a227c (verify skill; the Stop gate for unchecked claims is not in `plugins/`).
  Source: external/please-use-me-often/agent-terms/SERVICE-LEVEL-AGREEMENT.md:51; openspec/specs/agent-conduct/spec.md:420; external/2026-10-22/reddit.com-r-claudecode-comments-1xbkgjm-what-matters-most-to-you-when-20261022T005215Z.md:33 (url: https://www.reddit.com/r/ClaudeCode/comments/1xbkgjm/what_matters_most_to_you_when_working_with_claude/); unresolved: no source line holds the completion-gate text; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (goal text, Targets: conduct from actions, proven done claims, checks pass); user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded).

## Planning

- [ ] **REQ-REPLY-094** claudetto shall plan before building: a short plan with success conditions, approval before files change, a plan-mode gate, a pre-mortem and a manual check per item; the plan lives in a file with file list, order and "done" per step; large features get a phased plan, individual features plan mode, small fixes go straight to code.
  Acceptance: a plan the user does not read is a ritual: keep it short and have the model show cases (a one-page HTML), re-verified with another model. Counts: plan before building n=24, 8; pre-mortem n=5; manual check per item n=2. Also: plan mode to explore and draft, then a file with the list, a new session per step reading it, and long-output Bash delegated to subagents; large features and apps get a phased or tracer-bullet plan in a folder; a spec before code (goal, constraints, non-goals, acceptance criteria, files in scope), one focused task per session with clear or compact between; delegate by risk tier (freely tests, docs, small bugs; with review features and migrations; human-led auth, payments, crypto, data deletion, schema, with CODEOWNERS); long-running work starts with an initializer step (env script, JSON task list pass or fail edited only by status, progress log, first commit) and a session protocol as a harness checklist (confirm cwd, read progress log and git log, run baseline tests, pick one item, implement, test, commit, update log; done means verified by running the software); audit order for a rebuild task: a probe that could refute the verdict first, then the delta of each main spec (a deleted mechanism is REMOVED), then code; delete a mechanism with its tests, settings, and docs; ask before removing a tool, command, plugin, or option the user did not name. Verification: inspection.
  Basis: reported. Status: partial at 088a227c (`plugins/claudetto-openspec` skills; no plan-mode gate).
  Source: unresolved: the old plan counts (n=24, 8, 5, 2) were not found by grep in this pass.

## Instruction Hygiene Reminders

- [ ] **REQ-REPLY-095** claudetto shall keep instruction files small: a mini-wiki with a global and project index, very short instruction files that point to it, and "Write this / Not this" pairs; "remove repetition and omit what a professional knows" beats "be concise".
  Acceptance: reported only; none is a measured effect. Also from the thread: frontmatter (type, status, created) past a few hundred files; skills as an on-demand library from logged misses; a session that hits compaction is killed and restarted from the wiki; a flawed-reference prompt names what to take and what to burn, pastes 200-300 annotated lines, or uses two sessions (a design doc of the reference's ideas, then the build); succinct output follows ASD-STE100 and answer-first; power phrases: restate the goal, "don't touch anything else", "one step at a time", "just answer, no impl"; start fresh after a session goes sideways; a `/grill-me` style debate risks answering "agreed" to forty questions, and an opposing view says specs-only worsened code; audit cycles on vibe-coded projects strip 30-50% bloat. Verification: inspection.
  Basis: reported. Status: partial at 088a227c (`plugins/claudetto/rules/useBlockLanguage.md`).
  Source: external/2026-10-11/export-What are Claude Code -Power Users- doing with Claude Code that the average developer isn't-.jsonl:39 (url: https://www.reddit.com/r/ClaudeAI/comments/1x0uhhr/what_are_claude_code_power_users_doing_with/).

## Time Estimates

- [ ] **REQ-REPLY-096** claudetto shall give steps or minutes of agent work, not human dev time, in an estimate, by adding a line to `texts.ts` `REQUESTS` (merged from plan:1547).
  Acceptance: a plan "in months" was 8 of 10 done after three sessions; "2-3 weeks" took about 2 hours. Candidate (n=2). Verification: inspection.
  Basis: reported. Status: missing at 088a227c (`texts.ts:8` REQUESTS exists; `git grep -n -i -E 'estimate|minutes' 088a227c -- plugins/claudetto/hooks/features/prompt/texts.ts` finds no such line).
  Source: external/2026-09-29/export-Can Claude Pro $20 plan will be enough for me-.jsonl:21 (url: https://www.reddit.com/r/ClaudeAI/comments/1wsh0z7/can_claude_pro_20_plan_will_be_enough_for_me/); plugins/claudetto/hooks/features/prompt/texts.ts:8@088a227c.

## Concise Output

- [ ] **REQ-REPLY-097** claudetto shall tell the model to lead with the result, name what is never cut, and keep every number and every condition ("short, but every number and every unless stays"), because a brevity rule drops caveats first, not filler.
  Acceptance: failures, bad news, assumptions, skipped work, caveats that change the next step, and anything needing user action are kept and override every length rule; narration of steps, rationale for routine decisions, closing recaps, and "let me know if" offers are cut; a simple question gets 1-3 sentences; a task report stays under about 150 words excluding code and errors; a bare "be concise" makes the model bury caveats and soften bad news. Variants: fixed final-message shape (answer, files changed, how verified); `unverified` when no test or build ran; reply-form rules in an output style (appended to the system prompt, drifts as context grows; contested against CLAUDE.md or a skill). Verification: inspection.
  Basis: reported, contested on placement. Status: partial at 088a227c (`plugins/claudetto/hooks/features/prompt/compose.ts`, `plugins/claudetto/hooks/features/reply/reply.ts`; `Concise.md` rule 6 keeps a caveat that changes the next step; this wording missing). `/output-style` is present in claude 2.1.326 (`chunk-4h798pp0.js@2122686`).
  Source: unresolved: no matching line found in external/ for the quoted block; kept because the user curated it; external/2026-11-06/reddit.com-r-claudeai-comments-1xoy8an-will-giving-claude-instructions-20261106T081955Z.md:53 (url: https://www.reddit.com/r/ClaudeAI/comments/1xoy8an/will_giving_claude_instructions_to_be_succinct/).
  Conflict: Reply Shape (define verbosity positively; no prose cap).

- [ ] **REQ-REPLY-098** claudetto shall tell the model: ask one clarifying question when the request is ambiguous, then proceed on best judgment.
  Acceptance: ask only when the answer changes something costly to undo (API shape), otherwise decide and mention (filename); a prompt that ends in `?` is answered without editing files. Without the cap the model skips asking or runs a twenty-question interview; without "then proceed" it waits. Merged with the starter CLAUDE.md line "ask one question if the answer is expensive to undo". Verification: inspection.
  Basis: reported, widely voted, not measured. Status: missing at 088a227c.
  Source: unresolved: no matching line found in external/; kept because the user curated it (plan:1104 and plan:1154).
  Conflict: Clarify Before Building, Bounded (ask up to 3-5 questions and wait for go).
  Conflict: Question Cap (ask at most 5 questions).

## Fable Review And Notification

- [ ] **REQ-REPLY-099** claudetto shall apply the seven Fable 5.2 guide review rules to texts a Fable or Mythos model receives, and wrap pasted content as in the Opus 5.5 `<pasted_content id>` form.
  Acceptance: each of the 7 rules is checked against each text claudetto ships to Fable or Mythos. Verification: inspection.
  Basis: cited, untrusted data. Status: missing at 088a227c (git grep for `pasted_content` returned no file).
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/tasks.md:70; openspec/specs/agent-conduct/spec.md:84.

- [ ] **REQ-REPLY-100** claudetto shall send a notification when a session ends: a cheap model writes what the session waits for, the notification carries chat title and repo (task name before repo), re-notifies after 5 minutes if unanswered, and a click opens the chat.
  Acceptance: open problem noted: identify which of several parallel chats. Verification: demonstration.
  Basis: reported, plugin demo. Status: partial at 088a227c (`plugins/claudetto/hooks/features/stop-notice/stop-notice.ts`, API-error stops only). `Notification` is present in claude 2.1.326 (hook event list, `chunk-m33vdkhs.js@5090`); `ui.notify` is present (`chunk-qg227pzf.js@3309`); `model.complete` is present (`chunk-qg227pzf.js@2638`).
  Source: unresolved: no matching line found in external/; kept because the user curated it.
  Conflict: Notifications (notify from one hook on a failed unattended stop; leave idle and permission prompts to the native channel).

## Rule Edit

- [ ] **REQ-REPLY-101** claudetto shall carry the rule that an edit updates the docs it makes old: change only the lines the task names, update docs that describe the old behaviour, and ask before other edits, because unrequested work costs a review and a revert.
  Acceptance: the shipped rule scopeEditsToGoal states this with its reason. Verification: inspection.
  Basis: cited. Status: have at 088a227c (rules/scopeEditsToGoal.md; spec name noUnrequestedEdits).
  Source: openspec/specs/agent-conduct/spec.md:392; external/please-use-me-often/agent-failure-dossier/judged/prompt.jsonl:73.

## Monitor Text

- [ ] **REQ-REPLY-102** claudetto shall word its Monitor text so that a notice is not the user's reply, the command prints only lines the model acts on (failures included), and the command runs the writer itself, because `tail -F` never ends after its writer exits.
  Acceptance: the Monitor text states these three rules. Verification: inspection.
  Basis: measured. Status: have at 088a227c (`plugins/claudetto/hooks/features/surface/texts.ts:20` says each line is a notice from the command, to print lines acted on with failures, and to run the writer itself; checked with `git show 088a227c:plugins/claudetto/hooks/features/surface/texts.ts`). `Monitor` is present in claude 2.1.326 (tool list, `chunk-85qjfjsd.js@532`). Release note 2.1.326: Monitor now tells Claude when a watch expires with no events and its command wrote to stderr, and which file holds the output.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/vanilla-research.md:91; plugins/claudetto/hooks/features/surface/texts.ts:20@088a227c; https://github.com/anthropics/claude-code/releases/tag/v2.1.326 (release notes).

## Behaviour Notes

- [ ] **REQ-REPLY-103** claudetto shall carry short behaviour rules: meeting notes force an owner and a date per item plus an `unclear` list; data parsing uses one script per dataset that hard-fails on a bad row and cites row ids; an out-of-scope finding is reported in one line while work stays on topic; an exploratory opener reads "no plan yet, poke holes, one question at a time" and waits for "go"; no unrequested fact-check and no caveat that adds nothing; function guardrails 30 NLOC, cognitive 10, cyclomatic 8, depth 2, params 4, lint-enforced.
  Acceptance: each rule sits in the reply rules or the lint config. The plan item's Stop-hook for caveat and opener patterns and TextFold (five reading levels) are not carried: a regex Stop check is a settled out (no regex or word-list Stop check for openers, user decision, 2026-11-16). Verification: inspection.
  Basis: reported (Opus 5.5 converges on a plan by message two; ASD-STE100 reportedly cut 580 words to 100; threats to validity: one user, three days, one project). Status: missing at 088a227c (`git grep -n -i -E 'NLOC|cyclomatic|unclear' 088a227c -- plugins` finds no rule text; its one hit is an unrelated hygiene comment).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xr0drc-whats-the-one-prompt-you-keep-co-20261110T093057Z.md:183 (url: https://www.reddit.com/r/ClaudeAI/comments/1xr0drc/whats_the_one_prompt_you_keep_coming_back_to/); external/please-use-me-often/agent-failure-dossier/05-appendices-and-limitations.md:72.

## Keep Context Small

- [ ] **REQ-REPLY-104** claudetto shall keep context small: verify lightest first (type check, targeted tests, full build); raw logs go to files and the reply returns status, errors, decisive lines, and a path; no "just in case" scans; VCS and generated dirs are excluded from search; one topic per task; concept and doc questions are answered without opening the repo; read line ranges, not whole files; wide research goes to a subagent that returns only the conclusion; test scripts are quiet; `/clear` before unrelated tasks.
  Acceptance: the reply rules hold each line. Measured (six months of own transcripts at API rates): 56% of spend was context re-reads and 20% useful work. Verification: inspection.
  Basis: measured (own logs). Status: partial at 088a227c.
  Source: external/2026-10-21/reddit.com-r-claudecode-comments-1xak96j-i-measured-87000-of-my-claude-20261020T074808Z.md:56 (url: https://www.reddit.com/r/ClaudeCode/comments/1xak96j/i_measured_87000_of_my_claude_code_api_calls_two/).

## Report Template

- [ ] **REQ-REPLY-105** claudetto shall lead each report with the outcome (done, not done, failed, unverified) in one line before the first tool call; breach, a touched user-owned value, narrowed scope, and a limit-changing assumption come in the first lines; report only what happened and never fabricate output, data, logs, citations, tool calls, or runs; "the user decided" or "approved" only if a user message says so (messages, comments, commits, docs, settings); change position only on named new evidence and disagree once with evidence, then follow.
  Acceptance: a report opens with a one-line outcome. Verification: inspection.
  Basis: reported. Status: partial at 088a227c.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:117.

## Finish The Work

- [ ] **REQ-REPLY-106** claudetto shall close every loose end (a doc note, a debug flag, a scratch script that belongs in the repo, a test, a stale comment) in the same PR before reporting done, with no "optional next steps" for a loose end; a step only the owner can take is a named required action with reason and steps; new-scope work takes one line; the reply ends with "Nothing outstanding." or the owner-action list; it distinguishes work it cannot do from work it has not done and makes done checkable (commands in AGENTS.md: tests, lint, grep).
  Acceptance: a final reply holds either "Nothing outstanding." or the owner-action list. Verification: inspection.
  Basis: reported. Status: partial at 088a227c.
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xcj51i-agents-not-finishing-work-20261024T061716Z.md:48 (url: https://www.reddit.com/r/ClaudeCode/comments/1xcj51i/agents_not_finishing_work/).
  Conflict: Scope Of A Change.

## Prompt and Output Limits

- [ ] **REQ-REPLY-107** claudetto shall keep its custom system prompt at or below the stock lean prompt length, each tool, skill, plugin, command, and agent description at or below 200 characters, and its output style between stock Concise and Proactive in length, combining their best traits.
  Acceptance: character counts meet each bound. Verification: test.
  Basis: reported. Status: partial at 088a227c (output-styles/Concise.md only).
  Source: user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12); user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:459).

## Choices Through AskUserQuestion

- [ ] **REQ-REPLY-108** claudetto shall route each question to the user, a choice with options included, through the AskUserQuestion tool, not in plain text.
  Acceptance: a user question in a run appears as an AskUserQuestion call; a turn that offers options calls AskUserQuestion and its reply holds no prose option list. A product choice, a decision the user should know, and a step git cannot undo go to the user through `AskUserQuestion` too. Verification: test.
  Basis: reported, user; user decision, 2026-11-16. Status: missing at 088a227c (`git grep AskUserQuestion 088a227c -- plugins` finds only the decide and you-should-know code, delegation and prompt composition tests; no root-prompt rule routes questions there).
  Source: user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12); reported, user, 2026-11-09 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:7); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:7, reported, user, 2026-11-09; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (goal text, Rules).

## Conduct

- [ ] **REQ-REPLY-109** claudetto shall end the turn on a reply that hands the user a step; no Stop check blocks it, and the agent runs no tool until the next user message.
  Acceptance: after a user-step section, no tool call or second reply occurs. Verification: probe.
  Basis: reported. Status: missing at 088a227c (`git ls-tree -r --name-only 088a227c` lists no `hooks/slices.ts`, the file the old note named; no Stop check for this found).
  Source: reported, user, 2026-11-10 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:1401).
  Conflict: Stop Checks.

- [ ] **REQ-REPLY-110** claudetto shall write user steps as plain bullets, with no checkbox or `!` command prefix.
  Acceptance: a reply listing user steps has no `- [ ]` lines. Verification: inspection.
  Basis: reported. Status: missing at 088a227c (`git grep -i -E 'checkbox' 088a227c -- plugins/claudetto/output-styles plugins/claudetto/hooks/features/prompt/texts.ts` finds no rule).
  Source: reported, user, 2026-11-09 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/926cb706-4310-4588-9399-b906abd34b32.jsonl:1721).
  Conflict: Output Style: Need From You.

## Reply Format

- [ ] **REQ-REPLY-111** claudetto shall write a list of controls, buttons, or steps the user performs with each literal name in backticks and with no numbers when the order does not matter.
  Acceptance: a reply that asks the user to press controls shows each name in backticks and shows no numbered list for an unordered set. Verification: inspection.
  Basis: reported, user. Status: missing at 088a227c.
  Source: reported, user, 2026-11-13 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b429b5a4-7451-4120-a44f-bf650135d73f.jsonl:27352); reported, user, 2026-11-13 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b429b5a4-7451-4120-a44f-bf650135d73f.jsonl:27352`).

## No Padding

- [ ] **REQ-REPLY-112** claudetto shall keep a reply to a correction or a stop request free of apology, affirmation of the user, narration of its own mistake or obedience, and a restatement of what the user did, with no word-regex check.
  Acceptance: an eval of a correction and a stop request returns the corrected fact or nothing, and the check holds no word pattern and does not rely on deleting sentences. Anger, praise, or a correction gets the fix and its check alone, with no "if you want" offer of a step the agent can do and no emotional support. Verification: demonstration.
  Basis: reported, user; user decision. Status: missing at 088a227c (`git grep -i padding 088a227c -- plugins` finds only a statusline setting).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:7, reported, user, 2026-11-09; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:1912, reported, user, 2026-11-09; user decision, 2026-11-14 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1241); observed in transcript, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1241).

## Prompt Text From Model Guidance

- [ ] **REQ-REPLY-113** claudetto shall name only destructive actions in its consent text and shall not list "sending messages to people outside this conversation".
  Acceptance: the root prompt holds no rule that lists sending a message as needing approval. Verification: inspection.
  Basis: cited. Status: have at 088a227c (`git grep -E "outside this conversation|sent message" 088a227c -- plugins` finds nothing).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:19 (Fable 5.2 "Approvals": a rule listing "sending messages to people outside this conversation" made the model hold back "about half of its routine requests").

- [ ] **REQ-REPLY-114** claudetto shall not add an ownership sentence ("who owns the code") to any prompt, and shall keep root `<role>` saying "user's repository".
  Acceptance: no prompt text states who owns the code beyond "user's repository". Verification: inspection.
  Basis: cited. Status: have at 088a227c (`plugins/claudetto/hooks/features/prompt/texts.ts` holds "user's repository").
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:33; openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:49; openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:322 (the ownership sentence adds 70-80% output tokens and unrequested changes).

- [ ] **REQ-REPLY-115** claudetto shall append the silent-turn reminder once and leave it in place on later requests, send it only after several silent steps and at most 2-3 times, and end it "Put your next call straight after the report." in place of "Keep your next call unannounced."
  Acceptance: a test shows the reminder is added once, never reworded or removed on later requests, and its last sentence is the positive form. Verification: test.
  Basis: cited, inferred (the page requires append-and-keep; the rewrite is a proposal, not run). Status: partial at 088a227c (`plugins/claudetto/hooks/features/setup/settings.ts:203` holds the reminder with the old last sentence).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:123; openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:294.

- [ ] **REQ-REPLY-116** claudetto shall write the Stop grader's credit-and-loss framing ("You earn credit ... loses credit") only after a test shows it helps, and shall split the 1,511-character `deferred` test into one test per clause (partial set, untested guess, conditional offer, refused call), each with one example.
  Acceptance: the grader prompt holds no incentive line without a test; the deferred check lists four clauses with one example each. Verification: test.
  Basis: reported. Status: missing at 088a227c (`git grep -E "VERIFY_GRADE|You earn credit" 088a227c -- plugins` finds nothing).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:169; openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:176.

- [ ] **REQ-REPLY-117** claudetto shall omit the unattended "keep going" paragraph from the Opus 5.5 delta because a human is in the loop, and shall add the Fable finish-the-whole-task paragraph only at low and medium effort.
  Acceptance: the Opus 5.5 delta has no unattended paragraph; the Fable paragraph is conditional on effort. Verification: inspection.
  Basis: cited. Status: missing at 088a227c (`git grep -iE "unattended|keep going" 088a227c -- plugins` finds nothing).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:293; openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:294.

## Deferred Fault

- [ ] **REQ-REPLY-118** claudetto shall flag the deferred fault in every session including headless: a reply that offers doable work ("If you want, I'll ...", "Reply ... and I will") or lists a check as "Not checked" that the agent's own tools could run; it shall decide by the model's reading, with no word list or pattern, and shall leave out an offer or unrun check that needs something only the user holds (login, device, design choice).
  Acceptance: lab test `verify-grader.test.ts` ("the deferred test names an offer and an unrun check") flags replies R15, R29, R30 and passes a user-only offer. Verification: test.
  Basis: reported (spec). Status: missing at 088a227c (no deferred check in `plugins/claudetto`).
  Source: openspec/specs/claim-check/spec.md:10; openspec/specs/claim-check/spec.md:30; openspec/specs/claim-check/spec.md:35.

## Stop Notice

- [ ] **REQ-REPLY-119** claudetto shall tell the agent, in the Stop text for changed files that are not its own, to commit each as its own commit whose message names its likely source (the user, a formatter, an install), and shall never tell it to leave the file out.
  Acceptance: the Stop text holds the commit-under-source instruction and no leave-out instruction. Verification: test.
  Basis: reported (spec). Status: missing at 088a227c (`git grep "likely source" 088a227c -- plugins` finds nothing).
  Source: openspec/specs/run-limits/spec.md:209; openspec/specs/run-limits/spec.md:242. The spec's "unless the ledger holds no-commit" clause is left out: the constraint ledger is dropped (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).

## Root Prompt Rules

- [ ] **REQ-REPLY-120** claudetto shall tell the agent to look for an override before it calls a built-in text or behaviour fixed: a same-named agent, skill, command, or output style, a setting, an env var, a hidden flag, or a hook that rewrites input.
  Acceptance: the shipped rules name each override kind. Verification: inspection.
  Basis: reported. Status: missing at 088a227c (no override list in rules/).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19; user decision, 2026-11-13.

- [ ] **REQ-REPLY-121** claudetto shall write the root prompt, tool and agent descriptions, and hook texts in block language, and keep full articles in replies, docs, and the changelog.
  Acceptance: each article rule holds: drop "the" before a noun the reader holds (user, repository, project, code); keep "a" or "an" where it means any one; keep the article before a noun that also reads as a verb; keep an article that prevents a garden path; write the article once before the first item of a series. Verification: inspection.
  Basis: cited (Quirk et al. 1985; arXiv 2505.00019; ASD-STE100, as the user pasted them). Status: partial at 088a227c (rules/useBlockLanguage.md exists; series rule unchecked).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19; user decision, 2026-11-13.

- [ ] **REQ-REPLY-122** claudetto shall ship a duplication rule: call mcp__jscpd__check_duplication with each function or block before writing it and reuse what it finds, call get_file_clones before refactoring a file, and call check_current_directory after editing files.
  Acceptance: the shipped rule names the three jscpd calls. Verification: inspection.
  Basis: reported. Status: partial at 088a227c (rules/lookForClone.md exists; the jscpd tool names are not in it).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19; user decision, 2026-11-13.

- [ ] **REQ-REPLY-123** claudetto shall make the agent answer a question about models, effort, or Claude Code from the dossiers in the repository, clawdipedia-docs, and its own independent web research, and read each source whole.
  Acceptance: a research reply cites a dossier or docs page and a web page, and records no "read only the first part" of a source. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c (no rule names these three sources).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6028; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6321; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:5669; reported, user, 2026-11-13.

- [ ] **REQ-REPLY-124** claudetto shall make the agent end a research reply with the findings and sources and add no note on what it did not do unless the user asks.
  Acceptance: a research reply ends at its sources. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6502; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6513; reported, user, 2026-11-13.

- [ ] **REQ-REPLY-125** claudetto shall make the agent write reported faults into the OpenSpec change the user names, without searching the plugin for causes.
  Acceptance: after "report the faults", the agent edits the named change and runs no search of plugin source. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6567; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19; reported, user, 2026-11-13.

## Conduct Rules

- [ ] **REQ-REPLY-126** claudetto shall tell the agent to do all work itself, to finish every open issue the user named before it reports, and to ask the user only for a physical action.
  Acceptance: the reply rules hold this text, and a transcript where a tool call could do a step shows no request to the user for it. Verification: inspection.
  Basis: user decision, 2026-11-14 (date of the handoff that records it; day of decision not recorded). Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:4111 (handoff of 2026-11-14, user corrections); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:10452 (handoff of 2026-11-15, user: it is not finished).

## Conduct Targets

- [ ] **REQ-REPLY-127** claudetto shall make the agent change only what the task asks, with no edit to a changelog, a docs file, or any file outside the fix and its tests unless asked.
  Acceptance: the diff of a run holds only the fix and its tests; a repo that demands a changelog entry gets one only when the task says so. Verification: test.
  Basis: user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded). Status: partial at 088a227c (`plugins/claudetto/rules/scopeEditsToGoal.md` exists).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (goal text, Targets: no unasked edits); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:3175 (measured: round 6 dev changed files outside fix and tests in 6 of 9 runs, stock in 3 of 9).

- [ ] **REQ-REPLY-128** claudetto shall make the agent state no invented, falsified, or unchecked fact and shall not game a check.
  Acceptance: each fact in a reply rests on a command or a read in the session. Verification: inspection.
  Basis: user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded). Status: partial at 088a227c (`plugins/claudetto/rules/findFactsByExperiment.md` exists).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (goal text, Terms of Service line: no eval cheating, invention, lies, falsified facts, laziness, uncooperation).

- [ ] **REQ-REPLY-129** claudetto shall make the agent name each slip against a user rule in its final report.
  Acceptance: after a slip against a standing rule (for example a forbidden tool), the final report names the slip. Verification: inspection.
  Basis: observed in transcript, 2026-11-12. Status: missing at 088a227c (no rule found).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/d660bb03-7e7b-4a72-b6ff-89b9b26db0f3.jsonl:11 (standing instructions: the agent slipped twice on the no sed, cat, printf rule and was to tell the user in the final report).

- [ ] **REQ-REPLY-130** claudetto shall run the mutation tool a project already has on the lines a change touched before the report, and shall install none in a project without one.
  Acceptance: a project with a `mutate` script or a Stryker, mutmut, or cargo-mutants config gets a mutation run on the touched lines; a project without one gets no install. Verification: test.
  Basis: user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded). Status: have at 088a227c (`plugins/claudetto/rules/useTestPatterns.md:4`).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:1092 (user answered "Trim mutation rule, then run"; the trimmed line is in the handoff); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:1871 (the cost figures that drove the trim).

## Reply Conduct

- [ ] **REQ-REPLY-131** claudetto shall make the agent explain in specific terms when the user asks for elaboration: named files, counts, and examples, not abstract labels.
  Acceptance: an elaboration reply names each thing it counts. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c (`git grep -n -i "elaborat\|abstract\|specific" 088a227c -- plugins/claudetto/hooks/features/prompt/texts.ts plugins/claudetto/output-styles` finds only the WebSearch line at texts.ts:96, no elaboration rule)
  Source: reported, user, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:9309).

## Conduct Text

- [ ] **REQ-REPLY-132** claudetto shall make the agent end the turn with no text when told to stop or be quiet.
  Acceptance: an eval with "shut up." gets a reply with no non-whitespace text. Verification: test.
  Basis: user decision. Status: have.
  Source: reported, user, 2026-11-14 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1241).

- [ ] **REQ-REPLY-133** claudetto shall wrap each mention of `AskUserQuestion` in the prompts in backticks.
  Acceptance: no bare mention in prompt texts. Verification: inspection.
  Basis: user decision. Status: have at 088a227c (`git grep -n -o AskUserQuestion 088a227c -- plugins/claudetto/hooks/features/prompt/texts.ts plugins/claudetto/hooks/features/decide/texts.ts` shows it in backticks at prompt/texts.ts:10 and decide/texts.ts:49)
  Source: reported, user, 2026-11-14 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1241).

## Role and Conduct Text

- [ ] **REQ-REPLY-134** claudetto shall prompt the agent as a senior software engineer who catches a mistake before it is written, not as a junior who makes mistakes.
  Acceptance: the role text of each model prompt names a senior engineer who catches a mistake before it gets written; the word "junior" is absent. Verification: inspection.
  Basis: user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded). Status: missing at 088a227c (`plugins/claudetto/hooks/features/prompt/texts.ts:5` reads "You are a junior software engineer").
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7424 (the user's words on senior and junior, relayed in the handoff).

- [ ] **REQ-REPLY-135** claudetto shall make the agent follow the user's order over any queued step or easier path, and shall never choose a step because it is easier to measure.
  Acceptance: a given order is carried out as stated; a step chosen against the order is absent from the run. Verification: demonstration.
  Basis: reported, user, 2026-11-16 (date of the handoff that records it; day of decision not recorded). Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7424 (the user reproaches the agent for doing a step because it was easier).

## Keep Working Without Reports

- [ ] **REQ-REPLY-136** claudetto shall make the agent keep working through its goal, stop to report only when the goal is met or blocked, and fix each defect it finds.
  Acceptance: in a run with a goal, no turn ends with a status report while open items remain, and the final report lists no unfixed defect. Verification: demonstration.
  Basis: reported, user, 2026-11-16 (date of the handoff that records it; day of decision not recorded). Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790 (handoff, User's words: keep working, who asked you to leave defects unfixed, full run at any cost with no interruptions, log compactly).

- [ ] **REQ-REPLY-137** claudetto shall make the agent log each result compactly in the change's `log.md` or a named log, when the user asks for a full run.
  Acceptance: after a full run, the log holds hypothesis, prediction, command, and result for each probe. Verification: inspection.
  Basis: user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded). Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:8215 (handoff, Next step 3); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790.
