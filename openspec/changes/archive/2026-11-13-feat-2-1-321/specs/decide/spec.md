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

## ADDED Requirements

### Requirement: Advisor Is a Tool and a Command on One Function

The plugin MUST register `mcp__claudetto__advisor` and the command `advisor` at session start, and both MUST call one function that makes one `$.model.complete` request at `high` effort. The request MUST hold the question and the content of the files the asker names, read through `$.fs.read`, and nothing else of the session. The tool's description and the command's MUST each hold at most 200 characters.

#### Scenario: Registered

- **WHEN** a session starts
- **THEN** the tool `advisor` and the command `advisor` are registered
- **AND** the lab tests `the tool is registered` and `session.start registers /advisor` check it

#### Scenario: What a Request Holds

- **WHEN** the model calls the tool with a question and two files
- **THEN** one request goes out at `high` effort, holding the question and both files, and the text of the answer is the result
- **AND** the lab tests `one model call at high effort carries the question and the named files, and its text comes back` and `a call with no files sends the question alone` check it

#### Scenario: A File Named Twice

- **WHEN** a path is given twice, as a relative path and as the absolute path
- **THEN** the file is read and sent once
- **AND** the lab test `a file named twice is read and sent once` checks it

#### Scenario: Another Tool Passes On

- **WHEN** the model calls `Bash`
- **THEN** the advisor code sends no request
- **AND** the lab test `a tool other than advisor passes on` checks it

#### Scenario: Description Length

- **WHEN** `tools/descriptions.test.ts` runs
- **THEN** the tool's description and the command's description are each at most 200 characters

### Requirement: Advisor Asks Fable, or Mythos Where the Account Has It

The request MUST name `claude-fable-5-2`, or `claude-mythos-5-2` when `ANTHROPIC_DEFAULT_FABLE_MODEL` names it, the choice the `fable` alias makes for the `sweep` agent. The function MUST send a full ID, because the lab rule on `$.model.complete` refuses an alias.

#### Scenario: A Mythos Account

- **WHEN** `ANTHROPIC_DEFAULT_FABLE_MODEL` is `claude-mythos-5-2`
- **THEN** the request goes to `claude-mythos-5-2`, and to `claude-fable-5-2` otherwise
- **AND** the lab tests `an account whose fable alias names Mythos asks Mythos` and `one model call at high effort carries the question and the named files, and its text comes back` check it

### Requirement: Advisor Sends Nothing It Could Not Check

The question and each file MUST pass the secret scanner before the send. The function MUST send nothing when the scanner fails, when `$.tool.check` denies a `Read` of a file, when a file cannot be read, when the question is empty or not text, when `files` is not a list, or when the text passes 400,000 characters. The result MUST then say why.

#### Scenario: Secrets

- **WHEN** the question or a file holds a secret the scanner finds
- **THEN** the request holds `[REDACTED]` in its place
- **AND** when the scanner fails, no request goes out
- **AND** the lab tests `a secret in the question or a file is replaced before the send` and `a scanner that fails stops the send` check it

#### Scenario: A File Refused

- **WHEN** the session's read rules deny a file, or a file cannot be read
- **THEN** the result names the path and no request goes out
- **AND** the lab tests `a file the read rules deny is refused and nothing is sent` and `a file that cannot be read is named and nothing is sent` check it

#### Scenario: Bad Input and a Failed Model

- **WHEN** the question is empty or not text, `files` is not a list, or the model gives no text
- **THEN** the result says what to send or the reason, and no request goes out for the first two
- **AND** the lab tests `a question that is empty or not text sends nothing` and `a model that gives no text, or a refused request, comes back as a reason` check it

### Requirement: The Advisor Command Takes Each @path Word as a File

`/claudetto:advisor <question>` MUST take each `@path` word of the question as a file, send both through the function, and show the answer as the command's text. An empty question MUST get the usage text and no request.

#### Scenario: The Command

- **WHEN** a person runs `/claudetto:advisor Which queue for @a.ts?`
- **THEN** the question and `a.ts` go through the function and the answer is the command's text
- **AND** the lab tests `/advisor sends the question and each @-named file through the advisor call` and `/advisor with no question says how to use it and sends nothing` check it

### Requirement: Setup Turns the Built-In Advisor Off

Setup MUST write `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` with the value `1` in the env of its Features off group, so this tool is the only advisor.

#### Scenario: Setup Writes the Key

- **WHEN** setup writes the Features off group
- **THEN** its `env` holds `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` with the value `1`
- **AND** the lab test `the features-off group ends a silent background subagent, quiets the turn reminder, and writes no script caps` checks it
