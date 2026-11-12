## MODIFIED Requirements

### Requirement: Check Before Each Action

The observer SHALL consider a check before each main-loop tool call, only on the `terminal` or `desktop` surface. It SHALL skip a subagent's call, a question to the person (`AskUserQuestion`), and a call to a tool that changes nothing: `Read`, `Grep`, `Glob`, `ToolSearch`, `WebSearch`, `WebFetch`, and `ListAgents`. The call SHALL wait for the check, whose log ends with the call.

#### Scenario: Nothing to Say

- **WHEN** the check replies `learn: none`
- **THEN** the call runs

#### Scenario: A Subagent Call

- **WHEN** a subagent calls `Bash`
- **THEN** no check runs

### Requirement: One Bounded Request

A check MUST make one `$.model.complete` request with the model and effort from the options, `maxTokens` 512, and `timeoutMs` 20,000, whose body is the lines already shown, the lines the person knows, the last 3 of the person's messages that left the log, of at most 400 characters each, and the last 8 log entries of at most 800 characters each, at most 8,000 characters in all. A message the person sent asks for what it names, so the check MUST NOT note an action the person asked for. A request the model does not answer SHALL be logged with its reason and SHALL let the call run.

#### Scenario: A Long Session

- **WHEN** the log holds more than 8 entries
- **THEN** the request carries only the last 8, each cut to its bound

#### Scenario: A Request Before a Burst of Calls

- **WHEN** the person sends a message and the assistant then makes 9 tool calls
- **THEN** the next request still carries that message

#### Scenario: A Request With No Answer

- **WHEN** the model returns no reply, with reason `aborted`
- **THEN** the log holds `The side check was not answered (aborted)` and the call runs

#### Scenario: A Request Bounded in Time

- **WHEN** a check starts
- **THEN** the request carries `timeoutMs` 20,000

## ADDED Requirements

### Requirement: A Note States Only What the Digest Shows

The fixed instructions of a check SHALL tell the model to say only what the digest shows, and that a password or secret inside a command, such as an `osascript` keystroke or a Terminal window it drives, was not typed into the chat unless a message from the person holds it.

#### Scenario: An osascript Keystroke

- **WHEN** the call is `osascript -e 'tell application "System Events" to keystroke "…"'`
- **THEN** the request carries that rule in its cached instructions block

### Requirement: A Note Speaks the Person's Language

The fixed instructions of a check SHALL tell the model to write the line in the language of the person's messages.

#### Scenario: The Instructions

- **WHEN** a check starts
- **THEN** its cached instructions block asks for the line in the language of the person's messages
