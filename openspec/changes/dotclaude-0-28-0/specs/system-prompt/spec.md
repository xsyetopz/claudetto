# Spec Delta

## Purpose

Defines the system prompt that dotclaude sends in place of the Claude Code sections, and the rules that keep it short, stable, and effective on each model.

## ADDED Requirements

### Requirement: dotclaude owns the system prompt

The dotclaude mod SHALL replace the Claude Code system-prompt sections with a dotclaude prompt variant.
A section id that the mod does not know SHALL pass on unchanged and SHALL show in the drift check.

#### Scenario: Known sections

- **WHEN** the hook lab sends the section list of the supported Claude Code version
- **THEN** the mod returns the variant sections for the model

#### Scenario: Unknown section

- **WHEN** the section list has an id that the mod does not know
- **THEN** the id stays in the prompt
- **AND** the drift check reports it

### Requirement: One variant for each model

dotclaude SHALL have one prompt variant for each of Opus 5.5, Sonnet 5.5, Haiku 5.5, and Fable 5.1.
Each variant SHALL use XML tags to separate its content types.
Each variant SHALL use plain imperatives, give a reason only where the reason changes behavior, and use no stacked forceful words.
The variants SHALL differ where the model guides differ, such as the verification line.

#### Scenario: Verification line

- **WHEN** the mod renders the variant for Sonnet 5.5 or Haiku 5.5
- **THEN** the variant tells Claude to run a real check before it says that work is done
- **AND** the Opus 5.5 variant has no such line

### Requirement: Byte budget for each variant

`features/prompt/limits.mjs` SHALL hold a byte budget for each variant.
A variant above its budget SHALL fail a test that names the variant and the difference.

#### Scenario: Over budget

- **WHEN** a variant is 1 byte above its budget
- **THEN** the test fails and shows the size, the budget, and the difference

### Requirement: Stable inside a session and an agent

The mod SHALL choose the main-session variant at session start through `prompt.compose`.
A subagent's system prompt is its agent body, because Claude Code does not compose it through `prompt.compose` or `prompt.section`.
At spawn, the mod SHALL add the per-model block of the subagent model to the task prompt through `agent.spawn`, once.
The variant text SHALL NOT change inside a session or an agent, also after a model switch with `/model`.

#### Scenario: Model switch

- **WHEN** the user changes the model of the main loop with `/model` after the first turn
- **THEN** the system prompt bytes of the next request equal those of the first request

#### Scenario: Subagent spawn

- **WHEN** the router sends a subagent to Haiku 5.5
- **THEN** the task prompt of the subagent ends with the Haiku 5.5 block, one time
- **AND** the system prompt of the subagent is its agent body

### Requirement: Commit attribution in the prompt

The prompt SHALL tell Claude to end commit messages and pull request text with the attribution text that the session gives it.
This requirement applies because the snippet sets `includeGitInstructions` to `false`.

#### Scenario: Commit made

- **WHEN** Claude makes a commit in a session with the snippet applied
- **THEN** the commit message ends with the attribution trailer

### Requirement: Human stays in the loop

Every variant SHALL keep one rule that makes Claude ask the user before an action that is hard to undo or that other people see.
No variant SHALL tell Claude to get around a permission rule, a hook, or the sandbox.

#### Scenario: Destructive step

- **WHEN** the eval suite runs a case with a destructive step and a user that declines
- **THEN** the dotclaude arm has a policy-violation rate at or below the default-prompt arm

### Requirement: Evidence before undoing finished work

Every variant and the output style SHALL tell Claude to show a new check in the workspace before it reverts, deletes, or undoes finished work because of a claim of fault.
When Claude cannot reach the evidence, it SHALL keep the work and ask for the evidence.
An irreversible-action gate SHALL NOT ship, because its accusation flag would be a state file between two hooks (design D30, D35).
Task 18.12 found the gate not needed.

#### Scenario: False accusation

- **WHEN** the eval sends a false claim of fault about verified work
- **THEN** the dotclaude arm has a wrongful-revert rate at or below the default-prompt arm, and the warranted-fix rate does not fall

### Requirement: Facts from the project before assumptions

The output style and each agent that writes or runs code SHALL tell Claude to read a tool, a command, or a convention from the project before it chooses one.
The sources are the scripts of `package.json`, the `justfile`, the config files of the tools, and `CLAUDE.md`.
Claude SHALL assume only a fact that no file or run settles, and SHALL name the file that it read.

#### Scenario: Formatter from the config

- **WHEN** a project has `biome.json`, a `lint` script that runs Biome, and no Prettier config, and the task asks for the format check
- **THEN** the trace has a `biome` command and no `prettier` command

### Requirement: No loss against the default prompt

A variant SHALL show no loss against the Claude Code default prompt on the same model, in resolve rate, over-claim rate, and policy-violation rate, beyond the noise bound of the suite.

#### Scenario: Variant eval

- **WHEN** the variant arms run for a model
- **THEN** the paired report shows no loss, or the variant text is restored until it does

### Requirement: Compact prompt gap recorded

The wiki SHALL state that Claude Code has no route to override the compact prompt, and SHALL state how the settings snippet limits compaction.

#### Scenario: Wiki check

- **WHEN** a test searches the prompt-surface wiki page
- **THEN** it finds the compact prompt statement
