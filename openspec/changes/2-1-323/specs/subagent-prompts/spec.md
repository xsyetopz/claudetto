## ADDED Requirements

### Requirement: Each Agent File Sets Its Model, Effort, Tools, and Turns

Each of the four agents `Artemis`, `Metis`, `Athena`, and `Heracles` SHALL set `model`, `effort`, `tools`, and `maxTurns` in its frontmatter, and no agent SHALL set a Fable or Opus model. Each Haiku agent SHALL set `autoCompactWindow: 100000`, because Haiku 5.5 bills a prompt over 100,000 tokens at five times the input rate. The choices SHALL count as a hypothesis until a paid A/B run measures them, and that run SHALL wait for the user's approval.

#### Scenario: The Search Agent

- **WHEN** a reader reads the frontmatter of `agents/Artemis.md`
- **THEN** it holds `model: claude-haiku-5-5`, `effort: high`, `autoCompactWindow: 100000`, `tools: Read, Grep, Glob`, and a `maxTurns` value

#### Scenario: Plan and Sweep

- **WHEN** a reader reads the frontmatter of `agents/Metis.md` and `agents/Athena.md`
- **THEN** each holds `model: claude-sonnet-5-5`, `effort: medium`, `tools: Read, Grep, Glob`, and a `maxTurns` value

#### Scenario: The Work Agent

- **WHEN** a reader reads the frontmatter of `agents/Heracles.md`
- **THEN** it holds `model: claude-sonnet-5-5`, `effort: medium`, a `maxTurns` value, and a `tools` value that grants every tool

#### Scenario: No Fable or Opus Subagent

- **WHEN** a reader searches `plugins/claudetto/agents/` for `fable`, `mythos`, and `opus`
- **THEN** no frontmatter holds any of them

### Requirement: Each Agent Body Is Its Whole Prompt

Each agent body SHALL be the agent's whole prompt, written to the guidance of the agent's model, because a plugin agent's body replaces the default subagent text and `prompt.compose` does not reach a subagent. The engine's appended notes, about 1,294 bytes, SHALL be the only other system text the subagent gets.

#### Scenario: A Subagent Request

- **WHEN** the main loop starts `claudetto:Artemis`
- **THEN** the subagent's `system[2]` is the `Artemis` body followed by the engine's notes, with no text of a per-model main-loop body

### Requirement: The Bodies Follow Sonnet and Haiku Guidance

The `Metis`, `Athena`, and `Heracles` bodies SHALL follow the Sonnet 5.5 guidance, with a finish line, a scope line, and no reviewer subagents started unasked. The `Artemis` body SHALL follow the Haiku 5.5 guidance and stay short, because Haiku stops early on a long prompt. Each limit SHALL carry its scope and reason, and no body SHALL hold an ownership line.

#### Scenario: Reading the Search Body

- **WHEN** a reader reads `agents/Artemis.md`
- **THEN** it holds a finish line and no ownership line, and its body is shorter than the `Metis` body

#### Scenario: Reading the Sweep Body

- **WHEN** a reader reads `agents/Athena.md`
- **THEN** it holds a finish line, a scope line, and no ownership line

### Requirement: Built-in Agents Are Off Through Settings

Setup SHALL turn the built-in agents off with `env.CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` and a `permissions.deny` entry `Agent(<name>)` for each other built-in agent. Setup SHALL cap spawning with `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` and `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` in `env`.

#### Scenario: Setup Writes the Keys

- **WHEN** setup writes to an empty settings file
- **THEN** `env` holds `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS` as `1` and the two spawn caps, and `permissions.deny` holds an `Agent(<name>)` entry for each other built-in agent

### Requirement: Claudetto Denies No Agent Call by Its Type

Claudetto SHALL hold no `tool.call` or `tool.check` hook that denies an `Agent` call for its `subagent_type` or for running in the foreground. Which agents can run SHALL be decided by the settings that turn built-in agents off.

#### Scenario: A Fork Call

- **WHEN** the model calls `Agent` with a type that is not of the `claudetto:` form
- **THEN** no claudetto hook denies the call, and Claude Code decides it from the settings

### Requirement: A Memory Hold Denial Says When to Retry

The memory hold SHALL stay a mod, and its `agent.spawn` denial under memory pressure SHALL tell the model when to retry the spawn.

#### Scenario: Spawn under Memory Pressure

- **WHEN** free memory is short and the model starts a subagent
- **THEN** the spawn is denied, and the denial text holds a retry hint

