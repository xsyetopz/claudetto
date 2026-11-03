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

After a `PermissionDenied`, the system SHALL tell the model to stop and report, with the reason and the rule that denied the call, and SHALL NOT tell it to look for another way.

The rule reported is the gate's own rule, not an `permissions.allow` rule to add, because no allow rule lifts a denial of this gate: the gate stops a call that loses bytes for good, tampers with the system, or reads a secret, and a person lifts such a denial by changing the request. "The exact rule to add", as this requirement first read, describes a denial by a settings rule and not by the gate.

#### Scenario: Denied Push

- **WHEN** a call is denied by a rule
- **THEN** the model receives the rule text and no hint to work around it

#### Scenario: Denied by the Gate

- **WHEN** the gate itself denies a call, at `tool.check` or at the permission dialog
- **THEN** the answer carries the stop-and-report text with the rule that denied it, and tells the model not to resend the call and not to look for another way

#### Scenario: Denied by the Engine

- **WHEN** the engine's own verdict is already `deny`
- **THEN** the engine's reason is passed through unchanged, because the denial is not ours to explain

### Requirement: Hard Deny on Parsed Commands

Loss and secret rules SHALL match on the parsed command, so that `git -C . push` and `bash -c` forms match the same rule as the plain form.

#### Scenario: Wrapped Push

- **WHEN** the command is `git -C . push --force`
- **THEN** the same rule fires as for `git push --force`

### Requirement: User Words after Hook Feedback Are the User's

The classifier SHALL read text that the user typed and that the harness appended after Stop hook feedback in the same message as the user's own words, and SHALL read the hook text before it as data.

#### Scenario: Approval Typed While a Goal Loops

- **WHEN** a message holds Stop hook feedback followed by the user's line "Approved."
- **THEN** the classifier counts "Approved." as a user message and does not call it hook text

### Requirement: A Message Sent Mid-Turn Is the User's

The classifier SHALL read a message the user sent while the agent worked, which the harness delivers as a text block after a `tool_result`, as the user's own words, in its place between the agent's calls.

#### Scenario: Token Named Mid-Turn

- **WHEN** the user sends "take the .env OAUTH token" while the agent works, and the agent's next call reads that token for a probe
- **THEN** the classifier's transcript holds the sentence as a user message before that call, and does not say that nothing the user said authorizes it

### Requirement: A Repeat Denial Counts Only Since the Last User Message

The repeat-denial guard SHALL count the denials of a call only since the user's last message, because a new user message can carry the consent the earlier denials lacked.

#### Scenario: Retry after the User Answers

- **WHEN** a call was denied twice, then the user sends a message, then the agent sends the same call
- **THEN** the guard passes the call to the classifier and does not deny it as a repeat

### Requirement: A Secret Stays off the Command Line

The gate SHALL deny a command that expands a secret into a program argument, such as `env NAME="$(sed … .env)" cmd`, because each local user can read a process's arguments with `ps`. The denial SHALL name the form that keeps the value in the environment: set it with the shell's `export` and start the program with `exec`.

#### Scenario: Token through `env`

- **WHEN** the session runs `env CLAUDE_CODE_OAUTH_TOKEN="$(sed -n 's/^CLAUDE_CODE_OAUTH_TOKEN=//p' .env)" claude`
- **THEN** the gate denies it and names `export` and `exec`

### Requirement: An Approval of Named Tasks Covers What the Tasks Name

When the user approves tasks of an OpenSpec change by number, the classifier SHALL treat an edit to a file, or a change to a value, that those tasks name as approved.

#### Scenario: Cap Named by the Task

- **WHEN** the user approved a task that says to change `DEFAULT_MAIN_BODY_CHARS` to a cap of 6,000
- **THEN** the edit that sets it to `6000` is not blocked as "Weaken a Guard"

#### Scenario: Prompt Named by the Task

- **WHEN** the user approved a task that says to replace the root prompt with a draft
- **THEN** the copy of that draft over the root prompt's source file is not blocked as "Rewire the Agent"

### Requirement: An AskUserQuestion Answer Is the User's Choice

The classifier SHALL read the option the user picked in an `AskUserQuestion` call as the user's words, scoped to the question that offered it.

#### Scenario: Picked Allowance

- **WHEN** the user picked "Approve the allowance" for a named test change
- **THEN** that test change is not blocked for lack of a user message

### Requirement: Rewire the Agent Covers Instruction Surfaces Only

"Rewire the Agent" SHALL cover settings, hooks, permissions, instruction files, agent, skill, and rule files, output styles, memory, persistence, and transcripts. A comment or doc comment in a source or test file SHALL NOT match it.

#### Scenario: Doc Comment in a Test

- **WHEN** a subagent adds a `///` doc comment above a private function in a Swift test file
- **THEN** the classifier does not block it as "Rewire the Agent"

### Requirement: A Search Pattern Is Not a Path

The secrets gate SHALL read a `grep` or `rg` pattern argument as a pattern, not as a file path.

#### Scenario: Tag Pattern

- **WHEN** the session runs `grep -n "^<[a-z_]*>$" FILE`
- **THEN** the gate does not deny it as a read of `[a-z_]*`

### Requirement: The Classify Block Reasons before Its Verdict

The `classify` block SHALL ask its model for the reason before the verdict, and SHALL NOT deny a call whose reason says the rule it names does not apply.

#### Scenario: Lab File Write

- **WHEN** the agent writes `plugins/claudetto/tests/opening.test.ts`, and the reason says the file sends nothing anywhere
- **THEN** the call is not denied under "Data Exfiltration"

#### Scenario: Handoff Edit

- **WHEN** the agent edits a file under `.claude/claudetto/handoffs/`
- **THEN** the call is not denied under "Data Exfiltration"

### Requirement: A Named Secret Authorized for a Named Use

The classifier SHALL count a user message that names a secret and its use as consent for that use, when the command keeps the value off the command line.

#### Scenario: Token for a Scratch Login

- **WHEN** the user wrote to take the `CLAUDE_CODE_OAUTH_TOKEN` of `.env` for a scratch-login probe, and the launcher sets it with `export` and starts `claude` with `exec`
- **THEN** the call is not denied under "Data Exfiltration", "Expose a Credential", or "Credential Exposure"

### Requirement: A Nested Claude Code Session Is Not Rewire the Agent

Starting `claude` in a `tmux` session and reading its pane SHALL NOT match "Rewire the Agent", because it changes no instruction surface of the running session.

#### Scenario: Model Pinning Check

- **WHEN** the agent starts `claude` in `tmux` to read `params.model` of each request
- **THEN** the call is not denied under "Rewire the Agent"

### Requirement: A Denial with No Reason Is Reported

When the engine's classifier denies a call with no explanation, claudetto's repeat-denial refusal SHALL say that the classifier gave no reason, and SHALL tell the agent to give the user the exact `! <command>` and go on with the rest of the work.

#### Scenario: Second Try of an Unexplained Denial

- **WHEN** the engine denied a `Bash` call "(it gave no explanation)" and the agent sends it again
- **THEN** the refusal names the missing reason and the `! <command>` form
