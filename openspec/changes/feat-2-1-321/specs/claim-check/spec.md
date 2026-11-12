## MODIFIED Requirements

### Requirement: Graded Faults Get One Block

At `classic.Stop`, after the named-files and open-items checks, when none of them blocked, the mod SHALL ask Haiku which of the offered faults the final reply holds. On a finding it SHALL block once with each found fault's fix, and SHALL NOT block when `stop_hook_active` is set or the call fails. The grader SHALL offer no fault for padding. The `options` fault SHALL fire when the reply ends by asking the person to choose in its own text, and a headless session SHALL NOT be offered it.

#### Scenario: The Offered Faults

- **WHEN** the grader is offered its faults
- **THEN** they are `credited`, `fallback`, `deferred`, `unchecked`, `rules`, `unfixed`, and in an interactive session `options`

#### Scenario: A Choice in Plain Text

- **WHEN** an interactive reply ends with a choice between options in its own text
- **THEN** `options` is offered, and a finding of it blocks once with the fix that SHALL send the agent to `AskUserQuestion`
- **AND** a headless session SHALL NOT be offered `options`, because no ask reaches a headless session
- **AND** the lab tests are `limits/verify.test.ts`, "every interactive turn is offered the options fault" and "a headless turn, which no ask reaches, is not offered the options fault"

#### Scenario: Work Left to the Person

- **WHEN** a reply checks part of a set, leaves a guess untested, or names a run it could make as the next step
- **THEN** `deferred` is offered in every session, and a finding of it blocks once with the fix that tells the agent to do that work and report what it shows
- **AND** the lab tests are `limits/verify.test.ts`, "a headless turn is still offered the deferred fault" and "the deferred fault blocks once with its own fix"

#### Scenario: No Padding Fault

- **WHEN** the grader is offered its faults
- **THEN** none is named `padding`, because naming those sentences in the grader text puts their words into context, and the output style states the reply's form in positive terms instead
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

### Requirement: A Popup Answer Is the Person's Words

The `credited` fault SHALL count each answer the person gave through `AskUserQuestion` in this session as the person's words, next to their typed messages.

#### Scenario: Credit to a Popup Choice

- **WHEN** the person picked "feat/2.1.319+1" in the popup and the reply says "as you chose, the branch is `feat/2.1.319+1`"
- **THEN** `credited` does not block

#### Scenario: Credit with No Source

- **WHEN** neither a typed message nor a popup answer holds the choice the reply credits to the person
- **THEN** `credited` blocks once, as before

## ADDED Requirements

### Requirement: A Paid Tool Runs on the Subscription Login

Each tool in `tools/` that starts a paid Claude Code run SHALL drop `ANTHROPIC_API_KEY` from the run's environment, and the paid handover probe SHALL ask for `CLAUDE_CODE_OAUTH_TOKEN` only. No tool or plugin text SHALL tell the person to set `ANTHROPIC_API_KEY`.

#### Scenario: Key in the Shell

- **WHEN** the person's shell exports `ANTHROPIC_API_KEY` and a paid tool launches `claude`
- **THEN** the child's environment holds no `ANTHROPIC_API_KEY`

#### Scenario: Paid Probe with Only a Key

- **WHEN** `--paid` runs with `ANTHROPIC_API_KEY` set and no `CLAUDE_CODE_OAUTH_TOKEN`
- **THEN** the probe stops with an error that names `CLAUDE_CODE_OAUTH_TOKEN`
