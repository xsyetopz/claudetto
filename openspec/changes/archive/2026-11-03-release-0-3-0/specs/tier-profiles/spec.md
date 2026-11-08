## MODIFIED Requirements

### Requirement: The Snippet Holds the Planned Keys

The snippet SHALL hold `$schema`, `minimumVersion: "2.1.316"`, `workflowSizeGuideline: "unrestricted"`, `workflowKeywordTriggerEnabled: false`, `enableWorkflows: false`, `enableArtifact: false`, `remoteControlAtStartup: false`, `statusLine`, and `subagentStatusLine`, and setup SHALL write only `~/.claude/settings.json`.

#### Scenario: Clean Write

- **WHEN** setup writes to an empty settings file
- **THEN** `jq` reads each key above with its value, and `~/.claude.json` is unchanged

### Requirement: A Tool Result Does Not Carry a Haiku Request Past the Price Step

A tool result SHALL be withheld when it would take the next request of a Haiku 5.5 loop over 100,000 prompt tokens, since the handoff trigger is checked between calls (`docs/window-weights.md`). The prompt SHALL be read from the `usage` of the step that made the call, and the result's size estimated from its text. A step whose request names another model SHALL be left alone, with no wait. The wait on the step's `usage` SHALL end at least 1 s before the call hook's 10 s budget, because a hook that runs past its budget twice unloads the plugin.

#### Scenario: Result Would Cross the Step

- **WHEN** a tool call made by a step that `claude-haiku-5-5` answered returns a result, and that step's prompt and output tokens, the step's results already passed, and this result's estimated tokens sum to more than 100,000
- **THEN** the model reads a withheld result that names its estimated size, the 100,000 step, and how to ask for less, and no request carries the result

#### Scenario: Result Fits

- **WHEN** the same sum is 100,000 or less
- **THEN** the result reaches the model unchanged

#### Scenario: Other Model

- **WHEN** the request of the step that made the call names a model other than Haiku 5.5
- **THEN** the result reaches the model unchanged, whatever its size, without waiting for the step to end

#### Scenario: Several Calls in One Step

- **WHEN** a Haiku 5.5 step makes two calls whose results each fit alone but together cross the step
- **THEN** the result that returns first reaches the model unchanged, and the second is withheld

#### Scenario: Step Ends with No Reading

- **WHEN** the step that made the call ends with no `usage`
- **THEN** the result reaches the model unchanged

#### Scenario: Step Streams Past the Budget

- **WHEN** a Haiku 5.5 step still streams when less than 1 s of the call hook's 10 s budget is left
- **THEN** the result reaches the model unchanged, and the hook ends inside its budget

## ADDED Requirements

### Requirement: Every Alias and the Default Resolve to the Row's Models

The tier snippet SHALL write `ANTHROPIC_DEFAULT_MODEL`, `ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, and `ANTHROPIC_DEFAULT_HAIKU_MODEL` under `env`, each set to a full model ID of the row, so that `default`, `opus`, `sonnet`, `haiku`, `opusplan`, and an agent's `model:` alias never resolve to an older model.

#### Scenario: Default Is Opus 5 on the Account

- **WHEN** the `/model` picker shows "Default (recommended) Opus 5" and a session starts with no `model` key
- **THEN** its requests name `claude-opus-5-5`

#### Scenario: Plan Alias

- **WHEN** a setting or an agent names `opusplan` or `opus`
- **THEN** the plan or main request names `claude-opus-5-5`, not `claude-opus-5`

### Requirement: A Model Off the Row Is Shown

When a response of the main thread or a subagent names a model that the row does not name, claudetto SHALL show the user one line with the model it got and the model the row names, once per session and model.

#### Scenario: Silent Opus 5

- **WHEN** the row names `claude-opus-5-5` and a response names `claude-opus-5`
- **THEN** the user sees a line naming both, in the first turn it happens

### Requirement: New Worktrees Start at the Branch Tip

Setup SHALL write `worktree.baseRef: "head"` when the key is unset, in a dialog group that names the key and what it does. Setup SHALL NOT replace a `worktree.baseRef` the user set, nor offer to replace it.

#### Scenario: Unset Key

- **WHEN** the settings hold no `worktree.baseRef` and setup runs
- **THEN** the settings hold `worktree.baseRef: "head"`, and a worktree that `EnterWorktree` or an agent with `isolation: "worktree"` makes starts at the tip of the current branch

#### Scenario: The User's Own Value

- **WHEN** the settings hold `worktree.baseRef: "fresh"` and setup runs
- **THEN** the value stays `"fresh"`, and the setup dialog does not list `worktree.baseRef`
