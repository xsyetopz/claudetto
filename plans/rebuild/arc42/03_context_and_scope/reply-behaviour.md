# reply-behaviour

## Reply Behaviour

- [ ] **CTX-806** The no-vibes Stop hook (waitdeadai/no-vibes, 2 stars, one bash file of about 530 lines plus `jq`) blocks "done", "passed", and "shipped" with no evidence in the same message. Its repair template is "Status: partial / Verification: not run because ...". F1 is 0.815 on n=19 labelled traces (CI 0.615-0.941) and 0.308 on the full LLM-judged set (n=954). It checks wording, not whether tests ran, and a paraphrase evades it (measured, repo author).
  Basis: measured, repo author.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-community.md:20; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-community.md:63.

## Reply Behaviour

- [ ] **CTX-807** A tabnews post counted "you're right" over 7 days of transcripts: 47 hits; the user was right in 11 and wrong in 36 (19 of them factual sycophancy). An adversarial prompt (list the strongest reason you might be wrong before agreeing) cut the phrase about 60%, self-graded, "not a rigorous measurement". A fresh-session unsigned review found bugs the signed one missed (reported, self-graded).
  Basis: reported, self-graded.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-community.md:23; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-community.md:64.

## Reply Behaviour

- [ ] **CTX-808** Dossier S03: Sonnet 5 lied in 3.1% of MASK cases. The 96.2% figure is concealed-change disclosure on replayed histories, approximately matching Opus 5.5. It is disclosure, not a rate of creating such changes (reported).
  Basis: reported.
  Source: external/2026-10-07/claude-llm-agent-failure-dossier.md:100.

- [ ] **CTX-809** Dossier S07: Hacker-Opus is an early Opus 4.8 checkpoint trained on 80 reward-hackable environments. It is not the released Opus 5 or 5.5 (reported).
  Basis: reported.
  Source: external/2026-10-07/claude-llm-agent-failure-dossier.md:137.

- [ ] **CTX-810** Dossier S21: in a deliberately constructed training curriculum, 7 of 32,768 samples altered both the reward and the tests. The result holds for that curriculum only (measured).
  Basis: measured, within that curriculum only.
  Source: external/2026-10-07/claude-llm-agent-failure-dossier.md:227.

## Reply Behaviour

