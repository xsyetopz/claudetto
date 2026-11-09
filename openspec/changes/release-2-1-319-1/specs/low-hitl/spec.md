## MODIFIED Requirements

### Requirement: Choose the Classifier Model by Measurement

The classifier route SHALL be chosen by measurement on the gate fixtures in auto mode: the built-in classifier with the trimmed `autoMode` lists that setup writes, against a Mod `tool.check` route that asks Jev first and falls back to `claude-haiku-5-5`. The cheaper route whose verdicts match at least as many fixtures SHALL ship, and the measurement SHALL record which model answered. The Mod SHALL register one `tool.check` hook (`gate.ts:234`) and it SHALL only tighten a verdict, or turn a bare `ask` on a read-only command into `allow`; it SHALL NOT ask a model, Jev or another, to judge a permission.

#### Scenario: Measured Route

- **WHEN** the measurement of 2026-11-06 on 30 cases is read (`ISSUES-2026-11-04-1500.md`, "Task 5.29: route A against route B")
- **THEN** the built-in classifier matched 30 of 30 and the Haiku route 29 of 30, with a stable miss on `push-unnamed-branch`, so the built-in classifier ships
- **AND** `CLAUDE_CODE_AUTO_MODE_MODEL` does not change the model, because a server-configured model wins (`feature-map.md`, "Decisions of the user, 2026-11-05"; task 3.1; `tasks.md` 5.29)

#### Scenario: No Evidence

- **WHEN** no measurement exists
- **THEN** setup does not set `CLAUDE_CODE_AUTO_MODE_MODEL` and no Jev hook decides a permission

#### Scenario: The Gate Hook

- **WHEN** the Mod registers its hooks
- **THEN** the one `tool.check` hook is the gate, and no request from it reaches a model (`decide.test.ts`, "A Gated Tool Call: Bash and Edit send nothing")

### Requirement: A Decision of the Model Goes to a Registered Tool

When a `typesafeApiKey` is set, claudetto SHALL register the tool `mcp__claudetto__decide` at `session.start` (`register.ts:35-37`), and the model SHALL call it for a decision that is the model's own. No option named `decide` is read. The reply SHALL name the pick and its probability for each question Jev is sure about (`texts.ts:325-326`, "probability 0.NN"), and SHALL say so for each question it is not, because silence would read as a pick.

#### Scenario: Decision of the Model

- **WHEN** the model calls `mcp__claudetto__decide` with a question that has two or more options
- **THEN** one request goes to the TypeSafe API, and the reply names the pick and its probability, with no dialog

#### Scenario: Jev Not Sure

- **WHEN** Jev is not sure about a question of the call
- **THEN** the reply says so for that question and keeps the decision with the model

#### Scenario: No Key

- **WHEN** no key is set
- **THEN** no tool is registered, so the model never sees a tool it cannot call