### Requirement: The Agent File Decides the Subagent Model

An `agent.spawn` mod SHALL drop `model` from each spawn event, because a lead's `Agent` call that passes `model` wins over the agent file and put four `Heracles` agents on Opus (`research/defects.md` D10.28). The root prompt SHALL name no model for a subagent.

#### Scenario: A Lead Asks for Opus

- **WHEN** the main loop calls `Agent` for `claudetto:Heracles` with `model: "opus"`
- **THEN** the subagent request goes to `claude-sonnet-5-5`, the model `agents/Heracles.md` sets

## MODIFIED Requirements

### Requirement: No Rule Lost in the Restructure

Each line of the earlier agent bodies SHALL be kept, rewritten, or dropped as `research/text-audit.md` of change `2-1-323` records, with the reason for each verdict. The frontmatter SHALL hold `name`, `description`, `model`, `effort`, `tools`, and `maxTurns`; no agent sets `omitClaudeMd`.

#### Scenario: Rule Kept

- **WHEN** a reviewer compares each line of an earlier body with the new body
- **THEN** each line has a counterpart, or the text audit records it as rewritten or dropped with its reason

### Requirement: The Root Delegates a Slice by Its Measured Cost

The root SHALL keep a slice that would add less to its context than a subagent's cold start costs, and SHALL delegate a slice that would add more, to the agent whose model fits the slice. The cut-off values SHALL come from measured runs, not from this text.

#### Scenario: A Small Lookup

- **WHEN** a slice is one file read or fewer than about 5 requests
- **THEN** the root does it itself, because a fresh `Artemis` writes about 5k and a fresh `Heracles` about 11k tokens before any work (observed, 6 runs, 2026-11-09)

#### Scenario: A Wide Search or a Specified Edit

- **WHEN** a slice would add more than about 25k tokens of reads to the root, or has a clear spec and a check command
- **THEN** it goes to `Artemis` for the search or `Heracles` for the edit, at the model each agent file sets

#### Scenario: Design or a Cross-Cutting Edit

- **WHEN** a slice needs judgment across files, or no check command can show it is done
- **THEN** the root keeps it

### Requirement: The Report Format Is One Block

Each subagent body SHALL state its report format in its last paragraph as plain prose, with no tag. `Artemis` ends with one `path:line` and a short excerpt per finding. `Metis` returns steps, files, risks, and the check command. `Athena` reports each defect as `path:line`, what is wrong, and why. `Heracles` ends with what it did, what it checked and the result, and what is left, and marks each defect it reports reproduced, with the command and output, or read, with its `file:line`.

#### Scenario: Report Tags

- **WHEN** a subagent finishes a task
- **THEN** its final message follows the last paragraph of its body, and holds no tag

### Requirement: Subagents Try Another Route before Reporting a Block

Each subagent body SHALL tell the agent to carry the task out with its own tools and files: `Heracles` "decide, do, and check on your own" (`agents/Heracles.md:8`). A need outside its tools, such as a file to write or a command to run for a read-only agent, SHALL be reported with the command named (`agents/Artemis.md:14`). `Metis` SHALL name what it could not find instead of guessing (`agents/Metis.md:13`).

#### Scenario: Check Fails after an Edit

- **WHEN** the check of a `Heracles` task fails on a defect in the task's files
- **THEN** `Heracles` finds the cause, fixes it, reruns the check, and reports what it checked and the result

#### Scenario: Permission Denied

- **WHEN** an `Artemis` task needs a file written or a command run, which its tools lack
- **THEN** `Artemis` says so and names the command, and runs none

#### Scenario: Heracles Block Lines

- **WHEN** `Heracles.md` is read
- **THEN** it holds "decide, do, and check on your own"

## REMOVED Requirements

### Requirement: No Subagent Type Runs the Root Prompt

**Reason**: `ROOT_PROMPT` is gone. The main loop gets a per-model body through `prompt.compose`, which does not reach a subagent, and each agent body is its whole prompt.
**Migration**: See "Each Agent Body Is Its Whole Prompt" in this capability and the `model-prompts` capability.

### Requirement: A Delegated Edit Is Checked When It Returns

**Reason**: The rule lived in `ROOT_PROMPT`, which is gone. The Opus 5.5 body holds no verification line and the Haiku 5.5 body no delegation line, so no main-loop body carries it.
**Migration**: The `Heracles` agent's report names what it checked and the result, as "The Report Format Is One Block" requires.