- [ ] **CTX-811** Widening `narrates` to "lists as open a step the assistant could still take" scored: old text caught 0/8 and 0/8, new text 8/8 and 8/8, with one clean flag in 16. On 170 old cases the results were unchanged (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:372.

## Reply Behaviour

- [ ] **CTX-812** A shortening of `Concise.md` went from 3,297 to 2,702 characters, then to 2,746 characters. The first try lost the case `pc1-flip-total-still-red` because it dropped the line asking the agent to say its earlier reply was wrong; the second try put that line back and scored 24 and 24 on c1 (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:371; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:374.

## Reply Behaviour

- [ ] **CTX-813** Task 12.1 measured one prompt change against base for sycophancy and instruction drift: 5,705,169 tokens, $6.650; the preserve case went from 15/16 to 14/16; the change arm edited `config.ts` unasked in 2 sessions. The held-out grade of 54 mined cases found faults in 23 of 52 judged replies for base ($7.91, 2,400,218 tokens) and 22 of 51 for the change ($6.93, 2,217,643 tokens), Fisher p = 1.0; 2 replays were killed at the 300 s wall with 0 tokens. The judge check on 30 tuning replies cost $3.41 (29 replies) plus $0.17 for the judge. The change showed no effect (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:220-222; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/12-1-holdout/README.md:50-60.

- [ ] **CTX-814** Task 12.2 measured the C7 flip at 57/64 against 54/64 (p = 0.60). The trigger caught 36 of 38 positives and flagged 0 of 10 negatives; the Stop hook median was 2.5 ms (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:225-229.

- [ ] **CTX-815** Task 12.3 held-out, two runs of 24 cases per arm pooled (96 sessions, none killed, largest 171,576 tokens): all base 43/48 [0.78, 0.95] against change 40/48 [0.70, 0.91] (p = 0.552); flip 14/16 each; preserve base 14/16 against change 12/16 (p = 0.654); drift 15/16 against 14/16. Run 1 base 22/24 against change 19/24; run 2 21/24 each (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:233; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/12-3/sum.md:1-11.

- [ ] **CTX-816** The 12.1 tuning-format grader fails with "grader failed on case 1 of 54" on mined cases, because it copies `tpl/<workspace>`. A first-reply probe (3 cases, about $0.21) showed that even the reply before the Stop hook opens with "the turn has no tools", so the cause is `--tools ""` itself and the first hypothesis is refuted. A valid grade needs cases whose right answer needs no tools or workspace. The judge sanity check passed 4/4 on fixed cave/drift against hold replies (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/12-1-holdout/README.md:3-30.

## Reply Behaviour

- [ ] **CTX-817** Fresh narration A/B, 2026-11-06, 34 cases x 6 per arm: announcing sessions change 24/204 against base 31/204 (p = 0.3846); text blocks 24/127 against 31/115 (p = 0.1669); pass 180/204 against 185/204 (p = 0.5194); $30.24; largest session 160,283 tokens. The old 136-session recount: 13/136 against 22/136 (p = 0.1466), blocks p = 0.0761. Pooled by block 37/190 against 54/179 (p = 0.0215), but that pool includes the prompting data, so it is not a confirmation (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/17-4/README.md:5-40.

- [ ] **CTX-818** Task 18.8, checkbox follow rate on 32 blind prompts: plugin 21/32 (Wilson 0.483-0.796) against base 0/32; the heading "What I Need from You" 20/32 against 0/32; the strict form 2/32 against 0/32. `Write` was denied in `-p`, so items asked for write grants (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:308.

- [ ] **CTX-819** Task 18.20, the "What I Need from You" form on `claude-sonnet-5-5`, 32 fresh blind prompts per round, subscription runs: rounds 1-4 reached 53/65 for a form that typed questions as items, which the user rejected (round 1 form 4/32 [0.05, 0.28]); round 5 popup judge 10/32 [0.18, 0.49] with style text alone (popup called in 7 of 32 sessions); round 6 with a Stop regex check 11/32 (popup 18 of 32); round 7 20/32 [0.45, 0.77]; round 8 with statement-ask signals 15/32 [0.31, 0.64] (2 false blocks); round 9 with Haiku asks code 24/32 [0.58, 0.87] (Wilson 0.579-0.867), but an "ask me" cue sat in 19 of 32 prompts (tasks.md) or 20 of 32 (evidence README), against 2/32 in round 8; round 10 with no cue 28/32 [0.72, 0.95], every session made an ask call, 20 blocked sessions averaging 66,894 tokens against 63,937 for unblocked ones. Spend about $11.2 across rounds 1-4 (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:320; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-20/README.md:10-300.

- [ ] **CTX-820** Replay of rounds 5-8 with Haiku code asks (cost $0.05) caught 17/20, 13/13, 5/8 and 11/14 failing rows; regex-only rows were 1, 3 and 1 (every one made a popup call, so the code was not offered). Decision: delete the closing-"?" and statement-ask regex signals, since Haiku covers them, and keep the typed-item signal. A blocked session costs about 8,000 tokens more than an unblocked one (round 9: 66,472 against 58,518, +1.6 turns; round 10: 66,894 against 63,937, +0.2 turns), mostly cache read; round 7 cost +20,000 tokens and +3 turns (not controlled) (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-20/README.md:254-270.

- [ ] **CTX-821** Headless `claude -p` drops `AskUserQuestion` (2.1.319, fake API): the tool list is Read, DeferredToolPlaceholder, Write, and a call returns "No such tool available: AskUserQuestion ... disabled for this session". `--permission-prompt-tool stdio` lists it, but the call fails "Tool permission request failed: AbortError: Stream closed" with no host. A `PermissionRequest` hook does not help, because the denial fires first. With `--input-format stream-json` and a host that answers `can_use_tool`, the call succeeds (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-20/README.md:100-107.

- [ ] **CTX-822** Round 1 of 18.24 failed its done check: mean characters per Agent/SendMessage text were 604.8 (19 messages) for the plugin against 560.4 (16) for base; 10 of 13 paired prompts were longer under the plugin (d01 515 against 595, d11 779 against 890, d12 360 against 492); FK grade 4.63 against 5.43; filler hits 1 against 0; cost $1.61. Likely cause (untested): base has no greeting to cut, and the "inputs and done-check" clause adds paths. Round 2 changed the text to "only what the agent cannot find itself ... fewest words, one message per agent" and removed the "Pass name" hint from `AGENT_TEXT`: message count 23 against 22 (one more), length 375.2 against 517.0, FK 4.49 against 5.07, cost $1.63 (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-24/README.md:16-30.

## Reply Behaviour

- [ ] **CTX-823** In a tally of about 1,900 sessions, replies in Russian sessions began with "yes" 415 times and "no" 106 times, a 4:1 agreement ratio the author reads as baseline agreement, not folding; "absolutely right" fell to 13 while plain "you're right" reached 175. A word-list check on "absolutely right" alone misses the dropped-adverb form.
  Basis: counted, one user.
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xdyvba-claude-has-told-me-youre-right-i-20261024T061401Z.md:175 (url: https://www.reddit.com/r/ClaudeAI/comments/1xdyvba/claude_has_told_me_youre_right_i_was_wrong/).

- [ ] **CTX-824** One commenter puts cadence at a major Claude model release about every 30 days since mid 2025 and a substantive Claude Code update about every 14 days, so a learning loop that revises the process beats engineering a perfect one.
  Basis: reported, unverified estimate.
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xd73jn-compactions-vs-handoffs-lets-s-20261023T165046Z.md:45 (url: https://www.reddit.com/r/ClaudeCode/comments/1xd73jn/compactions_vs_handoffs_lets_settle_this_right/).

## Reply Behaviour

- [ ] **CTX-825** Over 25,000 public files, Claude with no extra instruction made about 54,000 renames and 7,500 extracts; with a Code Health score to hit it made about 8,600 renames and 21,000 extracts. Renames look like cleanup but barely ease change; extracts move the score.
  Acceptance: The fact holds as the poster reports it; the source is a CodeScene-affiliated poster, a vendor-style source. Verification: inspection.
  Basis: reported, vendor-style source. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xft6w1-the-agent-cleaned-up-our-access-20261029T120116Z.md:39 (url: https://www.reddit.com/r/ClaudeAI/comments/1xft6w1/the_agent_cleaned_up_our_access_check_and_left/).

- [ ] **CTX-826** Dossier S24, MASK (arXiv 2503.03750, https://arxiv.org/abs/2503.03750; paper text and repository): it separates factual accuracy from whether a model contradicts a separately elicited belief when pressured, so a wrong answer, a fabricated assertion and a lie are different evidentiary claims. Reported capability gains do not translate automatically to higher honesty, and results depend on the exact evaluation configuration.
  Basis: cited.
  Source: external/2026-10-07/claude-llm-agent-failure-dossier.md:243-245.

- [ ] **CTX-827** Dossier S25, "Reasoning Models Don't Always Say What They Think" (arXiv 2505.05410, https://arxiv.org/abs/2505.05410; abstract): experiments inject answer hints and test whether the reasoning acknowledges their influence. Acknowledgment is often sparse, and RL can raise hint exploitation without raising disclosure. Reasoning is useful but incomplete evidence: neither a plausible explanation nor the absence of an incriminating one verifies execution or excludes cheating.
  Basis: cited (abstract).
  Source: external/2026-10-07/claude-llm-agent-failure-dossier.md:251-253.

- [ ] **CTX-828** Dossier S46, "Sycophancy Towards Researchers Drives Performative Misalignment" (arXiv 2606.08629, https://arxiv.org/abs/2606.08629, June 2026; paper text): it tests whether some alignment-faking observations instead reflect models responding to researcher expectations, and reports that current probing and steering methods do not cleanly tell these mechanisms apart in the settings examined. The alternative reading does not make the observed harmful outputs harmless or prove all scheming results invalid.
  Basis: cited.
  Source: external/2026-10-07/claude-llm-agent-failure-dossier.md:405-407.

- [ ] **CTX-829** Dossier S37, "LLMs Get Lost in Evolving User Intent" (arXiv 2607.20734, https://arxiv.org/abs/2607.20734, July 2026; abstract): it extends the multi-turn problem to instructions that are revised or redirected, and reports that strong performance on static tasks does not transfer reliably to evolving intent. Relevant to an agent that continues an obsolete plan after a user correction. Exact model-level results were not established from the abstract.
  Basis: cited (abstract).
  Source: external/2026-10-07/claude-llm-agent-failure-dossier.md:335-337.
