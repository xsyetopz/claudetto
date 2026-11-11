## MODIFIED Requirements

### Requirement: No Hook Changes a Call's Input in Auto Mode

No claudetto `tool.call` hook SHALL change the input of a call, because in 2.1.319 a changed input voids auto mode's server review of every call in the same response (`serverClassifierInputRewritten`), and each comes back with "gave no verdict". The `Agent` hook SHALL deny a call not in its exact form (`subagent_type` `claudetto:<Name>`, and an explicit `run_in_background` for Artemis and Metis) and name the form to send; the `ToolSearch` hook SHALL rewrite only the result.

#### Scenario: An Agent Call Off Its Form

- **WHEN** the model calls `Agent` with `subagent_type` `Explore`, or with none
- **THEN** the call is denied with the exact form to send and nothing runs, and the other calls of the response keep their review
- **AND** the lab tests are `delegation.test.ts`, "a call typed ... is refused with its exact form, never rewritten"

#### Scenario: A ToolSearch Query Naming AskUserQuestion

- **WHEN** a `ToolSearch` query names `AskUserQuestion`
- **THEN** the query reaches `ToolSearch` as written and the result lists `AskUserQuestion` as it came

#### Scenario: A ToolSearch Query Naming Monitor

- **WHEN** a `ToolSearch` query names `Monitor`
- **THEN** the query reaches `ToolSearch` as written and the result lists `mcp__claudetto__monitor` in its place

## ADDED Requirements

### Requirement: A Question to the Person Goes Through the Built-in Dialog

The model SHALL ask the person through the built-in `AskUserQuestion`, and claudetto SHALL register no ask tool of its own, because auto mode's classifier reads a popup answer only from that tool: it adds the answer to its transcript as `[User answered AskUserQuestion]: …` and drops every other tool's result. Claudetto SHALL replace the tool's description with `ASK_TEXT`, one sentence, and SHALL defer the tool when the session has `ToolSearch`. Setup's own questions SHALL go through `$.ui.ask`.

#### Scenario: The Model Asks

- **WHEN** the model calls `AskUserQuestion` and no `no-questions` constraint holds
- **THEN** the call reaches the engine's dialog as sent, and its answer comes back as the engine gave it
- **AND** the lab test is `delegation-tools.test.ts`, "the model's own AskUserQuestion call reaches the dialog as sent"

#### Scenario: The Description

- **WHEN** the engine describes `AskUserQuestion` in a session with `ToolSearch`
- **THEN** the description is `ASK_TEXT` and the tool is deferred
- **AND** in a session with no `ToolSearch` the description is `ASK_TEXT` and the tool stays in the list
- **AND** the lab tests are `delegation-tools.test.ts`, "AskUserQuestion gets the one-sentence description and goes behind ToolSearch" and "AskUserQuestion stays in the list when the session has no ToolSearch"

#### Scenario: Setup Asks

- **WHEN** setup asks the person which option to take
- **THEN** the question goes through `$.ui.ask`, and a dismissed dialog rejects
