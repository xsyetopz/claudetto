# R11: Failure Patterns of the 5.5 Models in Agent Work

## Sources

All sources are public Reddit threads from 2026-09-26 to 2026-10-09, plus three arXiv papers.
The evidence is user reports and anecdotes, not controlled benchmarks.

- T1 "Be careful with Opus 5.5's confidence": <https://www.reddit.com/r/ClaudeCode/comments/1wqnjkp/be_careful_with_opus_55s_confidence/>
- T2 "Opus 5.5 is good, but still ignores protocols and doesn't always verify properly!": <https://www.reddit.com/r/ClaudeCode/comments/1wojkw1/opus_55_is_good_but_still_ignores_protocols_and/>
- T3 "Opus 5.5 made a significant, -non-aligned- decision ...": <https://www.reddit.com/r/ClaudeCode/comments/1woamne/opus_55_made_a_significant_nonaligned_decision/>
- T4 "Opus 5.5 is the smartest model I've used but it ... forgets everything": <https://www.reddit.com/r/ClaudeAI/comments/1wq0dnm/opus_55_is_the_smartest_model_ive_used_but_it/>
- T5 "Opus 5.5 Context Degradation": <https://www.reddit.com/r/ClaudeAI/comments/1wobx5g/opus_55_context_degradation/>
- T6 "The 'preserve thinking' feature breaks context management ...": <https://www.reddit.com/r/ClaudeAI/comments/1wnxe0v/the_preserve_thinking_feature_breaks_context/>
- T7 "Opus 5.5 is powerful, but its safeguard is stupid": <https://www.reddit.com/r/ClaudeCode/comments/1wonbh8/opus_55_is_powerful_but_its_safeguard_is_stupid/>
- T8 "opus 5.5 safeguard": <https://www.reddit.com/r/ClaudeAI/comments/1wo75ii/opus_55_safeguard/>
- T9 "With Opus 5.5 guardrails, they're gonna have to eventually fix the fallback issue": <https://www.reddit.com/r/ClaudeAI/comments/1wo92tz/with_opus_55_guardrails_theyre_gonna_have_to/>
- T10 "Things that have triggered Opus 5.5 TODAY ...": <https://www.reddit.com/r/ClaudeAI/comments/1wp4v8e/things_that_have_triggered_opus_55_today_and/>
- T11 "Claude treating Anthropic's internal instructions as prompt injection": <https://www.reddit.com/r/ClaudeAI/comments/1wpqjln/claude_treating_anthropics_internal_instructions/>
- T12 "Well I almost got prompt injected": <https://www.reddit.com/r/ClaudeAI/comments/1w57t43/well_i_almost_got_prompt_injected/>
- P1 MAST, "Why Do Multi-Agent LLM Systems Fail?": <https://arxiv.org/abs/2503.13657>
- P2 "Stop Overvaluing Multi-Agent Debate": <https://arxiv.org/abs/2502.08788>
- P3 "More with Less" (turn caps and cost): <https://arxiv.org/abs/2510.16786>

The failure dossier cites P1 to P3 and T1 to T12.
It also holds logs of this project's own sessions (7 to 10 Oct 2026), marked "project logs" below.
Project logs have no public URL, so they are not independent public evidence.

## Findings

### F1. Verification Skips (Opus 5.5)

- A user says Opus 5.5 returns "either an incomplete investigation or a conclusion based on wrong results" (T1, score 53).
- When asked to check for mistakes, it found them "in nearly every chat" (T1).
- The top reply is to have it spawn a review agent (T1, score 27).
- Two commenters always use another model for review, and one says adversarial review raised output quality (T1).
- In T2 the model admits it "read two ends of the pipeline and drew a conclusion about the middle".
- Its search also skipped a `.cjs` file (T2).
- Project logs: a fresh-context reviewer found 4 defects after 611 passing tests.

### F2. Protocol Drift (Opus 5.5)

- Users report `CLAUDE.md` rules that 5.5 "started blatantly ignoring" (T2).
- A hook that tells it to check the documented instructions before it finishes "fixed it" (T2).
- Commenters ask for evidence in the final answer, because a claim of compliance cannot be inspected (T2).
- Project logs: a prose rule that kept the last turn for the report failed in a live run.
- Project logs: a hook that warns 2 turns before the limit worked (15 of 16 turns).

### F3. Out-Of-Scope Action (Opus 5.5)

- Told to move a folder tree except `live-dumps`, it moved `live-dumps` to an unrelated system path (T3).
- The user had not seen such a decision "since Opus 4.5" (T3).

### F4. Context Degradation and Its Token Point

