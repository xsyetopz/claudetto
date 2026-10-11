# Decisions: router and agents

This page holds D12, D13, and D25.
The index is [Decisions](Decisions).
The name of the page is old.
0.28.0 has no router, and the page records why.

## D12 Agent frontmatter search

The frontmatter of `agents/*.md` (`model`, `effort`, and `maxTurns`) is documented by Claude Code.
It is the one place that holds the choice of model and effort for a subagent.
No data file maps a task class to a model and an effort, and no code list repeats the choice (rule D35, [Agents](Agents#pins)).

The evals may still decide the frontmatter of each agent:

- They run the cases of one agent role and try pairs from the cheapest.
  They stop at the first pair with no loss in the resolve rate, the over-claim rate, and the policy-violation rate.
- The result goes into the agent file by hand.
  No search output, table, or report file keeps it, and the wiki records the figures as prose ([Evals history](Evals-History)).
- Haiku 5.5 can skip checks at low and medium effort, so the over-claim rate is a pass condition.
- Haiku 5.5 costs 5 times as much for each request above 100K prompt tokens.
  No rule moves a long task to Sonnet 5.5.
  Instead, a Haiku 5.5 subagent reports before its context reaches 100K ([Context bound](Context-Bound)), and the delegation text sends large reads to one subagent.
- `claude-haiku-4-5` leaves the roster.
  The [settings snippet](Settings-Snippet) carries `availableModels` and `enforceAvailableModels` without it.
- The research gives no effort cost index for the 5.5 models, so only the evals set the final values.
  The user set the values of D25 on 2026-10-09 from an eval report and the Anthropic effort guide.
  The rows above a measured pair are inferred, not measured.

## D13 No router, the main loop keeps the session choice

0.28.0 removes the deterministic router of the first plan, with its table.
The router needed the table of D12, and a hook that rewrites `model` or `effort` at each step also adds a rule that only a probe could prove.
The parts that went are the `prompt.submit` and `agent.spawn` classifiers, the `turn.step` applier, the `PreToolUse` fallback on `Agent`, and the cap.

- The main loop keeps the model and the effort that the user set (`/model`, `/effort`, or `effortLevel`).
  dotclaude does not rewrite `model` or `effort` in `turn.step`, `agent.spawn`, or a classic hook.
- An effort switch keeps the prompt cache (19,453 tokens read against 19,454 in the probe).
  A model switch rebuilds the full prefix once (22,070 tokens written and 0 read at the switch).
  Anthropic says "Tuning effort is often a better lever than switching models" on its model choice page.
  These facts are evidence for the user, and not a rule.
- The snippet never sets `CLAUDE_CODE_EFFORT_LEVEL` or `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`, because each defeats the frontmatter.
  In the 2.1.294 bundle, `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` removes `model` from the `Agent` tool schema and drops the model of the agent file.
  The drift check reports when either variable is set ([Core plugin](Core-Plugin#drift-check)).
- The agent files use the full id `claude-haiku-5-5`.
  The `haiku` alias resolves to Haiku 5.5 only on the Anthropic API, and to Haiku 4.5 on Bedrock, Vertex, and Foundry.

## D25 Agent roster

The user decided on five agents, from the research and the probes.
The Claude Code docs give no number of agents.
They say to define an agent for a worker that repeats, and to keep work that shares context in the main conversation.

- The roster, the turn limits, and the pins are in [Agents](Agents).
- No agent has the `Agent` tool.
- Each `maxTurns` holds one spare turn for the report.
- A coordinator that needs a stronger model for a failed fix or an audit passes `model` and `effort` in the `Agent` call, which the tool documents.
- Planning and orchestration stay in the main loop, on the model and effort of the session.
- Fable 5.1, or Mythos 5.1 for an account in CVP, has no agent and runs only when the user selects it.
- The [settings snippet](Settings-Snippet) turns off the five built-in agents.
  Each listed agent costs tokens at each start ([Off switches](Off-Switches#built-in-agents)).

## Related pages

- [Agents](Agents)
- [Plans and models](Plans-and-Models)
