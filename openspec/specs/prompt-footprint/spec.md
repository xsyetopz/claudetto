# prompt-footprint Specification

## Purpose
The prompt text that claudetto adds stays small, stable, and measured. A test fails when a piece grows past its budget.

## Requirements

### Requirement: Byte Budget per Piece

Each of the root prompt, `output-styles/Concise.md`, each skill `description:` line, and each text injected by a hook SHALL have a byte budget that a test checks. No budget value exists yet. Task 3.5 derives each budget from a measurement, which is the capture readings of tasks 2.3 and 3.1, and the only number fixed so far is the cap of the root prompt.

#### Scenario: Over Budget

- **WHEN** a piece grows past its budget
- **THEN** the test fails and names the piece, its size, and its budget

### Requirement: Budgets Fall

The first budgets SHALL be the values that task 3.5 derives from measurement, and the sizes SHALL be listed in `docs/`.

#### Scenario: Baseline Recorded

- **WHEN** the change lands
- **THEN** `docs/` lists the before and after bytes of each piece

### Requirement: Stable Shared Text

A shared prompt section SHALL be a pure function of its inputs, with no time, counter, or usage number.

#### Scenario: Two Sessions

- **WHEN** two sessions start with the same inputs
- **THEN** their shared sections are byte-identical

### Requirement: No Per-Message Injection

The system MUST NOT add text on every user message. Context SHALL enter once, at the first message or at a compaction.

#### Scenario: Quiet Turn

- **WHEN** the usage bands have not changed
- **THEN** the prompt hook adds no text

### Requirement: Skills Stay Out of Context

A skill that the model need not call SHALL set `disable-model-invocation: true`, so that its description is not in context (`clawdipedia` route `extend/skills-and-commands/substitutions`: "The description is not in context", checked 2026-10-27).

#### Scenario: Manual Skill

- **WHEN** a skill is meant for the user to call by name
- **THEN** its description is absent from the skill list of the session

### Requirement: A Cut Counts by Billed Cost

A cut SHALL count as a saving only when billed cost per finished task falls, and not when token count falls. One study found that the largest compression setup removed 38.4% of delivered tool-output tokens and raised billed cost by 6.8%, with a Pearson r of 0.15 between token and cost reduction (arXiv 2607.12161). Another found that turn count explains 84% of the variance in log trajectory cost (arXiv 2610.15093).

#### Scenario: Smaller Text, Same Cost

- **WHEN** a cut shrinks a prompt piece and the measured billed cost per task does not fall
- **THEN** the report says no saving was found for that cut

### Requirement: Fewer Tool Definitions

The system SHALL keep the added tool descriptions under a budget, and SHALL NOT add a tool whose job a skill or an existing tool does.

#### Scenario: New Tool

- **WHEN** a change adds a tool definition
- **THEN** the budget test counts it and fails if the total passes the limit

### Requirement: Every Surface Is Read and Cut

Each surface claudetto reaches SHALL be read before and after its cut by `just capture` or `just inventory`: the session prompt, tool texts, agent and skill texts, the output style, hook output, and the classifier request (D21). A fresh session SHALL cost less than the 13.8k-token baseline (G6).

#### Scenario: Release Reading

- **WHEN** `0.1.0` is cut
- **THEN** `just capture --shipped` reads a first request below the `0.0.0` reading, and `just inventory` passes

### Requirement: Empty Session Reading Is Recorded

`docs/prompt/footprint.md` SHALL hold a `/context all` reading of an empty interactive session with the shipped settings, taken in `tmux` on the supported Claude Code version, before and after this change.

#### Scenario: Reading Recorded

- **WHEN** the change lands
- **THEN** `docs/prompt/footprint.md` lists the rows of 2026-10-31 (system prompt 4.6k, system tools 5.8k, skills 786, memory files 550, custom agents 289, MCP instructions 36, messages 10, total 12k) and the rows after the change

### Requirement: Empty Session Reading Is Split by Owner

Each row of the empty-session reading SHALL be split by owner: the engine, the repository, or claudetto. The claudetto share SHALL be split by piece, and each number SHALL name the `just capture` command that read it.

#### Scenario: Claudetto Pieces

- **WHEN** the split is recorded
- **THEN** it lists the root prompt, `output-styles/Concise.md`, the tool texts, the agent listing, the skill listing, and each hook text, each with its size and command

#### Scenario: Repository Rows

- **WHEN** a row comes from the repository, such as `AGENTS.md` or a project skill
- **THEN** it is listed under the repository and not counted as claudetto's

### Requirement: The Claudetto Share of an Empty Session Falls

The tokens that claudetto adds to an empty session SHALL be lower after this change than in `0.2.0`, read by the same method on the same Claude Code version, with each piece's before and after listed.

#### Scenario: After the Cuts

- **WHEN** `/context all` and `just capture --shipped` are read after the cuts
- **THEN** the claudetto share is below the `0.2.0` share

#### Scenario: Root Prompt with New Rules

- **WHEN** the root prompt is rewritten for the `agent-conduct` capability
- **THEN** its body, as the request carries it, is at most 6,000 characters, the cap the user set on 2026-10-31

#### Scenario: Tokens Are Not Cost

- **WHEN** the report gives the fall
- **THEN** it gives the fall in tokens, and it claims no cost saving unless "A Cut Counts by Billed Cost" is met

### Requirement: The Sandbox Settings Share Is Measured

The part of the sandbox block that claudetto's sandbox settings add SHALL be split by setting, such as each `denyRead` path, and recorded in `docs/prompt/footprint.md` with the `just capture` command. A setting that another layer already enforces SHALL be cut. The sandbox SHALL stay on.

#### Scenario: Baseline of 0.2.0

- **WHEN** the split starts
- **THEN** it records the `0.2.0` capture of `just capture --shipped --interactive`: 42,752 characters plain against 43,356 with the plugin, and a sandbox block of 8,207 against 11,470

#### Scenario: A Cut Setting

- **WHEN** a sandbox setting is cut
- **THEN** the record names the layer that still enforces it, and the sandbox block is smaller in the next capture
