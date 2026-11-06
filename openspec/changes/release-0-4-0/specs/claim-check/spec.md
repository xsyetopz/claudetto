## Purpose

Before a reply reaches the person, grade it for the faults the ISSUES files record, and send it back once with each fault's fix.

## ADDED Requirements

### Requirement: Graded Faults Get One Block

At `classic.Stop`, after the named-files and open-items checks, when none of them blocked, the mod SHALL ask Haiku which of the offered faults (`credited`, `fallback`, `unchecked`, `rules`, `unfiled`) the final reply holds. On a finding it SHALL block once with each found fault's fix, and SHALL NOT block when `stop_hook_active` is set or the call fails.

#### Scenario: A Quote Not in the Reply

- **WHEN** Haiku names an offered fault with a quote that is not a substring of the reply
- **THEN** the finding does not count

#### Scenario: Commit Message on the Person's Word

- **WHEN** the person writes "I fixed it. Write the commit message." and the agent replies with a message and no tool call
- **THEN** the turn is blocked once with the check-the-workspace text

#### Scenario: A Turn That Looked

- **WHEN** the agent ran Read, Grep, or Bash this turn
- **THEN** `unchecked` and `rules` are not offered, and a finding of either does not block

#### Scenario: The Issues File Was Written

- **WHEN** the stretch since the last Stop wrote an `ISSUES*.md` file
- **THEN** `unfiled` is not offered

#### Scenario: Plain Chat

- **WHEN** Haiku answers `{"faults":[]}`, as for "thanks" or a question about the language
- **THEN** the turn ends unblocked

### Requirement: A Reply That Points at Unseen Tool Output Gets One Block

When the turn ran a tool with output, the same Stop SHALL make one more call, to Sonnet, in parallel with the Haiku call. That call SHALL hold the turn's latest 8 tool results, 400 characters each, labelled as not shown to the user. It SHALL offer `unseen` beside `credited`, `fallback`, and `unfiled`, and only its `unseen` finding SHALL count. A turn with no tool output SHALL make no Sonnet call.

#### Scenario: A Block Named Only in a Diff

- **WHEN** the reply says "`.gitignore` also has the setup block" and that block appears only in this turn's `git diff` output
- **THEN** the turn is blocked once with the `unseen` fix

#### Scenario: Sonnet Finds Another Fault

- **WHEN** Sonnet answers with a `credited` finding and Haiku answers with none
- **THEN** the turn ends unblocked

#### Scenario: No Tool Output

- **WHEN** no tool this turn returned output
- **THEN** only the Haiku call is made
