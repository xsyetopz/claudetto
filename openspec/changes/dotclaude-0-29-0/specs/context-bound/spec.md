## MODIFIED Requirements

### Requirement: Subagent report at the bound

When the context or the turn count of a subagent passes its bound, dotclaude SHALL tell the subagent to report now.
The bound of a Haiku 5.5 subagent SHALL be `HAIKU_CONTEXT_MAX`, below 100K tokens with room for the report turn, because Haiku 5.5 costs 5x for each request above 100K prompt tokens.
The bound of another subagent SHALL be `SUBAGENT_CONTEXT_MAX`.
The turn bound SHALL leave the turns of a full report before `maxTurns` (design D1).
dotclaude SHALL NOT block the tool call, because a block loses the work of the run.

#### Scenario: Bound passed

- **WHEN** the context of a subagent passes the bound
- **THEN** the subagent gets the report-now note, and its run ends with a report within one more turn

#### Scenario: Turn bound passed

- **WHEN** a subagent reaches the turn bound of its agent file
- **THEN** the subagent gets the report-now note, and its run ends with a report before `maxTurns`

#### Scenario: Haiku bound

- **WHEN** the context of a Haiku 5.5 subagent passes `HAIKU_CONTEXT_MAX` and is below `SUBAGENT_CONTEXT_MAX`
- **THEN** the subagent gets the report-now note

#### Scenario: Below the bound

- **WHEN** the context of a subagent is below the bound and the turn bound
- **THEN** the subagent gets no note

## ADDED Requirements

### Requirement: Trusted report-now note

The report-now note SHALL go to the subagent through `$.session.send` to its `agentId`, not in a tool result, and SHALL name dotclaude as its source, state the bound and the current value as facts, and say what to report (design D1).
The prompt of each subagent SHALL say that a message from the coordinator comes from dotclaude and that its facts are true.
The note SHALL NOT give a word count that differs from `REPORT_MAX_WORDS`.

#### Scenario: Note is followed

- **WHEN** a probe subagent with `maxTurns` 8 gets the note after a tool call
- **THEN** its next turn is the report, and the run ends with a report

#### Scenario: Note text

- **WHEN** a test renders the note at the turn bound
- **THEN** the note names its source, the turn count, `maxTurns`, and the turns left

### Requirement: Main-session context notice

The hooks module SHALL read the usage of each request of the main session through `turn.step`, as input, cache-creation, and cache-read tokens (design D27).
At or above `CONTEXT_NOTICE_AT`, the session SHALL get the figure and the tokens left before the client block.

#### Scenario: Notice

- **WHEN** a request of the main session ends with usage at `CONTEXT_NOTICE_AT`
- **THEN** the session gets the figure and the tokens left, and no handoff steps

#### Scenario: Below the level

- **WHEN** the usage is below `CONTEXT_NOTICE_AT`
- **THEN** the session gets no note

### Requirement: Main-session handoff

At or above `CONTEXT_HANDOFF_AT`, the session SHALL get the handoff steps (design D27).
With `mainHandover` at `auto`, the default, the mod SHALL run `/clear` and submit the continuation prompt after the handoff, with no step of the user.
With `manual`, the session SHALL tell the user to run `/clear` and to continue, and the mod SHALL run nothing.

#### Scenario: Handoff in one long turn

- **WHEN** the usage passes `CONTEXT_HANDOFF_AT` between two tool calls of one turn
- **THEN** the session gets the handoff steps before the next request, with no user prompt between them

#### Scenario: Automatic clear

- **WHEN** the session has written the handoff with `mainHandover` at `auto`
- **THEN** the conversation is cleared, and the next prompt is the continuation prompt with the next open task, with no step of the user

#### Scenario: Manual clear

- **WHEN** the session has written the handoff with `mainHandover` at `manual`
- **THEN** the session tells the user to run `/clear` and continue, and after `/clear` the clear note names the handoff and the next open task

### Requirement: Active change after clear

When a session starts with `source` `clear`, dotclaude SHALL give the session the name of the newest active OpenSpec change and its open tasks, read from `tasks.md`, and the path of the newest handoff of design D27 when one exists, as `additionalContext` (design D5).
dotclaude SHALL write no file for it.
It SHALL give nothing when the project has no active change, and it SHALL cap the text at `CLEAR_NOTE_MAX_BYTES`.

#### Scenario: Active change

- **WHEN** a session starts with `source` `clear`, and `openspec/changes/<name>/tasks.md` has 2 open tasks
- **THEN** the session gets the change name and the 2 open tasks

#### Scenario: Other start

- **WHEN** a session starts with `source` `startup`
- **THEN** the session gets no change note

#### Scenario: No change

- **WHEN** a session starts with `source` `clear`, and no active change exists
- **THEN** the session gets no change note and dotclaude writes no file
