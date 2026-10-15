# Decisions: Router and Agents

This page holds the decisions D12, D13, and D25.
Read it to learn how dotclaude sets the model and the effort of each subagent.
The index is [Decisions](Decisions).
The reversed parts of D25 are in [Decisions-Reversed](Decisions-Reversed).

## D12 Agent Frontmatter Search

**Problem:** Each subagent needs one model and one effort.
The values must be known before a run starts.

**Choice:** The front matter of each file in `src/plugins/dotclaude/slices/agents/agents/` sets `model` and `effort`.
The 1.0.0 values are in `.dotclaude/spec/changes/1.0.0/workflow.md`, in the section Agents.
The values are fixed, so a run uses the same pair each time.

**Alternatives:** A data file or a code list that maps a task class to a model and an effort.
The choice rejects this.
The front matter already holds the choice, and a second copy would drift ([Agents](Agents#pins)).

**How the values are set:** The evals run the cases of one agent role.
They try pairs from the cheapest.
They stop at the first pair with no loss in the resolve rate, the over-claim rate, and the policy-violation rate.
The values of 0.28.0 came from one eval report and the effort guide of Anthropic.
The user decided this on 2026-10-09 ([Evals History](Evals-History)).
The 1.0.0 values come from the 1.0.0 design.
The research gives no effort cost index for the 5.5 models.
Each row above a measured pair is inference, not a measurement.

**Evidence for the pass condition:** The effort guide says that Haiku 5.5 at `low` can skip a search, stop early, or skip a check.
The research of 2026-10 recorded this statement.
The source is `external/dossier/agents-roster.md`, section 4, and it is reported, not measured.
So the over-claim rate is a pass condition for each pair.

**Evidence for the price of long prompts:** The price table in `external/dossier/agents-roster.md`, section 4, gives prices for Haiku 5.5 above 100K prompt tokens.
These are an input price and an output price.
Each of these prices is 5 times the price up to 100K.
This is derived from the table.
dotclaude has no rule that moves a long task to another model.

**Model ID:** `claude-haiku-4-5` is not in the `availableModels` list of the settings snippet ([Settings Snippet](Settings-Snippet)).

## D13 No Router, the Main Loop Keeps the Session Choice

**Problem:** Something must set the model and the effort of a turn or of a subagent.
A router that does this adds a rule that a test cannot check on its own.

**Choice:** The main loop keeps the model and the effort that the user sets.
The user sets them with `/model`, `/effort`, or `effortLevel`.
dotclaude does not write `model` or `effort` in a hook or in a command.

The code paths are these:

- The only reads of `CLAUDE_CODE_EFFORT_LEVEL` and `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` are in the drift check.
  They are in `src/plugins/dotclaude/slices/setup/adapters/mod.ts` and `src/plugins/dotclaude/slices/setup/domain/facts.ts`.
- The decision model of `src/plugins/dotclaude/slices/decide/adapters/mod.ts` sets its own effort.
  It sets the effort for its own call, not the effort of the main loop.

**Alternatives:** A deterministic router on `prompt.submit` and `agent.spawn`, with a table of model and effort pairs.
The first plan of 0.28.0 had this router.
The choice does not keep it, for these reasons:

- The router needs the table of D12.
- A hook that rewrites `model` or `effort` adds a rule that only a probe can prove.
- A router on tool calls was wrong on about 1 route in 6 in a cited study.
  The study is arXiv 2605.07112.
  It is cited in `.dotclaude/spec/changes/1.0.0/workflow.md`, and this run did not check it.

The file `.dotclaude/spec/changes/1.0.0/change.md` lists dynamic model routing as out of scope.
The reason is that the evidence does not support it.

**Subagent fallback:** The snippet sets `CLAUDE_CODE_SUBAGENT_MODEL` to `claude-sonnet-5-5`.
This value applies only to a subagent that has no model of its own ([Settings Snippet Keys](Settings-Snippet-Keys)).
Each agent file of the roster sets `model`.
So the fallback applies to none of them.

**Forced variables:** The snippet never sets `CLAUDE_CODE_EFFORT_LEVEL` or `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`.
Each one overrides the front matter.
The drift check reports when either variable is set ([Architecture](https://github.com/xsyetopz/claudetto/blob/dotclaude--v1.0.0/wiki/dotclaude/Architecture.md#drift-check)).
Binary fact, Claude Code 2.1.296: the bundle reads `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`.
When it is set, the coordinator text of the bundle says that the `model` parameter is ignored.
This was found by a text search of `external/cc-2.1.296/strings.txt`.
The 2.1.294 finding that the variable also drops `model` from the agent files is not checked again here.

**Full model ID:** The agent files use the full ID `claude-haiku-5-5`.
The Claude Code docs say that the `haiku` alias resolves to Haiku 5.5 on the Anthropic API.
They say that it resolves to Haiku 4.5 on Bedrock, Vertex, and Foundry.
The docs are recorded in [Open Items](Open-Items).
This page does not probe them.

## D25 Agent Roster

**Problem:** Which subagents exist, and which work each one takes.

**Choice:** A fixed roster of six agents.
Each agent has a set model, effort, turn bound, and tool list.
The roster is the set of files in `src/plugins/dotclaude/slices/agents/agents/`.
The `test-runner` agent of `workflow.md`, in the section Agents, is replaced by the `dotclaude-run-checks` CLI of the `checks` slice.
The reason is item 8 of `.dotclaude/spec/changes/1.0.0/evidence/zero-token.md`.

- The roster, the turn limits, and the pins are in [Agents](Agents).
- The turn bounds are in `src/plugins/dotclaude/slices/agents/limits.ts` as `MAX_TURNS`.
  Each bound leaves room for the report.
  The design of [Agents](Agents#turn-bounds) describes this.
- No agent has the `Agent` tool.
  Each file of `src/plugins/dotclaude/slices/agents/agents/` lists `Agent` in `disallowedTools`.
- Planning is a subagent in 1.0.0.
  It is the `planner` agent, which uses Opus at `high` and writes only under `spec/`.
  Orchestration stays in the main loop.
  The 0.x rule that kept planning in the main loop is reversed ([Decisions-Reversed](Decisions-Reversed)).
- A coordinator that needs a stronger model for a failed fix or an audit may pass `model` in the `Agent` call.
  The 2.1.296 bundle has a `model` parameter on that call (see D13).
  Whether the call takes `effort` is not settled in this run.
  The 1.0.0 workflow also says that the main session does not set `model` on a spawn.
  So the two rules must be read together before the release.
- Fable 5.1, or Mythos 5.1 for an account in CVP, has no agent.
  It runs only when the user selects it ([Settings Snippet](Settings-Snippet)).
- The settings snippet turns off the five built-in agents.
  `Explore` and `Plan` are turned off with `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS`.
  `general-purpose`, `claude-code-guide`, and `statusline-setup` are turned off with one `permissions.deny` entry each.
  Each entry is `Agent(<name>)` ([Settings Snippet](Settings-Snippet)).
  The 2.1.296 bundle has all five names.
  This is a text search of `external/cc-2.1.296/strings.txt`.
  The effect of each deny entry is not probed in this run.
- Each listed built-in agent adds a line to each request ([Off Switches](Off-Switches#built-in-agents)).
  The cost is per request, not per start.

## Related Pages

- [Agents](Agents)
- [Usage Evidence](Usage-Evidence)
