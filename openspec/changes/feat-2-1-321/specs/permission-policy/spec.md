## MODIFIED Requirements

### Requirement: A Branch the Person Named Is Not Denied

The branch gate SHALL ask, not deny, before `git branch -D` of a branch this session did not create. It SHALL ask the Decider one Noul over the person's messages in this session: whether a message asks to delete that branch, by its name or as one of a group such as the other local branches. It SHALL allow the delete on `yes`, and SHALL ask the person on `no`, on `unsettled`, and when the Decider fails.

#### Scenario: The Person Asked

- **WHEN** the person wrote "delete all other local branches" and the agent runs `git branch -D old-feature`
- **THEN** the command runs

#### Scenario: No Request

- **WHEN** no message of the person mentions deleting branches
- **THEN** the gate asks the person instead of denying

#### Scenario: The Person Forbade It

- **WHEN** the person wrote "do not delete old-feature" and the agent runs `git branch -D old-feature`
- **THEN** the gate asks the person

#### Scenario: Words Outside a Fixed List

- **WHEN** the person wrote "get rid of the stale branches, old-feature included" and the agent runs `git branch -D old-feature`
- **THEN** the command runs

#### Scenario: The Decider Fails

- **WHEN** Jev does not answer and the fallback call is not answered
- **THEN** the gate asks the person
