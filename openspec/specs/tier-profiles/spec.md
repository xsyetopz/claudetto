# tier-profiles Specification

## Purpose
One table holds the cost-driving values, with a row per subscription tier, and setup writes the keys the user keeps.

No reading splits a written key by tier, and no tier table ships: `plugins/claudetto/hooks/setup/settings.ts` holds one set of groups for every login, and `plugins/claudetto/hooks/setup/settings.test.ts` pins each key it writes.

Setup therefore reads no plan. The premise that "settings that drive cost differ by subscription tier" is not supported by any reading this change took, and this Purpose records that rather than restating it.

## Requirements

### Requirement: Keys Are Checked

Every key that a group of `hooks/setup/settings.ts` sets SHALL exist in the settings schema or the installed binary, and a test SHALL pin it.

#### Scenario: Missing Key

- **WHEN** the installed Claude Code does not know a key of a group
- **THEN** the pin test fails and names the key

### Requirement: Agents Inherit the Tier

Setup SHALL write `CLAUDE_CODE_SUBAGENT_MODEL` as `claude-sonnet-5-5` in the "Models and windows" group. An agent file that names no `model:` line, as `Heracles` does, SHALL run on it. The order of choice is the per-call `model`, then the agent field, then `CLAUDE_CODE_SUBAGENT_MODEL`, then the main model (`clawdipedia` route `extend/subagents/frontmatter`, row `model`, checked 2026-10-27).

#### Scenario: Subagent Model

- **WHEN** a plugin agent with no `model:` line starts with no model passed in the call
- **THEN** it runs on `claude-sonnet-5-5`

### Requirement: Context Cap per Model

The "Models and windows" group SHALL write `autoCompactWindow` 300,000 and `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` `50.0000`, so that Claude Code compacts at 140,000 tokens, half of the 280,000 effective window. It SHALL write `autoCompactWindow` 200,000 under `modelSettings` for `claude-haiku-5-5`, which compacts at exactly 90,000, below the 100,000 prompt tokens where the pricing page bills five times the rate (cache reads and writes count).

#### Scenario: Haiku Margin

- **WHEN** the trigger value is chosen
- **THEN** it is 90,000, and the Anthropic page `about-claude/models/optimizing-for-cost-and-intelligence` states under "Cache repeated context" that "In Anthropic's test with 10,000-token turns, a trigger of 90,000 cost 70% less per request than the default" (read 2026-10-28)
- **AND** that saving is a vendor test at a 10,000-token turn size and not our measurement

#### Scenario: Haiku Session

- **WHEN** the main model is Haiku 5.5
- **THEN** the engine compacts at 90,000, below 100,000 prompt tokens

#### Scenario: Other Models

- **WHEN** the main model is Opus 5.5 or Sonnet 5.5
- **THEN** the engine compacts at exactly 140,000 of the 280,000 effective window
- **AND** the value is 140,000 because it is the only threshold inside the within-1% band of every lost-work charge from the measured 20.1 turns to twice it under both summary models, and 130,000 would need a Haiku window of 213,846. Vendor sources publish no quality cliff for these models, so none is claimed

### Requirement: User Values Stay

A value that the user set, and an option that the user rejected, SHALL stay until the user changes them.

#### Scenario: Existing Key

- **WHEN** the user's settings already hold a key of a group with another value
- **THEN** setup shows both values and keeps the user's unless the user answers "Replace mine too"

### Requirement: Setup Asks What to Keep

Setup SHALL run from inside Claude Code with no checkout of this repository, no `bun`, and no `just`, SHALL ask per group of keys whether to write it, and SHALL write no key of a group the user discarded. It SHALL cost the session no model tokens (the user, 2026-10-30: "it will ask what to keep, meaning the rest get discarded, upon lightweight setup command", and "we need least-costly (tokens, characters) approach that *works*").

#### Scenario: The Dialog

- **WHEN** `/claudetto:setup` runs with a person to ask
- **THEN** one dialog per group of `GROUPS` in `plugins/claudetto/hooks/setup/settings.ts` offers "Smaller prompt", "Auto mode", "Models and windows", "Worktrees", "Features off", and "Status line", and every key setup writes sits in exactly one group

#### Scenario: A Fact of This Repository Is Not Shipped

- **WHEN** a value would carry a reading of this repository rather than a value true of any machine
- **THEN** no group SHALL hold it, because the command writes the groups for every user
- **AND** the "Auto mode" group SHALL hold the lists of `plugins/claudetto/hooks/setup/auto-mode.ts`, whose `environment` list names no fact of one repository

#### Scenario: A Discarded Group

- **WHEN** the user keeps some groups and not others
- **THEN** no key of a discarded group is written, and a key of that group the user already holds stays as it is

#### Scenario: Nobody to Ask

- **WHEN** the dialog is dismissed, or there is no one to ask, as in a `claude -p` run
- **THEN** nothing is written and the report says so

#### Scenario: Cost of the Command

