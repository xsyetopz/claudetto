## ADDED Requirements

### Requirement: Questions in the Ask Tool

When the tools have `AskUserQuestion`, the main agent text and the `Concise` style SHALL tell the model to put each question for the user in that tool, a push back and a choice between two fixes included, with the facts that decide it in the question.
The "What I Need from You" list of the `Concise` style SHALL hold only steps that only the user can do.

#### Scenario: Choice between Two Fixes

- **WHEN** a review leaves two good fixes, such as a `node` launcher or `bun` only, and the tools have `AskUserQuestion`
- **THEN** the model calls `AskUserQuestion` with both fixes as options, and the reply text holds no choice for the user

#### Scenario: Code That Only Looks Wrong

- **WHEN** a review finds code that only looks wrong, with no run that shows a defect
- **THEN** the model asks with `AskUserQuestion` whether to change it, in place of a list of items left as they are
