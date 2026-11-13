## ADDED Requirements

### Requirement: One Prompt-Type Stop Hook Grades the Reply

One prompt-type Stop hook SHALL carry the fault list that `texts-grade.ts` held, and SHALL make one model call per stop. No mod SHALL grade the reply, and no second model SHALL vote on it.

#### Scenario: A Fault in the Reply

- **WHEN** the final reply holds a fault from the list, such as a statement about the code with no read of the workspace in the turn
- **THEN** the prompt-type hook blocks the stop with that fault's fix

#### Scenario: A Clean Reply

- **WHEN** the final reply holds no fault from the list
- **THEN** the stop passes after one model call

### Requirement: The What I Need Form Is Checked at Stop

A classic Stop command hook SHALL check only the `## What I Need From You` section of `last_assistant_message`. The section SHALL hold at most one item: one `- ! <command>` bullet with no checkbox, or one fenced `sh` block for a separate terminal. A broken form SHALL block the stop with each line that breaks it, never with a text identical to an earlier block in the session. A `userConfig` switch MUST turn the check off.

#### Scenario: One Command

- **WHEN** the reply lists one `- ! <command>` bullet under `## What I Need From You`
- **THEN** the stop passes

#### Scenario: Prose That Mentions the Form

- **WHEN** the reply's prose outside the section names a `` `! <command>` `` line
- **THEN** the stop passes, because the hook reads only the section's Markdown list items and fenced blocks and matches no pattern over prose

#### Scenario: A Command for a Separate Terminal

- **WHEN** the section holds one fenced `sh` block with `GH_TOKEN=$(gh auth token) claude --continue`, and the reply's prose mentions a `` `! <command>` `` line
- **THEN** the stop passes, because `!` would run the command in the session's own shell, where it cannot start a new Claude Code process with new environment (versionlens `6eb2e7bc`, 2026-11-10)

#### Scenario: A Paid Run That Waits for the User

- **WHEN** the section names a paid run as one `- ! <command>` bullet to approve it
- **THEN** the stop passes

#### Scenario: A Command in a Checkbox

- **WHEN** the reply lists `- [ ] ! gh auth login` under `## What I Need From You`
- **THEN** the stop is blocked, and the block lists the line and says to move it into a `- ! <command>` bullet with no checkbox, because nobody ticks a checkbox in a reply (the person, 2026-11-09)

#### Scenario: Two Commands at Once

- **WHEN** the reply lists two `- ! <command>` bullets under `## What I Need From You`
- **THEN** the stop is blocked once, the block names both commands, and it tells the model to keep the one the work needs first and to ask for the next after the person has run it, because the person's `!` runs and messages queue while the agent works (the person, 2026-11-09)

#### Scenario: Text Outside the Section

- **WHEN** the reply holds `- [ ]` items, offers in prose, or plain bullets outside `## What I Need From You`
- **THEN** this check passes, because it reads only the What I Need form

#### Scenario: The Same Block Again

- **WHEN** the reply breaks the form, and the block it would give is identical to the block the hook gave before in the session
- **THEN** the stop passes, so one bullet cannot be asked for again and again

#### Scenario: The Second Stop

- **WHEN** the model answers the block and stops again with `stop_hook_active` set
- **THEN** the stop passes

#### Scenario: Switched Off

- **WHEN** the user turns the switch off in `userConfig`
- **THEN** no reply is read at Stop and no stop is blocked by this check

## MODIFIED Requirements

### Requirement: A Machine Short of Memory Holds New Work

Before each `Bash` or `Monitor` call and each subagent start, the system SHALL read the machine's free memory share, and below `memoryFreeMinPercent` (a `userConfig` option, default 20, 0 off) SHALL deny the call with a reason that names the free share and the five largest processes and tells the agent to stop its own runs and wait. A subagent denial SHALL add a hint to retry the start later. A read-only or `kill` command, or an unreadable share, SHALL pass.

#### Scenario: Low Memory

- **WHEN** the free share is below the limit and a `Bash` call runs `bunx oxlint src/a.ts`
- **THEN** the call is denied, and the reason names the share and the largest processes

#### Scenario: Low Memory, a Kill

- **WHEN** the free share is below the limit and a `Bash` call runs `kill 4242` or `ps -ax`
- **THEN** the call goes on

#### Scenario: Low Memory, a Subagent

