## MODIFIED Requirements

### Requirement: Stale Claudetto Files Go

Hygiene SHALL remove claudetto's own work files past their age limit, such as old handoffs. It SHALL keep the handoff of each project that resume reads back, chosen by the same name order as the reader and not by file time. A file in the handoff folder whose name is not a handoff name, and a symlink, SHALL stay.

#### Scenario: Old Handoffs

- **WHEN** a project holds handoffs older than the limit and one newer
- **THEN** the old ones are removed and the newest stays

#### Scenario: Read Handoff Has the Oldest File Time

- **WHEN** the handoff with the newest name has an older file time than another handoff, and both are past the limit
- **THEN** the handoff with the newest name stays and the other is removed

#### Scenario: Not a Handoff

- **WHEN** the handoff folder holds `0-1-1-status-line.md` and a symlink named `handoff-x.md`, both past the limit
- **THEN** both stay

## ADDED Requirements

### Requirement: Retention per Kind

Each kind hygiene removes SHALL have its own retention key in the plugin's `userConfig`, named in Claude Code's style: `handoffCleanupPeriodDays`, `sessionTempCleanupPeriodDays`, and `probeCleanupPeriodMinutes`. A key's value of 0 SHALL turn its kind off. An unset day key SHALL follow `cleanupPeriodDays`, and an unset `probeCleanupPeriodMinutes` SHALL be 60. `hygieneEnabled: false` SHALL start no hygiene process.

#### Scenario: Kind Off

- **WHEN** `probeCleanupPeriodMinutes` is 0 and a `fswatch-probe-*` folder is a day old
- **THEN** the folder stays and the other kinds are still swept

#### Scenario: Hygiene Off

- **WHEN** `hygieneEnabled` is `false` and a session starts
- **THEN** no hygiene process runs

### Requirement: Temp Root Is Found, Not Assumed

Hygiene SHALL look for Claude Code's temp folder `claude-<uid>` under `CLAUDE_CODE_TMPDIR`, `/tmp`, and the system temp folder. It SHALL sweep each real path once, and only a folder that exists and that the user owns.

#### Scenario: Two Candidates, One Folder

- **WHEN** two candidates resolve to the same real folder
- **THEN** it is swept once

#### Scenario: Folder of Another User

- **WHEN** a candidate folder is owned by another uid
- **THEN** it is not swept

### Requirement: Roots Are Guarded

Hygiene SHALL refuse a root inside `~/.claude/projects` or `~/.claude/plugins`, and a root that is the home folder itself.

#### Scenario: Home as Project

- **WHEN** the project root resolves to the home folder
- **THEN** hygiene removes nothing and reports the refusal

### Requirement: No Request Growth

Hygiene SHALL add no model call, tool, command, skill, or prompt text. The free capture of the first request SHALL read the same totals before and after a hygiene change.

#### Scenario: Capture After a Change

- **WHEN** `just capture --shipped` and `just capture --shipped --interactive` run after a hygiene change
- **THEN** the `plugin` and `plain` totals equal the readings taken before it
