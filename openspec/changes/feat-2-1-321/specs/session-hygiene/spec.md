## ADDED Requirements

### Requirement: Idle Temp Entries Go

Hygiene SHALL remove a top-level file or folder of Claude Code's temp folder `claude-<uid>` when a `temp` rule of the trash file names it, nothing in it changed within `probeCleanupPeriodMinutes` (60 when unset), and no process holds a file in it open. It SHALL keep the entries Claude Code owns, and SHALL remove no temp entry when the open files cannot be read. The entry SHALL need no marker file.

#### Scenario: An Idle Folder

- **WHEN** `claude-<uid>/cos-fx-1` holds no file changed in the last 60 minutes and no process holds a file in it
- **THEN** the folder is removed and counted under its rule id

#### Scenario: A Folder in Use

- **WHEN** a file in the folder changed 10 minutes ago, or a process holds a file in it open
- **THEN** the folder stays

#### Scenario: Claude Code's Own Entry

- **WHEN** the entry is `-Users-me-project`, `bash-edit-diff`, or `plugin-tool-staging`
- **THEN** this rule leaves it

#### Scenario: Process List Unreadable

- **WHEN** `lsof` exits with an error
- **THEN** no temp entry is removed

## REMOVED Requirements

### Requirement: Marked Temp Folders Go

**Reason**: The rule removed only a folder that held a `.created-by-claudetto` marker, and none of the 9,567 folders in the temp folder held one, so a dry run of the sweep found nothing there to remove.

**Migration**: The requirement "Idle Temp Entries Go" removes a temp entry by its age and its open files. A `temp` rule of the trash file still chooses the names, and `probeCleanupPeriodMinutes` still sets the age.
