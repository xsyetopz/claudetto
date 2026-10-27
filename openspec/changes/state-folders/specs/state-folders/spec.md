## Purpose

Where claudetto keeps the state of a project and of a user, and how the state of an older version moves there.

## ADDED Requirements

### Requirement: Project State Folder

claudetto SHALL write the state of a project, such as `handoffs/` and `goal.json`, only to `<project>/.claude/claudetto/`.
claudetto SHALL create no `<project>/.claudetto/` folder.

#### Scenario: Handoff and Goal

- **WHEN** a handover writes a handoff and `/goal` sets a check
- **THEN** the files are `.claude/claudetto/handoffs/handoff-<time>.md` and `.claude/claudetto/goal.json`, and `.claudetto/` does not exist

### Requirement: User State Folder

claudetto SHALL write the state of a user that must outlive a reboot to `${CLAUDE_CONFIG_DIR:-~/.claude}/claudetto/`.
State that can go at a reboot, such as the edit ledger, the gate log, and the git cache, SHALL stay in the temp folder.

#### Scenario: Last Limit Reading

- **WHEN** the status line keeps the last limit reading, and `CLAUDE_CONFIG_DIR` is `/c`
- **THEN** the file is in `/c/claudetto/`, and a session with another `CLAUDE_CONFIG_DIR` does not read it

### Requirement: Move of the Old Folder

At `session.start`, when `<project>/.claudetto/` exists and `<project>/.claude/claudetto/` does not, claudetto SHALL move the whole folder to `.claude/claudetto/`.
When both folders exist, claudetto SHALL move nothing.

#### Scenario: Old Folder Only

- **WHEN** a session starts in a project with `.claudetto/handoffs/h.md` and no `.claude/claudetto/`
- **THEN** the file is at `.claude/claudetto/handoffs/h.md`, and `.claudetto/` does not exist

#### Scenario: Both Folders

- **WHEN** a session starts in a project with `.claudetto/` and `.claude/claudetto/`
- **THEN** both folders stay as they are

### Requirement: Gitignore Entry

At `session.start` in a project with `.git`, claudetto SHALL add `/.claude/claudetto/` to `.gitignore` when no entry covers the folder, and SHALL create `.gitignore` when it is missing.
An entry covers the folder when it names the folder or a parent folder, with or without a leading `/`, a leading `**/`, a trailing `/`, or a trailing `/**`.

#### Scenario: Parent Folder Ignored

- **WHEN** `.gitignore` has the line `.claude/`
- **THEN** claudetto does not write `.gitignore`

#### Scenario: Old Entry Only

- **WHEN** `.gitignore` has `/.claudetto/` and no entry that covers `.claude/claudetto/`
- **THEN** claudetto appends `/.claude/claudetto/`, and the line `/.claudetto/` stays
