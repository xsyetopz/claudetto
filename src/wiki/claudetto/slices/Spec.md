# Spec

The `spec` slice helps you plan a change with OpenSpec.
OpenSpec is a tool that keeps a plan, its specs, and its tasks in files.
The slice ships three presets, `task`, `story`, and `epic`, and a skill that picks one for you.

## What It Does for You

OpenSpec has the engine, the `/opsx:*` commands, and the delta specs.
The slice adds only the presets and the text that picks one.
It has one skill and no hook, no CLI, and no `userConfig` key.

Only you can start the skill `spec`, because it has `disable-model-invocation: true`.
Its `argument-hint` is `[task|story|epic] [change]`.
It picks a preset and hands off to the `/opsx:*` commands.
It does no other step.

## How to Use It

The skill never overwrites a file, because you may have changed it.

1. If `openspec/` is missing, it runs `bunx @fission-ai/openspec@1.14.3 init --tools claude --profile core`.
2. It copies each `schemas/<preset>` folder of the skill to `openspec/schemas/<preset>`, only when that folder is missing.
3. It copies `config.yaml` to `openspec/config.yaml`, only when that file is missing.
4. It reads the global config with `bunx @fission-ai/openspec@1.14.3 config list`.
   - If `delivery` is `both`, each workflow is listed twice.
   - If `verify` is not in `workflows`, `/opsx:verify` is missing.

The global config is outside the project, so the skill asks you before it changes it.
It gives you the commands `bunx @fission-ai/openspec@1.14.3 config set delivery skills` and `bunx @fission-ai/openspec@1.14.3 config profile`.

## Profile Sizes

The sizes in this section are bytes, not tokens.
They are the bytes of the files that `openspec init --tools claude --profile core` writes, measured with `@fission-ai/openspec` version `1.14.3`.
The mode is the `delivery` key of the global config, because `init` has no flag for it.
The prompt bytes leave out `openspec/config.yaml`, which is 998 bytes.

| Setup | Prompt bytes | Times `minispec` |
| --- | ---: | ---: |
| `core`, `commands` | 92122 | 7.4 |
| `core`, `skills` | 95587 | 7.6 |
| `core` + `verify`, `skills` | 115816 | 9.3 |
| `core`, `both` (the default) | 187565 | 15.0 |

`minispec` is the preset of 0.1.0, at 12500 bytes.
The last column is the prompt bytes divided by 12500.

Only the skill description loads at session start.
The body of a skill loads when the skill runs.
`commands` has no description cost at start, so it is the smaller choice for context.

## Picking a Preset

The skill states the facts that it used.
It then uses the first rule that fits:

1. You name a preset: that preset.
2. There is no `openspec/specs/` and the repository is nearly empty: `epic`.
3. The change does not change behavior: `task`.
4. The change touches one capability: `story`.
5. Unsure: `story`, and ask you.

## Hand Off

The skill runs `/opsx:propose` and names the schema.
The command then runs `new change <change> --schema <preset>`.
The skill points you to `/opsx:apply`, `/opsx:verify`, and `/opsx:archive`.

## The Schemas

Each schema is `version: 1` and has an `apply` step that tracks `tasks.md`.
The `tasks` artifact asks for checkboxes `- [ ] X.Y Task` under `## N.` headings, because the apply step parses them.
Each task says how to verify it.

| Schema | Use | Artifacts, in order |
| --- | --- | --- |
| `task` | A bug fix, a small change, or a refactor | `proposal`, `tasks` |
| `story` | One feature in an existing codebase | `proposal`, `specs`, `design`, `review`, `tasks` |
| `epic` | A new project, a large feature, or a regulated system | `prd`, `architecture`, `proposal`, `specs`, `design`, `review`, `tasks` |

### Task

The `proposal` has the sections **Why**, **What Changes**, and **Impact**.
It lists no capability.
If behavior changes, it says to use `story`.
The `apply` step requires `tasks`.

### Story

The `proposal` adds **Capabilities**.
It lists each new capability (a kebab-case path) and each modified capability (the exact path under `openspec/specs/`).
Each listed capability gets a delta spec in `specs/<capability-path>/spec.md`.
A spec states behavior that you can observe, with these rules:

- Use the headers `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`, and `## RENAMED Requirements`.
- Write each requirement as `### Requirement: <name>` with SHALL or MUST.
- Give each requirement at least one `#### Scenario: <name>` with WHEN and THEN.
- Keep each requirement to 500 characters or fewer.
- Start a new capability with a `## Purpose` of 50 characters or more.
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
The `review` template adds checklists for the PM, the architect, and QA.
The `apply` step requires `review`.

## The `config.yaml` Template

The template sets `schema: story`.
It has a `context` block and `rules` for each artifact.
OpenSpec puts `context` into each artifact, and `rules.<artifact>` into that artifact only.
The template says to write only what an agent cannot learn from the code, and to delete each line that does not apply.

## See Also

- [Ground](Ground)
- [Handoff](Handoff)
- [Setup](Setup)
