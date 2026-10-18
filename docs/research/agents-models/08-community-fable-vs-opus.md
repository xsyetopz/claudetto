# R08: Community Evidence, Fable/Mythos 5.1 Versus Opus 5.5

All sources are Reddit threads. Most claims are one user's report.
The tables come from the official announcement charts.

## Sources

- "Introducing Claude Opus 5.5, the first model in our new Claude 5.5 family": <https://www.reddit.com/r/ClaudeAI/comments/1wnecg9/introducing_claude_opus_55_the_first_model_in_our/>
- "Opus 5.5 Still Overthinks at Higher Effort" (announcement tables): <https://www.reddit.com/r/ClaudeAI/comments/1wnj4jl/opus_55_still_overthinks_at_higher_effort/>
- "Opus 5.5 is the real deal- same accuracy as Fable 5.1 on my 25 graded tasks, faster, and way cheaper": <https://www.reddit.com/r/ClaudeAI/comments/1woicc1/opus_55_is_the_real_deal_same_accuracy_as_fable/>
- "Opus 5.5 leads the code review benchmark": <https://www.reddit.com/r/ClaudeCode/comments/1wq0y2d/opus_55_leads_the_code_review_benchmark/>
- "Opus 5.5 and GPT-6 Sol dropped on the same day, so I lined up every benchmark I could find": <https://www.reddit.com/r/ClaudeAI/comments/1wnjyp1/opus_55_and_gpt6_sol_dropped_on_the_same_day_so_i/>
- "Opus 5.5 is the default now so who still switches to Fable and why": <https://www.reddit.com/r/ClaudeCode/comments/1wpg0fy/opus_55_is_the_default_now_so_who_still_switches/>
- "Stupid question - if Opus 5.5 is better than Fable 5.1, why would we ever use Fable 5.1-": <https://www.reddit.com/r/ClaudeAI/comments/1wnxeql/stupid_question_if_opus_55_is_better_than_fable/>
- "Can someone explain me the difference between Opus and Fable now-": <https://www.reddit.com/r/ClaudeAI/comments/1wnhb2e/can_someone_explain_me_the_difference_between/>
- "Opus 5.5 vs Fable 5.1 - this doesnt seem right": <https://www.reddit.com/r/ClaudeAI/comments/1wnmro5/opus_55_vs_fable_51_this_doesnt_seem_right/>
- "Opus 5.5 for everything, or mixing models across plan - implement - review-": <https://www.reddit.com/r/ClaudeCode/comments/1wq1pjh/opus_55_for_everything_or_mixing_models_across/>
- "Opus 5.5 for planning and implementing -": <https://www.reddit.com/r/ClaudeAI/comments/1woikqy/opus_55_for_planning_and_implementing/>
- "Opus 5.5 at Medium is cheaper and faster than Opus4.6-Fable5.1 at high": <https://www.reddit.com/r/ClaudeCode/comments/1wocoug/opus_55_at_medium_is_cheaper_and_faster_than/>
- "Be careful with Opus 5.5's confidence": <https://www.reddit.com/r/ClaudeCode/comments/1wqnjkp/be_careful_with_opus_55s_confidence/>
- "Opus 5.5 as a fleet orchestrator- early notes from a real workload": <https://www.reddit.com/r/ClaudeAI/comments/1wnmbqg/opus_55_as_a_fleet_orchestrator_early_notes_from/>
- "Aight I get it, Opus 5.5 is actually peak": <https://www.reddit.com/r/ClaudeAI/comments/1wqcara/aight_i_get_it_opus_55_is_actually_peak/>

## Findings: Measured

### Price and Score by Effort (Announcement Tables)

Source: "Opus 5.5 Still Overthinks at Higher Effort".
The format is score and cost per attempt.

| Benchmark | Opus 5.5 medium | Opus 5.5 max | Fable/Mythos 5.1 low | Fable/Mythos 5.1 max |
| --- | --- | --- | --- | --- |
| Terminal-Bench 4.0 | 57.6% / $2.94 | 64.8% / $11.24 | 40.2% / $5.70 | 55.8% / $19.50 |
| FrontierCode v1.1 | 54.6% / $0.80 | 54.4% / $6.19 | 52.8% / $2.47 | 50.3% / $12.82 |
| CursorBench 4.0 | 52.5% / $2.90 | 57.8% / $13.43 | 45.1% / $5.44 | 51.8% / $17.28 |
| GDPval-AA v2.1 | 1576 / $0.86 | 1846 / $8.92 | 1450 / $1.41 | 1735 / $9.59 |
| WANDR | 62.8% / $11.20 | 72.3% / $37.92 | 63.3% / $23.25 | 68.7% / $49.02 |

- Opus 5.5 at medium beats Fable/Mythos 5.1 at every effort on three of the five tables.
  The three are Terminal-Bench, CursorBench, and GDPval-AA.
