## ADDED Requirements

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
- **THEN** the reply lists both lines and ends with the give-back text (`judge.test.ts`, "the reply asks for the unanswered ones and lists one line per question")

#### Scenario: All Answered

- **WHEN** every question has a verdict
- **THEN** the reply holds the lines and no give-back text

#### Scenario: Failed Request

- **WHEN** the server answers 401
- **THEN** the reply holds the status, no key, and the give-back text (`decide.test.ts`, "A 401 is not retried and the key is in no answer")
