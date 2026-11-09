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

### Requirement: An Ask Waits for the Newest Issues File

While the repository root holds an `ISSUES*.md` file, the ledger SHALL deny either ask tool until the session holds a successful Read, or a Bash read command naming it, of the newest such file by mtime. A session started in a subfolder SHALL be held to the file at the repository root. The denial SHALL name that file.

#### Scenario: Unread Issues File

- **WHEN** the root holds `ISSUES-2026-11-03-2333.md` and a newer `ISSUES-2026-11-05-2100.md`, and the session read only the older one
- **THEN** an ask is denied with a text naming `ISSUES-2026-11-05-2100.md`

### Requirement: A Remark Is Answered Before Any Tool Runs

The ledger's extraction SHALL also class the latest person message as a task, a question, or a remark. On a question or a remark, `tool.check` SHALL deny the turn's first tool batch when no assistant text follows the person message. A task, or a failed extraction, SHALL NOT be held.

#### Scenario: Remark

- **WHEN** the person writes "Who told you to lint the docs?" and the agent's first move is a Grep
- **THEN** the Grep is denied with a text that says to answer from what the session holds, and the retry after it passes
