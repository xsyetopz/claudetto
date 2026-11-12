## MODIFIED Requirements

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

### Requirement: A No-Questions Constraint Holds the Ask Tools

Under a `no-questions` constraint, the ledger's `tool.call` hook SHALL deny `AskUserQuestion` before any other plugin hook answers the call, because an answered call never reaches `tool.check`. The denial SHALL tell the agent to state the reading it took and to end the reply with each choice only the person can make, and SHALL NOT ask the person anything.

#### Scenario: No Questions

- **WHEN** the person wrote "stop asking questions. fix the problems" and the agent calls `AskUserQuestion`
- **THEN** the call is denied with a text that tells the agent to state its reading, and the text does not ask the person anything

## REMOVED Requirements

### Requirement: A Remark Is Answered Before Any Tool Runs

**Reason**: The gate denied work the person had asked for. Of its 132 denials in three days of sessions, eight are recorded as false, among them the call after "Now it's active", a message that reported the step the agent had waited on. The class of a message is a judgment no hook settles without such misses, and the person chose on 2026-11-12 to delete the gate with its classifier question and its tests.

**Migration**: No tool call is held for an answer, and the ledger's Decider call no longer asks what kind of message the person sent. The root prompt still says that a question wants an answer and then a wait, and the Concise style still opens a reply with the outcome. The ledger's entries and their enforcement are unchanged.

### Requirement: A Dispute Is Settled by Running the Disputed Code

**Reason**: It was an exception to the answer-first gate, which let a dispute's first `Bash` call pass and held its first edit. With the gate gone, no call is held, so the exception has nothing to except.

**Migration**: None. A command and an edit after a dispute both pass, unless a ledger entry forbids them. The Concise style still tells the agent to run the check when the person disputes a reply.

### Requirement: A Compaction Ends the Remark Turn

**Reason**: It reset the message kind at `session.compact` so the answer-first gate would not read the summary as an unanswered remark. No kind is kept any more.

**Migration**: None. A list of faults the person pastes is read sentence by sentence under "Constraints Come From the Person's Own Words", and a sentence becomes an entry only on a `yes`.
