# R01: Official Anthropic guidance on the 5.5 family and Fable 5.1

Date of fetch: 2026-10-13.

## Sources

- S1: Models overview, `https://platform.claude.com/docs/en/about-claude/models/overview`.
- S2: Optimizing for cost and intelligence, `https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence`.
- S3: Pricing, `https://platform.claude.com/docs/en/about-claude/pricing`.
- S4: Effort, `https://platform.claude.com/docs/en/build-with-claude/effort`.
- S5: Prompting Claude Opus 5.5, `https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5`.
- S6: Prompting Claude Sonnet 5.5, same folder, page `prompting-claude-sonnet-5-5`.
- S7: Prompting Claude Haiku 5.5, same folder, page `prompting-claude-haiku-5-5`.
- S8: Prompting Claude Fable 5.1, same folder, page `prompting-claude-fable-5-1` (also applies to Claude Mythos 5.1).
- S9: Create custom subagents (Claude Code), `https://code.claude.com/docs/en/sub-agents`.
- S10: Claude API skill model catalog (the Anthropic `claude-api` skill), pages "Model Descriptions" and "Migrating to Claude Haiku 5.5".
- Not read: system cards and launch posts, so no claim here rests on them.

## Findings per model

All four models have a 1M token context window and 128K max output (S1).
All four have a reliable knowledge cutoff of Jun 2026 (S1).
The lineup order by cost and capability is Haiku, Sonnet, Opus, Fable/Mythos (S2).

### Claude Fable 5.1 / Claude Mythos 5.1 (`claude-fable-5-1`, `claude-mythos-5-1`)

- Use case: "For demanding reasoning and long-horizon agentic work" (S1).
- Anthropic says to use it when "your evals on Claude Opus 5.5 at higher effort still fall short" (S1, S2).
- Price: $10 input and $50 output per MTok, cache read $0.25 (S3).
- Default effort: `high`, all five levels supported (S1, S4).
- Cost evidence: on SWE-bench Pro, Opus 5.5 at its default matched Fable/Mythos 5.1 at its default "for about a fifth of the cost per solved task" (S2).
- Multi-agent: "don't force the lead agent to stop and wait for each one" of its subagents (S8).

### Claude Opus 5.5 (`claude-opus-5-5`)

- Use case: "For long-running agentic coding and knowledge work" (S1).
- S1 and S2 name it the starting point: "start with Claude Opus 5.5 at its default effort (`medium`)" (S2).
- Price: $4 input and $20 output per MTok, cache read $0.20 (S1, S3).
- Default effort: `medium`, all five levels supported, thinking cannot be turned off (S1, S4).
- Strength: "carrying a change through a large code base until its tests pass" (S5).
- At `medium` it matched or beat Opus 5 at `high` on such tasks, in fewer steps (S5).
- S5 names "multi-hour audits and migrations of large code bases run end to end with parallel subagents".
- Code review: testers "reported stronger code review, with more bugs caught ... and fewer false alarms" (S5).
  S5 advises a checklist, a continuation message, and a stop after two or three automatic continuations.
- Multi-agent: it reads elapsed-time signals, and teams with a time budget finished sooner at similar quality (S5).

### Claude Sonnet 5.5 (`claude-sonnet-5-5`)

- Use case: "The best combination of speed and intelligence" (S1).
- Price: $2 input and $10 output per MTok (S1, S3).
- Default effort: `high` on the Claude API (S1, S4).
- S4 and S6 advise `medium` for well-specified agentic coding and `high` for harder or longer tasks.
- Limit: "For the hardest long-horizon work, an Opus model is the better choice" (S6).
- At `low` and `medium` it "sometimes checks in before the work is done" (S6).
  The fix in S6 is a system prompt line: keep working until all asked work is done.
- At `xhigh` and `max` it may start its own review rounds and launch reviewer sub-agents (S6).
  S6 says a prompt line stopped this and "cut session cost by about a third".

### Claude Haiku 5.5 (`claude-haiku-5-5`)

- Use case: "For high-volume, latency-sensitive tasks such as classification, extraction, and routing" (S1).
- Price: from $0.10 input and $0.50 output per MTok for prompts of 100K tokens or fewer (S1, S3).
  Above 100K tokens the price is $0.50 input and $2.50 output (S3).
