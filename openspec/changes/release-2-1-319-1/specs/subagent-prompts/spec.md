## ADDED Requirements

### Requirement: The Root Delegates a Slice by Its Measured Cost

The root SHALL keep a slice that would add less to its context than a subagent's cold start costs, and SHALL delegate a slice that would add more, at the model that finishes it. The cut-off values SHALL come from the logged runs of task 4.2, not from this text.

#### Scenario: A Small Lookup

- **WHEN** a slice is one file read or fewer than about 5 requests
- **THEN** the root does it itself, because a fresh Artemis writes about 5k and a fresh Heracles about 11k tokens before any work (observed, 6 runs, 2026-11-09)

#### Scenario: A Wide Search or a Specified Edit

- **WHEN** a slice would add more than about 25k tokens of reads to the root, or has a clear spec and a check command
- **THEN** it goes to Artemis for search or Heracles for the edit, at Sonnet

#### Scenario: Design or a Cross-Cutting Edit

- **WHEN** a slice needs judgment across files, or no check command can show it is done
- **THEN** the root keeps it, or passes `model: opus` on the `Agent` call

### Requirement: A Delegated Edit Comes Back with Its Check

An edit slice SHALL carry the command that checks it, and the root SHALL run that command when the report arrives, before it builds on the work. Each delegated run SHALL be logged with agent, model, duration, cache hit rate, and whether the root edited the same files within its next 3 turns.

#### Scenario: The Check Fails

- **WHEN** a Heracles report says done and the check command fails
- **THEN** the run is logged as redone, and the root fixes or re-sends the slice with the failure text

#### Scenario: The Log Decides the Model

- **WHEN** 10 or more edit runs are logged and the redo rate at Sonnet for a kind of slice exceeds the cost saved against the root doing it
- **THEN** that kind of slice moves to Opus or to the root

### Requirement: One Place Sets the Subagent Cache TTL

The subagent cache TTL SHALL be set only by the `subagentPromptCacheTtl` setting, and no agent file SHALL carry `cacheTtl`. The value SHALL stay `1h` until the run log shows how often a subagent's requests are more than 5 minutes apart.

#### Scenario: The Agent Files

- **WHEN** `plugins/claudetto/agents/*.md` is read
- **THEN** none holds `cacheTtl`

#### Scenario: The Log Shows No Long Gaps

- **WHEN** the logged runs show fewer than 1 in 7 subagent runs with a gap over 300s between requests
- **THEN** the value moves to `5m`, because the 1h write premium cost about 25% of subagent input on the 2026-11-09 sample and saved no miss there

## MODIFIED Requirements

### Requirement: Sectioned Subagent Bodies

Each subagent body that claudetto ships SHALL be two plain paragraphs with no XML section: the first says the role, what to do, and the tools to use; the second says what the final message holds. Each rule SHALL say what to do (`agents/Artemis.md:9-11`, `agents/Metis.md:9-11`, `agents/Heracles.md:7-9`).

#### Scenario: Body Shape

- **WHEN** the check reads any file in `agents/`
- **THEN** the body is two plain paragraphs, and the check fails and names the file when it holds an XML section tag

### Requirement: No Rule Lost in the Restructure

The shipped bodies SHALL keep every rule of the `0.2.0` bodies, unless the change log of this change names the rule as dropped and gives the reason. The frontmatter SHALL hold `name`, `description`, and where set `model` and `tools`; no agent sets `effort` or `omitClaudeMd`.

#### Scenario: Rule Kept

- **WHEN** a reviewer compares each `0.2.0` body line with the new body
- **THEN** each line has a counterpart, or appears in the list of dropped rules with its reason

### Requirement: The Report Format Is One Block

Each subagent body SHALL state its report format in its second paragraph as plain prose, with no tag. Artemis ends with one `path:line` and a short excerpt per finding. Metis returns steps, files, risks, and the check command. Heracles ends with what it did, what it checked and the result, and what is left, and marks each defect it reports reproduced, with the command and output, or read, with its `file:line`.

#### Scenario: Report Tags

- **WHEN** a subagent finishes a task
- **THEN** its final message follows the second paragraph of its body, and holds no tag

### Requirement: Subagents Try Another Route before Reporting a Block

Each subagent body SHALL tell the agent to carry the task out with its own tools and files and not to ask the parent back: Heracles "decides, does, and checks" (`agents/Heracles.md:7`). A need outside its tools, such as a file to write or a command to run for a read-only agent, SHALL be reported with the command named (`agents/Artemis.md:11`). Metis SHALL name what it could not find instead of guessing (`agents/Metis.md:11`).

#### Scenario: Check Fails after an Edit

- **WHEN** the check of a `Heracles` task fails on a defect in the task's files
- **THEN** `Heracles` finds the cause, fixes it, reruns the check, and reports what it checked and the result

#### Scenario: Permission Denied

- **WHEN** an Artemis task needs a file written or a command run, which its tools lack
- **THEN** Artemis says so and names the command, and runs none

#### Scenario: Heracles Block Lines

- **WHEN** `Heracles.md` is read
- **THEN** it holds "ask nothing back: decide, do, and check"
