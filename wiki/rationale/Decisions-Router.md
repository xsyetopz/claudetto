# Decisions: router and agents

This page holds D12, D13, and D25.
The index is [Decisions](Decisions).
The reversed parts of D25 are in [Decisions-Reversed](Decisions-Reversed).

## D12 Agent frontmatter search

Problem.
Each subagent needs one model and one effort, and the values must be known before a run starts.

Choice.
The front matter of each file in `src/plugins/dotclaude/slices/agents/agents/` sets `model` and `effort`.
The 1.0.0 values are in `.dotclaude/spec/changes/1.0.0/workflow.md`, section Agents.
The values are fixed, so a run uses the same pair each time.

Alternatives.
A data file or a code list that maps a task class to a model and an effort.
Rejected, because the front matter already holds the choice, and a second copy would drift ([Agents](Agents#pins)).

How the values are set.
The evals run the cases of one agent role, and try pairs from the cheapest.
They stop at the first pair with no loss in the resolve rate, the over-claim rate, and the policy-violation rate.
The values of 0.28.0 came from one eval report and the effort guide of Anthropic, as the user decided on 2026-10-09 ([Evals-History](Evals-History)).
The 1.0.0 values come from the 1.0.0 design.
The research gives no effort cost index for the 5.5 models.
Each row above a measured pair is inference, not a measurement.

Evidence for the pass condition.
The effort guide, as the research of 2026-10 recorded it, says that Haiku 5.5 at `low` can skip a search, stop early, or skip a check (`external/dossier/agents-roster.md`, section 4, reported).
So the over-claim rate is a pass condition for each pair.

Evidence for the price of long prompts.
The price table in `external/dossier/agents-roster.md`, section 4, gives Haiku 5.5 an input price and an output price above 100K prompt tokens that are each 5 times the price up to 100K (derived from the table).
dotclaude has no rule that moves a long task to another model.

Model id.
`claude-haiku-4-5` is not in the `availableModels` list of the settings snippet ([Settings-Snippet](Settings-Snippet)).

## D13 No router, the main loop keeps the session choice

Problem.
Something must set the model and the effort of a turn or of a subagent.
A router that does this adds a rule that a test cannot check on its own.

Choice.
The main loop keeps the model and the effort that the user sets, with `/model`, `/effort`, or `effortLevel`.
dotclaude does not write `model` or `effort` in a hook or in a command.
Code path: the only reads of `CLAUDE_CODE_EFFORT_LEVEL` and `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` are in the drift check, at `src/plugins/dotclaude/slices/setup/adapters/mod.ts` and `src/plugins/dotclaude/slices/setup/domain/facts.ts`.
The decision model of `src/plugins/dotclaude/slices/decide/adapters/mod.ts` sets its own effort, for its own call, and not the effort of the main loop.

Alternatives.
A deterministic router on `prompt.submit` and `agent.spawn`, with a table of model and effort pairs, as in the first plan of 0.28.0.
Not kept, for three reasons.
The router needs the table of D12.
A hook that rewrites `model` or `effort` adds a rule that only a probe can prove.
A router on tool calls was wrong on about 1 route in 6 in a cited study (arXiv 2605.07112, cited in `.dotclaude/spec/changes/1.0.0/workflow.md`, not checked in this run).
`.dotclaude/spec/changes/1.0.0/change.md` lists dynamic model routing as out of scope, because the evidence does not support it.

Subagent fallback.
The snippet sets `CLAUDE_CODE_SUBAGENT_MODEL` to `claude-sonnet-5-5`.
This value applies only to a subagent that has no model of its own ([Settings-Snippet-Keys](Settings-Snippet-Keys)).
Each agent file of the roster sets `model`, so the fallback applies to none of them.

Forced variables.
The snippet never sets `CLAUDE_CODE_EFFORT_LEVEL` or `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`, because each one overrides the front matter.
The drift check reports when either variable is set ([Architecture](Architecture#drift-check)).
Binary fact, Claude Code 2.1.296: the bundle reads `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`.
When it is set, the coordinator text of the bundle says that the `model` parameter is ignored.
This was found by a text search of `external/cc-2.1.296/strings.txt`.
The 2.1.294 finding that the variable also drops `model` from the agent files is not checked again here.

Full model id.
The agent files use the full id `claude-haiku-5-5`.
The Claude Code docs, as recorded in [Open-Items](Open-Items) and not probed here, say that the `haiku` alias resolves to Haiku 5.5 on the Anthropic API and to Haiku 4.5 on Bedrock, Vertex, and Foundry.

## D25 Agent roster

Problem.
Which subagents exist, and which work each one takes.

Choice.
A fixed roster of seven agents, each with a set model, effort, turn bound, and tool list.
The roster is in `.dotclaude/spec/changes/1.0.0/change.md` (section Scope) and `workflow.md` (section Agents).
The code of the base commit has six of the seven files, and `test-runner` is not in it yet.

- The roster, the turn limits, and the pins are in [Agents](Agents).
- The turn bounds are in `src/plugins/dotclaude/slices/agents/limits.ts` (`MAX_TURNS`).
  Each bound leaves room for the report, as the design of [Agents](Agents#turn-bounds) describes.
- No agent has the `Agent` tool.
  Each file of `src/plugins/dotclaude/slices/agents/agents/` lists `Agent` in `disallowedTools`.
- Planning is a subagent in 1.0.0, the `planner` agent (Opus, `high`, writes only under `spec/`).
  Orchestration stays in the main loop.
  The 0.x rule that kept planning in the main loop is reversed ([Decisions-Reversed](Decisions-Reversed)).
- A coordinator that needs a stronger model for a failed fix or an audit may pass `model` in the `Agent` call.
  The 2.1.296 bundle has a `model` parameter on that call (see D13).
  Whether the call takes `effort` is not settled in this run.
  The 1.0.0 workflow also says that the main session does not set `model` on a spawn, so the two rules must be read together before the release.
- Fable 5.1, or Mythos 5.1 for an account in CVP, has no agent.
  It runs only when the user selects it ([Settings-Snippet](Settings-Snippet)).
- The settings snippet turns off the five built-in agents.
  `Explore` and `Plan` are turned off with `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS`.
  `general-purpose`, `claude-code-guide`, and `statusline-setup` are turned off with one `permissions.deny` entry `Agent(<name>)` each ([Settings-Snippet](Settings-Snippet)).
  The 2.1.296 bundle has all five names (text search of `external/cc-2.1.296/strings.txt`).
  The effect of each deny entry is not probed in this run.
- Each listed built-in agent adds a line to each request ([Off switches](Off-Switches#built-in-agents)).
  The cost is per request, not per start.

## Related pages

- [Agents](Agents)
- [Usage evidence](Usage-Evidence)
