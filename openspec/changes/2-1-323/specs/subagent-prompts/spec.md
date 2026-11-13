## ADDED Requirements

### Requirement: Each Agent File Sets Its Model, Effort, Tools, and Turns

Each of the four agents `search`, `plan`, `sweep`, and `work` SHALL set `model`, `effort`, `tools`, and `maxTurns` in its frontmatter, and no agent SHALL set a Fable or Opus model. Each Haiku agent SHALL set `autoCompactWindow: 100000`, because Haiku 5.5 bills a prompt over 100,000 tokens at five times the input rate. The choices SHALL count as a hypothesis until a paid A/B run measures them, and that run SHALL wait for the user's approval.

#### Scenario: The Search Agent

- **WHEN** a reader reads the frontmatter of `agents/search.md`
- **THEN** it holds `model: claude-haiku-5-5`, `effort: high`, `autoCompactWindow: 100000`, `tools: Read, Grep, Glob`, and a `maxTurns` value

#### Scenario: Plan and Sweep

- **WHEN** a reader reads the frontmatter of `agents/plan.md` and `agents/sweep.md`
- **THEN** each holds `model: claude-sonnet-5-5`, `effort: medium`, `tools: Read, Grep, Glob`, and a `maxTurns` value

#### Scenario: The Work Agent

- **WHEN** a reader reads the frontmatter of `agents/work.md`
- **THEN** it holds `model: claude-sonnet-5-5`, `effort: medium`, a `maxTurns` value, and a `tools` value that grants every tool

#### Scenario: No Fable or Opus Subagent

- **WHEN** a reader searches `plugins/claudetto/agents/` for `fable`, `mythos`, and `opus`
- **THEN** no frontmatter holds any of them, and Fable and Mythos run only through the opt-in `advisor` tool

### Requirement: Each Agent Body Is Its Whole Prompt

Each agent body SHALL be the agent's whole prompt, written to the guidance of the agent's model, because a plugin agent's body replaces the default subagent text and `prompt.compose` does not reach a subagent. The engine's appended notes, about 1,294 bytes, SHALL be the only other system text the subagent gets.

#### Scenario: A Subagent Request

- **WHEN** the main loop starts `claudetto:search`
- **THEN** the subagent's `system[2]` is the `search` body followed by the engine's notes, with no text of a per-model main-loop body

### Requirement: The Bodies Follow Sonnet and Haiku Guidance

The `plan`, `sweep`, and `work` bodies SHALL follow the Sonnet 5.5 guidance, with a finish line, a scope line, and no reviewer subagents started unasked. The `search` body SHALL follow the Haiku 5.5 guidance and stay short, because Haiku stops early on a long prompt. Each limit SHALL carry its scope and reason, and no body SHALL hold an ownership line.

#### Scenario: Reading the Search Body

- **WHEN** a reader reads `agents/search.md`
- **THEN** it holds a finish line and no ownership line, and its body is shorter than the `plan` body

#### Scenario: Reading the Sweep Body

- **WHEN** a reader reads `agents/sweep.md`
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
- **THEN** the root does it itself, because a fresh `search` writes about 5k and a fresh `work` about 11k tokens before any work (observed, 6 runs, 2026-11-09)

#### Scenario: A Wide Search or a Specified Edit

- **WHEN** a slice would add more than about 25k tokens of reads to the root, or has a clear spec and a check command
- **THEN** it goes to `search` for the search or `work` for the edit, at the model each agent file sets

#### Scenario: Design or a Cross-Cutting Edit

- **WHEN** a slice needs judgment across files, or no check command can show it is done
- **THEN** the root keeps it

## REMOVED Requirements

### Requirement: No Subagent Type Runs the Root Prompt

**Reason**: `ROOT_PROMPT` is gone. The main loop gets a per-model body through `prompt.compose`, which does not reach a subagent, and each agent body is its whole prompt.
**Migration**: See "Each Agent Body Is Its Whole Prompt" in this capability and the `model-prompts` capability.

### Requirement: A Delegated Edit Is Checked When It Returns

**Reason**: The rule lived in `ROOT_PROMPT`, which is gone. The Opus 5.5 body holds no verification line and the Haiku 5.5 body no delegation line, so no main-loop body carries it.
**Migration**: The `work` agent's report names what it checked and the result, as "The Report Format Is One Block" requires.
