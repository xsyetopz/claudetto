## Purpose

claudetto ends a long or cold session with a code-built handoff, a `/clear`, and a resume, and it picks that path or a compaction by what costs less.

## ADDED Requirements

### Requirement: Handover Steps

A handover SHALL write the handoff file with no model call, queue `/clear` with `$.command.run`, and send the handoff as the next user turn with `$.prompt.submit`.
The resume SHALL run only after `/clear` ends.

#### Scenario: Order

- **WHEN** a handover starts
- **THEN** the handoff file exists first, then `/clear` runs, then the resume prompt holds the handoff text

#### Scenario: No Model Request

- **WHEN** the handoff file is built
- **THEN** the build makes no call of `$.model.complete`, `$.model.fork`, or `$.model.classify`

### Requirement: Handoff Location

Each handoff SHALL go to `.claudetto/handoffs/`.
A change folder SHALL get no `handoff.md`.

#### Scenario: Open Change

- **WHEN** a handover runs while the change `release-0-3-0-alpha-2` is open
- **THEN** the file is in `.claudetto/handoffs/`, and `openspec/changes/release-0-3-0-alpha-2/` gets no `handoff.md`

### Requirement: Handoff Content

The handoff SHALL name the open change and its next task, the decisions and ruled-out options from the records of `decide`, the passed checks, and each value that the user owns.
Its header SHALL treat a task box with no passed check as open.

#### Scenario: Ruled-Out Option

- **WHEN** the user rejected an option in `AskUserQuestion`, and a handover runs
- **THEN** the handoff names the rejected option

#### Scenario: Box with No Check

- **WHEN** a task box is ticked and the session record has no passed check of it
- **THEN** the header lists the task as open

### Requirement: Three Triggers

A handover SHALL start on one of three triggers.
First, the context passes 150k tokens, from `slices/handoff/limits.ts`.
Second, the session was idle longer than the prompt cache TTL, checked at the next `prompt.submit`, and the user says yes to the offer.
Third, the open change moves to its next task group, or the session runs longer than 8 hours, from the same file.
The first and third triggers start with no question.

#### Scenario: Context Bound

- **WHEN** a turn ends and the context is over the bound
- **THEN** the handover starts

#### Scenario: Cold Cache, Yes

- **WHEN** the session was idle longer than the cache TTL, the user sends a prompt, and the user says yes to the handover note
- **THEN** the session resumes on the handoff, and the held prompt runs after the resume

#### Scenario: Cold Cache, No

- **WHEN** the session was idle longer than the cache TTL and the user says no to the handover note
- **THEN** the prompt runs in the same session with no handover

#### Scenario: Next Task Group

- **WHEN** the open change moves from group 3 to group 4 at the end of a turn
- **THEN** the handover starts

### Requirement: Only at a Quiet Turn End

A handover or a compaction by claudetto SHALL start only at the end of a turn with no running agent and no running background task.

#### Scenario: Running Agent

- **WHEN** the context is over the bound and a `claudetto:worker` still runs
- **THEN** nothing starts until the agent ends

### Requirement: Built-In Safety Net

The automatic compaction of Claude Code SHALL stay on as the safety net, with no claudetto hook on it.

#### Scenario: Trigger Missed

- **WHEN** the context reaches the start of automatic compaction before a trigger fires
- **THEN** Claude Code compacts, and no claudetto hook changes the compaction

### Requirement: Path by Measure

A table in `slices/handoff/limits.ts` SHALL map each case, a trigger and a context size, to `handover`, `compact`, or `handoff-then-compact`, and the code SHALL pick the path from it.
A path SHALL win a case when paired runs show that it costs less and the next task passes as well or better.

#### Scenario: Table Names Handover

- **WHEN** the table maps the case "context bound, 200k" to `handover`
- **THEN** the code runs a handover for that case

#### Scenario: Table Names Compact

- **WHEN** the table maps a case to `compact`
- **THEN** the code runs a compaction for that case and writes no handover

#### Scenario: Table Names Both

- **WHEN** the table maps a case to `handoff-then-compact`
- **THEN** the code writes the handoff file, then runs a compaction

#### Scenario: Paired Runs Decide

- **WHEN** paired runs show that `compact` costs less for a case and the next task passes as well
- **THEN** the table maps that case to `compact`

### Requirement: Model at a Cold Start

The table SHALL also name the model of the first request step after a handover, and a `TurnStepInput` hook SHALL set it with `next({ ...e, model })`.
Its first value SHALL be the session model, and paired runs SHALL set it per case by the rule of "Path by Measure".

#### Scenario: Cheaper Model Wins

- **WHEN** paired runs show that `sonnet` for the first step after a handover costs less and the next task passes as well
- **THEN** that step runs on `sonnet`, and the later steps run on the session model

### Requirement: Compaction Option

The option `compaction` SHALL be `auto`, `handover`, or `built-in`, and `auto` SHALL be the default.
`auto` SHALL use the table.
`handover` SHALL run a handover for each trigger.
`built-in` SHALL start no path of claudetto and leave compaction to Claude Code.

#### Scenario: Auto

- **WHEN** `compaction` is unset and a trigger fires
- **THEN** the code picks the path from the table

#### Scenario: Handover

- **WHEN** `compaction` is `handover` and a trigger fires for a case that the table maps to `compact`
- **THEN** the code runs a handover

#### Scenario: Built-In

- **WHEN** `compaction` is `built-in` and a trigger fires
- **THEN** claudetto starts no handover and no compaction
