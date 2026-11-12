## MODIFIED Requirements

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

### Requirement: Sectioned Subagent Bodies

Each subagent body that claudetto ships SHALL be two plain paragraphs with no XML section: the first says the role, what to do, and the tools to use; the second says what the final message holds. Each rule SHALL say what to do (`agents/search.md:9-11`, `agents/plan.md:9-11`, `agents/work.md:7-9`).

#### Scenario: Body Shape

- **WHEN** the check reads any file in `agents/`
- **THEN** the body is two plain paragraphs, and the check fails and names the file when it holds an XML section tag

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

### Requirement: The Report Format Is One Block

Each subagent body SHALL state its report format in its second paragraph as plain prose, with no tag. `search` ends with one `path:line` and a short excerpt per finding. `plan` returns steps, files, risks, and the check command. `work` ends with what it did, what it checked and the result, and what is left, and marks each defect it reports reproduced, with the command and output, or read, with its `file:line`.

#### Scenario: Report Tags

- **WHEN** a subagent finishes a task
- **THEN** its final message follows the second paragraph of its body, and holds no tag

## ADDED Requirements

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

## REMOVED Requirements

### Requirement: A Delegated Edit Comes Back with Its Check

**Reason**: Its scenarios "A Run Is Logged after 3 Root Turns" and "The Log Decides the Model" rest on `runs.jsonl`, whose writer the run-log removal deletes, and a MODIFIED block cannot drop a scenario.

**Migration**: "A Delegated Edit Is Checked When It Returns" keeps the rule and its other scenarios.

### Requirement: One Place Sets the Subagent Cache TTL

**Reason**: Its scenario "The Log Shows No Long Gaps" rests on `runs.jsonl`, whose writer the run-log removal deletes, and a MODIFIED block cannot drop a scenario.

**Migration**: "The Subagent Cache TTL Has One Setting" keeps the rule and its other scenarios.
