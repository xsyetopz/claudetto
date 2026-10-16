# Official effort guidance per model and task type

All quotes are one sentence at most.

## Sources

- S1: Effort page, `platform.claude.com/docs/en/build-with-claude/effort`.
- S2: Steering thinking page, `platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost`.
- S3: Optimizing for cost and intelligence page, `platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence`.
- S4: Claude Code docs, Model configuration, section "Effort levels", `code.claude.com/docs/en/model-config`.
- S5: Claude Code docs, Subagents, `code.claude.com/docs/en/sub-agents`.
- S6: Claude API skill reference, pages "Thinking & Effort" and "Cost optimization", section 2.6 (the skill summarizes S1 and S3).
- Not read: the end of S3, S4, and S5 (each page was cut at 100000 characters).

## Findings per model

### Defaults (S1, S4)

- Default effort is `high` on most models.
- "Claude Opus 5.5 and Claude Haiku 5.5 default to medium." (S1)
- Claude Code differs: "`high` on every model that supports effort, except that Opus 5.5, Sonnet 5.5, and Haiku 5.5 default to `medium`". (S4)
- So in Claude Code, Sonnet 5.5 runs at `medium` unless a source sets another level.
- All four models accept `low`, `medium`, `high`, `xhigh`, and `max`. (S1, S4)

### Fable 5.1 / Mythos 5.1

- "Start with `high`, the default." (S1)
- Step up to `xhigh` or `max` for the most capability-sensitive agentic and coding work.
- Step down to `medium` or `low` for routine work once evals show quality holds. (S1)
- Coding: `low` solved 88.6% of SWE-bench Pro tasks for $0.54 per solved task. (S3)
- Fable/Mythos 5.1 at default matched Opus 5.5 (92.3%) at $1.19 per solved task. (S3)
- Research: scores were nearly level at `low`, `medium`, and `high`, while cost rose from $4.66 to $7.12 per task. (S3)

### Opus 5.5

- `medium` is the default, one level below Opus 5. (S1)
- "For most agent workloads, start with Claude Opus 5.5 at its default effort (`medium`)." (S3)
- Against `high` on SWE-bench Pro (S3):
  - `medium` scored about 2.5 points lower for about 70% of the cost.
  - `low` scored about 8 points lower for about a third of the cost.
  - `xhigh` scored about 1.4 points higher for 2.5 times the cost.
- S3 suggests to "run every task at a low setting and re-run only the failures at a higher one."
- That policy gave about 97% pass at about $0.17 per task, against 95.3% at $0.29 for `high` on all tasks. (S3)
- Thinking cannot be disabled at any level, so effort is the only control. (S1)

### Sonnet 5.5

- The levels are recalibrated, so one level does not give the same thinking as on Sonnet 5. (S1)
- "For agentic coding and multistep tool use, start with `medium` for well-specified tasks and move to `high` for harder or longer ones." (S1)
- "Start with `high` unless your workload is agentic or latency-sensitive." (S1)
- "Use `xhigh` or `max` only where your evals show a quality gain." (S1)
- Asking for less thinking in the prompt does not reliably work, so lower the effort. (S2)

### Haiku 5.5

- "Start with `medium` for most work, including agentic coding." (S1)
- `low` is for chat, short tool tasks, and simple, high-volume requests.
- At `low` in long agent prompts, the model is more likely to skip a search, stop early, or skip a check. (S1)
- `high` is for knowledge work, longer agent tasks, and strict instruction following. (S1)
- A prompt to answer directly does not stop its thinking, so use effort. (S2)

### Effort by task type (cross-model)

- Agentic coding: effort responds strongly, and "each step down gave up a few points of pass rate" for a lower cost. (S6, from S3)
- Research: curves are nearly flat, and `medium` matched `high` accuracy at 70% to 87% of the cost on Fable 5. (S3)
- Subagents and simple tasks: `low` is "Simpler tasks that need the best speed and lowest costs, such as subagents". (S1)
- Review and bug fixing: `high` is for "Work where verification matters or edge cases are likely, such as fixing a bug in an existing codebase". (S4)

### Effect on tool calls, turns, and cost

- Lower effort means fewer tool calls, merged operations, less preamble, and terse confirmations. (S1)
- Higher effort means more tool calls, plans before action, and detailed summaries. (S1)
- Effort changes all output tokens, not only thinking. (S1)
- After new user input, the first request carries most reasoning, and tool-result follow-ups can skip thinking. (S2)
- The advice is to judge cost per completed task, since a cheaper request that needs more turns is not cheaper. (S6)

### Claude Code and subagents

- Effort resolves in this order: `CLAUDE_CODE_EFFORT_LEVEL`, `--effort`, `/effort`, saved settings, model default. (S4)
- Frontmatter `effort` "overrides the session level but not the environment variable". (S4)
- Claude can also pass `effort` per invocation, and that value beats the frontmatter field (v2.1.292 or later). (S5)
- Subagent `model` order: per-call parameter, frontmatter, `CLAUDE_CODE_SUBAGENT_MODEL`, main model. (S5)
- `maxTurns`: "When the subagent reaches the limit, Claude Code returns its output marked as partial". (S5)
- The root session can resume a partial subagent. (S5)
- S5 states no default for `maxTurns` in the part read.
- S1 to S6 give no turn-limit advice for subagents.

## Implications for the dotclaude agents

- Keep the current effort values. No source asks for a change in any of the six.
- The 5 implementer failures on 2026-10-13 are a turn limit and a context limit, not an effort issue.
  Lower effort would cut tool calls and so delay the limit, but at a quality cost (S1, S3).
- Do not use `low` for the implementer on large packages.
  S1 says Haiku 5.5 at `low` may stop early or skip a check.
- `CLAUDE_CODE_EFFORT_LEVEL` overrides every frontmatter value (S4).
  A user who sets it defeats the per-agent design.
- The docs do not support a `maxTurns` value as an effort control.
  They show `maxTurns` only as a stop with partial output that can resume (S5).

## Open questions

- What is the default for `maxTurns` when the field is absent?
  The part of S5 that was read does not say.
- Does the frontmatter `effort` of a subagent pass through the Sonnet 5.5 recalibration as `medium` in Claude Code?
  S4 says the scale is "calibrated per model", so a sweep on dotclaude tasks is needed.
- Does `effort: high` for the implementer cut partial returns, or does it only raise turn use?
  No source measures this.
