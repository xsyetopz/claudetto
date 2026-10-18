# Community Evidence on Effort Levels

All threads are on Reddit, from the first two weeks after the Opus 5.5 launch.
No Anthropic staff reply is marked in these threads.

## Sources

- "Opus 5.5 Still Overthinks at Higher Effort": <https://www.reddit.com/r/ClaudeAI/comments/1wnj4jl/opus_55_still_overthinks_at_higher_effort/>
- "Claude Code ships a per-model table of what each effort level costs": <https://www.reddit.com/r/ClaudeAI/comments/1wjr89j/claude_code_ships_a_permodel_table_of_what_each/>
- "Claude Code effort level and model selection | Claude": <https://www.reddit.com/r/ClaudeAI/comments/1wkg2w8/claude_code_effort_level_and_model_selection/>
- "Opus 5.5 at Medium is cheaper and faster than Opus4.6/Fable5.1 at high": <https://www.reddit.com/r/ClaudeCode/comments/1wocoug/opus_55_at_medium_is_cheaper_and_faster_than/>
- "Sonnet 5.5 is not worth using it unless at Low/Med effort": <https://www.reddit.com/r/ClaudeCode/comments/1wsqfzk/sonnet_55_is_not_worth_using_it_unless_at_lowmed/>
- "Question: What's the best effort setting for Opus 5.5?": <https://www.reddit.com/r/ClaudeAI/comments/1woarfb/question_whats_the_best_effort_setting_for_opus_55/>
- "Opus 5.5 effort level?": <https://www.reddit.com/r/ClaudeAI/comments/1wokoyo/opus_55_effort_level/>
- "Sweet spot for opus 5.5 when it comes to effort": <https://www.reddit.com/r/ClaudeCode/comments/1wrt6jm/sweet_spot_for_opus_55_when_it_comes_to_effort/>
- "Opus 5.5: which Reasoning Effort to Plan?": <https://www.reddit.com/r/ClaudeCode/comments/1wom8wo/opus_55_which_reasoning_effort_to_plan/>
- "Claude Opus 5.5 Effort Level": <https://www.reddit.com/r/ClaudeCode/comments/1wz26fr/claude_opus_55_effort_level/>
- "What effort are you running Opus 5.5?": <https://www.reddit.com/r/ClaudeCode/comments/1wxgdol/what_effort_are_you_running_opus_55/>
- "How do you guys know how much effort to use?": <https://www.reddit.com/r/ClaudeCode/comments/1wuo1mi/how_do_you_guys_know_how_much_effort_to_use/>
- "What's the ideal Opus 5.5 reasoning effort for really tough, deep thinking ...": <https://www.reddit.com/r/ClaudeCode/comments/1wwregz/>
- "Pro users, which model and reasoning level are you using?": <https://www.reddit.com/r/ClaudeCode/comments/1wtx7f1/>
- "Most complex tasks you've had haiku 5.5 handle?": <https://www.reddit.com/r/ClaudeCode/comments/1x38ecn/most_complex_tasks_youve_had_haiku_55_handlewhat/>
- "Why does Haiku 5.5 have effort levels ...": <https://www.reddit.com/r/ClaudeAI/comments/1x096m6/why_does_haiku_55_have_effort_levels_like/>
- "I built a Claude Code mod on Haiku 5.5 (or Jev) that picks the effort per prompt": <https://www.reddit.com/r/ClaudeCode/comments/1x19b2c/>

## Findings: Measured

M1.
A user tabulated the charts of the Opus 5.5 announcement (accuracy / cost per task).
This is vendor data.
Source: "Opus 5.5 Still Overthinks at Higher Effort".

| Benchmark | low | medium | high | xhigh | max |
| :- | :- | :- | :- | :- | :- |
| Terminal-Bench 4.0 | 38.5% / $1.29 | 57.6% / $2.94 | 64.2% / $3.88 | 66.4% / $7.35 | 64.8% / $11.24 |
| FrontierCode v1.1 | 47.3% / $0.40 | 54.6% / $0.80 | 54.0% / $1.09 | 51.4% / $2.25 | 54.4% / $6.19 |
| CursorBench 4.0 | 43.7% / $1.18 | 52.5% / $2.90 | 56.0% / $3.97 | 56.0% / $6.99 | 57.8% / $13.43 |

