# side-notes Specification

## Purpose
claudetto shows a short "you should know" note above the prompt when something in the session needs the attention of the user, with no model request of its own.

## Requirements

### Requirement: No Model Request

The notes SHALL come only from rules on hook events and from text that the main agent already wrote in its reply.
The slice SHALL make no call of `$.model.complete`, `$.model.fork`, or `$.model.classify`.

#### Scenario: Request Count

- **WHEN** a sandbox session of 5 turns shows 2 notes
- **THEN** the session has as many API requests as the same session with the slice off

### Requirement: Rule Notes

The slice SHALL show a note for each of these events: the same permission ask or deny 3 times in one session, the same check command that fails 3 times in a row, a background task that runs more than 30 minutes with no output, and a user edit that `git status` shows in a file that the agent edits next.

#### Scenario: Repeated Deny

- **WHEN** a `deny` rule stops 3 `Bash` calls with the same rule in one session
- **THEN** a note above the prompt names the rule and the settings file that holds it

#### Scenario: Check Loop

- **WHEN** `just check` fails 3 times in a row with the same failing test
- **THEN** a note names the test and the count

### Requirement: Learn Block

When a main reply ends with a `learn:` line, a `tag:` line, and an `explain:` block, the slice SHALL remove the block from the shown and stored reply, also in `-p` output, and show "<tag> · <line>" above the prompt.
`learn: none` SHALL show nothing.
The body of `claudetto:main` SHALL give the rubric of the built-in mod: a note only when the main session cannot cover it and it is relevant and consequential.

#### Scenario: Learn Reply

- **WHEN** a main reply ends with `learn: IS_DEMO also skips the trust dialog.` and `tag: Heads up`
- **THEN** the band above the prompt shows "Heads up · IS_DEMO also skips the trust dialog."

#### Scenario: Learn None

- **WHEN** a main reply ends with `learn: none`
- **THEN** the slice shows no note, and the reply shows no block

### Requirement: Note Keys

The note SHALL stay for 2 prompts.
One key SHALL put "Here is a note offered by a side agent:" with the explanation into the prompt box, and one key SHALL turn notes off.

#### Scenario: Note into Prompt

- **WHEN** a note shows and the user presses its insert key
- **THEN** the prompt box holds the note text and its explanation

#### Scenario: Notes Off

- **WHEN** the user presses the off key
- **THEN** no note shows until the user turns notes on again

### Requirement: Back-Off and Dedupe

After `n` notes in a row that the user types past, the slice SHALL skip the next `2^(n-3)` checks for `n` of 3 or more, up to 16, as the built-in mod does (binary 2.1.309 `chunk-82wcyxds.js`).
A line that matches one of the last 50 lines SHALL show no note.

#### Scenario: Ignored Notes

- **WHEN** the user types past 4 notes in a row
- **THEN** the next 2 checks are skipped

#### Scenario: Repeat Line

- **WHEN** a new line matches a line shown 10 notes earlier
- **THEN** no note shows

### Requirement: One Note at a Time

The slice SHALL show at most one note.

#### Scenario: Second Note

- **WHEN** a note shows and a rule fires
- **THEN** the newer note replaces the older one