- Default effort: `medium`, the first Haiku with effort levels (S1, S4, S7).
- S2: "It suits high-volume and latency-sensitive work with checkable outputs."
- S7 and S4 say to start at `medium`, including for agentic coding.
- S7: at `low` "the model is more likely to skip a search, stop early, or skip a check".
- S7: at `low` and `medium` it sometimes reports a code change as done without a check.

### Effort, orchestrator, worker, reviewer statements

- The `low` effort row reads "Simpler tasks that need the best speed and lowest costs, such as subagents" (S4).
- S2 describes the orchestrator pattern: the frontier model "decomposes the task, dispatches subtasks to lower-cost worker models, and merges their results".
- S2: "On work a single model could handle alone, the same model at lower effort was cheaper every time."
- S2 does not name a reviewer model.
  It recommends a checker such as tests or a verifier.
- S9 says a subagent can spawn subagents by default, and omitting `Agent` from its tools stops this.
- S9 defines `maxTurns` as the "Maximum number of agentic turns before the subagent stops".
- S9 says at the limit Claude Code returns the output marked as partial, and Claude can resume it.

## Implications for the dotclaude agents

1. Keep `planner` and `reviewer` on `opus-5-5`.
   - Evidence: Opus 5.5 is the named default and the best cost per solved task (S1, S2).
   - Evidence: it has stronger code review with fewer false alarms (S5).
   - Do not move them to `fable-5-1`/`mythos-5-1` unless an eval shows a gap, because Fable/Mythos costs 2.5 times Opus (S2, S3).
2. Effort for `planner` and `reviewer`: the Anthropic default is `medium`, and `high` is a project choice.
   - Evidence: S2 says "start with Claude Opus 5.5 at its default effort" and S4 says to run a sweep.
   - Recommendation: keep `high` for `reviewer` only if a project eval shows a gain, else use `medium`.
3. `implementer` on `sonnet-5-5` is defensible, but large packages are the "hardest long-horizon work".
   - Evidence: S6 sends that work to an Opus model.
   - Evidence: S1 and S5 name Opus 5.5 for long-running agentic coding and multi-hour migrations.
   - Option: add a second route, for example `opus-5-5` at `medium`, for large packages.
4. `implementer` effort: S4 and S6 say `medium` for well-specified tasks and `high` for harder or longer ones.
   - The current `medium` fits the S6 text, but S6 warns that `low` and `medium` check in early.
   - Add the S6 "keep working until done" and "run a real check" lines to the prompt of `implementer` (S6).
5. `debugger` on `sonnet-5-5` at `high` fits S6 for harder tasks.
6. `researcher` on `sonnet-5-5` at `medium` fits "best combination of speed and intelligence" (S1).
7. `investigator` on `haiku-5-5` at `medium` fits S1, S7, and S10 (read-only, high volume, cheap).
   - S7 says to keep `medium` and not `low` for agentic work, because `low` skips searches and checks.
8. `maxTurns`: no Anthropic page sets a recommended turn limit for a model.
   - Evidence: S9 describes the result at the limit as "partial", resumable output.
   - Evidence: the project saw partial, uncommitted work at the limit, so a cap without checkpoints loses work.
   - Recommendation: remove `maxTurns` from `implementer`, and from other write agents.
     Use the stops that S5 gives: a time budget, and at most two or three automatic continuations.
   - Read-only agents (`investigator`, `researcher`) can keep a cap, because a partial answer costs little.
9. Orchestration: S2 supports one lead with workers, and delegation pays only for routine cost tails or work bigger than one context.
   - The root agent as the only orchestrator matches this.
   - To enforce a single orchestrator, omit `Agent` from each subagent tool list (S9).

## Open questions

- S3 lists the Sonnet 5.5 cache read at $0.10 per MTok, while the S10 catalog lists $0.20.
  S3 is the primary source, but the page text says "0.05x", which also gives $0.10.
- S2 gives numbers for Sonnet 5 workers and not Sonnet 5.5 workers.
  Whether the delegation results hold for the 5.5 family is unmeasured.
- No source gives the number of turns that a large package needs.
  The project log of 5 stops on 2026-10-13 is the only data.
- S9 says the "partial" marking needs Claude Code v2.1.246 or later.
  Check the version in use, and check that the root agent resumes a partial result.
