## MODIFIED Requirements

### Requirement: Edit Ledger

After each `Edit` or `Write` call that succeeds, the system SHALL keep the path, a 64-bit hash of the file content, the session, the agent name, and the origin `via` (`edit`) in the private store of the plugin under one key of the project, so that each session of the project reads the same ledger.
After a `Bash` call, the system SHALL keep a line with `via` of `bash` for each changed file.
A stored line with no valid `via` SHALL be dropped when read.
Before an `Edit` or `Write` call, the system SHALL keep a line with `via` of `edit` and the hash of the content that the call will write, and a fault of this step SHALL NOT stop the call.
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

#### Scenario: Intent before the Call

- **WHEN** an `Edit` call is about to replace `old_string` with `new_string` in `a.ts`
- **THEN** the ledger holds a line of `edit` with the hash of the text after the replacement, before the call runs

### Requirement: Who Changed a File

When `git status` or `git diff` runs through `Bash`, the system SHALL add context that sorts each changed file: changed by this session, by another Claude session (with its name), or with no ledger line that has the current hash of the file.
The context SHALL say of the last group that no claudetto agent wrote it, so the user or a tool did, and that Claude keeps each change and changes or stages it only when the user asks.
It SHALL NOT say that such a change is intended.

#### Scenario: User Edit

- **WHEN** the user edits `.github/workflows/commitlint.yml` by hand, and Claude runs `git status`
- **THEN** the context names the file as a change that no claudetto agent wrote

#### Scenario: Other Session

- **WHEN** session A wrote `src/x.ts`, and session B runs `git status`
- **THEN** the context of session B names `src/x.ts` as a change of session A

#### Scenario: Earlier Session

- **WHEN** an earlier session wrote `src/y.ts`, and its line is in the store when a later session runs `git status`
- **THEN** the context names that session for `src/y.ts`, and not the user

## ADDED Requirements

### Requirement: Edit Proof Spares a Write

When a `Bash` call ends, the `protect` slice SHALL leave a protected file as it is when a ledger line with `via` of `edit` holds the path with the current hash of the file, because an `Edit` or `Write` made it, and not the `Bash` call.
It SHALL read the ledger once for each call.

#### Scenario: Concurrent Write

- **WHEN** a `Write` of another session creates a protected file between the `PreToolUse` and the `PostToolUse` of a `Bash` call
- **THEN** the file stays

#### Scenario: Bash Change

- **WHEN** a `Bash` call changes a protected file, and no `edit` line holds its current hash
- **THEN** the file is written back
