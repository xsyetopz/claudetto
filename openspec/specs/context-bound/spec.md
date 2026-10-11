# context-bound Specification

## Purpose

Bounds the context of each dotclaude subagent, and gives the model and the user measured context figures only.
Compaction is off in the dotclaude snippet, so a session that reaches its limit stops and loses its state.
The `context_management` text of `features/prompt/data.mjs` tells the main session that compaction is off and to keep the state of work in files, so the main session gets no context note.
The context hooks keep no state file (design D35).

## Requirements

### Requirement: File reads through Read

The `tools` shared section and each dotclaude agent that reads files SHALL tell the model to search first, to read only the matched range with the `Read` tool, and to refer to an earlier result instead of a second read of the same lines.

#### Scenario: Large file

- **WHEN** an agent answers a question from a 1 MB file
- **THEN** no tool result of the run is over 8,000 characters

### Requirement: Bash file prints denied

A `PreToolUse` hook SHALL deny a Bash command that only prints a file, such as `cat`, `sed -n` with a print range, `head`, or `tail` on one file with no pipe and no other command.
The deny reason SHALL give the `Read` call with the same file and range.

#### Scenario: Slice through Bash

- **WHEN** the model runs `sed -n '40,80p' design.md`
- **THEN** the hook denies the call, and the reason names `Read` with `offset` 40 and `limit` 41

#### Scenario: Filtered output

- **WHEN** the model runs `grep -n D22 design.md | head -5`
- **THEN** the hook allows the call

### Requirement: Subagent report at the bound

When the context of a subagent passes its bound, dotclaude SHALL tell the subagent to report now.
The bound of a Haiku 5.5 subagent SHALL be `HAIKU_CONTEXT_MAX`, below 100K tokens with room for the report turn, because Haiku 5.5 costs 5x for each request above 100K prompt tokens.
The bound of another subagent SHALL be `SUBAGENT_CONTEXT_MAX`.
dotclaude SHALL NOT block the tool call, because a block loses the work of the run.

#### Scenario: Bound passed

- **WHEN** the context of a subagent passes the bound
- **THEN** the subagent gets the report-now message, and its run ends with a report within one more turn

#### Scenario: Haiku bound

- **WHEN** the context of a Haiku 5.5 subagent passes `HAIKU_CONTEXT_MAX` and is below `SUBAGENT_CONTEXT_MAX`
- **THEN** the subagent gets the report-now message

#### Scenario: Below the bound

- **WHEN** the context of a subagent is below the bound
- **THEN** the subagent gets no message

### Requirement: Report length

Each dotclaude agent body SHALL bound its final report to `REPORT_MAX_WORDS`.

#### Scenario: Agent file check

- **WHEN** the test reads each agent file
- **THEN** each body names the bound with the value from `features/context/limits.mjs`

### Requirement: Usage report

`just measure` SHALL report, for each subagent of a session, the requests, the final context, and the total input tokens.
For the main session, it SHALL report the tool-result size for each tool and the count of repeat reads of the same file.

#### Scenario: Known session

- **WHEN** `just measure` reads session `157f1ff7`
- **THEN** it prints 7 subagent runs and 223K as the largest final context

#### Scenario: Repeat reads

- **WHEN** `just measure` reads session `00bfd354`
- **THEN** it prints the count of repeat file reads, and the count matches `research/session-growth.md`

### Requirement: No model-made context figures

dotclaude prompt text SHALL NOT tell the model to estimate or announce its own context share.
The status line SHALL be the only source of a context figure for the user.

#### Scenario: Prompt text check

- **WHEN** the test reads the output style, the shared sections, the system prompt variants, and the agent bodies
- **THEN** no text tells the model to report a context percentage

### Requirement: Bounds in one place

`SUBAGENT_CONTEXT_MAX`, `HAIKU_CONTEXT_MAX`, and `REPORT_MAX_WORDS` SHALL be in `features/context/limits.mjs`, because only the context feature reads them.
`CONTEXT_BLOCK_MARGIN` SHALL be in `lib/budget.mjs`, because the status line also reads it.
Tests SHALL pin each copy of a bound in code and config.

#### Scenario: Changed bound

- **WHEN** a bound changes in `features/context/limits.mjs` and a copy in config does not
- **THEN** the pin test fails and names the copy
