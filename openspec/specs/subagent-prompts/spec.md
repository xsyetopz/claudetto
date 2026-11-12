# subagent-prompts Specification

## Purpose
Each subagent body that claudetto ships uses the sectioned form of the root prompt, keeps every rule of its earlier body, and states its report format in one block the parent can find.

## Requirements

### Requirement: Sectioned Subagent Bodies

Each subagent body that claudetto ships SHALL be two plain paragraphs with no XML section: the first says the role, what to do, and the tools to use; the second says what the final message holds. Each rule SHALL say what to do (`agents/search.md:9-11`, `agents/plan.md:9-11`, `agents/work.md:7-9`).

#### Scenario: Body Shape

- **WHEN** the check reads any file in `agents/`
- **THEN** the body is two plain paragraphs, and the check fails and names the file when it holds an XML section tag

### Requirement: No Rule Lost in the Restructure

The shipped bodies SHALL keep every rule of the `0.2.0` bodies, unless the change log of this change names the rule as dropped and gives the reason. The frontmatter SHALL hold `name`, `description`, and where set `model` and `tools`; no agent sets `effort` or `omitClaudeMd`.

#### Scenario: Rule Kept

- **WHEN** a reviewer compares each `0.2.0` body line with the new body
- **THEN** each line has a counterpart, or appears in the list of dropped rules with its reason

### Requirement: The Report Format Is One Block

Each subagent body SHALL state its report format in its second paragraph as plain prose, with no tag. `search` ends with one `path:line` and a short excerpt per finding. `plan` returns steps, files, risks, and the check command. `work` ends with what it did, what it checked and the result, and what is left, and marks each defect it reports reproduced, with the command and output, or read, with its `file:line`.

#### Scenario: Report Tags

- **WHEN** a subagent finishes a task
- **THEN** its final message follows the second paragraph of its body, and holds no tag

### Requirement: Subagents Try Another Route before Reporting a Block

Each subagent body SHALL tell the agent to carry the task out with its own tools and files and not to ask the parent back: `work` "decides, does, and checks" (`agents/work.md:7`). A need outside its tools, such as a file to write or a command to run for a read-only agent, SHALL be reported with the command named (`agents/search.md:11`). `plan` SHALL name what it could not find instead of guessing (`agents/plan.md:11`).

#### Scenario: Check Fails after an Edit

- **WHEN** the check of a `work` task fails on a defect in the task's files
- **THEN** `work` finds the cause, fixes it, reruns the check, and reports what it checked and the result

#### Scenario: Permission Denied

- **WHEN** a `search` task needs a file written or a command run, which its tools lack
- **THEN** `search` says so and names the command, and runs none

#### Scenario: Heracles Block Lines

- **WHEN** `work.md` is read
- **THEN** it holds "ask nothing back: decide, do, and check"

### Requirement: No Subagent Type Runs the Root Prompt

Claudetto SHALL ship no agent type whose body is the root prompt. The root prompt SHALL reach the main loop through a `prompt.compose` hook, which Claude Code `2.1.317` runs for the main loop only, and SHALL NOT reach a subagent.

#### Scenario: Listing

- **WHEN** a session starts with the shipped settings, or after `/reload-plugins`
- **THEN** the agent listing holds no `claudetto:main` type

#### Scenario: Subagent Request

- **WHEN** the main loop starts any claudetto subagent
- **THEN** the subagent's system body is its agent file and the notes every subagent gets, with no text of the root prompt

### Requirement: The Root Delegates a Slice by Its Measured Cost

The root SHALL keep a slice that would add less to its context than a subagent's cold start costs, and SHALL delegate a slice that would add more, at the model that finishes it. The cut-off values SHALL come from measured runs, not from this text.

#### Scenario: A Small Lookup

- **WHEN** a slice is one file read or fewer than about 5 requests
- **THEN** the root does it itself, because a fresh `search` writes about 5k and a fresh `work` about 11k tokens before any work (observed, 6 runs, 2026-11-09)

#### Scenario: A Wide Search or a Specified Edit

- **WHEN** a slice would add more than about 25k tokens of reads to the root, or has a clear spec and a check command
- **THEN** it goes to `search` for the search or `work` for the edit, at Sonnet

#### Scenario: Design or a Cross-Cutting Edit

- **WHEN** a slice needs judgment across files, or no check command can show it is done
- **THEN** the root keeps it, or passes `model: opus` on the `Agent` call

### Requirement: The Spawn Depth Caps Nesting

A subagent SHALL start no agent of its own, and the cap SHALL be the built-in `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` that setup writes as 1. The plugin SHALL hold no `tool.call` deny and no `AGENT_NESTED` text for it, because the engine drops the `Agent` tool from a subagent at that depth.

#### Scenario: A Subagent at the Depth

- **WHEN** a subagent runs at depth 1
- **THEN** the engine lists no `Agent` tool for it, and `delegation.ts` holds no nested-agent check

### Requirement: A Delegated Edit Is Checked When It Returns

An edit slice SHALL carry the command that checks it, and the root SHALL run that command when the report arrives, before it builds on the work.

#### Scenario: The Check Fails

- **WHEN** a `work` report says done and the check command fails
- **THEN** the root fixes or re-sends the slice with the failure text

#### Scenario: The Root Prompt Carries the Rule

- **WHEN** the root reads its system prompt
- **THEN** it holds "Give an edit task its checking command, and run it when the report arrives, before you build on it." (`hooks/texts.ts`, `ROOT_PROMPT`), because the `Agent` description, capped at 200 characters, holds only the agent names and the worktree rule

### Requirement: The Subagent Cache TTL Has One Setting

The subagent cache TTL SHALL be set only by the `subagentPromptCacheTtl` setting, and no agent file SHALL carry `cacheTtl`. The value SHALL stay `1h`.

#### Scenario: The Agent Files

- **WHEN** `plugins/claudetto/agents/*.md` is read
- **THEN** none holds `cacheTtl`
