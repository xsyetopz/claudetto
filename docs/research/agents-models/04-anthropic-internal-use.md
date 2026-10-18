# R04: How Anthropic Uses Its Models in Multi-Agent and Coding Work

## Sources

- S1: "How we built our multi-agent research system", `anthropic.com/engineering/multi-agent-research-system`.
- S2: "Building effective agents", `anthropic.com/engineering/building-effective-agents`.
- S3: "Effective context engineering for AI agents", `anthropic.com/engineering/effective-context-engineering-for-ai-agents`.
- S4: "Effective harnesses for long-running agents", `anthropic.com/engineering/effective-harnesses-for-long-running-agents`.
- S5: "Building multi-agent systems: when and how to use them", `claude.com/blog/building-multi-agent-systems-when-and-how-to-use-them`.
- S6: "Best practices for Claude Code", `code.claude.com/docs/en/best-practices`.
- S7: "Create custom subagents", `code.claude.com/docs/en/sub-agents`.
- S8: "Multiagent orchestration", `platform.claude.com/docs/en/managed-agents/multiagent-orchestration`.
- S9: Anthropic API skill docs, `shared/managed-agents-multiagent.md` and `shared/agent-design.md`.
- Not found: a 2026 Anthropic engineering post with measured orchestrator and worker splits for the 5.5 models.
- Not read: "How Anthropic teams use Claude Code" and the model launch posts.

## Findings

### Which Model Leads and Which Works

- The best research setup used "Claude Opus 4 as the lead agent and Claude Sonnet 4 subagents" (S1).
- S9 gives the current form: the large model plans and checks, and a smaller model does the reading-heavy work.
- S9 names `claude-haiku-5-5` for searching, reading, and extracting.
- S9 names `claude-sonnet-5-5` when the worker needs more judgment.
- S9 uses `claude-opus-5-5` as the coordinator in its examples.
- S9 says to start with a `self` roster (copies of the coordinator) and then add cheaper workers.
- A `self` copy has the same model and tools "minus the ability to delegate further" (S9).
- S5 says stronger orchestrators "are increasingly able to evaluate subagent work directly".
- This means a separate verifier agent has less value as the orchestrator model gets stronger (S5).
- S9 adds an `advisor` setting: the primary thread consults a stronger model mid-turn (S8).
- S9 and S8 do not name Fable/Mythos 5.1 in the parts that I read.

### Measured Gains and Token Cost

- The multi-agent setup beat single-agent Opus 4 by 90.2% on the internal research eval (S1).
- Parallel work cut research time by up to 90% on complex queries (S1).
- Agents use about 4x the tokens of chat, and multi-agent systems about 15x (S1).
- "Token usage by itself explains 80% of the variance" on BrowseComp (S1).
- S5 gives a lower range: 3-10x more tokens than a single agent for an equal task.
- S5 says multi-agent systems "often take longer overall".
- In one role-based test (planner, implementer, tester, reviewer), the subagents spent more tokens on coordination than on work (S5).
- A subagent may use tens of thousands of tokens and return a 1,000-2,000 token summary (S3).

### When Anthropic Says Not to Use Subagents

- Domains with shared context or many dependencies "are not a good fit for multi-agent systems today" (S1).
- Most coding tasks have fewer parallel subtasks than research (S1).
- Only three cases win: context pollution, parallel tasks, and specialization (S5).
- Outside those cases "the coordination costs typically exceed the benefits" (S5).
- Teams spent months on multi-agent designs and then matched them with better prompts on one agent (S5).
- Find "the simplest solution possible", and that "might mean not building agentic systems at all" (S2).
- A question-by-question agent must not get extra solver, checker, or voter agents (S9).
- Claude Code advises a plan only when the diff needs more than one sentence (S6).
- Claude Code advises subagents for reading-heavy investigation, to keep the main context clean (S6).
- A fresh-context reviewer subagent is the recommended check before work counts as done (S6).
- A reviewer asked for gaps will report some, so tell it to flag only correctness and requirement gaps (S6).
- Whether specialized agents (test, QA, cleanup) beat one general agent is an open hypothesis (S4).

### Orchestration Structure

