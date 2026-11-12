## ADDED Requirements

### Requirement: A Machine Short of Memory Holds New Work

Before each `Bash` or `Monitor` call and each subagent start, the system SHALL read the machine's free memory share, and below `memoryFreeMinPercent` (a `userConfig` option, default 20, 0 off) SHALL deny the call with a reason that names the free share and the five largest processes by pid and size and tells the agent to stop its own runs and wait. A command that is read-only, or whose every program is `kill`, SHALL pass. Where the share cannot be read, the call SHALL pass.

#### Scenario: Low Memory

- **WHEN** the free share is below the limit and a `Bash` call runs `bunx oxlint src/a.ts`
- **THEN** the call is denied, and the reason names the share and the largest processes

#### Scenario: Low Memory, a Kill

- **WHEN** the free share is below the limit and a `Bash` call runs `kill 4242` or `ps -ax`
- **THEN** the call goes on

#### Scenario: Low Memory, a Subagent

- **WHEN** the free share is below the limit and a subagent starts
- **THEN** the start is denied with the same reason

#### Scenario: Enough Memory, or the Limit Off

- **WHEN** the free share is at or above the limit, or `memoryFreeMinPercent` is 0, or the platform gives no share
- **THEN** the call goes on

### Requirement: A Word the Engine Refuses Names No Missing File

When the engine refuses to read an operand of a `! <command>` step as a path, the named-file check SHALL leave that operand out and SHALL still check the step's other paths, because a check that throws loses every check of that stop.

#### Scenario: A Search Pattern in a Step

- **WHEN** a reply holds `! grep -v "/\.git/" /tmp/list.txt` and `/tmp/list.txt` does not exist
- **THEN** the stop is blocked for `/tmp/list.txt`, and the block does not name the pattern
- **AND** the lab test is `named-files.test.ts`, "a search pattern the engine refuses to read as a path is not called missing"

## MODIFIED Requirements

### Requirement: End Stuck Agents

A subagent SHALL run no longer than `agentMaxMinutes` (default 15, 0 off) from its `agent.spawn`. Past the limit, the `tool.check` hook SHALL deny each tool call the subagent makes, with a reason that tells it to end, report what is done and what is left, and names the setting. The hook API offers no call that ends a subagent (`$.agent` holds `spawn`, `list`, and `register`; `$.turn.abort` ends only the main loop's turn), so a refused call ends one.

#### Scenario: Source of the Default

- **WHEN** the default is set
- **THEN** it rests on 36 delegated runs across three projects on 2026-11-10: median 313 seconds, 75th percentile 676, 90th 1385, longest 1592, with 6 past 15 minutes, and on the person calling a 28-minute run too long to help

#### Scenario: Overtime Subagent

- **WHEN** a subagent calls a tool past `agentMaxMinutes`
- **THEN** the call is denied, and a main-loop call at the same time still goes
- **AND** the lab tests are `limits/hold.test.ts`, "a subagent's call past agentMaxMinutes is refused, and the main loop's still goes", "with no option a subagent runs 15 minutes", and "agentMaxMinutes 0 turns the time limit off"

### Requirement: A Closing Stop Removes the Session's Leftovers

At each stop of the lead, the system SHALL remove the agent worktrees that nothing needs, as `session-hygiene` defines them. When no task of the agent runs, it SHALL also remove the worktrees and branches the agent created, with plain `git worktree remove` and `git branch -d`, so what holds work stays. It SHALL block once to name what stays of what the agent or a worker it started made, unless the reply names each. A stop SHALL NOT name another session's agent worktree; the hygiene report does.

#### Scenario: A Dirty Worktree

- **WHEN** a worktree the agent added holds uncommitted changes and its branch has an unmerged commit
- **THEN** both stay and the Stop names them
- **AND** the lab test is `cleanup.test.ts`, "an integrated worker worktree and a merged branch go; a dirty worktree, an unmerged branch, and a worker worktree with new commits stay and the stop names them"

#### Scenario: Another Session's Worker

- **WHEN** an unlocked agent worktree holds a commit the lead's branch lacks and no `Agent` call of this session started its worker
- **THEN** the worktree stays and the Stop passes without naming it
- **AND** the lab test is `cleanup.test.ts`, "a worker worktree with new commits that this session did not start stays and the stop does not name it"

#### Scenario: Workers Still Run

- **WHEN** the lead stops while a background worker runs and another worker's unlocked worktree holds only commits the lead's branch has
- **THEN** that worktree and its branch are removed, and the Stop names nothing
- **AND** the lab test is `cleanup.test.ts`, "an integrated worker worktree goes while another worker still runs"

## REMOVED Requirements

### Requirement: Test and Build Output Is Cut to Its Head and Tail

**Reason**: The person approved the removal of the output files and their writer. Claude Code cuts a Bash result at `bashOutputMaxChars` and saves the rest to its own file, which P191 measured.

**Migration**: Setup writes `bashOutputMaxChars` (requirement "Output Limits Are Written" of `setup`).

### Requirement: The Whole Cut Output Is Saved

**Reason**: Claude Code saves a Bash result past the limit to a file of its own, so the plugin's copy under `.claude/claudetto/output/` duplicated it (P191).

**Migration**: Read the path that the preview names.

### Requirement: Some Output Stays Whole

**Reason**: The plugin cuts no output, so no output needs an exception.

**Migration**: A Bash result under `bashOutputMaxChars` reaches the model whole.
