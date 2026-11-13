## ADDED Requirements

### Requirement: Setup Writes Claude Code's Own Gates in Place of the Bash Gate

The permission policy SHALL live in the settings that setup writes, and no mod SHALL judge a `Bash` command. Setup SHALL write `permissions.ask` for a branch move, `git worktree remove`, and a branch delete; `permissions.deny` for `pkill` and `killall`; `permissions.allow` for read-only commands; `sandbox.filesystem.denyRead` and `denyWrite` for each wall; and the `autoMode` lists. The read and write advice SHALL stay in the Bash tool text, unenforced.

#### Scenario: A Branch Move

- **WHEN** the agent runs `git reset --hard origin/main` under the written settings
- **THEN** Claude Code asks the person under `Bash(git reset *)`, and no claudetto hook judges the call; `Bash(git update-ref *)` and `Bash(git branch -f *)` ask the same way

#### Scenario: A Worktree Removal

- **WHEN** the agent runs `git worktree remove ../other`
- **THEN** Claude Code asks the person

#### Scenario: A Kill by Pattern

- **WHEN** the agent runs `pkill node` or `killall node`
- **THEN** Claude Code denies the call under `Bash(pkill *)` or `Bash(killall *)`

#### Scenario: A Read-Only Command

- **WHEN** the agent runs `git status`
- **THEN** the call runs with no question

#### Scenario: A Shell Read of a File

- **WHEN** the agent runs `cat src/a.ts`
- **THEN** no claudetto denial meets it, and the Bash tool text is what steers the agent to `Read`

### Requirement: An Absent Path Is an Answer

Each surviving `$.fs.stat` and `$.fs.exists` call SHALL treat ENOENT as the answer "absent" and SHALL log nothing for it. This covers `useSetup/rules.ts`, `namesIn` in `surface.ts`, `claudetto-openspec/hooks/fs.ts`, and the `hygiene/` roots and sweep. Code that resolves a command's words SHALL resolve only the operands that the command takes as paths. A mock that remains SHALL report an absent path as absent.

#### Scenario: A Rule Copy Not Installed

- **WHEN** setup reads the date of a rule copy that does not exist
- **THEN** the copy counts as absent, and no log line is written

#### Scenario: A Missing Commands Folder

- **WHEN** `~/.claude/commands` does not exist at startup
- **THEN** `namesIn` returns no names, and the log holds no "was not listed" line

#### Scenario: A Search Pattern

- **WHEN** a command is `grep -v "/\.git/" list.txt`
- **THEN** the pattern is not resolved as a path, and no "was not resolved" line is logged

#### Scenario: A Mock of the File System

- **WHEN** a test asks a remaining mock about a path that the test did not create
- **THEN** the mock answers that the path is absent

## MODIFIED Requirements

### Requirement: A Switch That Would Touch a Protected Path Stops First

A classic `PreToolUse` command hook on `Bash` SHALL run before `git switch`, `git checkout <ref>`, `git reset --hard`, or `git rebase`. It SHALL compare `HEAD` with the target under each path that the sandbox of Claude Code 2.1.323 denies writes to, and SHALL deny the command with the list of paths when any differ. The list of protected paths SHALL be taken again from 2.1.323, and no mod SHALL carry this check.

#### Scenario: Skills Differ

- **WHEN** `.claude/skills` is under the sandbox's `denyWithinAllow` and `git diff --name-only HEAD main -- .claude/skills` lists 7 files
- **THEN** `git switch main` is denied, the files are named, and `HEAD` does not move

#### Scenario: No Difference

- **WHEN** the protected paths match between `HEAD` and the target
- **THEN** the switch runs

#### Scenario: Another Command

- **WHEN** the `Bash` command is not a switch, checkout of a ref, hard reset, or rebase
- **THEN** the hook allows it to go on, and Claude Code's own gates judge it

## REMOVED Requirements

### Requirement: A Standing Instruction Covers a Later Remark

