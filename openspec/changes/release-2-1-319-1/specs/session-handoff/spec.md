## ADDED Requirements

### Requirement: Git State Is Dated

A handoff, and the code-built fallback, SHALL state branch, ahead or behind count, and push state as of the time it was written, with that time, and the read-back SHALL tell the agent to run `git status -sb` before it reports branch or push state.

#### Scenario: Remote Moved After the Handoff

- **WHEN** a handoff says "`main` ahead 3, not pushed, as of 12:25 UTC" and `origin/main` moved after that
- **THEN** the next report states push state only after a fresh `git status -sb`

#### Scenario: Fallback File

- **WHEN** the code-built fallback is written
- **THEN** its git lines carry the write time
