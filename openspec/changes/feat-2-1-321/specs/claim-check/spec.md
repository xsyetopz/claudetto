## MODIFIED Requirements

### Requirement: Graded Faults Get One Block

At `classic.Stop`, after the named-files and open-items checks, when none of them blocked, the mod SHALL ask the Decider, in one call over one state, the Nouls of each offered fault (`credited`, `fallback`, `deferred`, `unchecked`, `rules`, `unfixed`, and in an interactive session `options`). Each Noul SHALL ask one judgment, and code SHALL decide each fault from its Nouls. On a finding it SHALL block once with each found fault's fix. It SHALL NOT block when `stop_hook_active` is set, and a fault SHALL NOT hold when a Noul it needs is `unsettled` or when the Decider fails, and a failure SHALL be logged with its cause. The Decider SHALL be asked about no fault for padding, because naming those sentences in a question puts their words into context; the output style states the reply's form in positive terms instead. The `options` fault SHALL fire when the reply ends by asking the person to choose in its own text, and its fix SHALL send the agent to `mcp__claudetto__ask-user-question`. A headless session, which no ask reaches, SHALL NOT be offered `options`.

#### Scenario: A Choice in Plain Text

- **WHEN** an interactive reply ends with a choice between options in its own text
- **THEN** `options` is offered, and a finding of it blocks once with the fix that names `mcp__claudetto__ask-user-question`

#### Scenario: Work Left to the Person

- **WHEN** a reply checks part of a set, leaves a guess untested, or names a run it could make as the next step
- **THEN** `deferred` is offered in every session, each of those three is its own Noul, and a `yes` to any of them blocks once with the fix that tells the agent to do that work and report what it shows

#### Scenario: No Padding Fault

- **WHEN** the Decider is asked its questions
- **THEN** no question and no fault is named `padding`

#### Scenario: A Quote Not in the Reply

- **WHEN** the fallback answers `yes` to a Noul with evidence that the state does not hold
- **THEN** the finding does not count

#### Scenario: Commit Message on the Person's Word

- **WHEN** the person writes "I fixed it. Write the commit message." and the agent replies with a message and no tool call
- **THEN** the turn is blocked once with the check-the-workspace text

#### Scenario: A Turn That Looked

- **WHEN** the agent ran Read, Grep, or Bash this turn
- **THEN** the Nouls of `unchecked` and `rules` are not asked, and neither fault blocks

#### Scenario: A Look That Was Denied or Refused

- **WHEN** the only Read, Grep, or Bash call this turn was denied by a `tool.check` answer, or was an ask the session refused
- **THEN** it is not a look, `unchecked` is offered, and a finding of it blocks once
- **AND** an ask that was allowed and then failed is still a look

#### Scenario: The Issues File Was Written

- **WHEN** the stretch since the last Stop wrote an `ISSUES*.md` file
- **THEN** the offered faults are unchanged, because `unfiled` is not a fault and no file write changes the list

#### Scenario: Plain Chat

- **WHEN** the Decider answers `no` to every Noul, as for "thanks" or a question about the language
- **THEN** the turn ends unblocked

#### Scenario: One Request for Every Fault

- **WHEN** a Stop offers five faults and a key is set
- **THEN** one request reaches Jev with the Nouls of all five, and no model call is made when Jev settles each one

#### Scenario: Both Roads Fail

- **WHEN** Jev does not answer and the fallback call is not answered
- **THEN** the turn ends unblocked, and the log holds both causes

### Requirement: A Failed Command with a Fix Is Rerun

When the last `Bash` call of the turn failed, the Decider call SHALL also ask the Nouls of `unfixed`, and its state SHALL hold the failed command and its error.

#### Scenario: Last Call Failed

- **WHEN** the last `Bash` call of the turn failed
- **THEN** the Decider call asks the `unfixed` Nouls, and its state holds the command and the error

## REMOVED Requirements

### Requirement: A Reply That Points at Unseen Tool Output Gets One Block

**Reason**: The requirement fixes a second, parallel call to Sonnet and a rule about which of Sonnet's findings count. The Decider asks the `unseen` judgment in the same request as the other faults, so the Stop makes no Sonnet call.

**Migration**: "The Unseen Fault Rides the Same Decider Call" keeps the fault, its fix, the 8 results of 400 characters each, and the scenarios "A Block Named Only in a Diff" and "No Tool Output". The scenario "Sonnet Finds Another Fault" has no successor, because no second model answers.

## ADDED Requirements

### Requirement: The Unseen Fault Rides the Same Decider Call

When the turn ran a tool with output, the same Decider call SHALL hold the turn's latest 8 tool results, 400 characters each, in a state field named as hidden from the user, and SHALL ask the Nouls of `unseen`. The fault SHALL hold when the reply points by name alone at something only that field holds. The Stop SHALL make no second model call for this fault.

#### Scenario: A Block Named Only in a Diff

- **WHEN** the reply says "`.gitignore` also has the setup block" and that block appears only in this turn's `git diff` output
- **THEN** the turn is blocked once with the `unseen` fix

#### Scenario: The Text Was Already Shown

- **WHEN** the reply names a block whose text an earlier assistant message gave
- **THEN** `unseen` does not hold

#### Scenario: No Tool Output

- **WHEN** no tool this turn returned output
- **THEN** the request holds no tool output field and no `unseen` Noul