**Reason**: The work gate that read the person's earlier messages goes with the claudetto gates, and the only code that names a standing instruction, `texts-pin.ts`, goes with the constraint ledger.

**Migration**: None; an edit runs under the `permissions` rules that setup writes, with no reading of earlier messages.

### Requirement: Fail Closed

**Reason**: The `classic.PermissionRequest` handler lived in `tool.check/useBashRules/watch.ts`, which is deleted with the gate.

**Migration**: Claude Code's permission dialog answers each request under the `permissions` rules that setup writes.

### Requirement: Denied Calls Stop

**Reason**: The `classic.PermissionDenied` retry lived in `useBashRules/watch.ts`, which is deleted with the gate.

**Migration**: Claude Code handles a denial itself, under the `permissions.deny` rules and `autoMode` lists that setup writes.

### Requirement: Hard Deny on Parsed Commands

**Reason**: The command parser and the loss and secret rules are deleted with the gate.

**Migration**: Claude Code parses a `Bash` command for its `permissions` rules, and the `autoMode.hard_deny` list that setup writes covers loss and secrets.

### Requirement: A Repeat Denial Counts Only Since the Last User Message

**Reason**: The repeat-denial guard is deleted with the gate.

**Migration**: Claude Code's own denial handling applies, under the `permissions` rules that setup writes.

### Requirement: A Denial with No Reason Is Reported

**Reason**: The repeat-denial refusal is deleted with the gate.

**Migration**: Claude Code's own denial handling applies, under the `autoMode` lists that setup writes.

### Requirement: A Bash Write into a Plugin's Hooks Folder Asks

**Reason**: The hook-write ask is deleted with the gate.

**Migration**: The `sandbox.filesystem.denyWrite` entries and `autoMode` lists that setup writes judge a Bash write.

### Requirement: A Push That Deletes a Branch by Refspec Asks

**Reason**: The push rules are deleted with the gate.

**Migration**: Setup writes `permissions.ask` for a branch delete, and the `autoMode` lists judge a push.

### Requirement: A Branch the Person Named Is Not Denied

**Reason**: The branch gate and its Decider question are deleted with the gate.

**Migration**: Setup writes `permissions.ask` for a branch delete, so the person answers in Claude Code's dialog.

### Requirement: The Read Redirect Parses Only a File Operand

**Reason**: The read redirect denied hundreds of calls in the session audits, and it is deleted with the gate.

**Migration**: The read advice stays in the Bash tool text, and no denial enforces it.

### Requirement: A Walled Path Is Reached by No Tool

**Reason**: `walled.ts` named every word of a command as a path and fed the path spam, and it is deleted with the gate.

**Migration**: Setup writes `sandbox.filesystem.denyRead` and `sandbox.filesystem.denyWrite` for each wall, and `permissions.deny` `Read(<wall>/**)`.

### Requirement: File Tools Are Judged by Their Path Fields for a Wall

**Reason**: The wall check of the file tools is deleted with the gate.

**Migration**: Setup writes `permissions.deny` `Read(<wall>/**)` for each wall, which Claude Code applies to the file tools.

### Requirement: A Walled Path Denial Names the Wall and Hands Off to the Person

**Reason**: The wall denial text is deleted with the gate.

**Migration**: Claude Code's own denial text for the `permissions.deny` and `sandbox.filesystem` entries that setup writes.

### Requirement: A Sibling of a Wall Passes

**Reason**: The wall matcher is deleted with the gate.

**Migration**: Claude Code matches the `sandbox.filesystem` and `permissions.deny` entries that setup writes.

### Requirement: A Wall With No Read Deny Is Reported at Startup

**Reason**: The startup wall notice belonged to the gate, which is deleted.

**Migration**: Setup writes `permissions.deny` `Read(<wall>/**)` and the `sandbox.filesystem` entries for each wall.

### Requirement: A Background Wait With No Limit Is Denied

**Reason**: The wait-loop rule is deleted with the gate.

**Migration**: No setting takes over; the agent stops its own background task with `TaskStop`.

