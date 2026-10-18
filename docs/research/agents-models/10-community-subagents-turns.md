# Community Evidence on Subagents, Orchestration, and Turn Limits

## Sources

All threads are public Reddit threads.

- T1: "What the hell is a turn limit (200-turn limit) and why are subagents suddenly hitting them?" <https://www.reddit.com/r/ClaudeCode/comments/1woaxj7/what_the_hell_is_a_turn_limit_200turn_limit_and/>
- T2: "TIL and potential PSA: you can lose subagent work when hitting the 5hr limit" <https://www.reddit.com/r/ClaudeAI/comments/1umuvyu/til_and_potential_psa_you_can_lose_subagent_work/>
- T3: "Opus 5.5 as a fleet orchestrator: early notes from a real workload" <https://www.reddit.com/r/ClaudeAI/comments/1wnmbqg/opus_55_as_a_fleet_orchestrator_early_notes_from/>
- T4: "Opus 5.5 is so fast I barely use parallel tasks anymore" <https://www.reddit.com/r/ClaudeCode/comments/1wpvr6g/opus_55_is_so_fast_i_barely_use_parallel_tasks/>
- T5: "How do you keep up with 5+ agents at the same time?" <https://www.reddit.com/r/ClaudeAI/comments/1wqroed/how_do_you_keep_up_with_5_agents_at_the_same_time/>
- T6: "Anyone running a mostly (fully-) agentic engineering lifecycle with Claude Code?" <https://www.reddit.com/r/ClaudeCode/comments/1wq80vn/anyone_running_a_mostly_fully_agentic_engineering/>
- T7: "Implementing large features using Ai in big code bases?" <https://www.reddit.com/r/ClaudeAI/comments/1woeja6/implementing_large_features_using_ai_in_big_code/>
- T8: "I analyzed 246 repos and 57 papers on agent harnesses. Here's what actually works." <https://www.reddit.com/r/ClaudeAI/comments/1wpzynz/i_analyzed_246_repos_and_57_papers_on_agent/>
- T9: "I ran Claude Code across all 89 tasks of Terminal-Bench 2.1 (267 container runs)" <https://www.reddit.com/r/ClaudeCode/comments/1wq4bvy/i_ran_claude_code_across_all_89_tasks_of/>
- T10: "Claude Code Workflow Harness Change" <https://www.reddit.com/r/ClaudeCode/comments/1wr8cw1/claude_code_workflow_harness_change/>
- T11: "Goal and Loop - kinda the same?" <https://www.reddit.com/r/ClaudeCode/comments/1uaxlt6/goal_and_loop_kinda_the_same/>
- T12: "Is plan mode still worth it?" <https://www.reddit.com/r/ClaudeCode/comments/1ws7gvb/is_plan_mode_still_worth_it/>
- T13: "When should I use a Skill, a Slash Command, or a Sub-Agent in Claude?" <https://www.reddit.com/r/ClaudeAI/comments/1orozs4/when_should_i_use_a_skill_a_slash_command_or_a/>
- T14: "Claude reached its tool-use limit" (a web chat limit, not a subagent limit) <https://www.reddit.com/r/ClaudeCode/comments/1ruwa9h/claude_reached_its_tooluse_limit_frustrated_me_a/>
- T15: "If your prompts & skills have grown into an entire development pipeline" <https://www.reddit.com/r/ClaudeCode/comments/1wr4uat/if_your_prompts_skills_have_grown_into_an_entire/>

Only T1 and T2 are about subagent limits.
Treat each claim as one user report.

## Findings

### Turn Limits

- One user on version 2.1.280 and Opus 5.5 reports a fixed 200-tool-call stop for fork subagents only. T1: "they have a stringent limit of 200 tool calls before being forcefully stopped".
- The user wants it removed or made configurable, and argues it makes resumed agents rush. T1.
- This is one user's reasoning and not a measurement.
- No thread defends a subagent turn limit, and no thread reports a limit that stopped a runaway loop. T1, T2, T3.
- The closest data is a benchmark where one scaffold took 563 turns on a task and another took 55. T9.
- The gap came from prompt rules such as no re-polling of background jobs, not from a cap. T9.

