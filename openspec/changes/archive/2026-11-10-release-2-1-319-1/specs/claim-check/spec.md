## ADDED Requirements

### Requirement: A Popup Answer Is the Person's Words

The `credited` fault SHALL count each answer the person gave through `AskUserQuestion` or `mcp__claudetto__ask-user-question` in this session as the person's words, next to their typed messages.

#### Scenario: Credit to a Popup Choice

- **WHEN** the person picked "feat/2.1.319+1" in the popup and the reply says "as you chose, the branch is `feat/2.1.319+1`"
- **THEN** `credited` does not block

#### Scenario: Credit with No Source

- **WHEN** neither a typed message nor a popup answer holds the choice the reply credits to the person
- **THEN** `credited` blocks once, as before

### Requirement: A Failed Command with a Fix Is Rerun

When the last `Bash` call of the turn failed, the Haiku call SHALL also be offered `unfixed`.

#### Scenario: Last Call Failed

- **WHEN** the last `Bash` call of the turn failed
- **THEN** the Haiku call is offered `unfixed`

### Requirement: A Reply That Reports a Fixable Failure Gets One Block

A reply that reports a failed last `Bash` call as the outcome or a blocker, when the error names a fix the agent can apply itself (a token or env file it holds, a flag, a path, a dependency) and the agent did not rerun, SHALL be blocked once with the text that asks for the fix and the rerun.

#### Scenario: A Flag the Error Names

- **WHEN** `bun run probe` failed with "required option '--env-file <path>' not specified" and the reply says "The probe is blocked: it needs --env-file."
- **THEN** the turn is blocked once with the fix and the rerun
- **AND** the lab test is `limits/verify.test.ts`, "a reply that reports ... as the outcome gets one block that asks for the fix and the rerun"

### Requirement: A Fix Only the Person Can Give Is Not the Unfixed Fault

A fix only the person can give (a `! <command>`, an interactive login with no token in reach, a permission) SHALL NOT be the `unfixed` fault.

#### Scenario: A Fix Only the Person Can Give

- **WHEN** `claude -p hi` failed with "Not logged in" and the reply asks the person to run `! claude` and log in
- **THEN** the turn is not blocked
- **AND** the lab test is `limits/verify.test.ts`, "a failed command whose fix needs the user is not the unfixed fault"

### Requirement: A Turn Whose Last Bash Call Succeeded or Was Denied Is Not Offered Unfixed

A turn whose last `Bash` call succeeded or was denied SHALL NOT be offered `unfixed`.

#### Scenario: The Last Call Succeeded or Was Denied

- **WHEN** the last `Bash` call of the turn succeeded, or was denied
- **THEN** `unfixed` is not offered
- **AND** the lab tests are `limits/verify.test.ts`, "a turn whose last Bash call succeeded is not offered the unfixed fault" and "a turn whose last Bash call was denied is not offered the unfixed fault"

## MODIFIED Requirements

### Requirement: Graded Faults Get One Block

At `classic.Stop`, after the named-files and open-items checks, when none of them blocked, the mod SHALL ask Haiku which of the offered faults (`credited`, `fallback`, `unchecked`, `rules`, `unfixed`, and in an interactive session `options`) the final reply holds. On a finding it SHALL block once with each found fault's fix, and SHALL NOT block when `stop_hook_active` is set or the call fails. The grader SHALL offer no fault for padding, because naming those sentences in the grader text puts their words into context; the output style states the reply's form in positive terms instead. The `options` fault SHALL fire when the reply ends by asking the person to choose in its own text, and its fix SHALL send the agent to `mcp__claudetto__ask-user-question`. A headless session, which no ask reaches, SHALL NOT be offered `options`.

#### Scenario: A Choice in Plain Text

- **WHEN** an interactive reply ends with a choice between options in its own text
- **THEN** `options` is offered, and a finding of it blocks once with the fix that names `mcp__claudetto__ask-user-question`
- **AND** the lab tests are `limits/verify.test.ts`, "every interactive turn is offered the options fault" and "a headless turn, which no ask reaches, is not offered the options fault"

#### Scenario: No Padding Fault

- **WHEN** the grader is offered its faults
- **THEN** none is named `padding`
- **AND** the lab test is `limits/verify.test.ts`, "every interactive turn is offered the options fault"

#### Scenario: A Quote Not in the Reply

- **WHEN** Haiku names an offered fault with a quote that is not a substring of the reply
- **THEN** the finding does not count

#### Scenario: Commit Message on the Person's Word

- **WHEN** the person writes "I fixed it. Write the commit message." and the agent replies with a message and no tool call
- **THEN** the turn is blocked once with the check-the-workspace text

#### Scenario: A Turn That Looked

- **WHEN** the agent ran Read, Grep, or Bash this turn
- **THEN** `unchecked` and `rules` are not offered, and a finding of either does not block
- **AND** the lab test is `limits/verify.test.ts`, "a turn that read the workspace is not offered the unchecked-claim or rules faults"

#### Scenario: A Look That Was Denied or Refused

- **WHEN** the only Read, Grep, or Bash call this turn was denied by a `tool.check` answer, or was an ask the session refused
- **THEN** it is not a look, `unchecked` is offered, and a finding of it blocks once
- **AND** an ask that was allowed and then failed is still a look
- **AND** the lab tests are `limits/verify.test.ts`, "a turn whose only lookup was denied is still offered the unchecked-claim fault", the three "an ask refused with ... is not a lookup" tests, and "an ask that was allowed and then failed is still a lookup"

#### Scenario: The Issues File Was Written

- **WHEN** the stretch since the last Stop wrote an `ISSUES*.md` file
- **THEN** the offered faults are unchanged, because `unfiled` is not a fault and no file write changes the list

#### Scenario: Plain Chat

- **WHEN** Haiku answers `{"faults":[]}`, as for "thanks" or a question about the language
- **THEN** the turn ends unblocked

### Requirement: A Reply That Points at Unseen Tool Output Gets One Block

When the turn ran a tool with output, the same Stop SHALL make one more call, to Sonnet, in parallel with the Haiku call. That call SHALL hold the turn's latest 8 tool results, 400 characters each, labelled as not shown to the user. It SHALL offer `unseen` beside `credited` and `fallback`, and only its `unseen` and `credited` findings SHALL count. A turn with no tool output SHALL make no Sonnet call.

#### Scenario: A Block Named Only in a Diff

- **WHEN** the reply says "`.gitignore` also has the setup block" and that block appears only in this turn's `git diff` output
- **THEN** the turn is blocked once with the `unseen` fix

#### Scenario: Sonnet Finds Another Fault

- **WHEN** Sonnet answers with a `fallback` finding and Haiku answers with none
- **THEN** the turn ends unblocked

#### Scenario: No Tool Output

- **WHEN** no tool this turn returned output
- **THEN** only the Haiku call is made
