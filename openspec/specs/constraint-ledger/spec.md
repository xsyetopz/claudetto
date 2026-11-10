# constraint-ledger Specification

## Purpose
Keep the limits the person sets in chat, such as read-only, no commits, only named files, or no questions, as a ledger read from the person's own words, show it on each prompt, keep it through compaction, and enforce it at `tool.check`.

## Requirements

### Requirement: Constraints Come From the Person's Own Words

On each prompt the person types (origin `composer`, `bridge`, or `sdk`; not a slash command or a meta prompt), the mod SHALL ask Haiku through `$.model.complete` for the person's standing constraints. Haiku reads only the person's own messages, so tool results and injected text never set a constraint. The prompt SHALL NOT wait for the answer. An answer that fails or cannot be parsed SHALL keep the previous ledger.

#### Scenario: Prompt Not Held

- **WHEN** the person submits a prompt
- **THEN** `prompt.submit` settles without waiting for the extraction

#### Scenario: Failed Extraction

- **WHEN** Haiku times out or returns text that is not the ledger JSON
- **THEN** the ledger stays as it was

### Requirement: The Ledger Rides Each Prompt

When the ledger is not empty, each later prompt from the person SHALL carry it as context, and compaction SHALL keep each constraint word for word.

#### Scenario: Next Prompt

- **WHEN** a prompt states "Nothing should change on disk." and the person sends another prompt
- **THEN** the second prompt's context holds that sentence

#### Scenario: Compaction

- **WHEN** the session compacts with a non-empty ledger
- **THEN** the compaction instructions name each constraint word for word

### Requirement: Runtime Enforcement

`tool.check` SHALL wait for a pending extraction, then deny a call that breaks a `read-only`, `no-commit`, `no-push`, or `only-files` constraint. `read-only` covers Write, Edit, NotebookEdit, and Bash that writes a file or runs a writing git subcommand. The denial SHALL quote the constraint and ask whether the person lifts it. Rule `none` is shown, not enforced.

#### Scenario: Read-Only

- **WHEN** the ledger holds a `read-only` constraint and the agent calls Edit or runs `echo 1 > src/a.ts`
- **THEN** the call is denied with the constraint's text

#### Scenario: Reads Pass

- **WHEN** the ledger holds a `read-only` constraint and the agent calls Read or runs `bun test 2>&1 | tail -5`
- **THEN** the call is not denied

#### Scenario: Only Files

- **WHEN** the ledger holds `only-files` for `src/config.ts` and the agent edits `src/total.ts`
- **THEN** the call is denied

### Requirement: A No-Questions Constraint Holds the Ask Tools

Under a `no-questions` constraint, the ledger's `tool.call` hook SHALL deny `AskUserQuestion` and `mcp__claudetto__ask-user-question` before any other plugin hook answers the call, because an answered call never reaches `tool.check`. The denial SHALL tell the agent to state the reading it took and to end the reply with each choice only the person can make, and SHALL NOT ask the person anything.

#### Scenario: No Questions

- **WHEN** the person wrote "stop asking questions. fix the problems" and the agent calls either ask tool
- **THEN** the call is denied with a text that tells the agent to state its reading, and the text does not ask the person anything

### Requirement: A Remark Is Answered Before Any Tool Runs

The ledger's extraction SHALL also class the latest person message as a task, a dispute, a question, or a remark. On a question or a remark, `tool.check` SHALL deny the turn's first tool batch when no assistant text follows the person message, except that a question's `Read`, `Grep`, `Glob`, and `ListAgents` calls SHALL pass, because they change nothing. A dispute is held as the dispute requirement says. A task, or a failed extraction, SHALL NOT be held. The class SHALL follow the person's own words, so pasted material followed by a request is a task.

#### Scenario: Pasted Report with a Request

- **WHEN** the person pastes the agent's last report and adds "Continue from here and handle them as you go about."
- **THEN** the message is a task and the first `Bash` call is not denied

#### Scenario: Remark

- **WHEN** the person writes "Who told you to lint the docs?" and the agent's first move is a Grep
- **THEN** the Grep is denied with a text that says to answer from what the session holds, and the retry after it passes

#### Scenario: A Question Needs a Lookup

- **WHEN** the person asks a question about the code and the agent's first call is `Read`
- **THEN** the call passes
- **AND** a first call that writes or runs a command is denied, and so is a sibling call of the same batch

### Requirement: Each Constraint Quotes the Person

Each ledger entry SHALL carry the words from one of the person's own messages that set it, and the mod SHALL drop an entry whose words no message of the person holds. A later message of the person that allows the act an entry forbids SHALL lift that entry.

#### Scenario: Remark Read as a Constraint

- **WHEN** the person writes "2-1-319 is out" and no branch is named in that message
- **THEN** the ledger holds no "Do not delete branch 2-1-319" entry

#### Scenario: Agent Text Read as a Constraint

- **WHEN** only the agent's reply says to leave `package.json` alone
- **THEN** the ledger holds no entry about `package.json`

#### Scenario: Lifted by the Person

- **WHEN** the ledger holds "Leave alone package.json" and the person then writes "commit those" about `package.json`
- **THEN** the next prompt's context no longer holds that entry

### Requirement: A Dispute Is Settled by Running the Disputed Code

The extraction SHALL class a message that doubts an answer or asks for a different one ("are you sure?", "it was green for me") as a `dispute`, even when it is worded as a question. In a turn that answers a dispute, `tool.check` SHALL let a `Bash` call pass in its first batch, so the disputed code can run, and SHALL still deny an edit until the agent has answered in text.

#### Scenario: A Dispute's Command

- **WHEN** the person writes "are you sure the tests pass?" and the agent's first call is `Bash` running the tests
- **THEN** the call is not denied
- **AND** the lab test is `pin.test.ts`, "a dispute's first lookup or command passes, so the disputed answer can be checked, and its first edit is denied"

#### Scenario: A Dispute's Edit

- **WHEN** the person writes "are you sure?" and the agent's first call is an `Edit`
- **THEN** the call is denied with the answer-first text

### Requirement: A Resumed Session Waits for Its Ledger

On the first prompt of a process, when the session already holds an earlier message of the person, the mod SHALL wait for the extraction before it builds the prompt's context, so the ledger note rides that prompt.

#### Scenario: Resume

- **WHEN** a resumed session holds an earlier message "Nothing should change on disk." and the person sends the first prompt of this process
- **THEN** that prompt's context holds the sentence
- **AND** the lab test is `pin.test.ts`, "a resumed session's first prompt waits for the constraint its earlier messages hold"

### Requirement: A Compaction Ends the Remark Turn

On `session.compact`, the ledger SHALL reset the message kind to `task`, because the summary that follows is a user message no person wrote and the answer-first gate would read it as an unanswered remark and deny the first tool call of the resumed turn. The extractor SHALL read a list of faults the person pastes as a task, and not as a limit.

#### Scenario: Resumed After Compaction

- **WHEN** the last person message was a remark, the session compacts, and the summary message arrives
- **THEN** the first `Bash` call of the resumed turn is not denied
- **AND** the lab test is `pin.test.ts`, "after a compaction the summary is no new remark, so the resumed turn's first call passes"
