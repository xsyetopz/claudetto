# Spec Delta: `turn-gate`

## Purpose

Treats a text-only end of a turn as a report and not as proof that the work is done.
The gate runs at `Stop` and at `SubagentStop`, in the hooks module of the core plugin.
The evidence is in the wiki pages `Failure-Gaps-0.1.0` and `Model-Guidance`, and in D58 and D59 of `Decisions-Engine`.

## ADDED Requirements

### Requirement: Block a stop while a background task runs

When an entry of `background_tasks` in the input of `Stop` or `SubagentStop` has the status `running`, the gate SHALL block the stop.
The reason SHALL give the `id` and the `description` of each such task, and tell Claude to wait for it or to stop it with `TaskStop`.
This part SHALL make no model call.

#### Scenario: A background command still runs

- **WHEN** Claude ends a turn, and `background_tasks` has an entry with `status: "running"`
- **THEN** the stop is blocked, and the reason names the `id` of the task

#### Scenario: All tasks ended

- **WHEN** each entry of `background_tasks` has a status that is not `running`
- **THEN** this part does not block the stop

### Requirement: The judge reads the reply and the tool calls of the turn

When the judge is on, the gate SHALL send the judge only `last_assistant_message` and a summary of the tool calls of the turn: the tool, the target, and the exit code or the error.
The judge SHALL answer whether the reply calls work done that no check of the turn shows, promises work that the turn did not do, or opens with an apology or with agreement.
The gate SHALL make no word or pattern match on the reply.

#### Scenario: Done with no check

- **WHEN** the reply says that a fix passes, and the turn ran no check after the last edit
- **THEN** the stop is blocked, and the reason quotes the claim and names the check to run

### Requirement: The rubric and the model of the judge

The rubric SHALL come from the texts that `Model-Guidance` cites, and SHALL hold no word list.
The judge SHALL NOT be Haiku, because the Haiku 5.5 card reports more false completion claims (§6.2.3).

#### Scenario: Done with no check

- **WHEN** the reply says that a fix passes, and the turn ran no check after the last edit
- **THEN** the stop is blocked, and the reason quotes the claim and names the check to run

#### Scenario: A reply in another language

- **WHEN** the reply is in Polish and makes the same claim with no check
- **THEN** the stop is blocked

#### Scenario: A question to the user

- **WHEN** the reply only asks the user a question
- **THEN** the stop is not blocked

### Requirement: The block text holds only the reason

A block SHALL send Claude only the reason of the judge, with the quote, the rule, and the fix.
The gate SHALL NOT use a `type: "prompt"` hook, because Claude Code puts the whole hook prompt into the block text.

#### Scenario: A block

- **WHEN** the judge blocks a stop
- **THEN** the `Stop hook feedback` text has no line of the rubric

### Requirement: The gate keeps its own cap

The gate SHALL keep a count of its blocks in each turn, and SHALL allow the stop after 2 continuations.
The gate SHALL NOT allow a stop only because `stop_hook_active` is `true`.
The harness cap `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` SHALL stay as a second bound.

#### Scenario: The same false claim again

- **WHEN** Claude repeats a blocked claim with no check, and the gate blocked once in this turn
- **THEN** the stop is blocked again

#### Scenario: The cap

- **WHEN** the gate blocked 2 times in this turn
- **THEN** the third stop is allowed, and the user sees a notice through `$.ui.log`

### Requirement: The judge has a measured cost and a user switch

The judge SHALL be a setting that the user turns on or off.
The judge SHALL be on by default.
The setup and the docs SHALL state the measured cost of one judge call.
When the judge call fails or times out, the gate SHALL allow the stop and log the failure through `$.ui.log`.

#### Scenario: The judge is off

- **WHEN** the judge setting is off
- **THEN** the gate makes no model call, and the background-task part still runs

#### Scenario: The judge fails

- **WHEN** the judge call times out
- **THEN** the stop is allowed, and the log names the timeout