- Fable/Mythos 5.1 at `low` effort leads Opus 5.5 at `low` on FrontierCode (52.8% against 47.3%) and WANDR (63.3% against 31.2%).
  Opus 5.5 at `medium` closes both gaps, and costs less ($0.80 against $2.47, and $11.20 against $23.25).
  So Fable/Mythos wins only when Opus is held at `low` effort.
- For Opus 5.5, `xhigh` costs 76% to 106% more than `high` and gives at most +2.2 points (Terminal-Bench), per the same thread.
  The thread concludes that `medium` or `high` is the best value for coding.

### Independent Run, 23 Tasks

Source: "Opus 5.5 is the real deal- same accuracy as Fable 5.1 on my 25 graded tasks, faster, and way cheaper".
Both models passed 100% of tasks with automatic graders.
Cost per passed task was about $0.09 for Opus 5.5 and about $0.26 for Fable/Mythos 5.1.
The average time was 27 s against 41 s.
The author says the sample is small, with 7 to 11 attempts per tier.

### Code Review Benchmark

Source: "Opus 5.5 leads the code review benchmark".
One commenter reports 88% precision for GPT-6 Sol against 84% for Opus 5.5 on `max`.
The same commenter reports a score of 80.3% for Sol against 82.3% for Opus 5.5, at a little over 3x the cost.
The chart is an image, and the comments do not give a Fable/Mythos 5.1 review score.

## Findings: Reported

### Where Fable/Mythos 5.1 Is Said to Win

- Very large, long tasks.
  Source: "Opus 5.5 is the default now so who still switches to Fable and why".
  The top comment (68 points) says Fable/Mythos "still beats opus 5.5 on extremely large long tasks".
- Judgement and big-picture design.
  Same thread: one user gave both models the same audit prompt and says Opus "fails to consider a lot of cases".
  Source: "Stupid question - if Opus 5.5 is better than Fable 5.1, why would we ever use Fable 5.1-".
  A 36-point comment says Opus is "not designed for long horizon ambiguous tasks".
- Planning.
  Source: "Can someone explain me the difference between Opus and Fable now-".
  One user says Opus "falls apart on planning compared to Fable or Astra".
  A reply says 5.5 is "so good" that most users need no Fable/Mythos.
- Review catches.
  Source: "Be careful with Opus 5.5's confidence".
  A user says each Fable/Mythos 5.1 review "catches gaps" that Opus 5.5 left.

### Where Opus 5.5 Is Said to Win

- Source: "Stupid question - if Opus 5.5 is better than Fable 5.1, why would we ever use Fable 5.1-".
  On a 6-hour autonomous design run, a user stopped Fable/Mythos because the Opus 5.5 output was "noticably more coherent".
- Source: "Opus 5.5 effort level-".
  A user finds `xhigh` for task orchestration "at least as good as Fable/Mythos but like 1/4 or 1/5 the usage".
- Source: "Aight I get it, Opus 5.5 is actually peak".
  A user finds Opus 5.5 at `max` better than Fable/Mythos 5.1 at `max` for coding spec work, at far lower cost.

### Mixed Models in Practice

- Source: "Opus 5.5 as a fleet orchestrator- early notes from a real workload".
  The author uses Opus 5.5 for design and review, and Sonnet and Haiku for work that a check can verify.
- Source: "Can someone explain me the difference between Opus and Fable now-".
  A user says an Opus orchestrator for other Opus sessions loops on self-correction notes.
  This supports the rule that no subagent orchestrates.

## Implications for the `claudetto` Agents

- No role has measured evidence that earns Fable/Mythos 5.1 as a default.
  Fable/Mythos 5.1 costs about 3x more per passed task for equal accuracy in the 23-task run.
  Per-token price is $10 / $50 for Fable/Mythos 5.1 against $4 / $20 for Opus 5.5 ("Opus 5.5 is the default now so who still switches to Fable and why").
- `planner` has the strongest reported case for Fable/Mythos, but only as anecdote.
  Keep `planner` on `opus-5-5`, and let the user override to Fable/Mythos for very large or ambiguous plans.
- `reviewer` has one report that Fable/Mythos finds gaps that Opus misses.
  Keep `reviewer` on `opus-5-5`, and give it the diff and requirements only.
- `debugger` has no Fable/Mythos evidence in these threads.
- Effort: `medium` is the best default for Opus 5.5, and `high` for hard review or debug.
  Do not default to `xhigh` or `max`, because the cost doubles for small gain.
- Never set Opus 5.5 to `low` for a planner or reviewer and expect Fable/Mythos-level output.
- Sonnet 5.5, Haiku 5.5, and `maxTurns` have no evidence in these threads.

## Open Questions

- Is there a code review score for Fable/Mythos 5.1 on the same chart as Opus 5.5 and Sol?
- Does the planning advantage of Fable/Mythos 5.1 hold in a controlled test with a blind grader?
- Will a Fable 5.5 release change the cost ratio?
- What does Sonnet 5.5 score against Opus 5.5 at `medium`, in cost per passed task?
