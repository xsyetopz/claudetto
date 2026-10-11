## ADDED Requirements

### Requirement: Hook evals in the suite

The suite SHALL hold the hook evals of the `hook-evals` capability next to the prompt evals, in the format of `claude plugin eval`.

#### Scenario: Suite run

- **WHEN** the suite runs before a release
- **THEN** the report has a result for each hook and each prompt variant

### Requirement: Prompt rule value

The suite SHALL hold a paired case for each dotclaude rule that the core prompt keeps above the simple prompt (design D17).
A rule with no case, or with no gain beyond the noise bound, SHALL leave the prompt.

#### Scenario: Rule with no gain

- **WHEN** the paired case of a rule shows no gain beyond the noise bound
- **THEN** the report names the rule as a candidate to remove
