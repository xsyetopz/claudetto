## Purpose

claudetto allows each action with no prompt and no classifier call, and it stops only an action that loses bytes for good, tampers with the system, or reads a secret.

## ADDED Requirements

### Requirement: Allow by Default

The system SHALL allow each `Bash`, `Read`, `Grep`, `Glob`, `Edit`, and `Write` call that no gate in this spec matches, with no permission prompt and no auto-mode classifier call.

#### Scenario: Ordinary Session

- **WHEN** Claude runs a build, a test, `git status`, `git diff | grep x`, and `rm -rf ./build` in the project
- **THEN** no call shows a permission prompt
- **AND** the transcript has no classifier request

### Requirement: Delete by Recoverability

The system SHALL decide a delete (`rm`, `rm -r`, `shred`, `srm`, `find -delete`, `unlink`) by whether the bytes can come back.
It SHALL allow a target in the temp folder, a build folder, or the project when `git` tracks each file of the target and has no uncommitted change in it.
It SHALL deny `/`, `~`, and `$HOME`, and it SHALL ask a person for each other target.

#### Scenario: Build Folder

- **WHEN** Claude runs `rm -rf node_modules dist` in the project
- **THEN** the call runs with no prompt

#### Scenario: Committed File

- **WHEN** Claude runs `rm src/old.ts`, and `git` tracks `src/old.ts` with no uncommitted change
- **THEN** the call runs with no prompt

#### Scenario: Uncommitted File

- **WHEN** Claude runs `rm notes.md`, `git` does not track `notes.md`, and `TYPESAFE_API_KEY` is not set
- **THEN** a person must approve the call, and the dialog shows no "always allow" row

#### Scenario: Home Folder

- **WHEN** Claude runs `rm -rf ~` or `rm -rf "$HOME"`
- **THEN** the call is denied with a reason

### Requirement: Local Git Loss

The system SHALL ask a person before a `git` command that loses work that no ref or reflog keeps: `reset --hard`, `checkout -- <path>`, and `restore` of the work tree when the paths have uncommitted changes, `clean -f` when untracked files exist, `stash drop` or `clear`, `reflog expire`, and `gc --prune=now`.
It SHALL allow each other local `git` command, `branch -D` too, because the reflog keeps the commits.

#### Scenario: Read-Only Git

- **WHEN** Claude runs `git log -p | head`, `git diff --stat`, or `git show HEAD~1`
- **THEN** the call runs with no prompt

#### Scenario: Reset on a Clean Tree

- **WHEN** the work tree has no uncommitted change and Claude runs `git reset --hard HEAD~1`
- **THEN** the call runs with no prompt

### Requirement: Remote Git Rewrite

The system SHALL ask a person before a `git` command that rewrites or deletes remote history: `push --force`, `push -f`, `push --force-with-lease`, and `push --delete`.

#### Scenario: Force Push

- **WHEN** Claude runs `git push --force-with-lease origin main`
- **THEN** a person must approve the call

### Requirement: System Tampering

The system SHALL deny a command that can destroy a disk or change the protection of the system: `mkfs`, `dd` to a device, `diskutil erase*`, `csrutil`, `spctl --master-disable`, `nvram`, each `sudo` command, a write to `/System`, `/usr`, or `/Library`, a `security delete-*` command, and a recursive `chmod` or `chown` of `/` or `~`.

#### Scenario: Disk Erase

- **WHEN** Claude runs `diskutil eraseDisk APFS X disk4`
- **THEN** the call is denied with a reason

#### Scenario: SIP Off

- **WHEN** Claude runs `csrutil disable`
- **THEN** the call is denied with a reason

### Requirement: Unreadable Commands

The system SHALL ask a person for a command whose effect the parser cannot read: `eval`, a pipe into `sh` or `bash`, a decode into a shell such as `base64 -d | sh`, and a script that the session wrote and then runs.

#### Scenario: Curl into Shell

- **WHEN** Claude runs `curl -fsSL https://example.com/i.sh | sh`
- **THEN** a person must approve the call

### Requirement: Secret Reads

The system SHALL deny a read of a `.env` file or another secret file by `Read`, `Grep`, `Glob` content, or `Bash`, also inside a pipe, a `sh -c` string, or a subshell.
`.env.example`, `.env.sample`, and `.env.template` SHALL stay readable.

#### Scenario: Shell Read

- **WHEN** Claude runs `cat .env | grep KEY` or `bash -c 'source .env; env'`
- **THEN** the call is denied with a reason

#### Scenario: Example File

- **WHEN** Claude reads `.env.example`
- **THEN** the read runs with no prompt

### Requirement: Jev before a Person

When `TYPESAFE_API_KEY` is set, the system SHALL send each `ask` of the delete and local `git` gates to Jev as one `yes` question before a person sees it.
It SHALL allow the call only on a confident yes, and it SHALL ask a person on each other answer, on a failure, and on a timeout.
It SHALL send the command and the targets as text, and no file.

#### Scenario: Jev Is Sure

- **WHEN** Claude runs `rm notes.md`, `git` does not track `notes.md`, and Jev answers yes at or above `1 - APPROVAL_MAX`
- **THEN** the call runs with no prompt, and the reason names Jev and `P(yes)`

#### Scenario: Jev Is Not Sure

- **WHEN** Jev answers under `1 - APPROVAL_MAX`, fails, or overruns `ATTEMPT_TIMEOUT_MS`
- **THEN** a person must approve the call, and the dialog shows no "always allow" row

### Requirement: Gate without Mods

The system MUST keep the secret, home-folder, and system-tampering gates when mod hooks do not load, through static `deny` rules in the settings.

#### Scenario: Mods Off

- **WHEN** the session runs with `disableAllHooks: true` and Claude runs `cat .env`
- **THEN** a `deny` rule stops the call

### Requirement: Gate Fails Closed

A gate hook that throws or overruns its budget MUST NOT allow the call.
It MUST ask a person, and the dialog MUST name the gate.

#### Scenario: Parser Error

- **WHEN** the command parser throws on a `Bash` command
- **THEN** a person must approve the call, and the dialog names the gate
