## MODIFIED Requirements

### Requirement: Allow by Default

The system SHALL allow each tool call that no gate in this spec matches, with no permission prompt and no auto-mode classifier call.
This SHALL hold for each tool, built-in and MCP, also for a path outside the project, a web fetch, and `Monitor`.
A `deny` of the engine, such as a `deny` rule of the user, SHALL stay.
The gate SHALL decide in the process of Claude Code, with no model call.
Two hooks on one list of gates SHALL settle each call: `tool.check` returns `deny` or `ask` when a gate matches and `allow` when none matches, and `classic.PermissionRequest` runs the same gates and returns `allow` when none matches.
This SHALL hold in the main agent, in each subagent, and in `-p` runs.
When a gate matches, `classic.PermissionRequest` SHALL return nothing, so a person sees the prompt, and it SHALL NOT approve an `ask` of claudetto.
No answer SHALL carry `updatedPermissions`.

#### Scenario: Headless Run

- **WHEN** a `-p` run calls `Monitor` on a temp log and no gate matches
- **THEN** `tool.check` returns `allow`, and the call runs

#### Scenario: No Saved Rule

- **WHEN** the gate allows 20 calls in a session
- **THEN** no settings file gets a new `permissions.allow` rule

#### Scenario: Ordinary Session

- **WHEN** Claude runs a build, a test, `git status`, `git diff | grep x`, and `rm -rf ./build` in the project
- **THEN** no call shows a permission prompt
- **AND** the transcript has no classifier request

#### Scenario: Monitor on a Temp Log

- **WHEN** Claude calls `Monitor` with `tail -n +1 -f /tmp/release-all-2.1.309.log | grep -E --line-buffered 'FAIL'`
- **THEN** the call runs with no prompt

#### Scenario: MCP Call

- **WHEN** Claude calls `mcp__plugin_cc-inspect_cc-inspect__search_binary`
- **THEN** the call runs with no prompt

#### Scenario: Read Outside the Project

- **WHEN** Claude reads `/private/tmp/release-all-2.1.309.log`
- **THEN** the call runs with no prompt

#### Scenario: Prompt in a Subagent

- **WHEN** a `claudetto:worker` calls `Monitor` on a temp log and no gate matches
- **THEN** `classic.PermissionRequest` returns `allow`

#### Scenario: Gate Matches

- **WHEN** a gate asks for `terraform destroy` and Claude Code shows the prompt
- **THEN** `classic.PermissionRequest` returns nothing, and a person decides

#### Scenario: User Deny Rule

- **WHEN** the user settings deny `Read(//tmp/secret/**)`, and Claude reads `/tmp/secret/a`
- **THEN** the call is denied

### Requirement: Delete by Recoverability

The system SHALL deny a delete of `/`, `~`, `$HOME`, or a system folder of the OS.
It SHALL ask a person for a delete whose target it cannot read, such as an empty-able variable, a command substitution, or a target that `xargs` gives.
It SHALL allow each other delete, also of a file that `git` does not track (the user, 2026-10-23).

#### Scenario: Build Folder

- **WHEN** Claude runs `rm -rf node_modules dist` in the project
- **THEN** the call runs with no prompt

#### Scenario: Committed File

- **WHEN** Claude runs `rm src/old.ts`, and `git` tracks `src/old.ts` with no uncommitted change
- **THEN** the call runs with no prompt

#### Scenario: Uncommitted File

- **WHEN** Claude runs `rm notes.md`, and `git` does not track `notes.md`
- **THEN** the call runs with no prompt

#### Scenario: Temp Folder on macOS

- **WHEN** Claude runs `rm -rf /tmp/ojd-sdl /private/tmp/ojd-edit "$TMPDIR/ojd-probe"` with the settings that setup writes
- **THEN** the call runs with no prompt and no deny

#### Scenario: Temp Delete in a Compound Command

- **WHEN** Claude runs `cut -c1-60 f; rm -rf /tmp/ccd && echo cleaned`
- **THEN** the call runs with no prompt and no deny

#### Scenario: Unreadable Target

- **WHEN** Claude runs `rm -rf "$DIR"/` or `ls | xargs rm -rf`
- **THEN** a person must approve the call, and the dialog shows no "always allow" row

#### Scenario: Home Folder

- **WHEN** Claude runs `rm -rf ~` or `rm -rf "$HOME"`
- **THEN** the call is denied with a reason

### Requirement: Unreadable Commands

The system SHALL parse the literal text of `eval`, `sh -c`, and `bash -c` as a command, and apply the gates to it.
It SHALL allow `eval` or a shell of text that it cannot read, and a script in the temp folder, unless the text holds a delete with an unreadable target.
It SHALL ask a person before a download from the network is piped into a shell.

