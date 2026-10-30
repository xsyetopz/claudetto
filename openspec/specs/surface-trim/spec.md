# surface-trim Specification

## Purpose
Claudetto runs in the CLI and the TUI only. Every surface that serves claude.ai, the web app, mobile, the cloud, or onboarding is turned off as far as Claude Code allows, and the request that each session sends is golfed down to the fewest characters that still finish the task.

## Requirements

### Requirement: The Golf Score Is Measured, Not Claimed

The system SHALL score itself by the characters of the first request of a session, split into `system`, `tools`, and `messages`, read from the request body captured by a local fake Messages API. The reading SHALL use no model call.

#### Scenario: A Change Claims a Saving

- **WHEN** a change claims that it shrinks the harness
- **THEN** the report holds the score before and after, each from a captured request body, and names the settings of each run

#### Scenario: A Change Raises the Score

- **WHEN** a change raises the score
- **THEN** it states the capability that the extra characters buy, and the user decides

### Requirement: A Shorter Score Is Not a Win on Its Own

A cut SHALL count as a saving only when billed cost per finished task does not rise. One study removed 38.4% of delivered tool-output tokens and raised billed cost by 6.8%, with a Pearson r of 0.15 between token and cost reduction (arXiv 2607.12161).

#### Scenario: Score Falls and Cost Rises

- **WHEN** a trim lowers the character score and the measured billed cost per task rises
- **THEN** the trim is reverted and the reading is recorded against it

### Requirement: No Non-CLI Surface in the Request

The system SHALL turn off each surface that serves claude.ai, the web app, mobile, the cloud, or onboarding, by a settings key, an environment variable, or a `permissions.deny` entry for the tool name. A reading of the request on the real login SHALL list every tool the request carries.

#### Scenario: A Non-CLI Tool Is in the Request

- **WHEN** the reading shows a tool that serves a non-CLI surface
- **THEN** setup denies it by name, or `docs/surfaces.md` carries a line saying why it stays

#### Scenario: Workflow

- **WHEN** a session starts under claudetto
- **THEN** the request carries no `Workflow` definition, because the project uses worktrees and the tool serves Dynamic Workflows

### Requirement: A Deny Removes the Definition

The system SHALL use `permissions.deny` of a tool name as a size lever, not only as a gate. Measured on 2026-10-27 against the installed `2.1.311`: denying `Workflow`, `ScheduleWakeup`, and `ReportFindings` took the first request from 42,676 to 30,510 characters with the same `system` and the same `messages`, so the whole 12,166-character difference was the three definitions. That pair is the reading of `2.1.311` and stays as it was taken; the same pair on `2.1.312` is 42,879 and 30,713, which is what `BASELINE_TOTAL` and the `deny list` row of `plugins/claudetto/src/deny.ts` carry and what `just inventory` reads back, so the live figures are there and not here.

#### Scenario: Denied Tool

- **WHEN** a tool name is in `permissions.deny`
- **THEN** the captured request holds no definition for that name

#### Scenario: Deny of an Absent Tool

- **WHEN** a name is denied that the request does not carry
- **THEN** the score does not change, and the entry is dropped unless a reading on the real login shows the tool

### Requirement: No Deny for a Tool Whose Removal Raises the Request

The system MUST NOT add a `permissions.deny` entry for a tool whose removal was measured to raise the request. Measured in tokens on 2026-10-27 (`docs/surfaces.md`): removing `ToolSearch` costs `+15,898`, removing `Skill` costs `+5,599`, and removing `Bash` costs `+384`.

#### Scenario: Deny of `ToolSearch`

- **WHEN** a change adds `ToolSearch` to `permissions.deny`
- **THEN** the setup test fails and names the measured `+15,898` tokens

### Requirement: Every Key Is Verified and Every Combination Is Read

A key SHALL be written by setup only when it exists in the installed version, with its module and offset recorded, and only when a reading shows what it changes. A key SHALL be read in the combination that ships, not alone.

#### Scenario: A Lever That Costs

- **WHEN** a key lowers one part of the request and raises another
- **THEN** the row records both, and the key ships only in the combination that is a net cut. Measured example: `disableBundledSkills: true` alone raised the first request from 42,676 to 54,055 characters, because `Workflow` grew from 5,355 to 22,310 while `messages` fell from 8,095 to 2,519. With `Workflow` removed the pair gives 24,934.

#### Scenario: Two Keys with the Same Effect

- **WHEN** two keys produce byte-identical requests, as `enableWorkflows: false` and `disableWorkflows: true` did at 37,066 characters
- **THEN** setup writes one of them, and the row says what the other adds outside the request, or that nothing was found

### Requirement: A Trim Never Breaks Claudetto or the User's CLI

The system MUST NOT write a key that stops its own hooks, skills, or sideloaded plugin directory, and MUST NOT write a key that removes a command the user needs to run the CLI.

#### Scenario: Self-Disabling Key

- **WHEN** a candidate key is `disableAllHooks`, `disableSkillShellExecution`, `disableSideloadFlags`, or `disableCommandPluginSources`
- **THEN** setup does not write it, and `docs/surfaces.md` carries the reason

#### Scenario: Login and Update Commands

- **WHEN** a candidate key removes `/login`, `/logout`, `/doctor`, or the updater
- **THEN** setup does not write it, because the user needs it to run the CLI

### Requirement: Density Is Allowed, Ambiguity Is Not

Prompt and config text MAY be dense and terse to lower the score. It MUST stay unambiguous to a model reading it cold, and the reading that shows a task still finishes SHALL accompany each cut.

#### Scenario: A Cut That Changes Behavior

- **WHEN** a shortened prompt piece changes what a model does on the task set
- **THEN** the cut is reverted, and the task set run is recorded in the doc

### Requirement: A Tool Text Ships Only While It Beats the Stock Text

The `tool.describe` hook keeps the shorter of our text and the engine's, so a text that is not shorter never reaches a request. A check SHALL hold the stock length of each overridden tool, from the `clawdipedia` route `prompts/tools`, and SHALL fail for a text that does not beat it. Such a text SHALL be shortened or dropped, and the always-loaded total SHALL count no text that no request carries.

#### Scenario: Text Not Shorter Than the Stock Text

- **WHEN** a text of `TOOL_TEXTS` is as long as the stock description of that tool
- **THEN** the check fails, and the text is shortened or dropped with its registration

#### Scenario: Stub Longer Than Every Stock Text

- **WHEN** a check compares a text against a stub that is longer than every stock description
- **THEN** that check is no evidence that the text reaches a request

#### Scenario: Tool That the Engine Defers

- **WHEN** the engine leaves a tool off the base prompt by default
- **THEN** its text is conditional, and the always-loaded total excludes it
