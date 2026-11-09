## ADDED Requirements

### Requirement: A Branch the Person Named Is Not Denied

The branch gate SHALL ask, not deny, before `git branch -D` of a branch this session did not create, and SHALL allow it when a message of the person in this session names that branch or asks to delete the other local branches.

#### Scenario: The Person Asked

- **WHEN** the person wrote "delete all other local branches" and the agent runs `git branch -D old-feature`
- **THEN** the command runs

#### Scenario: No Request

- **WHEN** no message of the person mentions deleting branches
- **THEN** the gate asks the person instead of denying

### Requirement: The Read Redirect Parses Only a File Operand

The redirect that sends `cat`, `head`, `tail`, and `sed -n` to `Read` SHALL take as `file_path` only an operand that is not an option or a `sed` script, and SHALL apply only when the whole command is that one read. A compound command SHALL run as it is.

#### Scenario: A sed Range

- **WHEN** the agent runs `sed -n 370,376p hooks/texts.ts`
- **THEN** the redirect names `hooks/texts.ts`, never `370,376p`

#### Scenario: A Compound Command

- **WHEN** the agent runs `git log -1 && head -5 CHANGELOG.md`
- **THEN** the command is not refused for its `head` part

### Requirement: A Switch That Would Touch a Protected Path Stops First

Before `git switch`, `git checkout <ref>`, `git reset --hard`, or `git rebase`, the gate SHALL compare `HEAD` with the target under each path the sandbox denies writes to, and SHALL deny the command with the list of paths when any differ.

#### Scenario: Skills Differ

- **WHEN** `.claude/skills` is under the sandbox's `denyWithinAllow` and `git diff --name-only HEAD main -- .claude/skills` lists 7 files
- **THEN** `git switch main` is denied, the files are named, and `HEAD` does not move

#### Scenario: No Difference

- **WHEN** the protected paths match between `HEAD` and the target
- **THEN** the switch runs

### Requirement: A Standing Instruction Covers a Later Remark

The work gate SHALL read the person's earlier messages in the session, and SHALL allow an edit when the newest message is a remark that falls under a standing instruction from one of them.

#### Scenario: Yet Another Fault

- **WHEN** the person earlier wrote "any issue you find that is holding you back, add them to the next list of issues" and now writes "so that is yet another fault to report"
- **THEN** the `Edit` to the issues file runs with no popup
