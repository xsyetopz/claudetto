---
schema: dotclaude-spec/2
kind: requirements
capability: agent-runs
---
# agent-runs

### REQ-28: Runs of `/dotclaude:implement`

Each worktree that `/dotclaude:implement` makes for an agent MUST start from the `HEAD` of the main checkout, or the skill MUST stop before the wave and tell the user the reason.
The start hook MUST move each package that the skill starts to `doing`, and the skill text and the hook MUST agree on the form of the prompt.
The main session MUST NOT ask a subagent to run a command that the main session cannot run without an ask or that a guard denied.
When a decision comes up while other runs go on, the main session MUST pick its recommendation, or send the decision to Jev or the user as REQ-25 says, and MUST NOT end the turn with an open question while it waits for runs.
No test asserts the words of the skill (REQ-17).

### REQ-29: you-should-know notes are new and relevant

`dcc-plugin-you-should-know` MUST NOT show a note on a topic that it showed before in the same session.
A note MUST NOT question an action that the transcript shows as done or started, or claim a fact that the transcript disproves.
The repeat rule MUST be a check on structured facts with a known-good and a known-bad fixture (REQ-18).
The relevance rule MUST be a `just eval` case that a model judges, with a known-good and a known-bad note (REQ-17).
