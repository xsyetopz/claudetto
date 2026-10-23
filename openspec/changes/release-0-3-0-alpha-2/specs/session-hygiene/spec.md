## MODIFIED Requirements

### Requirement: Edit Ledger

After each `Edit` or `Write` call that succeeds, the system SHALL keep the path, a 64-bit hash of the file content, the session, and the agent name in one ledger file of the project in the temp folder, so that each session of the project reads the same ledger.
At the next turn, the system SHALL give the agent one line for each file in the ledger whose content changed after the last edit of the agent.
It SHALL add no text when no such file changed.

#### Scenario: Mine

- **WHEN** the agent edits `a.ts`, and nothing else changes it
- **THEN** the hash in the ledger equals the hash of `a.ts`, and the next turn gets no added line

#### Scenario: Changed After

- **WHEN** the agent edits `a.ts`, and a formatter then rewrites it
- **THEN** the next turn gets one line that names `a.ts` and says that the user or a tool changed it after the last edit of the agent

#### Scenario: Two Sessions

- **WHEN** session A edits `b.ts`, and session B of the same project then reads the ledger
- **THEN** session B finds the entry of session A for `b.ts`

### Requirement: Unknown Makers Stay

Cleanup SHALL keep each entry of the temp folder that it cannot match to a session or to a known maker.
It SHALL NOT report these entries to the user.

#### Scenario: Unknown Folder

- **WHEN** the temp folder holds a folder `tscheck` that no rule names
- **THEN** it stays, and the session shows no message about it

## ADDED Requirements

### Requirement: Who Changed a File

When `git status` or `git diff` runs through `Bash`, the system SHALL add context that sorts each changed file: changed by this session, by another Claude session (with its name), or by the user, when no ledger entry has the current hash of the file.
The context SHALL tell Claude that a change of the user is intended and is part of the work tree that the user owns.

#### Scenario: User Edit

- **WHEN** the user edits `.github/workflows/commitlint.yml` by hand, and Claude runs `git status`
- **THEN** the context names the file as a change of the user

#### Scenario: Other Session

- **WHEN** session A wrote `src/x.ts`, and session B runs `git status`
- **THEN** the context of session B names `src/x.ts` as a change of session A

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