- **WHEN** the free share is below the limit and a subagent starts
- **THEN** the start is denied with the same reason and a hint to retry the start once memory has freed

#### Scenario: Enough Memory, or the Limit Off

- **WHEN** the free share is at or above the limit, or `memoryFreeMinPercent` is 0, or the platform gives no share
- **THEN** the call goes on

## REMOVED Requirements

### Requirement: Open Items at Stop

**Reason**: The check of every `- [ ]` item, its ask-tool excuse, and its headless and nested-hook cases go with the mod; the classic Stop hook checks only the What I Need form.

**Migration**: The classic Stop command hook of "The What I Need Form Is Checked at Stop".

### Requirement: Background Tasks at Stop

**Reason**: The Stop block for background tasks is deleted with `cleanup.ts`, because it blocked turns over tasks the session already lists.

**Migration**: The agent stops its own tasks with `TaskStop`, and `/goal` covers continuation.

### Requirement: A Stop Loop with No Progress Ends the Turn

**Reason**: The stall stop existed only because the grader and the slice check could block again and again; both go, so `stallStop` in `stop.ts` is deleted. It also turned a `/goal` block into `preventContinuation`, which paused the goal 8 times in 6 sessions.

**Migration**: `/goal` covers continuation, and the person ends a goal with `/goal clear`.

### Requirement: Named Files Exist

**Reason**: `named-files.ts` ran `$.fs.exists` on words that are no path and fed the path spam, so it is deleted.

**Migration**: None is needed. The prompt-type Stop hook of "One Prompt-Type Stop Hook Grades the Reply" reads the reply.

### Requirement: Uncommitted Session Changes Block the Stop Once

**Reason**: `useSliceCommits` hashed every path in `git status`, agent worktrees included, and blocked up to 44 times in a row, so it is deleted.

**Migration**: The commit rule stays as a line in the prompt.

### Requirement: Only a Write That Ran Is the Agent's

**Reason**: The slice tracker is deleted with `useSliceCommits`.

**Migration**: The commit rule stays as a line in the prompt.

### Requirement: Other Edits Are Committed Under Their Source

**Reason**: The Stop text for other edits is deleted with `useSliceCommits`.

**Migration**: The commit rule stays as a line in the prompt.

### Requirement: A Headless Session Is Not Asked to Commit

**Reason**: The uncommitted-changes block is deleted with `useSliceCommits`.

**Migration**: The commit rule stays as a line in the prompt.

### Requirement: A Closing Stop Waits for or Removes the Session's Leftovers

**Reason**: The cleanup Stop blocks in `cleanup.ts` are deleted.

**Migration**: The agent stops its own tasks with `TaskStop`, and the hygiene sweep that the classic `SessionStart` hook runs removes stale agent worktrees.

### Requirement: A Closing Stop Removes the Session's Leftovers

**Reason**: The cleanup Stop blocks in `cleanup.ts` are deleted.

**Migration**: The hygiene sweep that the classic `SessionStart` hook runs removes stale agent worktrees and merged branches.

### Requirement: A Subagent Removes Only Its Own Leftovers

**Reason**: No Stop hook removes leftovers any more, because the cleanup Stop blocks are deleted.

**Migration**: The hygiene sweep that the classic `SessionStart` hook runs.

### Requirement: A Word the Engine Refuses Names No Missing File

**Reason**: The named-file check is deleted.

**Migration**: None is needed.

### Requirement: A Task Item That Quotes a Command Step Is No Command for the Person

**Reason**: The Stop check of commands outside a `- ! <command>` bullet is deleted, because the open-items hook checks only the What I Need form.

**Migration**: The classic Stop command hook of "The What I Need Form Is Checked at Stop".

### Requirement: A Numbered Task Line Is No Question

**Reason**: The Stop check of questions typed as checklist items is deleted, because the open-items hook checks only the What I Need form.

**Migration**: The classic Stop command hook of "The What I Need Form Is Checked at Stop".

### Requirement: Refuse Repeated Failures

**Reason**: The refusal lived in `useMemoryHold/admit.ts`, and its text appears in no session transcript under `~/.claude/projects`, so it never fired.

**Migration**: None; a failed call may be retried as Claude Code allows.

### Requirement: A Subagent's Worktree Is No Slice of the Session

**Reason**: The uncommitted-changes check is deleted with `useSliceCommits`.

**Migration**: The commit rule stays as a line in the prompt.
