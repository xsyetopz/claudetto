## Purpose

The facts that claudetto gives the model before it starts an agent, so that no agent starts on work that is already done.

## ADDED Requirements

### Requirement: Facts before a Spawn

Before an `Agent` call of the main thread, a hook SHALL add one context line that lists the task ids of the open change that are ticked and the files that the edit ledger shows as changed by this session, when the prompt of the call names one of them.
The hook SHALL add nothing when the prompt names none of them, and SHALL never deny the call.

#### Scenario: Prompt Names a Ticked Task

- **WHEN** task 2.1 is ticked and the main thread starts an agent with the prompt "Do task 2.1"
- **THEN** the call runs, and its context says that task 2.1 is ticked

#### Scenario: Nothing Done

- **WHEN** the prompt of the call names no ticked task and no changed file
- **THEN** the call runs with no added context
