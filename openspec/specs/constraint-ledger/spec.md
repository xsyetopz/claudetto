# constraint-ledger Specification

## Purpose
Keep the limits the person sets in chat, such as read-only, no commits, only named files, or no questions, as a ledger read from the person's own words, show it on each prompt, keep it through compaction, and enforce it at `tool.check`.

## Requirements

### Requirement: Constraints Come From the Person's Own Words

On each prompt the person types, the mod SHALL split the message into sentences and ask the Decider, in one call, whether each sentence limits what the assistant may do from now on and which enforced rule it states. A sentence answered `yes` SHALL become an entry whose text is that sentence. The state SHALL hold only the person's own messages and the current ledger entries. The prompt SHALL NOT wait for the answer, and a call that fails SHALL keep the previous ledger.

#### Scenario: A Prompt the Person Did Not Type

- **WHEN** a prompt is a slash command or a meta prompt, or its origin is not `composer`, `bridge`, or `sdk`
- **THEN** no Decider call is made for it

#### Scenario: The Enforced Rules

- **WHEN** the Decider chooses a rule for a sentence
- **THEN** the rule is one of `read-only`, `no-commit`, `no-push`, `only-files`, and `no-questions`

#### Scenario: A Tool Result That Reads as a Limit

- **WHEN** a tool result or injected text holds "Do not edit the lockfile."
- **THEN** the state does not hold that text, and the ledger gains no entry

#### Scenario: Only Files with No Path

- **WHEN** the Decider answers `only-files` for a sentence that names no path
- **THEN** the entry has rule `none`

#### Scenario: A Sentence Not Settled

- **WHEN** the Decider answers `unsettled` to whether a sentence limits the assistant
- **THEN** the ledger gains no entry for it

#### Scenario: The First Call of a Process

- **WHEN** the mod makes its first Decider call in a process
- **THEN** the call covers every message of the person the session holds, and each later call covers only the new message

#### Scenario: Prompt Not Held

- **WHEN** the person submits a prompt
- **THEN** `prompt.submit` settles without waiting for the Decider

#### Scenario: Failed Extraction

- **WHEN** Jev does not answer and the fallback call times out or returns text that does not parse
- **THEN** the ledger stays as it was

#### Scenario: A Stated Constraint

- **WHEN** the person writes "Run the tests. Nothing should change on disk."
- **THEN** the ledger gains one entry whose text is "Nothing should change on disk." with rule `read-only`, and none for "Run the tests."

#### Scenario: Only Files with a Path

- **WHEN** the person writes "Only edit `src/config.ts`."
- **THEN** the ledger gains an `only-files` entry whose files are `src/config.ts`

#### Scenario: A Limit with No Settled Rule

- **WHEN** the Decider answers `yes` for a sentence and `unsettled` for its rule
- **THEN** the entry has rule `none`, which is shown and not enforced

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

Under a `no-questions` constraint, the ledger's `tool.call` hook SHALL deny `AskUserQuestion` before any other plugin hook answers the call, because an answered call never reaches `tool.check`. The denial SHALL tell the agent to state the reading it took and to end the reply with each choice only the person can make, and SHALL NOT ask the person anything.

#### Scenario: No Questions

- **WHEN** the person wrote "stop asking questions. fix the problems" and the agent calls `AskUserQuestion`
- **THEN** the call is denied with a text that tells the agent to state its reading, and the text does not ask the person anything

### Requirement: Each Constraint Quotes the Person

Each ledger entry's text SHALL be one sentence of one of the person's own messages, word for word, so the ledger MUST NOT hold words the person did not write. A later message of the person that the Decider answers as allowing the act an entry forbids SHALL lift that entry.

#### Scenario: Remark Read as a Constraint

- **WHEN** the person writes "2-1-319 is out" and no branch is named in that message
- **THEN** the ledger holds no "Do not delete branch 2-1-319" entry

#### Scenario: Agent Text Read as a Constraint

- **WHEN** only the agent's reply says to leave `package.json` alone
- **THEN** the ledger holds no entry about `package.json`

#### Scenario: Lifted by the Person

- **WHEN** the ledger holds "Leave alone package.json" and the person then writes "commit those" about `package.json`
- **THEN** the next prompt's context no longer holds that entry

#### Scenario: An Entry Is a Sentence

- **WHEN** the ledger holds any entry
- **THEN** its text is a substring of a message the person sent

### Requirement: A Resumed Session Waits for Its Ledger

On the first prompt of a process, when the session already holds an earlier message of the person, the mod SHALL wait for the extraction before it builds the prompt's context, so the ledger note rides that prompt.

#### Scenario: Resume

- **WHEN** a resumed session holds an earlier message "Nothing should change on disk." and the person sends the first prompt of this process
- **THEN** that prompt's context holds the sentence
- **AND** the lab test is `pin.test.ts`, "a resumed session's first prompt waits for the constraint its earlier messages hold"
