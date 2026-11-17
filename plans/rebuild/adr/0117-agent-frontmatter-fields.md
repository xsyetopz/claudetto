---
status: accepted
date: recorded in openspec/changes/archive/2026-11-16-2-1-323/tasks.md:1 (day of decision not recorded)
---
# Agent Frontmatter Fields

## Context and Problem Statement

Which agents ship, on which model, effort, and tools, and which turn cap each carries.

Two old specs (`[ADR-0120](0120-agent-search-model-sonnet.md)`, `[ADR-0118](0118-agent-frontmatter-no-effort.md)`) disagree with the agent files at `088a227c`. Which frontmatter do the agents carry?

A turn cap at the 75th percentile of turns cut cost 24 to 68 percent in the cited study (More with Less; n=1, cited). `plugins/claudetto/agents/Artemis.md` at 088a227c carries `model`, `effort`, `tools`, and `autoCompactWindow` in its frontmatter and no `maxTurns` (git grep for maxTurns in `plugins/` found none). The old plan holds two lines that disagree: one says to set `maxTurns` in Artemis frontmatter, with a probe note that claude 2.1.325 (unverified in 2.1.326) bounds an agent; another lists "maxTurns on agents" as a rejected candidate.

## Considered Options

- First draft: `search` and `plan` on Sonnet, naming `search/plan/work/sweep` (superseded, see [ADR-0119](0119-agent-roster-first-draft.md)).
- Final: `Artemis` search (haiku-5-5, effort high, `autoCompactWindow: 100000`, tools Read, Grep, Glob); `Metis` plan and `Athena` sweep and review (sonnet-5-5, medium, Read, Grep, Glob); `Heracles` work (sonnet-5-5, medium, all tools).
- The old specs: Sonnet 5.5 for search and plan, no `effort`
- The baseline agent files in `plugins/claudetto/agents/`
- Set `maxTurns` in Artemis frontmatter at the P75 turn cap (rejected: settled decision, agents set no `maxTurns`).
- Leave agents without `maxTurns` and rely on run-limits, which cap heavy-context calls only.

## Decision Outcome

Chosen: the final roster. `autoCompactWindow: 100000` keeps Haiku under the 100k step where input bills $0.50/MTok against $0.10. Haiku does file finding only; a failed Heracles check re-runs at high; an opt-in advisor needs a body line saying when to consult. Each agent file carries `model`, `effort`, `tools` and no `maxTurns` (settled: agents set no `maxTurns`, CHANGELOG.md:108@088a227c: the old caps of 40/30/60 each cost a resume call); the body is the whole prompt (the engine appends about 1,294 bytes and `prompt.compose` does not reach it). No subagent runs on Fable or Opus (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)). Rationale: Fable costs 1.5x-3x Opus for equal accuracy, and 10 subagents hit turn limits at 116k-266k tokens with no report. The Sonnet and Haiku split is a hypothesis until a paid A/B.

Same decision, other record: the baseline agent files, because they are what ships and the verified facts are for `claude` 2.1.325 (unverified in 2.1.326). Fable and Opus are never a subagent model.

Rejected: set `maxTurns` in Artemis frontmatter at the P75 turn cap (source verdict "candidate", n=1); the settled decision on `maxTurns` decides the conflict with the rejected-candidate line.

Conflicts with: agents set no `maxTurns` (CHANGELOG.md:108@088a227c: the old caps of 40/30/60 each cost a resume call). The proposal in gap-06--maxturns-on-artemis to set `maxTurns` in Artemis frontmatter at the P75 turn cap is rejected, and the `maxTurns` statements of plan-04--agent-roster are void. The settled fact also settles the conflict between the rejected-candidate line and plan:1111 in favour of the rejection (see [ADR-0151](0151-rejected-candidates.md)).

## Consequences

The 2-1-323 spec says each agent sets `maxTurns`, while task 10.7 found the files set none and a repeat guard replaced it; a 2.1.325 probe shows `maxTurns:5` stops an agent at 5 requests, so `maxTurns` is missing from the files at 088a227c; the settled decision keeps it missing (CHANGELOG.md:108@088a227c: the old caps of 40/30/60 each cost a resume call).

- Good, because one source holds each agent's frontmatter.
- Bad, because the search model needs a fresh check against the files before the plan fixes it.
- Good: a runaway search ends at a bounded cost.
- Bad: a cap below a hard search cuts it off; the P75 value needs a paid measure first.

## Confirmation

A test lists the agent files and asserts model, effort, tools, and `autoCompactWindow` for Artemis.

Source: openspec/changes/archive/2026-11-16-2-1-323/tasks.md:1; plugins/claudetto/agents/Artemis.md:7@088a227c; plugins/claudetto/agents/@088a227c; openspec/specs/agent-conduct/spec.md:338; openspec/specs/subagent-prompts/spec.md:19; external/please-use-me-often/agent-failure-dossier/judged/other.jsonl:102; plugins/claudetto/agents/Artemis.md:1,7@088a227c; user decision pending; CHANGELOG.md:108@088a227c.
