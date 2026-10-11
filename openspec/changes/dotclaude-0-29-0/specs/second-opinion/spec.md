## MODIFIED Requirements

### Requirement: Tool loading

The tool SHALL be deferred, with or without `TYPESAFE_API_KEY` (design D16).
When the key is not set, its description SHALL limit it to decisions that are hard to undo.

#### Scenario: Start cost with the key

- **WHEN** a session starts with the snippet applied and the key set
- **THEN** the request has the tool name in the deferred list only, and no second-opinion skill line and no second-opinion session note

#### Scenario: Start cost without the key

- **WHEN** a session starts with the snippet applied and no key
- **THEN** the request has the tool name in the deferred list only

### Requirement: Question pick only with a key

The `AskUserQuestion` hook of Jev SHALL run only when `TYPESAFE_API_KEY` is set, and SHALL leave the question unchanged when Jev fails.
The hook SHALL keep the text of each question unchanged, put the pick of Jev in an option description, and skip each multi-select question, because the answers come back keyed by the question text.

#### Scenario: No key

- **WHEN** Claude calls `AskUserQuestion` with no key
- **THEN** the question reaches the user unchanged

#### Scenario: Answers keep their keys

- **WHEN** the hook adds a pick to a single-select question and the user answers
- **THEN** the answer comes back under the question text that Claude sent

#### Scenario: Multi-select question

- **WHEN** Claude calls `AskUserQuestion` with a multi-select question
- **THEN** the hook leaves that question unchanged, and the answers of the user come back
