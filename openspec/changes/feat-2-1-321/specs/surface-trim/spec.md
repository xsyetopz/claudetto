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

### Requirement: The Task Tools Carry a Shorter Text of Ours

`TOOL_TEXTS` SHALL hold a text for `TaskCreate`, `TaskGet`, `TaskList`, and `TaskUpdate`, each shorter than its stock description of 2,146, 732, 998, and 2,243 characters, and no setting or schema of the tools changes.

#### Scenario: The Four Task Texts

- **WHEN** the engine describes `TaskCreate`, `TaskGet`, `TaskList`, or `TaskUpdate` with its stock description
- **THEN** the answer holds our text, shorter than the stock one
- **AND** the lab test is `surface.test.ts`, "TaskCreate gets our text, shorter than the stock one" and its three siblings

### Requirement: The Agent Text Sends a Committing Agent to a Worktree of Its Own

The `Agent` description SHALL tell the model to set `isolation: "worktree"` on an agent that commits, because agents that commit in one working tree block each other at the pre-commit hook. The hook SHALL pass a call that names `isolation` to the engine unchanged, and no agent definition SHALL set `isolation`, since a worktree holds the changes of an agent that does not commit.

#### Scenario: The Description

- **WHEN** the engine describes `Agent`
- **THEN** the text names `isolation: "worktree"` for an agent that commits

#### Scenario: A Call Naming Isolation

- **WHEN** the model calls `Agent` with `isolation: "worktree"`
- **THEN** the call reaches `next(e)` as `e` itself

