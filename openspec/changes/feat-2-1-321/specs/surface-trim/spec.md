## MODIFIED Requirements

### Requirement: The Init Interview Replaces the Built-in Init Prompt

The built-in `/init` skill's prompt SHALL be replaced by `INTERVIEW_TEXT`, which has the model read the repo and the memory files, ask through `AskUserQuestion` what they leave out and which of five scopes each instruction belongs to, and write only after a yes to each draft. A user's own skill named `init` SHALL keep its text.

#### Scenario: Init

- **WHEN** the built-in `init` skill prompt is built
- **THEN** the model gets the interview, and a user's skill named `init` keeps its text ("the built-in init skill reaches the model as the interview", "a user's own skill named init keeps its text")
