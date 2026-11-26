---
status: accepted
date: 2026-11-16
---
# Athena Is Not on Fable

## Context and Problem Statement

The plugin README once said Athena runs on Fable; agents/Athena.md sets `claude-sonnet-5-5`; the project AGENTS.md line 8 allows `claude-fable-5-2` and `claude-mythos-5-2` for Athena. The owner rule of 2026-11-13 says Fable and Opus are never a subagent model.

`Athena` is the review agent. Fable and Opus are never a subagent model.

Transcript record tx-x02/athena-model-sonnet: `Athena.md` said sonnet-5-5; the instructions said fable or mythos.

Transcript record tx-x03/fable-opus-never-subagent-model: A dossier candidate proposed Athena on Fable. The rule at openspec/changes/archive/2026-11-16-2-1-323/design.md:96 (no date on the line; 2026-11-13 is the read date of a pricing page on line 97) says no agent file sets Fable or Opus. This matches the settled decision that Fable and Opus are never a subagent model; this record supplies its earliest written source.

## Considered Options

- Athena on Fable or Mythos.
- Athena on `claude-sonnet-5-5` at medium effort.
- `claude-sonnet-5-5` (baseline, `plugins/claudetto/agents/Athena.md:4@088a227c`).
- Another model.
- Keep every agent file off Fable and Opus.

## Decision Outcome

Chosen: Sonnet 5.5. A subagent is Sonnet 5.5 or Haiku 5.5; Fable and Opus stay in the main loop. Fable runs 1.5x to 3x Opus for equal accuracy on controlled runs and burns quota as a subagent. A lead's `Agent` call can pass `model`, which wins over the agent file, so an `agent.spawn` mod drops it.

Same decision, other record: `Athena` stays on `claude-sonnet-5-5` (user decision, 2026-11-16).

## Consequences

- AGENTS.md line 8 at 088a227c still lists Fable and Mythos for Athena and conflicts with this decision.

No change from baseline.

Transcript record tx-x02/athena-model-sonnet decided: `claude-sonnet-5-5`. Consistent with the settled rule that Fable and Opus are never a subagent model.

Transcript record tx-x03/fable-opus-never-subagent-model decided: Keep every agent file off Fable and Opus; the candidate is rejected. Athena stays on claude-sonnet-5-5.

Source: openspec/changes/archive/2026-11-16-2-1-323/design.md:96; openspec/changes/2-1-325-rearchitecture/design.md:281; AGENTS.md:8; user decision, 2026-11-16 (User Answers); plugins/claudetto/agents/Athena.md:4@088a227c; user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5807); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:4092 (handoff, Worker D candidates: archived 2-1-323 design.md:95); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:4910 (Decisions).
