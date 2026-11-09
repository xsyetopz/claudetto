## ADDED Requirements

### Requirement: Build Folders Go by a Trash File

Hygiene SHALL remove a project folder that a rule of `hooks/hygiene/trash.toml` names, in the gitleaks config format, and a `gcroot` rule SHALL name a symlink that points into `/nix/store/`.

#### Scenario: Rule Names a Nix Root

- **WHEN** a `gcroot` rule matches a symlink that points into `/nix/store/`
- **THEN** the symlink is a match

### Requirement: A Project Trash File Replaces or Extends the Plugin's

A project file `.claude/claudetto/trash.toml` SHALL replace the plugin's file, and with `[extend] useDefault = true` it SHALL add its rules to the plugin's, where `disabledRules` drops a rule by id.

#### Scenario: Project File Replaces the Rules

- **WHEN** the project holds `.claude/claudetto/trash.toml` without `useDefault`
- **THEN** only its rules apply

#### Scenario: Extending

- **WHEN** the project file sets `[extend] useDefault = true` and lists a rule id in `disabledRules`
- **THEN** the plugin's rules apply except that rule, plus the project's rules

### Requirement: The Trash Walk and Age Limit

The walk SHALL stop at a match, SHALL skip `.git`, and SHALL NOT follow a link. The age limit SHALL be 7 days, or `--trash-days`, where 0 turns the kind off.

#### Scenario: Kind Off

- **WHEN** `--trash-days` is 0
- **THEN** no build folder is removed

### Requirement: A Build Folder Match Stays Unless Safe

A match SHALL stay unless the conditions of the scenarios below hold.

#### Scenario: A Match Stays

- **WHEN** a match is not in a git checkout, is in the checkout the session works in, has a process in its checkout or holding a file inside it, is not ignored by git, or has the checkout's git index or a file inside changed within the age limit
- **THEN** it stays

#### Scenario: Old Ignored Build Folder

- **WHEN** an ignored `node_modules` sits in another checkout, no process holds it, and nothing in it or in that checkout's index is newer than 7 days
- **THEN** it is removed and counted under its rule id

#### Scenario: Own Checkout

- **WHEN** the folder is in the checkout the session works in
- **THEN** it stays

#### Scenario: Process List Unreadable

- **WHEN** `lsof` exits with an error
- **THEN** no build folder is removed

### Requirement: Marked Temp Folders Go

Hygiene SHALL remove a top-level folder of the temp bases (`CLAUDE_CODE_TMPDIR`, `/tmp`, the system temp folder) when a `temp` rule of the trash file names it, it holds the `.created-by-claudetto` marker, and the marker names a session that is no longer alive, once the folder is older than `probeCleanupPeriodMinutes` (60 when unset). A session is alive when its id is the `--session` argument or appears in a file under `~/.claude/sessions`. A folder with no marker SHALL stay.

#### Scenario: Dead Owner

- **WHEN** a matching folder's marker names a session no file holds, and the folder is older than the limit
- **THEN** the folder is removed

#### Scenario: No Marker

- **WHEN** a matching folder holds no marker
- **THEN** it stays

#### Scenario: Live Owner

- **WHEN** the marker names the current session
- **THEN** the folder stays

### Requirement: Bound Output and Heartbeat Files Go in a Day

Hygiene SHALL remove each `output-*` file under `.claude/claudetto/output/` and each file under `.claude/claudetto/heartbeat/` older than one day. The limit SHALL not follow `cleanupPeriodDays`.

#### Scenario: Old Output File

- **WHEN** `.claude/claudetto/output/output-1.txt` is two days old
- **THEN** it is removed and counted as `bound-output`

#### Scenario: Fresh Heartbeat

- **WHEN** a heartbeat file is an hour old
- **THEN** it stays
