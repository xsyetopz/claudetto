# Community Evidence on Sonnet and Haiku as Workers

## Sources

All sources are public Reddit threads.
Each claim names its generation: "5.5" for the in-scope generation, "older" for 4.5 and Sonnet 5.

- "Is Sonnet actually good enough for Claude Code, or do you mostly stick with Opus?" (2026-08-25)
  <https://www.reddit.com/r/ClaudeAI/comments/1vyaq77/is_sonnet_actually_good_enough_for_claude_code_or/>
- "I feel like most people underestimate Sonnet for coding" (2026-07-27)
  <https://www.reddit.com/r/ClaudeAI/comments/1v7miu8/i_feel_like_most_people_underestimate_sonnet_for/>
- "What am I missing by only using sonnet when it comes to coding?" (2026-09-25)
  <https://www.reddit.com/r/ClaudeAI/comments/1wpxt1c/what_am_i_missing_by_only_using_sonnet_when_it/>
- "What's the use case for Haiku?" (2026-09-25)
  <https://www.reddit.com/r/ClaudeCode/comments/1wpwpcl/whats_the_use_case_for_haiku/>
- "What tasks are Haiku really great at?" (2026-07-23)
  <https://www.reddit.com/r/ClaudeCode/comments/1v4o7dk/what_tasks_are_haiku_really_great_at/>
- "Those of you actually using Haiku regularly, what am I missing?" (2026-03-18)
  <https://www.reddit.com/r/ClaudeCode/comments/1rx5hej/those_of_you_actually_using_haiku_regularly_what/>
- "What are your thoughts on Haiku 4.5?" (2025-11-13)
  <https://www.reddit.com/r/ClaudeAI/comments/1ow5lk0/what_are_your_thoughts_on_haiku_45/>
- "Haiku 4.5 nearly year old" (2026-09-01)
  <https://www.reddit.com/r/ClaudeCode/comments/1w44s2m/haiku_45_nearly_year_old/>
- "Haiku 4.5's responses are extremely over the top, excessively wasteful, and oftentimes unnecessary" (2026-01-08)
  <https://www.reddit.com/r/ClaudeAI/comments/1q7rj1l/haiku_45s_responses_are_extremely_over_the_top/>
- "Six subagents on three different models in one turn. I built something to actually watch that happen" (2026-08-29)
  <https://www.reddit.com/r/ClaudeAI/comments/1w1njpj/six_subagents_on_three_different_models_in_one/>

## Findings

### F1. No Thread Covers Sonnet 5.5 or Haiku 5.5

The newest threads date from 2026-09-25.
At that date the posters still wait for the 5.5 small models.
One poster wrote: "I'm eagerly awaiting Haiku 5.5, which should appear in few weeks."
("What's the use case for Haiku?", 5.5 status: not released.)
Another poster wrote "unless Sonnet 5.5 is a hit" ("What am I missing by only using sonnet when it comes to coding?").
All evidence on Sonnet and Haiku below is about older models: Sonnet 5, Haiku 4.5.
Treat it as a prior, not as a measurement of the 5.5 generation.

### F2. Sonnet (Older) Does Well with a Written Plan

- A user plans in a larger model and implements in Sonnet: "sonnet is great for coding, as long as i have a plan for the code, first."
  ("I feel like most people underestimate Sonnet for coding", older.)
- A user does extensive coding on Sonnet with a Pro plan and rarely needs Opus.
  ("Is Sonnet actually good enough for Claude Code", older.)
- Another user prefers Opus: "I would rather spend more tokens outright than have opus clean up after sonnet."
  ("Is Sonnet actually good enough for Claude Code", older.)
- One commenter built a split: Haiku and Sonnet build, Opus reviews.
  The same commenter warns that if review bounces the work two or three times, the build is paid more than once.
  ("Is Sonnet actually good enough for Claude Code", older.)

### F3. Opus 5.5 Displaced Sonnet 5 for Some Users

