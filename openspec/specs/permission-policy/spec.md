# permission-policy Specification

## Purpose
A permission request that no rule settles goes to a person and is never approved by default. This closes the open gate of the current `PermissionRequest` hook.

## Requirements

### Requirement: Fail Closed

The system MUST NOT answer `allow` to a `PermissionRequest` whose input has no gated key. It SHALL pass the request on.

#### Scenario: Web Fetch

- **WHEN** a `PermissionRequest` for `WebFetch` arrives
- **THEN** the hook passes it to the next handler and returns no `allow`

#### Scenario: MCP Tool

- **WHEN** a `PermissionRequest` for an MCP tool arrives
- **THEN** the hook returns no `allow`

### Requirement: Denied Calls Stop

After a `PermissionDenied`, the system SHALL tell the model to stop and report, with the reason and the rule that denied the call, and SHALL NOT tell it to look for another way. The rule reported SHALL be the gate's own rule.

#### Scenario: Denied Push

- **WHEN** a call is denied by a rule
- **THEN** the model receives the rule text and no hint to work around it

#### Scenario: Denied by the Gate

- **WHEN** the gate itself denies a call, at `tool.check` or at the permission dialog
- **THEN** the answer carries the stop-and-report text with the rule that denied it, and tells the model not to resend the call and not to look for another way

#### Scenario: Denied by the Engine

- **WHEN** the engine's own verdict is already `deny`
- **THEN** the engine's reason is passed through unchanged, because the denial is not ours to explain

#### Scenario: The Rule Reported Is the Gate's

- **WHEN** the gate denies a call
- **THEN** the rule reported is the gate's own and not a `permissions.allow` rule to add, because no allow rule lifts a denial of this gate
- **AND** the gate stops a call that loses bytes for good, tampers with the system, or reads a secret, and a person lifts such a denial by changing the request
- **AND** "the exact rule to add", as this requirement first read, describes a denial by a settings rule and not by the gate

### Requirement: Hard Deny on Parsed Commands

Loss and secret rules SHALL match on the parsed command, so that `git -C . push` and `bash -c` forms match the same rule as the plain form.

#### Scenario: Wrapped Push

- **WHEN** the command is `git -C . push --force`
- **THEN** the same rule fires as for `git push --force`

### Requirement: A Repeat Denial Counts Only Since the Last User Message

The repeat-denial guard SHALL count the denials of a call only since the user's last message, because a new user message can carry the consent the earlier denials lacked.

#### Scenario: Retry after the User Answers

- **WHEN** a call was denied twice, then the user sends a message, then the agent sends the same call
- **THEN** the guard lets the call reach its check and does not deny it as a repeat

### Requirement: A Secret Stays off the Command Line

The gate SHALL deny a command that expands a secret into a program argument, such as `env NAME="$(sed … .env)" cmd`, because each local user can read a process's arguments with `ps`. The denial SHALL name the form that keeps the value in the environment: set it with the shell's `export` and start the program with `exec`.

#### Scenario: Token through `env`

- **WHEN** the session runs `env CLAUDE_CODE_OAUTH_TOKEN="$(sed -n 's/^CLAUDE_CODE_OAUTH_TOKEN=//p' .env)" claude`
- **THEN** the gate denies it and names `export` and `exec`

### Requirement: A Search Pattern Is Not a Path

The secrets gate SHALL read a `grep` or `rg` pattern argument as a pattern, not as a file path.

#### Scenario: Tag Pattern

- **WHEN** the session runs `grep -n "^<[a-z_]*>$" FILE`
- **THEN** the gate does not deny it as a read of `[a-z_]*`

### Requirement: A Denial with No Reason Is Reported

When the engine's classifier denies a call with no explanation, claudetto's repeat-denial refusal SHALL say that the classifier gave no reason, and SHALL tell the agent to give the user the exact `! <command>` and go on with the rest of the work.

#### Scenario: Second Try of an Unexplained Denial

- **WHEN** the engine denied a `Bash` call "(it gave no explanation)" and the agent sends it again
- **THEN** the refusal names the missing reason and the `! <command>` form

### Requirement: A Bash Write into a Plugin's Hooks Folder Asks

The gate SHALL ask when a Bash command writes into `plugins/<name>/hooks/` through a redirect, `sed -i`, `cp`, `mv`, or `rm`, or through `tee` that appends, because Claude Code's built-in check asks on `.claude/`, `.git/hooks/`, and a Write or Edit of `plugins/`, but not on a Bash write there. A read of that folder, or a write beside it, SHALL pass.

#### Scenario: A Copy into a Plugin's Hooks

- **WHEN** the command is `cp src.txt plugins/x/hooks/h.ts`
- **THEN** the gate asks

#### Scenario: A Copy out of a Plugin's Hooks

- **WHEN** the command is `cp plugins/x/hooks/h.ts /tmp/h.ts`
- **THEN** the gate has no objection

### Requirement: A Push That Deletes a Branch by Refspec Asks

The gate SHALL ask on `git push <remote> :<ref>`, as it asks on `--delete`, `--force*`, and a `+<refspec>`.

#### Scenario: A Delete Refspec

- **WHEN** the command is `git push origin :main`
- **THEN** the gate asks with the history-rewrite reason
