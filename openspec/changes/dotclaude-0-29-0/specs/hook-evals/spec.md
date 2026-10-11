## ADDED Requirements

### Requirement: Eval for each hook

Each dotclaude hook SHALL have an eval of its allow path, its block or deny path, the exact text that the session and the user see, its cost for each turn, and its false-block rate on correct messages (design D15).
A release SHALL NOT ship a hook whose eval fails.

#### Scenario: Hook with no eval

- **WHEN** a hook has no entry in `evals/hooks.json`, or an entry names a test that does not exist
- **THEN** `just check` fails and names the hook

### Requirement: Hook eval manifest

The file `evals/hooks.json` of each plugin SHALL name each hook by its id, the hook-lab test of each case kind, and the model requests and tokens that the hook adds to each turn.
The hook lab SHALL hold the allow, block, shown-text, and false-block cases, because they need no model run.

#### Scenario: Missing test

- **WHEN** an entry of `evals/hooks.json` names a test that its file does not have
- **THEN** `just check` fails and names the hook and the test

### Requirement: Hook ids

A hook in a hooks module SHALL have its id in a `// eval: <id>` comment on the line above its `on(` call.
A classic hook SHALL have the id `<event> <command>`, with the plugin root and the `bun` launcher removed, or `<event> prompt` for a prompt hook.

#### Scenario: Hook call with no id

- **WHEN** an `on(` call in a hooks module has no `// eval:` comment above it
- **THEN** `just check` fails and names the file and the line

### Requirement: Clean block text

A block text SHALL hold only the reason and the action for the session.
A block text with instructions for an evaluator, an unfilled placeholder such as `$ARGUMENTS`, or text that conflicts with the block reason SHALL fail the eval.

#### Scenario: Evaluator prompt in the block

- **WHEN** a hook blocks and the text that the session gets holds the evaluator rules
- **THEN** the eval fails

### Requirement: Cost for each turn

The eval SHALL record the model requests and the tokens that a hook adds to each turn, in `evals/hooks.json`, from a capture.
`claude plugin eval` reports only the cost of a run, so a hook that adds a model request SHALL also have a `claude plugin eval` case that shows its value.
A hook that adds a model request to each turn SHALL have the reason in the wiki, and an eval that shows its value.

#### Scenario: Prompt hook

- **WHEN** a hook of type `prompt` runs at each `Stop`
- **THEN** `evals/hooks.json` records one extra request for each turn and names a `claude plugin eval` case, and the wiki gives the reason or the hook goes

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
