## ADDED Requirements

### Requirement: One Module Owns Every Typed Question

The plugin SHALL keep every Decider question, option name, criterion, and threshold, the Jev client, and the fallback call in one module. A caller SHALL pass named state and a question set, and SHALL receive one bounded answer per question name: `yes`, `no`, or `unsettled` for a Noul, and an option name or `unsettled` for a Choice. A caller MUST NOT receive a probability or a `confidence` value.

#### Scenario: One Home for the Host

- **WHEN** the source files under `plugins/*/hooks` are searched for `api.typesafe.ai`
- **THEN** only the Decider module holds it

#### Scenario: A Noul Between Its Thresholds

- **WHEN** Jev answers a Noul with a probability between the question set's two thresholds, and the set does not escalate
- **THEN** the caller receives `unsettled`

#### Scenario: A Choice Below Its Threshold

- **WHEN** the top option of a Choice has a probability below the question set's threshold
- **THEN** the caller receives `unsettled`, not the option

### Requirement: Code Decides from the Answers

Each calling site SHALL map its answers to an action in code, with a row for every combination of answers, `unsettled` among them. A question MUST ask for one judgment about the state, and MUST NOT ask which action to take.

#### Scenario: An Unsettled Row

- **WHEN** a site receives `unsettled` for a question
- **THEN** the site takes the action its table names for that row, and a test with no model call covers the row

### Requirement: Jev Answers First When a Key Is Set

When `TYPESAFE_API_KEY` is set in the environment, the Decider SHALL send one request to Jev that bundles every question of the call over one state, SHALL name the pinned model version `jev-1.14.0`, and SHALL stop waiting after 5,000 ms. In a hook it MUST make one try and MUST NOT retry.

#### Scenario: Jev Settles Every Question

- **WHEN** Jev answers 200 with an answer for each question, each outside its unsettled band
- **THEN** the caller receives those answers and no model call is made

#### Scenario: A Hung Server

- **WHEN** Jev does not answer within 5,000 ms
- **THEN** the Decider makes no second request to Jev and takes the fallback

### Requirement: Haiku Answers When Jev Does Not

The Decider SHALL send the same state and questions to `claude-haiku-5-5` at effort `high`, in one `$.model.complete` call, whenever Jev gives no full set of answers: the key is missing, Jev refuses the key, Jev is unavailable, Jev rejects the request, or the redacted state is over the size bound.

#### Scenario: No Key

- **WHEN** `TYPESAFE_API_KEY` is not set and a site asks a question
- **THEN** no request reaches `api.typesafe.ai`, and Haiku answers

#### Scenario: A Key Only in a Project File

- **WHEN** the key sits only in the project's `.env` file, which the environment reader does not see
- **THEN** the Decider acts as with no key, and `README.md` names the launching shell and the settings `env` block as the places that work

#### Scenario: An Overloaded Server

- **WHEN** Jev answers 429, 529, or a 5xx status
- **THEN** Haiku answers this call, and the next call tries Jev again

#### Scenario: A Request That Throws

- **WHEN** `$.http.fetch` throws, as it does for a closed port and for another plugin's denial of the URL
- **THEN** the Decider catches the throw, logs its text, and Haiku answers this call

#### Scenario: A Status No Other Scenario Names

- **WHEN** Jev answers a status other than 200, 400, 401, 403, 413, 415, 422, 429, 529, or 5xx
- **THEN** Haiku answers this call, the log holds the status, and the next call tries Jev again

#### Scenario: A State over the Size Bound

- **WHEN** the redacted state is longer than the Decider's size bound
- **THEN** no request reaches `api.typesafe.ai`, the log holds the length, and Haiku answers

#### Scenario: A Defective Request

- **WHEN** Jev answers 400, 413, 415, or 422
- **THEN** Haiku answers this call

### Requirement: A Refused Key Turns Jev Off for the Session

After Jev answers 401 or 403, the Decider SHALL send no further request to Jev in that session, and SHALL take the fallback for each later call.

#### Scenario: A Refused Key

