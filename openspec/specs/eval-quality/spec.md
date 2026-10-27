# eval-quality Specification

## Purpose
TBD - created by archiving change eval-rebuild. Update Purpose after archive.

## Requirements

### Requirement: No Word Graders

An eval of the repo SHALL NOT grade the text of a model by a match of English words or phrases.
A grader SHALL read a tool call, a file, an exit status, a structured field, or the answer of a pinned judge model.

#### Scenario: Regex Over a Reply

- **WHEN** a case grades the last reply with a `regex` grader
- **THEN** the case fails validation

### Requirement: Paired Arms

A comparison of two arms SHALL run both arms on the same cases, and SHALL report the paired difference for each case with a clustered standard error and a confidence interval.

#### Scenario: Same Cases

- **WHEN** both arms ran the same cases
- **THEN** the report gives the mean paired difference, its standard error, and its confidence interval

### Requirement: Pinned Judge

Each paid eval recipe SHALL require `--judge-model`, because a grader has no model key and the default alias can move to a new model.

#### Scenario: Run with No Judge

- **WHEN** `just eval --model haiku` runs with no `--judge-model`
- **THEN** the recipe exits `1` before the eval starts

### Requirement: Free Tier First

An eval that can replay recorded data with code SHALL do so with no model call, and a step with a model call SHALL be a separate paid run that the user approves.

#### Scenario: Classifier Replay

- **WHEN** the classifier replay runs with no flag
- **THEN** it scores the deterministic stage and makes no model call
