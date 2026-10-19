# Spec

This page tells what the `spec` slice of the core plugin `claudetto` ships.
It covers the `spec` skill, the three OpenSpec schemas `task`, `story`, and `epic`, and the `config.yaml` template.
A user who plans a change with OpenSpec and a contributor who edits the slice read it.

## What the Slice Does

OpenSpec has the engine, the `/opsx:*` commands, and the delta specs.
The slice ships only the presets and the text that picks one.
It has one skill and no hook, no CLI, and no `userConfig` key.

The skill `spec` has `disable-model-invocation: true`, so only the user starts it.
Its `argument-hint` is `[task|story|epic] [change]`.
It picks a preset and hands off to the `/opsx:*` commands.
It does no other workflow step.

## Setup by the Skill

The skill never overwrites a file, because the user may have changed it.

1. If `openspec/` is missing, it runs `bunx @fission-ai/openspec init --tools claude --profile core`.
2. It copies each folder `schemas/<preset>` of the skill to `openspec/schemas/<preset>`, only when that folder is missing.
3. It copies `config.yaml` of the skill to `openspec/config.yaml`, only when that file is missing.
4. It reads the global config with `bunx @fission-ai/openspec config list`.
   - If `delivery` is `both`, each workflow is listed twice.
   - If `verify` is not in `workflows`, `/opsx:verify` is missing.
   The global config is outside the project, so the skill asks the user before it changes it.
   It gives the commands `bunx @fission-ai/openspec config set delivery skills` and `bunx @fission-ai/openspec config profile`.

## Picking a Preset

The skill states the facts that it used, and then uses the first rule that fits:

1. The user names a preset: that preset.
2. There is no `openspec/specs/` and the repository is nearly empty: `epic`.
3. The change has no change of behavior: `task`.
4. The change touches one capability: `story`.
5. Unsure: `story`, and ask the user.

## Hand Off

The skill runs `/opsx:propose` and names the schema, so the command runs `new change <change> --schema <preset>`.
Then it points the user to `/opsx:apply`, `/opsx:verify`, and `/opsx:archive`.

## The Schemas

Each schema is `version: 1` and has an `apply` step that tracks `tasks.md`.
The `tasks` artifact of each schema asks for checkboxes `- [ ] X.Y Task` under `## N.` headings, because the apply step parses them.
Each task states how to verify it.

| Schema | Use | Artifacts, in order |
| --- | --- | --- |
| `task` | A bug fix, a small change, or a refactor with no change of behavior | `proposal`, `tasks` |
| `story` | One feature in an existing codebase | `proposal`, `specs`, `design`, `review`, `tasks` |
| `epic` | A new project, a large feature, or a regulated system | `prd`, `architecture`, `proposal`, `specs`, `design`, `review`, `tasks` |

### Task

The `proposal` has the sections **Why**, **What Changes**, and **Impact**.
It lists no capability.
It says to use `story` if behavior changes.
The `apply` step requires `tasks`.

### Story

The `proposal` adds **Capabilities**, with each new capability (a kebab-case path) and each modified capability (the exact path under `openspec/specs/`).
Each listed capability gets a delta spec in `specs/<capability-path>/spec.md`.
A spec states observable behavior, and it holds these rules:

- Use the headers `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`, and `## RENAMED Requirements`.
- Write each requirement as `### Requirement: <name>` with SHALL or MUST, and give it at least one `#### Scenario: <name>` with WHEN and THEN.
- Keep each requirement text to 500 characters or fewer.
- A new capability starts with a `## Purpose` of 50 characters or more.
- Write `[NEEDS CLARIFICATION: <question>]` in place of a guess.

The `design` artifact has **Context**, **Decisions**, and **Risks / Trade-offs**.
The `review` artifact checks that the proposal, the specs, the design, and the tasks agree.
It stops while a gap or a `[NEEDS CLARIFICATION` marker is open.
The `apply` step requires `review`.
It asks for a fast check after a change of behavior, and the full checks at the end of each task group.

### Epic

The `epic` schema adds two artifacts before the proposal:

- `prd` with **Problem**, **Users**, **Goals**, **Non-Goals**, and **Success Measures**.
- `architecture` with **Components**, **Data and Interfaces**, **Constraints**, and **Decisions**.

The `proposal` takes the why from `prd.md`.
The `review` template adds checklists for the PM, the architect, and QA to the agreement checklist.
The `apply` step requires `review`.

## The `config.yaml` Template

The template sets `schema: story` and has a `context` block and `rules` for each artifact.
OpenSpec puts `context` into each artifact, and `rules.<artifact>` into that artifact only.
The template says to write only what an agent cannot learn from the code, and to delete each line that does not apply.

| Part | Content |
| --- | --- |
| `context` | `Product`, `Stack`, `Principles` (2 to 5 rules), and `Done` (the command that must pass) |
| `rules.prd` | Name the user and the metric of success |
| `rules.architecture` | Name each external system and each trust boundary |
| `rules.proposal` | State what is out of scope |
| `rules.specs` | Test each scenario at the boundary of the system, not in a unit |
| `rules.design` | Prefer the change with the least code that keeps the behavior |
| `rules.review` | Check each principle of `context` |
| `rules.tasks` | End with the `Done` command of `context` |

## Related Pages

- [Ground](Ground)
- [Handoff](Handoff)
- [Setup](Setup)
