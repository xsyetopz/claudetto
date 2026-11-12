# session-hygiene Specification

## Purpose
Remove stale files that claudetto and Claude Code leave under `~/.claude/` and in the project.

## Requirements

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

### Requirement: Stale Generated Files Go

Hygiene SHALL remove stale files that programs generate under `~/.claude/`, by a list of paths and age limits in code, each with its source. It SHALL NOT touch a settings file, a credentials file, `CLAUDE.md`, a skill, an agent, a plugin install, or a transcript newer than its limit (D11).

#### Scenario: Listed Path

- **WHEN** a listed path holds a file past its limit
- **THEN** the file is removed and counted in the report

#### Scenario: Unlisted Path

- **WHEN** a file is under a path that is not listed
- **THEN** it is left

### Requirement: Dry Run First

Hygiene SHALL print what it would remove with `--dry-run`, and the automatic run SHALL never block a session start.

#### Scenario: Dry Run

- **WHEN** hygiene runs with `--dry-run`
- **THEN** it lists the files and removes none

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

Hygiene SHALL add no model call, tool, command, skill, or prompt text. The prompt bytes that `just prompt-bytes` prints from fixed inputs SHALL read the same totals before and after a hygiene change.

#### Scenario: Capture After a Change

- **WHEN** `just prompt-bytes` runs after a hygiene change
- **THEN** its totals equal the readings taken before it

### Requirement: Build Folders Go by a Trash File

Hygiene SHALL remove a project folder that a rule of `hooks/classic.SessionStart/useHygieneSweep/trash.toml` names, in the gitleaks config format, and a `gcroot` rule SHALL name a symlink that points into `/nix/store/`.

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

The walk SHALL start at the project and at each folder that Mole's `~/.config/mole/purge_paths` lists, with a leading `~` read as the home folder, and SHALL skip a listed folder that hygiene refuses as a root. The walk SHALL stop at a match, SHALL skip `.git`, SHALL NOT follow a link, and SHALL NOT enter `~/.claude/projects` or `~/.claude/plugins`. The age limit SHALL be 7 days, or `--trash-days`, where 0 turns the kind off.

#### Scenario: Kind Off

- **WHEN** `--trash-days` is 0
- **THEN** no build folder is removed

#### Scenario: Another Checkout Under a Purge Path

- **WHEN** `purge_paths` lists a folder holding an idle checkout with an old ignored `node_modules`
- **THEN** the `node_modules` is removed ("an old build folder in an idle checkout under a Mole purge path is swept", "a purge path written with ~ is read from the home folder")

#### Scenario: Claude Code's Own Folders

- **WHEN** `purge_paths` lists `~/.claude`, and checkouts under `~/.claude/plugins` and `~/.claude/projects` hold old ignored build folders
- **THEN** none is removed ("the walk skips ~/.claude/plugins and ~/.claude/projects inside a purge path")

### Requirement: Mole Clears Caches

After the sweep, hygiene SHALL run `mo clean` with no terminal on stdin, so Mole clears user caches without a prompt and skips the caches that need `sudo`; with `--dry-run` it SHALL run `mo clean --dry-run`. The report SHALL end with Mole's exit code, or, when `mo` is not on `PATH`, with its install command.

#### Scenario: Unattended Clean

- **WHEN** hygiene runs and `mo` is on `PATH`
- **THEN** `mo clean` runs with stdin that is no terminal, and the report names its exit code ("the sweep runs mo clean with no terminal on stdin and reports its exit")

#### Scenario: Mole Missing

- **WHEN** `mo` is not on `PATH`
- **THEN** the report names `brew install mole` ("a missing mo names its install command")

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

Hygiene SHALL remove a top-level folder of the temp bases (`CLAUDE_CODE_TMPDIR`, `/tmp`, `/tmp/claude-<uid>`, the system temp folder) when a `temp` rule of the trash file names it, it holds the `.created-by-claudetto` marker, and the marker names a session that is no longer alive, once the folder is older than `probeCleanupPeriodMinutes` (60 when unset). A session is alive when its id is the `--session` argument or appears in a file under `~/.claude/sessions`. A folder with no marker SHALL stay.

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
