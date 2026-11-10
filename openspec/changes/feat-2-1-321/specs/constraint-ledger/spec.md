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

### Requirement: A Remark Is Answered Before Any Tool Runs

The same Decider call SHALL also class the latest person message as a task, a dispute, a question, or a remark. On a question or a remark, `tool.check` SHALL deny the turn's first tool batch when no assistant text follows the person message, except that a question's calls that change nothing SHALL pass. A task, an `unsettled` class, or a failed call SHALL NOT be held. The class SHALL follow the person's own words.

#### Scenario: A Dispute

- **WHEN** the Decider classes the message as a dispute
- **THEN** this requirement holds nothing, and the dispute requirement decides the turn's first batch

#### Scenario: Pasted Report with a Request

- **WHEN** the person pastes the agent's last report and adds "Continue from here and handle them as you go about."
- **THEN** the message is a task and the first `Bash` call is not denied

#### Scenario: Remark

- **WHEN** the person writes "Who told you to lint the docs?" and the agent's first move is a Grep
- **THEN** the Grep is denied with a text that says to answer from what the session holds, and the retry after it passes

#### Scenario: A Question Needs a Lookup

- **WHEN** the person asks a question about the code and the agent's first call is `Read`, `Grep`, `Glob`, or `ListAgents`
- **THEN** the call passes, because it changes nothing
- **AND** a first call that writes or runs a command is denied, and so is a sibling call of the same batch

#### Scenario: A Class Not Settled

- **WHEN** the Decider answers `unsettled` for the message's class
- **THEN** the message is a task and the first tool batch is not denied

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
