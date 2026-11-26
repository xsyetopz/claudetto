---
status: accepted
date: 2026-11-21
---
# `claudetto-spec` Replaces `claudetto-openspec`

## Context and Problem Statement

ADR-0018 aimed at OpenSpec core parity, and ADR-0189 then kept the block Out. On 2026-11-21 the user asked for the block to be finished under a new name, as a lean mix of spec-, test- and behaviour-driven development that uses the fewest tokens, shipped as a default-on add-in to claudetto on Claude Code 2.1.329, interactive first and `claude -p` second. The research in `reports/2026-11-21-research/sdd-frameworks.md` compares Spec Kit, OpenSpec, Superpowers, Kiro and BMAD and lists the cons an add-in can fix.

## Considered Options

- OpenSpec parity: `openspec/` layout, proposal, design, tasks and delta folders.
- Spec Kit style pipeline: constitution, specify, clarify, plan, tasks, implement.
- A lean loop: one living spec file per capability, requirement IDs cited by tests, failing tests staged before implementation, and a deterministic check tool.

## Decision Outcome

Chosen: the lean loop, as plugin `claudetto-spec` in `plugins/claudetto-spec/`, replacing `plugins/claudetto-openspec/`.

- **Name.** `claudetto-spec` keeps the family prefix and avoids "speckit", which is GitHub Spec Kit's command prefix (`/speckit-*`) and would confuse users of both.
- **Loop.** Clarify (unknowns become `Open:` lines; interactive sessions ask, `claude -p` reports and stops on an expensive unknown), spec (`specs/<capability>.md`), red (tests that cite requirement IDs, run failing, then staged with `git add`), green (implementation without touching staged tests), check (`spec_check` and the project's own test command).
- **Parts.** One skill, `spec`, that carries the loop; one deferred tool, `spec_check`, that parses specs and tests and reads the git index. No agent, no output style and no always-on rule text, so the always-on cost is the skill description.
- **Formats.** Markdown specs with Given/When/Then scenarios; no MDX, `.feature`, YAML or JSON state, because derived facts (coverage, orphans, tampering) are computed from files and the git index on every check.
- **Gate.** ADR-0177 applies: each part ships only while ADR-0193's evals show it beats vanilla 2.1.329 on its case.

## Consequences

- ADR-0018 and ADR-0062 are superseded; ADR-0189's OpenSpec clause no longer holds, its other clauses stand. OUT-179 to OUT-181 move back In as `prd/spec.md`.
- The old `openspec/` change history, deleted at 088a227c, stays a cited source at `088a227c^`; only the plugin is replaced.
- Superpowers-style per-task subagents and a test-review agent stay out until an eval shows a gain worth their cost (one user's logs: $361 against $143 per ticket).

Source: user goal, 2026-11-21 (this session, 058ea2d3-793b-495e-912a-323a9453747d, first prompt); research in reports/2026-11-21-research/.
