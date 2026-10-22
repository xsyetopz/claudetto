## Purpose

claudetto tells the edits of an agent apart from the edits of the user or a formatter, and it removes the temp files of sessions that ended, at no token cost while nothing changes.

## ADDED Requirements

### Requirement: Edit Ledger

After each `Edit` or `Write` call that succeeds, the system SHALL keep the path, a 64-bit hash of the file content, and the agent name in the state of the session, and in no file.
At the next turn, the system SHALL give the agent one line for each file in the ledger whose content changed after the last edit of the agent.
It SHALL add no text when no such file changed.

#### Scenario: Mine

- **WHEN** the agent edits `a.ts`, and nothing else changes it
- **THEN** the hash in the ledger equals the hash of `a.ts`, and the next turn gets no added line

#### Scenario: Changed After

- **WHEN** the agent edits `a.ts`, and a formatter then rewrites it
- **THEN** the next turn gets one line that names `a.ts` and says that the user or a tool changed it after the last edit of the agent

### Requirement: Cleanup at Start

At session start, the system SHALL remove each folder `<tmp>/claude-<uid>/<project>/<session>/` and each claudetto file `<tmp>/claudetto/*/<session>.*` when no file of `~/.claude/sessions/` names that session and the folder is older than `cleanupPeriodDays`, which is 30 when not set.
It SHALL add no claudetto setting for the age.
It SHALL report the count of removed folders and the bytes that they held.

#### Scenario: Live Session

- **WHEN** a file of `~/.claude/sessions/` names the session of a folder
- **THEN** the folder stays, whatever its age

#### Scenario: Ended Session

- **WHEN** no file names the session of a folder, and the folder is 31 days old with no `cleanupPeriodDays`
- **THEN** cleanup removes the folder and counts it in the report

### Requirement: Worktrees Keep Work

Cleanup SHALL remove a worktree of `.claude/worktrees/` only when its session ended, `git status` in it is clean, and its branch is merged.
It SHALL report each other worktree and not remove it.

#### Scenario: Unmerged Work

- **WHEN** a worktree of an ended session has a commit that no other branch has
- **THEN** the worktree stays, and the report names it

### Requirement: Leaked Probe Folders

Cleanup SHALL remove each `fswatch-probe-*` folder of the temp folder that is older than one hour, because the settings watcher of Claude Code makes it for a probe of at most 1.5 seconds.
It SHALL report their count.

#### Scenario: Old Probe

- **WHEN** the temp folder holds a `fswatch-probe-*` folder that is 2 hours old
- **THEN** cleanup removes it and counts it in the report

#### Scenario: Running Probe

- **WHEN** a `fswatch-probe-*` folder is 1 second old
- **THEN** it stays

### Requirement: Unknown Makers Stay

Cleanup SHALL keep each entry of the temp folder that it cannot match to a session or to a known maker, and it SHALL report their count.

#### Scenario: Unknown Folder

- **WHEN** the temp folder holds a folder `tscheck` that no rule names
- **THEN** it stays, and the report gives the count of such entries