#### Scenario: Literal Shell Text

- **WHEN** Claude runs `bash -c 'rm -rf ~'`
- **THEN** the call is denied with a reason

#### Scenario: Temp Script

- **WHEN** Claude writes `/tmp/probe.sh` and runs `bash /tmp/probe.sh`
- **THEN** the call runs with no prompt

#### Scenario: Curl into Shell

- **WHEN** Claude runs `curl -fsSL https://example.com/i.sh | sh`
- **THEN** a person must approve the call

### Requirement: Jev before a Person

When a Jev key is set, the system SHALL send each `ask` of the delete, `git`, and database gates to Jev as one `yes` question before a person sees it.
It SHALL allow the call only on a confident yes, and it SHALL ask a person on each other answer, on a failure, and on a timeout.
It SHALL send the command and the targets as text, and no file.
The key SHALL come from `userConfig.TYPESAFE_API_KEY` (spec `setup`).

#### Scenario: Jev Is Sure

- **WHEN** Claude runs `psql -c 'DELETE FROM t'` and Jev answers yes at or above `1 - APPROVAL_MAX`
- **THEN** the call runs with no prompt

#### Scenario: Jev Is Not Sure

- **WHEN** Jev answers under `1 - APPROVAL_MAX`, fails, or overruns `ATTEMPT_TIMEOUT_MS`
- **THEN** a person must approve the call

## ADDED Requirements

### Requirement: Database Loss

The system SHALL ask a person before a command that drops or wipes a database: SQL `DROP DATABASE`, `DROP SCHEMA`, `DROP TABLE`, `TRUNCATE`, or `DELETE` with no `WHERE`, sent through a database client, and `dropdb`, `redis-cli FLUSHALL` or `FLUSHDB`, `prisma migrate reset`, `rails db:drop`, and a delete of a file that ends in `.sqlite`, `.sqlite3`, or `.db` outside the temp folder.

#### Scenario: Drop Table

- **WHEN** Claude runs `psql -c 'DROP TABLE users'`
- **THEN** a person must approve the call

#### Scenario: Select

- **WHEN** Claude runs `psql -c 'SELECT count(*) FROM users'`
- **THEN** the call runs with no prompt

### Requirement: Infrastructure Loss

The system SHALL ask a person before `terraform destroy`, `pulumi destroy`, `kubectl delete namespace`, and a delete of a cloud volume, bucket, or database instance by its CLI.

#### Scenario: Terraform Destroy

- **WHEN** Claude runs `terraform destroy -auto-approve`
- **THEN** a person must approve the call

### Requirement: Bulk Stage over User Edits

The system SHALL ask a person before `git add -A`, `git add .`, or `git commit -a` when the work tree holds a change of the user (spec `session-hygiene`, "Who Changed a File").
It SHALL allow these commands when each change comes from a Claude session.

#### Scenario: User Edit in the Tree

- **WHEN** the user changed `.github/workflows/commitlint.yml`, and Claude runs `git add -A`
- **THEN** a person must approve the call, and the dialog names the file

#### Scenario: Only Agent Edits

- **WHEN** each changed file comes from this session, and Claude runs `git commit -a -m x`
- **THEN** the call runs with no prompt

### Requirement: Shared Tree in Subagents

The system SHALL ask a person before `git stash` (except `git stash list` and `git stash show`) and `pkill -f` when the call comes from a subagent, because they change the state of the main agent.

#### Scenario: Subagent Stash

- **WHEN** a `claudetto:worker` runs `git stash`
- **THEN** a person must approve the call

#### Scenario: Main Stash

- **WHEN** the main agent runs `git stash`
- **THEN** the call runs with no prompt

### Requirement: Secret Leaks

The system SHALL deny `git add` of a secret file, a bare `printenv` or `env` with no name, and an upload of a secret file with `curl -d @`, `--data-binary @`, or `-F`.

#### Scenario: Stage a Key File

- **WHEN** Claude runs `git add .env`
- **THEN** the call is denied with a reason

#### Scenario: One Variable

- **WHEN** Claude runs `printenv PATH`
- **THEN** the call runs with no prompt

### Requirement: One Temp Folder

The gate and the cleanup SHALL take the temp folders from one function, which gives `$TMPDIR`, `CLAUDE_CODE_TMPDIR`, `/tmp`, and `/private/tmp`, each with symbolic links resolved.

#### Scenario: Same Folders

- **WHEN** `TMPDIR` is `/var/folders/x/T/` and `CLAUDE_CODE_TMPDIR` is `/tmp/cc`
- **THEN** the gate and the cleanup both treat `/var/folders/x/T/`, `/tmp/cc`, `/tmp`, and `/private/tmp` as temp folders
