## MODIFIED Requirements

### Requirement: The Init Interview Replaces the Built-in Init Prompt

The built-in `/init` skill's prompt SHALL be replaced by `INTERVIEW_TEXT`, which has the model read the repo and the memory files, ask through `AskUserQuestion` what they leave out and which of five scopes each instruction belongs to, and write only after a yes to each draft. A user's own skill named `init` SHALL keep its text.

#### Scenario: Init

- **WHEN** the built-in `init` skill prompt is built
- **THEN** the model gets the interview, and a user's skill named `init` keeps its text ("the built-in init skill reaches the model as the interview", "a user's own skill named init keeps its text")

## ADDED Requirements

### Requirement: Monitor, ToolSearch, and the Plan-Mode Tools Carry a Text of Ours

`TOOL_TEXTS` SHALL hold a text of at most 200 characters for `Monitor`, `ToolSearch`, `EnterPlanMode`, and `ExitPlanMode`, because each sent a stock description of 953 to 6,354 characters that no hook cut. Claudetto SHALL set no deferral for any of the four: the engine defers `Monitor` and the plan-mode tools itself, and `ToolSearch` stays loaded.

#### Scenario: The Monitor Text

- **WHEN** `TOOL_TEXTS["Monitor"]` is read
- **THEN** it says that a notice is not the user's reply, that the command prints only the lines the model acts on, failures among them, and that one notice is the job of `Bash` with `run_in_background`
- **AND** it says to run the writer itself in the command, because `tail -F` never ends after its writer exits and so the watch never ends
#### Scenario: The Four Texts

- **WHEN** the engine describes `Monitor`, `ToolSearch`, `EnterPlanMode`, or `ExitPlanMode` with a longer stock description
- **THEN** the answer holds our text and no `isDeferred` of ours
- **AND** the lab tests are `surface.test.ts`, "tool.describe sends our Monitor text, deferred only for Skill among them" and its three siblings, and "Monitor, ToolSearch, and the plan-mode tools each carry a text of ours"
