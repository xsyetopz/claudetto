## Purpose

A permission request that no rule settles goes to a person and is never approved by default. This closes the open gate of the current `PermissionRequest` hook.

## ADDED Requirements

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
