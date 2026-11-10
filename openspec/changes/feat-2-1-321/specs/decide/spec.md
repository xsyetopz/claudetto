## MODIFIED Requirements

### Requirement: Jev Is a Tool the Model Calls

The plugin MUST register `mcp__claudetto__decide` through `$.tool.register` only when `TYPESAFE_API_KEY` is set in the environment, and MUST read the key from no other place. A request the tool sends MUST carry only the model's question texts, their option labels and descriptions, and the fixed pick and approval texts, and no transcript, file, or path. A hook other than the tool's own MUST reach Jev only through the Decider.

#### Scenario: No Key

- **WHEN** a session starts with no `TYPESAFE_API_KEY`
- **THEN** the tool is not registered, and no request reaches `api.typesafe.ai`

#### Scenario: A Key

- **WHEN** a session starts with `TYPESAFE_API_KEY` set
- **THEN** `mcp__claudetto__decide` is registered after the session's own start

#### Scenario: A Gated Tool Call

- **WHEN** the model calls `Bash`, `Edit`, or any tool other than `mcp__claudetto__decide`
- **THEN** the tool's own code sends no request, and a request reaches `api.typesafe.ai` only when a Decider question set is asked

#### Scenario: What a Request Holds

- **WHEN** the model asks one question with two options
- **THEN** the request body holds the question text, both labels and descriptions, and the fixed texts, and nothing else from the session

#### Scenario: The Removed Option

- **WHEN** the plugin's `userConfig` is read
- **THEN** it holds no `typesafeApiKey` option
