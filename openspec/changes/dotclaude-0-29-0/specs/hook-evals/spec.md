## ADDED Requirements

### Requirement: Eval for each hook

Each dotclaude hook SHALL have an eval of its allow path, its block or deny path, the exact text that the session and the user see, its cost for each turn, and its false-block rate on correct messages (design D15).
A release SHALL NOT ship a hook whose eval fails.

#### Scenario: Hook with no eval

- **WHEN** a hook file has no eval case
- **THEN** `just check` fails and names the hook

### Requirement: Clean block text

A block text SHALL hold only the reason and the action for the session.
A block text with instructions for an evaluator, an unfilled placeholder such as `$ARGUMENTS`, or text that conflicts with the block reason SHALL fail the eval.

#### Scenario: Evaluator prompt in the block

- **WHEN** a hook blocks and the text that the session gets holds the evaluator rules
- **THEN** the eval fails

### Requirement: Cost for each turn

The eval SHALL record the model requests and the tokens that a hook adds to each turn.
A hook that adds a model request to each turn SHALL have the reason in the wiki, and an eval that shows its value.

#### Scenario: Prompt hook

- **WHEN** a hook of type `prompt` runs at each `Stop`
- **THEN** the eval records one extra request for each turn, and the wiki gives the reason or the hook goes

### Requirement: False blocks

The eval SHALL run each blocking hook on a set of correct messages, and record the rate of blocks.

#### Scenario: Correct report

- **WHEN** the `Stop` hook gets a correct final report
- **THEN** it does not block

#### Scenario: Repeated block

- **WHEN** the `Stop` hook blocks a reply, and the next reply repeats the blocked text
- **THEN** the eval records whether the hook blocks again, and a pass of the same text fails the eval

### Requirement: Compound commands

A guard that checks a `Bash` command SHALL check each part of a compound command split on `;`, `|`, `&&`, and `||`.

#### Scenario: Read in a compound command

- **WHEN** an agent runs a print of a whole file followed by `; ls`
- **THEN** the read guard gives the same result as for the print alone