M2.
Medium to high gives +6.6, -0.6, and +3.5 points on the three benchmarks.
High to xhigh costs 76 to 106 percent more for +2.2, -2.6, and 0 points.
So `high` is the last level whose gain pays for its cost (same thread).
M3.
A table in the Claude Code binary gives token use per level with `high = 1`.
`opus-5` is 0.67 low, 0.76 medium, 1.60 xhigh, 1.70 max.
`sonnet-5` is 0.47 low, 0.74 medium, 2.41 xhigh, 5.59 max.
The rows compare levels inside one model only, and the posted table has no 5.5 row.
Source: "Claude Code ships a per-model table of what each effort level costs".
M4.
On the Sonnet 5.5 against Opus 5.5 Pareto chart, Sonnet is cheaper at low to xhigh and dearer at max.
Readers disagree: "Sonnet high is only slightly better than Opus low, but it cost 30% more."
Source: "Sonnet 5.5 is not worth using it unless at Low/Med effort".
M5.
One user ran Sonnet 5.5 high and Opus 5.5 high as subagents on a low and a medium task.
Sonnet was faster and cheaper but left bugs.
Sonnet then Opus review cost more and took longer than Opus alone, in both tasks (n=2), per "Sonnet 5.5 is not worth using it unless at Low/Med effort".

## Findings: Reported

R1.
`medium` is the default for most users.
In the effort threads, about 35 of 60 commenters who name a level say `medium`, about 15 say `high`, and about 6 each say `xhigh` and `max`.
Example: "Medium for 98% of things.
High for the other 2%."
Source: "What's the ideal Opus 5.5 reasoning effort for really tough, deep thinking ...".
R2.
Six or more users report that Opus 5.5 overthinks at `xhigh` or `max`.
Example: "This is the first model I've seen where going higher legitimately can complicate things because it over thinks."
Source: "Opus 5.5 effort level?".
Also "Sweet spot for opus 5.5 ..." (useless regression tests at `max`).
R3.
About 8 users prefer `high` or more for planning and review.
"Opus 5.5: which Reasoning Effort to Plan?" has `max` for a coordinator and medium Opus for coders.
"Claude Opus 5.5 Effort Level": a team lead uses `high`, and `xhigh` for code reviews.
R4.
`medium` is enough when the work is well specified.
"How do you guys know how much effort to use?": "The more you know how you want something, the lower the effort you can use."
The same thread: "Medium for writing code (I don't trust this level with high level planning)."

R6.
Sonnet 5.5 gets mixed reports.
Pro: `medium` for plan-driven code when requirements are clear ("Pro users, which model and reasoning level are you using?").
Con: "it trades token for speed.
It costs more token than Opus at the same effort level" (same thread).
At least 4 users say Opus 5.5 `medium` replaced their Sonnet use ("Sweet spot for opus 5.5 ...").
R7.
Haiku 5.5 has almost no evidence.
One user says "Haiku 5.5 is said to be best at high effort" ("Most complex tasks you've had haiku 5.5 handle?").
R8.
Subagents inherit the session effort unless the agent definition sets `effort`.
Source: the mod-bot summary of "Claude Code effort level and model selection | Claude" (471 points).
A reply in that thread confirms that the agent frontmatter overrides it.
R9.
Changing effort on Opus 5.5, Sonnet 5.5, Haiku 5.5, and Fable/Mythos 5.1 keeps the prompt cache.
This is a quote from the Claude Code docs in "I built a Claude Code mod on Haiku 5.5 ...".
Earlier posts in "Claude Code effort level and model selection | Claude" say the opposite, so the first claim is outdated for 5.5 models.

## Implications for the `claudetto` Agents

- `medium` is the evidence-backed default, so `implementer` and `researcher` at `medium` fit (R1, R4, M2).
- `planner` and `reviewer` at `high` fit (R3, M1).
  Do not set `xhigh` or `max` as an agent default.
  `xhigh` costs 76 to 106 percent more for 0 to 2 points (M2).
- `debugger` at `high` fits the common rule: raise effort when `medium` failed (R3, R4).
  The root orchestrator can pass a stronger model or effort for a hard case.
- A Sonnet 5.5 worker is cheap only at low to xhigh (M4), and review by Opus can cost more than Opus alone (M5).
- `investigator` on Haiku 5.5 at `medium` has no direct evidence (R7).
  `medium` is the safe default, and `high` is the one level a user names for Haiku.
- Pin `effort` in each agent definition, because the default is to inherit the session level (R8).
  An effort value has no cache cost on 5.5 models (R9), so it costs nothing to pin.
- No thread discusses `maxTurns`.

## Open Questions

- No independent test compares Opus 5.5 `medium` and `high` for plan quality.
  Only vendor charts and opinion exist.
- No test compares Sonnet 5.5 `medium` and Opus 5.5 `medium` in cost per accepted change.
- Is there an `opus-5-5` row in the binary table?
  The posted table has none.
- The `claude.dev` blog post cited in "Token optimization from Anthropic ..." says "Medium should be your daily driver".
  This report did not fetch it, so verify it before use.
