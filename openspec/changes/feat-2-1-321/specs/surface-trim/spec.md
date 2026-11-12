## MODIFIED Requirements

### Requirement: The Init Interview Replaces the Built-in Init Prompt

The built-in `/init` skill's prompt SHALL be replaced by `INTERVIEW_TEXT`, which has the model read the repo and the memory files, ask through `AskUserQuestion` what they leave out and which of five scopes each instruction belongs to, and write only after a yes to each draft. A user's own skill named `init` SHALL keep its text.

#### Scenario: Init

- **WHEN** the built-in `init` skill prompt is built
- **THEN** the model gets the interview, and a user's skill named `init` keeps its text ("the built-in init skill reaches the model as the interview", "a user's own skill named init keeps its text")

### Requirement: Built-in Agents Are Withheld and Mapped

The system SHALL withhold each agent whose `source` is `built-in` with `agent.offer`, and SHALL map an `Agent` call by its `subagent_type`: `Explore` to `claudetto:search`, `Plan` to `claudetto:plan`, and `general-purpose`, `claude`, or a missing type to `claudetto:work`. A bare or `claudetto:`-prefixed name of the three SHALL map to itself, and `fork` SHALL pass through.

#### Scenario: An Untyped Call

- **WHEN** the model calls `Agent` with no `subagent_type`, or with `general-purpose` or `claude`
- **THEN** `claudetto:work` runs

#### Scenario: A Withheld Agent with No Mapping

- **WHEN** the model calls `Agent` with `statusline-setup`
- **THEN** the call fails as "not found", and the listing of the first request names only claudetto's agents

### Requirement: A Mapped Agent Call Runs in the Foreground and Is Rewritten Only When It Must Be

The call SHALL carry `run_in_background: false` for `search` and `plan` unless the caller set it, because a plugin agent runs in the background otherwise (`settings-review.txt`, L17 item 3). A call that needs no change SHALL reach `next(e)` as `e` itself, because in auto mode a rewritten call sends it and every later call of the same response to the local classifier (L17 item 10 (g)).

#### Scenario: A Search Call with No Background Field

- **WHEN** the model calls `Agent` with `Explore` and no `run_in_background`
- **THEN** `claudetto:search` runs with `run_in_background: false`

#### Scenario: A Call Written in Full

- **WHEN** the model names `claudetto:search` with `run_in_background: false`
- **THEN** the hook passes the call unchanged, and the `--debug-file` of an auto-mode run holds no "a hook rewrote" line for it

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

