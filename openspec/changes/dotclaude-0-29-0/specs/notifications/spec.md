## ADDED Requirements

### Requirement: Notify script

A notify script SHALL run on the `Notification` and `Stop` hook events, and send a local notification with the tool of the platform (design D21).
Notifications SHALL be on by default, and the wiki SHALL name the switch that turns them off.

#### Scenario: Input needed

- **WHEN** Claude Code fires `Notification` because it needs input
- **THEN** the user gets a local notification that says so

#### Scenario: No notify tool

- **WHEN** the platform has no notify tool
- **THEN** the script exits with status 0 and writes no output to the session

### Requirement: Replaces the push tool

The notify script SHALL replace `PushNotification`, and the snippet SHALL turn `PushNotification` off.

#### Scenario: Tool list

- **WHEN** a session starts with the snippet applied
- **THEN** the request has no `PushNotification` tool