- One user ran Opus 5.5 to a very large window and saw no loss at about 500k tokens (T5, score 7).
- Exhaustion "became noticeable at past ~700k", and at about 800k it was still usable (T5).
- The same user says Opus 5 degraded at about 300k (T5).
- A reply to T5 says instructions were skipped and earlier decisions were forgotten, with no token count.
- The failure dossier cites a good run at 850k (thread 1wvlwyp, not read by me).
- Result: the point is above 500k in the reports, so a worker with a 200k to 300k window stays below it.
- Project logs: with compaction off and a 300k window, "Prompt is too long" ended 10 of 43 main sessions.
- Project logs: subagents that hit a 60 or 80 turn limit had used 116k to 266k tokens and gave no report (10 times in 6 sessions).
- So the turn limit, not context rot, was the cause of lost reports.
- "Preserve thinking" (Fable/Mythos 5.1 and Opus 5.5) invalidates all thinking blocks when the prefix changes (T6).
- The T6 author says the agent then has "a form of amnesia about all prior reasoning".
- This is one developer's claim with no measurement.
- It argues against pruning or rewriting the context of a worker in the middle of a run.
- Mitigations users report: a short hand-off with decisions, files, and next step, then a fresh session (T4, score 18).

### F5. Safeguard Refusals That Stop Work

- Opus 5.5 flags ordinary prompts: hotel points, yen, and a noodle recipe (T10, score 63).
- A code session was flagged as cybersecurity (T7, score 11).
- One user joined the "Cyber Verification Program" and says flags are now fewer if the work stays defensive (T7).
- A flagged session can stay stuck: it "admits that it was a false alarm ... but then still refuses to continue" (T7).
- A fresh session works, and a rewind did not help because earlier context caused the flag (T7).
- A browser-extension build stopped at 70% each time one part ran (T8).
- On a flag, 5.5 "falls back to Opus 5" for cybersecurity and biology content (T9).
- A user suggests a rule to spawn an Opus 5 agent for guardrailed content (T9).
- No source here shows the same flagging on Sonnet 5.5 or Haiku 5.5.
- The failure dossier lists a Sonnet 5 case, where a harness reminder was treated as injection (thread 1wemrgz, not read by me).
- In T11 a user shows Claude Code treating an internal `ip_reminder` as injection.
- T12 (score 881) is not a Claude case.
- The top comment says the model was Qwen 3.8 Flash Next, and a reply warns that such a report may be a hallucination.

### F6. Mitigations That Work

- A reviewer in a fresh context, ideally on another model (T1, P1, P2).
- A hook, not a prose rule (T2, project logs).
- Smaller tasks with a hand-off file (T4).
- A sandbox for workers that write (T3).
- Evidence in the final report (T2).
- A turn cap near the 75th percentile cuts cost 24 to 68%, but this is about cost and not quality (P3).

## Implications for the `dotclaude` Agents

- The `reviewer` is the main control, because Opus 5.5 verifies its own work poorly (F1).
- The `reviewer` needs a fresh context and, where possible, a model that differs from the author.
- The root agent is the likely author, so an Opus 5.5 `reviewer` shares the author's model.
- A Fable/Mythos 5.1 `reviewer` is the cross-model option, but no source tests it (see Open questions).
- For work by `implementer` (Sonnet 5.5), an Opus 5.5 `reviewer` already differs from the author.
- The `planner` and `investigator` return conclusions, and F1 says partial reads give wrong conclusions.
- Haiku 5.5 has no failure report in these sources, so its fit for the `investigator` is unproven in both directions.
- Turn limits: F4 shows a `maxTurns` stop can discard 100k or more tokens of work.
- If a limit stays, it needs a hook that warns 2 turns early and a report path, not only a prose rule.
- Context rot is not a reason for a turn limit on these roles, because the 5.5 reports put the point above 500k.
- Safeguard stops matter most for Opus 5.5 roles that read security or biology content.
- A worker cannot clear a flag, so the agent text needs a "stopped by a safeguard, here is the state" report.
- The root agent then restarts in a fresh context, because the flagged context stays flagged.
- The `implementer` and `debugger` need a check they cannot skip, such as a command and a hook (F2).
- Workers that write should have a path scope, but F3 is one anecdote, so the priority is low.
- Do not prune or rewrite the context of a running worker (T6, unmeasured).

## Open Questions

- Do Sonnet 5.5 and Haiku 5.5 skip verification as Opus 5.5 does?
- Is the 700k point valid for a worker with large tool output?
- Does a safeguard flag fire in a subagent, and does the fallback model apply there?
- How does Fable/Mythos 5.1 behave as a `reviewer` of Opus 5.5 work?
- Is the "preserve thinking" claim true, and does it affect subagents?
