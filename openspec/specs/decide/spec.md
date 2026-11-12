# decide Specification

## Purpose
Jev, a tool the model calls to settle a choice or a yes/no question by probability, with a threshold and a deadline per try.

## Requirements

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

### Requirement: A Choice Is Thresholded on Its Probability

The tool MUST return Jev's pick only when `probabilities[choice]` is at least 0.75, the approval Noul's P(yes) is below 0.2, the question is single-select, and the pick names one of the options. Otherwise it MUST hand the question back to the model for the user. It MUST NOT threshold on `confidence`.

#### Scenario: Four Options With a Weak Top Choice

- **WHEN** a 4-option Choice returns probabilities 0.61, 0.37, 0.02, and 0.0 with `confidence` 0.48
- **THEN** the tool hands the question back, because 0.61 is below 0.75

#### Scenario: Two Options at the Baseline Bar

- **WHEN** a 2-option Choice returns its top probability at 0.75 or above, and the approval P(yes) is below 0.2
- **THEN** the tool returns the pick, as the baseline did at `confidence` 0.5

#### Scenario: A Risky Approval

- **WHEN** the approval Noul returns P(yes) 0.94
- **THEN** the tool hands the question back, whatever the pick's probability

#### Scenario: Multi-Select

- **WHEN** the question allows several answers
- **THEN** the tool hands it back without a request

### Requirement: A Yes/No Question Is Thresholded on P(yes)

A question with no options MUST be asked as a Noul. The tool MUST answer yes when P(yes) is at least 0.7 and no when it is at most 0.3, and MUST hand the question back between those bounds.

#### Scenario: A Confident Yes

- **WHEN** a yes/no question returns P(yes) 0.7 or more
- **THEN** the tool answers yes with the probability

#### Scenario: The Middle Band

- **WHEN** a yes/no question returns P(yes) between 0.3 and 0.7
- **THEN** the tool hands the question back

### Requirement: Each Try Has Its Own Deadline

Each try MUST stop waiting after 5,000 ms, because `$.http.fetch` waits do not count against the hook budget and the fetch takes no `signal`. The tool MUST retry only on a 429 or 529 reply, at most 3 tries, with backoff of 1,000 ms doubling, and MUST NOT retry a missed deadline. A call MUST end within 18 s of wall time.

#### Scenario: A Hung Server

- **WHEN** the server never answers
- **THEN** the tool hands the question back after one try of 5 s, and does not wait for the fetch's 30 s cap

#### Scenario: Slow Overload Replies

- **WHEN** the server answers 529 just under 5 s twice and then never answers
- **THEN** the tool hands the question back after about 18 s: 3 tries of up to 5 s and 3 s of backoff

#### Scenario: A 400 or 422

- **WHEN** the server answers 400 or 422
- **THEN** the tool hands the question back after one try, with the status and at most 200 characters of the body

### Requirement: A Malformed Call Passes Through

The `tool.call` hook on `mcp__claudetto__decide` (`decide.ts:14-19`) MUST call `next` with the call unchanged, and send no request, when no key is set or when `questions` is not a non-empty list of entries that each hold a string `question`. One entry with no text voids the whole list (`judge.ts:30-39`). The tool MUST NOT return a made-up answer for such a call.

#### Scenario: Empty List

- **WHEN** the model calls `mcp__claudetto__decide` with `questions: []`
- **THEN** the call passes on to the engine and no request reaches `api.typesafe.ai` (`decide.test.ts`, "A call with an empty questions list sends nothing")

#### Scenario: One Entry With No Text

- **WHEN** one entry of the list has no string `question`
- **THEN** the whole list is not taken and the call passes on (`judge.test.ts`, "one entry with no text voids the list")

### Requirement: Each Question Carries an Approval Check

Each question sent to Jev MUST be keyed by its index, and MUST be paired with a second Noul `approval_<i>` that asks, "Does question <i> ask the user to approve money, a push, a release, a delete, or a step with no undo?" (`judge.ts:46-47,91`). A question with no `approval_<i>` answer, or with P(yes) of 0.2 or more, MUST be handed back even when its pick passes (`judge.ts:136-140`). A multi-select question, and a question with exactly one option, MUST be left out of the request.

#### Scenario: Request Keys

- **WHEN** the model asks one question with two options
- **THEN** the request holds `pick_0` and `approval_0` (`decide.test.ts`, "What a Request Holds")

#### Scenario: Yes/No Keys

- **WHEN** the model asks one question with no options
- **THEN** the request holds `yes_0` and `approval_0` (`decide.test.ts`, "A yes/no question is answered at P(yes) 0.7 or more")

#### Scenario: Missing Approval

- **WHEN** the reply holds a confident pick and no `approval_0`
- **THEN** the question is handed back (`judge.test.ts`, "a pick with no approval answer is not made")

### Requirement: An Unanswered Question Is Handed Back in the Reply

The reply MUST hold one line per question (`texts.ts:322-326`), and when any question has no verdict MUST end with `JEV_GIVE_BACK` (`texts.ts:319-320`), which tells the model to decide it and state the assumption, or to put it to the user with `AskUserQuestion`. A failed request MUST give `Jev gives no answer: <why>` and `JEV_GIVE_BACK` (`judge.ts:162-164`), and the tool MUST NOT throw.

#### Scenario: Line Forms

- **WHEN** one question has a pick and another has none
- **THEN** the lines read `Jev picks `X` for "Q" (probability 0.NN).` and `Jev gives no answer to "Q".`

#### Scenario: Mixed Answers

- **WHEN** one question has a verdict and another has none
- **THEN** the reply lists one line per question and ends with the give-back text

#### Scenario: All Answered

- **WHEN** every question has a verdict
- **THEN** the reply holds the lines and no give-back text

#### Scenario: Failed Request

- **WHEN** the server answers 401
- **THEN** the reply holds the status, no key, and the give-back text (`decide.test.ts`, "A 401 is not retried and the key is in no answer")

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