- The lead agent plans and synthesizes, and workers run in parallel with their own context (S1).
- Orchestrator-workers fits tasks "where you can't predict the subtasks needed" (S2).
- Claude Code lets a subagent spawn subagents, up to three layers by default (S7).
- `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1` turns nesting off, and omitting `Agent` from `tools` stops one agent (S7).
- Anthropic runs the nesting limit as a tunable, not as a rule against it.

### Turn and Effort Budgets

- Anthropic gives no `maxTurns` value for any worker.
- S7 defines `maxTurns` as a stop that returns partial output, which the parent can resume.
- S2 says to include "stopping conditions (such as a maximum number of iterations)" for control.
- S1 budgets by task class in tool calls, not in turns.
- Simple fact-finding uses 1 agent and 3-10 calls.
- A direct comparison uses 2-4 subagents and 10-15 calls each.
- Complex research uses more than 10 subagents.
- S1 wrote these rules because early leads spawned "50 subagents for simple queries".
- S9 says lower `effort` gives fewer tool calls and shorter output, `medium` is often a good balance, and `max` is for correctness over cost.
- S7 sets `effort` per agent, and the lead can override it per call.
- S6 gives a check the agent can run as the main stop signal: "Claude stops when the work looks done".
- S6 offers `/goal` and a Stop hook as the unattended stop gates.

### Cost Routing and Cache

- S7 names cost routing to "lower-cost models like Haiku" as a main reason for subagents.
- S7 says the built-in `Explore` agent takes the main model, and a user can override it with `model: haiku`.
- Switching models inside one session breaks the prompt cache, so S9 says to spawn a cheaper subagent and keep the main loop on one model.
- Subagent requests count toward the same usage limits as the main session (S7).

## Implications for the Dotclaude Agents

- The root session is the lead, which matches S1, S5, and S9.
- No dotclaude agent should hold the `Agent` tool.
- S7 allows nesting by default, so the agents must omit `Agent` in `tools`, as the current agent list shows.
- The split of strong lead and cheaper reading worker supports `investigator` on haiku-5-5.
- S9 says to move to Sonnet 5.5 when the worker needs judgment.
- `researcher` on sonnet-5-5 fits that case, and its overlap with `investigator` is an open question.
- Planning is the lead's job in S1 and S6, so `planner` on opus-5-5 works as a plan writer, not as an orchestrator.
- S6 says to skip a plan for a one-sentence diff, so the root should call `planner` rarely.
- `reviewer` as a read-only fresh-context agent matches S6 exactly.
- Its prompt should limit findings to correctness and stated requirements (S6).
- A strong orchestrator may grade worker output itself (S5), so `reviewer` need not run after each worker.
- `implementer` fits the parallel and context-pollution cases when the slice has a known check (S5, S6).
- Coding has fewer parallel subtasks (S1), so the root should run few implementers at once.
- `debugger` has no direct Anthropic precedent, and S4 calls role-specialized agents unproven.
- Anthropic offers no evidence for a numeric `maxTurns` value, so no source supports 31, 41, or 61.
- If dotclaude keeps `maxTurns`, it works as a runaway guard, and S7 shows that the root can resume partial output.
- A limit that stops real work early costs more than it saves, because S1 shows token use drives results.
- Scale the budget by task class like S1, and put the stop signal in a runnable check like S6.
- Keep the effort per agent explicit, with `medium` as the default and `high` for planning and review (S9).
- A Fable/Mythos 5.1 worker has no Anthropic precedent in these sources, so any Fable/Mythos seat needs a local measurement.

## Open Questions

- Which 2026 Anthropic posts give a measured lead and worker split for Fable/Mythos 5.1, Opus 5.5, Sonnet 5.5, and Haiku 5.5?
- Does Anthropic use a `maxTurns` value in its own subagents? No source says so.
- Does the S5 range (3-10x) or the S1 figure (15x) match a coding workload with dotclaude agents?
- Should `researcher` and `investigator` merge, given that S9 separates workers only by the judgment they need?
- Does the `advisor` setting (S8) have a Claude Code equivalent that could replace `planner`?
- "How Anthropic teams use Claude Code" was not read, and it may hold internal usage data.