### Requirement: A Monitor Command Is Judged as a Shell Command

**Reason**: The gate that judged a `Monitor` command is deleted.

**Migration**: Claude Code's own permission check and sandbox apply, under the settings that setup writes.

### Requirement: The Session Removes Only What It Made

**Reason**: The worktree ownership gate denied removals and sent the person the job, and it is deleted with the gate.

**Migration**: Setup writes `permissions.ask` for `Bash(git worktree remove *)`.

### Requirement: What the Session Made Meets No Vendored Delete Rule

**Reason**: The vendored rules and the session's ownership record are deleted with the gate.

**Migration**: Setup writes `permissions.ask` for branch moves and branch deletes, and the `autoMode` lists judge a delete.

### Requirement: A Kill Needs a Pid the Session Started

**Reason**: The kill rule and its pid record are deleted with the gate.

**Migration**: Setup writes `permissions.deny` for `Bash(pkill *)` and `Bash(killall *)`, and the agent stops its own tasks with `TaskStop`.

### Requirement: A Released Claude Program Is Read, Not Run

**Reason**: The release rule is deleted with the gate.

**Migration**: Claude Code's own permission check and the `autoMode` lists that setup writes judge the command.

### Requirement: A Branch Move Asks

**Reason**: `refs.ts` is deleted with the gate.

**Migration**: Setup writes `permissions.ask` for `Bash(git reset *)`, `Bash(git update-ref *)`, and `Bash(git branch -f *)`.

### Requirement: A Vanished File Is Not Recreated Unasked

**Reason**: `recreate.ts` ran the `$.fs.stat` path spam, and it is deleted with the gate.

**Migration**: No setting takes over; Claude Code's own write checks apply.

### Requirement: What Counts as Creating a Vanished File

**Reason**: `recreate.ts` is deleted with the gate.

**Migration**: No setting takes over; Claude Code's own write checks apply.

### Requirement: A Shell In-Place Edit Is Denied

**Reason**: The in-place edit rule is deleted with the gate.

**Migration**: The write advice stays in the Bash tool text, and no denial enforces it.

### Requirement: A Check's Exit Code Reaches the Chain

**Reason**: `pipefail.ts` is deleted with the gate.

**Migration**: No setting takes over; Claude Code runs the command as written.

### Requirement: A Formatter Stays in the Task's Files

**Reason**: The formatter rule is deleted with the gate.

**Migration**: Claude Code's own permission check and the `autoMode` lists that setup writes judge the command.

### Requirement: What Counts as a File the Session Saw

**Reason**: The record of seen files belonged to `recreate.ts`, which is deleted with the gate.

**Migration**: None is needed.

### Requirement: An Unreadable Command Asks

**Reason**: claudetto's shell parser is deleted with the gate.

**Migration**: Claude Code's own `Bash` permission parser asks on a command it cannot read.

### Requirement: A Read-Only Ask Becomes an Allow

**Reason**: `readonly.ts` is deleted with the gate.

**Migration**: Setup writes `permissions.allow` for read-only commands.

### Requirement: A Gate Failure Asks

**Reason**: No gate is left to fail.

**Migration**: Claude Code's own `permissions`, sandbox, and `autoMode` gates judge each call.

### Requirement: A Repeat Denial Is Explained

**Reason**: The denial memory of `denials.ts` and `watch.ts` repeated denials as spam, and it is deleted with the gate.

**Migration**: Claude Code's own denial handling applies, under the `permissions` rules that setup writes.

### Requirement: A Loop That Polls With No Pause Is Denied

**Reason**: The busy-wait rule is deleted with the gate.

**Migration**: No setting takes over; the `Bash` timeout ends a foreground loop, and the agent stops a background one with `TaskStop`.

### Requirement: A Temp Base Itself Stays

**Reason**: The temp-base rule is deleted with the gate.

**Migration**: The sandbox write scope in `sandbox.filesystem` that setup writes bounds an `rm`.
