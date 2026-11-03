## MODIFIED Requirements

### Requirement: Byte Budget per Piece

Each of the root prompt, `output-styles/Concise.md`, each skill `description:` line, and each text injected by a hook SHALL have a byte budget that a test checks. No budget value exists yet. Task 3.5 derives each budget from a measurement, which is the capture readings of tasks 2.3 and 3.1, and the only number fixed so far is the cap of the root prompt.

#### Scenario: Over Budget

- **WHEN** a piece grows past its budget
- **THEN** the test fails and names the piece, its size, and its budget

## REMOVED Requirements

### Requirement: The Main Agent File Is Smaller Than the Body It Replaces

**Reason**: No main agent file remains. The root prompt reaches the main loop through a `prompt.compose` hook, and its size is held by the 6,000-character cap of "Root Prompt with New Rules", which the user set on 2026-10-31.
**Migration**: Read the root prompt's size in `system[2]` with `just capture --arm plugin --shipped`.

## ADDED Requirements

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
