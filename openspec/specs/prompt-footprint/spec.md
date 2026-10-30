# prompt-footprint Specification

## Purpose
The prompt text that claudetto adds stays small, stable, and measured. A test fails when a piece grows past its budget.

## Requirements

### Requirement: Byte Budget per Piece

Each of `agents/main.md`, `output-styles/Concise.md`, each skill `description:` line, and each text injected by a hook SHALL have a byte budget that a test checks. No budget value exists yet. Task 3.5 derives each budget from a measurement, which is the capture readings of tasks 2.3 and 3.1, and the only number fixed so far is the `5,627` of the next requirement.

#### Scenario: Over Budget

- **WHEN** a piece grows past its budget
- **THEN** the test fails and names the piece, its size, and its budget

### Requirement: The Main Agent File Is Smaller Than the Body It Replaces

`agents/main.md` SHALL be smaller than the default system body that a main-thread agent file replaces, which is `5,627` characters (`system[2]`, `docs/prompt/overrides.md`). The file replaces the body and does not add to it, so a file larger than the body is a loss.

#### Scenario: File Larger Than the Body

- **WHEN** `agents/main.md` is larger than `5,627` characters
- **THEN** the test fails and names the file, its size, and `5,627`

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
