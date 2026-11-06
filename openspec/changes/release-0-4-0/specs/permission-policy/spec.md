## MODIFIED Requirements

### Requirement: A Repeat Denial Counts Only Since the Last User Message

The repeat-denial guard SHALL count the denials of a call only since the user's last message, because a new user message can carry the consent the earlier denials lacked.

#### Scenario: Retry after the User Answers

- **WHEN** a call was denied twice, then the user sends a message, then the agent sends the same call
- **THEN** the guard lets the call reach its check and does not deny it as a repeat

## REMOVED Requirements

### Requirement: User Words after Hook Feedback Are the User's

**Reason**: It specifies the transcript the baseline's `classify` block built, and that block is not carried (`feature-map.md`, "Own classifier" and "Decisions of the user, 2026-11-05", task 3.1; `tasks.md` 5.29 measures the replacement route).
**Migration**: None.

### Requirement: A Message Sent Mid-Turn Is the User's

**Reason**: Same as "User Words after Hook Feedback Are the User's" (`feature-map.md`, "Own classifier"; `tasks.md` 3.1).
**Migration**: None.

### Requirement: An Approval of Named Tasks Covers What the Tasks Name

**Reason**: It specifies verdicts of the baseline's `classify` block, which is not carried (`feature-map.md`, "Own classifier"; `tasks.md` 3.1).
**Migration**: None.

### Requirement: An AskUserQuestion Answer Is the User's Choice

**Reason**: It specifies verdicts of the baseline's `classify` block, which is not carried (`feature-map.md`, "Own classifier"; `tasks.md` 3.1).
**Migration**: None.

### Requirement: Rewire the Agent Covers Instruction Surfaces Only

**Reason**: It specifies a category of the baseline's `classify` block, which is not carried (`feature-map.md`, "Own classifier"; `tasks.md` 3.1).
**Migration**: None.

### Requirement: The Classify Block Reasons before Its Verdict

**Reason**: The `classify` block is not carried (`feature-map.md`, "Own classifier" and "Decisions of the user, 2026-11-05", task 3.1; `tasks.md` 5.29).
**Migration**: None.

### Requirement: A Named Secret Authorized for a Named Use

**Reason**: It specifies verdicts of the baseline's `classify` block, which is not carried (`feature-map.md`, "Own classifier"; `tasks.md` 3.1).
**Migration**: None.

### Requirement: A Nested Claude Code Session Is Not Rewire the Agent

**Reason**: It specifies a category of the baseline's `classify` block, which is not carried (`feature-map.md`, "Own classifier"; `tasks.md` 3.1).
**Migration**: None.

## ADDED Requirements

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