- An API-priced user moved from 99 percent Sonnet to Opus 5.5 and says it costs less, runs faster, and does a better job.
  ("What am I missing by only using sonnet when it comes to coding?", Opus 5.5 vs older Sonnet.)
- Another user says tasks that took several rounds with Sonnet 5 now take one round with Opus 5.5.
  ("What am I missing by only using sonnet when it comes to coding?", same comparison.)
- Lesson: turn count, not price per token, drives cost.
  A cheap worker that needs more rounds can cost more than a strong worker.

### F4. Haiku (Older) Fits Read-Heavy, Verifiable Grunt Work

- Log parsing and dense context reading: "higher tier models like opus would be overkill and expensive".
  ("What tasks are Haiku really great at?", older.)
- Scanning folders and summaries, run by a larger model as subagents.
  ("What tasks are Haiku really great at?", older.)
- Classification and tagging: a user found almost no difference between Haiku, Sonnet, and Opus.
  ("What tasks are Haiku really great at?", older.)
- Monitoring CI status and reporting back to the main thread.
  ("What's the use case for Haiku?", older.)
- Cold-read of code and PR text, with an instruction to list what is unclear.
  ("What tasks are Haiku really great at?", older.)
- Unambiguous linter fixes and invalid imports.
  ("Those of you actually using Haiku regularly", older.)
- Haiku is "extremely literal and unlikely to freelance a solution you didn't ask for".
  ("What tasks are Haiku really great at?", older.)

### F5. Haiku (Older) Failure Patterns That Cost Turns

- Silent confidence: "Haiku just does the wrong thing coherently."
  ("Those of you actually using Haiku regularly", older.)
- Reasoning across files: "you pay for the mistake downstream."
  ("Those of you actually using Haiku regularly", older.)
- Weak instruction following on partial scope: a user asked it to commit a few of 30 files and it committed all.
  ("What's the use case for Haiku?", older.)
- Lost context across turns, and made-up content in summaries.
  ("What tasks are Haiku really great at?" and "What's the use case for Haiku?", older.)
- Needs very clear prompts and cannot deduce intent.
  ("What are your thoughts on Haiku 4.5?", 4.5.)
- More logic mistakes than Sonnet, but good on small, well-described problems.
  ("What are your thoughts on Haiku 4.5?", 4.5.)

### F6. Cost Is Often Context Re-Read, Not the Model

- One user metered 21 billion tokens: "97 of every 100 were Claude re-reading things it had already read."
  ("Is Sonnet actually good enough for Claude Code", older, not model specific.)
- Lesson: short worker contexts and few turns matter more than the model row.

## Implications for the Dotclaude Agents

- `investigator` (read-only search and reading) fits Haiku 5.5 on the older evidence in F4.
  Keep a rule to report sources and to stop on ambiguity, because of F5.
- `researcher` that reads across many files and must reason about them fits Sonnet 5.5, not Haiku, because of F5.
- `implementer` with a written plan and a known check fits Sonnet 5.5 (F2).
  Without a plan, F2 and F3 argue for a stronger model.
- `debugger` has an unknown cause, so it needs cross-file reasoning.
  F5 and F3 argue against a cheap model unless Sonnet 5.5 shows the strength of Opus 5.5.
- `reviewer` and `planner` stay on Opus 5.5 (F2 split: cheap build, strong review).
- A `maxTurns` limit is a cost guard for cheap workers that loop, but F3 and F6 show that retries drive cost.
  A tight limit on a weak worker moves the retry cost to the orchestrator.
- Simple mechanical jobs (commit, CI monitor) fit Haiku only with exact scope in the prompt (F5).

## Open Questions

- Does Sonnet 5.5 match Opus 5.5 on implementation with a plan?
  No community thread answers this yet.
- Does a turn limit on `investigator` stop loops or only cut good runs short?
- Re-run this search after threads about 5.5 Sonnet and Haiku appear.