- **WHEN** Jev answers 401
- **THEN** Haiku answers this call, and the next call in the session sends nothing to Jev

#### Scenario: A Request with No Usable Key

- **WHEN** Jev answers 403
- **THEN** Haiku answers this call, and the next call in the session sends nothing to Jev

### Requirement: Each Departure from Jev Is Logged

The Decider SHALL log one line with the cause each time it leaves Jev for a reason other than a missing key. The line MUST NOT hold the key. For a rejected request, the line SHALL be an error that holds the status and at most 200 characters of the body.

#### Scenario: The Key Is Not Logged

- **WHEN** Jev answers 401
- **THEN** the log names `TYPESAFE_API_KEY` and not its value

#### Scenario: A Rejected Request

- **WHEN** Jev answers 422
- **THEN** the log holds an error line with the status and at most 200 characters of the body

### Requirement: A Fallback Yes Carries Evidence

The fallback SHALL ask for a JSON answer keyed by question name, in which each `yes` and each chosen option comes with words copied from a state field. The Decider SHALL return `unsettled` for a `yes` or an option whose evidence is not a substring of the state. A reply that is not answered or does not parse SHALL make every question of the call `unsettled`, SHALL be logged with its cause, and MUST NOT be resent.

#### Scenario: Evidence Not in the State

- **WHEN** Haiku answers `yes` to a question with evidence that no state field holds
- **THEN** the caller receives `unsettled` for that question

#### Scenario: A Refusal

- **WHEN** the model call returns `isAnswered: false`
- **THEN** every question is `unsettled`, the log holds the reason, and no second model call is made

#### Scenario: A No Needs No Evidence

- **WHEN** Haiku answers `no` with no evidence
- **THEN** the caller receives `no`

### Requirement: An Unsettled Noul Escalates Where the Site Asks

A question set MAY ask for escalation. For such a set, the Decider SHALL send each Noul that Jev leaves between its thresholds to the fallback, with the same state, and SHALL return the fallback's answer for it.

#### Scenario: One Question in the Band

- **WHEN** Jev settles four Nouls of an escalating set and leaves a fifth between its thresholds
- **THEN** one model call asks only the fifth, and the caller receives Jev's four answers and the fallback's fifth

#### Scenario: A Set That Does Not Escalate

- **WHEN** Jev leaves a Noul of a non-escalating set between its thresholds
- **THEN** no model call is made, and the caller receives `unsettled`

### Requirement: Session Text Reaches TypeSafe Only with a Key and Only Redacted

The Decider SHALL pass each string of the state through the plugin's secret scan as raw text before it builds a request to Jev, and SHALL build the request from the redacted strings. It MUST NOT scan the serialised request instead, because a rule anchored to the start of a line misses a secret there. When the scan fails, it MUST send nothing to Jev and SHALL take the fallback. With no key set, no hook SHALL send any request to `api.typesafe.ai`.

#### Scenario: A Token in Tool Output

- **WHEN** the state holds a value the secret scan flags
- **THEN** the request to Jev holds the redacted value

#### Scenario: A Secret After a Line Break

- **WHEN** a state field holds a line break followed by `export API_TOKEN=` and a value
- **THEN** the request to Jev holds the redacted value

#### Scenario: The Scan Fails

- **WHEN** the secret scan cannot run
- **THEN** no request reaches `api.typesafe.ai`, Haiku answers, and the log names the scanner and the step that installs it

### Requirement: A Threshold Changes Only with a Recorded Run

Each question set SHALL carry its own thresholds beside its questions. A site SHALL move to the Decider, and a threshold or a question's wording SHALL change, only with a recorded run on stored cases that keeps each case's exact request payload, and the run MUST include cases that were not used to choose the wording or the threshold. A test MUST NOT assert an exact probability from a live answer.

#### Scenario: A Site Without a Run

- **WHEN** no recorded run exists for a site
- **THEN** the site keeps its current code, and the release ships no change to it

#### Scenario: A Run That Scores Lower

- **WHEN** the Decider scores below the current code on the held-out cases of a site
- **THEN** the site keeps its current code
