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

### Requirement: A Paid Run Ends With the Budget Line

When a `Bash` call runs a model call that bills the account, which is `claude` with `-p` or `--print` or any program given `--paid`, the system SHALL end the call's result with the `Budget:` line, whatever band the last prompt carried, because no prompt follows a paid run in the same turn to carry it. Where the login supplies no reading, the result SHALL stay whole.

#### Scenario: A Paid Run

- **WHEN** a `Bash` call runs `claude -p "grade the cases"` and the engine reports a seven-day share of 41%
- **THEN** the result ends with `Budget: context 62% left, five-hour 23.5% used, seven-day 41% used`
- **AND** the lab test is `budget-run.test.ts`, "a run that calls the model ends with the Budget line, with no prompt between"

#### Scenario: Any Other Command

- **WHEN** a `Bash` call runs `echo claude -p`
- **THEN** the result is unchanged

### Requirement: A Running Command Is Stopped When One of Its Processes Grows Past a Memory Cap

While a `Bash` call runs, the system SHALL read the machine's processes every five seconds and, when a process that began after the call began holds more than `memoryProcessMaxPercent` (default 25, 0 off) of the machine's memory, SHALL stop the largest such process with `kill <pid>`. A process that began before the call SHALL stay, because it is not the call's.

#### Scenario: The Result Names the Stopped Process

- **WHEN** the system stops a process of the call
- **THEN** the call's result ends with a note that names its pid, program, and size and tells the agent to run a narrower part

#### Scenario: A Process Grows Past the Cap

- **WHEN** a `Bash` call runs `bunx oxlint src` and, five seconds in, a process that began with it holds 9 GB of a 32 GB machine
- **THEN** `kill 4242` runs, a larger process that began earlier is left alone, and the result names `4242` and `tsgolint`
- **AND** the lab test is `memory-watch.test.ts`, "a command whose process passes the cap is stopped by its pid, and the result says so"

#### Scenario: Nothing Passes the Cap

- **WHEN** every process of the call is under the cap, or `memoryProcessMaxPercent` is 0
- **THEN** no process is stopped, and with 0 no process list is read

### Requirement: A Task Item That Quotes a Command Step Is No Command for the Person

The Stop check for commands outside a `- ! <command>` bullet SHALL treat a `- [ ]` item as a command for the person only when the item text opens with `! ` or `` `! ``. An item that mentions a `! <command>` step later in its text, such as a task line copied from `tasks.md`, SHALL NOT be listed as a stray command.

#### Scenario: A Copied Task Line

- **WHEN** the reply holds `- [ ] 9.22 no "Budget" line follows a `! ` command` and no other command
- **THEN** the command check does not block the stop

#### Scenario: A Command Item

- **WHEN** the reply holds `- [ ] ! gh auth login`
- **THEN** the stop is blocked and the item is listed, because the item is a command in a checkbox

### Requirement: A Numbered Task Line Is No Question

The Stop check for questions typed as checklist items SHALL leave out a `- [ ]` item whose text opens with a task number such as `9.31`, because a report copies each unticked task of a task list whole and that line asks nothing.

#### Scenario: A Report of Unticked Tasks

- **WHEN** the reply holds `- [ ] 10.21 Run just check and just verify.` and `- [ ] Which region should I use?`
- **THEN** the stop is blocked for the region question only
- **AND** the lab test is `open-items-commands.test.ts`, "a numbered task line copied from a task list is no question, and an unnumbered item still is"

### Requirement: A Subagent's Worktree Is No Slice of the Session

The uncommitted-changes check SHALL leave out a file under `.claude/worktrees/` of the session's working directory, because a subagent wrote it in a worktree that the subagent's own stop commits.

#### Scenario: A Subagent's File

- **WHEN** a subagent edited `.claude/worktrees/agent-1/src/a.ts`, git reports it modified, and the main session's turn ends
- **THEN** the Stop is not blocked for that file

## MODIFIED Requirements

### Requirement: Limits Are Settings

The window, the heavy-call cap, and the fail limits SHALL come from `userConfig`, and the user SHALL be able to override each. The default of the window is the value that `design.md`, "Run Limits", records. The start cap, the depth cap, and the time cap of a subagent are Claude Code's own keys in the `env` block that setup writes, and `userConfig` holds none of them.

#### Scenario: Override

- **WHEN** the user sets a cap in `userConfig`
- **THEN** the system uses it in place of the default

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

### Requirement: Hold Subagent Fan-Out

**Reason**: Claude Code ends a start past `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` itself (3 started in one reply with the key at 1: 1 ran, and the other two got the error "...at once. Do not retry."), and the start cap per period guarded no recorded fault.

**Migration**: Setup writes `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` for a plan that has a 5-hour window. The memory hold keeps its own check on each start.

### Requirement: End Stuck Agents

**Reason**: Claude Code ends a background subagent that shows no progress for `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS` (a hung request ended at 3 s with the key at 3000, and at 25 s without it). The hook counted run time, so it also refused a call of an agent that was making progress, and 43 denials of an agent past 15 minutes are recorded.

**Migration**: Setup writes `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS` as `900000`.

### Requirement: Subagent Starts Stay Under the Environment's Cap

**Reason**: Claude Code enforces `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` itself, with its own error text, so the `agent.spawn` check that read the same key is a copy.

**Migration**: None. The key stays in the `env` block that setup writes.