- **WHEN** the command answers
- **THEN** it returns `text` and no `context`, so the person reads the report and the model reads nothing of it
- **AND** the only cost is the row in the command listing, measured at 48 characters of the first request (31,909 against 31,861 with no command) before task 17.13 (`e20d11df`)

#### Scenario: A Settings Hook Is Not the Mechanism

- **WHEN** a `settings.read` hook answers the keys in place of a settings file
- **THEN** in `-p` mode the hook changes 1 of 7 measured keys (`design.md`, "Settings reach the session by the narrowest route that a probe confirms")
- **AND** a real settings file SHALL be the mechanism, because a plugin's own `settings` key reaches only `agent` and `subagentStatusLine`

### Requirement: No Promise of Plan Share

The system SHALL NOT state a saving as a share of plan limits without a measurement.

#### Scenario: Setup Report

- **WHEN** setup reports what it wrote
- **THEN** the report names the groups written, and gives no percentage of a limit

### Requirement: The Snippet Holds the Planned Keys

The groups SHALL hold `$schema`, `minimumVersion: "2.1.318"`, `workflowSizeGuideline: "unrestricted"`, `workflowKeywordTriggerEnabled: false`, `enableWorkflows: false`, `enableArtifact: false`, `remoteControlAtStartup: false`, and `statusLine`, and setup SHALL write its settings keys only to `~/.claude/settings.json`. It SHALL NOT write `subagentStatusLine`, which the plugin's root `settings.json` ships.

#### Scenario: Clean Write

- **WHEN** setup writes to an empty settings file
- **THEN** `jq` reads each key above with its value, and `~/.claude.json` is unchanged

### Requirement: A Tool Result Does Not Carry a Haiku Request Past the Price Step

A tool result SHALL be withheld when it would take the next request of a Haiku 5.5 loop over 100,000 prompt tokens.

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

#### Scenario: The Prompt Is Read from the Step

- **WHEN** the sum is computed
- **THEN** the prompt is read from the `usage` of the step that made the call, and the result's size is estimated from its text
- **AND** the check is needed because the handoff trigger is checked between calls (`plugins/claudetto/hooks/limits/price-step.ts`, tested by `price-step.test.ts` in the same folder)

#### Scenario: The Wait Ends before the Hook Budget

- **WHEN** the hook waits on the step's `usage`
- **THEN** the wait ends at least 1 s before the call hook's 10 s budget, because a hook that runs past its budget twice unloads the plugin

### Requirement: Every Alias and the Default Resolve to the Row's Models

The "Models and windows" group SHALL write `ANTHROPIC_DEFAULT_MODEL`, `ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, and `ANTHROPIC_DEFAULT_HAIKU_MODEL` under `env`, each set to a full model ID of `claude-opus-5-5`, `claude-sonnet-5-5`, or `claude-haiku-5-5`, so that `default`, `opus`, `sonnet`, `haiku`, `opusplan`, and an agent's `model:` alias never resolve to an older model.

#### Scenario: Default Is Opus 5 on the Account

- **WHEN** the `/model` picker shows "Default (recommended) Opus 5" and a session starts with no `model` key
- **THEN** its requests name `claude-opus-5-5`

#### Scenario: Plan Alias

- **WHEN** a setting or an agent names `opusplan` or `opus`
- **THEN** the plan or main request names `claude-opus-5-5`, not `claude-opus-5`

### Requirement: New Worktrees Start at the Branch Tip

Setup SHALL write `worktree.baseRef: "head"` when the key is unset, in the "Worktrees" group that names the key and what it does. Setup SHALL replace a `worktree.baseRef` the user set only when the user answers "Replace mine too".

#### Scenario: Unset Key

- **WHEN** the settings hold no `worktree.baseRef` and setup runs
- **THEN** the settings hold `worktree.baseRef: "head"`, and a worktree that `EnterWorktree` or an agent with `isolation: "worktree"` makes starts at the tip of the current branch

#### Scenario: The User's Own Value

- **WHEN** the settings hold `worktree.baseRef: "fresh"` and setup runs
- **THEN** the value stays `"fresh"` unless the user answers "Replace mine too"

### Requirement: Subagent Cap by Plan

Setup SHALL read the plan from `oauthAccount.organizationRateLimitTier` and `oauthAccount.organizationType` in the login record, `$CLAUDE_CONFIG_DIR/.claude.json` or else `~/.claude.json`. For a plan with a 5-hour window, setup SHALL offer a "Subagent cap" group that writes `env.CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`. For Ultra, which has no 5-hour window, and for a plan claudetto does not know, setup SHALL offer no cap.

#### Scenario: Pro

- **WHEN** the login record names `claude_pro` and setup runs
- **THEN** setup offers the "Subagent cap" group with `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: "3"`

#### Scenario: Max

- **WHEN** the login record names `default_claude_max_5x` and setup runs
- **THEN** setup offers the "Subagent cap" group with `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: "4"`

#### Scenario: Ultra

- **WHEN** the login record names `default_claude_max_20x` and setup runs
- **THEN** setup offers no subagent cap group
