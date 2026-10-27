# session-hygiene Specification

## Purpose
claudetto tells the edits of an agent apart from the edits of the user or a formatter, and it removes the temp files of sessions that ended, at no token cost while nothing changes.

## Requirements

### Requirement: Edit Ledger

After each `Edit` or `Write` call that succeeds, the system SHALL keep the path, a 64-bit hash of the file content, the session, and the agent name in one ledger file of the project in the temp folder, so that each session of the project reads the same ledger.

#### Scenario: Two Sessions

- **WHEN** session A edits `b.ts`, and session B of the same project then reads the ledger
- **THEN** session B finds the entry of session A for `b.ts`

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

Cleanup SHALL keep each entry of the temp folder that it cannot match to a session or to a known maker.
It SHALL NOT report these entries to the user.

#### Scenario: Unknown Folder

- **WHEN** the temp folder holds a folder `tscheck` that no rule names
- **THEN** it stays, and the session shows no message about it

### Requirement: Notices Report a Change

Each notice that claudetto shows to the user SHALL report a change that claudetto made, or ask for an action.
A count in a notice SHALL agree in number with its noun.

#### Scenario: Removed Folders

- **WHEN** cleanup removes 1 folder of 2 MB
- **THEN** the notice says "removed 1 folder" with the size

#### Scenario: Nothing Removed

- **WHEN** cleanup removes nothing
- **THEN** the session shows no cleanup notice

#### Scenario: Handoff Path

- **WHEN** a handoff file is written
- **THEN** the notice gives the path relative to the project
