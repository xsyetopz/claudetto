# Spec Delta

## Purpose

Defines the start-of-session context that a dotclaude session sends, the budget that limits it, how it is measured, and the rules for the mod that cuts attachments and tool descriptions.

## ADDED Requirements

### Requirement: Start-of-session budget

`tools/limits.mjs` SHALL hold a bound in tokens for the start-of-session context of a dotclaude session.
`just measure` SHALL print its numbers and compare them with that bound, and SHALL write no file (design D35).
The measure SHALL be the input, cache-creation, and cache-read tokens of the first request, from the API usage, for a fixed one-line prompt.
The bound SHALL be set from a measure after the cuts, plus 5% headroom.

#### Scenario: Budget check

- **WHEN** the budget check runs a headless session with the snippet applied and a fixed one-line prompt
- **THEN** the sum of the usage fields of the first request is at or below the bound

#### Scenario: Over budget

- **WHEN** the sum is above the bound
- **THEN** the check fails and shows the sum, the bound, and the difference

### Requirement: Deferred tools stay on

dotclaude SHALL NOT turn off deferred tool loading.
It SHALL NOT set `CLAUDE_CODE_SIMPLE`, `CLAUDE_CODE_DISABLE_ATTACHMENTS`, or another key that makes Claude Code send all tool schemas in full.

#### Scenario: Profile keys

- **WHEN** a test reads the snippet and the plugin `settings.json`
- **THEN** they set no key that turns off deferred tools

### Requirement: Prompt mod shapes the prompt

The dotclaude hooks module SHALL shorten or drop system-prompt sections, attachments, and tool descriptions only where no setting gives the same result.
Each rewrite SHALL keep the instructions that the evals show to affect the outcome.

#### Scenario: Section rewrite in the lab

- **WHEN** the hook lab sends a stubbed `prompt.section` or `prompt.attachment` event that the module handles
- **THEN** the module returns the shorter text or a drop, as its test expects

#### Scenario: Unknown section

- **WHEN** the module gets a section or attachment that it does not know
- **THEN** it passes the event on with no change

### Requirement: Sandbox text matches enforcement

The sandbox attachment that the mod sends SHALL state the same limits that the sandbox enforces.
The mod SHALL shorten the text only when the settings set `sandbox.allowUnsandboxedCommands` to a boolean.
When the value is `true`, the short text SHALL keep the rule that a run outside the sandbox needs the approval of the user.

#### Scenario: Escape not possible

- **WHEN** the snippet is applied
- **THEN** the sandbox text says that each command runs in the sandbox and that the user changes the sandbox settings
- **AND** a call with `dangerouslyDisableSandbox` runs in the sandbox

#### Scenario: Escape after an approval

- **WHEN** the settings set `sandbox.allowUnsandboxedCommands` to `true`
- **THEN** the sandbox text says that each command runs in the sandbox
- **AND** it says that a command with `dangerouslyDisableSandbox` runs only after the user approves it

#### Scenario: No escape setting

- **WHEN** the settings do not set `sandbox.allowUnsandboxedCommands`
- **THEN** the sandbox text of Claude Code passes on unchanged

### Requirement: Human stays in the loop

The prompt that dotclaude sends SHALL keep the instructions that make Claude ask the user before an action that is hard to undo or that other people see.
No rewrite SHALL tell Claude to get around a permission rule, a hook, or the sandbox.

#### Scenario: Eval for a risky action

- **WHEN** the eval suite runs a case with a destructive step and a user that declines
- **THEN** the dotclaude arm has a policy-violation rate at or below the vanilla arm

### Requirement: Output style size

The output style SHALL be at or below `STYLE_MAX_BYTES` in `lib/budget.mjs`, because setup and tests both read it.
The output style holds only the role, the tone, and the format of the reply, and the shared rules are in `features/prompt/shared.mjs`.
A change that makes it shorter SHALL NOT lower the resolve rate or raise the policy-violation or over-claim rate in the eval suite, beyond the noise bound of the suite.

#### Scenario: Shorter style

- **WHEN** a change makes the output style shorter
- **THEN** the paired eval report shows no loss beyond the noise bound

### Requirement: First request captured

A documented capture route SHALL record the first request body of a session, such as a local logging proxy that Claude Code reaches through `ANTHROPIC_BASE_URL`.
The capture SHALL split the request into system blocks, tool schemas, and messages, and SHALL explain the tokens that `/context` does not show.
The capture run SHALL keep tool search on.

#### Scenario: Parts add up

- **WHEN** the capture of a session with the snippet applied finishes
- **THEN** the sizes of its parts add up to the billed first-request tokens within 3%

### Requirement: Same start on every surface

The settings snippet SHALL apply in the terminal, the desktop app, and the IDE.
A start of 30K tokens or more that comes from a surface that does not read the settings SHALL be reproduced, explained, and fixed or documented.

#### Scenario: Surface compare

- **WHEN** a session starts in each surface with the same project and the snippet
- **THEN** the start tokens of each surface are within 3% of the terminal start

### Requirement: Tool descriptions cut by id

The mod SHALL shorten the description of a tool only through `tool.describe`, by exact tool name, and only where the shorter text keeps the behavior in the eval suite.
The mod MAY set `isDeferred` to `true` only for a tool that task 2.19 shows the engine defers with a token saving, and SHALL NOT set it to `false`.

#### Scenario: Deferral

- **WHEN** the mod gets a tool that the 2.19 result lists as deferrable
- **THEN** it sets `isDeferred` to `true`, and a tool outside that list keeps its state

#### Scenario: Unknown tool

- **WHEN** the mod gets a tool name that it does not know
- **THEN** it passes the event on with no change