### How Work Is Lost at Limits

- A subagent that hits the 5-hour usage limit before it writes its output loses the work, and a restart redoes it. T2: "possible to lose subagent work if the 5hr limit hits".
- Fable/Mythos subagents did not finish inside one window, so one user moved them to Opus. T2.
- Another user had the root do the remaining work in sequence. T2.
- A user keeps 2 workers and has them journal so a new worker can resume. T2: "stick to 2 workers and journal a lot".
- A progress file and a scratchpad survive an interrupt. T5.
- A crash can leave a state that says a step is open when its side effect is done, so check for the result before a retry. T15.
- The 20-call "tool-use limit" is a web chat breaker and does not apply to Claude Code. T14.

### What Users Do Instead of a Turn Limit

- Cut work into small phases or vertical slices, where one session owns one slice and leaves the tree green. T7, T6.
- A small feature has about 3 phases and a large one about 5. T6.
- Write the plan and the handoff to a file in the repo, and start a fresh session for each step. T6: "plan in a file, not the chat".
- Name the files of each phase and state what proof counts before the build. T7.
- Commit after each small chunk, with the reason in the message. T12.
- Use a stop condition, not a count: `/goal` adds a stop hook, and a fresh agent checks it. T11.
- Cap concurrent agents at 6 to 8 in a rolling pool, because more agents retry on rate limits and burn context. T3.
- Have each subagent write results to a file and return a short summary. T3.
- Limit subagent use, because it fills context. T4.
- One user limits Explore agents to Haiku and 2 per agent. T5.

### Model Mixes for Root Plus Workers

- Opus 5.5 is root for design, review, merge, and orchestration. Sonnet and Haiku do work that a check can verify, such as implementation, tests, and refactors. T3.
- On day one of Fable/Mythos 5.1, a root fanned out 19 agents on the top model and hit the session limit in about 45 minutes. T3.
- One user plans with Fable/Mythos and executes with Opus. T12.
- Fable/Mythos 5.1 over-explores and Opus 5.5 under-explores. T12.
- A Sonnet subagent writes code, with independent review subagents. T11.
- Model and `effort` can be pinned in agent frontmatter. T10.

### Orchestration Shape

- Users treat the root session as the one orchestrator. T5: "one orchestrator agent act as a project manager for the others".
- Review does not vanish when work moves down, so a verifiable outcome is the fix. T5.
- With Opus 5.5 several users drop skills, harnesses, and subagents. T6, T8, T3.
- A separate reviewer with a fresh context beats self-review. T7.
- A subagent is for context isolation. T13.

## Implications for the Dotclaude Agents

- No thread supports a small hard cap. Raise `maxTurns` for `implementer` and `debugger`, or remove it, and bound the work by slice size.
- Add a commit-early rule and a journal rule to the worker prompts, to protect work at any stop. T2, T6, T12.
- The root cuts tasks into slices with a known check that fit one run. T7, T11.
- The root is the only orchestrator, and workers do not spawn workers. T3, T5.
- Keep Opus 5.5 for `planner` and `reviewer`, Sonnet 5.5 for `implementer` and `debugger`, and Haiku 5.5 for `investigator`. T3.
- Cap parallel workers at about 6, and ask workers for a short result plus a file. T3.
- A turn limit on read-only `investigator` and `researcher` is cheap protection against polling loops, but a no-re-poll rule does the same job. T9.
- Fable/Mythos drains the 5-hour window fast, so do not make it a default worker. T2.

## Open Questions

- Does `maxTurns` in frontmatter stop a subagent like the 200-call cap in T1? Test it in `just sandbox`.
- Does a stopped subagent return its partial text and edits to the root? T2 suggests loss only at a usage limit.
- Is the 200-call cap only for fork subagents? T1 rests on one user and one Codex reading.
- Is Fable/Mythos 5.1 worth a `planner` or `reviewer` slot? The threads give only cost anecdotes (T2, T3).
- No thread measures quality at 60, 100, or 200 turns.
